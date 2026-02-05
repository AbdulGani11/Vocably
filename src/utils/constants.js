export const MAX_TEXT_LENGTH = 3000;
export const WARNING_THRESHOLD = 2700;

// Qwen3-TTS CustomVoice Speakers
export const VOICES = [
    "Vivian", "Ryan", "Elena", "Lucas", "Isabella",
    "Marcus", "Aria", "Daniel", "Sophie", "Nathan",
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

// Use case badges — clickable demos in the headline area
export const USE_CASES = [
    {
        id: "podcasts",
        label: "Podcasts",
        icon: "ri-mic-line",
        color: "text-purple-500",
        text: "Welcome to the future of podcasting. In today's episode, we're diving into how artificial intelligence is reshaping the way creators produce audio content. Whether you're a solo voice or a full production team, the tools are finally catching up — and this is just the beginning.",
    },
    {
        id: "youtube",
        label: "YouTube",
        icon: "ri-youtube-line",
        color: "text-red-500",
        text: "Hey everyone, welcome back to the channel! Today I'm showing you something that's going to change how you create content. No mic setup, no takes, no editing. Just type your script, hit play, and you've got a polished voiceover in seconds. Links are down in the description — let's get into it.",
    },
    {
        id: "audiobooks",
        label: "Audiobooks",
        icon: "ri-book-2-line",
        color: "text-amber-600",
        text: "Chapter One. The old library stood at the edge of town, its wooden doors creaking open like a whispered invitation. No one had visited in years — until the night a single light flickered behind the frosted glass. She stepped inside, and the dust caught the moonlight like a thousand tiny stars falling in slow motion.",
    },
    {
        id: "presentations",
        label: "Presentations",
        icon: "ri-presentation-line",
        color: "text-blue-500",
        text: "Good morning, team. This quarter we saw a 34% increase in user engagement and a 22% reduction in churn. These results reflect the work every one of you has put in. Our roadmap for next quarter includes three major milestones — and based on where we stand today, I'm confident we'll exceed each one.",
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
