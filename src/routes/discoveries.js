const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  listDiscoveredPosts,
  countDiscoveredPosts,
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
    const { status, pageId, limit, offset } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (limit) filter.limit = parseInt(limit, 10);
    if (offset) filter.offset = parseInt(offset, 10);

    const total = countDiscoveredPosts({
      status: filter.status,
      pageId: filter.pageId
    });

    const posts = listDiscoveredPosts(filter);

    res.setHeader('X-Total-Count', String(total));
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/discoveries/:id/thumbnail
 * Serves visual preview snapshot / SVG Reel Poster for a discovered reel
 */
router.get('/:id/thumbnail', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const post = getDiscoveredPostById(id);
    if (!post) return res.status(404).send('Discovery not found');

    const publicDir = path.join(__dirname, '..', '..', 'public');
    const thumbDir = path.join(publicDir, 'generated', 'thumbnails');

    // 1. Check in generated thumbnails for any cached image containing this shortcode
    if (post.shortcode && fs.existsSync(thumbDir)) {
      const files = fs.readdirSync(thumbDir);
      const matchingThumb = files.find(f => f.includes(post.shortcode));
      if (matchingThumb) {
        return res.sendFile(path.join(thumbDir, matchingThumb));
      }
    }

    // 2. Check in carousels directory
    if (post.shortcode) {
      const carSlide = path.join(publicDir, 'generated', 'downloads', 'carousels', post.shortcode, 'slide_1.jpg');
      if (fs.existsSync(carSlide)) {
        return res.sendFile(carSlide);
      }
    }

    // 3. Fallback: Sleek branded 9:16 high-contrast SVG Reel Poster
    res.setHeader('Content-Type', 'image/svg+xml');
    const creatorTag = post.source_username ? `@${post.source_username}` : 'REEL';
    const codeTag = post.shortcode ? `#${post.shortcode}` : `#${post.id}`;
    res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="108" height="144" viewBox="0 0 108 144">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2D2A26"/>
            <stop offset="100%" stop-color="#181614"/>
          </linearGradient>
        </defs>
        <rect width="108" height="144" rx="8" fill="url(#g)"/>
        <circle cx="54" cy="58" r="20" fill="#D97757" opacity="0.95"/>
        <polygon points="49,48 64,58 49,68" fill="#FFFFFF"/>
        <text x="54" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="10" font-weight="700" fill="#FFFFFF" text-anchor="middle">${creatorTag}</text>
        <text x="54" y="114" font-family="monospace" font-size="8.5" fill="#9C9589" text-anchor="middle">${codeTag}</text>
      </svg>
    `);
  } catch (err) {
    res.status(500).send(err.message);
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
