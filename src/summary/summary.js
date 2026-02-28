import Chart from 'chart.js/auto';
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

const categories = ['posture', 'facial', 'hands', 'appearance'];
let timelineChart = null;

const elements = {
  languageToggle: document.getElementById('language-toggle'),
  heroEyebrow: document.getElementById('hero-eyebrow'),
  heroTitle: document.getElementById('hero-title'),
  heroSubtitle: document.getElementById('hero-subtitle'),
  loading: document.getElementById('loading'),
  loadingText: document.getElementById('loading-text'),
  emptyState: document.getElementById('empty-state'),
  emptyTitle: document.getElementById('empty-title'),
  emptyBody: document.getElementById('empty-body'),
  summaryContent: document.getElementById('summary-content'),
  durationLabel: document.getElementById('duration-label'),
  analysesLabel: document.getElementById('analyses-label'),
  overallLabel: document.getElementById('overall-label'),
  duration: document.getElementById('duration'),
  analysesCount: document.getElementById('analyses-count'),
  overallScore: document.getElementById('overall-score'),
  categoryHeading: document.getElementById('category-heading'),
  postureTitle: document.getElementById('posture-title'),
  facialTitle: document.getElementById('facial-title'),
  handsTitle: document.getElementById('hands-title'),
  appearanceTitle: document.getElementById('appearance-title'),
  timelineHeading: document.getElementById('timeline-heading'),
  actionsHeading: document.getElementById('actions-heading'),
  actionItems: document.getElementById('action-items'),
  exportPdf: document.getElementById('export-pdf'),
  copySummary: document.getElementById('copy-summary'),
  viewAllSessions: document.getElementById('view-all-sessions'),
  toast: document.getElementById('toast'),
};

let toastTimeout = null;
let currentLanguage = DEFAULT_LANGUAGE;
let latestRenderedSession = null;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2100);
}

function scoreClass(score) {
  if (score >= 8) return 'excellent';
  if (score >= 5) return 'warning';
  return 'critical';
}

function categoryLabel(category) {
  if (category === 'posture') return t(currentLanguage, 'summary.categoryPosture');
  if (category === 'facial') return t(currentLanguage, 'summary.categoryFacial');
  if (category === 'hands') return t(currentLanguage, 'summary.categoryHands');
  return t(currentLanguage, 'summary.categoryAppearance');
}

function parseAverage(session, category) {
  const scores = session.analyses.map((analysis) => Number(analysis[category]?.score)).filter((score) => !Number.isNaN(score));
  if (!scores.length) return 0;
  return Number((scores.reduce((sum, current) => sum + current, 0) / scores.length).toFixed(1));
}

function formatDuration(startTime, endTime) {
  const minutes = Math.max(1, Math.round((endTime - startTime) / 60000));
  return `${minutes} min`;
}

function collectSummary(session) {
  const averages = {};
  const issueCount = {};
  const recommendations = {};

  categories.forEach((category) => {
    averages[category] = parseAverage(session, category);

    const issues = session.analyses.map((entry) => entry[category]?.issue).filter(Boolean);
    const recs = session.analyses.map((entry) => entry[category]?.suggestion).filter(Boolean);

    issueCount[category] = issues.length
      ? (issues.length === 1
        ? t(currentLanguage, 'summary.issueObservedSingle')
        : t(currentLanguage, 'summary.issueObservedPlural', { count: issues.length }))
      : t(currentLanguage, 'summary.consistentlyStrong');
    recommendations[category] = recs[0] || t(currentLanguage, 'summary.keepSteady');
  });

  const overall = Number(
    (
      categories.reduce((sum, category) => sum + averages[category], 0) /
      categories.length
    ).toFixed(1),
  );

  return { averages, issueCount, recommendations, overall };
}

function populateHeader(session, overall) {
  elements.duration.textContent = formatDuration(session.startTime, session.endTime || Date.now());
  elements.analysesCount.textContent = String(session.analyses.length);
  elements.overallScore.textContent = `${overall}/10`;
  elements.heroSubtitle.textContent = overall >= 8
    ? t(currentLanguage, 'summary.heroSubtitleStrong')
    : t(currentLanguage, 'summary.heroSubtitleFocus');
}

function populateCategoryCards(summary) {
  categories.forEach((category) => {
    const score = summary.averages[category];
    const scoreText = `${score}/10`;
    const card = document.getElementById(`${category}-card`);
    const meter = document.getElementById(`${category}-meter`);

    card.classList.remove('excellent', 'warning', 'critical');
    card.classList.add(scoreClass(score));

    document.getElementById(`${category}-score`).textContent = scoreText;
    document.getElementById(`${category}-summary`).textContent = summary.issueCount[category];
    document.getElementById(`${category}-recommendation`).textContent = summary.recommendations[category];

    meter.style.width = `${Math.max(6, score * 10)}%`;
  });
}

function createTimelineChart(session) {
  const ctx = document.getElementById('timeline-chart');
  const labels = session.analyses.map((entry, index) => {
    const seconds = Math.max(0, Math.round((entry.timestamp - session.startTime) / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return mins === 0 && index === 0 ? t(currentLanguage, 'summary.timelineStart') : `${mins}:${secs}`;
  });

  const colors = {
    posture: '#5ce1c3',
    facial: '#79b8ff',
    hands: '#ffd58a',
    appearance: '#ff7b9d',
  };

  const datasets = categories.map((category) => ({
    label: categoryLabel(category),
    data: session.analyses.map((entry) => Number(entry[category]?.score || 0)),
    borderColor: colors[category],
    backgroundColor: `${colors[category]}40`,
    borderWidth: 2,
    fill: false,
    tension: 0.35,
    pointRadius: 2,
    pointHoverRadius: 4,
  }));

  if (timelineChart) {
    timelineChart.destroy();
  }

  timelineChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: { color: '#d7e8ff' },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { color: '#a8bfe7', stepSize: 2 },
          grid: { color: 'rgba(160, 196, 255, 0.12)' },
        },
        x: {
          ticks: { color: '#a8bfe7', maxRotation: 0 },
          grid: { color: 'rgba(160, 196, 255, 0.08)' },
        },
      },
    },
  });
}

function generateActionItems(summary) {
  const ranked = Object.entries(summary.averages).sort((a, b) => a[1] - b[1]).slice(0, 3);

  elements.actionItems.innerHTML = '';
  ranked.forEach(([category, score]) => {
    const title = categoryLabel(category);
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = title;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(` (${score}/10): ${summary.recommendations[category]}`));
    elements.actionItems.appendChild(li);
  });
}

async function exportAsPdf() {
  window.print();
}

async function copySummaryText() {
  const lines = Array.from(elements.actionItems.querySelectorAll('li')).map((li, index) => `${index + 1}. ${li.textContent}`);
  const text = [
    t(currentLanguage, 'summary.copyTitle'),
    `${t(currentLanguage, 'summary.copyDuration')}: ${elements.duration.textContent}`,
    `${t(currentLanguage, 'summary.copyAnalyses')}: ${elements.analysesCount.textContent}`,
    `${t(currentLanguage, 'summary.copyOverall')}: ${elements.overallScore.textContent}`,
    '',
    t(currentLanguage, 'summary.copyActions'),
    ...lines,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast(t(currentLanguage, 'summary.toastCopied'));
  } catch {
    showToast(t(currentLanguage, 'summary.toastCopyFailed'));
  }
}

async function showSessionCount() {
  const sessions = await storage.getSessions();
  showToast(t(currentLanguage, 'summary.toastSessionCount', { count: sessions.length }));
}

function showLoading(waitingForCurrent = false) {
  elements.summaryContent.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.loading.classList.remove('hidden');
  elements.loadingText.textContent = waitingForCurrent
    ? t(currentLanguage, 'summary.loadingCurrent')
    : t(currentLanguage, 'summary.loadingLatest');
}

function showEmptyState() {
  elements.loading.classList.add('hidden');
  elements.summaryContent.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
}

function showSummary() {
  elements.loading.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.summaryContent.classList.remove('hidden');
}

function applyLanguage() {
  document.documentElement.lang = languageHtmlCode(currentLanguage);
  document.title = t(currentLanguage, 'summary.pageTitle');

  elements.languageToggle.textContent = languageToggleLabel(currentLanguage);
  elements.languageToggle.setAttribute('aria-label', languageToggleAriaLabel(currentLanguage));
  elements.heroEyebrow.textContent = t(currentLanguage, 'summary.heroEyebrow');
  elements.heroTitle.textContent = t(currentLanguage, 'summary.heroTitle');

  elements.loadingText.textContent = t(currentLanguage, 'summary.loadingLatest');
  elements.emptyTitle.textContent = t(currentLanguage, 'summary.emptyTitle');
  elements.emptyBody.textContent = t(currentLanguage, 'summary.emptyBody');

  elements.durationLabel.textContent = t(currentLanguage, 'summary.statDuration');
  elements.analysesLabel.textContent = t(currentLanguage, 'summary.statAnalyses');
  elements.overallLabel.textContent = t(currentLanguage, 'summary.statOverall');

  elements.categoryHeading.textContent = t(currentLanguage, 'summary.sectionCategory');
  elements.postureTitle.textContent = t(currentLanguage, 'summary.categoryPosture');
  elements.facialTitle.textContent = t(currentLanguage, 'summary.categoryFacial');
  elements.handsTitle.textContent = t(currentLanguage, 'summary.categoryHands');
  elements.appearanceTitle.textContent = t(currentLanguage, 'summary.categoryAppearance');
  elements.timelineHeading.textContent = t(currentLanguage, 'summary.sectionTimeline');
  elements.actionsHeading.textContent = t(currentLanguage, 'summary.sectionActions');
  const actionItemsLoading = document.getElementById('action-items-loading');
  if (actionItemsLoading) {
    actionItemsLoading.textContent = t(currentLanguage, 'summary.actionItemsLoading');
  }

  elements.exportPdf.textContent = t(currentLanguage, 'summary.btnExportPdf');
  elements.copySummary.textContent = t(currentLanguage, 'summary.btnCopySummary');
  elements.viewAllSessions.textContent = t(currentLanguage, 'summary.btnSessionCount');

  if (!latestRenderedSession) {
    elements.heroSubtitle.textContent = t(currentLanguage, 'summary.heroSubtitleFocus');
  }
}

function getLatestCompletedSession(sessions) {
  if (!Array.isArray(sessions)) {
    return null;
  }

  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    const candidate = sessions[i];
    if (candidate?.analyses?.length) {
      return candidate;
    }
  }

  return null;
}

async function refreshSummary() {
  const [currentSession, summarySession, sessions] = await Promise.all([
    storage.getCurrentSession(),
    storage.getSummarySession(),
    storage.getSessions(),
  ]);

  if (currentSession) {
    if (!currentSession.analyses?.length) {
      latestRenderedSession = null;
      showLoading(true);
      return;
    }

    const summary = collectSummary(currentSession);
    latestRenderedSession = currentSession;
    populateHeader(currentSession, summary.overall);
    populateCategoryCards(summary);
    createTimelineChart(currentSession);
    generateActionItems(summary);
    showSummary();
    return;
  }

  if (summarySession?.analyses?.length) {
    const summary = collectSummary(summarySession);
    latestRenderedSession = summarySession;
    populateHeader(summarySession, summary.overall);
    populateCategoryCards(summary);
    createTimelineChart(summarySession);
    generateActionItems(summary);
    showSummary();
    return;
  }

  const latestCompleted = getLatestCompletedSession(sessions);
  if (!latestCompleted) {
    latestRenderedSession = null;
    showEmptyState();
    return;
  }

  const summary = collectSummary(latestCompleted);
  latestRenderedSession = latestCompleted;
  populateHeader(latestCompleted, summary.overall);
  populateCategoryCards(summary);
  createTimelineChart(latestCompleted);
  generateActionItems(summary);
  showSummary();
}

async function toggleLanguage() {
  currentLanguage = getNextLanguage(currentLanguage);
  await storage.saveSettings({ language: currentLanguage });
  applyLanguage();
  await refreshSummary();
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

elements.exportPdf.addEventListener('click', exportAsPdf);
elements.copySummary.addEventListener('click', copySummaryText);
elements.viewAllSessions.addEventListener('click', showSessionCount);
elements.languageToggle.addEventListener('click', toggleLanguage);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (
    changes[STORAGE_KEYS.CURRENT_SESSION]
    || changes[STORAGE_KEYS.SUMMARY_SESSION]
    || changes[STORAGE_KEYS.SESSIONS]
  ) {
    void refreshSummary();
  }

  if (changes[STORAGE_KEYS.SETTINGS]?.newValue) {
    const nextLanguage = resolveLanguage(changes[STORAGE_KEYS.SETTINGS].newValue.language);
    if (nextLanguage !== currentLanguage) {
      currentLanguage = nextLanguage;
      applyLanguage();
      void refreshSummary();
    }
  }
});

(async function init() {
  await loadLanguage();
  showLoading();
  await refreshSummary();
  setInterval(refreshSummary, 5000);
})();
