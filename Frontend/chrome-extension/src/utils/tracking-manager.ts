import { GmailComposeWindow, GmailEmailElement } from '../types/gmail';

export class TrackingManager {
  private apiEndpoint: string;
  private trackedEmails: Map<string, boolean> = new Map();

  constructor(apiEndpoint: string = 'https://your-api.com') {
    this.apiEndpoint = apiEndpoint;
  }

  public injectTrackingIntoCompose(composeWindow: GmailComposeWindow): void {
    try {
      // Add tracking toggle button to compose window
      this.addTrackingToggle(composeWindow);
      
      // Auto-enable tracking if needed
      composeWindow.isTrackingEnabled = true;
      
      console.log('Tracking injected into compose window:', composeWindow.id);
    } catch (error) {
      console.error('Error injecting tracking into compose:', error);
    }
  }

  public addTrackingIndicator(emailElement: GmailEmailElement): void {
    try {
      // Check if email is tracked
      const isTracked = this.checkIfTracked(emailElement);
      emailElement.isTracked = isTracked;

      if (isTracked) {
        this.addTrackingBadge(emailElement);
        this.checkOpenStatus(emailElement);
      }
    } catch (error) {
      console.error('Error adding tracking indicator:', error);
    }
  }

  private addTrackingToggle(composeWindow: GmailComposeWindow): void {
    // Find toolbar in compose window
    const toolbar = composeWindow.element.querySelector('.aoI, .gU, div[role="toolbar"]');
    if (!toolbar) return;

    // Create tracking toggle button
    const toggleButton = document.createElement('div');
    toggleButton.className = 'email-suite-tracking-toggle';
    toggleButton.setAttribute('role', 'button');
    toggleButton.setAttribute('aria-label', 'Enable email tracking');
    toggleButton.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      margin: 0 2px;
      background: ${composeWindow.isTrackingEnabled ? '#3B82F6' : 'transparent'};
      color: ${composeWindow.isTrackingEnabled ? 'white' : '#5f6368'};
    `;

    toggleButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>
    `;

    toggleButton.addEventListener('click', () => {
      composeWindow.isTrackingEnabled = !composeWindow.isTrackingEnabled;
      toggleButton.style.background = composeWindow.isTrackingEnabled ? '#3B82F6' : 'transparent';
      toggleButton.style.color = composeWindow.isTrackingEnabled ? 'white' : '#5f6368';
      
      if (composeWindow.isTrackingEnabled) {
        composeWindow.insertTrackingPixel();
      }
    });

    toolbar.insertBefore(toggleButton, toolbar.firstChild);
  }

  private addTrackingBadge(emailElement: GmailEmailElement): void {
    // Find the row where to add badge
    const subjectCell = emailElement.element.querySelector('.xS, .bq4, .bA4');
    if (!subjectCell) return;

    // Create tracking badge
    const badge = document.createElement('span');
    badge.className = 'email-suite-tracking-badge';
    badge.style.cssText = `
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${emailElement.hasOpened ? '#10B981' : '#6B7280'};
      margin-right: 8px;
      position: relative;
      top: -1px;
    `;
    badge.title = emailElement.hasOpened ? 'Email has been opened' : 'Email not opened yet';

    subjectCell.insertBefore(badge, subjectCell.firstChild);
  }

  private checkIfTracked(emailElement: GmailEmailElement): boolean {
    // Check with backend if this email has tracking
    // For demo, we'll check if email ID is in trackedEmails map
    return this.trackedEmails.has(emailElement.id) || 
           emailElement.element.innerHTML.includes('tracking-pixel');
  }

  private async checkOpenStatus(emailElement: GmailEmailElement): Promise<void> {
    try {
      // Simulate API call to check open status
      const response = await fetch(`${this.apiEndpoint}/emails/${emailElement.id}/status`);
      const data = await response.json();
      
      emailElement.hasOpened = data.opened;
      
      // Update badge color if needed
      const badge = emailElement.element.querySelector('.email-suite-tracking-badge') as HTMLElement;
      if (badge) {
        badge.style.background = emailElement.hasOpened ? '#10B981' : '#6B7280';
        badge.title = emailElement.hasOpened ? 'Email has been opened' : 'Email not opened yet';
      }
    } catch (error) {
      console.error('Error checking open status:', error);
    }
  }
}

// export class TrackingManager {
//   private trackedEmails: Map<string, any> = new Map();

//   injectTrackingIntoCompose(composeWindow: Element) {
//     const composeElement = composeWindow.querySelector(
//       '[aria-label="Message Body"]'
//     );
//     if (!composeElement) return;

//     // Generate unique tracking ID
//     const trackingId = this.generateTrackingId();

//     // Add tracking pixel to email body
//     this.addTrackingPixel(composeElement, trackingId);

//     // Rewrite links for click tracking
//     this.rewriteLinksForTracking(composeElement, trackingId);

//     // Store tracking info
//     this.trackedEmails.set(trackingId, {
//       composedAt: new Date(),
//       status: "draft",
//     });
//   }

//   private generateTrackingId(): string {
//     return `es_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   }

//   private addTrackingPixel(composeElement: Element, trackingId: string) {
//     const trackingPixel = document.createElement("img");
//     trackingPixel.src = `https://api.emailsuite.com/track/pixel/${trackingId}`;
//     trackingPixel.style.display = "none";
//     trackingPixel.alt = "";

//     composeElement.appendChild(trackingPixel);
//   }

//   private rewriteLinksForTracking(composeElement: Element, trackingId: string) {
//     const links = composeElement.getElementsByTagName("a");
//     Array.from(links).forEach((link) => {
//       const originalHref = link.href;
//       if (this.isTrackableLink(originalHref)) {
//         const trackedHref = `https://api.emailsuite.com/track/click/${trackingId}?url=${encodeURIComponent(
//           originalHref
//         )}`;
//         link.href = trackedHref;
//       }
//     });
//   }

//   private isTrackableLink(href: string): boolean {
//     const excludedDomains = ["mail.google.com", "google.com", "emailsuite.com"];
//     return !excludedDomains.some((domain) => href.includes(domain));
//   }

//   addTrackingIndicator(emailElement: Element) {
//     // Add visual indicators for tracked emails
//     const subjectElement = emailElement.querySelector("[data-thread-id]");
//     if (subjectElement) {
//       const indicator = document.createElement("span");
//       indicator.className = "email-suite-indicator";
//       indicator.innerHTML = "📊";
//       indicator.style.marginLeft = "8px";
//       subjectElement.appendChild(indicator);
//     }
//   }
// }
