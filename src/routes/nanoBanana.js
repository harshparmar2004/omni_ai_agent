const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb, getSetting } = require('../database');
const { generateNanoBananaCarouselDeck } = require('../services/nanoBananaEngine');

/**
 * POST /api/nanobanana/generate
 * Generates 5-slide 4:5 Instagram carousel, trigger keyword, and high-converting caption
 */
router.post('/generate', async (req, res) => {
  try {
    const { campaignId, systemPrompt, customKeyword } = req.body || {};
    const cId = parseInt(campaignId);
    if (!cId || isNaN(cId)) {
      return res.status(400).json({ success: false, error: 'Valid campaignId is required' });
    }

    const result = await generateNanoBananaCarouselDeck({
      campaignId: cId,
      systemPrompt,
      customKeyword
    });

    res.json(result);
  } catch (err) {
    console.error('[Nano Banana Route Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/nanobanana/stage
 * Stages the Nano Banana carousel post to the Ready to Post queue (instagram_posts table)
 */
router.post('/stage', async (req, res) => {
  try {
    const { campaignId, keyword, caption, slides, deliverableUrl, pdfUrl } = req.body || {};
    const cId = parseInt(campaignId) || null;
    const db = getDb();

    // Find deliverable ID if available
    let deliverableId = null;
    if (cId) {
      const d = db.prepare('SELECT id FROM deliverables WHERE campaign_id = ?').get(cId);
      if (d) deliverableId = d.id;
    }

    const campaign = cId ? db.prepare('SELECT topic FROM research_campaigns WHERE id = ?').get(cId) : null;
    const topic = campaign?.topic || 'Autonomous Research Guide';

    const insertStmt = db.prepare(`
      INSERT INTO instagram_posts (
        campaign_id, deliverable_id, content_type, status,
        hook_text, caption, trigger_keyword, media_urls,
        deliverable_url, pdf_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const mediaUrlsJson = JSON.stringify(Array.isArray(slides) ? slides : [slides]);
    const now = new Date().toISOString();

    const result = insertStmt.run(
      cId,
      deliverableId,
      'carousel',
      'ready_to_post',
      caption ? caption.slice(0, 80) : topic,
      caption || '',
      keyword || 'NOTES',
      mediaUrlsJson,
      deliverableUrl || '',
      pdfUrl || '',
      now
    );

    const postId = result.lastInsertRowid;

    // Record into deliverables_matrix ("Virtual Sheet")
    try {
      db.prepare(`
        INSERT INTO deliverables_matrix (
          deliverable_id, topic, lead_magnet_title, trigger_keyword,
          deliverable_url, caption, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
      `).run(
        deliverableId,
        topic,
        topic,
        keyword || 'NOTES',
        deliverableUrl || '',
        caption || '',
        now
      );
    } catch(e) {}

    console.log(`[Nano Banana] ⚡ Staged post #${postId} to Ready to Post Queue with trigger keyword: ${keyword}`);

    res.json({
      success: true,
      postId,
      message: `Post #${postId} staged to Ready to Post Queue!`
    });
  } catch (err) {
    console.error('[Nano Banana Stage Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/nanobanana/publish
 * Publishes post and syncs trigger keyword + deliverable URL with InstaAuto sister agent
 */
router.post('/publish', async (req, res) => {
  try {
    const { postId, campaignId, keyword, caption, slides, deliverableUrl, pdfUrl } = req.body || {};
    const db = getDb();

    // 1. Arm InstaAuto Sister Agent on port 3000
    let sisterArmed = false;
    let sisterResponse = null;
    const sisterUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');

    try {
      const bridgePayload = {
        action: 'arm_trigger',
        trigger_keyword: keyword || 'NOTES',
        deliverable_url: deliverableUrl,
        pdf_url: pdfUrl,
        campaign_id: campaignId,
        caption: caption || '',
        source: 'OmniResearch_NanoBanana'
      };

      const response = await axios.post(sisterUrl, bridgePayload, { timeout: 4000 });
      sisterArmed = true;
      sisterResponse = response.data;
      console.log('[Nano Banana] 📡 Successfully armed InstaAuto Sister Agent Bridge:', sisterResponse);
    } catch (e) {
      console.warn('[Nano Banana] ⚠️ InstaAuto Sister Agent on port 3000 not responding (will retry when active):', e.message);
    }

    // 2. Update post status in database if postId is provided
    if (postId) {
      db.prepare(`
        UPDATE instagram_posts
        SET status = 'published', published_at = ?, instaauto_status = ?
        WHERE id = ?
      `).run(new Date().toISOString(), sisterArmed ? 'armed' : 'pending', postId);
    }

    res.json({
      success: true,
      message: sisterArmed
        ? `Successfully published post & armed InstaAuto Bridge with keyword: ${keyword}`
        : `Post marked as published. InstaAuto Bridge staged (port 3000 offline).`,
      sisterArmed
    });
  } catch (err) {
    console.error('[Nano Banana Publish Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
