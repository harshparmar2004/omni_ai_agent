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
  listAgentRuns,
  getPageTemplate,
  upsertPageTemplate,
  addPageToGroup,
  getPageGroupsForPage
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
 * PATCH /api/pages/bulk
 * Bulk actions across multiple pages (pause, resume, quota, template)
 */
router.patch('/bulk', (req, res) => {
  try {
    const ids = req.body.pageIds || req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'pageIds array required' });
    }
    
    let updates = req.body.updates || {};
    const { action, value } = req.body;
    if (action === 'pause') {
      updates = { post_mode: 'review', is_active: 0 };
    } else if (action === 'resume') {
      updates = { is_active: 1 };
    } else if (action === 'set_quota') {
      updates = { daily_quota: parseInt(value, 10) };
    }

    const updated = [];
    for (const id of ids) {
      try {
        const pageId = parseInt(id, 10);
        const u = updatePage(pageId, updates);
        if (action === 'set_template' && value) {
          const { upsertPageTemplate } = require('../database');
          upsertPageTemplate(pageId, { template_slug: value });
        }
        if (u) updated.push(u);
      } catch (_) {}
    }
    res.json({ success: true, count: updated.length, updated, message: `Successfully updated ${updated.length} channel(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/pages/:id/token
 * Inline token update with optional Meta Graph validation
 */
router.patch('/:id/token', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const token = req.body.token || req.body.access_token;
    const { ig_user_id, test } = req.body;
    if (!token) return res.status(400).json({ error: 'token or access_token required' });

    let validation = { valid: true };
    if (test !== false) {
      validation = await validatePageToken({
        access_token: token,
        ig_user_id: ig_user_id || page.ig_user_id,
        handle: page.handle
      });
    }

    const updated = updatePage(id, {
      access_token: token,
      ...(ig_user_id ? { ig_user_id } : {}),
      onboarding_status: validation.valid ? 'active' : 'token_invalid'
    });

    res.json({
      success: true,
      page: {
        ...updated,
        access_token_masked: maskToken(updated.access_token)
      },
      validation
    });
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
      template: getPageTemplate(id, page.template_slug || 'default') || null,
      groups: getPageGroupsForPage(id),
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
 * GET /api/pages/:id/template
 */
router.get('/:id/template', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const template = getPageTemplate(id, req.query.type || page.template_slug || 'default');
    res.json(template || { page_id: id, template_type: page.template_slug || 'default' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages/:id/template
 */
router.post('/:id/template', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getPageById(id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const template = upsertPageTemplate({
      page_id: id,
      ...req.body
    });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pages/onboard
 * Complete 5-step wizard onboarding endpoint:
 * 1. Validates token connection with Meta Graph API
 * 2. Saves or updates page record with v8 fields
 * 3. Saves branding template
 * 4. Adds to group if requested
 */
router.post('/onboard', async (req, res) => {
  try {
    const { pageData, templateData, groupId, testConnection } = req.body;
    if (!pageData || !pageData.name || !pageData.handle || !pageData.access_token || !pageData.ig_user_id) {
      return res.status(400).json({ error: 'Missing required page fields (name, handle, access_token, ig_user_id)' });
    }

    // 1. Connection check with Meta Graph API
    let validation = { valid: true };
    if (testConnection !== false) {
      validation = await validatePageToken({
        access_token: pageData.access_token,
        ig_user_id: pageData.ig_user_id,
        handle: pageData.handle
      });
      if (!validation.valid && testConnection === true) {
        return res.status(400).json({
          error: `Meta connection failed: ${validation.error || 'Invalid token'}`,
          validation
        });
      }
    }

    // 2. Generate slug if not provided
    if (!pageData.slug) {
      pageData.slug = pageData.handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    // 3. Create or update page
    const page = createPage({
      ...pageData,
      onboarding_status: validation.valid ? 'active' : 'token_invalid'
    });

    // 4. Save template if provided
    let template = null;
    if (templateData) {
      template = upsertPageTemplate({
        page_id: page.id,
        template_type: page.template_slug || 'default',
        ...templateData
      });
    }

    // 5. Add to distribution group if provided
    let group = null;
    if (groupId) {
      addPageToGroup(parseInt(groupId, 10), page.id, {
        role: req.body.groupRole || 'member',
        priority: req.body.groupPriority || 0
      });
      group = getPageGroupsForPage(page.id);
    }

    res.json({
      success: true,
      page: {
        ...page,
        access_token_masked: maskToken(page.access_token)
      },
      template,
      group,
      validation
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

    setImmediate(async () => {
      try {
        const { scanSingleSource } = require('../agents/watchtower/scanner');
        await scanSingleSource(source.id, { evaluate: true });
      } catch (err) {
        console.error(`[Page Source Auto-Scan Error]: ${err.message}`);
      }
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
