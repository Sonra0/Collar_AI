export const LANGUAGES = {
  EN_CA: 'en-CA',
  FR_FR: 'fr-FR',
};

export const DEFAULT_LANGUAGE = LANGUAGES.EN_CA;

const translations = {
  [LANGUAGES.EN_CA]: {
    languageName: 'English',
    popup: {
      pageTitle: 'Body Language Coach',
      heroEyebrow: 'Meeting Presence',
      heroTitle: 'Body Language Coach',
      heroSubhead: 'Real-time cues for posture, engagement, and clarity.',
      statusLabel: 'Monitoring',
      statusOff: 'Monitoring is OFF',
      statusNotActive: 'Not active',
      statusNotificationsBlocked: 'Active - notifications blocked',
      statusWithAnalyses: 'Active - {count} analyses',
      statusApiMissing: 'Active - API key not saved',
      statusWithErrors: 'Active - 0 analyses - {count} errors',
      statusWaitingFirst: 'Active - waiting for first analysis',
      configHeading: 'Configuration',
      providerLabel: 'Provider',
      apiKeyLabel: 'API Key',
      apiKeyPlaceholder: 'Paste your secret key',
      validateKey: 'Validate key',
      sensitivityLabel: 'Sensitivity',
      sensitivityLow: 'Low',
      sensitivityMedium: 'Medium',
      sensitivityHigh: 'High',
      alertsLabel: 'Alerts',
      retentionLabel: 'Retention (days)',
      ephemeralLabel: 'Ephemeral',
      saveSettings: 'Save settings',
      monitoringOffButton: 'Turn monitoring off',
      monitoringOnButton: 'Turn monitoring on',
      liveCoachingButton: 'Live coaching',
      openSummaryButton: 'Open summary',
      clearDataButton: 'Clear local data',
      toastMonitoringOn: 'Monitoring turned on.',
      toastMonitoringOff: 'Monitoring turned off.',
      toastSettingsSaved: 'Settings saved locally ({provider}).',
      toastEnterApiKey: 'Enter an API key first.',
      toastApiValid: 'API key is valid and saved.',
      toastApiInvalid: 'API key is invalid or unauthorized.',
      toastValidationFailed: 'Validation failed: {message}',
      toastValidationFailedGeneric: 'Validation failed. Try again.',
      toastDataCleared: 'All extension data was cleared.',
      toastLanguageSwitched: 'Language switched to {language}.',
      confirmClearData: 'Clear settings and all saved sessions? This cannot be undone.',
    },
    live: {
      pageTitle: 'Live Coaching',
      heroEyebrow: 'Live Coaching',
      heroTitle: 'Real-time Feedback Stream',
      heroSubhead: 'Alerts are shown here even when desktop notifications are blocked.',
      backToMain: 'Back',
      clearFeed: 'Clear feed',
      emptyState: 'No live coaching events yet. Join a meeting to start.',
      itemCountSingle: '1 item',
      itemCountPlural: '{count} items',
      updatedNow: 'Updated just now',
      updatedAt: 'Updated {time}',
      defaultItemTitle: 'Live coaching update',
    },
    summary: {
      pageTitle: 'Meeting Summary - Body Language Coach',
      heroEyebrow: 'Meeting Insights',
      heroTitle: 'Body Language Summary',
      heroSubtitleStrong: 'Strong meeting presence with minor tuning opportunities.',
      heroSubtitleFocus: 'Focused adjustments can raise your next meeting impact.',
      loadingLatest: 'Loading your latest session...',
      loadingCurrent: 'Waiting for first analysis in this meeting...',
      emptyTitle: 'No sessions yet',
      emptyBody: 'Join a Google Meet call with the extension active, then return here.',
      statDuration: 'Duration',
      statAnalyses: 'Analyses',
      statOverall: 'Overall Score',
      sectionCategory: 'Category Breakdown',
      categoryPosture: 'Posture',
      categoryFacial: 'Facial',
      categoryHands: 'Hands',
      categoryAppearance: 'Appearance',
      sectionTimeline: 'Performance Timeline',
      timelineStart: 'Start',
      sectionActions: 'Top 3 Action Items',
      actionItemsLoading: 'Loading recommendations...',
      btnExportPdf: 'Export PDF',
      btnCopySummary: 'Copy Summary',
      btnSessionCount: 'Session Count',
      issueObservedSingle: '1 issue observed',
      issueObservedPlural: '{count} issues observed',
      consistentlyStrong: 'Consistently strong',
      keepSteady: 'Keep this category steady.',
      toastCopied: 'Summary copied to clipboard.',
      toastCopyFailed: 'Clipboard copy failed in this context.',
      toastSessionCount: 'Total saved sessions: {count}',
      copyTitle: 'Meeting Body Language Summary',
      copyDuration: 'Duration',
      copyAnalyses: 'Analyses',
      copyOverall: 'Overall',
      copyActions: 'Top Action Items:',
    },
  },
  [LANGUAGES.FR_FR]: {
    languageName: 'Francais',
    popup: {
      pageTitle: 'Coach de langage corporel',
      heroEyebrow: 'Presence en reunion',
      heroTitle: 'Coach de langage corporel',
      heroSubhead: 'Conseils en temps reel pour la posture, l\'engagement et la clarte.',
      statusLabel: 'Surveillance',
      statusOff: 'Surveillance DESACTIVEE',
      statusNotActive: 'Inactif',
      statusNotificationsBlocked: 'Actif - notifications bloquees',
      statusWithAnalyses: 'Actif - {count} analyses',
      statusApiMissing: 'Actif - cle API non enregistree',
      statusWithErrors: 'Actif - 0 analyse - {count} erreurs',
      statusWaitingFirst: 'Actif - en attente de la premiere analyse',
      configHeading: 'Configuration',
      providerLabel: 'Fournisseur',
      apiKeyLabel: 'Cle API',
      apiKeyPlaceholder: 'Collez votre cle secrete',
      validateKey: 'Valider la cle',
      sensitivityLabel: 'Sensibilite',
      sensitivityLow: 'Faible',
      sensitivityMedium: 'Moyenne',
      sensitivityHigh: 'Elevee',
      alertsLabel: 'Alertes',
      retentionLabel: 'Retention (jours)',
      ephemeralLabel: 'Ephemere',
      saveSettings: 'Enregistrer les parametres',
      monitoringOffButton: 'Desactiver la surveillance',
      monitoringOnButton: 'Activer la surveillance',
      liveCoachingButton: 'Coaching en direct',
      openSummaryButton: 'Ouvrir le resume',
      clearDataButton: 'Effacer les donnees locales',
      toastMonitoringOn: 'Surveillance activee.',
      toastMonitoringOff: 'Surveillance desactivee.',
      toastSettingsSaved: 'Parametres enregistres localement ({provider}).',
      toastEnterApiKey: 'Saisissez d\'abord une cle API.',
      toastApiValid: 'La cle API est valide et enregistree.',
      toastApiInvalid: 'Cle API invalide ou non autorisee.',
      toastValidationFailed: 'Echec de validation : {message}',
      toastValidationFailedGeneric: 'Echec de validation. Reessayez.',
      toastDataCleared: 'Toutes les donnees de l\'extension ont ete effacees.',
      toastLanguageSwitched: 'Langue changee en {language}.',
      confirmClearData: 'Effacer les parametres et toutes les sessions enregistrees ? Action irreversible.',
    },
    live: {
      pageTitle: 'Coaching en direct',
      heroEyebrow: 'Coaching en direct',
      heroTitle: 'Flux de retours en temps reel',
      heroSubhead: 'Les alertes apparaissent ici meme si les notifications de bureau sont bloquees.',
      backToMain: 'Retour',
      clearFeed: 'Effacer le flux',
      emptyState: 'Aucun evenement de coaching pour le moment. Rejoignez une reunion pour demarrer.',
      itemCountSingle: '1 element',
      itemCountPlural: '{count} elements',
      updatedNow: 'Mis a jour a l\'instant',
      updatedAt: 'Mis a jour {time}',
      defaultItemTitle: 'Mise a jour du coaching en direct',
    },
    summary: {
      pageTitle: 'Resume de reunion - Coach de langage corporel',
      heroEyebrow: 'Insights de reunion',
      heroTitle: 'Resume du langage corporel',
      heroSubtitleStrong: 'Presence solide en reunion avec quelques ajustements mineurs.',
      heroSubtitleFocus: 'Des ajustements cibles peuvent augmenter votre impact a la prochaine reunion.',
      loadingLatest: 'Chargement de votre derniere session...',
      loadingCurrent: 'En attente de la premiere analyse de cette reunion...',
      emptyTitle: 'Aucune session pour le moment',
      emptyBody: 'Rejoignez un appel Google Meet avec l\'extension active, puis revenez ici.',
      statDuration: 'Duree',
      statAnalyses: 'Analyses',
      statOverall: 'Score global',
      sectionCategory: 'Repartition par categorie',
      categoryPosture: 'Posture',
      categoryFacial: 'Visage',
      categoryHands: 'Mains',
      categoryAppearance: 'Apparence',
      sectionTimeline: 'Chronologie des performances',
      timelineStart: 'Debut',
      sectionActions: 'Top 3 actions',
      actionItemsLoading: 'Chargement des recommandations...',
      btnExportPdf: 'Exporter en PDF',
      btnCopySummary: 'Copier le resume',
      btnSessionCount: 'Nombre de sessions',
      issueObservedSingle: '1 probleme observe',
      issueObservedPlural: '{count} problemes observes',
      consistentlyStrong: 'Niveau regulierement eleve',
      keepSteady: 'Maintenez cette categorie stable.',
      toastCopied: 'Resume copie dans le presse-papiers.',
      toastCopyFailed: 'La copie vers le presse-papiers a echoue ici.',
      toastSessionCount: 'Total des sessions enregistrees : {count}',
      copyTitle: 'Resume du langage corporel en reunion',
      copyDuration: 'Duree',
      copyAnalyses: 'Analyses',
      copyOverall: 'Global',
      copyActions: 'Actions principales :',
    },
  },
};

function getByPath(source, key) {
  return key.split('.').reduce((value, part) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    return value[part];
  }, source);
}

export function resolveLanguage(language) {
  return language === LANGUAGES.FR_FR ? LANGUAGES.FR_FR : LANGUAGES.EN_CA;
}

export function getNextLanguage(language) {
  return resolveLanguage(language) === LANGUAGES.FR_FR ? LANGUAGES.EN_CA : LANGUAGES.FR_FR;
}

export function languageToggleLabel(language) {
  return resolveLanguage(language) === LANGUAGES.FR_FR ? '🇫🇷 Francais' : '🇨🇦 English';
}

export function languageToggleAriaLabel(language) {
  return resolveLanguage(language) === LANGUAGES.FR_FR
    ? 'Switch to English'
    : 'Passer en francais';
}

export function languageHtmlCode(language) {
  return resolveLanguage(language) === LANGUAGES.FR_FR ? 'fr' : 'en';
}

export function t(language, key, vars = {}) {
  const resolved = resolveLanguage(language);
  const template = getByPath(translations[resolved], key) ?? getByPath(translations[DEFAULT_LANGUAGE], key) ?? key;
  if (typeof template !== 'string') {
    return key;
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(vars, token)) {
      return String(vars[token]);
    }
    return '';
  });
}
