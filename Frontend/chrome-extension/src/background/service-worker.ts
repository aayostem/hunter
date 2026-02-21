// Background service worker for Chrome extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Suite extension installed');
  const today = new Date().toDateString();
  chrome.storage.local.set({
    trackingEnabled: true,
    lastResetDate: today,
    todayStats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 },
    userPlan: 'FREE'
  });
  // Keep-alive alarm
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Email Suite service worker started');
  resetStatsIfNewDay();
});

// Keep service worker alive (MV3 terminates after ~30s inactivity)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') resetStatsIfNewDay();
});

// --- Message listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'EMAIL_TRACKED':
      handleEmailTracked(request.payload).then(() => sendResponse({ ok: true }));
      break;
    case 'TRACKING_EVENT':
      handleTrackingEvent(request.payload).then(() => sendResponse({ ok: true }));
      break;
    case 'GET_SETTINGS':
      chrome.storage.local.get(['trackingEnabled', 'userPlan'], sendResponse);
      break;
  }
  return true; // keep message channel open for all async responses
});

// --- Handlers ---

async function handleEmailTracked(payload: any) {
  chrome.storage.local.get(['todayStats'], (result) => {
    const stats = result.todayStats || { emailsSent: 0, emailsOpened: 0, linksClicked: 0 };
    stats.emailsSent++;
    chrome.storage.local.set({ todayStats: stats });
    showTrackingNotification('Email tracked', `Tracking enabled for email to ${payload.recipient}`);
  });
}

async function handleTrackingEvent(payload: any) {
  const { eventType, data } = payload;

  chrome.storage.local.get(['todayStats'], (result) => {
    const stats = result.todayStats || { emailsSent: 0, emailsOpened: 0, linksClicked: 0 };

    if (eventType === 'email_opened') {
      stats.emailsOpened++;
      showTrackingNotification('Email opened', `Your email to ${data.recipient} was opened`);
    } else if (eventType === 'link_clicked') {
      stats.linksClicked++;
      showTrackingNotification('Link clicked', `Link clicked in email to ${data.recipient}`);
    }

    chrome.storage.local.set({ todayStats: stats });
  });
}

// --- Helpers ---

function showTrackingNotification(title: string, message: string) {
  chrome.storage.local.get(['trackingEnabled', 'userPlan'], (result) => {
    if (result.trackingEnabled && result.userPlan !== 'FREE') {
      // Fixed: unique ID prevents duplicate notifications
      chrome.notifications.create(`notif-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title,
        message
      });
    }
  });
}

function resetStatsIfNewDay() {
  chrome.storage.local.get(['lastResetDate'], (result) => {
    const today = new Date().toDateString();
    if (result.lastResetDate !== today) {
      chrome.storage.local.set({
        lastResetDate: today,
        todayStats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 }
      });
    }
  });
}