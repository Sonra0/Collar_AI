import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEncouragementMessage } from '../src/background/feedback-messaging.js';

test('buildEncouragementMessage returns strongest message for fully strong analysis', () => {
  const analysis = {
    posture: { score: 9 },
    facial: { score: 8 },
    hands: { score: 8.5 },
    appearance: { score: 9.2 },
  };

  assert.equal(buildEncouragementMessage(analysis), "Everything's okay. Keep it up.");
});

test('buildEncouragementMessage returns softer positive message for minor-only issues', () => {
  const analysis = {
    posture: { score: 7.2 },
    facial: { score: 8.1 },
    hands: { score: 8.4 },
    appearance: { score: 8 },
  };

  assert.equal(buildEncouragementMessage(analysis), 'Everything looks good overall. Keep it up.');
});

test('buildEncouragementMessage returns null when there are meaningful issues', () => {
  const analysis = {
    posture: { score: 6.9 },
    facial: { score: 8.1 },
    hands: { score: 8.4 },
    appearance: { score: 8 },
  };

  assert.equal(buildEncouragementMessage(analysis), null);
});

test('buildEncouragementMessage returns null for incomplete score sets', () => {
  const analysis = {
    posture: { score: 9 },
    facial: { score: 8 },
  };

  assert.equal(buildEncouragementMessage(analysis), null);
});
