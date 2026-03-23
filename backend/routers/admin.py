import os
import uuid
import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from backend.dependencies import get_current_user
from backend.config import DATA_DIR

SYMBOLS_DIR = DATA_DIR / "party_symbols"
SYMBOLS_DIR.mkdir(parents=True, exist_ok=True)

audit_logger = logging.getLogger("AuditLog")
from backend.django_bridge import (
    get_all_locations_async, add_const_async, add_lb_async, add_booth_async,
    update_const_async, update_lb_async, update_booth_async,
    get_all_users_async, create_user_async, delete_user_async, update_user_async
)
from backend.schemas.admin import (
    ConstituencyCreate, LocalBodyCreate, BoothCreate,
    ConstituencyUpdate, LocalBodyUpdate, BoothUpdate,
    UserCreate, UserUpdate
)

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

@router.get("/locations")
async def admin_get_locations(user_info=Depends(get_current_user)):
    return await get_all_locations_async(user_info['username'])

@router.post("/add-const")
async def admin_add_const(data: ConstituencyCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'MANAGER', 'OPERATOR']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    audit_logger.info(f"AUDIT: {user_info['username']} ADD_CONSTITUENCY name={data.name}")
    return await add_const_async(data.name)

@router.post("/add-lb")
async def admin_add_lb(data: LocalBodyCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'MANAGER', 'OPERATOR']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    audit_logger.info(f"AUDIT: {user_info['username']} ADD_LOCAL_BODY const_id={data.const_id} name={data.name}")
    return await add_lb_async(data.const_id, data.name, data.type)

@router.post("/add-booth")
async def admin_add_booth(data: BoothCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'MANAGER', 'OPERATOR', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    audit_logger.info(f"AUDIT: {user_info['username']} ADD_BOOTH const_id={data.const_id} lb_id={data.lb_id} number={data.number}")
    return await add_booth_async(data.const_id, data.lb_id, data.number, data.ps_name, data.ps_no)

@router.put("/update-const/{uid}")
async def admin_update_const(uid: int, data: ConstituencyUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN']
    if user_info['role'] not in allowed: raise HTTPException(403)
    audit_logger.info(f"AUDIT: {user_info['username']} UPDATE_CONSTITUENCY id={uid}")
    success, msg = await update_const_async(uid, data.name, data.code)
    return {"success": success, "message": msg}

@router.put("/update-lb/{uid}")
async def admin_update_lb(uid: int, data: LocalBodyUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD']
    if user_info['role'] not in allowed: raise HTTPException(403)
    audit_logger.info(f"AUDIT: {user_info['username']} UPDATE_LOCAL_BODY id={uid}")
    success, msg = await update_lb_async(uid, data.name, data.type, data.head_name, data.head_phone)
    return {"success": success, "message": msg}

@router.put("/update-booth/{uid}")
async def admin_update_booth(uid: int, data: BoothUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    audit_logger.info(f"AUDIT: {user_info['username']} UPDATE_BOOTH id={uid}")
    success, msg = await update_booth_async(uid, data.number, data.ps_name, data.ps_no, data.head_name, data.head_phone)
    return {"success": success, "message": msg}

@router.get("/users")
async def admin_get_users(user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    return await get_all_users_async()

@router.post("/create-user")
async def admin_create_user(data: UserCreate, user_info=Depends(get_current_user)):
    allowed_roles = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed_roles:
        raise HTTPException(403, "You do not have permission to create users")

    # Prevent privilege escalation: only SUPERUSER can create SUPERUSER/MANAGER
    ROLE_HIERARCHY = {
        'SUPERUSER': ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER', 'OPERATOR', 'BOOTH_AGENT'],
        'MANAGER': ['CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER', 'OPERATOR', 'BOOTH_AGENT'],
        'CONSTITUENCY_ADMIN': ['LOCAL_BODY_HEAD', 'ZONE_COMMANDER', 'OPERATOR', 'BOOTH_AGENT'],
        'LOCAL_BODY_HEAD': ['ZONE_COMMANDER', 'BOOTH_AGENT'],
        'ZONE_COMMANDER': ['BOOTH_AGENT'],
    }
    creatable = ROLE_HIERARCHY.get(user_info['role'], [])
    if data.role not in creatable:
        raise HTTPException(403, f"Your role ({user_info['role']}) cannot create users with role '{data.role}'")

    # Basic password strength
    if not data.password or len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    audit_logger.info(f"AUDIT: {user_info['username']} CREATE_USER username={data.username} role={data.role}")
    success, msg = await create_user_async(
        data.username, data.password, data.role, data.dict()
    )
    return {"success": success, "message": msg}

@router.delete("/delete-user/{uid}")
async def admin_delete_user(uid: int, user_info=Depends(get_current_user)):
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']: raise HTTPException(403)
    audit_logger.info(f"AUDIT: {user_info['username']} DELETE_USER id={uid}")
    success, msg = await delete_user_async(uid)
    return {"success": success, "message": msg}

@router.put("/update-user/{uid}")
async def admin_update_user(uid: int, data: UserUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    audit_logger.info(f"AUDIT: {user_info['username']} UPDATE_USER id={uid}")
    success, msg = await update_user_async(uid, data.dict(exclude_unset=True))
    return {"success": success, "message": msg}

@router.post("/sync-parties")
async def sync_parties(user_info=Depends(get_current_user)):
    """Force sync political parties with official branding assets."""
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']:
        raise HTTPException(403, "Admin authorization required.")

    from core.db_bridge import add_party
    from asgiref.sync import sync_to_async

    PARTIES = [
        {'name': 'Indian National Congress', 'short_label': 'INC', 'symbol_image': 'inc_hand.png', 'primary_color': '#1e40af', 'accent_gradient': 'linear-gradient(to bottom, #1e40af, #ffffff, #16a34a)'},
        {'name': 'Communist Party of India (Marxist)', 'short_label': 'CPIM', 'symbol_image': 'cpim_star.png', 'primary_color': '#DE0000', 'accent_gradient': 'linear-gradient(to bottom, #DE0000, #ffffff, #DE0000)'},
        {'name': 'Communist Party of India', 'short_label': 'CPI', 'symbol_image': 'cpi_corn.png', 'primary_color': '#D40000', 'accent_gradient': 'linear-gradient(to bottom, #D40000, #ffffff, #D40000)'},
        {'name': 'Indian Union Muslim League', 'short_label': 'IUML', 'symbol_image': 'iuml_ladder.png', 'primary_color': '#006600', 'accent_gradient': 'linear-gradient(to bottom, #006600, #ffffff, #006600)'},
        {'name': 'Kerala Congress (M)', 'short_label': 'KCM', 'symbol_image': 'kcm_leaves.png', 'primary_color': '#FF6600', 'accent_gradient': 'linear-gradient(to bottom, #FF6600, #ffffff, #FF6600)'},
        {'name': 'Kerala Congress (J)', 'short_label': 'KCJ', 'symbol_image': 'kcj_torch.png', 'primary_color': '#0050A0', 'accent_gradient': 'linear-gradient(to bottom, #0050A0, #ffffff, #0050A0)'},
        {'name': 'Revolutionary Socialist Party', 'short_label': 'RSP', 'symbol_image': 'rsp_spade.png', 'primary_color': '#ED1B24', 'accent_gradient': 'linear-gradient(to bottom, #ED1B24, #ffffff, #ED1B24)'},
    ]

    results = []
    for p_data in PARTIES:
        res = await sync_to_async(add_party)(
            p_data['name'], p_data['symbol_image'], p_data['short_label'],
            p_data['primary_color'], p_data['accent_gradient']
        )
        results.append(res)

    audit_logger.info(f"AUDIT: {user_info['username']} SYNC_PARTIES count={len(results)}")
    return {"success": True, "synced": results}

@router.post("/parties")
async def create_party(
    name: str = Form(...),
    file: UploadFile = File(...),
    short_label: str = Form(""),
    primary_color: str = Form("#000080"),
    accent_gradient: str = Form("linear-gradient(to bottom, #FF9933, #ffffff, #138808)"),
    user_info=Depends(get_current_user)
):
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']:
        raise HTTPException(403, "Only admins can manage parties.")

    from backend.django_bridge import add_party_async

    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'}
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")
    sym_name = f"{uuid.uuid4()}{ext}"
    path = SYMBOLS_DIR / sym_name

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    audit_logger.info(f"AUDIT: {user_info['username']} ADD_PARTY name={name}")
    return await add_party_async(name, sym_name, short_label, primary_color, accent_gradient)

@router.get("/party-symbol/{image_name}")
async def get_party_symbol(image_name: str, user_info=Depends(get_current_user)):
    from fastapi.responses import FileResponse
    # Prevent path traversal
    safe_name = Path(image_name).name
    if safe_name != image_name or '..' in image_name:
        raise HTTPException(400, "Invalid filename")
    path = SYMBOLS_DIR / safe_name
    if not path.exists():
        raise HTTPException(404, "Symbol not found")
    return FileResponse(path)
