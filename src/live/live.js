import storage from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import {
  DEFAULT_LANGUAGE,
  getNextLanguage,
  languageHtmlCode,
  languageToggleAriaLabel,
  languageToggleLabel,
  resolveLanguage,
  t,
} from '../utils/i18n.js';

const elements = {
  languageToggle: document.getElementById('language-toggle'),
  heroEyebrow: document.getElementById('hero-eyebrow'),
  heroTitle: document.getElementById('hero-title'),
  heroSubhead: document.getElementById('hero-subhead'),
  feedList: document.getElementById('feed-list'),
  emptyState: document.getElementById('empty-state'),
  itemCount: document.getElementById('item-count'),
  lastUpdated: document.getElementById('last-updated'),
  backToMain: document.getElementById('back-to-main'),
  clearFeed: document.getElementById('clear-feed'),
};

let currentLanguage = DEFAULT_LANGUAGE;
let latestFeed = [];

function formatCount(count) {
  return count === 1
    ? t(currentLanguage, 'live.itemCountSingle')
    : t(currentLanguage, 'live.itemCountPlural', { count });
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '--';
  try {
    return new Date(timestamp).toLocaleTimeString(currentLanguage, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--';
  }
}

function normalizeCategory(rawCategory) {
  const category = String(rawCategory || 'info').toLowerCase();
  if (category === 'critical' || category === 'warning' || category === 'system') {
    return category;
  }
  return 'info';
}

function localizedFeedText(item, field, fallback = '') {
  const perLanguage = item?.[`${field}ByLanguage`];
  if (perLanguage && typeof perLanguage === 'object') {
    return perLanguage[currentLanguage] || perLanguage[DEFAULT_LANGUAGE] || item?.[field] || fallback;
  }
  return item?.[field] || fallback;
}

function applyLanguage() {
  document.documentElement.lang = languageHtmlCode(currentLanguage);
  document.title = t(currentLanguage, 'live.pageTitle');
  elements.languageToggle.textContent = languageToggleLabel(currentLanguage);
  elements.languageToggle.setAttribute('aria-label', languageToggleAriaLabel(currentLanguage));
  elements.heroEyebrow.textContent = t(currentLanguage, 'live.heroEyebrow');
  elements.heroTitle.textContent = t(currentLanguage, 'live.heroTitle');
  elements.heroSubhead.textContent = t(currentLanguage, 'live.heroSubhead');
  elements.backToMain.textContent = t(currentLanguage, 'live.backToMain');
  elements.clearFeed.textContent = t(currentLanguage, 'live.clearFeed');
  elements.emptyState.textContent = t(currentLanguage, 'live.emptyState');
}

function renderFeed(feedItems) {
  const items = Array.isArray(feedItems) ? feedItems : [];
  latestFeed = items;

  elements.feedList.innerHTML = '';
  elements.itemCount.textContent = formatCount(items.length);
  elements.lastUpdated.textContent = t(currentLanguage, 'live.updatedAt', {
    time: new Date().toLocaleTimeString(currentLanguage),
  });

  if (!items.length) {
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  for (const item of items) {
    const li = document.createElement('li');
    li.className = `feed-item ${normalizeCategory(item.category)}`;

    const row = document.createElement('div');
    row.className = 'item-row';

    const title = document.createElement('p');
    title.className = 'item-title';
    title.textContent = localizedFeedText(item, 'title', t(currentLanguage, 'live.defaultItemTitle'));

    const time = document.createElement('span');
    time.className = 'item-time';
    time.textContent = formatTimestamp(item.timestamp);

    row.appendChild(title);
    row.appendChild(time);

    const message = document.createElement('p');
    message.className = 'item-message';
    message.textContent = localizedFeedText(item, 'message', '');

    li.appendChild(row);
    li.appendChild(message);
    elements.feedList.appendChild(li);
  }
}

async function loadFeed() {
  const feed = await storage.getLiveCoachingFeed();
  renderFeed(feed);
}

async function clearFeed() {
  await storage.clearLiveCoachingFeed();
  renderFeed([]);
}

async function loadLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  const settings = await storage.getSettings();
  currentLanguage = queryLanguage ? resolveLanguage(queryLanguage) : resolveLanguage(settings.language);

  if (queryLanguage && currentLanguage !== resolveLanguage(settings.language)) {
    await storage.saveSettings({ language: currentLanguage });
  }

  applyLanguage();
}

async function toggleLanguage() {
  currentLanguage = getNextLanguage(currentLanguage);
  await storage.saveSettings({ language: currentLanguage });
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'LOCALIZE_LIVE_FEED' }, () => resolve());
    });
  } catch {
    // Ignore localization request failures.
  }
  applyLanguage();
  await loadFeed();
}

function backToMain() {
  const url = chrome.runtime.getURL(`popup/popup.html?lang=${encodeURIComponent(currentLanguage)}`);
  window.location.href = url;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes[STORAGE_KEYS.LIVE_COACHING_FEED]) {
    renderFeed(changes[STORAGE_KEYS.LIVE_COACHING_FEED].newValue || []);
  }

  if (changes[STORAGE_KEYS.SETTINGS]?.newValue) {
    const nextLanguage = resolveLanguage(changes[STORAGE_KEYS.SETTINGS].newValue.language);
    if (nextLanguage !== currentLanguage) {
      currentLanguage = nextLanguage;
      applyLanguage();
      renderFeed(latestFeed);
    }
  }
});

elements.clearFeed.addEventListener('click', clearFeed);
elements.backToMain.addEventListener('click', backToMain);
elements.languageToggle.addEventListener('click', toggleLanguage);

(async function init() {
  await loadLanguage();
  await loadFeed();
  setInterval(loadFeed, 5000);
})();
