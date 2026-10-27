const axios = require('axios');

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
module.exports = async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
  // Allow GET and POST for Vercel Cron and external monitors
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Optional: Check CRON_SECRET if configured in Vercel
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET' });
    }
  }

  if (!GITHUB_TOKEN) {
    console.error('[Vercel Cron Error] GH_DISPATCH_TOKEN is not configured');
    return res.status(500).json({ error: 'Missing GH_DISPATCH_TOKEN in environment variables' });
  }

  const force = req.query?.force === 'true' || req.body?.force === true || req.body?.force === 'true';

  try {
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/watchtower-cron.yml/dispatches`;
    const dispatchPayload = { ref: 'main' };
    if (force) {
      dispatchPayload.inputs = { force: 'true' };
    }
    await axios.post(
      dispatchUrl,
      dispatchPayload,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OmniStudio-Vercel-Cron'
        },
        timeout: 15000
      }
    );

    const nowUtc = new Date().toISOString();
    console.log(`[Vercel Cron] Dispatched Watchtower workflow successfully at ${nowUtc} (Force: ${force})`);
    return res.status(200).json({
      success: true,
      message: 'Watchtower cron workflow successfully dispatched to GitHub Actions',
      dispatched_at: nowUtc,
      force: force
    });
  } catch (err) {
    console.error('[Vercel Cron Error]:', err.response?.data || err.message);
    const detail = err.response?.data?.message || err.message;
    return res.status(500).json({
      success: false,
      error: `Failed to dispatch GitHub Actions workflow: ${detail}`
    });
  }
};
