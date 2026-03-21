#!/bin/bash

# 1. Update orchestration file
git pull origin master

# 2. Get the unique commit SHA (The Serial Number)
export IMAGE_TAG=$(git rev-parse HEAD)

echo "🚀 [SHA-LOCK]: Starting deployment for Commit: $IMAGE_TAG"

# 3. Pull the specific image (The 'Waiter' Loop)
until docker compose -f docker-compose.remote.yml pull; do
  echo "⚠️ Build for $IMAGE_TAG is still in progress on GitHub... waiting 30 seconds..."
  sleep 30
done

# 4. Swap to the new version
echo "✅ Build Found! Swapping to the new version..."
docker compose -f docker-compose.remote.yml up -d --force-recreate

# 5. Clean up old memory (Safe clearing only if Redis is running)
if docker ps | grep -q "voterslist-redis-1"; then
    docker exec -it voterslist-redis-1 redis-cli FLUSHALL
fi

echo "✨ Deployment Complete. Your server is now running Commit: $IMAGE_TAG"
