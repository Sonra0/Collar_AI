import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

/**
 * Storage wrapper for Chrome storage API
 */
class Storage {
  async getSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  }

  async saveSettings(settings) {
    const merged = { ...(await this.getSettings()), ...settings };
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: merged,
    });
    return merged;
  }

  async getCurrentSession() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
    return result[STORAGE_KEYS.CURRENT_SESSION] || null;
  }

  async getSummarySession() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SUMMARY_SESSION);
    return result[STORAGE_KEYS.SUMMARY_SESSION] || null;
  }

  async saveCurrentSession(session) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_SESSION]: session,
    });
  }

  async saveSummarySession(session) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SUMMARY_SESSION]: session,
    });
  }

  async clearCurrentSession() {
    await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION);
  }

  async clearSummarySession() {
    await chrome.storage.local.remove(STORAGE_KEYS.SUMMARY_SESSION);
  }

  async getSessions() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] || [];
  }

  async saveSessions(sessions) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: sessions,
    });
  }

  async addSession(session) {
    const sessions = await this.getSessions();
    sessions.push(session);
    await this.saveSessions(sessions);
  }

  async appendSession(session) {
    await this.addSession(session);
  }

  async getLiveCoachingFeed() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LIVE_COACHING_FEED);
    return result[STORAGE_KEYS.LIVE_COACHING_FEED] || [];
  }

  async saveLiveCoachingFeed(feedItems) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LIVE_COACHING_FEED]: feedItems,
    });
  }

  async clearLiveCoachingFeed() {
    await chrome.storage.local.remove(STORAGE_KEYS.LIVE_COACHING_FEED);
  }

  async clearAllData() {
    await chrome.storage.local.clear();
  }
}

export default new Storage();
