from src.tools.rest_client import call_tool


async def classify_business(
    business_activity: str,
    key_processes: list[str] | None = None,
    is_manufacturing: bool = False,
    is_construction: bool = False,
    is_commercial_service: bool = False,
) -> dict:
    """Classify a business activity into SIC code with regulatory flags."""
    payload: dict = {
        "business_activity": business_activity,
        "is_manufacturing": is_manufacturing,
        "is_construction": is_construction,
        "is_commercial_service": is_commercial_service,
    }
    if key_processes:
        payload["key_processes"] = key_processes
    return await call_tool("classify-business", payload)
