#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.remote.yml"

# 1. Update orchestration files
git pull origin master

# 2. Lock the commit SHA and persist it to .env so ANY future
#    `docker compose up -d` (manual or scripted) uses the correct image.
IMAGE_TAG=$(git rev-parse HEAD)
export IMAGE_TAG

# Write/update IMAGE_TAG in .env (preserve all other vars)
if [ -f .env ]; then
    # Remove old IMAGE_TAG line, then append new one
    sed -i '/^IMAGE_TAG=/d' .env
fi
echo "IMAGE_TAG=${IMAGE_TAG}" >> .env

echo "🚀 Deploying commit: $IMAGE_TAG"

# 3. Pull new images BEFORE stopping anything (zero-gap swap)
until docker compose -f "$COMPOSE_FILE" pull; do
  echo "⚠️ Image not ready yet... retrying in 30s"
  sleep 30
done

# 4. STOP first (prevents restart:always from respawning during cleanup)
echo "🛠️ Stopping running containers..."
docker compose -f "$COMPOSE_FILE" stop --timeout 30 2>/dev/null || true

# 5. Remove containers (compose-native, no hardcoded names)
docker compose -f "$COMPOSE_FILE" down --remove-orphans --timeout 10 2>/dev/null || true

# 6. Nuclear fallback — kill anything still lingering with the project prefix
for cid in $(docker ps -aq --filter "label=com.docker.compose.project=voterslist" 2>/dev/null); do
    docker rm -f "$cid" 2>/dev/null || true
done

# 7. Start fresh containers with the locked IMAGE_TAG
echo "✨ Starting containers (IMAGE_TAG=$IMAGE_TAG)..."
docker compose -f "$COMPOSE_FILE" up -d

# 8. Wait for Redis to be ready, then flush cache
echo "⏳ Waiting for Redis..."
for i in $(seq 1 15); do
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        REDIS_PASS=$(grep -oP 'REDIS_PASSWORD=\K.*' .env 2>/dev/null || echo "intelhub_redis_2026")
        docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli -a "$REDIS_PASS" --no-auth-warning FLUSHALL
        echo "✅ Redis cache flushed"
        break
    fi
    sleep 2
done

# 9. Quick health check
echo "⏳ Waiting for app to start..."
for i in $(seq 1 20); do
    if docker compose -f "$COMPOSE_FILE" exec -T app curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ App is healthy"
        break
    fi
    sleep 3
done

echo "✅ Deployment complete. Running commit: $IMAGE_TAG"
