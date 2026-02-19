import os
import google.generativeai as genai
from PIL import Image
import json
import sys
import time

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_gemini_ocr(api_key, image_path):
    print(f"\n--- Testing Gemini OCR on: {os.path.basename(image_path)} ---")
    genai.configure(api_key=api_key)
    
    # List of models to try in order of preference
    models_to_try = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-flash-latest',
        'gemini-1.5-pro'
    ]
    
    img = Image.open(image_path)
    prompt = """
    Extract the voter details from this image. 
    The image is a single box from an Indian Voter List.
    Return the data in valid JSON format:
    {
        "serial_number": "number",
        "epic_id": "alphanumeric",
        "name_malayalam": "name in malayalam",
        "guardian_name_malayalam": "father/husband in malayalam",
        "house_name_malayalam": "house name",
        "age": "number",
        "gender": "MALE/FEMALE"
    }
    """
    
    for model_name in models_to_try:
        try:
            print(f"Trying model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt, img])
            
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            data = json.loads(text)
            print("\n✅ SUCCESS!")
            print(json.dumps(data, indent=4, ensure_ascii=False))
            return # Stop if success
            
        except Exception as e:
            print(f"❌ {model_name} failed: {str(e)}")
            if "429" in str(e):
                print("Rate limit hit. Waiting 10s...")
                time.sleep(10)
            continue

if __name__ == "__main__":
    key = os.getenv("GOOGLE_API_KEY")
    sample_path = r"c:\Users\dilra\OneDrive\Desktop\Voterslist\data\voter_crops\03c1bb2f\voter_0000_pg003_box00.png"
    test_gemini_ocr(key, sample_path)
