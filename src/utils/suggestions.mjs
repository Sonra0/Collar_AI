const DEFAULT_FALLBACKS = {
  posture: 'Set your webcam eye-level, keep an upright spine, and lean slightly forward with open shoulders.',
  facial: 'Maintain lens-focused eye contact with calm facial expressions and small active nodding cues.',
  hands: 'Keep visible hand gestures in-frame and reduce minimal fidgeting when listening.',
  appearance: 'Use front-facing lighting, solid-colored attire, a neutral background, and a matte skin finish.',
};

function normalizeScore(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function cleanSuggestionText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function pushUniqueSuggestion(target, seen, suggestion, maxCount) {
  if (target.length >= maxCount) return;
  const cleaned = cleanSuggestionText(suggestion);
  if (!cleaned) return;

  const key = cleaned.toLowerCase();
  if (seen.has(key)) return;

  seen.add(key);
  target.push(cleaned);
}

function appendPriorityActions(analysis, target, seen, maxCount) {
  const actions = Array.isArray(analysis?.priority_actions) ? analysis.priority_actions : [];
  for (const action of actions) {
    pushUniqueSuggestion(target, seen, action, maxCount);
  }
}

function appendFocusConditionSuggestions(analysis, target, seen, maxCount) {
  const conditions = analysis?.focus_conditions;
  if (!conditions || typeof conditions !== 'object') return;

  const entries = Object.values(conditions);
  for (const condition of entries) {
    const score = normalizeScore(condition?.score);
    if (!Number.isFinite(score) || score >= 8) continue;
    pushUniqueSuggestion(target, seen, condition?.suggestion, maxCount);
  }
}

function appendIssueSuggestions(issues, target, seen, maxCount) {
  for (const issue of issues || []) {
    const direct = cleanSuggestionText(issue?.suggestion);
    if (direct) {
      pushUniqueSuggestion(target, seen, direct, maxCount);
      continue;
    }

    const fallback = DEFAULT_FALLBACKS[issue?.category] || '';
    pushUniqueSuggestion(target, seen, fallback, maxCount);
  }
}

export function extractPrioritySuggestions(analysis, issues = [], maxCount = 2) {
  const limit = Math.max(1, Number(maxCount) || 2);
  const suggestions = [];
  const seen = new Set();

  appendPriorityActions(analysis, suggestions, seen, limit);
  appendFocusConditionSuggestions(analysis, suggestions, seen, limit);
  appendIssueSuggestions(issues, suggestions, seen, limit);

  return suggestions;
}
