import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config";

const suggestions: {
  area: string;
  suggestion: string;
  impact: string;
  effort: string;
}[] = [];
// Mock AI service - in production, integrate with OpenAI, Google AI, etc.
export class AIInsightsService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
    this.redis = new Redis(config.redis.url);
  }

  async generateEmailInsights(userId: string, timeRange: string = "30d") {
    const userEmails = await this.getUserEmails(userId, timeRange);

    const insights = {
      performanceSummary: await this.generatePerformanceSummary(userEmails),
      bestPractices: await this.generateBestPractices(userEmails),
      engagementPatterns: await this.analyzeEngagementPatterns(userEmails),
      recipientBehavior: await this.analyzeRecipientBehavior(userEmails),
      improvementSuggestions: await this.generateImprovementSuggestions(
        userEmails
      ),
    };

    // Cache insights for 1 hour
    await this.redis.setex(
      `ai_insights:${userId}`,
      3600,
      JSON.stringify(insights)
    );

    return insights;
  }

  async generateSubjectLineSuggestions(
    originalSubject: string,
    context: any = {}
  ) {
    const suggestions = await this.callAIModel({
      prompt: `Generate 5 alternative subject lines for an email. Original: "${originalSubject}". Context: ${JSON.stringify(
        context
      )}. Return as JSON array.`,
      temperature: 0.7,
    });

    return suggestions.slice(0, 5);
  }

  async predictOptimalSendTime(userId: string, recipientEmails: string[] = []) {
    const userData = await this.getUserSendData(userId);
    const recipientData = await this.getRecipientEngagementData(
      recipientEmails
    );

    const prediction = await this.callAIModel({
      prompt: `Predict optimal send time based on user data: ${JSON.stringify(
        userData
      )} and recipient data: ${JSON.stringify(
        recipientData
      )}. Return as { optimalTime: "HH:MM", confidence: number }`,
      temperature: 0.3,
    });

    return prediction;
  }

  async generateResponseSuggestions(
    emailContent: string,
    tone: string = "professional"
  ) {
    const suggestions = await this.callAIModel({
      prompt: `Generate 3 email response suggestions for the following email. Tone: ${tone}. Email: "${emailContent}". Return as JSON array of responses.`,
      temperature: 0.6,
    });

    return suggestions;
  }

  async analyzeSentiment(emailContent: string) {
    const sentiment = await this.callAIModel({
      prompt: `Analyze the sentiment of this email content: "${emailContent}". Return as { sentiment: "positive|negative|neutral", confidence: number, keyPhrases: string[] }`,
      temperature: 0.1,
    });

    return sentiment;
  }

  private async getUserEmails(userId: string, timeRange: string) {
    const date = new Date();
    switch (timeRange) {
      case "7d":
        date.setDate(date.getDate() - 7);
        break;
      case "30d":
        date.setDate(date.getDate() - 30);
        break;
      case "90d":
        date.setDate(date.getDate() - 90);
        break;
      default:
        date.setDate(date.getDate() - 30);
    }

    return await this.prisma.trackedEmail.findMany({
      where: {
        userId,
        createdAt: { gte: date },
      },
      include: {
        opens: true,
        clicks: true,
      },
    });
  }

  private async generatePerformanceSummary(emails: any[]) {
    const totalEmails = emails.length;
    const totalOpens = emails.reduce(
      (sum, email) => sum + email.opens.length,
      0
    );
    const totalClicks = emails.reduce(
      (sum, email) => sum + email.clicks.length,
      0
    );

    const openRate = totalEmails > 0 ? (totalOpens / totalEmails) * 100 : 0;
    const clickRate = totalEmails > 0 ? (totalClicks / totalEmails) * 100 : 0;

    return {
      totalEmails,
      averageOpenRate: openRate,
      averageClickRate: clickRate,
      performanceLevel: this.getPerformanceLevel(openRate, clickRate),
      comparison: await this.getBenchmarkComparison(openRate, clickRate),
    };
  }

  private async generateBestPractices(emails: any[]) {
    const successfulEmails = emails.filter(
      (email) => email.opens.length > 0 && email.clicks.length > 0
    );

    const patterns = {
      bestSubjectLength: this.analyzeSubjectLength(successfulEmails),
      bestSendTimes: this.analyzeBestSendTimes(successfulEmails),
      effectiveCTAs: this.analyzeEffectiveCTAs(successfulEmails),
      personalizationImpact:
        this.analyzePersonalizationImpact(successfulEmails),
    };

    return patterns;
  }

  private async analyzeEngagementPatterns(emails: any[]) {
    const patterns = {
      hourlyEngagement: this.analyzeHourlyEngagement(emails),
      weeklyPatterns: this.analyzeWeeklyPatterns(emails),
      devicePreferences: this.analyzeDevicePreferences(emails),
      responseTimes: this.analyzeResponseTimes(emails),
    };

    return patterns;
  }

  private async analyzeRecipientBehavior(emails: any[]) {
    const recipientStats = new Map();

    emails.forEach((email) => {
      if (!recipientStats.has(email.recipient)) {
        recipientStats.set(email.recipient, {
          emailCount: 0,
          openCount: 0,
          clickCount: 0,
          responseCount: 0,
          averageTimeToOpen: 0,
        });
      }

      const stats = recipientStats.get(email.recipient);
      stats.emailCount++;
      stats.openCount += email.opens.length;
      stats.clickCount += email.clicks.length;
    });

    return Array.from(recipientStats.entries())
      .map(([recipient, stats]) => ({
        recipient,
        ...stats,
        openRate: (stats.openCount / stats.emailCount) * 100,
        engagementScore: this.calculateRecipientEngagementScore(stats),
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }
private async generateImprovementSuggestions(emails: any[]) {
  const issues = this.identifyCommonIssues(emails);
  const suggestions: { area: string; suggestion: string; impact: string; effort: string }[] = [];

  if (issues.lowOpenRate) {
    suggestions.push({
      area: "Subject Lines",
      suggestion: "Try more personalized and action-oriented subject lines",
      impact: "high",
      effort: "low",
    });
  }

  if (issues.lowClickRate) {
    suggestions.push({
      area: "Call-to-Action",
      suggestion: "Include clearer and more prominent CTAs in your emails",
      impact: "medium",
      effort: "low",
    });
  }

  if (issues.poorTiming) {
    suggestions.push({
      area: "Send Timing",
      suggestion: "Experiment with sending at different times of day",
      impact: "medium",
      effort: "medium",
    });
  }

  return suggestions;
}

  private async getUserSendData(userId: string) {
  return this.prisma.trackedEmail.findMany({
    where: { userId },
    select: {
      createdAt: true,
      opens: { select: { timestamp: true } },
      clicks: { select: { timestamp: true } }
    }
  });
}

private async getRecipientEngagementData(recipientEmails: string[]) {
  if (!recipientEmails.length) return [];
  return this.prisma.trackedEmail.findMany({
    where: { recipient: { in: recipientEmails } },
    select: {
      recipient: true,
      opens: { select: { timestamp: true } },
      clicks: { select: { timestamp: true } }
    }
  });
}

  // Mock AI model call - replace with actual AI service integration
  private async callAIModel(params: any): Promise<any> {
    // Simulate AI API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock responses based on prompt type
    if (params.prompt.includes("subject lines")) {
      return [
        `Re: ${params.prompt.split('Original: "')[1]?.split('"')[0]}`,
        `Quick question about ${
          params.prompt.split('Original: "')[1]?.split('"')[0]
        }`,
        `Following up on ${
          params.prompt.split('Original: "')[1]?.split('"')[0]
        }`,
        `Update: ${params.prompt.split('Original: "')[1]?.split('"')[0]}`,
        `Action required: ${
          params.prompt.split('Original: "')[1]?.split('"')[0]
        }`,
      ];
    }

    if (params.prompt.includes("optimal send time")) {
      return { optimalTime: "10:00", confidence: 0.78 };
    }

    if (params.prompt.includes("sentiment")) {
      return {
        sentiment: "positive",
        confidence: 0.85,
        keyPhrases: ["great work", "appreciate", "thank you"],
      };
    }

    // Default mock response
    return { message: "AI analysis complete" };
  }

  private getPerformanceLevel(openRate: number, clickRate: number): string {
    if (openRate > 40 && clickRate > 10) return "excellent";
    if (openRate > 25 && clickRate > 5) return "good";
    if (openRate > 15 && clickRate > 2) return "average";
    return "needs_improvement";
  }

  private calculateRecipientEngagementScore(stats: any): number {
    return stats.openRate * 0.6 + (stats.clickCount / stats.emailCount) * 40;
  }

  private identifyCommonIssues(emails: any[]) {
    const openRate =
      emails.length > 0
        ? emails.filter((e) => e.opens.length > 0).length / emails.length
        : 0;

    const clickRate =
      emails.length > 0
        ? emails.filter((e) => e.clicks.length > 0).length / emails.length
        : 0;

    return {
      lowOpenRate: openRate < 0.2,
      lowClickRate: clickRate < 0.05,
      poorTiming: this.hasPoorTiming(emails),
    };
  }

  private hasPoorTiming(emails: any[]): boolean {
    // Simple timing analysis
    const weekendEmails = emails.filter((email) => {
      const day = email.createdAt.getDay();
      return day === 0 || day === 6; // Weekend
    }).length;

    return weekendEmails / emails.length > 0.3; // More than 30% on weekend
  }

  // Additional analysis methods...
  private analyzeSubjectLength(emails: any[]) {
    const successfulSubjects = emails
      .filter((e) => e.opens.length > 0)
      .map((e) => e.subject?.length || 0);

    return successfulSubjects.length > 0
      ? Math.round(
          successfulSubjects.reduce((a, b) => a + b, 0) /
            successfulSubjects.length
        )
      : 50;
  }

  private analyzeBestSendTimes(emails: any[]) {
    const successfulEmails = emails.filter((e) => e.opens.length > 0);
    const hourCounts = successfulEmails.reduce((acc, email) => {
      const hour = email.createdAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as any);

    return Object.entries(hourCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private analyzeHourlyEngagement(emails: any[]) {
    return emails.reduce((acc, email) => {
      email.opens.forEach((open) => {
        const hour = open.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      });
      return acc;
    }, {} as any);
  }

  private analyzeWeeklyPatterns(emails: any[]) {
    return emails.reduce((acc, email) => {
      const day = email.createdAt.getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as any);
  }

  private analyzeDevicePreferences(emails: any[]) {
    return emails
      .flatMap((e) => e.opens)
      .reduce((acc, open) => {
        const device = open.deviceType || "unknown";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as any);
  }

  private analyzeResponseTimes(emails: any[]) {
    const responseTimes = emails
      .filter((e) => e.opens.length > 0)
      .map((e) => e.opens[0].timestamp.getTime() - e.createdAt.getTime());

    return responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  }

  private analyzeEffectiveCTAs(emails: any[]) {
    // Simple CTA analysis based on click rates
    return emails
      .filter((e) => e.clicks.length > 0)
      .slice(0, 5)
      .map((e) => ({ subject: e.subject, clickCount: e.clicks.length }));
  }

  private analyzePersonalizationImpact(emails: any[]) {
    const personalized = emails.filter(
      (e) =>
        e.subject?.includes(e.recipient.split("@")[0]) ||
        e.subject?.toLowerCase().includes("hi ") ||
        e.subject?.toLowerCase().includes("hello ")
    );

    const personalizedOpenRate =
      personalized.length > 0
        ? personalized.filter((e) => e.opens.length > 0).length /
          personalized.length
        : 0;

    const genericOpenRate =
      emails.length > personalized.length
        ? emails.filter((e) => !personalized.includes(e) && e.opens.length > 0)
            .length /
          (emails.length - personalized.length)
        : 0;

    return {
      personalizedCount: personalized.length,
      personalizedOpenRate,
      genericOpenRate,
      impact: personalizedOpenRate - genericOpenRate,
    };
  }

  private async getBenchmarkComparison(openRate: number, clickRate: number) {
    // Mock benchmark data
    const benchmarks = {
      industry: { openRate: 21.5, clickRate: 2.3 },
      topPerformers: { openRate: 35.2, clickRate: 4.7 },
    };

    return {
      vsIndustry: {
        openRate: openRate - benchmarks.industry.openRate,
        clickRate: clickRate - benchmarks.industry.clickRate,
      },
      vsTopPerformers: {
        openRate: openRate - benchmarks.topPerformers.openRate,
        clickRate: clickRate - benchmarks.topPerformers.clickRate,
      },
    };
  }
}
