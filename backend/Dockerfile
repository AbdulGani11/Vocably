# Vocably Backend — Dockerfile
#
# Targets: local (docker-compose) and Hugging Face Spaces (cloud)
#
# Layer ordering rationale (Docker layer caching):
#   requirements.txt is copied and installed BEFORE the app code is copied.
#   If only main.py/auth.py change, Docker reuses the cached pip layer.
#
# Architecture note: The model (~3.5GB) downloads at runtime from Hugging Face Hub.
#   It is NOT baked into the image — keeps the image lean and matches HF Spaces behaviour.

# ── Base image ──────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ── System dependencies ──────────────────────────────────────────────────────
# gcc  → required by cryptography package (JWT)
# sox  → suppresses SoX audio warning on model startup
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc sox \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user (required by HF Spaces; security best practice) ────────────
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# ── Working directory ────────────────────────────────────────────────────────
WORKDIR /app

# ── Python dependencies (cached layer) ───────────────────────────────────────
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ─────────────────────────────────────────────────────────
COPY --chown=user main.py auth.py ./

# ── Runtime configuration ────────────────────────────────────────────────────
# Port strategy:
#   HF Spaces injects PORT=7860 automatically — container must listen on 7860.
#   Local docker-compose sets PORT=8000 via environment.
#   Shell-form CMD enables ${PORT:-7860} substitution at runtime.
#   (JSON array form does NOT expand shell variables.)
EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
