from src.agents.classifier import run_classifier, NANO_MODEL, SUPER_MODEL
from src.agents.reasoner import run_reasoner
from src.agents.synthesizer import run_synthesizer
from src.models.types import CityConfig, CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.tools.precompute import precompute_tool_results
from src.tools.rest_client import call_tool

# ── Model Router (lightweight, runs in Python) ──

_COMPLEXITY_PATTERNS = [
    (r"(?:and|with|including|plus|also).*(?:and|with|including|plus|also)", 2),
    (r"\b\d{2,7}-\d{2}-\d\b", 3),  # CAS number
    (r"(?:mixed[\s-]?use|multi[\s-]?purpose|conversion|adaptive[\s-]?reuse)", 2),
    (r"(?:uploaded|extracted|document|sds|msds|safety data sheet)", 1),
    (r"(?:trichloroethylene|perchloroethylene|hexavalent|chromium|benzene|cyanide)", 2),
]


def _route_classifier(project_description: str) -> tuple[str, str]:
    """Pick starting model for classifier based on complexity signals."""
    import re
    score = 0
    signals = []
    desc = project_description.lower()

    # Short description penalty
    if len(desc) < 50:
        score += 2
        signals.append("short description")

    for pattern, weight in _COMPLEXITY_PATTERNS:
        matches = re.findall(pattern, desc, re.IGNORECASE)
        if matches:
            score += weight * min(len(matches), 3)
            signals.append(pattern[:20])

    # Count regulatory domain mentions
    domains = re.findall(r"(?:air|water|waste|hazmat|ceqa|stormwater|wastewater)", desc, re.IGNORECASE)
    if len(domains) >= 3:
        score += len(domains)
        signals.append(f"{len(domains)} regulatory terms")

    if score >= 5:
        return SUPER_MODEL, f"High complexity (score {score}): starting with Super 49B"
    return NANO_MODEL, f"Standard complexity (score {score}): starting with Nano 9B"


def _should_escalate(classification: dict, current_model: str) -> tuple[bool, str]:
    """Check if classification should be re-run with a stronger model."""
    if current_model == SUPER_MODEL:
        return False, "Already at max model tier"

    c = classification.get("classification", classification)

    # Check confidence at both nested and wrapper level
    confidence = c.get("confidence", classification.get("confidence"))
    if confidence == "low":
        return True, "Escalating: low confidence — immediate re-run"

    triggers = []
    if c.get("sic_code") == "9999":
        triggers.append("unclassified SIC")
    if c.get("sic_code") == "3999":
        triggers.append("generic manufacturing NEC")

    # Check city at both nested and wrapper level
    city = c.get("city", classification.get("city"))
    if not city:
        triggers.append("no city identified")

    ep = c.get("emissions_profile", {})
    if (
        isinstance(ep, dict)
        and not ep.get("likely_air_pollutants")
        and c.get("involves_hazmat")
    ):
        triggers.append("hazmat but no emissions")

    if len(triggers) >= 2:
        return True, f"Escalating: {', '.join(triggers)}"
    return False, "Classification looks solid"


async def run_pipeline(
    project_description: str,
    county: str = "la",
    city: str = "",
    emitter: SSEEmitter | None = None,
) -> None:
    """Orchestrate the full Model Router → Classifier → PreCompute → Reasoner → Synthesizer pipeline."""
    if emitter is None:
        emitter = SSEEmitter()

    try:
        # 1. Fetch county and city configs from Next.js
        county_data = await call_tool("county-config", {"id": county}, method="GET")
        county_config = CountyConfig(**county_data)

        city_params = {"city": city, "county": county}
        if not city:
            city_params["projectDescription"] = project_description
        city_data = await call_tool("city-config", city_params, method="GET")
        city_config = CityConfig(**city_data)

        # 2. Model Router: pick starting model
        start_model, route_reason = _route_classifier(project_description)
        emitter.emit_model_route("Model Router", start_model, route_reason)

        # 3. Run Classifier with routed model
        classification_result = await run_classifier(
            project_description=project_description,
            county_config=county_config,
            emitter=emitter,
            model=start_model,
        )

        # 3a. Validate classifier output
        if not isinstance(classification_result, dict) or "raw" in classification_result:
            emitter.emit_thought(
                "Pipeline",
                f"Classifier returned malformed result (model: {start_model}), escalating.",
            )
            emitter.emit_model_route("Model Router", SUPER_MODEL, "Malformed classifier output")
            classification_result = await run_classifier(
                project_description=project_description,
                county_config=county_config,
                emitter=emitter,
                model=SUPER_MODEL,
            )
            if not isinstance(classification_result, dict) or "raw" in classification_result:
                emitter.emit_error("Classifier failed to produce structured output after escalation")
                return

        # 4. Check if escalation is needed
        should_escalate, escalate_reason = _should_escalate(classification_result, start_model)
        if should_escalate:
            emitter.emit_model_route("Model Router", SUPER_MODEL, escalate_reason)
            classification_result = await run_classifier(
                project_description=project_description,
                county_config=county_config,
                emitter=emitter,
                model=SUPER_MODEL,
            )

        # 5. Pre-compute instruction set
        classifier_city = ""
        if isinstance(classification_result, dict):
            classifier_city = (
                classification_result.get("city", "")
                or classification_result.get("classification", {}).get("city", "")
            )
        resolved_city = city_config.cityName or classifier_city or city
        if not resolved_city:
            resolved_city = f"{county_config.name} Unincorporated"
            emitter.emit_thought(
                "Pipeline",
                f"No city detected — defaulting to {resolved_city}.",
            )
        instruction_set = await precompute_tool_results(
            classification=classification_result,
            county=county,
            city=resolved_city,
        )

        # 6. Run Permit Reasoner (parallel agency analysis)
        permit_result = await run_reasoner(
            project_description=project_description,
            classification=classification_result,
            instruction_set=instruction_set,
            county_config=county_config,
            city_config=city_config,
            emitter=emitter,
        )

        # 7. Run Synthesizer
        synthesis_result = await run_synthesizer(
            project_description=project_description,
            permit_result=permit_result,
            county_config=county_config,
            emitter=emitter,
        )

        # 8. Emit final result
        emitter.emit_final_result(
            {
                "classification": classification_result,
                "instruction_set": instruction_set,
                "agency_analyses": permit_result.get("agency_analyses", []),
                "synthesis": synthesis_result,
            }
        )

    except Exception as e:
        emitter.emit_error(f"Pipeline failed: {e}")
    finally:
        emitter.done()
