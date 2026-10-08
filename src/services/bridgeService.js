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

    // Sync instagram_posts table if igMediaId is present
    if (igMediaId) {
      try {
        db.prepare(`
          UPDATE instagram_posts 
          SET instaauto_rule_id = ?, 
              instaauto_status = 'armed' 
          WHERE ig_media_id = ?
        `).run(ruleId ? String(ruleId) : null, igMediaId);
      } catch (postSyncErr) {}
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
        SET status = 'pending_bridge',
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
        'pending_bridge',
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

    // Also mark pending in instagram_posts
    if (igMediaId) {
      try {
        db.prepare(`
          UPDATE instagram_posts 
          SET instaauto_status = 'pending_bridge' 
          WHERE ig_media_id = ?
        `).run(igMediaId);
      } catch (e) {}
    }

    return {
      success: false,
      matrixRowId,
      status: 'pending_bridge',
      error: err.message,
      note: 'InstaAuto was unreachable. Post is queued with status pending_bridge and can be retried.'
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

/**
 * Health check for InstaAuto (Port 3000)
 */
async function checkInstaAutoHealth() {
  const bridgeUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');
  const baseUrl = bridgeUrl.replace(/\/api\/agent\/bridge.*$/, '');
  const db = getDb();

  let pendingCount = 0;
  let armedCount = 0;
  try {
    const rowPending = db.prepare("SELECT COUNT(*) as count FROM deliverables_matrix WHERE status = 'pending_bridge'").get();
    pendingCount = rowPending?.count || 0;
    const rowArmed = db.prepare("SELECT COUNT(*) as count FROM deliverables_matrix WHERE status = 'armed'").get();
    armedCount = rowArmed?.count || 0;
  } catch (e) {}

  try {
    const res = await axios.get(`${baseUrl}/api/agent/status`, { timeout: 3500 });
    const data = res.data || {};
    return {
      online: true,
      port: 3000,
      engine: data.engine || 'InstaAuto External Sentinel & Bridge Engine',
      version: data.version || '2.1.0',
      autoPilot: Boolean(data.autoPilot),
      mode: data.mode || 'high_scale_external_listener',
      capabilities: data.capabilities || [],
      pendingDeliverablesCount: pendingCount,
      armedDeliverablesCount: armedCount
    };
  } catch (err) {
    return {
      online: false,
      port: 3000,
      error: err.message,
      pendingDeliverablesCount: pendingCount,
      armedDeliverablesCount: armedCount
    };
  }
}

/**
 * Retries all deliverables currently pending bridge dispatch
 */
async function retryPendingBridgeDeliverables() {
  const db = getDb();
  const pending = db.prepare(`
    SELECT * FROM deliverables_matrix 
    WHERE (status = 'pending_bridge' OR (status = 'published' AND (instaauto_rule_id IS NULL OR instaauto_rule_id = '')))
      AND ig_media_id IS NOT NULL AND ig_media_id != ''
  `).all();

  console.log(`[Bridge Service] 🔄 Retrying ${pending.length} pending deliverables to InstaAuto...`);
  const results = [];
  for (const item of pending) {
    try {
      const res = await pushToInstaAutoBridge({
        matrixRowId: item.id,
        mediaAssetId: item.media_asset_id,
        deliverableId: item.deliverable_id,
        topic: item.topic,
        leadMagnetTitle: item.lead_magnet_title,
        triggerKeyword: item.trigger_keyword,
        deliverableUrl: item.deliverable_url,
        igMediaId: item.ig_media_id,
        igPermalink: item.ig_permalink,
        caption: item.caption,
        contentType: item.content_type
      });
      results.push({ id: item.id, igMediaId: item.ig_media_id, success: res.success, ruleId: res.ruleId });
    } catch (err) {
      results.push({ id: item.id, igMediaId: item.ig_media_id, success: false, error: err.message });
    }
  }

  return {
    total: pending.length,
    armed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results
  };
}

/**
 * Manually arms any single post or candidate in InstaAuto on demand
 */
async function armSinglePostToBridge({ postId, igMediaId, triggerKeyword, deliverableUrl, caption, title }) {
  const db = getDb();
  let post = null;
  if (postId) {
    post = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(postId);
  } else if (igMediaId) {
    post = db.prepare('SELECT * FROM instagram_posts WHERE ig_media_id = ?').get(igMediaId);
  }

  const effectiveIgMediaId = igMediaId || post?.ig_media_id;
  if (!effectiveIgMediaId) {
    throw new Error('A valid Instagram media_id is required to arm a rule in InstaAuto');
  }

  const effectiveKeyword = triggerKeyword || post?.trigger_keyword || 'PROJECT';
  const effectiveUrl = deliverableUrl || post?.deliverable_url || post?.pdf_url || '';
  const effectiveCaption = caption || post?.caption || `Comment "${effectiveKeyword}" for the link!`;
  const effectiveTitle = title || post?.hook_text || 'Resource Link';

  return await pushToInstaAutoBridge({
    mediaAssetId: post?.id || null,
    deliverableId: post?.deliverable_id || null,
    topic: effectiveTitle,
    leadMagnetTitle: effectiveTitle,
    triggerKeyword: effectiveKeyword,
    deliverableUrl: effectiveUrl,
    igMediaId: effectiveIgMediaId,
    igPermalink: post?.ig_permalink || `https://www.instagram.com/p/${effectiveIgMediaId}/`,
    caption: effectiveCaption,
    contentType: post?.content_type || 'reel'
  });
}

module.exports = {
  pushToInstaAutoBridge,
  pushBatchToInstaAutoBridge,
  checkInstaAutoHealth,
  retryPendingBridgeDeliverables,
  armSinglePostToBridge
};
