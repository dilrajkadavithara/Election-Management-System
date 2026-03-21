import os
import sys
import django
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

# Fix path for Django
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# 1. Django Setup
try:
    if os.environ.get('DJANGO_SETTINGS_MODULE'):
        django.setup()
        print("✅ Django Bridge Initialized in Main")
except Exception as e:
    print(f"⚠️ Django Setup Bypass/Error: {e}")

# 2. Router Imports
from backend.routers import auth, admin, voters, analytics, ocr, system, communications

# 3. App Setup
app = FastAPI(title="Election Management System Backend (V3)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(voters.router)
app.include_router(analytics.router)
app.include_router(ocr.router)
app.include_router(system.router)
app.include_router(communications.router)

# 5. Startup Check
@app.on_event("startup")
async def startup_event():
    logger = logging.getLogger("ElectionEngine")
    logger.info("Election Engine V3.0 starting with Modular Routers.")
