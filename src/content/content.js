import { TIMING } from '../utils/constants.js';
import { pickBestVideoElement } from './video-selection.mjs';

/**
 * Content script for Google Meet integration.
 * Captures video frames and sends them to the background worker.
 */

let captureInterval = null;
let readinessPollInterval = null;
let isMeetingActive = false;
let missedFrames = 0;
let monitoringEnabled = true;
const MAX_MISSED_FRAMES = 3;
const READINESS_POLL_INTERVAL = 2000;
const SETTINGS_KEY = 'settings';

function probeForReadyVideo() {
  if (isMeetingActive) return;
  if (monitoringEnabled && findVideoElement()) {
    startMonitoring();
  }
}

function startReadinessPolling() {
  if (readinessPollInterval) return;
  readinessPollInterval = setInterval(probeForReadyVideo, READINESS_POLL_INTERVAL);
}

function stopReadinessPolling() {
  if (!readinessPollInterval) return;
  clearInterval(readinessPollInterval);
  readinessPollInterval = null;
}

function parseMonitoringEnabled(settings) {
  return settings?.monitoringEnabled !== false;
}

async function syncMonitoringPreference() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const previous = monitoringEnabled;
    monitoringEnabled = parseMonitoringEnabled(result?.[SETTINGS_KEY]);

    if (!monitoringEnabled && isMeetingActive) {
      stopMonitoring();
      return;
    }

    if (monitoringEnabled && !previous && !isMeetingActive && findVideoElement()) {
      startMonitoring();
    }
  } catch {
    monitoringEnabled = true;
  }
}

function findVideoElement() {
  const preferredSelectors = [
    'div[data-self-video="true"] video',
    'video[data-self-video="true"]',
    '[data-is-self="true"] video',
    '[data-local-participant="true"] video',
    '[data-self-name] video',
  ];

  const generalSelectors = [
    'video[autoplay]',
    'video.participant-video',
    'div[jsname] video',
  ];

  const preferredCandidates = new Set();
  for (const selector of preferredSelectors) {
    try {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        preferredCandidates.add(video);
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  const preferred = pickBestVideoElement(preferredCandidates);
  if (preferred) return preferred;

  const candidates = new Set();

  for (const selector of generalSelectors) {
    try {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        candidates.add(video);
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  const bestCandidate = pickBestVideoElement(candidates);
  if (bestCandidate) return bestCandidate;

  return pickBestVideoElement(document.querySelectorAll('video'));
}

function captureFrame(videoElement) {
  try {
    const sourceWidth = Number(videoElement.videoWidth) || 640;
    const sourceHeight = Number(videoElement.videoHeight) || 480;
    const longestSide = Math.max(sourceWidth, sourceHeight);
    const scale = longestSide > 960 ? 960 / longestSide : 1;
    const targetWidth = Math.max(320, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(240, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Frame capture error:', error);
    return null;
  }
}

function safeSendMessage(payload) {
  try {
    chrome.runtime.sendMessage(payload, () => {
      // Ignore response; suppress "message port closed" errors.
      if (chrome.runtime.lastError) {
        /* noop */
      }
    });
  } catch {
    // Extension context invalidated (e.g. extension reloaded/updated).
    stopMonitoring();
  }
}

function sendFrameToBackground(frameData) {
  safeSendMessage({
    type: 'ANALYZE_FRAME',
    frame: frameData,
    timestamp: Date.now(),
  });
}

function captureAndSend() {
  if (!monitoringEnabled) {
    stopMonitoring();
    return;
  }

  const video = findVideoElement();
  if (!video) {
    missedFrames += 1;
    if (missedFrames >= MAX_MISSED_FRAMES) {
      stopMonitoring();
    }
    return;
  }

  missedFrames = 0;
  const frame = captureFrame(video);
  if (frame) {
    sendFrameToBackground(frame);
  }
}

function startMonitoring() {
  if (isMeetingActive || !monitoringEnabled) return;

  const videoElement = findVideoElement();
  if (!videoElement) return;

  isMeetingActive = true;
  missedFrames = 0;
  stopReadinessPolling();

  safeSendMessage({
    type: 'MEETING_STARTED',
    timestamp: Date.now(),
  });

  captureInterval = setInterval(captureAndSend, TIMING.CAPTURE_INTERVAL);
  captureAndSend();

  console.log('Meeting Body Language Coach: monitoring started');
}

function stopMonitoring() {
  if (!isMeetingActive) return;

  isMeetingActive = false;

  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

  startReadinessPolling();

  safeSendMessage({
    type: 'MEETING_ENDED',
    timestamp: Date.now(),
  });

  console.log('Meeting Body Language Coach: monitoring stopped');
}

function observeMeetingState() {
  let debounceTimer = null;
  startReadinessPolling();

  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const hasVideo = Boolean(findVideoElement());

      if (hasVideo && !isMeetingActive && monitoringEnabled) {
        startMonitoring();
      } else if (!hasVideo && isMeetingActive) {
        stopMonitoring();
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  if (monitoringEnabled && findVideoElement()) {
    startMonitoring();
  }
}

document.addEventListener('visibilitychange', () => {
  if (!isMeetingActive) return;

  if (document.hidden && captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

  if (!document.hidden && !captureInterval) {
    captureInterval = setInterval(captureAndSend, TIMING.CAPTURE_INTERVAL);
    captureAndSend();
  }
});

function init() {
  if (!window.location.hostname.includes('meet.google.com')) {
    return;
  }

  syncMonitoringPreference();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
    monitoringEnabled = parseMonitoringEnabled(changes[SETTINGS_KEY].newValue);

    if (!monitoringEnabled) {
      stopMonitoring();
      return;
    }

    if (!isMeetingActive && findVideoElement()) {
      startMonitoring();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeMeetingState, { once: true });
  } else {
    observeMeetingState();
  }

  window.addEventListener('beforeunload', stopMonitoring);
  window.addEventListener('beforeunload', () => {
    stopReadinessPolling();
  });
  console.log('Meeting Body Language Coach: content script loaded');
}

init();
