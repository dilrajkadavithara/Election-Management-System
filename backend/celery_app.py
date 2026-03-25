import os
from celery import Celery
from celery.schedules import crontab

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
    timezone="Asia/Kolkata",
    enable_utc=False,
    # Capping concurrency to avoid RAM issues
    worker_concurrency=1,
    # Celery Beat schedule for periodic tasks
    beat_schedule={
        'daily-progress-snapshot': {
            'task': 'tasks.snapshot_daily_progress',
            'schedule': crontab(hour=23, minute=30),  # 11:30 PM IST daily
        },
        'janitor-cleanup': {
            'task': 'tasks.janitor_cleanup',
            'schedule': crontab(hour=3, minute=0),  # 3:00 AM IST daily
        },
    },
)

if __name__ == "__main__":
    celery_app.start()
