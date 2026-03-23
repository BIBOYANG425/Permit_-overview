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


def _get_agency_groups(instruction_set: dict, city_config: CityConfig | None) -> list[dict]:
    """Build parallel analysis groups from instruction set agency_instructions."""
    agency_map = {ai["agency_id"]: ai for ai in instruction_set.get("agency_instructions", [])}

    groups = [
        {
            "name": "Air & Water",
            "agency_ids": ["air_district", "water_board"],
            "instructions": [agency_map.get("air_district"), agency_map.get("water_board")],
        },
        {
            "name": "Sanitation & CEQA",
            "agency_ids": ["wastewater", "ceqa"],
            "instructions": [agency_map.get("wastewater"), agency_map.get("ceqa")],
        },
        {
            "name": "Waterways & HazMat",
            "agency_ids": ["cdfw_usace", "cupa"],
            "instructions": [agency_map.get("cdfw_usace"), agency_map.get("cupa")],
        },
    ]

    if city_config and agency_map.get("city_permits"):
        groups.append({
            "name": "City Permits & Fire",
            "agency_ids": ["city_permits"],
            "instructions": [agency_map.get("city_permits")],
        })

    return groups


def _split_document_context(project_desc: str) -> tuple[str, str]:
    match = re.search(r"(?:\r?\n|^)\s*Extracted from uploaded documents:", project_desc)
    if not match:
        return project_desc, ""
    return project_desc[: match.start()], project_desc[match.start() :]


def _build_agency_prompt(
    group: dict,
    core_project: str,
    instruction_set: dict,
    document_context: str,
) -> str:
    """Build a prompt from instruction set agency instructions."""
    instructions = [i for i in group["instructions"] if i is not None]
    project_summary = instruction_set.get("project_summary", "")

    prompt = f"Project: {core_project}\n\n"
    if project_summary:
        prompt += f"Project Summary: {project_summary}\n\n"

    for inst in instructions:
        prompt += f"=== {inst['agency_name']} ===\n"
        prompt += f"Triggered: {inst['triggered']}\n"
        prompt += f"Priority: {inst['priority']}\n"
        prompt += f"Instructions: {inst['analysis_instructions']}\n\n"

        if inst.get("rules_to_evaluate"):
            prompt += "Rules to evaluate:\n"
            for rule in inst["rules_to_evaluate"]:
                prompt += (
                    f"- {rule['rule_id']}: {rule['rule_name']} "
                    f"(applies: {rule['applies']}, reason: {rule['reason']})\n"
                )
            prompt += "\n"

        if inst.get("expected_permits"):
            prompt += f"Expected permits: {', '.join(inst['expected_permits'])}\n"

        if inst.get("key_questions"):
            prompt += "Key questions to answer:\n"
            for q in inst["key_questions"]:
                prompt += f"- {q}\n"
        prompt += "\n"

    if document_context:
        prompt += (
            f"\nUPLOADED DOCUMENT CONTEXT (use these details to inform your analysis):\n"
            f"{document_context}\n"
        )

    prompt += """
For each agency, answer the key questions and determine which permits are required.
If triggered is false, briefly confirm why and skip detailed analysis.
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
}"""
    return prompt


async def run_reasoner(
    project_description: str,
    classification: dict,
    instruction_set: dict,
    county_config: CountyConfig,
    city_config: CityConfig | None,
    emitter: SSEEmitter,
) -> dict:
    """Run parallel permit analysis across agency groups using instruction set."""
    client = _get_client()

    n_agencies = len(instruction_set.get("agency_instructions", []))
    emitter.emit_agent_start(AGENT_NAME, SUPER_MODEL)
    emitter.emit_thought(
        AGENT_NAME,
        f"Received instruction set with {n_agencies} agency instructions. "
        f"Running parallel analysis...",
    )

    system_prompt = (
        f"You are an expert {county_config.name} environmental permit analyst.\n"
        f"You receive a Permit Analysis Instruction Set from the Classifier Agent.\n\n"
        f"For each agency section:\n"
        f"- Read the analysis_instructions carefully — they contain county-specific guidance\n"
        f"- Evaluate each rule in rules_to_evaluate\n"
        f"- Answer each question in key_questions\n"
        f"- If triggered is false, briefly confirm why and skip detailed analysis\n"
        f"- DO NOT use LA County rules for Ventura County projects or vice versa\n\n"
        f"Use the ReAct pattern:\n"
        f"- THOUGHT: State what you're evaluating and why\n"
        f"- REFERENCE: Cite the relevant rule and its threshold\n"
        f"- OBSERVATION: Analyze what the result means for this agency\n"
        f"- THOUGHT: Draw a conclusion and move to the next agency\n\n"
        f"Be concise. Cite specific rules. Output valid JSON only.\n\n"
        f"{county_config.regulationsKB}"
    )

    groups = _get_agency_groups(instruction_set, city_config)
    core_project, document_context = _split_document_context(project_description)

    async def analyze_group(group: dict) -> dict:
        user_msg = _build_agency_prompt(
            group, core_project, instruction_set, document_context
        )
        emitter.emit_thought(AGENT_NAME, f"Analyzing {group['name']}...")

        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=SUPER_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg},
                    ],
                    max_tokens=3000,
                    temperature=0.2,
                    top_p=0.9,
                ),
                timeout=120,
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
