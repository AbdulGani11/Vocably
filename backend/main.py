import io
import os
import re
import sys
import asyncio
import logging
import concurrent.futures
from typing import Optional
from contextlib import asynccontextmanager

import httpx

import base64
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import create_access_token, validate_credentials, verify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_pipeline = None
_executor: Optional[concurrent.futures.ThreadPoolExecutor] = None
_ready = False

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

class CleanRequest(BaseModel):
    text: str

class CleanResponse(BaseModel):
    cleaned_text: str
    available: bool

class PDFResponse(BaseModel):
    cleaned_text: str
    pages: int
    method: str
    available: bool

class YouTubeRequest(BaseModel):
    url: str

class YouTubeResponse(BaseModel):
    cleaned_text: str
    video_id: str
    available: bool

_TIMESTAMP_RE = re.compile(
    r"""
    \[?\(?\d{1,2}:\d{2}(?::\d{2})?(?:[,\.]\d+)?\]?\)?
    | \[\d+\]
    """,
    re.VERBOSE,
)

_SPEAKER_LABEL_RE = re.compile(
    r"^\s*(?:Speaker|SPEAKER)\s+\w+[:\s]\s*",
    re.MULTILINE,
)

def _regex_clean(text: str) -> str:
    text = _TIMESTAMP_RE.sub("", text)
    text = _SPEAKER_LABEL_RE.sub("", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

_TAG_RE = re.compile(r"<[^>]+>")

def _detect_format(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("WEBVTT"):
        return "vtt"
    if re.match(r"^\d+\r?\n\d{1,2}:\d{2}:\d{2},\d{3}\s*-->", stripped):
        return "srt"
    return "text"


def _parse_vtt(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(("WEBVTT", "NOTE", "STYLE", "REGION")):
            continue
        if "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        line = _TAG_RE.sub("", line)
        if line:
            lines.append(line)
    return " ".join(lines)


def _parse_srt(text: str) -> str:
    import srt  # noqa: PLC0415
    subs = list(srt.parse(text, ignore_errors=True))
    parts = [_TAG_RE.sub("", sub.content).strip() for sub in subs]
    return " ".join(p for p in parts if p)

_OLLAMA_URL = "http://localhost:11434"
_OLLAMA_MODEL = "qwen2.5:3b"

_CLEAN_SYSTEM_PROMPT = (
    "You are a text formatter for text-to-speech conversion. "
    "Clean the given text strictly by these rules:\n"
    "1. Remove all timestamps (e.g. [00:12], (1:23), HH:MM:SS patterns).\n"
    "2. Remove speaker labels (e.g. 'Speaker 1:', 'John:', '[SPEAKER_01]:').\n"
    "3. Remove filler words: um, uh, like, you know, I mean, basically, literally, right, so yeah.\n"
    "4. Fix punctuation: add missing periods, capitalize sentence starts.\n"
    "5. Merge fragmented lines into smooth flowing paragraphs.\n"
    "Output ONLY the cleaned text. No explanations, no preamble, no extra commentary."
)

_FILLER_ONLY_PROMPT = (
    "Remove ONLY these spoken filler words from the text: "
    "um, uh, you know, i mean, so yeah, basically, literally. "
    "When removing a filler word, DELETE IT COMPLETELY — do NOT replace it with a synonym or any other word. "
    "Keep every non-filler word exactly as written, in the exact same order. "
    "Do NOT rephrase, reorder, restructure, summarize, or add any words. "
    "Output ONLY the cleaned text."
)

def _extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r"(?:v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts/)([a-zA-Z0-9_-]{11})",
        r"(?:live/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def _generate_sync(text: str, voice: str, speed: float) -> tuple[str, int]:
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline, _executor, _ready

    logger.info("Loading Kokoro-82M pipeline...")
    from kokoro import KPipeline
    _pipeline = KPipeline(lang_code="a")

    _executor = concurrent.futures.ThreadPoolExecutor(
        max_workers=1, thread_name_prefix="kokoro"
    )

    logger.info("Pre-warming voice cache (af_heart)...")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_executor, _generate_sync, "Ready.", "af_heart", 1.0)

    _ready = True
    logger.info("Kokoro ready — server accepting requests.")

    yield

    _executor.shutdown(wait=False)
    logger.info("Server stopped.")

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
    if len(text) > 10000:
        raise HTTPException(status_code=400, detail="Text too long (max 10000 chars)")

    voice = request.voice or "af_heart"
    speed = max(0.5, min(2.0, request.speed or 1.0))

    logger.info(
        f"[{payload.get('sub', '?')}] TTS: voice={voice} speed={speed} "
        f"text='{text[:50]}...'"
    )

    loop = asyncio.get_running_loop()
    try:
        audio_b64, sample_rate = await asyncio.wait_for(
            loop.run_in_executor(_executor, _generate_sync, text, voice, speed),
            timeout=300.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="TTS generation timed out")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return TTSResponse(audio_base64=audio_b64, sample_rate=sample_rate)


@app.get("/api/voices")
async def list_voices():
    return {
        "voices": [
            {"value": "af_heart",   "label": "Heart",    "group": "American Female"},
            {"value": "af_bella",   "label": "Bella",    "group": "American Female"},
            {"value": "af_nicole",  "label": "Nicole",   "group": "American Female"},
            {"value": "af_sarah",   "label": "Sarah",    "group": "American Female"},
            {"value": "af_sky",     "label": "Sky",      "group": "American Female"},
            {"value": "am_adam",    "label": "Adam",     "group": "American Male"},
            {"value": "am_michael", "label": "Michael",  "group": "American Male"},
            {"value": "am_echo",    "label": "Echo",     "group": "American Male"},
            {"value": "am_liam",    "label": "Liam",     "group": "American Male"},
            {"value": "bf_emma",    "label": "Emma",     "group": "British Female"},
            {"value": "bf_alice",   "label": "Alice",    "group": "British Female"},
            {"value": "bf_lily",    "label": "Lily",     "group": "British Female"},
            {"value": "bm_george",  "label": "George",   "group": "British Male"},
            {"value": "bm_daniel",  "label": "Daniel",   "group": "British Male"},
            {"value": "bm_lewis",   "label": "Lewis",    "group": "British Male"},
        ]
    }


async def _ollama_clean(text: str, prompt: str = _CLEAN_SYSTEM_PROMPT) -> tuple[str, bool]:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{_OLLAMA_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": text},
                    ],
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            cleaned = _regex_clean(data["message"]["content"])
            if len(cleaned) < max(50, len(text) * 0.2):
                logger.warning(
                    f"Ollama output too short ({len(cleaned)} vs {len(text)} chars) "
                    "— falling back to regex-only clean"
                )
                return _regex_clean(text), True
            return cleaned, True
    except (httpx.ConnectError, httpx.TimeoutException):
        return _regex_clean(text), False


def _extract_pdf(pdf_bytes: bytes) -> tuple[str, int, str]:
    import fitz
    import pytesseract
    from PIL import Image

    if sys.platform == "win32":
        pytesseract.pytesseract.tesseract_cmd = os.environ.get(
            "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)

    pages_text = [page.get_text() for page in doc]
    text = "\n\n".join(pages_text).strip()
    if len(text) >= 50:
        return text, page_count, "digital"

    logger.info("PDF digital extraction yielded < 50 chars — falling back to Tesseract OCR")
    ocr_parts = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        ocr_parts.append(pytesseract.image_to_string(img))
    return "\n\n".join(ocr_parts).strip(), page_count, "ocr"


@app.post("/api/clean", response_model=CleanResponse)
async def clean_text(
    request: CleanRequest,
    payload: dict = Depends(verify_token),
):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    fmt = _detect_format(text)

    if fmt == "vtt":
        parsed = _parse_vtt(text)
        logger.info(f"[{payload.get('sub', '?')}] VTT parsed: {len(text)} → {len(parsed)} chars")
        cleaned, available = await _ollama_clean(parsed, prompt=_FILLER_ONLY_PROMPT)
        return CleanResponse(cleaned_text=cleaned, available=available)

    if fmt == "srt":
        try:
            parsed = _parse_srt(text)
            logger.info(f"[{payload.get('sub', '?')}] SRT parsed: {len(text)} → {len(parsed)} chars")
            cleaned, available = await _ollama_clean(parsed, prompt=_FILLER_ONLY_PROMPT)
            return CleanResponse(cleaned_text=cleaned, available=available)
        except ImportError:
            logger.warning("srt library not installed — falling back to Ollama for SRT")

    try:
        cleaned, available = await _ollama_clean(text)
        if available:
            logger.info(f"[{payload.get('sub', '?')}] Ollama cleaned: {len(text)} → {len(cleaned)} chars")
        else:
            logger.warning("Ollama not reachable at localhost:11434 — returning original text")
        return CleanResponse(cleaned_text=cleaned, available=available)

    except Exception as e:
        logger.error(f"Text cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@app.post("/api/extract-pdf", response_model=PDFResponse)
async def extract_pdf(
    file: UploadFile = File(...),
    payload: dict = Depends(verify_token),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        loop = asyncio.get_running_loop()
        raw_text, page_count, method = await loop.run_in_executor(
            None, _extract_pdf, pdf_bytes
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF support not installed. Run: pip install pymupdf pytesseract Pillow",
        )
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract any text from this PDF")

    cleaned, available = await _ollama_clean(raw_text)
    logger.info(
        f"[{payload.get('sub', '?')}] PDF extracted: {page_count}p via {method}, "
        f"{len(raw_text)} → {len(cleaned)} chars"
    )
    return PDFResponse(cleaned_text=cleaned, pages=page_count, method=method, available=available)


@app.post("/api/youtube-transcript", response_model=YouTubeResponse)
async def youtube_transcript(
    request: YouTubeRequest,
    payload: dict = Depends(verify_token),
):
    try:
        from youtube_transcript_api import (  # noqa: PLC0415
            YouTubeTranscriptApi,
            TranscriptsDisabled,
            NoTranscriptFound,
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="YouTube support not installed. Run: pip install youtube-transcript-api",
        )

    video_id = _extract_video_id(request.url.strip())
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Could not find a YouTube video ID in that URL. "
                   "Accepted formats: youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID",
        )

    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: YouTubeTranscriptApi().fetch(video_id),
        )
    except TranscriptsDisabled:
        raise HTTPException(
            status_code=422,
            detail="The creator has disabled captions for this video.",
        )
    except NoTranscriptFound:
        raise HTTPException(
            status_code=422,
            detail="No captions found for this video. "
                   "It may not have auto-generated captions yet, or they may be in another language.",
        )
    except Exception as e:
        logger.error(f"YouTube transcript fetch failed for {video_id}: {e}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not fetch transcript: {str(e)}",
        )

    raw_text = " ".join(
        s.text.replace("\n", " ").strip()
        for s in result
        if s.text.strip()
    )

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Transcript appears to be empty.")

    logger.info(
        f"[{payload.get('username', '?')}] YouTube: {video_id} — {len(raw_text)} chars raw"
    )

    cleaned, available = await _ollama_clean(raw_text, prompt=_CLEAN_SYSTEM_PROMPT)

    logger.info(
        f"[{payload.get('username', '?')}] YouTube: cleaned {len(raw_text)} → {len(cleaned)} chars"
    )

    return YouTubeResponse(cleaned_text=cleaned, video_id=video_id, available=available)


@app.get("/health")
async def health():
    return {"status": "healthy" if _ready else "loading"}

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