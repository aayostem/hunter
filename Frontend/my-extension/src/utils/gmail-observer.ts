import { GmailComposeWindow, GmailEmailElement, GmailObserverConfig } from '../types/gmail';

export class GmailObserver {
  private composeCallbacks: ((composeWindow: GmailComposeWindow) => void)[] = [];
  private emailListCallbacks: ((emailElement: GmailEmailElement) => void)[] = [];
  private observedComposeWindows: Set<string> = new Set();
  private observedEmailElements: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private config: GmailObserverConfig = {
    composeSelector: 'div[role="dialog"][aria-label*="Compose"], div[role="dialog"][aria-label*="Message"]',
    emailListSelector: 'div[role="main"] table tbody tr',
    emailRowSelector: 'tr.zA',
    checkInterval: 1000
  };

  constructor(config?: Partial<GmailObserverConfig>) {
    this.config = { ...this.config, ...config };
    this.initObserver();
  }

  private initObserver(): void {
    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-label']
    });
  }

  private handleMutations(mutations: MutationRecord[]): void {
    let needsComposeCheck = false;
    let needsEmailCheck = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        needsComposeCheck = true;
        needsEmailCheck = true;
      } else if (mutation.type === 'attributes') {
        if (mutation.target instanceof HTMLElement) {
          if (mutation.target.getAttribute('role') === 'dialog') {
            needsComposeCheck = true;
          } else if (mutation.target.closest('div[role="main"]')) {
            needsEmailCheck = true;
          }
        }
      }
    }

    if (needsComposeCheck) {
      this.checkForComposeWindows();
    }
    if (needsEmailCheck) {
      this.checkForEmailElements();
    }
  }

  private checkForComposeWindows(): void {
    const composeWindows = document.querySelectorAll(this.config.composeSelector);
    
    composeWindows.forEach((element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      
      const composeId = this.getComposeId(element);
      if (!composeId || this.observedComposeWindows.has(composeId)) return;

      this.observedComposeWindows.add(composeId);
      const composeWindow = this.extractComposeData(element);
      
      if (composeWindow) {
        this.composeCallbacks.forEach(callback => {
          try {
            callback(composeWindow);
          } catch (error) {
            console.error('Error in compose callback:', error);
          }
        });
      }
    });
  }

  private checkForEmailElements(): void {
    const emailRows = document.querySelectorAll(this.config.emailRowSelector);
    
    emailRows.forEach((element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      
      const emailId = this.getEmailId(element);
      if (!emailId || this.observedEmailElements.has(emailId)) return;

      this.observedEmailElements.add(emailId);
      const emailElement = this.extractEmailData(element);
      
      if (emailElement) {
        this.emailListCallbacks.forEach(callback => {
          try {
            callback(emailElement);
          } catch (error) {
            console.error('Error in email list callback:', error);
          }
        });
      }
    });
  }

  private getComposeId(element: HTMLElement): string | null {
    return element.id || `compose-${Date.now()}-${Math.random()}`;
  }

  private getEmailId(element: HTMLElement): string | null {
    // Try to get message ID from Gmail's data attributes
    const messageId = element.getAttribute('data-thread-id') || 
                     element.getAttribute('data-legacy-thread-id') ||
                     element.querySelector('input[name="message_id"]')?.getAttribute('value');
    
    return messageId || `email-${Date.now()}-${Math.random()}`;
  }

  private extractComposeData(element: HTMLElement): GmailComposeWindow | null {
    try {
      // Extract recipients
      const toInputs = element.querySelectorAll('input[name="to"], input[aria-label*="To"]');
      const to: string[] = [];
      toInputs.forEach(input => {
        if (input instanceof HTMLInputElement && input.value) {
          to.push(input.value);
        }
      });

      // Extract subject
      const subjectInput = element.querySelector('input[name="subjectbox"], input[aria-label*="Subject"]');
      const subject = subjectInput instanceof HTMLInputElement ? subjectInput.value : '';

      // Extract body
      const bodyDiv = element.querySelector('div[role="textbox"][aria-label*="Message Body"], div[contenteditable="true"]');
      const body = bodyDiv instanceof HTMLElement ? bodyDiv.innerHTML : '';

      return {
        id: this.getComposeId(element) || `compose-${Date.now()}`,
        element,
        to,
        subject,
        body,
        isTrackingEnabled: false,
        sendMessage: async () => {
          // Find and click send button
          const sendButton = element.querySelector('div[role="button"][aria-label*="Send"]') as HTMLElement;
          if (sendButton) {
            sendButton.click();
          }
        },
        insertTrackingPixel: () => {
          // Insert tracking pixel logic
          const bodyDiv = element.querySelector('div[role="textbox"][aria-label*="Message Body"]');
          if (bodyDiv) {
            const trackingPixel = `<img src="https://your-api.com/track/${Date.now()}" width="1" height="1" />`;
            bodyDiv.innerHTML += trackingPixel;
          }
        }
      };
    } catch (error) {
      console.error('Error extracting compose data:', error);
      return null;
    }
  }

  private extractEmailData(element: HTMLElement): GmailEmailElement | null {
    try {
      // Extract sender
      const senderElement = element.querySelector('.yW, .gD, [email]');
      const from = senderElement?.getAttribute('email') || 
                   senderElement?.getAttribute('name') || 
                   senderElement?.textContent || 
                   'Unknown';

      // Extract subject
      const subjectElement = element.querySelector('.y6, .bog, [data-thread-subject]');
      const subject = subjectElement?.textContent?.trim() || 'No Subject';

      // Extract thread ID
      const threadId = element.getAttribute('data-thread-id') || 
                      element.getAttribute('data-legacy-thread-id') || 
                      `thread-${Date.now()}`;

      // Extract date
      const dateElement = element.querySelector('.xW, .g3, [data-tooltip]');
      const dateText = dateElement?.getAttribute('title') || dateElement?.textContent || '';
      const date = this.parseGmailDate(dateText);

      // Check for tracking pixel
      const hasTrackingPixel = element.innerHTML.includes('tracking-pixel') || 
                              element.innerHTML.includes('emailsuite.com/track');

      return {
        id: this.getEmailId(element) || `email-${Date.now()}`,
        element,
        threadId,
        subject,
        from,
        to: [], // Would need more complex parsing to extract recipients
        date,
        isTracked: hasTrackingPixel,
        hasOpened: false // Would need to check with backend
      };
    } catch (error) {
      console.error('Error extracting email data:', error);
      return null;
    }
  }

  private parseGmailDate(dateText: string): Date {
    try {
      // Handle various Gmail date formats
      if (dateText.includes(':')) {
        // Today's time
        const [hours, minutes] = dateText.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
      } else if (dateText.match(/[A-Z][a-z]{2} \d{1,2}/)) {
        // Month Day format
        return new Date(dateText);
      } else {
        return new Date(dateText);
      }
    } catch {
      return new Date();
    }
  }

  // Public methods
  public observeComposeWindows(callback: (composeWindow: GmailComposeWindow) => void): void {
    this.composeCallbacks.push(callback);
    // Check immediately for existing compose windows
    setTimeout(() => this.checkForComposeWindows(), 100);
  }

  public observeEmailList(callback: (emailElement: GmailEmailElement) => void): void {
    this.emailListCallbacks.push(callback);
    // Check immediately for existing emails
    setTimeout(() => this.checkForEmailElements(), 100);
  }

  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.composeCallbacks = [];
    this.emailListCallbacks = [];
    this.observedComposeWindows.clear();
    this.observedEmailElements.clear();
  }

  public forceCheck(): void {
    this.checkForComposeWindows();
    this.checkForEmailElements();
  }
}