// pages/ForgotPassword.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader,
  Shield,
  Clock,
  RefreshCw,
  HelpCircle,
  Key,
  Send,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { validateEmail } from "../utils/validators";
import { trackEvent } from "../utils/analytics";
import { logError } from "../utils/logging";

interface ErrorResponse {
  code?: string;
  message?: string;
}

interface ApiErrorResponse {
  response?: {
    status: number;
    data?: ErrorResponse;
    headers?: Record<string, string>;
  };
  message: string;
}

// Types
interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

interface ResetRequestResponse {
  success: boolean;
  message: string;
  rateLimit: RateLimitInfo;
  email?: string;
}

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  // Rate limiting
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Security
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  // Get email from query params (if coming from signup)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam && validateEmail(emailParam)) {
      setEmail(emailParam);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Check for account lock
  useEffect(() => {
    if (lockedUntil && lockedUntil > new Date()) {
      const timer = setInterval(() => {
        if (lockedUntil <= new Date()) {
          setLockedUntil(null);
          setAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockedUntil]);

  // Email validation
  const isEmailValid = validateEmail(email);
  const emailError =
    touched && !isEmailValid ? "Please enter a valid email address" : null;

  // Handle input change
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      setError(null);
      if (!touched) setTouched(true);
    },
    [touched]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      setError(null);

      // Validate email
      if (!isEmailValid) {
        setError("Please enter a valid email address");
        return;
      }

      // Check rate limiting
      if (cooldown > 0) {
        setError(`Please wait ${cooldown} seconds before trying again`);
        return;
      }

      // Check account lock
      if (lockedUntil && lockedUntil > new Date()) {
        const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        setError(`Too many attempts. Please try again in ${minutes} minutes.`);
        return;
      }

      setIsLoading(true);

      try {
        // Track attempt
        trackEvent("password_reset_attempt", { email });

        // Call API with rate limit headers
        const response = await api.post<ResetRequestResponse>(
          "/auth/forgot-password",
          {
            email,
            // Include device info for security
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        );

        // Handle rate limit info from headers
        const rateLimitInfo = {
          remaining: parseInt(response.headers["x-ratelimit-remaining"] || "5"),
          reset: parseInt(response.headers["x-ratelimit-reset"] || "60"),
          limit: parseInt(response.headers["x-ratelimit-limit"] || "5"),
        };
        setRateLimit(rateLimitInfo);

        // Track success
        trackEvent("password_reset_success", { email });

        // Show success
        setSuccess(true);
        showToast("Reset instructions sent! Check your email.", "success");

        // Log security event
        logError("Password reset requested", {
          email,
          timestamp: new Date().toISOString(),
          rateLimit: rateLimitInfo,
        });
      } catch (err: unknown) {
        // Handle different error types
        const apiError = err as ApiErrorResponse;
        const status = apiError.response?.status;
        const data = apiError.response?.data;

        // Track failure
        trackEvent("password_reset_failure", {
          email,
          reason: data?.code || "unknown",
          status,
        });

        switch (status) {
          case 429: {
            const retryAfter = parseInt(
              apiError.response?.headers?.['retry-after'] || '60'
            );
            setCooldown(retryAfter);
            setError(`Too many requests. Please wait ${retryAfter} seconds.`);
            break;
          }

          case 400: // Validation error
            setError(
              data?.message || "Invalid request. Please check your email."
            );
            break;

          case 404: {
            // Email not found (don't reveal this for security)
            // Still show success to prevent email enumeration
            setSuccess(true);
            showToast(
              "If an account exists, reset instructions will be sent.",
              "info"
            );
            break;
          }

          case 423: {
            // Account locked
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + 15);
            setLockedUntil(lockTime);
            setError(
              "Account temporarily locked due to too many attempts. Please try again in 15 minutes."
            );
            break;
          }

          default:
            // Generic error
            setError("Unable to process request. Please try again later.");

            // Log for debugging
            logError("Password reset error", {
              email,
              status,
              err
            });
        }
        // Increment attempts
        setAttempts((prev) => prev + 1);

        // Lock after 5 attempts
        if (attempts >= 4) {
          const lockTime = new Date();
          lockTime.setMinutes(lockTime.getMinutes() + 15);
          setLockedUntil(lockTime);
          setError("Too many failed attempts. Account locked for 15 minutes.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, isEmailValid, cooldown, lockedUntil, attempts, showToast]
  );

  // Handle resend
  const handleResend = useCallback(async () => {
    if (cooldown > 0) {
      showToast(`Please wait ${cooldown} seconds`, "warning");
      return;
    }
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  }, [cooldown, handleSubmit, showToast]);

  // Handle retry after cooldown
  const handleRetry = useCallback(() => {
    setError(null);
    setCooldown(0);
  }, []);

  // Format cooldown time
  const formatCooldown = (seconds: number): string => {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? "s" : ""}${
      remainingSeconds > 0 ? ` ${remainingSeconds} seconds` : ""
    }`;
  };

  // Format lock time
  const formatLockTime = (date: Date): string => {
    const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  // Get rate limit status
  const getRateLimitStatus = useCallback(() => {
    if (!rateLimit) return null;
    const percentRemaining = (rateLimit.remaining / rateLimit.limit) * 100;
    return {
      percentRemaining,
      color:
        percentRemaining > 50
          ? "text-green-600"
          : percentRemaining > 20
          ? "text-yellow-600"
          : "text-red-600",
    };
  }, [rateLimit]);

  const rateLimitStatus = getRateLimitStatus();

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Check your email
              </h2>
              <p className="text-gray-600 mt-2">
                We've sent password reset instructions to
              </p>
              <p className="text-lg font-medium text-gray-900 mt-1">{email}</p>
            </div>

            {/* Email Tips */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Didn't receive the email?
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Check your spam or junk folder
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Make sure {email} is the correct address
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Wait a few minutes for delivery
                </li>
              </ul>
            </div>

            {/* Resend Option */}
            {cooldown > 0 ? (
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">
                  Resend available in {formatCooldown(cooldown)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${((60 - cooldown) / 60) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full mb-4 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span>Resend Email</span>
              </button>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 text-center"
              >
                Return to Login
              </Link>

              <Link
                to="/contact-support"
                className="block w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 text-center"
              >
                Need help? Contact Support
              </Link>
            </div>

            {/* Rate Limit Info */}
            {rateLimit && rateLimitStatus && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Rate limit
                  </span>
                  <span className={rateLimitStatus.color}>
                    {rateLimit.remaining}/{rateLimit.limit} attempts remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                  <div
                    className={`h-1 rounded-full ${rateLimitStatus.color.replace(
                      "text-",
                      "bg-"
                    )}`}
                    style={{ width: `${rateLimitStatus.percentRemaining}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back to Login */}
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Key className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-gray-600 mt-2">
              Enter your email address and we'll send you instructions to reset
              your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{error}</p>
                  {cooldown > 0 && (
                    <button
                      onClick={handleRetry}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Try again now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Locked Warning */}
          {lockedUntil && lockedUntil > new Date() && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Account Temporarily Locked
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Too many failed attempts. Please try again in{" "}
                    {formatLockTime(lockedUntil)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setTouched(true)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    emailError ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="you@example.com"
                  disabled={
                    isLoading ||
                    (lockedUntil !== null && lockedUntil > new Date())
                  }
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {isEmailValid && touched && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {emailError && (
                <p id="email-error" className="mt-2 text-xs text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isLoading ||
                !isEmailValid ||
                cooldown > 0 ||
                (lockedUntil !== null && lockedUntil > new Date())
              }
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Sending Instructions...</span>
                </div>
              ) : cooldown > 0 ? (
                <span>Wait {formatCooldown(cooldown)}</span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Send Reset Instructions</span>
                </span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium text-gray-700">
                  Security Notice
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  For your security, we'll only send reset instructions if an
                  account exists with this email address. This helps protect
                  your privacy.
                </p>
              </div>
            </div>
          </div>

          {/* Rate Limit Info */}
          {rateLimit && rateLimitStatus && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Rate limit
                </span>
                <span className={rateLimitStatus.color}>
                  {rateLimit.remaining}/{rateLimit.limit} attempts remaining
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div
                  className={`h-1 rounded-full ${rateLimitStatus.color.replace(
                    "text-",
                    "bg-"
                  )}`}
                  style={{ width: `${rateLimitStatus.percentRemaining}%` }}
                />
              </div>
            </div>
          )}

          {/* Need Help */}
          <div className="mt-6 text-center">
            <Link
              to="/contact-support"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              Need help? Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
