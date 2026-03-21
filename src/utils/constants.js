export const MAX_TEXT_LENGTH = 10000;
export const WARNING_THRESHOLD = 9000;

export const VOICES = [
    { value: "af_heart",   label: "Heart",   group: "American Female" },
    { value: "af_bella",   label: "Bella",   group: "American Female" },
    { value: "af_nicole",  label: "Nicole",  group: "American Female" },
    { value: "af_sarah",   label: "Sarah",   group: "American Female" },
    { value: "af_sky",     label: "Sky",     group: "American Female" },
    { value: "am_adam",    label: "Adam",    group: "American Male" },
    { value: "am_michael", label: "Michael", group: "American Male" },
    { value: "am_echo",    label: "Echo",    group: "American Male" },
    { value: "am_liam",    label: "Liam",    group: "American Male" },
    { value: "bf_emma",    label: "Emma",    group: "British Female" },
    { value: "bf_alice",   label: "Alice",   group: "British Female" },
    { value: "bf_lily",    label: "Lily",    group: "British Female" },
    { value: "bm_george",  label: "George",  group: "British Male" },
    { value: "bm_daniel",  label: "Daniel",  group: "British Male" },
    { value: "bm_lewis",   label: "Lewis",   group: "British Male" },
];

export const SPEED_PRESETS = [
    { id: "slow",      label: "Slow",      icon: "ri-snail-line",       speed: 0.75 },
    { id: "normal",    label: "Normal",    icon: "ri-equalizer-line",   speed: 1.0  },
    { id: "fast",      label: "Fast",      icon: "ri-speed-up-line",    speed: 1.25 },
    { id: "very_fast", label: "Very Fast", icon: "ri-rocket-2-line",    speed: 1.5  },
];

export const USE_CASES = [
    {
        id: "finance",
        label: "Finance",
        icon: "ri-money-dollar-circle-line",
        color: "text-green-600",
        text: "The average American spends $18,000 a year on things they don't need. That's not a judgment — that's a mathematical fact. But what if redirecting just 20% of that into an index fund, starting today, could make you a millionaire by retirement? In this video, we break down exactly how compound interest works, and why your bank doesn't want you to know.",
    },
    {
        id: "ai_tech",
        label: "AI & Tech",
        icon: "ri-robot-line",
        color: "text-violet-600",
        text: "A new AI model just dropped that nobody expected — and before you scroll past thinking this is just another update, wait. This one changes how software gets built. I've been testing it for 72 hours straight, and by the end of this video you'll understand exactly why every developer is talking about it right now.",
    },
    {
        id: "history",
        label: "History",
        icon: "ri-ancient-gate-line",
        color: "text-amber-700",
        text: "In 1929, a single telegram changed the course of modern history. The man who sent it had no idea that within six months the entire global economy would collapse. This is the untold story of the 48 hours before the Great Crash — and the eerie parallels to what's happening in markets today.",
    },
    {
        id: "motivation",
        label: "Motivation",
        icon: "ri-fire-line",
        color: "text-orange-500",
        text: "You've been telling yourself you'll start tomorrow for 847 days. I know this because that's the average number of days people delay a goal they care about. The difference between the person you are and the person you want to be isn't talent, connections, or money. It's a decision you've been refusing to make.",
    },
];
