import os
import re
import json
import base64
import qrcode
import time
import io
import pdfplumber  # Required for Groq text extraction
from datetime import datetime
from PIL import Image, ImageDraw
from firebase_admin import credentials, firestore, storage, initialize_app, _apps
from pypdf import PdfReader, PdfWriter 
from groq import Groq # Optimized for Groq SDK
from urllib.parse import quote_plus 
from dotenv import load_dotenv

# ==============================================================================
# 1. CONFIGURATION & DIRECTORIES
# ==============================================================================

load_dotenv()

# Set up temporary directories for containerized environments
QR_DIR = "/tmp/qrcodes"
SPLIT_DIR = "/tmp/temp_split_certs"

for d in [QR_DIR, SPLIT_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, mode=0o777, exist_ok=True)

# AI Client Setup (Groq)
api_key = os.getenv("GROQ_API_KEY")
client = None

if api_key:
    client = Groq(api_key=api_key)
else:
    print("⚠️ WARNING: GROQ_API_KEY is missing from environment variables!")

# PRIORITY LIST: Groq models optimized for speed and JSON accuracy
MODEL_PRIORITY = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
]

# ==============================================================================
# 2. FIREBASE SETUP
# ==============================================================================
def get_firebase_db():
    FIREBASE_BUCKET_NAME = os.getenv("FIREBASE_BUCKET")
    FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")

    if not _apps:
        try:
            # Decode the Base64 Service Account JSON for secure container usage
            firebase_dict = json.loads(base64.b64decode(FIREBASE_CREDENTIALS).decode("utf-8"))
            cred = credentials.Certificate(firebase_dict)
            initialize_app(cred, {'storageBucket': FIREBASE_BUCKET_NAME})
        except Exception as e:
            print(f"❌ Firebase Init Error: {e}")
            raise e
    return firestore.client(), storage.bucket()

# ==============================================================================
# 3. PDF PROCESSING UTILITIES
# ==============================================================================
def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', "_", str(name)).strip()

def extract_text_from_pdf(file_path):
    """
    Groq is a text-based LLM. This function extracts raw text from the PDF 
    to be passed as a prompt.
    """
    full_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += f"\n--- Page {page.page_number} ---\n{text}"
        return full_text
    except Exception as e:
        print(f"❌ Text Extraction Error: {e}")
        return None

def split_pdf_to_pages(original_path):
    page_paths = []
    try:
        reader = PdfReader(original_path)
        for i, page in enumerate(reader.pages):
            output_filename = f"split_p{i}_{int(time.time())}.pdf"
            output_path = os.path.join(SPLIT_DIR, output_filename)
            writer = PdfWriter()
            writer.add_page(page)
            with open(output_path, "wb") as f:
                writer.write(f)
            page_paths.append((output_path, i + 1))
        return page_paths
    except Exception as e:
        print(f"❌ PDF Split Error: {e}")
        return []

# ==============================================================================
# 4. GROQ AI EXTRACTION LOGIC
# ==============================================================================
def process_pdf_text(file_path, is_service=False, manual_type=None, model_index=0):
    """
    Extracts text via pdfplumber and sends to Groq using JSON Mode.
    Falls back to smaller models on rate limits (429).
    """
    pages_list = split_pdf_to_pages(file_path)
    pdf_text = extract_text_from_pdf(file_path)
    
    if not pdf_text or not client:
        return {"status": "failed", "error": "Could not read PDF text or AI client not ready."}
    
    if model_index >= len(MODEL_PRIORITY):
        return {
            "status": "failed", 
            "error": "All Groq models exhausted.",
            "temp_files": [{"page": p[1], "path": p[0]} for p in pages_list]
        }

    current_model = MODEL_PRIORITY[model_index]

    try:
        prompt = f"""
        Analyze the following text from a safety certificate PDF. Identify every unique item.
        Return a JSON LIST of objects inside a root key named 'items'. 
        
        Fields for each item:
        - serial (6-digit serial number)
        - model (Full brand description)
        - cal (Inspection Date YYYY-MM-DD)
        - exp (Expiry Date YYYY-MM-DD)
        - cert (Certificate Number)
        - lot (Report or Lot Number)
        - page (Which '--- Page X ---' the data was found on)
        - type (HARNESS, ABSORBER, GD, EEBD, SCBA, or SMOKE HOOD)

        PDF TEXT CONTENT:
        {pdf_text}
        """

        completion = client.chat.completions.create(
            model=current_model,
            messages=[
                {"role": "system", "content": "You are a data extraction bot. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        # Parse Groq response
        response_data = json.loads(completion.choices[0].message.content)
        items = response_data.get("items", [])
        
        cleaned_data = []
        for item in items:
            # Match item to its physically split page
            item['local_split_path'] = next((p[0] for p in pages_list if p[1] == item.get('page')), file_path)
            
            # Formatting logic for service certificates
            if item.get("cert") and ".SRV" in item["cert"]:
                item["cert"] = item["cert"].split(".SRV")[0] + ".SRV"
            
            b_type = str(item.get("type", "PPE")).upper().replace("_", " ")
            item["target_collection"] = b_type + ("_SERVICE" if is_service else "")
            cleaned_data.append(item)

        return {"status": "success", "data": cleaned_data}

    except Exception as e:
        if "429" in str(e):
            print(f"⚠️ Groq Quota Hit. Retrying with next model...")
            return process_pdf_text(file_path, is_service, manual_type, model_index + 1)
        
        print(f"❌ Groq AI Error: {e}")
        return {"status": "failed", "error": str(e)}

# ==============================================================================
# 5. STORAGE & DATABASE
# ==============================================================================
def generate_qr_image_only(serial, link):
    safe_serial = sanitize_filename(serial)
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(link)
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    
    final = Image.new("RGBA", (500, 600), "white")
    final.paste(qr_img.resize((500, 500)), (0, 0))
    
    draw = ImageDraw.Draw(final)
    draw.text((20, 530), f"SN: {serial}", fill="black")
    
    path = os.path.join(QR_DIR, f"qr_{safe_serial}.png")
    final.convert("RGB").save(path)
    return path

def upload_to_firebase_storage(local_path, serial, is_qr=False):
    try:
        _, bucket = get_firebase_db()
        safe_serial = sanitize_filename(serial)
        
        timestamp = int(time.time())
        blob_name = f"qr_codes/qr_{safe_serial}.png" if is_qr else f"certificates/{safe_serial}_{timestamp}.pdf"
        
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(local_path)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"❌ Upload Error: {e}")
        return None

def update_firestore_record(collection_name, serial, data, pdf_url, qr_url, qr_link):
    try:
        db, _ = get_firebase_db()
        doc_id = sanitize_filename(serial)
        doc_ref = db.collection(collection_name).document(doc_id)
        
        doc_data = {
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
        
        doc_ref.set(doc_data, merge=True)
        return True
    except Exception as e:
        print(f"❌ Firestore Error: {e}")
        return False