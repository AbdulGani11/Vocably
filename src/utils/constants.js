export const MAX_TEXT_LENGTH = 5000;
export const WARNING_THRESHOLD = 4500;

// Kokoro-82M voices — grouped by accent
export const VOICES = [
    // American Female
    { value: "af_heart",   label: "Heart",   group: "American Female" },
    { value: "af_bella",   label: "Bella",   group: "American Female" },
    { value: "af_nicole",  label: "Nicole",  group: "American Female" },
    { value: "af_sarah",   label: "Sarah",   group: "American Female" },
    { value: "af_sky",     label: "Sky",     group: "American Female" },
    // American Male
    { value: "am_adam",    label: "Adam",    group: "American Male" },
    { value: "am_michael", label: "Michael", group: "American Male" },
    { value: "am_echo",    label: "Echo",    group: "American Male" },
    { value: "am_liam",    label: "Liam",    group: "American Male" },
    // British Female
    { value: "bf_emma",    label: "Emma",    group: "British Female" },
    { value: "bf_alice",   label: "Alice",   group: "British Female" },
    { value: "bf_lily",    label: "Lily",    group: "British Female" },
    // British Male
    { value: "bm_george",  label: "George",  group: "British Male" },
    { value: "bm_daniel",  label: "Daniel",  group: "British Male" },
    { value: "bm_lewis",   label: "Lewis",   group: "British Male" },
];

// Speed presets — replaces Tone (Kokoro supports speed, not tone instructions)
export const SPEED_PRESETS = [
    { id: "slow",      label: "Slow",      icon: "ri-snail-line",       speed: 0.75 },
    { id: "normal",    label: "Normal",    icon: "ri-equalizer-line",   speed: 1.0  },
    { id: "fast",      label: "Fast",      icon: "ri-speed-up-line",    speed: 1.25 },
    { id: "very_fast", label: "Very Fast", icon: "ri-rocket-2-line",    speed: 1.5  },
];

// Use case badges — faceless YouTube niches, click to load a demo script
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

export const EXAMPLES = [
    {
        id: "meta",
        label: "Self-Aware",
        icon: "ri-lightbulb-line",
        text: "I know what you're thinking: 'This is just a computer.' But listen closely to the pauses, the breath, and the rhythm. I'm not just reading text; I'm telling a story. Go ahead, clear this box and give me something challenging to say.",
    },
    {
        id: "storyteller",
        label: "Storyteller",
        icon: "ri-quill-pen-line",
        text: "The old lighthouse stood defiant against the crashing waves, a solitary beacon in the endless grey. Close your eyes and listen. Can you see the storm? That is the power of a perfect voice—it doesn't just read words; it paints pictures.",
    },
    {
        id: "creator",
        label: "Creator",
        icon: "ri-video-line",
        text: "Stop wasting hours staring at a microphone. Whether you're explaining quantum physics or reviewing the latest tech, I can narrate your script in seconds with zero mistakes. Ready to create your next viral video? Type your script here.",
    },
    {
        id: "conversational",
        label: "Friendly",
        icon: "ri-chat-smile-3-line",
        text: "Hello there. I promise I haven't had any coffee today, but I still sound this energetic. I can be your news anchor, your storyteller, or the voice of your brand. Type something funny, or maybe something serious—I can handle both.",
    },
    {
        id: "fact",
        label: "Fact Hook",
        icon: "ri-brain-line",
        text: "Did you know the human ear can detect sound in less than 0.05 seconds? That's faster than you can blink. You need a voice that makes an instant impact. Type your message here and let's see if we can capture your audience's attention just as fast.",
    },
];
