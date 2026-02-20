# Vocably

Full-stack text-to-speech web application — FastAPI backend deployed on Hugging Face Spaces, React frontend, JWT-authenticated REST API, Docker containerized.

## Live Deployment

| Layer           | URL                                                   |
| --------------- | ----------------------------------------------------- |
| **Frontend**    | https://vocably.onrender.com                          |
| **Backend API** | https://gilfoyle99213-vocably-backend.hf.space        |
| **API Health**  | https://gilfoyle99213-vocably-backend.hf.space/health |
| **API Docs**    | https://gilfoyle99213-vocably-backend.hf.space/docs   |

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Vite — deployed on Render
- **Backend:** FastAPI + Uvicorn, Qwen3-TTS 1.7B (PyTorch) — deployed on Hugging Face Spaces
- **Auth:** JWT Bearer — HS256 signed tokens, `sessionStorage`, `Depends()` FastAPI dependency
- **Infra:** Docker (`python:3.11-slim`, non-root user, layer-cached build)

## Architecture

```
Browser (Render)
    │
    ├── POST /login  ──► FastAPI (HF Spaces) ──► validate_credentials() ──► JWT
    │
    └── POST /api/tts ─► Authorization: Bearer <token> ──► verify_token() ──► Qwen3-TTS ──► WAV
```

## Authentication

All `/api/tts` requests require a signed JWT. Login endpoint issues an HS256 token (8h expiry) stored in `sessionStorage`.

Default credentials: `vocably` / `vocably2026`
Override via env vars: `VOCABLY_USERNAME`, `VOCABLY_PASSWORD`, `JWT_SECRET_KEY`

## Run Locally (Development)

```bash
.\start.bat          # starts backend + frontend
# open http://localhost:5173
```

Prerequisites: Node.js 18+, Python 3.10+, 16 GB RAM (model downloads ~3.5 GB on first run)

## Docker (Backend)

```bash
docker-compose up --build   # local container (port 8000)
docker-compose down
```

## Documentation

See [documentation.md](documentation.md) — setup, auth flow, Docker, API reference, deployment, and concepts.
