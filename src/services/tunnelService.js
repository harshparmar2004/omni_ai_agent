const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const axios = require('axios');
const { getSetting, setSetting } = require('../database');

/**
 * OmniResearch v5.5 — Cloudflare Enterprise & Resilient Public Tunnel Service
 * Automatically launches a Cloudflare Edge tunnel (trycloudflare.com) on port 4000.
 * Zero rate limits, instant QUIC/HTTP2 streaming for Meta Graph API v21.0 Reel ingestion.
 */

let tunnelProcess = null;
let activeTunnelUrl = null;
let fallbackLtTunnel = null;
let isStarting = false;
let currentPort = 4000;

/**
 * Launch Cloudflare Edge Tunnel
 */
function launchCloudflareTunnel(port = 4000) {
  return new Promise((resolve) => {
    console.log(`[Tunnel Service] ⚡ Starting Cloudflare Edge Tunnel on port ${port}...`);
    
    // Spawn npx cloudflared tunnel --url http://localhost:<port>
    const cp = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    let urlFound = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[Tunnel Service] Cloudflare startup timeout (45s). Falling back to localtunnel.');
        resolve(null);
      }
    }, 45000);

    const onData = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = match[0];
        activeTunnelUrl = urlFound;
        console.log(`[Tunnel Service] 🚀 Cloudflare Enterprise Tunnel Active: ${urlFound}`);
        setSetting('ngrok_url', urlFound);
        setSetting('public_media_url', urlFound);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(urlFound);
        }
      }
    };

    cp.stdout.on('data', onData);
    cp.stderr.on('data', onData);

    cp.on('close', (code) => {
      console.warn(`[Tunnel Service] Cloudflare tunnel process exited (code ${code}).`);
      tunnelProcess = null;
      activeTunnelUrl = null;
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    cp.on('error', (err) => {
      console.error(`[Tunnel Service] Cloudflare spawn error: ${err.message}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    tunnelProcess = cp;
  });
}

/**
 * Launch localtunnel as resilient fallback
 */
async function launchLocaltunnelFallback(port = 4000) {
  try {
    console.log(`[Tunnel Service] 🌐 Launching localtunnel fallback on port ${port}...`);
    const tunnel = await localtunnel({ port });
    fallbackLtTunnel = tunnel;
    const url = tunnel.url;
    console.log(`[Tunnel Service] ✅ localtunnel active at: ${url}`);
    setSetting('ngrok_url', url);
    setSetting('public_media_url', url);
    activeTunnelUrl = url;
    return url;
  } catch (e) {
    console.error(`[Tunnel Service] localtunnel fallback failed: ${e.message}`);
    return null;
  }
}

/**
 * Start public tunnel (Cloudflare primary, localtunnel fallback)
 */
async function startTunnel(port = 4000) {
  currentPort = port;
  if (activeTunnelUrl && !activeTunnelUrl.includes('loca.lt')) return activeTunnelUrl;
  if (isStarting) return activeTunnelUrl || getSetting('public_media_url') || getSetting('ngrok_url', '');
  isStarting = true;

  try {
    // 1. Try Cloudflare Tunnel first (Meta Graph API requires Cloudflare, blocks localtunnel)
    const cfUrl = await launchCloudflareTunnel(port);
    if (cfUrl) {
      isStarting = false;
      return cfUrl;
    }

    // 2. Fall back to localtunnel if Cloudflare is unreachable
    const ltUrl = await launchLocaltunnelFallback(port);
    isStarting = false;
    return ltUrl;
  } catch (err) {
    isStarting = false;
    console.error(`[Tunnel Service] Tunnel initialization error: ${err.message}`);
    return getSetting('public_media_url') || getSetting('ngrok_url', `http://localhost:${port}`);
  }
}

async function isUrlReachable(url) {
  if (!url || !url.startsWith('http')) return false;
  // Meta Graph API cannot fetch media from localtunnel due to anti-phishing interstitial screen
  if (url.includes('loca.lt')) return false;
  try {
    const res = await axios.get(`${url}/api/settings`, { timeout: 4000 });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

/**
 * Guarantees that a valid public HTTPS tunnel is online and active before publishing
 */
async function ensureTunnelOnline() {
  if (activeTunnelUrl && (await isUrlReachable(activeTunnelUrl))) {
    return activeTunnelUrl;
  }

  const currentDbUrl = getSetting('public_media_url') || getSetting('ngrok_url', '');
  if (currentDbUrl && (await isUrlReachable(currentDbUrl))) {
    activeTunnelUrl = currentDbUrl;
    return currentDbUrl;
  }

  console.log(`[Tunnel Service] 🔄 Tunnel is offline or expired. Launching fresh high-speed Edge Tunnel...`);
  closeTunnel();
  const freshUrl = await startTunnel(currentPort);
  return freshUrl || currentDbUrl || `http://localhost:${currentPort}`;
}

function getTunnelUrl() {
  return activeTunnelUrl || getSetting('ngrok_url', '');
}

function closeTunnel() {
  if (tunnelProcess) {
    try { tunnelProcess.kill(); } catch (e) {}
    tunnelProcess = null;
  }
  if (fallbackLtTunnel) {
    try { fallbackLtTunnel.close(); } catch (e) {}
    fallbackLtTunnel = null;
  }
  activeTunnelUrl = null;
}

module.exports = {
  startTunnel,
  ensureTunnelOnline,
  getTunnelUrl,
  closeTunnel
};
