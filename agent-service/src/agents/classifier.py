import asyncio
import json
import os

from openai import AsyncOpenAI

from src.models.types import CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.tools.classify_business import classify_business
from src.tools.identify_emissions import identify_emissions
from src.tools.check_location import check_location
from src.tools.determine_triggers import determine_triggers
from src.utils.json_parser import extract_json as _extract_json

NANO_MODEL = "nvidia/nvidia-nemotron-nano-9b-v2"
SUPER_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1"
AGENT_NAME = "Project Classifier"


def _get_client(model_tier: str = "fast") -> AsyncOpenAI:
    key_env = "NVIDIA_NIM_API_KEY_FAST" if model_tier == "fast" else "NVIDIA_NIM_API_KEY_REASONING"
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get(key_env, ""),
    )


def _get_classifier_tools(county_config: CountyConfig) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": "classify_business",
                "description": (
                    "Classify a business activity into its SIC code with regulatory flags. "
                    "Returns SIC code, emissions data, IGP status, pretreatment category, "
                    "confidence level, and alternative SIC codes."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "business_activity": {
                            "type": "string",
                            "description": "Primary business activity in standardized terms (e.g., 'printed circuit board manufacturing', 'auto body repair')",
                        },
                        "key_processes": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific industrial processes (e.g., ['soldering', 'chemical etching'])",
                        },
                        "is_manufacturing": {"type": "boolean"},
                        "is_construction": {"type": "boolean"},
                        "is_commercial_service": {"type": "boolean"},
                    },
                    "required": ["business_activity", "is_manufacturing", "is_construction", "is_commercial_service"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "identify_emissions_profile",
                "description": (
                    "Determine the full emissions and waste profile for a facility based on its "
                    "SIC code and specific operations. Returns air pollutants, wastewater types, "
                    "hazmat inventory, waste streams, and regulatory trigger flags."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sic_code": {"type": "string", "description": "4-digit SIC code from classify_business"},
                        "operations": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific operations (e.g., 'spray painting', 'soldering', 'chemical cleaning')",
                        },
                        "has_boiler_or_generator": {"type": "boolean"},
                        "has_refrigeration": {"type": "boolean"},
                        "stores_chemicals": {"type": "boolean"},
                    },
                    "required": ["sic_code", "operations"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "check_location_context",
                "description": (
                    f"Determine regulatory jurisdiction, watershed, school proximity, and "
                    f"environmental flags for a project location in {county_config.name}. "
                    f"Returns AQMD jurisdiction, RWQCB region, nearest 303(d) waterbody, and proximity flags."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city_or_area": {
                            "type": "string",
                            "description": f"City name or area (e.g., 'Vernon', 'unincorporated East Rancho Dominguez', '{county_config.locationAreas[0] if county_config.locationAreas else 'Downtown'}')",
                        },
                        "nearby_water_features": {
                            "type": "string",
                            "description": "Any mentioned water features (e.g., 'near LA River', 'next to drainage channel'). Empty if none.",
                        },
                        "mentions_school": {"type": "boolean", "description": "Whether user mentioned a school or daycare nearby"},
                        "school_distance_ft": {"type": "number", "description": "Distance to school in feet, if mentioned. -1 if unknown."},
                    },
                    "required": ["city_or_area"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "determine_agency_triggers",
                "description": (
                    "Based on classification, emissions, and location, determine which of the 6 "
                    "regulatory agencies need full permit analysis. Returns trigger status, reasons, "
                    "and priority for each agency."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sic_code": {"type": "string"},
                        "is_manufacturing": {"type": "boolean"},
                        "is_construction": {"type": "boolean"},
                        "has_air_emissions": {"type": "boolean"},
                        "has_tac": {"type": "boolean", "description": "Has Toxic Air Contaminant emissions"},
                        "has_process_wastewater": {"type": "boolean"},
                        "has_heavy_metals_in_water": {"type": "boolean"},
                        "has_fog": {"type": "boolean", "description": "Fats, oils, grease in wastewater"},
                        "has_hazardous_waste": {"type": "boolean"},
                        "stores_hazmat": {"type": "boolean"},
                        "near_waterway": {"type": "boolean"},
                        "near_school": {"type": "boolean"},
                        "disturbance_acres": {"type": "number"},
                        "is_new_construction": {"type": "boolean"},
                        "requires_discretionary_approval": {"type": "boolean"},
                        "is_303d_watershed": {"type": "boolean"},
                    },
                    "required": ["sic_code", "is_manufacturing", "is_construction", "has_air_emissions", "stores_hazmat", "near_waterway", "is_new_construction"],
                },
            },
        },
    ]


def _get_system_prompt(county_config: CountyConfig) -> str:
    return f"""You are an expert environmental compliance intake specialist for {county_config.name}, California.
Your role is to interpret a project description and extract structured parameters for permit analysis.

## YOUR PROCESS

**Step 1: Interpret the project.**
Read the user's description. Identify:
- What type of business/activity is this?
- What are the key operations that might generate emissions, wastewater, or waste?
- Where is this located (city, area, nearby features)?
- How large is the operation (square footage, acreage, employees)?

**Step 2: Call your tools IN THIS ORDER:**
1. `classify_business` — get the SIC code and regulatory categories
2. `identify_emissions_profile` — determine pollutants/waste streams from specific operations
3. `check_location_context` — get jurisdiction, watershed, proximity flags
4. `determine_agency_triggers` — determine which agencies need full analysis

**Step 3: Report your classification.**
After all tools return, produce your final classification as JSON with a `confidence` field.

The air quality district for this county is: {county_config.airDistrict.name}
The water board for this county is: {county_config.waterBoard.name}

Think step by step. Explain your reasoning before each tool call.

If the project description includes content extracted from uploaded documents, pay special attention to:
- Chemical names, CAS numbers, and storage quantities (triggers hazmat thresholds)
- Equipment specs: boilers, paint booths, generators, tanks (triggers air permits)
- Process descriptions: coating, plating, printing, welding (triggers source-specific rules)
- Discharge volumes or wastewater descriptions (triggers pretreatment)
- Site acreage, grading volumes, impervious surface area (triggers stormwater)

VOCABULARY LISTS (use these exact terms when applicable):
- Air pollutants: VOC/ROC, NOx, SOx, PM10, PM2.5, CO, lead fumes, acid mist
- Toxic Air Contaminants (TACs): hexavalent chromium, benzene, formaldehyde, perchloroethylene, trichloroethylene, cadmium, arsenic, nickel, lead, methylene chloride
- Wastewater types: process rinse water, cooling water, wash water, plating wastewater, acid/alkaline waste, oily wastewater, equipment cleaning water, none
- Occupancy types: residential, commercial, industrial, mixed, assembly, educational, institutional, hazardous (Group H)

After using all relevant tools, provide your final classification as a JSON object with this structure:
{{
  "confidence": "high" | "medium" | "low",
  "reasoning_trace": ["step 1...", "step 2..."],
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
    "building_sqft": number or null,
    "stories": integer or null,
    "occupancy_type": "occupancy type or null",
    "is_new_construction": boolean or null,
    "project_summary": "1-2 sentence summary",
    "key_operations": ["list of operations"],
    "emissions_profile": {{
      "likely_air_pollutants": ["from vocabulary list"],
      "likely_tacs": ["from TACs list, or empty"],
      "wastewater_types": ["from vocabulary list"],
      "has_fog": false
    }},
    "agency_triggers": {{
      "air_district": boolean,
      "rwqcb": boolean,
      "sanitation_districts": boolean,
      "ceqa": boolean,
      "cdfw_usace": boolean,
      "fire_cupa": boolean
    }}
  }}
}}

IMPORTANT: Call tools in order. Each tool's output informs the next.
Use /no_think mode — do NOT output <think> tags."""


async def _execute_tool(tool_name: str, args: dict, county: str) -> dict:
    if tool_name == "classify_business":
        return await classify_business(
            business_activity=args.get("business_activity", ""),
            key_processes=args.get("key_processes"),
            is_manufacturing=args.get("is_manufacturing", False),
            is_construction=args.get("is_construction", False),
            is_commercial_service=args.get("is_commercial_service", False),
        )
    elif tool_name == "identify_emissions_profile":
        return await identify_emissions(
            sic_code=args.get("sic_code", ""),
            operations=args.get("operations", []),
            has_boiler_or_generator=args.get("has_boiler_or_generator", False),
            has_refrigeration=args.get("has_refrigeration", False),
            stores_chemicals=args.get("stores_chemicals", False),
        )
    elif tool_name == "check_location_context":
        return await check_location(
            city_or_area=args.get("city_or_area", ""),
            nearby_water_features=args.get("nearby_water_features", ""),
            mentions_school=args.get("mentions_school", False),
            school_distance_ft=args.get("school_distance_ft", -1),
            county=county,
        )
    elif tool_name == "determine_agency_triggers":
        return await determine_triggers(
            sic_code=args.get("sic_code", ""),
            is_manufacturing=args.get("is_manufacturing", False),
            is_construction=args.get("is_construction", False),
            has_air_emissions=args.get("has_air_emissions", False),
            stores_hazmat=args.get("stores_hazmat", False),
            near_waterway=args.get("near_waterway", False),
            is_new_construction=args.get("is_new_construction", False),
            has_tac=args.get("has_tac", False),
            has_process_wastewater=args.get("has_process_wastewater", False),
            has_heavy_metals_in_water=args.get("has_heavy_metals_in_water", False),
            has_fog=args.get("has_fog", False),
            has_hazardous_waste=args.get("has_hazardous_waste", False),
            near_school=args.get("near_school", False),
            disturbance_acres=args.get("disturbance_acres", 0),
            requires_discretionary_approval=args.get("requires_discretionary_approval", False),
            is_303d_watershed=args.get("is_303d_watershed", False),
            county=county,
        )
    return {"error": f"Unknown tool: {tool_name}"}


async def run_classifier(
    project_description: str,
    county_config: CountyConfig,
    emitter: SSEEmitter,
    model: str | None = None,
    max_iterations: int = 8,
) -> dict:
    """Run the classifier ReAct agent loop with the new 4-tool chain."""
    model_id = model or NANO_MODEL
    model_tier = "reasoning" if "super" in model_id or "49b" in model_id else "fast"
    client = _get_client(model_tier)
    system_prompt = _get_system_prompt(county_config)
    tools = _get_classifier_tools(county_config)

    emitter.emit_agent_start(AGENT_NAME, model_id)

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
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=model_id,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3,
                top_p=0.9,
                max_tokens=3072,
            ),
            timeout=90,
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
                    emitter.emit_thought(
                        AGENT_NAME,
                        f"Warning: Could not parse arguments for {fn_name}, using defaults.",
                    )

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
    final = await asyncio.wait_for(
        client.chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=3072,
        ),
        timeout=90,
    )
    content = final.choices[0].message.content or ""
    if content:
        emitter.emit_thought(AGENT_NAME, content)
    result = _extract_json(content) or content
    result_dict = result if isinstance(result, dict) else {"raw": result}
    emitter.emit_agent_complete(AGENT_NAME, result_dict)
    return result_dict
