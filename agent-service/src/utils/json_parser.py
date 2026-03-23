import json
import re


def extract_json(text: str) -> dict | None:
    """Extract the first JSON object from LLM output text.

    Handles trailing commas and other common LLM JSON formatting issues.
    """
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        try:
            cleaned = re.sub(r",\s*}", "}", match.group(0))
            cleaned = re.sub(r",\s*]", "]", cleaned)
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None
