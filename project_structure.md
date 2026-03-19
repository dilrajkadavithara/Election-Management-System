# Project Structure: Voter Vault 2026

This document outlines the architecture and directory structure of the **Voter Vault 2026** platform.

---

## 🏗️ High-Level Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons.
- **Backend (API)**: FastAPI (Python 3.12).
- **Backend (Data/Auth)**: Django (PostgreSQL ORM).
- **Communication**: Redis for state management and Celery for background tasks.
- **OCR/AI**: Google Gemini AI + Tesseract OCR for Voter List processing.

---

## 📁 Directory Breakdown

### 📂 Root Directory
| File/Folder | Description |
| :--- | :--- |
| `server.py` | The main entry point for the production server. Handles migrations, asset sync, and starts Uvicorn. |
| `Dockerfile` | Multi-stage build for the consolidated production image. |
| `docker-compose.yml` | Local development configuration. |
| `docker-compose.remote.yml` | Production configuration for "The Tank" server. |
| `requirements.txt` | Python dependencies. |

### 📂 `backend/` (FastAPI Layer)
*The modern API layer providing high-speed endpoints and real-time processing.*
- `main.py`: The heart of the API. Defines all REST endpoints and the Django-Auth bridge.
- `state_manager.py`: Handles global application state (Redis connection, feature flags).
- `celery_app.py`: Task queue configuration for asynchronous processing.
- `tasks.py`: Background worker logic.

### 📂 `voter_vault/` (Django Core)
*The "Brain" for data integrity, authentication, and database migrations.*
- `core_db/`: 
    - `models.py`: Database schema (Voters, Booths, Strategic Tactics).
    - `admin.py`: Native Django admin interface configuration.
- `voter_vault/`: Project settings and WSGI configuration.

### 📂 `core/` (Computation Engines)
*Specialized intelligence modules for heavy lifting.*
- `db_bridge.py`: Data conversion layer translating raw OCR to structured voters.
- `ocr_engine.py`: Malayalam language OCR processing logic.
- `ai_service.py`: Integration with Google Gemini.
- `pdf_processor.py`: PDF normalization and image extraction.

### 📂 `frontend/` (React Application)
*Professional, dark-mode interface.*
- `src/views/`: Main page layouts (Dashboard, Tactical View, Voter Search).
- `src/components/`: Reusable UI elements.
- `src/App.jsx`: Global routing and core app logic.

---

## 🔄 The Hybrid Loop
1. **Boot**: `server.py` triggers Django migrations and ensures the `admin` user exists.
2. **Uplink**: FastAPI starts mounting `WSGIMiddleware` for Django Admin access.
3. **Inbound**: PDF voter lists are received via FastAPI endpoints.
4. **Process**: `Celery` workers pick up tasks, use `core/` engines to extract data.
5. **View**: React frontend fetches structured strategic data from `/api/` endpoints.
