import OpenAI from "openai";

export const CLASSIFIER_SYSTEM_PROMPT = `You are an expert project classifier for LA County environmental permitting.
Given a project description, use your tools to:
1. REASON about what type of project this is
2. CALL sic_lookup to determine the SIC code
3. CALL school_proximity_check if any schools or educational facilities are mentioned
4. CALL waterway_proximity_check if any water features, channels, or drainage are mentioned
5. OBSERVE the results and synthesize a classification

Think step by step. Explain your reasoning before each tool call.

After using all relevant tools, provide your final classification as a JSON object with this structure:
{
  "reasoning_trace": ["step 1 description...", "step 2 description..."],
  "classification": {
    "sic_code": "4-digit SIC code",
    "sic_description": "SIC description",
    "land_use_type": "Industrial/Commercial/Residential/Mixed-Use",
    "estimated_disturbance_acres": number,
    "near_school": boolean,
    "near_waterway": boolean,
    "involves_hazmat": boolean,
    "location_type": "Urbanized/Rural/Suburban",
    "waterway_name": "name or null",
    "school_distance_ft": number or null
  }
}

IMPORTANT: You MUST call at least the sic_lookup tool. Call waterway_proximity_check and school_proximity_check if there's any indication of nearby water or schools in the description. Always err on the side of checking rather than assuming.`;

export const CLASSIFIER_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "sic_lookup",
      description:
        "Look up the most appropriate SIC code for a project based on its description. Returns the 4-digit SIC code and whether it falls in a regulated category for SCAQMD or RWQCB Industrial General Permit.",
      parameters: {
        type: "object",
        properties: {
          project_type: {
            type: "string",
            description: "Brief description of the primary business activity",
          },
          has_manufacturing: { type: "boolean" },
          has_chemical_processes: { type: "boolean" },
        },
        required: ["project_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "waterway_proximity_check",
      description:
        "Check if a project location is near any of LA County's 303(d) impaired waterbodies. Returns the nearest waterbody, its impairments, and whether additional stormwater monitoring is required.",
      parameters: {
        type: "object",
        properties: {
          location_description: {
            type: "string",
            description: "Description of project location including any nearby water features, channels, or drainage",
          },
          area_of_county: {
            type: "string",
            description: "General area (e.g., South Bay, San Fernando Valley, Downtown, Long Beach, etc.)",
          },
        },
        required: ["location_description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "school_proximity_check",
      description:
        "Check if the project site is within 1,000 feet of a school or early learning center, which triggers SCAQMD Rule 1401.1 stricter toxic air contaminant limits.",
      parameters: {
        type: "object",
        properties: {
          location_description: { type: "string" },
          mentions_school_nearby: { type: "boolean" },
          distance_if_known_ft: { type: "number" },
        },
        required: ["location_description"],
      },
    },
  },
];
