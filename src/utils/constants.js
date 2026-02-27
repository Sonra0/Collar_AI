// Analysis prompt for AI vision models
export const ANALYSIS_PROMPT = `You are a professional body language coach analyzing someone in a work meeting.
Analyze this person's body language and provide feedback on:

1. POSTURE (0-10 score)
2. FACIAL EXPRESSIONS (0-10 score)
3. HAND GESTURES (0-10 score)
4. APPEARANCE (0-10 score)

For each category provide:
- score: integer from 0-10
- issue: concise issue description (null if score >= 8)
- suggestion: actionable improvement step (null if score >= 8)

Respond ONLY with valid JSON in this exact shape:
{
  "posture": {"score": 8, "issue": "...", "suggestion": "..."},
  "facial": {"score": 9, "issue": null, "suggestion": null},
  "hands": {"score": 7, "issue": "...", "suggestion": "..."},
  "appearance": {"score": 10, "issue": null, "suggestion": null}
}`;

// Severity thresholds
export const SEVERITY = {
  CRITICAL: 5,
  WARNING: 7,
  GOOD: 8,
};

// Analysis timing
export const TIMING = {
  CAPTURE_INTERVAL: 30000,
  CONSECUTIVE_WARNINGS: 2,
  NOTIFICATION_COOLDOWN: 120000,
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  SESSIONS: 'sessions',
  CURRENT_SESSION: 'currentSession',
  SUMMARY_SESSION: 'summarySession',
};

// Default settings
export const DEFAULT_SETTINGS = {
  apiProvider: 'claude',
  apiKey: '',
  sensitivity: 'medium',
  notificationsEnabled: true,
  dataRetentionDays: 7,
  ephemeralMode: false,
};

// API endpoints
export const API_ENDPOINTS = {
  claude: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
};

// API models
export const API_MODELS = {
  claude: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o-mini',
};
