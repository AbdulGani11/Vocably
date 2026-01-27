const EngineToggle = ({ engine, setEngine }) => {
  return (
    <div className="flex gap-1.5 md:gap-2">
      {/* Standard - 9 voices available */}
      <button
        onClick={() => setEngine("neural")}
        className={`engine-btn ${engine === "neural" ? "engine-btn-active" : "engine-btn-inactive"}`}
        aria-label="Switch to standard mode - 9 voices"
      >
        <i className="ri-volume-up-line text-xs md:text-sm"></i> Standard
      </button>

      {/* Premium - 4 premium voices */}
      <button
        onClick={() => setEngine("generative")}
        className={`engine-btn ${engine === "generative" ? "engine-btn-active" : "engine-btn-inactive"}`}
        aria-label="Switch to premium mode - 4 premium voices"
      >
        <i className="ri-sparkling-line text-xs md:text-sm"></i> Premium
      </button>
    </div>
  );
};

export default EngineToggle;
