import os
from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import get_current_user
from backend.config import GLOBAL_LOG_FILE, POPPLER_PATH, GOOGLE_API_KEY
from backend.state_manager import state_manager

router = APIRouter(prefix="/api", tags=["System Diagnostics"])

@router.get("/health")
async def health():
    health_data = {
        "status": "healthy",
        "redis": "connected" if state_manager.use_redis else "offline (fallback mode)",
        "poppler": "missing",
        "google_ai": "ready" if GOOGLE_API_KEY else "missing",
        "build_version": "2026-03-20T04:20:00"
    }
    
    try:
        from django.contrib.auth.models import User
        from asgiref.sync import sync_to_async
        def get_db_stats(): return {"count": User.objects.count(), "admin_exists": User.objects.filter(username="admin").exists()}
        db_stats = await sync_to_async(get_db_stats)()
        health_data["db_users"] = db_stats["count"]
        health_data["has_admin"] = db_stats["admin_exists"]
    except Exception as db_err: health_data["db_error"] = str(db_err)
    
    if POPPLER_PATH and os.path.exists(os.path.join(POPPLER_PATH, "pdftoppm.exe")): health_data["poppler"] = "ready"
    elif not os.name == 'nt' or os.path.exists("/usr/bin/pdftoppm"): health_data["poppler"] = "ready (system)"

    try:
        if GLOBAL_LOG_FILE.exists():
            with open(GLOBAL_LOG_FILE, "r", errors="ignore") as lf:
                health_data["last_log"] = lf.readlines()[-3:]
    except: pass
    
    if health_data.get("db_error") or health_data["poppler"] == "missing" or health_data["google_ai"] == "missing":
        health_data["status"] = "degraded"
    return health_data

@router.get("/system-logs")
async def get_system_logs(user_info=Depends(get_current_user)):
    try:
        if not GLOBAL_LOG_FILE.exists(): return {"logs": ["System initializing..."]}
        with open(GLOBAL_LOG_FILE, "rb") as f:
            f.seek(0, 2); file_size = f.tell()
            chunk_size = min(file_size, 1024 * 128)
            f.seek(file_size - chunk_size)
            tail_data = f.read().decode("utf-8", errors="ignore")
            lines = tail_data.splitlines()[-30:]
        return {"logs": [l.strip() for l in lines if l.strip()]}
    except Exception as e: return {"logs": [f"Error reading logs: {e}"]}

@router.get("/parties")
async def api_get_parties(user_info=Depends(get_current_user)):
    """Fetch all active political parties for the dashboard UI."""
    from backend.django_bridge import get_parties_async
    return await get_parties_async()
