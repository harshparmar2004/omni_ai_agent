const express = require('express');
const router = express.Router();
const {
  listDiscoveredPosts,
  getDiscoveredPostById,
  updateDiscoveredPost,
  getPageById
} = require('../database');
const { enqueueJob } = require('../core/jobQueue');

/**
 * GET /api/discoveries
 */
router.get('/', (req, res) => {
  try {
    const { status, pageId, limit } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (limit) filter.limit = parseInt(limit, 10);

    const posts = listDiscoveredPosts(filter);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/discoveries/:id/post
 * Directly dispatch discovery to a Publish Job
 */
router.post('/:id/post', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const post = getDiscoveredPostById(id);
    if (!post) return res.status(404).json({ error: 'Discovered post not found' });

    const pageId = req.body.pageId ? parseInt(req.body.pageId, 10) : post.page_id;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    const jobRes = await enqueueJob({
      agent: 'watchtower',
      pageId,
      discoveredPostId: post.id,
      shortcode: post.shortcode,
      sourceUrl: post.url,
      caption: req.body.caption || post.caption || '',
      status: 'queued'
    });

    updateDiscoveredPost(post.id, { status: 'selected' });
    res.json({ success: true, ...jobRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/discoveries/:id/skip
 */
router.post('/:id/skip', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = updateDiscoveredPost(id, { status: 'skipped' });
    res.json({ success: true, post: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
