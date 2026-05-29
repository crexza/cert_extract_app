import os
import json
import uuid
import logging
import asyncio  # Added to ensure complete support for asynchronous execution routines
from datetime import datetime
from .pdf_processing import is_valid_safety_document
# Import the custom multi-account failover wrapper to handle automatic key rotation
from .groq_rotator import chat_completion_with_failover

# Setup local logger for debugging tracking if required
logger = logging.getLogger("ai_mapping")

# Model priorities used for key extraction
MODEL_PRIORITY = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


async def process_single_page_task(pg_file, pg_num, page_text, is_service, valid_types):
    """
    Parses a single page document using Groq LLM with multi-account rotation support.
    Validates the text structure upfront, manages structural prompt templates, and
    enforces downstream schema constraints asynchronously to prevent blocking Render health checks.
    """

    unique_staging_id = f"STAGE_OK_{uuid.uuid4().hex[:6].upper()}"
    today_str = datetime.today().strftime('%Y-%m-%d')

    # 1. EARLY BLOCKING GATEWAY FOR NON-COMPLIANT DOCUMENTS
    if not page_text or not page_text.strip() or not is_valid_safety_document(page_text):
        return {
            "id": f"STAGE_ERR_{uuid.uuid4().hex[:6].upper()}",
            "serial": "MANUAL_ENTRY_REQUIRED",
            "model": "Unknown Model",
            "calibration_date": today_str,
            "expiry_date": today_str,
            "cal": today_str,
            "exp": today_str,
            "cert": "PENDING",
            "lot": "",
            "page": pg_num,
            "type": "UNRESOLVED",
            "target_collection": "UNRESOLVED",
            "is_valid": False,
            "error_explanation": "Document filter flag rejection. Not recognized as a Calibration Certificate or Inspection form."
        }

    try:
        # The failover rotation system initializes clients dynamically on the fly.
        structured_prompt = f"""
Analyze the following text extracted via OCR from a safety equipment certificate.

Extract the target fields carefully.

If dates are written in words (e.g. 'January 13, 2026'),
convert them to ISO format 'YYYY-MM-DD'.

If a target field is missing from the document,
set its value to an empty string ("").

AVAILABLE TARGET COLLECTION TYPES:
{valid_types if valid_types else ["AREA MONITOR", "ABSORBER", "HARNESS", "EEBD", "SCBA", "SMOKE HOOD", "RESCUE KIT", "GD"]}

DOCUMENT TEXT:
{page_text}
"""

        # FIXED: Prefixed the call with 'await' to execute the async key rotator correctly
        inference = await chat_completion_with_failover(
            model=MODEL_PRIORITY[0],
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert data parsing agent that outputs ONLY a raw JSON object.\n"
                        "Do NOT wrap the JSON in markdown.\n"
                        "Do NOT use triple backticks.\n"
                        "Return ONLY valid JSON.\n"
                        "You must return exactly these JSON fields:\n"
                        "- 'serial': string (e.g., '50113', if missing set to '')\n"
                        "- 'model': string (e.g., 'CROWCON, DETECTIVE+', if missing set to '')\n"
                        "- 'calibration_date': string formatted as 'YYYY-MM-DD' (if missing use current date)\n"
                        "- 'expiry_date': string formatted as 'YYYY-MM-DD' (if missing use current date)\n"
                        "- 'cert': string certificate reference number (if missing set to '')\n"
                        "- 'lot': string cylinder/batch tracking lot number.\n"
                        "CRITICAL RULE:\n"
                        "If no batch tracking lot number or cylinder lot number is explicitly mentioned,\n"
                        "look for a 'Report No' or 'Report Number' in the document text and place that value here.\n"
                        "Do not confuse this with the Certificate reference number (`cert`).\n"
                        "If both are missing, set to ''.\n"
                        "- 'type': string matching one of the provided target collections based on asset keyword contexts.\n\n"
                        "CRITICAL CLASSIFICATION RULE:\n"
                        "1. If the document text or model description contains 'rigrat', 'mx4', or 'detective+',\n"
                        "you MUST force the 'type' field calculation value to be exactly: 'AREA MONITOR'.\n"
                        "2. If the document text mentions gas detection, calibration gases, gas cylinders,\n"
                        "or displays metrics for combustible/toxic sensors (like H2S, O2, CO, LEL)\n"
                        "but does NOT explicitly match the 'AREA MONITOR' keywords above,\n"
                        "you MUST classify its type as: 'GD'."
                    )
                },
                {
                    "role": "user",
                    "content": structured_prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )

        # Deserialize JSON response content safely from the resolved async object
        raw_content = inference.choices[0].message.content

        print("\n========== RAW GROQ RESPONSE ==========")
        print(raw_content)
        print("=======================================\n")

        # Clean markdown wrappers if Groq adds them
        cleaned_content = (
            raw_content
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        # Extract JSON object safely
        import re
        match = re.search(r"\{.*\}", cleaned_content, re.S)

        if not match:
            raise Exception("No valid JSON object found in Groq response")

        item = json.loads(match.group())

        # Hydrate base operational tracking identifiers
        item["id"] = unique_staging_id
        item["page"] = pg_num
        item["pdf_url"] = None

        # Enforce validation fallback values
        if not item.get("serial"):
            item["serial"] = "MANUAL_ENTRY_REQUIRED"

        if not item.get("model"):
            item["model"] = "Unknown Model"

        if not item.get("cert"):
            item["cert"] = "PENDING"

        if not item.get("lot"):
            item["lot"] = ""

        if not item.get("calibration_date"):
            item["calibration_date"] = today_str

        if not item.get("expiry_date"):
            item["expiry_date"] = today_str

        # Set standardized aliases
        item["cal"] = item["calibration_date"]
        item["exp"] = item["expiry_date"]

        # Parse type constraints and routing tags
        detected_type = item.get("type", "GD").upper()

        if (
            item["serial"] == "MANUAL_ENTRY_REQUIRED"
            and item["model"] == "Unknown Model"
        ):
            item["type"] = "UNRESOLVED"
            item["target_collection"] = "UNRESOLVED"
            item["is_valid"] = False
            item["error_explanation"] = (
                "Asset metadata could not be fully resolved by AI."
            )

        else:
            item["type"] = detected_type
            item["target_collection"] = (
                detected_type + ("_SERVICE" if is_service else "")
            )
            item["is_valid"] = True
            item["error_explanation"] = (
                f"Successfully parsed via AI mapping into collection: {detected_type}."
            )

        return item

    except Exception as error:
        logger.error(
            f"Mapping pipeline failure on page {pg_num}: {str(error)}"
        )

        return {
            "id": f"STAGE_ERR_{uuid.uuid4().hex[:6].upper()}",
            "serial": "MANUAL_ENTRY_REQUIRED",
            "model": "Unknown Model",
            "calibration_date": today_str,
            "expiry_date": today_str,
            "cal": today_str,
            "exp": today_str,
            "cert": "PENDING",
            "lot": "",
            "page": pg_num,
            "type": "UNRESOLVED",
            "target_collection": "UNRESOLVED",
            "is_valid": False,
            "error_explanation": f"Inference Exception Error: {str(error)}"
        }