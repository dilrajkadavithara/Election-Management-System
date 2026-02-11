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

    def process_box(self, img_path, expected_serial):
        """Processes a single voter box and applies the Integrity Shield."""
        img = cv2.imread(img_path)
        if img is None:
            return {"error": "Could not read image"}

        # 1. OCR and Parse
        raw_data = self.engine.extract_raw_data(img)
        parsed_info = self.parser.parse_text_block(raw_data["C_TEXT"])
        
        # --- Magnified Age Recovery ---
        # If primary parse failed to get Age, try the Magnified Zone D
        if (parsed_info.get("Age") == "N/A" or not parsed_info.get("Age")) and raw_data.get("D_AGE_GENDER"):
            magnified_parse = self.parser.parse_text_block(raw_data["D_AGE_GENDER"])
            if magnified_parse.get("Age") != "N/A":
                parsed_info["Age"] = magnified_parse["Age"]
                # Also try to recover Gender if N/A
                if parsed_info.get("Gender") == "N/A":
                    parsed_info["Gender"] = magnified_parse["Gender"]

        # 2. Add OCR IDs
        serial_raw = raw_data["A_SERIAL"]
        serial_digits = re.findall(r'\d+', serial_raw)
        parsed_info["Serial_OCR"] = serial_digits[-1] if serial_digits else ""
        
        # --- AGE HEALING (Decision Logic) ---
        # If Age is a character that looks like a number, force it to be numeric
        age_val = str(parsed_info.get("Age", "N/A"))
        if age_val != "N/A" and not age_val.isdigit():
            # Decision map for Age look-alikes
            age_map = {'B': '8', 'O': '0', 'S': '5', 'G': '6', 'I': '1', 'L': '1', 'Z': '2', 'A': '4'}
            healed_age = ""
            for char in age_val:
                if char.isdigit(): healed_age += char
                elif char.upper() in age_map: healed_age += age_map[char.upper()]
            if healed_age:
                parsed_info["Age"] = healed_age

        # --- EPIC HEALING & TRUNCATION ---
        # 1. Take only first 10 alphanumeric characters
        raw_epic = re.sub(r'[^A-Z0-9]', '', raw_data["B_EPIC"].upper())
        clean_epic = raw_epic[:10]
        
        # 2. Heuristic Healing (Decision Logic)
        if len(clean_epic) == 10:
            prefix = clean_epic[:3]
            suffix = clean_epic[3:]
            
            # Heal digits (4th to 10th char): Map letters to look-alike numbers
            num_map = {'O': '0', 'U': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'A': '4'}
            healed_suffix = ""
            for char in suffix:
                if char.isalpha() and char in num_map:
                    healed_suffix += num_map[char]
                else:
                    healed_suffix += char
            
            parsed_info["EPIC_ID"] = prefix + healed_suffix
        else:
            parsed_info["EPIC_ID"] = clean_epic

        parsed_info["Image_Path"] = img_path
        parsed_info["Filename"] = os.path.basename(img_path)

        # 3. Integrity Shield (Auto-Healing & Flagging)
        flags = []
        is_healed = False
        
        # --- Serial Number Healing ---
        try:
            actual_serial = int(parsed_info.get("Serial_OCR", ""))
            if actual_serial != expected_serial:
                parsed_info["Serial_OCR"] = str(expected_serial)
                is_healed = True
        except:
            parsed_info["Serial_OCR"] = str(expected_serial)
            is_healed = True

        # --- Data Integrity Checks ---
        critical_fields = ["Full Name", "Relation Name", "EPIC_ID", "Age", "Gender"]
        text_fields = ["Full Name", "Relation Name", "House Name"]
        
        for field in critical_fields:
            val = str(parsed_info.get(field, "N/A"))
            if val == "N/A" or val.strip() == "":
                flags.append(f"Missing {field}")

        for field in text_fields:
            val = str(parsed_info.get(field, "N/A"))
            if val == "N/A" or val.strip() == "":
                continue

            # Clean invisible control chars before noise check (ZWJ/ZWNJ)
            check_val = val.replace('\u200c', '').replace('\u200d', '')
            
            # 1. Noise Check (English)
            if re.search(r'[a-zA-Z]', check_val):
                flags.append(f"Noise (English) in {field}")
            
            # 2. Symbol Check: 
            # - Dot (.) and Comma (,) are allowed in House Name.
            # - Slash (/), Brackets (()) are often in address fragments.
            if field == "House Name":
                symbol_pattern = r'[!@#$%\^&* _=+\[\]{}|;:<>?]'  # Removed /, (, ) from noise
            else:
                symbol_pattern = r'[!@#$%\^&*()_=+\[\]{}|;:<>,?]'
                
            if re.search(symbol_pattern, check_val):
                flags.append(f"Noise (Symbol) in {field}")

        # --- EPIC Strict Pattern Validation ---
        epic_val = str(parsed_info.get("EPIC_ID", "")).strip()
        if not re.match(r'^[A-Z]{3}[0-9]{7}$', epic_val):
            flags.append(f"Invalid EPIC Pattern (Captured: {epic_val})")

        # Final Status determination
        if flags:
            parsed_info["Flags"] = ", ".join(flags)
            parsed_info["Status"] = "⚠️ REVIEW"
        elif is_healed:
            parsed_info["Flags"] = "(Serial Auto-Healed)"
            parsed_info["Status"] = "✅ OK"
        else:
            parsed_info["Flags"] = ""
            parsed_info["Status"] = "✅ OK"
        
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
