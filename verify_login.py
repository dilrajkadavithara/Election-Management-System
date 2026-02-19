
import requests
import sys

# Define URL (Internal Docker Network IP or Localhost)
# Since running inside container, 'localhost:8000' is correct.
URL = "http://localhost:8000/api/auth/token/"
DATA = {
    "username": "admin",
    "password": "admin"
}

try:
    print(f"Testing login to {URL} with admin:admin...")
    response = requests.post(URL, json=DATA)
    
    if response.status_code == 200:
        print("✅ LOGIN SUCCESS! Token received.")
        print(f"Response: {response.json().keys()}")
    elif response.status_code == 401:
        print("❌ LOGIN FAILED: Invalid Credentials.")
    else:
        print(f"⚠️ SERVER ERROR: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"connection Error: {e}")
