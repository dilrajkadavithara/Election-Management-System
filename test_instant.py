import requests
import time
import sys

BASE_URL = "https://intelhub.live"
AUTH = ("admin", "admin123")
BATCH_ID = "14cdb1ef" # Using the one currently in memory

def test_instant():
    print(f"Testing Batch: {BATCH_ID}")
    print("Step 1: Authenticating...")
    token_res = requests.post(f"{BASE_URL}/api/token", data={"username": AUTH[0], "password": AUTH[1]})
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("Step 5: Testing CSV Preview...")
    csv_res = requests.get(f"{BASE_URL}/api/download-csv/{BATCH_ID}", headers=headers)
    print(f"CSV Result: {csv_res.status_code}")
    if csv_res.status_code == 200:
        print("✅ CSV Download Working (Fix Verified)!")
    else:
        print(f"❌ CSV Failed: {csv_res.text}")

    print("Step 6: Testing Save to Database...")
    save_url = f"{BASE_URL}/api/save-to-db"
    params = {
        "constituency": "1",
        "lgb_type": "PANCHAYAT",
        "lgb_name": "TEST",
        "b_num": "999",
        "batch_id": BATCH_ID,
        "ps_no": "1",
        "ps_name": "TEST SCHOOL"
    }
    save_res = requests.post(save_url, headers=headers, params=params)
    print(f"Save Result: {save_res.status_code}")
    if save_res.status_code == 200:
        print("✅ Save to Database Working (Fix Verified)!")
    else:
        print(f"❌ Save Failed: {save_res.text}")

if __name__ == "__main__":
    test_instant()
