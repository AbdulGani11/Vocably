import { useState, useRef, useEffect } from "react";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";

// Assemble Float32 PCM samples into a downloadable WAV blob (mono, 24 kHz, 16-bit)
function buildWav(pcmFloat32, sampleRate = 24000) {
    const n = pcmFloat32.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
    };

    // RIFF chunk descriptor
    writeString(0, "RIFF"); v.setUint32(4, 36 + n * 2, true);
    writeString(8, "WAVE");

    // fmt sub-chunk (PCM format)
    writeString(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true);  // PCM
    v.setUint16(22, 1, true);  v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);

    // data sub-chunk
    writeString(36, "data"); v.setUint32(40, n * 2, true);

    // 16-bit PCM: negative samples scale to -32768, positive to 32767
    const NEG_SCALE = 0x8000;
    const POS_SCALE = 0x7FFF;
    for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, pcmFloat32[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * NEG_SCALE : s * POS_SCALE, true);
    }
    return new Blob([buf], { type: "audio/wav" });
}

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

    const audioCtxRef = useRef(null);
    const scheduledSourcesRef = useRef([]);
    const nextStartTimeRef = useRef(0);
    const abortRef = useRef(null);
    const collectedPCMRef = useRef([]);
    const downloadBlobRef = useRef(null);
    const sessionIdRef = useRef(0);

    // Health polling
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    const stopPlayback = () => {
        if (abortRef.current) abortRef.current.abort();
        scheduledSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
        scheduledSourcesRef.current = [];
        setIsSpeaking(false);
        setIsLoading(false);
    };

    const handlePlay = async () => {
        if (isSpeaking || isLoading) {
            stopPlayback();
            return;
        }

        if (!text.trim()) {
            setError("Please enter some text to convert to speech.");
            return;
        }

        setError(null);
        setIsLoading(true);
        collectedPCMRef.current = [];
        scheduledSourcesRef.current = [];

        const sessionId = ++sessionIdRef.current;

        // AudioContext must be created inside a user gesture
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();

        nextStartTimeRef.current = ctx.currentTime + 0.05;
        abortRef.current = new AbortController();

        let firstChunk = true;
        let lastSource = null;

        try {
            const response = await fetch(`${TTS_BACKEND_URL}/api/tts/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text.trim(), voice: selectedVoice, speed }),
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split("\n");
                lineBuffer = lines.pop(); // keep incomplete trailing line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const { audio_base64 } = JSON.parse(line);

                    // Each chunk is a complete mini-WAV — decodeAudioData works fine
                    const bytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0));
                    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

                    // Collect PCM channel data for later download assembly
                    collectedPCMRef.current.push(audioBuffer.getChannelData(0));

                    // Schedule gapless: start exactly when the previous chunk ends
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.01);
                    source.start(startAt);
                    nextStartTimeRef.current = startAt + audioBuffer.duration;
                    scheduledSourcesRef.current.push(source);
                    lastSource = source;

                    if (firstChunk) {
                        firstChunk = false;
                        setIsLoading(false);
                        setIsSpeaking(true);
                    }
                }
            }

            // All server chunks received — build download blob immediately
            if (collectedPCMRef.current.length > 0 && sessionIdRef.current === sessionId) {
                const total = collectedPCMRef.current.reduce((totalLength, chunk) => totalLength + chunk.length, 0);
                const combined = new Float32Array(total);
                let offset = 0;
                for (const chunk of collectedPCMRef.current) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                downloadBlobRef.current = buildWav(combined);
                setHasAudio(true);
            }

            // Flip isSpeaking off when the last scheduled chunk finishes playing
            if (lastSource && sessionIdRef.current === sessionId) {
                lastSource.onended = () => {
                    if (sessionIdRef.current === sessionId) setIsSpeaking(false);
                };
            } else if (!lastSource) {
                setIsLoading(false);
            }

        } catch (err) {
            if (err.name === "AbortError") return;
            console.error("TTS Error:", err);
            setError(
                err.message.includes("Failed to fetch") || err.message.includes("NetworkError")
                    ? "Cannot connect to TTS server. Check that the backend is running."
                    : err.message || "Failed to generate speech. Please try again."
            );
        } finally {
            if (sessionIdRef.current === sessionId) setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!downloadBlobRef.current) {
            setError("No audio to download. Generate speech first.");
            return;
        }
        const url = URL.createObjectURL(downloadBlobRef.current);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        const a = document.createElement("a");
        a.href = url;
        a.download = `Vocably_${selectedVoice}_${timestamp}.wav`;
        a.click();
        URL.revokeObjectURL(url);
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
