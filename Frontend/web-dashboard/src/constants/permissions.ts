export const PERMISSIONS = {
  PREMIUM: 'premium',
  ADMIN: 'admin',
  USER: 'user',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];