const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/sources — Return list of competitors
  if (req.method === 'GET') {
    try {
      const configPath = path.join(process.cwd(), 'config', 'competitors.json');
      let accounts = [];
      if (fs.existsSync(configPath)) {
        accounts = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        accounts = ['rockstargames', 'grandtheftauto6'];
      }

      const sources = accounts.map((u, i) => ({
        id: i + 1,
        username: u,
        page_id: 1,
        page_name: 'GTA 6 Updates 007',
        page_handle: '@gta6_updates_007',
        is_active: 1,
        health: 'ok'
      }));

      return res.status(200).json(sources);
    } catch (e) {
      return res.status(200).json([
        { id: 1, username: 'rockstargames', is_active: 1, health: 'ok' },
        { id: 2, username: 'grandtheftauto6', is_active: 1, health: 'ok' }
      ]);
    }
  }

  // POST /api/sources — Add competitor and update GitHub config/competitors.json
  if (req.method === 'POST') {
    const { username } = req.body || {};
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const cleanUser = username.replace(/^@/, '').toLowerCase().trim();

    if (!GITHUB_TOKEN) {
      return res.status(200).json({
        success: true,
        username: cleanUser,
        warning: 'Competitor added in memory. Add GH_DISPATCH_TOKEN to commit directly to GitHub repository.'
      });
    }

    try {
      // 1. Get current config/competitors.json from GitHub
      const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/config/competitors.json`;
      const getFile = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
      });

      const currentContent = JSON.parse(Buffer.from(getFile.data.content, 'base64').toString('utf8'));
      if (!currentContent.includes(cleanUser)) {
        currentContent.push(cleanUser);
      }

      // 2. Commit updated list back to GitHub
      const newBase64 = Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64');
      await axios.put(fileUrl, {
        message: `feat(watchtower): add @${cleanUser} to monitored competitors via dashboard`,
        content: newBase64,
        sha: getFile.data.sha,
        branch: 'main'
      }, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
      });

      return res.status(200).json({
        success: true,
        username: cleanUser,
        totalTracked: currentContent.length,
        message: `@${cleanUser} successfully saved to GitHub. Watchtower will track it on the next run!`
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to update GitHub repository',
        detail: err.response?.data?.message || err.message
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
