import re
import json
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)

def clean_ai_json(raw_text: str) -> str:
    """
    Cleans AI output that may contain markdown artifacts or prefix text.
    Ensures that only the valid JSON block is parsed.
    """
    # Find potential JSON blocks (between curly braces)
    # Using a slightly conservative regex to capture the outermost object
    match = re.search(r"({.*})", raw_text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return raw_text.strip()

def parse_safely(raw_text: str) -> Dict[str, Any]:
    """
    Attempts to parse JSON from AI response, cleaning markdown code blocks if necessary.
    """
    try:
        # Standard cleaning
        cleaned = clean_ai_json(raw_text)
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("JSON parsing failure", error=str(e), original_text=raw_text)
        return {"error": "Malformed response", "raw_content": raw_text}

def truncate_text(text: str, max_words: int = 1000) -> str:
    """
    Utility for preventing context overflow by truncating long inputs.
    """
    words = text.split()
    if len(words) > max_words:
        return " ".join(words[:max_words]) + "..."
    return text
