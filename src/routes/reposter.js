const express = require('express');
const router = express.Router();
const { submitLink } = require('../agents/reposter/reposterAgent');
const { listJobs } = require('../core/jobQueue');

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
    const jobs = listJobs({ agent: 'reposter', limit: 50 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
