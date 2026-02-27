import storage from '../utils/storage.js';
import api from '../utils/api.js';

const elements = {
  statusText: document.getElementById('status-text'),
  statusIndicator: document.getElementById('status-indicator'),
  apiProvider: document.getElementById('api-provider'),
  apiKey: document.getElementById('api-key'),
  validateKey: document.getElementById('validate-key'),
  sensitivity: document.getElementById('sensitivity'),
  notificationsEnabled: document.getElementById('notifications-enabled'),
  retentionDays: document.getElementById('retention-days'),
  ephemeralMode: document.getElementById('ephemeral-mode'),
  saveSettings: document.getElementById('save-settings'),
  monitoringToggle: document.getElementById('monitoring-toggle'),
  liveCoaching: document.getElementById('live-coaching'),
  viewHistory: document.getElementById('view-history'),
  clearData: document.getElementById('clear-data'),
  providerPill: document.getElementById('provider-pill'),
  toast: document.getElementById('toast'),
};

let toastTimeout = null;
let monitoringEnabled = true;

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

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.dataset.label = button.dataset.label || button.textContent;
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
  elements.monitoringToggle.textContent = monitoringEnabled ? 'Turn monitoring off' : 'Turn monitoring on';
  elements.monitoringToggle.classList.toggle('on-state', !monitoringEnabled);
}

function formatRuntimeStatus(runtimeStatus) {
  if (runtimeStatus.monitoringEnabled === false) {
    return 'Monitoring is OFF';
  }

  if (runtimeStatus.notificationsEnabled && runtimeStatus.notificationPermission === 'denied') {
    return 'Active · notifications blocked';
  }

  const analyses = Number(runtimeStatus.analyses) || 0;
  const analysesLabel = analyses === 1 ? '1 analysis' : `${analyses} analyses`;
  if (analyses > 0) {
    return `Active · ${analysesLabel}`;
  }

  if (!runtimeStatus.apiConfigured) {
    return 'Active · API key not saved';
  }

  const runtime = runtimeStatus.analysisRuntime || {};
  const failed = Number(runtime.failed) || 0;
  if (failed > 0) {
    const errorLabel = failed === 1 ? '1 error' : `${failed} errors`;
    return `Active · 0 analyses · ${errorLabel}`;
  }

  return 'Active · waiting for first analysis';
}

async function loadSettings() {
  const settings = await storage.getSettings();
  elements.apiProvider.value = settings.apiProvider;
  elements.apiKey.value = settings.apiKey || '';
  elements.sensitivity.value = settings.sensitivity;
  elements.notificationsEnabled.checked = settings.notificationsEnabled;
  elements.retentionDays.value = settings.dataRetentionDays;
  elements.ephemeralMode.checked = settings.ephemeralMode;
  monitoringEnabled = settings.monitoringEnabled !== false;
  syncMonitoringToggleButton();
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
    elements.statusText.textContent = 'Not active';
    elements.statusText.removeAttribute('title');
    elements.statusIndicator.classList.remove('active');
    return;
  }

  if (runtimeStatus.monitoringEnabled === false) {
    elements.statusText.textContent = 'Monitoring is OFF';
    elements.statusText.removeAttribute('title');
    elements.statusIndicator.classList.remove('active');
    return;
  }

  if (!runtimeStatus.active) {
    elements.statusText.textContent = 'Not active';
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
  showToast(monitoringEnabled ? 'Monitoring turned on.' : 'Monitoring turned off.');
}

async function saveSettings() {
  const settings = await persistSettings();
  setBusy(elements.saveSettings, true, 'Saved');
  setTimeout(() => setBusy(elements.saveSettings, false), 650);
  showToast(`Settings saved locally (${providerName(settings.apiProvider)}).`);
}

async function validateApiKey() {
  const apiKey = elements.apiKey.value.trim();
  const provider = elements.apiProvider.value;

  if (!apiKey) {
    showToast('Enter an API key first.', 'error');
    return;
  }

  setBusy(elements.validateKey, true, 'Validating...');
  try {
    await persistSettings();
    const valid = await api.validateApiKey(apiKey, provider);
    showToast(valid ? 'API key is valid and saved.' : 'API key is invalid or unauthorized.', valid ? 'info' : 'error');
  } catch (error) {
    const message = error?.message ? `Validation failed: ${error.message}` : 'Validation failed. Try again.';
    showToast(message, 'error');
  } finally {
    setBusy(elements.validateKey, false);
  }
}

function viewHistory() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('summary/summary.html'),
  });
}

function openLiveCoaching() {
  const url = chrome.runtime.getURL('live/live.html');
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
  const approved = window.confirm('Clear settings and all saved sessions? This cannot be undone.');
  if (!approved) return;

  await storage.clearAllData();
  await loadSettings();
  await updateStatus();
  showToast('All extension data was cleared.');
}

elements.saveSettings.addEventListener('click', saveSettings);
elements.validateKey.addEventListener('click', validateApiKey);
elements.monitoringToggle.addEventListener('click', toggleMonitoring);
elements.liveCoaching.addEventListener('click', openLiveCoaching);
elements.viewHistory.addEventListener('click', viewHistory);
elements.clearData.addEventListener('click', clearAllData);
elements.apiProvider.addEventListener('change', () => {
  elements.providerPill.textContent = providerName(elements.apiProvider.value);
});
elements.ephemeralMode.addEventListener('change', syncPrivacyControls);

(async function init() {
  await loadSettings();
  await updateStatus();
  setInterval(updateStatus, 5000);
})();
