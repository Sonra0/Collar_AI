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
const MAX_MISSED_FRAMES = 3;
const READINESS_POLL_INTERVAL = 2000;

function probeForReadyVideo() {
  if (isMeetingActive) return;
  if (findVideoElement()) {
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

function findVideoElement() {
  const selectors = [
    'video[autoplay]',
    'video.participant-video',
    'div[data-self-video="true"] video',
    'div[jsname] video',
  ];

  const candidates = new Set();

  for (const selector of selectors) {
    try {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        candidates.add(video);
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  const preferred = pickBestVideoElement(candidates);
  if (preferred) return preferred;

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
  if (isMeetingActive) return;

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

      if (hasVideo && !isMeetingActive) {
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

  if (findVideoElement()) {
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
