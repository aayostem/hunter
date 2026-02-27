import { Resend } from 'resend';
import { logger } from './logger';
import { redis } from './redis';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.EMAIL_FROM_NAME || 'EmailSuite'} <onboarding@resend.dev>`;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  data?: Record<string, unknown>;
  html?: string;
  text?: string;
  attachments?: Attachment[];
}

type TemplateResult = { subject: string; html: string; text: string };
type TemplateData = Record<string, unknown>;

// ─── Templates ────────────────────────────────────────────────────────────────

const templates: Record<string, (data: TemplateData) => TemplateResult> = {
  'account-locked': (d) => ({
    subject: '🔒 Account Locked - EmailSuite',
    html: `<body style="font-family:sans-serif;padding:20px;"><h2>Account Locked</h2><p>Locked for <b>${d.lockDuration}m</b>. Reset here: <a href="${d.resetUrl}">${d.resetUrl}</a></p></body>`,
    text: `Account Locked for ${d.lockDuration}m. Reset: ${d.resetUrl}`,
  }),
  'email-verification': (d) => ({
    subject: 'Verify Your Email - EmailSuite',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Verify your email</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${d.verificationUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">If you didn't create an account, ignore this email.</p>
      </div>
    `,
    text: `Verify your email: ${d.verificationUrl}`,
  }),
  'password-reset': (d) => ({
    subject: 'Reset Your Password - EmailSuite',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Reset your password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${d.resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">This link expires in 1 hour.</p>
      </div>
    `,
    text: `Reset your password: ${d.resetUrl}`,
  }),
  'welcome': (d) => ({
    subject: 'Welcome to EmailSuite!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Welcome, ${d.name}!</h2>
        <p>We're glad to have you on EmailSuite. Start tracking your emails today.</p>
        <a href="${process.env.APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          Go to Dashboard
        </a>
      </div>
    `,
    text: `Welcome, ${d.name}! We're glad to have you.`,
  }),
  'suspicious-login': (d) => ({
    subject: '⚠️ Suspicious Login Detected - EmailSuite',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#dc2626;">Suspicious Login Detected</h2>
        <p>A login was detected from <b>${d.location}</b> at <b>${d.time}</b>.</p>
        <p>If this wasn't you, reset your password immediately.</p>
        <a href="${d.resetUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
      </div>
    `,
    text: `Suspicious login from ${d.location} at ${d.time}.`,
  }),
  'campaign-summary': (d) => ({
    subject: 'Your Campaign Summary - EmailSuite',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Campaign Summary</h2>
        <p>Campaign <b>${d.campaignName}</b> results:</p>
        <ul>
          <li>Sent: ${d.sent}</li>
          <li>Opened: ${d.opened}</li>
          <li>Clicked: ${d.clicked}</li>
        </ul>
        <a href="${process.env.APP_URL}/analytics" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          View Full Analytics
        </a>
      </div>
    `,
    text: `Campaign ${d.campaignName}: ${d.sent} sent, ${d.opened} opened, ${d.clicked} clicked.`,
  }),
};

// ─── Core Send ────────────────────────────────────────────────────────────────

export class EmailService {
  async sendEmail(opt: EmailOptions): Promise<string> {
    try {
      let { subject, html, text } = opt;
      const to = Array.isArray(opt.to) ? opt.to.join(', ') : opt.to;

      if (opt.template) {
        const templateFn = templates[opt.template];
        if (templateFn) {
          const rendered = templateFn(opt.data || {});
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
        }
      }

      const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject: subject || 'Notification',
        html: html || text || '',
      });

      if (error) throw new Error(error.message);

      const messageId = data?.id || '';

      if (messageId) {
        await redis.setex(
          `email:${messageId}`,
          86400,
          JSON.stringify({ to, sentAt: new Date() })
        );
      }

      logger.info('Email sent', { messageId, to });
      return messageId;
    } catch (error) {
      logger.error('Email failed', { error, to: opt.to });
      throw error;
    }
  }

  async sendBulk(emails: EmailOptions[], batchSize = 10): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = await Promise.allSettled(
        emails.slice(i, i + batchSize).map(e => this.sendEmail(e))
      );
      batch.forEach(r => r.status === 'fulfilled' ? results.sent++ : results.failed++);
    }
    return results;
  }
}

export const emailService = new EmailService();
export const sendEmail = (opt: EmailOptions) => emailService.sendEmail(opt);