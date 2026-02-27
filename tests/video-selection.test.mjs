import test from 'node:test';
import assert from 'node:assert/strict';

import { pickBestVideoElement } from '../src/content/video-selection.mjs';

function createVideo({
  width = 160,
  height = 90,
  readyState = 4,
  currentTime = 0,
  srcObject = null,
}) {
  return {
    readyState,
    currentTime,
    srcObject,
    getBoundingClientRect() {
      return { width, height };
    },
  };
}

function createStream(trackOverrides = {}) {
  return {
    getVideoTracks() {
      return [
        {
          readyState: 'live',
          enabled: true,
          muted: false,
          ...trackOverrides,
        },
      ];
    },
  };
}

test('selects a small but active self-video tile', () => {
  const smallSelfVideo = createVideo({
    width: 160,
    height: 90,
    readyState: 4,
    srcObject: createStream(),
  });

  const selected = pickBestVideoElement([smallSelfVideo]);
  assert.equal(selected, smallSelfVideo);
});

test('returns null when no usable video candidates exist', () => {
  const decorativeVideo = createVideo({
    width: 300,
    height: 200,
    readyState: 1,
    currentTime: 0,
    srcObject: null,
  });

  const selected = pickBestVideoElement([decorativeVideo]);
  assert.equal(selected, null);
});

test('prefers a live camera stream over playback-only video', () => {
  const playbackOnly = createVideo({
    width: 640,
    height: 360,
    readyState: 4,
    currentTime: 42,
    srcObject: null,
  });

  const liveCamera = createVideo({
    width: 140,
    height: 80,
    readyState: 4,
    srcObject: createStream(),
  });

  const selected = pickBestVideoElement([playbackOnly, liveCamera]);
  assert.equal(selected, liveCamera);
});

test('prefers camera stream over active screen-share stream', () => {
  const screenShare = createVideo({
    width: 1280,
    height: 720,
    readyState: 4,
    srcObject: createStream({ label: 'Screen 1' }),
  });

  const liveCamera = createVideo({
    width: 160,
    height: 90,
    readyState: 4,
    srcObject: createStream({ label: 'Integrated Camera' }),
  });

  const selected = pickBestVideoElement([screenShare, liveCamera]);
  assert.equal(selected, liveCamera);
});
