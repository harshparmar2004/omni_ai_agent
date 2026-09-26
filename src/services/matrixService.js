const { getDb } = require('../database');
const { pushToInstaAutoBridge } = require('./bridgeService');

/**
 * Internal Deliverables Matrix Service ("Virtual Sheet")
 * Manages rows, columns, status filtering, search, CSV exports, and bridge re-sync
 */
function getMatrixItems({ status, search, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  let query = `
    SELECT 
      m.id,
      m.media_asset_id,
      m.deliverable_id,
      m.topic,
      m.lead_magnet_title,
      m.trigger_keyword,
      m.deliverable_url,
      m.ig_media_id,
      m.ig_permalink,
      m.caption,
      m.status,
      m.instaauto_rule_id,
      m.instaauto_response,
      m.created_at,
      m.armed_at,
      COALESCE(m.content_type, 'reel') as content_type,
      COALESCE(m.thumbnail_url, a.thumbnail_url, a.image_url) as thumbnail_url,
      COALESCE(m.google_doc_url, d.google_doc_url) as google_doc_url,
      COALESCE(m.pdf_url, d.pdf_url) as pdf_url,
      COALESCE(m.provider, '') as provider,
      COALESCE(m.confidence_score, 0.85) as confidence_score,
      a.video_url,
      a.image_url,
      d.slug
    FROM deliverables_matrix m
    LEFT JOIN media_assets a ON m.media_asset_id = a.id
    LEFT JOIN deliverables d ON m.deliverable_id = d.id
    WHERE 1=1
  `;

  const params = [];

  if (status && status !== 'all') {
    query += ' AND m.status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query += ' AND (m.trigger_keyword LIKE ? OR m.topic LIKE ? OR m.lead_magnet_title LIKE ? OR m.ig_media_id LIKE ?)';
    params.push(s, s, s, s);
  }

  query += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);

  // Total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM deliverables_matrix m WHERE 1=1';
  const countParams = [];
  if (status && status !== 'all') {
    countQuery += ' AND m.status = ?';
    countParams.push(status);
  }
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    countQuery += ' AND (m.trigger_keyword LIKE ? OR m.topic LIKE ? OR m.lead_magnet_title LIKE ? OR m.ig_media_id LIKE ?)';
    countParams.push(s, s, s, s);
  }
  const total = db.prepare(countQuery).get(...countParams)?.total || rows.length;

  return {
    rows,
    total,
    limit,
    offset
  };
}

/**
 * Re-fires bridge dispatch for a specific row in the Virtual Sheet
 */
async function retryBridgeForRow(rowId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT m.*, d.slug, a.video_url, a.image_url
    FROM deliverables_matrix m
    LEFT JOIN deliverables d ON m.deliverable_id = d.id
    LEFT JOIN media_assets a ON m.media_asset_id = a.id
    WHERE m.id = ?
  `).get(rowId);

  if (!row) {
    throw new Error(`Matrix row #${rowId} not found`);
  }

  return await pushToInstaAutoBridge({
    matrixRowId: row.id,
    mediaAssetId: row.media_asset_id,
    deliverableId: row.deliverable_id,
    topic: row.topic,
    leadMagnetTitle: row.lead_magnet_title,
    triggerKeyword: row.trigger_keyword,
    deliverableUrl: row.deliverable_url,
    igMediaId: row.ig_media_id,
    igPermalink: row.ig_permalink,
    caption: row.caption
  });
}

/**
 * Generates CSV string matching InstaAuto / Google Sheets format
 */
function exportMatrixToCsv() {
  const items = getMatrixItems({ limit: 1000 }).rows;

  const headers = [
    'ID',
    'Type',
    'Status',
    'Setup Date & Time',
    'Reel / Post Media ID',
    'Trigger Keyword',
    'Lead Magnet Title',
    'Topic',
    'Deliverable URL',
    'PDF URL',
    'Google Doc URL',
    'Instagram Permalink',
    'InstaAuto Rule ID',
    'Provider'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvLines = [headers.join(',')];

  for (const item of items) {
    csvLines.push([
      escapeCsv(item.id),
      escapeCsv(item.content_type || 'reel'),
      escapeCsv(item.status),
      escapeCsv(item.armed_at || item.created_at),
      escapeCsv(item.ig_media_id),
      escapeCsv(item.trigger_keyword),
      escapeCsv(item.lead_magnet_title),
      escapeCsv(item.topic),
      escapeCsv(item.deliverable_url),
      escapeCsv(item.pdf_url),
      escapeCsv(item.google_doc_url),
      escapeCsv(item.ig_permalink),
      escapeCsv(item.instaauto_rule_id),
      escapeCsv(item.provider)
    ].join(','));
  }

  return csvLines.join('\r\n');
}

module.exports = {
  getMatrixItems,
  retryBridgeForRow,
  exportMatrixToCsv
};
