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
8. [Streaming TTS — Architecture & Implementation](#8-streaming-tts--architecture--implementation)
9. [Upload & Clean — The Text Preparation Pipeline](#9-upload--clean--the-text-preparation-pipeline)
10. [Backend Deep Dive — FastAPI](#10-backend-deep-dive--fastapi)
11. [Frontend Deep Dive — React & Vite](#11-frontend-deep-dive--react--vite)
12. [AI & ML Concepts — Kokoro-82M](#12-ai--ml-concepts--kokoro-82m)
13. [HTTP Status Codes Reference](#15-http-status-codes-reference)
16. [Troubleshooting](#16-troubleshooting)
17. [Performance Notes](#17-performance-notes)
18. [Quick Reference — Commands](#18-quick-reference--commands)
19. [FAQ](#19-faq)
20. [Code Reference — Module Design Notes](#20-code-reference--module-design-notes)
21. [Streaming TTS — Web Audio API Reference](#21-streaming-tts--web-audio-api-reference)

---

## 1. Project Overview

Vocably is a full-stack text-to-speech (TTS) application. You type or paste text — or upload a file — and the app converts it to high-quality spoken audio using an AI model called Kokoro-82M.

### What makes it production-grade

Most tutorial TTS projects are a single Python script that generates a WAV file. Vocably is structured like a real application:

| Concern              | How Vocably handles it                                   |
| -------------------- | -------------------------------------------------------- |
| Concurrency          | Kokoro runs in a thread pool, so the HTTP server stays responsive while audio is generating |
| Startup safety       | The Play button stays disabled until the server is fully ready (model loaded, voice warmed up) |
| Text preprocessing   | Uploaded transcripts and PDFs are cleaned by an LLM before reaching the TTS engine |

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

**How it's used in Vocably:** `main.py` calls `uvicorn.run("main:app", host="0.0.0.0", port=8000)` as its entry point.

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

### 2.8 PyMuPDF (fitz) + Pytesseract

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

## 3. Architecture — How the System Fits Together

### 3.1 System layers

```
┌───────────────────────────────────────────────────────────────────┐
│  BROWSER  ·  localhost:5173                                       │
│                                                                   │
│  Hero.jsx       — TTS card, upload button, voice/speed selectors  │
│  Navbar.jsx     — nav links                                       │
│                                                                   │
│  useTTS.js      — calls /api/tts, decodes audio, polls /health    │
└──────────────────────────────┬────────────────────────────────────┘
                               │ POST /api/tts
                               │ POST /api/clean
                               │ POST /api/extract-pdf
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND  ·  localhost:8000                                       │
│  FastAPI + Uvicorn                                                │
│                                                                   │
│  GET  /health        — returns "healthy" only when _ready=True    │
│  POST /api/tts       — Kokoro → base64 WAV                        │
│  GET  /api/voices    — returns voice list                         │
│  POST /api/clean     — parse + Ollama → clean text                │
│  POST /api/extract-pdf — pymupdf/OCR + Ollama                     │
│  POST /api/youtube-transcript — youtube-transcript-api + Ollama   │
│                                                                   │
│  CORS       — allows all origins                                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │ Thread pool executor
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│  ML MODEL  ·  Kokoro-82M  (hexgrad/Kokoro-82M)                    │
│  PyTorch · CPU float32 · 24 kHz · ~1–2 GB RAM                    │
│                                                                   │
│  Input  — text + voice name + speed float                         │
│  Output — numpy array of float32 PCM samples                      │
│  Cache  — ~/.cache/huggingface/hub                                │
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
│   ├── main.py             # FastAPI server — all endpoints, Kokoro pipeline, Upload & Clean
│   ├── requirements.txt    # Python dependencies (pinned versions)
│   ├── run.bat             # Backend startup script (Windows, local dev)
│   └── venv/               # Python virtual environment (local dev)
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
├── start.bat               # Combined startup script (local dev)
├── .env.development        # VITE_TTS_BACKEND_URL=http://localhost:8000
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
4. Type or paste text — up to 10,000 characters
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

## 8. Streaming TTS — Architecture & Implementation

### The problem with batch generation

The original `/api/tts` endpoint collects all Kokoro audio segments into a single NumPy array, encodes the concatenated WAV as base64 JSON, and returns it in one response. For long text (9,000 chars ≈ 80 sentences), this means:

- Total generation time: ~10–12 minutes (RTF ~1.24 × ~8.5 min audio duration)
- Time-to-first-audio: equal to total generation time — user waits the full duration before hearing a single word
- `asyncio.wait_for` timeout of 600s is exceeded, returning HTTP 504

### The solution: NDJSON streaming with per-sentence WAV chunks

Kokoro's `KPipeline.__call__()` is a **generator** — it yields `(graphemes, phonemes, audio_np)` tuples one sentence at a time. Instead of collecting all yielded arrays, the streaming endpoint encodes each sentence's audio immediately and sends it to the client as it is produced.

**Transport format: NDJSON (Newline-Delimited JSON)**

Each line in the response body is a complete JSON object terminated by `\n`:
```
{"audio_base64": "UklGRiQ..."}\n
{"audio_base64": "UklGRlA..."}\n
{"audio_base64": "UklGRnA..."}\n
```

Each `audio_base64` value is a **complete, self-contained WAV file** (44-byte header + PCM_16 payload) for one sentence. This is critical: `AudioContext.decodeAudioData()` requires a complete, valid audio file — it cannot decode raw PCM or partial WAV streams. Since `soundfile.write()` produces a full WAV per call, the constraint is naturally satisfied.

**Why NDJSON over raw PCM streaming:**
- Raw PCM requires the client to know the sample rate and bit depth out-of-band, and WAV chunk boundaries do not align with TCP/HTTP read boundaries — robust boundary detection is non-trivial
- NDJSON per complete WAV: zero boundary detection logic; each `reader.read()` chunk is accumulated into a line buffer and parsed when `\n` is encountered
- 33% base64 size overhead is negligible against generation time savings (2s first audio vs 10+ min)

### Backend implementation

**The thread-to-asyncio bridge pattern:**

`_pipeline()` is CPU-bound and synchronous — it must run in the `ThreadPoolExecutor`. The streaming endpoint needs to be an async generator so FastAPI can flush bytes to the client as they are produced. The bridge between the two is `asyncio.Queue` + `loop.call_soon_threadsafe`:

```python
_stream_stop_event: Optional[threading.Event] = None  # module-level

@app.post("/api/tts/stream")
async def stream_speech(request_data: TTSRequest, http_request: Request):
    global _stream_stop_event

    # Signal any running stream to exit at the next sentence boundary
    if _stream_stop_event is not None:
        _stream_stop_event.set()
    stop_event = threading.Event()
    _stream_stop_event = stop_event

    loop = asyncio.get_running_loop()
    audio_queue: asyncio.Queue = asyncio.Queue()

    def _stream_sync():
        # Runs in ThreadPoolExecutor — cannot use await
        try:
            for _, _, audio in _pipeline(text, voice=voice, speed=speed,
                                          split_pattern=r'\n+|(?<=[.!?])\s+'):
                if stop_event.is_set():
                    break  # new request cancelled this stream
                buf = io.BytesIO()
                sf.write(buf, audio, 24000, format="WAV", subtype="PCM_16")
                b64 = base64.b64encode(buf.getvalue()).decode()
                # Thread-safe: schedules put_nowait on the event loop thread
                loop.call_soon_threadsafe(audio_queue.put_nowait, b64)
        except Exception as e:
            logger.error(f"TTS stream error: {e}")
        finally:
            # Sentinel: tells the async consumer that generation is complete
            loop.call_soon_threadsafe(audio_queue.put_nowait, None)

    _executor.submit(_stream_sync)

    async def _response_gen():
        while True:
            try:
                chunk = await asyncio.wait_for(audio_queue.get(), timeout=120.0)
            except asyncio.TimeoutError:
                break
            if chunk is None:  # sentinel received
                break
            yield json.dumps({"audio_base64": chunk}) + "\n"
            if await http_request.is_disconnected():
                break  # client closed connection — stop sending

    return StreamingResponse(_response_gen(), media_type="application/x-ndjson")
```

**`loop.call_soon_threadsafe(audio_queue.put_nowait, value)`** is the correct pattern for putting items on an asyncio Queue from a non-async thread. `put_nowait` is non-blocking (raises `QueueFull` on bounded queues, but this queue is unbounded). `call_soon_threadsafe` schedules it on the event loop thread without blocking the worker thread.

**`_stream_stop_event` / `threading.Event` cancellation** — The `ThreadPoolExecutor` has `max_workers=1`, so only one `_stream_sync` runs at a time. If the user presses Stop and Play again (or changes speed mid-stream), a new `POST /api/tts/stream` request arrives while the old `_stream_sync` is still running. Without cancellation, the new task queues behind the old one and its `_response_gen()` times out after 120s waiting for chunks that will never arrive (the old `_stream_sync` is filling a different, now-unconsumed queue). The `threading.Event` fixes this: each new request calls `_stream_stop_event.set()`, which the running `_stream_sync` checks between sentence yields. It breaks out within ~1–2s (one sentence's generation time), freeing the executor thread for the new task.

**`request.is_disconnected()`** is a FastAPI/Starlette ASGI method that checks whether the HTTP client has closed the connection. It is checked **after** each `yield` (not before `queue.get()`) — checking before `yield` triggers a Starlette bug where the buffered `http.disconnect` ASGI event from request body parsing causes it to return `True` immediately on the first loop iteration, terminating the stream before any audio is sent.

**`split_pattern=r'\n+|(?<=[.!?])\s+'`** — The lookbehind `(?<=[.!?])` splits after sentence-ending punctuation without consuming the punctuation (it stays attached to the preceding sentence). This improves prosody at sentence boundaries compared to splitting on whitespace alone. Without this pattern, a 9,000-char transcript with no newlines would be processed as a single segment — a single enormous forward pass through the model.

### Frontend implementation

**Why Web Audio API instead of `<audio>` element:**

The HTML `<audio>` element cannot schedule future playback with sample-accurate timing. Each chunk would need to wait until the previous chunk's `onended` event fires before starting — introducing gaps proportional to JavaScript event loop latency. `AudioContext` has an internal clock (`AudioContext.currentTime`, a float64 in seconds) that is independent of the JS event loop. `AudioBufferSourceNode.start(when)` schedules playback against this clock with sub-millisecond accuracy.

**Gapless scheduling pattern:**

```js
// nextStartTimeRef tracks when the last scheduled chunk ends
nextStartTimeRef.current = ctx.currentTime + 0.05; // initial offset

// Per chunk:
const source = ctx.createBufferSource();
source.buffer = audioBuffer;
source.connect(ctx.destination);

const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.01);
source.start(startAt);
nextStartTimeRef.current = startAt + audioBuffer.duration;
```

`Math.max(nextStartTimeRef.current, ctx.currentTime + 0.01)` handles the case where decoding a chunk takes longer than the previous chunk's playback — rather than scheduling in the past (which would cause `InvalidStateError`), it clamps to `currentTime + 0.01` (10ms from now), creating a minimal and imperceptible gap.

**Stream reading with line accumulation:**

HTTP chunked transfer does not guarantee that `reader.read()` delivers data aligned to NDJSON line boundaries. A single `read()` call may return a partial line, multiple lines, or parts of multiple lines. The line buffer pattern handles this:

```js
const reader = response.body.getReader();
const decoder = new TextDecoder();
let lineBuffer = "";

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop(); // lines.pop() removes the last (potentially incomplete) element

    for (const line of lines) {
        if (!line.trim()) continue;
        const { audio_base64 } = JSON.parse(line);
        // ... decode and schedule
    }
}
```

`TextDecoder` with `{ stream: true }` maintains internal state across calls to handle multi-byte UTF-8 sequences that may be split across read boundaries.

**`decodeAudioData` and ArrayBuffer ownership:**

```js
const bytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0));
const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
```

`decodeAudioData` **transfers ownership** of the ArrayBuffer — after the call, `bytes.buffer` is detached and cannot be read. This is intentional: the Web Audio API takes the buffer to avoid a copy. Do not attempt to read `bytes` after passing `.buffer` to `decodeAudioData`.

**Session ID pattern for concurrent request safety:**

```js
const sessionId = ++sessionIdRef.current;

// ... async operations ...

// Guard state updates against stale sessions:
if (sessionIdRef.current === sessionId) setIsSpeaking(false);
```

If the user clicks Stop and immediately clicks Play again, two async flows are active simultaneously. The session ID increments on each Play, so the `onended` callback from the first session's `lastSource` will find `sessionIdRef.current !== sessionId` and skip the `setIsSpeaking(false)` call — preventing the second session's speaking state from being incorrectly cleared.

**Client-side WAV assembly for download:**

After the stream ends, all collected `Float32Array` PCM channel data is concatenated and encoded into a WAV blob without a round-trip to the server:

```js
function buildWav(pcmFloat32, sampleRate = 24000) {
    const n = pcmFloat32.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    // RIFF chunk descriptor
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true);
    w(8, "WAVE"); w(12, "fmt ");
    // fmt sub-chunk (16 bytes, PCM format)
    v.setUint32(16, 16, true);   // sub-chunk size
    v.setUint16(20, 1, true);    // PCM = 1
    v.setUint16(22, 1, true);    // channels = 1 (mono)
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true); // byteRate = sampleRate × channels × bitDepth/8
    v.setUint16(32, 2, true);    // blockAlign = channels × bitDepth/8
    v.setUint16(34, 16, true);   // bitsPerSample
    // data sub-chunk
    w(36, "data"); v.setUint32(40, n * 2, true);
    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, pcmFloat32[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: "audio/wav" });
}
```

`AudioBuffer.getChannelData(0)` returns a `Float32Array` view into the buffer's internal storage. The view remains valid as long as the `AudioBuffer` is not garbage-collected. Since scheduled `AudioBufferSourceNode` instances hold a reference to their buffer, and sources are held in `scheduledSourcesRef`, the buffers persist until `stopPlayback()` clears the array.

### Before vs after

| Metric | Before (batch) | After (streaming) |
|---|---|---|
| Time-to-first-audio (~9k chars) | ~10–12 min | ~1–2s |
| Timeout risk | Yes — exceeded 600s | None — per-chunk 120s max |
| Backend endpoint | `POST /api/tts` → base64 JSON | `POST /api/tts/stream` → NDJSON |
| Audio playback API | `HTMLAudioElement` | `AudioContext` + `AudioBufferSourceNode` |
| Gapless between chunks | N/A (single file) | Yes — `AudioContext` clock scheduling |
| Download source | `URL.createObjectURL(blob)` | Client-assembled WAV from collected PCM |
| Stop mechanism | `audio.pause()` | `AbortController.abort()` + `source.stop()` |

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
setText(cleaned.slice(0, 10000))  ← loaded into textarea
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
setText(cleaned.slice(0, 10000))  ← loaded into textarea
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

The current configuration uses `allow_origins=["*"]` — open for local development.

### 10.5 All endpoints

| Method | Path                      | Auth   | Description                                                      |
| ------ | ------------------------- | ------ | ---------------------------------------------------------------- |
| GET    | `/health`                 | None   | Returns `{"status": "healthy"}` when model is ready              |
| POST   | `/api/tts`                | None   | Generates full audio from text, returns base64 WAV JSON          |
| POST   | `/api/tts/stream`         | None   | Streams audio sentence-by-sentence as NDJSON (use this for play) |
| GET    | `/api/voices`             | None   | Returns available voices grouped by accent                        |
| POST   | `/api/clean`              | None   | Cleans text/SRT/VTT via regex + Ollama                           |
| POST   | `/api/extract-pdf`        | None   | Extracts and cleans text from uploaded PDF                        |
| POST   | `/api/youtube-transcript` | None   | Fetches and cleans YouTube captions by URL                        |
| GET    | `/docs`                   | None   | Auto-generated Swagger UI                                         |

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

`useTTS.js` is a custom React hook that encapsulates all TTS-related state and side effects. It uses the streaming `/api/tts/stream` endpoint and the Web Audio API for gapless playback. Consumer components receive a stable interface:

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

`handlePlay` is a toggle: if `isSpeaking || isLoading`, it calls `stopPlayback()` (aborts the fetch, stops all scheduled `AudioBufferSourceNode`s). Otherwise it initiates a new streaming session. `hasAudio` becomes `true` after all stream chunks are received and the download blob is assembled — it may become true while playback is still in progress.

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
VITE_TTS_BACKEND_URL=http://localhost:8000
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

### "Cannot connect to TTS server"

- Confirm the backend is running: visit http://localhost:8000/health in a browser
- If the health check works but the frontend cannot connect, check that `.env.development` contains `VITE_TTS_BACKEND_URL=http://localhost:8000`

### TTS generation times out (504)

This should not occur with the streaming endpoint. If using `/api/tts` directly (e.g. via the API docs at `/docs`), 9,000+ character inputs can exceed 600s on CPU. Use `/api/tts/stream` instead, or reduce input length. Check backend logs for the specific exception.

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
| ~9,000 chars | ~10–12 min (batch) / ~8–10 min total, **first audio in ~2s** (stream) | ~1.24 |

**RTF (Real-Time Factor):** ratio of generation time to audio duration. RTF 1.2 means generating 10 seconds of audio takes 12 seconds. RTF < 1.0 would mean generation is faster than real-time.

### Tips for faster generation

1. Use the streaming endpoint (`/api/tts/stream`) for any text over ~500 characters — first audio arrives in ~2s regardless of total length
2. The `split_pattern=r'\n+|(?<=[.!?])\s+'` in `_generate_sync` and `_stream_sync` splits text at sentence boundaries — processing one sentence per forward pass is significantly faster than a single large forward pass
3. Close other CPU-intensive applications during generation
4. Plug in your laptop — power-saving mode throttles CPU performance states
5. Keep the backend running — model load takes ~5s; the voice cache pre-warm adds another ~10s on first start

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

**Q: The frontend is at a different domain than the backend. Why doesn't the browser block requests?**

The browser enforces CORS — by default it blocks cross-origin requests. FastAPI's `CORSMiddleware` tells the browser explicitly that cross-origin requests are allowed. The browser only blocks the request if the server does not respond with the correct `Access-Control-Allow-Origin` header. CORS is purely a browser enforcement; server-to-server requests (like from `curl` or Postman) are never subject to it.

---

**Q: Why is the default voice `af_heart` pre-warmed but not the others?**

Pre-warming every voice would extend startup by several minutes (15 voices × ~30s each). The default voice (`af_heart`) covers the most common use case. Other voices download their files on first use — the latency is only paid once per voice per server session, after which they are cached.

---

**Q: What happens if two users click Play at the same time?**

The second request is queued. `ThreadPoolExecutor(max_workers=1)` ensures only one Kokoro generation runs at a time. The second request waits in line until the first generation finishes, then starts. The 300-second `asyncio.wait_for` timeout applies per request, so if the queue grows large, earlier requests might time out.

---

## 20. Code Reference — Module Design Notes

This section documents implementation decisions that live closest to the code itself. It covers the "why" behind specific constants, patterns, data shapes, and component design choices.

---

### 20.1 `backend/main.py` — Global State

Three module-level variables hold the server's shared state:

```python
_pipeline = None        # Kokoro KPipeline — loaded once at startup, shared across requests
_executor = None        # ThreadPoolExecutor(max_workers=1) — Kokoro is not thread-safe
_ready    = False       # True only after pipeline load AND voice pre-warm are both complete
```

`_ready` is a separate flag from `_pipeline is not None` precisely because the pipeline can exist but still be performing the voice pre-warm. The `/health` endpoint checks `_ready`, not `_pipeline`, so clients never receive `"healthy"` until the server can genuinely serve its first request without extra latency.

---

### 20.2 Regex Patterns — Annotated

**`_TIMESTAMP_RE`** uses Python's verbose (`re.VERBOSE`) mode, which ignores whitespace and allows inline comments inside the pattern string itself. The two alternatives it matches are:

```
\[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[,\.]\d+)?\]?\)?
```
Matches timestamps in any of these forms:
- `[00:01:23]` — bracket-wrapped HH:MM:SS (YouTube SRT)
- `(1:23)` — paren-wrapped M:SS
- `00:01:23,456` — SRT timestamp with comma-milliseconds
- `00:01:23.456` — VTT timestamp with dot-milliseconds

```
\[\d+\]
```
Matches subtitle sequence numbers like `[1]`, `[12]` — numeric-only bracket content that appears at the start of each SRT/VTT cue.

**`_SPEAKER_LABEL_RE`** is intentionally conservative. It only strips the unambiguous `Speaker N:` / `SPEAKER 01:` pattern. It does **not** strip named labels like `Dr. Chen:` or `John:` because a colon after a name is common in legitimate prose (e.g., "Note: this is important"). Stripping named labels would corrupt interview transcripts. The conservative pattern keeps content intact at the cost of leaving some speaker labels in place when the format is ambiguous.

**`_TAG_RE`** (`<[^>]+>`) strips inline HTML tags from subtitle cue content — bold `<b>`, italic `<i>`, underline `<u>`, and any other HTML tags that subtitle authoring tools sometimes embed.

---

### 20.3 Pydantic Model Field Notes

Two response fields encode operational state for the frontend:

| Field             | Model           | Type   | Meaning                                                            |
| ----------------- | --------------- | ------ | ------------------------------------------------------------------ |
| `available: bool` | `CleanResponse` | bool   | `False` if Ollama was unreachable — text loaded without AI cleanup |
| `available: bool` | `YouTubeResponse` | bool | Same — `False` if Ollama was down during transcript cleaning       |
| `method: str`     | `PDFResponse`   | str    | `"digital"` (pymupdf text layer) or `"ocr"` (Tesseract fallback)  |

The frontend uses `available` to decide whether to show a success notice ("cleaned with AI") or a warning notice ("Ollama unavailable, loaded as-is"). The `method` field drives the PDF notice text: "PDF extracted (3p, OCR)" vs "PDF extracted (3p, digital)".

---

### 20.4 Speed Clamping

The `speed` parameter in `/api/tts` is clamped before being passed to Kokoro:

```python
speed = max(0.5, min(2.0, request.speed or 1.0))
```

This guards against out-of-range values that would cause Kokoro to behave unexpectedly (very low speeds produce near-silence; very high speeds cause audio artifacts). `0.5–2.0` is the safe operating range for Kokoro's StyleTTS2 model.

---

### 20.5 Lazy Imports

Three libraries are imported inside their respective functions rather than at module load time:

- `fitz` (pymupdf) — imported inside `_extract_pdf()`
- `pytesseract` + `PIL` — imported inside `_extract_pdf()`
- `youtube_transcript_api` — imported inside `youtube_transcript()`
- `srt` — imported inside `_parse_srt()`

This is intentional: it keeps startup fast and allows the server to run without these optional dependencies installed. If a user calls an endpoint that requires one of them and it is not installed, they receive a `501 Not Implemented` error with a `pip install` command to fix it.

---

### 20.6 YouTube Transcript API — v1.x Notes

The `youtube-transcript-api>=1.2.4` API changed from the `0.x` style in two important ways:

1. **Instantiation required:** `YouTubeTranscriptApi().fetch(video_id)` (instance method), not `YouTubeTranscriptApi.get_transcript(video_id)` (class method from v0.x).
2. **Snippet objects, not dicts:** Each element in the returned iterable is an object with `.text`, `.start`, and `.duration` attributes — not a plain dict with string keys.

The text assembly step reflects this:

```python
raw_text = " ".join(
    s.text.replace("\n", " ").strip()
    for s in result
    if s.text.strip()
)
```

`s.text.replace("\n", " ")` collapses line breaks that appear inside individual caption snippets before joining them all with spaces.

---

### 20.7 `_extract_video_id` — URL Patterns

The function recognises five YouTube URL formats via separate regex patterns:

| Pattern                          | Matches URL format                    |
| -------------------------------- | ------------------------------------- |
| `(?:v=)([a-zA-Z0-9_-]{11})`      | `youtube.com/watch?v=ID`              |
| `(?:youtu\.be/)([a-zA-Z0-9_-]{11})` | `youtu.be/ID` (short link)        |
| `(?:embed/)([a-zA-Z0-9_-]{11})` | `youtube.com/embed/ID` (embedded player) |
| `(?:shorts/)([a-zA-Z0-9_-]{11})` | `youtube.com/shorts/ID`              |
| `(?:live/)([a-zA-Z0-9_-]{11})`   | `youtube.com/live/ID`                |

All YouTube video IDs are exactly 11 characters from the alphabet `[a-zA-Z0-9_-]`. The function returns `None` if no match is found, which the endpoint translates into an HTTP 400 with a clear error message.

---

### 20.8 Authentication — Removed

JWT authentication was present in earlier versions (commit `3070681` removed it). The application now has no authentication layer. All endpoints accept requests without credentials. CORS is open (`allow_origins=["*"]`) for local development.

---

### 20.9 `src/utils/constants.js` — Data Shapes

**`SPEED_PRESETS`** replaces a "Tone" selector that existed in the Qwen3-TTS era. Qwen3-TTS accepted natural language tone instructions ("speak enthusiastically"). Kokoro-82M does not support tone instructions — only a numeric speed multiplier. The preset labels (Slow, Normal, Fast, Very Fast) map to speed values (0.75, 1.0, 1.25, 1.5).

**`USE_CASES`** are demo script badges designed for faceless YouTube content niches (Finance, AI & Tech, History, Motivation). Clicking a badge loads a pre-written hook script into the textarea, letting new users immediately try the app with realistic content.

---

### 20.10 `src/hooks/useAuth.js` — Removed

`useAuth.js` was removed along with the JWT authentication system (commit `3070681`). The app renders directly to the `Hero` component on load. There is no login page, no token, and no `Authorization` header on API requests.

---

### 20.11 `src/hooks/useTTS.js` — State Machine

`backendStatus` is a four-state string enum:

| Value       | Meaning                                                       | UI shown                          |
| ----------- | ------------------------------------------------------------- | --------------------------------- |
| `"checking"` | First health poll not yet complete                           | Play button greyed out            |
| `"warming"`  | Backend responding but `_ready` flag is `false`              | Amber "warming up" banner         |
| `"ready"`    | `/health` returned `{"status": "healthy"}`                   | Play button enabled               |
| `"offline"`  | Network error or non-2xx from `/health`                      | Red "offline" banner              |

Once `"ready"` is reached, the polling interval is cleared — no further polls are made.

The hook uses three refs that survive re-renders without triggering them:

| Ref | Type | Purpose |
|---|---|---|
| `audioCtxRef` | `AudioContext \| null` | Reused across play sessions; created on first user gesture |
| `scheduledSourcesRef` | `AudioBufferSourceNode[]` | Held so `stopPlayback()` can call `.stop()` on each |
| `nextStartTimeRef` | `number` | AudioContext clock timestamp: when the last scheduled chunk ends |
| `abortRef` | `AbortController \| null` | Cancelled on stop to close the fetch stream |
| `collectedPCMRef` | `Float32Array[]` | Channel data from each decoded chunk, for download assembly |
| `downloadBlobRef` | `Blob \| null` | Assembled WAV blob; available as soon as stream ends |
| `sessionIdRef` | `number` | Monotonically incrementing; guards async callbacks against stale sessions |

`AudioContext` must be created inside a user gesture handler (the Play button click) — browsers block `AudioContext` construction or suspend it if triggered outside user interaction. The `ctx.state === "suspended"` check with `ctx.resume()` handles browsers (primarily Safari) that suspend the context even when created inside a click handler.

---

### 20.12 `src/pages/Hero.jsx` — Component Structure

**`VOICE_ITEMS` and `SPEED_ITEMS`** are computed from the `VOICES` and `SPEED_PRESETS` constants and defined at module level, outside the `Hero` component. This ensures they are created once when the module loads — not on every render of the component. Since they reference only imported constants (no component state), they never need to be re-derived.

**File input reset (`e.target.value = ""`**): After a file is selected and processed, the input element's value is cleared. This allows the same file to be re-uploaded immediately — without this reset, selecting the same file a second time would not trigger the `onChange` event because the browser sees no change in the input's value.

**`cleanNotice` shape:** `{ type: "success" | "warn", message: string }`. The `type` field drives the visual styling (green border for success, amber border for warning). `null` means no notice is shown.

---

### 20.13 `src/components/Hero/DropupSelector.jsx` — Props API

`DropupSelector` is a generic reusable component used for both the Voice and Speed selectors. Its props:

| Prop            | Type            | Description                                                          |
| --------------- | --------------- | -------------------------------------------------------------------- |
| `items`         | `{ value, label, icon? }[]` | List of selectable options                             |
| `selectedValue` | `any`           | The currently selected value (compared with `item.value`)            |
| `onChange`      | `(value) => void` | Called with the new value when the user picks an option            |
| `label`         | `string`        | Micro-label shown above the selected option name (e.g. "Voice")      |
| `triggerIcon`   | `string`        | Remix Icon class used in the trigger button when `item.icon` is absent |

The **click-outside close** behaviour uses `document.addEventListener("mousedown", ...)` rather than `"click"` to fire before the click event propagates to child elements — this prevents edge cases where clicking inside the dropdown simultaneously triggers both a selection and the outside-click close handler.

The component opens **upward** (`bottom-full mb-2`) rather than downward because the selectors sit in the footer row of the card, and a downward dropdown would overflow the card's bottom edge.

---

### 20.14 `FlyoutLink.jsx` — The Hover Bridge Technique

The flyout panel uses `top-full pt-4` to create an invisible gap between the trigger link and the dropdown panel:

```jsx
<div className="absolute left-1/2 top-full -translate-x-1/2 pt-4 flyout-container">
```

- `top-full` places the dropdown container's top edge at the bottom of the trigger element, with zero gap.
- `pt-4` (16 px of padding-top) creates visible space between the trigger text and the dropdown box.

Without this padding, moving the mouse from the trigger link diagonally toward the dropdown panel would cross a gap where neither element is hovered — firing `onMouseLeave` and closing the panel before the cursor arrives. The padding creates a continuous hover region (a "bridge") that keeps `onMouseEnter` active during diagonal movement. The panel's visual appearance uses the 16 px of padding as whitespace, so users perceive a gap — but the hover area is actually continuous.

---

### 20.15 `Navbar.jsx` — Layout Approach

The desktop navbar uses an absolute-center approach for the navigation links:

```jsx
<div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ...">
```

This positions the links at the exact geometric center of the navbar regardless of the widths of the Logo (left) and Logout button (right). A `flex justify-center` approach would be off-center if the left and right elements have different widths. The `NAV_LINKS` array drives both the desktop flyout navigation and the mobile accordion — the same data source renders both layouts.

---

## 21. Streaming TTS — Web Audio API Reference

### AudioContext lifecycle

`AudioContext` is created once per `useTTS` hook instance and reused across play sessions. `AudioContext.close()` is called in the `useEffect` cleanup (component unmount). Creating a new `AudioContext` per play session was considered but rejected — browsers enforce a limit on the number of concurrent `AudioContext` instances per page (typically 6 in Chrome). Reusing one context avoids this limit and eliminates the ~10ms context initialization overhead per play.

`AudioContext.currentTime` is a read-only float64 that increases monotonically at the audio sample rate from the moment the context is created. It is the reference clock for all scheduling. `AudioContext.currentTime` cannot be set or paused.

### AudioBufferSourceNode constraints

`AudioBufferSourceNode` is a **one-shot node** — it can only be started once. Calling `.start()` a second time throws `InvalidStateError`. This is why a new source node is created per chunk rather than reusing one. Calling `.stop()` on a source that has already ended also throws — hence the `try/catch` in `stopPlayback()`.

```js
scheduledSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
```

### decodeAudioData transfer semantics

`AudioContext.decodeAudioData(arrayBuffer)` transfers ownership of the `ArrayBuffer` to the audio subsystem. The buffer becomes detached after the call — `byteLength` becomes 0 and any typed array view into it throws `TypeError`. The decoded `AudioBuffer` is a separate object allocated by the audio subsystem.

The PCM channel data is collected **before** the source node is created and started:

```js
const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
collectedPCMRef.current.push(audioBuffer.getChannelData(0)); // collect Float32Array view
const source = ctx.createBufferSource();
source.buffer = audioBuffer;
```

`getChannelData(0)` returns a live `Float32Array` view into the `AudioBuffer`'s internal PCM storage. The view remains valid as long as the `AudioBuffer` is alive. The `AudioBuffer` is alive as long as `source.buffer` references it — and `source` is held in `scheduledSourcesRef`. This chain prevents premature GC.

### NDJSON streaming — browser Fetch API

`response.body` is a `ReadableStream<Uint8Array>`. Each call to `reader.read()` resolves with a `{ done: boolean, value: Uint8Array }`. The `value` is a raw network buffer — its size is determined by TCP segment boundaries, not by application-level message boundaries.

`TextDecoder` with `{ stream: true }` maintains state between `decode()` calls. Without this flag, multi-byte UTF-8 sequences split across two `Uint8Array` chunks would produce replacement characters (`U+FFFD`). With `{ stream: true }`, the decoder buffers incomplete sequences internally.

The line accumulator pattern:
```js
lineBuffer += decoder.decode(value, { stream: true });
const lines = lineBuffer.split("\n");
lineBuffer = lines.pop(); // last element may be incomplete
```
`split("\n")` on `"a\nb\nc"` returns `["a", "b", "c"]`. `pop()` removes `"c"` (potentially incomplete). `split("\n")` on `"a\nb\n"` returns `["a", "b", ""]`. `pop()` removes `""` — an empty string. Both cases are handled correctly: `if (!line.trim()) continue` skips the empty string.

### CORS and streaming

`StreamingResponse` flushes bytes as the async generator yields them. For CORS preflight (`OPTIONS` request), the `CORSMiddleware` handles it before the streaming response is initiated. The `Content-Type: application/x-ndjson` header is set on the `StreamingResponse` — browsers do not restrict reading NDJSON streams via `fetch` as long as CORS headers are present on the response.

### request.is_disconnected() internals

`Request.is_disconnected()` is an ASGI method that sends a `http.disconnect` receive message check to the underlying transport. In Uvicorn, this polls the underlying asyncio transport to check if the client TCP connection is still open. It is a coroutine — it must be awaited.

**Known Starlette bug**: `is_disconnected()` uses `anyio.move_on_after(0)` internally — a zero-timeout receive that returns whatever ASGI event is already buffered. After parsing the request body, Uvicorn buffers a `http.disconnect` event. If `is_disconnected()` is called at the top of the loop (before `queue.get()`), it picks up this stale event and returns `True` immediately — on the very first iteration, before any audio is sent. The fix: poll `is_disconnected()` **after** `yield`, not before `queue.get()`. At that point the buffered disconnect event has already been consumed and the check accurately reflects whether the client is still connected.

---
