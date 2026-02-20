import urllib.request
import json
import os

DEST = "/opt/voterslist/data/party_symbols"
HEADERS = {"User-Agent": "ElectionIntel/1.0 (contact@intelhub.live)"}

def get_wiki_url(filename):
    api = f"https://en.wikipedia.org/w/api.php?action=query&titles=File:{filename}&prop=imageinfo&iiprop=url&format=json"
    req = urllib.request.Request(api, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    pages = data["query"]["pages"]
    page = list(pages.values())[0]
    return page["imageinfo"][0]["url"]

def download(url, outpath):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        with open(outpath, "wb") as f:
            f.write(r.read())

# BJP - use the icon SVG thumb as PNG
try:
    url = get_wiki_url("Bharatiya_Janata_Party_%28icon%29.svg")
    # Get PNG thumbnail version
    thumb_url = url.replace("/commons/", "/commons/thumb/") + "/400px-Bharatiya_Janata_Party_%28icon%29.svg.png"
    download(thumb_url, f"{DEST}/bjp.png")
    size = os.path.getsize(f"{DEST}/bjp.png")
    print(f"BJP: {size} bytes - {'OK' if size > 5000 else 'FAILED'}")
except Exception as e:
    print(f"BJP failed: {e}")

# Kerala Congress M
try:
    url = get_wiki_url("Kerala_Congress_%28M%29_flag.png")
    download(url, f"{DEST}/kcm.png")
    size = os.path.getsize(f"{DEST}/kcm.png")
    print(f"KCM: {size} bytes - {'OK' if size > 5000 else 'FAILED'}")
except Exception as e:
    print(f"KCM attempt 1 failed: {e}")
    # Try alternate name
    try:
        url = get_wiki_url("Kerala_Congress_Flag.svg")
        thumb_url = url.replace("/commons/", "/commons/thumb/") + "/400px-Kerala_Congress_Flag.svg.png"
        download(thumb_url, f"{DEST}/kcm.png")
        size = os.path.getsize(f"{DEST}/kcm.png")
        print(f"KCM (alternate): {size} bytes - {'OK' if size > 5000 else 'FAILED'}")
    except Exception as e2:
        print(f"KCM attempt 2 failed: {e2}")

print("\nFinal folder contents:")
for f in os.listdir(DEST):
    path = os.path.join(DEST, f)
    print(f"  {f}: {os.path.getsize(path)} bytes")
