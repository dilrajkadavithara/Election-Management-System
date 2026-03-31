"""V2 OCR API Endpoints — Uses V2 processing pipeline with thinking_budget=0.

All V2 endpoints live under /api/v2/ to avoid conflicts with V1.
Upload, status, save, export, cancel, and clear endpoints are shared with V1 (same batch IDs).
Only the process-batch endpoint is different — it dispatches to the V2 Celery task.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from backend.dependencies import get_current_user
from backend.state_manager import state_manager
from backend.tasks_v2 import run_processing_task_v2

router = APIRouter(prefix="/api/v2", tags=["OCR Engine V2"])
logger = logging.getLogger("ElectionEngineV2")


@router.post("/process-batch/{batch_id}")
async def start_processing_v2(batch_id: str, request: Request, user_info=Depends(get_current_user)):
    """Triggers V2 OCR processing (thinking_budget=0 for cost optimization).

    Uses the same batch data from V1's upload/extract endpoints.
    The only difference is the Celery task dispatched.
    """
    batch = state_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")

    batch['use_gemini'] = True
    batch['direct_pdf'] = True
    batch['engine_version'] = 'v2'
    state_manager.set_batch(batch_id, batch)

    run_processing_task_v2.delay(batch_id)
    return {"success": True, "message": "V2 Processing task queued (optimized token usage)."}
