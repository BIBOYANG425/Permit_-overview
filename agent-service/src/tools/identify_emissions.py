from src.tools.rest_client import call_tool


async def identify_emissions(
    sic_code: str,
    operations: list[str],
    has_boiler_or_generator: bool = False,
    has_refrigeration: bool = False,
    stores_chemicals: bool = False,
) -> dict:
    """Identify emissions profile from operations using deterministic mapping."""
    return await call_tool("identify-emissions", {
        "sic_code": sic_code,
        "operations": operations,
        "has_boiler_or_generator": has_boiler_or_generator,
        "has_refrigeration": has_refrigeration,
        "stores_chemicals": stores_chemicals,
    })
