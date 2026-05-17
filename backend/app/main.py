import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import app.utils as utils  # Standardized app directory relative mapping

# --- RUNTIME DIRECTORY INITIALIZATION ---
# Using isolated container-friendly /tmp file targets uniform with your utils file
TEMP_PDF_DIR = "/tmp/temp_pdfs"
os.makedirs(TEMP_PDF_DIR, exist_ok=True)

app = FastAPI(
    title="CertExtract Core API",
    description="Decoupled backend microservice managing Firestore entity mapping and AI extraction routines.",
    version="1.0.0"
)

# --- CORS INTERCEPTOR CONFIGURATION ---
# Allows explicit connection parameters from your Vite development and containerized environments
ALLOWED_ORIGINS = [
    "http://localhost:5173",            # Default Vite Dev Server Local Port
    "http://127.0.0.1:5173",            # Vite Dev Server Loopback Address
    "http://localhost:3000",            # Production Docker Container Frontend Port
    "http://127.0.0.1:3000",            # Production Docker Container Loopback Address
    "https://cert_extract_app.web.app"  # Production Firebase URL mapping
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEB / ROOT MANAGEMENT ---
@app.get("/", tags=["Root"])
def read_root():
    """
    Returns standard structural telemetry metadata to indicate the API is operational.
    """
    return {
        "status": "online",
        "service": "CertExtract Functional API Engine",
        "endpoints": ["/api/collections", "/api/search", "/extract", "/save"]
    }

@app.get("/favicon.ico", include_in_schema=False)
async def serve_backend_favicon():
    """
    Catches automatic browser hits to backend root favicon routes.
    Returns a blank status 204 to maintain console cleanliness since Vite handles the client icon.
    """
    return FileResponse(status_code=204)

# --- COLLECTIONS MANAGEMENT ---
@app.get("/api/collections", tags=["Firestore Collections"])
def list_collections():
    """
    Generates a list of all raw master item collections and service sub-tables.
    """
    base_assets = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT"]
    compiled_collections = []
    
    for asset in base_assets:
        compiled_collections.append(asset)
        compiled_collections.append(f"{asset}_SERVICE")
        
    return {"collections": compiled_collections}

@app.get("/api/collection/{name}", tags=["Firestore Collections"])
def get_collection_data(name: str):
    """
    Streams snapshot records matching specific firestore database table queries.
    """
    try:
        db, _ = utils.get_firebase_db()
        docs = db.collection(name).stream()

        data_payload = []
        for doc in docs:
            record_dict = doc.to_dict()
            record_dict["id"] = doc.id

            if record_dict.get("last_updated"):
                # Formats datetime timestamps smoothly for JavaScript client ingestion
                record_dict["last_updated"] = record_dict["last_updated"].isoformat()

            data_payload.append(record_dict)

        return {"data": data_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database streaming failure: {str(e)}")

# --- SEARCH ACTIONS ---
@app.get("/api/search", tags=["Query Operations"])
def search_all(q: str):
    """
    Iterates cross-collection indexes looking for an explicit Document ID or Serial string match.
    """
    db, _ = utils.get_firebase_db()
    query_string = q.strip()

    base_assets = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT"]
    collections_index = base_assets + [f"{b}_SERVICE" for b in base_assets]

    search_results = []
    sanitized_query = utils.sanitize_filename(query_string)

    for collection_name in collections_index:
        # Step 1: Query directly by Document Key ID for lightning fast O(1) matching
        document_snapshot = db.collection(collection_name).document(sanitized_query).get()
        if document_snapshot.exists:
            record_data = document_snapshot.to_dict()
            record_data["id"] = document_snapshot.id
            record_data["collection"] = collection_name
            search_results.append(record_data)
            continue

        # Step 2: Fallback query checking internal properties via an index scan
        fallback_stream = db.collection(collection_name).where("serial", "==", query_string).stream()
        for active_doc in fallback_stream:
            record_data = active_doc.to_dict()
            record_data["id"] = active_doc.id
            record_data["collection"] = collection_name
            search_results.append(record_data)

    return {"results": search_results}

# --- UPDATE OPERATIONS ---
@app.post("/api/update_record", tags=["Record Operations"])
async def update_record(
    collection: str = Form(...),
    serial: str = Form(...),
    model: str = Form(""),
    cal: str = Form(""),
    exp: str = Form(""),
    cert: str = Form(""),
    lot: str = Form("")
):
    """
    Updates the target field configurations inside an existing Firestore record.
    """
    try:
        db, _ = utils.get_firebase_db()
        document_key = utils.sanitize_filename(serial)
        
        db.collection(collection).document(document_key).update({
            "model": model,
            "cal": cal,
            "exp": exp,
            "cert": cert,
            "lot": lot
        })
        return {"status": "success", "updated_id": document_key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to modify target entity: {str(e)}")

# --- DELETE OPERATIONS ---
@app.delete("/api/collection/{collection_name}/{doc_id}", tags=["Record Operations"])
def delete_record(collection_name: str, doc_id: str):
    """
    Safely drops a specific certificate entry out of target Firestore collections.
    """
    try:
        db, _ = utils.get_firebase_db()
        sanitized_doc_id = utils.sanitize_filename(doc_id)
        
        # Reference the exact document target path and drop it from the ledger tree
        doc_ref = db.collection(collection_name).document(sanitized_doc_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Target document could not be resolved.")
            
        doc_ref.delete()
        return {"status": "success", "message": f"Document {sanitized_doc_id} successfully purged."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to purge entity tracking records: {str(e)}")

# --- AI DATA EXTRACTION ROUTINES ---
@app.post("/extract", tags=["AI Engineering"])
async def extract_pdf(
    file: UploadFile = File(...),
    is_service: str = Form("false")
):
    """
    Ingests binary multi-page PDF documents and passes structured text targets down to Groq LLM layers.
    """
    temporary_file_path = os.path.join(TEMP_PDF_DIR, f"upload_{int(os.getpid())}_{file.filename}")

    try:
        with open(temporary_file_path, "wb") as storage_buffer:
            shutil.copyfileobj(file.file, storage_buffer)

        extraction_result = utils.process_pdf_text(
            temporary_file_path,
            is_service=(is_service.lower() == "true")
        )
        return extraction_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF ingestion process halted: {str(e)}")
        
    finally:
        if os.path.exists(temporary_file_path):
            os.remove(temporary_file_path)

# --- REMOTE FIREBASE SAVE CONFIGURATIONS ---
@app.post("/save", tags=["Record Operations"])
async def save_record(
    file: UploadFile = File(...),
    serial: str = Form(...),
    model: str = Form(""),
    cal: str = Form(""),
    exp: str = Form(""),
    cert: str = Form(""),
    lot: str = Form(""),
    collection: str = Form(...)
):
    """
    Saves parsed PDF certificates to storage, draws dynamic asset labels, and structures metadata.
    """
    temporary_file_path = os.path.join(TEMP_PDF_DIR, f"save_{int(os.getpid())}_{file.filename}")

    try:
        with open(temporary_file_path, "wb") as storage_buffer:
            shutil.copyfileobj(file.file, storage_buffer)

        # Build dynamic asset records and asset QR paths concurrently
        firebase_pdf_url = utils.upload_to_firebase_storage(temporary_file_path, serial, is_qr=False)
        target_web_link = f"https://qrcertificates-30ddb.web.app/?id={utils.quote_plus(serial)}"
        
        local_qr_img_path = utils.generate_qr_image_only(serial, target_web_link)
        firebase_qr_url = utils.upload_to_firebase_storage(local_qr_img_path, serial, is_qr=True)

        # Pipeline synchronization write directly to live Firestore document tables
        db_sync_status = utils.update_firestore_record(
            collection,
            serial,
            {
                "model": model,
                "cal": cal,
                "exp": exp,
                "cert": cert,
                "lot": lot
            },
            firebase_pdf_url,
            firebase_qr_url,
            target_web_link
        )

        if not db_sync_status:
            raise Exception("Internal wrapper failed to complete transaction to Firestore collections.")

        # Fixed: Returns all required structural URLs to satisfy front-end object properties
        return {
            "status": "success", 
            "web_link": target_web_link,
            "pdf_url": firebase_pdf_url,
            "qr_image_url": firebase_qr_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction runtime aborted: {str(e)}")

    finally:
        if os.path.exists(temporary_file_path):
            os.remove(temporary_file_path)