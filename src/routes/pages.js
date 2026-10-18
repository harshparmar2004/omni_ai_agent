const express = require('express');
const router = express.Router();
const {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  getPublishedCountToday
} = require('../database');
const { validatePageToken, maskToken } = require('../core/tokenManager');

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

module.exports = router;
