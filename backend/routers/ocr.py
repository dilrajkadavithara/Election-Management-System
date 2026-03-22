import os
import uuid
import shutil
import logging
import gc
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.dependencies import get_current_user
from backend.config import UPLOAD_DIR, PAGES_DIR, CROPS_DIR
from backend.state_manager import state_manager
from backend.tasks import run_extraction_task, run_processing_task
from backend.django_bridge import save_booth_data_async


class SaveBatchRequest(BaseModel):
    batch_id: str
    constituency: str = ""
    lgb_type: str = ""
    lgb_name: str = ""
    booth: str = ""
    booth_id: str = ""
    booth_number: str = ""
    ps_no: str = ""
    ps_name: str = ""

router = APIRouter(prefix="/api", tags=["OCR Engine"])
logger = logging.getLogger("ElectionEngine")

@router.post("/upload")
async def upload(file: UploadFile = File(...), user_info=Depends(get_current_user)):
    batch_id = str(uuid.uuid4())[:8]
    safe_filename = os.path.basename(file.filename)
    f_path = UPLOAD_DIR / f"{batch_id}_{safe_filename}"
    with f_path.open("wb") as b: 
        shutil.copyfileobj(file.file, b)
    
    batch_data = {
        "id": batch_id, "filename": safe_filename, "file_path": str(f_path),
        "status": "uploaded", "total_pages": 0, "pages_processed": 0,
        "total_voters": 0, "voters_processed": 0, "results": [],
        "clean_count": 0, "flagged_count": 0,
        "user": user_info['username']
    }
    state_manager.set_batch(batch_id, batch_data)
    return {"success": True, "id": batch_id, "status": "uploaded"}

@router.post("/extract/{batch_id}")
async def start_extraction(batch_id: str, request: Request, user_info=Depends(get_current_user)):
    """Triggers the PDF-to-Image extraction phase."""
    data = {}
    try: data = await request.json()
    except Exception: pass

    dpi = data.get('dpi', 300)
    direct_pdf = data.get('direct_pdf', False)

    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404, "Batch not found")
    batch['dpi'] = dpi
    batch['direct_pdf'] = direct_pdf
    state_manager.set_batch(batch_id, batch)

    run_extraction_task.delay(batch_id, dpi, direct_pdf)
    return {"success": True, "message": "Extraction task queued."}

@router.post("/process-batch/{batch_id}")
async def start_processing(batch_id: str, request: Request, user_info=Depends(get_current_user)):
    """Triggers the OCR (Gemini/Tesseract) analysis."""
    data = {}
    try: data = await request.json()
    except Exception: pass

    use_gemini = data.get('use_gemini', False)
    direct_pdf = data.get('direct_pdf', False)

    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404, "Batch not found")
    batch['use_gemini'] = use_gemini
    batch['direct_pdf'] = direct_pdf
    state_manager.set_batch(batch_id, batch)

    run_processing_task.delay(batch_id, use_gemini, direct_pdf)
    return {"success": True, "message": "Processing task queued."}

@router.get("/batch/{batch_id}/status")
async def get_status(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: return {"status": "cleared"}
    batch['flagged_items'] = [r['voter_id'] for r in batch.get('results', []) if r.get('Status') != '✅ OK']
    return batch

@router.post("/batch/{batch_id}/cancel")
async def cancel_batch(batch_id: str, user_info=Depends(get_current_user)):
    batch = state_manager.get_batch(batch_id)
    if not batch: raise HTTPException(404, "Batch not found")
    if batch.get('user') != user_info['username'] and user_info.get('role') != 'SUPERUSER':
        raise HTTPException(403, "You can only cancel your own batches")
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

@router.post("/save-to-db")
async def save_to_db(payload: SaveBatchRequest, user_info=Depends(get_current_user)):
    """Commit OCR batch results to the database."""
    if not payload.constituency or not payload.booth:
        return {"success": False, "message": "Please select Constituency and Booth before saving."}

    batch = state_manager.get_batch(payload.batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")

    results = batch.get('results', [])
    if not results:
        return {"success": False, "message": "No voter data to save."}

    # Resolve IDs to names — the frontend sends IDs but save_booth_data expects names
    from asgiref.sync import sync_to_async
    from core_db.models import Constituency, LocalBody

    constituency_name = payload.constituency
    local_body_name = payload.lgb_name
    local_body_type = payload.lgb_type or "PANCHAYAT"

    # If constituency looks like an ID, resolve it
    if constituency_name and constituency_name.isdigit():
        try:
            c = await sync_to_async(Constituency.objects.get)(id=int(constituency_name))
            constituency_name = c.name
        except Constituency.DoesNotExist:
            return {"success": False, "message": f"Constituency ID {constituency_name} not found"}

    # If local body looks like an ID, resolve it
    if local_body_name and str(local_body_name).isdigit():
        try:
            lb = await sync_to_async(LocalBody.objects.get)(id=int(local_body_name))
            local_body_name = lb.name
            local_body_type = lb.body_type
        except LocalBody.DoesNotExist:
            return {"success": False, "message": f"Local Body ID {local_body_name} not found"}

    success, msg = await save_booth_data_async(
        constituency_name,
        local_body_type,
        local_body_name,
        payload.booth_number or payload.booth,
        results,
        batch.get('filename', ''),
        payload.ps_no,
        payload.ps_name,
        user_info.get('user_id')
    )

    if not success:
        raise HTTPException(400, detail=msg)

    # Mark batch as completed so auto-reconnect doesn't reload it
    batch['status'] = 'completed'
    state_manager.set_batch(payload.batch_id, batch)

    return {"success": success, "message": msg}

@router.post("/batch/{batch_id}/location")
async def update_batch_location(batch_id: str, payload: dict, user_info=Depends(get_current_user)):
    """Store location data in batch so it persists across page reloads."""
    batch = state_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    batch['location'] = payload.get('location', {})
    state_manager.set_batch(batch_id, batch)
    return {"success": True}

@router.post("/clear-session/{batch_id}")
async def clear_session(batch_id: str, user_info=Depends(get_current_user)):
    """Clean up batch data and temporary files."""
    batch = state_manager.get_batch(batch_id)
    if batch:
        try:
            pdf_path = batch.get('file_path')
            if pdf_path and os.path.exists(pdf_path):
                os.remove(pdf_path)
            p_dir = PAGES_DIR / batch_id
            if p_dir.exists():
                shutil.rmtree(str(p_dir))
            c_dir = CROPS_DIR / batch_id
            if c_dir.exists():
                shutil.rmtree(str(c_dir))
        except Exception:
            pass
        state_manager.delete_batch(batch_id)
    return {"success": True}
