import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapMeetTabs, isGoogleMeetUrl } from '../src/background/meet-bootstrap.js';

test('isGoogleMeetUrl matches supported Meet URLs', () => {
  assert.equal(isGoogleMeetUrl('https://meet.google.com/abc-defg-hij'), true);
  assert.equal(isGoogleMeetUrl('http://meet.google.com/landing'), true);
  assert.equal(isGoogleMeetUrl('https://google.com/'), false);
  assert.equal(isGoogleMeetUrl(''), false);
});

test('bootstrapMeetTabs injects script when tab has no content script', async () => {
  const calls = {
    ping: [],
    inject: [],
  };

  const summary = await bootstrapMeetTabs(
    [
      { id: 10, url: 'https://meet.google.com/abc-defg-hij' },
      { id: 11, url: 'https://example.com/' },
    ],
    {
      pingTab: async (tabId) => {
        calls.ping.push(tabId);
        return false;
      },
      injectTab: async (tabId) => {
        calls.inject.push(tabId);
        return true;
      },
    },
  );

  assert.deepEqual(calls.ping, [10]);
  assert.deepEqual(calls.inject, [10]);
  assert.deepEqual(summary, {
    checked: 1,
    alreadyReady: 0,
    injected: 1,
    failed: 0,
    skipped: 1,
  });
});

test('bootstrapMeetTabs skips reinjection when ping succeeds', async () => {
  const injectedIds = [];

  const summary = await bootstrapMeetTabs(
    [{ id: 15, url: 'https://meet.google.com/room' }],
    {
      pingTab: async () => true,
      injectTab: async (tabId) => {
        injectedIds.push(tabId);
        return true;
      },
    },
  );

  assert.deepEqual(injectedIds, []);
  assert.deepEqual(summary, {
    checked: 1,
    alreadyReady: 1,
    injected: 0,
    failed: 0,
    skipped: 0,
  });
});

test('bootstrapMeetTabs continues when injection fails', async () => {
  const summary = await bootstrapMeetTabs(
    [
      { id: 20, url: 'https://meet.google.com/first' },
      { id: 21, url: 'https://meet.google.com/second' },
    ],
    {
      pingTab: async () => false,
      injectTab: async (tabId) => tabId === 21,
    },
  );

  assert.deepEqual(summary, {
    checked: 2,
    alreadyReady: 0,
    injected: 1,
    failed: 1,
    skipped: 0,
  });
});
