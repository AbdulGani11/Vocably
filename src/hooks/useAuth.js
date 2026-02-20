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

        try {
            const response = await fetch(`${TTS_BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Invalid username or password.");
            }

            const data = await response.json();
            sessionStorage.setItem(TOKEN_KEY, data.access_token);
            setIsAuthenticated(true);
            return true;
        } catch (err) {
            if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                setAuthError("Cannot connect to server. Make sure the backend is running.");
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
