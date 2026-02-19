
import requests

URL = "http://localhost:8000/api/token"
# OAuth2PasswordRequestForm expects form-data, not JSON
DATA = {
    "username": "admin",
    "password": "admin"
}

try:
    print(f"Testing login to {URL} with admin:admin (Form Data)...")
    # Using 'data=' sends form-urlencoded
    response = requests.post(URL, data=DATA)
    
    if response.status_code == 200:
        print("✅ LOGIN SUCCESS! Token received.")
        print(f"Role: {response.json().get('role')}")
    elif response.status_code == 401:
        print("❌ LOGIN FAILED: Invalid Credentials.")
    else:
        print(f"⚠️ SERVER ERROR: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
