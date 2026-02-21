import { Request } from 'express';
import { User } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
  rememberMe?: boolean;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  id: string;
  userId: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: Date;
  device?: {
    type: string;
    browser: string;
    os: string;
  };
    mfaVerified?: boolean;
}

export interface AuthRequest extends Request {
  user?: Partial<User>;
  session?: SessionData;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: Partial<User>;
    session: {
      id: string;
      expiresAt: Date;
    };
    tokens: TokenResponse;
  };
  code?: string;
  message?: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  company?: string;
  timezone?: string;
}

export interface LoginBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  factorId: string;
  backupCodes: string[];
}