import { useState, useCallback } from "react";

const TTS_BACKEND_URL = import.meta.env.VITE_TTS_BACKEND_URL || "http://localhost:8000";
const TOKEN_KEY = "vocably_token";

/**
 * useAuth — manages JWT authentication state for Vocably.
 *
 * Token storage: sessionStorage (clears on tab close, safer than localStorage).
 * This is intentional — it limits the token's lifetime to the browser session,
 * reducing the window for token theft if a user walks away from their machine.
 *
 * Flow:
 *   1. login()  → POST /login  → store token in sessionStorage
 *   2. logout() → clear sessionStorage → redirect to login page
 *   3. getToken() → read token for Authorization headers in API calls
 */
export const useAuth = () => {
    // Initialize auth state from sessionStorage (persists across re-renders but not tab close)
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => !!sessionStorage.getItem(TOKEN_KEY)
    );
    const [authError, setAuthError] = useState(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const login = useCallback(async (username, password) => {
        setIsLoggingIn(true);
        setAuthError(null);

        // 30-second timeout — if HF Spaces backend is cold-starting, the request
        // would otherwise hang silently for minutes before failing
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
                // Timeout — backend is likely cold-starting on HF Spaces
                setAuthError("Server is starting up. Please wait 1–2 minutes and try again.");
            } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                // Network unreachable
                setAuthError("Cannot connect to server. Check your connection and try again.");
            } else {
                // Actual auth error (wrong credentials, 401, etc.)
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

    /**
     * Returns the stored token for use in Authorization headers.
     * Returns null if not authenticated.
     */
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
