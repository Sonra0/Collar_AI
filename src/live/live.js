import storage from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const elements = {
  feedList: document.getElementById('feed-list'),
  emptyState: document.getElementById('empty-state'),
  itemCount: document.getElementById('item-count'),
  lastUpdated: document.getElementById('last-updated'),
  clearFeed: document.getElementById('clear-feed'),
};

function formatCount(count) {
  return count === 1 ? '1 item' : `${count} items`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '--';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

function renderFeed(feedItems) {
  const items = Array.isArray(feedItems) ? feedItems : [];

  elements.feedList.innerHTML = '';
  elements.itemCount.textContent = formatCount(items.length);
  elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;

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
    title.textContent = item.title || 'Live coaching update';

    const time = document.createElement('span');
    time.className = 'item-time';
    time.textContent = formatTimestamp(item.timestamp);

    row.appendChild(title);
    row.appendChild(time);

    const message = document.createElement('p');
    message.className = 'item-message';
    message.textContent = item.message || '';

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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[STORAGE_KEYS.LIVE_COACHING_FEED]) {
    return;
  }

  renderFeed(changes[STORAGE_KEYS.LIVE_COACHING_FEED].newValue || []);
});

elements.clearFeed.addEventListener('click', clearFeed);

loadFeed();
setInterval(loadFeed, 5000);
