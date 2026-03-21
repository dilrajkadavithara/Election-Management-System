#!/bin/bash

# 1. Update orchestration file
git pull origin master

# 2. Get the unique commit SHA (The Serial Number)
export IMAGE_TAG=$(git rev-parse HEAD)

echo "🚀 [DATA-SHIELD]: Starting Safe Deployment for Commit: $IMAGE_TAG"

# 3. Pull the specific image (The 'Waiter' Loop)
# We pull BEFORE we stop anything to keep your current server running!
until docker compose -f docker-compose.remote.yml pull; do
  echo "⚠️ Build for $IMAGE_TAG is still in progress on GitHub... waiting 30 seconds..."
  sleep 30
done

# 4. SWAP PROTOCOL (Data-Safe)
echo "🛠️ Clearing 'Zombie' containers (leaving Data Volumes untouched)..."

# First, force-kill the known stubborn containers
docker rm -f voterslist-redis-1 voterslist-worker-1 voterslist-app-1 voterslist-nginx-1 voterslist-certbot-1 voterslist-db-1 2>/dev/null || true

# Second, perform a safe shutdown (WITHOUT --volumes flag)
docker compose -f docker-compose.remote.yml down --remove-orphans --timeout 1 || true

# 5. Start the new version into the empty house
echo "✨ Starting the fresh v3.2.1-SHA-LOCK engine..."
docker compose -f docker-compose.remote.yml up -d

# 6. Flush Redis cache (Safe - does not touch Postgres data)
if docker ps | grep -q "voterslist-redis-1"; then
    docker exec -it voterslist-redis-1 redis-cli FLUSHALL
fi

echo "✨ Deployment Complete. Your server is now running Commit: $IMAGE_TAG"
echo "🛠️ Verification: run 'docker logs voterslist-worker-1' to see the startup tracer."
