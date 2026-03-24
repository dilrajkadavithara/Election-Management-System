import os
import sys
import django
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# 1. Strict Path Resolution
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
PROJECT_ROOT = os.path.join(ROOT_DIR, "voter_vault")

sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, PROJECT_ROOT)

# 2. Force Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "voter_vault.settings")

# 3. Explicit Django Setup (Loud Fail)
import django
django.setup()
print("✅ Django Bridge Initialized (Production Strict Mode)")

# 2. Router Imports
from backend.routers import auth, admin, voters, analytics, ocr, system, communications

# 3. App Setup
import os as _os
_is_prod = _os.getenv("DJANGO_SETTINGS_MODULE", "").endswith("settings")
app = FastAPI(
    title="Election Management System Backend (V3)",
    docs_url=None if _is_prod and not _os.getenv("ENABLE_DOCS") else "/docs",
    redoc_url=None if _is_prod and not _os.getenv("ENABLE_DOCS") else "/redoc",
)

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "https://intelhub.live,https://www.intelhub.live,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Global handler: convert ValueError from _get_user_or_raise into HTTP 404
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})

# 4. Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(voters.router)
app.include_router(analytics.router)
app.include_router(ocr.router)
app.include_router(system.router)
app.include_router(communications.router)

# 5. Mount Django Admin via WSGI
from django.core.wsgi import get_wsgi_application
from starlette.middleware.wsgi import WSGIMiddleware

django_wsgi = get_wsgi_application()
app.mount("/voter-intel-hq-2026", WSGIMiddleware(django_wsgi))

# 6. Startup Check
@app.on_event("startup")
async def startup_event():
    logger = logging.getLogger("ElectionEngine")
    logger.info("Election Engine V3.0 starting with Modular Routers.")
