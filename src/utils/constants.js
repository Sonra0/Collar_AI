// Analysis prompt for AI vision models
export const ANALYSIS_PROMPT = `You are a professional body language coach analyzing someone in a work meeting.
Analyze this person's body language and provide feedback on:

PRIMARY FOCUS CONDITIONS (high priority when evaluating image quality and coaching):
- webcam eye-level
- lens-focused eye contact
- upright spine
- slight forward lean
- open shoulders
- front-facing lighting
- visible hand gestures
- solid-colored attire
- neutral background
- calm facial expressions
- active nodding
- matte skin finish
- centered framing
- minimal fidgeting

1. POSTURE (0-10 score)
2. FACIAL EXPRESSIONS (0-10 score)
3. HAND GESTURES (0-10 score)
4. APPEARANCE (0-10 score)

For each category provide:
- score: integer from 0-10
- issue: concise issue description (null if score >= 8)
- suggestion: actionable improvement step tied to the focus conditions (null if score >= 8)

Also include:
- focus_conditions: object keyed by each focus condition with:
  - score: integer from 0-10
  - issue: concise issue text (null if score >= 8)
  - suggestion: one specific coaching action (null if score >= 8)
- priority_actions: array of up to 3 high-impact coaching suggestions

Respond ONLY with valid JSON in this exact shape:
{
  "posture": {"score": 8, "issue": "...", "suggestion": "..."},
  "facial": {"score": 9, "issue": null, "suggestion": null},
  "hands": {"score": 7, "issue": "...", "suggestion": "..."},
  "appearance": {"score": 10, "issue": null, "suggestion": null},
  "focus_conditions": {
    "webcam_eye_level": {"score": 7, "issue": "...", "suggestion": "..."},
    "lens_focused_eye_contact": {"score": 8, "issue": null, "suggestion": null},
    "upright_spine": {"score": 9, "issue": null, "suggestion": null},
    "slight_forward_lean": {"score": 6, "issue": "...", "suggestion": "..."},
    "open_shoulders": {"score": 8, "issue": null, "suggestion": null},
    "front_facing_lighting": {"score": 9, "issue": null, "suggestion": null},
    "visible_hand_gestures": {"score": 7, "issue": "...", "suggestion": "..."},
    "solid_colored_attire": {"score": 8, "issue": null, "suggestion": null},
    "neutral_background": {"score": 9, "issue": null, "suggestion": null},
    "calm_facial_expressions": {"score": 8, "issue": null, "suggestion": null},
    "active_nodding": {"score": 6, "issue": "...", "suggestion": "..."},
    "matte_skin_finish": {"score": 7, "issue": "...", "suggestion": "..."},
    "centered_framing": {"score": 9, "issue": null, "suggestion": null},
    "minimal_fidgeting": {"score": 7, "issue": "...", "suggestion": "..."}
  },
  "priority_actions": [
    "Raise camera to eye level and center your head and shoulders.",
    "Hold steady lens-focused eye contact during key speaking moments.",
    "Sit with upright spine, open shoulders, and visible hands."
  ]
}`;

export const ANALYSIS_PROMPT_FRENCH = `Vous etes un coach professionnel en langage corporel qui analyse une personne pendant une reunion de travail.
Analysez le langage corporel de cette personne et fournissez un retour sur :

CONDITIONS DE FOCUS PRINCIPALES (priorite elevee lors de l'evaluation de l'image et du coaching) :
- webcam eye-level
- lens-focused eye contact
- upright spine
- slight forward lean
- open shoulders
- front-facing lighting
- visible hand gestures
- solid-colored attire
- neutral background
- calm facial expressions
- active nodding
- matte skin finish
- centered framing
- minimal fidgeting

1. POSTURE (score de 0 a 10)
2. EXPRESSIONS FACIALES (score de 0 a 10)
3. GESTUELLE DES MAINS (score de 0 a 10)
4. APPARENCE (score de 0 a 10)

Pour chaque categorie, fournissez :
- score : entier de 0 a 10
- issue : description concise du probleme (null si score >= 8)
- suggestion : action concrete d'amelioration liee aux conditions de focus (null si score >= 8)

Inclure aussi :
- focus_conditions : objet avec chaque condition de focus :
  - score : entier de 0 a 10
  - issue : texte de probleme concis (null si score >= 8)
  - suggestion : une action de coaching precise (null si score >= 8)
- priority_actions : tableau de 3 suggestions de coaching a fort impact maximum

IMPORTANT : Tous les textes de coaching (issue, suggestion, priority_actions) doivent etre en francais.

Repondez UNIQUEMENT avec du JSON valide dans cette forme exacte :
{
  "posture": {"score": 8, "issue": "...", "suggestion": "..."},
  "facial": {"score": 9, "issue": null, "suggestion": null},
  "hands": {"score": 7, "issue": "...", "suggestion": "..."},
  "appearance": {"score": 10, "issue": null, "suggestion": null},
  "focus_conditions": {
    "webcam_eye_level": {"score": 7, "issue": "...", "suggestion": "..."},
    "lens_focused_eye_contact": {"score": 8, "issue": null, "suggestion": null},
    "upright_spine": {"score": 9, "issue": null, "suggestion": null},
    "slight_forward_lean": {"score": 6, "issue": "...", "suggestion": "..."},
    "open_shoulders": {"score": 8, "issue": null, "suggestion": null},
    "front_facing_lighting": {"score": 9, "issue": null, "suggestion": null},
    "visible_hand_gestures": {"score": 7, "issue": "...", "suggestion": "..."},
    "solid_colored_attire": {"score": 8, "issue": null, "suggestion": null},
    "neutral_background": {"score": 9, "issue": null, "suggestion": null},
    "calm_facial_expressions": {"score": 8, "issue": null, "suggestion": null},
    "active_nodding": {"score": 6, "issue": "...", "suggestion": "..."},
    "matte_skin_finish": {"score": 7, "issue": "...", "suggestion": "..."},
    "centered_framing": {"score": 9, "issue": null, "suggestion": null},
    "minimal_fidgeting": {"score": 7, "issue": "...", "suggestion": "..."}
  },
  "priority_actions": [
    "Montez la camera au niveau des yeux et centrez votre tete et vos epaules.",
    "Maintenez un contact visuel stable avec l'objectif pendant les moments cles.",
    "Gardez la colonne droite, les epaules ouvertes et les mains visibles."
  ]
}`;

export const ANALYSIS_PROMPTS = {
  'en-CA': ANALYSIS_PROMPT,
  'fr-FR': ANALYSIS_PROMPT_FRENCH,
};

// Severity thresholds
export const SEVERITY = {
  CRITICAL: 5,
  WARNING: 7,
  GOOD: 8,
};

// Analysis timing
export const TIMING = {
  CAPTURE_INTERVAL: 15000,
  CONSECUTIVE_WARNINGS: 1,
  NOTIFICATION_COOLDOWN: 120000,
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  SESSIONS: 'sessions',
  CURRENT_SESSION: 'currentSession',
  SUMMARY_SESSION: 'summarySession',
  LIVE_COACHING_FEED: 'liveCoachingFeed',
};

export const LIVE_COACHING_MAX_ITEMS = 200;
export const LOCAL_FRAME_RECORDER_ENDPOINT = 'http://127.0.0.1:3131/save-frame';

// Default settings
export const DEFAULT_SETTINGS = {
  apiProvider: 'claude',
  apiKey: '',
  language: 'en-CA',
  monitoringEnabled: true,
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
