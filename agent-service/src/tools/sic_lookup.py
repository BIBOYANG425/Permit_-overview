from src.tools.rest_client import call_tool


async def sic_lookup(
    project_type: str,
    has_manufacturing: bool = False,
    has_chemical_processes: bool = False,
) -> dict:
    """Look up SIC code for a project type via Next.js endpoint."""
    return await call_tool("sic-lookup", {
        "project_type": project_type,
        "has_manufacturing": has_manufacturing,
        "has_chemical_processes": has_chemical_processes,
    })
