import { useState } from "react";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".srt", ".vtt", ".pdf"];

const CardHeader = ({
  onTextLoaded,
  onNotice,
  isLoading,
  fileInputRef,
  isExpanded,
  onToggleExpand,
  MAX_TEXT_LENGTH,
}) => {
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [ytLoadingLabel, setYtLoadingLabel] = useState("Fetching...");
  const [isCleaning, setIsCleaning] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileInputRef.current.value = "";

    const ext = "." + file.name.toLowerCase().split(".").pop();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      onNotice({
        type: "warn",
        message: `"${ext}" is not supported. Accepted: .txt, .md, .srt, .vtt, .pdf`,
      });
      return;
    }

    setIsCleaning(true);
    onNotice(null);

    const isPDF = file.name.toLowerCase().endsWith(".pdf");

    try {
      let data;

      if (isPDF) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${TTS_BACKEND_URL}/api/extract-pdf`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Server error: ${response.status}`);
        }
        data = await response.json();
        const methodLabel = data.method === "ocr" ? "OCR" : "digital";
        const notice = `PDF extracted (${data.pages}p, ${methodLabel})${data.available ? " — cleaned with AI." : " — Ollama unavailable, loaded as-is."}`;
        onNotice({ type: data.available ? "success" : "warn", message: notice });
        if (data.available) setTimeout(() => onNotice(null), 4000);
      } else {
        const rawText = await file.text();
        if (!rawText.trim()) {
          onNotice({ type: "warn", message: "File is empty — nothing to load." });
          setIsCleaning(false);
          return;
        }

        const response = await fetch(`${TTS_BACKEND_URL}/api/clean`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });
        if (response.ok) {
          data = await response.json();
          if (!data.available) {
            onNotice({ type: "warn", message: "Ollama not running — text loaded as-is. Install Ollama + qwen2.5:0.5b for AI cleanup." });
          } else {
            onNotice({ type: "success", message: "Text cleaned with AI." });
            setTimeout(() => onNotice(null), 3000);
          }
        } else {
          const rawTextSliced = rawText.slice(0, MAX_TEXT_LENGTH);
          onTextLoaded(rawTextSliced);
          onNotice({ type: "warn", message: "Cleanup unavailable — text loaded as-is." });
          setIsCleaning(false);
          return;
        }
      }

      onTextLoaded(data.cleaned_text.slice(0, MAX_TEXT_LENGTH));
    } catch (err) {
      onNotice({ type: "warn", message: err.message || "Upload failed — please try again." });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleYoutubeTranscript = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsFetchingYoutube(true);
    setYtLoadingLabel("Fetching...");
    onNotice(null);
    const ytLabelTimer = setTimeout(() => setYtLoadingLabel("Cleaning with AI..."), 4000);

    try {
      const response = await fetch(`${TTS_BACKEND_URL}/api/youtube-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      onTextLoaded(data.cleaned_text.slice(0, MAX_TEXT_LENGTH));
      setShowYoutubeInput(false);
      setYoutubeUrl("");

      const isAvailable = data.available;
      const notice = isAvailable
        ? "YouTube transcript fetched and cleaned with AI."
        : "YouTube transcript fetched — Ollama unavailable, loaded as-is.";
      onNotice({ type: isAvailable ? "success" : "warn", message: notice });
      if (isAvailable) setTimeout(() => onNotice(null), 4000);
    } catch (err) {
      onNotice({ type: "warn", message: err.message || "Failed to fetch transcript." });
    } finally {
      clearTimeout(ytLabelTimer);
      setIsFetchingYoutube(false);
    }
  };

  return (
    <div className="mb-5 md:mb-4 flex items-center justify-between gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.srt,.vtt,.pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

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
            className="flex items-center gap-1 text-[10px] md:text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-40 transition-colors shrink-0"
            aria-label="Fetch transcript"
          >
            {isFetchingYoutube ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                <span className="hidden sm:inline">{ytLoadingLabel}</span>
              </>
            ) : (
              <i className="ri-arrow-right-line"></i>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setShowYoutubeInput(false); setYoutubeUrl(""); }}
            className="text-[10px] md:text-xs text-neutral-400 btn-icon-transition shrink-0"
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
            className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-neutral-400 btn-icon-transition disabled:cursor-wait"
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
            onClick={() => { setShowYoutubeInput(true); onNotice(null); }}
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
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-neutral-400 btn-icon-transition"
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
  );
};

export default CardHeader;
