from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import shutil
import os
import utils as utils

# --- SETUP ---
# Ensure necessary directories exist
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
# Use /tmp to ensure write permissions in containerized environments
TEMP_DIR = "/tmp/temp_pdfs"
os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI()

# Mount static files (logos, css)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- CORS ---
# Required so your index.html (Frontend) can talk to this API (Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEB UI ---
@app.get("/", response_class=HTMLResponse)
async def serve_admin_panel(request: Request):
    if not os.path.exists("templates/index.html"):
        return HTMLResponse("<h2>Error: index.html not found in backend/templates/</h2>", status_code=404)
    
    # FIXED: Updated syntax for newer Starlette/FastAPI versions
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={}
    )

# --- COLLECTIONS ---
@app.get("/api/collections")
def list_collections():
    base = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT"]
    # Generates standard and _SERVICE collections dynamically
    return {
        "collections": [c for b in base for c in (b, f"{b}_SERVICE")]
    }

@app.get("/api/collection/{name}")
def get_collection_data(name: str):
    try:
        db, _ = utils.get_firebase_db()
        docs = db.collection(name).stream()

        data = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d.get("last_updated"):
                d["last_updated"] = d["last_updated"].isoformat()
            data.append(d)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase Error: {str(e)}")

# --- EXTRACT (Groq / Gemini) ---
@app.post("/extract")
async def extract_pdf(
    file: UploadFile = File(...),
    is_service: str = Form("false")
):
    temp_path = os.path.join(TEMP_DIR, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Calls the AI logic from utils.py
        return utils.process_pdf_text(
            temp_path,
            is_service=is_service.lower() == "true"
        )
    except Exception as e:
        return {"status": "failed", "error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# --- SAVE ---
@app.post("/save")
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
    temp_path = os.path.join(TEMP_DIR, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Upload Assets
        pdf_url = utils.upload_to_firebase_storage(temp_path, serial, is_qr=False)
        qr_link = f"https://qrcertificates-30ddb.web.app/?id={utils.quote_plus(serial)}"
        qr_path = utils.generate_qr_image_only(serial, qr_link)
        qr_image_url = utils.upload_to_firebase_storage(qr_path, serial, is_qr=True)

        # Save to Firestore
        success = utils.update_firestore_record(
            collection,
            serial,
            {"model": model, "cal": cal, "exp": exp, "cert": cert, "lot": lot},
            pdf_url,
            qr_image_url,
            qr_link
        )

        if success:
            return {"status": "success", "web_link": qr_link}
        else:
            raise HTTPException(status_code=500, detail="Firestore save failed")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        # Clean up generated QR local file
        # (qr_path logic would go here if defined in this scope)