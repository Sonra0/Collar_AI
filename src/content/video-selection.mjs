const MINIMUM_USABLE_SCORE = 4;
const MINIMUM_PREFERRED_AREA = 96 * 54;

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

export function scoreVideoElement(video) {
  if (!video || typeof video !== 'object') {
    return { score: -1, area: 0 };
  }

  const readyState = Number(video.readyState) || 0;
  const currentTime = Number(video.currentTime) || 0;
  const hasDecodedFrames = currentTime > 0;
  const hasStream = Boolean(video.srcObject);
  const tracks = getVideoTracks(video);
  const hasLiveTrack = tracks.some(
    (track) => track && track.readyState !== 'ended' && track.enabled !== false && track.muted !== true,
  );

  const rect = getBoundingRect(video);
  const area = Math.max(0, rect.width * rect.height);

  let score = 0;
  if (readyState >= 2) score += 2;
  if (hasLiveTrack) score += 4;
  else if (hasStream) score += 3;
  if (hasDecodedFrames) score += 2;
  if (area > 0) score += 1;
  if (area >= MINIMUM_PREFERRED_AREA) score += 1;

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
