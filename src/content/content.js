import { TIMING } from '../utils/constants.js';

/**
 * Content script for Google Meet integration.
 * Captures video frames and sends them to the background worker.
 */

let captureInterval = null;
let isMeetingActive = false;
let missedFrames = 0;
const MAX_MISSED_FRAMES = 3;

function findVideoElement() {
  const selectors = [
    'video[autoplay]',
    'video.participant-video',
    'div[data-self-video="true"] video',
    'div[jsname] video',
  ];

  for (const selector of selectors) {
    try {
      const videos = document.querySelectorAll(selector);

      for (const video of videos) {
        const ready = video.readyState >= 2;
        const hasStream = Boolean(video.srcObject) || video.currentTime > 0;
        const rect = video.getBoundingClientRect();
        const visible = rect.width > 180 && rect.height > 120;

        if (ready && hasStream && visible) {
          return video;
        }
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  return null;
}

function captureFrame(videoElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;

    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
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

  safeSendMessage({
    type: 'MEETING_ENDED',
    timestamp: Date.now(),
  });

  console.log('Meeting Body Language Coach: monitoring stopped');
}

function observeMeetingState() {
  let debounceTimer = null;

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
  console.log('Meeting Body Language Coach: content script loaded');
}

init();
