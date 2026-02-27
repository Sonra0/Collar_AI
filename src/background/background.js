import storage from '../utils/storage.js';
import api from '../utils/api.js';
import { SEVERITY, TIMING } from '../utils/constants.js';

/**
 * Background service worker.
 * Handles frame analysis, notifications, and session lifecycle.
 */

let currentSession = null;
let lastNotificationTime = 0;
let lastErrorNotificationTime = 0;
let consecutiveWarnings = createWarningTracker();
let sessionRestored = false;

async function restoreSession() {
  if (sessionRestored) return;
  sessionRestored = true;

  const session = await storage.getCurrentSession();
  if (session && !currentSession) {
    currentSession = session;
  }
}

function createWarningTracker() {
  return {
    posture: 0,
    facial: 0,
    hands: 0,
    appearance: 0,
  };
}

function getSensitivityThresholds(sensitivity) {
  if (sensitivity === 'high') {
    return { critical: SEVERITY.CRITICAL, warning: SEVERITY.WARNING };
  }

  if (sensitivity === 'low') {
    return { critical: SEVERITY.CRITICAL, warning: SEVERITY.CRITICAL };
  }

  // medium
  return { critical: SEVERITY.CRITICAL, warning: 6 };
}

function showNotification(title, message, priority = 1, idPrefix = 'coach') {
  const notificationId = `${idPrefix}-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority,
    requireInteraction: false,
  });
}

function validateAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') return false;

  const categories = ['posture', 'facial', 'hands', 'appearance'];
  return categories.every((category) => {
    const score = Number(analysis[category]?.score);
    return Number.isFinite(score) && score >= 0 && score <= 10;
  });
}

async function applyDataRetention(retentionDays) {
  if (!retentionDays || retentionDays <= 0) return;

  const sessions = await storage.getSessions();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const filtered = sessions.filter((session) => (session.endTime || 0) >= cutoff);

  if (filtered.length !== sessions.length) {
    await storage.saveSessions(filtered);
  }
}

async function handleMeetingStarted(message) {
  if (currentSession) {
    return;
  }

  await storage.clearSummarySession();

  currentSession = {
    id: `session_${message.timestamp}`,
    startTime: message.timestamp,
    endTime: null,
    analyses: [],
    noKeyWarningShown: false,
  };

  consecutiveWarnings = createWarningTracker();
  await storage.saveCurrentSession(currentSession);

  console.log('Meeting started:', currentSession.id);
}

function checkForIssues(analysis, settings) {
  const categories = ['posture', 'facial', 'hands', 'appearance'];
  const criticalIssues = [];
  const warningIssues = [];

  const thresholds = getSensitivityThresholds(settings.sensitivity);

  categories.forEach((category) => {
    const result = analysis[category];
    if (!result) return;

    if (result.score < thresholds.critical) {
      criticalIssues.push({ category, ...result });
      consecutiveWarnings[category] = 0;
      return;
    }

    if (thresholds.warning > thresholds.critical && result.score < thresholds.warning) {
      consecutiveWarnings[category] += 1;

      if (consecutiveWarnings[category] >= TIMING.CONSECUTIVE_WARNINGS) {
        warningIssues.push({ category, ...result });
        consecutiveWarnings[category] = 0;
      }

      return;
    }

    consecutiveWarnings[category] = 0;
  });

  if (!settings.notificationsEnabled) {
    return;
  }

  const now = Date.now();
  const cooldownExpired = now - lastNotificationTime > TIMING.NOTIFICATION_COOLDOWN;
  if (!cooldownExpired) {
    return;
  }

  if (criticalIssues.length > 0) {
    const suggestions = criticalIssues.map((issue) => issue.suggestion).filter(Boolean);
    const message = suggestions.length
      ? suggestions.join('; ')
      : 'Critical body language issue detected.';

    showNotification('Critical Body Language Alert', message, 2);
    lastNotificationTime = now;
    return;
  }

  if (warningIssues.length > 0) {
    const suggestions = warningIssues.map((issue) => issue.suggestion).filter(Boolean);
    const message = suggestions.length
      ? suggestions.join('; ')
      : 'Body language needs improvement.';

    showNotification('Body Language Tip', message, 1);
    lastNotificationTime = now;
  }
}

async function handleFrameAnalysis(message) {
  if (!currentSession) {
    await handleMeetingStarted({ timestamp: message.timestamp || Date.now() });
  }

  try {
    const settings = await storage.getSettings();

    if (!settings.apiKey) {
      if (!currentSession.noKeyWarningShown) {
        showNotification('Setup Required', 'Please add your API key in the extension popup.', 1);
        currentSession.noKeyWarningShown = true;
        await storage.saveCurrentSession(currentSession);
      }
      return;
    }

    const analysis = await api.analyze(message.frame, settings.apiKey, settings.apiProvider);

    if (!validateAnalysis(analysis)) {
      throw new Error('Invalid analysis response structure');
    }

    analysis.timestamp = message.timestamp || Date.now();
    currentSession.analyses.push(analysis);

    await storage.saveCurrentSession(currentSession);
    checkForIssues(analysis, settings);
  } catch (error) {
    console.error('Frame analysis error:', error);

    const now = Date.now();
    const isRateLimit = error.message?.toLowerCase().includes('rate limit');
    const errorCooldownExpired = now - lastErrorNotificationTime > TIMING.NOTIFICATION_COOLDOWN;
    if (!isRateLimit && errorCooldownExpired) {
      lastErrorNotificationTime = now;
      showNotification(
        'Analysis Error',
        'Failed to analyze frame. Check your API key, provider, and network connection.',
        1,
      );
    }
  }
}

async function handleMeetingEnded(message) {
  if (!currentSession) return;

  currentSession.endTime = message.timestamp || Date.now();

  const settings = await storage.getSettings();
  const hasData = currentSession.analyses.length > 0;

  if (hasData) {
    await storage.saveSummarySession(currentSession);

    if (!settings.ephemeralMode) {
      await storage.addSession(currentSession);
      await applyDataRetention(settings.dataRetentionDays);
    }
  } else {
    await storage.clearSummarySession();
  }

  await storage.clearCurrentSession();

  if (hasData) {
    const durationMin = Math.max(
      1,
      Math.round((currentSession.endTime - currentSession.startTime) / 1000 / 60),
    );

    showNotification(
      'Meeting Ended',
      `${durationMin} minutes monitored. Opening summary report.`,
      1,
      'summary-ready',
    );

    chrome.tabs.create({ url: chrome.runtime.getURL('summary/summary.html') });
  }

  currentSession = null;
  consecutiveWarnings = createWarningTracker();
}

// Restore session on every worker wake-up, not just on install/update.
restoreSession();

chrome.runtime.onInstalled.addListener(async () => {
  await storage.getSettings();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    await restoreSession();
    try {
      switch (message.type) {
        case 'MEETING_STARTED':
          await handleMeetingStarted(message);
          sendResponse({ ok: true });
          return;
        case 'ANALYZE_FRAME':
          await handleFrameAnalysis(message);
          sendResponse({ ok: true });
          return;
        case 'MEETING_ENDED':
          await handleMeetingEnded(message);
          sendResponse({ ok: true });
          return;
        case 'REQUEST_STATUS':
          sendResponse({
            active: Boolean(currentSession),
            sessionId: currentSession?.id || null,
            analyses: currentSession?.analyses?.length || 0,
          });
          return;
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});

console.log('Meeting Body Language Coach: background worker loaded');
