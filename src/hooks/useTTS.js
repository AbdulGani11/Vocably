import { useState, useRef, useEffect } from "react";
import { VOICES } from "../utils/constants";

// Backend URL from environment variable
const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";

export const useTTS = () => {
    // Text input from user
    const [text, setText] = useState(
        "Welcome to Vocably. Experience natural-sounding voice synthesis powered by Qwen3-TTS. Type your text here and hit play to hear it instantly."
    );

    // Playback state
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Configuration state
    const [selectedVoice, setSelectedVoice] = useState("Vivian");
    const [engine, setEngine] = useState("standard");
    const [instruct, setInstruct] = useState("");

    // Audio availability for download
    const [hasAudio, setHasAudio] = useState(false);

    // Audio element ref and blob URL ref
    const currentAudio = useRef(null);
    const audioBlobUrl = useRef(null);

    // Filter voices based on engine
    const availableVoices = VOICES.filter((voice) =>
        voice.engines.includes(engine)
    );

    // Auto-switch voice if current one isn't supported by new engine
    useEffect(() => {
        const isCurrentVoiceCompatible = availableVoices.some(
            (voice) => voice.name === selectedVoice
        );
        if (!isCurrentVoiceCompatible && availableVoices.length > 0) {
            setSelectedVoice(availableVoices[0].name);
        }
    }, [engine, selectedVoice, availableVoices]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (audioBlobUrl.current) {
                URL.revokeObjectURL(audioBlobUrl.current);
            }
        };
    }, []);

    const handlePlay = async () => {
        // STOP CASE
        if (isSpeaking && currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
            setIsSpeaking(false);
            return;
        }

        // VALIDATION
        if (!text || !text.trim()) {
            setError("Please enter some text to convert to speech.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call FastAPI backend
            const response = await fetch(`${TTS_BACKEND_URL}/api/tts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: text.trim(),
                    voice: selectedVoice,
                    language: "Auto",
                    instruct: instruct.trim() || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Decode base64 audio
            const audioBytes = atob(data.audio_base64);
            const audioArray = new Uint8Array(audioBytes.length);
            for (let i = 0; i < audioBytes.length; i++) {
                audioArray[i] = audioBytes.charCodeAt(i);
            }

            // Create blob and URL
            const audioBlob = new Blob([audioArray], { type: "audio/wav" });

            // Revoke previous URL if exists
            if (audioBlobUrl.current) {
                URL.revokeObjectURL(audioBlobUrl.current);
            }

            audioBlobUrl.current = URL.createObjectURL(audioBlob);
            setHasAudio(true);

            // Play audio
            const audio = new Audio(audioBlobUrl.current);
            currentAudio.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                currentAudio.current = null;
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                setError("Failed to play audio.");
                currentAudio.current = null;
            };

            await audio.play();

        } catch (err) {
            console.error("TTS Error:", err);

            // Provide helpful error messages
            if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                setError("Cannot connect to TTS server. Make sure the backend is running (run.bat).");
            } else {
                setError(err.message || "Failed to generate speech. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!audioBlobUrl.current) {
            setError("No audio to download. Generate speech first.");
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        const filename = `Vocably_${selectedVoice}_${timestamp}.wav`;

        const a = document.createElement("a");
        a.href = audioBlobUrl.current;
        a.download = filename;
        a.click();
    };

    return {
        text,
        setText,
        isSpeaking,
        isLoading,
        error,
        selectedVoice,
        setSelectedVoice,
        engine,
        setEngine,
        instruct,
        setInstruct,
        hasAudio,
        handlePlay,
        handleDownload,
        availableVoices,
    };
};
