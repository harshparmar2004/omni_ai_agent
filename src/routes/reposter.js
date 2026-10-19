const express = require('express');
const router = express.Router();
const { submitLink } = require('../agents/reposter/reposterAgent');
const { listJobs } = require('../core/jobQueue');
const { getReposterPipelineSummary } = require('../database');

/**
 * GET /api/reposter/pipeline-summary
 * Summary counts across the 4 publishing pipeline stages
 */
router.get('/pipeline-summary', (req, res) => {
  try {
    const pageId = req.query.pageId ? parseInt(req.query.pageId, 10) : null;
    const summary = getReposterPipelineSummary(pageId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reposter/jobs
 * On-demand link submission from dashboard
 */
router.post('/jobs', async (req, res) => {
  try {
    const { url, pageId, reviewCaption } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Instagram URL is required' });
    }

    const result = await submitLink({
      url,
      pageId: pageId ? parseInt(pageId, 10) : null,
      origin: 'dashboard',
      reviewCaption: Boolean(reviewCaption)
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reposter/jobs
 * List jobs created by the reposter agent
 */
router.get('/jobs', (req, res) => {
  try {
    const filter = { agent: 'reposter', limit: 50 };
    if (req.query.pageId) {
      filter.pageId = parseInt(req.query.pageId, 10);
    }
    if (req.query.status) {
      filter.status = req.query.status.includes(',') ? req.query.status.split(',') : req.query.status;
    }
    if (req.query.hasMedia === 'true' || req.query.hasMedia === '1') {
      filter.hasMedia = true;
    }
    const jobs = listJobs(filter);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
