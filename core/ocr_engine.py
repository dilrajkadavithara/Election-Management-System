import cv2
import pytesseract
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

    def __init__(self, tesseract_cmd=None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        
        # Configuration for specific tasks
        self.config_numeric = "--oem 3 --psm 6" 
        self.config_eng = "--oem 3 --psm 6"
        self.config_mal = "--oem 3 --psm 6 -l mal+eng"
        self.config_epic = "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. --psm 7"

        self.client = None
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.gemini_model = "gemini-2.5-flash-lite"
        else:
            self.gemini_model = None

    def upload_file(self, file_path):
        """Uploads a file to Gemini File API."""
        if not self.client: return None
        try:
            logger.info(f"📤 Uploading {file_path} to Gemini File API...")
            uploaded_file = self.client.files.upload(
                path=file_path,
                config=genai_types.UploadFileConfig(display_name=os.path.basename(file_path))
            )
            while uploaded_file.state == "PROCESSING":
                time.sleep(1)
                uploaded_file = self.client.files.get(name=uploaded_file.name)
            if uploaded_file.state == "FAILED":
                raise Exception("Gemini File Processing Failed")
            logger.info(f"✅ File {uploaded_file.name} ready on Cloud.")
            return uploaded_file
        except Exception as e:
            logger.error(f"❌ Gemini Upload Error: {e}")
            return None

    # Professional Redis-based Global Throttle for Multi-Container Production
    # Ensures the 4GB server is protected even across multiple workers/users
    @classmethod
    @contextmanager
    def get_throttle(cls):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        # 1. Try Redis Throttle (Production)
        if redis:
            try:
                r = redis.from_url(redis_url, socket_timeout=2)
                r.ping()
                
                # Global Limit of 12 for the entire server fleet
                LIMIT = 12
                POLL_INTERVAL = 0.5
                
                acquired = False
                while not acquired:
                    current = r.incr("global_ocr_active")
                    if current <= LIMIT:
                        acquired = True
                    else:
                        r.decr("global_ocr_active")
                        time.sleep(POLL_INTERVAL)
                try:
                    yield
                finally:
                    r.decr("global_ocr_active")
                return
            except Exception as e:
                logger.warning(f"Redis Throttle failed ({e}), falling back to local throttle.")

        # 2. Local Throttle Fallback (Development/Windows)
        if not hasattr(cls, "_local_throttle"):
            cls._local_throttle = threading.Semaphore(12)
        
        with cls._local_throttle:
            yield

    def extract_from_image_path(self, image_path, page_num):
        """Extract voters from an image file using inline bytes — no Files API, no URI issues."""
        if not self.client: return None

        prompt = f"""
        Act as a high-precision literal OCR engine.
        The attached image is Page {page_num} of an Indian Electoral Roll, formatted in a grid of 30 boxes.
        
        TASK:
        1. Identify each of the 30 voter boxes in the grid.
        2. Within each box, extract the data EXACTLY as printed. 
        3. DO NOT use any external knowledge to guess names or details. 
        4. Capture Malayalam text character-by-character as it appears.
        5. Exclude prefixes like "പേര് :" (Name), "വീട്ടു നമ്പർ :" (House No), etc.
        
        Strict Field Mapping:
        - serial_number: The small number at the top left of each box.
        - epic_id: The alphanumeric ID at the top right of each box.
        - name_malayalam: The Malayalam text immediately following "പേര് :".
        - relation_name_malayalam: The Malayalam text following "ഭർത്താവിന്റെ പേര് :" or "അച്ഛന്റെ പേര് :" or "അമ്മയുടെ പേര് :".
        - relation_type: "Husband", "Father", "Mother", or "Other" based on the prefix.
        - house_number: The numeric/alphanumeric part of the house address.
        - house_name_malayalam: The Malayalam house name found in the address line.
        - age: The numeric age at the bottom.
        - gender: "Male" or "Female" (Malayalam: സ്ത്രീ=Female, പുരുഷൻ=Male).
        
        Output: A RAW JSON list of 30 records. Return ONLY the JSON. No preamble.
        If a box is empty or not a voter record, skip it.
        """

        import base64 as _b64  # kept for any legacy path; inline uses raw bytes
        try:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            logger.info(f"📸 Page {page_num}: Sending {len(image_bytes)//1024}KB inline to Gemini")
        except Exception as e:
            logger.error(f"❌ Page {page_num} image read error: {e}")
            return None

        max_retries = 10
        base_delay = 1.5 # seconds (reduced from 3s for faster recovery)

        with self.get_throttle():
            for attempt in range(max_retries):
                try:
                    import random
                    if attempt > 0:
                        wait_time = (base_delay * (1.5 ** attempt)) + random.uniform(1, 5)
                        logger.warning(f"⏳ Page {page_num} Quota hit. Jittered sleep: {wait_time:.1f}s... [{attempt+1}/{max_retries}]")
                        time.sleep(wait_time)

                    response = self.client.models.generate_content(
                        model=self.gemini_model,
                        contents=[
                            prompt,
                            genai_types.Part.from_bytes(
                                data=image_bytes,
                                mime_type="image/jpeg"
                            )
                        ],
                        config=genai_types.GenerateContentConfig(
                            thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                            temperature=0.0,
                            response_mime_type="application/json"
                        )
                    )
                    
                    try:
                        text = response.text.strip()
                    except ValueError:
                        logger.error(f"⚠️ Page {page_num} Blocked by Gemini safety filter")
                        return []

                    if not text:
                        logger.warning(f"⚠️ Page {page_num} Gemini returned empty string")
                        return []

                    # DEBUG: Log raw response to diagnose extraction issues
                    logger.info(f"🔍 Page {page_num} RAW RESPONSE (first 500 chars): {text[:500]}")

                    if "```json" in text: text = text.split("```json")[1].split("```")[0].strip()
                    elif "```" in text: text = text.split("```")[1].split("```")[0].strip()

                    start = text.find('[')
                    if start == -1: start = text.find('{')
                    if start != -1:
                        try:
                            parsed_json, _ = json.JSONDecoder().raw_decode(text[start:])
                            logger.info(f"✅ Page {page_num}: Extracted {len(parsed_json) if isinstance(parsed_json, list) else 1} records")
                            return parsed_json
                        except Exception as e:
                            logger.warning(f"⚠️ Page {page_num} JSON parse error: {e}")
                            return []
                    return []

                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "quota" in err_str.lower() or "RESOURCE_EXHAUSTED" in err_str:
                        continue
                    logger.error(f"❌ Page {page_num} Gemini error: {e}")
                    return []
        return []

    def extract_from_cached_file(self, google_file, page_num):
        """Legacy: extract using a pre-uploaded File object. Calls extract_from_image_path is preferred."""
        if not self.client: return None

        # Hyper-Targeted Prompt optimized for Single-Page Vision
        # We don't mention 'Page X' because the upload is a single image file now.
        prompt = f"""
        Act as a professional Election Data Specialist.
        Extract EVERY voter record from the attached document.
        The document corresponds to Page {page_num} of the original roll.
        
        Output EXACTLY this JSON List format:
        [{{ "serial_number": "number", "epic_id": "text", "name_malayalam": "text", "relation_name_malayalam": "text", "relation_type": "Father/Husband/Other", "house_number": "text", "house_name_malayalam": "text", "age": number, "gender": "Male/Female" }}]

        IMPORTANT: If no records are found, return []. No analysis, just raw JSON.
        """

        max_retries = 10 
        base_delay = 3 
        
        # Use Global Fleet Throttle (Redis or Local)
        with self.get_throttle():
            for attempt in range(max_retries):
                try:
                    # Injected Jitter: Prevents "Thundering Herd" on retries
                    import random
                    if attempt > 0:
                        wait_time = (base_delay * (1.5 ** attempt)) + random.uniform(1, 5)
                        logger.warning(f"⏳ Page {page_num} Quota hit. Jittered sleep: {wait_time:.1f}s... [{attempt+1}/{max_retries}]")
                        time.sleep(wait_time)

                    response = self.client.models.generate_content(
                        model=self.gemini_model,
                        contents=[prompt, google_file],
                        config=genai_types.GenerateContentConfig(
                            thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                            temperature=0.0,
                            response_mime_type="application/json"
                        )
                    )
                    
                    try:
                        text = response.text.strip()
                    except ValueError:
                        # If the prompt or image triggers a filter, accessing .text raises ValueError
                        logger.error(f"⚠️ Page {page_num} Blocked. Gemini Feedback: {getattr(response, 'prompt_feedback', 'No feedback')}")
                        return []
                        
                    if not text:
                        logger.warning(f"⚠️ Page {page_num} Gemini returned empty string. No data found.")
                        return []
                    
                    # Robust Clean & Parse
                    if "```json" in text: text = text.split("```json")[1].split("```")[0].strip()
                    elif "```" in text: text = text.split("```")[1].split("```")[0].strip()
                    
                    start = text.find('[')
                    if start == -1: start = text.find('{')
                    
                    if start != -1:
                        try:
                            # Use JSONDecoder for fragments
                            parsed_json, _ = json.JSONDecoder().raw_decode(text[start:])
                            return parsed_json
                        except Exception as parse_err:
                            try:
                                return json.loads(text[start:])
                            except:
                                logger.error(f"⚠️ Page {page_num} JSON Parse Error: {parse_err}. Raw Text: {text[:100]}...")
                                return []
                    
                    logger.warning(f"⚠️ Page {page_num} Format mismatch. Raw Text: {text[:100]}...")
                    return [] 
                except Exception as e:
                    err_str = str(e).lower()
                    
                    # Handle Rate Limits (429) and Server Flakiness (500/503)
                    if any(x in err_str for x in ["429", "quota", "limit", "exhausted", "503", "500"]):
                        logger.warning(f"⏳ Page {page_num} Hit Quota/Limit: {e}")
                        continue
                    
                    # Handle Safety Filters or Internal AI Blocks
                    if "safety" in err_str or "unfinish" in err_str:
                        logger.warning(f"⚠️ Page {page_num} Hit Safety/Unfinish Error: {e}")
                        time.sleep(random.uniform(2, 4))
                        continue

                    logger.error(f"❌ Page {page_num} Connection Error: {e}")
                    return []
            
            logger.error(f"❌ Page {page_num} EXHAUSTED ALL RETRIES")
            return None

    def extract_from_pdf(self, pdf_path, page_num=None, pdf_data=None):
        """Processes specific pages or entire PDF using Gemini with retry logic."""
        if not self.client:
            return None
        
        prompt = f"""
        Act as a professional Data Entry Specialist.
        FOCUS ONLY ON PAGE {page_num if page_num else 'ALL'} of the attached document. 
        Extract EVERY voter record from THIS PAGE ONLY.
        
        Expected Format (JSON List):
        [{{ "serial_number": "number", "epic_id": "text", "name_malayalam": "text", "relation_name_malayalam": "text", "relation_type": "Father/Husband/Other", "house_number": "text", "house_name_malayalam": "text", "age": number, "gender": "Male/Female" }}]

        IMPORTANT: Return ONLY the raw JSON.
        """

        max_retries = 8
        base_delay = 10
        for attempt in range(max_retries):
            try:
                if pdf_data is None:
                    with open(pdf_path, 'rb') as f:
                        pdf_data = f.read()

                response = self.client.models.generate_content(
                    model=self.gemini_model,
                    contents=[
                        prompt,
                        genai_types.Part.from_bytes(
                            data=pdf_data,
                            mime_type="application/pdf"
                        )
                    ],
                    config=genai_types.GenerateContentConfig(
                        thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                        temperature=0.0,
                        response_mime_type="application/json"
                    )
                )
                text = response.text.strip()
                
                # Clean possible markdown
                if "```json" in text: text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text: text = text.split("```")[1].split("```")[0].strip()
                
                # Find JSON boundaries
                start = text.find('[')
                if start == -1: start = text.find('{')
                if start != -1:
                    try:
                        parsed_json, _ = json.JSONDecoder().raw_decode(text[start:])
                        return parsed_json
                    except:
                        import json
                        return json.loads(text[start:])
                return []
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "quota" in err_str:
                    delay = base_delay * (1.5 ** attempt)
                    logger.warning(f"⏳ Page {page_num} waiting on Quota... ({delay}s) [{attempt+1}/{max_retries}]")
                    time.sleep(delay)
                    continue
                
                if "safety" in err_str or "internal" in err_str:
                    time.sleep(5)
                    continue

                logger.error(f"❌ Direct PDF Error: {e}")
                return []
        return None

    def extract_with_gemini(self, img_np):
        """High-precision extraction using Gemini AI with exponential backoff."""
        if not self.client:
            return None

        # Convert CV2 (BGR) to PIL (RGB)
        rgb_img = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_img)

        prompt = """
        Act as a high-precision literal OCR engine specializing in Malayalam/English election rolls.
        Extract voter details from this single box EXACTLY as printed. 
        
        Strict Field Mapping:
        - serial_number: Top-left number.
        - epic_id: Top-right alphanumeric ID.
        - name_malayalam: Text after "പേര് :".
        - relation_name_malayalam: Text after parent/spouse prefix.
        - relation_type: "Husband", "Father", "Mother", or "Other".
        - house_number: Numeric house ID.
        - house_name_malayalam: Malayalam house name string.
        - age: Numeric age at bottom.
        - gender: "Male" or "Female" (സ്ത്രീ=Female, പുരുഷൻ=Male).

        CRITICAL: Capture Malayalam characters exactly as they appear. DO NOT use external knowledge to fix/guess names.
        Return ONLY a JSON object.
        """

        import time
        max_retries = 5
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Convert PIL Image to Bytes for the new SDK's Part.from_bytes
                import io
                img_byte_arr = io.BytesIO()
                pil_img.save(img_byte_arr, format='JPEG')
                img_bytes = img_byte_arr.getvalue()

                # Define strict schema for a single voter box to force "Flat Object" output
                voter_schema = genai_types.Schema(
                    type=genai_types.Type.OBJECT,
                    properties={
                        "serial_number": genai_types.Schema(type=genai_types.Type.STRING),
                        "epic_id": genai_types.Schema(type=genai_types.Type.STRING),
                        "name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                        "relation_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                        "relation_type": genai_types.Schema(type=genai_types.Type.STRING),
                        "house_number": genai_types.Schema(type=genai_types.Type.STRING),
                        "house_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                        "age": genai_types.Schema(type=genai_types.Type.INTEGER),
                        "gender": genai_types.Schema(type=genai_types.Type.STRING),
                    },
                    required=["serial_number", "epic_id", "name_malayalam"]
                )

                response = self.client.models.generate_content(
                    model=self.gemini_model,
                    contents=[
                        genai_types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        prompt
                    ],
                    config=genai_types.GenerateContentConfig(
                        thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                        temperature=0.0,
                        response_mime_type="application/json",
                        response_schema=voter_schema
                    )
                )
                
                # Liberal Parsing: Handle cases where model still returns a list [ {...} ]
                data = json.loads(response.text)
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]
                
                return data
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

    def extract_batch_from_images(self, img_list):
        """
        🚀 TURBO MODE: Processes up to 30 voter boxes in a single API call.
        Eliminates rate limits and slashes processing time by 90%.
        """
        if not self.client or not img_list:
            return []

        import io
        content_parts = []
        for img_np in img_list:
            # High-res JPEG conversion
            rgb_img = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_img)
            buf = io.BytesIO()
            pil_img.save(buf, format='JPEG', quality=95)
            content_parts.append(
                genai_types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg")
            )

        prompt = """
        Attached are up to 30 images of voter boxes from an electoral roll.
        Extract the details from EVERY image into a JSON array of objects.
        
        Fields per object:
        - serial_number: Top-left number.
        - epic_id: Top-right ID.
        - name_malayalam: Literal name.
        - relation_name_malayalam: Guardian name.
        - relation_type: Father/Husband/Other.
        - house_number: Number.
        - house_name_malayalam: Text.
        - age: Integer.
        - gender: Male/Female.

        CRITICAL: Provide 100% literal transcription. Do not guess. Maintain the order of the images provided.
        Return ONLY valid JSON.
        """
        content_parts.append(prompt)

        # Define Schema for the ARRAY of objects
        voter_item = genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "serial_number": genai_types.Schema(type=genai_types.Type.STRING),
                "epic_id": genai_types.Schema(type=genai_types.Type.STRING),
                "name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "relation_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "relation_type": genai_types.Schema(type=genai_types.Type.STRING),
                "house_number": genai_types.Schema(type=genai_types.Type.STRING),
                "house_name_malayalam": genai_types.Schema(type=genai_types.Type.STRING),
                "age": genai_types.Schema(type=genai_types.Type.INTEGER),
                "gender": genai_types.Schema(type=genai_types.Type.STRING),
            },
            required=["serial_number", "epic_id", "name_malayalam"]
        )

        batch_schema = genai_types.Schema(
            type=genai_types.Type.ARRAY,
            items=voter_item
        )

        import time
        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.gemini_model,
                    contents=content_parts,
                    config=genai_types.GenerateContentConfig(
                        thinking_config=genai_types.ThinkingConfig(include_thoughts=False),
                        temperature=0.0,
                        response_mime_type="application/json",
                        response_schema=batch_schema
                    )
                )
                
                results = json.loads(response.text)
                if isinstance(results, list):
                    return results
                return [results] # Fallback if single object
            except Exception as e:
                logger.error(f"❌ Turbo Batch Failure (Attempt {attempt+1}): {e}")
                time.sleep(2 * (attempt + 1))
        
        return []


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
