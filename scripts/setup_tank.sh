#!/bin/bash
# 🏗️ Voter Vault 2026: TANK Setup Script (8 vCPU / 16 GB RAM)
# Run this once on your DigitalOcean Droplet to prime it for the campaign.

set -e

echo "🚀 Starting TANK Optimization (16 GB / 8 vCPU)..."

# 1. Ensure 4GB SWAP Space (The Safety Net)
if [ ! -f /swapfile ]; then
    echo "📦 Creating 4GB Swap file for OCR bursts..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap enabled."
else
    echo "✅ Swap already exists."
fi

# 2. Update System and Install Base Dependencies
echo "🔄 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

# 3. Ensure Docker and Docker-Compose are installed
if ! command -v docker &> /dev/null; then
    echo "🐋 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker is already installed."
fi

# 4. Install Poppler and OpenCV dependencies (System level)
# Even though these are in the Docker image, having them on the host 
# allows for easier local debugging if ever needed.
echo "🖼️ Installing Poppler-utils and Image Libraries..."
sudo apt-get install -y poppler-utils libgl1 libglib2.0-0

# 5. Optimize File Limits for 5,000 Concurrent Users
echo "⚙️ Tuning system limits for high concurrency..."
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf
sudo sysctl -w fs.file-max=100000

echo "✅ TANK SETUP COMPLETE!"
echo "➡️ Please LOG OUT and LOG BACK IN for user permissions to take effect."
