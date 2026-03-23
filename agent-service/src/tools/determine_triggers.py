from src.tools.rest_client import call_tool


async def determine_triggers(
    sic_code: str,
    is_manufacturing: bool,
    is_construction: bool,
    has_air_emissions: bool,
    stores_hazmat: bool,
    near_waterway: bool,
    is_new_construction: bool,
    has_tac: bool = False,
    has_process_wastewater: bool = False,
    has_heavy_metals_in_water: bool = False,
    has_fog: bool = False,
    has_hazardous_waste: bool = False,
    near_school: bool = False,
    disturbance_acres: float = 0,
    requires_discretionary_approval: bool = False,
    is_303d_watershed: bool = False,
    county: str = "la",
) -> dict:
    """Determine which regulatory agencies are triggered for this project."""
    return await call_tool("determine-triggers", {
        "sic_code": sic_code,
        "is_manufacturing": is_manufacturing,
        "is_construction": is_construction,
        "has_air_emissions": has_air_emissions,
        "has_tac": has_tac,
        "has_process_wastewater": has_process_wastewater,
        "has_heavy_metals_in_water": has_heavy_metals_in_water,
        "has_fog": has_fog,
        "has_hazardous_waste": has_hazardous_waste,
        "stores_hazmat": stores_hazmat,
        "near_waterway": near_waterway,
        "near_school": near_school,
        "disturbance_acres": disturbance_acres,
        "is_new_construction": is_new_construction,
        "requires_discretionary_approval": requires_discretionary_approval,
        "is_303d_watershed": is_303d_watershed,
        "county": county,
    })
