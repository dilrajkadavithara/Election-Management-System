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
    VERSION = "3.2.1-SHA-LOCK"
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
            # Tier 2: 0.3s stagger for 8 parallel threads per batch
            # 8 threads × 3 workers = 24 RPM peak, well within Tier 2's 1000+ RPM
            time.sleep(0.3)
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
                        # Back off slightly shorter to check quota faster (3s per retry)
                        wait_time = 3 * (attempt + 1)
                        logger.warning(f"⏳ Quota Limit Hit (429). Waiting {wait_time}s... (Attempt {attempt+1})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"❌ Gemini Batch Failure (Attempt {attempt+1}): {e}")
                        time.sleep(1) # Quick fail for non-rate issues
        
        raise Exception(f"Gemini API failed after 5 attempts. Last error: {last_error}")

    def extract_full_page_consolidated(self, img, page_num="?", force_full_scan=False, temperature=0.0):
        """High-precision extraction for full raw pages.
        Processes the ENTIRE PAGE in one high-res request.

        Args:
            force_full_scan: If True, uses a stronger prompt that explicitly
                instructs Gemini to scan all 3 columns. Used for retries when
                the first attempt returned too few voters.
            temperature: Gemini temperature (0.0 = deterministic, 0.3 = slight variation).
        """

        if force_full_scan:
            prompt = """
            You are a highly accurate Malayalam Voter List OCR engine.
            IMPORTANT: This page has voter boxes arranged in a 3-COLUMN layout.
            You MUST scan ALL THREE COLUMNS from left to right:
            - LEFT COLUMN
            - MIDDLE COLUMN
            - RIGHT COLUMN

            Scan EVERY voter box visible on the page. Do NOT stop after the first column.
            Do NOT invent or hallucinate voters — only extract boxes that are actually visible.
            Some pages may have fewer than 30 boxes (especially the last page). That is OK.
            Only extract what you can actually see.

            For each voter box, extract EXACTLY these fields into a JSON array:
            - serial_number: READ the PRINTED number from the top-left corner of each voter box. This is a sequential number printed on the document (e.g., 31, 32, 33... on one page, continuing from the previous page). Do NOT generate your own numbers — read the actual printed serial from the image.
            - epic_id: The alphanumeric ID in the top-right (e.g., ABC1234567 or WHL1234567).
            - name_malayalam: The full name in Malayalam script.
            - relation_name_malayalam: The Father/Husband/Mother name in Malayalam.
            - relation_type: "Father", "Husband", "Mother", or "Other".
            - house_number: The house ID (numeric/alphanumeric).
            - house_name_malayalam: The literal house name in Malayalam.
            - age: The integer age.
            - gender: "Male" or "Female".

            CRITICAL:
            1. Maintain 100% literal accuracy for Malayalam characters.
            2. Do not skip any voter box in any column.
            3. If a box is partially blurry, do your best to read the EPIC ID and Serial.
            4. The serial_number MUST be read from the printed document, not auto-generated.
            """
        else:
            prompt = """
            You are a highly accurate Malayalam Voter List OCR engine.
            Analyze this FULL PAGE image of a voter list and extract ALL voter records displayed.
            There are typically 30 voter boxes arranged in a 3-column by 10-row grid, or 2x15.

            For each voter box, extract EXACTLY these fields into a JSON array:
            - serial_number: READ the PRINTED number from the top-left corner of each voter box. This is a sequential number printed on the document (e.g., 31, 32, 33... on one page, continuing from the previous page). Do NOT generate your own numbers — read the actual printed serial from the image.
            - epic_id: The alphanumeric ID in the top-right (e.g., ABC1234567 or WHL1234567).
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
            4. The serial_number MUST be read from the printed document, not auto-generated.
            """

        content_parts = [prompt, img]
        voter_count = 30

        logger.info(f"Neural Sync: Page {page_num} -> Initiating API Request...{' (FULL SCAN MODE)' if force_full_scan else ''}{f' (temp={temperature})' if temperature > 0 else ''}")
        results = self._run_gemini_request(content_parts, count=voter_count, mode="FULL_PAGE", page_num=page_num, temperature=temperature)

        if results:
            logger.info(f"Neural Sync: Page {page_num} -> Extraction Successful ({len(results)} voters found)")
            return page_num, results, True

        logger.error(f"Neural Sync: Page {page_num} -> Final failure after retries.")
        return page_num, f"Final AI extraction failure after retries", False

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

    def _run_gemini_request(self, content_parts, count=30, mode="BATCH", page_num="?", temperature=0.0):
        """Internal helper to run the Gemini request with retries and Tracer logs."""
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
                            temperature=temperature,
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

    def extract_column_split(self, img_path, page_num="?"):
        """Surgical Tactic 2: Split a page image into 3 vertical column strips
        and extract each column separately. This forces Gemini to focus on
        one column at a time, preventing the 'only read first column' issue.

        Returns merged list of voter dicts, or None on failure.
        """
        import io
        from PIL import Image as PILImage

        logger.info(f"🔬 Column Split: Page {page_num} — splitting into 3 columns")

        try:
            full_img = PILImage.open(img_path)
            width, height = full_img.size

            # Split into 3 roughly equal columns with slight overlap (2%) to catch border voters
            overlap = int(width * 0.02)
            columns = [
                full_img.crop((0, 0, width // 3 + overlap, height)),                          # Left
                full_img.crop((width // 3 - overlap, 0, 2 * width // 3 + overlap, height)),   # Middle
                full_img.crop((2 * width // 3 - overlap, 0, width, height)),                  # Right
            ]

            all_voters = []
            seen_serials = set()

            for col_idx, col_img in enumerate(columns):
                col_label = ["LEFT", "MIDDLE", "RIGHT"][col_idx]

                # Convert column to bytes
                buf = io.BytesIO()
                col_img.save(buf, format='PNG')
                buf.seek(0)

                prompt = f"""
                You are a highly accurate Malayalam Voter List OCR engine.
                This image shows the {col_label} COLUMN of a voter list page.
                There should be approximately 10 voter boxes stacked vertically in this column.

                Extract ALL voter boxes visible in this column image.

                For each voter box, extract EXACTLY these fields into a JSON array:
                - serial_number: The number in the top-left of each box.
                - epic_id: The alphanumeric ID in the top-right (e.g., ABC1234567).
                - name_malayalam: The full name in Malayalam script.
                - relation_name_malayalam: The Father/Husband/Mother name in Malayalam.
                - relation_type: "Father", "Husband", "Mother", or "Other".
                - house_number: The house ID (numeric/alphanumeric).
                - house_name_malayalam: The literal house name in Malayalam.
                - age: The integer age.
                - gender: "Male" or "Female".

                CRITICAL:
                1. Extract EVERY voter box visible — do not skip any.
                2. Maintain 100% literal accuracy for Malayalam characters.
                """

                content_parts = [prompt, buf.getvalue()]

                # Use the standard Gemini request pipeline
                col_img_part = genai_types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")
                request_parts = [prompt, col_img_part]

                try:
                    results = self._run_gemini_request(request_parts, count=10, mode="FULL_PAGE", page_num=f"{page_num}-{col_label}")
                    if results and isinstance(results, list):
                        logger.info(f"🔬 Column Split: Page {page_num} {col_label} → {len(results)} voters")
                        # Deduplicate by serial number (overlap regions may produce dupes)
                        for voter in results:
                            serial = str(voter.get("serial_number", "")).strip()
                            if serial and serial not in seen_serials:
                                seen_serials.add(serial)
                                # Convert to standardized format
                                all_voters.append({
                                    "Full Name": voter.get("name_malayalam") or "",
                                    "Relation Name": voter.get("relation_name_malayalam") or "",
                                    "Relation Type": str(voter.get("relation_type") or "").title(),
                                    "House Name": voter.get("house_name_malayalam") or "",
                                    "House Number": voter.get("house_number") or "",
                                    "Age": str(voter.get("age") or ""),
                                    "Gender": str(voter.get("gender") or "").title(),
                                    "EPIC_ID": voter.get("epic_id") or "",
                                    "Serial_OCR": serial,
                                    "Image_Path": f"p{page_num}_col_{col_label}",
                                    "Filename": os.path.basename(img_path)
                                })
                            elif serial:
                                logger.debug(f"🔬 Column Split: Duplicate serial {serial} skipped")
                except Exception as e:
                    logger.error(f"🔬 Column Split: Page {page_num} {col_label} failed: {e}")

            # Sort by serial number
            all_voters.sort(key=lambda v: int(v.get("Serial_OCR", 0)) if str(v.get("Serial_OCR", "")).isdigit() else 0)
            logger.info(f"🔬 Column Split: Page {page_num} total after merge: {len(all_voters)} unique voters")
            return all_voters if all_voters else None

        except Exception as e:
            logger.error(f"🔬 Column Split: Page {page_num} failed entirely: {e}")
            return None

    def detect_voter_boxes(self, img_path):
        """Use OpenCV to detect the grid of voter boxes on a page.

        Kerala voter lists have a consistent 3-column × 10-row grid.
        Detects horizontal and vertical grid lines, then reconstructs
        the box grid from their intersections.

        Returns:
            list of (x, y, w, h) bounding boxes sorted in reading order
            (row by row, left to right — matches serial number order)
            Returns empty list if detection fails.
        """
        img = cv2.imread(img_path)
        if img is None:
            logger.error(f"detect_voter_boxes: Could not read image {img_path}")
            return []

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape

        # Adaptive threshold for clean binary
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
        )

        # Detect horizontal lines (must span at least 1/12 of page width)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (width // 12, 1))
        h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel, iterations=2)

        # Detect vertical lines (must span at least 1/30 of page height)
        # Kerala voter lists have shorter vertical separators between columns
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, height // 30))
        v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel, iterations=2)

        # Extract line positions from contours
        def get_positions(line_img, axis):
            """Get clustered positions of detected lines along given axis (0=x, 1=y)."""
            contours, _ = cv2.findContours(line_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            positions = sorted(set([cv2.boundingRect(c)[axis] for c in contours]))
            # Cluster nearby positions (within 20px)
            if not positions:
                return []
            clusters = [[positions[0]]]
            for p in positions[1:]:
                if p - clusters[-1][-1] < 20:
                    clusters[-1].append(p)
                else:
                    clusters.append([p])
            return [int(np.mean(c)) for c in clusters]

        h_pos = get_positions(h_lines, axis=1)  # Y positions of horizontal lines
        v_pos = get_positions(v_lines, axis=0)  # X positions of vertical lines

        logger.info(f"detect_voter_boxes: {len(h_pos)} H-lines, {len(v_pos)} V-lines")

        # Need at least 2 horizontal and 2 vertical lines to form boxes
        if len(h_pos) < 2 or len(v_pos) < 2:
            logger.warning(f"detect_voter_boxes: Insufficient grid lines (H={len(h_pos)}, V={len(v_pos)})")
            return []

        # Build boxes from grid intersections
        # A voter box is roughly 1/3 of page width (at 300 DPI: ~780px of ~2480px)
        # Filter out sub-cells (EPIC ID area, photo area) which are much smaller
        min_box_width = width // 5  # Must be at least 1/5 of page width (~496px)
        min_box_height = height // 15  # Must be at least 1/15 of page height (~234px)

        boxes = []
        for i in range(len(h_pos) - 1):
            for j in range(len(v_pos) - 1):
                x = v_pos[j]
                y = h_pos[i]
                bw = v_pos[j + 1] - v_pos[j]
                bh = h_pos[i + 1] - h_pos[i]
                if bw >= min_box_width and bh >= min_box_height:
                    boxes.append((x, y, bw, bh))

        # Sort in reading order: row by row (top to bottom), left to right within each row
        # Group into rows by similar Y values
        if not boxes:
            logger.warning(f"detect_voter_boxes: No valid boxes from grid")
            return []

        boxes.sort(key=lambda b: (b[1], b[0]))
        expected_h = height / 10

        rows = []
        current_row = [boxes[0]]
        for box in boxes[1:]:
            if abs(box[1] - current_row[0][1]) < expected_h * 0.3:
                current_row.append(box)
            else:
                rows.append(sorted(current_row, key=lambda b: b[0]))
                current_row = [box]
        rows.append(sorted(current_row, key=lambda b: b[0]))

        sorted_boxes = [box for row in rows for box in row]
        logger.info(f"detect_voter_boxes: Found {len(sorted_boxes)} voter boxes ({len(rows)} rows × ~{len(rows[0]) if rows else 0} cols)")
        return sorted_boxes

    def extract_with_box_guidance(self, img_path, page_num="?"):
        """OpenCV-guided extraction: detect boxes first, then send full page
        to Gemini with exact box count and structured field guidance.

        This approach:
        1. Uses OpenCV to count exact number of voter boxes on the page
        2. Sends the FULL page image to Gemini (1 API call)
        3. Tells Gemini exactly how many boxes to find and what fields to read
        4. Uses Malayalam label keywords as anchors (handles text wrapping)

        Returns: (page_num, results_list, success_bool)
        """
        import io

        # Step 1: Detect boxes with OpenCV
        boxes = self.detect_voter_boxes(img_path)
        box_count = len(boxes)

        if box_count < 2 or box_count > 35:
            # Fallback to standard extraction if box detection fails or returns
            # unreasonable results (e.g., last page with different grid layout)
            logger.warning(f"Page {page_num}: OpenCV detected {box_count} boxes (unusual), falling back to standard extraction")
            img = Image.open(img_path)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            img_part = genai_types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")
            return self.extract_full_page_consolidated(img_part, page_num=page_num)

        # Step 2: Prepare the full page image for Gemini
        img = Image.open(img_path)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        img_part = genai_types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")

        # Step 3: Build a precise prompt with box count and field anchors
        prompt = f"""You are a highly accurate Malayalam Voter List OCR engine.

This page has a grid of voter boxes arranged in 3 columns × multiple rows.
Reading order is LEFT to RIGHT across each row, then next row down.

IMPORTANT: Some boxes on this page may be EMPTY (just grid lines with no voter data printed inside).
Only extract boxes that actually contain printed voter information.
Do NOT invent or hallucinate data for empty grid cells.

EACH filled voter box has these fields identified by Malayalam label keywords:
- serial_number: The number printed in the TOP-LEFT corner of the box (e.g., 1, 2, 31, 32...).
  READ this number from the image. Do NOT auto-generate sequential numbers.
- epic_id: The alphanumeric code in the TOP-RIGHT corner (format: 3 letters + 7 digits, e.g., WHL1565365).
- name_malayalam: Text after the label "പേര് :" — this is the voter's name in Malayalam.
  May wrap to the next line — capture the FULL name.
- relation_name_malayalam: Text after "ഭർത്താവിന്റെ പേര്:" OR "അച്ഛന്റെ പേര்:" OR "അമ്മയുടെ പേர്:" —
  the relation's name in Malayalam. May wrap to the next line.
- relation_type: Based on which label appears:
  "ഭർത്താവിന്റെ" → "Husband", "അച്ഛന്റെ" → "Father", "അമ്മയുടെ" → "Mother", else → "Other"
- house_number: Text after "വീട്ടു നമ്പർ :" — the house number/ID.
- house_name_malayalam: Text after "വീട്ടു നമ്പർ :" that appears to be a name rather than a number,
  OR text on the same line as house number if it's a place name in Malayalam.
- age: Integer after "പ്രായം :"
- gender: Text after "ലിംഗം :" — "സ്ത്രീ" → "Female", "പുരുഷൻ" → "Male"

CRITICAL RULES:
1. Only extract boxes that contain ACTUAL PRINTED voter data. Skip empty grid cells.
2. Read serial_number from the PRINTED number on the page — do NOT auto-generate.
3. Maintain 100% literal accuracy for all Malayalam text.
4. If a box is marked as "DELETED" (with diagonal lines), still include it with whatever fields are readable.
5. Do NOT invent data for empty boxes. If a box has no text inside, skip it entirely."""

        content_parts = [prompt, img_part]

        logger.info(f"Neural Sync: Page {page_num} -> OpenCV detected {box_count} grid cells. Sending to Gemini...")
        results = self._run_gemini_request(content_parts, count=box_count, mode="FULL_PAGE", page_num=page_num)

        if results:
            logger.info(f"Neural Sync: Page {page_num} -> Box-guided extraction: {len(results)} voters (expected {box_count})")
            return page_num, results, True

        logger.error(f"Neural Sync: Page {page_num} -> Box-guided extraction failed after retries.")
        return page_num, "Box-guided extraction failed", False

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


