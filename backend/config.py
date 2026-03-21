import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "election-super-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Paths
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "raw_pdf"
PAGES_DIR = DATA_DIR / "page_images"
CROPS_DIR = DATA_DIR / "voter_crops"
LOG_DIR = DATA_DIR / "logs"

for p in [UPLOAD_DIR, PAGES_DIR, CROPS_DIR, LOG_DIR]:
    p.mkdir(parents=True, exist_ok=True)

GLOBAL_LOG_FILE = LOG_DIR / "production.log"
POPPLER_PATH = os.getenv("POPPLER_PATH")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
