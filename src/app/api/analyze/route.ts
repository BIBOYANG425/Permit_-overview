import { MODELS, callNemotronWithMessages } from "@/lib/nim-client";
import { getClassifierSystemPrompt, getClassifierTools } from "@/lib/agents/classifier";
import { getPermitReasonerSystemPrompt, PERMIT_REASONER_TOOLS } from "@/lib/agents/permit-reasoner";
import { getSynthesizerSystemPrompt } from "@/lib/agents/synthesizer";
import { getCountyConfig } from "@/lib/config/counties";
import { getCityConfig, detectCityFromAddress } from "@/lib/config/cities";
import { sicLookup } from "@/lib/tools/sic-lookup";
import { waterwayCheck } from "@/lib/tools/waterway-check";
import { schoolProximityCheck } from "@/lib/tools/school-proximity";
import { ceqaExemptionCheck } from "@/lib/tools/ceqa-exemption-check";
import { thresholdCheck } from "@/lib/tools/threshold-check";
import { fireReviewCheck } from "@/lib/tools/fire-review-check";
import { cityPermitCheck } from "@/lib/tools/city-permit-check";
import { dependencyLookup } from "@/lib/tools/timeline-calculator";
import { AgentEvent, CountyConfig, CityConfig } from "@/lib/types";
import { isValidCountyId } from "@/lib/config/counties";
import OpenAI from "openai";

// ── Tool executor ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function executeToolLocally(toolName: string, args: Record<string, unknown>, countyConfig?: CountyConfig): unknown {
  const a = args as any;
  switch (toolName) {
    case "sic_lookup":
      return sicLookup(a);
    case "waterway_proximity_check":
      return waterwayCheck({ ...a, countyConfig });
    case "school_proximity_check":
      return schoolProximityCheck({ ...a, countyConfig });
    case "ceqa_exemption_check":
      return ceqaExemptionCheck(a);
    case "threshold_check":
      return thresholdCheck(a);
    case "dependency_lookup":
      return dependencyLookup(a);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── JSON extractor ──
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

// ── Agent loop with tool calling (used for classifier) ──
async function runAgentLoop(
  model: keyof typeof MODELS,
  systemPrompt: string,
  userMessage: string,
  tools: OpenAI.ChatCompletionTool[],
  agentName: string,
  send: (event: AgentEvent) => void,
  maxIterations: number = 5,
  countyConfig?: CountyConfig
): Promise<unknown> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await callNemotronWithMessages(model, messages, {
      tools,
      maxTokens: 2048,
    });

    const choice = response.choices[0];

    if (choice.message.content) {
      send({ type: "thought", agent: agentName, content: choice.message.content });
    }

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: choice.message.content || null,
        tool_calls: choice.message.tool_calls,
      } as OpenAI.ChatCompletionMessageParam);

      for (const toolCall of choice.message.tool_calls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tc = toolCall as any;
        const fnName: string = tc.function?.name ?? tc.name ?? "unknown";
        const fnArgs: string = tc.function?.arguments ?? JSON.stringify(tc.input ?? {});
        let parsedArgs: Record<string, unknown>;
        try {
          parsedArgs = JSON.parse(fnArgs);
        } catch {
          parsedArgs = { raw: fnArgs };
        }

        send({ type: "tool_call", agent: agentName, tool: fnName, input: parsedArgs });

        const toolResult = executeToolLocally(fnName, parsedArgs, countyConfig);

        send({ type: "tool_result", agent: agentName, tool: fnName, output: toolResult as Record<string, unknown> });

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
      continue;
    }

    // Final answer
    return extractJSON(choice.message.content || "") || choice.message.content;
  }

  // Force final answer
  messages.push({ role: "user", content: "Provide your final JSON answer now." });
  const finalResponse = await callNemotronWithMessages(model, messages, { maxTokens: 2048 });
  const content = finalResponse.choices[0].message.content || "";
  if (content) send({ type: "thought", agent: agentName, content });
  return extractJSON(content) || content;
}

// ── Pre-compute all tool results after classification (eliminates Agent 2 tool-call round-trips) ──
function preComputeToolResults(classification: Record<string, unknown>, countyConfig: CountyConfig, cityConfig: CityConfig) {
  const c = (classification as { classification?: Record<string, unknown> })?.classification || classification;
  const sicCode = (c.sic_code as string) || "9999";
  const acres = (c.estimated_disturbance_acres as number) || 0;
  const nearWaterway = (c.near_waterway as boolean) || false;
  const involvesHazmat = (c.involves_hazmat as boolean) || false;

  const airAgency = countyConfig.airDistrict.code;
  const waterAgency = countyConfig.waterBoard.code;
  const wastewaterAgency = countyConfig.wastewater.code;
  const fireAgency = countyConfig.fireCupa.code;

  // Extract building/occupancy data from classification if available
  // Use null (not undefined) so downstream tools can distinguish "unknown" from "zero"
  const buildingSqft = (c.building_sqft as number) || (c.buildingSizeSqft as number) || null;
  const stories = (c.stories as number) || null;
  const occupancyType = (c.occupancy_type as string) || (c.occupancyType as string) || null;
  const isNewConstruction = (c.is_new_construction as boolean) ?? (c.isNewConstruction as boolean) ?? null;

  // Warn about missing classification fields that affect city/fire permit accuracy
  const missingFields: string[] = [];
  if (buildingSqft === null) missingFields.push("building_sqft");
  if (stories === null) missingFields.push("stories");
  if (occupancyType === null) missingFields.push("occupancy_type");
  if (isNewConstruction === null) missingFields.push("is_new_construction");

  return {
    air_permit: thresholdCheck({ agency: airAgency, check_type: "air_permit", sic_code: sicCode, has_emissions_equipment: true, countyConfig }),
    dust: thresholdCheck({ agency: airAgency, check_type: "fugitive_dust", disturbance_acres: acres, countyConfig }),
    tac: thresholdCheck({ agency: airAgency, check_type: "toxic_air_contaminant", sic_code: sicCode, countyConfig }),
    igp: thresholdCheck({ agency: waterAgency, check_type: "industrial_stormwater", sic_code: sicCode, countyConfig }),
    cgp: thresholdCheck({ agency: waterAgency, check_type: "construction_stormwater", disturbance_acres: acres, countyConfig }),
    sanitation: thresholdCheck({ agency: wastewaterAgency, check_type: "wastewater_discharge", sic_code: sicCode, discharges_to_sewer: true, countyConfig }),
    cdfw: thresholdCheck({ agency: "CDFW", check_type: "streambed_alteration", near_waterway: nearWaterway, countyConfig }),
    usace: thresholdCheck({ agency: "USACE", check_type: "section_404", near_waterway: nearWaterway, countyConfig }),
    fire_hazmat: thresholdCheck({ agency: fireAgency, check_type: "hazmat_storage", stores_hazmat: involvesHazmat, countyConfig }),
    fire_hazwaste: thresholdCheck({ agency: fireAgency, check_type: "hazwaste_generator", stores_hazmat: involvesHazmat, countyConfig }),
    ceqa: ceqaExemptionCheck({
      project_type: (c.sic_description as string) || "",
      is_new_construction: true,
      in_urbanized_area: true,
      near_sensitive_environment: nearWaterway,
    }),
    city_permits: cityPermitCheck({
      projectType: (c.sic_description as string) || "",
      buildingSizeSqft: buildingSqft,
      isNewConstruction: isNewConstruction,
      cityConfig,
    }),
    fire_review: fireReviewCheck({
      projectType: (c.sic_description as string) || "",
      buildingSizeSqft: buildingSqft,
      stories,
      occupancyType,
      isNewConstruction: isNewConstruction,
      cityConfig,
    }),
    ...(missingFields.length > 0 ? { missing_classification_fields: missingFields } : {}),
  };
}

// ── Dynamic agency groups based on county/city config ──
function getAgencyGroups(countyConfig: CountyConfig, cityConfig?: CityConfig) {
  const groups = [
    {
      name: "Air & Water",
      agencies: [`${countyConfig.airDistrict.name} (${countyConfig.airDistrict.code})`, `${countyConfig.waterBoard.name} (${countyConfig.waterBoard.code})`],
      toolKeys: ["air_permit", "dust", "tac", "igp", "cgp"],
    },
    {
      name: "Sanitation & CEQA",
      agencies: [`${countyConfig.wastewater.name} (${countyConfig.wastewater.code})`, "CEQA Lead Agency (CEQA)"],
      toolKeys: ["sanitation", "ceqa"],
    },
    {
      name: "Waterways & HazMat",
      agencies: ["CDFW + US Army Corps (CDFW_USACE)", `${countyConfig.fireCupa.name} (${countyConfig.fireCupa.code})`],
      toolKeys: ["cdfw", "usace", "fire_hazmat", "fire_hazwaste"],
    },
  ];

  if (cityConfig) {
    groups.push({
      name: "City Permits & Fire",
      agencies: [
        `${cityConfig.buildingDept.name} (Building)`,
        `${cityConfig.planningDept.name} (Planning)`,
        `${cityConfig.fireDept.name} (Fire)`,
        `${cityConfig.publicWorks.name} (PublicWorks)`,
      ],
      toolKeys: ["city_permits", "fire_review"],
    });
  }

  return groups;
}

// Split projectDescription into core project text and uploaded document context
function splitDocumentContext(projectDesc: string): { coreProject: string; documentContext: string } {
  const match = projectDesc.match(/(?:\r?\n|^)\s*Extracted from uploaded documents:/);
  if (!match || match.index === undefined) {
    return { coreProject: projectDesc, documentContext: "" };
  }
  return {
    coreProject: projectDesc.slice(0, match.index),
    documentContext: projectDesc.slice(match.index),
  };
}

function buildAgencyPrompt(
  group: { name: string; agencies: string[]; toolKeys: string[] },
  coreProject: string,
  classification: unknown,
  toolResults: Record<string, unknown>,
  documentContext: string
): string {
  const relevantResults = Object.fromEntries(
    group.toolKeys.map((k) => [k, toolResults[k]])
  );

  let prompt = `Analyze permit requirements for ONLY these agencies: ${group.agencies.join(", ")}

Project: ${coreProject}

Classification: ${JSON.stringify(classification, null, 2)}

Pre-computed threshold results (already evaluated — use these directly, do NOT re-check):
${JSON.stringify(relevantResults, null, 2)}`;

  if (documentContext) {
    prompt += `

UPLOADED DOCUMENT CONTEXT (use these details to inform your analysis — they may contain chemical inventories, equipment specs, process descriptions, or site plans that affect permit requirements):
${documentContext}`;
  }

  prompt += `

Based on these threshold results${documentContext ? " and uploaded document details" : ""}, determine which permits are required for each agency.
For each permit, state: permit_name, required (boolean), confidence, reason (cite specific rule), timeline_weeks, forms, priority, estimated_cost.

Output JSON:
{
  "agency_analyses": [
    {
      "agency": "Full Name",
      "agency_code": "CODE",
      "reasoning_chain": [{"type":"thought","content":"..."}],
      "permits": [{ "permit_name":"...", "required":true, "confidence":"high", "reason":"...", "timeline_weeks":12, "forms":["..."], "priority":"critical", "estimated_cost":"$X" }]
    }
  ]
}`;

  return prompt;
}

export async function POST(req: Request) {
  const { projectDescription, county: countyParam, city: cityParam } = await req.json();

  if (!projectDescription || typeof projectDescription !== "string") {
    return new Response(JSON.stringify({ error: "Project description is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
        // ===== Load county and city configs =====
        const countyId = isValidCountyId(countyParam) ? countyParam : "la";
        const countyConfig = getCountyConfig(countyId);
        const rawCity = typeof cityParam === "string" ? cityParam.trim() : "";
        const detectedCity = rawCity || detectCityFromAddress(projectDescription);
        const cityConfig = detectedCity ? getCityConfig(detectedCity, countyId) : getCityConfig("", countyId);

        // ===== AGENT 1: CLASSIFIER (nano-9b, fast) =====
        send({ type: "agent_start", agent: "Project Classifier", model: MODELS.fast });

        const classifierPrompt = getClassifierSystemPrompt(countyConfig);
        const classifierTools = getClassifierTools(countyConfig);

        const classificationResult = await runAgentLoop(
          "fast",
          classifierPrompt,
          `Classify this project for ${countyConfig.name} environmental permitting:\n\n${projectDescription}`,
          classifierTools,
          "Project Classifier",
          send,
          4, // fewer iterations — classifier is simple
          countyConfig
        );

        send({ type: "agent_complete", agent: "Project Classifier", result: classificationResult as Record<string, unknown> });

        // ===== PRE-COMPUTE all tool results (instant, no API calls) =====
        const toolResults = preComputeToolResults(classificationResult as Record<string, unknown>, countyConfig, cityConfig);
        send({
          type: "thought",
          agent: "Permit Reasoning Agent",
          content: `Pre-computed ${Object.keys(toolResults).length} threshold checks across all agencies including city permits. Running parallel analysis...`,
        });

        // ===== AGENT 2: PARALLEL PERMIT ANALYSIS (concurrent calls to super-49b) =====
        send({ type: "agent_start", agent: "Permit Reasoning Agent", model: MODELS.reasoning });

        const AGENCY_SYSTEM = `You are an expert ${countyConfig.name} environmental permit analyst. You receive pre-computed threshold check results and must determine which permits are required. Be concise. Cite specific rules. Output valid JSON only.

${countyConfig.regulationsKB}`;

        const agencyGroups = getAgencyGroups(countyConfig, cityConfig);

        // Split document context once, reuse across all agency prompts
        const { coreProject, documentContext } = splitDocumentContext(projectDescription);

        const agencyPromises = agencyGroups.map(async (group) => {
          const userMsg = buildAgencyPrompt(
            group,
            coreProject,
            classificationResult,
            toolResults as Record<string, unknown>,
            documentContext
          );

          send({ type: "thought", agent: "Permit Reasoning Agent", content: `Analyzing ${group.name}...` });

          const response = await callNemotronWithMessages(
            "reasoning",
            [
              { role: "system", content: AGENCY_SYSTEM },
              { role: "user", content: userMsg },
            ],
            { maxTokens: 3000, temperature: 0.2 }
          );

          const content = response.choices[0].message.content || "";
          if (content) {
            send({ type: "thought", agent: "Permit Reasoning Agent", content: `${group.name} analysis complete.` });
          }

          const parsed = extractJSON(content) as { agency_analyses?: unknown[] } | null;
          if (!parsed) {
            send({ type: "thought", agent: "Permit Reasoning Agent", content: `Warning: Failed to parse ${group.name} analysis output. This group's results may be missing.` });
          }
          return { groupName: group.name, parsed };
        });

        const agencyResults = await Promise.all(agencyPromises);

        // Merge all agency analyses, warn about parse failures
        const failedGroups = agencyResults.filter(r => !r.parsed).map(r => r.groupName);
        const allAnalyses = agencyResults.flatMap(
          (r) => (r.parsed?.agency_analyses as unknown[]) || []
        );

        const permitResult = { agency_analyses: allAnalyses, ...(failedGroups.length > 0 ? { parse_warnings: failedGroups } : {}) };

        send({ type: "agent_complete", agent: "Permit Reasoning Agent", result: permitResult as Record<string, unknown> });

        // ===== AGENT 3: SYNTHESIZER (nano-9b for speed — synthesis is simpler) =====
        send({ type: "agent_start", agent: "Synthesis Agent", model: MODELS.fast });

        const synthesizerSystemPrompt = getSynthesizerSystemPrompt(countyConfig);

        let synthesisResult;
        try {
          const response = await callNemotronWithMessages(
            "fast",
            [
              { role: "system", content: synthesizerSystemPrompt },
              {
                role: "user",
                content: `Create optimal permit filing sequence.\n\nProject: ${coreProject}\n\nPermit Determinations:\n${JSON.stringify(permitResult, null, 2)}`,
              },
            ],
            { maxTokens: 2048, temperature: 0.2 }
          );

          const content = response.choices[0].message.content || "";
          if (content) {
            send({ type: "thought", agent: "Synthesis Agent", content });
          }

          synthesisResult = extractJSON(content) || {
            synthesis_reasoning: ["Analysis complete"],
            recommended_sequence: ["File all permits as identified"],
            parallel_tracks: [],
            critical_path: [],
            estimated_total_timeline_months: 12,
            warnings: [],
            cost_estimate_range: "Contact agencies for exact costs",
          };
        } catch (error) {
          send({
            type: "error",
            agent: "Synthesis Agent",
            error: `Synthesis failed: ${error instanceof Error ? error.message : "Unknown"}`,
          });
          synthesisResult = {
            synthesis_reasoning: ["Synthesis error — using permit data as-is"],
            recommended_sequence: ["Consult environmental consultant"],
            parallel_tracks: [],
            critical_path: [],
            estimated_total_timeline_months: 12,
            warnings: ["Synthesis agent error — timeline estimated"],
            cost_estimate_range: "Contact agencies",
          };
        }

        send({ type: "agent_complete", agent: "Synthesis Agent", result: synthesisResult as Record<string, unknown> });

        // ===== FINAL OUTPUT =====
        send({
          type: "final_result",
          data: {
            classification: classificationResult,
            agency_analyses: allAnalyses,
            synthesis: synthesisResult,
          } as never,
        });
      } catch (error) {
        send({
          type: "error",
          error: `Pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
