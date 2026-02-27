import storage from '../utils/storage.js';
import api from '../utils/api.js';
import {
  LIVE_COACHING_MAX_ITEMS,
  LOCAL_FRAME_RECORDER_ENDPOINT,
  SEVERITY,
  TIMING,
} from '../utils/constants.js';

/**
 * Background service worker.
 * Handles frame analysis, notifications, and session lifecycle.
 */

let currentSession = null;
let lastNotificationTime = 0;
let lastErrorNotificationTime = 0;
let lastFrameRecorderErrorTime = 0;
let frameRecorderConnected = true;
let consecutiveWarnings = createWarningTracker();
let sessionRestored = false;
let analysisRuntime = createAnalysisRuntime();

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

function createAnalysisRuntime() {
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
  };
}

function markAnalysisFailure(errorMessage) {
  analysisRuntime.failed += 1;
  analysisRuntime.lastFailureAt = Date.now();
  analysisRuntime.lastError = errorMessage || 'Unknown analysis error';
}

function normalizeScore(rawScore) {
  if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    return rawScore;
  }

  if (typeof rawScore === 'string') {
    const match = rawScore.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return Number.NaN;
}

function getSensitivityThresholds(sensitivity) {
  if (sensitivity === 'high') {
    return { critical: SEVERITY.CRITICAL, warning: SEVERITY.WARNING };
  }

  if (sensitivity === 'low') {
    return { critical: SEVERITY.CRITICAL, warning: SEVERITY.CRITICAL };
  }

  // medium
  return { critical: SEVERITY.CRITICAL, warning: SEVERITY.WARNING };
}

async function getNotificationPermissionLevel() {
  return new Promise((resolve) => {
    try {
      chrome.notifications.getPermissionLevel((level) => {
        if (chrome.runtime.lastError) {
          resolve('unknown');
          return;
        }
        resolve(level || 'unknown');
      });
    } catch {
      resolve('unknown');
    }
  });
}

async function appendLiveCoachingItem(entry) {
  try {
    const current = await storage.getLiveCoachingFeed();
    const next = [entry, ...current].slice(0, LIVE_COACHING_MAX_ITEMS);
    await storage.saveLiveCoachingFeed(next);
  } catch (error) {
    console.warn('Failed to append live coaching item:', error);
  }
}

async function saveFrameToLocalProjectFolder(frameData, sessionId, timestamp) {
  try {
    const response = await fetch(LOCAL_FRAME_RECORDER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frameData,
        sessionId,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Recorder responded with ${response.status}`);
    }

    if (!frameRecorderConnected) {
      frameRecorderConnected = true;
      await appendLiveCoachingItem({
        id: `frame-recorder-restored-${Date.now()}`,
        title: 'Picture Saver Connected',
        message: 'Frames are being saved to project folder: pictures/',
        category: 'system',
        timestamp: Date.now(),
        delivery: 'in-app',
      });
    }
  } catch (error) {
    const now = Date.now();
    const shouldReport = now - lastFrameRecorderErrorTime > 120000;
    if (shouldReport) {
      lastFrameRecorderErrorTime = now;
      frameRecorderConnected = false;
      await appendLiveCoachingItem({
        id: `frame-recorder-error-${now}`,
        title: 'Picture Saver Offline',
        message: 'Run `npm run frame-recorder` to save camera pictures into project/pictures.',
        category: 'system',
        timestamp: now,
        delivery: 'in-app',
      });
    }
    console.warn('Local frame recorder unavailable:', error);
  }
}

async function showNotification(title, message, priority = 1, idPrefix = 'coach', options = {}) {
  const { recordToFeed = true, category = 'info' } = options;
  const permission = await getNotificationPermissionLevel();
  const timestamp = Date.now();

  if (permission === 'denied') {
    analysisRuntime.lastError = 'Chrome notifications are blocked for this extension';
    if (recordToFeed) {
      await appendLiveCoachingItem({
        id: `${idPrefix}-${timestamp}`,
        title,
        message,
        category,
        timestamp,
        delivery: 'blocked',
      });
    }
    return false;
  }

  const notificationId = `${idPrefix}-${timestamp}`;
  return new Promise((resolve) => {
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority,
      requireInteraction: false,
    }, (id) => {
      if (chrome.runtime.lastError) {
        analysisRuntime.lastError = `Notification failed: ${chrome.runtime.lastError.message}`;
        if (recordToFeed) {
          appendLiveCoachingItem({
            id: notificationId,
            title,
            message,
            category,
            timestamp,
            delivery: 'failed',
          }).finally(() => resolve(false));
          return;
        }
        resolve(false);
        return;
      }
      if (recordToFeed) {
        appendLiveCoachingItem({
          id: notificationId,
          title,
          message,
          category,
          timestamp,
          delivery: 'shown',
        }).finally(() => resolve(Boolean(id)));
        return;
      }
      resolve(Boolean(id));
    });
  });
}

function validateAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') return false;

  const categories = ['posture', 'facial', 'hands', 'appearance'];
  return categories.every((category) => {
    const score = normalizeScore(analysis[category]?.score);
    if (Number.isFinite(score)) {
      analysis[category].score = score;
    }
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

  const settings = await storage.getSettings();
  if (settings.monitoringEnabled === false) {
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

  analysisRuntime = createAnalysisRuntime();
  consecutiveWarnings = createWarningTracker();
  await storage.saveCurrentSession(currentSession);
  await appendLiveCoachingItem({
    id: `meeting-start-${message.timestamp}`,
    title: 'Meeting Monitoring Started',
    message: 'Live coaching is now tracking your meeting.',
    category: 'system',
    timestamp: message.timestamp,
    delivery: 'in-app',
  });

  console.log('Meeting started:', currentSession.id);
}

async function checkForIssues(analysis, settings) {
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

  const now = Date.now();
  const cooldownExpired = now - lastNotificationTime > TIMING.NOTIFICATION_COOLDOWN;

  if (criticalIssues.length > 0) {
    const suggestions = criticalIssues.map((issue) => issue.suggestion).filter(Boolean);
    const message = suggestions.length
      ? suggestions.join('; ')
      : 'Critical body language issue detected.';

    await appendLiveCoachingItem({
      id: `critical-${now}`,
      title: 'Critical Body Language Alert',
      message,
      category: 'critical',
      timestamp: now,
      delivery: 'in-app',
    });

    if (!settings.notificationsEnabled || !cooldownExpired) {
      return;
    }

    const shown = await showNotification('Critical Body Language Alert', message, 2, 'coach', {
      recordToFeed: false,
      category: 'critical',
    });
    if (shown) {
      lastNotificationTime = now;
    }
    return;
  }

  if (warningIssues.length > 0) {
    const suggestions = warningIssues.map((issue) => issue.suggestion).filter(Boolean);
    const message = suggestions.length
      ? suggestions.join('; ')
      : 'Body language needs improvement.';

    await appendLiveCoachingItem({
      id: `warning-${now}`,
      title: 'Body Language Tip',
      message,
      category: 'warning',
      timestamp: now,
      delivery: 'in-app',
    });

    if (!settings.notificationsEnabled || !cooldownExpired) {
      return;
    }

    const shown = await showNotification('Body Language Tip', message, 1, 'coach', {
      recordToFeed: false,
      category: 'warning',
    });
    if (shown) {
      lastNotificationTime = now;
    }
  }
}

async function handleFrameAnalysis(message) {
  if (!currentSession) {
    await handleMeetingStarted({ timestamp: message.timestamp || Date.now() });
  }

  try {
    const settings = await storage.getSettings();
    if (settings.monitoringEnabled === false) {
      return;
    }

    analysisRuntime.attempted += 1;
    analysisRuntime.lastAttemptAt = Date.now();

    if (!settings.apiKey) {
      markAnalysisFailure('API key missing in saved settings');
      if (!currentSession.noKeyWarningShown) {
        await showNotification('Setup Required', 'Please add your API key in the extension popup.', 1, 'coach', {
          category: 'error',
        });
        currentSession.noKeyWarningShown = true;
        await storage.saveCurrentSession(currentSession);
      }
      return;
    }

    void saveFrameToLocalProjectFolder(message.frame, currentSession?.id || 'session', message.timestamp || Date.now());

    const analysis = await api.analyze(message.frame, settings.apiKey, settings.apiProvider);

    if (!validateAnalysis(analysis)) {
      throw new Error('Invalid analysis response structure');
    }

    analysis.timestamp = message.timestamp || Date.now();
    currentSession.analyses.push(analysis);
    analysisRuntime.succeeded += 1;
    analysisRuntime.lastSuccessAt = Date.now();
    analysisRuntime.lastError = null;

    await storage.saveCurrentSession(currentSession);
    await checkForIssues(analysis, settings);
  } catch (error) {
    console.error('Frame analysis error:', error);
    markAnalysisFailure(error.message);

    const now = Date.now();
    const isRateLimit = error.message?.toLowerCase().includes('rate limit');
    const errorCooldownExpired = now - lastErrorNotificationTime > TIMING.NOTIFICATION_COOLDOWN;
    if (!isRateLimit && errorCooldownExpired) {
      lastErrorNotificationTime = now;
      await showNotification(
        'Analysis Error',
        'Failed to analyze frame. Check your API key, provider, and network connection.',
        1,
        'coach',
        { category: 'error' },
      );
    }
  }
}

async function stopCurrentSessionSilently(endTimestamp = Date.now()) {
  if (!currentSession) {
    await storage.clearCurrentSession();
    return;
  }

  currentSession.endTime = endTimestamp;
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
  currentSession = null;
  consecutiveWarnings = createWarningTracker();
}

async function handleMonitoringToggle(enabled) {
  await storage.saveSettings({ monitoringEnabled: enabled });

  if (!enabled) {
    await stopCurrentSessionSilently();
    await appendLiveCoachingItem({
      id: `monitoring-off-${Date.now()}`,
      title: 'Monitoring Turned Off',
      message: 'Live coaching is paused until you turn it back on.',
      category: 'system',
      timestamp: Date.now(),
      delivery: 'in-app',
    });
  } else {
    await appendLiveCoachingItem({
      id: `monitoring-on-${Date.now()}`,
      title: 'Monitoring Turned On',
      message: 'Open Google Meet to resume live coaching.',
      category: 'system',
      timestamp: Date.now(),
      delivery: 'in-app',
    });
  }

  return { ok: true, monitoringEnabled: enabled };
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

  const endedAt = currentSession.endTime;
  await storage.clearCurrentSession();

  if (hasData) {
    const durationMin = Math.max(
      1,
      Math.round((currentSession.endTime - currentSession.startTime) / 1000 / 60),
    );

    await showNotification(
      'Meeting Ended',
      `${durationMin} minutes monitored. Opening summary report.`,
      1,
      'summary-ready',
      { category: 'system' },
    );

    chrome.tabs.create({ url: chrome.runtime.getURL('summary/summary.html') });
  }

  currentSession = null;
  consecutiveWarnings = createWarningTracker();
  await appendLiveCoachingItem({
    id: `meeting-end-${endedAt}`,
    title: 'Meeting Monitoring Ended',
    message: hasData ? 'Summary report is ready.' : 'No analyzable frames captured this session.',
    category: 'system',
    timestamp: endedAt,
    delivery: 'in-app',
  });
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
        case 'SET_MONITORING':
          sendResponse(await handleMonitoringToggle(Boolean(message.enabled)));
          return;
        case 'REQUEST_STATUS':
          {
            const settings = await storage.getSettings();
            const monitoringEnabled = settings.monitoringEnabled !== false;
            sendResponse({
              active: monitoringEnabled && Boolean(currentSession),
              sessionId: currentSession?.id || null,
              analyses: currentSession?.analyses?.length || 0,
              apiConfigured: Boolean(settings.apiKey),
              apiProvider: settings.apiProvider,
              monitoringEnabled,
              notificationsEnabled: settings.notificationsEnabled !== false,
              notificationPermission: await getNotificationPermissionLevel(),
              analysisRuntime: { ...analysisRuntime },
            });
            return;
          }
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
