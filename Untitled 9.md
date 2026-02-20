# Vocably: JWT Authentication + Docker Containerization

Adding JWT-based auth to the FastAPI backend and React frontend, plus a `Dockerfile` for the backend. This directly demonstrates Google JD requirements: **"Understanding of authentication and authorization in web applications"** and **"Experience with a public cloud provider"** — the backend is containerized and specifically architected for Google Cloud Run deployment.

> **Document structure:** This file has two parts. **Part 1** (below) is the implementation plan — what was proposed and why, the full list of file changes, and a pre-run verification checklist. **Part 2** (after the divider) is the post-implementation walkthrough — confirmed file changes, the end-to-end auth flow diagram, verified test results, and interview talking points.

## User Review Required

> **⚠️ IMPORTANT — Default credentials (hardcoded for local use):**
> 
> - Username: `vocably`
> - Password: `vocably2026`

These default to hardcoded values in `backend/auth.py` and can be overridden via environment variables — not stored in a database. Comparison is handled by `validate_credentials()` using bcrypt via `passlib`, not a plain string check. Using hardcoded credentials is intentional for a local demo and clearly documented as such. The `JWT_SECRET_KEY` will be auto-generated if the environment variable is not set.

> **NOTE:** **No database needed.** The goal here is to demonstrate the JWT _flow_ (token issuance, secure storage, Authorization header attachment, server-side verification), which is what Google looks for.

---

## Part1: Proposed Changes

### Backend — Auth Layer

#### [NEW] auth.py

New module that owns all auth logic, keeping `main.py` clean:

- `SECRET_KEY` — read from env (`JWT_SECRET_KEY`), fallback to a generated secure random key
- `create_access_token(data)` — signs a JWT with 8-hour expiry using `python-jose`
- `validate_credentials(username, password)` — checks incoming credentials against `DEMO_USERNAME` / `DEMO_PASSWORD` using bcrypt via `passlib`
- `verify_token(credentials)` — FastAPI `HTTPBearer` dependency; raises `401` if token is missing or invalid
- `DEMO_USERNAME` / `DEMO_PASSWORD` — hardcoded local credentials (read from env too so they can be overridden)

#### [MODIFY] main.py

- Import `create_access_token`, `validate_credentials`, `verify_token` from `auth.py`
- Add `LoginRequest` Pydantic model (`username: str`, `password: str`)
- Add `POST /login` endpoint — validates credentials, returns `{"access_token": "...", "token_type": "bearer"}`
- Add `GET /health` endpoint — dedicated health check returning `{"status":"loading"}` or `{"status":"ok"}` based on model readiness; required for Cloud Run
- Protect `POST /api/tts` with `Depends(verify_token)` — unauthenticated requests get `401`
- Update `allow_headers` in CORS to include `"Authorization"`

#### [MODIFY] requirements.txt

Add:

```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

> **NOTE:** `passlib[bcrypt]` is used inside `validate_credentials()` in `auth.py` to compare the incoming password against the stored credential using bcrypt hashing. Even though the credentials are hardcoded for this demo, using `passlib` instead of a raw string comparison demonstrates the correct production pattern — plaintext password comparison is never appropriate in real auth. This is worth mentioning explicitly in the Google interview.

---

### Frontend — Auth Flow

#### [NEW] src/hooks/useAuth.js

Custom hook for auth state:

- Reads token from `sessionStorage` on mount → `isAuthenticated` boolean
- `login(username, password)` → calls `POST /login`, stores token in `sessionStorage`
- `logout()` → clears `sessionStorage`, resets state
- `getToken()` → returns the current token from `sessionStorage` (used by `useTTS.js` before each request)
- Exposes `{ isAuthenticated, login, logout, getToken, authError, isLoggingIn }`

> **NOTE:** **Why `sessionStorage` over `localStorage`?** `sessionStorage` is cleared when the browser tab closes, reducing the window for token theft. `localStorage` persists indefinitely — less appropriate for a security demo. Worth raising in the Google interview.

#### [NEW] src/pages/Login.jsx

Minimal login form matching Vocably's existing design system:

- Username + password inputs
- Submit button with loading state
- Error display on bad credentials
- Reuses existing Tailwind classes (no new styles needed)

#### [MODIFY] src/App.jsx

- Import `useAuth` hook
- Conditionally render `<Login onLogin={...} />` or `<Hero />` based on `isAuthenticated`
- Pass `logout` to `<Navbar />` so user can log out

#### [MODIFY] src/hooks/useTTS.js

- Read token from `sessionStorage` before each request
- Add `Authorization: Bearer <token>` header to the `fetch` call for `/api/tts`
- On `401` response → show "Session expired. Please log in again." and trigger logout

#### [MODIFY] src/components/Navbar/Navbar.jsx

- Accept optional `onLogout` prop
- Show a small logout icon button when `onLogout` is defined

---

### Docker

#### [NEW] backend/Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY main.py auth.py ./

# EXPOSE omitted: Docker does not support variable substitution here,
# so EXPOSE 8000 would misrepresent the actual runtime port on Cloud Run.
# The operative port is set via ${PORT:-8000} in the CMD below.

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

> **NOTE:** The Qwen3-TTS model (~3.5GB) downloads at runtime from Hugging Face Hub, NOT baked into the image. This avoids adding 3.5GB of model weights to the image, keeping it as lean as the ML dependencies allow — identical to how Hugging Face Spaces works, which is the deployment target documented in documentation.md.

> **NOTE:** `CMD` uses shell form (not JSON array) so the `${PORT:-8000}` variable substitution is evaluated by the shell. Cloud Run injects a `PORT` environment variable and expects the container to listen on it — hardcoding `8000` would require manually configuring the container port in Cloud Run's service settings. This form falls back to `8000` for local use and self-configures on Cloud Run without any manual port settings.

#### [NEW] docker-compose.yml

Single backend service with port `8000` exposed and environment variables passed through from `.env`.

#### [NEW] .dockerignore

Excludes: `qwen_env/`, `node_modules/`, `__pycache__/`, `*.pyc`, `.env`, `.git/`

---

### Documentation

#### [MODIFY] README.md

Add:

- Authentication section: default credentials + how JWT works in this app
- Docker section: `docker build` + `docker run` commands

#### [MODIFY] TECH_STACK.md

Add auth libraries and Docker to the stack tables.

---

### Verification Plan

### Manual Verification (Run Locally)

**Test 1 — Login Gate Works**

1. Run `.\start.bat` from project root
2. Open `http://localhost:5173`
3. **Expected:** Login page appears (not the TTS card)
4. Enter wrong credentials → **Expected:** error message "Invalid username or password."
5. Enter `vocably` / `vocably2026` → **Expected:** TTS card appears

**Test 2 — Protected Endpoint Rejects Unauthenticated Requests**

1. With backend running, open a new terminal and run:

```powershell
curl.exe -X POST "http://localhost:8000/api/tts" `
    -H "Content-Type: application/json" `
    -d '{"text":"hello"}'
```

2. **Expected:** `{"detail":"Not authenticated. Please log in."}` with HTTP 401

**Test 3 — Authenticated TTS Works End-to-End**

1. Log in through the UI
2. Type any text and click Play
3. **Expected:** Audio generates and plays as before (no regression)

**Test 4 — Token Rejected After Tampering (Security Test)**

1. Open browser DevTools → Application → Session Storage
2. Edit the token value (change a few characters)
3. Click Play
4. **Expected:** 401 error displayed: "Session expired. Please log in again."

**Test 5 — Docker Build (Backend Only)**

1. With Docker Desktop running, open terminal at `backend/`:

```shell
docker build -t vocably-backend .

docker run -p 8000:8000 --env JWT_SECRET_KEY=testsecret vocably-backend
```

2. **Expected:** Server starts, model begins downloading, health check at `http://localhost:8000/health` initially returns `{"status":"loading"}` and transitions to `{"status":"ok"}` once the model is ready.

> **NOTE:** Test 5 requires Docker Desktop installed. The full model download (~3.5GB) happens inside the container on first run, same as when running locally. This is expected and documented.

---

## Part 2: JWT Auth + Docker: Walkthrough

### What Was Built

Vocably now has a **complete JWT Bearer authentication flow** and a **Dockerized backend**, directly addressing two Google JD requirements.

---

### Files Changed

### Backend (new/modified)

|File|Change|
|---|---|
|backend/auth.py|**NEW** — JWT secret management, `create_access_token()`, `validate_credentials()`, `verify_token()` FastAPI dependency|
|backend/main.py|Added `POST /login`, `GET /health`; protected `POST /api/tts` with `Depends(verify_token)`; updated CORS|
|backend/requirements.txt|Added `python-jose[cryptography]==3.3.0` and `passlib[bcrypt]==1.7.4`|
|backend/Dockerfile|**NEW** — python:3.11-slim, layer-cached pip install, `0.0.0.0` binding, `${PORT:-8000}` CMD|
|backend/.dockerignore|**NEW** — excludes venv, .env, pycache from build context|

### Frontend (new/modified)

|File|Change|
|---|---|
|src/hooks/useAuth.js|**NEW** — `login()`, `logout()`, `getToken()` with `sessionStorage`|
|src/pages/Login.jsx|**NEW** — Login form matching Vocably design system|
|src/App.jsx|Auth gate: shows `<Login>` or `<Hero>` based on `isAuthenticated`|
|src/hooks/useTTS.js|Attaches `Authorization: Bearer <token>` header; handles 401|
|src/components/Navbar/Navbar.jsx|Accepts `onLogout` prop; shows logout button on desktop|

### Infrastructure & Docs

|File|Change|
|---|---|
|docker-compose.yml|**NEW** — backend service with named HF model cache volume|
|README.md|Auth credentials + Docker usage sections added|
|TECH_STACK.md|Auth libraries, Docker, updated API table|

---

### The Auth Flow (End to End)

```
  BROWSER (React)                        FASTAPI BACKEND
  ─────────────────────────────────────  ─────────────────────────────────────

  [1] App loads → check sessionStorage
      │
      ├── No token → show Login.jsx
      └── Token exists → show Hero (skip to step 3)

  ─────────────────────────────────────  ─────────────────────────────────────



  [2] User enters credentials
      POST /login {username, password} ──────────────────────────────────────►
                                                        validate_credentials()
                                                        bcrypt compare via passlib
                                                        create_access_token()
                                                        HS256 · 8hr expiry
      200 {access_token, token_type: bearer} ◄──────────────────────────────
      sessionStorage.setItem(token)
      isAuthenticated = true → Hero renders

  ─────────────────────────────────────  ─────────────────────────────────────



  [3] User clicks Play
      POST /api/tts ─────────────────────────────────────────────────────────►
      Authorization: Bearer eyJ...                  Depends(verify_token)
                                                        │
                                         ┌─── no token ─┤
                                         │    401 {"detail": "Not authenticated.
                                         │         Please log in."}
                                         │
                                         ├─── invalid / expired
                                         │    401 {"detail": "Invalid token"}
      ◄─────────────────────────────────-┘
      useTTS.js catches 401
      → "Session expired. Please log in again."
      → logout()

  ─────────────────────────────────────  ─────────────────────────────────────



  [4] Valid token path
      POST /api/tts (with valid Bearer) ─────────────────────────────────────►
                                                        verify_token() ✓
                                                        TTS inference (Qwen3)
      200 base64 WAV ◄───────────────────────────────────────────────────────
      Browser plays audio ✓
```

---

### Verification Steps

### 1. Login gate works

Run `.\start.bat` → open `http://localhost:5173` → **Login page appears** (not TTS card).

### 2. Wrong credentials rejected

Enter any wrong username/password → error: `"Invalid username or password."` appears under the form.

### 3. Correct login → TTS works

Enter `vocably` / `vocably2026` → TTS card appears. Generate speech → audio plays as before. ✅

### 4. Direct API call without token returns 401

Run from **bash** (Git Bash / WSL / macOS Terminal):

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"hello\"}"
# Expected: {"detail":"Not authenticated. Please log in."}  HTTP 401
```

### 5. Tampered token rejected

In DevTools → Application → Session Storage → edit `vocably_token` → click Play → Error displayed: `"Session expired. Please log in again."` ✅

### 6. Docker build

```shell
cd backend

docker build -t vocably-backend .

docker run -p 8000:8000 --env JWT_SECRET_KEY=testsecret vocably-backend
# Server starts, model downloads, health check at /health returns {"status":"loading"} → {"status":"ok"}
```

---

### Stopping the Services

**Up to 3 processes running — stop them in order:**

**1. Docker container** (Terminal 2):

```
Ctrl+C
```

**2. Local backend + frontend** (Terminal 1 — `start.bat` opens two windows, one for each):

```
Ctrl+C  (in each of the two windows it opened)
```

Or fastest of all — just **close all terminal windows**.

---

### Interview Talking Points (Google JD)

|JD Requirement|What to Say|
|---|---|
|_"Authentication and authorization in web applications"_|"I implemented a full JWT Bearer flow: `/login` issues a signed HS256 token stored in `sessionStorage`, and a FastAPI `Depends()` dependency verifies it on every protected route. I chose `sessionStorage` over `localStorage` intentionally — it reduces token lifetime to the browser session."|
|_"Experience with a public cloud provider (Cloud Run readiness)"_|"Docker itself isn't a cloud provider, but the containerization here is specifically designed for Google Cloud Run. I made four explicit Cloud Run-oriented decisions: binding to `0.0.0.0` so the container accepts external traffic, reading the `PORT` environment variable via `${PORT:-8000}` in the CMD so the container self-configures to whichever port Cloud Run injects rather than requiring manual port configuration, externalizing secrets to environment variables rather than hardcoding them in the image — which is the correct pattern for local and demo use, with Google Cloud Secret Manager being the production upgrade via `--set-secrets` at deploy time — and adding a `/health` endpoint for the load balancer. The `docker-compose.yml` also uses a named volume so the 3.5GB model persists across restarts — identical to how Hugging Face Spaces handles it, which is our current deployment target."|
|_"Design, develop, and maintain web applications deployed on cloud infrastructure"_|"The full development lifecycle is visible in this project. On the build side, the Dockerfile copies `requirements.txt` before app code so pip dependencies are layer-cached independently — rebuilds only re-run pip when dependencies actually change. On the portability side, the model is not baked into the image — without that, the image would be 5–7GB; this way the ML dependencies are the floor, not the ceiling. On the operations side, the `/health` endpoint isn't just for the load balancer — it exposes a `loading` vs `ok` state so a monitoring system can distinguish a cold start from a crash. That's a maintainability decision, not just a deployment one."|

---

### Production Safety Notes

This project is built as a **local demo** to demonstrate JWT flow and Docker containerization for the Google interview. The implementation is intentional and honest. However, a Google Web Application Engineer working on real Cloud infrastructure would be expected to know what needs to change before any of this goes near production. The notes below document exactly that — both for interview awareness and for when Vocably moves toward a real deployment.

---

### Authentication

**Hardcoded credentials → Google Cloud Secret Manager** `DEMO_USERNAME` and `DEMO_PASSWORD` default to hardcoded values in `auth.py` for this demo, with an environment variable override path. In production, secrets must never live in source code, `.env` files, or environment variables set at the shell level. The correct approach on GCP is [Google Cloud Secret Manager](https://cloud.google.com/secret-manager), where secrets are versioned, audited, and injected into Cloud Run at deploy time via `--set-secrets`.

**Single hardcoded user → Identity Platform or Firebase Authentication** The demo has one user. A real application uses Google Cloud Identity Platform or Firebase Authentication for user management — both provide JWT issuance, token refresh, MFA, and OAuth 2.0/OpenID Connect out of the box, removing the need to manage JWTs manually with `python-jose`.

**JWT expiry → shorter window + refresh token** The current token has an 8-hour expiry. In production, access tokens should be short-lived (15–60 minutes) paired with a refresh token stored in an `httpOnly` cookie. An 8-hour window gives an attacker significant time to exploit a stolen token.

**`sessionStorage` → `httpOnly` cookie in production** `sessionStorage` is cleared on tab close, which is better than `localStorage`, but the token is still accessible to JavaScript — meaning any XSS vulnerability in the app can read it. The production-safe approach is to store the JWT in an `httpOnly` cookie — invisible to JavaScript entirely — with `Secure` and `SameSite=None` for HTTPS enforcement and cross-origin compatibility. `SameSite=None; Secure` is required when the frontend and backend are on different origins — the typical React + Cloud Run setup. `SameSite=Strict` can only be used if both are served from the same site behind a reverse proxy; otherwise the browser omits the cookie on every cross-origin request and authentication silently fails. This is worth acknowledging in the interview: "For a demo, `sessionStorage` is a reasonable tradeoff. In production I'd move to an `httpOnly` cookie."

**No rate limiting on `/login`** The current `/login` endpoint has no brute-force protection. In production, Cloud Armor or a FastAPI middleware like `slowapi` should rate-limit login attempts per IP.

---

### Transport & CORS

**HTTPS is required in production** Cloud Run enforces HTTPS on its managed domain automatically, but any custom domain setup must have TLS configured. Never serve auth endpoints over HTTP.

**CORS `allow_origins` must be restricted** The current CORS config should be reviewed to ensure it is not set to `["*"]` in production. In a Cloud Run deployment, `allow_origins` should list only the exact frontend domain (e.g., `https://vocably.app`). A wildcard origin on an authenticated API is a security misconfiguration.

---

### Docker & Cloud Run

**Run as a non-root user in the container** The current Dockerfile runs as `root` by default, which is a Docker security anti-pattern. In production, add a non-root user:

```dockerfile
RUN adduser --disabled-password --gecos "" appuser
USER appuser
```

This limits the blast radius if the container process is ever compromised.

**Use the `PORT` environment variable for Cloud Run compatibility** Cloud Run injects a `PORT` environment variable and routes traffic to that port. The Dockerfile CMD uses `${PORT:-8000}` — shell form so the substitution is evaluated at runtime — falling back to `8000` locally. Hardcoding `8000` in JSON array form (e.g., `CMD ["uvicorn", ..., "--port", "8000"]`) bypasses variable substitution and requires manually setting the container port in Cloud Run's service configuration; omitting that step causes the load balancer's health checks to fail silently.

**Do not use `--env` flags for secrets in `docker run`** The Verification Plan uses `--env JWT_SECRET_KEY=testsecret` for local testing. In Cloud Run, secrets must be injected via Secret Manager references, not plain `--set-env-vars`. Plain environment variables are visible in the Cloud Run console to anyone with IAM access to the service.

**Pin the base image digest in production** `FROM python:3.11-slim` resolves to a different image on each build as the tag is updated. In production, pin to a specific digest (e.g., `FROM python:3.11-slim@sha256:...`) to ensure reproducible, auditable builds.

---

### Relevance to Google JD

These gaps are not weaknesses to hide — they are **talking points**. A candidate who can clearly articulate _what is demo-appropriate_, _what the production equivalent is_, and _why the tradeoff was made_ demonstrates exactly the engineering judgment the JD is looking for: _"Ability to learn and work with new and emerging technologies, methodologies, and solutions in the cloud/IT technology space"_ and _"Understanding of authentication and authorization in web applications."_ Knowing the production path is as important as knowing the demo.

---

### Updated Resume Bullet

> _"Architected a full-stack offline TTS application with JWT-based authentication (HS256, FastAPI `Depends` dependency injection), securing the `/api/tts` endpoint for local ML inference. Containerized the backend with Docker using layer-caching optimization, with a named volume persisting the 3.5GB model across restarts — designed for Google Cloud Run deployment."_