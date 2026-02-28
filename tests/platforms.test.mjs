import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLATFORMS,
  detectPlatform,
  getSelfVideoSelectors,
  isSupportedPlatform,
} from '../src/utils/platforms.js';

test('PLATFORMS contains all six supported platforms', () => {
  const hostnames = Object.keys(PLATFORMS);
  assert.ok(hostnames.includes('meet.google.com'));
  assert.ok(hostnames.includes('app.zoom.us'));
  assert.ok(hostnames.includes('teams.microsoft.com'));
  assert.ok(hostnames.includes('teams.live.com'));
  assert.ok(hostnames.includes('app.slack.com'));
  assert.ok(hostnames.includes('discord.com'));
});

test('PLATFORMS entries for webex use wildcard matching', () => {
  assert.ok(isSupportedPlatform('meet.webex.com'));
  assert.ok(isSupportedPlatform('company.webex.com'));
});

test('detectPlatform returns config for known hostname', () => {
  const platform = detectPlatform('meet.google.com');
  assert.equal(platform.name, 'Google Meet');
  assert.ok(Array.isArray(platform.selfVideoSelectors));
  assert.ok(platform.selfVideoSelectors.length > 0);
});

test('detectPlatform returns config for webex subdomain', () => {
  const platform = detectPlatform('meet.webex.com');
  assert.equal(platform.name, 'Webex');
});

test('detectPlatform returns null for unknown hostname', () => {
  assert.equal(detectPlatform('example.com'), null);
});

test('getSelfVideoSelectors returns array for known platform', () => {
  const selectors = getSelfVideoSelectors('app.zoom.us');
  assert.ok(Array.isArray(selectors));
  assert.ok(selectors.length > 0);
});

test('getSelfVideoSelectors returns empty array for unknown platform', () => {
  const selectors = getSelfVideoSelectors('example.com');
  assert.deepEqual(selectors, []);
});

test('isSupportedPlatform returns true for all supported hostnames', () => {
  const supported = [
    'meet.google.com',
    'app.zoom.us',
    'teams.microsoft.com',
    'teams.live.com',
    'meet.webex.com',
    'app.slack.com',
    'discord.com',
  ];
  for (const hostname of supported) {
    assert.ok(isSupportedPlatform(hostname), `Expected ${hostname} to be supported`);
  }
});

test('isSupportedPlatform returns false for unsupported hostnames', () => {
  assert.equal(isSupportedPlatform('example.com'), false);
  assert.equal(isSupportedPlatform('google.com'), false);
});

test('each platform has a name and non-empty selfVideoSelectors', () => {
  for (const [hostname, config] of Object.entries(PLATFORMS)) {
    assert.ok(config.name, `${hostname} missing name`);
    assert.ok(config.selfVideoSelectors.length > 0, `${hostname} missing selectors`);
  }
});
