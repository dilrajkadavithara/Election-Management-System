
import logging
import sys
import os
import fastapi
import shutil
import uuid
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional, Any
from asgiref.sync import sync_to_async
import concurrent.futures
import multiprocessing

# Load env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from pdf2image import pdf_info
except ImportError:
    pdf_info = None

# Pure Core Imports
from core.pdf_processor import PDFProcessor
from core.detector import VoterDetector
from core.batch_processor import BatchProcessor
from core.db_bridge import (
    get_constituencies, get_local_bodies, check_booth_exists, save_booth_data,
    get_dashboard_stats, get_voter_list, update_voter_in_db,
    get_all_locations, add_constituency, add_local_body, add_booth,
    get_all_users, create_managed_user, delete_user, update_user_profile, get_parties, add_party
)

SYMBOLS_DIR = BASE_DIR / "data" / "party_symbols"
SYMBOLS_DIR.mkdir(parents=True, exist_ok=True)

# --- Django Async Bridges ---
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

# THREAD-SAFE SYNC WRAPPERS
def sync_authenticate(username, password):
    user = authenticate(username=username, password=password)
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "role": user.profile.role,
            "can_download": user.profile.can_download,
            "can_upload": user.profile.can_upload,
            "can_verify": user.profile.can_verify,
            "can_edit_voters": user.profile.can_edit_voters,
            "can_send_broadcasts": user.profile.can_send_broadcasts,
            "can_manage_system": user.profile.can_manage_system
        }
    return None

def sync_get_user_info(username):
    user = User.objects.filter(username=username).first()
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "role": user.profile.role,
            "can_download": user.profile.can_download,
            "can_upload": user.profile.can_upload,
            "can_verify": user.profile.can_verify,
            "can_edit_voters": user.profile.can_edit_voters,
            "can_send_broadcasts": user.profile.can_send_broadcasts,
            "can_manage_system": user.profile.can_manage_system
        }
    return None

def sync_dashboard_wrapper(username, constituency_id=None, booth_id=None):
    user = User.objects.get(username=username)
    return get_dashboard_stats(user.profile, constituency_id, booth_id)

def sync_voter_list_wrapper(username, search, page, page_size, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None, serial_from=None, serial_to=None):
    user = User.objects.get(username=username)
    return get_voter_list(user.profile, search, page, page_size, constituency_id, lb_id, booth_id, gender, age_from, age_to, leaning, serial_from, serial_to)

def sync_locations_wrapper(username):
    user = User.objects.get(username=username)
    return get_all_locations(user.profile)

# ASYNC WRAPPERS
authenticate_async = sync_to_async(sync_authenticate, thread_sensitive=True)
get_user_info_async = sync_to_async(sync_get_user_info, thread_sensitive=True)
get_constituencies_async = sync_to_async(get_constituencies, thread_sensitive=True)
get_local_bodies_async = sync_to_async(get_local_bodies, thread_sensitive=True)
check_booth_exists_async = sync_to_async(check_booth_exists, thread_sensitive=True)
save_booth_data_async = sync_to_async(save_booth_data, thread_sensitive=True)
get_stats_async = sync_to_async(sync_dashboard_wrapper, thread_sensitive=True)
get_voters_async = sync_to_async(sync_voter_list_wrapper, thread_sensitive=True)
edit_voter_async = sync_to_async(update_voter_in_db, thread_sensitive=True)

# Admin Async Wrappers
get_all_locations_async = sync_to_async(sync_locations_wrapper, thread_sensitive=True)
add_const_async = sync_to_async(add_constituency, thread_sensitive=True)
add_lb_async = sync_to_async(add_local_body, thread_sensitive=True)
add_booth_async = sync_to_async(add_booth, thread_sensitive=True)
get_all_users_async = sync_to_async(get_all_users, thread_sensitive=True)
create_user_async = sync_to_async(create_managed_user, thread_sensitive=True)
delete_user_async = sync_to_async(delete_user, thread_sensitive=True)
update_user_async = sync_to_async(update_user_profile, thread_sensitive=True)
get_parties_async = sync_to_async(get_parties, thread_sensitive=True)
add_party_async = sync_to_async(add_party, thread_sensitive=True)

# --- Comm Engine Sync Wrappers ---
def sync_comm_stats(username):
    from core.comm_engine import CommunicationEngine
    user = User.objects.get(username=username)
    return CommunicationEngine.get_comm_stats(user.profile)

def sync_manage_templates(action, data=None):
    from core_db.models import MessageTemplate
    if action == 'list':
        return list(MessageTemplate.objects.filter(is_active=True).values())
    elif action == 'create':
        t = MessageTemplate.objects.create(**data)
        return {"id": t.id, "success": True}

def sync_send_broadcast(username, voter_ids, template_id):
    from core.comm_engine import CommunicationEngine
    user = User.objects.get(username=username)
    return CommunicationEngine.send_broadcast(voter_ids, template_id, user)

# --- Comm Engine Async Wrappers ---
get_comm_stats_async = sync_to_async(sync_comm_stats, thread_sensitive=True)
manage_templates_async = sync_to_async(sync_manage_templates, thread_sensitive=True)
send_broadcast_async = sync_to_async(sync_send_broadcast, thread_sensitive=True)

# Auth Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    SECRET_KEY = "election-super-secret-key-2026-insecure-dev"
else:
    SECRET_KEY = JWT_SECRET_KEY

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Professional Logging Configuration
import logging.handlers

LOG_DIR = BASE_DIR / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "production.log"

# Rotating File Handler: Keep 5 back-ups of 5MB each
file_handler = logging.handlers.RotatingFileHandler(
    LOG_FILE, maxBytes=5*1024*1024, backupCount=5, encoding='utf-8'
)
stream_handler = logging.StreamHandler(sys.stdout)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[file_handler, stream_handler]
)
logger = logging.getLogger("ElectionEngine")

app = FastAPI(title="Election Management System Backend")

# Auth Helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(401, "Invalid token")
        
        user_info = await get_user_info_async(username)
        if user_info is None: raise HTTPException(401, "User not found")
        return user_info
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(401, "Invalid credentials")

# CORS
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NO-CACHE MIDDLEWARE: Added to ensure real-time synchronization
@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
cancelled_batches = set()

# ----------------------------------------------------------------
# PURE BACKGROUND TASKS
# ----------------------------------------------------------------

def process_single_voter(args):
    img_path_str, voter_id = args
    processor = BatchProcessor() 
    res = processor.process_box(img_path_str, voter_id)
    res['voter_id'] = voter_id
    res['image_name'] = os.path.basename(img_path_str)
    return res

def run_extraction(batch_id: str, dpi: int):
    try:
        batch = active_batches[batch_id]
        pdf_path = batch['file_path']
        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id
        p_dir.mkdir(exist_ok=True); c_dir.mkdir(exist_ok=True)

        try:
            from PyPDF2 import PdfReader
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                batch['total_pages'] = len(reader.pages)
        except: 
            try:
                if pdf_info:
                    info = pdf_info(pdf_path, poppler_path=poppler)
                    batch['total_pages'] = info.get("Pages", 0)
            except: pass

        page_images = pdf_processor.convert_to_images(pdf_path, str(p_dir), dpi=dpi)
        batch['total_pages'] = len(page_images)
        
        total_voters = 0
        for i, page_path in enumerate(page_images):
            if batch_id in cancelled_batches:
                del active_batches[batch_id]
                import gc
                gc.collect()
                return

            batch['pages_processed'] = i + 1
            boxes = detector.detect_voter_boxes(page_path) 
            
            if boxes:
                count = detector.crop_and_save(page_path, boxes, str(c_dir), i+1, start_index=total_voters)
                total_voters += count
        
        batch['total_voters'] = total_voters
        batch['status'] = 'extracted'
    except Exception as e:
        logger.error(f"Extraction Error for {batch_id}: {e}")
        if batch_id in active_batches:
            active_batches[batch_id]['status'] = 'error'
            active_batches[batch_id]['error'] = str(e)

def run_processing(batch_id: str):
    try:
        batch = active_batches[batch_id]
        c_dir = CROPS_DIR / batch_id
        voter_files = sorted(list(c_dir.glob("*.png")))
        batch['total_voters'] = len(voter_files)
        
        results = []
        clean_count = 0
        flagged_count = 0
        
        cpu_count = multiprocessing.cpu_count()
        workers = max(1, min(cpu_count - 1, 8))
        
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
            tasks = [(str(p), i+1) for i, p in enumerate(voter_files)]
            future_to_id = {executor.submit(process_single_voter, t): t[1] for t in tasks}
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_id)):
                if batch_id in cancelled_batches:
                    if batch_id in active_batches:
                        del active_batches[batch_id]
                    import gc
                    gc.collect()
                    return
                
                try:
                    res = future.result()
                    results.append(res)
                    if res.get('Status') == '✅ OK':
                        clean_count += 1
                    else:
                        flagged_count += 1
                    active_batches[batch_id]['clean_count'] = clean_count
                    active_batches[batch_id]['flagged_count'] = flagged_count
                    active_batches[batch_id]['voters_processed'] = i + 1
                except Exception as exc:
                    flagged_count += 1
                    active_batches[batch_id]['flagged_count'] = flagged_count
                    active_batches[batch_id]['voters_processed'] = i + 1

        results.sort(key=lambda x: x['voter_id'])
        batch['results'] = results
        batch['status'] = 'processed'
    except Exception as e:
        active_batches[batch_id]['status'] = 'error'
        active_batches[batch_id]['error'] = str(e)

# ----------------------------------------------------------------
# ENDPOINTS
# ----------------------------------------------------------------

@app.post("/api/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_data = await authenticate_async(form_data.username, form_data.password)
    if not user_data:
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(data={"sub": user_data['username']})
    return {"access_token": token, "token_type": "bearer", "user": user_data}

@app.get("/api/user-info")
async def get_user_info_token(user_info=Depends(get_current_user)):
    return user_info

@app.get("/api/stats")
async def get_stats(constituency: str = None, booth: str = None, user_info=Depends(get_current_user)):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    return await get_stats_async(user_info['username'], c_id, b_id)

@app.get("/api/voters")
async def list_voters(
    search: str = None, page: int = 1, 
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None, serial_from: str = None, serial_to: str = None,
    page_size: int = 50,
    user_info=Depends(get_current_user)
):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    af = int(age_from) if age_from and str(age_from).isdigit() else None
    at = int(age_to) if age_to and str(age_to).isdigit() else None
    sf = int(serial_from) if serial_from and str(serial_from).isdigit() else None
    st = int(serial_to) if serial_to and str(serial_to).isdigit() else None
    return await get_voters_async(user_info['username'], search, page, page_size, c_id, l_id, b_id, gender, af, at, leaning, sf, st)

@app.post("/api/voters/{voter_id}")
async def edit_voter(voter_id: int, data: dict, user_info=Depends(get_current_user)):
    if not user_info['can_edit_voters']: raise HTTPException(403)
    success, msg = await edit_voter_async(voter_id, data)
    if not success: raise HTTPException(400, msg)
    return {"success": True}

@app.get("/api/admin/locations")
async def admin_get_locations(user_info=Depends(get_current_user)):
    return await get_all_locations_async(user_info['username'])

@app.get("/api/parties")
async def list_parties(user_info=Depends(get_current_user)):
    return await get_parties_async()

@app.post("/api/upload")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...), user_info=Depends(get_current_user)):
    if not user_info['can_upload']: raise HTTPException(403)
    batch_id = str(uuid.uuid4())
    path = UPLOAD_DIR / f"{batch_id}.pdf"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    active_batches[batch_id] = {
        'id': batch_id, 'status': 'uploading', 'filename': file.filename, 
        'file_path': str(path), 'pages_processed': 0, 'total_pages': 0
    }
    return {"batch_id": batch_id}

@app.post("/api/process/{batch_id}/extract")
async def start_extraction(batch_id: str, background_tasks: BackgroundTasks, dpi: int = 200, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'extracting'
    background_tasks.add_task(run_extraction, batch_id, dpi)
    return {"success": True}

@app.post("/api/process/{batch_id}/ocr")
async def start_ocr(batch_id: str, background_tasks: BackgroundTasks, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'processing'
    active_batches[batch_id]['voters_processed'] = 0
    background_tasks.add_task(run_processing, batch_id)
    return {"success": True}

@app.get("/api/process/{batch_id}/status")
async def get_status(batch_id: str, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    return active_batches[batch_id]

@app.post("/api/process/{batch_id}/save-to-db")
async def save_to_db(batch_id: str, req: dict, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    if not user_info['can_verify']: raise HTTPException(403)
    
    success, msg = await save_booth_data_async(
        req['constituency'], req['lb_type'], req['lb_name'], req['booth_no'],
        active_batches[batch_id]['results'], active_batches[batch_id]['filename'],
        req.get('ps_no', ''), req.get('ps_name', ''), user_id=user_info['id']
    )
    if not success: raise HTTPException(400, msg)
    
    del active_batches[batch_id]
    import gc
    gc.collect()
    
    p_dir = PAGES_DIR / batch_id
    c_dir = CROPS_DIR / batch_id
    if p_dir.exists(): shutil.rmtree(p_dir)
    if c_dir.exists(): shutil.rmtree(c_dir)
    
    return {"success": True}

@app.post("/api/process/{batch_id}/cancel")
async def cancel_batch(batch_id: str, user_info=Depends(get_current_user)):
    cancelled_batches.add(batch_id)
    if batch_id in active_batches:
        del active_batches[batch_id]
    import gc
    gc.collect()
    return {"success": True}

@app.get("/api/voter-image/{batch_id}/{image_name}")
async def get_voter_image(batch_id: str, image_name: str):
    path = CROPS_DIR / batch_id / image_name
    return FileResponse(path)

@app.get("/api/party-symbol/{image_name}")
async def get_party_symbol(image_name: str):
    path = SYMBOLS_DIR / image_name
    if not path.exists(): raise HTTPException(404)
    return FileResponse(path)

@app.get("/api/admin/system-health")
async def get_system_health(user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    import shutil, psutil
    total, used, free = shutil.disk_usage("/")
    memory = psutil.virtual_memory()
    return {
        "status": "Healthy",
        "disk_free_gb": round(free / (1024**3), 2),
        "memory_usage_percent": memory.percent,
        "active_batches": len(active_batches),
        "uptime_start": datetime.utcnow().isoformat()
    }

dist_path = BASE_DIR / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api"): raise HTTPException(404)
        return FileResponse(dist_path / "index.html")
