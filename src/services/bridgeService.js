const axios = require('axios');
const { getDb, getSetting } = require('../database');

/**
 * Autonomous InstaAuto Webhook Bridge Service
 * Pushes published posts and deliverables to InstaAuto (Port 3000) to arm Follow-First DM Funnels
 */
async function pushToInstaAutoBridge({
  matrixRowId,
  mediaAssetId,
  deliverableId,
  topic,
  leadMagnetTitle,
  triggerKeyword,
  deliverableUrl,
  igMediaId,
  igPermalink,
  caption,
  contentType = 'reel'
}) {
  const bridgeUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');
  const db = getDb();

  console.log(`\n======================================================`);
  console.log(`[Bridge Service] 📡 Dispatching Payload to InstaAuto Bridge`);
  console.log(`[Bridge Service] Target: ${bridgeUrl}`);
  console.log(`[Bridge Service] Media ID: ${igMediaId} | Keyword: ${triggerKeyword}`);
  console.log(`======================================================`);

  const payload = {
    media_id: igMediaId,
    caption: caption || `Comment "${triggerKeyword}" for the guide!`,
    deliverable_url: deliverableUrl,
    trigger_keyword: triggerKeyword,
    lead_magnet_title: leadMagnetTitle || topic,
    source: 'omni_research_agent'
  };

  const now = new Date();
  const formatTimestamp = (d) => {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formattedNow = formatTimestamp(now);

  try {
    const response = await axios.post(bridgeUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const responseData = response.data;
    const ruleId = responseData?.post?.rule_id || responseData?.post?.id || null;

    console.log(`[Bridge Service] ✅ Successfully Armed in InstaAuto! Rule ID: ${ruleId || 'N/A'}`);

    // Safely validate foreign keys to prevent constraint violations
    let safeMediaAssetId = null;
    if (mediaAssetId) {
      try {
        const ma = db.prepare('SELECT id FROM media_assets WHERE id = ?').get(mediaAssetId);
        if (ma) safeMediaAssetId = ma.id;
      } catch (e) {}
    }

    let safeDeliverableId = null;
    if (deliverableId) {
      try {
        const del = db.prepare('SELECT id FROM deliverables WHERE id = ?').get(deliverableId);
        if (del) safeDeliverableId = del.id;
      } catch (e) {}
    }

    // Fetch related records for comprehensive metadata
    const mediaRow = safeMediaAssetId ? db.prepare('SELECT * FROM media_assets WHERE id = ?').get(safeMediaAssetId) : null;
    const delivRow = safeDeliverableId ? db.prepare('SELECT * FROM deliverables WHERE id = ?').get(safeDeliverableId) : null;
    const campRow = delivRow?.campaign_id ? db.prepare('SELECT * FROM research_campaigns WHERE id = ?').get(delivRow.campaign_id) : null;

    const rowContentType = contentType || (mediaRow?.aspect_ratio === '9:16' ? 'reel' : 'image');
    const rowThumb = mediaRow?.thumbnail_url || mediaRow?.image_url || '';
    const rowPdf = delivRow?.pdf_url || '';
    const rowGDoc = delivRow?.google_doc_url || '';
    const rowProvider = campRow?.provider || '';
    const rowConfidence = campRow?.confidence_score || 0.85;

    // Update or Insert into deliverables_matrix
    if (matrixRowId) {
      db.prepare(`
        UPDATE deliverables_matrix
        SET status = 'armed',
            instaauto_rule_id = ?,
            instaauto_response = ?,
            armed_at = ?,
            content_type = ?,
            thumbnail_url = COALESCE(NULLIF(?, ''), thumbnail_url),
            google_doc_url = COALESCE(NULLIF(?, ''), google_doc_url),
            pdf_url = COALESCE(NULLIF(?, ''), pdf_url),
            provider = COALESCE(NULLIF(?, ''), provider),
            confidence_score = ?
        WHERE id = ?
      `).run(ruleId, JSON.stringify(responseData), formattedNow, rowContentType, rowThumb, rowGDoc, rowPdf, rowProvider, rowConfidence, matrixRowId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO deliverables_matrix (
          media_asset_id, deliverable_id, topic, lead_magnet_title, trigger_keyword,
          deliverable_url, ig_media_id, ig_permalink, caption, status,
          instaauto_rule_id, instaauto_response, created_at, armed_at,
          content_type, thumbnail_url, google_doc_url, pdf_url, provider, confidence_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = insertStmt.run(
        safeMediaAssetId,
        safeDeliverableId,
        topic || leadMagnetTitle,
        leadMagnetTitle,
        triggerKeyword,
        deliverableUrl,
        igMediaId,
        igPermalink,
        caption,
        'armed',
        ruleId,
        JSON.stringify(responseData),
        formattedNow,
        formattedNow,
        rowContentType,
        rowThumb,
        rowGDoc,
        rowPdf,
        rowProvider,
        rowConfidence
      );
      matrixRowId = res.lastInsertRowid;
    }

    return {
      success: true,
      matrixRowId,
      status: 'armed',
      ruleId,
      instaauto_response: responseData,
      armed_at: formattedNow
    };
  } catch (err) {
    console.error(`[Bridge Service Error]: Failed to reach InstaAuto bridge (${err.message})`);

    const errorPayload = { error: err.message, timestamp: formattedNow };

    // Safely validate foreign keys to prevent constraint violations
    let safeMediaAssetId = null;
    if (mediaAssetId) {
      try {
        const ma = db.prepare('SELECT id FROM media_assets WHERE id = ?').get(mediaAssetId);
        if (ma) safeMediaAssetId = ma.id;
      } catch (e) {}
    }

    let safeDeliverableId = null;
    if (deliverableId) {
      try {
        const del = db.prepare('SELECT id FROM deliverables WHERE id = ?').get(deliverableId);
        if (del) safeDeliverableId = del.id;
      } catch (e) {}
    }

    const mediaRow = safeMediaAssetId ? db.prepare('SELECT * FROM media_assets WHERE id = ?').get(safeMediaAssetId) : null;
    const delivRow = safeDeliverableId ? db.prepare('SELECT * FROM deliverables WHERE id = ?').get(safeDeliverableId) : null;
    const campRow = delivRow?.campaign_id ? db.prepare('SELECT * FROM research_campaigns WHERE id = ?').get(delivRow.campaign_id) : null;

    const rowContentType = contentType || (mediaRow?.aspect_ratio === '9:16' ? 'reel' : 'image');
    const rowThumb = mediaRow?.thumbnail_url || mediaRow?.image_url || '';
    const rowPdf = delivRow?.pdf_url || '';
    const rowGDoc = delivRow?.google_doc_url || '';
    const rowProvider = campRow?.provider || '';
    const rowConfidence = campRow?.confidence_score || 0.85;

    if (matrixRowId) {
      db.prepare(`
        UPDATE deliverables_matrix
        SET status = 'published',
            instaauto_response = ?,
            content_type = ?,
            thumbnail_url = COALESCE(NULLIF(?, ''), thumbnail_url),
            google_doc_url = COALESCE(NULLIF(?, ''), google_doc_url),
            pdf_url = COALESCE(NULLIF(?, ''), pdf_url),
            provider = COALESCE(NULLIF(?, ''), provider),
            confidence_score = ?
        WHERE id = ?
      `).run(JSON.stringify(errorPayload), rowContentType, rowThumb, rowGDoc, rowPdf, rowProvider, rowConfidence, matrixRowId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO deliverables_matrix (
          media_asset_id, deliverable_id, topic, lead_magnet_title, trigger_keyword,
          deliverable_url, ig_media_id, ig_permalink, caption, status,
          instaauto_rule_id, instaauto_response, created_at, armed_at,
          content_type, thumbnail_url, google_doc_url, pdf_url, provider, confidence_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = insertStmt.run(
        safeMediaAssetId,
        safeDeliverableId,
        topic || leadMagnetTitle,
        leadMagnetTitle,
        triggerKeyword,
        deliverableUrl,
        igMediaId,
        igPermalink,
        caption,
        'published',
        null,
        JSON.stringify(errorPayload),
        formattedNow,
        null,
        rowContentType,
        rowThumb,
        rowGDoc,
        rowPdf,
        rowProvider,
        rowConfidence
      );
      matrixRowId = res.lastInsertRowid;
    }

    return {
      success: false,
      matrixRowId,
      status: 'published',
      error: err.message,
      note: 'InstaAuto was unreachable or returned an error. Post is saved in Virtual Sheet and can be retried.'
    };
  }
}

/**
 * High-Scale Batch Dispatch to InstaAuto
 */
async function pushBatchToInstaAutoBridge(posts) {
  const batchUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge').replace('/bridge', '/bridge/batch');

  console.log(`[Bridge Service] 📦 Dispatching batch of ${posts.length} posts to: ${batchUrl}`);
  try {
    const res = await axios.post(batchUrl, { posts }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    return { success: true, ...res.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  pushToInstaAutoBridge,
  pushBatchToInstaAutoBridge
};
