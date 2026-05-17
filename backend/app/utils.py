import os
import re
import json
import base64
import qrcode
import time
import io
import uuid
import pdfplumber
from datetime import datetime
from PIL import Image, ImageDraw
from firebase_admin import credentials, firestore, storage, initialize_app, _apps
from pypdf import PdfReader, PdfWriter 
from groq import Groq 
from urllib.parse import quote_plus 
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed 

# Try importing pytesseract wrapper safely
try:
    import pytesseract
    if os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
except ImportError:
    pytesseract = None

# ==============================================================================
# 1. CONFIGURATION & STATE MANIFEST MANAGEMENT
# ==============================================================================

load_dotenv()

QR_DIR = "/tmp/qrcodes"
SPLIT_DIR = "/tmp/temp_split_certs"

for working_directory in [QR_DIR, SPLIT_DIR]:
    if not os.path.exists(working_directory):
        os.makedirs(working_directory, mode=0o777, exist_ok=True)

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

if not client:
    print("⚠️ BACKEND WARNING: 'GROQ_API_KEY' environment property cannot be resolved.")

MODEL_PRIORITY = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
]

# ==============================================================================
# 2. FIREBASE CENTRAL CONNECTIVITY PROVIDER
# ==============================================================================
def get_firebase_db():
    FIREBASE_BUCKET_NAME = os.getenv("FIREBASE_BUCKET")
    FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")

    if not _apps:
        try:
            decoded_json_bytes = base64.b64decode(FIREBASE_CREDENTIALS)
            firebase_config_dict = json.loads(decoded_json_bytes.decode("utf-8"))
            service_account_cred = credentials.Certificate(firebase_config_dict)
            initialize_app(service_account_cred, {'storageBucket': FIREBASE_BUCKET_NAME})
        except Exception as system_error:
            print(f"❌ Core connection error initialization: {system_error}")
            raise system_error
            
    return firestore.client(), storage.bucket()

# ==============================================================================
# 3. GRANULAR PDF PROCESSING CORNERSTONE FUNCTIONS
# ==============================================================================
def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', "_", str(name)).strip()

def preprocess_scraped_text(raw_text):
    if not raw_text:
        return ""
    cleaned = raw_text.replace('\\"', '"').replace('\\n', '\n')
    lines = [line.strip() for line in cleaned.split('\n')]
    return '\n'.join([line for line in lines if line.strip()])

def split_pdf_to_pages(original_path):
    """Splits PDF and assigns UUIDs to prevent file overwrite crashes."""
    compiled_page_paths = []
    try:
        file_reader = PdfReader(original_path)
        unique_file_token = str(uuid.uuid4())[:8]
        for index, individual_page in enumerate(file_reader.pages):
            managed_filename = f"split_{unique_file_token}_p{index+1}.pdf"
            secured_export_path = os.path.join(SPLIT_DIR, managed_filename)
            file_writer = PdfWriter()
            file_writer.add_page(individual_page)
            with open(secured_export_path, "wb") as output_stream:
                file_writer.write(output_stream)
            compiled_page_paths.append((secured_export_path, index + 1))
        return compiled_page_paths
    except Exception as split_error:
        print(f"❌ Internal process splitter failed: {split_error}")
        return []

def extract_master_text(file_path):
    """
    Extracts text from the master file using pdfplumber/pypdf.
    If the text engine detects corrupted font encodings (missing letters/digits),
    it automatically falls back to an OCR scan layer to safeguard data extraction.
    """
    page_texts = {}
    
    # Engine 1: pdfplumber extraction loop
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_texts[i + 1] = page.extract_text() or ""
    except Exception as e:
        print(f"pdfplumber master extraction failed: {e}")

    # Engine 2: pypdf fallback for blank strings or incomplete structural elements
    try:
        reader = PdfReader(file_path)
        for i, page in enumerate(reader.pages):
            pg_num = i + 1
            if not page_texts.get(pg_num) or not page_texts[pg_num].strip():
                page_texts[pg_num] = page.extract_text() or ""
    except Exception as e:
        print(f"pypdf master extraction failed: {e}")

    # Engine 3: Hardened Robust Dynamic OCR Fallback
    for pg_num, text in list(page_texts.items()):
        clean_chars = re.sub(r'[^a-zA-Z0-9]', '', text)
        if not text.strip() or len(clean_chars) < 30:
            print(f"⚠️ Font layer looks broken ({len(clean_chars)} valid chars) on page {pg_num}. Booting OCR...")
            if pytesseract:
                try:
                    with pdfplumber.open(file_path) as pdf:
                        page_obj = pdf.pages[pg_num - 1]
                        pil_img = page_obj.to_image(resolution=300).original
                        ocr_string = pytesseract.image_to_string(pil_img)
                        
                        if ocr_string.strip():
                            page_texts[pg_num] = ocr_string
                            print(f"✅ OCR extraction layer successful on page {pg_num}")
                        else:
                            print(f"⚠️ OCR completed on page {pg_num} but retrieved zero valid characters.")
                except Exception as ocr_err:
                    print(f"❌ CRITICAL SYSTEM ERROR: OCR compilation crashed. Reason: {ocr_err}")
                    print("👉 Fix: Ensure tesseract-ocr software application is installed on your machine system.")
            else:
                print("❌ OCR Fallback skipped: Python package 'pytesseract' is not imported correctly.")

    # Apply sanitation filters to clean text blocks uniformly
    for pg_num in page_texts:
        page_texts[pg_num] = preprocess_scraped_text(page_texts[pg_num])
        
    return page_texts

# ==============================================================================
# 4. STRUCTURAL GROQ AI JSON CONVERSION INTERFACES
# ==============================================================================
def process_single_page_task(pg_file, pg_num, page_text, is_service, model_index, valid_types):
    """Isolated target worker dispatched concurrently across thread workers to resolve channel timeout lags."""
    fallback_record = {
        "serial": "MANUAL_ENTRY_REQUIRED",
        "model": "Unreadable PDF Font - Please Fill Manually",
        "cal": datetime.today().strftime('%Y-%m-%d'),
        "exp": datetime.today().strftime('%Y-%m-%d'),
        "cert": "PENDING", "lot": "", "page": pg_num, "type": "GD",
        "target_collection": "GD" + ("_SERVICE" if is_service else ""),
        "debugging_error_log": "Critical: PDF font layers were completely unreadable. Manual data entry required."
    }

    if not page_text.strip():
        return [fallback_record]

    active_target_model = MODEL_PRIORITY[model_index] if model_index < len(MODEL_PRIORITY) else MODEL_PRIORITY[0]
    
    try:
        structured_prompt = f"""
        You are a highly precise data extractor. Read this safety certificate page and map the values to JSON.
        
        CRITICAL RULES:
        1. AREA MONITOR: The text will NEVER say "Area Monitor". If the model is 'CROWCON, DETECTIVE+', 'ISC, VENTIS MX4', or 'HONEYWELL, BW RIGRAT', classify it as 'AREA MONITOR'.
        2. RESCUE KIT: Rescue kits list many serials for sub-components (Rope Grab, Ascender, etc). IGNORE THEM. ONLY extract the main kit serial labeled simply 'Serial Number:'.
        3. SCBA / HARNESS / ABSORBER SERIALS: Serials often contain colons (:), slashes (/), and pipes (|). Example: '01010635:0181 | 01010635:0182' or 'C025/4710'. Do NOT alter, split, or truncate these. Extract the exact string.
        4. LINE BREAKS: If 'Serial Number:' is on one line, the actual serial number is usually on the IMMEDIATE NEXT LINE below it.
        5. DATES: Convert all dates (e.g., '28/8/2025', '19/12/2024', 'August 20') into 'YYYY-MM-DD'.

        Return a single JSON object. If you cannot find a serial number, return "MANUAL_ENTRY_REQUIRED".

        {{
          "serial": "exact_string_or_MANUAL_ENTRY_REQUIRED",
          "model": "exact_string",
          "cal": "YYYY-MM-DD",
          "exp": "YYYY-MM-DD",
          "cert": "exact_string",
          "lot": "exact_string_or_blank",
          "type": "CHOSEN_KEYWORD_FROM_VALID_LIST",
          "debugging_error_log": "None or brief explanation of what was difficult"
        }}

        CERTIFICATE TEXT:
        {page_text}
        """
        
        inference_completion = client.chat.completions.create(
            model=active_target_model,
            messages=[
                {"role": "system", "content": "You are a deterministic mapping engine. Output a single JSON object only. Never fail."},
                {"role": "user", "content": structured_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        specific_item = json.loads(inference_completion.choices[0].message.content)
        
        if not specific_item.get("serial") or str(specific_item["serial"]).strip().lower() in ["null", "none", "", "n/a"]:
            specific_item["serial"] = "MANUAL_ENTRY_REQUIRED"
            specific_item["debugging_error_log"] = "AI missed the serial number. Manual entry required."
        
        if specific_item.get("cert") and ".SRV" in str(specific_item["cert"]):
            specific_item["cert"] = str(specific_item["cert"]).split(".SRV")[0] + ".SRV"
            
        # ----------------------------------------------------------------------
        # Native Python Fallback Router: Overrides AI mapping if text matching drops
        # ----------------------------------------------------------------------
        normalized_text = page_text.upper()
        detected_asset_type = str(specific_item.get("type", "GD")).upper().strip().replace("_", " ")

        if "ESCAPE-15" in normalized_text or "ESCAPE 15" in normalized_text:
            detected_asset_type = "EEBD"
        elif "DETECTIVE+" in normalized_text or "CROWCON" in normalized_text:
            detected_asset_type = "AREA MONITOR"
        elif "RESCUE KIT" in normalized_text:
            detected_asset_type = "RESCUE KIT"
        elif "CONFINED SPACE HARNESS" in normalized_text or "PROFESSIONAL HARNESS" in normalized_text:
            detected_asset_type = "HARNESS"
        elif "SHOCK ABSORBING LANYARD" in normalized_text or "ABSORBER" in normalized_text:
            detected_asset_type = "ABSORBER"
        elif "SMOKE HOOD" in normalized_text or "DRAEGER PARAT" in normalized_text:
            detected_asset_type = "SMOKE HOOD"
        elif "BREATHING APPARATUS" in normalized_text or "SCBA" in normalized_text:
            detected_asset_type = "SCBA"
        elif "PDM+" in normalized_text or "WATCHGAS" in normalized_text:
            detected_asset_type = "GD"

        normalized_asset_type = detected_asset_type if detected_asset_type in valid_types else "GD"
        specific_item["type"] = normalized_asset_type
        
        local_extracted_results = []
        if normalized_asset_type == "ABSORBER" and "|" in str(specific_item["serial"]):
            piped_serial_tokens = [t.strip() for t in str(specific_item["serial"]).split("|") if t.strip()]
            for component_serial in piped_serial_tokens:
                cloned_item = specific_item.copy()
                cloned_item["serial"] = component_serial
                cloned_item["local_split_path"] = pg_file
                cloned_item["page"] = pg_num
                cloned_item["target_collection"] = "ABSORBER" + ("_SERVICE" if is_service else "")
                local_extracted_results.append(cloned_item)
        else:
            specific_item['local_split_path'] = pg_file
            specific_item['page'] = pg_num
            specific_item["target_collection"] = normalized_asset_type + ("_SERVICE" if is_service else "")
            local_extracted_results.append(specific_item)
            
        return local_extracted_results

    except Exception as error:
        fallback_record["debugging_error_log"] = f"API Error: {str(error)}. File was saved safely."
        return [fallback_record]

def process_pdf_text(file_path, is_service=False, manual_type=None, model_index=0):
    isolated_pages = split_pdf_to_pages(file_path)
    page_text_map = extract_master_text(file_path)
    finalized_clean_records = []
    
    valid_types = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT"]

    with ThreadPoolExecutor(max_workers=8) as pool_dispatcher:
        future_worker_map = {
            pool_dispatcher.submit(
                process_single_page_task, 
                pg_file, pg_num, page_text_map.get(pg_num, ""), 
                is_service, model_index, valid_types
            ): pg_num for pg_file, pg_num in isolated_pages
        }
        
        for individual_worker_task in as_completed(future_worker_map):
            page_records_list = individual_worker_task.result()
            finalized_clean_records.extend(page_records_list)
            
    finalized_clean_records.sort(key=lambda item: item.get("page", 1))
            
    return {"status": "success", "data": finalized_clean_records}

# ==============================================================================
# 5. DATA PERMANENCE STORAGE PLATFORM WRAPPERS
# ==============================================================================
def generate_qr_image_only(serial, link):
    clean_serial_id = sanitize_filename(serial)
    qr_engine = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr_engine.add_data(link)
    qr_engine.make(fit=True)
    generated_qr_raster = qr_engine.make_image(fill_color="black", back_color="white").convert("RGBA")
    canvas_container = Image.new("RGBA", (500, 600), "white")
    canvas_container.paste(generated_qr_raster.resize((500, 500)), (0, 0))
    canvas_container_drawer = ImageDraw.Draw(canvas_container)
    canvas_container_drawer.text((20, 530), f"SN: {serial}", fill="black")
    constructed_file_path = os.path.join(QR_DIR, f"qr_{clean_serial_id}.png")
    canvas_container.convert("RGB").save(constructed_file_path)
    return constructed_file_path

def upload_to_firebase_storage(local_path, serial, is_qr=False):
    try:
        _, cloud_storage_bucket = get_firebase_db()
        clean_serial_id = sanitize_filename(serial)
        current_epoch_timestamp = int(time.time())
        remote_blob_destination = f"qr_codes/qr_{clean_serial_id}.png" if is_qr else f"certificates/{clean_serial_id}_{current_epoch_timestamp}.pdf"
        active_storage_blob = cloud_storage_bucket.blob(remote_blob_destination)
        active_storage_blob.upload_from_filename(local_path)
        active_storage_blob.make_public()
        return active_storage_blob.public_url
    except Exception as remote_upload_error:
        print(f"❌ Storage infrastructure failed file upload operation: {remote_upload_error}")
        return None

def update_firestore_record(collection_name, serial, data, pdf_url, qr_url, qr_link):
    try:
        firestore_db_client, _ = get_firebase_db()
        target_document_id = sanitize_filename(serial)
        target_document_reference = firestore_db_client.collection(collection_name).document(target_document_id)
        consolidated_payload = {
            "serial": serial, 
            "cert": data.get("cert", ""), 
            "model": data.get("model", ""),
            "calibration_date": data.get("cal", ""), 
            "expiry_date": data.get("exp", ""),
            "lot": data.get("lot", ""), 
            "pdf_url": pdf_url, 
            "qr_image_url": qr_url,
            "qr_link": qr_link, 
            "last_updated": firestore.SERVER_TIMESTAMP,
            "source_page": data.get("page", 1)
        }
        target_document_reference.set(consolidated_payload, merge=True)
        return True
    except Exception as db_mutation_error:
        print(f"❌ Firestore document insertion pipeline broke: {db_mutation_error}")
        return False