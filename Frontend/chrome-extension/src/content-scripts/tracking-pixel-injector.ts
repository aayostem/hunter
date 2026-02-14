// src/utils/tracking-pixel-injector.ts

export interface TrackingPixelOptions {
  pixelUrl: string;
  pixelSize?: '1x1' | 'hidden';
  position?: 'top' | 'bottom' | 'random';
  campaignId?: string;
  emailId?: string;
  recipientEmail?: string;
}

export interface TrackingData {
  pixelId: string;
  emailId: string;
  campaignId?: string;
  openedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  opens: number;
  firstOpen: Date;
  lastOpen: Date;
}

export class TrackingPixelInjector {
  private apiEndpoint: string;
  private defaultOptions: TrackingPixelOptions;
  private trackedEmails: Map<string, TrackingData> = new Map();

  constructor(
    apiEndpoint: string = 'https://api.emailsuite.com',
    defaultOptions?: Partial<TrackingPixelOptions>
  ) {
    this.apiEndpoint = apiEndpoint;
    this.defaultOptions = {
      pixelUrl: `${apiEndpoint}/track/open`,
      pixelSize: '1x1',
      position: 'bottom',
      ...defaultOptions
    };
  }

  public injectPixel(
    emailContent: string,
    options?: Partial<TrackingPixelOptions>
  ): { content: string; pixelId: string } {
    const pixelOptions = { ...this.defaultOptions, ...options };
    const pixelId = this.generatePixelId();
    const pixelHtml = this.generatePixelHtml(pixelOptions, pixelId);

    // Inject pixel at specified position
    let finalContent = emailContent;
    switch (pixelOptions.position) {
      case 'top':
        finalContent = pixelHtml + emailContent;
        break;
      case 'bottom':
        finalContent = emailContent + pixelHtml;
        break;
      case 'random':
        const insertPos = Math.floor(Math.random() * emailContent.length);
        finalContent = emailContent.slice(0, insertPos) + 
                      pixelHtml + 
                      emailContent.slice(insertPos);
        break;
    }

    return {
      content: finalContent,
      pixelId
    };
  }

  public injectPixelIntoHtml(
    html: string,
    options?: Partial<TrackingPixelOptions>
  ): { html: string; pixelId: string } {
    const pixelOptions = { ...this.defaultOptions, ...options };
    const pixelId = this.generatePixelId();
    
    // Generate tracking pixel as img tag
    const pixelUrl = new URL(pixelOptions.pixelUrl);
    pixelUrl.searchParams.append('pixelId', pixelId);
    
    if (pixelOptions.campaignId) {
      pixelUrl.searchParams.append('campaignId', pixelOptions.campaignId);
    }
    if (pixelOptions.emailId) {
      pixelUrl.searchParams.append('emailId', pixelOptions.emailId);
    }
    if (pixelOptions.recipientEmail) {
      pixelUrl.searchParams.append('recipient', btoa(pixelOptions.recipientEmail));
    }

    const pixelHtml = `<img src="${pixelUrl.toString()}" 
      width="1" 
      height="1" 
      style="display:none;width:1px;height:1px;border:0;"
      alt="" 
      aria-hidden="true"
    />`;

    // Insert before closing body tag or at the end
    let finalHtml = html;
    if (html.includes('</body>')) {
      finalHtml = html.replace('</body>', `${pixelHtml}</body>`);
    } else {
      finalHtml = html + pixelHtml;
    }

    return {
      html: finalHtml,
      pixelId
    };
  }

  private generatePixelHtml(options: TrackingPixelOptions, pixelId: string): string {
    const pixelUrl = new URL(options.pixelUrl);
    pixelUrl.searchParams.append('pixelId', pixelId);
    
    if (options.campaignId) {
      pixelUrl.searchParams.append('campaignId', options.campaignId);
    }
    if (options.emailId) {
      pixelUrl.searchParams.append('emailId', options.emailId);
    }

    if (options.pixelSize === '1x1') {
      return `<img src="${pixelUrl.toString()}" width="1" height="1" style="display:none;" />`;
    } else {
      // Hidden pixel
      return `<img src="${pixelUrl.toString()}" style="display:none;width:0;height:0;border:0;" />`;
    }
  }

  private generatePixelId(): string {
    return `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async handlePixelRequest(pixelId: string, requestData: any): Promise<void> {
    // This would typically run on your server
    const trackingData: TrackingData = {
      pixelId,
      emailId: requestData.emailId || 'unknown',
      campaignId: requestData.campaignId,
      openedAt: new Date(),
      ipAddress: requestData.ip,
      userAgent: requestData.userAgent,
      location: requestData.location,
      device: this.detectDevice(requestData.userAgent),
      opens: 1,
      firstOpen: new Date(),
      lastOpen: new Date()
    };

    // Store tracking data
    this.trackedEmails.set(pixelId, trackingData);

    // Send to analytics
    await this.sendTrackingData(trackingData);
  }

  private detectDevice(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'mobile';
    if (ua.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  private async sendTrackingData(data: TrackingData): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/api/track/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send tracking data:', error);
    }
  }

  public getTrackingData(pixelId: string): TrackingData | undefined {
    return this.trackedEmails.get(pixelId);
  }

  public getAllTrackingData(): TrackingData[] {
    return Array.from(this.trackedEmails.values());
  }

  public getOpenRate(campaignId: string): { sent: number; opened: number; rate: number } {
    const campaignPixels = Array.from(this.trackedEmails.values())
      .filter(data => data.campaignId === campaignId);

    const uniqueOpens = new Set(campaignPixels.map(p => p.emailId)).size;
    
    return {
      sent: campaignPixels.length,
      opened: uniqueOpens,
      rate: campaignPixels.length > 0 ? (uniqueOpens / campaignPixels.length) * 100 : 0
    };
  }

  public generateTrackingReport(campaignId: string): string {
    const data = this.getOpenRate(campaignId);
    const pixels = Array.from(this.trackedEmails.values())
      .filter(p => p.campaignId === campaignId);

    const opensByDevice = pixels.reduce((acc, p) => {
      acc[p.device || 'unknown'] = (acc[p.device || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
      Campaign: ${campaignId}
      Sent: ${data.sent}
      Opens: ${data.opened}
      Open Rate: ${data.rate.toFixed(2)}%
      
      Opens by Device:
      ${Object.entries(opensByDevice)
        .map(([device, count]) => `  ${device}: ${count}`)
        .join('\n')}
    `;
  }
}