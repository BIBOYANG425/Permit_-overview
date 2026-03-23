from src.tools.rest_client import call_tool


async def check_location(
    city_or_area: str,
    nearby_water_features: str = "",
    mentions_school: bool = False,
    school_distance_ft: int = -1,
    county: str = "la",
) -> dict:
    """Check location context: jurisdiction, watershed, school proximity."""
    payload: dict = {
        "city_or_area": city_or_area,
        "county": county,
    }
    if nearby_water_features:
        payload["nearby_water_features"] = nearby_water_features
    if mentions_school:
        payload["mentions_school"] = mentions_school
    if school_distance_ft > 0:
        payload["school_distance_ft"] = school_distance_ft
    return await call_tool("check-location", payload)
