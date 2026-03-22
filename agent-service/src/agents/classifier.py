import json
import os

from openai import AsyncOpenAI

from src.models.types import CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.tools.school_proximity import school_proximity_check
from src.tools.sic_lookup import sic_lookup
from src.tools.waterway_check import waterway_check
from src.utils.json_parser import extract_json as _extract_json

NANO_MODEL = "nvidia/nvidia-nemotron-nano-9b-v2"
AGENT_NAME = "Project Classifier"


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_NIM_API_KEY_FAST", ""),
    )


def _get_classifier_tools(county_config: CountyConfig) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": "sic_lookup",
                "description": (
                    f"Look up the most appropriate SIC code for a project. Returns the 4-digit SIC code "
                    f"and whether it falls in a regulated category for {county_config.airDistrict.name} "
                    f"or {county_config.waterBoard.name}."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_type": {
                            "type": "string",
                            "description": "Brief description of the primary business activity",
                        },
                        "has_manufacturing": {"type": "boolean"},
                        "has_chemical_processes": {"type": "boolean"},
                    },
                    "required": ["project_type"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "waterway_proximity_check",
                "description": (
                    f"Check if a project location is near any of {county_config.name}'s "
                    f"303(d) impaired waterbodies."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_description": {
                            "type": "string",
                            "description": "Description of project location including any nearby water features",
                        },
                        "area_of_county": {
                            "type": "string",
                            "description": f"General area (e.g., {', '.join(county_config.locationAreas)})",
                        },
                    },
                    "required": ["location_description"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "school_proximity_check",
                "description": (
                    f"Check if the project site is within 1,000 feet of a school, "
                    f"triggering {county_config.airDistrict.name} stricter TAC limits."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_description": {"type": "string"},
                        "mentions_school_nearby": {"type": "boolean"},
                        "distance_if_known_ft": {"type": "number"},
                    },
                    "required": ["location_description"],
                },
            },
        },
    ]


def _get_system_prompt(county_config: CountyConfig) -> str:
    return f"""You are an expert project classifier for {county_config.name} environmental permitting.
Given a project description, use your tools to:
1. REASON about what type of project this is
2. CALL sic_lookup to determine the SIC code
3. CALL school_proximity_check if any schools or educational facilities are mentioned
4. CALL waterway_proximity_check if any water features, channels, or drainage are mentioned
5. OBSERVE the results and synthesize a classification
6. Identify the city from the address for city-level permit determination

The air quality district for this county is: {county_config.airDistrict.name}
The water board for this county is: {county_config.waterBoard.name}

Think step by step. Explain your reasoning before each tool call.

If the project description includes content extracted from uploaded documents, pay special attention to:
- Chemical names, CAS numbers, and storage quantities (triggers hazmat thresholds)
- Equipment specs: boilers, paint booths, generators, tanks (triggers air permits)
- Process descriptions: coating, plating, printing, welding (triggers source-specific rules)
- Discharge volumes or wastewater descriptions (triggers pretreatment)
- Site acreage, grading volumes, impervious surface area (triggers stormwater)
- Any referenced permit numbers or regulatory citations

After using all relevant tools, provide your final classification as a JSON object with this structure:
{{
  "reasoning_trace": ["step 1 description...", "step 2 description..."],
  "classification": {{
    "sic_code": "4-digit SIC code",
    "sic_description": "SIC description",
    "land_use_type": "Industrial/Commercial/Residential/Mixed-Use",
    "estimated_disturbance_acres": number,
    "near_school": boolean,
    "near_waterway": boolean,
    "involves_hazmat": boolean,
    "location_type": "Urbanized/Rural/Suburban",
    "waterway_name": "name or null",
    "school_distance_ft": number or null,
    "county": "{county_config.id}",
    "city": "detected city name or null",
    "document_extracted_details": "Summary or null"
  }}
}}

IMPORTANT: You MUST call at least the sic_lookup tool. Call waterway_proximity_check and school_proximity_check if there's any indication of nearby water or schools."""


async def _execute_tool(tool_name: str, args: dict, county: str) -> dict:
    if tool_name == "sic_lookup":
        return await sic_lookup(
            project_type=args.get("project_type", ""),
            has_manufacturing=args.get("has_manufacturing", False),
            has_chemical_processes=args.get("has_chemical_processes", False),
        )
    elif tool_name == "waterway_proximity_check":
        return await waterway_check(
            location_description=args.get("location_description", ""),
            county=county,
            area_of_county=args.get("area_of_county", ""),
        )
    elif tool_name == "school_proximity_check":
        return await school_proximity_check(
            location_description=args.get("location_description", ""),
            county=county,
            mentions_school_nearby=args.get("mentions_school_nearby", False),
            distance_if_known_ft=args.get("distance_if_known_ft"),
        )
    return {"error": f"Unknown tool: {tool_name}"}


async def run_classifier(
    project_description: str,
    county_config: CountyConfig,
    emitter: SSEEmitter,
    max_iterations: int = 4,
) -> dict:
    """Run the classifier ReAct agent loop with tool calling."""
    client = _get_client()
    system_prompt = _get_system_prompt(county_config)
    tools = _get_classifier_tools(county_config)

    emitter.emit_agent_start(AGENT_NAME, NANO_MODEL)

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Classify this project for {county_config.name} "
                f"environmental permitting:\n\n{project_description}"
            ),
        },
    ]

    for _ in range(max_iterations):
        response = await client.chat.completions.create(
            model=NANO_MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.3,
            top_p=0.9,
            max_tokens=2048,
        )

        choice = response.choices[0]

        if choice.message.content:
            emitter.emit_thought(AGENT_NAME, choice.message.content)

        if choice.message.tool_calls:
            messages.append(
                {
                    "role": "assistant",
                    "content": choice.message.content or None,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in choice.message.tool_calls
                    ],
                }
            )

            for tc in choice.message.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                emitter.emit_tool_call(AGENT_NAME, fn_name, fn_args)
                tool_result = await _execute_tool(fn_name, fn_args, county_config.id)
                emitter.emit_tool_result(AGENT_NAME, fn_name, tool_result)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(tool_result),
                    }
                )
            continue

        # Final answer — no more tool calls
        result = _extract_json(choice.message.content or "") or choice.message.content
        result_dict = result if isinstance(result, dict) else {"raw": result}
        emitter.emit_agent_complete(AGENT_NAME, result_dict)
        return result_dict

    # Force final answer after max iterations
    messages.append({"role": "user", "content": "Provide your final JSON answer now."})
    final = await client.chat.completions.create(
        model=NANO_MODEL,
        messages=messages,
        max_tokens=2048,
    )
    content = final.choices[0].message.content or ""
    if content:
        emitter.emit_thought(AGENT_NAME, content)
    result = _extract_json(content) or content
    result_dict = result if isinstance(result, dict) else {"raw": result}
    emitter.emit_agent_complete(AGENT_NAME, result_dict)
    return result_dict
