// pages/Register.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Shield,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Chrome,
  Flame,
  Compass,
  WifiOff,
  Clock,
  Info,
  X,
  Fingerprint,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  HelpCircle
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { validateEmail } from '../utils/validators';
import { trackEvent } from '../utils/analytics';
import { logError, logInfo } from '../utils/logging';
import { encrypt, generateCSRFToken } from '../utils/security';
import useDebounce from '../utils/useDebounce';

// Types
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

interface ValidationResult {
  valid: boolean;
  message?: string;
}

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface EmailSuggestion {
  original: string;
  suggestion: string;
  domain: string;
}

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  // const { register } = useAuth();
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreeMarketing: false,
    inviteCode: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Security state
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Validation state
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<EmailSuggestion[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Very Weak',
    color: 'text-red-500',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });

  // Device info
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    browser: 'unknown',
    os: 'unknown',
  });

  // Network state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Debounced email for availability check
  const debouncedEmail = useDebounce(formData.email, 500);

  // Initialize CSRF token
  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);

  // Detect device info
  useEffect(() => {
    const ua = navigator.userAgent;
    const detectDevice = (): 'mobile' | 'tablet' | 'desktop' => {
      if (/mobile/i.test(ua)) return 'mobile';
      if (/tablet/i.test(ua)) return 'tablet';
      return 'desktop';
    };

    const detectBrowser = (): 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown' => {
      if (ua.includes('Chrome')) return 'chrome';
      if (ua.includes('Flame')) return 'firefox';
      if (ua.includes('Compass')) return 'safari';
      if (ua.includes('Edge')) return 'edge';
      return 'unknown';
    };

    const detectOS = (): 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown' => {
      if (ua.includes('Windows')) return 'windows';
      if (ua.includes('Mac')) return 'macos';
      if (ua.includes('Linux')) return 'linux';
      if (ua.includes('Android')) return 'android';
      if (ua.includes('iOS')) return 'ios';
      return 'unknown';
    };

    setDeviceInfo({
      type: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
    });
  }, []);

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Check email availability
  useEffect(() => {
    const checkEmail = async () => {
      if (!validateEmail(formData.email) || !formData.email) {
        setIsEmailAvailable(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const response = await api.get<{ available: boolean; suggestions?: EmailSuggestion[] }>(
          `/auth/check-email`,
          { params: { email: formData.email } }
        );
        setIsEmailAvailable(response.data.available);
        setEmailSuggestions(response.data.suggestions || []);
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setCheckingEmail(false);
      }
    };

    checkEmail();
  }, [debouncedEmail, formData.email]);

  // Calculate password strength
  useEffect(() => {
    const requirements = {
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    };

    const metCount = Object.values(requirements).filter(Boolean).length;
    
    let score: 0 | 1 | 2 | 3 | 4 = 0;
    let label = 'Very Weak';
    let color = 'text-red-500';

    if (metCount <= 2) {
      score = 1;
      label = 'Weak';
      color = 'text-red-500';
    } else if (metCount === 3) {
      score = 2;
      label = 'Fair';
      color = 'text-yellow-500';
    } else if (metCount === 4) {
      score = 3;
      label = 'Good';
      color = 'text-green-500';
    } else if (metCount === 5) {
      score = 4;
      label = 'Strong';
      color = 'text-green-600';
    }

    setPasswordStrength({ score, label, color, requirements });
  }, [formData.password]);

  // Validation functions
  const validateNameField = (name: string): ValidationResult => {
    if (!name) return { valid: false, message: 'Name is required' };
    if (name.length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
    if (name.length > 50) return { valid: false, message: 'Name must be less than 50 characters' };
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return { valid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }
    return { valid: true };
  };

  const validateEmailField = (email: string): ValidationResult => {
    if (!email) return { valid: false, message: 'Email is required' };
    if (!validateEmail(email)) return { valid: false, message: 'Please enter a valid email address' };
    if (isEmailAvailable === false) return { valid: false, message: 'Email is already registered' };
    return { valid: true };
  };

  const validatePasswordField = (password: string): ValidationResult => {
    if (!password) return { valid: false, message: 'Password is required' };
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  };

  const validateConfirmPassword = (confirm: string): ValidationResult => {
    if (!confirm) return { valid: false, message: 'Please confirm your password' };
    if (confirm !== formData.password) return { valid: false, message: 'Passwords do not match' };
    return { valid: true };
  };

  // Field errors
  const nameValidation = touched.name ? validateNameField(formData.name) : { valid: true };
  const emailValidation = touched.email ? validateEmailField(formData.email) : { valid: true };
  const passwordValidation = touched.password ? validatePasswordField(formData.password) : { valid: true };
  const confirmValidation = touched.confirmPassword ? validateConfirmPassword(formData.confirmPassword) : { valid: true };

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
  }, []);

  // Handle blur for validation
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  }, []);

  // Handle email suggestion click
  const handleEmailSuggestion = useCallback((suggestion: string) => {
    setFormData(prev => ({ ...prev, email: suggestion }));
    setTouched(prev => ({ ...prev, email: true }));
    setEmailSuggestions([]);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);

    // Validate all fields
    const nameResult = validateNameField(formData.name);
    if (!nameResult.valid) {
      setError(nameResult.message || 'Invalid name');
      nameInputRef.current?.focus();
      return;
    }

    const emailResult = validateEmailField(formData.email);
    if (!emailResult.valid) {
      setError(emailResult.message || 'Invalid email');
      return;
    }

    const passwordResult = validatePasswordField(formData.password);
    if (!passwordResult.valid) {
      setError(passwordResult.message || 'Invalid password');
      return;
    }

    const confirmResult = validateConfirmPassword(formData.confirmPassword);
    if (!confirmResult.valid) {
      setError(confirmResult.message || 'Passwords do not match');
      return;
    }

    if (!formData.agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    // Check rate limiting
    if (cooldown > 0) {
      setError(`Too many attempts. Please wait ${cooldown} seconds.`);
      return;
    }

    // Check network
    if (!isOnline) {
      setError('No internet connection. Please check your network.');
      return;
    }

    setIsLoading(true);

    try {
      // Encrypt sensitive data
      const encryptedPassword = await encrypt(formData.password);

      // Track attempt
      trackEvent('register_attempt', { 
        email: formData.email,
        device: deviceInfo.type,
        browser: deviceInfo.browser,
      });

      // Call API with CSRF token
      const response = await api.post<RegisterResponse>('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: encryptedPassword,
        inviteCode: formData.inviteCode || undefined,
        agreeTerms: formData.agreeTerms,
        agreeMarketing: formData.agreeMarketing,
        deviceInfo,
        csrfToken,
        timestamp: new Date().toISOString(),
      });

      // Track success
      trackEvent('register_success', { 
        email: formData.email,
        userId: response.data.user.id,
      });

      // Log successful registration
      logInfo('User registered', {
        userId: response.data.user.id,
        device: deviceInfo.type,
        browser: deviceInfo.browser,
      });

      // Show success message
      setSuccess(true);
      showToast('Account created successfully! Please check your email to verify.', 'success');

      // Store session if provided
      if (response.data.session) {
        sessionStorage.setItem('pending_verification', response.data.session.id);
      }

      // Redirect to verification page after delay
      setTimeout(() => {
        navigate('/verify-email', { 
          state: { email: formData.email },
          replace: true 
        });
      }, 3000);

    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Handle different error types
      const status = err.response?.status;
      const data = err.response?.data;

      // Track failure
      trackEvent('register_failure', { 
        email: formData.email,
        reason: data?.code || 'unknown',
        status,
      });

      // Increment attempts
      setAttempts(prev => prev + 1);

      // Set cooldown after 3 attempts
      if (attempts >= 2) {
        setCooldown(60);
      }

      switch (status) {
        case 429: { // Added curly braces
          const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '60');
          setCooldown(retryAfter);
          setError(`Too many attempts. Please wait ${retryAfter} seconds.`);
          break;
        }

        case 409: // Conflict - email exists
          setError('An account with this email already exists. Please sign in instead.');
          break;

        case 400: // Validation error
          setError(data?.message || 'Invalid registration data');
          break;

        case 422: // Business logic error
          setError(data?.message || 'Unable to create account');
          break;

        default:
          setError('Registration failed. Please try again later.');
          
          // Log error for debugging
          logError('Registration error', {
            email: formData.email,
            status,
            error: err.message,
            stack: err.stack,
          });
      }

      // Focus first field on error
      nameInputRef.current?.focus();

    } finally {
      setIsLoading(false);
    }
  }, [formData, attempts, cooldown, isOnline, deviceInfo, csrfToken, validateConfirmPassword, validateEmailField, navigate, showToast]);

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created Successfully!</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification email to <strong>{formData.email}</strong>. 
              Please check your inbox and verify your email address.
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Next Steps:
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Click the verification link in the email
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Complete your profile setup
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2" />
                  Start creating your first campaign
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full px-4 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700"
              >
                Go to Login
              </Link>
              
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Edit registration details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Register View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Network Status */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2 text-yellow-700">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">You are offline. Please check your connection.</span>
          </div>
        )}

        {/* Cooldown Warning */}
        {cooldown > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center space-x-2 text-orange-700">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Too many attempts. Please wait {cooldown} seconds.</span>
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Start sending better emails today</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* CSRF Token */}
            <input type="hidden" name="csrfToken" value={csrfToken} />

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    !nameValidation.valid && touched.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                  disabled={isLoading || cooldown > 0}
                  autoComplete="name"
                  autoFocus
                />
                {nameValidation.valid && touched.name && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {!nameValidation.valid && touched.name && (
                <p className="mt-1 text-xs text-red-600">{nameValidation.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    !emailValidation.valid && touched.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="you@example.com"
                  disabled={isLoading || cooldown > 0}
                  autoComplete="email"
                />
                {checkingEmail && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {!checkingEmail && isEmailAvailable === true && touched.email && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {!checkingEmail && isEmailAvailable === false && touched.email && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
              </div>
              {!emailValidation.valid && touched.email && (
                <p className="mt-1 text-xs text-red-600">{emailValidation.message}</p>
              )}

              {/* Email Suggestions */}
              {emailSuggestions.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-2 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Did you mean:
                  </p>
                  <div className="space-y-1">
                    {emailSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.suggestion}
                        onClick={() => handleEmailSuggestion(suggestion.suggestion)}
                        className="block w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded"
                      >
                        {suggestion.suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    !passwordValidation.valid && touched.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading || cooldown > 0}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Password strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-all ${
                          level <= passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score === 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">Requirements:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'length', label: '8+ characters' },
                    { key: 'uppercase', label: 'Uppercase letter' },
                    { key: 'lowercase', label: 'Lowercase letter' },
                    { key: 'number', label: 'Number' },
                    { key: 'special', label: 'Special character' },
                  ].map((req) => (
                    <div key={req.key} className="flex items-center space-x-1 text-xs">
                      {passwordStrength.requirements[req.key as keyof typeof passwordStrength.requirements] ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-300" />
                      )}
                      <span className={passwordStrength.requirements[req.key as keyof typeof passwordStrength.requirements] 
                        ? 'text-green-600' 
                        : 'text-gray-500'
                      }>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!passwordValidation.valid && touched.password && (
                <p className="mt-1 text-xs text-red-600">{passwordValidation.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    !confirmValidation.valid && touched.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading || cooldown > 0}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!confirmValidation.valid && touched.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{confirmValidation.message}</p>
              )}
            </div>

            {/* Invite Code (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter invite code"
                disabled={isLoading || cooldown > 0}
              />
            </div>

            {/* Terms Agreement */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  required
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-blue-600 hover:text-blue-700">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700">
                    Privacy Policy
                  </Link>
                  <span className="text-red-500 ml-1">*</span>
                </span>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  I'd like to receive product updates and marketing emails. 
                  You can unsubscribe at any time.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.agreeTerms || cooldown > 0 || !isOnline}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : cooldown > 0 ? (
                <span>Wait {cooldown}s</span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                  <span>Create Account</span>
                </span>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
              tabIndex={isLoading ? -1 : 0}
            >
              Sign in
            </Link>
          </p>

          {/* Device Info */}
          <div className="mt-4 flex items-center justify-center space-x-3 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              {deviceInfo.type === 'mobile' ? (
                <Smartphone className="w-3 h-3" />
              ) : deviceInfo.type === 'tablet' ? (
                <Tablet className="w-3 h-3" />
              ) : (
                <Laptop className="w-3 h-3" />
              )}
              <span>{deviceInfo.type}</span>
            </div>
            <div className="flex items-center space-x-1">
              {deviceInfo.browser === 'chrome' ? (
                <Chrome className="w-3 h-3" />
              ) : deviceInfo.browser === 'firefox' ? (
                <Flame className="w-3 h-3" />
              ) : deviceInfo.browser === 'safari' ? (
                <Compass className="w-3 h-3" />
              ) : (
                <Globe className="w-3 h-3" />
              )}
              <span>{deviceInfo.browser}</span>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-6 flex justify-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center">
            <Shield className="w-3 h-3 mr-1" />
            Secure Registration
          </span>
          <span className="flex items-center">
            <Lock className="w-3 h-3 mr-1" />
            Encrypted Data
          </span>
          <span className="flex items-center">
            <Fingerprint className="w-3 h-3 mr-1" />
            Privacy Protected
          </span>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <Zap className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Lightning Fast</p>
          </div>
          <div>
            <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Advanced Analytics</p>
          </div>
          <div>
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Unlimited Contacts</p>
          </div>
        </div>

        {/* Help Link */}
        <div className="mt-6 text-center">
          <Link
            to="/contact-support"
            className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600"
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            Need help? Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;