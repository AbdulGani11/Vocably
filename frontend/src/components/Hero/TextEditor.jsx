const TextEditor = ({ text, onTextChange, isExpanded, MAX_TEXT_LENGTH, WARNING_THRESHOLD }) => {
  const charCountColor =
    text.length > WARNING_THRESHOLD ? "text-red-500" : "text-neutral-400";

  return (
    <div className="relative group">
      <textarea
        className={`w-full resize-none border-none bg-transparent p-0 text-lg md:text-2xl font-light leading-relaxed text-neutral-800 focus:ring-0 placeholder:text-neutral-300 transition-all duration-300 ${
          isExpanded ? "h-64 md:h-80" : "h-40 md:h-32"
        }`}
        placeholder="Type something here to hear it spoken..."
        value={text}
        onChange={(e) => onTextChange(e.target.value.slice(0, MAX_TEXT_LENGTH))}
        aria-label="Text to convert to speech"
      />
      <div
        className={`absolute bottom-1 md:bottom-2 right-0 text-[10px] font-mono transition-colors ${charCountColor}`}
      >
        {text.length}/{MAX_TEXT_LENGTH}
      </div>
    </div>
  );
};

export default TextEditor;
