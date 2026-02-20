import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';

// --- Types ---
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'professional' | 'enterprise';
  emailVerified: boolean;
  createdAt: string;
  mfaEnabled?: boolean;
}

interface MFAFactor {
  id: string;
  status: 'verified' | 'unverified';
  factor_type: 'totp';
  friendly_name?: string;
}

interface MFAVerifyResponse {
  session: {
    id: string;
    expiresAt: string;
  };
}

interface MFASetupResponse {
  secret: string;
  qrCode: string;
  factorId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null; // Added token to interface
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; sessionId?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  verifyMFA: (code: string) => Promise<MFAVerifyResponse>;
  setupMFA: () => Promise<MFASetupResponse>;
  verifyMFASetup: (factorId: string, code: string) => Promise<void>;
  disableMFA: () => Promise<void>;
  getMFAFactors: () => Promise<{ totp: MFAFactor[] }>;
}

// --- Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  }
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // State to hold the JWT
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingMFA, setPendingMFA] = useState<{ factorId: string; challengeId: string } | null>(null);

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, params);
    }
  }, []);

  const mapSupabaseUser = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    let mfaEnabled = false;
    try {
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      mfaEnabled = mfaData?.totp?.some(f => f.status === 'verified') ?? false;
    } catch {
      mfaEnabled = false;
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      name: profile?.name || supabaseUser.user_metadata?.name || 'User',
      avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
      plan: profile?.plan || 'free',
      emailVerified: !!supabaseUser.email_confirmed_at,
      createdAt: supabaseUser.created_at,
      mfaEnabled,
    };
  }, []);

  // --- Auth State Observer ---
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        const mappedUser = await mapSupabaseUser(session.user);
        setUser(mappedUser);
        setToken(session.access_token); // Set token on init
      }
      setIsLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session) {
          const mappedUser = await mapSupabaseUser(session.user);
          setUser(mappedUser);
          setToken(session.access_token); // Set token on change
        } else {
          setUser(null);
          setToken(null);
        }

        if (event === 'SIGNED_IN') trackEvent('login', { method: 'supabase' });
        if (event === 'SIGNED_OUT') setToken(null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mapSupabaseUser, trackEvent]);

  // --- Methods ---
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const factor = mfaData?.totp?.find(f => f.status === 'verified');

      if (factor && data.user) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) throw challengeError;

        setPendingMFA({ factorId: factor.id, challengeId: challengeData.id });
        return { mfaRequired: true, sessionId: challengeData.id };
      }

      trackEvent('login', { method: 'email' });
      return { mfaRequired: false };
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, [trackEvent]);

  const verifyMFA = useCallback(async (code: string): Promise<MFAVerifyResponse> => {
    if (!pendingMFA) throw new Error('No pending MFA challenge');
    const { factorId, challengeId } = pendingMFA;

    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (verifyError) throw verifyError;

    setPendingMFA(null);
    const { data: { session } } = await supabase.auth.getSession();
    
    setToken(session?.access_token || null);

    return {
      session: {
        id: session?.access_token || '',
        expiresAt: new Date(Date.now() + (session?.expires_in || 86400) * 1000).toISOString(),
      }
    };
  }, [pendingMFA]);

  const setupMFA = useCallback(async (): Promise<MFASetupResponse> => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
    if (error) throw error;
    return {
      secret: data.totp?.secret || '',
      qrCode: data.totp?.qr_code || '',
      factorId: data.id
    };
  }, []);

  const verifyMFASetup = useCallback(async (factorId: string, code: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;

    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
    if (verifyError) throw verifyError;

    if (user) setUser({ ...user, mfaEnabled: true });
  }, [user]);

  const disableMFA = useCallback(async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp) {
      for (const factor of factors.totp) {
        if (factor.status === 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    }
    if (user) setUser({ ...user, mfaEnabled: false });
  }, [user]);

  const getMFAFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return { totp: data?.totp ?? [] };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }, []);

  const loginWithGithub = useCallback(async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { name }, emailRedirectTo: `${window.location.origin}/auth/verify` } 
    });
    if (signUpError) throw signUpError;
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, name, email, plan: 'free' }]);
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` });
  }, []);

  const resetPassword = useCallback(async (password: string) => {
    await supabase.auth.updateUser({ password });
  }, []);

  const updateUser = useCallback(async (userData: Partial<User>) => {
    if (!user) throw new Error('No user');
    await supabase.from('profiles').update({ ...userData }).eq('id', user.id);
    setUser(prev => prev ? { ...prev, ...userData } : null);
  }, [user]);

  const value: AuthContextType = {
    user, 
    token, // Provided to the application
    isAuthenticated: !!user, 
    isLoading, 
    error,
    login, 
    logout, 
    register, 
    loginWithGoogle, 
    loginWithGithub,
    forgotPassword, 
    resetPassword, 
    updateUser,
    verifyMFA, 
    setupMFA, 
    verifyMFASetup, 
    disableMFA, 
    getMFAFactors,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};