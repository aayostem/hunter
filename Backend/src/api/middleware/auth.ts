import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { AuthRequest, JwtPayload } from '../../types/auth';

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, code: 'NO_TOKEN', message: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
      return;
    }

    const sessionKey = `session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session has expired' });
      return;
    }

    const session = JSON.parse(sessionData);
    if (session.accessToken !== token) {
      res.status(401).json({ success: false, code: 'INVALID_SESSION', message: 'Invalid session' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, plan: true, emailVerified: true, mfaEnabled: true }
    });

    if (!user) {
      res.status(401).json({ success: false, code: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    req.user = user;
    req.session = session;

    await redis.expire(sessionKey, session.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ success: false, code: 'AUTH_ERROR', message: 'Authentication failed' });
  }
};

export const requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.emailVerified) {
    res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Email verification required' });
    return;
  }
  next();
};

export const requireMFA = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.mfaEnabled && !req.session?.mfaVerified) {
    res.status(403).json({ success: false, code: 'MFA_REQUIRED', message: 'MFA verification required' });
    return;
  }
  next();
};

export const requirePlan = (plans: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.plan || !plans.includes(req.user.plan)) {
      res.status(403).json({ success: false, code: 'PLAN_REQUIRED', message: 'Your current plan does not support this action' });
      return;
    }
    next();
  };
};