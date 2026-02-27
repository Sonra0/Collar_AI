# Meeting Body Language Coach

Real-time body language feedback for Google Meet video calls using AI vision analysis.

## Features

- Real-time monitoring every 30 seconds during active meetings
- Smart alerts for posture, facial expression, hand gesture, and appearance issues
- Post-meeting summary with scores, trend chart, and top action items
- Privacy-first behavior using your own API key, optional ephemeral mode, and local session storage
- Configurable sensitivity, notifications, and retention settings

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6+)
- Webpack 5 + Babel
- Anthropic Claude API and OpenAI API support
- Chart.js for summary visualizations

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm
- Google Chrome
- Anthropic or OpenAI API key

### Development Setup

1. Install dependencies:

```bash
npm install
```

2. Build extension:

```bash
npm run build
```

3. Load in Chrome:
- Open `chrome://extensions/`
- Enable Developer mode
- Click Load unpacked
- Select `dist/`

4. Configure API key:
- Open extension popup
- Pick provider and paste key
- Set sensitivity/privacy preferences (alerts, retention, ephemeral mode)
- Click Validate key
- Save settings

## Usage

1. Join a Google Meet call with your camera enabled.
2. Extension auto-starts monitoring when self video is detected.
3. You receive live notifications based on configured sensitivity.
4. When meeting ends, summary page opens automatically.

## Available Scripts

```bash
npm run build
npm run dev
npm run lint
npm run format
```

## Project Structure

```text
src/
  background/   service worker: analysis + notifications + sessions
  content/      Google Meet capture + lifecycle detection
  popup/        settings/status UI
  summary/      post-meeting report UI + chart
  utils/        constants, API client, storage wrapper
```

## Troubleshooting

### Extension not detecting meeting video
- Confirm camera is enabled in Google Meet.
- Refresh the meeting tab.
- Check content script console logs in DevTools.

### API analysis fails
- Re-check provider + key in popup.
- Confirm API credits/rate limits.
- Ensure extension has host permissions (included in manifest).

### Notifications not appearing
- Confirm Chrome notifications are enabled.
- Confirm notifications toggle is on in popup.
- Check cooldown behavior (2-minute anti-spam window).

## Cost Notes

- Anthropic/OpenAI image analysis incurs provider-side API costs.
- Approximate cost depends on model and meeting duration.

## Demo Assets

- Pitch outline: `docs/PITCH.md`
- Screenshot folder: `docs/screenshots/`

## License

MIT
