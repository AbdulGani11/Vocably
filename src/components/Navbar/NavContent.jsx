/**
 * REUSABLE FEATURE CARD COMPONENT
 * Used across FeaturesContent, DocsContent, and AboutContent
 */
const FeatureCard = ({
  icon,
  color,
  title,
  description,
  features,
  children,
}) => {
  const colorClasses = {
    purple: "bg-purple-50 hover:bg-purple-100 text-purple-600",
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-600",
    green: "bg-green-50 hover:bg-green-100 text-green-600",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-600",
  };

  const [bgHover, iconColor] = colorClasses[color]?.split(" text-") || [
    "bg-neutral-50 hover:bg-neutral-100",
    "neutral-600",
  ];

  return (
    <div className={`card-feature ${bgHover}`}>
      <div className="text-heading">
        <i className={`${icon} text-${iconColor}`}></i> {title}
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
 * ABOUT CARD VARIANT - Different layout with icon on left
 */
const AboutCard = ({ icon, color, title, description }) => {
  const colorClasses = {
    purple: "bg-purple-50 hover:bg-purple-100 text-purple-600",
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-600",
    green: "bg-green-50 hover:bg-green-100 text-green-600",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-600",
  };

  const [bgHover, iconColor] = colorClasses[color]?.split(" text-") || [
    "bg-neutral-50 hover:bg-neutral-100",
    "neutral-600",
  ];

  return (
    <div className={`card-feature ${bgHover}`}>
      <div className="flex items-start gap-2 mb-1">
        <i className={`${icon} text-${iconColor} text-base mt-0.5`}></i>
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
    <div className="w-100 p-3 text-left">
      <h3 className="mb-3 text-label pl-2">Core Features</h3>

      <div className="flex flex-col gap-2">
        <FeatureCard
          icon="ri-mic-line"
          color="purple"
          title="Natural Voice Synthesis"
          description="Transform text to lifelike speech in seconds"
          features={[
            "Choose from 9 premium voices",
            "Multiple accents and genders",
            "Instant generation in browser",
          ]}
        />

        <FeatureCard
          icon="ri-flashlight-line"
          color="blue"
          title="Zero Setup Required"
          description="Start creating instantly, no installation needed"
          features={[
            "Works directly in your browser",
            "No API keys or registration",
            "Completely free to use",
          ]}
        />

        <FeatureCard
          icon="ri-download-2-line"
          color="green"
          title="Download & Export"
          description="Save audio files for any project"
          features={[
            "High-quality MP3 format",
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
    <div className="w-100 p-3 text-left">
      <h3 className="mb-3 text-label pl-2">Technical Documentation</h3>

      <div className="flex flex-col gap-2">
        <FeatureCard
          icon="ri-cpu-line"
          color="blue"
          title="Neural Engine"
          description="High-quality, versatile text-to-speech"
          features={[
            "Supports all 9 voices",
            "Best for general-purpose TTS",
            "Consistent quality across content types",
          ]}
        />

        <FeatureCard
          icon="ri-sparkling-line"
          color="purple"
          title="Generative Engine"
          description="Most human-like AI voice synthesis"
          features={[
            "Supports 4 premium voices",
            "Advanced context awareness",
            "Superior emotional expression",
          ]}
        />

        <FeatureCard
          icon="ri-list-check"
          color="green"
          title="Voice Compatibility"
          description="Engine-specific voice availability"
        >
          <div className="feature-card-list">
            <div>
              • <strong>Both:</strong> Joanna, Matthew, Amy, Brian
            </div>
            <div>
              • <strong>Neural Only:</strong> Ivy, Joey, Kendra, Kimberly, Salli
            </div>
          </div>
        </FeatureCard>

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
    <div className="w-100 p-3 text-left">
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
          description="Zero setup required with unlimited usage, commercial license, and better quality than browser TTS"
        />
      </div>
    </div>
  );
};
