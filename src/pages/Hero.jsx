import { useState, useRef } from "react";
import { useTTS } from "../hooks/useTTS";
import {
  MAX_TEXT_LENGTH,
  WARNING_THRESHOLD,
  VOICES,
  SPEED_PRESETS,
  USE_CASES,
} from "../utils/constants";
import DropupSelector from "../components/Hero/DropupSelector";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";

const VOICE_ITEMS = VOICES.map((v) => ({ value: v.value, label: v.label }));
const SPEED_ITEMS = SPEED_PRESETS.map((s) => ({
  value: s.speed,
  label: s.label,
  icon: s.icon,
}));

const Hero = () => {
  const {
    text,
    setText,
    isSpeaking,
    isLoading,
    error,
    selectedVoice,
    setSelectedVoice,
    speed,
    setSpeed,
    hasAudio,
    backendStatus,
    handlePlay,
    handleDownload,
  } = useTTS();

  const backendReady = backendStatus === "ready";

  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanNotice, setCleanNotice] = useState(null);
  const fileInputRef = useRef(null);

  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

  const ACCEPTED_EXTENSIONS = [".txt", ".md", ".srt", ".vtt", ".pdf"];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = "." + file.name.toLowerCase().split(".").pop();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setCleanNotice({
        type: "warn",
        message: `"${ext}" is not supported. Accepted: .txt, .md, .srt, .vtt, .pdf`,
      });
      return;
    }

    setIsCleaning(true);
    setCleanNotice(null);
    setSelectedUseCase(null);

    const token = sessionStorage.getItem("vocably_token");
    const isPDF = file.name.toLowerCase().endsWith(".pdf");

    try {
      let data;

      if (isPDF) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${TTS_BACKEND_URL}/api/extract-pdf`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Server error: ${response.status}`);
        }
        data = await response.json();
        const methodLabel = data.method === "ocr" ? "OCR" : "digital";
        const notice = `PDF extracted (${data.pages}p, ${methodLabel})${data.available ? " — cleaned with AI." : " — Ollama unavailable, loaded as-is."}`;
        setCleanNotice({ type: data.available ? "success" : "warn", message: notice });
        if (data.available) setTimeout(() => setCleanNotice(null), 4000);
      } else {
        const rawText = await file.text();
        if (!rawText.trim()) { setIsCleaning(false); return; }

        const response = await fetch(`${TTS_BACKEND_URL}/api/clean`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: rawText }),
        });
        if (response.ok) {
          data = await response.json();
          if (!data.available) {
            setCleanNotice({ type: "warn", message: "Ollama not running — text loaded as-is. Install Ollama + qwen2.5:0.5b for AI cleanup." });
          } else {
            setCleanNotice({ type: "success", message: "Text cleaned with AI." });
            setTimeout(() => setCleanNotice(null), 3000);
          }
        } else {
          setText(rawText.slice(0, MAX_TEXT_LENGTH));
          setCleanNotice({ type: "warn", message: "Cleanup unavailable — text loaded as-is." });
          setIsCleaning(false);
          return;
        }
      }

      setText(data.cleaned_text.slice(0, MAX_TEXT_LENGTH));
    } catch (err) {
      setCleanNotice({ type: "warn", message: err.message || "Upload failed — please try again." });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleYoutubeTranscript = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsFetchingYoutube(true);
    setCleanNotice(null);
    setSelectedUseCase(null);

    const token = sessionStorage.getItem("vocably_token");

    try {
      const response = await fetch(`${TTS_BACKEND_URL}/api/youtube-transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setText(data.cleaned_text.slice(0, MAX_TEXT_LENGTH));
      setShowYoutubeInput(false);
      setYoutubeUrl("");

      const notice = data.available
        ? "YouTube transcript fetched and cleaned with AI."
        : "YouTube transcript fetched — Ollama unavailable, loaded as-is.";
      setCleanNotice({ type: data.available ? "success" : "warn", message: notice });
      if (data.available) setTimeout(() => setCleanNotice(null), 4000);
    } catch (err) {
      setCleanNotice({ type: "warn", message: err.message || "Failed to fetch transcript." });
    } finally {
      setIsFetchingYoutube(false);
    }
  };

  const handleSelectUseCase = (useCase) => {
    setText(useCase.text);
    setSelectedUseCase(useCase.id);
  };

  return (
    <section className="relative flex flex-col items-center justify-center w-full min-h-full max-w-5xl mx-auto px-6 pt-28 md:pt-20 pb-8 md:pb-4">
      <div className="flex flex-col items-center justify-center w-full grow">
        <div className="text-center z-10 flex flex-col items-center mb-10 md:mb-8">
          <h1 className="mb-4 text-3xl md:text-5xl lg:text-6xl font-medium leading-[1.1] tracking-tight text-neutral-900 animate-fade-in-up">
            Transform Text to Voice, <br />
            <span className="text-neutral-500">Instantly.</span>
          </h1>

          <div
            className="flex flex-wrap items-center justify-center gap-2 mt-5 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            {USE_CASES.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => handleSelectUseCase(useCase)}
                className={`use-case-badge transition-all ${
                  selectedUseCase === useCase.id
                    ? "ring-2 ring-neutral-400 bg-neutral-100"
                    : "hover:bg-neutral-50"
                }`}
              >
                <i className={`${useCase.icon} ${useCase.color}`}></i>
                {useCase.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="w-full max-w-3xl animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-orange-900/10 border border-white/60">
            <div className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.srt,.vtt,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="mb-5 md:mb-4 flex items-center justify-between gap-3">
                {showYoutubeInput ? (
                  <form
                    onSubmit={handleYoutubeTranscript}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <i className="ri-youtube-line text-red-500 text-xs shrink-0"></i>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Paste YouTube URL..."
                      className="flex-1 min-w-0 text-xs border-b border-neutral-200 focus:border-neutral-500 outline-none bg-transparent py-0.5 text-neutral-700 placeholder:text-neutral-300 transition-colors"
                      autoFocus
                      disabled={isFetchingYoutube}
                    />
                    <button
                      type="submit"
                      disabled={isFetchingYoutube || !youtubeUrl.trim()}
                      className="text-[10px] md:text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-40 transition-colors shrink-0"
                      aria-label="Fetch transcript"
                    >
                      {isFetchingYoutube ? (
                        <i className="ri-loader-4-line animate-spin"></i>
                      ) : (
                        <i className="ri-arrow-right-line"></i>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowYoutubeInput(false); setYoutubeUrl(""); }}
                      className="text-[10px] md:text-xs text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
                      aria-label="Cancel"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCleaning}
                      className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors disabled:cursor-wait"
                      aria-label="Upload text file and clean with AI"
                    >
                      {isCleaning ? (
                        <i className="ri-loader-4-line animate-spin"></i>
                      ) : (
                        <i className="ri-upload-2-line"></i>
                      )}
                      <span className="hidden sm:inline">
                        {isCleaning ? "Cleaning..." : "Upload & Clean"}
                      </span>
                    </button>

                    <span className="w-px h-3 bg-neutral-200 shrink-0"></span>

                    <button
                      onClick={() => { setShowYoutubeInput(true); setCleanNotice(null); }}
                      className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-neutral-400 hover:text-red-500 transition-colors"
                      aria-label="Fetch transcript from YouTube URL"
                    >
                      <i className="ri-youtube-line"></i>
                      <span className="hidden sm:inline">YouTube</span>
                    </button>

                    <div className="relative group/tip">
                      <i className="ri-information-line text-[10px] md:text-xs text-neutral-300 hover:text-neutral-500 cursor-default transition-colors"></i>
                      <div className="absolute left-0 top-5 z-50 hidden group-hover/tip:block w-48 rounded-lg bg-neutral-800 px-3 py-2 text-[10px] text-neutral-200 shadow-lg">
                        <p className="font-medium mb-1 text-white">Import sources</p>
                        <p className="text-neutral-300">Files: .txt · .md · .srt · .vtt · .pdf</p>
                        <p className="mt-1 text-neutral-300">YouTube: paste any video URL</p>
                        <p className="mt-1 text-neutral-400">AI cleans timestamps, fillers &amp; speaker labels.</p>
                      </div>
                    </div>
                  </div>
                )}

                {!showYoutubeInput && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
                    title={isExpanded ? "Collapse textarea" : "Expand textarea"}
                    aria-label={isExpanded ? "Collapse textarea" : "Expand textarea"}
                  >
                    <i className={isExpanded ? "ri-collapse-diagonal-line" : "ri-expand-diagonal-line"}></i>
                    <span className="hidden sm:inline">
                      {isExpanded ? "Collapse" : "Expand"}
                    </span>
                  </button>
                )}
              </div>

              <div className="relative group">
                <textarea
                  className={`w-full resize-none border-none bg-transparent p-0 text-lg md:text-2xl font-light leading-relaxed text-neutral-800 focus:ring-0 placeholder:text-neutral-300 transition-all duration-300 ${
                    isExpanded ? "h-64 md:h-80" : "h-40 md:h-32"
                  }`}
                  placeholder="Type something here to hear it spoken..."
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value.slice(0, MAX_TEXT_LENGTH))
                  }
                  aria-label="Text to convert to speech"
                />
                <div
                  className={`absolute bottom-1 md:bottom-2 right-0 text-[10px] font-mono transition-colors ${
                    text.length > WARNING_THRESHOLD
                      ? "text-red-500"
                      : "text-neutral-400"
                  }`}
                >
                  {text.length}/{MAX_TEXT_LENGTH}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-6">
                <div className="flex items-center gap-2">
                  <DropupSelector
                    items={VOICE_ITEMS}
                    selectedValue={selectedVoice}
                    onChange={setSelectedVoice}
                    label="Voice"
                    triggerIcon="ri-mic-line"
                  />
                  <DropupSelector
                    items={SPEED_ITEMS}
                    selectedValue={speed}
                    onChange={setSpeed}
                    label="Speed"
                    triggerIcon="ri-equalizer-line"
                  />
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={!hasAudio}
                    className={`flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full transition-all active:scale-95
                      ${
                        hasAudio
                          ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg"
                          : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      }`}
                    title={hasAudio ? "Download audio" : "Generate audio first"}
                    aria-label={
                      hasAudio
                        ? "Download audio file"
                        : "Download disabled - generate audio first"
                    }
                  >
                    <i className="ri-download-2-line text-lg md:text-xl"></i>
                  </button>

                  <button
                    onClick={handlePlay}
                    disabled={isLoading || !backendReady}
                    className={`flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-xl transition-all active:scale-95
                      ${
                        isLoading || !backendReady
                          ? "bg-neutral-400 cursor-wait"
                          : isSpeaking
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-neutral-900 hover:scale-105 hover:bg-black"
                      }`}
                    aria-label={
                      isLoading
                        ? "Generating speech..."
                        : !backendReady
                          ? backendStatus === "offline"
                            ? "Backend offline — start the server"
                            : "Backend warming up, please wait"
                          : isSpeaking
                            ? "Stop speaking"
                            : "Play text as speech"
                    }
                  >
                    {isLoading ? (
                      <i className="ri-loader-4-line text-xl md:text-2xl animate-spin"></i>
                    ) : isSpeaking ? (
                      <i className="ri-stop-fill text-xl md:text-2xl key-active-pop"></i>
                    ) : (
                      <i className="ri-play-fill text-xl md:text-2xl ml-1 key-active-pop"></i>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <i className="ri-error-warning-line mr-2"></i>
                  {error}
                </div>
              )}

              {cleanNotice && (
                <div
                  className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    cleanNotice.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}
                >
                  <i
                    className={
                      cleanNotice.type === "success"
                        ? "ri-checkbox-circle-line"
                        : "ri-information-line"
                    }
                  ></i>
                  {cleanNotice.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {!backendReady && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs animate-fade-in-up ${
              backendStatus === "offline"
                ? "bg-red-50 border border-red-200 text-red-600"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}
            style={{ animationDelay: "400ms" }}
          >
            {backendStatus === "offline" ? (
              <i className="ri-wifi-off-line shrink-0"></i>
            ) : (
              <i className="ri-loader-4-line animate-spin shrink-0"></i>
            )}
            <span>
              {backendStatus === "offline"
                ? "Backend is offline — start the server to enable TTS."
                : "Backend is warming up — play will unlock when ready."}
            </span>
          </div>
        )}

        <div
          className="mt-6 text-center animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          <a
            href="https://huggingface.co/hexgrad/Kokoro-82M"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <span>Powered by</span>
            <span className="font-semibold">Kokoro-82M</span>
            <i className="ri-external-link-line text-xs"></i>
          </a>
        </div>

        <div className="h-4 md:h-10"></div>
      </div>
    </section>
  );
};

export default Hero;
