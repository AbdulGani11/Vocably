export const MAX_TEXT_LENGTH = 3000;
export const WARNING_THRESHOLD = 2700;

// Qwen3-TTS CustomVoice Speakers
// These are the pre-defined voices available in the 0.6B and 1.7B CustomVoice models
export const VOICES = [
    { name: "Vivian", voiceId: "vivian", label: "Vivian", engines: ["standard", "premium"] },
    { name: "Ryan", voiceId: "ryan", label: "Ryan", engines: ["standard", "premium"] },
    { name: "Elena", voiceId: "elena", label: "Elena", engines: ["standard", "premium"] },
    { name: "Lucas", voiceId: "lucas", label: "Lucas", engines: ["standard", "premium"] },
    { name: "Isabella", voiceId: "isabella", label: "Isabella", engines: ["standard", "premium"] },
    { name: "Marcus", voiceId: "marcus", label: "Marcus", engines: ["standard", "premium"] },
    { name: "Aria", voiceId: "aria", label: "Aria", engines: ["standard", "premium"] },
    { name: "Daniel", voiceId: "daniel", label: "Daniel", engines: ["standard", "premium"] },
    { name: "Sophie", voiceId: "sophie", label: "Sophie", engines: ["standard", "premium"] },
    { name: "Nathan", voiceId: "nathan", label: "Nathan", engines: ["standard", "premium"] },
];

// Tone/Style Presets for instruction-based voice control
export const TONE_PRESETS = [
    { id: "none", label: "Default", icon: "ri-voice-recognition-line", instruction: "" },
    { id: "excited", label: "Excited", icon: "ri-emotion-happy-line", instruction: "Speak with excitement and enthusiasm" },
    { id: "sad", label: "Sad", icon: "ri-emotion-sad-line", instruction: "Speak in a sad, melancholic tone" },
    { id: "angry", label: "Angry", icon: "ri-emotion-unhappy-line", instruction: "Speak with anger and frustration" },
    { id: "whisper", label: "Whisper", icon: "ri-volume-mute-line", instruction: "Whisper softly and quietly" },
    { id: "news", label: "News", icon: "ri-newspaper-line", instruction: "Speak like a professional news anchor" },
    { id: "calm", label: "Calm", icon: "ri-mental-health-line", instruction: "Speak slowly, calmly, and peacefully" },
    { id: "dramatic", label: "Dramatic", icon: "ri-movie-2-line", instruction: "Speak with dramatic flair and intensity" },
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
