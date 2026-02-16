import re

class VoterParser:
    def __init__(self):
        # Malayalam Keyword Patterns - Ultra-flexible for OCR artifacts
        # Note: We use non-greedy matching (.*?) and lookaheads where possible to handle merged lines
        self.patterns = {
            "name": re.compile(r"(?:പേര|പേര്|പേര്|പെര|പെര്|രേര്|റേര്|രര)[്]?[^:]*[:\+]?\s*(.*)"),
            "rel_father": re.compile(r"(?:അച്ഛ|അച്ച|അച|അചഛ|അച്ചന|അചഛന|അച്ചൻ)\s*(?:ന്റെ|ന്റ|ൻ|ന്‍|ന)?\s*(?:പേര|പേര്|പെര)?\s*[:\+]?\s*(.*)"),
            "rel_husband": re.compile(r"(?:ഭർത്താ|ഭര്‍ത്താ|ഭർത്ത|ഭര്‍ത്ത|ഭർത്താവി|ഭര്‍ത്താവി)\s*(?:വി|വിൻ|വിന്‍|വിന|വിനെ)?\s*(?:ന്റെ|ന്റ|ൻ|ന്‍|ന)?\s*(?:പേര|പേര്|പെര)?\s*[:\+]?\s*(.*)"),
            "rel_mother": re.compile(r"(?:അമ്മ|അമമ|അമ|അാമമ)\s*(?:യുടെ|യുട|യു|യ|യുടേ)?\s*(?:പേര|പേര്|പെര)?\s*[:\+]?\s*(.*)"),
            "rel_others": re.compile(r"(?:മറ്റുള്ളവ|മറ്റുള്ള|മറ്റുള്ളവര്‍|മറ്റുള്ളവര്|മറ്റുളളവ|മറ്റുളളവര്‍)\s*(?:യുടെ|യുട|യു|യ|യുടേ)?\s*(?:പേര|പേര്|പെര)?\s*[:\+]?\s*(.*)"),
            "house": re.compile(r"(?:വീട്ട|വീട്ടു|വീട|വീടു|വിട്ടു|വിട്ട)\s*(?:ന[മന്]പ|നമ്പ|ന|നന്പം)?(?:ർ|ര്|ര്‍|ര)?\s*[:\+]?\s*(.*)"),
            "age_gender": re.compile(r"(?:പ്രായ|പ്രായമ|പ്രായമു|പ്രായമ|ായം|പം|പായം|യം)[ം]?\s*[:\+]?\s*([^\s]{2,3})\s*(?:ലിംഗ|ലിംഗ്|ലിഗ|ലി|ിഗം|ംഗ|ലിഗം)[ം]?\s*[:\+]?\s*(.*)"),
            "age_fallback": re.compile(r"(?:^|\s)(\d{2,3})(?:\s+(?:പു|സ്‌|സ്|സ്ത്രീ|പുരുഷൻ|Male|Female))", re.MULTILINE)
        }

    def _map_ocr_age(self, age_str):
        """Maps common Malayalam characters misread as digits back to numbers."""
        mapping = {
            'ട': '8', 'റ': '0', 'ദ': '2', 'ര': '2', 'ന': '7', 
            'ഒ': '0', 'മ': '3', 'യ': '4', 'ഗ': '9', '൫': '5',
            'ഭ': '6', 'ശ': '6', 'G': '6', 'b': '6'
        }
        res = ""
        for char in age_str:
            if char.isdigit():
                res += char
            elif char in mapping:
                res += mapping[char]
        return res if len(res) >= 2 else "N/A"

    def clean_text(self, text):
        """Removes noise characters and extra spaces."""
        text = text.replace("|", "").replace("[", "").replace("]", "")
        # Remove common OCR noise at start of lines
        text = re.sub(r'^[+.\-_\s*]+', '', text, flags=re.MULTILINE)
        return text.strip()

    def _strip_value(self, val):
        """Aggressively removes leading junk and trailing field overlaps."""
        if not val: return ""
        
        # 1. Remove Malayalam keyword fragments/stubs
        stubs = [
            r"വീട്ടു\s*നമ്പ[ർര]", r"വിട്ടു\s*നമ്പ[ർര]", r"ു\s*നമ്പ[ർര]", r"ം\s*നമ്പ[ർര]", 
            r"പേര[്]?", r"പേര്", r"പേര്", r"പെര[്]?",
            r"അച്ഛന്റെ", r"ഭർത്താവിന്റെ", r"അമ്മയുടെ", r"മറ്റുള്ളവ"
        ]
        for stub in stubs:
            val = re.sub(f"^{stub}\\s*[:\\+]?\\s*", "", val, flags=re.IGNORECASE)

        # 2. If the OCR merged fields, strip out the next field labels from the end of the string
        field_labels = ["ഭർത്താ", "അച്ഛൻ", "അമ്മ", "വീട്ട", "പ്രായ", "ലിംഗ"]
        for label in field_labels:
            if label in val:
                val = val.split(label)[0]

        # First, strip common punctuation/separators from ends
        val = val.strip().strip(':.-_=+* ')
        
        # Strip everything that isn't a letter/digit
        # Range \u0D00-\u0D7F covers all Malayalam characters including Anusvara and Visarga
        pattern = r'[^a-zA-Z0-9\.\u0D00-\u0D7F\u200C\u200D]'
        val = re.sub(f"^{pattern}+", "", val)
        val = re.sub(f"{pattern}+$", "", val)
        
        # Specific: Strip leading Malayalam vowel signs (invalid at start of word)
        # \u0D3E-\u0D4D are vowel signs.
        val = re.sub(r'^[\u0D3E-\u0D4D\u200C\u200D]+', '', val)
        
        # Second pass on punctuation
        val = val.strip().strip(':.-_=+* ')
        
        return val.strip()

    def _split_house_info(self, house_text):
        """
        Splits a house string into (Number, Name).
        Logic: Words containing digits, symbols, or specific suffixes stay in 'Number'.
        The first 'pure' word (not in suffix list) triggers the pivot to 'Name'.
        """
        if not house_text or house_text == "N/A":
            return "N/A", "N/A"

        # 1. Deep Clear: Remove leaked keywords AND all leading non-alphanumeric punctuation (like : or .)
        house_text = re.sub(r'^(?:വീട്ടു|വിട്ടു|നമ്പർ|നന്പർ|നമ്പര്|നമ്പര്|house|no|number)\s*', '', house_text, flags=re.IGNORECASE)
        house_text = re.sub(r'^[^a-zA-Z0-9\u0D00-\u0D7F]+', '', house_text).strip()
        
        words = house_text.split()
        num_parts = []
        name_parts = []
        
        # Alphabet suffixes for A, B, C, D, E
        suffixes = {"എ", "ഏ", "ബി", "സി", "ഡി", "ഇ"}
        
        reached_name = False
        for i, word in enumerate(words):
            clean_word = re.sub(r'[,.]$', '', word)
            
            if not reached_name:
                is_numeric = any(char.isdigit() for char in word) or "/" in word or "-" in word
                is_suffix = clean_word in suffixes
                
                if is_numeric or is_suffix:
                    num_parts.append(word)
                else:
                    reached_name = True
                    name_parts.append(word)
            else:
                name_parts.append(word)
        
        house_num = " ".join(num_parts) if num_parts else "N/A"
        house_name = " ".join(name_parts) if name_parts else "N/A"
        
        return house_num, house_name

    def parse_text_block(self, raw_text):
        """Parses the main Malayalam text block into structured fields."""
        data = {
            "Name": "N/A",
            "Relation Type": "N/A",
            "Relation Name": "N/A",
            "House Number": "N/A",
            "House Name": "N/A",
            "Age": "N/A",
            "Gender": "N/A"
        }

        raw_text = self.clean_text(raw_text)

        # CORE HEALING: Internal fix for common Malayalam OCR artifacts
        healing_map = {
            "ഹയസ്": "ഹൗസ്",
            "ഹൊസ്": "ഹൗസ്",
            "ഹോസ്": "ഹൗസ്",
            "ഹസ്": "ഹൗസ്",
            "ഹാസ്": "ഹൗസ്",
            "ഹൗസ": "ഹൗസ്",
            "വിട്ടു": "വീട്ടു",
            "വിട്ടില്": "വീട്ടില്"
        }
        for wrong, right in healing_map.items():
            raw_text = raw_text.replace(wrong, right)

        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]

        house_raw_accumulator = []
        collecting_house = False
        collecting_name = False
        collecting_rel = False
        unassigned_lines = []

        for i, line in enumerate(lines):
            # 1. Age/Gender Check - CRITICAL: No 'continue' so we check Name/House on same line
            age_match = self.patterns["age_gender"].search(line)
            if age_match:
                data["Age"] = self._map_ocr_age(age_match.group(1).strip())
                if any(m in line for m in ["പുരുഷൻ", "പുരുഷന്", "Male"]):
                    data["Gender"] = "MALE"
                elif any(f in line for f in ["സ്ത്രീ", "സത്രീ", "സ്ത്രീ", "Female"]):
                    data["Gender"] = "FEMALE"

            # 2. Relation Name Check (Priority over generic Name to avoid keyword overlaps)
            rel_found = False
            for rel_type, pattern in [("Father", self.patterns["rel_father"]), 
                                      ("Husband", self.patterns["rel_husband"]), 
                                      ("Mother", self.patterns["rel_mother"]),
                                      ("Others", self.patterns["rel_others"])]:
                rel_match = pattern.search(line)
                if rel_match:
                    data["Relation Name"] = self._strip_value(rel_match.group(1))
                    data["Relation Type"] = rel_type
                    rel_found = True
                    collecting_rel = True
                    collecting_name = collecting_house = False
                    break
            
            # 3. Name Check (Avoids grabbing Relation keywords as names)
            name_match = self.patterns["name"].search(line)
            is_rel_start = any(line.strip().startswith(k) for k in ["അച്ഛ", "ഭർത്താ", "അമ്മ", "മറ്റുള്ള"])
            
            if name_match and not is_rel_start:
                extracted_name = self._strip_value(name_match.group(1))
                if extracted_name:
                    # Clean leading EPICs or numbers from name
                    clean_name = re.sub(r'^[^\u0D05-\u0D39\u0D7A-\u0D7F]*\d+\s*', '', extracted_name).strip()
                    if clean_name and data["Name"] == "N/A":
                        data["Name"] = clean_name
                        collecting_name = True
                        collecting_house = collecting_rel = False

            # 4. Check for House Start
            house_match = self.patterns["house"].search(line)
            if house_match:
                val = self._strip_value(house_match.group(1))
                if val: house_raw_accumulator.append(val)
                collecting_house = True
                collecting_name = collecting_rel = False

            # 5. Continuity Logic (Generic line handling)
            if not any([age_match, rel_found, name_match, house_match]):
                if collecting_name:
                    data["Name"] += " " + self._strip_value(line)
                elif collecting_rel:
                    data["Relation Name"] += " " + self._strip_value(line)
                elif collecting_house:
                    house_raw_accumulator.append(line)
                else:
                    unassigned_lines.append(line)

        # FINAL PROCESSING
        # Finalize Split for House Fields
        full_house_text = " ".join(house_raw_accumulator)
        h_num, h_name = self._split_house_info(full_house_text)
        data["House Number"] = h_num
        data["House Name"] = h_name

        # Fallback for Name if still missing
        if data["Name"] == "N/A" and unassigned_lines:
            for cand in unassigned_lines[:2]:
                # Strict exclusion for fallback too
                if not any(k in cand for k in ["അച്ഛ", "ഭർത്താ", "അമ്മ", "പ്രായം"]):
                    val = self._strip_value(cand)
                    # Ensure it has Malayalam characters and isn't just noise
                    if len(val) > 2 and re.search(r'[\u0D05-\u0D39\u0D7A-\u0D7F]', val):
                        data["Name"] = val
                        break

        # Safety: Final Gender Scan if missing
        if data["Gender"] == "N/A":
            if any(m in raw_text for m in ["പുരുഷൻ", "പുരുഷന്"]):
                data["Gender"] = "MALE"
            else:
                data["Gender"] = "FEMALE"

        return data
