import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, Lock, User, Eye, EyeOff, AlertCircle, 
  CheckCircle, Loader, Shield, WifiOff, Clock,
  BarChart2, Zap, Globe
} from 'lucide-react';
import { useRegister } from '../hooks/useRegister';
import { api } from '../lib/api';
import { encrypt } from '../utils/security';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  inviteCode: string;
}

interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  icon: React.ReactNode;
  name: keyof RegisterFormData;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<RegisterFormData>>;
  error?: string;
}

interface ApiError {
  response?: {
    status: number;
    data?: { message?: string };
  };
}

export const Register: React.FC = () => {
  const { 
    formData, setFormData, status, setStatus, 
    security, setSecurity, passwordStrength, validate 
  } = useRegister();

  const [showPass, setShowPass] = React.useState(false);

  // Ref for race-condition-free comparison
  const confirmPasswordRef = React.useRef('');
  const [confirmDisplay, setConfirmDisplay] = React.useState('');
  const [confirmTouched, setConfirmTouched] = React.useState(false);

  const passwordMismatch = confirmTouched && confirmDisplay !== formData.password;
  const passwordMatch = confirmTouched && confirmDisplay === formData.password && confirmDisplay !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Compare against ref — always synchronously current, no stale state
    if (formData.password !== confirmPasswordRef.current) {
      setConfirmTouched(true);
      return;
    }

    setConfirmTouched(false);

    const error = validate();
    if (error) return setStatus(s => ({ ...s, error }));
    if (security.cooldown > 0) return;

    setStatus(s => ({ ...s, loading: true, error: null }));
    
    try {
      const encryptedPassword = await encrypt(formData.password);
      await api.post('/auth/register', { 
        ...formData, 
        password: encryptedPassword, 
        csrfToken: security.csrf 
      });
      setStatus(s => ({ ...s, success: true, loading: false }));
    } catch (err) {
      const error = err as ApiError;
      const isRateLimited = error.response?.status === 429;
      if (isRateLimited) setSecurity(s => ({ ...s, cooldown: 60 }));
      setStatus(s => ({ 
        ...s, 
        loading: false, 
        error: isRateLimited 
          ? "Too many attempts. Wait 60s." 
          : error.response?.data?.message || "Registration failed" 
      }));
    }
  };

  if (status.success) return <SuccessView email={formData.email} />;

  return (
    <div className="min-h-screen bg-white flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 linear-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">EmailSuite</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              The smarter way to run email campaigns
            </h2>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed">
              Track opens, clicks, and conversions — all in one powerful dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <BarChart2 size={20}/>, title: 'Real-time analytics', desc: 'Live open and click tracking' },
              { icon: <Zap size={20}/>, title: 'AI-powered insights', desc: 'Optimize send times automatically' },
              { icon: <Globe size={20}/>, title: 'Global deliverability', desc: 'Reach inboxes, not spam folders' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="p-2 bg-white/15 rounded-lg shrink-0">{f.icon}</div>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-blue-200 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm">© 2025 EmailSuite. Trusted by 10,000+ marketers.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-gray-900">EmailSuite</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-1 text-gray-500">Start your free trial — no credit card required.</p>
            {!navigator.onLine && (
              <div className="mt-3 text-amber-600 flex items-center gap-2 text-sm">
                <WifiOff size={15}/> You're offline
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {status.error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                <span>{status.error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField 
                icon={<User size={16}/>} label="Full Name" name="name" 
                value={formData.name} onChange={setFormData} placeholder="John Doe" 
              />
              
              <InputField 
                icon={<Mail size={16}/>} label="Email address" name="email" type="email"
                value={formData.email} onChange={setFormData} placeholder="john@example.com" 
              />

              {/* Password */}
              <div className="relative">
                <InputField 
                  icon={<Lock size={16}/>} label="Password" name="password" 
                  type={showPass ? "text" : "password"} value={formData.password} 
                  onChange={setFormData} placeholder="Min. 8 characters" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              {/* Password strength */}
              {formData.password && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div 
                        key={i} 
                        className={`h-1 rounded-full transition-colors duration-300 ${
                          i <= passwordStrength.score 
                            ? passwordStrength.score <= 2 ? 'bg-amber-400' : 'bg-green-500' 
                            : 'bg-gray-100'
                        }`} 
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    {['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength.score]} password
                  </p>
                </div>
              )}

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={16}/>
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmDisplay}
                    onChange={e => {
                      confirmPasswordRef.current = e.target.value;
                      setConfirmDisplay(e.target.value);
                    }}
                    onBlur={() => setConfirmTouched(true)}
                    placeholder="Re-enter your password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all text-sm bg-white ${
                      passwordMismatch 
                        ? 'border-red-400 focus:ring-red-400' 
                        : passwordMatch 
                          ? 'border-green-400 focus:ring-green-400' 
                          : 'border-gray-200 focus:ring-blue-500'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordMismatch && <AlertCircle size={16} className="text-red-400"/>}
                    {passwordMatch && <CheckCircle size={16} className="text-green-500"/>}
                  </span>
                </div>
                {passwordMismatch && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group pt-1">
                <input 
                  type="checkbox" 
                  checked={formData.agreeTerms} 
                  onChange={e => setFormData(prev => ({...prev, agreeTerms: e.target.checked}))}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-sm text-gray-600 leading-snug">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-600 hover:underline font-medium">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={status.loading || security.cooldown > 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {status.loading ? (
                  <Loader className="animate-spin w-5 h-5" />
                ) : security.cooldown > 0 ? (
                  <><Clock size={16}/> Wait {security.cooldown}s</>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const InputField: React.FC<InputFieldProps> = ({ 
  label, icon, name, value, onChange, error, ...props 
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input 
        className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all text-sm bg-white ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
        }`}
        name={name}
        value={value}
        onChange={e => onChange(prev => ({ ...prev, [name]: e.target.value }))}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const SuccessView: React.FC<{ email: string }> = ({ email }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="w-full max-w-md bg-white px-8 py-12 rounded-2xl shadow-sm border border-gray-200 text-center">
      <div className="inline-flex p-4 bg-green-100 rounded-full text-green-600 mb-6">
        <CheckCircle size={36} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Check your inbox</h2>
      <p className="text-gray-500 mt-3 text-sm leading-relaxed">
        We sent a verification link to{' '}
        <span className="font-semibold text-gray-800 break-all">{email}</span>
      </p>
      <Link 
        to="/login" 
        className="mt-8 block w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
      >
        Go to Login
      </Link>
    </div>
  </div>
);