# Voter OCR Pro - Startup Script
Write-Host "Starting Voter OCR Pro..." -ForegroundColor Green

# Start Backend in a new window
Write-Host "Launching Backend (FastAPI on Port 8000)..." -ForegroundColor Yellow
$backendArgs = "-NoExit -Command `"cd backend; if (Test-Path '..\.venv\Scripts\Activate.ps1') { & '..\.venv\Scripts\Activate.ps1' }; uvicorn main:app --port 8000 --reload`""
Start-Process powershell.exe -ArgumentList $backendArgs

# Start Frontend in a new window
Write-Host "Launching Frontend (React/Vite on Port 5173)..." -ForegroundColor Cyan
$frontendArgs = "-NoExit -Command `"cd frontend; npm run dev`""
Start-Process powershell.exe -ArgumentList $frontendArgs

Write-Host "✅ Both services are launching in separate windows." -ForegroundColor Green
Write-Host "→ Backend API will be available at: http://localhost:8000"
Write-Host "→ Frontend UI will be available at: http://localhost:5173"
Write-Host "Note: It may take a few seconds for the frontend proxy to successfully connect to the backend."
