"""
FastAPI Backend Server v2.6.0
- GATED WORKFLOW BRIDGE
- PROTECTED CORE: 0% modification to core/ folder.
- PURE PASS-THROUGH: No healing, no translations.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pathlib import Path
import shutil
import uuid
import logging
import sys
import os
from datetime import datetime
from dotenv import load_dotenv

try:
    from pdf2image import pdf_info
except ImportError:
    pdf_info = None

# Load env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import core modules (STRICTLY READ-ONLY)
from core.pdf_processor import PDFProcessor
from core.detector import VoterDetector
from core.batch_processor import BatchProcessor
from core.db_bridge import get_constituencies, save_booth_data

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BackendV2.6.0")

app = FastAPI(title="Voter OCR Pure Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "raw_pdf"
PAGES_DIR = DATA_DIR / "page_images"
CROPS_DIR = DATA_DIR / "voter_crops"
for p in [UPLOAD_DIR, PAGES_DIR, CROPS_DIR]: p.mkdir(parents=True, exist_ok=True)

# Processors
poppler = os.getenv("POPPLER_PATH")
pdf_processor = PDFProcessor(poppler_path=poppler) if poppler else PDFProcessor()
detector = VoterDetector()
batch_processor = BatchProcessor()

active_batches = {}

# ----------------------------------------------------------------
# PURE BACKGROUND TASKS
# ----------------------------------------------------------------

def run_extraction(batch_id: str, dpi: int):
    try:
        batch = active_batches[batch_id]
        pdf_path = batch['file_path']
        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id
        p_dir.mkdir(exist_ok=True); c_dir.mkdir(exist_ok=True)

        try:
            if pdf_info:
                info = pdf_info(pdf_path, poppler_path=poppler)
                batch['total_pages'] = info.get("Pages", 0)
        except: pass

        # Phase 1: Convert
        page_images = pdf_processor.convert_to_images(pdf_path, str(p_dir), dpi=dpi)
        batch['total_pages'] = len(page_images)
        
        # Phase 2: Detect (Stored in batch but waits for front-end signal)
        total_voters = 0
        for i, page_path in enumerate(page_images):
            batch['pages_processed'] = i + 1
            boxes = detector.detect_voter_boxes(page_path)
            if boxes:
                count = detector.crop_and_save(page_path, boxes, str(c_dir), i+1, start_index=total_voters)
                total_voters += count
        
        batch['total_voters'] = total_voters
        batch['status'] = 'extracted' # Signals completion of Phase 1+2
    except Exception as e:
        active_batches[batch_id]['status'] = 'error'
        active_batches[batch_id]['error'] = str(e)

def run_processing(batch_id: str):
    try:
        batch = active_batches[batch_id]
        c_dir = CROPS_DIR / batch_id
        voter_files = sorted(list(c_dir.glob("*.png")))
        batch['total_voters_to_process'] = len(voter_files)
        
        results = []
        for i, img_path in enumerate(voter_files):
            batch['voters_processed'] = i + 1
            
            # PURE CORE CALL: Absolutely no healing or diagnostic modification
            res = batch_processor.process_box(str(img_path), i + 1)
            
            res['voter_id'] = i + 1
            res['image_name'] = img_path.name
            results.append(res)
        
        batch['results'] = results
        batch['status'] = 'processed'
        batch['clean_count'] = len([r for r in results if r.get('Status') == '✅ OK'])
        batch['flagged_count'] = len([r for r in results if r.get('Status') != '✅ OK'])
    except Exception as e:
        active_batches[batch_id]['status'] = 'error'
        active_batches[batch_id]['error'] = str(e)

# ----------------------------------------------------------------
# GATED API ENDPOINTS
# ----------------------------------------------------------------

@app.get("/api/health")
def health(): return {"status": "healthy"}

@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    batch_id = str(uuid.uuid4())[:8]
    f_path = UPLOAD_DIR / f"{batch_id}_{file.filename}"
    with f_path.open("wb") as b: shutil.copyfileobj(file.file, b)
    
    active_batches[batch_id] = {
        "id": batch_id, "filename": file.filename, "file_path": str(f_path),
        "status": "uploaded", "total_pages": 0, "pages_processed": 0,
        "total_voters": 0, "voters_processed": 0, "results": []
    }
    return {"success": True, "batch_id": batch_id}

@app.post("/api/extract/{batch_id}")
def start_extract(batch_id: str, bg: BackgroundTasks):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'extracting'
    bg.add_task(run_extraction, batch_id, 300)
    return {"success": True}

@app.post("/api/process-batch/{batch_id}")
def start_process(batch_id: str, bg: BackgroundTasks):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'processing'
    bg.add_task(run_processing, batch_id)
    return {"success": True}

@app.get("/api/batch/{batch_id}/status")
def get_status(batch_id: str):
    if batch_id not in active_batches: return {"status": "cleared"}
    return active_batches[batch_id]

@app.get("/api/voter-image/{batch_id}/{image_name}")
def get_voter_image(batch_id: str, image_name: str):
    path = CROPS_DIR / batch_id / image_name
    return FileResponse(path)

@app.post("/api/update-voter/{batch_id}/{voter_id}")
async def update_voter(batch_id: str, voter_id: int, data: dict):
    batch = active_batches[batch_id]
    for i, res in enumerate(batch['results']):
        if res.get('voter_id') == voter_id:
            batch['results'][i].update(data)
            batch['results'][i]['Status'] = '✅ OK'
            batch['clean_count'] = len([r for r in batch['results'] if r.get('Status') == '✅ OK'])
            batch['flagged_count'] = len([r for r in batch['results'] if r.get('Status') != '✅ OK'])
            return {"success": True}
    return {"success": False}

@app.post("/api/save-to-db")
def export_db(batch_id: str, constituency: str, booth: int):
    if batch_id not in active_batches: raise HTTPException(404)
    results = active_batches[batch_id]['results']
    # The original save_booth_data takes constituency_name and booth_number as first two args
    from core.db_bridge import save_booth_data
    success, msg = save_booth_data(constituency, booth, results, active_batches[batch_id]['filename'])
    return {"success": success, "message": msg}

@app.get("/api/download-csv/{batch_id}")
def download_csv(batch_id: str):
    if batch_id not in active_batches: raise HTTPException(404)
    results = active_batches[batch_id]['results']
    
    import csv
    import io
    from fastapi.responses import StreamingResponse

    output = io.StringIO()
    if not results:
        headers = ["Serial Number", "EPIC ID", "Full Name", "Relation Type", "Relation Name", "House Number", "House Name", "Age", "Gender"]
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
    else:
        # Get all keys present in results
        keys = results[0].keys()
        writer = csv.DictWriter(output, fieldnames=keys)
        writer.writeheader()
        writer.writerows(results)
    
    output.seek(0)
    filename = f"extraction_{batch_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")), # Use utf-8-sig for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/clear-session/{batch_id}")
def clear_session(batch_id: str):
    if batch_id in active_batches:
        del active_batches[batch_id]
    return {"success": True}

@app.get("/api/constituencies")
def get_const():
    try: return get_constituencies()
    except: return ["No Data"]

# Static Frontend Support
dist_path = BASE_DIR / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api"): raise HTTPException(404)
        return FileResponse(dist_path / "index.html")
