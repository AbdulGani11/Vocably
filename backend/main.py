# Qwen3-TTS FastAPI Backend for Vocably
# Run with: python main.py

import io
import base64
import logging
from typing import Optional
from contextlib import asynccontextmanager

import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


class TTSRequest(BaseModel):
    text: str
    voice: str = "Vivian"
    language: str = "Auto"
    instruct: Optional[str] = None


class TTSResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    format: str = "wav"


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
    """Load model on startup."""
    logger.info("Starting Qwen3-TTS server...")
    load_model()
    yield
    logger.info("Shutting down server...")


app = FastAPI(
    title="Vocably TTS API",
    description="Qwen3-TTS backend for Vocably",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "speakers": AVAILABLE_SPEAKERS,
    }


@app.get("/api/voices")
async def get_voices():
    """Return available voices."""
    return {
        "voices": [
            {"name": speaker, "id": speaker.lower()}
            for speaker in AVAILABLE_SPEAKERS
        ]
    }


@app.post("/api/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """Generate speech from text."""
    global tts_model

    if tts_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    # Validate speaker
    speaker = request.voice
    if speaker not in AVAILABLE_SPEAKERS:
        speaker = "Vivian"  # Default fallback

    try:
        logger.info(f"Generating speech: '{request.text[:50]}...' with voice '{speaker}'")

        # Generate audio
        wavs, sr = tts_model.generate_custom_voice(
            text=request.text.strip(),
            language=request.language,
            speaker=speaker,
            instruct=request.instruct if request.instruct else None,
        )

        # Convert to WAV bytes
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, wavs[0], sr, format="WAV")
        audio_buffer.seek(0)

        # Encode as base64
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


if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("  Vocably TTS Server (Qwen3-TTS)")
    print("="*60)
    print("\n  Starting server on http://localhost:8000")
    print("  API docs available at http://localhost:8000/docs")
    print("\n  Press Ctrl+C to stop the server")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
