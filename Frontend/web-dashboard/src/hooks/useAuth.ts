import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react'; // Use type-only imp 

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'professional' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Simulate API call - replace with actual API
        setTimeout(() => {
          setUser({
            id: '1',
            email: 'john@emailsuite.com',
            name: 'John Doe',
            plan: 'professional'
          });
          setIsLoading(false);
        }, 1000);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // try {
      // Simulate API call - replace with actual API
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (email === 'demo@emailsuite.com' && password === 'password123') {
            localStorage.setItem('auth_token', 'demo-token');
            setUser({
              id: '1',
              email: 'demo@emailsuite.com',
              name: 'Demo User',
              plan: 'professional'
            });
            resolve();
          } else {
            reject(new Error('Invalid credentials'));
          }
        }, 1000);
      });
    // } catch (error) {
    //   throw error;
    // }
  };

  const logout = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    // try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('auth_token', 'new-token');
      setUser({
        id: '2',
        email,
        name,
        plan: 'free'
      });
    // } catch (error) {
    //   throw error;
    // }
  };

const forgotPassword = async (email: string) => {
  // Validate email
  if (!email || !email.includes('@')) {
    throw new Error('Please provide a valid email address');
  }

  try {
    // Store email in localStorage for potential recovery flow
    localStorage.setItem('reset_email', email);

    // In a real app, you would make an API call here
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send reset email');
    }

    // Log for debugging (remove in production)
    console.log(`Password reset email sent to: ${email}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    // Clear the stored email on error
    localStorage.removeItem('reset_email');
    
    // Re-throw the error for the component to handle
    throw error;
  }
};

const resetPassword = async (token: string, password: string) => {
  // Validate inputs
  if (!token) {
    throw new Error('Reset token is required');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    throw new Error('Password must contain uppercase, lowercase, and numbers');
  }

//   try {
    // In a real app, you would make an API call here
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }

    // Clear any stored reset data
    localStorage.removeItem('reset_email');
    
    // Log for debugging (remove in production)
    console.log('Password reset successful with token:', token.substring(0, 8) + '...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
//   } catch (error) {
//     // Re-throw the error for the component to handle
//     throw error;
//   }
};

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};