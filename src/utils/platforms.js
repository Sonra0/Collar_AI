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
