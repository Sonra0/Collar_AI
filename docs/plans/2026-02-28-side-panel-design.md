# Chrome Side Panel — Live Coaching Feed

## Goal

Replace the separate popup window for live coaching with a Chrome Side Panel that auto-opens when a meeting starts. Keep the pop-out window as a fallback.

## Approach

Reuse the existing `live/live.html` page as the side panel content. No new JS entry point needed.

## Changes

### manifest.json
- Add `"sidePanel"` permission
- Add `"side_panel": { "default_path": "live/live.html" }`

### src/background/background.js
- In `handleMeetingStarted()`: call `chrome.sidePanel.open({ tabId })` using the sender tab ID
- Pass `sender` through from `onMessage` listener (currently `_sender`)

### src/popup/popup.js
- Change `openLiveCoaching()` to open side panel via `chrome.sidePanel.open()`
- Keep separate "Pop out" button that uses `chrome.windows.create` (existing behavior)

### src/popup/popup.html
- Add "Pop out" button next to the existing "Live Coaching" button

### src/live/live.css
- Minor responsive tweaks for ~360px side panel width

## Behavior
1. Meeting starts → side panel auto-opens on the Meet tab
2. Feed renders in real time (existing storage listener logic)
3. Popup offers "Live Coaching" (side panel) + "Pop out" (window)
4. Meeting ends → side panel stays open; user closes manually
