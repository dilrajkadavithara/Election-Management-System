import os
import cv2
import json
import logging
import re
from core.ocr_engine import OCREngine
from core.parser import VoterParser

class BatchProcessor:
    def __init__(self, tesseract_cmd=None):
        self.engine = OCREngine(tesseract_cmd=tesseract_cmd)
        self.parser = VoterParser()
        self.results = []

    def process_pdf_directly(self, pdf_path):
        """Strategic Upgrade: Sends PDF to Gemini and parses the results into our standard format."""
        raw_list = self.engine.extract_from_pdf(pdf_path)
        if not raw_list:
            return []

        standardized_results = []
        for i, entry in enumerate(raw_list):
            voter_id = i + 1
            # Step 1: Map raw Gemini fields to our internal standard
            parsed_info = {
                "Full Name": entry.get("name_malayalam", ""),
                "Relation Name": entry.get("relation_name_malayalam", ""),
                "Relation Type": str(entry.get("relation_type", "")).title(),
                "House Name": entry.get("house_name_malayalam", ""),
                "House Number": entry.get("house_number", ""),
                "Age": str(entry.get("age", "")),
                "Gender": str(entry.get("gender", "")).title(),
                "EPIC_ID": entry.get("epic_id", ""),
                "Serial_OCR": str(entry.get("serial_number", ""))
            }

            # Step 2: Apply our "Integrity Shield" (Healing and Validation)
            self._apply_standardization(parsed_info, voter_id)
            
            # Step 3: Add metadata
            parsed_info["voter_id"] = voter_id
            parsed_info["Image_Path"] = "pdf_source" # Marker showing this came from Direct Mode
            parsed_info["Filename"] = os.path.basename(pdf_path)
            
            standardized_results.append(parsed_info)
        
        return standardized_results

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

        epic_val = str(parsed_info.get("EPIC_ID", "")).strip()
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
            # --- LEGACY TESSERACT FLOW ---
            raw_data = self.engine.extract_raw_data(img)
            parsed_info = self.parser.parse_text_block(raw_data["C_TEXT"])
            
            # Age Recovery
            if (parsed_info.get("Age") == "N/A" or not parsed_info.get("Age")) and raw_data.get("D_AGE_GENDER"):
                magnified_parse = self.parser.parse_text_block(raw_data["D_AGE_GENDER"])
                if magnified_parse.get("Age") != "N/A":
                    parsed_info["Age"] = magnified_parse["Age"]
                    if parsed_info.get("Gender") == "N/A":
                        parsed_info["Gender"] = magnified_parse["Gender"]

            serial_raw = raw_data["A_SERIAL"]
            serial_digits = re.findall(r'\d+', serial_raw)
            parsed_info["Serial_OCR"] = serial_digits[-1] if serial_digits else ""
            
            # EPIC HEALING
            raw_epic = re.sub(r'[^A-Z0-9]', '', raw_data["B_EPIC"].upper())
            clean_epic = raw_epic[:10]
            if len(clean_epic) >= 8:
                # Prefix logic...
                prefix = clean_epic[:3]
                suffix = clean_epic[3:]
                alpha_map = {'0': 'O', '1': 'I', '2': 'Z', '3': 'J', '4': 'A', '5': 'S', '6': 'G', '8': 'B', '9': 'G'}
                healed_prefix = "".join([alpha_map.get(c, c) if c.isdigit() else c for c in prefix])
                num_map = {'O': '0', 'U': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'A': '4'}
                healed_suffix = "".join([num_map.get(c.upper(), c) if c.isalpha() else c for c in suffix])
                parsed_info["EPIC_ID"] = healed_prefix + healed_suffix
            else:
                parsed_info["EPIC_ID"] = clean_epic

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
