from src.agents.classifier import run_classifier
from src.agents.reasoner import run_reasoner
from src.agents.synthesizer import run_synthesizer
from src.models.types import CityConfig, CountyConfig
from src.streaming.sse_emitter import SSEEmitter
from src.tools.precompute import precompute_tool_results
from src.tools.rest_client import call_tool


async def run_pipeline(
    project_description: str,
    county: str = "la",
    city: str = "",
    emitter: SSEEmitter | None = None,
) -> None:
    """Orchestrate the full Classifier → PreCompute → Reasoner → Synthesizer pipeline."""
    if emitter is None:
        emitter = SSEEmitter()

    try:
        # 1. Fetch county and city configs from Next.js
        county_data = await call_tool("county-config", {"id": county}, method="GET")
        county_config = CountyConfig(**county_data)

        # Pass projectDescription so the endpoint can auto-detect city from address
        city_params = {"city": city, "county": county}
        if not city:
            city_params["projectDescription"] = project_description
        city_data = await call_tool("city-config", city_params, method="GET")
        city_config = CityConfig(**city_data)

        # 2. Run Classifier ReAct agent
        classification_result = await run_classifier(
            project_description=project_description,
            county_config=county_config,
            emitter=emitter,
        )

        # 3. Pre-compute all tool results (single HTTP call to Next.js)
        tool_results = await precompute_tool_results(
            classification=classification_result,
            county=county,
            city=city,
        )

        # 4. Run Permit Reasoner (parallel agency analysis)
        permit_result = await run_reasoner(
            project_description=project_description,
            classification=classification_result,
            tool_results=tool_results,
            county_config=county_config,
            city_config=city_config,
            emitter=emitter,
        )

        # 5. Run Synthesizer
        synthesis_result = await run_synthesizer(
            project_description=project_description,
            permit_result=permit_result,
            county_config=county_config,
            emitter=emitter,
        )

        # 6. Emit final result
        emitter.emit_final_result(
            {
                "classification": classification_result,
                "agency_analyses": permit_result.get("agency_analyses", []),
                "synthesis": synthesis_result,
            }
        )

    except Exception as e:
        emitter.emit_error(f"Pipeline failed: {e}")
    finally:
        emitter.done()
