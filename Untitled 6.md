# Project Roadmap: Status, Strategy & Deployment Architecture

---

## Verification: Excellent Work

Your implementation is interview-ready. You didn't just "add login"; you built a secure, stateless (no server-side session storage — each request carries its own JWT, or JSON Web Token, a compact signed string encoding the user's identity that the server verifies cryptographically) architecture that aligns perfectly with the Google JD.

**Strongest Point:** Your decision to use `sessionStorage` (browser storage that is wiped automatically when the tab closes, unlike `localStorage` which persists indefinitely) and to separate `auth.py` (a dedicated Python module that isolates all authentication logic — token generation, verification, and password hashing — away from the main app file) gives you a specific, high-quality story to tell recruiters about designing for security.

**Docker:** The `3.11-slim` image (a minimal, stripped-down version of the official Python 3.11 base image — smaller size means faster pulls and fewer vulnerabilities, reducing the attack surface) and layer caching strategy (Docker builds images in layers; if a layer hasn't changed, Docker reuses the cached version instead of rebuilding it — so dependency installation only re-runs when `requirements.txt` changes) show you understand optimization — critical for Google's "reliability and scalability" requirement.

---

## What Is Left? (The Roadmap Status)

You have completed Phase 2 (Security) and the first half of Phase 1 (Containerization). Of the two items needed to fully check the "Web Application Engineer" boxes, one is complete and one is still pending:

### 1. Cloud Deployment (Phase 1, Step 2) — Status: Pending

**Why:** You have a Docker container (a self-contained, portable package that includes your application code, runtime, and all dependencies), but it's currently running on `localhost` (your local machine only — not accessible from the internet). To truthfully say you have "Experience with a public cloud provider" and can "deploy web applications," you need to get this live on a URL.

**Chosen path: Hugging Face Spaces** (a free cloud hosting platform built specifically for ML applications — provides 16GB RAM, 50GB disk, and persistent model caching with no credit card required)

### 2. The Angular Question (Phase 3) — Status: Resolved (No Code Needed)

**Why:** The JD specifically asks for "Experience with Angular." You have React. You need a bridge — but that bridge does **not** need to exist inside Vocably. Mixing React and Angular in the same project is a terrible architectural decision. It creates massive bloat (unnecessary file size and complexity), ruins the build process (the two frameworks have incompatible compilation pipelines), and introduces a nightmare of cognitive overhead. **Vocably should remain 100% clean, optimized React.** See the full strategy in the Angular section below.

---

## Current Phase Status

- ✅ **Phase 1, Step 1 — Containerization (Docker):** Complete
- ⏳ **Phase 1, Step 2 — Cloud Deployment (HF Spaces):** Pending — next action is to update the `Dockerfile` for HF Spaces, update `README.md`, and push the container live
- ✅ **Phase 2 — Security (JWT + Auth):** Complete
- ✅ **Phase 3 — Angular:** Resolved via zero-code conceptual mapping (no code required)

---

## Deployment: Hugging Face Spaces

### Why HF Spaces

- **RAM:** 16GB free (Random Access Memory — the working memory a computer uses to actively run programs; your 3.5GB model must be fully loaded into RAM before it can generate audio)
- **Disk:** 50GB free — your 3.5GB model fits entirely within these limits at no cost.
- **Model caching:** HF Spaces is designed specifically to cache (store a local copy so it doesn't need to be re-downloaded on every startup) and run heavy ML models, eliminating the cold-start download problem (the delay caused when a sleeping server must download a large model from scratch before it can serve the first request) automatically.
- **No credit card required:** Zero billing setup — you can deploy today with no personal financial risk.

### Is It Legal to Host the Qwen Model Weights?

Yes, it is completely legal and ethical. Here is the short breakdown of why:

**It's Open Weights:** Alibaba releases the Qwen models under open licenses (often Apache 2.0 — a permissive open-source license that grants anyone the right to use, modify, and distribute the software, including for commercial purposes, as long as they include the original attribution) or their own permissive open-weight license (similar to Apache 2.0 but specific to model weights rather than code). This specifically grants you the right to download, host, and run the model on your own servers or cloud infrastructure.

**Hosting vs. Claiming:** Uploading and running the model on any platform is just moving the files from one location to another. As long as you don't claim you trained the Qwen model, it is 100% ethical.

**Standard Industry Practice:** Every company running open-source AI models (like Llama, Mistral, or Qwen) downloads the weights (the trained model files — billions of numerical parameters that encode everything the model has learned) and hosts them on their own infrastructure to avoid downloading them at runtime (when a user makes a live request). This is exactly how MLOps (Machine Learning Operations — the practice of deploying, monitoring, and maintaining ML models in production environments) works.

**Attribution:** Mention in your `README.md` or `TECH_STACK.md` that the application utilizes Alibaba's open-source Qwen3-TTS model.

### Why Not GCP — and How to Use That Decision in the Interview

**Know these terms before delivering this answer:**

- **FastAPI** — a modern, high-performance Python web framework for building APIs
- **GCP Cloud Run** — Google Cloud Platform's fully managed serverless container runtime; it runs your Docker container on demand without you managing any servers
- **Cloud Storage FUSE** — Filesystem in Userspace; a technology that lets you mount a remote storage bucket as if it were a local folder on your hard drive, so your app reads model files directly without downloading them first

> "To deploy the FastAPI backend, I containerized the application using Docker. Because the Qwen3-TTS model is 3.5GB and requires significant RAM, I first evaluated GCP Cloud Run with Cloud Storage FUSE volume mounts — which is Google's recommended architecture for serverless ML workloads. However, GCP requires a valid credit card to create an account even to access the free tier, which introduces personal billing risk for a portfolio demo. I ultimately chose Hugging Face Spaces because it provides the same 16GB RAM requirement for free with no credit card needed — making it the most pragmatic choice without compromising the deployment story."

**Why this works perfectly:**

1. **It shows financial awareness:** You understand cloud costs and resource limits — a highly valued trait in cloud engineers.
2. **It proves GCP knowledge:** You evaluated and can speak to exactly how a Senior Engineer would architect a serverless ML pipeline on Google Cloud (Cloud Run + Cloud Storage FUSE), even though you didn't deploy there.
3. **It highlights Docker skills:** You emphasize that the app is containerized and cloud-ready, proving you aren't just writing scripts that only work on your local machine.

---

## Handling the Angular Question: No Code Required — Answer It Through Communication

The recommended approach is to avoid adding any Angular code to Vocably and instead handle this entirely through communication. Google is interviewing you for an "Early" career role — they know you have 6 months of experience in React and are not expecting Angular mastery. What they are checking is your **learning agility** (the ability to pick up new technologies and apply existing knowledge to unfamiliar frameworks quickly). Prepare to talk about how your React architecture directly translates to Angular concepts.

### The Zero Code Conceptual Mapping

When the interviewer asks, _"We use Angular here, but your background is React. How would you handle that?"_

**Know these terms before delivering this answer:**

- **Framework-agnostic** — not tied to any specific framework; the underlying concepts of components, state, and data flow apply everywhere
- **`useState` hooks** — functions that let a React component store and update local state
- **Angular Signals** — Angular's modern reactive primitive; a Signal holds a value and automatically notifies the UI to update when that value changes, without needing a full component re-render
- **Dependency injection** — a design pattern where the framework automatically creates and provides shared service instances to any component that needs them, rather than each component creating its own
- **React Context** — React's built-in mechanism for sharing state across components without passing props down manually through every level

**Your answer:**

> "My core frontend fundamentals are framework-agnostic. For example, in Vocably, I built reusable components and managed data flow. I understand that to transition to Angular, I would shift from React's `useState` hooks to Angular's Signals for reactivity, and I would use Angular's built-in dependency injection for services instead of React Context. The underlying logic — managing state, securing API calls, and rendering UI — is the same."




# 