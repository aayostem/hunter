import { useState, useEffect, useMemo } from 'react';
import { validateEmail } from '../utils/validators';
import { generateCSRFToken } from '../utils/security';

export const useRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    inviteCode: ''
  });

  const [status, setStatus] = useState({ 
    loading: false, 
    error: null as string | null, 
    success: false 
  });

  const [security, setSecurity] = useState(() => ({ 
    csrf: generateCSRFToken(), 
    attempts: 0, 
    cooldown: 0 
  }));

  // Cooldown timer
  useEffect(() => {
    if (security.cooldown > 0) {
      const timer = setInterval(() => {
        setSecurity(s => ({ ...s, cooldown: Math.max(0, s.cooldown - 1) }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [security.cooldown]);

  const passwordStrength = useMemo(() => {
    const p = formData.password;
    const reqs = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      num: /[0-9]/.test(p),
      special: /[!@#$%^&*]/.test(p)
    };
    const score = Object.values(reqs).filter(Boolean).length;
    return { score, reqs };
  }, [formData.password]);

  // Password match is intentionally NOT checked here —
  // Register component handles it via ref to avoid race conditions
  const validate = () => {
    if (formData.name.length < 2) return "Name must be at least 2 characters";
    if (!validateEmail(formData.email)) return "Please enter a valid email";
    if (passwordStrength.score < 4) return "Password is not strong enough";
    if (!formData.agreeTerms) return "You must agree to the terms";
    return null;
  };

  return { 
    formData, 
    setFormData, 
    status, 
    setStatus, 
    security, 
    setSecurity, 
    passwordStrength, 
    validate 
  };
};