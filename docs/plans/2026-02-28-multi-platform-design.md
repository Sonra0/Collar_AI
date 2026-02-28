# Multi-Platform Video Conferencing Support

**Date:** 2026-02-28
**Approach:** Single content script with expanded URL matching and platform registry

## Target Platforms

| Platform | URL Patterns | Web Client |
|---|---|---|
| Google Meet | `meet.google.com` | Yes |
| Zoom | `app.zoom.us` | Yes |
| Microsoft Teams | `teams.microsoft.com`, `teams.live.com` | Yes |
| Webex | `*.webex.com` | Yes |
| Slack Huddles | `app.slack.com` | Yes |
| Discord | `discord.com` | Yes |

## Changes

### 1. Manifest (`manifest.json`)

Add all platform URL patterns to `host_permissions` and `content_scripts.matches`. Update description to be platform-generic.

### 2. Platform Registry (`src/utils/platforms.js`)

New module exporting:
- `PLATFORMS` — map of hostname to `{ name, selfVideoSelectors[] }`
- `detectPlatform(hostname)` — returns platform config or null
- `getSelfVideoSelectors(hostname)` — returns platform-specific selectors
- `isSupportedPlatform(hostname)` — boolean check

Platform-specific self-video selectors:
- **Google Meet:** `div[data-self-video="true"] video`, `[data-is-self="true"] video`, `[data-self-name] video`, `[data-local-participant="true"] video`
- **Zoom:** `[class*="self-view"] video`, `[data-type="self"] video`
- **Teams:** `[data-tid="self-video"] video`, `#self-video video`
- **Webex:** `[class*="self-view"] video`, `video[mediatype="local"]`
- **Slack:** `[data-qa="self_video"] video`, `[class*="self_view"] video`
- **Discord:** `[class*="mirror"] video`, `video[class*="video-"]`

### 3. Content Script (`src/content/content.js`)

- Replace `meet.google.com` hostname check with `isSupportedPlatform()`
- Replace hardcoded `preferredSelectors` with `getSelfVideoSelectors(hostname)`
- Keep generic fallback selectors and scoring algorithm unchanged

### 4. UI Text Updates

- `popup.html` / `popup.js` — "Google Meet" → "video meetings"
- `summary.html` — "Join a Google Meet call" → "Join a video call"
- `background.js` — "Open Google Meet" → "Open a video meeting"
- `package.json` — update description
- `website/index.html` — update marketing copy

### 5. Unchanged

- `video-selection.mjs` — scoring algorithm is already platform-agnostic
- Message flow (MEETING_STARTED, ANALYZE_FRAME, etc.)
- API analysis pipeline
- Live coaching and summary pages
