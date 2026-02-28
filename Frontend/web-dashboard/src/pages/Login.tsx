import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  Shield,
  WifiOff,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { trackEvent } from "../utils/analytics";
import { logError } from "../utils/logging";

// --- Types ---
interface LocationState {
  from?: { pathname: string };
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMFA } = useAuth();

  // --- State ---
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
    mfaCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showMFA, setShowMFA] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const from =
    (location.state as LocationState)?.from?.pathname || "/dashboard";

  // --- Effects ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(
        () => setCooldown((p) => Math.max(0, p - 1)),
        1000
      );
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // --- Handlers ---
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
      setError(null);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || !isOnline) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(formData.email, formData.password);
      if (result.mfaRequired) {
        setShowMFA(true);
      } else {
        trackEvent("login_success", { email: formData.email });
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      logError(
        "Login attempt failed",
        err instanceof Error ? err : new Error(String(err))
      );
      if (message.toLowerCase().includes("too many requests")) {
        setCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await verifyMFA(formData.mfaCode);
      trackEvent("mfa_success");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Views ---
  if (showMFA) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
            <p className="text-gray-500 mt-2">
              Enter the 6-digit code from your app
            </p>
          </div>

          <form onSubmit={handleMFAVerifySubmit} className="space-y-6">
            <input
              type="text"
              name="mfaCode"
              value={formData.mfaCode}
              onChange={handleInputChange}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-3xl tracking-[0.5em] font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || formData.mfaCode.length < 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Verify Code"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowMFA(false)}
              className="w-full text-gray-500 text-sm hover:underline"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Offline Alert */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg flex items-center gap-2 text-sm">
            <WifiOff className="w-4 h-4" /> You are currently offline. Login is
            disabled.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">EmailSuite</h1>
            <p className="text-gray-500 mt-2">Sign in to your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || cooldown > 0 || !isOnline}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin shrink-0" />
                  <span>Signing in...</span>
                </>
              ) : !isOnline ? (
                <span>Waiting for connection...</span>
              ) : cooldown > 0 ? (
                <span>Wait {cooldown}s</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
