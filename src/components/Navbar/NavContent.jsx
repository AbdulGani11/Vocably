const NavItem = ({ icon, label, description, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-neutral-50 group no-underline"
  >
    <i className={`${icon} text-base text-neutral-400 shrink-0`}></i>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-neutral-700">{label}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{description}</div>
    </div>
  </a>
);

export const FeaturesContent = () => (
  <div className="flex min-w-130">
    <div className="w-44 shrink-0 p-5 border-r border-neutral-100">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
        Vocably
      </p>
      <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
        Transform text into lifelike voice
      </h3>
      <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
        Kokoro-82M · 15 voices · JWT-secured · cloud deployed
      </p>
    </div>

    <div className="flex-1 p-3 flex flex-col">
      <NavItem
        icon="ri-mic-line"
        label="Voice Synthesis"
        description="Kokoro-82M generates 24 kHz WAV in a single non-autoregressive pass"
        href="https://huggingface.co/hexgrad/Kokoro-82M"
      />
      <NavItem
        icon="ri-speed-up-line"
        label="Speed Control"
        description="Four presets from 0.75× (slow) to 1.5× (fast) for any use case"
        href="https://vocably.onrender.com"
      />
      <NavItem
        icon="ri-shield-line"
        label="JWT Secured API"
        description="HS256 Bearer tokens with 8-hour expiry, stored in sessionStorage"
        href="https://jwt.io"
      />
      <NavItem
        icon="ri-cloud-line"
        label="Cloud Deployment"
        description="Frontend on Render, TTS backend on Hugging Face Spaces"
        href="https://gilfoyle99213-vocably-backend.hf.space"
      />
      <NavItem
        icon="ri-book-open-line"
        label="Content Creators"
        description="Audiobooks, podcasts, YouTube narration, and presentations"
        href="https://vocably.onrender.com"
      />
      <NavItem
        icon="ri-code-s-slash-line"
        label="Developers"
        description="REST API, Docker image, JWT auth — fork-ready on GitHub"
        href="https://github.com/AbdulGani11/Vocably"
      />
    </div>
  </div>
);

export const DocsContent = () => (
  <div className="flex min-w-120">
    <div className="w-44 shrink-0 p-5 border-r border-neutral-100">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
        Documentation
      </p>
      <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
        Everything you need to build with Vocably
      </h3>
      <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
        API reference, model details, deployment guides.
      </p>
    </div>

    <div className="flex-1 p-3 flex flex-col">
      <NavItem
        icon="ri-cpu-line"
        label="Kokoro-82M Model"
        description="82M-param StyleTTS2 + ISTFTNet vocoder, ~500 MB, CPU-only"
        href="https://huggingface.co/hexgrad/Kokoro-82M"
      />
      <NavItem
        icon="ri-mic-2-line"
        label="Voice Catalog"
        description="15 voices: American & British, Female & Male"
        href="https://vocably.onrender.com"
      />
      <NavItem
        icon="ri-server-line"
        label="FastAPI Backend"
        description="Async Python API with Uvicorn, CORS middleware, Pydantic models"
        href="https://fastapi.tiangolo.com"
      />
      <NavItem
        icon="ri-lock-line"
        label="Authentication"
        description="python-jose validates every /api/tts request via Bearer token"
        href="https://jwt.io"
      />
      <NavItem
        icon="ri-layout-line"
        label="Deployment"
        description="Docker (python:3.11-slim + espeak-ng) on Hugging Face Spaces"
        href="https://huggingface.co/spaces"
      />
    </div>
  </div>
);
