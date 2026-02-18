import cv2
import pytesseract
import numpy as np
import os
import re
import json
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from pathlib import Path

# Load env for API Key
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class OCREngine:
    # Zones defined as percentages of the box: (x1, y1, x2, y2)
    ZONES = {
        "A_SERIAL": (0.05, 0.02, 0.40, 0.18),  # Top Left
        "B_EPIC": (0.50, 0.01, 1.00, 0.22),    # Top Right ID (Widened Left and Heightened)
        "C_TEXT": (0.00, 0.00, 0.74, 1.00),    # Full height capture
        "D_AGE_GENDER": (0.00, 0.70, 0.85, 1.00), # Dedicated bottom zone (Lowered start, Widened)
    }

    def __init__(self, tesseract_cmd=None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        
        # Configuration for specific tasks
        self.config_numeric = "--oem 3 --psm 6" 
        self.config_eng = "--oem 3 --psm 6"
        self.config_mal = "--oem 3 --psm 6 -l mal+eng"
        self.config_epic = "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. --psm 7"

        # Gemini Config
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.gemini_model = genai.GenerativeModel('gemini-flash-latest')
        else:
            self.gemini_model = None

    def extract_with_gemini(self, img_np):
        """High-precision extraction using Gemini AI with exponential backoff."""
        if not self.gemini_model:
            return None

        # Convert CV2 (BGR) to PIL (RGB)
        rgb_img = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_img)

        prompt = """
        Extract the voter details from this image. 
        The image is a single box from an Indian Voter List.
        Return the data in EXACTLY this JSON format:
        {
            "serial_number": "string",
            "epic_id": "string",
            "name_malayalam": "string",
            "relation_name_malayalam": "string",
            "relation_type": "FATHER/HUSBAND/MOTHER/OTHER",
            "house_number": "string",
            "house_name_malayalam": "string",
            "age": "number",
            "gender": "MALE/FEMALE"
        }
        If any field is missing, use "". Do not include markdown blocks, just raw JSON.
        """

        import time
        max_retries = 3
        base_delay = 2 # seconds
        
        for attempt in range(max_retries):
            try:
                # Use gemini-flash-latest which is confirmed to work with this SDK/Key
                response = self.gemini_model.generate_content([prompt, pil_img])
                text = response.text.strip()
                
                # Clean possible markdown
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                
                return json.loads(text)
            except Exception as e:
                # Handle Rate Limits (429) or other transient errors
                if "429" in str(e) or "quota" in str(e).lower():
                    delay = base_delay * (2 ** attempt)
                    print(f"Gemini Rate Limit Hit. Retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(delay)
                    continue
                
                print(f"Gemini OCR Error on attempt {attempt+1}: {e}")
                if attempt == max_retries - 1: return None
                time.sleep(base_delay)
        
        return None

    def get_zone_coords(self, img_shape, zone_name):
        h, w = img_shape[:2]
        x1p, y1p, x2p, y2p = self.ZONES[zone_name]
        return (int(x1p * w), int(y1p * h), int(x2p * w), int(y2p * h))

    def get_overlay_image(self, img):
        """Draws color coded rectangles on the image for verification."""
        overlay = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        colors = {
            "A_SERIAL": (255, 0, 0),   "B_EPIC": (0, 255, 0),
            "C_TEXT": (0, 0, 255),     "D_AGE_GENDER": (255, 255, 0)
        }
        for zone, (x1p, y1p, x2p, y2p) in self.ZONES.items():
            x1, y1, x2, y2 = self.get_zone_coords(img.shape, zone)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), colors.get(zone, (255, 255, 255)), 2)
        return overlay

    def extract_raw_data(self, img):
        """Standard Tesseract Extraction (Legacy fallback)."""
        results = {}
        
        # 1. Serial Number
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "A_SERIAL")
        crop_a = img[y1:y2, x1:x2]
        if crop_a.size > 0:
            gray_a = cv2.cvtColor(crop_a, cv2.COLOR_BGR2GRAY)
            _, thresh_a = cv2.threshold(gray_a, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            text_a = pytesseract.image_to_string(thresh_a, config=self.config_numeric).strip()
            results["A_SERIAL"] = "".join(re.findall(r'\d+', text_a))
        else:
            results["A_SERIAL"] = ""

        # 2. EPIC ID
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "B_EPIC")
        crop_b = img[y1:y2, x1:x2]
        if crop_b.size > 0:
            upscaled_b = cv2.resize(crop_b, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
            gray_b = cv2.cvtColor(upscaled_b, cv2.COLOR_BGR2GRAY)
            _, thresh_b = cv2.threshold(gray_b, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            results["B_EPIC"] = pytesseract.image_to_string(thresh_b, config=self.config_epic).strip()
        else:
            results["B_EPIC"] = ""

        # 3. Main Text
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "C_TEXT")
        crop_c = img[y1:y2, x1:x2]
        gray_c = cv2.cvtColor(crop_c, cv2.COLOR_BGR2GRAY)
        results["C_TEXT"] = pytesseract.image_to_string(gray_c, config=self.config_mal).strip()

        # 4. Age/Gender
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "D_AGE_GENDER")
        crop_d = img[y1:y2, x1:x2]
        if crop_d.size > 0:
            upscaled_d = cv2.resize(crop_d, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
            gray_d = cv2.cvtColor(upscaled_d, cv2.COLOR_BGR2GRAY)
            kernel = np.ones((2, 2), np.uint8)
            dilated_d = cv2.erode(gray_d, kernel, iterations=1)
            results["D_AGE_GENDER"] = pytesseract.image_to_string(dilated_d, config=self.config_mal).strip()
        else:
            results["D_AGE_GENDER"] = ""

        return results
