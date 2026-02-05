# Vocably

A local text-to-speech app powered by Qwen3-TTS. Type text, pick a voice, and generate high-quality WAV audio — no cloud uploads, no API keys, no subscriptions.

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Vite
- **Backend:** FastAPI, PyTorch, Qwen3-TTS 1.7B

## Run Locally

1. Install **Node.js** and **Python 3.10+**
2. Run `start.bat`
3. Open [http://localhost:5173](http://localhost:5173)

The model (~3.4 GB) downloads automatically on first run.

## Features

- 10 voices with tone and emotion control (8 presets)
- WAV audio download
- Runs entirely on your machine — private by design
