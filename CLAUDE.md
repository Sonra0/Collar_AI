# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CollarAI is a Chrome Extension (Manifest V3) that monitors body language during video calls using AI vision APIs (Claude / OpenAI) and provides real-time coaching feedback. Supports Google Meet, Zoom, Microsoft Teams, Slack, Discord, and Webex.

## Build & Development Commands

```bash
npm run build          # Production webpack bundle → dist/
npm run dev            # Development mode with watch
npm run test           # Node.js native test runner (node --test tests/*.test.mjs)
npm run lint           # ESLint on src/**/*.js
npm run format         # Prettier on src/**/*.{js,html,css}
npm run frame-recorder # Local frame recording server on port 3131
```

Load the extension: chrome://extensions → Developer mode → Load unpacked → select `dist/`

## Architecture

**Chrome Extension with 5 entry points** (each bundled separately by Webpack):

1. **Content Script** (`src/content/`) — Injected into supported video call platforms. Detects self-video element via platform-specific selectors (`platforms.js`) and scoring algorithm (`video-selection.mjs`), captures frames at `TIMING.CAPTURE_INTERVAL`, sends `ANALYZE_FRAME` messages to background.

2. **Background Service Worker** (`src/background/background.js`) — Central orchestrator. Receives messages from content script, calls vision APIs (`src/utils/api.js`), stores analysis results, triggers notifications with cooldown, manages session lifecycle (start → analyses → end → summary).

3. **Popup** (`src/popup/`) — Settings UI (API key, provider, sensitivity, privacy toggles) and monitoring status display.

4. **Live Coaching Window** (`src/live/`) — Real-time feed of coaching events (max 200 items), auto-refreshes from storage.

5. **Summary Page** (`src/summary/`) — Post-meeting report with Chart.js timeline, category scores, and ranked action items. Auto-opens when a meeting ends.

**Message flow:** Content script → `chrome.runtime.sendMessage()` → Background worker → Storage + API + Notifications

**Key message types:** `MEETING_STARTED`, `ANALYZE_FRAME`, `MEETING_ENDED`, `SET_MONITORING`, `REQUEST_STATUS`

## Shared Utilities (`src/utils/`)

- `constants.js` — Analysis prompt, severity thresholds, timing config, storage keys, API endpoints/models
- `api.js` — Claude/OpenAI vision API client with model fallback chain
- `storage.js` — Chrome storage.local wrapper
- `suggestions.mjs` — Priority suggestion extraction and deduplication
- `platforms.js` — Platform registry with self-video selectors for each supported platform

## Conventions

- Vanilla JS with ES6 modules, no framework. `.mjs` extension for modules shared across contexts.
- `SCREAMING_SNAKE_CASE` for constants, camelCase for variables/functions, kebab-case for HTML IDs/CSS classes.
- Settings always merged with defaults: `{ ...DEFAULT_SETTINGS, ...saved }`.
- Date-stamped planning docs at repo root: `YYYY-MM-DD-<topic>.md`.
- Tests use Node.js native test runner with ESM — run individual tests with `node --test tests/<file>.test.mjs`.

## Key Constants (`src/utils/constants.js`)

- `TIMING.CAPTURE_INTERVAL` — ms between frame captures (currently 5000)
- `TIMING.NOTIFICATION_COOLDOWN` — ms between notifications (120000)
- `SEVERITY.CRITICAL/WARNING/GOOD` — score thresholds (5/7/8)
- `API_MODELS` — Claude: `claude-3-5-sonnet-20241022`, OpenAI: `gpt-4o-mini`
