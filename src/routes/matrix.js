const express = require('express');
const router = express.Router();
const { getMatrixItems, retryBridgeForRow, exportMatrixToCsv } = require('../services/matrixService');

/**
 * GET /api/matrix
 * Returns Virtual Sheet deliverables with search & status filtering
 */
router.get('/', (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;
    const result = getMatrixItems({
      status,
      search,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[Matrix Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matrix/export.csv
 * Exports matrix data to CSV matching Google Sheets format
 */
router.get('/export.csv', (req, res) => {
  try {
    const csvData = exportMatrixToCsv();
    const filename = `OmniResearch_Deliverables_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err) {
    console.error('[CSV Export Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/matrix/retry-bridge
 * Re-dispatches a post payload to InstaAuto
 */
router.post('/retry-bridge', async (req, res) => {
  try {
    const { row_id } = req.body || {};
    if (!row_id) {
      return res.status(400).json({ error: 'row_id is required' });
    }

    const result = await retryBridgeForRow(row_id);

    res.json({
      success: true,
      message: `Re-dispatched row #${row_id} to InstaAuto bridge!`,
      result
    });
  } catch (err) {
    console.error('[Retry Bridge Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
