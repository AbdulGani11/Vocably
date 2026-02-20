// Shared color map — full static class strings so Tailwind can detect them
const COLOR_MAP = {
  purple: { bg: "bg-purple-50 hover:bg-purple-100", icon: "text-purple-600" },
  blue: { bg: "bg-blue-50 hover:bg-blue-100", icon: "text-blue-600" },
  green: { bg: "bg-green-50 hover:bg-green-100", icon: "text-green-600" },
  orange: { bg: "bg-orange-50 hover:bg-orange-100", icon: "text-orange-600" },
};
const DEFAULT_COLOR = {
  bg: "bg-neutral-50 hover:bg-neutral-100",
  icon: "text-neutral-600",
};

/**
 * REUSABLE FEATURE CARD COMPONENT
 */
const FeatureCard = ({
  icon,
  color,
  title,
  description,
  features,
  children,
}) => {
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
          description="Transform text to lifelike speech"
          features={[
            "10 voices — male and female",
            "Tone control via natural language",
            "Downloads as WAV audio",
          ]}
        />

        <FeatureCard
          icon="ri-shield-line"
          color="blue"
          title="JWT Authenticated API"
          description="Secure access to TTS endpoint"
          features={[
            "HS256 signed Bearer tokens",
            "Session-scoped storage",
            "401 on unauthenticated requests",
          ]}
        />

        <FeatureCard
          icon="ri-cloud-line"
          color="green"
          title="Local & Cloud Deployment"
          description="Run anywhere — local machine or cloud"
          features={[
            "Local: start.bat, no Docker needed",
            "Cloud: Render + Hugging Face Spaces",
            "Docker containerized backend",
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
          description="Open-source AI voice synthesis on HF Spaces"
          features={[
            "10 voices, CPU inference",
            "Tone control via instruct string",
            "~3.5 GB, loaded at container startup",
          ]}
        />

        <FeatureCard
          icon="ri-mic-line"
          color="purple"
          title="Available Voices"
          description="Natural-sounding voices for any use case"
        >
          <div className="feature-card-list">
            <div>
              • <strong>Female:</strong> Vivian, Elena, Isabella, Aria, Sophie
            </div>
            <div>
              • <strong>Male:</strong> Ryan, Lucas, Marcus, Daniel, Nathan
            </div>
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
            "Passed as natural language instruction",
          ]}
        />
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
      <h3 className="mb-3 text-label pl-2">Built For</h3>

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
          description="Voice assistants, chatbots, accessibility tooling"
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
          title="Why Vocably?"
          description="JWT-secured API, Docker containerized, cloud deployed — production-grade TTS portfolio project"
        />
      </div>
    </div>
  );
};
