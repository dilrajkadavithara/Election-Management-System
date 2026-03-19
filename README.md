# 🗳️ Voter Vault 2026: "The Tank" (Production Grade)
**Modern React + FastAPI + Gemini AI Stack for Malayalam Voter Intel.**

---

## 🎯 Project Vision
Voter Vault 2026 is a mission-critical platform designed for the highest-stakes deployment. It transitions a battle-tested core into a **"Tank"** architecture capable of handling **200,000+ records** and **5,000 concurrent user logins** with lightning speed and 99.9% OCR accuracy.

---

## 🏗️ System Architecture ("The Tank")
The system is built on an **8 vCPU / 16 GB RAM / 320 GB SSD** DigitalOcean Droplet ("The Tank").

### **The Hybrid Pipeline:**
1.  **Frontend**: High-speed **React (Vite)** SPA with real-time **War Room Dashboard (V2)**.
2.  **API Gateway**: **FastAPI** (Python 3.10+) handling async I/O and PDF streaming.
3.  **Intelligence Engine**: **Google Gemini AI** (Vision Flash) for high-precision Malayalam/English OCR.
4.  **Database Hub**: **PostgreSQL 15** managed via a **Protected Django ORM** (Source of Truth).
5.  **Task Orchestration**: **Celery + Redis** with **20 parallel workers** optimized for the 8-core CPU.

---

## 🛡️ "Immune" Deployment Logic
The project uses a **Build-Test-Pull** strategy to ensure your **Excellent Local Setup** is never disturbed.

*   **Build (Cloud)**: GitHub Actions builds the React frontend and packages the entire app into a Docker image.
*   **Registry (GHCR)**: The pre-tested image is pushed to **GitHub Container Registry**.
*   **Pull (Production)**: The "Tank" server pulls only the finalized, proven image.
*   **Zero-Downtime**: Workers swap instantly (less than 10s of downtime) during updates.

---

## 🚀 Quick Start (Local Development)
Your local development environment remains safe and lightweight on **4GB+ RAM**.

### **1. Launch Services**
```powershell
.\start.ps1
```
*   **Backend**: http://localhost:8000
*   **Frontend**: http://localhost:5173
*   **Admin Panel**: http://localhost:8000/admin (Secure, Local-only)

---

## 📁 Core Directory Map
*   **`backend/`**: FastAPI routers, Celery setup, and API logic.
*   **`core/`**: **The Engine Room (Protected).** AI services, OCR extraction, and DB bridges.
*   **`voter_vault/`**: Django configuration and Schema definition (`core_db/models.py`).
*   **`frontend/`**: React source code and Vite build output.
*   **`nginx/`**: Production reverse-proxy configuration.
*   **`scripts/`**: Automation tools and the "Tank" setup script (`setup_tank.sh`).

---

## 📊 Deployment Command Center
*   **Production URL**: `https://intelhub.live`
*   **Admin Access**: `https://intelhub.live/voter-intel-hq-2026` (Protected Proxy)
*   **Health Check**: `https://intelhub.live/api/health`

---

## ⚙️ Hardware Optimization (Tank Settings)
| Feature | Local (4GB) | Production (Tank 16GB) |
| :--- | :--- | :--- |
| **OCR Resolution** | 300 DPI | **600 DPI (UHD Clarity)** |
| **Worker Count** | 5 Workers | **20 Workers (Parallel)** |
| **Wait Time (30p)** | 5m 42s | **45 - 60 Seconds** |
| **Concurrency** | Low | **High (10 Simultaneous Extractions)** |

---

> [!IMPORTANT]
> **Zero Risk Policy**: Never modify files in the `core/` folder without consulting the protocol. Always test migrations locally before pushing to the Tank.

#   D e p l o y m e n t   R e a d y :   M a r c h   2 0 ,   2 0 2 6   0 1 : 0 0 : 0 0
