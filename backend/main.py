import io
import os
import re
import sys
import json
import asyncio
import logging
import threading
import concurrent.futures
from typing import Optional
from contextlib import asynccontextmanager

import httpx

import base64
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_pipeline = None
_executor: Optional[concurrent.futures.ThreadPoolExecutor] = None
_ready = False
_stream_stop_event: Optional[threading.Event] = None

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

_MIN_DIGITAL_TEXT_CHARS = 50

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
_SRT_HEADER_RE = re.compile(r"^\d+\r?\n\d{1,2}:\d{2}:\d{2},\d{3}\s*-->")

def _detect_format(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("WEBVTT"):
        return "vtt"
    if _SRT_HEADER_RE.match(stripped):
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
    parts = []
    for sub in subs:
        cleaned = _TAG_RE.sub("", sub.content).strip()
        if cleaned:
            parts.append(cleaned)
    return " ".join(parts)

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
    match = re.search(r"(?:v=|youtu\.be/|embed/|shorts/|live/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None

def _generate_sync(text: str, voice: str, speed: float) -> tuple[str, int]:
    chunks = []
    for _, _, audio in _pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+|(?<=[.!?])\s+'):
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


@app.post("/api/tts", response_model=TTSResponse)
async def generate_speech(request: TTSRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="TTS pipeline not ready")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 10000:
        raise HTTPException(status_code=400, detail="Text too long (max 10000 chars)")

    voice = request.voice or "af_heart"
    speed = max(0.5, min(2.0, request.speed or 1.0))

    logger.info(f"TTS: voice={voice} speed={speed} text='{text[:50]}...'")

    loop = asyncio.get_running_loop()
    try:
        audio_b64, sample_rate = await asyncio.wait_for(
            loop.run_in_executor(_executor, _generate_sync, text, voice, speed),
            timeout=600.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="TTS generation timed out")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return TTSResponse(audio_base64=audio_b64, sample_rate=sample_rate)


@app.post("/api/tts/stream")
async def stream_speech(request_data: TTSRequest, http_request: Request):
    global _stream_stop_event

    if _pipeline is None:
        raise HTTPException(status_code=503, detail="TTS pipeline not ready")

    text = request_data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 10000:
        raise HTTPException(status_code=400, detail="Text too long (max 10000 chars)")

    voice = request_data.voice or "af_heart"
    speed = max(0.5, min(2.0, request_data.speed or 1.0))

    logger.info(f"TTS stream: voice={voice} speed={speed} chars={len(text)}")

    # Cancel any in-progress stream so the executor thread is freed quickly
    if _stream_stop_event is not None:
        _stream_stop_event.set()

    stop_event = threading.Event()
    _stream_stop_event = stop_event

    loop = asyncio.get_running_loop()
    audio_queue: asyncio.Queue = asyncio.Queue()

    def _stream_sync():
        try:
            for _, _, audio in _pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+|(?<=[.!?])\s+'):
                if stop_event.is_set():
                    logger.info("TTS stream: cancelled — new request queued")
                    break
                buf = io.BytesIO()
                sf.write(buf, audio, 24000, format="WAV", subtype="PCM_16")
                b64 = base64.b64encode(buf.getvalue()).decode()
                loop.call_soon_threadsafe(audio_queue.put_nowait, b64)
        except Exception as e:
            logger.error(f"TTS stream error: {e}")
        finally:
            loop.call_soon_threadsafe(audio_queue.put_nowait, None)

    _executor.submit(_stream_sync)

    async def _response_gen():
        while True:
            try:
                chunk = await asyncio.wait_for(audio_queue.get(), timeout=120.0)
            except asyncio.TimeoutError:
                logger.warning("TTS stream: timeout waiting for chunk")
                break
            if chunk is None:
                break
            yield json.dumps({"audio_base64": chunk}) + "\n"
            if await http_request.is_disconnected():
                logger.info("TTS stream: client disconnected")
                break

    return StreamingResponse(_response_gen(), media_type="application/x-ndjson")


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
        async with httpx.AsyncClient(timeout=120.0) as client:
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
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
        return _regex_clean(text), False


def _split_into_chunks(text: str, chunk_size: int) -> list[str]:
    """Split text at sentence boundaries into chunks not exceeding chunk_size."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for sent in sentences:
        if current_len + len(sent) > chunk_size and current:
            chunks.append(" ".join(current))
            current = [sent]
            current_len = len(sent)
        else:
            current.append(sent)
            # +1 accounts for the space that " ".join() adds between sentences
            current_len += len(sent) + 1
    if current:
        chunks.append(" ".join(current))
    return chunks


async def _ollama_clean_long(text: str, prompt: str = _CLEAN_SYSTEM_PROMPT, chunk_size: int = 3000) -> tuple[str, bool]:
    """Process long text by splitting into sentence-boundary chunks to avoid timeouts."""
    if len(text) <= chunk_size:
        return await _ollama_clean(text, prompt)

    chunks = _split_into_chunks(text, chunk_size)

    parts: list[str] = []
    for chunk in chunks:
        cleaned, available = await _ollama_clean(chunk, prompt)
        if not available:
            return _regex_clean(text), False
        parts.append(cleaned)
    return " ".join(parts), True


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
    if len(text) >= _MIN_DIGITAL_TEXT_CHARS:
        return text, page_count, "digital"

    logger.info(f"PDF digital extraction yielded < {_MIN_DIGITAL_TEXT_CHARS} chars — falling back to Tesseract OCR")
    ocr_parts = []
    for page in doc:
        pixmap = page.get_pixmap(dpi=200)
        png_bytes = pixmap.tobytes("png")
        image = Image.open(io.BytesIO(png_bytes))
        ocr_text = pytesseract.image_to_string(image)
        ocr_parts.append(ocr_text)
    return "\n\n".join(ocr_parts).strip(), page_count, "ocr"


@app.post("/api/clean", response_model=CleanResponse)
async def clean_text(request: CleanRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    fmt = _detect_format(text)

    if fmt == "vtt":
        parsed = _parse_vtt(text)
        logger.info(f"VTT parsed: {len(text)} → {len(parsed)} chars")
        cleaned, available = await _ollama_clean(parsed, prompt=_FILLER_ONLY_PROMPT)
        return CleanResponse(cleaned_text=cleaned, available=available)

    if fmt == "srt":
        try:
            parsed = _parse_srt(text)
            logger.info(f"SRT parsed: {len(text)} → {len(parsed)} chars")
            cleaned, available = await _ollama_clean(parsed, prompt=_FILLER_ONLY_PROMPT)
            return CleanResponse(cleaned_text=cleaned, available=available)
        except ImportError:
            logger.warning("srt library not installed — falling back to Ollama for SRT")

    try:
        cleaned, available = await _ollama_clean(text)
        if available:
            logger.info(f"Ollama cleaned: {len(text)} → {len(cleaned)} chars")
        else:
            logger.warning("Ollama not reachable at localhost:11434 — returning original text")
        return CleanResponse(cleaned_text=cleaned, available=available)

    except Exception as e:
        logger.error(f"Text cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@app.post("/api/extract-pdf", response_model=PDFResponse)
async def extract_pdf(file: UploadFile = File(...)):
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

    cleaned, available = await _ollama_clean_long(raw_text[:10000])
    logger.info(f"PDF extracted: {page_count}p via {method}, {len(raw_text)} → {len(cleaned)} chars")
    return PDFResponse(cleaned_text=cleaned, pages=page_count, method=method, available=available)


@app.post("/api/youtube-transcript", response_model=YouTubeResponse)
async def youtube_transcript(request: YouTubeRequest):
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
                   "Accepted formats: youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID",
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

    segments = []
    for s in result:
        segment_text = s.text.replace("\n", " ").strip()
        if segment_text:
            segments.append(segment_text)
    raw_text = " ".join(segments)

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Transcript appears to be empty.")

    logger.info(f"YouTube: {video_id} — {len(raw_text)} chars raw")

    cleaned, available = await _ollama_clean_long(raw_text[:10000], prompt=_CLEAN_SYSTEM_PROMPT)

    logger.info(f"YouTube: cleaned {len(raw_text)} → {len(cleaned)} chars")

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

  TTS endpoint:      POST http://localhost:8000/api/tts
  Voices endpoint:   GET  http://localhost:8000/api/voices

  Press Ctrl+C to stop the server
""")
    print("=" * 60)

    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
