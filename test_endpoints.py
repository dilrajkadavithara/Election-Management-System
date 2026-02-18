import requests

def test_endpoint(url):
    try:
        r = requests.get(url)
        print(f"GET {url} -> {r.status_code}")
        if r.status_code != 200:
            print(f"Body: {r.text}")
    except Exception as e:
        print(f"Request failed for {url}: {e}")

if __name__ == "__main__":
    test_endpoint("http://localhost:8000/api/health")
    test_endpoint("http://localhost:5173/api/health")
    test_endpoint("http://localhost:8000/api/admin/locations")
    test_endpoint("http://localhost:5173/api/admin/locations")
