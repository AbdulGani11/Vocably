// Shared color map — full static class strings so Tailwind can detect them
const COLOR_MAP = {
  purple: { bg: "bg-purple-50 hover:bg-purple-100", icon: "text-purple-600" },
  blue:   { bg: "bg-blue-50 hover:bg-blue-100",     icon: "text-blue-600" },
  green:  { bg: "bg-green-50 hover:bg-green-100",   icon: "text-green-600" },
  orange: { bg: "bg-orange-50 hover:bg-orange-100", icon: "text-orange-600" },
};
const DEFAULT_COLOR = { bg: "bg-neutral-50 hover:bg-neutral-100", icon: "text-neutral-600" };

/**
 * REUSABLE FEATURE CARD COMPONENT
 * Used across FeaturesContent, DocsContent, and AboutContent
 */
const FeatureCard = ({ icon, color, title, description, features, children }) => {
  const { bg, icon: iconColor } = COLOR_MAP[color] || DEFAULT_COLOR;

  return (
    <div className={`card-feature ${bg}`}>
      <div className="text-heading">
        <i className={`${icon} ${iconColor}`}></i> {title}
      </div>
      {description && <p className="feature-card-desc">{description}</p>}
      {features && (
        <div className="feature-card-list">
          {features.map((feature, idx) => (
            <div key={idx}>• {feature}</div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * ABOUT CARD VARIANT - Icon on left, compact layout
 */
const AboutCard = ({ icon, color, title, description }) => {
  const { bg, icon: iconColor } = COLOR_MAP[color] || DEFAULT_COLOR;

  return (
    <div className={`card-feature ${bg}`}>
      <div className="flex items-start gap-2 mb-1">
        <i className={`${icon} ${iconColor} text-base mt-0.5`}></i>
        <div>
          <div className="text-sm font-semibold text-neutral-800">{title}</div>
          <p className="text-[10px] text-neutral-600 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * FEATURES DROPDOWN CONTENT
 */
export const FeaturesContent = () => {
  return (
    <div className="w-full p-3 text-left">
      <h3 className="mb-3 text-label pl-2">Core Features</h3>

      <div className="flex flex-col gap-2">
        <FeatureCard
          icon="ri-mic-line"
          color="purple"
          title="Natural Voice Synthesis"
          description="Transform text to lifelike speech in seconds"
          features={[
            "Choose from 10 voices",
            "Multiple accents and genders",
            "Instant generation in browser",
          ]}
        />

        <FeatureCard
          icon="ri-shield-line"
          color="blue"
          title="Local & Private"
          description="Everything runs on your machine"
          features={[
            "No cloud uploads or tracking",
            "No API keys or subscriptions",
            "Completely free to use",
          ]}
        />

        <FeatureCard
          icon="ri-download-2-line"
          color="green"
          title="Download & Export"
          description="Save audio files for any project"
          features={[
            "High-quality WAV format",
            "Unlimited downloads",
            "Commercial use allowed",
          ]}
        />
      </div>
    </div>
  );
};

/**
 * DOCS DROPDOWN CONTENT
 */
export const DocsContent = () => {
  return (
    <div className="w-full p-3 text-left">
      <h3 className="mb-3 text-label pl-2">Technical Documentation</h3>

      <div className="flex flex-col gap-2">
        <FeatureCard
          icon="ri-cpu-line"
          color="blue"
          title="Qwen3-TTS 1.7B Model"
          description="High-quality local AI voice synthesis"
          features={[
            "10 voices available",
            "Tone control via instructions",
            "Runs entirely on your machine",
          ]}
        />

        <FeatureCard
          icon="ri-mic-line"
          color="purple"
          title="Available Voices"
          description="Natural-sounding voices for any use case"
        >
          <div className="feature-card-list">
            <div>• <strong>Female:</strong> Vivian, Elena, Isabella, Aria, Sophie</div>
            <div>• <strong>Male:</strong> Ryan, Lucas, Marcus, Daniel, Nathan</div>
          </div>
        </FeatureCard>

        <FeatureCard
          icon="ri-emotion-happy-line"
          color="green"
          title="Tone Control"
          description="Adjust voice emotion and style"
          features={[
            "8 preset tones available",
            "Excited, Sad, Whisper, Calm...",
            "Natural language instructions",
          ]}
        />

        <FeatureCard
          icon="ri-code-box-line"
          color="orange"
          title="Powered by Qwen3-TTS"
          description="Open-source AI voice synthesis"
        >
          <div className="feature-card-list">
            <div>• Runs locally on your machine</div>
            <div>• No API limits or costs</div>
            <div>
              •{" "}
              <a
                href="https://github.com/QwenLM/Qwen3-TTS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </FeatureCard>
      </div>
    </div>
  );
};

/**
 * ABOUT DROPDOWN CONTENT
 */
export const AboutContent = () => {
  return (
    <div className="w-full p-3 text-left">
      <h3 className="mb-3 text-label pl-2">Perfect For</h3>

      <div className="flex flex-col gap-2">
        <AboutCard
          icon="ri-book-open-line"
          color="orange"
          title="Content Creators"
          description="Audiobooks, tutorials, presentations, marketing content"
        />

        <AboutCard
          icon="ri-code-s-slash-line"
          color="blue"
          title="Developers"
          description="Voice assistants, chatbots, apps, customer service tools"
        />

        <AboutCard
          icon="ri-briefcase-line"
          color="green"
          title="Businesses"
          description="Training materials, announcements, accessibility solutions"
        />

        <AboutCard
          icon="ri-star-line"
          color="purple"
          title="Why Choose Vocably?"
          description="Runs locally with unlimited usage, no subscriptions, and better quality than browser TTS"
        />
      </div>
    </div>
  );
};
