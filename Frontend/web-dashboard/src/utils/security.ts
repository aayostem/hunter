// src/utils/security.ts

/**
 * Encrypt sensitive data
 * In production, use a proper encryption library
 */
export const encrypt = async (data: string): Promise<string> => {
  if (!data) return '';
  // This is a simple base64 encoding for demo
  // In production, use proper encryption
  try {
    return btoa(data);
  } catch {
    return '';
  }
};

/**
 * Decrypt data
 */
export const decrypt = async (encryptedData: string): Promise<string> => {
  if (!encryptedData) return '';
  // This is a simple base64 decoding for demo
  // In production, use proper decryption
  try {
    return atob(encryptedData);
  } catch {
    return '';
  }
};

/**
 * Generate a random CSRF token
 */
export const generateCSRFToken = (): string => {
  if (typeof window === 'undefined' || !window.crypto) {
    // Fallback for environments without crypto
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash a string using SHA-256
 */
export const hashString = async (str: string): Promise<string> => {
  if (!str) return '';
  
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback for environments without crypto.subtle
    return str.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0).toString(16);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return str.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0).toString(16);
  }
};

/**
 * Generate a secure random password
 */
export const generateSecurePassword = (length: number = 16): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
  
  // Fallback for environments without crypto
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};