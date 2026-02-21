export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateInput = (data: Record<string, any>): ValidationResult => {
  const errors: string[] = [];

  // Email validation
  if (data.email !== undefined) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  // Password validation
  if (data.password !== undefined) {
    if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(data.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(data.password)) {
      errors.push('Password must contain at least one number');
    }
  }

  // Name validation
  if (data.name !== undefined) {
    if (data.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    if (data.name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(data.name)) {
      errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};