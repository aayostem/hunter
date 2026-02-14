import { GmailObserver } from "../utils/gmail-observer";
import { TrackingManager } from "../utils/tracking-manager";
import { GmailComposeWindow, GmailEmailElement } from "../types/gmail";

class GmailInjector {
  private trackingManager: TrackingManager;
  private observer: GmailObserver;

  constructor() {
    this.trackingManager = new TrackingManager();
    this.observer = new GmailObserver();
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Wait for Gmail to load
      await this.waitForGmail();

      // Inject tracking into compose window
      this.injectComposeTracking();

      // Add tracking indicators to email list
      this.injectTrackingIndicators();

      console.log("Email Suite: Gmail injection complete");
    } catch (error) {
      console.error("Failed to initialize Gmail injector:", error);
    }
  }

  private async waitForGmail(): Promise<void> {
    return new Promise((resolve) => {
      const checkGmail = () => {
        if (document.querySelector('[role="navigation"]')) {
          resolve();
        } else {
          setTimeout(checkGmail, 500);
        }
      };
      checkGmail();
    });
  }

  private injectComposeTracking(): void {
    this.observer.observeComposeWindows((composeWindow: GmailComposeWindow) => {
      this.trackingManager.injectTrackingIntoCompose(composeWindow);
    });
  }

  private injectTrackingIndicators(): void {
    this.observer.observeEmailList((emailElement: GmailEmailElement) => {
      this.trackingManager.addTrackingIndicator(emailElement);
    });
  }

  // Optional: Cleanup method
  public destroy(): void {
    this.observer.disconnect();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new GmailInjector());
} else {
  new GmailInjector();
}