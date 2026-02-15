
"""
AI Service Wrapper for Google Generative AI (Gemini).
This module handles all interactions with the Google AI API.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("⚠️ GOOGLE_API_KEY not found in .env file. AI features will be disabled.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            # Use 'gemini-2.0-flash' for speed and efficiency
            self.model = genai.GenerativeModel('gemini-2.0-flash')

    def test_connection(self):
        """Simple test to verify API key works."""
        if not self.model:
            return {"success": False, "message": "API Key Missing"}
        
        try:
            response = self.model.generate_content("Hello! Are you ready to help with an election campaign?")
            return {"success": True, "message": response.text}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def extract_voter_data(self, image_path):
        """Extracts structured voter data from an image crop."""
        if not self.model: return None
        
        try:
            import PIL.Image
            img = PIL.Image.open(image_path)
            
            prompt = """
            You are an expert OCR engine for Indian Voter Lists (Malayalam/English).
            Analyze this image crop of a single voter and extract the following fields in JSON format:
            {
                "Serial_OCR": "The number at the top left/right",
                "EPIC_ID": "The alphanumeric ID (e.g., KL/11/095/456123 or ABC1234567)",
                "Full Name": "Name in Malayalam (or English if available)",
                "Relation Name": "Name of Father/Mother/Husband",
                "Relation Type": "Father/Mother/Husband",
                "House Name": "House Name in Malayalam",
                "House Number": "House Number",
                "Age": "Age (Numeric)",
                "Gender": "Male/Female"
            }
            Rules:
            1. Correct common OCR mistakes (e.g., 'S' to '5' in Age).
            2. If a field is missing, use "N/A".
            3. Return ONLY the JSON string, no markdown formatting.
            """
            
            import time
            from google.api_core.exceptions import ResourceExhausted

            max_retries = 3
            base_delay = 2  # seconds

            for attempt in range(max_retries):
                try:
                    response = self.model.generate_content([prompt, img])
                    break
                except ResourceExhausted:
                    if attempt < max_retries - 1:
                        sleep_time = base_delay * (2 ** attempt)
                        print(f"Goal Limit Hit. Retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
                    else:
                        print("AI Quota Exceeded. Skipping AI for this block.")
                        return None
                except Exception as e:
                    print(f"AI Error: {e}")
                    return None
            
            # Clean response to get pure JSON
            text = response.text.replace('```json', '').replace('```', '').strip()
            return text
            
        except Exception as e:
            print(f"AI Extraction Error: {e}")
            return None

# Singleton instance
ai_service = AIService()

if __name__ == "__main__":
    # Quick CLI Test
    print("Testing connection to Google AI...")
    
    # List available models to debug
    try:
        print("Available Models:")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")

    res = ai_service.test_connection()
    print(res)
