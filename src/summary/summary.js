import Chart from 'chart.js/auto';
import storage from '../utils/storage.js';

const categories = ['posture', 'facial', 'hands', 'appearance'];
let timelineChart = null;

const elements = {
  loading: document.getElementById('loading'),
  emptyState: document.getElementById('empty-state'),
  summaryContent: document.getElementById('summary-content'),
  duration: document.getElementById('duration'),
  analysesCount: document.getElementById('analyses-count'),
  overallScore: document.getElementById('overall-score'),
  actionItems: document.getElementById('action-items'),
  heroSubtitle: document.getElementById('hero-subtitle'),
  exportPdf: document.getElementById('export-pdf'),
  copySummary: document.getElementById('copy-summary'),
  viewAllSessions: document.getElementById('view-all-sessions'),
  toast: document.getElementById('toast'),
};

let toastTimeout = null;

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

    issueCount[category] = issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''} observed` : 'Consistently strong';
    recommendations[category] = recs[0] || 'Keep this category steady.';
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
    ? 'Strong meeting presence with minor tuning opportunities.'
    : 'Focused adjustments can raise your next meeting impact.';
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
    return mins === 0 && index === 0 ? 'Start' : `${mins}:${secs}`;
  });

  const colors = {
    posture: '#5ce1c3',
    facial: '#79b8ff',
    hands: '#ffd58a',
    appearance: '#ff7b9d',
  };

  const datasets = categories.map((category) => ({
    label: category.charAt(0).toUpperCase() + category.slice(1),
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
  const items = ranked.map(([category, score]) => {
    const title = category.charAt(0).toUpperCase() + category.slice(1);
    return `<strong>${title}</strong> (${score}/10): ${summary.recommendations[category]}`;
  });

  elements.actionItems.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
}

async function exportAsPdf() {
  window.print();
}

async function copySummaryText() {
  const lines = Array.from(elements.actionItems.querySelectorAll('li')).map((li, index) => `${index + 1}. ${li.textContent}`);
  const text = [
    'Meeting Body Language Summary',
    `Duration: ${elements.duration.textContent}`,
    `Analyses: ${elements.analysesCount.textContent}`,
    `Overall: ${elements.overallScore.textContent}`,
    '',
    'Top Action Items:',
    ...lines,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast('Summary copied to clipboard.');
  } catch {
    showToast('Clipboard copy failed in this context.');
  }
}

async function showSessionCount() {
  const sessions = await storage.getSessions();
  showToast(`Total saved sessions: ${sessions.length}`);
}

function showEmptyState() {
  elements.loading.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
}

function showSummary() {
  elements.loading.classList.add('hidden');
  elements.summaryContent.classList.remove('hidden');
}

async function loadLatestSession() {
  const summarySession = await storage.getSummarySession();
  if (summarySession?.analyses?.length) {
    await storage.clearSummarySession();

    const summary = collectSummary(summarySession);
    populateHeader(summarySession, summary.overall);
    populateCategoryCards(summary);
    createTimelineChart(summarySession);
    generateActionItems(summary);
    showSummary();
    return;
  }

  const sessions = await storage.getSessions();
  if (!sessions.length) {
    showEmptyState();
    return;
  }

  const latest = sessions[sessions.length - 1];
  if (!latest.analyses?.length) {
    showEmptyState();
    return;
  }

  const summary = collectSummary(latest);
  populateHeader(latest, summary.overall);
  populateCategoryCards(summary);
  createTimelineChart(latest);
  generateActionItems(summary);
  showSummary();
}

elements.exportPdf.addEventListener('click', exportAsPdf);
elements.copySummary.addEventListener('click', copySummaryText);
elements.viewAllSessions.addEventListener('click', showSessionCount);

loadLatestSession();
