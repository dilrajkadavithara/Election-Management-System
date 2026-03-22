# Project Guidelines

## Protected Files — DO NOT MODIFY without explicit user approval

The following files contain the optimized OCR pipeline (OpenCV box detection + Gemini extraction).
They have been tested and verified to produce 100% accuracy (1,087/1,087 voters).

**Do NOT modify these files** unless the user explicitly asks to change the OCR pipeline:

- `core/ocr_engine.py` — OpenCV box detection + Gemini extraction prompts
- `core/batch_processor.py` — Pipeline orchestration, page rendering, result assembly
- `backend/routers/ocr.py` — OCR API endpoints (upload, extract, save-to-db)

If a task seems to require changes to these files, ask the user first.

## Architecture Notes

- **OCR Pipeline**: PDF → 300 DPI render → OpenCV grid detection → Gemini extraction (1 API call/page)
- **Kerala voter list format**: 3 columns × 10 rows per page, serial numbers sequential across document
- **Pages to skip**: Always skip first 2 pages (covers) and last page (summary)
- **Location persistence**: Stored in Redis alongside batch data at upload time
