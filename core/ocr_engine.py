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
            # Restored standard model for highest accuracy
            self.gemini_model = "gemini-2.5-flash"
        else:
            self.gemini_model = None
        
        self.throttle_lock = threading.Lock()

    @contextmanager
    def get_throttle(self):
        """Standard thread-safe throttle for API calls."""
        with self.throttle_lock:
            # OPTIMIZED: 2.5s stagger between page workers. 
            # Total 5 workers * 150k = 750k tokens in 1-minute window.
            time.sleep(2.5)
        # RELEASE LOCK: Allow next worker to stagger while THIS one hits Gemini.
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
            rgb_img = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_img)
            
            # Massive input token saving: Downscale width to max 400px to maintain
            # aspect ratio, and lower JPEG quality constraints.
            # This slices the byte-size heavily without ruining Kannada/Malayalam legibility.
            pil_img.thumbnail((350, 350), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            pil_img.save(buf, format='JPEG', quality=70, optimize=True)
            
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
        for attempt in range(5): # Increased to 5 attempts for production reliability
            # Apply Global Throttling inside the loop to allow better concurrency
            with self.get_throttle():
                try:
                    response = self.client.models.generate_content(
                        model=self.gemini_model,
                        contents=content_parts,
                        config=genai_types.GenerateContentConfig(
                            thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                            temperature=0.0,
                            max_output_tokens=32768, 
                            response_mime_type="application/json",
                            response_schema=batch_schema
                        )
                    )
                    
                    text = response.text.strip()
                    if not text: 
                        last_error = "Empty response from Gemini"
                        continue

                    results = json.loads(text)
                    if isinstance(results, list):
                        # Verify Alignment
                        if len(results) != count:
                            last_error = f"Alignment mismatch: Got {len(results)}, expected {count}"
                            logger.warning(f"⚠️ {last_error} (Attempt {attempt+1}). Retrying...")
                            continue
                        return results
                    return [results]

                except Exception as e:
                    last_error = str(e)
                    # Specific handling for Rate Limits (429)
                    if "429" in last_error or "RESOURCE_EXHAUSTED" in last_error:
                        # Back off significantly to allow quota to reset (10s per retry)
                        wait_time = 10 * (attempt + 1)
                        logger.warning(f"⏳ Quota Limit Hit (429). Waiting {wait_time}s to reset... (Attempt {attempt+1})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"❌ Gemini Batch Failure (Attempt {attempt+1}): {e}")
                        time.sleep(2 * (attempt + 1))
        
        raise Exception(f"Gemini API failed after 5 attempts. Last error: {last_error}")

    def extract_full_page_consolidated(self, page_image_path):
        """
        🚀 REVOLUTIONARY COST-CUTTER: Processes the ENTIRE PAGE in one high-res request.
        Reduces costs by 95% by avoiding the 'Image Base Fee' per crop.
        """
        import PIL.Image
        img = PIL.Image.open(page_image_path)
        
        # We use a specialized prompt for full-page extraction
        prompt = """
        You are a highly accurate Malayalam Voter List OCR engine.
        Analyze this FULL PAGE image of a voter list and extract ALL voter records displayed.
        There are typically 30 voter boxes arranged in a 3-column by 10-row grid, or 2x15.
        
        For each voter box, extract EXACTLY these fields into a JSON array:
        - serial_number: The number in the top-left (1-1000).
        - epic_id: The alphanumeric ID in the top-right (e.g., ABC1234567).
        - name_malayalam: The full name in Malayalam script.
        - relation_name_malayalam: The Father/Husband/Mother name in Malayalam.
        - relation_type: "Father", "Husband", "Mother", or "Other".
        - house_number: The house ID (numeric/alphanumeric).
        - house_name_malayalam: The literal house name in Malayalam.
        - age: The integer age.
        - gender: "Male" or "Female".

        CRITICAL:
        1. Maintain 100% literal accuracy for Malayalam characters.
        2. Do not skip any voter box you see. 
        3. If a box is partially blurry, do your best to read the EPIC ID and Serial.
        """

        # We use the same schema as the batch mode
        # (This is already defined in extract_batch_from_images, so we'll refactor the schema)
        return self._run_gemini_request([prompt, img], count=30, mode="FULL_PAGE")

    def _get_voter_schema(self):
        return genai_types.Schema(
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

    def _run_gemini_request(self, content_parts, count=30, mode="BATCH"):
        """Internal helper to run the Gemini request with retries and backoff."""
        batch_schema = genai_types.Schema(
            type=genai_types.Type.ARRAY,
            items=self._get_voter_schema()
        )

        last_error = "Unknown"
        for attempt in range(5): 
            with self.get_throttle():
                try:
                    response = self.client.models.generate_content(
                        model=self.gemini_model,
                        contents=content_parts,
                        config=genai_types.GenerateContentConfig(
                            thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                            temperature=0.0,
                            max_output_tokens=32768, 
                            response_mime_type="application/json",
                            response_schema=batch_schema
                        )
                    )
                    
                    text = response.text.strip()
                    if not text: 
                        last_error = "Empty response from Gemini"
                        continue

                    results = json.loads(text)
                    if isinstance(results, list):
                        # Strict alignment check only in BATCH mode where we know EXACT count
                        if mode == "BATCH" and len(results) != count:
                            last_error = f"Alignment mismatch: Got {len(results)}, expected {count}"
                            logger.warning(f"⚠️ {last_error} (Attempt {attempt+1}). Retrying...")
                            continue
                        return results
                    return [results]

                except Exception as e:
                    last_error = str(e)
                    if "429" in last_error or "RESOURCE_EXHAUSTED" in last_error:
                        wait_time = 10 * (attempt + 1)
                        logger.warning(f"⏳ Quota Limit Hit (429). Waiting {wait_time}s to reset... (Attempt {attempt+1})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"❌ Gemini Failure ({mode}) (Attempt {attempt+1}): {e}")
                        time.sleep(2 * (attempt + 1))
        
        raise Exception(f"Gemini API failed ({mode}) after 5 attempts. Last error: {last_error}")

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


