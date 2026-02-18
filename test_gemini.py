import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    print(f"Model {model.model_name} initialized")
    # Try a simple text prompt
    response = model.generate_content("Hello")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

try:
    model = genai.GenerativeModel('gemini-flash-latest')
    print(f"Model {model.model_name} initialized")
    response = model.generate_content("Hello")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
