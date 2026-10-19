const express = require('express');
const router = express.Router();
const {
  getJob,
  listJobs,
  retryJob,
  deleteJob,
  updateJobProgress
} = require('../core/jobQueue');
const { updatePublishJob } = require('../database');

/**
 * GET /api/jobs
 * List jobs with optional filtering by status, pageId, agent
 */
router.get('/', (req, res) => {
  try {
    const { status, pageId, agent, limit, hasMedia } = req.query;
    const filter = {};
    if (status) {
      filter.status = status.includes(',') ? status.split(',') : status;
    }
    if (pageId) filter.pageId = parseInt(pageId, 10);
    if (agent) filter.agent = agent;
    if (limit) filter.limit = parseInt(limit, 10);
    if (hasMedia === 'true' || hasMedia === '1') filter.hasMedia = true;

    const jobs = listJobs(filter);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
