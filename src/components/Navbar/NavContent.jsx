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
            "15 voices — American & British accents",
            "Speed control (0.75× – 1.5×)",
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
          title="Kokoro-82M Model"
          description="Non-autoregressive TTS — fast CPU inference"
          features={[
            "82M params, ~11s for 10s of audio",
            "StyleTTS2 + ISTFTNet architecture",
            "~500 MB, loads in ~3s",
          ]}
        />

        <FeatureCard
          icon="ri-mic-line"
          color="purple"
          title="Available Voices"
          description="15 voices across two accents"
        >
          <div className="feature-card-list">
            <div>
              • <strong>American Female:</strong> Heart, Bella, Nicole, Sarah, Sky
            </div>
            <div>
              • <strong>American Male:</strong> Adam, Michael, Echo, Liam
            </div>
            <div>
              • <strong>British Female:</strong> Emma, Alice, Lily
            </div>
            <div>
              • <strong>British Male:</strong> George, Daniel, Lewis
            </div>
          </div>
        </FeatureCard>

        <FeatureCard
          icon="ri-speed-up-line"
          color="green"
          title="Speed Control"
          description="Adjust playback rate to taste"
          features={[
            "4 presets: Slow, Normal, Fast, Very Fast",
            "Range: 0.75× to 1.5×",
            "Useful for accessibility & learning",
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
