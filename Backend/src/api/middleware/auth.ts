import nodemailer from 'nodemailer';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { AuthRequest, JwtPayload } from '../../types/auth';

// ─── Email Service ────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Add this temporarily
console.log("Gmail user:", process.env.GMAIL_USER);
console.log("App password length:", process.env.GMAIL_APP_PASSWORD?.length);

const FROM = `${process.env.EMAIL_FROM_NAME || 'EmailSuite'} <${process.env.GMAIL_USER}>`;

export interface Attachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject?: string;
  template?: 'welcome' | 'email-verification' | 'password-reset' | 'campaign-summary' | 'suspicious-login' | 'account-locked';
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  tags?: Record<string, string>;
}

export class EmailService {
  private templates: Record<string, (data: any) => { subject: string; html: string; text: string }> = {
    'account-locked': (d) => ({
      subject: '🔒 Account Locked - EmailSuite',
      html: `<body style="font-family:sans-serif;padding:20px;"><h2>Account Locked</h2><p>Locked for <b>${d.lockDuration}m</b>. Reset here: <a href="${d.resetUrl}">${d.resetUrl}</a></p></body>`,
      text: `Account Locked for ${d.lockDuration}m. Reset: ${d.resetUrl}`
    }),
    'email-verification': (d) => ({
      subject: 'Verify Your Email',
      html: `<p>Click to verify: <a href="${d.verificationUrl}">Verify</a></p>`,
      text: `Verify: ${d.verificationUrl}`
    }),
    // Add other templates here...
  };

  async sendEmail(opt: EmailOptions) {
    try {
      let { subject, html, text, to } = opt;

      if (opt.template) {
        const templateFn = this.templates[opt.template];
        if (templateFn) {
          const rendered = templateFn(opt.data || {});
          [subject, html, text] = [rendered.subject, rendered.html, rendered.text];
        }
      }

      const info = await transporter.sendMail({
        from: FROM,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject || 'Notification',
        html: html || '',
        text: text || '',
        attachments: opt.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          path: a.path,
          contentType: a.contentType,
        })),
      });

      // Cache sent email info in Redis
      const emailId = info.messageId;
      if (emailId) await redis.setex(`email:${emailId}`, 86400, JSON.stringify({ to, sentAt: new Date() }));

      logger.info('Email sent', { messageId: emailId, to });
      return info;
    } catch (e) {
      logger.error('Email Failed', { error: e, to: opt.to });
      throw e;
    }
  }

  async sendBulk(emails: EmailOptions[], batchSize = 10) {
    const results = { sent: 0, failed: 0 };
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = await Promise.allSettled(emails.slice(i, i + batchSize).map(e => this.sendEmail(e)));
      batch.forEach(r => r.status === 'fulfilled' ? results.sent++ : results.failed++);
    }
    return results;
  }
}

export const emailService = new EmailService();
export const sendEmail = (opt: EmailOptions) => emailService.sendEmail(opt);

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