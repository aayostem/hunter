import { Resend } from 'resend';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { AuthRequest, JwtPayload } from '../../types/auth';

// ─── Email Service ────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.EMAIL_FROM_NAME || 'EmailSuite'} <${process.env.EMAIL_FROM || 'noreply@emailsuite.com'}>`;

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
    })
    // Add other templates here using the same pattern...
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

      const { data, error } = await resend.emails.send({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject: subject || 'Notification',
        html: html || '',
        text: text || '',
        attachments: opt.attachments?.map(a => ({
          filename: a.filename,
          content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
          path: a.path
        })),
        tags: opt.tags ? Object.entries(opt.tags).map(([name, value]) => ({ name, value: String(value) })) : []
      });

      if (error) throw error;
      if (data?.id) await redis.setex(`email:${data.id}`, 86400, JSON.stringify({ to, sentAt: new Date() }));
      return data;
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

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: 'NO_TOKEN', message: 'Authentication required' });
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }

    const sessionKey = `session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      return res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'Session has expired' });
    }

    const session = JSON.parse(sessionData);
    if (session.accessToken !== token) {
      return res.status(401).json({ success: false, code: 'INVALID_SESSION', message: 'Invalid session' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, plan: true, emailVerified: true, mfaEnabled: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    req.user = user;
    req.session = session;

    // Fixed: use rememberMe flag instead of expiresAt to determine session length
    await redis.expire(sessionKey, session.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ success: false, code: 'AUTH_ERROR', message: 'Authentication failed' });
  }
};

export const requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Email verification required' });
  }
  next();
};

// Fixed: removed redundant DB call — mfaEnabled is already on req.user from authenticate()
// Fixed: MFA state now checked via session.mfaVerified (server-side) instead of x-mfa-verified header (client-controlled)
export const requireMFA = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.mfaEnabled && !req.session?.mfaVerified) {
    return res.status(403).json({ success: false, code: 'MFA_REQUIRED', message: 'MFA verification required' });
  }
  next();
};

export const requirePlan = (plans: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.plan || !plans.includes(req.user.plan)) {
      // Fixed: don't expose valid plan names in the error response
      return res.status(403).json({ success: false, code: 'PLAN_REQUIRED', message: 'Your current plan does not support this action' });
    }
    next();
  };
};