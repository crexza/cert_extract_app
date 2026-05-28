import os
import shutil
import time
import qrcode
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from app.firebase_config import get_firebase_db
from app.pdf_processing import split_pdf_to_pages, extract_master_text, sanitize_filename
import app.ai_mapping as ai_mapping
from firebase_admin import firestore
from pydantic import BaseModel
from urllib.parse import quote_plus

TEMP_PDF_DIR = "/tmp/temp_pdfs"
os.makedirs(TEMP_PDF_DIR, exist_ok=True)


app = FastAPI(
    title="CertExtract Core API",
    description="Decoupled backend microservice managing Firestore entity mapping and AI extraction routines.",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "CertExtract Functional API Engine"
    }

# --- CORS INTERCEPTOR CONFIGURATION ---
# Allows explicit connection parameters from your Vite development and containerized environments
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cert_extract_app.web.app"
]
>>>>>>> aa03381 (Add root endpoint for Render health check)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema definitions for multi-selection data deletions
class DeleteRecordsPayload(BaseModel):
    collection: str
    ids: List[str]

# Request schema definitions for updating/editing records without requiring a new file binary stream
class EditRecordPayload(BaseModel):
    collection: str
    id: str
    serial: str
    model: Optional[str] = ""
    calibration_date: str
    expiry_date: str
    cert: Optional[str] = ""
    lot: Optional[str] = ""

@app.get("/api/collections")
def list_collections():
    base_assets = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT", "UNRESOLVED"]
    compiled = []
    for asset in base_assets:
        compiled.append(asset)
        if asset != "UNRESOLVED":
            compiled.append(f"{asset}_SERVICE")
    return {"collections": compiled}

@app.get("/api/collection/{name}")
def get_collection_data(name: str):
    try:
        db, _ = get_firebase_db()
        docs = db.collection(name).stream()
        data_payload = []
        for doc in docs:
            record = doc.to_dict()
            record["id"] = doc.id
            if record.get("last_updated"):
                record["last_updated"] = record["last_updated"].isoformat()
            data_payload.append(record)
        return {"data": data_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...), is_service: str = Form("false")):
    temporary_file_path = os.path.join(TEMP_PDF_DIR, f"upload_{int(os.getpid())}_{file.filename}")
    try:
        with open(temporary_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        is_service_bool = (is_service.lower() == "true")
        isolated_pages = split_pdf_to_pages(temporary_file_path)
        page_text_map = extract_master_text(temporary_file_path)
        
        valid_types = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT"]
        extracted_manifest = []
        
        _, bucket = get_firebase_db()
        preview_blob = bucket.blob(f"previews/{int(time.time())}_{file.filename}")
        preview_blob.upload_from_filename(temporary_file_path)
        preview_blob.make_public()

        for pg_file, pg_num in isolated_pages:
            text_context = page_text_map.get(pg_num, "")
            parsed_row = ai_mapping.process_single_page_task(pg_file, pg_num, text_context, is_service_bool, valid_types)
            parsed_row["pdf_url"] = preview_blob.public_url
            extracted_manifest.append(parsed_row)
            
        return {"status": "success", "data": extracted_manifest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temporary_file_path):
            os.remove(temporary_file_path)

@app.post("/save")
async def save_record(
    file: UploadFile = File(...),
    serial: str = Form(...),
    model: str = Form(""),
    cal: str = Form(...),
    exp: str = Form(...),
    cert: str = Form(""),
    lot: str = Form(""),
    collection: str = Form(...)
):
    temporary_file_path = os.path.join(TEMP_PDF_DIR, f"save_{int(os.getpid())}_{file.filename}")
    try:
        print(f"📥 Received save payload for SN: {serial} into Collection: {collection}")
        
        with open(temporary_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        db, bucket = get_firebase_db()
        clean_serial = sanitize_filename(serial)
        
        # 1. Upload certificate PDF to Firebase Storage
        pdf_blob = bucket.blob(f"certificates/{clean_serial}_{int(time.time())}.pdf")
        pdf_blob.upload_from_filename(temporary_file_path)
        pdf_blob.make_public()
        
        target_web_link = f"https://qrcertificates-30ddb.web.app/?id={quote_plus(serial)}"
        
        # FIXED: Self-contained direct inline QR generation script blocks to bypass missing ai_mapping function attributes
        qr_engine = qrcode.QRCode(version=1, box_size=10, border=4)
        qr_engine.add_data(target_web_link)
        qr_engine.make(fit=True)
        qr_image = qr_engine.make_image(fill_color="black", back_color="white")
        
        local_qr_path = os.path.join(TEMP_PDF_DIR, f"qr_{clean_serial}_{int(time.time())}.png")
        qr_image.save(local_qr_path)
        
        # 2. Upload QR Image to Firebase Storage
        qr_blob = bucket.blob(f"qr_codes/qr_{clean_serial}.png")
        qr_blob.upload_from_filename(local_qr_path)
        qr_blob.make_public()
        
        # Clean up local temporary QR image immediately after upload completes
        if os.path.exists(local_qr_path):
            os.remove(local_qr_path)
        
        consolidated_payload = {
            "serial": serial,
            "cert": cert,
            "model": model,
            "calibration_date": cal,
            "expiry_date": exp,
            "lot": lot,
            "pdf_url": pdf_blob.public_url,
            "qr_image_url": qr_blob.public_url,
            "qr_link": target_web_link,
            "last_updated": firestore.SERVER_TIMESTAMP,
            "source_page": 1
        }
        
        collection_ref = db.collection(collection)
        collection_ref.document(clean_serial).set(consolidated_payload, merge=True)
        return {"status": "success", "web_link": target_web_link}
        
    except Exception as e:
        import traceback
        print("❌ CRITICAL BACKEND SAVE FAILURE ERROR OVER COLLECTION:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")
    finally:
        if os.path.exists(temporary_file_path):
            os.remove(temporary_file_path)

@app.post("/api/records/edit")
async def edit_record(payload: EditRecordPayload = Body(...)):
    """
    Updates details of an existing document within a collection without altering original PDF attachments.
    """
    try:
        db, _ = get_firebase_db()
        clean_id = sanitize_filename(payload.id)
        doc_ref = db.collection(payload.collection).document(clean_id)
        
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Target document reference not found in database.")
            
        update_payload = {
            "serial": payload.serial,
            "model": payload.model,
            "calibration_date": payload.calibration_date,
            "expiry_date": payload.expiry_date,
            "cert": payload.cert,
            "lot": payload.lot,
            "last_updated": firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.set(update_payload, merge=True)
        return {"status": "success", "message": "Record successfully updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to modify dataset document: {str(e)}")

@app.delete("/api/records/delete")
async def delete_records(payload: DeleteRecordsPayload = Body(...)):
    """
    Permanently deletes single or batch target records inside a Firestore collection context.
    Matches clean collection routes mapped from UI selections.
    """
    try:
        db, _ = get_firebase_db()
        collection_ref = db.collection(payload.collection)
        
        batch = db.batch()
        deleted_count = 0
        
        for doc_id in payload.ids:
            clean_id = sanitize_filename(doc_id)
            doc_ref = collection_ref.document(clean_id)
            batch.delete(doc_ref)
            deleted_count += 1
            
        batch.commit()
        return {"status": "success", "message": f"Successfully dropped {deleted_count} system records."}
    except Exception as e:
        print(f"❌ Failed processing drop manifest requests inside FireStore Engine: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database execution crash: {str(e)}")