import os
from celery import Celery

# Get Redis URL from environment
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery instance
celery_app = Celery(
    "election_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["backend.tasks"]
)

# Optional configuration
celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Capping concurrency to avoid RAM issues
    worker_concurrency=1 
)

if __name__ == "__main__":
    celery_app.start()
