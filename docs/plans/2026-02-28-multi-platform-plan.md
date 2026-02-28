# Multi-Platform Video Conferencing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add support for Zoom, Microsoft Teams, Webex, Slack Huddles, and Discord web clients alongside existing Google Meet support.

**Architecture:** Single content script injected into all supported platform URLs. A new `platforms.js` module maps hostnames to platform-specific self-video CSS selectors. The existing video scoring algorithm in `video-selection.mjs` remains unchanged.

**Tech Stack:** Vanilla JS, Chrome Extension Manifest V3, Node.js native test runner

---

### Task 1: Create platform registry module

**Files:**
- Create: `src/utils/platforms.js`
- Test: `tests/platforms.test.mjs`

**Step 1: Write the failing test**

Create `tests/platforms.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLATFORMS,
  detectPlatform,
  getSelfVideoSelectors,
  isSupportedPlatform,
} from '../src/utils/platforms.js';

test('PLATFORMS contains all six supported platforms', () => {
  const hostnames = Object.keys(PLATFORMS);
  assert.ok(hostnames.includes('meet.google.com'));
  assert.ok(hostnames.includes('app.zoom.us'));
  assert.ok(hostnames.includes('teams.microsoft.com'));
  assert.ok(hostnames.includes('teams.live.com'));
  assert.ok(hostnames.includes('app.slack.com'));
  assert.ok(hostnames.includes('discord.com'));
});

test('PLATFORMS entries for webex use wildcard matching', () => {
  assert.ok(isSupportedPlatform('meet.webex.com'));
  assert.ok(isSupportedPlatform('company.webex.com'));
});

test('detectPlatform returns config for known hostname', () => {
  const platform = detectPlatform('meet.google.com');
  assert.equal(platform.name, 'Google Meet');
  assert.ok(Array.isArray(platform.selfVideoSelectors));
  assert.ok(platform.selfVideoSelectors.length > 0);
});

test('detectPlatform returns config for webex subdomain', () => {
  const platform = detectPlatform('meet.webex.com');
  assert.equal(platform.name, 'Webex');
});

test('detectPlatform returns null for unknown hostname', () => {
  assert.equal(detectPlatform('example.com'), null);
});

test('getSelfVideoSelectors returns array for known platform', () => {
  const selectors = getSelfVideoSelectors('app.zoom.us');
  assert.ok(Array.isArray(selectors));
  assert.ok(selectors.length > 0);
});

test('getSelfVideoSelectors returns empty array for unknown platform', () => {
  const selectors = getSelfVideoSelectors('example.com');
  assert.deepEqual(selectors, []);
});

test('isSupportedPlatform returns true for all supported hostnames', () => {
  const supported = [
    'meet.google.com',
    'app.zoom.us',
    'teams.microsoft.com',
    'teams.live.com',
    'meet.webex.com',
    'app.slack.com',
    'discord.com',
  ];
  for (const hostname of supported) {
    assert.ok(isSupportedPlatform(hostname), `Expected ${hostname} to be supported`);
  }
});

test('isSupportedPlatform returns false for unsupported hostnames', () => {
  assert.equal(isSupportedPlatform('example.com'), false);
  assert.equal(isSupportedPlatform('google.com'), false);
});

test('each platform has a name and non-empty selfVideoSelectors', () => {
  for (const [hostname, config] of Object.entries(PLATFORMS)) {
    assert.ok(config.name, `${hostname} missing name`);
    assert.ok(config.selfVideoSelectors.length > 0, `${hostname} missing selectors`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/platforms.test.mjs`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/utils/platforms.js`:

```js
export const PLATFORMS = {
  'meet.google.com': {
    name: 'Google Meet',
    selfVideoSelectors: [
      'div[data-self-video="true"] video',
      'video[data-self-video="true"]',
      '[data-is-self="true"] video',
      '[data-local-participant="true"] video',
      '[data-self-name] video',
    ],
  },
  'app.zoom.us': {
    name: 'Zoom',
    selfVideoSelectors: [
      '[class*="self-view"] video',
      '[data-type="self"] video',
      'video[class*="self-video"]',
    ],
  },
  'teams.microsoft.com': {
    name: 'Microsoft Teams',
    selfVideoSelectors: [
      '[data-tid="self-video"] video',
      '#self-video video',
      '[data-cid="calling-self-video"] video',
    ],
  },
  'teams.live.com': {
    name: 'Microsoft Teams',
    selfVideoSelectors: [
      '[data-tid="self-video"] video',
      '#self-video video',
      '[data-cid="calling-self-video"] video',
    ],
  },
  'app.slack.com': {
    name: 'Slack',
    selfVideoSelectors: [
      '[data-qa="self_video"] video',
      '[class*="self_view"] video',
      '[data-qa="huddle_self_video"] video',
    ],
  },
  'discord.com': {
    name: 'Discord',
    selfVideoSelectors: [
      '[class*="mirror"] video',
      'video[class*="video-"]',
    ],
  },
};

const WILDCARD_PLATFORMS = [
  {
    suffix: '.webex.com',
    config: {
      name: 'Webex',
      selfVideoSelectors: [
        '[class*="self-view"] video',
        'video[mediatype="local"]',
        '[class*="LocalVideo"] video',
      ],
    },
  },
];

export function detectPlatform(hostname) {
  if (PLATFORMS[hostname]) {
    return PLATFORMS[hostname];
  }

  for (const { suffix, config } of WILDCARD_PLATFORMS) {
    if (hostname.endsWith(suffix)) {
      return config;
    }
  }

  return null;
}

export function getSelfVideoSelectors(hostname) {
  const platform = detectPlatform(hostname);
  return platform ? platform.selfVideoSelectors : [];
}

export function isSupportedPlatform(hostname) {
  return detectPlatform(hostname) !== null;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/platforms.test.mjs`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add src/utils/platforms.js tests/platforms.test.mjs
git commit -m "feat: add platform registry for multi-platform support"
```

---

### Task 2: Update manifest.json with all platform URLs

**Files:**
- Modify: `manifest.json:7-8` (host_permissions) and `manifest.json:27` (content_scripts matches)

**Step 1: Update host_permissions**

Replace the single `*://meet.google.com/*` entry with all platform patterns:

```json
"host_permissions": [
  "*://meet.google.com/*",
  "*://app.zoom.us/*",
  "*://teams.microsoft.com/*",
  "*://teams.live.com/*",
  "*://*.webex.com/*",
  "*://app.slack.com/*",
  "*://discord.com/*",
  "https://api.anthropic.com/*",
  "https://api.openai.com/*",
  "http://127.0.0.1:3131/*",
  "http://localhost:3131/*"
],
```

**Step 2: Update content_scripts matches**

```json
"content_scripts": [
  {
    "matches": [
      "*://meet.google.com/*",
      "*://app.zoom.us/*",
      "*://teams.microsoft.com/*",
      "*://teams.live.com/*",
      "*://*.webex.com/*",
      "*://app.slack.com/*",
      "*://discord.com/*"
    ],
    "js": ["content/content.js"],
    "run_at": "document_end"
  }
],
```

**Step 3: Update description**

```json
"description": "Real-time body language feedback for video meetings",
```

(Already correct — no change needed.)

**Step 4: Commit**

```bash
git add manifest.json
git commit -m "feat: add platform URL patterns to manifest"
```

---

### Task 3: Update content script to use platform registry

**Files:**
- Modify: `src/content/content.js:1` (add import), `src/content/content.js:60-66` (preferredSelectors), `src/content/content.js:261` (hostname check)

**Step 1: Add import at top of file**

At line 2, add:

```js
import { isSupportedPlatform, getSelfVideoSelectors } from '../utils/platforms.js';
```

**Step 2: Replace hostname check in init()**

Change line 261 from:
```js
if (!window.location.hostname.includes('meet.google.com')) {
```
to:
```js
if (!isSupportedPlatform(window.location.hostname)) {
```

**Step 3: Replace hardcoded preferredSelectors in findVideoElement()**

Change the `preferredSelectors` array (lines 60-66) from:
```js
const preferredSelectors = [
  'div[data-self-video="true"] video',
  'video[data-self-video="true"]',
  '[data-is-self="true"] video',
  '[data-local-participant="true"] video',
  '[data-self-name] video',
];
```
to:
```js
const preferredSelectors = getSelfVideoSelectors(window.location.hostname);
```

**Step 4: Update the JSDoc comment at line 5**

Change from:
```js
* Content script for Google Meet integration.
```
to:
```js
* Content script for video meeting platform integration.
```

**Step 5: Commit**

```bash
git add src/content/content.js
git commit -m "feat: use platform registry in content script"
```

---

### Task 4: Update UI text references

**Files:**
- Modify: `src/summary/summary.html:33`
- Modify: `src/background/background.js:497`
- Modify: `package.json:4`

**Step 1: Update summary.html empty state**

Change line 33 from:
```html
<p>Join a Google Meet call with the extension active, then return here.</p>
```
to:
```html
<p>Join a video call with the extension active, then return here.</p>
```

**Step 2: Update background.js monitoring message**

Change line 497 from:
```js
message: 'Open Google Meet to resume live coaching.',
```
to:
```js
message: 'Open a video meeting to resume live coaching.',
```

**Step 3: Update package.json description**

Change line 4 from:
```json
"description": "Chrome extension for real-time body language feedback during Google Meet calls.",
```
to:
```json
"description": "Chrome extension for real-time body language feedback during video calls.",
```

**Step 4: Commit**

```bash
git add src/summary/summary.html src/background/background.js package.json
git commit -m "feat: update UI text for multi-platform support"
```

---

### Task 5: Run full test suite and build

**Step 1: Run all tests**

Run: `node --test tests/*.test.mjs`
Expected: All tests pass (including existing video-selection, suggestions, and analysis-prompt tests, plus new platforms tests)

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Clean webpack build with no errors

**Step 4: Commit any fixes if needed**

---

### Task 6 (Optional): Update website marketing copy

**Files:**
- Modify: `website/index.html` — lines referencing "Google Meet"

**Step 1: Update references**

Replace "Google Meet" references with broader language like "video meetings" or "Google Meet, Zoom, Teams, and more" where listing platforms adds value.

Specific lines to update:
- Title tag (line 6): "Real-Time Body Language Coaching for Video Meetings"
- Meta description (line 7): mention multiple platforms
- Hero copy (line 1025): mention platform support
- Steps section (line 1134): "Join a video call" instead of "Join a Google Meet"

**Step 2: Commit**

```bash
git add website/index.html
git commit -m "docs: update website copy for multi-platform support"
```
