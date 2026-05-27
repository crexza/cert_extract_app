import os
import logging
from groq import Groq, GroqError

logger = logging.getLogger("groq_rotator")

def get_all_keys():
    """Gathers all keys defined in .env like GROQ_API_KEY_1, GROQ_API_KEY_2, etc."""
    keys = []
    i = 1
    while True:
        key = os.getenv(f"GROQ_API_KEY_{i}")
        if not key: break
        keys.append(key)
        i += 1
    # Include original single key as fallback if needed
    if not keys and os.getenv("GROQ_API_KEY"):
        keys.append(os.getenv("GROQ_API_KEY"))
    return keys

api_keys = get_all_keys()
current_key_index = 0

def chat_completion_with_failover(*args, **kwargs):
    global current_key_index
    attempts = 0
    while attempts < len(api_keys):
        try:
            # Use current key
            client = Groq(api_key=api_keys[current_key_index])
            return client.chat.completions.create(*args, **kwargs)
        except GroqError as e:
            attempts += 1
            # Check for Rate Limit (429) or Server Error (5xx)
            if getattr(e, "status_code", None) in [429] or (getattr(e, "status_code", 0) >= 500):
                old_index = current_key_index
                current_key_index = (current_key_index + 1) % len(api_keys)
                logger.warning(f"Key {old_index} failed. Rotating to {current_key_index}")
                continue
            raise e
    raise RuntimeError("All Groq accounts exhausted.")