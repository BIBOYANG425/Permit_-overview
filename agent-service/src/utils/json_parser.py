import json
import re


def _strip_noise(text: str) -> str:
    """Remove known LLM noise that wraps JSON output."""
    # <think>...</think> blocks from reasoning models (even with /no_think)
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)
    # Markdown code fences: ```json ... ``` or just ``` ... ```
    text = re.sub(r"```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?\s*```", "", text)
    return text


def _find_balanced_objects(text: str) -> list[str]:
    """Find every top-level balanced JSON object in the text.

    Uses a depth counter that respects quoted strings and escape sequences,
    so braces inside `"description": "use { to open"` don't trip the parser.
    """
    objects: list[str] = []
    depth = 0
    start = -1
    in_string = False
    escape = False

    for i, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start >= 0:
                    objects.append(text[start : i + 1])
                    start = -1
    return objects


def _try_parse(candidate: str) -> dict | None:
    """Try strict json.loads, then tolerate trailing commas."""
    try:
        result = json.loads(candidate)
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        pass
    cleaned = re.sub(r",\s*}", "}", candidate)
    cleaned = re.sub(r",\s*]", "]", cleaned)
    try:
        result = json.loads(cleaned)
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        return None


def extract_json(text: str) -> dict | None:
    """Extract a JSON object from LLM output.

    Handles the common ways LLMs wrap JSON:
      - Markdown code fences (```json ... ```)
      - <think>...</think> reasoning blocks
      - Prose before/after the object
      - Trailing commas
      - Multiple candidate objects (picks the largest that parses)

    Returns None if no parseable object is found.
    """
    if not text:
        return None

    cleaned = _strip_noise(text)

    # Walk every balanced {...} in the cleaned text. Prefer the largest
    # object that parses — the classifier schema is big, so when the model
    # emits a nested example in its reasoning, we still want the real
    # top-level output, not the first tiny fragment.
    candidates = _find_balanced_objects(cleaned)
    best: dict | None = None
    best_size = 0
    for c in candidates:
        parsed = _try_parse(c)
        if parsed is not None and len(c) > best_size:
            best = parsed
            best_size = len(c)

    if best is not None:
        return best

    # Last-resort fallback: greedy first-brace-to-last-brace (old behavior).
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        return _try_parse(match.group(0))
    return None
