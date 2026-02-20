// src/utils/validators.ts

/**
 * Email validation
 * Validates email format using regex
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Password validation
 * Checks if password meets minimum requirements
 */
export const validatePassword = (password: string): boolean => {
  if (!password) return false;
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Name validation
 * Checks if name is valid (letters, spaces, hyphens, apostrophes only)
 */
export const validateName = (name: string): boolean => {
  if (!name) return false;
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return name.length >= 2 && name.length <= 50 && nameRegex.test(name);
};

/**
 * Phone number validation
 * Validates international phone numbers
 * Fixed: Removed unnecessary escape character before '+'
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  // Fixed: Removed the backslash before + since it's not needed in character class
  const phoneRegex = /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * URL validation
 * Checks if string is a valid URL
 */
export const validateUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Required field validation
 */
export const validateRequired = (value: string): boolean => {
  return value?.trim()?.length > 0 || false;
};

/**
 * Range validation for numbers
 */
export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Length validation for strings
 */
export const validateLength = (value: string, min: number, max: number): boolean => {
  if (!value) return false;
  const length = value.trim().length;
  return length >= min && length <= max;
};