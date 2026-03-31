"""Engine Selector — Auto-discovers available OCR engine versions.

Mounts V1 (always present) and V2 (if available) routers.
After this is wired into main.py, adding/removing engine versions
is purely adding/removing files — no existing file changes needed.
"""
from fastapi import APIRouter

router = APIRouter()

# V1: Always present (the original protected pipeline)
from backend.routers.ocr import router as ocr_v1_router
router.include_router(ocr_v1_router)

# V2: Only if the module exists — safe to delete V2 files without breaking V1
try:
    from backend.routers.ocr_v2 import router as ocr_v2_router
    router.include_router(ocr_v2_router)
except ImportError:
    pass
