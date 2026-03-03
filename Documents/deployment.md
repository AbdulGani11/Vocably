# Vocably — Deployment & Operations Guide

A self-contained reference for every deployment operation you will regularly perform.
No prior knowledge assumed — each command is explained.

---

## Table of Contents

1. [How Deployment Works — The Big Picture](#1-how-deployment-works--the-big-picture)
2. [Update the GitHub Repo (Vocably source)](#2-update-the-github-repo-vocably-source)
3. [Update the HF Space (Backend)](#3-update-the-hf-space-backend)
4. [Update the Render Frontend](#4-update-the-render-frontend)
5. [HF Access Tokens](#5-hf-access-tokens)
6. [First-Time Setup Checklist](#6-first-time-setup-checklist)
7. [Quick Reference — All Commands](#7-quick-reference--all-commands)

---

## 1. How Deployment Works — The Big Picture

```
Your machine (local dev)
    │
    ├── GitHub repo (AbdulGani11/Vocably)
    │       └── Render watches this repo → auto-rebuilds frontend on every push to main
    │
    └── HF Space repo (AbdulGani11/vocably-backend)   ← SEPARATE git repo
            └── HF watches this repo → auto-rebuilds Docker container on every push
```

**Key point:** GitHub and Hugging Face are two completely separate Git hosts.
Pushing to GitHub does NOT update HF Space, and vice versa.
You manage them independently.

---

## 2. Update the GitHub Repo (Vocably source)

This is your main development workflow. You edit code locally and push to GitHub.
Render (frontend) auto-deploys whenever `main` is updated.

```bash
# From your Vocably project root
git add backend/main.py backend/auth.py         # stage specific files (safer than git add .)
git add src/pages/Hero.jsx src/hooks/useTTS.js  # add frontend files if changed
git commit -m "Your message here"
git push                                         # pushes to GitHub (main branch)
```

**Why not `git add .`?**
It can accidentally stage sensitive files (`.env`, large binaries). Naming files explicitly is safer.

**Render rebuilds automatically** after a push to `main` — no action needed on your end.
The build command Render runs is: `npm install && npm run build`.
It bakes `VITE_TTS_BACKEND_URL` from `.env.production` into the JS bundle at build time.

---

## 3. Update the HF Space (Backend)

Use this whenever you change `main.py`, `auth.py`, `requirements.txt`, or `Dockerfile`.

### Option A — Web UI (easiest, no terminal needed)

1. Go to: `https://huggingface.co/spaces/AbdulGani11/vocably-backend`
2. Click the **Files** tab
3. Click the file you want to update (e.g. `main.py`)
4. Click the **pencil icon** (Edit)
5. Paste the new content
6. Click **Commit changes**
7. Repeat for each changed file

HF starts rebuilding automatically after each commit. Check the **Logs** tab to watch progress.

### Option B — Git (when updating multiple files at once)

Your HF Space is already cloned at `C:\Users\alveera\Desktop\GitHub\hf-vocably-backend`.
You never need to clone again — just copy and push.

**Step 1 — Copy updated files from Vocably into the HF folder**
```bash
copy C:\Users\alveera\Desktop\GitHub\Vocably\backend\main.py         C:\Users\alveera\Desktop\GitHub\hf-vocably-backend\
copy C:\Users\alveera\Desktop\GitHub\Vocably\backend\auth.py         C:\Users\alveera\Desktop\GitHub\hf-vocably-backend\
copy C:\Users\alveera\Desktop\GitHub\Vocably\backend\requirements.txt C:\Users\alveera\Desktop\GitHub\hf-vocably-backend\
copy C:\Users\alveera\Desktop\GitHub\Vocably\backend\Dockerfile       C:\Users\alveera\Desktop\GitHub\hf-vocably-backend\
```
This overwrites the old Qwen3 files with the new Kokoro-82M versions.

**Step 2 — Commit and push to HF**
```bash
cd C:\Users\alveera\Desktop\GitHub\hf-vocably-backend
git add .
git commit -m "Update backend"
git push
```
HF detects the push and automatically rebuilds the Docker container.

**Step 4 — Verify it worked**
```bash
curl https://gilfoyle99213-vocably-backend.hf.space/health
# Expected: {"status":"healthy"}
```
First startup after a push takes **2–3 minutes** (model download + voice pre-warm).
If it returns `{"status":"loading"}`, wait 30 seconds and try again.

### Do NOT delete and recreate the Space

If you delete the Space, the URL changes. Your Render frontend has that URL baked into its
environment variable (`VITE_TTS_BACKEND_URL`). You would then have to update that variable
in Render and trigger a new frontend build. Just push updates to the existing Space instead.

---

## 4. Update the Render Frontend

Render auto-deploys on every push to the `main` branch of your GitHub repo.
**You usually don't need to do anything manually.**

The only time you need to touch Render manually:

| Situation | What to do |
| --- | --- |
| Changed the HF Space URL | Update `VITE_TTS_BACKEND_URL` in Render → Environment → redeploy |
| Build failed | Check Render dashboard → Deploys → view logs |
| Need to force redeploy | Render dashboard → Manual Deploy → Deploy latest commit |

---

## 5. HF Access Tokens

HF tokens are used to authenticate `git push` to HF Space repos.

**Check if your token still works:**
```bash
git -C vocably-backend push
# If it asks for a password, your token may have been revoked
```

**Where to find / create tokens:**
1. Go to: `https://huggingface.co/settings/tokens`
2. Your existing token is listed there — if it shows **Active**, it still works
3. If missing or revoked: click **New token** → name it → role: **Write** → Create

**When git asks for credentials:**
- Username: your HF username (e.g. `AbdulGani11`)
- Password: paste your HF access token (NOT your HF account password)

**Tokens do not expire** unless you manually revoke them. You only need a new one if the old one is gone.

---

## 6. First-Time Setup Checklist

Use this when setting up on a new machine or after a fresh clone.

### Backend (Python)
```bash
cd backend
python -m venv venv                        # create virtual environment
venv\Scripts\activate                      # activate it (Windows)
pip install -r requirements.txt            # install all dependencies (~1.5 GB, takes 2–5 min)
```

### Frontend (Node)
```bash
# from project root
npm install                                # install Node dependencies
```

### Start everything
```bash
.\start.bat                                # starts both backend (port 8000) and frontend (port 5173)
```

### Optional: Ollama (for Upload & Clean AI feature)
```bash
# Install from: https://ollama.com
ollama pull qwen2.5:3b                     # download the model (~1.9 GB)
ollama serve                               # start the Ollama server (runs on localhost:11434)
```

---

## 7. Quick Reference — All Commands

### Local development
| What | Command | Run from |
| --- | --- | --- |
| Start everything | `.\start.bat` | project root |
| Start backend only | `.\run.bat` | `backend/` |
| Start frontend only | `npm run dev` | project root |
| Build frontend for prod | `npm run build` | project root |

### GitHub
| What | Command |
| --- | --- |
| Stage specific files | `git add backend/main.py src/pages/Hero.jsx` |
| Commit | `git commit -m "message"` |
| Push to GitHub | `git push` |
| Pull latest | `git pull origin main --rebase` |

### HF Space
| What | Command |
| --- | --- |
| HF Space folder | `C:\Users\alveera\Desktop\GitHub\hf-vocably-backend` (already cloned) |
| Copy backend files | `copy C:\...\Vocably\backend\main.py C:\...\hf-vocably-backend\` (repeat for each file) |
| Push to HF | `git add . && git commit -m "msg" && git push` |
| Check health | `curl https://gilfoyle99213-vocably-backend.hf.space/health` |

### Access points
| URL | What |
| --- | --- |
| http://localhost:5173 | Local frontend |
| http://localhost:8000/health | Local backend health |
| http://localhost:8000/docs | Local API docs (Swagger) |
| https://vocably.onrender.com | Live frontend |
| https://gilfoyle99213-vocably-backend.hf.space/health | Live backend health |
| https://gilfoyle99213-vocably-backend.hf.space/docs | Live API docs |

---
