import os
import uuid
import shutil
import logging
import gc
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from backend.dependencies import get_current_user
from backend.config import UPLOAD_DIR
from backend.state_manager import state_manager
from backend.tasks import run_extraction_task, run_processing_task

router = APIRouter(prefix="/api", tags=["OCR Engine"])
logger = logging.getLogger("ElectionEngine")

@router.post("/upload")
async def upload(file: UploadFile = File(...), user_info=Depends(get_current_user)):
    batch_id = str(uuid.uuid4())[:8]
    f_path = UPLOAD_DIR / f"{batch_id}_{file.filename}"
    with f_path.open("wb") as b: 
        shutil.copyfileobj(file.file, b)
    
    batch_data = {
        "id": batch_id, "filename": file.filename, "file_path": str(f_path),
        "status": "uploaded", "total_pages": 0, "pages_processed": 0,
        "total_voters": 0, "voters_processed": 0, "results": [],
        "clean_count": 0, "flagged_count": 0,
        "user": user_info['username']
    }
    state_manager.set_batch(batch_id, batch_data)
    return {"success": True, "id": batch_id, "status": "uploaded"}

@router.get("/batch/{batch_id}/status")
async def get_status(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: return {"status": "cleared"}
    batch['flagged_items'] = [r['voter_id'] for r in batch.get('results', []) if r.get('Status') != '✅ OK']
    return batch

@router.post("/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404, "Batch not found")
    state_manager.mark_cancelled(batch_id)
    state_manager.delete_batch(batch_id)
    gc.collect()
    return {"success": True, "message": "Batch permanently cancelled."}

@router.get("/batch/latest")
async def get_latest_batch(user_info=Depends(get_current_user)):
    all_batches = state_manager.list_all_batches()
    user_batches = [b for b in all_batches if b.get('user') == user_info['username'] and b.get('status') in ['processing', 'uploaded']]
    if not user_batches: return {"found": False}
    best = max(user_batches, key=lambda b: len(b.get('results', [])))
    return {"found": True, "batch": best}

@router.get("/batch/{batch_id}/export-csv")
async def export_batch_csv(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch or 'results' not in batch: raise HTTPException(404, "Batch results not found")
    import csv, io
    results = batch['results']
    if not results: return {"error": "No data"}
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=results[0].keys())
    writer.writeheader(); writer.writerows(results)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=ocr_batch_{batch_id}.csv"})
