import cv2
import numpy as np
import os
import re
import json
import google.genai as genai
from google.genai import types as genai_types
import datetime
from PIL import Image
from dotenv import load_dotenv
from pathlib import Path
import time
import logging
import random
import threading
from contextlib import contextmanager

try:
    import redis
except ImportError:
    redis = None

# Load env for API Key
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
logger = logging.getLogger("OCREngine")

class OCREngine:
    # Zones defined as percentages of the box: (x1, y1, x2, y2)
    ZONES = {
        "A_SERIAL": (0.05, 0.02, 0.40, 0.18),  # Top Left
        "B_EPIC": (0.50, 0.01, 1.00, 0.22),    # Top Right ID (Widened Left and Heightened)
        "C_TEXT": (0.00, 0.00, 0.74, 1.00),    # Full height capture
        "D_AGE_GENDER": (0.00, 0.70, 0.85, 1.00), # Dedicated bottom zone (Lowered start, Widened)
    }

    def __init__(self):
        # Configuration for specific tasks (Legacy)
        self.config_numeric = "--oem 3 --psm 6" 
        self.config_eng = "--oem 3 --psm 6"
        self.config_mal = "--oem 3 --psm 6 -l mal+eng"
        self.config_epic = "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. --psm 7"

        self.client = None
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            # Upgraded to the fastest, most cost-effective vision model
            self.gemini_model = "gemini-2.5-flash-lite"
        else:
            self.gemini_model = None
        
        self.throttle_lock = threading.Lock()

    @contextmanager
    def get_throttle(self):
        """Simple rate limiter to prevent Gemini API 429 errors from parallel page threads."""
        with self.throttle_lock:
            # Enforce minimal safe buffer for parallel API calls
            time.sleep(0.2)
        yield

    def extract_batch_from_images(self, img_list):
        """
        🚀 TURBO MODE: Processes up to 30 voter boxes in a single API call.
        Includes Self-Correction and Alignment Verification.
        """
        if not self.client or not img_list:
            return []

        import io
        content_parts = []
        for img_np in img_list:
            # Natural BGR to RGB conversion (No binarization)
            rgb_img = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_img)
            buf = io.BytesIO()
            pil_img.save(buf, format='JPEG', quality=95)
            content_parts.append(
                genai_types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg")
            )

        count = len(img_list)
        prompt = f"""
        Attached are {count} individual images of voter boxes from a Kerala electoral roll.
        
        TASK:
        1. Extract the details from EVERY image into a JSON array of objects.
        2. You MUST return exactly {count} objects in the array.
        3. Maintain the EXACT order of the images provided.
        
        Fields per object:
        - serial_number: Top-left number. If there are TWO boxes side-by-side at the top left (e.g. [487] [1]), IGNORE the second box. ONLY return the number from the FIRST (leftmost) box.
        - epic_id: Top-right ID.
        - name_malayalam: Literal name in Malayalam.
        - relation_name_malayalam: Parent/Spouse name in Malayalam.
        - relation_type: EXACTLY "Husband", "Father", "Mother", or "Other".
        - house_number: Numeric/Alphanumeric house ID.
        - house_name_malayalam: House name in Malayalam.
        - age: Integer age.
        - gender: EXACTLY "Male" or "Female".

        CRITICAL ALIGNMENT:
        - If an image is blurry or empty, still include a placeholder object with serial_number.
        - Do not skip any image.
        - 100% literal transcription of Malayalam characters. 
        """
        content_parts.append(prompt)

        # Define Strict Schema with ENUMs for Zero-Cleanup Output
        voter_item = genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "serial_number": genai_types.Schema(type=genai_types.Type.STRING),
                "epic_id": genai_types.Schema(type=genai_types.Type.STRING),
                "name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "relation_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "relation_type": genai_types.Schema(
                    type=genai_types.Type.STRING, 
                    enum=["Father", "Husband", "Mother", "Other"]
                ),
                "house_number": genai_types.Schema(type=genai_types.Type.STRING),
                "house_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "age": genai_types.Schema(type=genai_types.Type.INTEGER),
                "gender": genai_types.Schema(
                    type=genai_types.Type.STRING,
                    enum=["Male", "Female"]
                ),
            },
            required=["serial_number", "epic_id", "name_malayalam"]
        )

        batch_schema = genai_types.Schema(
            type=genai_types.Type.ARRAY,
            items=voter_item
        )

        last_error = "Unknown"
        # Apply Global Throttling
        with self.get_throttle():
            for attempt in range(3):
                try:
                    response = self.client.models.generate_content(
                        model=self.gemini_model,
                        contents=content_parts,
                        config=genai_types.GenerateContentConfig(
                            thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                            temperature=0.0,
                            max_output_tokens=32768, # Increased for larger batches
                            response_mime_type="application/json",
                            response_schema=batch_schema
                        )
                    )
                    
                    text = response.text.strip()
                    if not text: continue

                    results = json.loads(text)
                    if isinstance(results, list):
                        # Verify Alignment
                        if len(results) != count:
                            last_error = f"Alignment mismatch: Got {len(results)}, expected {count}"
                            logger.warning(f"⚠️ {last_error}. Retrying...")
                            continue
                        return results
                    return [results]

                except Exception as e:
                    last_error = str(e)
                    logger.error(f"❌ Turbo Batch Failure (Attempt {attempt+1}): {e}")
                    time.sleep(2 * (attempt + 1))
        
        raise Exception(f"Gemini API failed after 3 attempts. Last error: {last_error}")

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

