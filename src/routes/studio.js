const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getPublishJobById, getPageById, getPageTemplate, listPublishJobs, updatePublishJob, addJobEvent } = require('../database');
const { prepareVideoForFeedCard } = require('../utils/ffmpegHelper');

const PRESETS = [
  {
    id: 'neon',
    slug: 'clubbing',
    name: 'Clubbing Cult Neon Green',
    niche: 'Nightlife / EDM / Cyberpunk',
    primaryColor: '#00FF66',
    backgroundColor: '#0D0D12',
    font: 'Outfit / Sans',
    frameStyle: 'Cyberpunk HUD',
    description: 'Electric neon green borders, chamfered edge accents, and high-contrast digital watermark for nightlife & electronic music reels.',
    features: ['Active 9:16 HUD Framing', 'Top Brand Header', 'Audio Waveform Indicators', 'High-Contrast Cyber Glow']
  },
  {
    id: 'video_essay',
    slug: 'video_essay',
    name: 'Editorial Video Essay (Cult Information)',
    niche: 'Education / Documentaries / AI Curation',
    primaryColor: '#E2E8F0',
    backgroundColor: '#000000',
    font: 'Plus Jakarta Sans',
    frameStyle: 'Balanced Center Card',
    description: 'Minimalist editorial card with AI-synthesized hook headline on top, centered video frame, and clean zero-clutter branding.',
    features: ['Auto-Letterbox Elimination', 'Competitor Header Stripping', 'AI Hook Headline Positioning', 'Balanced Vertical Symmetry']
  },
  {
    id: 'cinema',
    slug: 'movies',
    name: 'Cinematic Movie Series',
    niche: 'Cinema / TV / Pop Culture',
    primaryColor: '#F59E0B',
    backgroundColor: '#0B0B0E',
    font: 'Cinzel / Inter',
    frameStyle: 'Golden Cinema Frame',
    description: 'Warm amber tones, cinematic letterboxing, and elegant metadata tags for movie clips, trailers, and series recommendations.',
    features: ['Cinematic Letterbox Guard', 'Golden Accent Typography', 'Curated Film Title Headers', 'Subtle Brand Stamp']
  },
  {
    id: 'gta6',
    slug: 'gta6',
    name: 'GTA 6 Vice City Neon',
    niche: 'Gaming / GTA / Action',
    primaryColor: '#FF007F',
    backgroundColor: '#0A0515',
    font: 'Pricedown / Montserrat',
    frameStyle: 'Vice City Synthwave',
    description: 'Neon magenta and cyan retro aesthetics matching the Vice City atmosphere for gaming trailers and leaks.',
    features: ['Vice City Color Gradients', 'Bold Gaming Title Text', 'Verified Gaming Crest', 'High-Impact Thumbnails']
  },
  {
    id: 'minimal',
    slug: 'minimal',
    name: 'Minimalist Clean Brand',
    niche: 'General / Lifestyle / Tech',
    primaryColor: '#3B82F6',
    backgroundColor: '#0F172A',
    font: 'Inter',
    frameStyle: 'Ultra Clean Edge',
    description: 'Unobtrusive modern framing suitable for any corporate, creator, or tech channel without heavy styling.',
    features: ['Subtle Brand Watermark', 'Full-Resolution Retention', 'Clean Safe Zone Padding', 'Universal Ratio Scaling']
  }
];

/**
 * GET /api/studio/presets
 */
router.get('/presets', (req, res) => {
  res.json({ success: true, presets: PRESETS });
});

/**
 * GET /api/studio/recent
 * Returns recent Agent 3 video editing jobs with before/after comparisons
 */
router.get('/recent', (req, res) => {
  try {
    const jobs = listPublishJobs({ limit: 20 });
    const editedJobs = jobs.filter(j => j.edited_media_path || j.edit_theme || (j.media_paths && j.media_paths.length > 0));

    const enriched = editedJobs.map(j => {
      let originalVideo = '';
      try {
        const parsed = JSON.parse(j.media_paths || '[]');
        originalVideo = parsed[0] || '';
      } catch (_) {}

      let editMeta = {};
      try {
        editMeta = typeof j.edit_meta === 'string' ? JSON.parse(j.edit_meta) : (j.edit_meta || {});
      } catch (_) {}

      return {
        id: j.id,
        shortcode: j.shortcode,
        pageId: j.page_id,
        pageHandle: j.page_handle,
        theme: j.edit_theme || 'default',
        hookHeadline: j.hook_headline || '',
        status: j.status,
        originalVideo,
        editedVideo: j.edited_media_path || originalVideo,
        permalink: j.permalink,
        editMeta,
        createdAt: j.created_at
      };
    });

    res.json({ success: true, count: enriched.length, recent: enriched, jobs: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/studio/jobs/:id/re-render
 * Re-render an existing reel with new theme or hook headline
 */
router.post('/jobs/:id/re-render', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = getPublishJobById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const page = getPageById(job.page_id);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    let mediaPaths = [];
    try { mediaPaths = JSON.parse(job.media_paths || '[]'); } catch (_) {}
    if (mediaPaths.length === 0) return res.status(400).json({ error: 'No media file available to render' });

    const rawInput = mediaPaths[0];
    const theme = req.body.theme || job.edit_theme || 'video_essay';
    const hookHeadline = req.body.hookHeadline !== undefined ? req.body.hookHeadline : (job.hook_headline || '');

    const framed = await prepareVideoForFeedCard(rawInput, {
      handle: page.handle,
      page,
      theme,
      hookHeadline
    });

    const publicCandidate = framed.replace(/\\/g, '/');
    updatePublishJob(id, {
      edited_media_path: publicCandidate,
      edit_theme: theme,
      hook_headline: hookHeadline,
      edit_meta: {
        theme,
        hookHeadline,
        rerenderedAt: new Date().toISOString()
      }
    });

    addJobEvent({
      jobId: id,
      stage: 'rerender',
      status: 'done',
      message: `Agent 3 re-rendered reel with theme '${theme}'`,
      meta: { theme, hookHeadline }
    });

    res.json({
      success: true,
      jobId: id,
      editedVideo: publicCandidate,
      theme,
      hookHeadline
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
