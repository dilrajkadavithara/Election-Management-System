import os
import cv2
import json
import logging
import re
from core.ocr_engine import OCREngine

class BatchProcessor:
    def __init__(self, tesseract_cmd=None):
        self.engine = OCREngine(tesseract_cmd=tesseract_cmd)
        self.results = []

    def process_pdf_directly(self, pdf_path, page_range=None, callback=None):
        """Neural Parallel Upgrade: Processes multiple pages simultaneously using Gemini."""
        import concurrent.futures
        all_standardized = []
        
        # 1. Upload to Cloud ONCE (The Speed/Cost Optimizer)
        google_file = self.engine.upload_file(pdf_path)
        if not google_file:
            logging.error("Failed to upload file to Gemini. Falling back to slow byte mode.")
        
        # Reduced concurrency to avoid 429 Rate Limit issues on Gemini Free Tier
        max_workers = 10 
        pages = page_range if page_range else [None]
        
        def process_page(page_num):
            try:
                # Use CACHED mode if upload succeeded, else fallback
                if google_file:
                    raw_data = self.engine.extract_from_cached_file(google_file, page_num)
                else:
                    raw_data = self.engine.extract_from_pdf(pdf_path, page_num=page_num)
                
                if not raw_data:
                    return page_num, []

                raw_list = []
                if isinstance(raw_data, list):
                    raw_list = raw_data
                elif isinstance(raw_data, dict):
                    for val in raw_data.values():
                        if isinstance(val, list):
                            raw_list = val
                            break
                
                if not raw_list:
                    return page_num, []

                page_results = []
                for entry in raw_list:
                    if not isinstance(entry, dict): continue
                    
                    parsed_info = {
                        "Full Name": entry.get("name_malayalam") or entry.get("Full Name", ""),
                        "Relation Name": entry.get("relation_name_malayalam") or entry.get("Relation Name", ""),
                        "Relation Type": str(entry.get("relation_type") or entry.get("Relation Type", "")).title(),
                        "House Name": entry.get("house_name_malayalam") or entry.get("House Name", ""),
                        "House Number": entry.get("house_number") or entry.get("House Number", ""),
                        "Age": str(entry.get("age") or entry.get("Age", "")),
                        "Gender": str(entry.get("gender") or entry.get("Gender", "")).title(),
                        "EPIC_ID": entry.get("epic_id") or entry.get("EPIC_ID", ""),
                        "Serial_OCR": str(entry.get("serial_number") or entry.get("Serial_OCR", "")),
                        "Image_Path": f"pdf_page_{page_num if page_num else 'all'}",
                        "Filename": os.path.basename(pdf_path)
                    }
                    page_results.append(parsed_info)
                return page_num, page_results
            except Exception as e:
                logging.error(f"Thread Error on Page {page_num}: {e}")
                return page_num, []

        # High-Performance Neural Parallelism
        # Scaled to 30 workers for ultra-fast extraction.
        max_workers = 10 
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_page = {executor.submit(process_page, p): p for p in pages}
            ordered_results = {}
            
            for future in concurrent.futures.as_completed(future_to_page):
                page, results = future.result()
                ordered_results[page] = results
                if callback and results:
                    callback(page, results)

            for p in pages:
                if p in ordered_results:
                    for i, voter in enumerate(ordered_results[p]):
                        voter["voter_id"] = len(all_standardized) + 1
                        self._apply_standardization(voter, voter["voter_id"])
                        all_standardized.append(voter)
        
        # Cleanup: Remove file from Google Cloud to be a good citizen
        try:
            if google_file:
                import google.generativeai as genai
                genai.delete_file(google_file.name)
        except: pass

        return all_standardized

    def _apply_standardization(self, parsed_info, expected_serial):
        """Unified data cleaning and validation engine."""
        import re
        flags = []
        is_healed = False
        
        # 1. Serial Number Healing
        try:
            actual_serial = int(parsed_info.get("Serial_OCR", ""))
            if actual_serial != expected_serial:
                parsed_info["Serial_OCR"] = str(expected_serial)
                is_healed = True
        except:
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
            gemini_data = self.engine.extract_with_gemini(img)
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
