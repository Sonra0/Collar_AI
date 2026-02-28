import { ANALYSIS_PROMPT, ANALYSIS_PROMPTS, API_ENDPOINTS, API_MODELS } from './constants.js';

function prepareFrame(frameInput) {
  const isDataUrl = typeof frameInput === 'string' && frameInput.startsWith('data:image');

  if (isDataUrl) {
    const base64 = frameInput.split(',')[1] || '';
    return { dataUrl: frameInput, base64 };
  }

  return {
    dataUrl: `data:image/jpeg;base64,${frameInput}`,
    base64: frameInput,
  };
}

function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty analysis response');
  }

  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');

    if (first === -1 || last === -1 || last <= first) {
      throw new Error('Unable to parse analysis JSON');
    }

    return JSON.parse(cleaned.slice(first, last + 1));
  }
}

function resolvePrompt(language) {
  if (language && ANALYSIS_PROMPTS[language]) {
    return ANALYSIS_PROMPTS[language];
  }

  return ANALYSIS_PROMPT;
}

function normalizeTargetLanguage(language) {
  return language === 'fr-FR' ? 'fr-FR' : 'en-CA';
}

function translationLanguageLabel(language) {
  return normalizeTargetLanguage(language) === 'fr-FR' ? 'French' : 'Canadian English';
}

/**
 * API client for vision analysis
 */
class APIClient {
  constructor() {
    this.cachedClaudeModel = null;
  }

  buildClaudeModelCandidates() {
    const ordered = [
      this.cachedClaudeModel,
      API_MODELS.claude,
      'claude-3-5-sonnet-latest',
      'claude-3-7-sonnet-latest',
      'claude-sonnet-4-0',
      'claude-sonnet-4-20250514',
    ];

    return ordered.filter((model, index) => model && ordered.indexOf(model) === index);
  }

  async requestClaudeAnalysis(frame, apiKey, model, promptText) {
    const response = await fetch(API_ENDPOINTS.claude, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required for browser-like runtimes (extensions/service workers).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: frame.base64,
                },
              },
              {
                type: 'text',
                text: promptText,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || response.statusText;
      const err = new Error(`Claude API error: ${message}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const analysisText = data.content?.find((entry) => entry.type === 'text')?.text || '';
    return extractJson(analysisText);
  }

  shouldRetryClaudeModel(error) {
    if (!error) return false;
    const status = Number(error.status) || 0;
    const message = String(error.message || '').toLowerCase();
    return status === 400 || status === 404 || message.includes('model');
  }

  async validateClaudeKey(apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required for browser-like runtimes (extensions/service workers).
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });

    return this.interpretValidationResponse(response);
  }

  async validateOpenAIKey(apiKey) {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return this.interpretValidationResponse(response);
  }

  interpretValidationResponse(response) {
    if (response.ok) {
      return true;
    }

    if (response.status === 401 || response.status === 403) {
      return false;
    }

    // Quota/rate-limit still implies authenticated credentials.
    if (response.status === 429) {
      return true;
    }

    throw new Error(`Unable to validate API key (status ${response.status})`);
  }

  async analyzeWithClaude(frameInput, apiKey) {
    const frame = prepareFrame(frameInput);
    const promptText = resolvePrompt('en-CA');
    const models = this.buildClaudeModelCandidates();
    let lastError = null;

    for (const model of models) {
      try {
        const result = await this.requestClaudeAnalysis(frame, apiKey, model, promptText);
        this.cachedClaudeModel = model;
        return result;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetryClaudeModel(error)) {
          throw error;
        }
      }
    }

    if (lastError) throw lastError;
    throw new Error('Claude API error: no compatible model available');
  }

  async analyzeWithClaudeByLanguage(frameInput, apiKey, language = 'en-CA') {
    const frame = prepareFrame(frameInput);
    const promptText = resolvePrompt(language);
    const models = this.buildClaudeModelCandidates();
    let lastError = null;

    for (const model of models) {
      try {
        const result = await this.requestClaudeAnalysis(frame, apiKey, model, promptText);
        this.cachedClaudeModel = model;
        return result;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetryClaudeModel(error)) {
          throw error;
        }
      }
    }

    if (lastError) throw lastError;
    throw new Error('Claude API error: no compatible model available');
  }

  async analyzeWithOpenAI(frameInput, apiKey, language = 'en-CA') {
    const frame = prepareFrame(frameInput);
    const promptText = resolvePrompt(language);

    const response = await fetch(API_ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: API_MODELS.openai,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: frame.dataUrl,
                },
              },
              {
                type: 'text',
                text: promptText,
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const analysisText = Array.isArray(rawContent)
      ? rawContent
        .map((part) => {
          if (typeof part === 'string') return part;
          return part?.text || '';
        })
        .join('\n')
      : (rawContent || '');
    return extractJson(analysisText);
  }

  async analyze(frameInput, apiKey, provider = 'claude', language = 'en-CA') {
    if (!apiKey) {
      throw new Error('Missing API key');
    }

    if (provider === 'claude') {
      return this.analyzeWithClaudeByLanguage(frameInput, apiKey, language);
    }

    if (provider === 'openai') {
      return this.analyzeWithOpenAI(frameInput, apiKey, language);
    }

    throw new Error(`Unsupported API provider: ${provider}`);
  }

  async validateApiKey(apiKey, provider = 'claude') {
    if (!apiKey) {
      return false;
    }

    if (provider === 'claude') {
      return this.validateClaudeKey(apiKey);
    }

    if (provider === 'openai') {
      return this.validateOpenAIKey(apiKey);
    }

    throw new Error(`Unsupported API provider: ${provider}`);
  }

  async translateWithClaude(text, apiKey, targetLanguage = 'en-CA') {
    const sourceText = String(text || '').trim();
    if (!sourceText) return '';

    const languageLabel = translationLanguageLabel(targetLanguage);
    const models = this.buildClaudeModelCandidates();
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(API_ENDPOINTS.claude, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: 240,
            temperature: 0,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Translate this body-language coaching text to ${languageLabel}. Return only translated text with no explanation.\n\n${sourceText}`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = error?.error?.message || response.statusText;
          const err = new Error(`Claude translation error: ${message}`);
          err.status = response.status;
          throw err;
        }

        const data = await response.json();
        this.cachedClaudeModel = model;
        return String(data.content?.find((entry) => entry.type === 'text')?.text || sourceText).trim();
      } catch (error) {
        lastError = error;
        if (!this.shouldRetryClaudeModel(error)) {
          throw error;
        }
      }
    }

    if (lastError) throw lastError;
    return sourceText;
  }

  async translateWithOpenAI(text, apiKey, targetLanguage = 'en-CA') {
    const sourceText = String(text || '').trim();
    if (!sourceText) return '';

    const languageLabel = translationLanguageLabel(targetLanguage);
    const response = await fetch(API_ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: API_MODELS.openai,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Translate this body-language coaching text to ${languageLabel}. Return only translated text with no explanation.\n\n${sourceText}`,
          },
        ],
        max_tokens: 240,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI translation error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const translated = Array.isArray(rawContent)
      ? rawContent
        .map((part) => {
          if (typeof part === 'string') return part;
          return part?.text || '';
        })
        .join('\n')
      : (rawContent || sourceText);
    return String(translated).trim();
  }

  async translateText(text, apiKey, provider = 'claude', targetLanguage = 'en-CA') {
    if (!apiKey) {
      return String(text || '');
    }

    if (provider === 'claude') {
      return this.translateWithClaude(text, apiKey, targetLanguage);
    }

    if (provider === 'openai') {
      return this.translateWithOpenAI(text, apiKey, targetLanguage);
    }

    return String(text || '');
  }
}

export default new APIClient();
