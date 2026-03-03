import { useState, useCallback } from "react";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";
const TOKEN_KEY = "vocably_token";

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => !!sessionStorage.getItem(TOKEN_KEY)
    );
    const [authError, setAuthError] = useState(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const login = useCallback(async (username, password) => {
        setIsLoggingIn(true);
        setAuthError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${TTS_BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Invalid username or password.");
            }

            const data = await response.json();
            sessionStorage.setItem(TOKEN_KEY, data.access_token);
            setIsAuthenticated(true);
            return true;
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === "AbortError") {
                setAuthError("Server not responding. Make sure the backend is running and try again.");
            } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                setAuthError("Cannot connect to server. Check your connection and try again.");
            } else {
                setAuthError(err.message || "Login failed. Please try again.");
            }
            return false;
        } finally {
            setIsLoggingIn(false);
        }
    }, []);


    const logout = useCallback(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setIsAuthenticated(false);
        setAuthError(null);
    }, []);

    const getToken = useCallback(() => {
        return sessionStorage.getItem(TOKEN_KEY);
    }, []);

    return {
        isAuthenticated,
        isLoggingIn,
        authError,
        login,
        logout,
        getToken,
    };
};
