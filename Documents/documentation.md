# Vocably — Complete Technical Documentation

A single reference that covers everything about Vocably: what it is, why every technical choice was made, how each component is implemented, and how they all connect. Written for beginners who are learning and mid-level engineers who want to understand the architecture.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack — What, Why, and How](#2-tech-stack--what-why-and-how)
3. [Architecture — How the System Fits Together](#3-architecture--how-the-system-fits-together)
4. [File Structure](#4-file-structure)
5. [Running Locally](#5-running-locally)
6. [First Run Expectations](#6-first-run-expectations)
7. [Using the Application](#7-using-the-application)
8. [Authentication — JWT from First Principles](#8-authentication--jwt-from-first-principles)
9. [Upload & Clean — The Text Preparation Pipeline](#9-upload--clean--the-text-preparation-pipeline)
10. [Backend Deep Dive — FastAPI](#10-backend-deep-dive--fastapi)
11. [Frontend Deep Dive — React & Vite](#11-frontend-deep-dive--react--vite)
12. [AI & ML Concepts — Kokoro-82M](#12-ai--ml-concepts--kokoro-82m)
13. [Docker & Containerization](#13-docker--containerization)
14. [Cloud Deployment — Render + Hugging Face Spaces](#14-cloud-deployment--render--hugging-face-spaces)
15. [HTTP Status Codes Reference](#15-http-status-codes-reference)
16. [Troubleshooting](#16-troubleshooting)
17. [Performance Notes](#17-performance-notes)
18. [Quick Reference — Commands](#18-quick-reference--commands)
19. [FAQ](#19-faq)

---

## 1. Project Overview

Vocably is a full-stack text-to-speech (TTS) application. You type or paste text — or upload a file — and the app converts it to high-quality spoken audio using an AI model called Kokoro-82M.

### What makes it production-grade

Most tutorial TTS projects are a single Python script that generates a WAV file. Vocably is structured like a real application:

| Concern              | How Vocably handles it                                   |
| -------------------- | -------------------------------------------------------- |
| Security             | Every TTS request requires a signed JWT; unauthenticated requests are rejected with HTTP 401 |
| Concurrency          | Kokoro runs in a thread pool, so the HTTP server stays responsive while audio is generating |
| Startup safety       | The Play button stays disabled until the server is fully ready (model loaded, voice warmed up) |
| Text preprocessing   | Uploaded transcripts and PDFs are cleaned by an LLM before reaching the TTS engine |
| Deployment           | Frontend on a CDN, backend in a Docker container — each hosted on its optimal platform |
| Portability          | Docker packages the backend with all dependencies so it runs identically locally and in the cloud |

---

## 2. Tech Stack — What, Why, and How

Every tool in this project was chosen deliberately. This section explains each one: what it is, why it was selected, and how it is actually used in the code.

---

### 2.1 React 19

**What it is:** React is a JavaScript library for building user interfaces. Instead of manipulating the HTML document directly, you describe what the UI should look like as a function of state, and React updates the DOM automatically when that state changes.

**Why we chose it:** React's component model makes it easy to isolate the TTS card, the voice selector, the upload button, and the status banner into separate pieces that each manage their own state. The `useState` and `useEffect` hooks let us express complex UI logic — like polling the server every 2.5 seconds — as straightforward functions.

**How it's used in Vocably:** The entire UI is built from React components. `Hero.jsx` renders the main TTS card. `App.jsx` acts as the authentication gate — it checks `sessionStorage` for a token and renders either the `Login` page or the `Hero` page accordingly.

```jsx
// App.jsx — the root authentication gate
const isAuthenticated = !!sessionStorage.getItem("vocably_token");

return isAuthenticated ? <Hero /> : <Login />;
```

---

### 2.2 Vite

**What it is:** Vite is a build tool and development server for frontend projects. During development it serves files instantly using native ES modules (no bundling step). For production it uses Rollup to bundle and minify the code into optimised static files in a `dist/` folder.

**Why we chose it:** The alternative (webpack) has a noticeably slower dev server. Vite's hot module replacement (HMR) updates the browser in milliseconds when a file changes, which speeds up the development loop significantly.

**How it's used in Vocably:** `npm run dev` starts Vite's dev server on port 5173 with HMR. `npm run build` generates the production bundle. Vite also handles environment variables — any variable prefixed with `VITE_` in a `.env` file is injected into the JavaScript bundle at build time.

```js
// Reading the backend URL injected by Vite at build time
const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";
```

This is why the frontend knows which backend URL to call even after it's deployed as static files — the URL was baked in during `npm run build`.

---

### 2.3 Tailwind CSS v4

**What it is:** Tailwind is a CSS framework based on utility classes. Instead of writing `.tts-card { border-radius: 16px; background: white; }` in a separate CSS file, you write `rounded-2xl bg-white` directly on the element.

**Why we chose it:** Utility-first CSS eliminates the problem of naming things and avoids accumulating dead CSS. Every style is explicit and co-located with the markup that uses it. Tailwind v4 uses a new Vite-native plugin that requires zero configuration files.

**How it's used in Vocably:** Every UI element is styled with Tailwind classes. Conditional classes are constructed using `clsx` (a small library that joins class strings conditionally).

```jsx
// Play button changes colour based on three states
<button
  className={`rounded-full text-white ${
    isLoading || !backendReady
      ? "bg-neutral-400 cursor-wait"    // greyed out while not ready
      : isSpeaking
        ? "bg-red-500 hover:bg-red-600" // red Stop button
        : "bg-neutral-900 hover:bg-black" // normal Play button
  }`}
>
```

**Important caveat:** Tailwind's scanner reads class names at build time by scanning source files. Dynamic class construction breaks this because Tailwind never sees the full class string. Always write full class names, never build them from fragments.

```jsx
// BROKEN — Tailwind never sees "text-red-600" or "text-green-600"
<p className={`text-${isError ? "red" : "green"}-600`} />

// CORRECT — both full class names are visible to the scanner
<p className={isError ? "text-red-600" : "text-green-600"} />
```

---

### 2.4 Python 3.11 + FastAPI

**What it is:** FastAPI is a Python web framework for building APIs. It uses Python type hints to automatically validate incoming request data, serialize responses, and generate interactive API documentation (Swagger UI at `/docs`).

**Why we chose it:** The alternative for a Python TTS backend would be Flask or Django. Flask is synchronous by default — running Kokoro inside it would block the entire server for ~11 seconds per request. FastAPI is built on ASGI (the async equivalent of WSGI), which means it can serve multiple concurrent requests while one is waiting for the TTS thread. Django is too large for a focused API backend.

**How it's used in Vocably:** FastAPI handles all five endpoints: `/login`, `/api/tts`, `/api/voices`, `/api/clean`, and `/api/extract-pdf`. Pydantic models define the shape of every request and response.

```python
# Pydantic model — FastAPI validates the incoming JSON against this automatically
class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "af_heart"
    speed: Optional[float] = 1.0

@app.post("/api/tts", response_model=TTSResponse)
async def generate_speech(request: TTSRequest, payload: dict = Depends(verify_token)):
    # request.text, request.voice, request.speed are already validated
    # payload contains {"username": "vocably"} — already decoded from the JWT
```

If the frontend sends `speed: "fast"` instead of a number, FastAPI automatically returns HTTP 422 before the function even runs.

---

### 2.5 Uvicorn

**What it is:** Uvicorn is an ASGI server — the process that actually binds to a port and hands incoming HTTP connections to the FastAPI application. Think of it as the "web server" layer; FastAPI is the "application" layer.

**Why we chose it:** Uvicorn is the recommended ASGI server for FastAPI. It uses `asyncio` natively and supports `--reload` for automatic restart during development. The `[standard]` extras install `uvloop` (a faster event loop) and `websockets` support.

**How it's used in Vocably:** `main.py` calls `uvicorn.run("main:app", host="0.0.0.0", port=8000)` as its entry point. In Docker, the Dockerfile runs Uvicorn directly: `CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}`.

---

### 2.6 Kokoro-82M

**What it is:** Kokoro-82M is an open-source text-to-speech model with 82 million parameters, built on StyleTTS2 architecture. It takes a string of text, a voice identifier, and a speed multiplier, and produces a numpy array of 24 kHz audio samples.

**Why we chose it:** The previous backend used Qwen3-TTS, an autoregressive model that took 3–8 minutes to generate 30 seconds of audio on CPU. Kokoro-82M is **non-autoregressive** — it generates the full audio representation in a single forward pass — and achieves ~11 seconds for the same output. On the same hardware (Intel i5-1340P), this is roughly 20× faster. Details in [Section 12](#12-ai--ml-concepts--kokoro-82m).

**How it's used in Vocably:**

```python
from kokoro import KPipeline

_pipeline = KPipeline(lang_code="a")  # "a" = American English

# Generation — yields (graphemes, phonemes, audio_chunk) tuples
for _, _, audio in _pipeline(text, voice="af_heart", speed=1.0, split_pattern=r'\n+'):
    chunks.append(audio)

audio_np = np.concatenate(chunks)  # single numpy array of float32 samples
```

The `split_pattern=r'\n+'` argument tells Kokoro to split long texts on paragraph breaks and process them as separate segments, which avoids memory issues with very long inputs.

---

### 2.7 Ollama + qwen2.5:3b

**What it is:** Ollama is a tool that runs large language models locally as a background service. It exposes a REST API on `http://localhost:11434`. `qwen2.5:3b` is Alibaba's 3-billion-parameter instruction-following model.

**Why we chose it:** Cleaning transcripts requires understanding natural language — which fillers to remove, how to fix punctuation, whether a phrase is a sentence fragment. A simple regex can strip timestamps, but it cannot reliably identify "you know" as filler without also accidentally catching "I know this works". An LLM handles this correctly. We chose `qwen2.5:3b` specifically because the 0.5b and 1.5b variants hallucinated (invented words) or substituted synonyms (replacing "basically" with "fundamentally"). The 3b model produces accurate filler removal without touching content words.

**How it's used in Vocably:** The `/api/clean` and `/api/extract-pdf` endpoints call Ollama via `httpx`. If Ollama is not running, the endpoint falls back gracefully — text is still loaded, just without AI cleaning.

```python
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(
        "http://localhost:11434/api/chat",
        json={
            "model": "qwen2.5:3b",
            "messages": [
                {"role": "system", "content": _FILLER_ONLY_PROMPT},
                {"role": "user",   "content": text},
            ],
            "stream": False,
        },
    )
```

---

### 2.8 python-jose + passlib

**What it is:** `python-jose` is a Python implementation of JWT (JSON Web Token) — it creates and verifies signed tokens. `passlib` is a password hashing library; it is included as a dependency of the auth system.

**Why we chose it:** JWT authentication is the industry standard for securing stateless REST APIs. The alternative — server-side sessions — requires the server to remember who is logged in, which does not work well when the server can restart at any time (as happens on Hugging Face Spaces). With JWT, the token itself contains the user's identity and expiry, so the server needs no database.

**How it's used in Vocably:** `auth.py` uses `jose.jwt.encode()` to create tokens and `jose.jwt.decode()` to verify them. Full details in [Section 8](#8-authentication--jwt-from-first-principles).

---

### 2.9 PyMuPDF (fitz) + Pytesseract

**What it is:** PyMuPDF (`fitz`) is a Python binding for the MuPDF library — it can parse PDF files and extract text from digital (text-layer) PDFs. Pytesseract is a Python wrapper for Google's Tesseract OCR engine, which reads text from images.

**Why we chose it:** PDFs come in two forms: digital (where text is stored as text) and scanned (where pages are photographs with no text layer). PyMuPDF handles digital PDFs; Tesseract handles scanned ones. Together they cover both cases with no manual intervention.

**How it's used in Vocably:** The `/api/extract-pdf` endpoint tries digital extraction first. If the result is fewer than 50 characters, it assumes the PDF is scanned and falls back to OCR.

```python
pages_text = [page.get_text() for page in doc]
text = "\n\n".join(pages_text).strip()
if len(text) >= 50:
    return text, page_count, "digital"

# Scanned PDF fallback — render each page as an image and OCR it
for page in doc:
    pix = page.get_pixmap(dpi=200)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    ocr_parts.append(pytesseract.image_to_string(img))
```

---

### 2.10 SoundFile + NumPy

**What it is:** NumPy is the standard Python library for numerical array operations. SoundFile reads and writes audio files using `libsndfile`. Together they bridge the gap between Kokoro's numpy array output and the WAV format the browser expects.

**Why we chose it:** Kokoro produces raw float32 PCM samples as a numpy array — it does not write a file. We need to encode those samples as a proper WAV file (with a header that tells the browser the sample rate, bit depth, and channel count) and then base64-encode the whole thing for JSON transport. SoundFile handles the WAV encoding in two lines.

**How it's used in Vocably:**

```python
buf = io.BytesIO()                              # in-memory file buffer
sf.write(buf, audio_np, 24000, format="WAV", subtype="PCM_16")
audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
```

`PCM_16` means 16-bit signed integer samples — the standard WAV format that all browsers can decode without a plugin.

---

### 2.11 Docker

**What it is:** Docker packages an application and all its dependencies into a self-contained unit called a container. The container runs identically on any machine that has Docker installed, regardless of the host OS or installed software.

**Why we chose it:** The Kokoro backend has complex system-level dependencies: Python 3.11, `espeak-ng` (a grapheme-to-phoneme binary), and ~1.5 GB of Python packages. Installing all of these consistently on different machines is error-prone. Docker packages them once. Hugging Face Spaces specifically requires a Dockerfile to deploy custom ML backends.

**How it's used in Vocably:** The `backend/Dockerfile` defines the container. `docker-compose.yml` runs it locally with a volume to cache the downloaded model. Details in [Section 13](#13-docker--containerization).

---

## 3. Architecture — How the System Fits Together

### 3.1 System layers

```
┌───────────────────────────────────────────────────────────────────┐
│  BROWSER  ·  localhost:5173  (Vite dev) or vocably.onrender.com   │
│                                                                   │
│  App.jsx        — auth gate: renders Login or Hero                │
│  Login.jsx      — username/password form → POST /login            │
│  Hero.jsx       — TTS card, upload button, voice/speed selectors  │
│  Navbar.jsx     — nav links + logout                              │
│                                                                   │
│  useAuth.js     — login/logout, stores JWT in sessionStorage      │
│  useTTS.js      — calls /api/tts, decodes audio, polls /health    │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │ POST /login                  │ POST /api/tts
               │ POST /api/clean              │ POST /api/extract-pdf
               │                              │ Authorization: Bearer <JWT>
               ▼                              ▼
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND  ·  localhost:8000  (local) or gilfoyle99213-vocably-    │
│             backend.hf.space  (cloud)                             │
│  FastAPI + Uvicorn  ·  Docker: python:3.11-slim                   │
│                                                                   │
│  POST /login         — validate credentials → JWT                 │
│  GET  /health        — returns "healthy" only when _ready=True    │
│  POST /api/tts       — JWT required → Kokoro → base64 WAV         │
│  GET  /api/voices    — returns voice list                         │
│  POST /api/clean     — JWT required → parse + Ollama → clean text │
│  POST /api/extract-pdf — JWT required → pymupdf/OCR + Ollama      │
│  POST /api/youtube-transcript — JWT required → youtube-transcript-api + Ollama │
│                                                                   │
│  auth.py    — SECRET_KEY, HS256 signing/verification              │
│  CORS       — allows all origins (configurable for production)    │
└──────────────────────────┬────────────────────────────────────────┘
                           │ Thread pool executor
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│  ML MODEL  ·  Kokoro-82M  (hexgrad/Kokoro-82M)                    │
│  PyTorch · CPU float32 · 24 kHz · ~1–2 GB RAM                    │
│                                                                   │
│  Input  — text + voice name + speed float                         │
│  Output — numpy array of float32 PCM samples                      │
│  Cache  — ~/.cache/huggingface/hub (named Docker volume locally)  │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Request lifecycle — TTS

```
1. User clicks Play
2. useTTS.js reads JWT from sessionStorage
3. fetch("POST /api/tts", { text, voice, speed, Authorization: Bearer <token> })
4. FastAPI: Depends(verify_token) runs first — decodes JWT, raises 401 if invalid
5. FastAPI: asyncio.wait_for(loop.run_in_executor(_executor, _generate_sync, ...), timeout=300)
   - run_in_executor offloads the blocking Kokoro call to a background thread
   - The async event loop remains unblocked and can serve other requests
6. _generate_sync: Kokoro pipeline → numpy array → SoundFile WAV → base64 string
7. FastAPI returns { audio_base64, sample_rate: 24000, format: "wav" }
8. Browser: atob(audio_base64) → Uint8Array → Blob("audio/wav") → URL.createObjectURL
9. new Audio(blobUrl).play()
```

### 3.3 Backend readiness flow

```
Server starts
    │
    ▼
lifespan() begins
    ├── KPipeline(lang_code="a")  ← loads Kokoro model into RAM (~5s)
    ├── ThreadPoolExecutor(max_workers=1)  ← creates worker thread
    ├── _generate_sync("Ready.", "af_heart", 1.0)  ← pre-warm: downloads af_heart.pt
    └── _ready = True  ← only now does /health return "healthy"
    │
    ▼
Frontend polls GET /health every 2.5s
    │
    ├── { status: "loading" }  → backendStatus = "warming" → Play button disabled
    └── { status: "healthy" } → backendStatus = "ready"  → Play button enabled
```

The `_ready` flag is critical. Without it, `/health` would return healthy as soon as the HTTP server was up — before the model was loaded. The first TTS request would then block for ~60 seconds while `af_heart.pt` was downloaded from Hugging Face. The flag separates "the HTTP server is up" from "the server is ready to serve TTS requests".

---

## 4. File Structure

```
Vocably/
├── backend/
│   ├── auth.py             # JWT: token creation, verification, credential validation
│   ├── main.py             # FastAPI server — all endpoints, Kokoro pipeline, Upload & Clean
│   ├── requirements.txt    # Python dependencies (pinned versions)
│   ├── run.bat             # Backend startup script (Windows, local dev)
│   ├── Dockerfile          # Container definition (production/cloud)
│   ├── .dockerignore       # Excludes venv, .env, pycache from build context
│   └── venv/               # Python virtual environment (local only, not in Docker)
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   └── DropupSelector.jsx   # Reusable dropup for Voice and Speed
│   │   └── Navbar/
│   │       ├── FlyoutLink.jsx       # Animated nav links with hover flyout
│   │       ├── Logo.jsx             # App logo
│   │       ├── Navbar.jsx           # Navigation bar + logout button
│   │       └── NavContent.jsx       # Nav menu content
│   ├── hooks/
│   │   ├── useAuth.js      # Login/logout, JWT storage in sessionStorage
│   │   └── useTTS.js       # TTS API calls, audio playback, download, health polling
│   ├── pages/
│   │   ├── Hero.jsx        # Main TTS page — card, upload, voice selector, play
│   │   └── Login.jsx       # Authentication gate
│   ├── utils/
│   │   └── constants.js    # Voice list, speed presets, use case examples
│   ├── App.jsx             # Root: reads sessionStorage → renders Login or Hero
│   ├── index.css           # Global styles
│   └── main.jsx            # React entry point
├── Documents/
│   └── documentation.md    # This file
├── mock_data/              # Sample files for testing Upload & Clean
├── docker-compose.yml      # Backend service with HF model cache volume
├── start.bat               # Combined startup script (local dev)
├── .env.development        # VITE_TTS_BACKEND_URL=http://localhost:8000
├── .env.production         # VITE_TTS_BACKEND_URL=<HF Spaces URL>
├── package.json
└── vite.config.js
```

---

## 5. Running Locally

### Prerequisites

- **Python 3.10+** installed and added to PATH
- **Node.js 18+** installed
- **4 GB RAM** minimum recommended
- **~2 GB disk space** (model + Python packages)
- **Ollama** (optional) for Upload & Clean AI processing — install from ollama.com, then run `ollama pull qwen2.5:3b`
- **Tesseract** (optional) for scanned PDF OCR — install from github.com/UB-Mannheim/tesseract/wiki (Windows)

### Option 1: Single command (recommended)

```bash
.\start.bat
```

Opens two terminal windows — backend on port 8000 and frontend on port 5173.

### Option 2: Manual (two terminals)

**Terminal 1 — Backend:**

```bash
cd backend
.\run.bat
```

**Terminal 2 — Frontend:**

```bash
npm run dev
```

### Option 3: Docker backend + local frontend

```bash
docker-compose up --build   # backend in Docker on port 8000
npm run dev                 # frontend as usual
```

### Access points

| URL                          | What it is                  |
| ---------------------------- | --------------------------- |
| http://localhost:5173        | Vocably UI                  |
| http://localhost:8000/health | Backend readiness check     |
| http://localhost:8000/docs   | Interactive API docs        |

---

## 6. First Run Expectations

| Step                          | What happens                                         | Time          |
| ----------------------------- | ---------------------------------------------------- | ------------- |
| `run.bat` creates venv        | Python virtual environment created                   | ~10s          |
| `pip install -r requirements` | ~1.5 GB of Python packages downloaded                | 2–5 min       |
| Kokoro model download         | ~500 MB weights downloaded from HuggingFace          | 1–2 min       |
| spacy model download          | `en-core-web-sm` (~13 MB) downloaded on first run only | ~10s        |
| Voice pre-warm (`af_heart`)   | `af_heart.pt` downloaded and first generation runs  | ~30–60s       |
| `/health` returns "healthy"   | Play button becomes active                           | after above   |
| First TTS generation          | ~11s for a 200-character sentence                    | ~11s          |
| Subsequent generations        | Same — non-autoregressive, consistent latency        | ~5–15s        |

After the first run, startup takes ~15 seconds (model and spacy are cached locally).

---

## 7. Using the Application

### Basic TTS flow

1. Open http://localhost:5173 → Login page appears
2. Sign in with `vocably` / `vocably2026`
3. Wait for the warming-up banner to disappear (Play button goes from grey to black)
4. Type or paste text — up to 5000 characters
5. Select a voice and speed using the selectors in the bottom-left
6. Click the Play button (black circle)
7. Audio plays automatically; click again to stop

### Available voices

| Group            | Voice ID     | Name    |
| ---------------- | ------------ | ------- |
| American Female  | `af_heart`   | Heart   |
| American Female  | `af_bella`   | Bella   |
| American Female  | `af_nicole`  | Nicole  |
| American Female  | `af_sarah`   | Sarah   |
| American Female  | `af_sky`     | Sky     |
| American Male    | `am_adam`    | Adam    |
| American Male    | `am_michael` | Michael |
| American Male    | `am_echo`    | Echo    |
| American Male    | `am_liam`    | Liam    |
| British Female   | `bf_emma`    | Emma    |
| British Female   | `bf_alice`   | Alice   |
| British Female   | `bf_lily`    | Lily    |
| British Male     | `bm_george`  | George  |
| British Male     | `bm_daniel`  | Daniel  |
| British Male     | `bm_lewis`   | Lewis   |

### Downloading audio

After generating speech, click the purple Download button. The file is saved as `Vocably_[voice]_[timestamp].wav`.

### Uploading files (Upload & Clean)

Click the **Upload & Clean** button at the top-left of the card. Accepted formats: `.txt`, `.md`, `.srt`, `.vtt`, `.pdf`.

The file is sent to the backend, cleaned, and loaded into the textarea automatically. See [Section 9](#9-upload--clean--the-text-preparation-pipeline) for how the cleaning works.

---

## 8. Authentication — JWT from First Principles

### What authentication solves

Without authentication, anyone who knows the backend URL can send unlimited TTS requests — consuming CPU and potentially abusing the service. Authentication ensures only users with valid credentials can use the API.

### What a JWT is

A **JSON Web Token (JWT)** is a compact, self-contained string that encodes a user's identity and an expiry time. It has three parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← Header (base64)
.eyJzdWIiOiJ2b2NhYmx5IiwiZXhwIjoxN...  ← Payload (base64)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV..  ← Signature (HMAC-SHA256)
```

- **Header:** declares the algorithm (`HS256`) and token type (`JWT`)
- **Payload:** contains claims — `sub` (subject, i.e. the username) and `exp` (expiry timestamp)
- **Signature:** `HMAC_SHA256(base64(header) + "." + base64(payload), SECRET_KEY)`

The signature is what makes JWTs secure. Without knowing the `SECRET_KEY`, it is computationally infeasible to forge a valid token. The server verifies the signature on every request — no database lookup needed.

### Why `sessionStorage`, not `localStorage`

`localStorage` persists until explicitly cleared — if a user walks away from their machine with a tab open, the token stays there indefinitely. `sessionStorage` is scoped to the browser tab and is cleared automatically when the tab is closed. This is a deliberate security tradeoff: slightly less convenience in exchange for a smaller window for token theft.

### The full auth flow

```
1. User submits login form (username: "vocably", password: "vocably2026")

2. useAuth.js sends:
   POST /login
   { "username": "vocably", "password": "vocably2026" }

3. auth.py: validate_credentials() compares against env vars (or defaults)
   Returns True

4. auth.py: create_access_token({"sub": "vocably"})
   - Adds {"exp": now + 8 hours} to the payload
   - jwt.encode(payload, SECRET_KEY, algorithm="HS256")
   - Returns signed token string

5. FastAPI returns: { "access_token": "eyJ...", "token_type": "bearer" }

6. useAuth.js: sessionStorage.setItem("vocably_token", access_token)
   App re-renders: isAuthenticated = true → shows Hero

7. User clicks Play. useTTS.js reads the token:
   POST /api/tts
   Authorization: Bearer eyJ...
   { "text": "...", "voice": "af_heart", "speed": 1.0 }

8. FastAPI: Depends(verify_token) runs before the endpoint function
   - HTTPBearer extracts the token from the Authorization header
   - jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
   - Validates signature AND checks exp > now
   - If valid: returns {"username": "vocably"} → endpoint runs
   - If invalid or expired: raises HTTP 401 → endpoint never runs
```

### Key implementation details

**Token creation (`auth.py`):**

```python
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", secrets.token_hex(32))
# If no env var is set, a secure random key is generated per server session.
# This means tokens become invalid on server restart — intentional for security.
# In production, always set JWT_SECRET_KEY as a persistent environment variable.

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=8)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

**Token verification (FastAPI dependency):**

```python
def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, ...)
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=401, ...)
```

**`Depends()` is FastAPI's dependency injection system.** When you write `Depends(verify_token)` in an endpoint's signature, FastAPI automatically calls `verify_token()` before the endpoint function runs. If `verify_token` raises an exception, the endpoint never executes. This keeps authentication logic out of every endpoint handler.

---

## 9. Upload & Clean — The Text Preparation Pipeline

### The problem

Transcripts — whether from YouTube captions, Zoom recordings, or podcast services — are full of noise that sounds awful when read aloud by a TTS engine:

- Timestamps: `[00:01:23]`, `(1:23)`, `00:01:23,456 --> 00:01:27,890`
- Speaker labels: `Speaker 1:`, `SPEAKER_00:`, `Dr. Chen:`
- Spoken fillers: "um", "uh", "you know", "basically"
- SRT/VTT structure markers: cue numbers, WEBVTT headers, `<b>` tags

A simple regex can strip the structural noise. But removing fillers requires understanding English — whether "you know" is a filler phrase or a content phrase depends on context. This is where the LLM is used.

### The two-stage pipeline design

The key architectural decision is to **not** give the raw file directly to the LLM. Instead:

1. **Stage 1 — Deterministic parser:** Strips all structural noise (timestamps, IDs, headers, HTML tags). This is handled by code, not AI. Code is reliable, fast, and produces the same output every time.

2. **Stage 2 — LLM (Ollama qwen2.5:3b):** Receives only clean prose and removes spoken filler words. Because the LLM is only asked to do one narrow task (remove specific words), it has no opportunity to hallucinate structure.

```
Raw SRT file
    │
    ▼
_detect_format(text)  → "srt"
    │
    ▼
_parse_srt(text)         [Stage 1: deterministic]
  - srt.parse() extracts subtitle Content blocks
  - Strips <b>, <i>, <u> tags
  - Joins segments with spaces
    │
    ▼
_ollama_clean(parsed, prompt=_FILLER_ONLY_PROMPT)  [Stage 2: LLM]
  - Sends clean prose to Ollama
  - _FILLER_ONLY_PROMPT: "Remove ONLY: um, uh, you know, i mean, so yeah, basically, literally"
  - Returns cleaned text
    │
    ▼
setText(cleaned.slice(0, 5000))  ← loaded into textarea
```

### Format detection

Format detection is purely structural — no AI involved:

```python
def _detect_format(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("WEBVTT"):
        return "vtt"
    # SRT: starts with a number, followed by a timestamp line
    if re.match(r"^\d+\r?\n\d{1,2}:\d{2}:\d{2},\d{3}\s*-->", stripped):
        return "srt"
    return "text"
```

### The two Ollama prompts

Two different prompts are used depending on what the input looks like:

**`_FILLER_ONLY_PROMPT`** — used for already-parsed SRT/VTT. The text is already clean prose; the LLM must only delete specific filler words.

```python
_FILLER_ONLY_PROMPT = (
    "Remove ONLY these spoken filler words from the text: "
    "um, uh, you know, i mean, so yeah, basically, literally. "
    "When removing a filler word, DELETE IT COMPLETELY — do NOT replace it with a synonym or any other word. "
    "Keep every non-filler word exactly as written, in the exact same order. "
    "Do NOT rephrase, reorder, restructure, summarize, or add any words. "
    "Output ONLY the cleaned text."
)
```

The "do NOT replace it with a synonym" instruction was added because `qwen2.5:1.5b` was observed replacing "basically" with "fundamentally" — a word substitution that is even worse for TTS because it sounds edited rather than natural. The 3b model does not exhibit this behaviour, but the instruction remains as a safeguard.

**`_CLEAN_SYSTEM_PROMPT`** — used for raw `.txt`/`.md` files that may still contain structural noise the parser has not handled.

```python
_CLEAN_SYSTEM_PROMPT = (
    "You are a text formatter for text-to-speech conversion. "
    "Clean the given text strictly by these rules:\n"
    "1. Remove all timestamps.\n"
    "2. Remove speaker labels.\n"
    "3. Remove filler words: um, uh, like, you know, I mean, basically, literally, right, so yeah.\n"
    "4. Fix punctuation: add missing periods, capitalize sentence starts.\n"
    "5. Merge fragmented lines into smooth flowing paragraphs.\n"
    "Output ONLY the cleaned text."
)
```

### Sanity check

LLMs can over-clean — especially smaller models on structured text. A `qwen2.5:0.5b` model tested on an interview transcript returned only "Dr. Chen: thank you." — discarding 98% of the content. The sanity check catches this:

```python
if len(cleaned) < max(50, len(text) * 0.2):
    # Output is less than 20% of input — model likely over-cleaned
    # Fall back to regex-only clean so no content is lost
    return _regex_clean(text), True
```

The `max(50, ...)` handles very short inputs — a 40-character text cleaned down to 30 characters is fine and should not trigger the fallback.

### Regex post-processor

Even after LLM cleaning, a regex pass removes anything the model may have missed:

```python
_TIMESTAMP_RE = re.compile(
    r"\[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[,\.]\d+)?\]?\)?"  # [00:01:23] (1:23) 00:01:23,456
    r"| \[\d+\]",                                            # [1] subtitle sequence numbers
    re.VERBOSE,
)

_SPEAKER_LABEL_RE = re.compile(
    r"^\s*(?:Speaker|SPEAKER)\s+\w+[:\s]\s*",
    re.MULTILINE,
)

def _regex_clean(text: str) -> str:
    text = _TIMESTAMP_RE.sub("", text)
    text = _SPEAKER_LABEL_RE.sub("", text)
    text = re.sub(r"[ \t]{2,}", " ", text)   # collapse multiple spaces
    text = re.sub(r"\n{3,}", "\n\n", text)    # max two blank lines
    return text.strip()
```

Note: `_SPEAKER_LABEL_RE` only strips the generic "Speaker N:" pattern. It does **not** strip named speaker labels like "Dr. Chen:" — those are ambiguous (a colon after a name could be legitimate prose) and stripping them would corrupt content.

### YouTube transcript extraction

Pasting a YouTube URL into the card triggers the `/api/youtube-transcript` endpoint. The flow is identical to Upload & Clean but the source is YouTube's caption servers rather than a local file:

```
User pastes URL
    │
    ▼
_extract_video_id(url)   ← regex, supports watch?v=, youtu.be/, /shorts/, /embed/, /live/
    │
    ▼
YouTubeTranscriptApi().fetch(video_id)   ← youtube-transcript-api v1.x; no API key
  - Returns iterable of snippet objects with .text, .start, .duration
  - Works with both auto-generated and manually created captions
    │
    ▼
raw_text = " ".join(s.text.replace("\n", " ") for s in result)
    │
    ▼
_ollama_clean(raw_text, prompt=_CLEAN_SYSTEM_PROMPT)   [full clean — not filler-only]
  - Auto-generated captions lack punctuation and capitalisation
  - _CLEAN_SYSTEM_PROMPT fixes structure, punctuation, and removes fillers
    │
    ▼
setText(cleaned.slice(0, 5000))  ← loaded into textarea
```

**Why `_CLEAN_SYSTEM_PROMPT` instead of `_FILLER_ONLY_PROMPT`:** Auto-generated YouTube captions are a stream of lower-case words without sentence boundaries or punctuation. Unlike a parsed SRT file (which has clean prose), this text needs the full reformat — not just filler removal.

**Error handling:**

| Condition                              | HTTP | Error shown in UI                                         |
| -------------------------------------- | ---- | --------------------------------------------------------- |
| No video ID in URL                     | 400  | "Could not find a YouTube video ID in that URL."          |
| Creator disabled captions              | 422  | "The creator has disabled captions for this video."       |
| No captions exist                      | 422  | "No captions found for this video."                       |
| Copyright block / unplayable video     | 422  | "Could not fetch transcript: ..."                         |
| `youtube-transcript-api` not installed | 501  | "YouTube support not installed. Run: pip install ..."     |

### PDF extraction

```python
def _extract_pdf(pdf_bytes: bytes) -> tuple[str, int, str]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)

    # Try digital extraction first
    pages_text = [page.get_text() for page in doc]
    text = "\n\n".join(pages_text).strip()
    if len(text) >= 50:
        return text, page_count, "digital"  # method="digital"

    # Less than 50 chars → assume scanned PDF, use OCR
    for page in doc:
        pix = page.get_pixmap(dpi=200)  # render to 200 DPI image
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        ocr_parts.append(pytesseract.image_to_string(img))

    return "\n\n".join(ocr_parts).strip(), page_count, "ocr"
```

`dpi=200` is a deliberate quality/performance tradeoff. 72 DPI produces blurry images that confuse Tesseract. 300 DPI is more accurate but produces much larger images and slower OCR. 200 DPI gives Tesseract enough resolution for accurate recognition without excessive memory use.

---

## 10. Backend Deep Dive — FastAPI

### 10.1 The lifespan context manager

**What it is:** FastAPI's `lifespan` is a context manager (using Python's `@asynccontextmanager`) that runs code at server startup and shutdown. Everything before `yield` runs at startup; everything after `yield` runs at shutdown.

**Why it matters:** The Kokoro pipeline must be loaded exactly once and shared across all requests. If it were loaded inside the endpoint function, it would be re-loaded from disk on every request (~5 seconds per request). The lifespan loads it once, stores it in a module-level variable, and keeps it alive for the server's lifetime.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline, _executor, _ready

    # --- STARTUP ---
    _pipeline = KPipeline(lang_code="a")          # loads model into RAM
    _executor = ThreadPoolExecutor(max_workers=1)  # creates worker thread

    # Pre-warm: download af_heart.pt voice file before any real request
    await loop.run_in_executor(_executor, _generate_sync, "Ready.", "af_heart", 1.0)
    _ready = True                                  # now safe to serve requests

    yield  # server runs here, handling requests

    # --- SHUTDOWN ---
    _executor.shutdown(wait=False)                 # clean up thread pool
```

### 10.2 Async vs sync — why the ThreadPoolExecutor is necessary

**The problem:** FastAPI's event loop is single-threaded. Every `async def` endpoint runs on this thread. If you call a slow blocking function (like Kokoro's generation, which runs for ~11 seconds) directly in an `async` endpoint, it blocks the entire event loop — no other requests can be served until generation finishes.

**The solution:** `asyncio.get_running_loop().run_in_executor(executor, func, *args)` offloads the blocking function to a thread pool. The event loop "awaits" the result but is free to process other requests in the meantime.

```python
loop = asyncio.get_running_loop()
audio_b64, sample_rate = await asyncio.wait_for(
    loop.run_in_executor(_executor, _generate_sync, text, voice, speed),
    timeout=300.0,  # 5-minute hard limit — prevents infinite hang
)
```

**Why `max_workers=1`:** Kokoro's `KPipeline` is not thread-safe (it was not designed to be called from multiple threads simultaneously). Using `max_workers=1` ensures only one generation runs at a time. If two requests arrive simultaneously, the second waits in a queue until the first completes.

### 10.3 Pydantic models

Pydantic is FastAPI's data validation layer. When an endpoint declares a parameter as a `BaseModel`, FastAPI automatically:

1. Parses the request body as JSON
2. Validates each field against the declared types
3. Returns HTTP 422 with detailed errors if validation fails
4. Passes a fully-typed Python object to the endpoint function

```python
class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "af_heart"
    speed: Optional[float] = 1.0
```

If the frontend sends `{ "text": 123, "speed": "fast" }`, FastAPI returns:

```json
{
  "detail": [
    { "loc": ["body", "text"], "msg": "str type expected" },
    { "loc": ["body", "speed"], "msg": "value is not a valid float" }
  ]
}
```

This automatic validation catches bugs at the API boundary — the endpoint function receives clean, typed data.

### 10.4 CORS (Cross-Origin Resource Sharing)

**What it is:** CORS is a browser security mechanism. When JavaScript at `http://localhost:5173` makes a request to `http://localhost:8000`, the browser first sends a preflight `OPTIONS` request to ask the server whether it allows cross-origin requests. If the server does not respond with the correct `Access-Control-Allow-Origin` header, the browser blocks the request — even if the server processed it successfully.

**Why it matters:** Without CORS middleware, every fetch from the React frontend would be blocked by the browser. Note that CORS is a browser enforcement — it does not protect the server from curl or Postman requests, only from browser-based JavaScript.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # allows requests from any origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The current configuration uses `allow_origins=["*"]` for simplicity. For a production deployment with sensitive data, you would restrict this to the specific frontend domain (e.g., `["https://vocably.onrender.com"]`).

### 10.5 All endpoints

| Method | Path              | Auth     | Description                                              |
| ------ | ----------------- | -------- | -------------------------------------------------------- |
| GET    | `/health`         | Public   | Returns `{"status": "healthy"}` when model is ready      |
| POST   | `/login`          | Public   | Validates credentials, returns signed JWT                |
| POST   | `/api/tts`        | Required | Generates speech from text, returns base64 WAV           |
| GET    | `/api/voices`     | Public   | Returns list of available voices grouped by accent       |
| POST   | `/api/clean`              | Required | Cleans text/SRT/VTT content via parser + Ollama          |
| POST   | `/api/extract-pdf`        | Required | Extracts and cleans text from uploaded PDF               |
| POST   | `/api/youtube-transcript` | Required | Fetches and cleans YouTube captions via URL              |
| GET    | `/docs`                   | Public   | Auto-generated Swagger UI (interactive API documentation)|

### 10.6 Base64 audio transport

The TTS endpoint returns audio in JSON, not as a binary response. Why?

Binary responses are simpler in some ways (no encoding overhead), but JSON is universally handled by all HTTP clients and easier to log and debug. The tradeoff is a ~33% size overhead from base64 encoding. For audio files typically under 2 MB, this is acceptable.

```python
# Server side — encoding
buf = io.BytesIO()
sf.write(buf, audio_np, 24000, format="WAV", subtype="PCM_16")
audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
return TTSResponse(audio_base64=audio_b64, sample_rate=24000)
```

```js
// Browser side — decoding
const audioArray = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
const audioBlob = new Blob([audioArray], { type: "audio/wav" });
const blobUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(blobUrl);
await audio.play();
```

`URL.createObjectURL(blob)` creates a temporary `blob:http://localhost:5173/abc-123` URL that points to the binary data in memory. The browser's audio decoder reads from this URL exactly as it would from a file URL. When the audio is no longer needed, `URL.revokeObjectURL(url)` releases the memory.

---

## 11. Frontend Deep Dive — React & Vite

### 11.1 The useTTS hook

`useTTS.js` is a custom React hook — a function that encapsulates all TTS-related state and logic. Instead of putting dozens of `useState` calls and the `handlePlay` function directly in `Hero.jsx`, they live in a separate file and are imported via a single destructured call:

```js
const {
    text, setText,
    isSpeaking, isLoading, error,
    selectedVoice, setSelectedVoice,
    speed, setSpeed,
    hasAudio, backendStatus,
    handlePlay, handleDownload,
} = useTTS();
```

**Why custom hooks:** Custom hooks follow the same rule as regular hooks — they must be called at the top level of a component or another hook, never conditionally. They allow complex stateful logic to be extracted from components, tested independently, and reused across multiple components.

### 11.2 Health polling

The `useEffect` hook runs side effects in React — things that interact with the outside world (network requests, timers, DOM manipulation).

```js
useEffect(() => {
    let intervalId;

    const poll = async () => {
        try {
            const res = await fetch(`${TTS_BACKEND_URL}/health`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === "healthy") {
                    setBackendStatus("ready");
                    clearInterval(intervalId); // stop polling once ready
                } else {
                    setBackendStatus("warming");
                }
            } else {
                setBackendStatus("offline");
            }
        } catch {
            setBackendStatus("offline");
        }
    };

    poll();                                    // poll immediately on mount
    intervalId = setInterval(poll, 2500);      // then every 2.5 seconds
    return () => clearInterval(intervalId);    // cleanup on unmount
}, []);  // empty dependency array = runs once when component mounts
```

The `return () => clearInterval(intervalId)` is the cleanup function. React calls it when the component unmounts — this prevents the interval from continuing to fire after the user logs out or the tab is closed. Without cleanup, you would get "memory leaks" — functions running in the background updating state that no longer exists.

### 11.3 Blob URL memory management

Every time the user generates new audio, a new Blob URL is created. If the old one is not explicitly released, it lives in memory for the browser tab's lifetime. The hook manages this:

```js
// Revoke the previous URL before creating a new one
if (audioBlobUrl.current) {
    URL.revokeObjectURL(audioBlobUrl.current);
}
audioBlobUrl.current = URL.createObjectURL(audioBlob);
```

The `useRef` hook is used here instead of `useState` because `audioBlobUrl` does not need to trigger a re-render when it changes — it is an internal implementation detail, not part of the visible UI state.

### 11.4 Environment variables in Vite

Vite reads `.env.development` when `npm run dev` is running and `.env.production` when `npm run build` is run. Variables prefixed with `VITE_` are injected into the JavaScript bundle at build time.

```
# .env.development
VITE_TTS_BACKEND_URL=http://localhost:8000

# .env.production
VITE_TTS_BACKEND_URL=https://gilfoyle99213-vocably-backend.hf.space
```

```js
const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";
```

The `|| "http://localhost:8000"` fallback handles the case where neither file exists (e.g., in a new clone before running `npm install`). Variables without the `VITE_` prefix are not accessible in browser code — this prevents accidentally exposing server-side secrets.

---

## 12. AI & ML Concepts — Kokoro-82M

### 12.1 What "82M parameters" means

A neural network is composed of layers of mathematical operations. Each operation multiplies an input by a set of learned weights. A "parameter" is one of these weights — a single floating-point number.

Kokoro-82M has 82 million of these weights. In memory:

- `float32` precision: 82M × 4 bytes ≈ **330 MB RAM**
- Total model files on disk: ~500 MB (includes voice style vectors)

This is considered a "small" model by modern standards (GPT-3 has 175B parameters). Small models load fast, use less RAM, and run inference faster — important for a CPU-only deployment.

### 12.2 Autoregressive vs non-autoregressive TTS

This is the most important difference between Kokoro and the previous Qwen3-TTS backend.

**Autoregressive TTS** generates audio one token at a time. Each token depends on all previously generated tokens:

```
text → "Hello world"
Step 1: generate token 1 (conditioned on text)
Step 2: generate token 2 (conditioned on text + token 1)
Step 3: generate token 3 (conditioned on text + tokens 1–2)
...
Step 127: generate token 127 → audio segment
```

Each step requires a full forward pass through the neural network. For a 10-second audio clip, this might mean 127 sequential operations. On a CPU, this takes **3–8 minutes**.

**Non-autoregressive TTS** (what Kokoro uses, based on StyleTTS2) generates the full audio representation in a **single forward pass**:

```
text → "Hello world" → single forward pass through network → full audio
```

There is no sequential dependency. The entire output is computed in one operation. On the same CPU, Kokoro generates a 10-second audio clip in **~11 seconds** — roughly 20× faster.

### 12.3 Voice pre-warming

Kokoro voices are stored as individual `.pt` (PyTorch tensor) files on Hugging Face Hub. When a voice is used for the first time, its file is downloaded from HuggingFace (~2–10 MB) and cached locally. This download happens **during the request**, which would add 10–30 seconds of latency to the first TTS call.

The pre-warming step in the lifespan function solves this:

```python
# During startup, before _ready is set to True:
await loop.run_in_executor(_executor, _generate_sync, "Ready.", "af_heart", 1.0)
```

This generates a short dummy audio clip using the default voice (`af_heart`). The voice file is downloaded and cached as a side effect. When a real user request arrives, the voice is already available locally. Only the default voice is pre-warmed; other voices still download on first use.

### 12.4 The `KPipeline` API

```python
from kokoro import KPipeline

pipeline = KPipeline(lang_code="a")  # "a" = American English

# pipeline() is a generator — it yields segments
for graphemes, phonemes, audio_chunk in pipeline(
    text="Hello world",
    voice="af_heart",
    speed=1.0,
    split_pattern=r'\n+',   # split on paragraph breaks
):
    # graphemes: original text segment
    # phonemes: IPA representation (e.g. hɛloʊ wɜrld)
    # audio_chunk: numpy array of float32 samples at 24000 Hz
    chunks.append(audio_chunk)
```

The generator pattern allows Kokoro to process long texts in segments rather than loading the entire text into memory at once. For very long inputs, this reduces peak memory usage.

### 12.5 G2P — Grapheme-to-Phoneme

Before Kokoro can synthesize speech, it converts the input text from graphemes (written letters) to phonemes (sounds). This process is called **G2P (Grapheme-to-Phoneme) conversion**.

"Hello" → `hɛˈloʊ`

Kokoro uses `misaki`, its own G2P library, which in turn uses `spacy` for tokenization and part-of-speech tagging. The spacy model `en-core-web-sm` is downloaded on first run and cached. Without it, Kokoro falls back to a simpler G2P method that handles fewer edge cases.

---

## 13. Docker & Containerization

### 13.1 Why containerization

The Kokoro backend requires: Python 3.11, ~1.5 GB of Python packages, `espeak-ng` (a system binary for G2P), `gcc` (for compiling the `cryptography` package), and Tesseract OCR. Installing all of these consistently across different operating systems is fragile.

Docker packages the application and all its dependencies into a single image. The image runs identically on your laptop, a CI server, or a cloud platform — without any manual environment setup on the target machine.

### 13.2 Dockerfile explained

```dockerfile
FROM python:3.11-slim
# Base image: minimal Debian Linux with Python 3.11.
# "slim" = no build tools, compilers, or development headers.
# ~50 MB vs ~900 MB for the full Python image.

RUN apt-get update && apt-get install -y --no-install-recommends gcc espeak-ng
# gcc: required to compile the "cryptography" Python package (which python-jose depends on).
# espeak-ng: system G2P binary required by Kokoro's misaki phonemizer on Linux.
# --no-install-recommends: skips optional packages to keep the image small.

RUN useradd -m -u 1000 user
USER user
ENV PATH=/home/user/.local/bin:$PATH
# Non-root user (UID 1000): required by Hugging Face Spaces.
# Principle of least privilege: if the container is compromised, the attacker
# has user-level access, not root access.

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# requirements.txt is copied BEFORE the application code.
# Docker caches each RUN layer separately. If only main.py changes,
# Docker reuses the pip install layer on the next build — saves 3-5 minutes.

COPY --chown=user main.py auth.py ./
# Application code is copied last because it changes most frequently.

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
# Shell form CMD (not JSON array) is required for ${PORT:-7860} to expand.
# JSON array form ["uvicorn", ..., "${PORT:-7860}"] does NOT expand env vars.
# --host 0.0.0.0: binds to all network interfaces inside the container.
# 127.0.0.1 would only accept connections from within the container itself —
# the host machine would be unable to reach it.
```

### 13.3 Layer caching

Docker builds images in layers. Each instruction in the Dockerfile is one layer. If an instruction's inputs have not changed since the last build, Docker reuses the cached layer.

```
Layer 1: FROM python:3.11-slim             ← rarely changes
Layer 2: RUN apt-get install gcc espeak-ng ← rarely changes
Layer 3: COPY requirements.txt .           ← changes when deps change
Layer 4: RUN pip install -r requirements   ← cached if layer 3 unchanged
Layer 5: COPY main.py auth.py              ← changes on every deploy
```

If you change only `main.py`, layers 1–4 are reused from cache and only layer 5 is rebuilt. This is why `requirements.txt` must be copied and installed **before** the application code — if it were done in one step (`COPY . . && pip install`), any code change would invalidate the cache and re-run `pip install`.

### 13.4 docker-compose.yml

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - huggingface_cache:/home/user/.cache/huggingface/hub
    environment:
      - PORT=8000

volumes:
  huggingface_cache:
```

The `huggingface_cache` named volume mounts the directory where Kokoro downloads model weights. Without it, the 500 MB model would be re-downloaded every time the container restarts. With it, the model is downloaded once and reused.

---

## 14. Cloud Deployment — Render + Hugging Face Spaces

### 14.1 Why two separate platforms

The frontend and backend have fundamentally different hosting requirements:

| Concern    | Frontend (React)                           | Backend (FastAPI + Kokoro)                      |
| ---------- | ------------------------------------------ | ----------------------------------------------- |
| Output     | Static files (HTML, JS, CSS) — ~200 KB     | A running Python process that allocates ~2 GB RAM |
| Hosting    | Any CDN can serve static files for free    | Requires a machine with enough RAM and CPU       |
| Cost       | Render free tier: unlimited static hosting | Hugging Face Spaces: free CPU tier, 16 GB RAM    |

Render's free web service tier (the one that would run a Node.js or Python process) sleeps after 15 minutes. Static sites on Render are always-on because they're served by a CDN with no process to sleep.

### 14.2 Hugging Face Spaces (Backend)

HF Spaces free CPU tier provides 2 vCPUs and 16 GB RAM — more than enough for Kokoro (~2 GB RAM). HF Hub also provides native model caching, so `KPipeline` downloads the model on first startup and caches it automatically.

**What HF Spaces expects from a Docker container:**

1. Listens on port 7860 (injected as `PORT=7860` environment variable)
2. Runs as UID 1000 (non-root)
3. Does not assume persistent storage (model is re-downloaded on container restart on the free tier)

**Deploying:**

```bash
# 1. Create Space: huggingface.co/new-space → Docker → CPU Basic → Public

# 2. Clone the HF Space repo
git clone https://huggingface.co/spaces/YourUsername/vocably-backend

# 3. Copy backend files
cp backend/Dockerfile backend/main.py backend/auth.py backend/requirements.txt vocably-backend/

# 4. Push — HF builds and deploys automatically
cd vocably-backend
git add .
git commit -m "Deploy"
git push  # authenticate with HF access token (not password)

# 5. Set secrets in Space Settings:
#    JWT_SECRET_KEY = <random 32+ character string>
#    FRONTEND_URL   = https://vocably.onrender.com
#    VOCABLY_USERNAME = vocably
#    VOCABLY_PASSWORD = vocably2026
```

**Verify:**

```bash
curl https://your-username-vocably-backend.hf.space/health
# {"status":"healthy"}
```

### 14.3 Render (Frontend)

Render builds the Vite project with `npm install && npm run build` and serves the `dist/` folder from a CDN. The build step runs `npm run build`, which reads `.env.production` and bakes the HF Spaces backend URL into the JavaScript bundle.

**Deploying:**

1. Push the Vocably repo to GitHub
2. render.com → New → Static Site → Connect GitHub → select repo
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_TTS_BACKEND_URL = https://your-username-vocably-backend.hf.space`
6. Deploy

### 14.4 Environment variables summary

| Variable               | Set in            | Purpose                                          |
| ---------------------- | ----------------- | ------------------------------------------------ |
| `VITE_TTS_BACKEND_URL` | Render dashboard  | Frontend → backend URL (baked in at build time)  |
| `JWT_SECRET_KEY`       | HF Spaces secrets | Signs/verifies JWT tokens                        |
| `FRONTEND_URL`         | HF Spaces secrets | CORS allowed origin (if restricting access)      |
| `VOCABLY_USERNAME`     | HF Spaces secrets | Login username override                          |
| `VOCABLY_PASSWORD`     | HF Spaces secrets | Login password override                          |
| `PORT`                 | HF Spaces (auto)  | Uvicorn port — HF injects 7860                   |

---

## 15. HTTP Status Codes Reference

HTTP status codes are three-digit numbers that indicate the result of a request. They are grouped by the first digit.

| Code | Category      | Meaning               | When Vocably uses it                          |
| ---- | ------------- | --------------------- | --------------------------------------------- |
| 200  | Success       | OK                    | Successful login, TTS generation, or cleanup  |
| 400  | Client error  | Bad Request           | Empty text field, or unsupported file type    |
| 401  | Client error  | Unauthorized          | Missing, invalid, or expired JWT              |
| 422  | Client error  | Unprocessable Entity  | Request body type mismatch (Pydantic failure) |
| 501  | Server error  | Not Implemented       | PDF endpoint called without pymupdf installed |
| 503  | Server error  | Service Unavailable   | `/api/tts` called before pipeline is ready   |
| 504  | Server error  | Gateway Timeout       | Kokoro generation exceeded 300s timeout       |
| 500  | Server error  | Internal Server Error | Unexpected exception during TTS or cleanup    |

---

## 16. Troubleshooting

### Play button stays grey

The backend is still warming up. This is expected during first startup (model loads + voice pre-warms). Watch the amber banner below the card; it disappears when the backend is ready.

If the banner shows "Backend is offline" instead of "warming up", the backend server is not running at all. Start it with `.\start.bat` or `cd backend && .\run.bat`.

### Login page does not appear

- Make sure the frontend is running: `npm run dev`
- Open http://localhost:5173, not http://localhost:8000
- Check the terminal for errors from Vite

### "Cannot connect to TTS server"

- Confirm the backend is running: visit http://localhost:8000/health in a browser
- If the health check works but the frontend cannot connect, check that `.env.development` contains `VITE_TTS_BACKEND_URL=http://localhost:8000`

### "Session expired. Please log in again."

- Your JWT expired (8-hour window) or the server restarted (which generates a new `SECRET_KEY` and invalidates all existing tokens)
- Log out and log back in

### TTS generation times out (504)

- Text is very long — try splitting into shorter segments (under 500 characters for testing)
- First cold start after a long idle period may take longer on HF Spaces
- Check the backend logs for more detail

### Upload & Clean does not remove fillers

- Ollama may not be running. Check: `curl http://localhost:11434` — should return a response
- The model may not be pulled: `ollama pull qwen2.5:3b`
- On first use, `qwen2.5:3b` (~1.9 GB) takes 1–2 minutes to download

### PDF uploads return empty text

- The PDF may be a scanned image. Check that Tesseract is installed and the path is correct
- Windows default: `C:\Program Files\Tesseract-OCR\tesseract.exe`
- Set the `TESSERACT_CMD` environment variable to override the path

### High CPU usage during generation

Normal. Kokoro uses all available CPU cores during the single forward pass. Usage returns to near-zero after generation completes (~11 seconds).

---

## 17. Performance Notes

### Kokoro-82M on Intel i5-1340P (local benchmark)

| Text length | Generation time | RTF  |
| ----------- | --------------- | ---- |
| ~30 chars   | ~1.7s           | ~0.2 |
| ~200 chars  | ~11s            | ~1.2 |
| ~500 chars  | ~25s            | ~1.2 |

**RTF (Real-Time Factor):** ratio of generation time to audio duration. RTF 1.2 means generating 10 seconds of audio takes 12 seconds. RTF < 1.0 would mean generation is faster than real-time.

### On Hugging Face Spaces free tier (2 shared vCPUs)

Generation is typically 1.5–2× slower than on a dedicated i5: ~15–30 seconds for a 200-character sentence.

### Tips for faster generation

1. Keep text under 500 characters per generation
2. Close other CPU-intensive applications while generating
3. Plug in your laptop — power-saving mode throttles CPU cores
4. Use shorter speed presets (1.25× and 1.5×) — faster playback generation
5. Keep the backend running — model load is 5 seconds; restarting wastes it

---

## 18. Quick Reference — Commands

### Development

| What                     | Command                                | Directory        |
| ------------------------ | -------------------------------------- | ---------------- |
| Start everything         | `.\start.bat`                          | Project root     |
| Start backend only       | `.\run.bat`                            | `backend/`       |
| Start frontend only      | `npm run dev`                          | Project root     |
| Build frontend           | `npm run build`                        | Project root     |
| Install frontend deps    | `npm install`                          | Project root     |

### Docker

| What                        | Command                             | Directory    |
| --------------------------- | ----------------------------------- | ------------ |
| Start backend in Docker     | `docker-compose up --build`         | Project root |
| Stop Docker                 | `docker-compose down`               | Project root |
| Build image only            | `docker build -t vocably-backend .` | `backend/`   |

### Python virtualenv

| What                    | Command                              | Directory        |
| ----------------------- | ------------------------------------ | ---------------- |
| Create venv             | `python -m venv venv`                | `backend/`       |
| Activate (Windows)      | `venv\Scripts\activate`              | `backend/`       |
| Install dependencies    | `pip install -r requirements.txt`    | `backend/` (venv)|
| Check installed package  | `pip show kokoro`                    | `backend/` (venv)|

### Git

| What                        | Command                         |
| --------------------------- | ------------------------------- |
| Stage specific file         | `git add backend/main.py`       |
| Check staged changes        | `git status`                    |
| Commit                      | `git commit -m "message"`       |
| Sync before push            | `git pull origin main --rebase` |
| Push                        | `git push`                      |

### Access points

| URL                              | What                       |
| -------------------------------- | -------------------------- |
| http://localhost:5173            | Vocably UI                 |
| http://localhost:8000/health     | Backend readiness check    |
| http://localhost:8000/docs       | Interactive API docs       |
| http://localhost:11434           | Ollama API (if running)    |

---

## 19. FAQ

---

**Q: Does Ollama need to be running for the app to work?**

No. Ollama is only used by the Upload & Clean feature. If Ollama is not running, you can still type text directly and use TTS normally. Uploading a file without Ollama running will load the text as-is, without filler removal — a notice appears in the UI to explain this.

---

**Q: Why does the backend take ~60 seconds to be ready on first launch?**

Two things happen during startup:

1. Kokoro downloads `af_heart.pt` from Hugging Face Hub (~2–10 MB). On first run, this also triggers a `spacy en-core-web-sm` download (~13 MB).
2. The pre-warm step generates a short audio clip to cache the voice file.

On subsequent launches (model and voice already cached), startup takes ~15 seconds.

---

**Q: Why does the Play button stay disabled until the backend is ready?**

If the Play button were enabled immediately, the first TTS request would either fail (backend not yet listening) or timeout (voice file downloading mid-request). The `_ready` flag and health polling exist to prevent this exact situation. The UI disables the button until `/health` returns `{"status": "healthy"}`, which only happens after the model is loaded and the voice is pre-warmed.

---

**Q: Can I delete the `welcome-to-docker` container in Docker Desktop?**

Yes. It is Docker's built-in tutorial container, created when you first installed Docker Desktop. It has no relation to Vocably. Delete it from Docker Desktop → Containers, and delete the `docker/welcome-to-docker` image from Docker Desktop → Images.

---

**Q: Why does adding environment variables to HF Spaces restart the server?**

HF Spaces injects environment variables into the container at startup. The only way to make a new variable available to the running process is to restart the container so it starts fresh with the new environment. This takes ~2–3 minutes including model warmup. It is expected behaviour.

---

**Q: The frontend is at a different domain than the backend. Why doesn't the browser block requests?**

The browser enforces CORS — by default it blocks cross-origin requests. FastAPI's `CORSMiddleware` tells the browser explicitly that cross-origin requests are allowed. The browser only blocks the request if the server does not respond with the correct `Access-Control-Allow-Origin` header. CORS is purely a browser enforcement; server-to-server requests (like from `curl` or Postman) are never subject to it.

---

**Q: Why is the default voice `af_heart` pre-warmed but not the others?**

Pre-warming every voice would extend startup by several minutes (15 voices × ~30s each). The default voice (`af_heart`) covers the most common use case. Other voices download their files on first use — the latency is only paid once per voice per server session, after which they are cached.

---

**Q: What happens if two users click Play at the same time?**

The second request is queued. `ThreadPoolExecutor(max_workers=1)` ensures only one Kokoro generation runs at a time. The second request waits in line until the first generation finishes, then starts. The 300-second `asyncio.wait_for` timeout applies per request, so if the queue grows large, earlier requests might time out.

---

**Q: Why does TTS generation take longer on HF Spaces than locally?**

HF Spaces free tier provides 2 shared vCPUs. "Shared" means the physical CPU cores are time-multiplexed with other tenants' workloads. On a dedicated Intel i5-1340P (4P + 8E cores), Kokoro has full, uncontested access to all cores. On HF Spaces, it gets a fraction of two cores. This results in roughly 2× longer generation time.

---
