
import json
import re

# Scenario: AI adds a footer that contains a bracket (The "Ah-ha" Edge Case)
# This simulates: "Here is your data: [...] Note: [Verified]"
text = '[{"voter_id": 1}]\nNote: Data [Verified].'

print(f"--- SIMULATION: input='{text}' ---\n")

# 1. Parsing directly (Current State)
print("1. CURRENT METHOD (json.loads)")
try:
    json.loads(text)
    print("   Result: Success (Unexpected)")
except Exception as e:
    print(f"   Result: FAILED as expected ({str(e)})")

# 2. Friend's Code (Regex)
print("\n2. FRIEND OPTION A (Regex)")
try:
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        extracted = match.group(0)
        # Note: In strict JSON, text after ] is invalid
        try:
            json.loads(extracted)
            print(f"   Extracted: '{extracted}'")
            print("   Result: Success")
        except Exception as e:
             print(f"   Extracted: '{extracted}'")
             print(f"   Result: FAILED ({str(e)})")
             print("   Analysis: Regex captured too much (greedy match included the footer).")
    else:
        print("   Result: No match")
except Exception as e:
    print(f"   Result: FAILED ({str(e)})")


# 3. Enhanced Method (Streaming Decoder)
print("\n3. FRIEND OPTION B (Streaming Decoder)")
try:
    start_index = text.find('[')
    if start_index != -1:
        # raw_decode parses ONE valid object and stops
        parsed, end_index = json.JSONDecoder().raw_decode(text[start_index:])
        print(f"   Extracted: {parsed}")
        print(f"   Ignored: '{text[start_index+end_index:]}'")
        print("   Result: SUCCESS (Robust)")
    else:
        print("   Result: No JSON start found")
except Exception as e:
    print(f"   Result: FAILED ({str(e)})")
