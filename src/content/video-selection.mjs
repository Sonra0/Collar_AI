const MINIMUM_USABLE_SCORE = 4;
const MINIMUM_PREFERRED_AREA = 96 * 54;
const SCREEN_SHARE_KEYWORDS = ['screen', 'window', 'display', 'monitor', 'tab', 'present'];
const CAMERA_KEYWORDS = ['camera', 'webcam', 'facetime', 'integrated', 'usb', 'virtual camera'];

function getBoundingRect(video) {
  if (!video || typeof video.getBoundingClientRect !== 'function') {
    return { width: 0, height: 0 };
  }

  try {
    const rect = video.getBoundingClientRect();
    return {
      width: Number(rect?.width) || 0,
      height: Number(rect?.height) || 0,
    };
  } catch {
    return { width: 0, height: 0 };
  }
}

function getVideoTracks(video) {
  const stream = video?.srcObject;
  if (!stream || typeof stream.getVideoTracks !== 'function') {
    return [];
  }

  try {
    const tracks = stream.getVideoTracks();
    return Array.isArray(tracks) ? tracks : [];
  } catch {
    return [];
  }
}

function includesKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getTrackLabelText(tracks) {
  return tracks
    .map((track) => String(track?.label || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function hasSelfContext(video) {
  if (!video || typeof video.closest !== 'function') return false;
  return Boolean(
    video.closest(
      '[data-self-video="true"], [data-is-self="true"], [data-self-name], [data-local-participant="true"]',
    ),
  );
}

function isMirrored(video) {
  const transforms = [];
  try {
    transforms.push(String(video?.style?.transform || '').toLowerCase());
  } catch {
    // noop
  }

  try {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      transforms.push(String(window.getComputedStyle(video).transform || '').toLowerCase());
    }
  } catch {
    // noop
  }

  const merged = transforms.join(' ');
  return merged.includes('matrix(-1') || merged.includes('scalex(-1)') || merged.includes('rotatey(180deg)');
}

export function scoreVideoElement(video) {
  if (!video || typeof video !== 'object') {
    return { score: -1, area: 0 };
  }

  const readyState = Number(video.readyState) || 0;
  const currentTime = Number(video.currentTime) || 0;
  const hasDecodedFrames = currentTime > 0;
  const hasStream = Boolean(video.srcObject);
  const tracks = getVideoTracks(video);
  const trackLabelText = getTrackLabelText(tracks);
  const likelyScreenShare = includesKeyword(trackLabelText, SCREEN_SHARE_KEYWORDS);
  const likelyCamera = includesKeyword(trackLabelText, CAMERA_KEYWORDS);
  const hasLiveTrack = tracks.some(
    (track) => track && track.readyState !== 'ended' && track.enabled !== false && track.muted !== true,
  );

  const rect = getBoundingRect(video);
  const area = Math.max(0, rect.width * rect.height);
  const ratio = rect.height > 0 ? rect.width / rect.height : 0;
  const selfContext = hasSelfContext(video);
  const mirrored = isMirrored(video);

  let score = 0;
  if (readyState >= 2) score += 2;
  if (hasLiveTrack) score += 4;
  else if (hasStream) score += 3;
  if (hasDecodedFrames) score += 2;
  if (area > 0) score += 1;
  if (area >= MINIMUM_PREFERRED_AREA) score += 1;

  // Prefer likely webcam/self-view streams and avoid screen-share sources.
  if (selfContext) score += 5;
  if (likelyCamera) score += 4;
  if (mirrored) score += 2;
  if (likelyScreenShare) score -= 8;
  if (!selfContext && !likelyCamera && area > 640 * 360) score -= 2;
  if (ratio > 2.2 || ratio < 0.5) score -= 1;

  return { score, area };
}

export function pickBestVideoElement(videos) {
  if (!videos) return null;

  let bestElement = null;
  let bestScore = -1;
  let bestArea = -1;

  for (const video of videos) {
    const { score, area } = scoreVideoElement(video);
    const shouldReplace = score > bestScore || (score === bestScore && area > bestArea);
    if (shouldReplace) {
      bestElement = video;
      bestScore = score;
      bestArea = area;
    }
  }

  if (bestScore < MINIMUM_USABLE_SCORE) {
    return null;
  }

  return bestElement;
}
