import os
import google.generativeai as genai
from PIL import Image
import json

# Setup
def test_gemini_ocr(api_key, image_path):
    print(f"\n--- Testing Gemini OCR on: {os.path.basename(image_path)} ---")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Use Gemini 1.5 Flash (Cheaper and very fast for OCR)
    # If you want even more power, you can change this to 'gemini-1.5-pro'
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Load image
    img = Image.open(image_path)
    
    # Precise Prompt for Voter Boxes
    prompt = """
    Extract the voter details from this image. 
    The image is a single box from an Indian Voter List.
    
    Return the data in EXACTLY this JSON format:
    {
        "serial_number": "number only",
        "epic_id": "alphanumeric id",
        "name_malayalam": "full name in malayalam",
        "guardian_name_malayalam": "father/husband name in malayalam",
        "house_name_malayalam": "house name/number in malayalam",
        "age": "number only",
        "gender": "MALE/FEMALE/THIRD GENDER"
    }
    
    If any field is unreadable, use "N/A". 
    Do not include any other text, only the JSON.
    """
    
    try:
        print("Sending to Gemini... (please wait)")
        response = model.generate_content([prompt, img])
        
        # Extract JSON from response (Gemini sometimes wraps it in markdown blocks)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        print("\n✅ SUCCESS! Extracted Data:")
        print(json.dumps(data, indent=4, ensure_ascii=False))
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

if __name__ == "__main__":
    print("=== Gemini OCR Proof of Concept ===")
    key = input("Paste your Gemini API Key here: ").strip()
    
    if not key:
        print("API Key is required!")
    else:
        # Using one of your existing sample images
        sample_path = r"c:\Users\dilra\OneDrive\Desktop\Voterslist\data\voter_crops\03c1bb2f\voter_0000_pg003_box00.png"
        
        if os.path.exists(sample_path):
            test_gemini_ocr(key, sample_path)
        else:
            print(f"Sample image not found at: {sample_path}")
            print("Please check the path or provide a different image.")
