# Vocably

Full-stack text-to-speech web application powered by Kokoro-82M — React frontend, FastAPI backend. Includes an Upload & Clean pipeline for processing transcripts and PDFs before generating speech. Runs locally via `start.bat`.

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Vite
- **Backend:** FastAPI + Uvicorn, Kokoro-82M (PyTorch)
- **Upload & Clean:** Ollama (qwen2.5:3b) — local AI for transcript and PDF cleanup before TTS
- **YouTube Transcript:** `youtube-transcript-api` — scrapes closed-caption data directly from YouTube, no API key required

## Architecture

```
Browser (localhost:5173)
    │
    ├── POST /api/tts ──► Kokoro-82M ──► WAV
    │
    ├── POST /api/clean ──► detect format ──► parser + Ollama ──► clean text
    │
    ├── POST /api/extract-pdf ──► pymupdf / Tesseract OCR ──► Ollama ──► clean text
    │
    └── POST /api/youtube-transcript ──► extract video ID ──► youtube-transcript-api ──► Ollama ──► clean text
```

## Run Locally (Development)

**Prerequisites:** Node.js 18+, Python 3.10+, 4 GB RAM (model downloads ~500 MB on first run)

**Optional but recommended:**
- [Ollama](https://ollama.com) with `qwen2.5:3b` pulled — required for Upload & Clean and YouTube Transcript features
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) — required for scanned PDF extraction only

```bash
git clone https://github.com/AbdulGani11/Vocably.git
cd Vocably
```

**Install backend dependencies (first time only):**

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
cd ..
```

**Install frontend dependencies (first time only):**

```bash
cd frontend
npm install
cd ..
```

**Environment file (already in the repo — no secrets):**

`frontend/.env.development` — loaded automatically by `npm run dev`, points to `localhost:8000`.

**Windows:**

```bash
.\start.bat      # starts Ollama, backend, and frontend together
```

Open [http://localhost:5173](http://localhost:5173)

## Upload & Clean

The app accepts `.txt`, `.md`, `.srt`, `.vtt`, and `.pdf` files. Before the text reaches the TTS engine, a two-stage cleaning pipeline runs:

1. **Format parser (deterministic)** — strips timestamps, cue IDs, HTML tags from SRT/VTT; uses Tesseract OCR for scanned PDFs
2. **Ollama LLM (qwen2.5:3b)** — removes spoken filler words and cleans prose structure

Ollama is optional. If it is not running, the parsed text is loaded as-is.

## YouTube Transcript

Paste any YouTube URL into the YouTube input in the card header. The backend extracts the video ID, fetches closed-caption data directly from YouTube's servers (no API key required), and runs the same Ollama cleaning pipeline before loading the transcript into the textarea. Works with auto-generated and manual captions.

Supports URL formats: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`

## Documentation

See [Documents/documentation.md](Documents/documentation.md) — full technical reference covering setup, architecture, the Upload & Clean pipeline, AI concepts, and troubleshooting.

## License

MIT
