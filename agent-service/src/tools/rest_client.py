import asyncio
import os

import httpx

_client: httpx.AsyncClient | None = None


def get_tools_base_url() -> str:
    return os.environ.get("TOOLS_BASE_URL", "http://localhost:3000/api/tools")


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


async def call_tool(
    endpoint: str,
    payload: dict | None = None,
    method: str = "POST",
    max_retries: int = 3,
) -> dict:
    """Call a Next.js REST tool endpoint with retry for transient failures."""
    client = await get_client()
    url = f"{get_tools_base_url()}/{endpoint}"

    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            if method == "GET":
                response = await client.get(url, params=payload)
            else:
                response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            last_error = e
            if attempt < max_retries - 1:
                await asyncio.sleep(1.0 * (attempt + 1))
        except httpx.HTTPStatusError:
            raise  # Don't retry HTTP errors (4xx, 5xx)

    raise last_error or RuntimeError(f"Failed to call {endpoint} after {max_retries} retries")
