import { useState } from "react";
import { useTTS } from "../hooks/useTTS";
import {
  MAX_TEXT_LENGTH,
  WARNING_THRESHOLD,
  VOICES,
  TONE_PRESETS,
  USE_CASES,
} from "../utils/constants";
import DropupSelector from "../components/Hero/DropupSelector";
import ExampleSelector from "../components/Hero/ExampleSelector";

// Selector items — defined outside the component so they aren't recreated on every render
const VOICE_ITEMS = VOICES.map((name) => ({ value: name, label: name }));
const TONE_ITEMS = TONE_PRESETS.map((t) => ({
  value: t.instruction,
  label: t.label,
  icon: t.icon,
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
    instruct,
    setInstruct,
    hasAudio,
    handlePlay,
    handleDownload,
  } = useTTS();

  // Track which example or use case is selected
  const [selectedExample, setSelectedExample] = useState(null);
  const [selectedUseCase, setSelectedUseCase] = useState(null);

  // Track textarea expanded state
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle example selection — clears use case highlight
  const handleSelectExample = (example) => {
    setText(example.text);
    setSelectedExample(example.id);
    setSelectedUseCase(null);
  };

  // Handle use case badge click — clears example highlight
  const handleSelectUseCase = (useCase) => {
    setText(useCase.text);
    setSelectedUseCase(useCase.id);
    setSelectedExample(null);
  };

  return (
    <section className="relative flex flex-col items-center justify-center w-full min-h-full max-w-5xl mx-auto px-6 pt-28 md:pt-20 pb-8 md:pb-4">
      {/* 1. CENTERED HEADLINE (THE PITCH) */}
      <div className="flex flex-col items-center justify-center w-full grow">
        <div className="text-center z-10 flex flex-col items-center mb-10 md:mb-8">
          <h1 className="mb-4 text-3xl md:text-5xl lg:text-6xl font-medium leading-[1.1] tracking-tight text-neutral-900 animate-fade-in-up">
            Transform Text to Voice, <br />
            <span className="text-neutral-500">Instantly.</span>
          </h1>

          {/* Use Case Badges — click to load demo text */}
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

        {/* 2. INTERACTIVE CARD */}
        <div
          className="w-full max-w-3xl animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-orange-900/10 border border-white/60">
            <div className="p-6">
              {/* Header: Expand toggle + badge */}
              <div className="mb-5 md:mb-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
                  title={isExpanded ? "Collapse textarea" : "Expand textarea"}
                  aria-label={
                    isExpanded ? "Collapse textarea" : "Expand textarea"
                  }
                >
                  <i
                    className={
                      isExpanded
                        ? "ri-collapse-diagonal-line"
                        : "ri-expand-diagonal-line"
                    }
                  ></i>
                  <span className="hidden sm:inline">
                    {isExpanded ? "Collapse" : "Expand"}
                  </span>
                </button>
              </div>

              {/* Input Area */}
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

              {/* Example Selector */}
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <ExampleSelector
                  selectedExample={selectedExample}
                  onSelectExample={handleSelectExample}
                />
              </div>

              {/* Footer Controls */}
              <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-6">
                {/* Voice + Tone Selectors */}
                <div className="flex items-center gap-2">
                  <DropupSelector
                    items={VOICE_ITEMS}
                    selectedValue={selectedVoice}
                    onChange={setSelectedVoice}
                    label="Voice"
                    triggerIcon="ri-mic-line"
                  />
                  <DropupSelector
                    items={TONE_ITEMS}
                    selectedValue={instruct}
                    onChange={setInstruct}
                    label="Tone"
                    triggerIcon="ri-voice-recognition-line"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Download Button */}
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

                  {/* Play Button */}
                  <button
                    onClick={handlePlay}
                    disabled={isLoading}
                    className={`flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-xl transition-all active:scale-95
                      ${
                        isLoading
                          ? "bg-neutral-400 cursor-wait"
                          : isSpeaking
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-neutral-900 hover:scale-105 hover:bg-black"
                      }`}
                    aria-label={
                      isLoading
                        ? "Generating speech..."
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

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <i className="ri-error-warning-line mr-2"></i>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Qwen3-TTS Attribution */}
        <div
          className="mt-6 text-center animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          <a
            href="https://github.com/QwenLM/Qwen3-TTS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <span>Powered by</span>
            <span className="font-semibold">Qwen3-TTS</span>
            <i className="ri-external-link-line text-xs"></i>
          </a>
        </div>

        <div className="h-4 md:h-10"></div>
      </div>
    </section>
  );
};

export default Hero;
