const express = require('express');
const router = express.Router();
const {
  listDistributionJobs,
  getDistributionJobById,
  updateDistributionJob
} = require('../database');
const { planDistribution } = require('../core/distributionPlanner');
const distributionWorker = require('../core/distributionWorker');

/**
 * GET /api/distribution
 * List distribution jobs
 */
router.get('/', (req, res) => {
  try {
    const { status, groupId, originPageId, limit } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (groupId) filter.groupId = parseInt(groupId, 10);
    if (originPageId) filter.originPageId = parseInt(originPageId, 10);
    if (limit) filter.limit = parseInt(limit, 10);

    const jobs = listDistributionJobs(filter);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/distribution/upcoming
 * List upcoming scheduled cross-post targets (MUST be defined before /:id)
 */
router.get('/upcoming', (req, res) => {
  try {
    const { getDb } = require('../database');
    const rows = getDb().prepare(`
      SELECT dt.*, p.name as target_page_name, p.handle as target_page_handle,
             pj.shortcode as origin_shortcode, pg.name as group_name
      FROM distribution_targets dt
      LEFT JOIN pages p ON dt.target_page_id = p.id
      LEFT JOIN distribution_jobs dj ON dt.distribution_job_id = dj.id
      LEFT JOIN page_groups pg ON dj.group_id = pg.id
      LEFT JOIN publish_jobs pj ON dj.origin_job_id = pj.id
      WHERE dt.status = 'scheduled'
      ORDER BY dt.scheduled_at ASC
    `).all();

    const now = Date.now();
    const enriched = rows.map(r => {
      const schedTime = new Date(r.scheduled_at).getTime();
      const diffSec = Math.round((schedTime - now) / 1000);
      return {
        ...r,
        countdownSec: Math.max(0, diffSec),
        countdownMin: Math.round(Math.max(0, diffSec) / 60)
      };
    });

    res.json({ success: true, targets: enriched, upcoming: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/distribution/:id
 * Get single distribution job details
 */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = getDistributionJobById(id);
    if (!job) return res.status(404).json({ error: 'Distribution job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution/plan
 * Manually trigger distribution fan-out for a published job
 */
router.post('/plan', async (req, res) => {
  try {
    const { job_id, group_id, immediate, ignoreQuota } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const result = await planDistribution(parseInt(job_id, 10), {
      groupId: group_id,
      immediate: immediate === true || immediate === 'true',
      ignoreQuota: ignoreQuota === true || ignoreQuota === 'true',
      force: true
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution/targets/:id/cancel
 */
router.post('/targets/:id/cancel', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { getDb } = require('../database');
    getDb().prepare("UPDATE distribution_targets SET status = 'cancelled' WHERE id = ?").run(id);
    res.json({ success: true, id, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution/targets/:id/send-now
 */
router.post('/targets/:id/send-now', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { getDb } = require('../database');
    // Set scheduled_at to past so next tick immediately picks it up
    getDb().prepare("UPDATE distribution_targets SET scheduled_at = ? WHERE id = ?").run(new Date(Date.now() - 5000).toISOString(), id);
    await distributionWorker.tick();
    res.json({ success: true, id, message: 'Dispatched immediately' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution/targets/:id/reschedule
 */
router.post('/targets/:id/reschedule', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { scheduled_at, addMinutes } = req.body || {};
    let targetDate;
    if (scheduled_at) {
      targetDate = new Date(scheduled_at);
    } else if (addMinutes) {
      targetDate = new Date(Date.now() + parseInt(addMinutes, 10) * 60000);
    } else {
      targetDate = new Date(Date.now() + 15 * 60000);
    }
    const { getDb } = require('../database');
    getDb().prepare("UPDATE distribution_targets SET scheduled_at = ?, status = 'scheduled' WHERE id = ?").run(targetDate.toISOString(), id);
    res.json({ success: true, id, scheduled_at: targetDate.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
