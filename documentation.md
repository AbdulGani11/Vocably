# Vocably — Complete Documentation

A single reference covering everything about Vocably: what it is, how to run it, how it works, every concept and command, and how it's secured and deployed.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [File Structure](#4-file-structure)
5. [Quick Start](#5-quick-start)
6. [First Run Expectations](#6-first-run-expectations)
7. [Using the Application](#7-using-the-application)
8. [Authentication](#8-authentication)
9. [Docker](#9-docker)
10. [Deployment Platforms](#10-deployment-platforms)
11. [Backend Concepts — FastAPI](#11-backend-concepts--fastapi)
12. [Frontend Concepts](#12-frontend-concepts)
13. [AI & PyTorch Concepts](#13-ai--pytorch-concepts)
14. [Git & GitHub](#14-git--github)
15. [npm & Node.js](#15-npm--nodejs)
16. [Python & Virtual Environments](#16-python--virtual-environments)
17. [HTTP Status Codes](#17-http-status-codes)
18. [Troubleshooting](#18-troubleshooting)
19. [Performance Tips](#19-performance-tips)
20. [Quick Reference — Commands](#20-quick-reference--commands)
21. [Cloud Deployment](#21-cloud-deployment)
22. [FAQ](#22-faq)

---

## 1. Project Overview

Vocably is a full-stack text-to-speech application powered by the Qwen3-TTS 1.7B model. The React frontend is deployed on Render; the FastAPI backend runs in a Docker container on Hugging Face Spaces. It also runs fully locally via `start.bat` (no Docker required). It converts text to high-quality WAV audio via a JWT-authenticated REST API.

**Production-grade characteristics:**

- **JWT authentication** — every `/api/tts` request requires a signed HS256 Bearer token; unauthenticated requests return HTTP 401
- **Docker containerization** — backend packaged as a `python:3.11-slim` container with layer-cached `pip install`, non-root user, deployed to HF Spaces
- **Cloud deployed** — frontend on Render (CDN static site), backend on Hugging Face Spaces (Docker, CPU Basic, 16 GB RAM)
- **CPU-only inference** — runs without a GPU using `torch.inference_mode()` and `set_num_threads(os.cpu_count())`
- **Instruction-following voice control** — the 1.7B CustomVoice model accepts a natural language `instruct` string to control tone, pacing, and style

---

## 2. Tech Stack

### Frontend

| Technology            | Version | Purpose                                   |
| --------------------- | ------- | ----------------------------------------- |
| **React**             | 19.2.0  | UI library for component-based interfaces |
| **React DOM**         | 19.2.0  | React renderer for web browsers           |
| **Vite**              | 7.2.4   | Fast build tool and dev server with HMR   |
| **Tailwind CSS**      | 4.1.18  | Utility-first CSS framework               |
| **@tailwindcss/vite** | 4.1.18  | Vite plugin for Tailwind integration      |
| **clsx**              | 2.1.1   | Conditional className construction        |
| **tailwind-merge**    | 3.4.0   | Merges Tailwind classes without conflicts |

### Backend

| Technology       | Purpose                               |
| ---------------- | ------------------------------------- |
| **Python 3.10+** | Backend language                      |
| **FastAPI**      | Async web framework for REST APIs     |
| **Uvicorn**      | ASGI server for FastAPI               |
| **Pydantic**     | Data validation via Python type hints |

### Authentication

| Technology                    | Purpose                                         |
| ----------------------------- | ----------------------------------------------- |
| **python-jose[cryptography]** | JWT creation and verification (HS256)           |
| **passlib[bcrypt]**           | Password hashing utilities                      |
| **FastAPI HTTPBearer**        | Extracts Bearer token from Authorization header |

### AI / ML

| Technology       | Purpose                    |
| ---------------- | -------------------------- |
| **qwen-tts**     | Qwen3-TTS Python package   |
| **PyTorch**      | Deep learning framework    |
| **Transformers** | Hugging Face model library |
| **SoundFile**    | Audio file reading/writing |

### Model

| Model                               | Size    | Features                                     |
| ----------------------------------- | ------- | -------------------------------------------- |
| **Qwen3-TTS-12Hz-1.7B-CustomVoice** | ~3.5 GB | 10 voices, tone control via natural language |

### Containerization

| Tool                 | Purpose                                      |
| -------------------- | -------------------------------------------- |
| **Docker**           | Packages backend as a portable container     |
| **docker-compose**   | Orchestrates backend with model cache volume |
| **python:3.11-slim** | Minimal base image                           |

### Browser APIs

| API                     | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| **Fetch API**           | HTTP requests to backend                       |
| **Web Audio API**       | Audio playback via `<audio>` element           |
| **Blob API**            | Creating audio blob from base64                |
| **URL.createObjectURL** | Creating playable audio URLs                   |
| **sessionStorage**      | Secure JWT token storage (clears on tab close) |

---

## 3. Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER  ·  localhost:5173  ·  React 19 + Vite + Tailwind CSS  │
│                                                                 │
│  Login.jsx        — renders username/password form              │
│  Hero.jsx         — renders TTS input, voice/tone selectors     │
│  Navbar.jsx       — renders nav links + logout button           │
│                                                                 │
│  useAuth.js       — manages isAuthenticated state; stores JWT   │
│                     in sessionStorage; exposes login/logout     │
│  useTTS.js        — sends POST /api/tts with Bearer token;      │
│                     decodes base64 WAV into a Blob URL          │
│  App.jsx          — auth gate: renders Login or Hero based on   │
│                     sessionStorage.getItem("vocably_token")     │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ POST /login              │ POST /api/tts
               │ {username, password}     │ {text, voice, instruct}
               │                          │ Authorization: Bearer <JWT>
               ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND CONTAINER  ·  localhost:8000                           │
│  FastAPI + Uvicorn  ·  Docker: python:3.11-slim                 │
│                                                                 │
│  POST /login     — validate_credentials() → create_access_      │
│                    token() → returns {access_token, token_type} │
│  GET  /health    — returns {status, model, speakers}; public;   │
│                    used by Docker/load-balancer health checks   │
│  POST /api/tts   — Depends(verify_token) extracts + decodes JWT │
│                    → calls tts_model.generate_custom_voice()    │
│                    → returns base64-encoded WAV in JSON         │
│  GET  /docs      — auto-generated OpenAPI / Swagger UI          │
│                                                                 │
│  auth.py         — SECRET_KEY, HS256 signing/verification,      │
│                    HTTPBearer dependency, JWT expiry logic      │
│  CORS            — allows localhost:5173 + FRONTEND_URL env var │
└──────────────────────────────┬──────────────────────────────────┘
                               │ torch.inference_mode()
                               │ Python in-process call
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ML MODEL  ·  Qwen3-TTS-12Hz-1.7B-CustomVoice                  │
│  PyTorch + Transformers  ·  CPU float32  ·  ~6–8 GB RAM        │
│                                                                 │
│  Input  — text string + speaker name + instruct string          │
│  Output — WAV audio bytes (soundfile) → base64 → JSON           │
│  Cache  — ~/.cache/huggingface/hub (Docker named volume)        │
│  Warmup — one dummy generation at lifespan start to pre-init   │
│           lazy components before first real request             │
└─────────────────────────────────────────────────────────────────┘
```

---

### Auth Flow

```
Client                          FastAPI                       auth.py
  │                                │                             │
  │── POST /login ─────────────────►                             │
  │   {username, password}         │── validate_credentials() ──►│
  │                                │   compares against env vars │
  │                                │   or hardcoded defaults     │
  │                                │◄── True / False ────────────│
  │                                │                             │
  │                                │── create_access_token() ───►│
  │                                │   payload: {sub, exp}       │
  │                                │   signed: HS256 + SECRET_KEY│
  │                                │   expiry: 8 hours           │
  │◄── {access_token, token_type} ─│◄── encoded JWT ─────────────│
  │                                │                             │
  │  sessionStorage.setItem()      │                             │
  │  (clears on tab close)         │                             │
  │                                │                             │
  │── POST /api/tts ───────────────►                             │
  │   Authorization: Bearer <JWT>  │── Depends(verify_token) ───►│
  │                                │   HTTPBearer extracts token │
  │                                │   jwt.decode() validates    │
  │                                │   signature + expiry        │
  │                                │◄── {username} or HTTP 401 ──│
  │◄── base64 WAV (200) ───────────│                             │
  │    or {detail} (401) ──────────│                             │
```

---

### Data Flow: Text → Audio

```
User types text (max 3000 chars)
    │
    ▼
useTTS.js builds fetch() call
    → method: POST
    → headers: Content-Type: application/json
               Authorization: Bearer <token from sessionStorage>
    → body: { text, voice, language, instruct }
    │
    ▼
FastAPI TTSRequest (Pydantic)
    → validates field types; returns 422 on mismatch
    → verify_token() dependency runs first; returns 401 if invalid
    │
    ▼
tts_model.generate_custom_voice(text, speaker, instruct)
    → runs inside torch.inference_mode() — no gradient tracking
    → uses torch.set_num_threads(os.cpu_count()) — all CPU cores
    → returns WAV audio as numpy array + sample_rate
    │
    ▼
soundfile.write() → BytesIO buffer → base64.b64encode()
    → returned as JSON: { audio_base64, sample_rate, duration, ... }
    │
    ▼
Browser: atob(audio_base64) → Uint8Array → Blob("audio/wav")
    → URL.createObjectURL(blob) → <audio src> → browser plays WAV
    → URL.revokeObjectURL() called on unmount to free memory
```

---

## 4. File Structure

```
Vocably/
├── backend/
│   ├── auth.py             # JWT: token creation, verification, credential validation
│   ├── main.py             # FastAPI server — /login, /health, /api/tts endpoints
│   ├── requirements.txt    # Python dependencies (pinned versions)
│   ├── run.bat             # Backend startup script (local)
│   ├── Dockerfile          # Container definition (production/cloud)
│   ├── .dockerignore       # Excludes venv, .env, pycache from build context
│   └── qwen_env/           # Python virtual environment (local only, not in Docker)
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── DropupSelector.jsx   # Voice/Tone dropdown selector
│   │   │   └── ExampleSelector.jsx  # Example text presets
│   │   └── Navbar/
│   │       ├── FlyoutLink.jsx       # Animated nav links
│   │       ├── Logo.jsx             # App logo
│   │       ├── Navbar.jsx           # Navigation bar (+ logout button)
│   │       └── NavContent.jsx       # Nav menu content
│   ├── hooks/
│   │   ├── useAuth.js      # JWT auth: login, logout, getToken, sessionStorage
│   │   └── useTTS.js       # TTS API + Authorization header + 401 handling
│   ├── pages/
│   │   ├── Hero.jsx        # Main TTS UI
│   │   └── Login.jsx       # Authentication gate
│   ├── utils/
│   │   └── constants.js    # Voices, tones, examples config
│   ├── App.jsx             # Root: auth gate (Login → Hero)
│   ├── index.css           # Global styles
│   └── main.jsx            # Entry point
├── docker-compose.yml      # Backend service with HF model cache volume
├── start.bat               # Combined startup script (local)
├── .env                    # Environment variables (VITE_TTS_BACKEND_URL)
├── .gitignore
├── package.json
└── vite.config.js
```

---

## 5. Quick Start

### Prerequisites

- **Python 3.10+** installed and added to PATH
- **Node.js 18+** installed
- **16 GB RAM** minimum
- **~8 GB disk space** (model + dependencies)

### Option 1: Single Command (Recommended)

```bash
.\start.bat
```

Opens two terminal windows (backend + frontend) automatically.

### Option 2: Manual Start

**Terminal 1 — Backend:**

```bash
cd backend
.\run.bat
```

**Terminal 2 — Frontend:**

```bash
npm run dev
```

### Option 3: Docker (Backend in Container)

```bash
# Start backend in Docker
docker-compose up --build

# Start frontend normally
npm run dev
```

### Accessing the App

- **Frontend UI:** http://localhost:5173
- **API Health Check:** http://localhost:8000/health
- **API Docs (Swagger):** http://localhost:8000/docs

### Stopping Everything

```bash
# In each terminal:
Ctrl+C

# For Docker:
docker-compose down
```

---

## 6. First Run Expectations

| Step                   | What Happens                       | Time          |
| ---------------------- | ---------------------------------- | ------------- |
| Virtual environment    | Creates `qwen_env` folder          | ~10 seconds   |
| Install dependencies   | Downloads Python packages          | 2–5 minutes   |
| Download model         | Downloads ~3.5 GB from HuggingFace | 10–20 minutes |
| Load model             | Loads model into RAM               | 60–90 seconds |
| First generation       | Initial TTS generation             | 30–60 seconds |
| Subsequent generations | Faster after warmup                | 15–40 seconds |

> **Note:** After first run, startup takes only 30–60 seconds (model is cached).

---

## 7. Using the Application

### Basic Usage

1. Open http://localhost:5173 → **Login page appears**
2. Sign in with your credentials (see [Authentication](#8-authentication))
3. Type or paste text (max 3000 characters)
4. Click **Play** (black circle button)
5. Audio plays automatically when ready

### Selecting Voices

| Voice    | Gender | Best For               |
| -------- | ------ | ---------------------- |
| Vivian   | Female | General narration      |
| Ryan     | Male   | Professional content   |
| Elena    | Female | Warm, friendly tone    |
| Lucas    | Male   | Storytelling           |
| Isabella | Female | Expressive content     |
| Marcus   | Male   | Authoritative delivery |
| Aria     | Female | Soft, gentle narration |
| Daniel   | Male   | News/formal content    |
| Sophie   | Female | Conversational style   |
| Nathan   | Male   | Casual content         |

### Tone Control

| Tone         | Effect                    |
| ------------ | ------------------------- |
| **Default**  | Natural, neutral voice    |
| **Excited**  | Energetic, enthusiastic   |
| **Sad**      | Melancholic, somber       |
| **Angry**    | Aggressive, frustrated    |
| **Whisper**  | Soft, quiet, intimate     |
| **News**     | Professional anchor style |
| **Calm**     | Slow, peaceful, relaxed   |
| **Dramatic** | Theatrical, intense       |

> **Note:** Tone control requires the 1.7B model. The 0.6B model does not support instructions.

### Downloading Audio

1. Generate speech (click Play)
2. Click the **Download** button (activates after generation)
3. File saved as: `Vocably_[Voice]_[Timestamp].wav`

---

## 8. Authentication

### How It Works

Vocably uses **JWT (JSON Web Token)** authentication to protect the TTS endpoint.

```
POST /login  →  validate credentials  →  return signed JWT
                                               │
                                  sessionStorage (clears on tab close)
                                               │
POST /api/tts  →  Authorization: Bearer <token>  →  verify → 200 or 401
```

### Default Credentials

| Field    | Value         |
| -------- | ------------- |
| Username | `vocably`     |
| Password | `vocably2026` |

Override via environment variables:

```env
VOCABLY_USERNAME=your_username
VOCABLY_PASSWORD=your_password
```

### Token Details

| Property  | Value                                  |
| --------- | -------------------------------------- |
| Algorithm | HS256                                  |
| Expiry    | 8 hours                                |
| Storage   | `sessionStorage` (clears on tab close) |
| Transport | `Authorization: Bearer <token>` header |

**Why `sessionStorage` over `localStorage`?** sessionStorage clears when the browser tab closes, reducing the window for token theft if a user walks away from their machine.

### API Usage (Direct)

Get a token:

```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "vocably", "password": "vocably2026"}'
```

Use the token:

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"text": "Hello world", "voice": "Vivian"}'
```

### JWT Secret Key

```env
JWT_SECRET_KEY=your-strong-random-secret
```

If not set, a secure random key is auto-generated per server session. **Always set this explicitly in production.**

---

## 9. Docker

### Why Docker?

Docker packages the backend with all its dependencies into a portable container that runs identically on any machine — your laptop, a cloud VM, or Google Cloud Run.

### Dockerfile — Key Design Decisions

```dockerfile
FROM python:3.11-slim        # Small base image
RUN apt-get install gcc sox  # gcc for cryptography (JWT), sox for audio
COPY requirements.txt .      # ← Copy deps first (layer cache optimization)
RUN pip install -r ...       # ← Cached if requirements.txt unchanged
COPY main.py auth.py ./      # ← App code last (changes most often)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Layer caching:** `requirements.txt` is installed before app code. If only `main.py` changes, Docker skips the slow `pip install` layer on the next build.

**`0.0.0.0` vs `127.0.0.1`:** Inside a container, `127.0.0.1` only accepts connections from within the container. `0.0.0.0` accepts connections from the host machine — required for Docker.

**Model not baked in:** The Qwen3-TTS model (~3.5 GB) downloads at runtime from Hugging Face Hub. This keeps the image small and matches how Hugging Face Spaces works.

### docker-compose.yml

The compose file adds a **named volume** (`huggingface_cache`) that persists the downloaded model across container restarts — so you don't re-download 3.5 GB every time.

```bash
# Start (builds on first run)
docker-compose up --build

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

### Build Directly

```bash
cd backend
docker build -t vocably-backend .
docker run -p 8000:8000 --env JWT_SECRET_KEY=your-secret vocably-backend
```

### .dockerignore

Excludes from the build context: `qwen_env/`, `.env`, `__pycache__/`, `.git/`

This prevents secrets from being baked into the image and keeps the build context small.

---

## 10. Deployment Platforms

### Render (Frontend)

Render hosts the **frontend** as a static site (free tier). `npm run build` produces HTML/CSS/JS files that Render serves directly — no server needed.

Set `VITE_TTS_BACKEND_URL` in Render's environment variables to point to your HF Spaces backend URL.

### Hugging Face Spaces (Backend)

HF Spaces hosts the **backend** (FastAPI + Qwen3-TTS). Upload the `Dockerfile` and HF builds and runs it automatically. Free CPU instances have enough RAM to load the 1.7B model.

The model downloads from HF Hub on first startup. On the free tier, this happens every time the Space restarts (no persistent storage on free CPU tier).

### Why Split Frontend and Backend?

The frontend is ~200 KB of static files — any free host can serve it. The backend needs 6–8 GB of RAM just to load the model. Render's free tier can't handle it; HF Spaces can. They're connected by API calls with CORS configured to allow the Render frontend URL.

### Environment Variables

| Variable               | Where Set          | Purpose                         |
| ---------------------- | ------------------ | ------------------------------- |
| `VITE_TTS_BACKEND_URL` | `.env` / Render    | Frontend → backend URL          |
| `JWT_SECRET_KEY`       | `.env` / HF Spaces | JWT signing secret              |
| `FRONTEND_URL`         | HF Spaces          | Added to CORS allowed origins   |
| `VOCABLY_USERNAME`     | `.env` optional    | Override default login username |
| `VOCABLY_PASSWORD`     | `.env` optional    | Override default login password |

---

## 11. Backend Concepts — FastAPI

### What is FastAPI?

A Python framework for building web APIs. In Vocably, the frontend sends text + a JWT to the backend, and the backend returns generated audio.

### Endpoints

| Method | Path       | Auth             | Purpose                          |
| ------ | ---------- | ---------------- | -------------------------------- |
| GET    | `/`        | Public           | Root health check                |
| GET    | `/health`  | Public           | Model load status                |
| POST   | `/login`   | Public           | Returns JWT on valid credentials |
| POST   | `/api/tts` | **JWT required** | Generates speech from text       |
| GET    | `/docs`    | Public           | Interactive Swagger UI           |

### Pydantic Models

Pydantic validates request data automatically:

```python
class LoginRequest(BaseModel):
    username: str
    password: str

class TTSRequest(BaseModel):
    text: str
    voice: str = "Vivian"        # Default if not provided
    language: str = "Auto"
    instruct: Optional[str] = None
```

If the frontend sends data that doesn't match, FastAPI automatically returns 422.

### FastAPI Depends (Dependency Injection)

`Depends()` lets you declare reusable logic that runs before an endpoint:

```python
@app.post("/api/tts")
async def text_to_speech(
    request: TTSRequest,
    token_data: dict = Depends(verify_token),  # Runs verify_token first
):
    ...
```

If `verify_token` raises an exception (401), the endpoint never runs.

### CORS (Cross-Origin Resource Sharing)

Browsers block API calls between different origins (different ports count). CORS lets the server say "yes, I accept requests from that origin."

```python
ALLOWED_ORIGINS = ["http://localhost:5173"]
if os.environ.get("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_headers=["Content-Type", "Authorization"],  # Authorization needed for JWT
)
```

### JWT in FastAPI

```python
# auth.py
from jose import jwt

def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(UTC) + timedelta(hours=8)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials = Depends(HTTPBearer())) -> dict:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    return {"username": payload.get("sub")}
```

### Lifespan

Runs code at server start (before any requests) and stop:

```python
@asynccontextmanager
async def lifespan(app):
    load_model()      # Runs BEFORE server accepts requests
    run_warmup()
    yield             # Server is live
    logger.info("Shutting down")  # Runs AFTER server stops
```

### Base64 Audio Transport

The backend generates WAV audio (binary), encodes it to base64 (text), and sends it in JSON. The frontend decodes it back.

```
Audio bytes → base64 encode → JSON string → base64 decode → Blob URL → <audio>
  (server)                    (network)                    (browser)
```

### Environment Variables

```python
os.environ.get("JWT_SECRET_KEY")    # Returns None if not set
os.environ.get("FRONTEND_URL", "")  # Returns "" as default
```

---

## 12. Frontend Concepts

### Vite

Build tool and dev server:

- `npm run dev` → localhost:5173 with hot reload
- `npm run build` → optimised static files in `dist/`

### React Hooks Used

| Hook          | File               | Purpose                                 |
| ------------- | ------------------ | --------------------------------------- |
| `useAuth`     | `hooks/useAuth.js` | JWT login/logout/token management       |
| `useTTS`      | `hooks/useTTS.js`  | TTS API calls, audio playback, download |
| `useState`    | throughout         | Component state                         |
| `useRef`      | useTTS             | Audio element + blob URL refs           |
| `useEffect`   | useTTS             | Cleanup blob URLs on unmount            |
| `useCallback` | useAuth            | Stable function references              |

### Auth State Flow

```
sessionStorage.getItem("vocably_token")
        │
    has token?
     ├─ Yes → isAuthenticated = true → show Hero
     └─ No  → isAuthenticated = false → show Login
```

### Blob URLs

After decoding the base64 audio:

```js
const blob = new Blob([audioBytes], { type: "audio/wav" });
const url = URL.createObjectURL(blob); // blob:http://localhost:5173/abc-123
// ...use url as audio src or download link...
URL.revokeObjectURL(url); // Free memory when done
```

### Tailwind CSS JIT

Tailwind scans JSX for class names at build time. Dynamic class construction breaks this:

```jsx
// BROKEN — Tailwind never sees the full class name
<i className={`text-${color}-600`} />;

// CORRECT — full class string visible to scanner
const COLOR_MAP = { purple: "text-purple-600" };
<i className={COLOR_MAP[color]} />;
```

---

## 13. AI & PyTorch Concepts

### Training vs Inference

- **Training** — gradient-based weight optimization over a dataset; computationally expensive, GPU-bound, done once by the model authors
- **Inference** — forward pass through fixed weights to generate output; what Vocably does on every TTS request; CPU-feasible for 1.7B parameter models

### Model Parameters (1.7B)

Each parameter is a floating-point weight that defines the model's learned behavior:

- `float32` → 1.7B × 4 bytes ≈ 6.8 GB in RAM (Vocably uses this on CPU)
- `float16` → 1.7B × 2 bytes ≈ 3.4 GB (GPU half-precision; not used here)

The download is ~3.5 GB (quantized checkpoints); RAM usage expands to ~6–8 GB after loading.

### torch.inference_mode()

`inference_mode()` disables autograd (the computation graph PyTorch builds for backpropagation), reducing memory overhead and improving forward-pass speed during inference:

```python
with torch.inference_mode():
    wavs, sr = tts_model.generate_custom_voice(text="Hello")
```

### torch.set_num_threads()

Configures PyTorch's intra-op parallelism — number of CPU threads used within a single operation. Setting this to `os.cpu_count()` saturates all logical cores:

```python
torch.set_num_threads(os.cpu_count())  # e.g. 16 threads on an Intel i5-1340P
```

### Warmup Generation

PyTorch initializes certain internal components (e.g. MKLDNN primitives, memory allocators) lazily on the first forward pass. A warmup call at startup absorbs this latency before any real user request:

```python
tts_model.generate_custom_voice(text="Hello.", speaker="Vivian")
# Runs inside lifespan() — server not marked ready until this completes
```

### Hugging Face Hub

`huggingface_hub` downloads model weights and tokenizer files on first use, caching them at `~/.cache/huggingface/hub/`. In Docker, the `huggingface_cache` named volume mounts this path to persist the cache across container restarts.

---

## 14. Git & GitHub

**Git** tracks changes to your files. **GitHub** hosts repositories online.

### Key Commands

```bash
git init                   # Turn folder into a git repo
git status                 # See what's changed and staged
git add <file>             # Stage a file for the next commit
git add .                  # Stage everything
git commit -m "message"    # Save staged changes
git push                   # Upload to GitHub
git clone <url>            # Download a repo
git log                    # See commit history
```

### .gitignore

```
node_modules/    # Trailing slash = ignore entire folder
*.log            # Wildcard — matches any .log file
.env             # Exact filename
.env.*           # Matches .env.local, .env.production, etc.
```

If a file is already tracked, add it to `.gitignore` then:

```bash
git rm --cached <filename>
```

---

## 15. npm & Node.js

**Node.js** runs JavaScript outside a browser. **npm** manages JavaScript packages.

### Key Commands

```bash
npm install        # Download all dependencies into node_modules/
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Create production bundle in dist/
npm audit          # Check for security issues
npm audit fix      # Auto-fix what it can
```

### package.json vs package-lock.json

- **package.json** — lists what packages you want and roughly what version
- **package-lock.json** — exact versions actually installed. Always commit it.

### node_modules/

Hundreds of MB. Never commit — npm recreates it from `package-lock.json` with `npm install`.

---

## 16. Python & Virtual Environments

A venv is an isolated Python environment with its own packages, preventing dependency clashes between projects.

In Vocably: `backend/qwen_env/`

### Key Commands

```bash
# Create venv
python -m venv qwen_env

# Activate (Windows)
call "qwen_env\Scripts\activate.bat"

# Install from file
pip install -r requirements.txt

# List installed packages
pip freeze

# Check specific package
pip show qwen-tts
```

### requirements.txt

```
qwen-tts==0.0.5               # Pinned — always installs this exact version
fastapi==0.128.0
uvicorn[standard]==0.40.0
soundfile==0.13.1
python-jose[cryptography]==3.3.0   # JWT signing/verification
passlib[bcrypt]==1.7.4             # Password hashing
```

Pinned versions ensure identical installs everywhere — on your laptop and on HF Spaces.

---

## 17. HTTP Status Codes

| Code | Meaning               | When Vocably Uses It                      |
| ---- | --------------------- | ----------------------------------------- |
| 200  | OK                    | Successful login or audio generation      |
| 400  | Bad Request           | Text field is empty                       |
| 401  | Unauthorized          | Missing, invalid, or expired JWT          |
| 422  | Unprocessable Entity  | Request body doesn't match Pydantic model |
| 503  | Service Unavailable   | Model hasn't finished loading             |
| 500  | Internal Server Error | TTS generation failed                     |

---

## 18. Troubleshooting

### Login page doesn't appear

- Make sure the frontend is running: `npm run dev`
- Open http://localhost:5173 (not 8000)

### "Cannot connect to TTS server"

- Make sure the backend terminal shows `Uvicorn running on http://127.0.0.1:8000`
- Check port 8000 is available
- Run `python main.py` manually in the backend folder

### "Invalid username or password"

- Default credentials: `vocably` / `vocably2026`
- Check if `VOCABLY_USERNAME`/`VOCABLY_PASSWORD` env vars are set

### "Session expired. Please log in again."

- Your JWT expired (8-hour window) or was tampered with
- Log out and log back in

### Generation takes too long

- First generation is slowest (30–60 seconds)
- Try shorter text (under 100 characters for testing)
- Close other heavy applications to free RAM/CPU

### High CPU/memory usage

- **Normal:** 60–80% CPU during generation
- **Normal:** 80–90% memory with model loaded

### Docker: `localhost:8000` not responding right after start

- The server waits until the model finishes loading before accepting requests
- Wait for: `INFO:main:Warmup complete. Server is ready.`

### Docker: SoX warning

- `WARNING:sox:SoX could not be found!` is harmless — just a missing audio tool
- Fixed in the current `Dockerfile` (sox is installed via apt-get)

### Audio doesn't play

- Check browser console (F12) for errors
- Ensure volume is not muted
- Try a different browser

---

## 19. Performance Tips

1. **Use shorter text** for faster generation
2. **Close unused apps** to free RAM
3. **Keep the backend running** — don't restart unnecessarily
4. **Plug in your laptop** — prevents CPU throttling on battery
5. **Docker volume** — the `huggingface_cache` named volume in `docker-compose.yml` prevents the model from re-downloading on every container restart

---

## 20. Quick Reference — Commands

| What                          | Command                                | Where                    |
| ----------------------------- | -------------------------------------- | ------------------------ |
| Start everything locally      | `.\start.bat`                          | Project root             |
| Start backend only            | `.\run.bat`                            | `backend/`               |
| Start frontend only           | `npm run dev`                          | Project root             |
| Build frontend for deployment | `npm run build`                        | Project root             |
| Start backend in Docker       | `docker-compose up --build`            | Project root             |
| Stop Docker                   | `docker-compose down`                  | Project root             |
| Activate Python venv          | `qwen_env\Scripts\activate`            | `backend/`               |
| Install Python packages       | `pip install -r requirements.txt`      | `backend/` (venv active) |
| Check installed packages      | `pip freeze`                           | `backend/` (venv active) |
| Check security issues         | `npm audit`                            | Project root             |
| See what git will push        | `git status`                           | Project root             |
| Access UI                     | http://localhost:5173                  | Browser                  |
| Access API docs               | http://localhost:8000/docs             | Browser                  |
| API health check              | http://localhost:8000/health           | Browser                  |
| Change voice                  | Dropdown in UI (bottom-left)           | UI                       |
| Change tone                   | Tone buttons below text area           | UI                       |
| Download audio                | Button next to Play (after generation) | UI                       |
| Log out                       | "Log out" button (top-right of navbar) | UI                       |

---

## 21. Cloud Deployment

Vocably runs as two independently deployed services: the **React frontend on Render** (static site CDN) and the **FastAPI backend on Hugging Face Spaces** (Docker container). They communicate over HTTPS — the frontend sends JWT-authenticated POST requests to the backend API.

---

### Architecture

```
User Browser
    │
    ▼
Render CDN  (vocably.onrender.com)
    │   React app (static files: HTML, JS, CSS)
    │   Built with: npm run build → dist/
    │
    │  POST /login  ──────────────────────────────────────────────►
    │  POST /api/tts  Authorization: Bearer <JWT>  ───────────────►
    │                                                              │
    │                                               Hugging Face Spaces
    │                                               (gilfoyle99213-vocably-backend.hf.space)
    │                                               Docker container · CPU Basic · 16 GB RAM
    │                                               FastAPI · Uvicorn · port 7860
    │                                               Qwen3-TTS model (downloaded at runtime)
    │
    │◄── {access_token} / base64 WAV ◄───────────────────────────
```

---

### Backend — Hugging Face Spaces (Docker)

**Why HF Spaces:** Free tier provides 16 GB RAM and 50 GB disk — enough for the 3.5 GB Qwen3-TTS model. CPU Basic costs nothing. No credit card required. HF Hub also handles model caching natively.

**Why not GCP Cloud Run:** Cloud Run bills per CPU-second during inference. A 3.5 GB model inference request could trigger unexpected charges. HF Spaces is the pragmatic choice for an ML demo — evaluated Cloud Run and made an explicit decision.

#### What Hugging Face Spaces expects from a Docker container

- Listens on **port 7860** (HF injects `PORT=7860` as an env var)
- Runs as a **non-root user** (UID 1000) — HF security requirement
- Files must be `--chown=user` so the non-root user can read them

#### Dockerfile — key decisions

```dockerfile
FROM python:3.11-slim
# 3.11-slim: minimal attack surface, ~50 MB vs ~900 MB for full image

RUN apt-get install -y gcc sox
# gcc: compiles cryptography package (required by python-jose for JWT)
# sox: suppresses SoX audio warning on model startup

RUN useradd -m -u 1000 user
USER user
ENV PATH=/home/user/.local/bin:$PATH
# Non-root user: required by HF Spaces; limits blast radius if container is compromised

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=user main.py auth.py ./
# requirements.txt copied BEFORE app code:
# Docker caches each RUN layer. If only main.py changes, Docker reuses the pip
# install layer — saves 3-5 minutes on every redeploy.

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
# Shell form (not JSON array): enables ${PORT:-7860} variable substitution.
# JSON array form ["uvicorn", ..., "--port", "7860"] does NOT expand env vars.
# HF Spaces injects PORT=7860; local docker-compose sets PORT=8000.
# --host 0.0.0.0: binds to all interfaces — required inside a container.
# (127.0.0.1 only accepts connections from within the container itself.)
```

#### Steps to deploy backend to HF Spaces

```bash
# 1. Create Space at huggingface.co/new-space
#    SDK: Docker | Hardware: CPU Basic (free) | Visibility: Public

# 2. Clone the Space repo
git clone https://huggingface.co/spaces/Gilfoyle99213/vocably-backend hf-vocably-backend
cd hf-vocably-backend

# 3. Copy backend files
Copy-Item ..\Vocably\backend\Dockerfile .
Copy-Item ..\Vocably\backend\main.py .
Copy-Item ..\Vocably\backend\auth.py .
Copy-Item ..\Vocably\backend\requirements.txt .

# 4. Commit and push — HF Spaces triggers a Docker build automatically
git add .
git commit -m "Deploy Vocably backend to HF Spaces"
git push
# When prompted for password: use HF access token (huggingface.co/settings/tokens)
# Token must have Write permission

# 5. Set environment variables in HF Spaces UI
#    Space → Settings → Variables and secrets → New secret:
#    JWT_SECRET_KEY   = <strong random string>
#    FRONTEND_URL     = https://vocably.onrender.com   ← fixes CORS
#    VOCABLY_USERNAME = vocably
#    VOCABLY_PASSWORD = vocably2026
```

#### Verify backend is live

```bash
curl https://gilfoyle99213-vocably-backend.hf.space/health
# Expected: {"status":"ok","model_loaded":true}

curl -X POST https://gilfoyle99213-vocably-backend.hf.space/login \
  -H "Content-Type: application/json" \
  -d '{"username":"vocably","password":"vocably2026"}'
# Expected: {"access_token":"eyJ...","token_type":"bearer"}
```

---

### Frontend — Render (Static Site)

**Why Render:** Free static site hosting with CDN, automatic HTTPS, and GitHub auto-deploy on push. Correct choice for a Vite/React app — no server needed, just pre-built static files.

**Why static hosting:** `npm run build` produces HTML + JS + CSS in `dist/`. No Node.js runtime is needed at serve time — a CDN serves the files directly. This is faster and cheaper than a Node server.

#### Environment variable

The frontend needs to know where the backend is:

```
VITE_TTS_BACKEND_URL = https://gilfoyle99213-vocably-backend.hf.space
```

`VITE_` prefix is required — Vite only injects env vars with this prefix into the browser bundle at build time. Variables without it are not exposed to client code.

#### Steps to deploy frontend to Render

```
1. Push Vocably repo to GitHub (github.com/AbdulGani11/Vocably)

2. render.com → New → Static Site
   Connect GitHub → select Vocably repo

3. Configure:
   Name:              vocably
   Build Command:     npm install && npm run build
   Publish Directory: dist

4. Add Environment Variable:
   VITE_TTS_BACKEND_URL = https://gilfoyle99213-vocably-backend.hf.space

5. Deploy
   Render runs: npm install && npm run build
   Serves dist/ from CDN at: https://vocably.onrender.com
```

**Note:** Render free tier spins down after 15 minutes of inactivity (for web services). Static sites do not spin down — they're always-on because files are served directly by the CDN.

---

### CORS — connecting frontend to backend

CORS (Cross-Origin Resource Sharing) is the browser's mechanism for blocking cross-origin requests unless the server explicitly allows them.

**Problem:** Frontend is at `vocably.onrender.com`, backend is at `gilfoyle99213-vocably-backend.hf.space` — different origins. Browser blocks the request by default.

**Solution:** `main.py` uses `CORSMiddleware` with `allow_origins` read from the `FRONTEND_URL` env var:

```python
ALLOWED_ORIGINS = [os.getenv("FRONTEND_URL", "http://localhost:5173")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],  # Authorization required for JWT
)
```

Setting `FRONTEND_URL=https://vocably.onrender.com` in HF Spaces secrets allows the deployed frontend exactly — nothing else. A wildcard `"*"` origin would work but is a security misconfiguration on an authenticated API.

---

### Environment Variables Summary

| Variable               | Where set         | Purpose                                                        |
| ---------------------- | ----------------- | -------------------------------------------------------------- |
| `VITE_TTS_BACKEND_URL` | Render dashboard  | Frontend → backend URL (injected at build time)                |
| `JWT_SECRET_KEY`       | HF Spaces secrets | Signs/verifies JWT tokens                                      |
| `FRONTEND_URL`         | HF Spaces secrets | CORS allowed origin                                            |
| `VOCABLY_USERNAME`     | HF Spaces secrets | Login credential (optional override)                           |
| `VOCABLY_PASSWORD`     | HF Spaces secrets | Login credential (optional override)                           |
| `PORT`                 | HF Spaces (auto)  | Uvicorn port — HF injects 7860; local docker-compose sets 8000 |

---

### Live URLs

| Layer       | URL                                                   |
| ----------- | ----------------------------------------------------- |
| Frontend    | https://vocably.onrender.com                          |
| Backend API | https://gilfoyle99213-vocably-backend.hf.space        |
| API Health  | https://gilfoyle99213-vocably-backend.hf.space/health |
| API Docs    | https://gilfoyle99213-vocably-backend.hf.space/docs   |

---

### GitHub Push — Safe Practices

`.gitignore` excludes all secrets and generated files:

```gitignore
.env        # VITE_TTS_BACKEND_URL — never committed
.env.*      # all env variants

node_modules/       # reinstalled by npm install
dist/               # rebuilt by npm run build
backend/qwen_env/   # rebuilt by pip install
__pycache__/        # Python bytecode
```

**Standard push workflow:**

```bash
git add <specific files>    # never: git add .  — review what you're adding
git status                  # confirm no secrets are staged
git commit -m "message"
git pull origin main --rebase   # sync remote changes before pushing
git push
```

`git pull --rebase` is preferred over `git pull` (merge): keeps the commit history linear — no unnecessary merge commits when syncing before a push.

---

## 22. FAQ

---

**Q: Can I delete the `welcome-to-docker` container and image from Docker Desktop?**

Yes. It is Docker's built-in tutorial container — created automatically when you first installed Docker Desktop. It has no relation to Vocably. Delete both the container and the image (`docker/welcome-to-docker`) from Docker Desktop → Containers and Docker Desktop → Images.

---

**Q: Does the HF Spaces server take ~2–3 minutes to start every time a user visits?**

No — only on container restart. The container runs continuously on HF Spaces servers. The 2–3 minute startup (model download + warmup generation) happens once when the container boots. After that, every request is just inference time (~5–30 seconds depending on text length). Container restarts are triggered by: adding/changing environment variables, pushing a new deployment, or a crash — not by individual user visits.

---

**Q: Do I need to keep Docker Desktop running on my Windows machine for the deployed app to work?**

No. The deployed app (`vocably.onrender.com` → `gilfoyle99213-vocably-backend.hf.space`) runs entirely on cloud servers. Docker Desktop on your local machine is only needed when developing locally with `docker-compose up`. You can close Docker Desktop when not doing local development — it has no effect on the live deployment.

---

**Q: Why does HF Spaces restart when I add a new environment variable?**

Adding or changing any secret or variable in HF Spaces Settings triggers an automatic container restart so the new value is picked up by the running process. The restart takes 2–3 minutes including model warmup. This is expected behaviour — not a bug.

---

**Q: The frontend is at a different URL than the backend. Why doesn't the browser block the request?**

The browser enforces CORS (Cross-Origin Resource Sharing) — by default it blocks requests from one origin (e.g., `vocably.onrender.com`) to a different origin (e.g., `gilfoyle99213-vocably-backend.hf.space`). The FastAPI backend explicitly allows the frontend origin via `CORSMiddleware` with `allow_origins=[FRONTEND_URL]`. Without this, every API call from the deployed frontend would be blocked by the browser before it even reaches the server.

---

**Q: Why does TTS generation take 3–8 minutes on the deployed app? Other platforms are instant.**

Other platforms (ElevenLabs, Google TTS, etc.) run on cloud GPUs and use heavily optimized or proprietary models — both cost money. Vocably's free tier on Hugging Face Spaces runs on 2 shared vCPUs with no GPU. Qwen3-TTS 1.7B generates audio token-by-token; on a GPU this takes 5–10 seconds, on CPU it takes minutes.

The explicit trade-off: zero infrastructure cost vs. inference latency. For a portfolio project this is acceptable — the architecture (JWT auth, Docker containerization, cloud deployment, CORS) is what the project demonstrates, not production-grade latency. Upgrading to an HF Spaces GPU (T4 Small, ~$0.60/hr on-demand) would bring inference to under 10 seconds.
