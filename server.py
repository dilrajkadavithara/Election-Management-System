import sys
import os
import uvicorn
from pathlib import Path

# 1. Setup Python Path
# This ensures 'core', 'backend', and 'voter_vault' are always importable
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

# 2. Entry Point
if __name__ == "__main__":
    print(f"Starting Server from: {ROOT_DIR}")
    
    # Check for .env
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        print("⚠️  WARNING: .env file not found! Database and Poppler might fail.")
    
    # Run Uvicorn
    # reload=False is safer here because uploading files to data/ 
    # would trigger a restart if reload was True.
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False  
    )
