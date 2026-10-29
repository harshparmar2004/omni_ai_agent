const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';

function sanitizeCompetitorUsername(input) {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  clean = clean.replace(/https?:\/\/(?:www\.)?instagram\.com\//i, '');
  clean = clean.replace(/[?#].*$/, '');
  clean = clean.replace(/^\/+|\/+$/g, '');
  clean = clean.replace(/^@/, '');
  clean = clean.replace(/\/(?:p|reel|tv)\/.*$/i, '');
  return clean.toLowerCase().trim();
}

function getLocalCompetitors() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'competitors.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.gta6)) return parsed.gta6;
    }
  } catch (e) {}
  return ['grandtheftauto6', 'paradoks.plays', 'gta6.only', 'gta6latest', 'rockstargames'];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/sources — Return list of active competitors
  if (req.method === 'GET') {
    try {
      const accounts = getLocalCompetitors();
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
      return res.status(200).json([]);
    }
  }

  // POST /api/sources — Add competitor and sync to GitHub config/competitors.json
  if (req.method === 'POST') {
    const rawInput = req.body?.username || req.body?.text;
    if (!rawInput) {
      return res.status(400).json({ error: 'Username or URL is required' });
    }

    const cleanUser = sanitizeCompetitorUsername(rawInput);
    if (!cleanUser) {
      return res.status(400).json({ error: 'Invalid Instagram profile username or URL' });
    }

    try {
      if (!GITHUB_TOKEN) {
        return res.status(200).json({
          success: true,
          username: cleanUser,
          warning: 'GitHub token not configured on Vercel'
        });
      }

      const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/config/competitors.json`;
      const getFile = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
      });

      const currentContent = JSON.parse(Buffer.from(getFile.data.content, 'base64').toString('utf8'));
      if (!currentContent.includes(cleanUser)) {
        currentContent.push(cleanUser);
      }

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
        message: `@${cleanUser} successfully added to surveillance!`
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        username: cleanUser,
        warning: `Saved: ${err.message}`
      });
    }
  }

  // DELETE /api/sources/:id — Remove competitor and sync to GitHub config/competitors.json
  if (req.method === 'DELETE') {
    const rawTarget = req.query?.id || req.query?.username || (req.url.split('/').pop().split('?')[0]);
    if (!rawTarget) {
      return res.status(400).json({ error: 'Target source ID or username required' });
    }

    try {
      if (!GITHUB_TOKEN) {
        return res.status(200).json({ success: true, message: 'Removed (local mode)' });
      }

      const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/config/competitors.json`;
      const getFile = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
      });

      let currentContent = JSON.parse(Buffer.from(getFile.data.content, 'base64').toString('utf8'));
      let removedName = '';

      const idx = parseInt(rawTarget, 10);
      if (!isNaN(idx) && idx > 0 && idx <= currentContent.length) {
        removedName = currentContent[idx - 1];
        currentContent.splice(idx - 1, 1);
      } else {
        const clean = sanitizeCompetitorUsername(rawTarget);
        const pos = currentContent.indexOf(clean);
        if (pos !== -1) {
          removedName = currentContent[pos];
          currentContent.splice(pos, 1);
        }
      }

      if (removedName) {
        const newBase64 = Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64');
        await axios.put(fileUrl, {
          message: `chore(watchtower): stop tracking @${removedName} via dashboard`,
          content: newBase64,
          sha: getFile.data.sha,
          branch: 'main'
        }, {
          headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
        });
      }

      return res.status(200).json({
        success: true,
        removed: removedName || rawTarget,
        totalTracked: currentContent.length,
        message: `@${removedName || rawTarget} removed. Watchtower will no longer track this account.`
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
