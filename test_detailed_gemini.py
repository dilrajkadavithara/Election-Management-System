import os
import google.generativeai as genai
from PIL import Image
import json
import sys

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_gemini_ocr_detailed(api_key, image_path):
    print(f"\n--- Detailed Re-examination: {os.path.basename(image_path)} ---")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')
    img = Image.open(image_path)
    
    # Granular prompt to catch everything
    prompt = """
    Look very closely at this voter box image. Identify every piece of text.
    Extract the following fields specifically:
    1. Serial Number (Top left)
    2. EPIC ID (Top right)
    3. Voter's Name (in Malayalam)
    4. Guardian/Relation Name (in Malayalam)
    5. Relation Type (Father/Husband/Mother)
    6. House Number (Look for any digit in the house section)
    7. House Name (in Malayalam)
    8. Age
    9. Gender
    
    Return as JSON:
    {
        "serial_number": "",
        "epic_id": "",
        "name": "",
        "relation_name": "",
        "relation_type": "",
        "house_number": "",
        "house_name": "",
        "age": "",
        "gender": "",
        "raw_house_section": "The full text you see for the house section"
    }
    """
    
    try:
        response = model.generate_content([prompt, img])
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        print("\n✅ DETAILED RESULTS:")
        print(json.dumps(data, indent=4, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    key = "AIzaSyBPC_dM6MJGCkDwgfXgy-2zCQb2BQ7eFaE"
    sample_path = r"c:\Users\dilra\OneDrive\Desktop\Voterslist\data\voter_crops\03c1bb2f\voter_0000_pg003_box00.png"
    test_gemini_ocr_detailed(key, sample_path)
