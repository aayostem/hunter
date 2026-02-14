import { PrismaClient, Campaign, CampaignStatus,CampaignTemplate, TrackedEmail,  EmailOpen, LinkClick } from '@prisma/client';
import { Redis } from 'ioredis';
import { config } from '../config';
import { EmailService } from './email-service';

// Define types
interface CreateCampaignData {
  name: string;
  subject: string;
  body: string;
  recipients: string[];
  scheduledAt?: Date;
}

interface CampaignAnalytics {
  campaign: Campaign;
  summary: {
    totalEmails: number;
    totalOpens: number;
    totalClicks: number;
    uniqueOpens: number;
    uniqueClicks: number;
  };
  rates: {
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
  };
  timing: {
    firstOpen: Date | null;
    peakOpeningHours: { hour: number; count: number }[];
    averageTimeToOpen: number;
  };
  engagement: {
    mostOpenedEmails: { recipient: string; openCount: number; lastOpened: Date | null }[];
    mostClickedLinks: { domain: string; count: number }[];
  };
}

interface PaginationOptions {
  status?: CampaignStatus;
  page: number;
  limit: number;
}

type CampaignWithUser = Campaign & { user: any };
type TrackedEmailWithRelations = TrackedEmail & {
  opens: EmailOpen[];
  clicks: LinkClick[];
};

export class CampaignService {
  private prisma: PrismaClient;
  private redis: Redis;
  private emailService: EmailService;

  constructor() {
    this.prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
    this.redis = new Redis(config.redis.url);
    this.emailService = new EmailService();
  }

  async createCampaign(userId: string, campaignData: CreateCampaignData) {
    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        recipientList: campaignData.recipients, // This should be Json field
        scheduledAt: campaignData.scheduledAt,
        status: campaignData.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      },
    });

    return campaign;
  }

  async scheduleCampaign(campaignId: string, scheduleAt: Date) {
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        scheduledAt: scheduleAt,
        status: CampaignStatus.SCHEDULED,
      },
    });

    // Schedule the campaign job
    await this.scheduleCampaignJob(campaign);

    return campaign;
  }

  async sendCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { user: true },
    });

    if (!campaign) throw new Error("Campaign not found");

    // Update status to sending
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SENDING },
    });

    const recipients = campaign.recipientList as string[];
    const batchSize = 10;
    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches for better performance
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Use Promise.all for parallel processing
      const batchResults = await Promise.allSettled(
        batch.map(recipient => this.sendCampaignEmail(campaign as CampaignWithUser, recipient))
      );

      // Count results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          sentCount++;
        } else {
          errorCount++;
          errors.push(`Failed to send to ${batch[index]}: ${result.reason}`);
        }
      });

      // Update progress
      if (sentCount % 50 === 0 || i + batchSize >= recipients.length) {
        await this.redis.publish(
          "campaign_progress",
          JSON.stringify({
            campaignId,
            progress: ((i + batchSize) / recipients.length) * 100,
            sent: sentCount,
            errors: errorCount,
            total: recipients.length,
          })
        );
      }
    }

    // Update final status - fix COMPLETED_WITH_ERRORS issue
    const finalStatus = errorCount > 0 ? 'COMPLETED_WITH_ERRORS' as CampaignStatus : CampaignStatus.COMPLETED;
    
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalStatus },
    });

    return {
      campaignId,
      sent: sentCount,
      errors: errorCount,
      total: recipients.length,
      errorDetails: errors,
    };
  }

  private async sendCampaignEmail(campaign: CampaignWithUser, recipient: string) {
    const trackingId = `campaign_${campaign.id}_${recipient}_${Date.now()}`;
    
    try {
      // Use the email service to send actual emails
      await this.emailService.sendCampaignEmail(campaign, recipient, {});
      
      // Store the sent email for tracking
      await this.prisma.trackedEmail.create({
        data: {
          trackingId,
          userId: campaign.userId,
          recipient,
          subject: campaign.subject,
          messageId: `campaign_${campaign.id}_${recipient}`,
        },
      });
    } catch (error) {
      throw new Error(`Failed to send to ${recipient}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scheduleCampaignJob(campaign: Campaign) {
    if (!campaign.scheduledAt) return;
    
    const delay = campaign.scheduledAt.getTime() - Date.now();

    if (delay > 0) {
      // Use setTimeout for simplicity (in production, use a job queue like Bull)
      setTimeout(() => {
        this.sendCampaign(campaign.id).catch(console.error);
      }, delay);
    }
  }

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error("Campaign not found");

    // Get all tracked emails for this campaign in a single query
    const trackedEmails = await this.prisma.trackedEmail.findMany({
      where: {
        userId: campaign.userId,
        messageId: {
          startsWith: `campaign_${campaignId}`,
        },
      },
      include: {
        opens: {
          select: {
            id: true,
            ipAddress: true,
            timestamp: true,
          },
        },
        clicks: {
          select: {
            id: true,
            ipAddress: true,
            url: true,
            timestamp: true,
          },
        },
      },
    }) as TrackedEmailWithRelations[];

    // Calculate metrics using efficient array methods
    const totalOpens = trackedEmails.reduce((sum, email) => sum + email.opens.length, 0);
    const totalClicks = trackedEmails.reduce((sum, email) => sum + email.clicks.length, 0);
    
    const uniqueOpenIPs = new Set<string>();
    const uniqueClickIPs = new Set<string>();
    
    trackedEmails.forEach(email => {
      email.opens.forEach(open => open.ipAddress && uniqueOpenIPs.add(open.ipAddress));
      email.clicks.forEach(click => click.ipAddress && uniqueClickIPs.add(click.ipAddress));
    });

    const emailsWithOpens = trackedEmails.filter(email => email.opens.length > 0).length;
    const emailsWithClicks = trackedEmails.filter(email => email.clicks.length > 0).length;

    const openRate = trackedEmails.length > 0 ? (emailsWithOpens / trackedEmails.length) * 100 : 0;
    const clickRate = trackedEmails.length > 0 ? (emailsWithClicks / trackedEmails.length) * 100 : 0;
    const clickToOpenRate = emailsWithOpens > 0 ? (emailsWithClicks / emailsWithOpens) * 100 : 0;

    // Get timing analytics
    const allOpens = trackedEmails.flatMap(email => email.opens);
    const firstOpen = allOpens.length > 0 ? 
      allOpens.reduce((earliest, open) => 
        open.timestamp < earliest.timestamp ? open : earliest
      ).timestamp : 
      null;

    // Group opens by hour
    const hoursMap = new Map<number, number>();
    allOpens.forEach(open => {
      const hour = open.timestamp.getHours();
      hoursMap.set(hour, (hoursMap.get(hour) || 0) + 1);
    });

    const peakOpeningHours = Array.from(hoursMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average time to open
    const averageTimeToOpen = this.calculateAverageTimeToOpen(trackedEmails);

    // Get most opened emails
    const mostOpenedEmails = (trackedEmails || [])
      .map(email => ({
        recipient: email?.recipient || 'Unknown',
        openCount: email?.opens?.length || 0,
        lastOpened: email?.opens?.length > 0 ? 
          email.opens[email.opens.length - 1]?.timestamp || null : 
          null,
      }))
      .sort((a, b) => b.openCount - a.openCount)
      .slice(0, 10);

    // Get most clicked links
    const domainCounts = new Map<string, number>();
    trackedEmails.forEach(email => {
      email.clicks.forEach(click => {
        try {
          const url = new URL(click.url);
          const domain = url.hostname;
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        } catch {
          // Skip invalid URLs
        }
      });
    });

    const mostClickedLinks = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      campaign,
      summary: {
        totalEmails: trackedEmails.length,
        totalOpens,
        totalClicks,
        uniqueOpens: uniqueOpenIPs.size,
        uniqueClicks: uniqueClickIPs.size,
      },
      rates: {
        openRate,
        clickRate,
        clickToOpenRate,
      },
      timing: {
        firstOpen,
        peakOpeningHours,
        averageTimeToOpen: Math.round(averageTimeToOpen),
      },
      engagement: {
        mostOpenedEmails,
        mostClickedLinks,
      },
    };
  }

  private calculateAverageTimeToOpen(trackedEmails: TrackedEmailWithRelations[]): number {
    const emailsWithOpens = trackedEmails.filter(email => email.opens.length > 0);
    
    if (emailsWithOpens.length === 0) return 0;

    const totalTime = emailsWithOpens.reduce((sum, email) => {
      // Add null checks for opens array and first element
      const firstOpen = email.opens?.[0]?.timestamp;
      const sentTime = email.createdAt;
      
      if (!firstOpen || !sentTime) {
        return sum; // Skip this email if data is missing
      }
      
      return sum + (firstOpen.getTime() - sentTime.getTime());
    }, 0);

    return totalTime / emailsWithOpens.length;
  }

async getUserCampaigns(userId: string, options: PaginationOptions) {
  const skip = (options.page - 1) * options.limit;
  
  const where: any = { userId };
  if (options.status) {
    where.status = options.status;
  }

  const [campaigns, total] = await Promise.all([
    this.prisma.campaign.findMany({
      where,
      skip,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.campaign.count({ where })
  ]);

  // Get tracked email counts separately
  const campaignIds = campaigns.map(c => c.id);
  let trackedEmailCounts = new Map<string, number>();
  
  if (campaignIds.length > 0) {
    const counts = await this.prisma.trackedEmail.groupBy({
      by: ['campaignId'],
      where: {
        campaignId: { in: campaignIds }
      },
      _count: {
        id: true,
      },
    });
    
    counts.forEach(item => {
      trackedEmailCounts.set(item.campaignId!, item._count.id);
    });
  }

  // Add _count field
  const campaignsWithCounts = campaigns.map(campaign => ({
    ...campaign,
    _count: {
      trackedEmails: trackedEmailCounts.get(campaign.id) || 0
    }
  }));

  return {
    campaigns: campaignsWithCounts,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit)
    }
  };
}
async getCampaign(userId: string, campaignId: string) {
  const campaign = await this.prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId
    },
    // Remove invalid include
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get tracked emails separately
  const trackedEmails = await this.prisma.trackedEmail.findMany({
    where: {
      userId,
      messageId: {
        startsWith: `campaign_${campaignId}`
      }
    },
    include: {
      opens: true,
      clicks: true
    },
    take: 100
  });

  return {
    ...campaign,
    trackedEmails
  };
}

  async updateCampaign(userId: string, campaignId: string, updates: Partial<Campaign>) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Remove fields that shouldn't be updated
    const { id, userId: _, createdAt, ...allowedUpdates } = updates as any;
    
    return await this.prisma.campaign.update({
      where: { id: campaignId },
      data: allowedUpdates
    });
  }

  async deleteCampaign(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete related tracked emails first
      await tx.trackedEmail.deleteMany({
        where: {
          messageId: {
            startsWith: `campaign_${campaignId}`
          }
        }
      });

      // Delete the campaign
      await tx.campaign.delete({
        where: { id: campaignId }
      });
    });
  }

  async pauseCampaign(userId: string, campaignId: string) {
    return await this.updateCampaignStatus(userId, campaignId, CampaignStatus.DRAFT); // Using DRAFT as pause
  }

async resumeCampaign(userId: string, campaignId: string) {
  const campaign = await this.prisma.campaign.findFirst({
    where: { id: campaignId, userId }
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  let status: CampaignStatus;
  if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
    status = 'SCHEDULED';
  } else {
    status = 'DRAFT';
  }
  

  return await this.prisma.campaign.update({
    where: { id: campaignId },
    data: { status }
  });
}

  private async updateCampaignStatus(userId: string, campaignId: string, status: CampaignStatus) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status }
    });
  }

  async getCampaignRecipients(userId: string, campaignId: string, page: number = 1, limit: number = 20) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const skip = (page - 1) * limit;
    
    const recipients = await this.prisma.trackedEmail.findMany({
      where: {
        messageId: {
          startsWith: `campaign_${campaignId}`
        }
      },
      skip,
      take: limit,
      include: {
        opens: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        clicks: true
      }
    }) as TrackedEmailWithRelations[];

    const total = await this.prisma.trackedEmail.count({
      where: {
        messageId: {
          startsWith: `campaign_${campaignId}`
        }
      }
    });

    return {
      recipients: recipients.map(recipient => ({
        email: recipient.recipient,
        opens: recipient.opens.length,
        clicks: recipient.clicks.length,
        lastOpen: recipient.opens[0]?.timestamp || null,
        createdAt: recipient.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async createTemplate(userId: string, templateData: Partial<CampaignTemplate>) {
    return await this.prisma.campaignTemplate.create({
      data: {
        userId,
        name: templateData.name!,
        subject: templateData.subject!,
        body: templateData.body!,
        category: templateData.category || 'general',
        variables: templateData.variables as any[] || []
      }
    });
  }

  async getTemplates(userId: string) {
    return await this.prisma.campaignTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

async updateTemplate(userId: string, templateId: string, updates: any) {
  const template = await this.prisma.campaignTemplate.findFirst({
    where: { id: templateId, userId }
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return await this.prisma.campaignTemplate.update({
    where: { id: templateId },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  });
}

  async deleteTemplate(userId: string, templateId: string) {
    const template = await this.prisma.campaignTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    await this.prisma.campaignTemplate.delete({
      where: { id: templateId }
    });
  }
}