import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config";
import { logger } from "../monitoring/logger";

export class EmailService {
  private transporter: nodemailer.Transporter;
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    // Fixed: createTransport instead of createTransporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // For Gmail, you might need to use OAuth2
      // See: https://nodemailer.com/smtp/oauth2/
    });

    this.prisma = new PrismaClient();
    this.redis = new Redis(config.redis.url);
  }

  // ... rest of the methods remain exactly the same ...
  
  async sendTrackedEmail(options: {
    to: string;
    subject: string;
    html: string;
    userId: string;
    trackingEnabled?: boolean;
  }) {
    const trackingId = this.generateTrackingId();

    // Add tracking pixel and rewrite links if tracking is enabled
    let finalHtml = options.html;
    if (options.trackingEnabled !== false) {
      finalHtml = this.injectTrackingPixel(finalHtml, trackingId);
      finalHtml = this.rewriteLinksForTracking(finalHtml, trackingId);
    }

    const mailOptions = {
      from: this.getFromAddress(options.userId),
      to: options.to,
      subject: options.subject,
      html: finalHtml,
      headers: {
        "X-EmailSuite-Tracking-ID": trackingId,
        "X-EmailSuite-User-ID": options.userId,
      },
    };

    try {
      // Store email in database for tracking
      const trackedEmail = await this.prisma.trackedEmail.create({
        data: {
          trackingId,
          userId: options.userId,
          recipient: options.to,
          subject: options.subject,
          messageId: `msg_${trackingId}`,
        },
      });

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Update with actual message ID from email service
      await this.prisma.trackedEmail.update({
        where: { id: trackedEmail.id },
        data: { messageId: result.messageId },
      });

      logger.info("Email sent successfully", {
        trackingId,
        recipient: options.to,
        messageId: result.messageId,
      });

      return {
        success: true,
        trackingId,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result), // For testing
      };
    } catch (error) {
      logger.error("Failed to send email", {
        trackingId,
        recipient: options.to,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sendCampaignEmail(
    campaign: any,
    recipient: string,
    personalization: any = {}
  ) {
    const trackingId = `campaign_${campaign.id}_${recipient}_${Date.now()}`;

    // Personalize email content
    let html = campaign.body;
    Object.keys(personalization).forEach((key) => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, "g"), personalization[key]);
    });

    // Add tracking
    html = this.injectTrackingPixel(html, trackingId);
    html = this.rewriteLinksForTracking(html, trackingId);

    const mailOptions = {
      from: this.getFromAddress(campaign.userId),
      to: recipient,
      subject: campaign.subject,
      html: html,
      headers: {
        "X-EmailSuite-Campaign-ID": campaign.id,
        "X-EmailSuite-Tracking-ID": trackingId,
      },
    };

    try {
      // Store in database
      await this.prisma.trackedEmail.create({
        data: {
          trackingId,
          userId: campaign.userId,
          recipient: recipient,
          subject: campaign.subject,
          messageId: `campaign_${campaign.id}_${recipient}`,
        },
      });

      const result = await this.transporter.sendMail(mailOptions);

      logger.info("Campaign email sent", {
        campaignId: campaign.id,
        recipient,
        trackingId,
      });

      return { success: true, trackingId, messageId: result.messageId };
    } catch (error) {
      logger.error("Failed to send campaign email", {
        campaignId: campaign.id,
        recipient,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  async sendNotificationEmail(userId: string, type: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const template = this.getNotificationTemplate(type, data);

    const mailOptions = {
      from: "notifications@emailsuite.com",
      to: user.email,
      subject: template.subject,
      html: template.html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info("Notification email sent", { userId, type });
    } catch (error) {
      logger.error("Failed to send notification email", {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private generateTrackingId(): string {
    return `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private injectTrackingPixel(html: string, trackingId: string): string {
    const trackingPixel = `
      <img 
        src="${
          process.env.API_URL || "http://localhost:3001"
        }/api/track/pixel/${trackingId}" 
        alt="" 
        style="display:none; width:1px; height:1px;" 
      />
    `;

    // Insert before closing body tag, or at the end if no body tag
    if (html.includes("</body>")) {
      return html.replace("</body>", `${trackingPixel}</body>`);
    } else {
      return html + trackingPixel;
    }
  }

  private rewriteLinksForTracking(html: string, trackingId: string): string {
    // Match all anchor tags with href attributes
    const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>/g;

    return html.replace(linkRegex, (match, href) => {
      // Don't track unsubscribe links or internal links
      if (this.shouldSkipTracking(href)) {
        return match;
      }

      const trackedHref = `${
        process.env.API_URL || "http://localhost:3001"
      }/api/track/click/${trackingId}?url=${encodeURIComponent(href)}`;
      return match.replace(`href="${href}"`, `href="${trackedHref}"`);
    });
  }

  private shouldSkipTracking(url: string): boolean {
    const skipDomains = [
      "unsubscribe",
      "mail.google.com",
      "emailsuite.com",
      "localhost",
    ];

    return skipDomains.some((domain) => url.includes(domain));
  }

  private getFromAddress(userId: string): string {
    // In production, this would use the user's verified email address
    return `noreply@emailsuite.com`;
  }

  private getNotificationTemplate(type: string, data: any) {
    const templates: any = {
      payment_failed: {
        subject: "Payment Failed - Email Suite",
        html: `
          <h2>Payment Failed</h2>
          <p>We were unable to process your payment for Email Suite.</p>
          <p>Please update your payment method to avoid service interruption.</p>
          <a href="${process.env.APP_URL}/billing">Update Payment Method</a>
        `,
      },
      plan_downgraded: {
        subject: "Plan Downgraded - Email Suite",
        html: `
          <h2>Plan Downgraded</h2>
          <p>Your Email Suite plan has been downgraded to Free due to payment issues.</p>
          <p>Some features may no longer be available.</p>
          <a href="${process.env.APP_URL}/upgrade">Upgrade Plan</a>
        `,
      },
      high_engagement: {
        subject: "High Engagement Alert - Email Suite",
        html: `
          <h2>High Engagement Detected!</h2>
          <p>Your email to ${data.recipient} has been opened ${data.openCount} times.</p>
          <p>This indicates strong interest from the recipient.</p>
          <a href="${process.env.APP_URL}/analytics/${data.trackingId}">View Analytics</a>
        `,
      },
    };

    return (
      templates[type] || {
        subject: "Notification from Email Suite",
        html: "<p>You have a new notification from Email Suite.</p>",
      }
    );
  }

  // Verify SMTP connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info("SMTP connection verified");
      return true;
    } catch (error) {
      logger.error("SMTP connection failed", { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}


// // import nodemailer from "nodemailer";
// // import { PrismaClient } from "@prisma/client";
// // import { Redis } from "ioredis";
// // import { config } from "../config";
// // import { logger } from "../monitoring/logger";

// export class OEmailService {
//   private transporter: nodemailer.Transporter;
//   private prisma: PrismaClient;
//   private redis: Redis;

//   constructor() {
//     // Create transporter based on environment
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST || "smtp.gmail.com",
//       port: parseInt(process.env.SMTP_PORT || "587"),
//       secure: false,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASSWORD,
//       },
//       // For Gmail, you might need to use OAuth2
//       // See: https://nodemailer.com/smtp/oauth2/
//     });

//     this.prisma = new PrismaClient({
//   datasourceUrl: process.env.DATABASE_URL,
// })
//     this.redis = new Redis(config.redis.url);
//   }

//   async sendTrackedEmail(options: {
//     to: string;
//     subject: string;
//     html: string;
//     userId: string;
//     trackingEnabled?: boolean;
//   }) {
//     const trackingId = this.generateTrackingId();

//     // Add tracking pixel and rewrite links if tracking is enabled
//     let finalHtml = options.html;
//     if (options.trackingEnabled !== false) {
//       finalHtml = this.injectTrackingPixel(finalHtml, trackingId);
//       finalHtml = this.rewriteLinksForTracking(finalHtml, trackingId);
//     }

//     const mailOptions = {
//       from: this.getFromAddress(options.userId),
//       to: options.to,
//       subject: options.subject,
//       html: finalHtml,
//       headers: {
//         "X-EmailSuite-Tracking-ID": trackingId,
//         "X-EmailSuite-User-ID": options.userId,
//       },
//     };

//     try {
//       // Store email in database for tracking
//       const trackedEmail = await this.prisma.trackedEmail.create({
//         data: {
//           trackingId,
//           userId: options.userId,
//           recipient: options.to,
//           subject: options.subject,
//           messageId: `msg_${trackingId}`,
//         },
//       });

//       // Send email
//       const result = await this.transporter.sendMail(mailOptions);

//       // Update with actual message ID from email service
//       await this.prisma.trackedEmail.update({
//         where: { id: trackedEmail.id },
//         data: { messageId: result.messageId },
//       });

//       logger.info("Email sent successfully", {
//         trackingId,
//         recipient: options.to,
//         messageId: result.messageId,
//       });

//       return {
//         success: true,
//         trackingId,
//         messageId: result.messageId,
//         previewUrl: nodemailer.getTestMessageUrl(result), // For testing
//       };
//     } catch (error) {
//       logger.error("Failed to send email", {
//         trackingId,
//         recipient: options.to,
//         error: error.message,
//       });

//       throw new Error(`Failed to send email: ${error.message}`);
//     }
//   }

//   async sendCampaignEmail(
//     campaign: any,
//     recipient: string,
//     personalization: any = {}
//   ) {
//     const trackingId = `campaign_${campaign.id}_${recipient}_${Date.now()}`;

//     // Personalize email content
//     let html = campaign.body;
//     Object.keys(personalization).forEach((key) => {
//       const placeholder = `{{${key}}}`;
//       html = html.replace(new RegExp(placeholder, "g"), personalization[key]);
//     });

//     // Add tracking
//     html = this.injectTrackingPixel(html, trackingId);
//     html = this.rewriteLinksForTracking(html, trackingId);

//     const mailOptions = {
//       from: this.getFromAddress(campaign.userId),
//       to: recipient,
//       subject: campaign.subject,
//       html: html,
//       headers: {
//         "X-EmailSuite-Campaign-ID": campaign.id,
//         "X-EmailSuite-Tracking-ID": trackingId,
//       },
//     };

//     try {
//       // Store in database
//       await this.prisma.trackedEmail.create({
//         data: {
//           trackingId,
//           userId: campaign.userId,
//           recipient: recipient,
//           subject: campaign.subject,
//           messageId: `campaign_${campaign.id}_${recipient}`,
//         },
//       });

//       const result = await this.transporter.sendMail(mailOptions);

//       logger.info("Campaign email sent", {
//         campaignId: campaign.id,
//         recipient,
//         trackingId,
//       });

//       return { success: true, trackingId, messageId: result.messageId };
//     } catch (error) {
//       logger.error("Failed to send campaign email", {
//         campaignId: campaign.id,
//         recipient,
//         error: error.message,
//       });

//       throw error;
//     }
//   }

//   async sendNotificationEmail(userId: string, type: string, data: any) {
//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       throw new Error("User not found");
//     }

//     const template = this.getNotificationTemplate(type, data);

//     const mailOptions = {
//       from: "notifications@emailsuite.com",
//       to: user.email,
//       subject: template.subject,
//       html: template.html,
//     };

//     try {
//       await this.transporter.sendMail(mailOptions);
//       logger.info("Notification email sent", { userId, type });
//     } catch (error) {
//       logger.error("Failed to send notification email", {
//         userId,
//         type,
//         error: error.message,
//       });
//     }
//   }

//   private generateTrackingId(): string {
//     return `trk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   }

//   private injectTrackingPixel(html: string, trackingId: string): string {
//     const trackingPixel = `
//       <img 
//         src="${
//           process.env.API_URL || "http://localhost:3001"
//         }/api/track/pixel/${trackingId}" 
//         alt="" 
//         style="display:none; width:1px; height:1px;" 
//       />
//     `;

//     // Insert before closing body tag, or at the end if no body tag
//     if (html.includes("</body>")) {
//       return html.replace("</body>", `${trackingPixel}</body>`);
//     } else {
//       return html + trackingPixel;
//     }
//   }

//   private rewriteLinksForTracking(html: string, trackingId: string): string {
//     // Match all anchor tags with href attributes
//     const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>/g;

//     return html.replace(linkRegex, (match, href) => {
//       // Don't track unsubscribe links or internal links
//       if (this.shouldSkipTracking(href)) {
//         return match;
//       }

//       const trackedHref = `${
//         process.env.API_URL || "http://localhost:3001"
//       }/api/track/click/${trackingId}?url=${encodeURIComponent(href)}`;
//       return match.replace(`href="${href}"`, `href="${trackedHref}"`);
//     });
//   }

//   private shouldSkipTracking(url: string): boolean {
//     const skipDomains = [
//       "unsubscribe",
//       "mail.google.com",
//       "emailsuite.com",
//       "localhost",
//     ];

//     return skipDomains.some((domain) => url.includes(domain));
//   }

//   private getFromAddress(userId: string): string {
//     // In production, this would use the user's verified email address
//     return `noreply@emailsuite.com`;
//   }

//   private getNotificationTemplate(type: string, data: any) {
//     const templates: any = {
//       payment_failed: {
//         subject: "Payment Failed - Email Suite",
//         html: `
//           <h2>Payment Failed</h2>
//           <p>We were unable to process your payment for Email Suite.</p>
//           <p>Please update your payment method to avoid service interruption.</p>
//           <a href="${process.env.APP_URL}/billing">Update Payment Method</a>
//         `,
//       },
//       plan_downgraded: {
//         subject: "Plan Downgraded - Email Suite",
//         html: `
//           <h2>Plan Downgraded</h2>
//           <p>Your Email Suite plan has been downgraded to Free due to payment issues.</p>
//           <p>Some features may no longer be available.</p>
//           <a href="${process.env.APP_URL}/upgrade">Upgrade Plan</a>
//         `,
//       },
//       high_engagement: {
//         subject: "High Engagement Alert - Email Suite",
//         html: `
//           <h2>High Engagement Detected!</h2>
//           <p>Your email to ${data.recipient} has been opened ${data.openCount} times.</p>
//           <p>This indicates strong interest from the recipient.</p>
//           <a href="${process.env.APP_URL}/analytics/${data.trackingId}">View Analytics</a>
//         `,
//       },
//     };

//     return (
//       templates[type] || {
//         subject: "Notification from Email Suite",
//         html: "<p>You have a new notification from Email Suite.</p>",
//       }
//     );
//   }

//   // Verify SMTP connection
//   async verifyConnection() {
//     try {
//       await this.transporter.verify();
//       logger.info("SMTP connection verified");
//       return true;
//     } catch (error) {
//       logger.error("SMTP connection failed", { error: error.message });
//       return false;
//     }
//   }
// }
