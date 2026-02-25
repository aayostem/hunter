import { GmailObserver } from '../utils/gmail-observer';
import { TrackingManager } from '../utils/tracking-manager';
import type { GmailComposeWindow, GmailEmailElement } from '../types/gmail';
const GMAIL_NAV_SELECTOR = '[role="navigation"]';
const WAIT_INTERVAL_MS = 500;
const WAIT_TIMEOUT_MS = 30000; // 30s max wait

class GmailInjector {
  private trackingManager: TrackingManager;
  private observer: GmailObserver;
  private initialized = false;

  constructor() {
    this.trackingManager = new TrackingManager();
    this.observer = new GmailObserver();
    this.init();
  }

  private async init(): Promise<void> {
    // Guard against double initialization (e.g. hot reload, multiple script injections)
    if (this.initialized) return;

    try {
      // Check if tracking is enabled before doing any work
      const enabled = await this.isTrackingEnabled();
      if (!enabled) {
        console.log('Email Suite: tracking disabled, skipping injection');
        return;
      }

      await this.waitForGmail();
      this.injectComposeTracking();
      this.injectTrackingIndicators();
      this.initialized = true;
      console.log('Email Suite: Gmail injection complete');
    } catch (error) {
      console.error('Email Suite: Failed to initialize Gmail injector:', error);
    }
  }

  private isTrackingEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['trackingEnabled'], (result) => {
        resolve(result.trackingEnabled !== false); // default true
      });
    });
  }

  private waitForGmail(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Resolve immediately if Gmail is already loaded
      if (document.querySelector(GMAIL_NAV_SELECTOR)) {
        resolve();
        return;
      }

      const start = Date.now();
      const interval = setInterval(() => {
        if (document.querySelector(GMAIL_NAV_SELECTOR)) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > WAIT_TIMEOUT_MS) {
          clearInterval(interval);
          reject(new Error(`Gmail UI not found within ${WAIT_TIMEOUT_MS}ms`));
        }
      }, WAIT_INTERVAL_MS);
    });
  }

  private injectComposeTracking(): void {
    this.observer.observeComposeWindows((composeWindow: GmailComposeWindow) => {
      try {
        this.trackingManager.injectTrackingIntoCompose(composeWindow);
      } catch (e) {
        console.error('Email Suite: error injecting compose tracking:', e);
      }
    });
  }

  private injectTrackingIndicators(): void {
    this.observer.observeEmailList((emailElement: GmailEmailElement) => {
      try {
        this.trackingManager.addTrackingIndicator(emailElement);
      } catch (e) {
        console.error('Email Suite: error adding tracking indicator:', e);
      }
    });
  }

  public destroy(): void {
    this.observer.disconnect();
    this.initialized = false;
    console.log('Email Suite: Gmail injector destroyed');
  }
}

// Store instance so it can be destroyed externally if needed
let injector: GmailInjector | null = null;

function bootstrap() {
  // Guard against re-injection if content script runs multiple times
  if (injector) {
    injector.destroy();
  }
  injector = new GmailInjector();
}

// Listen for settings changes and re-initialize if tracking is toggled on
chrome.storage.onChanged.addListener((changes) => {
  if (changes.trackingEnabled) {
    bootstrap();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}