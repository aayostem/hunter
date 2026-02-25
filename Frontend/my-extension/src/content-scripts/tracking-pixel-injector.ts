// src/utils/tracking-pixel-injector.ts

export interface TrackingPixelOptions {
  pixelUrl?: string;
  pixelSize?: '1x1' | 'hidden';
  position?: 'top' | 'bottom';
  campaignId?: string;
  emailId?: string;
  recipientEmail?: string;
}

export interface TrackingData {
  pixelId: string;
  emailId: string;
  campaignId?: string;
  openedAt: Date;
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
  private defaultOptions: Required<Pick<TrackingPixelOptions, 'pixelSize' | 'position'>> & TrackingPixelOptions;
  private trackedEmails: Map<string, TrackingData> = new Map();

  constructor(
    apiEndpoint = 'https://api.emailsuite.com',
    defaultOptions?: Partial<TrackingPixelOptions>
  ) {
    this.apiEndpoint = apiEndpoint.replace(/\/$/, '');
    this.defaultOptions = {
      pixelSize: '1x1',
      position: 'bottom',
      pixelUrl: `${this.apiEndpoint}/track/open`,
      ...defaultOptions
    };
  }

  // --- Public API ---

  public injectPixelIntoHtml(
    html: string,
    options?: Partial<TrackingPixelOptions>
  ): { html: string; pixelId: string } {
    const opts = { ...this.defaultOptions, ...options };
    const pixelId = this.generatePixelId();
    const pixelHtml = this.buildPixelHtml(pixelId, opts);

    // Fixed: only insert at safe positions — not random offset which can split tags
    const finalHtml = html.includes('</body>')
      ? html.replace('</body>', `${pixelHtml}</body>`)
      : opts.position === 'top'
        ? pixelHtml + html
        : html + pixelHtml;

    return { html: finalHtml, pixelId };
  }

  public injectPixel(
    emailContent: string,
    options?: Partial<TrackingPixelOptions>
  ): { content: string; pixelId: string } {
    const opts = { ...this.defaultOptions, ...options };
    const pixelId = this.generatePixelId();
    const pixelHtml = this.buildPixelHtml(pixelId, opts);

    const finalContent = opts.position === 'top'
      ? pixelHtml + emailContent
      : emailContent + pixelHtml;

    return { content: finalContent, pixelId };
  }

  public getTrackingData(pixelId: string): TrackingData | undefined {
    return this.trackedEmails.get(pixelId);
  }

  public getAllTrackingData(): TrackingData[] {
    return Array.from(this.trackedEmails.values());
  }

  /**
   * NOTE: `sent` must be passed in — this class only tracks opens,
   * not how many emails were sent. Open rate cannot be derived from opens alone.
   */
  public getOpenRate(campaignId: string, sent: number): { sent: number; opened: number; rate: number } {
    const pixels = Array.from(this.trackedEmails.values()).filter((d) => d.campaignId === campaignId);
    const opened = new Set(pixels.map((p) => p.emailId)).size;
    return {
      sent,
      opened,
      rate: sent > 0 ? (opened / sent) * 100 : 0
    };
  }

  public generateTrackingReport(campaignId: string, sent: number): string {
    const { opened, rate } = this.getOpenRate(campaignId, sent);
    const pixels = Array.from(this.trackedEmails.values()).filter((p) => p.campaignId === campaignId);

    const byDevice = pixels.reduce((acc, p) => {
      const key = p.device ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceLines = Object.entries(byDevice)
      .map(([device, count]) => `  ${device}: ${count}`)
      .join('\n');

    return [
      `Campaign:   ${campaignId}`,
      `Sent:       ${sent}`,
      `Opens:      ${opened}`,
      `Open Rate:  ${rate.toFixed(2)}%`,
      ``,
      `Opens by Device:`,
      deviceLines
    ].join('\n');
  }

  // --- Private ---

  // Fixed: single URL-building method used by all injection paths
  private buildPixelUrl(pixelId: string, options: Partial<TrackingPixelOptions>): string {
    const base = options.pixelUrl ?? this.defaultOptions.pixelUrl ?? `${this.apiEndpoint}/track/open`;
    const url = new URL(base);
    url.searchParams.set('pixelId', pixelId);
    if (options.campaignId)    url.searchParams.set('campaignId', options.campaignId);
    if (options.emailId)       url.searchParams.set('emailId', options.emailId);
    // Fixed: btoa fails on non-ASCII — use encodeURIComponent instead
    if (options.recipientEmail) url.searchParams.set('recipient', encodeURIComponent(options.recipientEmail));
    return url.toString();
  }

  private buildPixelHtml(pixelId: string, options: Partial<TrackingPixelOptions>): string {
    const src = this.buildPixelUrl(pixelId, options);
    const size = options.pixelSize ?? '1x1';
    const style = size === '1x1'
      ? 'display:none;width:1px;height:1px;border:0;'
      : 'display:none;width:0;height:0;border:0;';
    return `<img src="${src}" width="1" height="1" style="${style}" alt="" aria-hidden="true" />`;
  }

  // Pixel IDs are per-send so uniqueness matters more than stability — crypto random is appropriate
  private generatePixelId(): string {
    const rand = crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return `pixel_${rand}`;
  }

  public detectDevice(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    const ua = userAgent.toLowerCase();
    if (ua.includes('tablet') || (ua.includes('ipad'))) return 'tablet';
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return 'mobile';
    return 'desktop';
  }

  /**
   * Server-side only — call this from your tracking route handler, not from the browser.
   * Kept here as a utility but should be moved to a dedicated server service.
   */
  public recordOpen(pixelId: string, requestData: {
    emailId?: string;
    campaignId?: string;
    ip?: string;
    userAgent?: string;
    location?: string;
  }): TrackingData {
    const existing = this.trackedEmails.get(pixelId);
    const now = new Date();

    if (existing) {
      existing.opens++;
      existing.lastOpen = now;
      existing.openedAt = now;
      return existing;
    }

    const data: TrackingData = {
      pixelId,
      emailId: requestData.emailId ?? 'unknown',
      campaignId: requestData.campaignId,
      openedAt: now,
      ipAddress: requestData.ip,
      userAgent: requestData.userAgent,
      location: requestData.location,
      device: requestData.userAgent ? this.detectDevice(requestData.userAgent) : undefined,
      opens: 1,
      firstOpen: now,
      lastOpen: now
    };

    this.trackedEmails.set(pixelId, data);
    return data;
  }
}