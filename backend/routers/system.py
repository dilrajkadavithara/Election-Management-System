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
        "google_ai": "configured" if GOOGLE_API_KEY else "missing",
    }

    try:
        from django.contrib.auth.models import User
        from asgiref.sync import sync_to_async
        def check_db(): return User.objects.exists()
        db_ok = await sync_to_async(check_db)()
        health_data["db"] = "connected" if db_ok else "empty"
    except Exception as db_err:
        health_data["db"] = "error"

    if POPPLER_PATH and os.path.exists(os.path.join(POPPLER_PATH, "pdftoppm.exe")): health_data["poppler"] = "ready"
    elif not os.name == 'nt' or os.path.exists("/usr/bin/pdftoppm"): health_data["poppler"] = "ready (system)"

    if health_data.get("db") == "error" or health_data["poppler"] == "missing" or health_data["google_ai"] == "missing":
        health_data["status"] = "degraded"
    return health_data

@router.get("/system-logs")
async def get_system_logs(user_info=Depends(get_current_user)):
    """Protected: Raw diagnostics for deployment/crash verification."""
    if not user_info.get('can_manage_system', False):
        raise HTTPException(403, "System management permission required")
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

@router.get("/party-symbol/{image_name}")
async def get_party_symbol(image_name: str):
    """Serve party symbol images."""
    from fastapi.responses import FileResponse
    from backend.config import DATA_DIR
    path = DATA_DIR / "party_symbols" / image_name
    if not path.exists():
        raise HTTPException(404, "Symbol not found")
    return FileResponse(path)
