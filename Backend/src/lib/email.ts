import nodemailer from "nodemailer";
import { logger } from "./logger";
import { redis } from "./redis";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

// Add this temporarily
console.log("Gmail user:", process.env.GMAIL_USER);
console.log("App password length:", process.env.GMAIL_APP_PASSWORD?.length);

const FROM = `${process.env.EMAIL_FROM_NAME || "EmailSuite"} <${process.env.GMAIL_USER}>`;

export interface Attachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject?: string;
  template?: "welcome" | "email-verification" | "password-reset" | "campaign-summary" | "suspicious-login" | "account-locked";
  data?: Record<string, unknown>;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  tags?: Record<string, string>;
}

type TemplateResult = { subject: string; html: string; text: string };
type TemplateData = Record<string, unknown>;

const templates: Record<string, (data: TemplateData) => TemplateResult> = {
  "account-locked": (d) => ({
    subject: "🔒 Account Locked - EmailSuite",
    html: `<body style="font-family:sans-serif;padding:20px;"><h2>Account Locked</h2><p>Locked for <b>${d.lockDuration}m</b>. Reset here: <a href="${d.resetUrl}">${d.resetUrl}</a></p></body>`,
    text: `Account Locked for ${d.lockDuration}m. Reset: ${d.resetUrl}`,
  }),
  "email-verification": (d) => ({
    subject: "Verify Your Email",
    html: `<p>Click to verify: <a href="${d.verificationUrl}">Verify</a></p>`,
    text: `Verify: ${d.verificationUrl}`,
  }),
  "password-reset": (d) => ({
    subject: "Reset Your Password",
    html: `<p>Click to reset your password: <a href="${d.resetUrl}">Reset Password</a></p>`,
    text: `Reset your password: ${d.resetUrl}`,
  }),
  "welcome": (d) => ({
    subject: "Welcome to EmailSuite!",
    html: `<p>Welcome, ${d.name}! We're glad to have you.</p>`,
    text: `Welcome, ${d.name}! We're glad to have you.`,
  }),
  "suspicious-login": (d) => ({
    subject: "⚠️ Suspicious Login Detected",
    html: `<p>A login was detected from ${d.location} at ${d.time}. If this wasn't you, reset your password immediately.</p>`,
    text: `Suspicious login from ${d.location} at ${d.time}.`,
  }),
  "campaign-summary": (d) => ({
    subject: "Your Campaign Summary",
    html: `<p>Campaign <b>${d.campaignName}</b> summary: ${d.sent} sent, ${d.opened} opened, ${d.clicked} clicked.</p>`,
    text: `Campaign ${d.campaignName}: ${d.sent} sent, ${d.opened} opened, ${d.clicked} clicked.`,
  }),
};

export class EmailService {
  async sendEmail(opt: EmailOptions): Promise<nodemailer.SentMessageInfo> {
    try {
      let { subject, html, text, to } = opt;

      if (opt.template) {
        const templateFn = templates[opt.template];
        if (templateFn) {
          const rendered = templateFn(opt.data || {});
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
        }
      }

      const info = await transporter.sendMail({
        from: FROM,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject: subject || "Notification",
        html: html || "",
        text: text || "",
        attachments: opt.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          path: a.path,
          contentType: a.contentType,
        })),
      });

      if (info.messageId) {
        await redis.setex(
          `email:${info.messageId}`,
          86400,
          JSON.stringify({ to, sentAt: new Date() })
        );
      }

      logger.info("Email sent", { messageId: info.messageId, to });
      return info;
    } catch (e) {
      logger.error("Email Failed", { error: e, to: opt.to });
      throw e;
    }
  }

  async sendBulk(emails: EmailOptions[], batchSize = 10): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = await Promise.allSettled(
        emails.slice(i, i + batchSize).map((e) => this.sendEmail(e))
      );
      batch.forEach((r) =>
        r.status === "fulfilled" ? results.sent++ : results.failed++
      );
    }
    return results;
  }
}

export const emailService = new EmailService();
export const sendEmail = (opt: EmailOptions) => emailService.sendEmail(opt);