import cv2
import pytesseract
import numpy as np
import os
import re

class OCREngine:
    # Zones defined as percentages of the box: (x1, y1, x2, y2)
    ZONES = {
        "A_SERIAL": (0.05, 0.04, 0.40, 0.17),  # Widened to 40% to capture trailing digits
        "B_EPIC": (0.60, 0.02, 1.00, 0.19),    # Top Right ID
        "C_TEXT": (0.00, 0.00, 0.74, 1.00),    # Full height capture
        "D_AGE_GENDER": (0.00, 0.75, 0.70, 1.00), # Dedicated bottom zone for Age/Gender magnification
    }

    def __init__(self, tesseract_cmd=None):
        cmd = tesseract_cmd or os.getenv('TESSERACT_CMD')
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd
        
        # Configuration for specific tasks
        # psm 6: Assume a single uniform block of text
        # psm 7: Treat the image as a single text line
        self.config_numeric = "--oem 3 --psm 6" 
        self.config_eng = "--oem 3 --psm 6"
        self.config_mal = "--oem 3 --psm 6 -l mal+eng"
        # EPIC Specific: Single line, strict whitelist including dot
        self.config_epic = "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. --psm 7"

    def get_zone_coords(self, img_shape, zone_name):
        h, w = img_shape[:2]
        x1p, y1p, x2p, y2p = self.ZONES[zone_name]
        return (int(x1p * w), int(y1p * h), int(x2p * w), int(y2p * h))

    def get_overlay_image(self, img):
        """Draws color coded rectangles on the image for verification."""
        # Create a copy in RGB for Streamlit compatibility
        overlay = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        colors = {
            "A_SERIAL": (255, 0, 0),   # Red
            "B_EPIC": (0, 255, 0),     # Green
            "C_TEXT": (0, 0, 255),     # Blue
        }
        
        for zone, (x1p, y1p, x2p, y2p) in self.ZONES.items():
            x1, y1, x2, y2 = self.get_zone_coords(img.shape, zone)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), colors[zone], 2)
            cv2.putText(overlay, zone, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors[zone], 2)
            
        return overlay

    def extract_raw_data(self, img):
        """Extracts text from each zone."""
        results = {}
        
        # 1. Serial Number (Numeric)
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "A_SERIAL")
        crop_a = img[y1:y2, x1:x2]
        gray_a = cv2.cvtColor(crop_a, cv2.COLOR_BGR2GRAY)
        
        # Try with thresholding first
        _, thresh_a = cv2.threshold(gray_a, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text_a = pytesseract.image_to_string(thresh_a, config=self.config_numeric).strip()
        
        # Fallback to gray if empty
        if not text_a:
            text_a = pytesseract.image_to_string(gray_a, config=self.config_numeric).strip()
            
        # Extract only digits (handle cases like '1 4' or 'Serial 1')
        digits = "".join(re.findall(r'\d+', text_a))
        results["A_SERIAL"] = digits

        # 2. EPIC ID (English) - Magnifying Glass Implementation
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "B_EPIC")
        crop_b = img[y1:y2, x1:x2]
        
        # Cautious Reading: Upscale 2x for clarity (Magnifying Glass)
        upscaled_b = cv2.resize(crop_b, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        gray_b = cv2.cvtColor(upscaled_b, cv2.COLOR_BGR2GRAY)
        
        # Sharpness Enhancement
        _, thresh_b = cv2.threshold(gray_b, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        results["B_EPIC"] = pytesseract.image_to_string(thresh_b, config=self.config_epic).strip()

        # 3. Main Text (Malayalam)
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "C_TEXT")
        crop_c = img[y1:y2, x1:x2]
        gray_c = cv2.cvtColor(crop_c, cv2.COLOR_BGR2GRAY)
        results["C_TEXT"] = pytesseract.image_to_string(gray_c, config=self.config_mal).strip()

        # 4. Age/Gender Magnification
        x1, y1, x2, y2 = self.get_zone_coords(img.shape, "D_AGE_GENDER")
        crop_d = img[y1:y2, x1:x2]
        if crop_d.size > 0:
            # High-Intensity Magnification: 3.0x scaling
            upscaled_d = cv2.resize(crop_d, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
            gray_d = cv2.cvtColor(upscaled_d, cv2.COLOR_BGR2GRAY)
            
            # Dilation: Slightly thicken the strokes to help OCR identify small numbers (like 6)
            kernel = np.ones((2, 2), np.uint8)
            dilated_d = cv2.erode(gray_d, kernel, iterations=1) # Erode on gray is like dilating white text
            
            results["D_AGE_GENDER"] = pytesseract.image_to_string(dilated_d, config=self.config_mal).strip()
        else:
            results["D_AGE_GENDER"] = ""

        return results
