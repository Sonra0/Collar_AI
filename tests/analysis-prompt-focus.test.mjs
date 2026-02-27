import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_FOCUS_PHRASES = [
  'webcam eye-level',
  'lens-focused eye contact',
  'upright spine',
  'slight forward lean',
  'open shoulders',
  'front-facing lighting',
  'visible hand gestures',
  'solid-colored attire',
  'neutral background',
  'calm facial expressions',
  'active nodding',
  'matte skin finish',
  'centered framing',
  'minimal fidgeting',
];

test('analysis prompt emphasizes all required focus conditions', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/utils/constants.js'), 'utf8').toLowerCase();

  for (const phrase of REQUIRED_FOCUS_PHRASES) {
    assert.equal(
      source.includes(phrase),
      true,
      `Expected analysis prompt to include required phrase: "${phrase}"`,
    );
  }
});
