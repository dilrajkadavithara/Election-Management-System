import os
import redis
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
print(f"Testing connection to Redis at: {redis_url}")

try:
    r = redis.from_url(redis_url)
    r.ping()
    print("✅ Successfully connected to Redis!")
    
    # Check for pending tasks
    # Celery default queue is 'celery'
    queue_len = r.llen('celery')
    print(f"Pending tasks in 'celery' queue: {queue_len}")
    
    # Check for active workers (optional, might need celery app)
except Exception as e:
    print(f"❌ Failed to connect to Redis: {e}")
