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
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, Body
from pydantic import BaseModel
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

class SaveBatchRequest(BaseModel):
    batch_id: str
    constituency: str = ""
    lgb_type: str = ""
    lgb_name: str = ""
    booth: str = ""
    ps_no: str = ""
    ps_name: str = ""

# Pure Core Imports
from core.pdf_processor import PDFProcessor
from core.detector import VoterDetector
from core.batch_processor import BatchProcessor
from core.db_bridge import (
    get_constituencies, get_local_bodies, check_booth_exists, save_booth_data,
    get_dashboard_stats, get_strategic_analytics, get_voter_list, update_voter_in_db,
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

def sync_dashboard_wrapper(username, constituency_id=None, lb_id=None, booth_id=None):
    user = User.objects.get(username=username)
    return get_dashboard_stats(user.profile, constituency_id, lb_id, booth_id)

def sync_strategic_analytics_wrapper(username, constituency_id=None):
    user = User.objects.get(username=username)
    return get_strategic_analytics(user.profile, constituency_id)

def sync_voter_list_wrapper(username, search, page, page_size, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None, serial_from=None, serial_to=None, location=None):
    user = User.objects.get(username=username)
    return get_voter_list(user.profile, search, page, page_size, constituency_id, lb_id, booth_id, gender, age_from, age_to, leaning, serial_from, serial_to, location)

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

def sync_send_broadcast_form(username, heading, message, medium, filters, image_path=None):
    from core.comm_engine import CommunicationEngine
    import json
    user = User.objects.get(username=username)
    filters_dict = json.loads(filters)
    
    voters_data = get_voter_list(
        user.profile, 
        "", 1, 1000000, 
        filters_dict.get('constituency'),
        filters_dict.get('lb'),
        filters_dict.get('booth'),
        filters_dict.get('gender'),
        filters_dict.get('ageFrom'),
        filters_dict.get('ageTo'),
        filters_dict.get('leaning'),
        filters_dict.get('serialFrom'),
        filters_dict.get('serialTo'),
        filters_dict.get('location')
    )
    voter_ids = [v['id'] for v in voters_data['results'] if v.get('phone_no')]
    
    return CommunicationEngine.send_direct_broadcast(
        voter_ids=voter_ids,
        heading=heading,
        message=message,
        medium=medium,
        image_path=image_path,
        user=user
    )

# --- Comm Engine Async Wrappers ---
get_comm_stats_async = sync_to_async(sync_comm_stats, thread_sensitive=True)
manage_templates_async = sync_to_async(sync_manage_templates, thread_sensitive=True)
send_broadcast_async = sync_to_async(sync_send_broadcast, thread_sensitive=True)
send_broadcast_form_async = sync_to_async(sync_send_broadcast_form, thread_sensitive=True)

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

from backend.state_manager import state_manager

# ----------------------------------------------------------------
# PURE BACKGROUND TASKS
# ----------------------------------------------------------------

# ----------------------------------------------------------------
# OCR TASK TRIGGERS (Moved to tasks.py for Celery)
# ----------------------------------------------------------------
from backend.tasks import run_extraction_task, run_processing_task


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
async def get_stats(constituency: str = None, lb: str = None, booth: str = None, user_info=Depends(get_current_user)):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    return await get_stats_async(user_info['username'], c_id, l_id, b_id)

@app.get("/api/voters")
async def get_voters_api(
    search: str = None, page: int = 1, page_size: int = 50,
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None, serial_from: str = None, serial_to: str = None,
    location: str = None,
    user_info=Depends(get_current_user)
):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    return await get_voters_async(
        user_info['username'], search, page, page_size,
        c_id, l_id, b_id, gender, age_from, age_to, leaning, serial_from, serial_to, location
    )

@app.get("/api/export-voters")
async def export_voters(
    search: str = None, 
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None, location: str = None,
    serial_from: str = None, serial_to: str = None,
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
    
    data = await get_voters_async(user_info['username'], search, None, 0, c_id, l_id, b_id, gender, af, at, leaning, serial_from, serial_to, location)
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
    
    batch_data = {
        "id": batch_id, "filename": file.filename, "file_path": str(f_path),
        "status": "uploaded", "total_pages": 0, "pages_processed": 0,
        "total_voters": 0, "voters_processed": 0, "results": [],
        "clean_count": 0, "flagged_count": 0,
        "user": user_info['username']
    }
    state_manager.set_batch(batch_id, batch_data)
    return {"success": True, "id": batch_id, "status": "uploaded"}

@app.get("/api/batch/{batch_id}/status")
async def get_status(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: return {"status": "cleared"}
    batch['flagged_items'] = [r['voter_id'] for r in batch.get('results', []) if r.get('Status') != '✅ OK']
    return batch

@app.get("/api/batch/{batch_id}/export-csv")
async def export_batch_csv(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch or 'results' not in batch:
        raise HTTPException(404, "Batch results not found")
    
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    results = batch['results']
    if not results: return {"error": "No data"}
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=results[0].keys())
    writer.writeheader()
    writer.writerows(results)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ocr_batch_{batch_id}.csv"}
    )

@app.post("/api/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str, user_info=Depends(get_current_user)):
    """Cancel an ongoing OCR batch"""
    batch = state_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    
    state_manager.mark_cancelled(batch_id)
    # Trigger immediate GC
    import gc
    gc.collect()
    return {"success": True, "message": "Batch cancellation requested"}

# --- New Save Bridge to handle ID vs Name resolution ---
def sync_save_batch_wrapper(payload_dict, user_id):
    from core_db.models import Constituency, LocalBody, Booth
    from core.db_bridge import save_booth_data
    
    batch_id = payload_dict['batch_id']
    print(f"📄 Saving Batch: {batch_id} | Payload: {payload_dict}")
    batch = state_manager.get_batch(batch_id)
    if not batch: return False, "Batch session expired or not found"
    
    # Resolve IDs to Names (Frontend sends IDs, Backend Bridge expects Names)
    try:
        c_obj = Constituency.objects.get(id=int(payload_dict['constituency']))
        c_name = c_obj.name
    except: c_name = payload_dict['constituency']
    
    try:
        lb_obj = LocalBody.objects.get(id=int(payload_dict['lgb_name']))
        lb_name = lb_obj.name
        lb_type = lb_obj.body_type
    except:
        lb_name = payload_dict['lgb_name']
        lb_type = payload_dict.get('lgb_type') or "PANCHAYAT"
        
    try:
        b_obj = Booth.objects.get(id=int(payload_dict['booth']))
        b_num = str(b_obj.number).zfill(3)
    except: 
        b_num = str(payload_dict['booth']).zfill(3)
    
    return save_booth_data(
        c_name, lb_type, lb_name, b_num, 
        batch['results'], batch['filename'], 
        payload_dict.get('ps_no', ""), payload_dict.get('ps_name', ""), user_id
    )

save_batch_async = sync_to_async(sync_save_batch_wrapper, thread_sensitive=True)

@app.post("/api/save-to-db")
async def save_to_db(payload: SaveBatchRequest, user_info=Depends(get_current_user)):
    if not payload.constituency or not payload.lgb_name or not payload.booth:
        return {"success": False, "message": "Please select Constituency, Local Body, and Booth before saving."}

    success, msg = await save_batch_async(payload.dict(), user_info['id'])
    if not success:
        print(f"❌ Save to DB Failed: {msg}")
        raise HTTPException(status_code=400, detail=msg)
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
    # Legacy template-based broadcast
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']: raise HTTPException(403)
    return await send_broadcast_async(user_info['username'], data['voter_ids'], data['template_id'])

@app.post("/api/comm/send-form")
async def send_comm_form_api(
    heading: str = fastapi.Form(''),
    message: str = fastapi.Form(''),
    medium: str = fastapi.Form('WATI'),
    filters: str = fastapi.Form('{}'),
    image: UploadFile = File(None),
    user_info=Depends(get_current_user)
):
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']: raise HTTPException(403)
    
    image_path = None
    if image:
        COMM_IMG_DIR = BASE_DIR / "data" / "comm_images"
        COMM_IMG_DIR.mkdir(parents=True, exist_ok=True)
        img_name = f"{uuid.uuid4()}_{image.filename}"
        image_path = str(COMM_IMG_DIR / img_name)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
    return await send_broadcast_form_async(user_info['username'], heading, message, medium, filters, image_path)

@app.get("/api/download-csv/{batch_id}")
async def download_csv(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404)
    
    # Permission bypass: Owner can always download their own batch results
    if not user_info.get('can_download', False) and batch.get('user') != user_info['username']:
        raise HTTPException(403, "You do not have permission to download reports.")
        
    results = batch['results']
    
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

@app.get("/api/check-booth")
async def check_booth(constituency: str, booth: str, user_info=Depends(get_current_user)):
    """Check if booth exists before starting extraction"""
    from core.db_bridge import check_booth_exists
    # We need to use the sync->async bridge
    check_fn = sync_to_async(check_booth_exists, thread_sensitive=True)
    exists = await check_fn(constituency, booth)
    return {"exists": exists}

# Missing endpoints needed by App.jsx
@app.post("/api/extract/{batch_id}")
async def start_extract(batch_id: str, background_tasks: BackgroundTasks, data: dict = Body({}), user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404)
    
    direct_pdf = data.get('direct_pdf', False)
    batch['status'] = 'extracting'
    batch['direct_pdf'] = direct_pdf
    state_manager.set_batch(batch_id, batch)
    
    dpi_val = 150
    if state_manager.use_redis:
        try:
            run_extraction_task.apply_async(args=[batch_id, dpi_val, direct_pdf], countdown=0)
        except Exception:
            background_tasks.add_task(run_extraction_task, batch_id, dpi_val, direct_pdf)
    else:
        background_tasks.add_task(run_extraction_task, batch_id, dpi_val, direct_pdf)
        
    return {"success": True}

@app.post("/api/process-batch/{batch_id}")
async def start_process(batch_id: str, background_tasks: BackgroundTasks, data: dict = Body(...), user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404)
    
    use_gemini = data.get('use_gemini', False)
    direct_pdf = data.get('direct_pdf', batch.get('direct_pdf', False)) # Use current preference or session memory
    
    batch['status'] = 'processing'
    batch['use_gemini'] = use_gemini
    batch['direct_pdf'] = direct_pdf
    state_manager.set_batch(batch_id, batch)
    
    if state_manager.use_redis:
        try:
            run_processing_task.apply_async(args=[batch_id, use_gemini, direct_pdf], countdown=0)
        except Exception:
            background_tasks.add_task(run_processing_task, batch_id, use_gemini, direct_pdf)
    else:
        background_tasks.add_task(run_processing_task, batch_id, use_gemini, direct_pdf)
        
    return {"success": True}

@app.post("/api/update-voter/{batch_id}/{voter_id}")
async def update_voter(batch_id: str, voter_id: int, data: dict, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: return {"success": False}
    
    modified = False
    for i, res in enumerate(batch['results']):
        if res.get('voter_id') == voter_id:
            batch['results'][i].update(data)
            batch['results'][i]['Status'] = '✅ OK'
            modified = True
            break
            
    if modified:
        batch['clean_count'] = len([r for r in batch['results'] if r.get('Status') == '✅ OK'])
        batch['flagged_count'] = len([r for r in batch['results'] if r.get('Status') != '✅ OK'])
        state_manager.set_batch(batch_id, batch)
        return {"success": True}
    return {"success": False}

@app.delete("/api/batch/{batch_id}/voter/{voter_id}")
async def delete_voter_from_batch(batch_id: str, voter_id: int, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404, "Batch not found")
    
    original_count = len(batch['results'])
    batch['results'] = [r for r in batch['results'] if r.get('voter_id') != voter_id]
    
    if len(batch['results']) < original_count:
        # Recalculate stats
        batch['clean_count'] = len([r for r in batch['results'] if r.get('Status') == '✅ OK'])
        batch['flagged_count'] = len([r for r in batch['results'] if r.get('Status') != '✅ OK'])
        batch['total_voters'] = len(batch['results'])
        state_manager.set_batch(batch_id, batch)
        
        # Optional: Attempt to delete the crop image to save space
        try:
            # We don't have the image name here easily without looping, ensuring we clean up is a "nice to have"
            pass 
        except: pass
        
        return {"success": True}
    
    raise HTTPException(404, "Voter not found in batch")

@app.get("/api/voter-image/{batch_id}/{image_name}")
@app.get("/api/crop/{batch_id}/{image_name}")
async def get_voter_image(batch_id: str, image_name: str):
    path = CROPS_DIR / batch_id / image_name
    if not path.exists():
        # Fallback to general crops dir if batch_id is actually part of image_name or something
        alt_path = CROPS_DIR / image_name
        if alt_path.exists(): path = alt_path
        else: raise HTTPException(404, "Image not found")
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
    state_manager.delete_batch(batch_id)
    state_manager.remove_cancelled(batch_id)
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
        "active_batches": len(state_manager.list_all_batches()),
    }

@app.get("/api/analytics/strategic")
async def fetch_strategic_analytics(constituency_id: str = None, user_info: dict = Depends(get_current_user)):
    try:
        data = await sync_to_async(sync_strategic_analytics_wrapper)(
            user_info["username"], 
            constituency_id
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Static Frontend Support
dist_path = BASE_DIR / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api"): raise HTTPException(404)
        return FileResponse(dist_path / "index.html")
