const ANALYSIS_CATEGORIES = ['posture', 'facial', 'hands', 'appearance'];

function normalizeScore(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function collectScores(analysis) {
  const scores = [];
  for (const category of ANALYSIS_CATEGORIES) {
    const score = normalizeScore(analysis?.[category]?.score);
    if (!Number.isFinite(score)) {
      return [];
    }
    scores.push(score);
  }
  return scores;
}

export function buildEncouragementMessage(analysis) {
  const scores = collectScores(analysis);
  if (scores.length !== ANALYSIS_CATEGORIES.length) {
    return null;
  }

  const minScore = Math.min(...scores);
  if (minScore < 7) {
    return null;
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average < 7.5) {
    return null;
  }

  const minorIssues = scores.filter((score) => score < 8).length;
  if (minorIssues === 0) {
    return "Everything's okay. Keep it up.";
  }

  return 'Everything looks good overall. Keep it up.';
}
