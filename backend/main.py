# Vocably TTS Backend — powered by Kokoro-82M
# Run with: python main.py

import io
import os
import uuid
import asyncio
import logging
import concurrent.futures
from typing import Optional
from contextlib import asynccontextmanager

import base64
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import create_access_token, validate_credentials, verify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Kokoro pipeline — loaded once at startup, shared across requests
_pipeline = None
# Single-threaded executor: Kokoro generation is not thread-safe
_executor: Optional[concurrent.futures.ThreadPoolExecutor] = None


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "af_heart"
    speed: Optional[float] = 1.0

class TTSResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    format: str = "wav"


# ---------------------------------------------------------------------------
# Audio generation (runs in thread pool, not the event loop)
# ---------------------------------------------------------------------------

def _generate_sync(text: str, voice: str, speed: float) -> tuple[str, int]:
    """
    Blocking Kokoro generation. Called via run_in_executor so it doesn't
    stall the asyncio event loop.
    Returns (audio_base64, sample_rate).
    """
    chunks = []
    for _, _, audio in _pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+'):
        chunks.append(audio)

    if not chunks:
        raise ValueError("Kokoro returned no audio segments")

    audio_np = np.concatenate(chunks)

    buf = io.BytesIO()
    sf.write(buf, audio_np, 24000, format="WAV", subtype="PCM_16")
    audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return audio_b64, 24000


# ---------------------------------------------------------------------------
# Lifespan — load model on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline, _executor

    logger.info("Loading Kokoro-82M pipeline...")
    from kokoro import KPipeline
    _pipeline = KPipeline(lang_code="a")

    # max_workers=1 keeps generation sequential; Kokoro is not thread-safe
    _executor = concurrent.futures.ThreadPoolExecutor(
        max_workers=1, thread_name_prefix="kokoro"
    )
    logger.info("Kokoro ready — server accepting requests.")

    yield

    _executor.shutdown(wait=False)
    logger.info("Server stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Vocably TTS API",
    description="Text-to-Speech API powered by Kokoro-82M",
    version="3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    if not validate_credentials(request.username, request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    logger.info(f"User '{request.username}' logged in.")
    return LoginResponse(access_token=create_access_token({"sub": request.username}))


@app.post("/api/tts", response_model=TTSResponse)
async def generate_speech(
    request: TTSRequest,
    payload: dict = Depends(verify_token),
):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="TTS pipeline not ready")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 chars)")

    voice = request.voice or "af_heart"
    speed = max(0.5, min(2.0, request.speed or 1.0))  # clamp to safe range

    logger.info(
        f"[{payload.get('sub', '?')}] TTS: voice={voice} speed={speed} "
        f"text='{text[:50]}...'"
    )

    loop = asyncio.get_running_loop()
    try:
        audio_b64, sample_rate = await asyncio.wait_for(
            loop.run_in_executor(_executor, _generate_sync, text, voice, speed),
            timeout=120.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="TTS generation timed out")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return TTSResponse(audio_base64=audio_b64, sample_rate=sample_rate)


@app.get("/api/voices")
async def list_voices():
    """Return available Kokoro voices grouped by accent."""
    return {
        "voices": [
            # American Female
            {"value": "af_heart",   "label": "Heart",    "group": "American Female"},
            {"value": "af_bella",   "label": "Bella",    "group": "American Female"},
            {"value": "af_nicole",  "label": "Nicole",   "group": "American Female"},
            {"value": "af_sarah",   "label": "Sarah",    "group": "American Female"},
            {"value": "af_sky",     "label": "Sky",      "group": "American Female"},
            # American Male
            {"value": "am_adam",    "label": "Adam",     "group": "American Male"},
            {"value": "am_michael", "label": "Michael",  "group": "American Male"},
            {"value": "am_echo",    "label": "Echo",     "group": "American Male"},
            {"value": "am_liam",    "label": "Liam",     "group": "American Male"},
            # British Female
            {"value": "bf_emma",    "label": "Emma",     "group": "British Female"},
            {"value": "bf_alice",   "label": "Alice",    "group": "British Female"},
            {"value": "bf_lily",    "label": "Lily",     "group": "British Female"},
            # British Male
            {"value": "bm_george",  "label": "George",   "group": "British Male"},
            {"value": "bm_daniel",  "label": "Daniel",   "group": "British Male"},
            {"value": "bm_lewis",   "label": "Lewis",    "group": "British Male"},
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy" if _pipeline is not None else "loading"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("  Vocably TTS Server (Kokoro-82M) — v3.0")
    print("=" * 60)
    print("""
  Starting server on http://localhost:8000
  API docs available at http://localhost:8000/docs

  Login endpoint:    POST http://localhost:8000/login
  TTS endpoint:      POST http://localhost:8000/api/tts  [JWT required]
  Voices endpoint:   GET  http://localhost:8000/api/voices

  Default credentials: vocably / vocably2026

  Press Ctrl+C to stop the server
""")
    print("=" * 60)

    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
