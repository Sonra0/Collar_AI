# Meeting Body Language Coach - Design Document

**Date:** 2026-02-27
**Project:** Chrome Extension for Real-time Body Language Analysis in Google Meet
**Purpose:** Hackathon Project

---

## Executive Summary

A Chrome extension that monitors body language during Google Meet video calls and provides real-time feedback plus post-meeting summaries. Uses cloud-based AI vision models (Claude 3.5 Sonnet or GPT-4 Vision) to analyze posture, facial expressions, hand gestures, and appearance.

**Key Features:**
- Real-time monitoring with immediate alerts for critical issues
- Post-meeting summary reports with scores and recommendations
- Privacy-focused with user-provided API keys
- Extensible architecture for future platform support (Zoom, Teams)

---

## 1. Architecture Overview

The extension consists of four core components working together:

### 1.1 Content Script
- **Location:** Injected into Google Meet pages
- **Responsibilities:**
  - Detect meeting start/end (video element presence)
  - Access user's video stream
  - Capture frames every 30 seconds
  - Send frame data to background worker
  - Monitor meeting status

### 1.2 Background Service Worker
- **Location:** Persistent background process
- **Responsibilities:**
  - Receive frames from content script
  - Manage API calls to Vision services
  - Store analysis results locally
  - Implement rate limiting (max 2 analyses/minute)
  - Trigger notification manager
  - Track meeting sessions

### 1.3 Popup UI
- **Location:** Extension popup (click on icon)
- **Responsibilities:**
  - Display real-time monitoring status
  - Settings management (API key, sensitivity)
  - Control buttons (start/stop monitoring)
  - Quick stats display
  - Access to meeting history

### 1.4 Notification Manager
- **Location:** Part of background worker
- **Responsibilities:**
  - Send Chrome notifications based on severity
  - Manage notification frequency (anti-spam)
  - Generate post-meeting summary reports
  - Handle user preferences for alerts

**Overall Flow:**
```
Google Meet Page → Content Script → Background Worker → Vision API
                                          ↓
                                    Analysis Results
                                          ↓
                                    Storage + Notifications
                                          ↓
                                    User Feedback
```

---

## 2. Extension Components Detail

### 2.1 Manifest Configuration (manifest.json)

**Manifest Version:** V3 (latest Chrome standard)

**Permissions Required:**
- `activeTab` - Access Google Meet tab content
- `notifications` - Show body language alerts
- `storage` - Persist settings and session data
- `scripting` - Inject content scripts dynamically

**Host Permissions:**
- `*://meet.google.com/*` - Google Meet access
- Future: `*://zoom.us/*`, `*://teams.microsoft.com/*`

**Key Configuration:**
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
  ]
}
```

### 2.2 Content Script Implementation

**Frame Capture Logic:**
```javascript
// Detect user's video element (self-view)
const videoElement = document.querySelector('video[autoplay]');

// Capture frame using Canvas API
function captureFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Convert to base64 JPEG (compressed)
  const frameData = canvas.toDataURL('image/jpeg', 0.8);
  return frameData;
}

// Send to background worker every 30 seconds
setInterval(() => {
  if (isMeetingActive) {
    const frame = captureFrame();
    chrome.runtime.sendMessage({
      type: 'ANALYZE_FRAME',
      frame: frame,
      timestamp: Date.now()
    });
  }
}, 30000);
```

**Meeting Detection:**
- Watch for video element insertion in DOM
- Monitor tab visibility (pause when user switches tabs)
- Detect meeting end (video element removal)

### 2.3 Background Service Worker

**API Client Module (utils/api.js):**

**Claude 3.5 Sonnet Integration:**
```javascript
async function analyzeWithClaude(frameBase64, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: frameBase64.split(',')[1]
            }
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT
          }
        ]
      }]
    })
  });

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

**Rate Limiting:**
- Max 2 API calls per minute
- Queue frames if rate limit hit
- Estimate cost tracking (~$0.015 per frame)

**Storage Schema:**
```javascript
{
  settings: {
    apiKey: "encrypted_key",
    apiProvider: "claude" | "openai",
    sensitivity: "low" | "medium" | "high",
    notificationsEnabled: true
  },
  sessions: [
    {
      id: "uuid",
      startTime: timestamp,
      endTime: timestamp,
      analyses: [
        {
          timestamp: timestamp,
          posture: { score: 8, issue: "slight slouch", suggestion: "..." },
          facial: { score: 9, issue: null, suggestion: null },
          hands: { score: 6, issue: "...", suggestion: "..." },
          appearance: { score: 10, issue: null, suggestion: null }
        }
      ]
    }
  ]
}
```

---

## 3. Body Language Analysis System

### 3.1 Analysis Prompt Structure

**Prompt Template:**
```
You are a professional body language coach analyzing someone in a work meeting.
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
}
```

### 3.2 Severity Classification

**Scoring System:**
- **10-8 (Excellent):** No issues, professional presentation
- **7-5 (Warning):** Minor issues, room for improvement
- **4-0 (Critical):** Significant problems, immediate attention needed

**Alert Triggers:**
- **Critical (score < 5):** Immediate notification on first detection
- **Warning (score 5-7):** Notification after 2 consecutive checks (1 minute)
- **Good (score ≥ 8):** No notification, logged for summary

### 3.3 Analysis Frequency

- **Active Meeting:** Every 30 seconds
- **Tab Not Active:** Pause analysis (save API costs)
- **Meeting Ended:** Stop analysis, generate summary
- **Low Battery (future):** Reduce frequency to 60 seconds

---

## 4. Notification System

### 4.1 Real-Time Alerts (During Meeting)

**Critical Alerts** (immediate):
- Severe posture issues (slouching, head too far forward)
- Completely disengaged facial expression (sleeping, looking away)
- Major appearance problems (collar very crooked, visible mess)
- No hand gestures for extended period in presentation context

**Warning Alerts** (after 2+ consecutive detections):
- Moderate posture decline
- Low engagement signals
- Minor appearance issues

**Notification Format:**
```javascript
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/icon128.png',
  title: 'Body Language Alert',
  message: 'Your posture has dropped - sit up straight!',
  priority: 2,
  requireInteraction: false, // Auto-dismiss after 5 seconds
  buttons: [
    { title: 'Mute for 10 min' }
  ]
});
```

**Smart Notification Logic:**
- Max 1 notification per 2 minutes (anti-spam)
- Group similar issues: "Multiple issues detected - check posture & appearance"
- User can mute alerts for current meeting via popup
- Severity-based priority (critical issues override mute)

### 4.2 Post-Meeting Summary Report

**Trigger:** Meeting end detected (video element removed from DOM)

**Summary Page Components:**

1. **Header Stats:**
   - Meeting duration: "45 minutes monitored"
   - Total analyses: "90 checks performed"
   - Overall score: 7.8/10 (color-coded: green/yellow/red)

2. **Category Breakdown:**
   ```
   Posture:     7.5/10 ⚠️
   - Good overall, but 2 slouching moments at 15:30 and 28:45
   - Recommendation: Take posture breaks every 15 minutes

   Facial:      8.2/10 ✅
   - Great engagement throughout
   - Good eye contact with camera

   Hands:       5.8/10 ⚠️
   - Low gesture usage (hands not visible 40% of time)
   - Recommendation: Use hand gestures to emphasize key points

   Appearance:  9.5/10 ✅
   - Professional throughout meeting
   ```

3. **Timeline Graph:**
   - X-axis: Meeting time (0-45 min)
   - Y-axis: Score (0-10)
   - Four lines: Posture, Facial, Hands, Appearance
   - Markers for alert moments

4. **Top 3 Action Items:**
   - Ranked by impact and frequency
   - Specific, actionable recommendations

5. **Export Options:**
   - Download as PDF
   - Copy to clipboard (text summary)
   - Share anonymized stats (opt-in, for benchmarking)

**Implementation:**
- Opens in new tab (`summary/summary.html`)
- Reads session data from chrome.storage
- Uses Chart.js for timeline visualization
- Responsive design (mobile-friendly)

---

## 5. Data Flow & Privacy

### 5.1 Data Flow Pipeline

```
User Camera (Google Meet)
       ↓
Content Script (Frame Capture)
       ↓
Base64 JPEG Frame (~50KB)
       ↓
Background Service Worker
       ↓
Vision API (Claude/GPT-4) [HTTPS]
       ↓
JSON Analysis Result (~1KB)
       ↓
Chrome Local Storage (encrypted)
       ↓
Notifications + Summary Report
```

### 5.2 Privacy Measures

**Frame Handling:**
- Frames exist only in memory during capture
- Immediately sent to API via HTTPS
- No local disk storage of images
- Frames deleted from memory after API response

**API Communication:**
- HTTPS only (TLS 1.3)
- User provides their own API key (no shared keys)
- API key stored encrypted in chrome.storage.local
- Option to use self-hosted API endpoint (for enterprises)

**Data Retention:**
- Analysis results (JSON only, no images) stored locally
- Default retention: 7 days
- User can clear history anytime
- Option to disable all data collection (ephemeral mode)

**Transparency:**
- Visual indicator when monitoring is active (icon badge shows "ON")
- Activity log: timestamps of all analyses
- Data export: user can download all stored data as JSON
- One-click data deletion

### 5.3 User Controls

**Settings (in popup):**
- API Provider: Claude / OpenAI / Custom endpoint
- API Key: encrypted text input with validation
- Sensitivity: Low / Medium / High
  - High: Alert on any issue (score < 7)
  - Medium: Alert on warnings (score < 6)
  - Low: Alert only on critical (score < 5)
- Notifications: Enable/Disable
- Data Retention: 1 day / 7 days / 30 days / Manual clear only
- Ephemeral Mode: No data storage (analysis only)

### 5.4 Chrome Web Store Compliance

**Permissions Justification:**
- `activeTab`: Required to detect Google Meet and access video stream
- `notifications`: Display body language alerts to user
- `storage`: Store user settings and session history locally
- `scripting`: Inject content scripts into Google Meet pages

**Privacy Policy Highlights:**
- No data collected by extension developer
- User-provided API keys never leave user's device (except for API calls)
- No third-party analytics or tracking
- No remote code execution
- Open source (GitHub repository for transparency)

**Security Measures:**
- No eval() or unsafe-eval in CSP
- No external script loading
- Input validation on all user inputs
- API key encryption using Web Crypto API

---

## 6. Tech Stack & Implementation

### 6.1 Core Technologies

**Extension Framework:**
- **Chrome Extension Manifest V3** - Latest standard (future-proof)
- **Vanilla JavaScript (ES6+)** - No framework needed, smaller bundle
- **HTML5 + CSS3** - Modern UI with flexbox/grid
- **Web APIs:** Canvas API, Chrome Extension APIs, Fetch API

**AI/ML Services:**
- **Primary: Anthropic Claude 3.5 Sonnet**
  - Model: `claude-3-5-sonnet-20241022`
  - Best for nuanced visual analysis and detailed feedback
  - Cost: ~$0.015 per image analysis
  - API: `https://api.anthropic.com/v1/messages`
  - Rate limits: 50 requests/minute (tier 1)

- **Alternative: OpenAI GPT-4 Vision**
  - Model: `gpt-4-vision-preview`
  - Widely available, good accuracy
  - Cost: ~$0.01 per image
  - API: `https://api.openai.com/v1/chat/completions`
  - Rate limits: 60 requests/minute

**Visualization:**
- **Chart.js v4** - Timeline graphs in summary report
- Lightweight, responsive, well-documented

### 6.2 Development Tools

**Build System:**
- **Node.js 18+** - Runtime environment
- **npm** - Package management
- **Webpack 5** - Bundle extension files, optimize assets
- **Babel** - Transpile ES6+ for compatibility

**Code Quality:**
- **ESLint** - JavaScript linting (Airbnb style guide)
- **Prettier** - Code formatting
- **Chrome DevTools** - Extension debugging

**Testing:**
- Manual testing in Chrome developer mode
- Test scenarios: meeting start/end, frame capture, API calls, notifications

### 6.3 Project Structure

```
meeting-body-language-coach/
├── manifest.json                 # Extension configuration
├── package.json                  # npm dependencies
├── webpack.config.js             # Build configuration
├── .eslintrc.js                  # Linting rules
├── README.md                     # Project documentation
│
├── src/
│   ├── content/
│   │   └── content.js            # Injected into Google Meet
│   │
│   ├── background/
│   │   └── background.js         # Service worker (main logic)
│   │
│   ├── popup/
│   │   ├── popup.html            # Extension popup UI
│   │   ├── popup.js              # Popup logic
│   │   └── popup.css             # Popup styles
│   │
│   ├── summary/
│   │   ├── summary.html          # Post-meeting report page
│   │   ├── summary.js            # Report generation logic
│   │   └── summary.css           # Report styles
│   │
│   └── utils/
│       ├── api.js                # Vision API client (Claude/OpenAI)
│       ├── storage.js            # Chrome storage wrapper
│       ├── constants.js          # Shared constants (prompts, thresholds)
│       └── crypto.js             # API key encryption utilities
│
├── icons/
│   ├── icon16.png                # Toolbar icon
│   ├── icon48.png                # Extension management
│   └── icon128.png               # Chrome Web Store
│
├── dist/                         # Built extension (webpack output)
│   └── [generated files]
│
└── docs/
    └── plans/
        └── 2026-02-27-meeting-body-language-coach-design.md
```

### 6.4 Dependencies

**package.json:**
```json
{
  "name": "meeting-body-language-coach",
  "version": "1.0.0",
  "description": "Real-time body language feedback for video meetings",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.{js,html,css}"
  },
  "dependencies": {
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "copy-webpack-plugin": "^11.0.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "babel-loader": "^9.1.3",
    "@babel/core": "^7.23.5",
    "@babel/preset-env": "^7.23.5"
  }
}
```

### 6.5 Development Timeline (Hackathon Ready)

**Total Time: 4-5 Days**

**Day 1: Foundation (6-8 hours)**
- ✅ Project setup (npm, webpack, eslint)
- ✅ Extension scaffold (manifest, popup, icons)
- ✅ Content script: detect Google Meet, capture frames
- ✅ Basic communication between content script and background worker

**Day 2: AI Integration (6-8 hours)**
- ✅ API client implementation (Claude/OpenAI)
- ✅ Prompt engineering and testing
- ✅ Background worker: receive frames, call API, parse results
- ✅ Storage: save analysis results

**Day 3: Notifications & UI (6-8 hours)**
- ✅ Notification manager: severity logic, anti-spam
- ✅ Popup UI: status display, settings, API key input
- ✅ Real-time alerts testing

**Day 4: Summary Report (6-8 hours)**
- ✅ Summary page: HTML/CSS layout
- ✅ Chart.js integration: timeline graphs
- ✅ Data aggregation: calculate scores, generate recommendations
- ✅ Export functionality (PDF/text)

**Day 5: Polish & Demo Prep (4-6 hours)**
- ✅ Bug fixes and edge case handling
- ✅ UI/UX improvements
- ✅ Demo video recording
- ✅ README and documentation
- ✅ Prepare pitch presentation

**Buffer Time:** 2-3 hours for unexpected issues

---

## 7. Hackathon Demo Strategy

### 7.1 Demo Flow (3-5 minutes)

1. **Problem Statement (30 sec)**
   - "68% of communication is non-verbal, but we can't see ourselves in meetings"
   - "Bad posture, low engagement, appearance issues hurt professional image"

2. **Solution Introduction (30 sec)**
   - Show extension icon in Chrome toolbar
   - "Real-time body language coach powered by AI"

3. **Live Demo (2 min)**
   - Join a Google Meet test room
   - Show popup: "Monitoring Active"
   - Demonstrate bad posture → get immediate notification
   - Fix posture → show improvement
   - End meeting → summary report appears

4. **Technical Highlights (1 min)**
   - "Uses Claude 3.5 Sonnet for visual analysis"
   - "Privacy-focused: your API key, your data"
   - "Extensible to Zoom, Teams in future"

5. **Impact & Future (30 sec)**
   - "Helps professionals improve meeting presence"
   - "Can add team analytics, coaching sessions, mobile app"

### 7.2 Wow Factors for Judges

- **Real-time AI analysis** - Live demo shows actual working product
- **Practical problem** - Everyone has been in meetings with bad posture
- **Privacy-conscious** - User-controlled API keys, no data collection
- **Polished UI** - Professional popup and summary report
- **Extensible** - Clear path to supporting more platforms
- **Market potential** - B2B sales to companies for employee training

### 7.3 Backup Plans

- **API Rate Limits:** Pre-cache some analysis results for demo
- **Internet Issues:** Record demo video as backup
- **Meeting Room Busy:** Use Google Meet's "Present in a meeting" test mode

---

## 8. Future Enhancements (Post-Hackathon)

### 8.1 Phase 2 Features
- **Platform Support:** Zoom, Microsoft Teams, Webex
- **Local ML Models:** TensorFlow.js for basic checks (reduce API costs)
- **Team Analytics:** Aggregate anonymized data for team insights
- **Coaching Mode:** Proactive tips before meetings
- **Mobile App:** Practice mode using phone camera

### 8.2 Phase 3 Features
- **Voice Analysis:** Tone, pace, filler words (um, uh)
- **Screen Share Feedback:** Presentation quality analysis
- **Meeting Sentiment:** Detect audience engagement
- **Integration:** Slack bot for weekly reports
- **Gamification:** Streaks, achievements, leaderboards

### 8.3 Business Model (If Commercializing)
- **Free Tier:** 10 analyses per month
- **Pro Tier:** $9.99/month - unlimited analyses, advanced features
- **Team Tier:** $49.99/month for 5 users - team analytics, admin dashboard
- **Enterprise:** Custom pricing - SSO, self-hosted, custom models

---

## 9. Risk Mitigation

### 9.1 Technical Risks

**Risk:** API rate limits during hackathon demo
**Mitigation:** Implement aggressive caching, use demo mode with pre-recorded results

**Risk:** Google Meet DOM changes break content script
**Mitigation:** Use resilient selectors (multiple fallbacks), test on various meeting layouts

**Risk:** Poor AI accuracy on edge cases
**Mitigation:** Extensive prompt engineering, fallback to "unable to analyze" instead of wrong feedback

**Risk:** Extension performance issues (high CPU/memory)
**Mitigation:** Optimize frame capture (lower resolution if needed), limit analysis frequency

### 9.2 User Experience Risks

**Risk:** Notification spam annoys users
**Mitigation:** Smart frequency limiting, mute option, severity thresholds

**Risk:** Inaccurate feedback frustrates users
**Mitigation:** Confidence scores, option to report false positives, continuous prompt improvement

**Risk:** Privacy concerns about camera access
**Mitigation:** Clear privacy policy, user controls, open-source code for transparency

### 9.3 Hackathon-Specific Risks

**Risk:** Not enough time to complete all features
**Mitigation:** MVP focus (Day 1-3 features are core, Day 4-5 are nice-to-have)

**Risk:** Technical difficulties during demo
**Mitigation:** Pre-recorded demo video, backup laptop, tested demo script

**Risk:** Judges don't understand technical complexity
**Mitigation:** Prepare simple analogies, focus on impact over implementation

---

## 10. Success Criteria

### 10.1 Hackathon Goals (Must-Have)
- ✅ Extension installs and runs in Chrome
- ✅ Successfully captures frames from Google Meet
- ✅ AI analysis returns valid JSON results
- ✅ At least 1 real-time notification works
- ✅ Basic summary report displays after meeting
- ✅ Live demo completes without crashes

### 10.2 Stretch Goals (Nice-to-Have)
- 🎯 Polished UI with professional design
- 🎯 Chart.js timeline graphs in summary
- 🎯 Multiple severity levels for notifications
- 🎯 Settings page with API key management
- 🎯 Export summary as PDF

### 10.3 Post-Hackathon Goals
- 📋 Publish to Chrome Web Store
- 📋 Add Zoom support
- 📋 User testing with 10+ beta users
- 📋 Blog post about technical architecture

---

## Conclusion

This design provides a complete roadmap for building a functional, impressive Chrome extension for hackathon demonstration. The hybrid approach (local capture + cloud AI) balances development speed with accuracy, ensuring a working demo can be completed in 4-5 days.

**Key Strengths:**
1. **Feasible:** No complex ML model training, uses proven APIs
2. **Impressive:** Real-time AI analysis with practical applications
3. **Extensible:** Architecture supports future platforms and features
4. **Privacy-Conscious:** User-controlled data and API keys

**Next Steps:**
1. Set up development environment (Node.js, Chrome DevTools)
2. Create detailed implementation plan with task breakdown
3. Begin Day 1 development: extension scaffold and frame capture

Ready to move to implementation planning! 🚀
