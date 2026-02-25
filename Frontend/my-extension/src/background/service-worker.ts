// --- Interfaces & Types ---

interface TrackingStats {
  emailsSent: number;
  emailsOpened: number;
  linksClicked: number;
}

interface TrackingPayload {
  recipient: string;
  eventType?: 'email_opened' | 'link_clicked';
  data?: {
    recipient: string;
  };
}

interface MessageRequest {
  type: 'EMAIL_TRACKED' | 'TRACKING_EVENT' | 'GET_SETTINGS';
  payload?: any; // Used as a base; casted in the listener
}

interface StorageResult {
  trackingEnabled?: boolean;
  userPlan?: string;
  todayStats?: TrackingStats;
  lastResetDate?: string;
}

// --- Lifecycle Listeners ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Suite extension installed');
  const today = new Date().toDateString();
  const initialState: StorageResult = {
    trackingEnabled: true,
    lastResetDate: today,
    todayStats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 },
    userPlan: 'FREE'
  };
  chrome.storage.local.set(initialState);
  
  // Keep-alive alarm to prevent Service Worker hibernation
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Email Suite service worker started');
  resetStatsIfNewDay();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    resetStatsIfNewDay();
  }
});

// --- Message listener ---

chrome.runtime.onMessage.addListener((
  request: MessageRequest, 
  _sender: chrome.runtime.MessageSender, // Fixed: Added underscore to ignore unused variable
  sendResponse: (response: { ok?: boolean; trackingEnabled?: boolean; userPlan?: string }) => void
) => {
  switch (request.type) {
    case 'EMAIL_TRACKED':
      handleEmailTracked(request.payload as TrackingPayload)
        .then(() => sendResponse({ ok: true }));
      break;

    case 'TRACKING_EVENT':
      handleTrackingEvent(request.payload as TrackingPayload)
        .then(() => sendResponse({ ok: true }));
      break;

    case 'GET_SETTINGS':
      chrome.storage.local.get(['trackingEnabled', 'userPlan'], (result: StorageResult) => {
        sendResponse({
          trackingEnabled: result.trackingEnabled,
          userPlan: result.userPlan
        });
      });
      break;
  }
  
  // Return true to keep the message channel open for asynchronous sendResponse
  return true; 
});

// --- Logic Handlers ---

async function handleEmailTracked(payload: TrackingPayload): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['todayStats'], (result: StorageResult) => {
      const stats = result.todayStats || { emailsSent: 0, emailsOpened: 0, linksClicked: 0 };
      stats.emailsSent++;
      
      chrome.storage.local.set({ todayStats: stats }, () => {
        showTrackingNotification(
          'Email tracked', 
          `Tracking enabled for email to ${payload.recipient}`
        );
        resolve();
      });
    });
  });
}

async function handleTrackingEvent(payload: TrackingPayload): Promise<void> {
  const { eventType, data } = payload;
  if (!data) return;

  return new Promise((resolve) => {
    chrome.storage.local.get(['todayStats'], (result: StorageResult) => {
      const stats = result.todayStats || { emailsSent: 0, emailsOpened: 0, linksClicked: 0 };

      if (eventType === 'email_opened') {
        stats.emailsOpened++;
        showTrackingNotification('Email opened', `Your email to ${data.recipient} was opened`);
      } else if (eventType === 'link_clicked') {
        stats.linksClicked++;
        showTrackingNotification('Link clicked', `Link clicked in email to ${data.recipient}`);
      }

      chrome.storage.local.set({ todayStats: stats }, resolve);
    });
  });
}

// --- Helpers ---

function showTrackingNotification(title: string, message: string): void {
  chrome.storage.local.get(['trackingEnabled', 'userPlan'], (result: StorageResult) => {
    // Only show notifications for paid users as per original logic
    if (result.trackingEnabled && result.userPlan !== 'FREE') {
      chrome.notifications.create(`notif-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png', // Ensure this path is correct in your manifest
        title,
        message,
        priority: 2
      });
    }
  });
}

function resetStatsIfNewDay(): void {
  chrome.storage.local.get(['lastResetDate'], (result: StorageResult) => {
    const today = new Date().toDateString();
    if (result.lastResetDate !== today) {
      const resetState: StorageResult = {
        lastResetDate: today,
        todayStats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 }
      };
      chrome.storage.local.set(resetState);
    }
  });
}