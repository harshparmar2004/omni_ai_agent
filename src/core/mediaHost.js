const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { ensureTunnelOnline, getTunnelUrl, startTunnel, closeTunnel } = require('./tunnelService');
const { getSetting } = require('../database');

/**
 * OmniStudio v7 — Media Host & Public Tunnel Bridge
 * Serves local MP4 videos and images over a public HTTPS tunnel
 * for Meta Graph API container ingestion.
 */

async function getBasePublicUrl() {
  const url = await ensureTunnelOnline();
  return url.replace(/\/$/, '');
}

async function getPublicUrlForMedia(relativePathOrFilename) {
  const baseUrl = await getBasePublicUrl();
  let rel = relativePathOrFilename.replace(/\\/g, '/');
  if (!rel.startsWith('/')) {
    rel = '/' + rel;
  }
  return `${baseUrl}${rel}`;
}

/**
 * Self-test tunnel to confirm Meta can access media files
 */
async function selfTestTunnel() {
  try {
    const baseUrl = await getBasePublicUrl();
    if (!baseUrl || !baseUrl.startsWith('https://')) {
      return { ok: false, url: baseUrl, error: 'Invalid or non-HTTPS tunnel URL' };
    }

    // Check if there is any downloaded file in public/generated/downloads to test with
    const downloadsDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const testFilePath = path.join(downloadsDir, 'tunnel_selftest.txt');
    fs.writeFileSync(testFilePath, 'ok');

    const testUrl = `${baseUrl}/generated/downloads/tunnel_selftest.txt`;
    const res = await axios.get(testUrl, { timeout: 8000 });

    if (res.status === 200) {
      return { ok: true, url: baseUrl, latencyMs: 0 };
    }
    return { ok: false, url: baseUrl, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, url: getTunnelUrl(), error: err.message };
  }
}

module.exports = {
  getBasePublicUrl,
  getPublicUrlForMedia,
  selfTestTunnel,
  startTunnel,
  closeTunnel
};
