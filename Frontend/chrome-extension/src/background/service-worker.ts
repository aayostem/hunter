// Background service worker for Chrome extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("Email Suite extension installed");

  // Initialize default settings
  chrome.storage.local.set({
    trackingEnabled: true,
    todayStats: {
      emailsSent: 0,
      emailsOpened: 0,
      linksClicked: 0,
    },
    userPlan: "FREE",
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "EMAIL_TRACKED":
      handleEmailTracked(request.payload);
      break;

    case "TRACKING_EVENT":
      handleTrackingEvent(request.payload);
      break;

    case "GET_SETTINGS":
      chrome.storage.local.get(["trackingEnabled", "userPlan"], sendResponse);
      return true; // Will respond asynchronously
  }
});

function handleEmailTracked(payload: any) {
  // Update today's stats
  chrome.storage.local.get(["todayStats"], (result) => {
    const stats = result.todayStats || {
      emailsSent: 0,
      emailsOpened: 0,
      linksClicked: 0,
    };
    stats.emailsSent++;

    chrome.storage.local.set({ todayStats: stats });

    // Show desktop notification for premium users
    showTrackingNotification(
      "Email tracked",
      `Tracking enabled for email to ${payload.recipient}`
    );
  });
}

function handleTrackingEvent(payload: any) {
  const { eventType, trackingId, data } = payload;

  // Update stats based on event type
  chrome.storage.local.get(["todayStats"], (result) => {
    const stats = result.todayStats || {
      emailsSent: 0,
      emailsOpened: 0,
      linksClicked: 0,
    };

    if (eventType === "email_opened") {
      stats.emailsOpened++;
      showTrackingNotification(
        "Email opened",
        `Your email to ${data.recipient} was opened`
      );
    } else if (eventType === "link_clicked") {
      stats.linksClicked++;
      showTrackingNotification(
        "Link clicked",
        `Link clicked in email to ${data.recipient}`
      );
    }

    chrome.storage.local.set({ todayStats: stats });
  });
}

function showTrackingNotification(title: string, message: string) {
  chrome.storage.local.get(["trackingEnabled", "userPlan"], (result) => {
    if (result.trackingEnabled && result.userPlan !== "FREE") {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: title,
        message: message,
      });
    }
  });
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log("Email Suite service worker started");
});
