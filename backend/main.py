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
    get_constituencies, get_local_bodies, save_booth_data,
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

def sync_voter_list_wrapper(username, search, page, page_size, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None):
    user = User.objects.get(username=username)
    return get_voter_list(user.profile, search, page, page_size, constituency_id, lb_id, booth_id, gender, age_from, age_to, leaning)

def sync_locations_wrapper(username):
    user = User.objects.get(username=username)
    return get_all_locations(user.profile)

# ASYNC WRAPPERS
authenticate_async = sync_to_async(sync_authenticate, thread_sensitive=True)
get_user_info_async = sync_to_async(sync_get_user_info, thread_sensitive=True)
get_constituencies_async = sync_to_async(get_constituencies, thread_sensitive=True)
get_local_bodies_async = sync_to_async(get_local_bodies, thread_sensitive=True)
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
SECRET_KEY = os.getenv("SECRET_KEY", "election-super-secret-key-2026")
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
cancelled_batches = set()  # Track which batches have been cancelled

# ----------------------------------------------------------------
# PURE BACKGROUND TASKS
# ----------------------------------------------------------------

def process_single_voter(args):
    """Helper for parallel processing to avoid pickling issues"""
    img_path_str, voter_id = args
    # Instantiate locally to avoid shared state in subprocess
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
            batch['pages_processed'] = i + 1
            boxes = detector.detect_voter_boxes(page_path)
            if boxes:
                count = detector.crop_and_save(page_path, boxes, str(c_dir), i+1, start_index=total_voters)
                total_voters += count
        
        batch['total_voters'] = total_voters
        batch['status'] = 'extracted'
    except Exception as e:
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
        
        # CPU-Bound Optimization: Use ProcessPoolExecutor
        cpu_count = multiprocessing.cpu_count()
        # Reserve 1 core for system/server, cap at 8 to prevent freeze
        workers = max(1, min(cpu_count - 1, 8))
        
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
            # Prepare tasks
            tasks = [(str(p), i+1) for i, p in enumerate(voter_files)]
            
            # Submit all tasks
            future_to_id = {executor.submit(process_single_voter, t): t[1] for t in tasks}
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_id)):
                # Check if batch has been cancelled
                if batch_id in cancelled_batches:
                    print(f"Batch {batch_id} cancelled. Stopping processing...")
                    batch['status'] = 'cancelled'
                    batch['results'] = results  # Save partial results
                    return
                
                try:
                    res = future.result()
                    # Preserve original order not guaranteed here, but we sort by voter_id later if needed
                    # Actually we need results to be in correct order for UI?
                    # The UI likely just shows progress. The 'results' list order might matter for export?
                    # Let's append to results and sort later or just append
                    results.append(res)
                    
                    if res.get('Status') == '✅ OK':
                        clean_count += 1
                    else:
                        flagged_count += 1
                        
                    batch['clean_count'] = clean_count
                    batch['flagged_count'] = flagged_count
                    batch['voters_processed'] = i + 1
                    
                except Exception as exc:
                    print(f"Task generated an exception: {exc}")

        # Ensure results are sorted by voter_id because as_completed is out of order
        results.sort(key=lambda x: x['voter_id'])
        
        batch['results'] = results
        batch['status'] = 'processed'
    except Exception as e:
        active_batches[batch_id]['status'] = 'error'
        active_batches[batch_id]['error'] = str(e)

# ----------------------------------------------------------------
# SYSTEM ADMIN ENDPOINTS
# ----------------------------------------------------------------

@app.get("/api/admin/locations")
async def admin_get_locations(user_info=Depends(get_current_user)):
    # Scoped locations: Allowed for all authenticated users
    # Filtering is handled in the wrapper/db_bridge
    return await get_all_locations_async(user_info['username'])

@app.post("/api/admin/add-const")
async def admin_add_const(data: dict, user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    return await add_const_async(data['name'])

@app.post("/api/admin/add-lb")
async def admin_add_lb(data: dict, user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    return await add_lb_async(data['const_id'], data['name'], data['type'])

@app.post("/api/admin/add-booth")
async def admin_add_booth(data: dict, user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    return await add_booth_async(data['const_id'], data['lb_id'], data['number'], data.get('ps_name', ''), data.get('ps_no', ''))

@app.get("/api/admin/users")
async def admin_get_users(user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    return await get_all_users_async()

@app.post("/api/admin/create-user")
async def admin_create_user(data: dict, user_info=Depends(get_current_user)):
    # Hierarchical user creation: Superuser, Constituency Admin, Local Body Head, and Zone Commander can create users
    # But they can only create users at their level or below
    allowed_roles = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed_roles:
        raise HTTPException(403, "You do not have permission to create users")
    
    success, msg = await create_user_async(
        data['username'], data['password'], data['role'], data.get('assignments', {})
    )
    return {"success": success, "message": msg}

@app.delete("/api/admin/delete-user/{uid}")
async def admin_delete_user(uid: int, user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    success, msg = await delete_user_async(uid)
    return {"success": success, "message": msg}

@app.put("/api/admin/update-user/{uid}")
async def admin_update_user(uid: int, data: dict, user_info=Depends(get_current_user)):
    # Only Superuser can modify any user
    # Constituency Admin can modify their subordinates (future logic)
    if user_info['role'] != 'SUPERUSER': raise HTTPException(403)
    success, msg = await update_user_async(uid, data)
    return {"success": success, "message": msg}

# ----------------------------------------------------------------
# GATED API ENDPOINTS
# ----------------------------------------------------------------

@app.get("/api/health")
async def health(): return {"status": "healthy"}

@app.post("/api/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_info = await authenticate_async(username=form_data.username, password=form_data.password)
    if not user_info:
        raise HTTPException(401, "Invalid username or password")
    
    access_token = create_access_token(data={"sub": user_info['username']})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user_info['role'], 
        "username": user_info['username']
    }

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
    leaning: str = None,
    page_size: int = 50,
    user_info=Depends(get_current_user)
):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    af = int(age_from) if age_from and str(age_from).isdigit() else None
    at = int(age_to) if age_to and str(age_to).isdigit() else None
    return await get_voters_async(user_info['username'], search, page, page_size, c_id, l_id, b_id, gender, af, at, leaning)

@app.get("/api/export-voters")
async def export_voters(
    search: str = None, 
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None,
    user_info=Depends(get_current_user)
):
    # Check download permission (BOOTH_AGENT and ZONE_COMMANDER cannot download by default)
    if not user_info.get('can_download', False):
        raise HTTPException(403, "You do not have permission to export data")
    
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    af = int(age_from) if age_from and str(age_from).isdigit() else None
    at = int(age_to) if age_to and str(age_to).isdigit() else None
    
    data = await get_voters_async(user_info['username'], search, None, 0, c_id, l_id, b_id, gender, af, at, leaning)
    results = data['results']
    
    import csv, io
    from fastapi.responses import StreamingResponse
    output = io.StringIO()
    if results:
        writer = csv.DictWriter(output, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=voters_export.csv"}
    )

@app.post("/api/edit-voter/{voter_id}")
async def edit_voter(voter_id: int, data: dict, user_info=Depends(get_current_user)):
    # Role check: All developer-side roles (Superuser, Manager, Operator) can edit.
    # On client-side, Booth Agents can edit intelligence data.
    # Constituency Admins and Local Body Heads remain read-only for voter records.
    if user_info['role'] in ['CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD']:
        raise HTTPException(403, "Admins have read-only access to individual voter records")
        
    success, msg = await edit_voter_async(voter_id, data)
    return {"success": success, "message": msg}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...), user_info=Depends(get_current_user)):
    batch_id = str(uuid.uuid4())[:8]
    f_path = UPLOAD_DIR / f"{batch_id}_{file.filename}"
    with f_path.open("wb") as b: shutil.copyfileobj(file.file, b)
    
    active_batches[batch_id] = {
        "id": batch_id, "filename": file.filename, "file_path": str(f_path),
        "status": "uploaded", "total_pages": 0, "pages_processed": 0,
        "total_voters": 0, "voters_processed": 0, "results": [],
        "user": user_info['username']
    }
    return {"success": True, "batch_id": batch_id}

@app.get("/api/batch/{batch_id}/status")
async def get_status(batch_id: str, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: return {"status": "cleared"}
    return active_batches[batch_id]

@app.post("/api/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str, user_info=Depends(get_current_user)):
    """Cancel an ongoing OCR batch"""
    if batch_id not in active_batches:
        raise HTTPException(404, "Batch not found")
    
    cancelled_batches.add(batch_id)
    return {"success": True, "message": "Batch cancellation requested"}

@app.post("/api/save-to-db")
async def save_to_db(constituency: str, lgb_type: str, lgb_name: str, b_num: str, batch_id: str, ps_no: str = "", ps_name: str = "", user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404, "Batch not found")
    results = active_batches[batch_id]['results']
    # Pass user_id to track who uploaded this batch (for OPERATOR role filtering)
    success, msg = await save_booth_data_async(constituency, lgb_type, lgb_name, b_num, results, active_batches[batch_id]['filename'], ps_no, ps_name, user_info['id'])
    return {"success": success, "message": msg}

# ----------------------------------------------------------------
# COMMUNICATION SYSTEM ENDPOINTS
# ----------------------------------------------------------------

@app.get("/api/comm/stats")
async def get_comm_stats_api(user_info=Depends(get_current_user)):
    return await get_comm_stats_async(user_info['username'])

@app.get("/api/comm/templates")
async def get_templates_api(user_info=Depends(get_current_user)):
    return await manage_templates_async('list')

@app.post("/api/comm/templates")
async def create_template_api(data: dict, user_info=Depends(get_current_user)):
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']: raise HTTPException(403)
    return await manage_templates_async('create', data)

@app.post("/api/comm/send")
async def send_comm_api(data: dict, user_info=Depends(get_current_user)):
    # Check if user has permission to broadcast
    return await send_broadcast_async(user_info['username'], data['voter_ids'], data['template_id'])

@app.get("/api/download-csv/{batch_id}")
async def download_csv(batch_id: str, user_info=Depends(get_current_user)):
    if not user_info.get('can_download', False):
        raise HTTPException(403, "You do not have permission to download reports.")
        
    if batch_id not in active_batches: raise HTTPException(404)
    results = active_batches[batch_id]['results']
    
    import csv, io
    from fastapi.responses import StreamingResponse
    output = io.StringIO()
    if results:
        writer = csv.DictWriter(output, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    output.seek(0)
    filename = f"export_{batch_id}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/constituencies")
async def get_const(user_info=Depends(get_current_user)):
    try: return await get_constituencies_async()
    except: return ["No Data"]

@app.get("/api/local-bodies")
async def get_lb(constituency: str = None, user_info=Depends(get_current_user)):
    try: return await get_local_bodies_async(constituency)
    except: return []

# Missing endpoints needed by App.jsx
@app.post("/api/extract/{batch_id}")
async def start_extract(batch_id: str, bg: BackgroundTasks, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'extracting'
    bg.add_task(run_extraction, batch_id, 300)
    return {"success": True}

@app.post("/api/process-batch/{batch_id}")
async def start_process(batch_id: str, bg: BackgroundTasks, user_info=Depends(get_current_user)):
    if batch_id not in active_batches: raise HTTPException(404)
    active_batches[batch_id]['status'] = 'processing'
    bg.add_task(run_processing, batch_id)
    return {"success": True}

@app.post("/api/update-voter/{batch_id}/{voter_id}")
async def update_voter(batch_id: str, voter_id: int, data: dict, user_info=Depends(get_current_user)):
    batch = active_batches[batch_id]
    for i, res in enumerate(batch['results']):
        if res.get('voter_id') == voter_id:
            batch['results'][i].update(data)
            batch['results'][i]['Status'] = '✅ OK'
            batch['clean_count'] = len([r for r in batch['results'] if r.get('Status') == '✅ OK'])
            batch['flagged_count'] = len([r for r in batch['results'] if r.get('Status') != '✅ OK'])
            return {"success": True}
    return {"success": False}

@app.get("/api/voter-image/{batch_id}/{image_name}")
async def get_voter_image(batch_id: str, image_name: str):
    path = CROPS_DIR / batch_id / image_name
    return FileResponse(path)

@app.get("/api/parties")
async def list_parties(user_info=Depends(get_current_user)):
    return await get_parties_async()

@app.post("/api/admin/parties")
async def create_party(
    name: str = fastapi.Form(...), 
    file: UploadFile = File(...), 
    short_label: str = fastapi.Form(""),
    primary_color: str = fastapi.Form("#000080"),
    accent_gradient: str = fastapi.Form("linear-gradient(to bottom, #FF9933, #ffffff, #138808)"),
    user_info=Depends(get_current_user)
):
    if user_info['role'] != 'SUPERUSER':
        raise HTTPException(403, "Only superusers can manage parties.")
    
    ext = Path(file.filename).suffix
    sym_name = f"{uuid.uuid4()}{ext}"
    path = SYMBOLS_DIR / sym_name
    
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    return await add_party_async(name, sym_name, short_label, primary_color, accent_gradient)

@app.get("/api/party-symbol/{image_name}")
async def get_party_symbol(image_name: str):
    path = SYMBOLS_DIR / image_name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)

@app.post("/api/clear-session/{batch_id}")
async def clear_session(batch_id: str, user_info=Depends(get_current_user)):
    if batch_id in active_batches:
        del active_batches[batch_id]
    return {"success": True}

@app.get("/api/admin/system-health")
async def get_system_health(user_info=Depends(get_current_user)):
    if user_info['role'] != 'SUPERUSER':
        raise HTTPException(403)
    
    # Calculate disk usage and memory for 140-candidate scalability check
    import shutil
    import psutil
    
    total, used, free = shutil.disk_usage("/")
    memory = psutil.virtual_memory()
    
    return {
        "status": "Healthy",
        "disk_free_gb": round(free / (1024**3), 2),
        "memory_usage_percent": memory.percent,
        "active_batches": len(active_batches),
        "uptime_start": datetime.utcnow().isoformat()
    }

# Static Frontend Support
dist_path = BASE_DIR / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api"): raise HTTPException(404)
        return FileResponse(dist_path / "index.html")
