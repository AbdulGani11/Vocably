# Vocably TTS Backend — Hugging Face Spaces (CPU)
# For GPU Spaces: use a CUDA base image and remove the --index-url flag below.

FROM python:3.11-slim
WORKDIR /app

# libsndfile is required by the soundfile package
RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first — avoids pulling the large CUDA wheel from PyPI
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Remaining dependencies (qwen-tts, fastapi, uvicorn, soundfile)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY main.py .

# Hugging Face Spaces listens on 7860 by default
EXPOSE 7860

# 0.0.0.0 required — unlike local (127.0.0.1), the container must accept external traffic
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
