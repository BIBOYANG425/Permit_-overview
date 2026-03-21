import { callNemotronWithMessages } from "@/lib/nim-client";
import {
  getHeaderPrompt,
  getMediaSectionPrompt,
  getAgencyList,
  getProjectSummary,
} from "@/lib/agents/report-writer";
import { getCountyConfig } from "@/lib/config/counties";
import { getCityConfig } from "@/lib/config/cities";
import { PermitAnalysis, AgentEvent } from "@/lib/types";
import { isValidCountyId } from "@/lib/config/counties";

function extractJSON(text: string): unknown | null {
  // Strip markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  // Remove any markdown headers mixed into the text
  cleaned = cleaned.replace(/^#{1,6}\s+.*$/gm, "");

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try fixing trailing commas
    try {
      return JSON.parse(
        jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
      );
    } catch {
      // Try repairing truncated JSON
      try {
        let repaired = jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        // Remove trailing incomplete string values
        repaired = repaired.replace(/,?\s*"[^"]*":\s*"[^"]*$/g, "");
        repaired = repaired.replace(/,?\s*"[^"]*":\s*$/g, "");
        // Close unclosed brackets/braces
        const opens = (repaired.match(/\[/g) || []).length;
        const closes = (repaired.match(/\]/g) || []).length;
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        for (let i = 0; i < opens - closes; i++) repaired += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
        return JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { analysis, projectDescription: rawDesc, address: rawAddr, county, city } = body;

  if (!analysis || !rawDesc) {
    return new Response(JSON.stringify({ error: "Analysis data and project description are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const projectDescription = String(rawDesc);
  const address = typeof rawAddr === "string" ? rawAddr : "";
  const countyId = isValidCountyId(county) ? county : "la";
  const countyConfig = getCountyConfig(countyId);
  const cityConfig = typeof city === "string" && city.trim() ? getCityConfig(city.trim(), countyId) : getCityConfig("", countyId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed
        }
      };

      try {
        const permitAnalysis = analysis as PermitAnalysis;
        const agencies = getAgencyList(permitAnalysis);
        const totalSteps = agencies.length + 1;

        send({ type: "agent_start", agent: "Report Writer", model: "nvidia/nvidia-nemotron-nano-9b-v2" });
        send({ type: "thought", agent: "Report Writer", content: `Generating report in ${totalSteps} passes: 1 header/metadata + ${agencies.length} agency sections...` });

        // ── Pass 1: Header, Background, Metadata, Path Forward ──
        send({ type: "thought", agent: "Report Writer", content: `Pass 1/${totalSteps}: Generating header, background, and metadata...` });

        const headerPrompt = getHeaderPrompt(countyConfig, cityConfig, permitAnalysis, projectDescription, address);
        const headerResponse = await callNemotronWithMessages(
          "fast",
          [
            { role: "system", content: "You are an environmental compliance analyst. Output ONLY valid JSON. No markdown, no code blocks, no explanatory text." },
            { role: "user", content: headerPrompt },
          ],
          { maxTokens: 4096, temperature: 0.2, jsonMode: true }
        );

        const headerContent = headerResponse.choices[0].message.content || "";
        const headerData = extractJSON(headerContent) as Record<string, unknown> | null;

        if (!headerData) {
          send({ type: "thought", agent: "Report Writer", content: "Warning: Failed to parse header. Using defaults." });
        }

        const header = headerData?.header || {
          to: [{ name: "Facility Management", organization: "Client", title: "Operations" }],
          from: [{ name: "Environmental Compliance Team", firm: "SoCal Permit Navigator", title: "Senior Analyst" }],
          subject: `Re: Environmental Permit Applicability Review — ${address}`,
          date: new Date().toISOString().split("T")[0],
        };
        const background = headerData?.background || {
          engagement_summary: `SoCal Permit Navigator was engaged to conduct an environmental permit applicability review for a facility at ${address}.`,
          scope: agencies.map(a => a.agency),
          caveats: "This analysis is preliminary and based on information provided. Additional data may be required for definitive determinations.",
        };
        const pathForward = (headerData?.path_forward as string) || "SoCal Permit Navigator is available to discuss these findings and assist with the permitting process.";
        const metadata = headerData?.metadata || {
          facility: { name: "Facility", address, state: "California", sic_code: "Unknown" },
          analysis_date: new Date().toISOString().split("T")[0],
          data_gaps: [],
        };

        send({ type: "thought", agent: "Report Writer", content: "Header and metadata generated successfully." });

        // ── Pass 2+: One media section per agency (in parallel batches of 3) ──
        const projectSummary = getProjectSummary(permitAnalysis, projectDescription, address);
        const mediaSections: unknown[] = [];
        const batchSize = 3;

        for (let i = 0; i < agencies.length; i += batchSize) {
          const batch = agencies.slice(i, i + batchSize);
          const batchNames = batch.map(a => a.agency_code).join(", ");
          send({ type: "thought", agent: "Report Writer", content: `Pass ${Math.floor(i / batchSize) + 2}/${Math.ceil(agencies.length / batchSize) + 1}: Generating sections for ${batchNames}...` });

          const batchPromises = batch.map(async (agency) => {
            const sectionPrompt = getMediaSectionPrompt(agency, countyConfig, projectSummary);
            try {
              const sectionResponse = await callNemotronWithMessages(
                "fast",
                [
                  { role: "system", content: "You are an environmental compliance analyst. Output ONLY valid JSON for a single report section. No markdown, no code blocks." },
                  { role: "user", content: sectionPrompt },
                ],
                { maxTokens: 4096, temperature: 0.2, jsonMode: true }
              );

              const sectionContent = sectionResponse.choices[0].message.content || "";
              const section = extractJSON(sectionContent);
              if (section) return section;

              // Fallback: construct minimal section from analysis data
              return {
                section_title: agency.agency,
                regulatory_context: {
                  governing_agency: { name: agency.agency, abbreviation: agency.agency_code, jurisdiction: countyConfig.name },
                  legal_basis: "See agency regulations",
                  primary_concern: "Environmental compliance",
                },
                applicability_analysis: {
                  determination_status: agency.permits?.some(p => p.required) ? "subject_to_permitting" : "not_applicable",
                  analysis_narrative: agency.reasoning_chain?.map(s => s.content).join(" ") || "Analysis completed.",
                  permits_required: (agency.permits || []).map(p => ({
                    permit_name: p.permit_name,
                    issuing_agency: agency.agency,
                    required: p.required ? "yes" : "no",
                    fee: p.estimated_cost,
                    deadline_description: `${p.timeline_weeks} weeks`,
                  })),
                },
                next_steps: [{ action: "Contact agency for application requirements", timing: "Before project start", status: "pending" }],
              };
            } catch (err) {
              // Return fallback section on API error
              return {
                section_title: agency.agency,
                regulatory_context: {
                  governing_agency: { name: agency.agency, abbreviation: agency.agency_code },
                  legal_basis: "See agency regulations",
                  primary_concern: "Environmental compliance",
                },
                applicability_analysis: {
                  determination_status: "insufficient_data",
                  analysis_narrative: `Section generation encountered an error: ${err instanceof Error ? err.message : "Unknown"}. Please refer to the permit analysis results above.`,
                },
                next_steps: [{ action: "Consult directly with agency", timing: "As needed", status: "pending" }],
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          mediaSections.push(...batchResults);
        }

        send({ type: "thought", agent: "Report Writer", content: `All ${mediaSections.length} sections generated. Assembling final report...` });

        // ── Assemble final report ──
        const report = {
          header,
          background,
          media_sections: mediaSections,
          path_forward: pathForward,
          metadata,
        };

        send({ type: "agent_complete", agent: "Report Writer", result: report as Record<string, unknown> });
        send({ type: "final_result", result: report });

      } catch (error) {
        send({
          type: "error",
          error: `Report generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
