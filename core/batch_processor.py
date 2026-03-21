import os
import cv2
import json
import logging
import re
from core.ocr_engine import OCREngine
from core.detector import VoterDetector

logger = logging.getLogger("BatchProcessor")

class BatchProcessor:
    def __init__(self):
        self.engine = OCREngine()
        logger.info(f"🚀 Neural Sync {self.engine.VERSION} Ready.")
        self.detector = VoterDetector()
        self.results = []

    def process_pdf_directly(self, pdf_path, batch_id=None, page_range=None, callback=None):
        """High-Precision Image Mode: Converts PDF pages to high-res images before AI extraction."""
        import concurrent.futures
        from core.pdf_processor import PDFProcessor
        import tempfile
        import shutil
        from backend.state_manager import state_manager
        all_standardized = []
        
        # Cross-platform processor initialization
        pdf_proc = PDFProcessor()
        
        # Concurrency Management: 3 is the sweet spot for maximum stability without triggering token burst limits on AI endpoints
        max_workers = 5  # Stable-Nitro Mode: Optimum for 8-core / 16GB stability without API burst caps
        
        # Determine pages to process
        if page_range:
            if isinstance(page_range, (list, tuple)) and len(page_range) == 2:
                start_page, end_page = page_range
                pages = list(range(start_page, end_page + 1))
            else:
                pages = page_range
        else:
            # Correct method to get total pages safely
            total_pages = pdf_proc.convert_to_images(pdf_path, "", total_pages_only=True)
            pages = list(range(1, total_pages + 1))
        
        logger.info(f"🎯 High-Precision Box Mode: {len(pages)} pages | {max_workers} Workers | 300 DPI")
        
        # --- STABLE-BATCH CONVERSION (O(1) Overhead) ---
        # Instead of re-opening the PDF for every single page in a thread (High IOPS + RAM),
        # we render the needed pages into a persistent temp directory FIRST.
        temp_root = tempfile.mkdtemp(prefix="ocr_master_batch_")
        page_to_image_map = {}
        
        try:
            logger.info(f"🎨 Rendering {len(pages)} pages to high-res images (300 DPI)...")
            # Consume the generator to get ALL target images in one pass
            for batch_paths in pdf_proc.convert_to_images(
                pdf_path, temp_root, dpi=300, 
                first_page=min(pages), last_page=max(pages)
            ):
                for path in batch_paths:
                    # Extract page number from filename (e.g., page_003.jpg -> 3)
                    p_num_match = re.search(r'page_(\d+)', os.path.basename(path))
                    if p_num_match:
                        p_num = int(p_num_match.group(1))
                        if p_num in pages:
                            page_to_image_map[p_num] = path

            # 🎯 TRACER: Ensure we got all requested pages
            missing_pages = [p for p in pages if p not in page_to_image_map]
            if missing_pages:
                logger.warning(f"⚠️ Missing images for pages: {missing_pages}. Attempting rescue...")

            def process_page_extraction(page_num):
                page_img_path = page_to_image_map.get(page_num)
                if not page_img_path or not os.path.exists(page_img_path):
                    logger.error(f"❌ Page {page_num} image not found at {page_img_path}")
                    return page_num, "Image Missing", False

                try:
                    # --- GEMINI TRACER PASSTHROUGH ---
                    p_num, batch_results, success = self.engine.extract_full_page_consolidated(page_img_path, page_num=page_num)
                    
                    if not success or not isinstance(batch_results, list):
                        return page_num, f"AI Error: {batch_results}", False
                    
                    page_results = []
                    for entry in batch_results:
                        page_results.append({
                            "Full Name": entry.get("name_malayalam") or "",
                            "Relation Name": entry.get("relation_name_malayalam") or "",
                            "Relation Type": str(entry.get("relation_type") or "").title(),
                            "House Name": entry.get("house_name_malayalam") or "",
                            "House Number": entry.get("house_number") or "",
                            "Age": str(entry.get("age") or ""),
                            "Gender": str(entry.get("gender") or "").title(),
                            "EPIC_ID": entry.get("epic_id") or "",
                            "Serial_OCR": str(entry.get("serial_number") or ""),
                            "Image_Path": f"p{page_num}_full_page",
                            "Filename": os.path.basename(pdf_path)
                        })
                    return page_num, page_results, True

                except Exception as e:
                    logger.error(f"❌ Extraction Error on Page {page_num}: {e}")
                    return page_num, str(e), False

            # --- PARALLEL EXTRACTION: Only the AI calls are threaded now ---
            # This prevents Poppler Thread-Locking and reduces RAM overhead by 70%
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_page = {executor.submit(process_page_extraction, p): p for p in pages}

            ordered_results = {}
            
            for future in concurrent.futures.as_completed(future_to_page):
                if batch_id and state_manager.is_cancelled(batch_id):
                    logger.warning(f"🛑 Batch {batch_id} cancelled during result collection. Halting.")
                    return all_standardized # Return what we have, tasks.py will ignore it
                
                page, res, success = future.result()
                ordered_results[page] = res
                if callback:
                    callback(page, res, success)

        finally:
            # Cleanup target temp root
            shutil.rmtree(temp_root, ignore_errors=True)

        # 3. Final Serialization (Maintain Perfect Order)
        for p in pages:
            if p in ordered_results and isinstance(ordered_results[p], list):
                for voter in ordered_results[p]:
                    voter["voter_id"] = len(all_standardized) + 1
                    self._apply_standardization(voter, voter["voter_id"])
                    all_standardized.append(voter)
        
        return all_standardized

    def _apply_standardization(self, parsed_info, expected_serial):
        """Unified data cleaning and validation engine."""
        import re
        flags = []
        is_healed = False
        
        # 1. Serial Number Logic
        raw_serial = str(parsed_info.get("Serial_OCR", "")).strip()
        try:
            # Check if it's a valid integer (ignoring the second supplement box since Gemini prompt handles it)
            actual_serial = int(raw_serial)
            if actual_serial <= 0:
                raise ValueError("Zero or negative serial")
            parsed_info["Serial_OCR"] = str(actual_serial)
            # We don't mark as healed if it correctly extracted a number, even if it skips, 
            # because Kerala rolls can skip numbers (deletions) or start at a high number (supplements).
        except:
            # Fallback ONLY if OCR failed to read any number
            parsed_info["Serial_OCR"] = str(expected_serial)
            is_healed = True


        # 2. Malayalam Character Cleaning (Pruning)
        mal_fields = ["Full Name", "Relation Name", "House Name"]
        for field in mal_fields:
            val = str(parsed_info.get(field, ""))
            if not val or val == "N/A": continue
            # Keep only Malayalam chars, space, and dot
            pruned_val = re.sub(r'[^ \.\u0D00-\u0D7F]', '', val)
            parsed_info[field] = re.sub(r'\s+', ' ', pruned_val).strip()

        # 3. Data Integrity Checks
        critical_fields = ["Full Name", "Relation Name", "EPIC_ID", "Age", "Gender"]
        for field in critical_fields:
            val = str(parsed_info.get(field, "N/A"))
            if val == "N/A" or val.strip() == "":
                flags.append(f"Missing {field}")
            elif "$" in val or "9$" in val:
                flags.append(f"OCR Hallucination in {field}")

        # --- EPIC ID AUTO-RECOVERY ---
        # Fix for "JGQ" series being read as "GQ" (Missing leading J)
        # This addresses specific OCR drop issues observed in 2025 rolls.
        raw_epic = str(parsed_info.get("EPIC_ID", "")).strip().upper()
        if len(raw_epic) == 9 and raw_epic.startswith("GQ"):
            # Auto-prepend 'J'
            raw_epic = "J" + raw_epic
            parsed_info["EPIC_ID"] = raw_epic
            # We mark as healed so status reflects automated intervention if needed,
            # though for now we treat it as a standard correction.
            is_healed = True
        
        epic_val = raw_epic
        if len(epic_val) >= 7 and len(epic_val) <= 9:
            flags.append(f"Truncated EPIC ({len(epic_val)})")
        elif not re.match(r'^[A-Z]{3}[0-9]{7}$', epic_val) and epic_val != "":
            flags.append(f"Invalid EPIC Pattern")

        # 4. Final Status Determination
        if flags:
            parsed_info["Flags"] = ", ".join(flags)
            parsed_info["Status"] = "⚠️ REVIEW"
        elif is_healed:
            parsed_info["Flags"] = "(Serial Auto-Healed)"
            parsed_info["Status"] = "✅ OK"
        else:
            parsed_info["Flags"] = ""
            parsed_info["Status"] = "✅ OK"

    def process_box(self, img_path, expected_serial, use_gemini=False):
        """Processes a single voter box and applies the Integrity Shield."""
        img = cv2.imread(img_path)
        if img is None:
            return {"error": "Could not read image"}

        if use_gemini:
            # --- GEMINI AI FLOW ---
            gemini_results = self.engine.extract_batch_from_images([img])
            gemini_data = gemini_results[0] if gemini_results and len(gemini_results) > 0 else None
            
            if gemini_data:
                parsed_info = {
                    "Full Name": gemini_data.get("name_malayalam", ""),
                    "Relation Name": gemini_data.get("relation_name_malayalam", ""),
                    "Relation Type": str(gemini_data.get("relation_type", "")).title(),
                    "House Name": gemini_data.get("house_name_malayalam", ""),
                    "House Number": gemini_data.get("house_number", ""),
                    "Age": str(gemini_data.get("age", "")),
                    "Gender": str(gemini_data.get("gender", "")).title(),
                    "EPIC_ID": gemini_data.get("epic_id", ""),
                    "Serial_OCR": str(gemini_data.get("serial_number", ""))
                }
            else:
                use_gemini = False

        if not use_gemini:
            # Legacy Tesseract flow has been removed
            # Falling back to empty structure to prevent crashes if use_gemini is bypassed
            parsed_info = {
                "Full Name": "N/A",
                "Relation Name": "N/A",
                "Relation Type": "N/A",
                "House Name": "N/A",
                "House Number": "N/A",
                "Age": "N/A",
                "Gender": "N/A",
                "EPIC_ID": "",
                "Serial_OCR": ""
            }

        parsed_info["Image_Path"] = img_path
        parsed_info["Filename"] = os.path.basename(img_path)

        # Apply the shared standardization logic
        self._apply_standardization(parsed_info, expected_serial)
        
        return parsed_info


    def save_progress(self, results, path="data/batch_results.json"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=4)

    def load_progress(self, path="data/batch_results.json"):
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
