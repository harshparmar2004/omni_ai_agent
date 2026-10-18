const express = require('express');
const router = express.Router();
const scheduler = require('../agents/watchtower/scheduler');
const { setSetting, listAgentRuns } = require('../database');
const notifier = require('../core/notifier');

/**
 * GET /api/watchtower/status
 */
router.get('/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/watchtower/run
 * Manually trigger surveillance cycle
 */
router.post('/run', async (req, res) => {
  try {
    const { quick, force } = req.body;
    // Run cycle asynchronously so request returns immediately
    setImmediate(() => {
      scheduler.executeCycle({ quick: Boolean(quick), force: true }).catch(e => console.error('[Watchtower Run Error]:', e));
    });
    res.json({ success: true, message: 'Surveillance cycle initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/watchtower/pause
 */
router.post('/pause', (req, res) => {
  try {
    setSetting('watchtower_paused', '1');
    notifier.emitDashboardEvent('watchtower_status', { paused: true });
    res.json({ success: true, paused: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/watchtower/resume
 */
router.post('/resume', (req, res) => {
  try {
    setSetting('watchtower_paused', '0');
    notifier.emitDashboardEvent('watchtower_status', { paused: false });
    res.json({ success: true, paused: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/watchtower/runs
 * History of surveillance cycle runs
 */
router.get('/runs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const runs = listAgentRuns(limit);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
