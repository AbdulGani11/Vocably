# Qwen3-TTS FastAPI Backend for Vocably
# Run with: python main.py

import io
import os
import base64
import logging
from typing import Optional
from contextlib import asynccontextmanager

import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import create_access_token, validate_credentials, verify_token

# Use all available CPU cores for inference
torch.set_num_threads(os.cpu_count())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance
tts_model = None

# Available speakers for CustomVoice model
AVAILABLE_SPEAKERS = [
    "Vivian", "Ryan", "Elena", "Lucas", "Isabella",
    "Marcus", "Aria", "Daniel", "Sophie", "Nathan"
]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class TTSRequest(BaseModel):
    text: str
    voice: str = "Vivian"
    language: str = "Auto"
    instruct: Optional[str] = None


class TTSResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    format: str = "wav"


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_model():
    """Load Qwen3-TTS model."""
    global tts_model

    from qwen_tts import Qwen3TTSModel

    # Using 1.7B model for tone/instruction control support
    # Switch to "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice" for faster inference (no tone control)
    MODEL_PATH = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"

    logger.info(f"Loading model: {MODEL_PATH}")
    logger.info("This may take a minute on first run (downloading model)...")

    # CPU configuration for laptops without GPU
    tts_model = Qwen3TTSModel.from_pretrained(
        MODEL_PATH,
        device_map="cpu",
        dtype=torch.float32,  # Use float32 for CPU
        attn_implementation=None,  # No flash attention on CPU
    )

    logger.info("Model loaded successfully!")
    return tts_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup and run warmup."""
    logger.info("Starting Qwen3-TTS server...")
    load_model()

    # Warmup: run a short generation so lazy model internals initialize now,
    # rather than on the user's first request
    logger.info("Running warmup generation...")
    with torch.inference_mode():
        tts_model.generate_custom_voice(
            text="Hello.",
            language="Auto",
            speaker="Vivian",
        )
    logger.info("Warmup complete. Server is ready.")

    yield
    logger.info("Shutting down server...")


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Vocably TTS API",
    description="Qwen3-TTS backend for Vocably — secured with JWT authentication",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — localhost always allowed; deployed frontend added via env var
# Authorization header is required for authenticated endpoints
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
if os.environ.get("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],  # Authorization required for JWT
)


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    """Root health check — publicly accessible."""
    return {
        "status": "ok",
        "model": "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "speakers": AVAILABLE_SPEAKERS,
        "auth": "JWT required for /api/tts",
    }


@app.get("/health")
async def health():
    """Standard health check endpoint."""
    return {
        "status": "ok" if tts_model is not None else "loading",
        "model_loaded": tts_model is not None,
    }


@app.post("/login")
async def login(request: LoginRequest):
    """
    Authenticate with username + password.
    Returns a signed JWT on success.

    Default credentials (local demo):
      username: vocably
      password: vocably2026
    Override via VOCABLY_USERNAME / VOCABLY_PASSWORD environment variables.
    """
    if not validate_credentials(request.username, request.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password.",
        )

    token = create_access_token(data={"sub": request.username})
    logger.info(f"User '{request.username}' logged in successfully.")
    return {"access_token": token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Protected endpoints (JWT required)
# ---------------------------------------------------------------------------

@app.post("/api/tts", response_model=TTSResponse)
async def text_to_speech(
    request: TTSRequest,
    token_data: dict = Depends(verify_token),  # 401 if token missing or invalid
):
    """
    Generate speech from text.
    Requires a valid Bearer JWT in the Authorization header.
    """
    if tts_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet. Please wait and try again.")

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    # Validate speaker
    speaker = request.voice
    if speaker not in AVAILABLE_SPEAKERS:
        speaker = "Vivian"  # Default fallback

    try:
        logger.info(
            f"[{token_data['username']}] Generating speech: "
            f"'{request.text[:50]}...' with voice '{speaker}'"
        )

        # Generate audio (inference_mode disables gradient tracking overhead)
        with torch.inference_mode():
            wavs, sr = tts_model.generate_custom_voice(
                text=request.text.strip(),
                language=request.language,
                speaker=speaker,
                instruct=request.instruct or None,
            )

        # Convert to WAV bytes
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, wavs[0], sr, format="WAV")
        audio_buffer.seek(0)

        # Encode as base64 for JSON transport
        audio_base64 = base64.b64encode(audio_buffer.read()).decode("utf-8")

        logger.info(f"Generated {len(wavs[0]) / sr:.2f}s of audio")

        return TTSResponse(
            audio_base64=audio_base64,
            sample_rate=sr,
            format="wav",
        )

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate speech. Please try again.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("  Vocably TTS Server (Qwen3-TTS) — v2.0")
    print("="*60)
    print("\n  Starting server on http://localhost:8000")
    print("  API docs available at http://localhost:8000/docs")
    print("  Login endpoint:     POST http://localhost:8000/login")
    print("  TTS endpoint:       POST http://localhost:8000/api/tts  [JWT required]")
    print("\n  Default credentials: vocably / vocably2026")
    print("\n  Press Ctrl+C to stop the server")
    print("="*60 + "\n")

    uvicorn.run(app, host="127.0.0.1", port=8000)
