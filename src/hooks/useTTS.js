import { useState, useRef, useEffect } from "react";

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
    const [instruct, setInstruct] = useState("");

    // Audio availability for download
    const [hasAudio, setHasAudio] = useState(false);

    // Audio element ref and blob URL ref
    const currentAudio = useRef(null);
    const audioBlobUrl = useRef(null);

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
        if (!text.trim()) {
            setError("Please enter some text to convert to speech.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Read JWT from sessionStorage — set during login
            const token = sessionStorage.getItem("vocably_token");

            // Call FastAPI backend (JWT required by the server)
            const response = await fetch(`${TTS_BACKEND_URL}/api/tts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Attach Bearer token — server returns 401 if missing or invalid
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
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
                // 401 means the token is missing, expired, or tampered with
                if (response.status === 401) {
                    throw new Error("Session expired. Please log in again.");
                }
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Decode base64 audio into a blob
            const audioArray = Uint8Array.from(atob(data.audio_base64), (char) => char.charCodeAt(0));
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
        instruct,
        setInstruct,
        hasAudio,
        handlePlay,
        handleDownload,
    };
};
