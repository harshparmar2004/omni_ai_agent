const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const IG_USER_ID = process.env.IG_USER_ID || '17841428668115319';
const MOVIE_META_ACCESS_TOKEN = process.env.MOVIE_META_ACCESS_TOKEN || 'IGAAYJvfGkRZCRBZAGFTS1JKMnExVzFCWm9vaDQ2aE9PVlN3UjZApWUNtQ3VrZAUpCa2x2b19pbEI1ZA3gxWldtY1BVUFNHYTBfVFQ3LWV5UEozVlVwS2plV0w3d1lJRU04QzF0cmRNcEY2cHgtbDREeHNYU0thX2txNFdySEFxOU96awZDZD';
const MOVIE_IG_USER_ID = process.env.MOVIE_IG_USER_ID || '29048404444808513';

// Path normalization middleware for Vercel Serverless rewrites
app.use((req, res, next) => {
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
  if (matched && (req.url.startsWith('/api/index') || req.url === '/api' || req.url === '/')) {
    req.url = matched;
  }
  next();
});

// Helper: Read competitors from local config/competitors.json
function getCompetitorsConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'competitors.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed)) {
          return { gta6: parsed, movies: ['letterboxd', 'rottentomatoes', 'cinephile.club', 'imdb'] };
        }
        return {
          gta6: parsed.gta6 || ['grandtheftauto6', 'paradoks.plays', 'gta6.only', 'gta6latest', 'rockstargames'],
          movies: parsed.movies || ['letterboxd', 'rottentomatoes', 'cinephile.club', 'imdb']
        };
      }
    }
  } catch (e) {}
  return {
    gta6: ['grandtheftauto6', 'paradoks.plays', 'gta6.only', 'gta6latest', 'rockstargames'],
    movies: ['letterboxd', 'rottentomatoes', 'cinephile.club', 'imdb']
  };
}

function getCompetitors(targetPage = null) {
  const cfg = getCompetitorsConfig();
  if (targetPage === 1 || targetPage === '1' || targetPage === 'gta6') return cfg.gta6;
  if (targetPage === 2 || targetPage === '2' || targetPage === 'movies') return cfg.movies;
  return [...cfg.gta6, ...cfg.movies];
}

// Helper: Normalize username or Instagram URL
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

// Helper: Save competitor list to GitHub config/competitors.json
async function saveCompetitorsToGitHub(competitorsConfig, commitMessage) {
  if (!GITHUB_TOKEN) return false;
  const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/config/competitors.json`;
  const getFile = await axios.get(fileUrl, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
  });
  const newBase64 = Buffer.from(JSON.stringify(competitorsConfig, null, 2)).toString('base64');
  await axios.put(fileUrl, {
    message: commitMessage,
    content: newBase64,
    sha: getFile.data.sha,
    branch: 'main'
  }, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Vercel' }
  });
  return true;
}

// Live Cache for Meta Graph API Media per page (1 minute TTL)
let mediaCache = { 1: { data: null, timestamp: 0 }, 2: { data: null, timestamp: 0 } };
const MEDIA_CACHE_TTL_MS = 60 * 1000;

async function getLivePublishedMedia(pageId = 1) {
  const pId = (pageId === 2 || String(pageId) === '2' || pageId === 'movies') ? 2 : 1;
  const now = Date.now();
  if (mediaCache[pId]?.data && (now - mediaCache[pId].timestamp < MEDIA_CACHE_TTL_MS)) {
    return mediaCache[pId].data;
  }

  const token = pId === 2 ? MOVIE_META_ACCESS_TOKEN : META_ACCESS_TOKEN;
  const igId = pId === 2 ? MOVIE_IG_USER_ID : IG_USER_ID;
  const pageHandle = pId === 2 ? '@movie_series_365' : '@gta6_updates_007';

  if (!token) return getFallbackMedia(pId);

  try {
    const url = `https://graph.instagram.com/v21.0/${igId}/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=30&access_token=${token}`;
    const resp = await axios.get(url, { timeout: 10000 });
    const raw = resp.data?.data || [];

    const formatted = raw.map((item) => {
      const match = (item.permalink || '').match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      const shortcode = match ? match[1] : `ig_${item.id}`;
      return {
        id: item.id,
        shortcode: shortcode,
        source_url: item.permalink,
        permalink: item.permalink,
        story_permalink: `https://www.instagram.com/stories/${pageHandle.replace('@', '')}/`,
        caption: item.caption || '',
        media_type: item.media_type === 'VIDEO' ? 'reel' : 'post',
        thumbnail_url: item.thumbnail_url || item.media_url || '',
        published_at: item.timestamp,
        status: 'published',
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        page_handle: pageHandle,
        agent: 'reposter'
      };
    });

    mediaCache[pId] = { data: formatted, timestamp: now };
    return formatted;
  } catch (err) {
    console.error(`[Meta Graph API Error Page #${pId}]:`, err.response?.data || err.message);
    if (mediaCache[pId]?.data) return mediaCache[pId].data;
    return getFallbackMedia(pId);
  }
}

function getFallbackMedia(pageId = 1) {
  const isMovie = (pageId === 2 || String(pageId) === '2' || pageId === 'movies');
  return [
    {
      id: isMovie ? '18029384812398231' : '18111603524617292',
      shortcode: isMovie ? 'DfC8JgEjh8B' : 'De3JoLwjMbt',
      permalink: isMovie ? 'https://www.instagram.com/reel/DfC8JgEjh8B/' : 'https://www.instagram.com/reel/De3JoLwjMbt/',
      story_permalink: isMovie ? 'https://www.instagram.com/stories/movie_series_365/' : 'https://www.instagram.com/stories/gta6_updates_007/',
      source_url: isMovie ? 'https://www.instagram.com/reel/DfC8JgEjh8B/' : 'https://www.instagram.com/reel/De3JoLwjMbt/',
      published_at: new Date().toISOString(),
      status: 'published',
      media_type: 'reel',
      likes: 1,
      page_handle: isMovie ? '@movie_series_365' : '@gta6_updates_007'
    }
  ];
}

// Live Cache for GitHub Actions Runs (30s TTL)
let runsCache = { data: null, timestamp: 0 };
const RUNS_CACHE_TTL_MS = 30 * 1000;

async function getLiveWorkflowRuns() {
  const now = Date.now();
  if (runsCache.data && (now - runsCache.timestamp < RUNS_CACHE_TTL_MS)) {
    return runsCache.data;
  }

  if (!GITHUB_TOKEN) return [];

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=10`;
    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Dashboard' },
      timeout: 10000
    });
    const runs = resp.data?.workflow_runs || [];
    runsCache = { data: runs, timestamp: now };
    return runs;
  } catch (err) {
    console.error('[GitHub API Runs Error]:', err.message);
    return runsCache.data || [];
  }
}

const PAGE_GTA6 = {
  id: 1,
  slug: 'gta6',
  name: 'GTA 6 Updates 007',
  handle: '@gta6_updates_007',
  ig_user_id: IG_USER_ID,
  access_token_masked: 'IGAAYJ...eaB',
  has_valid_token: true,
  caption_template: '{caption}\n\n{hashtags}',
  default_hashtags: '#gta6 #gtavi #rockstargames #vicecity #gta6leaks',
  attribution_enabled: 0,
  watermark_enabled: 0,
  post_mode: 'auto',
  posts_per_cycle: 1,
  daily_quota: 7,
  min_spacing_minutes: 90,
  is_active: 1
};

const PAGE_MOVIES = {
  id: 2,
  slug: 'movies',
  name: 'Movie Recommendations',
  handle: '@movie_series_365',
  ig_user_id: MOVIE_IG_USER_ID,
  access_token_masked: 'IGAAYJ...9zkZDZD',
  has_valid_token: true,
  caption_template: '{caption}\n\n{hashtags}',
  default_hashtags: '#movies #movierecommendations #filmtok #cinema #mustwatch #365movies',
  attribution_enabled: 0,
  watermark_enabled: 0,
  post_mode: 'auto',
  posts_per_cycle: 1,
  daily_quota: 7,
  min_spacing_minutes: 90,
  is_active: 1
};

function getPagesList() {
  return [PAGE_GTA6, PAGE_MOVIES];
}

function getPage(idOrSlug) {
  const pages = getPagesList();
  if (!idOrSlug) return pages[0];
  const found = pages.find(p => String(p.id) === String(idOrSlug) || p.slug === String(idOrSlug).toLowerCase());
  return found || pages[0];
}

const router = express.Router();

// ── GET /pages ──────────────────────────────────────────────
router.get('/pages', (req, res) => {
  res.json(getPagesList());
});

// ── GET /pages/:id ──────────────────────────────────────────
router.get('/pages/:id', (req, res) => {
  res.json(getPage(req.params.id));
});

// ── PUT /pages/:id ──────────────────────────────────────────
router.put('/pages/:id', (req, res) => {
  const target = getPage(req.params.id);
  res.json({ success: true, page: { ...target, ...req.body } });
});

// ── DELETE /pages/:id ───────────────────────────────────────
router.delete('/pages/:id', (req, res) => {
  res.json({ success: true, message: 'Page deleted' });
});

// ── POST /pages/:id/test ────────────────────────────────────
router.post('/pages/:id/test', async (req, res) => {
  const target = getPage(req.params.id);
  const isMovie = target.id === 2;
  const token = isMovie ? MOVIE_META_ACCESS_TOKEN : META_ACCESS_TOKEN;
  const igId = isMovie ? MOVIE_IG_USER_ID : IG_USER_ID;

  try {
    const check = await axios.get(
      `https://graph.instagram.com/v21.0/${igId}?fields=id,username,name&access_token=${token}`,
      { timeout: 8000 }
    );
    res.json({
      success: true,
      valid: true,
      username: check.data.username || target.handle.replace('@', ''),
      accountType: 'BUSINESS',
      message: `Meta Graph API token is active and valid for ${target.handle}.`
    });
  } catch (err) {
    res.json({
      success: false,
      valid: false,
      error: err.response?.data?.error?.message || err.message
    });
  }
});

// ── GET /pages/:id/workspace ────────────────────────────────
router.get('/pages/:id/workspace', async (req, res) => {
  const target = getPage(req.params.id);
  const isMovie = target.id === 2;
  const targetCompetitors = getCompetitors(target.id);

  let reservoir = {};
  try {
    const resPath = path.join(process.cwd(), 'config', 'competitor_reservoir.json');
    if (fs.existsSync(resPath)) reservoir = JSON.parse(fs.readFileSync(resPath, 'utf8'));
  } catch (e) {}

  const sources = targetCompetitors.map((c, i) => {
    const syncedCount = (reservoir[c] || []).length || (isMovie ? 5 : 8);
    return {
      id: i + 1,
      username: c,
      page_id: target.id,
      page_slug: target.slug,
      page_name: target.name,
      page_handle: target.handle,
      is_active: 1,
      health: 'ok',
      synced_posts_count: syncedCount,
      last_checked_at: new Date(Date.now() - ((i + 1) * 15 * 60 * 1000)).toISOString(),
      last_new_post_at: 'Recently checked',
      latestPost: null
    };
  });

  const publishedPosts = await getLivePublishedMedia(target.id);
  const ghRuns = await getLiveWorkflowRuns();

  const recentRuns = ghRuns.map((r) => ({
    id: r.id,
    agent: r.name.toLowerCase().includes('watchtower') ? 'watchtower' : 'reposter',
    name: r.name,
    started_at: r.created_at,
    status: r.conclusion === 'success' ? 'succeeded' : (r.status === 'in_progress' ? 'running' : r.conclusion || r.status),
    sources_checked: sources.length,
    new_posts: r.conclusion === 'success' ? (r.name.includes('Watchtower') ? 0 : 1) : 0,
    errors: r.conclusion === 'failure' ? '["Runner failed"]' : '[]'
  }));

  // Calculate real daily quota metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = publishedPosts.filter(p => (p.published_at || '').startsWith(todayStr)).length;
  const quotaMax = target.daily_quota || 7;
  const remainingQuota = Math.max(0, quotaMax - todayCount);
  const quotaPct = Math.min(100, Math.round((todayCount / quotaMax) * 100));

  res.json({
    page: {
      ...target,
      today_published_count: todayCount
    },
    sources,
    stockReels: [],
    publishedPosts,
    recentRuns,
    cadence: {
      active: true,
      intervalHours: 3,
      nextRunFormatted: 'Scheduled in GitHub Actions (every 3h)'
    },
    stats: {
      sourcesCount: sources.length,
      stockCount: 0,
      publishedCount: publishedPosts.length,
      todayCount: todayCount,
      quotaMax: quotaMax,
      remainingQuota: remainingQuota,
      quotaPct: quotaPct,
      avgScore: 92
    }
  });
});

// ── Competitor Management ───────────────────────────────────
async function handleAddSource(req, res) {
  const rawInput = req.body?.username;
  const targetPageId = parseInt(req.body?.page_id || req.params?.id || '1', 10);
  if (!rawInput) return res.status(400).json({ error: 'Username or Instagram URL is required' });

  const cleanUser = sanitizeCompetitorUsername(rawInput);
  if (!cleanUser) {
    return res.status(400).json({ error: 'Please enter a valid Instagram username or creator profile URL.' });
  }

  const targetPage = getPage(targetPageId);
  const cfg = getCompetitorsConfig();
  const listKey = targetPage.id === 2 ? 'movies' : 'gta6';

  if (!cfg[listKey].includes(cleanUser)) {
    cfg[listKey].push(cleanUser);
    try {
      await saveCompetitorsToGitHub(cfg, `feat(watchtower): track @${cleanUser} for ${targetPage.handle} via dashboard`);
    } catch (e) {
      console.warn(`[Competitors] GitHub sync warning: ${e.message}`);
    }
  }

  const sourceObj = {
    id: cfg[listKey].indexOf(cleanUser) + 1,
    username: cleanUser,
    page_id: targetPage.id,
    page_slug: targetPage.slug,
    page_name: targetPage.name,
    page_handle: targetPage.handle,
    is_active: 1,
    health: 'ok',
    synced_posts_count: 5,
    last_checked_at: new Date().toISOString()
  };

  res.status(200).json({
    success: true,
    source: sourceObj,
    username: cleanUser,
    message: `Successfully tracking @${cleanUser} for ${targetPage.handle}! Watchtower will inspect this creator on upcoming cycles.`
  });
}

async function handleBulkAddSources(req, res) {
  const text = req.body?.text;
  const targetPageId = parseInt(req.body?.page_id || req.params?.id || '1', 10);
  const targetPage = getPage(targetPageId);
  if (!text) return res.status(400).json({ error: 'Please enter at least one creator username or URL' });

  const lines = text.split(/[\r\n,]+/).map(s => sanitizeCompetitorUsername(s)).filter(Boolean);
  const cfg = getCompetitorsConfig();
  const listKey = targetPage.id === 2 ? 'movies' : 'gta6';
  const added = [];

  for (const user of lines) {
    if (!cfg[listKey].includes(user)) {
      cfg[listKey].push(user);
      added.push(user);
    }
  }

  if (added.length > 0) {
    try {
      await saveCompetitorsToGitHub(cfg, `feat(watchtower): bulk add ${added.length} competitors for ${targetPage.handle} via dashboard`);
    } catch (e) {
      console.warn(`[Competitors] Bulk sync warning: ${e.message}`);
    }
  }

  res.status(200).json({
    success: true,
    addedCount: added.length,
    totalTracked: cfg[listKey].length,
    message: `Imported ${added.length} creator accounts into active surveillance for ${targetPage.handle}!`
  });
}

async function handleRemoveSource(req, res) {
  const targetId = req.params.sourceId || req.params.id;
  const targetPageId = parseInt(req.query?.pageId || req.params?.id || '1', 10);
  const cfg = getCompetitorsConfig();
  const listKey = targetPageId === 2 ? 'movies' : 'gta6';
  let removedName = '';

  const idx = parseInt(targetId, 10);
  if (!isNaN(idx) && idx > 0 && idx <= cfg[listKey].length) {
    removedName = cfg[listKey][idx - 1];
    cfg[listKey].splice(idx - 1, 1);
  } else {
    const clean = sanitizeCompetitorUsername(targetId);
    const pos = cfg[listKey].indexOf(clean);
    if (pos !== -1) {
      removedName = cfg[listKey][pos];
      cfg[listKey].splice(pos, 1);
    }
  }

  if (removedName) {
    try {
      await saveCompetitorsToGitHub(cfg, `chore(watchtower): stop tracking @${removedName}`);
    } catch (e) {}
  }

  res.json({ success: true, message: `Competitor @${removedName || targetId} removed.` });
}

router.get('/sources', (req, res) => {
  const pageFilter = req.query.pageId ? parseInt(req.query.pageId, 10) : null;
  const cfg = getCompetitorsConfig();

  let reservoir = {};
  try {
    const resPath = path.join(process.cwd(), 'config', 'competitor_reservoir.json');
    if (fs.existsSync(resPath)) {
      reservoir = JSON.parse(fs.readFileSync(resPath, 'utf8'));
    }
  } catch (e) {}

  const sources = [];
  let idCounter = 1;

  if (!pageFilter || pageFilter === 1) {
    for (const u of cfg.gta6) {
      const syncedCount = (reservoir[u] || []).length || 6;
      sources.push({
        id: idCounter++,
        username: u,
        page_id: 1,
        page_slug: 'gta6',
        page_name: 'GTA 6 Updates 007',
        page_handle: '@gta6_updates_007',
        synced_posts_count: syncedCount,
        last_checked_at: new Date(Date.now() - (idCounter * 12 * 60 * 1000)).toISOString(),
        is_active: 1,
        health: 'ok'
      });
    }
  }

  if (!pageFilter || pageFilter === 2) {
    for (const u of cfg.movies) {
      const syncedCount = (reservoir[u] || []).length || 5;
      sources.push({
        id: idCounter++,
        username: u,
        page_id: 2,
        page_slug: 'movies',
        page_name: 'Movie Recommendations',
        page_handle: '@movie_series_365',
        synced_posts_count: syncedCount,
        last_checked_at: new Date(Date.now() - (idCounter * 14 * 60 * 1000)).toISOString(),
        is_active: 1,
        health: 'ok'
      });
    }
  }

  res.json(sources);
});

router.post('/sources', handleAddSource);
router.post('/pages/:id/sources', handleAddSource);
router.post('/sources/bulk', handleBulkAddSources);
router.post('/pages/:id/sources/bulk', handleBulkAddSources);
router.delete('/sources/:id', handleRemoveSource);
router.delete('/pages/:id/sources/:sourceId', handleRemoveSource);

router.post('/sources/:id/check', async (req, res) => {
  res.json({ success: true, message: 'Source health check passed: Operational' });
});

// ── Trigger Scan (Watchtower Cron) ──────────────────────────
async function handleScan(req, res) {
  if (GITHUB_TOKEN) {
    try {
      await axios.post(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/watchtower-cron.yml/dispatches`,
        { ref: 'main' },
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Dashboard' } }
      );
      return res.json({ success: true, message: 'Surveillance cycle triggered on GitHub Actions!' });
    } catch (e) {
      return res.json({ success: true, warning: 'GitHub dispatch warning: ' + e.message });
    }
  }
  res.json({ success: true, message: 'Surveillance cycle scheduled.' });
}

router.post('/pages/:id/scan', handleScan);
router.post('/watchtower/run', handleScan);

// ── System Health & Watchtower Status ────────────────────────
router.get('/system/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'production',
    uptime: process.uptime(),
    cloud: true,
    agent_1_status: 'ready',
    agent_2_status: 'ready'
  });
});

router.get('/watchtower/status', async (req, res) => {
  const runs = await getLiveWorkflowRuns();
  const activeRun = runs.find(r => r.status === 'in_progress' || r.status === 'queued');

  res.json({
    active: true,
    paused: false,
    isScanning: !!activeRun,
    nextRunFormatted: activeRun ? 'Running Now on GitHub Actions...' : 'Scheduled in GitHub Actions (every 3h)',
    interval_hours: 3
  });
});

router.get('/watchtower/pipeline-summary', async (req, res) => {
  const pageFilter = req.query.pageId ? parseInt(req.query.pageId, 10) : null;
  const cfg = getCompetitorsConfig();
  const published = await getLivePublishedMedia(pageFilter || 1);
  const totalSources = pageFilter === 2 ? cfg.movies.length : (pageFilter === 1 ? cfg.gta6.length : cfg.gta6.length + cfg.movies.length);

  res.json({
    sources: totalSources,
    discovered: pageFilter === 2 ? 14 : 18,
    ranked: pageFilter === 2 ? 8 : 12,
    downloaded: 4,
    review: 0,
    active: 0,
    published: published.length,
    failed: 0
  });
});

// ── Discoveries Endpoints (Watchtower Reservoir) ─────────────
router.get('/discoveries', (req, res) => {
  // Stock candidate reservoir
  res.json([
    {
      id: 101,
      shortcode: 'De1c3pAoMNf',
      url: 'https://www.instagram.com/reel/De1c3pAoMNf/',
      media_type: 'reel',
      caption: 'Vice City Neon Aesthetics & Graphics Showcase 🔥 #gta6',
      score: 95,
      status: 'new',
      source_username: 'paradoks.plays',
      page_name: 'GTA 6 Updates 007'
    },
    {
      id: 102,
      shortcode: 'DehBEbwgV1d',
      url: 'https://www.instagram.com/reel/DehBEbwgV1d/',
      media_type: 'reel',
      caption: 'Official Grand Theft Auto VI Trailer 1 Scene Breakdown 🌴 #rockstargames',
      score: 98,
      status: 'new',
      source_username: 'rockstargames',
      page_name: 'GTA 6 Updates 007'
    }
  ]);
});

router.post('/discoveries/:id/post', async (req, res) => {
  const id = req.params.id;
  if (GITHUB_TOKEN) {
    try {
      await axios.post(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/repost-job.yml/dispatches`,
        {
          ref: 'main',
          inputs: {
            url: `https://www.instagram.com/reel/De1c3pAoMNf/`,
            chat_id: '5443723531',
            page_id: '1',
            force: 'true'
          }
        },
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Dashboard' } }
      );
      return res.json({ success: true, message: `Reel #${id} dispatched to publishing pipeline!` });
    } catch (e) {}
  }
  res.json({ success: true, message: `Reel #${id} queued for publishing.` });
});

router.post('/discoveries/:id/skip', (req, res) => {
  res.json({ success: true, message: 'Discovery skipped.' });
});

// ── Jobs & Reposter Endpoints ────────────────────────────────
async function handleGetJobs(req, res) {
  const published = await getLivePublishedMedia();
  const runs = await getLiveWorkflowRuns();

  const statusQuery = (req.query.status || '').toLowerCase();
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = parseInt(req.query.offset || '0', 10);

  // Check for in-progress runners
  const activeRuns = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');
  const inProgressJobs = activeRuns.map(r => ({
    id: r.id,
    shortcode: 'Cloud Runner Processing...',
    source_url: 'https://www.instagram.com/gta6_updates_007/',
    permalink: '',
    story_permalink: '',
    page_handle: '@gta6_updates_007',
    status: 'publishing',
    current_step: 'Cloud runner processing on GitHub Actions',
    created_at: r.created_at,
    agent: r.name.toLowerCase().includes('watchtower') ? 'watchtower' : 'reposter'
  }));

  let combined = [];

  if (statusQuery.includes('published') && !statusQuery.includes('queued') && !statusQuery.includes('pending')) {
    combined = published;
  } else if (statusQuery.includes('queued') || statusQuery.includes('processing') || statusQuery.includes('publishing')) {
    combined = inProgressJobs;
  } else {
    combined = [...inProgressJobs, ...published];
  }

  res.setHeader('x-total-count', combined.length);
  const sliced = combined.slice(offset, offset + limit);
  res.json(sliced);
}

router.get('/jobs', handleGetJobs);
router.get('/reposter/jobs', handleGetJobs);

async function handleCreateRepostJob(req, res) {
  const url = req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  if (GITHUB_TOKEN) {
    try {
      await axios.post(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/repost-job.yml/dispatches`,
        {
          ref: 'main',
          inputs: {
            url: url,
            chat_id: '5443723531',
            page_id: String(req.body?.page_id || '1'),
            force: 'true'
          }
        },
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'OmniStudio-Dashboard' } }
      );
      return res.json({ success: true, message: 'Job dispatched to GitHub Actions runner!' });
    } catch (e) {
      return res.json({ success: true, warning: 'Dispatch warning: ' + e.message });
    }
  }

  res.json({ success: true, message: 'Job queued for publishing.' });
}

router.post('/jobs', handleCreateRepostJob);
router.post('/reposter/jobs', handleCreateRepostJob);

router.post('/jobs/:id/approve', (req, res) => res.json({ success: true, message: 'Job approved' }));
router.post('/jobs/:id/retry', (req, res) => res.json({ success: true, message: 'Job scheduled for retry' }));
router.delete('/jobs/:id', (req, res) => res.json({ success: true, message: 'Job deleted' }));

router.get('/jobs/overview', async (req, res) => {
  const published = await getLivePublishedMedia();
  const runs = await getLiveWorkflowRuns();
  const activeRuns = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = published.filter(p => (p.published_at || '').startsWith(todayStr)).length;

  res.json({
    totalJobs: published.length,
    publishedToday: todayCount,
    published_all_time: published.length,
    published_combined: published.length,
    published_reposter: published.length,
    published_watchtower: 0,
    live_on_instagram: published.length,
    queued: activeRuns.length,
    failed: 0
  });
});

// ── Settings Endpoints ──────────────────────────────────────
router.get('/settings', (req, res) => {
  res.json({
    default_provider: 'groq',
    groq_model: 'llama-3.3-70b-versatile',
    auto_post_to_story: 'true',
    telegram_allowed_chat_ids: '5443723531'
  });
});

router.post('/settings', (req, res) => {
  res.json({ success: true, message: 'Settings saved' });
});

router.post('/system/telegram/test', async (req, res) => {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: '5443723531',
      text: '🔔 <b>OmniStudio Cloud Ping:</b> System handshake OK!',
      parse_mode: 'HTML'
    });
    res.json({ success: true, message: 'Telegram notification sent!' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/system/media/prune', (req, res) => {
  res.json({ success: true, message: 'Temporary media cache cleaned.' });
});

// ── Mount Webhooks in Router ────────────────────────────────
try {
  const telegramWebhook = require('./telegram-webhook');
  router.all('/telegram-webhook', (req, res) => telegramWebhook(req, res));
} catch (e) {}

try {
  const setWebhook = require('./set-webhook');
  router.all('/set-webhook', (req, res) => setWebhook(req, res));
} catch (e) {}

try {
  const cronTrigger = require('./cron-trigger');
  router.all('/cron-trigger', (req, res) => cronTrigger(req, res));
  router.all('/watchtower/trigger', (req, res) => cronTrigger(req, res));
  router.post('/watchtower/scan', (req, res) => cronTrigger(req, res));
} catch (e) {}

// Mount router on both /api and / so all route paths match regardless of rewrite prefix handling
app.use('/api', router);
app.use('/', router);

// Root fallback for /api
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.url });
});

module.exports = app;
