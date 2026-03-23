from src.tools.rest_client import call_tool


async def precompute_tool_results(
    classification: dict,
    county: str = "la",
    city: str = "",
) -> dict:
    """Pre-compute all threshold results via Next.js batch endpoint."""
    return await call_tool("precompute", {
        "classification": classification,
        "county": county,
        "city": city,
    })
