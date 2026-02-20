/**
 * Login.jsx — Authentication gate for Vocably
 *
 * Minimal login form that matches the existing Vocably design system.
 * Calls useAuth.login() → POST /login → stores JWT in sessionStorage.
 *
 * Default credentials (local demo):
 *   username: vocably
 *   password: vocably2026
 */

import { useState } from "react";

const Login = ({ onLogin, authError, isLoggingIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await onLogin(username.trim(), password);
  };

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-linear-to-br from-neutral-50 via-amber-50/30 to-white px-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Vocably
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to access your TTS workspace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl shadow-orange-900/10 border border-white/60 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-xs font-medium uppercase tracking-wide text-neutral-500"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vocably"
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wide text-neutral-500"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i
                    className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}
                  />
                </button>
              </div>
            </div>

            {/* Error message */}
            {authError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <i className="ri-error-warning-line mt-0.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn || !username.trim() || !password.trim()}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-sm font-medium text-white shadow-xl transition-all hover:scale-[1.02] hover:bg-black active:scale-95 disabled:cursor-wait disabled:bg-neutral-400"
            >
              {isLoggingIn ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <i className="ri-login-box-line" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Hint */}
        <p className="mt-5 text-center text-xs text-neutral-400">
          JWT-secured · Local & cloud deployment · Private by design
        </p>
      </div>
    </div>
  );
};

export default Login;
