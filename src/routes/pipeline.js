const express = require('express');
const router = express.Router();
const {
  listPublishJobs,
  getPublishJobById,
  getJobEvents,
  countPublishJobs,
  getDb
} = require('../database');
const { retryJob, updateJobProgress } = require('../core/jobQueue');

/**
 * GET /api/pipeline/jobs
 * Paginated list of publishing jobs with stage metadata and event history counts
 */
router.get('/jobs', (req, res) => {
  try {
    const { pageId, status, agent, q, limit = 50, offset = 0 } = req.query;
    const filter = {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (status) filter.status = status.includes(',') ? status.split(',') : status;
    if (agent) filter.agent = agent;

    let jobs = listPublishJobs(filter);

    if (q) {
      const query = q.toLowerCase();
      jobs = jobs.filter(j =>
        (j.shortcode && j.shortcode.toLowerCase().includes(query)) ||
        (j.page_handle && j.page_handle.toLowerCase().includes(query)) ||
        (j.caption && j.caption.toLowerCase().includes(query)) ||
        (j.hook_headline && j.hook_headline.toLowerCase().includes(query))
      );
    }

    const enriched = jobs.map(j => {
      let editMeta = {};
      try { editMeta = typeof j.edit_meta === 'string' ? JSON.parse(j.edit_meta) : (j.edit_meta || {}); } catch (_) {}
      return {
        ...j,
        edit_meta: editMeta
      };
    });

    res.json({
      success: true,
      jobs: enriched,
      total: enriched.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pipeline/jobs/:id
 * Complete timeline, event logs, before/after media, and distribution details
 */
router.get('/jobs/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = getPublishJobById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const events = getJobEvents(id);

    // Distribution children
    let distributionTargets = [];
    try {
      distributionTargets = getDb().prepare(`
        SELECT dt.*, p.name as page_name, p.handle as page_handle
        FROM distribution_targets dt
        LEFT JOIN pages p ON dt.target_page_id = p.id
        WHERE dt.publish_job_id = ?
      `).all(id);
    } catch (_) {}

    let editMeta = {};
    try { editMeta = typeof job.edit_meta === 'string' ? JSON.parse(job.edit_meta) : (job.edit_meta || {}); } catch (_) {}

    res.json({
      success: true,
      job: {
        ...job,
        edit_meta: editMeta
      },
      events,
      distributionTargets
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pipeline/stats
 * Overview metrics for pipeline stages, failure counts, and health
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const nowIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const stageCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM publish_jobs
      GROUP BY status
    `).all();

    const statsMap = {
      queued: 0,
      downloading: 0,
      ready: 0,
      publishing: 0,
      published: 0,
      failed: 0
    };
    for (const row of stageCounts) {
      if (statsMap[row.status] !== undefined) {
        statsMap[row.status] = row.count;
      }
    }

    const last24hCount = db.prepare(`
      SELECT COUNT(*) as count FROM publish_jobs
      WHERE status = 'published' AND published_at >= ?
    `).get(nowIso)?.count || 0;

    const recentFailures = db.prepare(`
      SELECT id, shortcode, error, created_at, page_id
      FROM publish_jobs
      WHERE status = 'failed'
      ORDER BY id DESC LIMIT 5
    `).all();

    res.json({
      success: true,
      stats: {
        ...statsMap,
        total: Object.values(statsMap).reduce((a, b) => a + b, 0),
        published24h: last24hCount,
        recentFailures
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/jobs/:id/retry
 * Retry job
 */
router.post('/jobs/:id/retry', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = retryJob(id);
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
