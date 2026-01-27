import { EXAMPLES } from "../../utils/constants";

const ExampleSelector = ({ selectedExample, onSelectExample }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-medium uppercase text-neutral-400 mr-1">
        Try:
      </span>
      {EXAMPLES.map((example) => (
        <button
          key={example.id}
          onClick={() => onSelectExample(example)}
          className={`example-pill ${
            selectedExample === example.id ? "example-pill-active" : ""
          }`}
          title={`Load "${example.label}" example`}
        >
          <i className={example.icon}></i>
          {example.label}
        </button>
      ))}
    </div>
  );
};

export default ExampleSelector;
