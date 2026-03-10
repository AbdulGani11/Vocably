# Vocably

Full-stack text-to-speech web application powered by Kokoro-82M — React frontend, FastAPI backend, Docker containerized. Includes an Upload & Clean pipeline for processing transcripts and PDFs before generating speech. Runs locally via `start.bat` or deployed on Render (frontend) + Hugging Face Spaces (backend).

## Live Deployment

| Layer           | URL                                                   |
| --------------- | ----------------------------------------------------- |
| **Frontend**    | https://vocably.onrender.com                          |
| **Backend API** | https://gilfoyle99213-vocably-backend.hf.space        |
| **API Health**  | https://gilfoyle99213-vocably-backend.hf.space/health |
| **API Docs**    | https://gilfoyle99213-vocably-backend.hf.space/docs   |

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Vite — deployed on Render
- **Backend:** FastAPI + Uvicorn, Kokoro-82M (PyTorch) — deployed on Hugging Face Spaces
- **Upload & Clean:** Ollama (qwen3.5:4b) — local AI for transcript and PDF cleanup before TTS
- **YouTube Transcript:** `youtube-transcript-api` — scrapes closed-caption data directly from YouTube, no API key required
- **Infra:** Docker (`python:3.11-slim`, non-root user, layer-cached build)

## Architecture

```
Browser (Render)
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

```bash
git clone https://github.com/AbdulGani11/Vocably.git
cd Vocably
```

**Environment files (already in the repo — no secrets):**

| File               | Used when       | Contains                         |
| ------------------ | --------------- | -------------------------------- |
| `.env.development` | `npm run dev`   | `localhost:8000` — local backend |
| `.env.production`  | `npm run build` | HF Spaces URL — cloud backend    |

> These files are committed because they contain **no secrets** — only public URLs.
> Vite automatically picks the correct file based on the command.

**Windows:**

```bash
.\start.bat      # starts backend + frontend together
```

Open [http://localhost:5173](http://localhost:5173)

## Upload & Clean

The app accepts `.txt`, `.md`, `.srt`, `.vtt`, and `.pdf` files. Before the text reaches the TTS engine, a two-stage cleaning pipeline runs:

1. **Format parser (deterministic)** — strips timestamps, cue IDs, HTML tags from SRT/VTT; uses Tesseract OCR for scanned PDFs
2. **Ollama LLM (qwen3.5:4b)** — removes spoken filler words and cleans prose structure

Ollama is optional. If it is not running, the parsed text is loaded as-is.

## YouTube Transcript

Paste any YouTube URL into the YouTube input in the card header. The backend extracts the video ID, fetches closed-caption data directly from YouTube's servers (no API key required), and runs the same Ollama cleaning pipeline before loading the transcript into the textarea. Works with auto-generated and manual captions.

Supports URL formats: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`

## Docker (Backend)

> **Beginners:** You do **not** need Docker for daily development. Use `.\start.bat` — it handles everything. Docker is only needed to test the containerized backend locally.

```bash
docker-compose up --build   # local container (port 8000)
docker-compose down
```

## Documentation

See [Documents/documentation.md](Documents/documentation.md) — full technical reference covering setup, architecture, the Upload & Clean pipeline, AI concepts, Docker, deployment, and troubleshooting.

## License

MIT
