import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, Lock, User, Eye, EyeOff, AlertCircle, 
  CheckCircle, Loader, Shield, WifiOff, Clock 
} from 'lucide-react';
import { useRegister } from '../hooks/useRegister';
import { api } from '../lib/api';
import { encrypt } from '../utils/security';

// Types for form state and event handlers
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  inviteCode: string;
}
// 1. Updated Interface
// We "Omit" the standard onChange so our custom one can take its place
interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  icon: React.ReactNode;
  name: keyof RegisterFormData;
  value: string; 
  onChange: React.Dispatch<React.SetStateAction<RegisterFormData>>;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) return setStatus(s => ({ ...s, error }));
    if (security.cooldown > 0) return;

    setStatus(s => ({ ...s, loading: true, error: null }));
    
    try {
      // Logic: Hash/Encrypt before sending over the wire
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4 text-white">
            <Shield />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
          {!navigator.onLine && (
            <div className="mt-2 text-amber-600 flex items-center justify-center gap-2 text-sm">
              <WifiOff size={16}/> Offline Mode
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {status.error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={18}/> {status.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField 
              icon={<User size={18}/>} label="Full Name" name="name" 
              value={formData.name} onChange={setFormData} placeholder="John Doe" 
            />
            
            <InputField 
              icon={<Mail size={18}/>} label="Email" name="email" type="email"
              value={formData.email} onChange={setFormData} placeholder="john@example.com" 
            />

            <div className="relative">
              <InputField 
                icon={<Lock size={18}/>} label="Password" name="password" 
                type={showPass ? "text" : "password"} value={formData.password} 
                onChange={setFormData} placeholder="••••••••" 
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {formData.password && (
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[1, 2, 3, 4].map(i => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-colors ${
                      i <= passwordStrength.score ? 'bg-green-500' : 'bg-gray-100'
                    }`} 
                  />
                ))}
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.agreeTerms} 
                onChange={e => setFormData(prev => ({...prev, agreeTerms: e.target.checked}))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={status.loading || security.cooldown > 0}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {status.loading ? (
                <Loader className="animate-spin" />
              ) : security.cooldown > 0 ? (
                <><Clock size={18}/> {security.cooldown}s</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// 2. Updated InputField Component
const InputField: React.FC<InputFieldProps> = ({ 
  label, icon, name, value, onChange, ...props 
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-3 text-gray-400">{icon}</span>
      <input 
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        name={name}
        value={value} // Now strictly a string
        onChange={e => onChange(prev => ({ ...prev, [name]: e.target.value }))}
        {...props}
      />
    </div>
  </div>
);

const SuccessView: React.FC<{ email: string }> = ({ email }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl text-center">
      <div className="inline-flex p-4 bg-green-100 rounded-full text-green-600 mb-6">
        <CheckCircle size={40} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
      <p className="text-gray-500 mt-2">
        We've sent a verification link to <span className="font-semibold text-gray-700">{email}</span>.
      </p>
      <Link 
        to="/login" 
        className="mt-8 block w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
      >
        Proceed to Login
      </Link>
    </div>
  </div>
);