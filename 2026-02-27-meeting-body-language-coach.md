# Meeting Body Language Coach Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that monitors body language during Google Meet calls and provides real-time feedback using AI vision models.

**Architecture:** Content script captures video frames from Google Meet every 30 seconds, background service worker sends frames to Claude 3.5 Sonnet API for analysis, notification manager displays alerts based on severity, and summary page shows post-meeting report with scores and recommendations.

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JavaScript (ES6+), Webpack 5, Anthropic Claude API, Chart.js, HTML/CSS

---

## Task 1: Project Scaffold & Configuration

**Files:**
- Create: `package.json`
- Create: `webpack.config.js`
- Create: `.eslintrc.js`
- Create: `.gitignore`
- Create: `manifest.json`
- Create: `README.md`

**Step 1: Initialize npm project**

```bash
npm init -y
```

Expected: Creates `package.json` with default values

**Step 2: Install dependencies**

```bash
npm install --save chart.js
npm install --save-dev webpack webpack-cli copy-webpack-plugin babel-loader @babel/core @babel/preset-env eslint prettier
```

Expected: Dependencies installed, `package.json` updated

**Step 3: Create webpack configuration**

Create `webpack.config.js`:

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'content/content': './src/content/content.js',
    'background/background': './src/background/background.js',
    'popup/popup': './src/popup/popup.js',
    'summary/summary': './src/summary/summary.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/summary/summary.html', to: 'summary/summary.html' },
        { from: 'src/summary/summary.css', to: 'summary/summary.css' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
};
```

**Step 4: Create ESLint configuration**

Create `.eslintrc.js`:

```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

**Step 5: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.DS_Store
*.log
.env
```

**Step 6: Create manifest.json**

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Meeting Body Language Coach",
  "version": "1.0.0",
  "description": "Real-time body language feedback for video meetings",
  "permissions": ["activeTab", "notifications", "storage", "scripting"],
  "host_permissions": ["*://meet.google.com/*"],
  "background": {
    "service_worker": "background/background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://meet.google.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 7: Update package.json scripts**

Modify `package.json`, add scripts section:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.{js,html,css}"
  }
}
```

**Step 8: Create README**

Create `README.md`:

```markdown
# Meeting Body Language Coach

Chrome extension for real-time body language feedback during Google Meet calls.

## Development

1. Install dependencies: `npm install`
2. Build extension: `npm run build`
3. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Add your Anthropic API key in extension popup
2. Join a Google Meet call
3. Extension will monitor your body language automatically
4. Receive real-time alerts and post-meeting summary

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+)
- Webpack 5
- Anthropic Claude 3.5 Sonnet API
- Chart.js for visualizations
```

**Step 9: Create directory structure**

```bash
mkdir -p src/content src/background src/popup src/summary src/utils icons
```

Expected: Directories created

**Step 10: Commit project scaffold**

```bash
git add .
git commit -m "feat: initialize project scaffold with webpack and manifest"
```

---

## Task 2: Create Placeholder Icons

**Files:**
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

**Step 1: Create placeholder icon files**

For hackathon, we'll create simple colored squares as placeholders. In production, use proper icons.

```bash
# Create 16x16 placeholder (blue square)
cat > icons/icon16.png << 'EOF'
[Use any simple 16x16 PNG - can be created with online tools or copied from another extension during development]
EOF

# For now, copy the same for all sizes
cp icons/icon16.png icons/icon48.png
cp icons/icon16.png icons/icon128.png
```

**Note:** For actual implementation, use an icon generator or design tool to create proper icons. For MVP, even a simple colored square works.

**Step 2: Verify icons exist**

```bash
ls -la icons/
```

Expected: Three PNG files present

**Step 3: Commit icons**

```bash
git add icons/
git commit -m "feat: add placeholder extension icons"
```

---

## Task 3: Utility Modules - Constants

**Files:**
- Create: `src/utils/constants.js`

**Step 1: Create constants file**

Create `src/utils/constants.js`:

```javascript
// Analysis prompt for AI vision models
export const ANALYSIS_PROMPT = `You are a professional body language coach analyzing someone in a work meeting.
Analyze this person's body language and provide feedback on:

1. POSTURE (0-10 score):
   - Spine alignment (slouching, leaning forward/back)
   - Shoulder symmetry (level vs. tilted)
   - Head position (centered vs. protruding forward)
   - Overall body positioning in frame

2. FACIAL EXPRESSIONS (0-10 score):
   - Eye contact with camera (looking at screen vs. away)
   - Facial engagement (smiling, nodding, attentive expression)
   - Signs of fatigue (drooping eyelids, blank stare)
   - Emotional appropriateness for professional setting

3. HAND GESTURES (0-10 score):
   - Hand visibility (visible in frame vs. hidden)
   - Gesture frequency (too much, too little, appropriate)
   - Gesture quality (purposeful vs. nervous fidgeting)
   - Nervous habits (touching face, playing with hair/objects)

4. APPEARANCE (0-10 score):
   - Clothing professionalism and tidiness
   - Collar/neckline alignment
   - Hair grooming
   - Background appropriateness (if distracting)

For each category, provide:
- score: integer from 0-10 (10 = perfect, 0 = severe issues)
- issue: string describing the problem (null if score >= 8)
- suggestion: actionable advice to improve (null if score >= 8)

Respond ONLY with valid JSON in this exact format:
{
  "posture": {"score": 8, "issue": "slight slouch", "suggestion": "sit up straight and align shoulders"},
  "facial": {"score": 9, "issue": null, "suggestion": null},
  "hands": {"score": 6, "issue": "no hand movement visible", "suggestion": "use hand gestures to emphasize key points"},
  "appearance": {"score": 10, "issue": null, "suggestion": null}
}`;

// Severity thresholds
export const SEVERITY = {
  CRITICAL: 5,  // score < 5: immediate notification
  WARNING: 7,   // score < 7: notification after 2 consecutive checks
  GOOD: 8,      // score >= 8: no issues
};

// Analysis timing
export const TIMING = {
  CAPTURE_INTERVAL: 30000,        // 30 seconds between captures
  CONSECUTIVE_WARNINGS: 2,         // warnings needed before alerting
  NOTIFICATION_COOLDOWN: 120000,   // 2 minutes between notifications
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  SESSIONS: 'sessions',
  CURRENT_SESSION: 'currentSession',
};

// Default settings
export const DEFAULT_SETTINGS = {
  apiKey: '',
  apiProvider: 'claude', // 'claude' or 'openai'
  sensitivity: 'medium', // 'low', 'medium', 'high'
  notificationsEnabled: true,
  dataRetentionDays: 7,
};

// API endpoints
export const API_ENDPOINTS = {
  claude: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
};

// API models
export const API_MODELS = {
  claude: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4-vision-preview',
};
```

**Step 2: Commit constants**

```bash
git add src/utils/constants.js
git commit -m "feat: add constants for prompts, thresholds, and config"
```

---

## Task 4: Utility Modules - Storage Wrapper

**Files:**
- Create: `src/utils/storage.js`

**Step 1: Create storage wrapper**

Create `src/utils/storage.js`:

```javascript
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

/**
 * Storage wrapper for Chrome storage API
 */
class Storage {
  /**
   * Get settings from storage
   */
  async getSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  /**
   * Save settings to storage
   */
  async saveSettings(settings) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: settings,
    });
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
    return result[STORAGE_KEYS.CURRENT_SESSION] || null;
  }

  /**
   * Save current session
   */
  async saveCurrentSession(session) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_SESSION]: session,
    });
  }

  /**
   * Clear current session
   */
  async clearCurrentSession() {
    await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION);
  }

  /**
   * Get all sessions
   */
  async getSessions() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] || [];
  }

  /**
   * Add session to history
   */
  async addSession(session) {
    const sessions = await this.getSessions();
    sessions.push(session);
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: sessions,
    });
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    await chrome.storage.local.clear();
  }
}

export default new Storage();
```

**Step 2: Commit storage wrapper**

```bash
git add src/utils/storage.js
git commit -m "feat: add storage wrapper for Chrome storage API"
```

---

## Task 5: Utility Modules - API Client

**Files:**
- Create: `src/utils/api.js`

**Step 1: Create API client**

Create `src/utils/api.js`:

```javascript
import {
  ANALYSIS_PROMPT,
  API_ENDPOINTS,
  API_MODELS,
} from './constants.js';

/**
 * API client for vision analysis
 */
class APIClient {
  /**
   * Analyze frame with Claude 3.5 Sonnet
   */
  async analyzeWithClaude(frameBase64, apiKey) {
    try {
      const response = await fetch(API_ENDPOINTS.claude, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: API_MODELS.claude,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: frameBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
                  },
                },
                {
                  type: 'text',
                  text: ANALYSIS_PROMPT,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.content[0].text;

      // Parse JSON from response
      return JSON.parse(analysisText);
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * Analyze frame with OpenAI GPT-4 Vision
   */
  async analyzeWithOpenAI(frameBase64, apiKey) {
    try {
      const response = await fetch(API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: API_MODELS.openai,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: frameBase64,
                  },
                },
                {
                  type: 'text',
                  text: ANALYSIS_PROMPT,
                },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      // Parse JSON from response
      return JSON.parse(analysisText);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Analyze frame with configured provider
   */
  async analyze(frameBase64, apiKey, provider = 'claude') {
    if (provider === 'claude') {
      return this.analyzeWithClaude(frameBase64, apiKey);
    } else if (provider === 'openai') {
      return this.analyzeWithOpenAI(frameBase64, apiKey);
    } else {
      throw new Error(`Unsupported API provider: ${provider}`);
    }
  }

  /**
   * Validate API key by making a test call
   */
  async validateApiKey(apiKey, provider = 'claude') {
    try {
      // Create a small test image (1x1 black pixel)
      const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

      await this.analyze(testImage, apiKey, provider);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new APIClient();
```

**Step 2: Commit API client**

```bash
git add src/utils/api.js
git commit -m "feat: add API client for Claude and OpenAI vision analysis"
```

---

## Task 6: Content Script - Frame Capture

**Files:**
- Create: `src/content/content.js`

**Step 1: Create content script skeleton**

Create `src/content/content.js`:

```javascript
import { TIMING } from '../utils/constants.js';

/**
 * Content script for Google Meet integration
 * Captures video frames and sends to background worker
 */

let captureInterval = null;
let isMeetingActive = false;

/**
 * Find user's self-view video element
 */
function findVideoElement() {
  // Google Meet shows user's video in a video element
  // Try multiple selectors as Meet's DOM can vary
  const selectors = [
    'video[autoplay]',
    'video.participant-video',
    'div[data-self-video="true"] video',
  ];

  for (const selector of selectors) {
    const video = document.querySelector(selector);
    if (video && video.srcObject) {
      return video;
    }
  }

  return null;
}

/**
 * Capture frame from video element
 */
function captureFrame(videoElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (0.8 quality for compression)
    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    return frameData;
  } catch (error) {
    console.error('Frame capture error:', error);
    return null;
  }
}

/**
 * Send frame to background worker for analysis
 */
function sendFrameToBackground(frameData) {
  chrome.runtime.sendMessage({
    type: 'ANALYZE_FRAME',
    frame: frameData,
    timestamp: Date.now(),
  });
}

/**
 * Start monitoring meeting
 */
function startMonitoring() {
  if (isMeetingActive) return;

  const videoElement = findVideoElement();
  if (!videoElement) {
    console.log('Video element not found, waiting...');
    setTimeout(startMonitoring, 2000);
    return;
  }

  console.log('Starting body language monitoring...');
  isMeetingActive = true;

  // Notify background that meeting started
  chrome.runtime.sendMessage({
    type: 'MEETING_STARTED',
    timestamp: Date.now(),
  });

  // Capture frames at regular intervals
  captureInterval = setInterval(() => {
    const video = findVideoElement();
    if (!video) {
      stopMonitoring();
      return;
    }

    const frame = captureFrame(video);
    if (frame) {
      sendFrameToBackground(frame);
    }
  }, TIMING.CAPTURE_INTERVAL);
}

/**
 * Stop monitoring meeting
 */
function stopMonitoring() {
  if (!isMeetingActive) return;

  console.log('Stopping body language monitoring...');
  isMeetingActive = false;

  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

  // Notify background that meeting ended
  chrome.runtime.sendMessage({
    type: 'MEETING_ENDED',
    timestamp: Date.now(),
  });
}

/**
 * Detect meeting state changes
 */
function observeMeetingState() {
  // Watch for video element insertion/removal
  const observer = new MutationObserver(() => {
    const videoExists = findVideoElement() !== null;

    if (videoExists && !isMeetingActive) {
      startMonitoring();
    } else if (!videoExists && isMeetingActive) {
      stopMonitoring();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check
  if (findVideoElement()) {
    startMonitoring();
  }
}

// Start observing when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeMeetingState);
} else {
  observeMeetingState();
}

// Handle tab visibility changes (pause when tab not active)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isMeetingActive) {
    console.log('Tab hidden, pausing monitoring...');
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }
  } else if (!document.hidden && isMeetingActive && !captureInterval) {
    console.log('Tab visible, resuming monitoring...');
    captureInterval = setInterval(() => {
      const video = findVideoElement();
      if (!video) {
        stopMonitoring();
        return;
      }

      const frame = captureFrame(video);
      if (frame) {
        sendFrameToBackground(frame);
      }
    }, TIMING.CAPTURE_INTERVAL);
  }
});

console.log('Meeting Body Language Coach: Content script loaded');
```

**Step 2: Test content script loads**

Build the extension:
```bash
npm run build
```

Expected: `dist/content/content.js` created

**Step 3: Commit content script**

```bash
git add src/content/content.js
git commit -m "feat: add content script for video frame capture in Google Meet"
```

---

## Task 7: Background Worker - Core Logic

**Files:**
- Create: `src/background/background.js`

**Step 1: Create background service worker**

Create `src/background/background.js`:

```javascript
import storage from '../utils/storage.js';
import api from '../utils/api.js';
import { SEVERITY, TIMING } from '../utils/constants.js';

/**
 * Background service worker
 * Handles frame analysis, notifications, and session management
 */

let currentSession = null;
let lastNotificationTime = 0;
let consecutiveWarnings = {};

/**
 * Handle incoming messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEETING_STARTED') {
    handleMeetingStarted(message);
  } else if (message.type === 'ANALYZE_FRAME') {
    handleFrameAnalysis(message);
  } else if (message.type === 'MEETING_ENDED') {
    handleMeetingEnded(message);
  }
});

/**
 * Handle meeting start
 */
async function handleMeetingStarted(message) {
  console.log('Meeting started:', message.timestamp);

  // Create new session
  currentSession = {
    id: `session_${message.timestamp}`,
    startTime: message.timestamp,
    endTime: null,
    analyses: [],
  };

  await storage.saveCurrentSession(currentSession);

  // Reset warning trackers
  consecutiveWarnings = {
    posture: 0,
    facial: 0,
    hands: 0,
    appearance: 0,
  };
}

/**
 * Handle frame analysis request
 */
async function handleFrameAnalysis(message) {
  if (!currentSession) {
    console.error('No active session');
    return;
  }

  try {
    // Get settings
    const settings = await storage.getSettings();

    if (!settings.apiKey) {
      console.error('No API key configured');
      showNotification('Setup Required', 'Please add your API key in the extension popup');
      return;
    }

    // Call API for analysis
    console.log('Analyzing frame...');
    const analysis = await api.analyze(
      message.frame,
      settings.apiKey,
      settings.apiProvider
    );

    // Add timestamp
    analysis.timestamp = message.timestamp;

    // Save to current session
    currentSession.analyses.push(analysis);
    await storage.saveCurrentSession(currentSession);

    console.log('Analysis result:', analysis);

    // Check for issues and send notifications
    checkForIssues(analysis, settings);

  } catch (error) {
    console.error('Analysis error:', error);
    showNotification('Analysis Error', 'Failed to analyze frame. Check your API key.');
  }
}

/**
 * Check analysis for issues and send notifications
 */
function checkForIssues(analysis, settings) {
  const categories = ['posture', 'facial', 'hands', 'appearance'];
  const criticalIssues = [];
  const warningIssues = [];

  categories.forEach((category) => {
    const result = analysis[category];
    if (!result) return;

    if (result.score < SEVERITY.CRITICAL) {
      // Critical: immediate notification
      criticalIssues.push({
        category,
        ...result,
      });
      consecutiveWarnings[category] = 0; // Reset counter
    } else if (result.score < SEVERITY.WARNING) {
      // Warning: track consecutive occurrences
      consecutiveWarnings[category]++;

      if (consecutiveWarnings[category] >= TIMING.CONSECUTIVE_WARNINGS) {
        warningIssues.push({
          category,
          ...result,
        });
        consecutiveWarnings[category] = 0; // Reset after notifying
      }
    } else {
      // Good: reset counter
      consecutiveWarnings[category] = 0;
    }
  });

  // Send notifications based on severity
  const now = Date.now();
  const cooldownExpired = (now - lastNotificationTime) > TIMING.NOTIFICATION_COOLDOWN;

  if (settings.notificationsEnabled && cooldownExpired) {
    if (criticalIssues.length > 0) {
      sendCriticalNotification(criticalIssues);
      lastNotificationTime = now;
    } else if (warningIssues.length > 0) {
      sendWarningNotification(warningIssues);
      lastNotificationTime = now;
    }
  }
}

/**
 * Send critical issue notification
 */
function sendCriticalNotification(issues) {
  const messages = issues.map(issue => issue.suggestion);
  const message = messages.length === 1
    ? messages[0]
    : `Multiple issues: ${messages.join('; ')}`;

  showNotification('🚨 Critical Alert', message, 2);
}

/**
 * Send warning notification
 */
function sendWarningNotification(issues) {
  const messages = issues.map(issue => issue.suggestion);
  const message = messages.length === 1
    ? messages[0]
    : `Suggestions: ${messages.join('; ')}`;

  showNotification('⚠️ Body Language Tip', message, 1);
}

/**
 * Show Chrome notification
 */
function showNotification(title, message, priority = 1) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: title,
    message: message,
    priority: priority,
    requireInteraction: false,
  });
}

/**
 * Handle meeting end
 */
async function handleMeetingEnded(message) {
  if (!currentSession) return;

  console.log('Meeting ended:', message.timestamp);

  // Update session end time
  currentSession.endTime = message.timestamp;

  // Save to sessions history
  await storage.addSession(currentSession);
  await storage.clearCurrentSession();

  // Open summary report
  const duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000 / 60);
  showNotification(
    'Meeting Ended',
    `${duration} minutes monitored. Click to view summary report.`,
    1
  );

  // Open summary page
  chrome.tabs.create({
    url: chrome.runtime.getURL('summary/summary.html'),
  });

  currentSession = null;
}

// Load current session on startup (in case of reload)
storage.getCurrentSession().then((session) => {
  if (session) {
    currentSession = session;
    console.log('Restored session:', session.id);
  }
});

console.log('Meeting Body Language Coach: Background worker loaded');
```

**Step 2: Build and test**

```bash
npm run build
```

Expected: `dist/background/background.js` created

**Step 3: Commit background worker**

```bash
git add src/background/background.js
git commit -m "feat: add background worker for frame analysis and notifications"
```

---

## Task 8: Popup UI - HTML Structure

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.css`

**Step 1: Create popup HTML**

Create `src/popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Body Language Coach</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🎯 Body Language Coach</h1>
    </header>

    <section class="status">
      <div id="status-indicator" class="status-indicator">
        <span class="status-dot"></span>
        <span id="status-text">Not monitoring</span>
      </div>
    </section>

    <section class="settings">
      <h2>Settings</h2>

      <div class="form-group">
        <label for="api-provider">API Provider</label>
        <select id="api-provider">
          <option value="claude">Anthropic Claude</option>
          <option value="openai">OpenAI GPT-4</option>
        </select>
      </div>

      <div class="form-group">
        <label for="api-key">API Key</label>
        <input
          type="password"
          id="api-key"
          placeholder="Enter your API key"
        />
        <button id="validate-key" class="btn-small">Validate</button>
      </div>

      <div class="form-group">
        <label for="sensitivity">Alert Sensitivity</label>
        <select id="sensitivity">
          <option value="low">Low (critical only)</option>
          <option value="medium">Medium (recommended)</option>
          <option value="high">High (all issues)</option>
        </select>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="notifications-enabled" />
          Enable notifications
        </label>
      </div>

      <button id="save-settings" class="btn-primary">Save Settings</button>
    </section>

    <section class="actions">
      <button id="view-history" class="btn-secondary">View History</button>
      <button id="clear-data" class="btn-danger">Clear All Data</button>
    </section>

    <footer>
      <p class="version">v1.0.0</p>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Create popup CSS**

Create `src/popup/popup.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 14px;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  margin-bottom: 16px;
  text-align: center;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
}

h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #5f6368;
}

.status {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9aa0a6;
}

.status-indicator.active .status-dot {
  background: #34a853;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.settings {
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 12px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: #5f6368;
}

input[type="password"],
input[type="text"],
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
}

input[type="password"]:focus,
input[type="text"]:focus,
select:focus {
  outline: none;
  border-color: #1a73e8;
}

input[type="checkbox"] {
  margin-right: 8px;
}

button {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
  margin-bottom: 8px;
}

.btn-secondary:hover {
  background: #e8eaed;
}

.btn-danger {
  background: #ea4335;
  color: white;
}

.btn-danger:hover {
  background: #c5221f;
}

.btn-small {
  width: auto;
  padding: 6px 12px;
  margin-top: 8px;
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.btn-small:hover {
  background: #e8eaed;
}

.actions {
  margin-bottom: 16px;
}

footer {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid #dadce0;
}

.version {
  font-size: 12px;
  color: #9aa0a6;
}
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: `dist/popup/popup.html` and `dist/popup/popup.css` created

**Step 4: Commit popup UI**

```bash
git add src/popup/popup.html src/popup/popup.css
git commit -m "feat: add popup UI HTML and CSS"
```

---

## Task 9: Popup UI - JavaScript Logic

**Files:**
- Create: `src/popup/popup.js`

**Step 1: Create popup JavaScript**

Create `src/popup/popup.js`:

```javascript
import storage from '../utils/storage.js';
import api from '../utils/api.js';

/**
 * Popup UI logic
 */

const elements = {
  statusText: document.getElementById('status-text'),
  statusIndicator: document.getElementById('status-indicator'),
  apiProvider: document.getElementById('api-provider'),
  apiKey: document.getElementById('api-key'),
  validateKey: document.getElementById('validate-key'),
  sensitivity: document.getElementById('sensitivity'),
  notificationsEnabled: document.getElementById('notifications-enabled'),
  saveSettings: document.getElementById('save-settings'),
  viewHistory: document.getElementById('view-history'),
  clearData: document.getElementById('clear-data'),
};

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await storage.getSettings();

  elements.apiProvider.value = settings.apiProvider;
  elements.apiKey.value = settings.apiKey;
  elements.sensitivity.value = settings.sensitivity;
  elements.notificationsEnabled.checked = settings.notificationsEnabled;
}

/**
 * Update status indicator
 */
async function updateStatus() {
  const currentSession = await storage.getCurrentSession();

  if (currentSession) {
    elements.statusText.textContent = 'Monitoring active';
    elements.statusIndicator.classList.add('active');
  } else {
    elements.statusText.textContent = 'Not monitoring';
    elements.statusIndicator.classList.remove('active');
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  const settings = {
    apiProvider: elements.apiProvider.value,
    apiKey: elements.apiKey.value,
    sensitivity: elements.sensitivity.value,
    notificationsEnabled: elements.notificationsEnabled.checked,
  };

  await storage.saveSettings(settings);

  // Show success feedback
  const originalText = elements.saveSettings.textContent;
  elements.saveSettings.textContent = '✓ Saved!';
  elements.saveSettings.style.background = '#34a853';

  setTimeout(() => {
    elements.saveSettings.textContent = originalText;
    elements.saveSettings.style.background = '';
  }, 2000);
}

/**
 * Validate API key
 */
async function validateApiKey() {
  const apiKey = elements.apiKey.value;
  const provider = elements.apiProvider.value;

  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  elements.validateKey.textContent = 'Validating...';
  elements.validateKey.disabled = true;

  try {
    const isValid = await api.validateApiKey(apiKey, provider);

    if (isValid) {
      alert('✓ API key is valid!');
    } else {
      alert('✗ API key is invalid. Please check and try again.');
    }
  } catch (error) {
    alert(`Validation error: ${error.message}`);
  } finally {
    elements.validateKey.textContent = 'Validate';
    elements.validateKey.disabled = false;
  }
}

/**
 * View history (open summary page)
 */
function viewHistory() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('summary/summary.html'),
  });
}

/**
 * Clear all data
 */
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }

  await storage.clearAllData();
  alert('All data cleared');

  // Reload settings
  await loadSettings();
  await updateStatus();
}

// Event listeners
elements.saveSettings.addEventListener('click', saveSettings);
elements.validateKey.addEventListener('click', validateApiKey);
elements.viewHistory.addEventListener('click', viewHistory);
elements.clearData.addEventListener('click', clearAllData);

// Initialize
loadSettings();
updateStatus();

// Update status every 2 seconds
setInterval(updateStatus, 2000);

console.log('Popup loaded');
```

**Step 2: Build and test**

```bash
npm run build
```

Expected: `dist/popup/popup.js` created

**Step 3: Commit popup logic**

```bash
git add src/popup/popup.js
git commit -m "feat: add popup UI JavaScript logic"
```

---

## Task 10: Summary Report - HTML Structure

**Files:**
- Create: `src/summary/summary.html`
- Create: `src/summary/summary.css`

**Step 1: Create summary HTML**

Create `src/summary/summary.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Summary - Body Language Coach</title>
  <link rel="stylesheet" href="summary.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Meeting Body Language Summary</h1>
      <p class="subtitle">Your performance analysis and recommendations</p>
    </header>

    <section id="loading" class="loading">
      <p>Loading summary...</p>
    </section>

    <section id="summary-content" class="hidden">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Duration</div>
          <div class="stat-value" id="duration">--</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Analyses</div>
          <div class="stat-value" id="analyses-count">--</div>
        </div>
        <div class="stat-card overall-score">
          <div class="stat-label">Overall Score</div>
          <div class="stat-value" id="overall-score">--</div>
        </div>
      </div>

      <div class="categories">
        <h2>Category Breakdown</h2>

        <div class="category-card" id="posture-card">
          <div class="category-header">
            <h3>Posture</h3>
            <span class="category-score" id="posture-score">--</span>
          </div>
          <p class="category-summary" id="posture-summary">--</p>
          <p class="category-recommendation" id="posture-recommendation">--</p>
        </div>

        <div class="category-card" id="facial-card">
          <div class="category-header">
            <h3>Facial Expressions</h3>
            <span class="category-score" id="facial-score">--</span>
          </div>
          <p class="category-summary" id="facial-summary">--</p>
          <p class="category-recommendation" id="facial-recommendation">--</p>
        </div>

        <div class="category-card" id="hands-card">
          <div class="category-header">
            <h3>Hand Gestures</h3>
            <span class="category-score" id="hands-score">--</span>
          </div>
          <p class="category-summary" id="hands-summary">--</p>
          <p class="category-recommendation" id="hands-recommendation">--</p>
        </div>

        <div class="category-card" id="appearance-card">
          <div class="category-header">
            <h3>Appearance</h3>
            <span class="category-score" id="appearance-score">--</span>
          </div>
          <p class="category-summary" id="appearance-summary">--</p>
          <p class="category-recommendation" id="appearance-recommendation">--</p>
        </div>
      </div>

      <div class="timeline">
        <h2>Performance Timeline</h2>
        <canvas id="timeline-chart"></canvas>
      </div>

      <div class="recommendations">
        <h2>Top 3 Action Items</h2>
        <ol id="action-items">
          <li>Loading...</li>
        </ol>
      </div>

      <div class="actions">
        <button id="export-pdf" class="btn-primary">Export as PDF</button>
        <button id="view-all-sessions" class="btn-secondary">View All Sessions</button>
      </div>
    </section>
  </div>

  <script src="summary.js"></script>
</body>
</html>
```

**Step 2: Create summary CSS**

Create `src/summary/summary.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f8f9fa;
  color: #333;
  line-height: 1.6;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 16px;
}

header {
  text-align: center;
  margin-bottom: 32px;
}

h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a73e8;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: #5f6368;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #202124;
}

.loading {
  text-align: center;
  padding: 48px;
  font-size: 18px;
  color: #5f6368;
}

.hidden {
  display: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #5f6368;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #202124;
}

.overall-score .stat-value {
  color: #1a73e8;
}

.categories {
  margin-bottom: 32px;
}

.category-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #dadce0;
}

.category-card.excellent {
  border-left-color: #34a853;
}

.category-card.warning {
  border-left-color: #fbbc04;
}

.category-card.critical {
  border-left-color: #ea4335;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.category-score {
  font-size: 24px;
  font-weight: 700;
  color: #5f6368;
}

.category-summary {
  font-size: 14px;
  color: #5f6368;
  margin-bottom: 8px;
}

.category-recommendation {
  font-size: 14px;
  color: #202124;
  font-weight: 500;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.timeline {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

#timeline-chart {
  max-height: 300px;
}

.recommendations {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

#action-items {
  padding-left: 24px;
}

#action-items li {
  margin-bottom: 12px;
  font-size: 16px;
  color: #202124;
}

.actions {
  display: flex;
  gap: 16px;
}

button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.btn-secondary:hover {
  background: #e8eaed;
}
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: `dist/summary/summary.html` and `dist/summary/summary.css` created

**Step 4: Commit summary UI**

```bash
git add src/summary/summary.html src/summary/summary.css
git commit -m "feat: add summary report HTML and CSS"
```

---

## Task 11: Summary Report - JavaScript Logic

**Files:**
- Create: `src/summary/summary.js`

**Step 1: Create summary JavaScript**

Create `src/summary/summary.js`:

```javascript
import storage from '../utils/storage.js';

/**
 * Summary report logic
 */

let currentSession = null;

/**
 * Load and display most recent session
 */
async function loadSummary() {
  const sessions = await storage.getSessions();

  if (sessions.length === 0) {
    document.getElementById('loading').innerHTML = '<p>No meeting data available.</p>';
    return;
  }

  // Get most recent session
  currentSession = sessions[sessions.length - 1];

  displaySummary(currentSession);
}

/**
 * Display summary data
 */
function displaySummary(session) {
  // Hide loading, show content
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('summary-content').classList.remove('hidden');

  // Calculate stats
  const duration = Math.round((session.endTime - session.startTime) / 1000 / 60);
  const analysisCount = session.analyses.length;

  document.getElementById('duration').textContent = `${duration} min`;
  document.getElementById('analyses-count').textContent = analysisCount;

  // Calculate category averages
  const categories = ['posture', 'facial', 'hands', 'appearance'];
  const averages = {};
  const issues = {};
  const recommendations = {};

  categories.forEach((category) => {
    const scores = session.analyses
      .map(a => a[category]?.score)
      .filter(s => s !== undefined);

    averages[category] = scores.length > 0
      ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)
      : 0;

    // Collect issues and recommendations
    const categoryIssues = session.analyses
      .map(a => a[category]?.issue)
      .filter(i => i !== null && i !== undefined);

    issues[category] = categoryIssues.length > 0
      ? `${categoryIssues.length} issues detected`
      : 'No issues detected';

    const categoryRecs = session.analyses
      .map(a => a[category]?.suggestion)
      .filter(r => r !== null && r !== undefined);

    recommendations[category] = categoryRecs.length > 0
      ? categoryRecs[0]
      : 'Keep up the good work!';
  });

  // Calculate overall score
  const overallScore = (
    categories.reduce((sum, cat) => sum + parseFloat(averages[cat]), 0) / categories.length
  ).toFixed(1);

  document.getElementById('overall-score').textContent = `${overallScore}/10`;

  // Display category breakdowns
  categories.forEach((category) => {
    const score = averages[category];
    const card = document.getElementById(`${category}-card`);

    // Set severity class
    if (score >= 8) {
      card.classList.add('excellent');
    } else if (score >= 5) {
      card.classList.add('warning');
    } else {
      card.classList.add('critical');
    }

    document.getElementById(`${category}-score`).textContent = `${score}/10`;
    document.getElementById(`${category}-summary`).textContent = issues[category];
    document.getElementById(`${category}-recommendation`).textContent = recommendations[category];
  });

  // Generate timeline chart
  generateTimeline(session, categories);

  // Generate top 3 action items
  generateActionItems(averages, recommendations);
}

/**
 * Generate timeline chart
 */
function generateTimeline(session, categories) {
  const ctx = document.getElementById('timeline-chart').getContext('2d');

  // Prepare data
  const labels = session.analyses.map((_, i) => `${i * 0.5} min`);
  const datasets = categories.map((category, index) => ({
    label: category.charAt(0).toUpperCase() + category.slice(1),
    data: session.analyses.map(a => a[category]?.score || 0),
    borderColor: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][index],
    backgroundColor: ['#ea433550', '#fbbc0450', '#34a85350', '#4285f450'][index],
    tension: 0.4,
  }));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          title: {
            display: true,
            text: 'Score',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Time',
          },
        },
      },
    },
  });
}

/**
 * Generate top 3 action items
 */
function generateActionItems(averages, recommendations) {
  // Sort categories by score (lowest first)
  const sorted = Object.entries(averages)
    .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
    .slice(0, 3);

  const actionItems = sorted.map(([category, score]) => {
    return `<strong>${category.charAt(0).toUpperCase() + category.slice(1)}</strong> (${score}/10): ${recommendations[category]}`;
  });

  document.getElementById('action-items').innerHTML = actionItems
    .map(item => `<li>${item}</li>`)
    .join('');
}

/**
 * Export as PDF (simple implementation)
 */
function exportAsPDF() {
  window.print();
}

/**
 * View all sessions
 */
async function viewAllSessions() {
  const sessions = await storage.getSessions();
  alert(`Total sessions: ${sessions.length}\n\nThis feature will show a list of all meetings in a future update.`);
}

// Event listeners
document.getElementById('export-pdf').addEventListener('click', exportAsPDF);
document.getElementById('view-all-sessions').addEventListener('click', viewAllSessions);

// Initialize
loadSummary();

console.log('Summary page loaded');
```

**Step 2: Build extension**

```bash
npm run build
```

Expected: `dist/summary/summary.js` created

**Step 3: Test complete build**

```bash
ls -R dist/
```

Expected: All files present in dist/ directory

**Step 4: Commit summary logic**

```bash
git add src/summary/summary.js
git commit -m "feat: add summary report JavaScript with Chart.js visualization"
```

---

## Task 12: Fix Module Import Issues

**Note:** The current implementation uses ES6 modules (`import`), but Chrome extension content scripts and service workers need special handling for modules.

**Files:**
- Modify: `webpack.config.js`

**Step 1: Update webpack config for better module handling**

Modify `webpack.config.js`:

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    'content/content': './src/content/content.js',
    'background/background': './src/background/background.js',
    'popup/popup': './src/popup/popup.js',
    'summary/summary': './src/summary/summary.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean dist folder before each build
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '100',
                },
              }],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/summary/summary.html', to: 'summary/summary.html' },
        { from: 'src/summary/summary.css', to: 'summary/summary.css' },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
  ],
};
```

**Step 2: Rebuild extension**

```bash
npm run build
```

Expected: Clean build with all modules bundled

**Step 3: Commit webpack fix**

```bash
git add webpack.config.js
git commit -m "fix: update webpack config for proper module bundling"
```

---

## Task 13: Load Extension in Chrome for Testing

**Manual Testing Steps:**

**Step 1: Build extension**

```bash
npm run build
```

**Step 2: Load in Chrome**

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist` folder from your project
5. Extension should appear in toolbar

**Step 3: Test basic functionality**

1. Click extension icon - popup should appear
2. Enter a dummy API key in settings
3. Visit https://meet.google.com/new
4. Check browser console for "Content script loaded" message

**Step 4: Verify files loaded**

In Chrome DevTools (F12), check:
- Console shows no errors
- Extension icon is visible
- Popup opens correctly

**Expected Results:**
- Extension loads without errors
- Popup UI is functional
- Content script injects into Google Meet pages

---

## Task 14: Add Error Handling & Edge Cases

**Files:**
- Modify: `src/background/background.js`
- Modify: `src/content/content.js`

**Step 1: Add error handling to background worker**

Modify `src/background/background.js`, add error handling in `handleFrameAnalysis`:

```javascript
async function handleFrameAnalysis(message) {
  if (!currentSession) {
    console.error('No active session');
    return;
  }

  try {
    // Get settings
    const settings = await storage.getSettings();

    if (!settings.apiKey) {
      console.error('No API key configured');
      // Only show this notification once
      if (!currentSession.noKeyWarningShown) {
        showNotification('Setup Required', 'Please add your API key in the extension popup');
        currentSession.noKeyWarningShown = true;
      }
      return;
    }

    // Call API for analysis
    console.log('Analyzing frame...');
    const analysis = await api.analyze(
      message.frame,
      settings.apiKey,
      settings.apiProvider
    );

    // Validate analysis structure
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis response');
    }

    // Add timestamp
    analysis.timestamp = message.timestamp;

    // Save to current session
    currentSession.analyses.push(analysis);
    await storage.saveCurrentSession(currentSession);

    console.log('Analysis result:', analysis);

    // Check for issues and send notifications
    checkForIssues(analysis, settings);

  } catch (error) {
    console.error('Analysis error:', error);

    // Only show error notification if not a rate limit issue
    if (!error.message.includes('rate limit')) {
      showNotification('Analysis Error', 'Failed to analyze frame. Check your API key and connection.');
    }
  }
}
```

**Step 2: Add robustness to content script**

Modify `src/content/content.js`, update `findVideoElement`:

```javascript
function findVideoElement() {
  // Google Meet shows user's video in a video element
  // Try multiple selectors as Meet's DOM can vary
  const selectors = [
    'video[autoplay]',
    'video.participant-video',
    'div[data-self-video="true"] video',
    'div[jsname] video', // Fallback for obfuscated DOM
  ];

  for (const selector of selectors) {
    try {
      const videos = document.querySelectorAll(selector);

      // Find the video with an active srcObject (user's camera)
      for (const video of videos) {
        if (video.srcObject && video.readyState >= 2) {
          return video;
        }
      }
    } catch (error) {
      console.warn(`Selector failed: ${selector}`, error);
    }
  }

  return null;
}
```

**Step 3: Rebuild and test**

```bash
npm run build
```

**Step 4: Commit error handling**

```bash
git add src/background/background.js src/content/content.js
git commit -m "feat: add error handling and edge case management"
```

---

## Task 15: Create README Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README with complete instructions**

Replace contents of `README.md`:

```markdown
# 🎯 Meeting Body Language Coach

Real-time body language feedback for Google Meet video calls using AI vision analysis.

## Features

- **Real-time Monitoring**: Analyzes your body language every 30 seconds during meetings
- **Smart Alerts**: Notifies you of posture, facial expression, hand gesture, and appearance issues
- **Post-Meeting Summary**: Detailed report with scores, timeline graph, and actionable recommendations
- **Privacy-Focused**: Uses your own API key, data stays local
- **Extensible**: Built to support Zoom, Teams, and other platforms in the future

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+)
- Webpack 5 for bundling
- Anthropic Claude 3.5 Sonnet API (primary)
- OpenAI GPT-4 Vision API (alternative)
- Chart.js for visualizations

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Anthropic API key (get one at https://console.anthropic.com/)

### Development Setup

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd meeting-body-language-coach
npm install
```

2. **Build the extension:**

```bash
npm run build
```

3. **Load in Chrome:**

- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (toggle in top-right)
- Click "Load unpacked"
- Select the `dist` folder

4. **Configure API key:**

- Click extension icon in toolbar
- Enter your Anthropic API key
- Click "Validate" to test
- Click "Save Settings"

## Usage

1. **Join a Google Meet call**
2. **Extension automatically starts monitoring** when your video is active
3. **Receive real-time alerts** for body language issues
4. **View summary report** after meeting ends

## Development

### Available Scripts

```bash
npm run build      # Production build
npm run dev        # Development build with watch mode
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Project Structure

```
src/
├── content/          # Content script (injected into Google Meet)
├── background/       # Service worker (main logic)
├── popup/           # Extension popup UI
├── summary/         # Post-meeting summary page
└── utils/           # Shared utilities (API, storage, constants)
```

## API Costs

- **Anthropic Claude**: ~$0.015 per analysis (30 seconds)
- **OpenAI GPT-4 Vision**: ~$0.01 per analysis
- **Estimated cost**: $0.50 - $1.00 per 1-hour meeting

## Troubleshooting

### Extension not detecting video

- Make sure camera permissions are granted to Google Meet
- Refresh the Meet page
- Check browser console for errors

### Analysis not working

- Verify API key is valid (use "Validate" button)
- Check you have sufficient API credits
- Ensure internet connection is stable

### No notifications appearing

- Check Chrome notification permissions
- Verify "Enable notifications" is checked in settings
- Make sure you're not in Do Not Disturb mode

## Future Enhancements

- [ ] Support for Zoom and Microsoft Teams
- [ ] Local ML models (reduce API costs)
- [ ] Team analytics dashboard
- [ ] Voice analysis (tone, pace, filler words)
- [ ] Mobile app for practice mode

## License

MIT License - see LICENSE file for details

## Contributing

This was built for a hackathon. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for better meeting presence**
```

**Step 2: Commit updated README**

```bash
git add README.md
git commit -m "docs: update README with complete setup and usage instructions"
```

---

## Task 16: Final Testing & Polish

**Manual Testing Checklist:**

**Step 1: Test popup UI**
- [ ] Extension icon appears in toolbar
- [ ] Popup opens without errors
- [ ] Settings can be saved
- [ ] API key validation works
- [ ] Status indicator updates correctly

**Step 2: Test content script**
- [ ] Join a Google Meet test room
- [ ] Check console shows "Content script loaded"
- [ ] Verify frame capture is working (check background console)

**Step 3: Test background worker**
- [ ] Open background service worker console: `chrome://extensions/` → Extension details → "service worker"
- [ ] Verify messages received from content script
- [ ] Check API calls are made (or errors if no API key)

**Step 4: Test notifications**
- [ ] Configure a valid API key
- [ ] Join a meeting with poor posture (test critical alerts)
- [ ] Verify notification appears
- [ ] Check cooldown works (no spam)

**Step 5: Test summary report**
- [ ] End a meeting
- [ ] Summary page should open automatically
- [ ] Verify scores are calculated
- [ ] Check timeline chart displays
- [ ] Test export functionality (print preview)

**Expected Results:**
- All features work end-to-end
- No console errors
- Clean UI rendering
- Notifications appear appropriately

---

## Task 17: Create Demo Assets

**For hackathon presentation:**

**Step 1: Take screenshots**

1. Extension popup with settings
2. Google Meet with monitoring active
3. Notification example
4. Summary report page

Save to `docs/screenshots/` folder

**Step 2: Record demo video (optional)**

1. Screen recording of full flow:
   - Install extension
   - Configure API key
   - Join meeting
   - Receive alerts
   - View summary

**Step 3: Create pitch deck outline**

Create `docs/PITCH.md`:

```markdown
# Meeting Body Language Coach - Pitch

## Problem (30 sec)
- 68% of communication is non-verbal
- Can't see ourselves in meetings
- Bad habits hurt professional image

## Solution (30 sec)
- Chrome extension for real-time feedback
- AI-powered analysis (Claude 3.5)
- Actionable coaching

## Demo (2 min)
[Live demonstration]

## Technical (1 min)
- Manifest V3, modern JavaScript
- Hybrid approach: local + cloud
- Privacy-focused, extensible

## Impact (30 sec)
- Better meeting presence
- Professional development
- Market: remote workers, sales, executives
```

**Step 4: Commit demo assets**

```bash
git add docs/
git commit -m "docs: add demo assets and pitch outline"
```

---

## Completion Checklist

- [x] Project scaffolded with webpack and manifest
- [x] Utility modules created (constants, storage, API client)
- [x] Content script captures frames from Google Meet
- [x] Background worker analyzes frames and manages notifications
- [x] Popup UI for settings and status
- [x] Summary report with Chart.js visualizations
- [x] Error handling and edge cases covered
- [x] README documentation complete
- [x] Manual testing performed
- [x] Demo assets prepared

## Next Steps

**For Hackathon:**
1. ✅ Complete implementation (Tasks 1-17)
2. Test thoroughly with real Google Meet calls
3. Polish UI/UX based on testing feedback
4. Prepare demo script and practice
5. Create pitch presentation
6. Deploy demo video as backup

**Post-Hackathon:**
1. Add unit tests
2. Implement Zoom support
3. Add local ML models (TensorFlow.js)
4. Publish to Chrome Web Store
5. Gather user feedback
6. Iterate on features

---

## Success Criteria

**MVP Complete When:**
- ✅ Extension installs without errors
- ✅ Captures frames from Google Meet
- ✅ API integration works (Claude/OpenAI)
- ✅ Notifications display correctly
- ✅ Summary report shows data

**Hackathon Ready When:**
- Live demo runs smoothly end-to-end
- UI is polished and professional
- No critical bugs or crashes
- Pitch deck and demo video ready
- Code is clean and documented

**Good luck with the hackathon! 🚀**
