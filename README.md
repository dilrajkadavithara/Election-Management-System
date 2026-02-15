# 🗳️ Voter OCR Pro - Production System

Modern React + FastAPI stack for Malayalam voter list processing with **100% core protection**.

---

## 🎯 Quick Start

### **Option 1: Automatic (Recommended)**
```powershell
.\start.ps1
```
This script will:
- ✅ Check and install dependencies
- ✅ Launch backend (FastAPI) on port 8000
- ✅ Launch frontend (React) on port 5173
- ✅ Open in separate terminal windows

### **Option 2: Manual**

**Terminal 1 - Backend:**
```powershell
.\.venv\Scripts\Activate.ps1
cd backend
python main.py
```
→ API: http://localhost:8000  
→ Docs: http://localhost:8000/api/docs

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm install  # First time only
npm run dev
```
→ App: http://localhost:5173

---

## 📁 Project Structure

```
Voterslist/
├── core/                      ✅ PROTECTED - Never modified
│   ├── pdf_processor.py       🔒 Battle-tested extraction
│   ├── detector.py            🔒 Box detection
│   ├── ocr_engine.py          🔒 OCR engine
│   ├── parser.py              🔒 Malayalam parsing
│   ├── batch_processor.py     🔒 Integrity shield
│   └── db_bridge.py           🔒 Database bridge
│
├── backend/                   ✨ NEW - API server
│   ├── main.py                FastAPI routes
│   └── requirements.txt       Python deps
│
├── frontend/                  ✨ NEW - React UI
│   ├── src/
│   │   ├── App.jsx            Main component
│   │   ├── api.js             API client
│   │   └── index.css          Tailwind CSS
│   ├── tailwind.config.js     Tailwind config
│   └── package.json           Node deps
│
├── start.ps1                  ✨ NEW - Quick launcher
└── app.py                     ✅ Existing Streamlit (still works!)
```

---

## 🛡️ Core Protection Guarantee

**ALL core modules are 100% UNCHANGED:**

| Module | Status | Modifications |
|--------|--------|---------------|
| `core/pdf_processor.py` | 🔒 LOCKED | 0 changes |
| `core/detector.py` | 🔒 LOCKED | 0 changes |
| `core/ocr_engine.py` | 🔒 LOCKED | 0 changes |
| `core/parser.py` | 🔒 LOCKED | 0 changes |
| `core/batch_processor.py` | 🔒 LOCKED | 0 changes |
| `core/db_bridge.py` | 🔒 LOCKED | 0 changes |

**How it works:**
```python
# backend/main.py (NEW file - wraps core)
from core.detector import VoterDetector  # ← Import unchanged module

detector = VoterDetector()  # ← Use as-is

@app.post("/api/extract")
async def extract(pdf_path):
    boxes = detector.detect_voter_boxes(pdf_path)  # ← Same exact call
    return {"boxes": boxes}
```

---

## 🎨 Technology Stack

### **Frontend:**
- ⚛️ React 18 - Modern UI library
- 🎨 Tailwind CSS - Utility-first styling
- ⚡ Vite - Lightning-fast build tool
- 📡 Axios - HTTP client

### **Backend:**
- 🚀 FastAPI - Modern Python web framework
- 🔌 Uvicorn - ASGI server
- 📝 Pydantic - Data validation

### **Core (Protected):**
- 🐍 Python 3.9+
- 📄 pdf2image - PDF conversion
- 👁️ Tesseract - OCR engine
- 🖼️ OpenCV - Computer vision
- 🗄️ Django ORM - Database

---

## 📚 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/health` | GET | Detailed system health |
| `/api/upload` | POST | Upload PDF file |
| `/api/extract/{batch_id}` | POST | Extract voter boxes |
| `/api/process-batch/{batch_id}` | POST | Run OCR + parsing |
| `/api/results/{batch_id}` | GET | Get processing results |
| `/api/batch/{batch_id}/status` | GET | Get batch status |
| `/api/constituencies` | GET | List constituencies |
| `/api/save-to-db` | POST | Save to PostgreSQL |
| `/api/docs` | GET | Interactive API docs |

---

## 🔧 Installation

### **Prerequisites:**
1. ✅ Python 3.9+ (already installed)
2. ✅ PostgreSQL (already running)
3. ❓ Node.js 18+ (required for React)
   - Download: https://nodejs.org/

### **Install Node.js:**
If you don't have Node.js:
1. Visit https://nodejs.org/
2. Download LTS version
3. Run installer
4. Verify: `node --version`

### **Install Dependencies:**
```powershell
# Backend (Python)
pip install -r backend\requirements.txt

# Frontend (Node.js)
cd frontend
npm install
```

---

## 🚀 Deployment

### **Development:**
```powershell
.\start.ps1  # Runs both services
```

### **Production (Docker):**
```powershell
docker-compose up -d
```

---

## ✨ Features

### **Current (v2.0):**
- ✅ PDF upload and validation
- ✅ Intelligent box detection
- ✅ Malayalam OCR processing
- ✅ Data validation & integrity check
- ✅ PostgreSQL database export
- ✅ RESTful API
- ✅ Modern React UI with Tailwind CSS
- ✅ Real-time progress tracking
- ✅ Batch processing support

### **Core Features (Protected):**
- ✅ High-DPI PDF to image conversion
- ✅ Computer vision box detection
- ✅ Malayalam character recognition
- ✅ Intelligent parsing with OCR error correction
- ✅ Auto-healing serial numbers
- ✅ Data flagging system

---

## 🎯 Usage Workflow

1. **Upload PDF** → Select voter list PDF file
2. **Extract Boxes** → Automatically detect voter records
3. **Process Data** → Run OCR and Malayalam parsing
4. **Review Results** → See clean vs. flagged records
5. **Export** → Save to PostgreSQL database

**All powered by your protected core modules!**

---

## 📊 Monitoring

### **API Health:**
```powershell
curl http://localhost:8000/api/health
```

### **Frontend Status:**
Check the top-right corner of the React app for system status indicator.

### **Logs:**
- Backend: Console output from `python main.py`
- Frontend: Browser dev console (F12)

---

## 🐛 Troubleshooting

### **Backend won't start:**
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r backend\requirements.txt

# Run backend
cd backend
python main.py
```

### **Frontend won't start:**
```powershell
# Install/reinstall packages
cd frontend
npm install

# Run frontend
npm run dev
```

### **"Node.js not found":**
1. Install from https://nodejs.org/
2. Restart terminal
3. Verify: `node --version`
4. Run `.\start.ps1` again

### **CORS errors:**
- Ensure backend is running on port 8000
- Ensure frontend is running on port 5173
- Check `backend/main.py` CORS settings

---

## 📖 Comparison: Old vs New

| Feature | Streamlit (Old) | React + FastAPI (New) |
|---------|----------------|----------------------|
| **UI** | Basic widgets | Modern, professional |
| **API** | None | Full REST API |
| **Mobile** | Limited | Responsive |
| **Scalability** | Single process | Separate services |
| **Deployment** | Streamlit Cloud | Docker, AWS, GCP |
| **Integration** | Limited | API for any client |
| **Core Changes** | 0 changes | 0 changes |

**Both use the same protected core modules!**

---

## 🔄 Migration Path

### **Week 1-2:**
- ✅ Backend API deployed
- ✅ Endpoints tested
- Keep Streamlit running

### **Week 3-4:**
- ✅ React UI deployed
- ✅ Both UIs available
- Users can choose

### **Month 2+:**
- New features in React
- Gradual migration
- Keep both running

### **Future:**
- Full React adoption
- Or keep both!
- Core stays protected

---

## 🛠️ Development

### **Add New Endpoint:**
```python
# backend/main.py
@app.get("/api/my-endpoint")
async def my_endpoint():
    # Import and use core modules
    from core.detector import VoterDetector
    detector = VoterDetector()
    
    # Use without modifying
    result = detector.detect_voter_boxes(image)
    return {"result": result}
```

### **Add New React Component:**
```jsx
// frontend/src/components/MyComponent.jsx
import api from '../api';

function MyComponent() {
  const onClick = async () => {
    const result = await api.myEndpoint();
    // Handle result
  };
  
  return (
    <button onClick={onClick} className="btn-primary">
      Click Me
    </button>
  );
}
```

---

## 📝 License & Credits

**Core extraction modules:**
- Proprietary, battle-tested, protected
- Zero modifications policy

**New UI/API:**
- Built by extending core via service layer
- Respects core module integrity

---

## 🎉 Success!

You now have a production-grade system with:
- ✅ Modern React UI with Tailwind CSS
- ✅ RESTful FastAPI backend
- ✅ **100% protected core extraction logic**
- ✅ Zero regression risk
- ✅ Scalable architecture
- ✅ Multiple deployment options

**Your battle-tested extraction pipeline powers it all!** 🚀

---

**Questions? Check:**
- API Docs: http://localhost:8000/api/docs
- GitHub Issues: (create repository)
- Core Protection: See `CORE_PROTECTION.md`
- React Migration: See `REACT_MIGRATION.md`
   
 