import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { sendEmail } from '../../lib/email';
import { metrics } from '../../lib/metrics';
import { auditLog } from '../../lib/auditLog';

export class AuthController {
    constructor() {
    // Bind all methods to maintain 'this' context
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.setupMFA = this.setupMFA.bind(this);
    this.verifyMFA = this.verifyMFA.bind(this);
    this.disableMFA = this.disableMFA.bind(this);
  }
  // --- PUBLIC ---

  async register(req: Request, res: Response) {
    return this.exec(res, 'register', async () => {
      const { email, password, name, ...rest } = req.body;
      const hashed = await bcrypt.hash(password, 12);
      const vToken = crypto.randomBytes(32).toString('hex');
      const user = await prisma.user.create({
        data: { email, name, password: hashed, verificationToken: vToken, ...rest }
      });
      await sendEmail({
        to: email,
        template: 'email-verification',
        data: { verificationUrl: `${process.env.APP_URL}/verify?token=${vToken}` }
      });
      return { status: 201, data: { user: this.sanitize(user), requiresVerification: true } };
    });
  }

  async login(req: Request, res: Response) {
    return this.exec(res, 'login', async () => {
      const { email, password, rememberMe } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (user?.lockedUntil && user.lockedUntil > new Date()) return { status: 423, code: 'LOCKED' };

      if (!user || !(await bcrypt.compare(password, user.password))) {
        if (user) await this.handleFailedLogin(user.id, req);
        return { status: 401, code: 'INVALID_CREDENTIALS' };
      }

      if (!user.emailVerified) return { status: 403, code: 'UNVERIFIED' };

      if (user.mfaEnabled) {
        const mfaToken = jwt.sign({ userId: user.id, type: 'mfa_gate' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        return { status: 200, data: { mfaRequired: true, mfaToken } };
      }

      await auditLog.log(user.id, 'LOGIN_SUCCESS', { ip: req.ip });
      return { status: 200, data: await this.createSession(user.id, req, !!rememberMe) };
    });
  }

  async refresh(req: Request, res: Response) {
    return this.exec(res, 'refresh', async () => {
      const { refreshToken } = req.body;
      if (!refreshToken) return { status: 400, code: 'MISSING_TOKEN' };

      let payload: any;
      try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
      } catch {
        return { status: 401, code: 'INVALID_REFRESH_TOKEN' };
      }

      const sessionKey = `session:${payload.sessionId}`;
      const sessionData = await redis.get(sessionKey);
      if (!sessionData) return { status: 401, code: 'SESSION_EXPIRED' };

      const session = JSON.parse(sessionData);
      if (session.refreshToken !== refreshToken) return { status: 401, code: 'INVALID_SESSION' };

      const newAccess = jwt.sign(
        { userId: payload.userId, sessionId: payload.sessionId },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );
      session.accessToken = newAccess;
      await redis.setex(sessionKey, session.rememberMe ? 2592000 : 604800, JSON.stringify(session));

      return { status: 200, data: { accessToken: newAccess } };
    });
  }

  async verifyEmail(req: Request, res: Response) {
    return this.exec(res, 'verify-email', async () => {
      const { token } = req.body;
      if (!token) return { status: 400, code: 'MISSING_TOKEN' };

      const user = await prisma.user.findFirst({ where: { verificationToken: token } });
      if (!user) return { status: 400, code: 'INVALID_TOKEN' };

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verificationToken: null }
      });

      await auditLog.log(user.id, 'EMAIL_VERIFIED', { ip: req.ip });
      return { status: 200, data: { message: 'Email verified successfully' } };
    });
  }

  async forgotPassword(req: Request, res: Response) {
    return this.exec(res, 'forgot-password', async () => {
      const { email } = req.body;
      // Always return success to prevent user enumeration
      const generic = { status: 200, data: { message: 'If that email exists, a reset link has been sent' } };
      if (!email) return generic;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return generic;

      const resetToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpires: new Date(Date.now() + 3600000) }
      });

      await sendEmail({
        to: email,
        template: 'password-reset',
        data: { name: user.name, resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}` }
      });

      return generic;
    });
  }

  async resetPassword(req: Request, res: Response) {
    return this.exec(res, 'reset-password', async () => {
      const { token, password } = req.body;
      if (!token || !password) return { status: 400, code: 'MISSING_FIELDS' };

      const user = await prisma.user.findFirst({
        where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } }
      });
      if (!user) return { status: 400, code: 'INVALID_OR_EXPIRED_TOKEN' };

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(password, 12),
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      });

      await auditLog.log(user.id, 'PASSWORD_RESET', { ip: req.ip });
      return { status: 200, data: { message: 'Password reset successfully' } };
    });
  }

  async logout(req: Request, res: Response) {
    return this.exec(res, 'logout', async () => {
      const user = (req as any).user;
      const session = (req as any).session;
      if (session?.sessionId) await redis.del(`session:${session.sessionId}`);
      await auditLog.log(user.id, 'LOGOUT', { ip: req.ip });
      return { status: 200, data: { message: 'Logged out successfully' } };
    });
  }

  async changePassword(req: Request, res: Response) {
    return this.exec(res, 'change-password', async () => {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return { status: 400, code: 'MISSING_FIELDS' };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return { status: 401, code: 'INVALID_CREDENTIALS' };
      }

      await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 12) } });
      await auditLog.log(userId, 'PASSWORD_CHANGED', { ip: req.ip });
      return { status: 200, data: { message: 'Password changed successfully' } };
    });
  }

  async me(req: Request, res: Response) {
    return this.exec(res, 'me', async () => {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, plan: true, emailVerified: true, mfaEnabled: true, createdAt: true }
      });
      if (!user) return { status: 404, code: 'USER_NOT_FOUND' };
      return { status: 200, data: { user } };
    });
  }

  // --- MFA ---


async setupMFA(req: Request, res: Response) {
  return this.exec(res, 'mfa-setup', async () => {
    const userId = (req as any).user.id;
    const secret = generateSecret();
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

    await redis.setex(`mfa:setup:${userId}`, 600, JSON.stringify({ secret, backupCodes }));

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const otpauth = generateURI({
      label: user?.email ?? userId,
      issuer: 'EmailSuite',
      secret
    });

    return { status: 200, data: { secret, otpauth, backupCodes } };
  });
}

async verifyMFA(req: Request, res: Response) {
  return this.exec(res, 'mfa-verify', async () => {
    const { code, mfaToken, isSetup } = req.body;
    const { userId } = jwt.verify(mfaToken, process.env.JWT_SECRET!) as any;

    const storageKey = isSetup ? `mfa:setup:${userId}` : null;
    const data = storageKey
      ? JSON.parse(await redis.get(storageKey) || '{}')
      : await prisma.user.findUnique({ where: { id: userId } });

    const secret = data?.mfaSecret || data?.secret;
    const result = await verify({ secret, token: code });

    if (!result.valid) {
      const backupValid = !isSetup && await this.verifyBackupCode(data, code);
      if (!backupValid) return { status: 400, code: 'INVALID_CODE' };
    }

    if (isSetup) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaSecret: secret, mfaBackupCodes: data.backupCodes }
      });
      await redis.del(storageKey!);
      await auditLog.log(userId, 'MFA_ENABLED', { ip: req.ip });
    }

    return { status: 200, data: await this.createSession(userId, req, false) };
  });
}

  async disableMFA(req: Request, res: Response) {
    return this.exec(res, 'mfa-disable', async () => {
      const userId = (req as any).user.id;
      const { password } = req.body;
      if (!password) return { status: 400, code: 'MISSING_FIELDS' };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return { status: 401, code: 'INVALID_CREDENTIALS' };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] }
      });

      await auditLog.log(userId, 'MFA_DISABLED', { ip: req.ip });
      return { status: 200, data: { message: 'MFA disabled successfully' } };
    });
  }

  // --- PRIVATE HELPERS ---

  private async createSession(userId: string, req: Request, rem: boolean) {
    const sid = crypto.randomBytes(16).toString('hex');
    const tokens = {
      access: jwt.sign({ userId, sessionId: sid }, process.env.JWT_SECRET!, { expiresIn: '15m' }),
      refresh: jwt.sign({ userId, sessionId: sid }, process.env.JWT_REFRESH_SECRET!, { expiresIn: rem ? '30d' : '7d' })
    };
    await redis.setex(`session:${sid}`, rem ? 2592000 : 604800, JSON.stringify({
      userId,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      rememberMe: rem,
      mfaVerified: false
    }));
    return { tokens, sessionId: sid };
  }

  private async exec(res: Response, metric: string, fn: () => Promise<any>) {
    try {
      const resData = await fn();
      return res.status(resData.status || 200).json({ success: true, ...resData });
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ success: false, code: 'SERVER_ERROR' });
    }
  }

  private sanitize = (u: any) => { const { password, mfaSecret, ...s } = u; return s; };

  private async verifyBackupCode(data: any, code: string): Promise<boolean> {
    if (!data?.mfaBackupCodes?.includes(code)) return false;
    await prisma.user.update({
      where: { id: data.id },
      data: { mfaBackupCodes: data.mfaBackupCodes.filter((c: string) => c !== code) }
    });
    return true;
  }

  private async handleFailedLogin(userId: string, req: Request): Promise<void> {
    try {
      const MAX_ATTEMPTS = 5;
      const LOCK_MULTIPLIER = 2;

      const redisKey = `login:attempts:${userId}`;
      const current = await redis.incr(redisKey);
      if (current === 1) await redis.expire(redisKey, 900);

      const user = await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { id: true, email: true, name: true, failedLoginAttempts: true }
      });

      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        const lockMinutes = Math.min(
          30 * Math.pow(LOCK_MULTIPLIER, Math.floor(user.failedLoginAttempts / MAX_ATTEMPTS) - 1),
          1440
        );
        const lockedUntil = new Date(Date.now() + lockMinutes * 60000);
        await prisma.user.update({ where: { id: userId }, data: { lockedUntil } });
        await redis.setex(`user:lock:${userId}`, lockMinutes * 60, JSON.stringify({ lockedUntil }));
        await sendEmail({
          to: user.email,
          template: 'account-locked',
          data: { name: user.name, lockDuration: lockMinutes, resetUrl: `${process.env.APP_URL}/reset` }
        });
        metrics.increment('auth.account_locked', { userId });
      }

      this.detectSuspiciousPatterns(userId, req, user.failedLoginAttempts);
      await auditLog.log(userId, 'LOGIN_FAILED', { ip: req.ip, attempt: user.failedLoginAttempts });
    } catch (error) {
      logger.error('handleFailedLogin error', error);
    }
  }

  private async detectSuspiciousPatterns(userId: string, req: Request, attempts: number): Promise<void> {
    try {
      const recent = await prisma.auditLog.findMany({
        where: { userId, action: 'LOGIN_FAILED', createdAt: { gt: new Date(Date.now() - 1800000) } },
        take: 10
      });
      const uniqueIPs = new Set(recent.map((a: any) => a.ipAddress)).size;
      if (uniqueIPs > 3) {
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (target) await sendEmail({
          to: target.email,
          template: 'suspicious-login',
          data: { uniqueIPs, ip: req.ip }
        });
        metrics.increment('auth.suspicious_pattern', { type: 'multi_ip' });
      }
    } catch (e) {
      logger.error('Pattern detection failed', e);
    }
  }
}


// import { Request, Response } from 'express';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import crypto from 'crypto';
// import { verify } from 'otplib';
// import { prisma } from '../../lib/prisma';
// import { redis } from '../../lib/redis';
// import { logger } from '../../lib/logger';
// import { sendEmail } from '../../lib/email';
// import { metrics } from '../../lib/metrics';
// import { auditLog } from '../../lib/auditLog';

// export class AuthController {
//   // --- PUBLIC API ---

//   async register(req: Request, res: Response) {
//     return this.exec(res, 'register', async () => {
//       const { email, password, name, ...rest } = req.body;
//       const hashed = await bcrypt.hash(password, 12);
//       const vToken = crypto.randomBytes(32).toString('hex');
//       const user = await prisma.user.create({
//         data: { email, name, password: hashed, verificationToken: vToken, ...rest }
//       });
//       await sendEmail({
//         to: email,
//         template: 'email-verification',
//         data: { verificationUrl: `${process.env.APP_URL}/verify?token=${vToken}` }
//       });
//       return { status: 201, data: { user: this.sanitize(user), requiresVerification: true } };
//     });
//   }

//   async login(req: Request, res: Response) {
//     return this.exec(res, 'login', async () => {
//       const { email, password, rememberMe } = req.body;
//       const user = await prisma.user.findUnique({ where: { email } });

//       // Check lock BEFORE password comparison to avoid unnecessary work
//       if (user?.lockedUntil && user.lockedUntil > new Date()) return { status: 423, code: 'LOCKED' };

//       if (!user || !(await bcrypt.compare(password, user.password))) {
//         if (user) await this.handleFailedLogin(user.id, req);
//         return { status: 401, code: 'INVALID_CREDENTIALS' };
//       }

//       if (!user.emailVerified) return { status: 403, code: 'UNVERIFIED' };

//       if (user.mfaEnabled) {
//         const mfaToken = jwt.sign({ userId: user.id, type: 'mfa_gate' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
//         return { status: 200, data: { mfaRequired: true, mfaToken } };
//       }

//       return { status: 200, data: await this.createSession(user.id, req, !!rememberMe) };
//     });
//   }

//   async verifyMFA(req: Request, res: Response) {
//     return this.exec(res, 'mfa-verify', async () => {
//       const { code, mfaToken, isSetup } = req.body;
//       const { userId, type } = jwt.verify(mfaToken, process.env.JWT_SECRET!) as any;

//       const storageKey = isSetup ? `mfa:setup:${userId}` : null;
//       const data = storageKey
//         ? JSON.parse(await redis.get(storageKey) || '{}')
//         : await prisma.user.findUnique({ where: { id: userId } });

//       const secret = data?.mfaSecret || data?.secret;
//       const totpValid = verify({ token: code, secret });

//       if (!totpValid) {
//         // Fixed: backup code branch now correctly continues instead of falling through
//         const backupValid = !isSetup && await this.verifyBackupCode(data, code);
//         if (!backupValid) return { status: 400, code: 'INVALID_CODE' };
//       }

//       if (isSetup) {
//         await prisma.user.update({
//           where: { id: userId },
//           data: { mfaEnabled: true, mfaSecret: secret, mfaBackupCodes: data.backupCodes }
//         });
//         await redis.del(storageKey!);
//       }

//       return { status: 200, data: await this.createSession(userId, req, false) };
//     });
//   }

//   // --- PRIVATE HELPERS ---

//   private async createSession(userId: string, req: Request, rem: boolean) {
//     const sid = crypto.randomBytes(16).toString('hex');
//     const tokens = {
//       access: jwt.sign({ userId, sessionId: sid }, process.env.JWT_SECRET!, { expiresIn: '15m' }),
//       refresh: jwt.sign({ userId, sessionId: sid }, process.env.JWT_REFRESH_SECRET!, { expiresIn: rem ? '30d' : '7d' })
//     };
//     const ttl = rem ? 2592000 : 604800;

//     // Fixed: store as accessToken/refreshToken to match authenticate() middleware expectations
//     await redis.setex(`session:${sid}`, ttl, JSON.stringify({
//       userId,
//       accessToken: tokens.access,
//       refreshToken: tokens.refresh,
//       rememberMe: rem,
//       mfaVerified: false
//     }));

//     return { tokens, sessionId: sid };
//   }

//   private async exec(res: Response, metric: string, fn: () => Promise<any>) {
//     try {
//       const resData = await fn();
//       return res.status(resData.status || 200).json({ success: true, ...resData });
//     } catch (e) {
//       logger.error(e);
//       return res.status(500).json({ success: false, code: 'SERVER_ERROR' });
//     }
//   }

//   private sanitize = (u: any) => { const { password, mfaSecret, ...s } = u; return s; };

//   private async verifyBackupCode(data: any, code: string): Promise<boolean> {
//     if (!data?.mfaBackupCodes?.includes(code)) return false;
//     // Invalidate used backup code
//     await prisma.user.update({
//       where: { id: data.id },
//       data: { mfaBackupCodes: data.mfaBackupCodes.filter((c: string) => c !== code) }
//     });
//     return true;
//   }

//   private async handleFailedLogin(userId: string, req: Request): Promise<void> {
//     try {
//       const MAX_ATTEMPTS = 5;
//       const LOCK_MULTIPLIER = 2;

//       const redisKey = `login:attempts:${userId}`;
//       const currentAttempts = await redis.incr(redisKey);
//       if (currentAttempts === 1) await redis.expire(redisKey, 900); // 15m window

//       const user = await prisma.user.update({
//         where: { id: userId },
//         data: { failedLoginAttempts: { increment: 1 } },
//         select: { id: true, email: true, name: true, failedLoginAttempts: true }
//       });

//       if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
//         const lockMinutes = Math.min(
//           30 * Math.pow(LOCK_MULTIPLIER, Math.floor(user.failedLoginAttempts / MAX_ATTEMPTS) - 1),
//           1440
//         );
//         const lockedUntil = new Date(Date.now() + lockMinutes * 60000);

//         await prisma.user.update({ where: { id: userId }, data: { lockedUntil } });
//         await redis.setex(`user:lock:${userId}`, lockMinutes * 60, JSON.stringify({ lockedUntil }));

//         await sendEmail({
//           to: user.email,
//           template: 'account-locked',
//           data: { name: user.name, lockDuration: lockMinutes, resetUrl: `${process.env.APP_URL}/reset` }
//         });

//         metrics.increment('auth.account_locked', { userId });
//       }

//       this.detectSuspiciousPatterns(userId, req, user.failedLoginAttempts);
//       await auditLog.log(userId, 'LOGIN_FAILED', { ip: req.ip, attempt: user.failedLoginAttempts });
//     } catch (error) {
//       logger.error('handleFailedLogin error', error);
//     }
//   }

//   private async detectSuspiciousPatterns(userId: string, req: Request, attempts: number): Promise<void> {
//     try {
//       const recent = await prisma.auditLog.findMany({
//         where: { userId, action: 'LOGIN_FAILED', createdAt: { gt: new Date(Date.now() - 1800000) } },
//         take: 10
//       });

//       const uniqueIPs = new Set(recent.map((a: any) => a.ipAddress)).size;
//       if (uniqueIPs > 3) {
//         // Fixed: fetch email from DB — userId is not an email address
//         const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
//         if (target) await sendEmail({
//           to: target.email,
//           template: 'suspicious-login',
//           data: { uniqueIPs, ip: req.ip }
//         });
//         metrics.increment('auth.suspicious_pattern', { type: 'multi_ip' });
//       }
//     } catch (e) {
//       logger.error('Pattern detection failed', e);
//     }
//   }
// }