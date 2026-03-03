import { useState, useRef, useEffect } from "react";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";

export const useTTS = () => {
    const [text, setText] = useState(
        "Welcome to Vocably. Experience natural-sounding voice synthesis powered by Kokoro. Type your text here and hit play."
    );

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedVoice, setSelectedVoice] = useState("af_heart");
    const [speed, setSpeed] = useState(1.0);

    const [hasAudio, setHasAudio] = useState(false);

    const [backendStatus, setBackendStatus] = useState("checking");

    const currentAudio = useRef(null);
    const audioBlobUrl = useRef(null);

    useEffect(() => {
        let intervalId;
        const poll = async () => {
            try {
                const res = await fetch(`${TTS_BACKEND_URL}/health`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "healthy") {
                        setBackendStatus("ready");
                        clearInterval(intervalId);
                    } else {
                        setBackendStatus("warming");
                    }
                } else {
                    setBackendStatus("offline");
                }
            } catch {
                setBackendStatus("offline");
            }
        };

        poll();
        intervalId = setInterval(poll, 2500);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        return () => {
            if (audioBlobUrl.current) {
                URL.revokeObjectURL(audioBlobUrl.current);
            }
        };
    }, []);

    const handlePlay = async () => {
        if (isSpeaking && currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
            setIsSpeaking(false);
            return;
        }

        if (!text.trim()) {
            setError("Please enter some text to convert to speech.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = sessionStorage.getItem("vocably_token");

            const response = await fetch(`${TTS_BACKEND_URL}/api/tts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    text: text.trim(),
                    voice: selectedVoice,
                    speed: speed,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    throw new Error("Session expired. Please log in again.");
                }
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();

            const audioArray = Uint8Array.from(atob(data.audio_base64), (char) => char.charCodeAt(0));
            const audioBlob = new Blob([audioArray], { type: "audio/wav" });

            if (audioBlobUrl.current) {
                URL.revokeObjectURL(audioBlobUrl.current);
            }

            audioBlobUrl.current = URL.createObjectURL(audioBlob);
            setHasAudio(true);

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

            if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                setError("Cannot connect to TTS server. Check that the backend is running (local) or accessible (cloud).");
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
        speed,
        setSpeed,
        hasAudio,
        backendStatus,
        handlePlay,
        handleDownload,
    };
};