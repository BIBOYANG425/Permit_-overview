import { callNemotronWithMessages } from "@/lib/nim-client";
import { getReportWriterSystemPrompt, buildReportPrompt } from "@/lib/agents/report-writer";
import { getCountyConfig } from "@/lib/config/counties";
import { getCityConfig } from "@/lib/config/cities";
import { PermitAnalysis, CountyId, AgentEvent } from "@/lib/types";

function extractJSON(text: string): unknown | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    try {
      return JSON.parse(
        jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
      );
    } catch {
      return null;
    }
  }
}

export async function POST(req: Request) {
  const { analysis, projectDescription, address, county, city } = await req.json();

  if (!analysis || !projectDescription) {
    return new Response(JSON.stringify({ error: "Analysis data and project description are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const countyId: CountyId = county || "la";
  const countyConfig = getCountyConfig(countyId);
  const cityConfig = city ? getCityConfig(city, countyId) : getCityConfig("", countyId);

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
        send({ type: "agent_start", agent: "Report Writer", model: "nvidia/llama-3.3-nemotron-super-49b-v1" });
        send({ type: "thought", agent: "Report Writer", content: "Generating professional Environmental Permit Applicability Review Memorandum..." });

        const systemPrompt = getReportWriterSystemPrompt(countyConfig, cityConfig);
        const userPrompt = buildReportPrompt(analysis as PermitAnalysis, projectDescription, address);

        // Use reasoning model for report quality — needs high token limit for full report
        const response = await callNemotronWithMessages(
          "reasoning",
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          { maxTokens: 8192, temperature: 0.2 }
        );

        const content = response.choices[0].message.content || "";

        if (content) {
          send({ type: "thought", agent: "Report Writer", content: "Report generation complete. Parsing structured output..." });
        }

        const report = extractJSON(content);

        if (report) {
          send({ type: "agent_complete", agent: "Report Writer", result: report as Record<string, unknown> });
          send({
            type: "final_result",
            result: report,
          });
        } else {
          // If JSON parsing failed, try to send raw content and let client handle it
          send({
            type: "error",
            agent: "Report Writer",
            error: "Failed to parse report JSON. Raw output available.",
          });
          send({
            type: "thought",
            agent: "Report Writer",
            content: content.slice(0, 2000),
          });
        }
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
