import storage from '../utils/storage.js';
import api from '../utils/api.js';
import {
  LIVE_COACHING_MAX_ITEMS,
  LOCAL_FRAME_RECORDER_ENDPOINT,
  SEVERITY,
  TIMING,
} from '../utils/constants.js';
import { extractPrioritySuggestions } from '../utils/suggestions.mjs';
import { resolveLanguage } from '../utils/i18n.js';

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

const LANG_EN = 'en-CA';
const LANG_FR = 'fr-FR';

const BG_TEXT = {
  pictureSaverConnectedTitle: {
    [LANG_EN]: 'Picture Saver Connected',
    [LANG_FR]: 'Enregistreur d\'images connecte',
  },
  pictureSaverConnectedMessage: {
    [LANG_EN]: 'Frames are being saved to project folder: pictures/',
    [LANG_FR]: 'Les images sont enregistrees dans le dossier du projet : pictures/',
  },
  pictureSaverOfflineTitle: {
    [LANG_EN]: 'Picture Saver Offline',
    [LANG_FR]: 'Enregistreur d\'images hors ligne',
  },
  pictureSaverOfflineMessage: {
    [LANG_EN]: 'Run `npm run frame-recorder` to save camera pictures into project/pictures.',
    [LANG_FR]: 'Lancez `npm run frame-recorder` pour enregistrer les images camera dans project/pictures.',
  },
  meetingStartTitle: {
    [LANG_EN]: 'Meeting Monitoring Started',
    [LANG_FR]: 'Suivi de reunion demarre',
  },
  meetingStartMessage: {
    [LANG_EN]: 'Live coaching is now tracking your meeting.',
    [LANG_FR]: 'Le coaching en direct suit maintenant votre reunion.',
  },
  criticalTitle: {
    [LANG_EN]: 'Critical Body Language Alert',
    [LANG_FR]: 'Alerte critique de langage corporel',
  },
  criticalFallback: {
    [LANG_EN]: 'Critical body language issue detected.',
    [LANG_FR]: 'Probleme critique de langage corporel detecte.',
  },
  warningTitle: {
    [LANG_EN]: 'Body Language Tip',
    [LANG_FR]: 'Conseil de langage corporel',
  },
  warningFallback: {
    [LANG_EN]: 'Body language needs improvement.',
    [LANG_FR]: 'Le langage corporel doit etre ameliore.',
  },
  setupRequiredTitle: {
    [LANG_EN]: 'Setup Required',
    [LANG_FR]: 'Configuration requise',
  },
  setupRequiredMessage: {
    [LANG_EN]: 'Please add your API key in the extension popup.',
    [LANG_FR]: 'Ajoutez votre cle API dans la fenetre de l\'extension.',
  },
  analysisErrorTitle: {
    [LANG_EN]: 'Analysis Error',
    [LANG_FR]: 'Erreur d\'analyse',
  },
  analysisErrorMessage: {
    [LANG_EN]: 'Failed to analyze frame. Check your API key, provider, and network connection.',
    [LANG_FR]: 'Echec de l\'analyse de l\'image. Verifiez la cle API, le fournisseur et la connexion reseau.',
  },
  monitoringOffTitle: {
    [LANG_EN]: 'Monitoring Turned Off',
    [LANG_FR]: 'Surveillance desactivee',
  },
  monitoringOffMessage: {
    [LANG_EN]: 'Live coaching is paused until you turn it back on.',
    [LANG_FR]: 'Le coaching en direct est en pause jusqu\'a reactivation.',
  },
  monitoringOnTitle: {
    [LANG_EN]: 'Monitoring Turned On',
    [LANG_FR]: 'Surveillance activee',
  },
  monitoringOnMessage: {
    [LANG_EN]: 'Open Google Meet to resume live coaching.',
    [LANG_FR]: 'Ouvrez Google Meet pour reprendre le coaching en direct.',
  },
  meetingEndedTitle: {
    [LANG_EN]: 'Meeting Ended',
    [LANG_FR]: 'Reunion terminee',
  },
  meetingEndedMessage: {
    [LANG_EN]: '{duration} minutes monitored. Opening summary report.',
    [LANG_FR]: '{duration} minutes suivies. Ouverture du rapport de resume.',
  },
  meetingEndFeedTitle: {
    [LANG_EN]: 'Meeting Monitoring Ended',
    [LANG_FR]: 'Suivi de reunion termine',
  },
  meetingEndFeedMessageReady: {
    [LANG_EN]: 'Summary report is ready.',
    [LANG_FR]: 'Le rapport de resume est pret.',
  },
  meetingEndFeedMessageEmpty: {
    [LANG_EN]: 'No analyzable frames captured this session.',
    [LANG_FR]: 'Aucune image exploitable capturee pendant cette session.',
  },
};

function otherLanguage(language) {
  return resolveLanguage(language) === LANG_FR ? LANG_EN : LANG_FR;
}

function bgText(key, language, vars = {}) {
  const lang = resolveLanguage(language);
  const template = BG_TEXT[key]?.[lang] || BG_TEXT[key]?.[LANG_EN] || '';
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(vars, token)) {
      return String(vars[token]);
    }
    return '';
  });
}

function buildStaticLanguageMap(key, vars = {}) {
  return {
    [LANG_EN]: bgText(key, LANG_EN, vars),
    [LANG_FR]: bgText(key, LANG_FR, vars),
  };
}

async function buildBilingualTextMap(text, sourceLanguage, settings) {
  const source = resolveLanguage(sourceLanguage);
  const target = otherLanguage(source);
  const sourceText = String(text || '').trim();
  const result = {
    [source]: sourceText,
  };

  if (!sourceText) {
    result[target] = '';
    return result;
  }

  if (!settings?.apiKey) {
    result[target] = sourceText;
    return result;
  }

  try {
    result[target] = await api.translateText(sourceText, settings.apiKey, settings.apiProvider, target);
  } catch {
    result[target] = sourceText;
  }

  return result;
}

async function localizeLiveFeedItem(item, sourceLanguage, settings) {
  const preferredLanguage = resolveLanguage(settings?.language);
  const source = resolveLanguage(sourceLanguage || item?.sourceLanguage || preferredLanguage);
  const target = otherLanguage(source);
  let changed = false;

  const titleByLanguage = { ...(item?.titleByLanguage || {}) };
  const messageByLanguage = { ...(item?.messageByLanguage || {}) };

  if (!titleByLanguage[source] && item?.title) {
    titleByLanguage[source] = item.title;
    changed = true;
  }
  if (!messageByLanguage[source] && item?.message) {
    messageByLanguage[source] = item.message;
    changed = true;
  }

  if (!titleByLanguage[target] && titleByLanguage[source]) {
    if (settings?.apiKey) {
      try {
        titleByLanguage[target] = await api.translateText(
          titleByLanguage[source],
          settings.apiKey,
          settings.apiProvider,
          target,
        );
      } catch {
        titleByLanguage[target] = titleByLanguage[source];
      }
    } else {
      titleByLanguage[target] = titleByLanguage[source];
    }
    changed = true;
  }

  if (!messageByLanguage[target] && messageByLanguage[source]) {
    if (settings?.apiKey) {
      try {
        messageByLanguage[target] = await api.translateText(
          messageByLanguage[source],
          settings.apiKey,
          settings.apiProvider,
          target,
        );
      } catch {
        messageByLanguage[target] = messageByLanguage[source];
      }
    } else {
      messageByLanguage[target] = messageByLanguage[source];
    }
    changed = true;
  }

  const activeLanguage = resolveLanguage(settings?.language);
  const localizedTitle = titleByLanguage[activeLanguage] || titleByLanguage[source] || item?.title || '';
  const localizedMessage = messageByLanguage[activeLanguage] || messageByLanguage[source] || item?.message || '';

  const localizedItem = {
    ...item,
    sourceLanguage: source,
    title: localizedTitle,
    message: localizedMessage,
    titleByLanguage,
    messageByLanguage,
  };

  return { item: localizedItem, changed };
}

async function localizeStoredLiveCoachingFeed(settingsOverride = null) {
  const settings = settingsOverride || await storage.getSettings();
  const feed = await storage.getLiveCoachingFeed();
  if (!Array.isArray(feed) || !feed.length) return;

  let changed = false;
  const localized = [];

  for (const item of feed) {
    const result = await localizeLiveFeedItem(item, item?.sourceLanguage || settings.language, settings);
    if (result.changed) {
      changed = true;
    }
    localized.push(result.item);
  }

  if (changed) {
    await storage.saveLiveCoachingFeed(localized);
  }
}

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

async function appendLiveCoachingItem(entry, settingsOverride = null) {
  try {
    const settings = settingsOverride || await storage.getSettings();
    const localized = await localizeLiveFeedItem(
      entry,
      entry?.sourceLanguage || settings.language,
      settings,
    );
    const current = await storage.getLiveCoachingFeed();
    const next = [localized.item, ...current].slice(0, LIVE_COACHING_MAX_ITEMS);
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
      const settings = await storage.getSettings();
      frameRecorderConnected = true;
      await appendLiveCoachingItem({
        id: `frame-recorder-restored-${Date.now()}`,
        sourceLanguage: settings.language,
        title: bgText('pictureSaverConnectedTitle', settings.language),
        message: bgText('pictureSaverConnectedMessage', settings.language),
        titleByLanguage: buildStaticLanguageMap('pictureSaverConnectedTitle'),
        messageByLanguage: buildStaticLanguageMap('pictureSaverConnectedMessage'),
        category: 'system',
        timestamp: Date.now(),
        delivery: 'in-app',
      }, settings);
    }
  } catch (error) {
    const now = Date.now();
    const shouldReport = now - lastFrameRecorderErrorTime > 120000;
    if (shouldReport) {
      const settings = await storage.getSettings();
      lastFrameRecorderErrorTime = now;
      frameRecorderConnected = false;
      await appendLiveCoachingItem({
        id: `frame-recorder-error-${now}`,
        sourceLanguage: settings.language,
        title: bgText('pictureSaverOfflineTitle', settings.language),
        message: bgText('pictureSaverOfflineMessage', settings.language),
        titleByLanguage: buildStaticLanguageMap('pictureSaverOfflineTitle'),
        messageByLanguage: buildStaticLanguageMap('pictureSaverOfflineMessage'),
        category: 'system',
        timestamp: now,
        delivery: 'in-app',
      }, settings);
    }
    console.warn('Local frame recorder unavailable:', error);
  }
}

async function showNotification(title, message, priority = 1, idPrefix = 'coach', options = {}) {
  const {
    recordToFeed = true,
    category = 'info',
    titleByLanguage = null,
    messageByLanguage = null,
    sourceLanguage = null,
    settings: settingsOverride = null,
  } = options;
  const settings = settingsOverride || await storage.getSettings();
  const entrySourceLanguage = sourceLanguage || settings.language;
  const permission = await getNotificationPermissionLevel();
  const timestamp = Date.now();

  if (permission === 'denied') {
    analysisRuntime.lastError = 'Chrome notifications are blocked for this extension';
    if (recordToFeed) {
      await appendLiveCoachingItem({
        id: `${idPrefix}-${timestamp}`,
        sourceLanguage: entrySourceLanguage,
        title,
        message,
        titleByLanguage: titleByLanguage || undefined,
        messageByLanguage: messageByLanguage || undefined,
        category,
        timestamp,
        delivery: 'blocked',
      }, settings);
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
            sourceLanguage: entrySourceLanguage,
            title,
            message,
            titleByLanguage: titleByLanguage || undefined,
            messageByLanguage: messageByLanguage || undefined,
            category,
            timestamp,
            delivery: 'failed',
          }, settings).finally(() => resolve(false));
          return;
        }
        resolve(false);
        return;
      }
      if (recordToFeed) {
        appendLiveCoachingItem({
          id: notificationId,
          sourceLanguage: entrySourceLanguage,
          title,
          message,
          titleByLanguage: titleByLanguage || undefined,
          messageByLanguage: messageByLanguage || undefined,
          category,
          timestamp,
          delivery: 'shown',
        }, settings).finally(() => resolve(Boolean(id)));
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
    sourceLanguage: settings.language,
    title: bgText('meetingStartTitle', settings.language),
    message: bgText('meetingStartMessage', settings.language),
    titleByLanguage: buildStaticLanguageMap('meetingStartTitle'),
    messageByLanguage: buildStaticLanguageMap('meetingStartMessage'),
    category: 'system',
    timestamp: message.timestamp,
    delivery: 'in-app',
  }, settings);

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
  const sourceLanguage = resolveLanguage(settings.language);

  if (criticalIssues.length > 0) {
    const suggestions = extractPrioritySuggestions(analysis, criticalIssues, 2);
    const message = suggestions.length
      ? suggestions.join('; ')
      : bgText('criticalFallback', sourceLanguage);
    const messageByLanguage = await buildBilingualTextMap(message, sourceLanguage, settings);
    const titleByLanguage = buildStaticLanguageMap('criticalTitle');
    const localizedTitle = titleByLanguage[sourceLanguage] || titleByLanguage[LANG_EN];
    const localizedMessage = messageByLanguage[sourceLanguage] || message;

    await appendLiveCoachingItem({
      id: `critical-${now}`,
      sourceLanguage,
      title: localizedTitle,
      message: localizedMessage,
      titleByLanguage,
      messageByLanguage,
      category: 'critical',
      timestamp: now,
      delivery: 'in-app',
    }, settings);

    if (!settings.notificationsEnabled || !cooldownExpired) {
      return;
    }

    const shown = await showNotification(localizedTitle, localizedMessage, 2, 'coach', {
      recordToFeed: false,
      category: 'critical',
      settings,
    });
    if (shown) {
      lastNotificationTime = now;
    }
    return;
  }

  if (warningIssues.length > 0) {
    const suggestions = extractPrioritySuggestions(analysis, warningIssues, 2);
    const message = suggestions.length
      ? suggestions.join('; ')
      : bgText('warningFallback', sourceLanguage);
    const messageByLanguage = await buildBilingualTextMap(message, sourceLanguage, settings);
    const titleByLanguage = buildStaticLanguageMap('warningTitle');
    const localizedTitle = titleByLanguage[sourceLanguage] || titleByLanguage[LANG_EN];
    const localizedMessage = messageByLanguage[sourceLanguage] || message;

    await appendLiveCoachingItem({
      id: `warning-${now}`,
      sourceLanguage,
      title: localizedTitle,
      message: localizedMessage,
      titleByLanguage,
      messageByLanguage,
      category: 'warning',
      timestamp: now,
      delivery: 'in-app',
    }, settings);

    if (!settings.notificationsEnabled || !cooldownExpired) {
      return;
    }

    const shown = await showNotification(localizedTitle, localizedMessage, 1, 'coach', {
      recordToFeed: false,
      category: 'warning',
      settings,
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
        const titleByLanguage = buildStaticLanguageMap('setupRequiredTitle');
        const messageByLanguage = buildStaticLanguageMap('setupRequiredMessage');
        const language = resolveLanguage(settings.language);
        await showNotification(
          titleByLanguage[language],
          messageByLanguage[language],
          1,
          'coach',
          {
          category: 'error',
          settings,
          sourceLanguage: language,
          titleByLanguage,
          messageByLanguage,
        },
        );
        currentSession.noKeyWarningShown = true;
        await storage.saveCurrentSession(currentSession);
      }
      return;
    }

    void saveFrameToLocalProjectFolder(message.frame, currentSession?.id || 'session', message.timestamp || Date.now());

    const analysis = await api.analyze(message.frame, settings.apiKey, settings.apiProvider, settings.language);

    if (!validateAnalysis(analysis)) {
      throw new Error('Invalid analysis response structure');
    }

    analysis.timestamp = message.timestamp || Date.now();
    currentSession.analyses.push(analysis);
    analysisRuntime.succeeded += 1;
    analysisRuntime.lastSuccessAt = Date.now();
    analysisRuntime.lastError = null;

    await storage.saveCurrentSession(currentSession);
    await storage.saveSummarySession(currentSession);
    await checkForIssues(analysis, settings);
  } catch (error) {
    console.error('Frame analysis error:', error);
    markAnalysisFailure(error.message);

    const now = Date.now();
    const isRateLimit = error.message?.toLowerCase().includes('rate limit');
    const errorCooldownExpired = now - lastErrorNotificationTime > TIMING.NOTIFICATION_COOLDOWN;
    if (!isRateLimit && errorCooldownExpired) {
      lastErrorNotificationTime = now;
      const settings = await storage.getSettings();
      const titleByLanguage = buildStaticLanguageMap('analysisErrorTitle');
      const messageByLanguage = buildStaticLanguageMap('analysisErrorMessage');
      const language = resolveLanguage(settings.language);
      await showNotification(
        titleByLanguage[language],
        messageByLanguage[language],
        1,
        'coach',
        {
          category: 'error',
          settings,
          sourceLanguage: language,
          titleByLanguage,
          messageByLanguage,
        },
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
  const settings = await storage.saveSettings({ monitoringEnabled: enabled });

  if (!enabled) {
    await stopCurrentSessionSilently();
    await appendLiveCoachingItem({
      id: `monitoring-off-${Date.now()}`,
      sourceLanguage: settings.language,
      title: bgText('monitoringOffTitle', settings.language),
      message: bgText('monitoringOffMessage', settings.language),
      titleByLanguage: buildStaticLanguageMap('monitoringOffTitle'),
      messageByLanguage: buildStaticLanguageMap('monitoringOffMessage'),
      category: 'system',
      timestamp: Date.now(),
      delivery: 'in-app',
    }, settings);
  } else {
    await appendLiveCoachingItem({
      id: `monitoring-on-${Date.now()}`,
      sourceLanguage: settings.language,
      title: bgText('monitoringOnTitle', settings.language),
      message: bgText('monitoringOnMessage', settings.language),
      titleByLanguage: buildStaticLanguageMap('monitoringOnTitle'),
      messageByLanguage: buildStaticLanguageMap('monitoringOnMessage'),
      category: 'system',
      timestamp: Date.now(),
      delivery: 'in-app',
    }, settings);
  }

  return { ok: true, monitoringEnabled: enabled };
}

async function handleMeetingEnded(message) {
  if (!currentSession) return;

  currentSession.endTime = message.timestamp || Date.now();

  const settings = await storage.getSettings();
  const language = resolveLanguage(settings.language);
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
      bgText('meetingEndedTitle', language),
      bgText('meetingEndedMessage', language, { duration: durationMin }),
      1,
      'summary-ready',
      {
        category: 'system',
        settings,
        sourceLanguage: language,
        titleByLanguage: buildStaticLanguageMap('meetingEndedTitle'),
        messageByLanguage: {
          [LANG_EN]: bgText('meetingEndedMessage', LANG_EN, { duration: durationMin }),
          [LANG_FR]: bgText('meetingEndedMessage', LANG_FR, { duration: durationMin }),
        },
      },
    );

    chrome.tabs.create({
      url: chrome.runtime.getURL(`summary/summary.html?lang=${encodeURIComponent(language)}`),
    });
  }

  currentSession = null;
  consecutiveWarnings = createWarningTracker();
  await appendLiveCoachingItem({
    id: `meeting-end-${endedAt}`,
    sourceLanguage: language,
    title: bgText('meetingEndFeedTitle', language),
    message: hasData
      ? bgText('meetingEndFeedMessageReady', language)
      : bgText('meetingEndFeedMessageEmpty', language),
    titleByLanguage: buildStaticLanguageMap('meetingEndFeedTitle'),
    messageByLanguage: hasData
      ? buildStaticLanguageMap('meetingEndFeedMessageReady')
      : buildStaticLanguageMap('meetingEndFeedMessageEmpty'),
    category: 'system',
    timestamp: endedAt,
    delivery: 'in-app',
  }, settings);
}

// Restore session on every worker wake-up, not just on install/update.
restoreSession();

chrome.runtime.onInstalled.addListener(async () => {
  await storage.getSettings();
  await localizeStoredLiveCoachingFeed();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.settings?.newValue) {
    return;
  }

  const previous = resolveLanguage(changes.settings.oldValue?.language);
  const next = resolveLanguage(changes.settings.newValue.language);
  if (previous !== next) {
    void localizeStoredLiveCoachingFeed(changes.settings.newValue);
  }
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
        case 'LOCALIZE_LIVE_FEED':
          await localizeStoredLiveCoachingFeed();
          sendResponse({ ok: true });
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
