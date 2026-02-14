import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config";

export class AdvancedTrackingService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
    this.redis = new Redis(config.redis.url);
  }

  async recordEmailOpen(trackingId: string, metadata: any) {
    const trackedEmail = await this.prisma.trackedEmail.findUnique({
      where: { trackingId },
      include: { user: true },
    });

    if (!trackedEmail) return;

    // Record the open
    const emailOpen = await this.prisma.emailOpen.create({
      data: {
        trackedEmailId: trackedEmail.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: this.getDeviceType(metadata.userAgent),
        location: await this.getLocationFromIP(metadata.ipAddress),
      },
    });

    // Check for open spikes
    await this.checkForOpenSpike(trackedEmail);

    // Check for email revival
    await this.checkForEmailRevival(trackedEmail);

    // Send real-time notification
    await this.redis.publish(
      "tracking_events",
      JSON.stringify({
        userId: trackedEmail.userId,
        type: "email_opened",
        data: {
          trackingId,
          recipient: trackedEmail.recipient,
          subject: trackedEmail.subject,
          openId: emailOpen.id,
        },
      })
    );

    return emailOpen;
  }

  private async checkForOpenSpike(trackedEmail: any) {
    // Check if this email has been opened multiple times recently
    const recentOpens = await this.prisma.emailOpen.count({
      where: {
        trackedEmailId: trackedEmail.id,
        timestamp: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
        },
      },
    });

    if (recentOpens >= 3) {
      // Open spike detected
      await this.redis.publish(
        "tracking_events",
        JSON.stringify({
          userId: trackedEmail.userId,
          type: "open_spike",
          data: {
            trackingId: trackedEmail.trackingId,
            recipient: trackedEmail.recipient,
            openCount: recentOpens,
            subject: trackedEmail.subject,
          },
        })
      );
    }
  }

  private async checkForEmailRevival(trackedEmail: any) {
    const firstOpen = await this.prisma.emailOpen.findFirst({
      where: { trackedEmailId: trackedEmail.id },
      orderBy: { timestamp: "asc" },
    });

    if (firstOpen) {
      const daysSinceFirstOpen = Math.floor(
        (new Date().getTime() - firstOpen.timestamp.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysSinceFirstOpen >= 7) {
        // Email revival detected
        await this.redis.publish(
          "tracking_events",
          JSON.stringify({
            userId: trackedEmail.userId,
            type: "email_revival",
            data: {
              trackingId: trackedEmail.trackingId,
              recipient: trackedEmail.recipient,
              days: daysSinceFirstOpen,
              subject: trackedEmail.subject,
            },
          })
        );
      }
    }
  }

  async getAdvancedAnalytics(trackingId: string) {
    const trackedEmail = await this.prisma.trackedEmail.findUnique({
      where: { trackingId },
      include: {
        opens: {
          orderBy: { timestamp: "asc" },
        },
        clicks: {
          orderBy: { timestamp: "asc" },
        },
        user: true,
      },
    });

    if (!trackedEmail) throw new Error("Tracked email not found");

    const analytics = {
      basic: {
        totalOpens: trackedEmail.opens.length,
        totalClicks: trackedEmail.clicks.length,
        uniqueOpens: new Set(trackedEmail.opens.map((open) => open.ipAddress))
          .size,
      },
      timing: {
        firstOpen: trackedEmail.opens[0]?.timestamp || null,
        lastOpen:
          trackedEmail.opens[trackedEmail.opens.length - 1]?.timestamp || null,
        averageTimeToOpen: this.calculateAverageTimeToOpen(trackedEmail.opens),
        bestOpeningHours: this.calculateBestOpeningHours(trackedEmail.opens),
      },
      engagement: {
        openRate: this.calculateOpenRate(trackedEmail.opens),
        clickThroughRate: this.calculateCTR(
          trackedEmail.clicks,
          trackedEmail.opens
        ),
        clickToOpenRate: this.calculateClickToOpenRate(
          trackedEmail.clicks,
          trackedEmail.opens
        ),
        engagementScore: this.calculateEngagementScore(trackedEmail),
      },
      devices: this.getDeviceBreakdown(trackedEmail.opens),
      locations: this.getLocationBreakdown(trackedEmail.opens),
    };

    return analytics;
  }

  private calculateAverageTimeToOpen(opens: any[]): number {
    if (opens.length < 2) return 0;

    const timeDiffs = opens
      .slice(1)
      .map(
        (open, index) =>
          open.timestamp.getTime() - opens[index].timestamp.getTime()
      );

    return timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  }

  private calculateBestOpeningHours(opens: any[]): any[] {
    const hours = opens.reduce((acc, open) => {
      const hour = open.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(hours)
      .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  private calculateEngagementScore(trackedEmail: any): number {
    const opens = trackedEmail.opens.length;
    const clicks = trackedEmail.clicks.length;
    const uniqueOpens = new Set(
      trackedEmail.opens.map((open) => open.ipAddress)
    ).size;
    const timeToOpen = this.calculateAverageTimeToOpen(trackedEmail.opens);

    let score = 0;
    score += opens * 10; // Base points for opens
    score += clicks * 15; // Extra points for clicks
    score += uniqueOpens * 5; // Bonus for unique opens
    score += timeToOpen > 0 ? Math.max(0, 50 - timeToOpen / 1000 / 60) : 0; // Faster opens = better

    return Math.min(100, Math.max(0, score));
  }

  private getDeviceBreakdown(opens: any[]): any {
    return opens.reduce((acc, open) => {
      const device = open.deviceType || "unknown";
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});
  }

  private getLocationBreakdown(opens: any[]): any {
    return opens.reduce((acc, open) => {
      const location = open.location || "unknown";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
  }

  private getDeviceType(userAgent: string): string {
    if (!userAgent) return "unknown";
    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet/i.test(userAgent)) return "tablet";
    return "desktop";
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    // Simplified - in production, use MaxMind or similar service
    if (!ipAddress || ipAddress === "127.0.0.1") return "Local";
    return "Unknown";
  }

  private calculateOpenRate(opens: any[]): number {
    return opens.length > 0 ? 100 : 0;
  }

  private calculateCTR(clicks: any[], opens: any[]): number {
    if (opens.length === 0) return 0;
    return (clicks.length / opens.length) * 100;
  }

  private calculateClickToOpenRate(clicks: any[], opens: any[]): number {
    const uniqueClicks = new Set(clicks.map((click) => click.ipAddress)).size;
    const uniqueOpens = new Set(opens.map((open) => open.ipAddress)).size;

    if (uniqueOpens === 0) return 0;
    return (uniqueClicks / uniqueOpens) * 100;
  }
}
