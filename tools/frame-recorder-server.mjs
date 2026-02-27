import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = 3131;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const PROJECT_ROOT = process.cwd();
const PICTURES_DIR = path.join(PROJECT_ROOT, 'pictures');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeSessionId(sessionId) {
  return String(sessionId || 'session').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extractBase64(frameData) {
  if (typeof frameData !== 'string' || frameData.length === 0) {
    throw new Error('Missing frameData');
  }

  if (frameData.startsWith('data:image/')) {
    const commaIndex = frameData.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Malformed data URL');
    }
    return frameData.slice(commaIndex + 1);
  }

  return frameData;
}

async function saveFrame(payload) {
  const { frameData, sessionId, timestamp } = payload || {};
  const base64 = extractBase64(frameData);

  const safeSessionId = sanitizeSessionId(sessionId);
  const ts = Number(timestamp) || Date.now();
  const iso = new Date(ts).toISOString().replace(/[:.]/g, '-');
  const filename = `${safeSessionId}-${iso}.jpg`;
  const filepath = path.join(PICTURES_DIR, filename);

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    throw new Error('Decoded image is empty');
  }

  await fs.mkdir(PICTURES_DIR, { recursive: true });
  await fs.writeFile(filepath, buffer);

  return filepath;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, picturesDir: PICTURES_DIR }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/save-frame') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return;
  }

  try {
    const payload = await readRequestBody(req);
    const filepath = await saveFrame(payload);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, filepath }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Frame recorder listening on http://127.0.0.1:${PORT}`);
  console.log(`Saving images to: ${PICTURES_DIR}`);
});
