const express = require('express');
const router = express.Router();
const {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  getPublishedCountToday,
  getSourceAccounts,
  createSourceAccount,
  deleteSourceAccount,
  listDiscoveredPosts,
  listPublishJobs,
  listAgentRuns
} = require('../database');
const { validatePageToken, maskToken } = require('../core/tokenManager');
const scheduler = require('../agents/watchtower/scheduler');

/**
 * GET /api/pages
 * Returns pages with masked tokens and today's quota usage
 */
router.get('/', (req, res) => {
  try {
    const pages = getPages();
    const result = pages.map(p => ({
      ...p,
      access_token_masked: maskToken(p.access_token),
      has_valid_token: Boolean(p.access_token && p.access_token.length > 20),
      today_published_count: getPublishedCountToday(p.id)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pages/:id
 */
router.get('/:id', (req, res) => {
  try {
    const page = getPageById(parseInt(req.params.id, 10));
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({
      ...page,
      access_token_masked: maskToken(page.access_token),
      today_published_count: getPublishedCountToday(page.id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages
 */
router.post('/', (req, res) => {
  try {
    const page = createPage(req.body);
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/pages/:id
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = updatePage(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/pages/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    deletePage(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages/:id/test
 * Test Meta Graph API handshake and validate token
 */
router.post('/:id/test', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const status = await validatePageToken(page);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pages/:id/workspace
 * Complete workspace payload for a specific page:
 * - Page details & token validity
 * - Competitor sources monitored for this page
 * - Stock / discovered candidate reels
 * - Triggered published reels
 */
router.get('/:id/workspace', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const rawSources = getSourceAccounts({ pageId: id });
    const stockReels = listDiscoveredPosts({ pageId: id, limit: 40 });
    const publishedPosts = listPublishJobs({ pageId: id, status: 'published', limit: 20 });
    const todayCount = getPublishedCountToday(id);
    const quotaMax = page.daily_quota || 3;

    // Enrich each source with discovered posts count and latest post preview
    const sources = rawSources.map(s => {
      const sourcePosts = listDiscoveredPosts({ sourceAccountId: s.id, limit: 1 });
      const latestPost = sourcePosts.length > 0 ? sourcePosts[0] : null;
      return {
        ...s,
        discovered_count: s.synced_posts_count || 0,
        latest_post: latestPost ? {
          shortcode: latestPost.shortcode,
          url: latestPost.url,
          score: latestPost.score,
          likes: latestPost.like_count,
          comments: latestPost.comment_count,
          posted_at: latestPost.posted_at
        } : null
      };
    });

    const cadence = scheduler.getStatus();
    const recentRuns = listAgentRuns(5);

    const avgScore = stockReels.length > 0
      ? Math.round(stockReels.reduce((acc, r) => acc + (r.score || 70), 0) / stockReels.length)
      : 80;

    res.json({
      page: {
        ...page,
        access_token_masked: maskToken(page.access_token),
        has_valid_token: Boolean(page.access_token && page.access_token.length > 20),
        today_published_count: todayCount
      },
      sources,
      stockReels,
      publishedPosts,
      recentRuns,
      cadence,
      stats: {
        sourcesCount: sources.length,
        stockCount: stockReels.length,
        publishedCount: publishedPosts.length,
        todayCount,
        quotaMax,
        remainingQuota: Math.max(0, quotaMax - todayCount),
        quotaPct: Math.min(100, Math.round((todayCount / quotaMax) * 100)),
        avgScore
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages/:id/scan
 * Trigger an immediate on-demand surveillance scan for this page's competitors
 */
router.post('/:id/scan', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    setImmediate(() => {
      scheduler.executeCycle({ quick: true, force: true }).catch(e => console.error('[Page Scan Cycle Error]:', e));
    });

    res.json({ success: true, message: `Surveillance cycle triggered for ${page.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages/:id/sources
 * Quick-add a competitor source account directly to this page
 */
router.post('/:id/sources', (req, res) => {
  try {
    const pageId = parseInt(req.params.id, 10);
    const page = getPageById(pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Competitor username is required' });

    const cleanUser = username.replace(/^@/, '').replace(/https?:\/\/(?:www\.)?instagram\.com\//, '').replace(/\/.*$/, '').trim();
    if (!cleanUser) return res.status(400).json({ error: 'Invalid username' });

    const source = createSourceAccount({
      username: cleanUser,
      page_id: pageId
    });
    res.json({ success: true, source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/pages/:id/sources/:sourceId
 * Unlink/delete a competitor source account from this page
 */
router.delete('/:id/sources/:sourceId', (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    deleteSourceAccount(sourceId);
    res.json({ success: true, sourceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
