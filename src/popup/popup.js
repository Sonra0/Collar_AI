import storage from '../utils/storage.js';
import api from '../utils/api.js';
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
  statusLabel: document.getElementById('status-label'),
  statusText: document.getElementById('status-text'),
  statusIndicator: document.getElementById('status-indicator'),
  configHeading: document.getElementById('config-heading'),
  providerLabel: document.getElementById('provider-label'),
  apiProvider: document.getElementById('api-provider'),
  apiKeyLabel: document.getElementById('api-key-label'),
  apiKey: document.getElementById('api-key'),
  validateKey: document.getElementById('validate-key'),
  sensitivityLabel: document.getElementById('sensitivity-label'),
  sensitivity: document.getElementById('sensitivity'),
  sensitivityLow: document.getElementById('sensitivity-low'),
  sensitivityMedium: document.getElementById('sensitivity-medium'),
  sensitivityHigh: document.getElementById('sensitivity-high'),
  alertsLabel: document.getElementById('alerts-label'),
  notificationsEnabled: document.getElementById('notifications-enabled'),
  retentionLabel: document.getElementById('retention-label'),
  retentionDays: document.getElementById('retention-days'),
  ephemeralLabel: document.getElementById('ephemeral-label'),
  ephemeralMode: document.getElementById('ephemeral-mode'),
  saveSettings: document.getElementById('save-settings'),
  monitoringToggle: document.getElementById('monitoring-toggle'),
  liveCoaching: document.getElementById('live-coaching'),
  popOutCoaching: document.getElementById('pop-out-coaching'),
  viewHistory: document.getElementById('view-history'),
  clearData: document.getElementById('clear-data'),
  providerPill: document.getElementById('provider-pill'),
  toast: document.getElementById('toast'),
};

let toastTimeout = null;
let monitoringEnabled = true;
let currentLanguage = DEFAULT_LANGUAGE;

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');

  if (type === 'error') {
    elements.toast.style.borderColor = 'rgba(255, 160, 160, 0.45)';
  } else {
    elements.toast.style.borderColor = 'rgba(151, 184, 255, 0.26)';
  }

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2200);
}

function setButtonLabel(button, label) {
  button.dataset.label = label;
  if (!button.disabled) {
    button.textContent = label;
  }
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (!button.dataset.label) {
    button.dataset.label = button.textContent;
  }
  button.textContent = busy ? label : button.dataset.label;
  button.style.opacity = busy ? '0.7' : '1';
}

function providerName(provider) {
  return provider === 'openai' ? 'OpenAI' : 'Claude';
}

function syncPrivacyControls() {
  const isEphemeral = elements.ephemeralMode.checked;
  elements.retentionDays.disabled = isEphemeral;
  elements.retentionDays.style.opacity = isEphemeral ? '0.6' : '1';
}

function syncMonitoringToggleButton() {
  const label = monitoringEnabled
    ? t(currentLanguage, 'popup.monitoringOffButton')
    : t(currentLanguage, 'popup.monitoringOnButton');
  elements.monitoringToggle.textContent = label;
  elements.monitoringToggle.classList.toggle('on-state', !monitoringEnabled);
}

function formatRuntimeStatus(runtimeStatus) {
  if (runtimeStatus.monitoringEnabled === false) {
    return t(currentLanguage, 'popup.statusOff');
  }

  if (runtimeStatus.notificationsEnabled && runtimeStatus.notificationPermission === 'denied') {
    return t(currentLanguage, 'popup.statusNotificationsBlocked');
  }

  const analyses = Number(runtimeStatus.analyses) || 0;
  if (analyses > 0) {
    return t(currentLanguage, 'popup.statusWithAnalyses', { count: analyses });
  }

  if (!runtimeStatus.apiConfigured) {
    return t(currentLanguage, 'popup.statusApiMissing');
  }

  const runtime = runtimeStatus.analysisRuntime || {};
  const failed = Number(runtime.failed) || 0;
  if (failed > 0) {
    return t(currentLanguage, 'popup.statusWithErrors', { count: failed });
  }

  return t(currentLanguage, 'popup.statusWaitingFirst');
}

function applyLanguage() {
  document.documentElement.lang = languageHtmlCode(currentLanguage);
  document.title = t(currentLanguage, 'popup.pageTitle');

  elements.languageToggle.textContent = languageToggleLabel(currentLanguage);
  elements.languageToggle.setAttribute('aria-label', languageToggleAriaLabel(currentLanguage));
  elements.heroEyebrow.textContent = t(currentLanguage, 'popup.heroEyebrow');
  elements.heroTitle.textContent = t(currentLanguage, 'popup.heroTitle');
  elements.heroSubhead.textContent = t(currentLanguage, 'popup.heroSubhead');
  elements.statusLabel.textContent = t(currentLanguage, 'popup.statusLabel');

  elements.configHeading.textContent = t(currentLanguage, 'popup.configHeading');
  elements.providerLabel.textContent = t(currentLanguage, 'popup.providerLabel');
  elements.apiKeyLabel.textContent = t(currentLanguage, 'popup.apiKeyLabel');
  elements.apiKey.placeholder = t(currentLanguage, 'popup.apiKeyPlaceholder');
  setButtonLabel(elements.validateKey, t(currentLanguage, 'popup.validateKey'));

  elements.sensitivityLabel.textContent = t(currentLanguage, 'popup.sensitivityLabel');
  elements.sensitivityLow.textContent = t(currentLanguage, 'popup.sensitivityLow');
  elements.sensitivityMedium.textContent = t(currentLanguage, 'popup.sensitivityMedium');
  elements.sensitivityHigh.textContent = t(currentLanguage, 'popup.sensitivityHigh');
  elements.alertsLabel.textContent = t(currentLanguage, 'popup.alertsLabel');
  elements.retentionLabel.textContent = t(currentLanguage, 'popup.retentionLabel');
  elements.ephemeralLabel.textContent = t(currentLanguage, 'popup.ephemeralLabel');

  setButtonLabel(elements.saveSettings, t(currentLanguage, 'popup.saveSettings'));
  syncMonitoringToggleButton();
  elements.liveCoaching.textContent = t(currentLanguage, 'popup.liveCoachingButton');
  elements.viewHistory.textContent = t(currentLanguage, 'popup.openSummaryButton');
  elements.clearData.textContent = t(currentLanguage, 'popup.clearDataButton');
}

async function loadSettings() {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  const settings = await storage.getSettings();
  elements.apiProvider.value = settings.apiProvider;
  elements.apiKey.value = settings.apiKey || '';
  elements.sensitivity.value = settings.sensitivity;
  elements.notificationsEnabled.checked = settings.notificationsEnabled;
  elements.retentionDays.value = settings.dataRetentionDays;
  elements.ephemeralMode.checked = settings.ephemeralMode;
  monitoringEnabled = settings.monitoringEnabled !== false;
  currentLanguage = queryLanguage ? resolveLanguage(queryLanguage) : resolveLanguage(settings.language);

  if (queryLanguage && currentLanguage !== resolveLanguage(settings.language)) {
    await storage.saveSettings({ language: currentLanguage });
  }

  applyLanguage();
  elements.providerPill.textContent = providerName(settings.apiProvider);
  syncPrivacyControls();
}

async function updateStatus() {
  const runtimeStatus = await new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'REQUEST_STATUS' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    } catch {
      resolve(null);
    }
  });

  if (!runtimeStatus) {
    elements.statusText.textContent = t(currentLanguage, 'popup.statusNotActive');
    elements.statusText.removeAttribute('title');
    elements.statusIndicator.classList.remove('active');
    return;
  }

  if (runtimeStatus.monitoringEnabled === false) {
    elements.statusText.textContent = t(currentLanguage, 'popup.statusOff');
    elements.statusText.removeAttribute('title');
    elements.statusIndicator.classList.remove('active');
    return;
  }

  if (!runtimeStatus.active) {
    elements.statusText.textContent = t(currentLanguage, 'popup.statusNotActive');
    elements.statusText.removeAttribute('title');
    elements.statusIndicator.classList.remove('active');
    return;
  }

  elements.statusText.textContent = formatRuntimeStatus(runtimeStatus);
  const lastError = runtimeStatus.analysisRuntime?.lastError || '';
  if (lastError) {
    elements.statusText.title = lastError;
  } else {
    elements.statusText.removeAttribute('title');
  }
  elements.statusIndicator.classList.add('active');
}

async function persistSettings() {
  const retentionDays = Math.min(365, Math.max(1, Number(elements.retentionDays.value) || 7));

  const settings = {
    apiProvider: elements.apiProvider.value,
    apiKey: elements.apiKey.value.trim(),
    language: currentLanguage,
    monitoringEnabled,
    sensitivity: elements.sensitivity.value,
    notificationsEnabled: elements.notificationsEnabled.checked,
    dataRetentionDays: retentionDays,
    ephemeralMode: elements.ephemeralMode.checked,
  };

  await storage.saveSettings(settings);
  elements.retentionDays.value = retentionDays;
  syncPrivacyControls();
  elements.providerPill.textContent = providerName(settings.apiProvider);
  return settings;
}

async function toggleMonitoring() {
  monitoringEnabled = !monitoringEnabled;
  syncMonitoringToggleButton();
  await persistSettings();

  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'SET_MONITORING', enabled: monitoringEnabled }, () => {
        resolve();
      });
    });
  } catch {
    // Fallback to local setting only.
  }

  await updateStatus();
  showToast(
    monitoringEnabled ? t(currentLanguage, 'popup.toastMonitoringOn') : t(currentLanguage, 'popup.toastMonitoringOff'),
  );
}

async function saveSettings() {
  const settings = await persistSettings();
  setBusy(elements.saveSettings, true, 'Saved');
  setTimeout(() => setBusy(elements.saveSettings, false), 650);
  showToast(t(currentLanguage, 'popup.toastSettingsSaved', { provider: providerName(settings.apiProvider) }));
}

async function validateApiKey() {
  const apiKey = elements.apiKey.value.trim();
  const provider = elements.apiProvider.value;

  if (!apiKey) {
    showToast(t(currentLanguage, 'popup.toastEnterApiKey'), 'error');
    return;
  }

  setBusy(elements.validateKey, true, '...');
  try {
    await persistSettings();
    const valid = await api.validateApiKey(apiKey, provider);
    showToast(
      valid ? t(currentLanguage, 'popup.toastApiValid') : t(currentLanguage, 'popup.toastApiInvalid'),
      valid ? 'info' : 'error',
    );
  } catch (error) {
    const message = error?.message
      ? t(currentLanguage, 'popup.toastValidationFailed', { message: error.message })
      : t(currentLanguage, 'popup.toastValidationFailedGeneric');
    showToast(message, 'error');
  } finally {
    setBusy(elements.validateKey, false);
  }
}

function viewHistory() {
  const url = chrome.runtime.getURL(`summary/summary.html?lang=${encodeURIComponent(currentLanguage)}`);
  chrome.tabs.create({
    url,
  });
}

async function openLiveCoaching() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch {
    // Fallback: open as tab if side panel unavailable
    const url = chrome.runtime.getURL(`live/live.html?lang=${encodeURIComponent(currentLanguage)}`);
    chrome.tabs.create({ url });
  }
}

function popOutLiveCoaching() {
  const url = chrome.runtime.getURL(`live/live.html?lang=${encodeURIComponent(currentLanguage)}`);
  try {
    chrome.windows.create({
      url,
      type: 'popup',
      width: 460,
      height: 760,
    });
  } catch {
    chrome.tabs.create({ url });
  }
}

async function clearAllData() {
  const approved = window.confirm(t(currentLanguage, 'popup.confirmClearData'));
  if (!approved) return;

  await storage.clearAllData();
  await loadSettings();
  await updateStatus();
  showToast(t(currentLanguage, 'popup.toastDataCleared'));
}

async function toggleLanguage() {
  currentLanguage = getNextLanguage(currentLanguage);
  await storage.saveSettings({ language: currentLanguage });
  applyLanguage();
  await updateStatus();
  showToast(t(currentLanguage, 'popup.toastLanguageSwitched', { language: t(currentLanguage, 'languageName') }));
}

elements.saveSettings.addEventListener('click', saveSettings);
elements.validateKey.addEventListener('click', validateApiKey);
elements.monitoringToggle.addEventListener('click', toggleMonitoring);
elements.liveCoaching.addEventListener('click', openLiveCoaching);
if (elements.popOutCoaching) {
  elements.popOutCoaching.addEventListener('click', popOutLiveCoaching);
}
elements.viewHistory.addEventListener('click', viewHistory);
elements.clearData.addEventListener('click', clearAllData);
elements.languageToggle.addEventListener('click', toggleLanguage);
elements.apiProvider.addEventListener('change', () => {
  elements.providerPill.textContent = providerName(elements.apiProvider.value);
});
elements.ephemeralMode.addEventListener('change', syncPrivacyControls);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.settings?.newValue) {
    return;
  }

  const incoming = changes.settings.newValue;
  const nextLanguage = resolveLanguage(incoming.language);
  if (nextLanguage !== currentLanguage) {
    currentLanguage = nextLanguage;
    applyLanguage();
    void updateStatus();
  }
});

(async function init() {
  await loadSettings();
  await updateStatus();
  setInterval(updateStatus, 5000);
})();
