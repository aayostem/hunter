import { PrismaClient } from "@prisma/client";

export class TrackingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
  }

  async recordEmailOpen(trackingId: string, metadata: any) {
    try {
      // Find the tracked email
      const trackedEmail = await this.prisma.trackedEmail.findUnique({
        where: { trackingId },
      });

      if (!trackedEmail) {
        console.warn(`No tracked email found for trackingId: ${trackingId}`);
        return;
      }

      // Record the open event
      await this.prisma.emailOpen.create({
        data: {
          trackedEmailId: trackedEmail.id,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceType: this.getDeviceType(metadata.userAgent),
          location: await this.getLocationFromIP(metadata.ipAddress),
        },
      });

      // Trigger real-time notifications
      await this.triggerOpenNotification(trackedEmail.userId, trackedEmail);

      console.log(`Email opened: ${trackingId}`);
    } catch (error) {
      console.error("Error recording email open:", error);
      throw error;
    }
  }

  async recordLinkClick(trackingId: string, url: string, metadata: any) {
    try {
      const trackedEmail = await this.prisma.trackedEmail.findUnique({
        where: { trackingId },
      });

      if (!trackedEmail) {
        console.warn(`No tracked email found for trackingId: ${trackingId}`);
        return;
      }

      // Record the click event
      await this.prisma.linkClick.create({
        data: {
          trackedEmailId: trackedEmail.id,
          url: url,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });

      // Trigger click notification
      await this.triggerClickNotification(
        trackedEmail.userId,
        trackedEmail,
        url
      );

      console.log(`Link clicked: ${url} for trackingId: ${trackingId}`);
    } catch (error) {
      console.error("Error recording link click:", error);
      throw error;
    }
  }

  async getAnalytics(trackingId: string) {
    const trackedEmail = await this.prisma.trackedEmail.findUnique({
      where: { trackingId },
      include: {
        opens: {
          orderBy: { timestamp: "desc" },
        },
        clicks: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!trackedEmail) {
      throw new Error("Tracked email not found");
    }

    return {
      trackingId: trackedEmail.trackingId,
      recipient: trackedEmail.recipient,
      subject: trackedEmail.subject,
      totalOpens: trackedEmail.opens.length,
      totalClicks: trackedEmail.clicks.length,
      firstOpen: trackedEmail.opens[0]?.timestamp || null,
      lastOpen:
        trackedEmail.opens[trackedEmail.opens.length - 1]?.timestamp || null,
      opens: trackedEmail.opens,
      clicks: trackedEmail.clicks,
      openRate: this.calculateOpenRate(trackedEmail.opens),
      clickRate: this.calculateClickRate(
        trackedEmail.clicks,
        trackedEmail.opens
      ),
    };
  }

  private calculateOpenRate(opens: any[]): number {
    // For now, return basic rate. Later implement more sophisticated calculation
    return opens.length > 0 ? 100 : 0;
  }

  private calculateClickRate(clicks: any[], opens: any[]): number {
    if (opens.length === 0) return 0;
    return (clicks.length / opens.length) * 100;
  }

  private getDeviceType(userAgent: string): string {
    if (!userAgent) return "unknown";

    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet/i.test(userAgent)) return "tablet";
    return "desktop";
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    // Simplified - in production, use a geoIP service
    if (!ipAddress || ipAddress === "127.0.0.1") return "Local";
    return "Unknown";
  }

  private async triggerOpenNotification(userId: string, trackedEmail: any) {
    // Implement real-time notification logic
    console.log(`Notification: Email opened to ${trackedEmail.recipient}`);
  }

  private async triggerClickNotification(
    userId: string,
    trackedEmail: any,
    url: string
  ) {
    // Implement real-time notification logic
    console.log(
      `Notification: Link clicked in email to ${trackedEmail.recipient}`
    );
  }
}
