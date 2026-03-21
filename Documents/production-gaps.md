# Local Setup — What Users Need to Run Vocably

## Goal

All features in Vocably work correctly when run locally. This document covers what each feature requires, what users need to install, and the one platform issue that affects non-Windows users.

---

## Feature Status (Local)

| Feature | Works Locally? | Requires |
| --- | --- | --- |
| TTS (text → audio) | Yes | Python venv + `run.bat` |
| Voice + speed selection | Yes | Nothing extra |
| YouTube transcript fetch | Yes | Nothing extra |
| YouTube transcript clean | Yes | Ollama running + model pulled |
| Upload & Clean (SRT/VTT/TXT) | Yes | Ollama running + model pulled |
| PDF extract (digital) | Yes | Nothing extra |
| PDF extract (scanned/OCR) | Windows only | Tesseract installed at default path |

---

## What Users Must Install

### 1. Ollama

Required for: Upload & Clean, YouTube transcript cleaning.

Download from [ollama.com](https://ollama.com) and pull the model:

```bash
ollama pull qwen2.5:3b
```

Ollama must be **running** before starting the backend. It runs as a background service after installation — on Windows it starts automatically. On Linux/Mac, run `ollama serve` in a terminal first.

---

### 2. Tesseract OCR (for scanned PDFs only)

Required for: PDF files that are scans or images (not digitally created PDFs).

**Windows:**
Download the installer from [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki) and install to the default path:
```
C:\Program Files\Tesseract-OCR\
```
The path in `backend/main.py` is hardcoded to this location — install there exactly.

**Linux:**
```bash
sudo apt-get install -y tesseract-ocr
```
Then update line in `backend/main.py`:
```python
# Remove this line entirely on Linux — pytesseract finds it automatically:
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

**Mac:**
```bash
brew install tesseract
```
Same as Linux — remove the hardcoded path line from `backend/main.py`.

---

### 3. Python 3.10+ and Node.js

- Python 3.10 or higher for the backend venv
- Node.js 18+ for the frontend (`npm install`)

---

## Starting the App Locally

**Backend:**
```bash
cd backend
run.bat         # Windows
# or
venv/bin/python main.py   # Linux/Mac
```

**Frontend:**
```bash
npm install
npm run dev
```

Open `http://localhost:5173` — the app loads directly, no login required.

---

## Known Issues

### Scanned PDF OCR — Windows path hardcoded

The Tesseract path in `backend/main.py` is set to the Windows default install location. Linux and Mac users must remove that line for OCR to work. Digital PDFs (created by software, not scanned) work on all platforms without Tesseract.
