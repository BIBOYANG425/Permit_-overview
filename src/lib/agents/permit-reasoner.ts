import OpenAI from "openai";
import { CountyConfig, CityConfig } from "../types";

export function getPermitReasonerSystemPrompt(countyConfig: CountyConfig, cityConfig?: CityConfig): string {
  let agencyList = `Agencies to evaluate (in order):
1. ${countyConfig.airDistrict.name} (air permits) — code: ${countyConfig.airDistrict.code}
2. ${countyConfig.waterBoard.name} (water/stormwater permits) — code: ${countyConfig.waterBoard.code}
3. ${countyConfig.wastewater.name} (sewer discharge permits) — code: ${countyConfig.wastewater.code}
4. CEQA Lead Agency (environmental review) — code: CEQA
5. CDFW + US Army Corps (waterway permits) — code: CDFW_USACE
6. ${countyConfig.fireCupa.name} (hazardous materials) — code: ${countyConfig.fireCupa.code}`;

  if (cityConfig) {
    agencyList += `
7. ${cityConfig.buildingDept.name} (building permit, plan check) — code: Building
8. ${cityConfig.planningDept.name} (zoning, use permits) — code: Planning
9. ${cityConfig.fireDept.name} (fire plan check, sprinklers) — code: Fire
10. ${cityConfig.publicWorks.name} (grading, encroachment) — code: PublicWorks`;
  }

  const agencyCount = cityConfig ? 10 : 6;

  return `You are an expert environmental permit analyst for ${countyConfig.name}, California.
You have received a classified project. For EACH of the ${agencyCount} regulatory agencies below,
you must REASON through whether their permits are required.

Use the ReAct pattern:
- THOUGHT: State what you're evaluating and why
- ACTION: Call a tool to check a specific threshold or exemption
- OBSERVATION: Analyze the tool result
- THOUGHT: Draw a conclusion and move to the next agency

${agencyList}

For each agency, output your reasoning chain AND your permit determination.
Be explicit about WHY each permit is or isn't required — cite the specific rule, threshold, or SIC code trigger.

IMPORTANT: Call the threshold_check and ceqa_exemption_check tools to verify your reasoning. Do not skip tool calls.

After completing analysis for all ${agencyCount} agencies, output a JSON object with this structure:
{
  "agency_analyses": [
    {
      "agency": "Full agency name",
      "agency_code": "agency code",
      "reasoning_chain": [
        { "type": "thought", "content": "..." },
        { "type": "action", "content": "Calling threshold_check for..." },
        { "type": "observation", "content": "Result shows..." },
        { "type": "thought", "content": "Conclusion: ..." }
      ],
      "permits": [
        {
          "permit_name": "Permit to Construct",
          "required": true,
          "confidence": "high",
          "reason": "Specific rule and threshold that triggers this",
          "timeline_weeks": 12,
          "forms": ["Form 400-A"],
          "priority": "critical",
          "estimated_cost": "$5,000 - $25,000"
        }
      ]
    }
  ]
}

${countyConfig.regulationsKB}`;
}

export const PERMIT_REASONER_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "ceqa_exemption_check",
      description:
        "Walk through the CEQA categorical exemption decision tree. Checks if a project qualifies for a Class 1-33 exemption and whether any of the 6 exceptions to exemptions (Section 15300.2) apply.",
      parameters: {
        type: "object",
        properties: {
          project_type: { type: "string" },
          square_footage: { type: "number" },
          is_new_construction: { type: "boolean" },
          in_urbanized_area: { type: "boolean" },
          near_sensitive_environment: { type: "boolean" },
          on_cortese_list: { type: "boolean" },
          has_historical_resources: { type: "boolean" },
          involves_discretionary_action: { type: "boolean" },
        },
        required: ["project_type", "is_new_construction"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "threshold_check",
      description:
        "Check if a specific regulatory threshold is triggered for a given agency. Returns whether the threshold is met, the specific rule/regulation, and the threshold value.",
      parameters: {
        type: "object",
        properties: {
          agency: {
            type: "string",
            enum: ["SCAQMD", "RWQCB", "Sanitation", "CDFW", "USACE", "Fire_CUPA"],
          },
          check_type: {
            type: "string",
            enum: [
              "air_permit",
              "industrial_stormwater",
              "construction_stormwater",
              "wastewater_discharge",
              "section_404",
              "streambed_alteration",
              "hazmat_storage",
              "hazwaste_generator",
              "fugitive_dust",
              "toxic_air_contaminant",
            ],
          },
          sic_code: { type: "string" },
          disturbance_acres: { type: "number" },
          has_emissions_equipment: { type: "boolean" },
          discharges_to_sewer: { type: "boolean" },
          stores_hazmat: { type: "boolean" },
          near_waterway: { type: "boolean" },
        },
        required: ["agency", "check_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dependency_lookup",
      description: "Check if a permit has prerequisites that must be obtained first. Returns the dependency chain.",
      parameters: {
        type: "object",
        properties: {
          permit_name: { type: "string" },
          agency: { type: "string" },
        },
        required: ["permit_name", "agency"],
      },
    },
  },
];
