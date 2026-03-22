from src.tools.rest_client import call_tool


async def waterway_check(
    location_description: str,
    county: str = "la",
    area_of_county: str = "",
) -> dict:
    """Check waterway proximity via Next.js endpoint."""
    return await call_tool("waterway-check", {
        "location_description": location_description,
        "area_of_county": area_of_county,
        "county": county,
    })
