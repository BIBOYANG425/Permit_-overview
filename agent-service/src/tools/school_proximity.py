from src.tools.rest_client import call_tool


async def school_proximity_check(
    location_description: str,
    county: str = "la",
    mentions_school_nearby: bool = False,
    distance_if_known_ft: float | None = None,
) -> dict:
    """Check school proximity via Next.js endpoint."""
    payload: dict = {
        "location_description": location_description,
        "county": county,
        "mentions_school_nearby": mentions_school_nearby,
    }
    if distance_if_known_ft is not None:
        payload["distance_if_known_ft"] = distance_if_known_ft
    return await call_tool("school-proximity", payload)
