const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { generateReelMedia } = require('../services/mediaService');

/**
 * POST /api/media/generate-reel
 * Step 3: Generates script, keyword, Nano Banana images, and FFmpeg vertical video
 */
router.post('/generate-reel', async (req, res) => {
  try {
    const { deliverable_id, topic, title, summary, insights, content_type } = req.body || {};

    const mediaResult = await generateReelMedia({
      deliverableId: deliverable_id,
      topic,
      title,
      summary,
      insights: insights || [],
      contentType: content_type || 'reel'
    });

    res.json({
      success: true,
      message: `Reel and visuals generated! Trigger keyword: ${mediaResult.trigger_keyword}`,
      media: mediaResult
    });
  } catch (err) {
    console.error('[Media Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/media/assets
 * Returns all generated media assets
 */
router.get('/assets', (req, res) => {
  try {
    const db = getDb();
    const assets = db.prepare(`
      SELECT a.*, d.slug, d.public_url, d.title as deliverable_title
      FROM media_assets a
      LEFT JOIN deliverables d ON a.deliverable_id = d.id
      ORDER BY a.id DESC
    `).all();

    res.json({ success: true, count: assets.length, assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
