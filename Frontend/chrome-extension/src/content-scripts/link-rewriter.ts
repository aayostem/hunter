// src/utils/link-rewrite.ts

export interface LinkTrackingOptions {
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trackClicks: boolean;
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

  constructor(
    apiEndpoint: string = 'https://api.emailsuite.com',
    options?: Partial<LinkTrackingOptions>
  ) {
    this.apiEndpoint = apiEndpoint;
    this.options = {
      trackClicks: true,
      ...options
    };
  }

  public rewriteLinksInHtml(html: string, campaignId?: string): string {
    if (!this.options.trackClicks) return html;

    // Parse HTML and find all anchor tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Fix: Cast to HTMLAnchorElement[] after converting NodeList to Array
    const links = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];

    links.forEach((link: HTMLAnchorElement) => {
      const originalHref = link.getAttribute('href');
      if (originalHref && this.shouldTrackLink(originalHref)) {
        const trackedUrl = this.createTrackedUrl(originalHref, campaignId);
        link.setAttribute('href', trackedUrl);
        
        // Add tracking attributes
        link.setAttribute('data-tracked', 'true');
        link.setAttribute('data-link-id', this.generateLinkId(originalHref));
      }
    });

    return doc.body.innerHTML;
  }

  public rewriteLinksInText(text: string, campaignId?: string): string {
    if (!this.options.trackClicks) return text;

    // Simple URL regex for plain text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    return text.replace(urlRegex, (url: string) => {
      if (this.shouldTrackLink(url)) {
        return this.createTrackedUrl(url, campaignId);
      }
      return url;
    });
  }

  public async rewriteLinksInGmailCompose(composeElement: HTMLElement, campaignId?: string): Promise<void> {
    if (!this.options.trackClicks) return;

    // Find the editable body in Gmail compose
    const bodyElement = composeElement.querySelector('div[role="textbox"][aria-label*="Message Body"], div[contenteditable="true"]');
    
    if (bodyElement) {
      // Get the HTML content
      const html = bodyElement.innerHTML;
      
      // Rewrite links
      const rewrittenHtml = this.rewriteLinksInHtml(html, campaignId);
      
      // Update the content if changed
      if (rewrittenHtml !== html) {
        bodyElement.innerHTML = rewrittenHtml;
      }

      // Also handle any links that might be added dynamically
      this.observeNewLinks(bodyElement, campaignId);
    }
  }

  private observeNewLinks(container: Element, campaignId?: string): void {
    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((mutation: MutationRecord) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check if the added node is a link or contains links
              if (element.tagName === 'A') {
                this.rewriteLinkElement(element as HTMLAnchorElement, campaignId);
              } else {
                const links = Array.from(element.querySelectorAll('a[href]')) as HTMLAnchorElement[];
                links.forEach((link: HTMLAnchorElement) => this.rewriteLinkElement(link, campaignId));
              }
            }
          });
        }
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });
  }

  private rewriteLinkElement(link: HTMLAnchorElement, campaignId?: string): void {
    const originalHref = link.getAttribute('href');
    if (originalHref && this.shouldTrackLink(originalHref) && !link.hasAttribute('data-tracked')) {
      const trackedUrl = this.createTrackedUrl(originalHref, campaignId);
      link.setAttribute('href', trackedUrl);
      link.setAttribute('data-tracked', 'true');
      link.setAttribute('data-link-id', this.generateLinkId(originalHref));
    }
  }

  private shouldTrackLink(url: string): boolean {
    // Don't track internal links or mailto links
    if (url.startsWith('mailto:') || 
        url.startsWith('#') || 
        url.startsWith('tel:') ||
        url.startsWith('javascript:')) {
      return false;
    }

    // Don't track links to our own domain (prevents loops)
    if (url.includes(this.apiEndpoint)) {
      return false;
    }

    return true;
  }

  private createTrackedUrl(originalUrl: string, campaignId?: string): string {
    const linkId = this.generateLinkId(originalUrl);
    
    // Create URL object safely
    let urlObj: URL;
    try {
      urlObj = new URL(originalUrl);
    } catch {
      // If invalid URL, encode it as a parameter
      const encodedUrl = encodeURIComponent(originalUrl);
      urlObj = new URL(`${this.apiEndpoint}/click?url=${encodedUrl}`);
    }

    const trackedUrl = new URL(`${this.apiEndpoint}/click`);

    trackedUrl.searchParams.append('url', urlObj.toString());
    trackedUrl.searchParams.append('linkId', linkId);
    
    if (campaignId) {
      trackedUrl.searchParams.append('campaignId', campaignId);
    }

    if (this.options.utmSource) {
      trackedUrl.searchParams.append('utm_source', this.options.utmSource);
    }
    if (this.options.utmMedium) {
      trackedUrl.searchParams.append('utm_medium', this.options.utmMedium);
    }
    if (this.options.utmCampaign || campaignId) {
      trackedUrl.searchParams.append('utm_campaign', this.options.utmCampaign || campaignId || '');
    }

    // Add timestamp to prevent caching
    trackedUrl.searchParams.append('_t', Date.now().toString());

    // Store link for tracking
    this.trackedLinks.set(linkId, {
      originalUrl,
      trackedUrl: trackedUrl.toString(),
      linkId,
      campaignId,
      clicks: 0
    });

    return trackedUrl.toString();
  }

  private generateLinkId(url: string): string {
    return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async trackClick(linkId: string): Promise<void> {
    const link = this.trackedLinks.get(linkId);
    if (!link) return;

    link.clicks++;

    try {
      // Send click data to server
      await fetch(`${this.apiEndpoint}/api/track/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          linkId,
          campaignId: link.campaignId,
          originalUrl: link.originalUrl,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        })
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  }

  public getLinkStats(linkId: string): TrackedLink | undefined {
    return this.trackedLinks.get(linkId);
  }

  public getAllLinkStats(): TrackedLink[] {
    return Array.from(this.trackedLinks.values());
  }

  public getCampaignStats(campaignId: string): { totalClicks: number; links: TrackedLink[] } {
    const campaignLinks = Array.from(this.trackedLinks.values())
      .filter(link => link.campaignId === campaignId);
    
    const totalClicks = campaignLinks.reduce((sum, link) => sum + link.clicks, 0);

    return {
      totalClicks,
      links: campaignLinks
    };
  }

  public clearStats(): void {
    this.trackedLinks.clear();
  }

  public updateOptions(options: Partial<LinkTrackingOptions>): void {
    this.options = { ...this.options, ...options };
  }
}