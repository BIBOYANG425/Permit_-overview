import json
import os

from openai import AsyncOpenAI

from src.models.types import CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.utils.json_parser import extract_json as _extract_json

NANO_MODEL = "nvidia/nvidia-nemotron-nano-9b-v2"
AGENT_NAME = "Synthesis Agent"


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_NIM_API_KEY_FAST", ""),
    )


def _get_system_prompt(county_config: CountyConfig) -> str:
    return f"""You are a project management expert specializing in {county_config.name} environmental permitting timelines.

Given the permit determinations from the analysis phase, you must:
1. Identify all permit dependencies (e.g., CEQA must clear before {county_config.airDistrict.name} Permit to Construct)
2. Calculate the critical path — which sequential chain determines total timeline
3. Group permits that can be filed in parallel
4. Produce the optimal filing sequence
5. Flag any risks or warnings

Key dependency rules:
- CEQA clearance must be obtained before: Permit to Construct, Section 404, Section 1602
- Permit to Construct must be obtained before: Permit to Operate
- Building Permit requires: zoning clearance, fire plan check approval
- Zoning Clearance must precede Building Permit
- Fire plan check runs in parallel with building plan check
- Grading permit required before earthwork begins
- HMBP, IGP NOI, CGP NOI, EPA ID Number can be filed immediately
- IWDP can be filed in parallel with CEQA
- Section 404 and Section 1602 typically processed concurrently

Think step by step. Show your dependency reasoning.

Output a JSON object with this structure:
{{
  "synthesis_reasoning": ["step 1...", "step 2..."],
  "recommended_sequence": ["First file these...", "Then file these...", "Finally..."],
  "parallel_tracks": [["Track A permits"], ["Track B permits"]],
  "critical_path": ["CEQA Review", "Permit to Construct", "Permit to Operate"],
  "estimated_total_timeline_months": number,
  "warnings": ["Important warning 1", "Important warning 2"],
  "cost_estimate_range": "$X,XXX - $XX,XXX"
}}"""


_FALLBACK = {
    "synthesis_reasoning": ["Analysis complete"],
    "recommended_sequence": ["File all permits as identified"],
    "parallel_tracks": [],
    "critical_path": [],
    "estimated_total_timeline_months": 12,
    "warnings": [],
    "cost_estimate_range": "Contact agencies for exact costs",
}


async def run_synthesizer(
    project_description: str,
    permit_result: dict,
    county_config: CountyConfig,
    emitter: SSEEmitter,
) -> dict:
    """Run the synthesis agent to build optimal filing sequence."""
    client = _get_client()
    system_prompt = _get_system_prompt(county_config)

    emitter.emit_agent_start(AGENT_NAME, NANO_MODEL)

    # Strip document context for synthesis
    core_project = project_description.split("Extracted from uploaded documents:")[0].strip()

    try:
        response = await client.chat.completions.create(
            model=NANO_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Create optimal permit filing sequence.\n\n"
                        f"Project: {core_project}\n\n"
                        f"Permit Determinations:\n{json.dumps(permit_result, indent=2)}"
                    ),
                },
            ],
            max_tokens=2048,
            temperature=0.2,
            top_p=0.9,
        )

        content = response.choices[0].message.content or ""
        if content:
            emitter.emit_thought(AGENT_NAME, content)

        parsed = _extract_json(content)
        if parsed is None and content:
            emitter.emit_thought(
                AGENT_NAME,
                "Warning: Could not parse synthesis JSON — using fallback timeline.",
            )
            result = {
                **_FALLBACK,
                "synthesis_warning": "Model output could not be parsed — timeline is estimated",
            }
        else:
            result = parsed or _FALLBACK

    except Exception as e:
        emitter.emit_error(f"Synthesis failed: {e}", AGENT_NAME)
        result = {
            **_FALLBACK,
            "synthesis_reasoning": ["Synthesis error — using permit data as-is"],
            "warnings": ["Synthesis agent error — timeline estimated"],
        }

    emitter.emit_agent_complete(AGENT_NAME, result)
    return result
