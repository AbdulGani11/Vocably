import { useState, useEffect } from "react";

const VoiceSelector = ({
  selectedVoice,
  setSelectedVoice,
  availableVoices,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest(".voice-dropdown")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Find label for selected voice
  const currentLabel =
    availableVoices.find((v) => v.name === selectedVoice)?.label ||
    selectedVoice;

  // CSS classes for transition - reusing pattern from index.css
  const dropdownClasses = isOpen ? "dropdown-visible" : "dropdown-hidden";

  return (
    <div className="flex items-center relative voice-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center gap-1.5 md:gap-2 rounded-full border border-neutral-200 pl-1.5 md:pl-2 pr-2 md:pr-3 py-0.5 md:py-1 bg-white hover:border-neutral-300 transition-colors group"
      >
        <div className="icon-circle h-7 w-7 md:h-8 md:w-8 bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 transition-colors">
          <i className="ri-mic-line text-base md:text-lg"></i>
        </div>

        <div className="text-left hidden xs:block">
          <div className="text-[9px] font-bold uppercase text-neutral-400">
            Voice
          </div>
          <div className="text-[10px] md:text-[11px] font-semibold text-neutral-800 truncate max-w-30">
            {currentLabel}
          </div>
        </div>
        <i
          className={`ri-arrow-down-s-line text-neutral-400 ml-0.5 md:ml-1 text-sm md:text-base transition-transform ${isOpen ? "rotate-180" : ""}`}
        ></i>
      </button>

      {/* Voice Dropdown - using CSS classes from index.css */}
      <div
        className={`dropdown-panel bottom-full mb-2 left-0 w-56 ${dropdownClasses}`}
      >
        <div className="p-2 max-h-64 overflow-y-auto">
          {availableVoices.map((voice) => (
            <button
              key={voice.name}
              onClick={() => {
                setSelectedVoice(voice.name);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                selectedVoice === voice.name
                  ? "bg-purple-50 text-purple-700"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {voice.label}
              {selectedVoice === voice.name && (
                <i className="ri-check-line ml-2 text-purple-600"></i>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceSelector;
