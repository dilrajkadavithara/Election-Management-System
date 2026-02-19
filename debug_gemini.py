import os
import google.generativeai as genai
from PIL import Image
import json
import traceback

def main():
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        image_path = r"c:\Users\dilra\OneDrive\Desktop\Voterslist\data\voter_crops\03c1bb2f\voter_0000_pg003_box00.png"
        
        if not os.path.exists(image_path):
            with open("error.log", "w") as f:
                f.write(f"Image not found: {image_path}")
            return

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        img = Image.open(image_path)
        
        prompt = "Extract voter details from this image in JSON format: serial_number, epic_id, name_malayalam, guardian_name_malayalam, house_name_malayalam, age, gender."
        
        response = model.generate_content([prompt, img])
        
        with open("raw_response.txt", "w", encoding="utf-8") as f:
            f.write(response.text)
            
    except Exception as e:
        with open("error.log", "w") as f:
            f.write(traceback.format_exc())

if __name__ == "__main__":
    main()
