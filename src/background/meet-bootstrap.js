export const MEET_TAB_URL_PATTERNS = ['*://meet.google.com/*'];

export function isGoogleMeetUrl(url) {
  return typeof url === 'string' && /^https?:\/\/meet\.google\.com\//.test(url);
}

export async function bootstrapMeetTabs(tabs, dependencies) {
  const { pingTab, injectTab, logger = console } = dependencies || {};
  const summary = {
    checked: 0,
    alreadyReady: 0,
    injected: 0,
    failed: 0,
    skipped: 0,
  };

  if (!Array.isArray(tabs) || typeof pingTab !== 'function' || typeof injectTab !== 'function') {
    return summary;
  }

  for (const tab of tabs) {
    const tabId = tab?.id;
    if (!Number.isInteger(tabId) || !isGoogleMeetUrl(tab?.url)) {
      summary.skipped += 1;
      continue;
    }

    summary.checked += 1;

    let isReachable = false;
    try {
      isReachable = Boolean(await pingTab(tabId));
    } catch (error) {
      logger.warn('Failed to ping Meet tab content script:', error);
    }

    if (isReachable) {
      summary.alreadyReady += 1;
      continue;
    }

    try {
      const injected = await injectTab(tabId);
      if (injected === false) {
        summary.failed += 1;
      } else {
        summary.injected += 1;
      }
    } catch (error) {
      summary.failed += 1;
      logger.warn('Failed to inject Meet content script:', error);
    }
  }

  return summary;
}
