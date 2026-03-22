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
        """Pipeline Mode: Renders pages in batches and sends to Gemini immediately.
        Rendering and Gemini calls overlap — first progress within ~8 seconds."""
        import concurrent.futures
        from core.pdf_processor import PDFProcessor
        import tempfile
        import shutil
        from backend.state_manager import state_manager
        all_standardized = []

        pdf_proc = PDFProcessor()

        # Concurrency: 12 parallel Gemini threads (single-user optimized, Tier 2: 1000+ RPM)
        max_workers = 12

        # Determine pages to process
        if page_range:
            if isinstance(page_range, (list, tuple)) and len(page_range) == 2:
                start_page, end_page = page_range
                pages = list(range(start_page, end_page + 1))
            else:
                pages = page_range
        else:
            total_pages = pdf_proc.convert_to_images(pdf_path, "", total_pages_only=True)
            pages = list(range(1, total_pages + 1))

        pages_set = set(pages)
        logger.info(f"Pipeline Mode: {len(pages)} pages | {max_workers} workers | 300 DPI")

        temp_root = tempfile.mkdtemp(prefix="ocr_master_batch_")
        page_to_image_map = {}

        def process_page_extraction(page_num, force_full_scan=False):
            """Send a single rendered page image to Gemini."""
            page_img_path = page_to_image_map.get(page_num)
            if not page_img_path or not os.path.exists(page_img_path):
                logger.error(f"Page {page_num} image not found")
                return page_num, "Image Missing", False

            try:
                p_num, batch_results, success = self.engine.extract_full_page_consolidated(
                    page_img_path, page_num=page_num, force_full_scan=force_full_scan
                )
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
                logger.error(f"Extraction Error on Page {page_num}: {e}")
                return page_num, str(e), False

        ordered_results = {}

        try:
            # --- PIPELINE: Render batches + send to Gemini simultaneously ---
            # The ThreadPool stays open. As each render batch completes,
            # those pages are immediately submitted to Gemini while the
            # next batch is rendering.
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                all_futures = {}

                # pdf_proc.convert_to_images yields batches of 5 pages
                for batch_paths in pdf_proc.convert_to_images(
                    pdf_path, temp_root, dpi=300,
                    first_page=min(pages), last_page=max(pages)
                ):
                    # Register rendered images
                    for path in batch_paths:
                        p_num_match = re.search(r'page_(\d+)', os.path.basename(path))
                        if p_num_match:
                            p_num = int(p_num_match.group(1))
                            if p_num in pages_set:
                                page_to_image_map[p_num] = path
                                # Submit to Gemini IMMEDIATELY — don't wait for all pages
                                future = executor.submit(process_page_extraction, p_num)
                                all_futures[future] = p_num

                    # While rendering next batch, collect any completed Gemini results
                    done = set()
                    for future in list(all_futures):
                        if future.done():
                            done.add(future)

                    for future in done:
                        if batch_id and state_manager.is_cancelled(batch_id):
                            logger.warning(f"Batch {batch_id} cancelled. Halting.")
                            return all_standardized

                        page, res, success = future.result()

                        # Only retry pages that completely FAILED (API error, timeout, etc.)
                        # Do NOT retry pages with < 30 voters — that causes hallucinations.
                        # Under-read pages are handled by the surgical gap analysis in Phase 2.
                        if not success:
                            logger.warning(f"Page {page}: FAILED. Retrying once...")
                            page2, res2, success2 = process_page_extraction(page)
                            if success2:
                                logger.info(f"Page {page}: retry succeeded with {len(res2)} voters.")
                                res, success = res2, success2
                            else:
                                logger.error(f"Page {page}: retry also failed. Page will be missing.")

                        ordered_results[page] = res
                        if callback:
                            callback(page, res, success)
                        del all_futures[future]

                # All rendering done — now wait for remaining Gemini futures
                for future in concurrent.futures.as_completed(all_futures):
                    if batch_id and state_manager.is_cancelled(batch_id):
                        logger.warning(f"Batch {batch_id} cancelled. Halting.")
                        return all_standardized

                    page, res, success = future.result()

                    # Only retry pages that completely FAILED
                    if not success:
                        logger.warning(f"Page {page}: FAILED. Retrying once...")
                        page2, res2, success2 = process_page_extraction(page)
                        if success2:
                            logger.info(f"Page {page}: retry succeeded with {len(res2)} voters.")
                            res, success = res2, success2
                        else:
                            logger.error(f"Page {page}: retry also failed. Page will be missing.")

                    ordered_results[page] = res
                    if callback:
                        callback(page, res, success)

        finally:
            shutil.rmtree(temp_root, ignore_errors=True)

        # ═══════════════════════════════════════════════════════════════
        # PHASE 2-5: SURGICAL RE-EXTRACTION (Serial Number Gap Analysis)
        # ═══════════════════════════════════════════════════════════════
        # Step 1: Identify pages with < 30 voters
        # Step 2: Analyze serial number gaps to distinguish genuine vs under-read
        # Step 3: Re-extract only under-read pages with escalating tactics
        # Step 4: Merge and validate

        under_read_pages = self._analyze_serial_gaps(ordered_results, pages)

        if under_read_pages and len(under_read_pages) <= 5:
            logger.info(f"🔬 Surgical Phase: {len(under_read_pages)} pages identified as under-read: {[p['page'] for p in under_read_pages]}")

            # Re-render only the problem pages for surgical retry
            surgical_temp = tempfile.mkdtemp(prefix="ocr_surgical_")
            try:
                surgical_images = {}
                for batch_paths in pdf_proc.convert_to_images(
                    pdf_path, surgical_temp, dpi=300,
                    first_page=min(p['page'] for p in under_read_pages),
                    last_page=max(p['page'] for p in under_read_pages)
                ):
                    for path in batch_paths:
                        p_num_match = re.search(r'page_(\d+)', os.path.basename(path))
                        if p_num_match:
                            p_num = int(p_num_match.group(1))
                            if p_num in [p['page'] for p in under_read_pages]:
                                surgical_images[p_num] = path

                for page_info in under_read_pages:
                    pg = page_info['page']
                    gap_count = page_info['missing_count']
                    gap_serials = page_info['missing_serials']
                    current_count = len(ordered_results.get(pg, []))
                    img_path = surgical_images.get(pg)

                    if not img_path:
                        logger.error(f"🔬 Page {pg}: No image available for surgical retry")
                        continue

                    logger.info(f"🔬 Page {pg}: {current_count} voters, missing {gap_count} (serials {gap_serials[0]}-{gap_serials[-1]}). Starting surgical extraction...")

                    best_result = ordered_results.get(pg, [])
                    best_count = current_count

                    # Tactic 1: Escalating prompt with explicit gap info
                    try:
                        escalation_prompt = f"You previously found only {current_count} voters on this page. Serials {gap_serials[0]}-{gap_serials[-1]} are MISSING. There should be ~30 voters in 3 columns × 10 rows."
                        p_num, res, success = self.engine.extract_full_page_consolidated(
                            img_path, page_num=pg, force_full_scan=True
                        )
                        if success and isinstance(res, list) and len(res) > best_count:
                            logger.info(f"🔬 Page {pg}: Tactic 1 (strong prompt) got {len(res)} voters (was {best_count})")
                            best_result = res
                            best_count = len(res)
                    except Exception as e:
                        logger.error(f"🔬 Page {pg}: Tactic 1 failed: {e}")

                    # Tactic 2: If still under-read, split into 3 column images
                    if best_count < current_count + gap_count - 2:  # Allow 2 margin
                        try:
                            logger.info(f"🔬 Page {pg}: Tactic 2 - Column split extraction...")
                            column_results = self.engine.extract_column_split(img_path, page_num=pg)
                            if column_results and len(column_results) > best_count:
                                logger.info(f"🔬 Page {pg}: Column split got {len(column_results)} voters (was {best_count})")
                                best_result = column_results
                                best_count = len(column_results)
                        except Exception as e:
                            logger.error(f"🔬 Page {pg}: Tactic 2 failed: {e}")

                    # Tactic 3: If STILL under-read, retry with temperature=0.3
                    if best_count < current_count + gap_count - 2:
                        try:
                            logger.info(f"🔬 Page {pg}: Tactic 3 - Temperature variation...")
                            p_num, res, success = self.engine.extract_full_page_consolidated(
                                img_path, page_num=pg, force_full_scan=True, temperature=0.3
                            )
                            if success and isinstance(res, list) and len(res) > best_count:
                                logger.info(f"🔬 Page {pg}: Temperature variation got {len(res)} voters (was {best_count})")
                                best_result = res
                                best_count = len(res)
                        except Exception as e:
                            logger.error(f"🔬 Page {pg}: Tactic 3 failed: {e}")

                    # Apply best result
                    if best_count > current_count:
                        ordered_results[pg] = best_result
                        logger.info(f"🔬 Page {pg}: Surgical success! {current_count} → {best_count} voters")
                        if callback:
                            callback(pg, best_result, True)
                    else:
                        logger.warning(f"🔬 Page {pg}: Surgical extraction did not improve. Keeping {current_count} voters.")

            finally:
                shutil.rmtree(surgical_temp, ignore_errors=True)

        # Final Serialization (Maintain Perfect Order)
        for p in pages:
            if p in ordered_results and isinstance(ordered_results[p], list):
                for voter in ordered_results[p]:
                    voter["voter_id"] = len(all_standardized) + 1
                    self._apply_standardization(voter, voter["voter_id"])
                    all_standardized.append(voter)

        # Final validation log
        all_serials = [int(v.get("Serial_OCR", 0)) for v in all_standardized if str(v.get("Serial_OCR", "")).isdigit()]
        if all_serials:
            expected_range = set(range(min(all_serials), max(all_serials) + 1))
            actual_set = set(all_serials)
            still_missing = expected_range - actual_set
            if still_missing:
                logger.warning(f"📊 Final validation: {len(still_missing)} serial gaps remain: {sorted(still_missing)[:20]}...")
            else:
                logger.info(f"📊 Final validation: ✅ All {len(all_serials)} serials are continuous. Zero gaps!")

        return all_standardized

    def _analyze_serial_gaps(self, ordered_results, pages):
        """Phase 2-3: Analyze serial numbers to find genuinely under-read pages.

        Returns list of dicts: [{'page': 11, 'missing_count': 21, 'missing_serials': [130..150]}]
        Only returns pages where serial gaps prove Gemini missed voters.
        Genuinely partial pages (like the last page) are NOT returned.
        """
        # Build a map: page → list of serial numbers extracted
        page_serials = {}
        for p in pages:
            results = ordered_results.get(p, [])
            if not isinstance(results, list):
                continue
            serials = []
            for r in results:
                s = str(r.get("serial_number") or r.get("Serial_OCR") or "").strip()
                try:
                    serials.append(int(s))
                except (ValueError, TypeError):
                    pass
            page_serials[p] = sorted(serials)

        # Collect ALL serials across all pages
        all_serials = []
        for serials in page_serials.values():
            all_serials.extend(serials)
        all_serials = sorted(set(all_serials))

        if not all_serials:
            return []

        # Build full expected range
        min_serial = min(all_serials)
        max_serial = max(all_serials)
        full_range = set(range(min_serial, max_serial + 1))
        found_serials = set(all_serials)
        all_missing = full_range - found_serials

        if not all_missing:
            logger.info(f"🔍 Gap Analysis: All serials {min_serial}-{max_serial} present. No under-read pages.")
            return []

        logger.info(f"🔍 Gap Analysis: {len(all_missing)} missing serials detected in range {min_serial}-{max_serial}")

        # Check ALL pages for serial gaps — not just those with < 30 voters.
        # A page may return 30 voters but with wrong/duplicate serials.
        under_read_pages = []
        sorted_pages = sorted(page_serials.keys())

        for i, p in enumerate(sorted_pages):
            serials = page_serials[p]
            if not serials:
                continue

            results = ordered_results.get(p, [])

            page_min = min(serials)
            page_max = max(serials)

            # Determine expected range for this page by looking at neighbors
            # Expected start: previous page's max + 1 (or page_min if first page)
            expected_start = page_min
            if i > 0:
                prev_serials = page_serials.get(sorted_pages[i - 1], [])
                if prev_serials:
                    expected_start = max(prev_serials) + 1

            # Expected end: next page's min - 1 (or page_max if last page)
            expected_end = page_max
            if i < len(sorted_pages) - 1:
                next_serials = page_serials.get(sorted_pages[i + 1], [])
                if next_serials:
                    expected_end = min(next_serials) - 1

            # Find missing serials in this page's expected range
            page_expected = set(range(expected_start, expected_end + 1))
            page_found = set(serials)
            page_missing = page_expected - page_found

            if page_missing:
                missing_sorted = sorted(page_missing)
                under_read_pages.append({
                    'page': p,
                    'current_count': len(results),
                    'missing_count': len(page_missing),
                    'missing_serials': missing_sorted,
                    'expected_total': len(results) + len(page_missing)
                })
                logger.info(f"🔍 Page {p}: {len(results)} voters found, {len(page_missing)} missing (serials {missing_sorted[0]}-{missing_sorted[-1]}). UNDER-READ.")
            else:
                logger.info(f"🔍 Page {p}: {len(results)} voters — no serial gaps. GENUINELY PARTIAL.")

        return under_read_pages

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
