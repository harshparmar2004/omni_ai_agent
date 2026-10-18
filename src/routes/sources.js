const express = require('express');
const router = express.Router();
const {
  getSourceAccounts,
  getSourceAccountById,
  createSourceAccount,
  updateSourceAccount,
  deleteSourceAccount
} = require('../database');
const { readSourcePosts } = require('../agents/watchtower/sourceReaders/guestReader');

/**
 * GET /api/sources
 */
router.get('/', (req, res) => {
  try {
    const { pageId, isActiveOnly } = req.query;
    const filter = {};
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (isActiveOnly) filter.isActiveOnly = isActiveOnly === 'true';

    const sources = getSourceAccounts(filter);
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sources
 * Add single source
 */
router.post('/', (req, res) => {
  try {
    const { username, page_id } = req.body;
    if (!username || !page_id) {
      return res.status(400).json({ error: 'username and page_id are required' });
    }
    const cleanUser = username.replace(/^@/, '').trim();
    const source = createSourceAccount({
      username: cleanUser,
      page_id: parseInt(page_id, 10)
    });
    res.json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sources/bulk
 * Bulk add multiple sources
 */
router.post('/bulk', (req, res) => {
  try {
    const { usernames, text, page_id } = req.body;
    if (!page_id) return res.status(400).json({ error: 'page_id is required' });

    let userList = [];
    if (Array.isArray(usernames)) {
      userList = usernames;
    } else if (typeof text === 'string') {
      userList = text.split(/[\n,;\s]+/).map(u => u.trim()).filter(Boolean);
    }

    const added = [];
    const errors = [];

    for (const raw of userList) {
      const clean = raw.replace(/^@/, '').replace(/https?:\/\/(?:www\.)?instagram\.com\//, '').replace(/\/.*$/, '').trim();
      if (!clean) continue;
      try {
        const item = createSourceAccount({
          username: clean,
          page_id: parseInt(page_id, 10)
        });
        added.push(item);
      } catch (err) {
        errors.push({ username: clean, error: err.message });
      }
    }

    res.json({ success: true, addedCount: added.length, added, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/sources/:id
 */
router.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = updateSourceAccount(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/sources/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteSourceAccount(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sources/:id/check
 * Live test of source scraping
 */
router.post('/:id/check', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const source = getSourceAccountById(id);
    if (!source) return res.status(404).json({ error: 'Source account not found' });

    const result = await readSourcePosts(source.username, 3);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
