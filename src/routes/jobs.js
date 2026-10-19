const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  getJob,
  listJobs,
  retryJob,
  deleteJob,
  updateJobProgress
} = require('../core/jobQueue');
const {
  updatePublishJob,
  getGlobalPublishingStats,
  countPublishJobs
} = require('../database');

/**
 * GET /api/jobs/overview
 * Global publishing statistics & channel quota usage
 */
router.get('/overview', (req, res) => {
  try {
    const pageId = req.query.pageId ? parseInt(req.query.pageId, 10) : null;
    const stats = getGlobalPublishingStats(pageId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jobs
 * List jobs with optional filtering by status, pageId, agent, offset, search
 */
router.get('/', (req, res) => {
  try {
    const { status, pageId, agent, limit, offset, search, hasMedia, telegramOnly } = req.query;
    const filter = {};
    if (status) {
      filter.status = status.includes(',') ? status.split(',') : status;
    }
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (agent) filter.agent = agent;
    if (limit) filter.limit = parseInt(limit, 10);
    if (offset) filter.offset = parseInt(offset, 10);
    if (search && search.trim()) filter.search = search.trim();
    if (hasMedia === 'true' || hasMedia === '1') filter.hasMedia = true;
    if (telegramOnly === 'true' || telegramOnly === '1') filter.telegramOnly = true;

    const total = countPublishJobs(filter);
    const jobs = listJobs(filter);

    res.setHeader('X-Total-Count', String(total));
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jobs/:id/thumbnail
 * Serves visual photo preview / extracted video snapshot for a reel
 */
router.get('/:id/thumbnail', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = getJob(id);
    if (!job) return res.status(404).send('Job not found');

    const publicDir = path.join(__dirname, '..', '..', 'public');
    const thumbDir = path.join(publicDir, 'generated', 'thumbnails');
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    let mediaArr = [];
    try {
      mediaArr = typeof job.media_paths === 'string' ? JSON.parse(job.media_paths) : (job.media_paths || []);
    } catch (e) {
      mediaArr = [job.media_paths];
    }

    const firstMedia = mediaArr && mediaArr[0] ? String(mediaArr[0]) : '';
    const cleanRel = firstMedia.replace(/^\//, '');
    const absPath = path.join(publicDir, cleanRel);

    // 1. Direct image slide / cover
    if (/\.(jpg|jpeg|png|webp)$/i.test(firstMedia) && fs.existsSync(absPath)) {
      return res.sendFile(absPath);
    }

    // 2. Video frame extraction or cached thumbnail
    if (/\.mp4$/i.test(firstMedia)) {
      const cachedThumb = path.join(thumbDir, `job_${job.id}_${job.shortcode || 'thumb'}.jpg`);
      if (fs.existsSync(cachedThumb)) {
        return res.sendFile(cachedThumb);
      }
      if (fs.existsSync(absPath)) {
        try {
          execSync(`ffmpeg -y -ss 00:00:01 -i "${absPath}" -vframes 1 -q:v 2 "${cachedThumb}"`, { timeout: 8000 });
          if (fs.existsSync(cachedThumb)) {
            return res.sendFile(cachedThumb);
          }
        } catch (e) {
          console.warn(`[Thumbnail extraction notice for #${job.id}]:`, e.message);
        }
      }
    }

    // 3. Fallback: check shortcode folder under carousels
    if (job.shortcode) {
      const carSlide = path.join(publicDir, 'generated', 'downloads', 'carousels', job.shortcode, 'slide_1.jpg');
      if (fs.existsSync(carSlide)) {
        return res.sendFile(carSlide);
      }
    }

    // 4. Branded 9:16 high-contrast SVG Reel Poster
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="108" height="144" viewBox="0 0 108 144">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2D2A26"/>
            <stop offset="100%" stop-color="#1A1816"/>
          </linearGradient>
        </defs>
        <rect width="108" height="144" rx="8" fill="url(#g)"/>
        <circle cx="54" cy="62" r="22" fill="#D97757" opacity="0.9"/>
        <polygon points="48,50 66,62 48,74" fill="#FFFFFF"/>
        <text x="54" y="106" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">REEL</text>
        <text x="54" y="122" font-family="monospace" font-size="9" fill="#9C9589" text-anchor="middle">#${job.shortcode || job.id}</text>
      </svg>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * GET /api/jobs/:id
 */
router.get('/:id', (req, res) => {
  try {
    const job = getJob(parseInt(req.params.id, 10));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/retry
 */
router.post('/:id/retry', (req, res) => {
  try {
    const updated = retryJob(parseInt(req.params.id, 10));
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/approve
 * Approves a pending_review job to move to queued status
 */
router.post('/:id/approve', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { caption } = req.body;
    const extra = { error: '', attempts: 0 };
    if (caption) extra.caption = caption;

    const updated = updateJobProgress(id, 'queued', 'approved', extra);
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/jobs/:id
 * Edit caption or status
 */
router.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = updatePublishJob(id, req.body);
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/jobs/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const result = deleteJob(parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
