const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { conductDeepResearch } = require('../services/researchService');
const { generateDeliverable } = require('../services/deliverableService');

/**
 * POST /api/research/create
 * Step 1 & 2: Conducts autonomous deep research and creates companion deliverable guide
 */
router.post('/create', async (req, res) => {
  try {
    const { topic, niche, depth, provider, model } = req.body || {};

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required for research' });
    }

    // 1. Conduct deep research
    const researchResult = await conductDeepResearch({
      topic: topic.trim(),
      niche: niche || 'AI & Software Architecture',
      depth: depth || 'deep',
      provider: provider || undefined,
      model: model || undefined
    });

    // 2. Automatically compile deliverable guide
    const deliverable = await generateDeliverable({
      campaignId: researchResult.campaignId,
      title: researchResult.title,
      summary: researchResult.summary,
      key_concepts: researchResult.key_concepts,
      code_snippets: researchResult.code_snippets,
      diagram_mermaid: researchResult.diagram_mermaid,
      diagram_url: researchResult.diagram_url,
      cover_url: researchResult.cover_url,
      banner_url: researchResult.banner_url,
      topic: researchResult.topic
    });

    // 3. Auto-stage into Instagram Posting Queue
    const { recommendTrendingAudio } = require('../services/trendingAudioService');
    const { isTechNotesIntent } = require('../services/intentClassifier');
    const audio = recommendTrendingAudio(topic, 'carousel');
    const isNotes = isTechNotesIntent(topic, deliverable.title);
    const isHack = /hackathon|challenge|competition/i.test(topic);
    const isDocker = /docker|container|kubernetes|k8s/i.test(topic);
    const triggerKeyword = isNotes ? 'NOTES' : (isHack ? 'HACK' : (isDocker ? 'DOCKER' : 'GUIDE'));
    
    const hookText = isNotes
      ? `Complete Handwritten Study Notes & Syntax Blueprint for ${topic}`
      : (isHack 
          ? 'The Top 10 Hackathons with grants and bounties are open!'
          : (isDocker 
              ? 'Stop guessing Docker in interviews! Here is the Linux kernel truth.' 
              : `The Definitive 12-Page Deep Research Whitepaper: ${topic}`));

    const captionText = `${researchResult.title} 🚀\n\nVerified breakdown, system architecture, and production playbook.\n\nKey Highlights:\n• Verified industry intelligence & empirical benchmarks\n• Production starter code and system topology\n• Curated YouTube masterclasses with direct links\n• Production readiness checklist\n\n👉 Comment "${triggerKeyword}" below and my AI agent will instantly DM you the complete 12-page Research Whitepaper & PDF! 🚀\n\n#tech #engineering #ai #developers #coding`;

    const slidesList = [1, 2, 3, 4, 5, 6].map(i => `/generated/carousels/${researchResult.campaignId}/slide_${i}.png`);
    const thumbUrl = `/generated/carousels/${researchResult.campaignId}/slide_1.png`;
    const pdfUrl = `/api/docs/${researchResult.campaignId}/pdf`;

    const db = getDb();
    let queuedPost = null;
    try {
      const insertPost = db.prepare(`
        INSERT INTO instagram_posts (
          campaign_id, deliverable_id, content_type, status, hook_text, caption,
          trigger_keyword, trending_song_title, trending_song_artist, trending_song_audio_url, audio_vibe,
          media_urls, thumbnail_url, deliverable_url, pdf_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        researchResult.campaignId,
        deliverable.id,
        'carousel',
        'ready_to_post',
        hookText,
        captionText,
        triggerKeyword,
        audio.title,
        audio.artist,
        audio.audio_url,
        audio.vibe,
        JSON.stringify(slidesList),
        thumbUrl,
        deliverable.public_url,
        pdfUrl,
        new Date().toISOString()
      );
      queuedPost = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(insertPost.lastInsertRowid);
    } catch (e) {
      console.warn('[Research Route] Notice: could not auto-stage to instagram_posts:', e.message);
    }

    res.json({
      success: true,
      message: `Research complete! Companion guide published at: ${deliverable.public_url}`,
      campaign: researchResult,
      deliverable,
      queued_post: queuedPost
    });
  } catch (err) {
    console.error('[Research Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/research/campaigns
 * List all research campaigns with full deliverable and funnel metadata
 */
router.get('/campaigns', (req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare(`
      SELECT 
        c.*, 
        d.id as deliverable_id,
        d.title as deliverable_title,
        d.slug, 
        d.public_url, 
        d.views_count,
        m.ig_media_id,
        m.trigger_keyword,
        m.status as funnel_status,
        a.video_url,
        a.thumbnail_url
      FROM research_campaigns c
      LEFT JOIN deliverables d ON d.campaign_id = c.id
      LEFT JOIN deliverables_matrix m ON m.deliverable_id = d.id
      LEFT JOIN media_assets a ON a.deliverable_id = d.id
      GROUP BY c.id
      ORDER BY c.id DESC
    `).all();

    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/research/:id
 * Retrieve specific campaign
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM research_campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const deliverable = db.prepare('SELECT * FROM deliverables WHERE campaign_id = ?').get(campaign.id);
    const media = deliverable ? db.prepare('SELECT * FROM media_assets WHERE deliverable_id = ?').get(deliverable.id) : null;
    const matrix = deliverable ? db.prepare('SELECT * FROM deliverables_matrix WHERE deliverable_id = ?').get(deliverable.id) : null;

    res.json({ success: true, campaign, deliverable, media, matrix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/research/:id
 * Remove a campaign and its associated deliverables from history
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid campaign ID' });

    const deliverable = db.prepare('SELECT id FROM deliverables WHERE campaign_id = ?').get(id);
    if (deliverable) {
      db.prepare('DELETE FROM deliverables_matrix WHERE deliverable_id = ?').run(deliverable.id);
      db.prepare('DELETE FROM media_assets WHERE deliverable_id = ?').run(deliverable.id);
      db.prepare('DELETE FROM deliverables WHERE id = ?').run(deliverable.id);
    }
    db.prepare('DELETE FROM research_campaigns WHERE id = ?').run(id);

    res.json({ success: true, message: `Campaign #${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
