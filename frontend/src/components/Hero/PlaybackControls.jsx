import DropupSelector from "./DropupSelector";

const PlaybackControls = ({
  isLoading,
  isSpeaking,
  backendReady,
  backendStatus,
  hasAudio,
  onPlay,
  onDownload,
  voice,
  onVoiceChange,
  speed,
  onSpeedChange,
  voiceItems,
  speedItems,
}) => {
  const getPlayButtonClasses = () => {
    const base =
      "flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-xl transition-all active:scale-95";
    if (isLoading || !backendReady) {
      return `${base} bg-neutral-400 cursor-wait`;
    } else if (isSpeaking) {
      return `${base} bg-red-500 hover:bg-red-600`;
    } else {
      return `${base} bg-neutral-900 hover:scale-105 hover:bg-black`;
    }
  };

  const getPlayButtonLabel = () => {
    if (isLoading) {
      return "Generating speech...";
    } else if (!backendReady) {
      if (backendStatus === "offline") {
        return "Backend offline — start the server";
      } else {
        return "Backend warming up, please wait";
      }
    } else if (isSpeaking) {
      return "Stop speaking";
    } else {
      return "Play text as speech";
    }
  };

  return (
    <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-6">
      <div className="flex items-center gap-2">
        <DropupSelector
          items={voiceItems}
          selectedValue={voice}
          onChange={onVoiceChange}
          label="Voice"
          triggerIcon="ri-mic-line"
        />
        <DropupSelector
          items={speedItems}
          selectedValue={speed}
          onChange={onSpeedChange}
          label="Speed"
          triggerIcon="ri-equalizer-line"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onDownload}
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
          onClick={onPlay}
          disabled={isLoading || !backendReady}
          className={getPlayButtonClasses()}
          aria-label={getPlayButtonLabel()}
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
  );
};

export default PlaybackControls;
