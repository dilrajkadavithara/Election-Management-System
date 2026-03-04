import requests
import time
import os
import json

BASE_URL = "https://intelhub.live"
PDF_FILE = "2026-EROLLGEN-S11-84-SIR-FinalRoll-Revision1-MAL-11-WI.pdf"
LOGIN_URL = f"{BASE_URL}/api/login"
UPLOAD_URL = f"{BASE_URL}/api/upload"
EXTRACT_URL = f"{BASE_URL}/api/extract"
PROCESS_URL = f"{BASE_URL}/api/process-batch"
STATUS_URL = f"{BASE_URL}/api/batch"

# User creds (assuming test_president or admin)
# In main.py there is a login endpoint.
print("Starting E2E Test...")

# For simplicity, we can also just run this script directly ON the digital ocean server
# which completely bypasses the auth!
