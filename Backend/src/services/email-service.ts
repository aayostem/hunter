import { Resend } from 'resend';
import { prisma } from '../lib/prisma';
import { logger } from '../monitoring/logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const API_URL = process.env.API_URL || 'http://localhost:3000';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM = `${process.env.EMAIL_FROM_NAME || 'EmailSuite'} <onboarding@resend.dev>`;

// ─── Tracking Helpers ─────────────────────────────────────────────────────────

const generateTrackingId = (): string =>
  `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const injectTrackingPixel = (html: string, trackingId: string): string => {
  const pixel = `<img src="${API_URL}/api/track/pixel/${trackingId}" alt="" style="display:none;width:1px;height:1px;"/>`;
  return html.includes('</body>') ? html.replace('</body>', `${pixel}</body>`) : html + pixel;
};

const rewriteLinksForTracking = (html: string, trackingId: string): string => {
  const skipDomains = ['unsubscribe', 'mail.google.com', 'emailsuite.com', 'localhost'];
  return html.replace(/<a[^>]+href="([^"]*)"[^>]*>/g, (match, href) => {
    if (skipDomains.some(d => href.includes(d))) return match;
    const trackedHref = `${API_URL}/api/track/click/${trackingId}?url=${encodeURIComponent(href)}`;
    return match.replace(`href="${href}"`, `href="${trackedHref}"`);
  });
};

// ─── Templates ────────────────────────────────────────────────────────────────

const notificationTemplates: Record<string, (data: any) => { subject: string; html: string }> = {
  'email-verification': (data) => ({
    subject: 'Verify your EmailSuite account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Verify your email</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${data.verificationUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">If you didn't create an account, ignore this email.</p>
      </div>
    `
  }),
  'password-reset': (data) => ({
    subject: 'Reset your EmailSuite password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb;">Reset your password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${data.resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">This link expires in 1 hour.</p>
      </div>
    `
  }),
  payment_failed: () => ({
    subject: 'Payment Failed - EmailSuite',
    html: `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment. Please update your payment method.</p>
      <a href="${APP_URL}/billing">Update Payment Method</a>
    `
  }),
  plan_downgraded: () => ({
    subject: 'Plan Downgraded - EmailSuite',
    html: `
      <h2>Plan Downgraded</h2>
      <p>Your plan has been downgraded to Free due to payment issues.</p>
      <a href="${APP_URL}/upgrade">Upgrade Plan</a>
    `
  }),
  high_engagement: (data) => ({
    subject: 'High Engagement Alert - EmailSuite',
    html: `
      <h2>High Engagement Detected!</h2>
      <p>Your email to ${data.recipient} has been opened ${data.openCount} times.</p>
      <a href="${APP_URL}/analytics/${data.trackingId}">View Analytics</a>
    `
  }),
};

// ─── Core Send ────────────────────────────────────────────────────────────────

const sendViaResend = async (to: string, subject: string, html: string): Promise<string> => {
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
  return data?.id || '';
};

// ─── Email Service Class ──────────────────────────────────────────────────────

export class EmailService {

  async sendEmail(options: { to: string; template: string; data: Record<string, string> }): Promise<void> {
    const template = notificationTemplates[options.template];
    if (!template) throw new Error(`Template '${options.template}' not found`);
    const { subject, html } = template(options.data);
    try {
      await sendViaResend(options.to, subject, html);
      logger.info('Email sent', { to: options.to, template: options.template });
    } catch (error) {
      logger.error('Email failed', { to: options.to, error });
      throw error;
    }
  }

  async sendTrackedEmail(options: {
    to: string;
    subject: string;
    html: string;
    userId: string;
    trackingEnabled?: boolean;
  }): Promise<{ success: boolean; trackingId: string; messageId: string }> {
    const trackingId = generateTrackingId();
    let html = options.html;
    if (options.trackingEnabled !== false) {
      html = injectTrackingPixel(html, trackingId);
      html = rewriteLinksForTracking(html, trackingId);
    }
    try {
      const tracked = await prisma.trackedEmail.create({
        data: { trackingId, userId: options.userId, recipient: options.to, subject: options.subject, messageId: `msg_${trackingId}` }
      });
      const messageId = await sendViaResend(options.to, options.subject, html);
      await prisma.trackedEmail.update({ where: { id: tracked.id }, data: { messageId } });
      logger.info('Tracked email sent', { trackingId, recipient: options.to });
      return { success: true, trackingId, messageId };
    } catch (error) {
      logger.error('Failed to send tracked email', { trackingId, recipient: options.to, error });
      throw error;
    }
  }

  async sendCampaignEmail(
    campaign: any,
    recipient: string,
    personalization: Record<string, string> = {}
  ): Promise<{ success: boolean; trackingId: string; messageId: string }> {
    const trackingId = `campaign_${campaign.id}_${recipient}_${Date.now()}`;
    let html = campaign.body;
    Object.keys(personalization).forEach(key => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), personalization[key]);
    });
    html = injectTrackingPixel(html, trackingId);
    html = rewriteLinksForTracking(html, trackingId);
    try {
      await prisma.trackedEmail.create({
        data: { trackingId, userId: campaign.userId, recipient, subject: campaign.subject, messageId: `campaign_${campaign.id}_${recipient}` }
      });
      const messageId = await sendViaResend(recipient, campaign.subject, html);
      logger.info('Campaign email sent', { campaignId: campaign.id, recipient, trackingId });
      return { success: true, trackingId, messageId };
    } catch (error) {
      logger.error('Failed to send campaign email', { campaignId: campaign.id, recipient, error });
      throw error;
    }
  }

  async sendNotificationEmail(userId: string, type: string, data: any = {}): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    const template = notificationTemplates[type];
    if (!template) throw new Error(`Notification template '${type}' not found`);
    const { subject, html } = template(data);
    try {
      await sendViaResend(user.email, subject, html);
      logger.info('Notification email sent', { userId, type });
    } catch (error) {
      logger.error('Failed to send notification email', { userId, type, error });
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await resend.emails.send({
        from: FROM,
        to: 'test@resend.dev',
        subject: 'Connection test',
        html: '<p>test</p>',
      });
      logger.info('Resend connection verified');
      return true;
    } catch (error) {
      logger.error('Resend connection failed', { error });
      return false;
    }
  }
}

export const emailService = new EmailService();