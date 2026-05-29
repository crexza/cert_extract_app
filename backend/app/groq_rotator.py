import os
import logging
# We switch to AsyncGroq to prevent blocking the Uvicorn event loop during API calls
from groq import AsyncGroq, GroqError

logger = logging.getLogger("groq_rotator")

def get_all_keys():
    """Gathers all keys defined in .env like GROQ_API_KEY_1, GROQ_API_KEY_2, etc."""
    keys = []
    i = 1
    while True:
        key = os.getenv(f"GROQ_API_KEY_{i}")
        if not key: 
            break
        keys.append(key)
        i += 1
    
    # Include original single key as fallback if needed
    if not keys and os.getenv("GROQ_API_KEY"):
        keys.append(os.getenv("GROQ_API_KEY"))
    return keys

# Initialize API keys configuration
api_keys = get_all_keys()
current_key_index = 0

# OPTIMIZATION: Instead of re-instantiating clients inside the loop every single call,
# we pre-create the AsyncGroq client instances to reuse persistent TCP connections (HTTP Keep-Alive).
async_clients = [AsyncGroq(api_key=key) for key in api_keys]

async def chat_completion_with_failover(*args, **kwargs):
    """
    Asynchronously executes a chat completion request with an automatic API key rotation failover mechanism.
    By utilizing 'async/await', this function yields control back to Uvicorn during network I/O, 
    allowing health checks to pass even while waiting on Groq's response.
    """
    global current_key_index
    attempts = 0
    total_keys = len(async_clients)
    
    # Ensure we don't break if no keys were successfully configured in the environment
    if total_keys == 0:
        raise RuntimeError("No Groq API keys configured in environment variables.")
        
    while attempts < total_keys:
        try:
            # Select the pre-warmed client pointing to our current active index
            client = async_clients[current_key_index]
            
            # Using 'await' allows the server to process concurrent incoming requests (like health checks)
            return await client.chat.completions.create(*args, **kwargs)
            
        except GroqError as e:
            attempts += 1
            status_code = getattr(e, "status_code", 0)
            
            # Check for Rate Limit (429) or Server/Gateway Error (5xx) codes
            if status_code == 429 or status_code >= 500:
                old_index = current_key_index
                current_key_index = (current_key_index + 1) % total_keys
                logger.warning(f"Groq Client Key {old_index} failed (Status: {status_code}). Rotating to Key {current_key_index}")
                continue
                
            # If it's a 400 Bad Request or authentication issue, fail early instead of cycling keys endlessly
            raise e
            
    raise RuntimeError("All configured Groq API accounts have been exhausted or rate limited.")