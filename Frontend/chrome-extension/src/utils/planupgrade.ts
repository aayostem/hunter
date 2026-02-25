// src/utils/planupgrade.ts

export interface PlanFeatures {
  maxTrackedEmails: number;
  hasAdvancedAnalytics: boolean;
  hasCustomDomain: boolean;
  hasTeamMembers: boolean;
  supportLevel: 'basic' | 'priority' | 'dedicated';
  trackingPixelType: 'basic' | 'advanced';
  retentionDays: number;
}
interface PlanData {
  id?: string;
  name?: string;
  status?: 'active' | 'expired' | 'cancelled' | 'trial';
  features?: {
    maxTrackedEmails?: number;
    hasAdvancedAnalytics?: boolean;
    hasCustomDomain?: boolean;
    hasTeamMembers?: boolean;
    supportLevel?: string;
    trackingPixelType?: string;
    retentionDays?: number;
  };
  expiresAt?: string | null;
  trialEndsAt?: string | null;
}


export interface UserPlan {
  id: string;
  name: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  features: PlanFeatures;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
}

export class PlanUpgradeManager {
  private currentPlan: UserPlan | null = null;
  private apiEndpoint: string;
  private upgradeCallbacks: ((plan: UserPlan) => void)[] = [];

  constructor(apiEndpoint: string = 'https://api.emailsuite.com') {
    this.apiEndpoint = apiEndpoint;
    this.loadCurrentPlan();
  }

  private async loadCurrentPlan(): Promise<void> {
    try {
      // Load from chrome.storage first
      const result = await this.getFromStorage('userPlan');
      if (result) {
        this.currentPlan = JSON.parse(result);
      } else {
        // Fetch from API
        await this.fetchPlanFromAPI();
      }
    } catch (error) {
      console.error('Failed to load current plan:', error);
      // Set default free plan
      this.currentPlan = this.getDefaultPlan();
    }
  }

  private getFromStorage(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
resolve((result[key] as string) || null);      });
    });
  }

private saveToStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    // We stringify T to store it as a JSON string
    chrome.storage.local.set({ [key]: JSON.stringify(value) }, () => {
      resolve();
    });
  });
}
  private async fetchPlanFromAPI(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/user/plan`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const planData = await response.json();
        this.currentPlan = this.parsePlanData(planData);
        await this.saveToStorage('userPlan', this.currentPlan);
      } else {
        this.currentPlan = this.getDefaultPlan();
      }
    } catch (error) {
      console.error('API fetch failed:', error);
      this.currentPlan = this.getDefaultPlan();
    }
  }

  private getAuthToken(): Promise<string> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
resolve((result.authToken as string) || '');      });
    });
  }

private parsePlanData(data: PlanData): UserPlan {
  return {
    id: data.id || 'free-plan',
    // Cast the string/default to the specific Literal Type
    name: (data.name || 'free') as "free" | "starter" | "professional" | "enterprise",
    status: data.status || 'active',
    features: {
      maxTrackedEmails: data.features?.maxTrackedEmails || 100,
      hasAdvancedAnalytics: data.features?.hasAdvancedAnalytics || false,
      hasCustomDomain: data.features?.hasCustomDomain || false,
      hasTeamMembers: data.features?.hasTeamMembers || false,
      // Cast the support level
      supportLevel: (data.features?.supportLevel || 'basic') as "basic" | "priority" | "dedicated",
      // Cast the tracking pixel type
      trackingPixelType: (data.features?.trackingPixelType || 'basic') as "basic" | "advanced",
      retentionDays: data.features?.retentionDays || 30
    },
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null
  };
}

  private getDefaultPlan(): UserPlan {
    return {
      id: 'free-plan',
      name: 'free',
      status: 'active',
      features: {
        maxTrackedEmails: 100,
        hasAdvancedAnalytics: false,
        hasCustomDomain: false,
        hasTeamMembers: false,
        supportLevel: 'basic',
        trackingPixelType: 'basic',
        retentionDays: 30
      },
      expiresAt: null,
      trialEndsAt: null
    };
  }

  public getCurrentPlan(): UserPlan | null {
    return this.currentPlan;
  }

  public canTrackEmail(): boolean {
    if (!this.currentPlan) return false;
    
    // Check if plan is active
    if (this.currentPlan.status !== 'active' && this.currentPlan.status !== 'trial') {
      return false;
    }

    // Check if expired
    if (this.currentPlan.expiresAt && this.currentPlan.expiresAt < new Date()) {
      return false;
    }

    // Check trial expiration
    if (this.currentPlan.trialEndsAt && this.currentPlan.trialEndsAt < new Date()) {
      return false;
    }

    return true;
  }

  public getFeatureLimit(): PlanFeatures {
    return this.currentPlan?.features || this.getDefaultPlan().features;
  }

  public async upgradePlan(planId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/plan/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ planId })
      });

      if (response.ok) {
        const newPlanData = await response.json();
        this.currentPlan = this.parsePlanData(newPlanData);
        await this.saveToStorage('userPlan', this.currentPlan);
        
        // Notify listeners
        this.upgradeCallbacks.forEach(callback => callback(this.currentPlan!));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Upgrade failed:', error);
      return false;
    }
  }

  public onPlanUpgraded(callback: (plan: UserPlan) => void): void {
    this.upgradeCallbacks.push(callback);
  }

  public showUpgradeModal(feature: string): void {
    const modal = document.createElement('div');
    modal.className = 'email-suite-upgrade-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #1F2937;">
          Upgrade Required
        </h2>
        <p style="color: #6B7280; margin-bottom: 24px;">
          ${feature} is only available on paid plans. Upgrade to unlock this feature and more!
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="email-suite-upgrade-cancel" style="
            padding: 10px 20px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            background: white;
            color: #4B5563;
            cursor: pointer;
          ">Maybe Later</button>
          <button id="email-suite-upgrade-confirm" style="
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background: #3B82F6;
            color: white;
            cursor: pointer;
          ">View Plans</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('email-suite-upgrade-cancel')?.addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('email-suite-upgrade-confirm')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiEndpoint}/pricing` });
      modal.remove();
    });
  }
}
