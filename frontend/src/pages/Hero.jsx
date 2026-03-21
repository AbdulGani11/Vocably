import { useState, useRef } from "react";
import { useTTS } from "../hooks/useTTS";
import {
  MAX_TEXT_LENGTH,
  WARNING_THRESHOLD,
  VOICES,
  SPEED_PRESETS,
  USE_CASES,
} from "../utils/constants";
import CardHeader from "../components/Hero/CardHeader";
import TextEditor from "../components/Hero/TextEditor";
import PlaybackControls from "../components/Hero/PlaybackControls";
import StatusNotice from "../components/Hero/StatusNotice";

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
  const [cleanNotice, setCleanNotice] = useState(null);
  const fileInputRef = useRef(null);

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
              <CardHeader
                onTextLoaded={(t) => { setText(t); setSelectedUseCase(null); }}
                onNotice={setCleanNotice}
                isLoading={isLoading}
                fileInputRef={fileInputRef}
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded((v) => !v)}
                MAX_TEXT_LENGTH={MAX_TEXT_LENGTH}
              />

              <TextEditor
                text={text}
                onTextChange={(t) => { setText(t); setSelectedUseCase(null); }}
                isExpanded={isExpanded}
                MAX_TEXT_LENGTH={MAX_TEXT_LENGTH}
                WARNING_THRESHOLD={WARNING_THRESHOLD}
              />

              <PlaybackControls
                isLoading={isLoading}
                isSpeaking={isSpeaking}
                backendReady={backendReady}
                backendStatus={backendStatus}
                hasAudio={hasAudio}
                onPlay={handlePlay}
                onDownload={handleDownload}
                voice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                speed={speed}
                onSpeedChange={setSpeed}
                voiceItems={VOICE_ITEMS}
                speedItems={SPEED_ITEMS}
              />

              {!error && text.length > 4000 && !isSpeaking && (
                <p className="mt-3 text-[11px] text-neutral-400 text-right">
                  <i className="ri-time-line mr-1"></i>
                  Long text (~{Math.round(text.length / 1000)}k chars) — generation may take 1–3 min.
                </p>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <i className="ri-error-warning-line mr-2"></i>
                  {error}
                </div>
              )}

              <StatusNotice notice={cleanNotice} />
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
