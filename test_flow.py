import requests
import time
import sys

BASE_URL = "https://intelhub.live"
AUTH = ("admin", "admin123")
PDF_FILE = r"c:\Users\dilra\OneDrive\Desktop\Voterslist\data\raw_pdf\voterslist_185.pdf"

def test():
    print("Step 1: Authenticating...")
    token_res = requests.post(f"{BASE_URL}/api/token", data={"username": AUTH[0], "password": AUTH[1]})
    if token_res.status_code != 200:
        print(f"Auth Failed: {token_res.text}")
        return
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("Step 2: Uploading PDF...")
    with open(PDF_FILE, 'rb') as f:
        # FastAPI UploadFile expects 'file' field
        upload_res = requests.post(f"{BASE_URL}/api/upload", files={'file': f}, headers=headers)
    
    if upload_res.status_code != 200:
        print(f"Upload Failed: {upload_res.text}")
        return
    
    batch_id = upload_res.json()["batch_id"]
    print(f"Batch ID Created: {batch_id}")

    print("Step 3: Extracting Boxes...")
    # URL in api.js is /api/extract/{batchId}
    ext_res = requests.post(f"{BASE_URL}/api/extract/{batch_id}", headers=headers)
    print(f"Extract Trigger: {ext_res.status_code}")
    
    while True:
        status_res = requests.get(f"{BASE_URL}/api/batch/{batch_id}/status", headers=headers)
        if status_res.status_code != 200:
            print(f"Status check failed: {status_res.text}")
            return
        status_data = status_res.json()
        status = status_data.get('status', 'unknown')
        processed = status_data.get('pages_processed', 0)
        total = status_data.get('total_pages', 0)
        print(f"Current Status: {status} ({processed}/{total} pages)")
        
        if status == 'extracted': break
        if status == 'error': 
            print(f"Extraction Error: {status_data.get('error')}"); return
        time.sleep(3)

    print("Step 4: Processing OCR...")
    requests.post(f"{BASE_URL}/api/process-batch/{batch_id}", headers=headers)
    
    while True:
        status_data = requests.get(f"{BASE_URL}/api/batch/{batch_id}/status", headers=headers).json()
        status = status_data.get('status', 'unknown')
        if status == 'processed' or status == 'results': break
        if status == 'error': 
            print("OCR Error!"); return
        time.sleep(3)

    print("Step 5: Testing CSV Preview...")
    csv_res = requests.get(f"{BASE_URL}/api/download-csv/{batch_id}", headers=headers)
    print(f"CSV Result: {csv_res.status_code}")
    if csv_res.status_code == 200:
        print("✅ CSV Download Working!")
    else:
        print(f"❌ CSV Failed: {csv_res.text}")

    print("Step 6: Testing Save to Database...")
    save_url = f"{BASE_URL}/api/save-to-db"
    payload = {
        "constituency": "1",
        "lgb_type": "PANCHAYAT",
        "lgb_name": "TEST",
        "booth": "999",
        "batch_id": batch_id,
        "ps_no": "1",
        "ps_name": "TEST SCHOOL"
    }
    save_res = requests.post(save_url, headers=headers, json=payload)
    print(f"Save Result: {save_res.status_code}")
    if save_res.status_code == 200:
        print("✅ Save to Database Working!")
    else:
        print(f"❌ Save Failed: {save_res.text}")

if __name__ == "__main__":
    test()
