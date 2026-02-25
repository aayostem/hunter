// src/utils/link-rewrite.ts

export interface LinkTrackingOptions {
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trackClicks: boolean;
  sendUserAgent?: boolean; // opt-in, off by default for privacy
}

export interface TrackedLink {
  originalUrl: string;
  trackedUrl: string;
  linkId: string;
  campaignId?: string;
  clicks: number;
}

export class LinkRewriteManager {
  private apiEndpoint: string;
  private trackedLinks: Map<string, TrackedLink> = new Map();
  private options: LinkTrackingOptions;
  private observers: MutationObserver[] = [];

  constructor(
    apiEndpoint = 'https://api.emailsuite.com',
    options?: Partial<LinkTrackingOptions>
  ) {
    this.apiEndpoint = apiEndpoint.replace(/\/$/, ''); // strip trailing slash
    this.options = { trackClicks: true, sendUserAgent: false, ...options };
  }

  // --- Public API ---

  public rewriteLinksInHtml(html: string, campaignId?: string): string {
    if (!this.options.trackClicks) return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    (Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[])
      .forEach((link) => this.rewriteLinkElement(link, campaignId));
    return doc.body.innerHTML;
  }

  public rewriteLinksInText(text: string, campaignId?: string): string {
    if (!this.options.trackClicks) return text;
    return text.replace(/(https?:\/\/[^\s]+)/g, (url) =>
      this.shouldTrackLink(url) ? this.createTrackedUrl(url, campaignId) : url
    );
  }

  public async rewriteLinksInGmailCompose(composeElement: HTMLElement, campaignId?: string): Promise<void> {
    if (!this.options.trackClicks) return;

    const bodyElement = composeElement.querySelector<HTMLElement>(
      'div[role="textbox"][aria-label*="Message Body"], div[contenteditable="true"]'
    );
    if (!bodyElement) return;

    const html = bodyElement.innerHTML;
    const rewritten = this.rewriteLinksInHtml(html, campaignId);
    if (rewritten !== html) bodyElement.innerHTML = rewritten;

    this.observeNewLinks(bodyElement, campaignId);
  }

  public async trackClick(linkId: string): Promise<void> {
    const link = this.trackedLinks.get(linkId);
    if (!link) return;
    link.clicks++;

    try {
      await fetch(`${this.apiEndpoint}/api/track/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          campaignId: link.campaignId,
          originalUrl: link.originalUrl,
          timestamp: new Date().toISOString(),
          ...(this.options.sendUserAgent && {
            userAgent: navigator.userAgent,
            referrer: document.referrer
          })
        })
      });
    } catch (error) {
      console.error('Email Suite: failed to track click:', error);
    }
  }

  public getLinkStats(linkId: string): TrackedLink | undefined {
    return this.trackedLinks.get(linkId);
  }

  public getAllLinkStats(): TrackedLink[] {
    return Array.from(this.trackedLinks.values());
  }

  public getCampaignStats(campaignId: string): { totalClicks: number; links: TrackedLink[] } {
    const links = Array.from(this.trackedLinks.values()).filter((l) => l.campaignId === campaignId);
    return { totalClicks: links.reduce((sum, l) => sum + l.clicks, 0), links };
  }

  public updateOptions(options: Partial<LinkTrackingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public clearStats(): void {
    this.trackedLinks.clear();
  }

  /** Disconnect all MutationObservers created by this instance */
  public destroy(): void {
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
  }

  // --- Private ---

  private observeNewLinks(container: Element, campaignId?: string): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type !== 'childList') return;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          if (el.tagName === 'A') {
            this.rewriteLinkElement(el as HTMLAnchorElement, campaignId);
          } else {
            (Array.from(el.querySelectorAll('a[href]')) as HTMLAnchorElement[])
              .forEach((link) => this.rewriteLinkElement(link, campaignId));
          }
        });
      });
    });

    observer.observe(container, { childList: true, subtree: true });
    // Fixed: store observer so it can be disconnected via destroy()
    this.observers.push(observer);
  }

  private rewriteLinkElement(link: HTMLAnchorElement, campaignId?: string): void {
    const href = link.getAttribute('href');
    if (!href || !this.shouldTrackLink(href) || link.hasAttribute('data-tracked')) return;
    const trackedUrl = this.createTrackedUrl(href, campaignId);
    link.setAttribute('href', trackedUrl);
    link.setAttribute('data-tracked', 'true');
    link.setAttribute('data-link-id', this.generateLinkId(href));
  }

  private shouldTrackLink(url: string): boolean {
    if (/^(mailto:|#|tel:|javascript:)/i.test(url)) return false;
    if (url.includes(this.apiEndpoint)) return false; // prevent redirect loops
    return true;
  }

  private createTrackedUrl(originalUrl: string, campaignId?: string): string {
    const linkId = this.generateLinkId(originalUrl);

    // Fixed: handle invalid URLs cleanly without dead-code fallback
    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(originalUrl).toString();
    } catch {
      resolvedUrl = originalUrl; // pass as-is, server will handle/reject
    }

    const tracked = new URL(`${this.apiEndpoint}/click`);
    tracked.searchParams.set('url', resolvedUrl);
    tracked.searchParams.set('linkId', linkId);
    if (campaignId)                              tracked.searchParams.set('campaignId', campaignId);
    if (this.options.utmSource)                  tracked.searchParams.set('utm_source', this.options.utmSource);
    if (this.options.utmMedium)                  tracked.searchParams.set('utm_medium', this.options.utmMedium);
    if (this.options.utmCampaign || campaignId)  tracked.searchParams.set('utm_campaign', this.options.utmCampaign ?? campaignId ?? '');
    // Fixed: no _t timestamp — same link must produce same tracked URL for deduplication

    this.trackedLinks.set(linkId, {
      originalUrl,
      trackedUrl: tracked.toString(),
      linkId,
      campaignId,
      clicks: 0
    });

    return tracked.toString();
  }

  // Fixed: stable hash based on URL content, not random — same URL = same ID
  private generateLinkId(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (Math.imul(31, hash) + url.charCodeAt(i)) | 0;
    }
    return `link_${Math.abs(hash).toString(36)}`;
  }
}