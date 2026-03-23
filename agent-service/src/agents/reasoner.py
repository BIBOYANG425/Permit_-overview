import asyncio
import json
import os
import re

from openai import AsyncOpenAI

from src.models.types import CityConfig, CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.utils.json_parser import extract_json as _extract_json

SUPER_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1"
AGENT_NAME = "Permit Reasoning Agent"


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_NIM_API_KEY_REASONING", ""),
    )


def _get_agency_groups(
    county_config: CountyConfig,
    city_config: CityConfig | None,
) -> list[dict]:
    groups = [
        {
            "name": "Air & Water",
            "agencies": [
                f"{county_config.airDistrict.name} ({county_config.airDistrict.code})",
                f"{county_config.waterBoard.name} ({county_config.waterBoard.code})",
            ],
            "tool_keys": ["air_permit", "dust", "tac", "igp", "cgp"],
        },
        {
            "name": "Sanitation & CEQA",
            "agencies": [
                f"{county_config.wastewater.name} ({county_config.wastewater.code})",
                "CEQA Lead Agency (CEQA)",
            ],
            "tool_keys": ["sanitation", "ceqa"],
        },
        {
            "name": "Waterways & HazMat",
            "agencies": [
                "CDFW + US Army Corps (CDFW_USACE)",
                f"{county_config.fireCupa.name} ({county_config.fireCupa.code})",
            ],
            "tool_keys": ["cdfw", "usace", "fire_hazmat", "fire_hazwaste"],
        },
    ]

    if city_config:
        groups.append(
            {
                "name": "City Permits & Fire",
                "agencies": [
                    f"{city_config.buildingDept.name} (Building)",
                    f"{city_config.planningDept.name} (Planning)",
                    f"{city_config.fireDept.name} (Fire)",
                    f"{city_config.publicWorks.name} (PublicWorks)",
                ],
                "tool_keys": ["city_permits", "fire_review"],
            }
        )

    return groups


def _split_document_context(project_desc: str) -> tuple[str, str]:
    match = re.search(r"(?:\r?\n|^)\s*Extracted from uploaded documents:", project_desc)
    if not match:
        return project_desc, ""
    return project_desc[: match.start()], project_desc[match.start() :]


def _build_agency_prompt(
    group: dict,
    core_project: str,
    classification: dict,
    tool_results: dict,
    document_context: str,
) -> str:
    relevant = {k: tool_results.get(k) for k in group["tool_keys"]}

    prompt = f"""Analyze permit requirements for ONLY these agencies: {', '.join(group['agencies'])}

Project: {core_project}

Classification: {json.dumps(classification, indent=2)}

Pre-computed threshold results (already evaluated — use these directly, do NOT re-check):
{json.dumps(relevant, indent=2)}"""

    if document_context:
        prompt += f"""

UPLOADED DOCUMENT CONTEXT (use these details to inform your analysis — they may contain chemical inventories, equipment specs, process descriptions, or site plans that affect permit requirements):
{document_context}"""

    prompt += f"""

Based on these threshold results{' and uploaded document details' if document_context else ''}, determine which permits are required for each agency.
For each permit, state: permit_name, required (boolean), confidence, reason (cite specific rule), timeline_weeks, forms, priority, estimated_cost.

Output JSON:
{{
  "agency_analyses": [
    {{
      "agency": "Full Name",
      "agency_code": "CODE",
      "reasoning_chain": [{{"type":"thought","content":"..."}}],
      "permits": [{{ "permit_name":"...", "required":true, "confidence":"high", "reason":"...", "timeline_weeks":12, "forms":["..."], "priority":"critical", "estimated_cost":"$X" }}]
    }}
  ]
}}"""
    return prompt


async def run_reasoner(
    project_description: str,
    classification: dict,
    tool_results: dict,
    county_config: CountyConfig,
    city_config: CityConfig | None,
    emitter: SSEEmitter,
) -> dict:
    """Run parallel permit analysis across agency groups."""
    client = _get_client()

    emitter.emit_agent_start(AGENT_NAME, SUPER_MODEL)
    emitter.emit_thought(
        AGENT_NAME,
        f"Pre-computed {len(tool_results)} threshold checks across all agencies. "
        f"Running parallel analysis...",
    )

    system_prompt = (
        f"You are an expert {county_config.name} environmental permit analyst.\n"
        f"You receive pre-computed threshold check results and must determine which "
        f"permits are required.\n\n"
        f"Use the ReAct pattern with the precomputed threshold data provided:\n"
        f"- THOUGHT: State what you're evaluating and why\n"
        f"- REFERENCE: Cite the relevant precomputed result (threshold check, CEQA exemption, SIC trigger) and its value\n"
        f"- OBSERVATION: Analyze what the precomputed result means for this agency\n"
        f"- THOUGHT: Draw a conclusion and move to the next agency\n\n"
        f"Be concise. Cite specific rules. Output valid JSON only.\n\n"
        f"{county_config.regulationsKB}"
    )

    groups = _get_agency_groups(county_config, city_config)
    core_project, document_context = _split_document_context(project_description)

    async def analyze_group(group: dict) -> dict:
        user_msg = _build_agency_prompt(
            group, core_project, classification, tool_results, document_context
        )
        emitter.emit_thought(AGENT_NAME, f"Analyzing {group['name']}...")

        try:
            response = await client.chat.completions.create(
                model=SUPER_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                max_tokens=3000,
                temperature=0.2,
                top_p=0.9,
            )

            content = response.choices[0].message.content or ""
            emitter.emit_thought(AGENT_NAME, f"{group['name']} analysis complete.")

            parsed = _extract_json(content)
            if not isinstance(parsed, dict) or "agency_analyses" not in parsed:
                emitter.emit_thought(
                    AGENT_NAME,
                    f"Warning: {group['name']} output missing expected agency_analyses structure.",
                )
                parsed = None
        except Exception as e:
            emitter.emit_thought(
                AGENT_NAME,
                f"Error analyzing {group['name']}: {e}",
            )
            parsed = None

        return {"group_name": group["name"], "parsed": parsed}

    results = await asyncio.gather(*[analyze_group(g) for g in groups])

    # Merge all agency analyses
    failed_groups = [r["group_name"] for r in results if not r["parsed"]]
    all_analyses: list = []
    for r in results:
        if r["parsed"] and "agency_analyses" in r["parsed"]:
            all_analyses.extend(r["parsed"]["agency_analyses"])

    permit_result: dict = {"agency_analyses": all_analyses}
    if failed_groups:
        permit_result["parse_warnings"] = failed_groups

    emitter.emit_agent_complete(AGENT_NAME, permit_result)
    return permit_result
