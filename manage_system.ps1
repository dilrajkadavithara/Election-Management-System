$ErrorActionPreference = "Stop"

Write-Host "Voter OCR Pro - System Manager" -ForegroundColor Cyan

# 1. Check Prerequisites
Write-Host "Checking environment..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js missing!" -ForegroundColor Red
    exit 1
}

# 2. Setup Backend
if (-not (Test-Path ".venv")) {
    Write-Host "Creating venv..."
    python -m venv .venv
}

Write-Host "Activating venv..."
& .\.venv\Scripts\Activate.ps1

Write-Host "Installing dependencies..."
pip install -r backend\requirements.txt | Out-Null
pip install python-multipart uvicorn | Out-Null

# 3. Setup Frontend
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing Frontend deps..."
    Push-Location frontend
    npm install
    Pop-Location
}

# 4. Build Frontend
if (-not (Test-Path "frontend\dist")) {
    Write-Host "Building React Frontend..."
    Push-Location frontend
    npm run build
    Pop-Location
}

# 5. Launch
Write-Host "Launching Unified Server..." -ForegroundColor Green
Start-Process python -ArgumentList "server.py"

Write-Host "Waiting for server..."
Start-Sleep -Seconds 5
Start-Process "http://localhost:8000"
