import re

class VoterParser:
    def __init__(self):
        # Malayalam Keyword Patterns - Ultra-flexible for OCR artifacts
        # We use re.DOTALL and capture until the next known keyword
        self.keywords = {
            "name": r"(?:പേര|പേര്‍|പേര്|പെര|പെര്|രേര്|റേര്|രര)[്]?[^:]*[:\+]?\s*",
            "rel_father": r"(?:അച്ഛ|അച്ച|അച|അചഛ|അച്ചന|അചഛന|അച്ചൻ)\s*(?:ന്റെ|ന്റ|ൻ|ന്‍|ന)?\s*(?:പേര|പേര്|പെര)\s*[:\+]?\s*",
            "rel_husband": r"(?:ഭർത്താ|ഭര്‍ത്താ|ഭർത്ത|ഭര്‍ത്ത|ഭർത്താവി|ഭര്‍ത്താവി)\s*(?:വി|വിൻ|വിന്‍|വിന|വിനെ)?\s*(?:ന്റെ|ന്റ|ൻ|ന്‍|ന)?\s*(?:പേര|പേര്|പെര)\s*[:\+]?\s*",
            "rel_mother": r"(?:അമ്മ|അമമ|അമ|അാമമ)\s*(?:യുടെ|യുട|യു|യ|യുടേ)?\s*(?:പേര|പേര്|പെര)\s*[:\+]?\s*",
            "rel_others": r"(?:മറ്റുള്ളവ|മറ്റുള്ള|മറ്റുള്ളവര്‍|മറ്റുള്ളവര്|മറ്റുളളവ|മറ്റുളളവർ|മറ്റുളളവര്)\s*(?:യുടെ|യുട|യു|യ|യുടേ)?\s*(?:പേര|പേര്|പെര)\s*[:\+]?\s*",
            "house": r"(?:വീട്ട|വീട്ടു|വീട|വീടു|വിട്ടു|വിട്ട|വീട്ടുപേര|വീട്ടുപേര്)\b\s*(?:ന[മന്]പ|നമ്പ|ന|നന്പം|നം|നന|നന്ര)?(?:ർ|ര്|ര്‍|ര)?\s*[:\+]?\s*",
            "age": r"(?:പ്രായ|പ്രായമ|പ്രായമു|പ്രായമ|ായം|പം|പായം|യം)[ം]?\s*[:\+]?\s*",
            "gender": r"(?:ലിംഗ|ലിംഗ്|ലിഗ|ലി|ിഗം|ംഗ|ലിഗം)[ം]?\s*[:\+]?\s*"
        }
        self.chillu_map = {
            "ന്": "ൻ", "ല്": "ൽ", "ള്": "ൾ", "ര്": "ർ", "ണ്": "ൺ", "ക്": "ൿ",
            "ൽല": "ല്ല", "ൽമ": "ന്മ"
        }

    def _apply_chillu_mapping(self, text):
        if not text: return text
        for old, new in self.chillu_map.items():
            text = text.replace(old, new)
        return text
        
    def _map_ocr_age(self, age_str):
        mapping = {
            'ട': '8', 'റ': '0', 'ദ': '2', 'ര': '2', 'ന': '7', 
            'ഒ': '0', 'മ': '3', 'യ': '4', 'ഗ': '9', '൫': '5',
            'ഭ': '6', 'ശ': '6', 'G': '6', 'b': '6'
        }
        res = ""
        for char in age_str:
            if char.isdigit(): res += char
            elif char in mapping: res += mapping[char]
        return res[:3] if len(res) >= 2 else "N/A"

    def clean_text(self, text):
        text = text.replace("|", "").replace("[", "").replace("]", "")
        text = re.sub(r'^[+.\-_\s*]+', '', text, flags=re.MULTILINE)
        return text.strip()

    def _strip_value(self, val):
        if not val: return ""
        # Greedy Keyword Rescue: Remove keyword fragments even if no spaces exist
        # We check for the raw patterns defined in self.keywords
        for kw_pattern in self.keywords.values():
            # Split and take only the first part before any keyword pattern matches
            parts = re.split(kw_pattern, val)
            if parts:
                val = parts[0]
            
        val = val.strip().strip(':.-_=+* ')
        # Keep Malayalam, alphanumeric, space, forward slash, and hyphen
        pattern = r'[^a-zA-Z0-9\u0D05-\u0D39\u0D3E-\u0D4D\u0D7A-\u0D7F\s\/\-]'
        val = re.sub(pattern, '', val)
        val = re.sub(r'^[\u0D3E-\u0D4D\s]+', '', val) # Strip leading vowel signs
        
        # Apply Universal Chillu & Conjunct Mapping
        val = self._apply_chillu_mapping(val)
        return val.strip()

    def _split_house_info(self, house_text):
        if not house_text or house_text == "N/A": return "N/A", "N/A"
        # Aggressively remove "Number" variants
        num_kws = ["നമ്പര്", "നമ്പർ", "നമ്പ്ര്", "നബര്", "നം", "നമ്പ", "നന", "നന്ര", "No", "Number"]
        for kw in num_kws:
            house_text = house_text.replace(kw, "")
        
        # Clean up separators and extra spaces
        house_text = re.sub(r'^[ :\+ \-_]*', '', house_text).strip()
        words = house_text.split()
        num_parts, name_parts = [], []
        suffixes = {"എ", "ഏ", "ബി", "സി", "ഡി", "ഇ", "A", "B", "C", "D"}
        reached_name = False
        
        for word in words:
            clean_word = re.sub(r'[,.]$', '', word)
            if not reached_name:
                # A word is part of the number if it contains a digit or special number chars
                if any(c.isdigit() for c in word) or "/" in word or "-" in word or clean_word in suffixes:
                    num_parts.append(word)
                else:
                    reached_name = True
                    name_parts.append(word)
            else:
                name_parts.append(word)
        
        # House Name Stabilizer: Standardize the word "ഹൗസ്" (House)
        # Handle variants like ഹൌസ്, ഹൗസ, ഹസ്, ഹയസ്, ഹയിസ്
        stabilized_name_parts = []
        for part in name_parts:
            # Common OCR failures for "ഹൗസ്"
            if part in ["ഹൌസ്", "ഹൗസ", "ഹസ്", "ഹയസ്", "ഹയിസ്", "ഹൗസ‍", "ഹൌസ"]:
                stabilized_name_parts.append("ഹൗസ്")
            else:
                stabilized_name_parts.append(part)
                
        return " ".join(num_parts) or "N/A", " ".join(stabilized_name_parts) or "N/A"

    def parse_text_block(self, raw_text):
        raw_text = self.clean_text(raw_text)
        data = {
            "Full Name": "N/A", "Relation Type": "N/A", "Relation Name": "N/A",
            "House Number": "N/A", "House Name": "N/A", "Age": "N/A", "Gender": "N/A"
        }

        # 1. FIELD EXTRACTION (Independent Scan)
        # We search for the pattern and take everything until the next keyword or end of line/block
        
        # --- Name ---
        name_match = re.search(self.keywords["name"] + r"(.*?)(?=" + "|".join(self.keywords.values()) + "|$)", raw_text, re.S)
        if name_match: data["Full Name"] = self._strip_value(name_match.group(1))

        # --- Relation ---
        for r_type, kw_key in [("Father", "rel_father"), ("Husband", "rel_husband"), ("Mother", "rel_mother"), ("Others", "rel_others")]:
            rel_match = re.search(self.keywords[kw_key] + r"(.*?)(?=" + "|".join(self.keywords.values()) + "|$)", raw_text, re.S)
            if rel_match:
                data["Relation Name"] = self._strip_value(rel_match.group(1))
                data["Relation Type"] = r_type
                break

        # --- House ---
        house_match = re.search(self.keywords["house"] + r"(.*?)(?=" + "|".join(self.keywords.values()) + "|$)", raw_text, re.S)
        if house_match:
            h_raw = self._strip_value(house_match.group(1))
            data["House Number"], data["House Name"] = self._split_house_info(h_raw)

        # --- Age & Gender ---
        age_match = re.search(self.keywords["age"] + r"(\d{2,3}|[^\s]{2,3})", raw_text)
        if age_match: data["Age"] = self._map_ocr_age(age_match.group(1))

        # Gender Logic
        male_keywords = ["പുരുഷൻ", "പുരുഷന്", "പുരുഷന", "പുരുഷ", "പുരൂഷൻ", "പുരഷൻ", "Male"]
        female_keywords = ["സ്ത്രീ", "സ്ത്രി", "സത്രീ", "സത്രി", "സ്‌ത്രീ", "സിത്രീ", "Female"]
        
        gender_match = re.search(self.keywords["gender"] + r"(.*?)(?=" + "|".join(self.keywords.values()) + "|$)", raw_text, re.S)
        gender_raw = gender_match.group(1) if gender_match else raw_text
        
        if any(x in gender_raw for x in male_keywords): 
            data["Gender"] = "Male"
        else:
            # Default to Female if not explicitly Male
            data["Gender"] = "Female"

        # 2. RECOVERY & REFINEMENT
        # Refine Gender based on Name Hint (If it was defaulted to Female, check if it should be Male)
        if data["Gender"] == "Female" and data["Full Name"] != "N/A":
            name = data["Full Name"]
            if name.endswith(("ൻ", "ന്‍", "ന", "ൽ", "ല്‍")): 
                data["Gender"] = "Male"
            elif name.endswith(("ി", "ീ", "മ്മ", "മ്മൾ", "മ")):
                data["Gender"] = "Female"

        # --- Age Scavenger (Fixes missing ages in new CSV) ---
        if data["Age"] == "N/A":
            potential_ages = re.findall(r'\b(1[89]|[2-9][0-9])\b', raw_text)
            if potential_ages:
                data["Age"] = potential_ages[-1]

        # --- Name Recovery (Safety-First) ---
        if data["Full Name"] == "N/A":
            first_lines = [l.strip() for l in raw_text.split("\n") if l.strip()][:3]
            for line in first_lines:
                # SKIP lines with relation keywords
                rel_kws = ["അച്ഛ", "അമ്മ", "ഭർത്താ", "മറ്റുള്ള", "Father", "Husband", "Mother"]
                if any(k in line for k in rel_kws): continue
                
                val = self._strip_value(line)
                # Avoid duplicates
                if val == data["Relation Name"] or val == data["House Name"]: continue
                
                if len(val) > 2 and re.search(r'[\u0D05-\u0D39]', val):
                    data["Full Name"] = val
                    break

        # Final Cleanup
        for k in data:
            if isinstance(data[k], str): data[k] = data[k].strip()
            
        return data
