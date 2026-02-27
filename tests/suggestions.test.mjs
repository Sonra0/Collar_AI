import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPrioritySuggestions } from '../src/utils/suggestions.mjs';

test('extractPrioritySuggestions prioritizes condition actions and deduplicates', () => {
  const analysis = {
    priority_actions: [
      'Raise your webcam to eye level and center your framing.',
      'Keep eye contact with the lens for key points.',
      'Raise your webcam to eye level and center your framing.',
    ],
    focus_conditions: {
      webcam_eye_level: { score: 4, suggestion: 'Raise your webcam to eye level and center your framing.' },
      eye_contact_lens: { score: 5, suggestion: 'Keep eye contact with the lens for key points.' },
      shoulders_open: { score: 8, suggestion: null },
    },
  };

  const issues = [
    { category: 'posture', suggestion: 'Sit upright with open shoulders and a slight forward lean.' },
    { category: 'hands', suggestion: null },
  ];

  const top = extractPrioritySuggestions(analysis, issues, 3);

  assert.deepEqual(top, [
    'Raise your webcam to eye level and center your framing.',
    'Keep eye contact with the lens for key points.',
    'Sit upright with open shoulders and a slight forward lean.',
  ]);
});

test('extractPrioritySuggestions falls back to category guidance when suggestions are missing', () => {
  const analysis = {};
  const issues = [
    { category: 'appearance', suggestion: null },
  ];

  const top = extractPrioritySuggestions(analysis, issues, 1);
  assert.equal(top.length, 1);
  assert.match(top[0], /front-facing lighting|neutral background|solid-colored/i);
});
