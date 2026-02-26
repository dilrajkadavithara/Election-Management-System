import json
import os
import redis
import logging

from backend.logger_setup import setup_logger
logger = setup_logger("StateManager")

class StateManager:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.redis = redis.from_url(redis_url, decode_responses=True)
            self.redis.ping()
            self.use_redis = True
            logger.info(f"Connected to Redis at {redis_url}")
        except Exception as e:
            logger.warning(f"Could not connect to Redis ({e}). Using in-memory fallback with disk persistence.")
            self.use_redis = False
            self.persistence_path = "data/sessions.json"
            self._local_storage = self._load_from_disk()

    def _load_from_disk(self):
        if os.path.exists(self.persistence_path):
            try:
                with open(self.persistence_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except: return {}
        return {}

    def _save_to_disk(self):
        os.makedirs("data", exist_ok=True)
        try:
            with open(self.persistence_path, 'w', encoding='utf-8') as f:
                json.dump(self._local_storage, f, ensure_ascii=False, indent=4)
        except: pass

    def get_batch(self, batch_id):
        if self.use_redis:
            data = self.redis.get(f"batch:{batch_id}")
            return json.loads(data) if data else None
        return self._local_storage.get(batch_id)

    def set_batch(self, batch_id, data, expire=3600*24):
        if self.use_redis:
            self.redis.set(f"batch:{batch_id}", json.dumps(data), ex=expire)
        else:
            self._local_storage[batch_id] = data
            self._save_to_disk()

    def delete_batch(self, batch_id):
        if self.use_redis:
            self.redis.delete(f"batch:{batch_id}")
        else:
            self._local_storage.pop(batch_id, None)
            self._save_to_disk()

    def list_all_batches(self):
        # Professional Bird's-Eye View: Returns full objects for deep analysis
        if self.use_redis:
            keys = self.redis.keys("batch:*")
            all_batches = []
            for k in keys:
                data = self.redis.get(k)
                if data:
                    try: all_batches.append(json.loads(data))
                    except: pass
            return all_batches
        return list(self._local_storage.values())

    def is_cancelled(self, batch_id):
        if self.use_redis:
            return self.redis.sismember("cancelled_batches", batch_id)
        # We'll need to handle cancellation too
        return False

    def mark_cancelled(self, batch_id):
        if self.use_redis:
            self.redis.sadd("cancelled_batches", batch_id)
            self.redis.expire("cancelled_batches", 3600*24)
        
    def remove_cancelled(self, batch_id):
        if self.use_redis:
            self.redis.srem("cancelled_batches", batch_id)

# Global Instance
state_manager = StateManager()
