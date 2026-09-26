const express = require('express');
const router = express.Router();
const path = require('path');
const { getDb } = require('../database');
const { renderDeliverableHtml } = require('../services/deliverableService');
const { generatePDF } = require('../services/pdfService');
const { pushToGoogleDocs, isGoogleDocsEnabled } = require('../services/googleDocsMcp');

/**
 * Helper to render authentic Extracted Creator Resource landing page
 */
function renderExtractedResourceHtml({ deliverable, post }) {
  const title = (deliverable && deliverable.title) || (post && post.hook_text) || 'Extracted Creator Resource';
  let resources = [];
  if (post && post.extracted_resources) {
    try {
      resources = typeof post.extracted_resources === 'string' ? JSON.parse(post.extracted_resources) : post.extracted_resources;
    } catch (e) { resources = []; }
  }

  // Determine primary direct link
  let primaryLink = '';
  if (post && post.deliverable_url && post.deliverable_url.startsWith('http') && !post.deliverable_url.includes('/docs/')) {
    primaryLink = post.deliverable_url;
  } else if (resources.length > 0 && resources[0].url) {
    primaryLink = resources[0].url;
  }

  const isPdf = Boolean(post?.pdf_url || (primaryLink && (primaryLink.toLowerCase().endsWith('.pdf') || primaryLink.toLowerCase().includes('.pdf?'))));
  const caption = post?.caption || '';
  const triggerKeyword = post?.trigger_keyword || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Extracted Resource</title>
  <style>
    :root {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --accent: #10B981;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text-main); min-height: 100vh; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; }
    .container { width: 100%; max-width: 760px; margin: 0 auto; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .logo-badge { font-weight: 800; font-size: 0.9rem; color: #10B981; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
    .pulse-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); margin-bottom: 1.5rem; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 1rem; }
    h1 { font-size: 1.75rem; font-weight: 800; line-height: 1.3; margin-bottom: 0.75rem; color: #FFF; }
    .subtitle { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5; }
    .primary-cta-box { background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10B981; border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem; }
    .cta-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #10B981; color: #0F172A; font-weight: 800; font-size: 1.05rem; padding: 0.9rem 2rem; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: transform 0.15s ease; }
    .cta-button:hover { transform: translateY(-2px); }
    .url-text { font-family: monospace; font-size: 0.8rem; color: #94A3B8; margin-top: 0.75rem; word-break: break-all; }
    .section-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; color: #FFF; display: flex; align-items: center; gap: 8px; }
    .resource-item { background: #0F172A; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .res-title { font-weight: 700; font-size: 0.95rem; color: #FFF; }
    .res-platform { font-size: 0.75rem; color: #10B981; margin-top: 2px; }
    .res-btn { background: #334155; color: #FFF; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 700; white-space: nowrap; }
    .res-btn:hover { background: #475569; }
    .caption-box { background: #0F172A; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap; max-height: 180px; overflow-y: auto; margin-top: 1rem; }
    .footer { text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="logo-badge">
        <span class="pulse-dot"></span>
        <span>OMNISTUDIO AI • CREATOR RESOURCES</span>
      </div>
      <a href="/" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: none;">← Return to Studio</a>
    </div>

    <div class="card">
      <span class="badge">
        ${isPdf ? '📄 Extracted Creator PDF Document' : '🔗 Extracted Creator Resource Link'}
      </span>

      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">
        ${isPdf 
          ? 'This is the PDF extracted from this resource, reel or post. It contains all creator documentation and materials.' 
          : 'This is the link extracted from the creator post. It has all the content and resources posted for this topic.'}
      </p>

      ${primaryLink ? `
        <div class="primary-cta-box">
          <a href="${escapeHtml(primaryLink)}" target="_blank" class="cta-button">
            <span>${isPdf ? '📄 Download / Open Extracted PDF' : '👉 Open Extracted Resource Link'}</span>
            <span>↗</span>
          </a>
          <div class="url-text">${escapeHtml(primaryLink)}</div>
        </div>
      ` : ''}

      ${resources.length > 0 ? `
        <div style="margin-top: 1.5rem;">
          <h2 class="section-title">
            <span>📚</span>
            <span>All ${resources.length} Extracted Resources & Links</span>
          </h2>
          ${resources.map((r, i) => `
            <div class="resource-item">
              <div>
                <div class="res-title">#${i + 1} ${escapeHtml(r.title)}</div>
                <div class="res-platform">${escapeHtml(r.platform || 'Verified Portal')} • ${escapeHtml(r.description || 'Direct Link')}</div>
              </div>
              <a href="${escapeHtml(r.url)}" target="_blank" class="res-btn">
                Visit Link ↗
              </a>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${caption ? `
        <div style="margin-top: 1.5rem;">
          <h3 class="section-title" style="font-size: 0.95rem;">
            <span>📝</span>
            <span>Creator Post Context & Caption</span>
          </h3>
          <div class="caption-box">${escapeHtml(caption)}</div>
        </div>
      ` : ''}

      ${triggerKeyword ? `
        <div style="margin-top: 1.25rem; font-size: 0.78rem; color: #10B981; font-weight: 700;">
          🤖 Automated DM Delivery Armed for Keyword: "${escapeHtml(triggerKeyword)}"
        </div>
      ` : ''}
    </div>

    <div class="footer">
      Autonomous Instagram Content & Lead-Magnet Delivery Engine
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * GET /api/docs/:campaignId/pdf — Direct redirect to authentic extracted PDF/resource
 */
router.get('/:campaignId/pdf', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    if (isNaN(campaignId)) return res.status(400).json({ error: 'Invalid campaign ID' });

    const db = getDb();
    // Check if linked to an Instagram post with authentic external link or PDF
    const post = db.prepare('SELECT deliverable_url, pdf_url FROM instagram_posts WHERE campaign_id = ? OR deliverable_url LIKE ? OR pdf_url LIKE ? LIMIT 1').get(campaignId, `%/docs/%`, `%/api/docs/${campaignId}/pdf`);
    
    if (post) {
      if (post.pdf_url && post.pdf_url.startsWith('http')) {
        return res.redirect(post.pdf_url);
      }
      if (post.deliverable_url && post.deliverable_url.startsWith('http') && !post.deliverable_url.includes('/docs/')) {
        return res.redirect(post.deliverable_url);
      }
    }

    // Fallback: If legacy whitepaper exists on disk, send it; otherwise send clean 404
    const result = await generatePDF(campaignId);
    if (!result.success) {
      return res.status(404).json({ error: 'No extracted PDF or deliverable found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.sendFile(result.absolutePath);
  } catch (err) {
    console.error('[PDF Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/docs/:campaignId/carousel — Get or generate Instagram 4:5 carousel slides
 */
router.get('/:campaignId/carousel', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    if (isNaN(campaignId)) return res.status(400).json({ error: 'Invalid campaign ID' });

    const db = getDb();
    const campaign = db.prepare('SELECT * FROM research_campaigns WHERE id = ?').get(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const deliverable = db.prepare('SELECT * FROM deliverables WHERE campaign_id = ?').get(campaignId);
    const { generateCarouselSlides } = require('../services/carouselEngine');

    let result = null;
    try {
      result = await generateCarouselSlides(campaign, deliverable || {});
    } catch (e) {
      console.warn('[Carousel Generation Warning]:', e.message);
    }

    const slideList = result && result.slides ? result.slides.map((url, idx) => ({ index: idx + 1, url })) : [];

    res.json({
      success: true,
      campaignId,
      slidesCount: slideList.length,
      slides: slideList
    });
  } catch (err) {
    console.error('[Carousel Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/docs/:deliverableId/push-gdocs — Push deliverable to Google Docs
 */
router.post('/:deliverableId/push-gdocs', async (req, res) => {
  try {
    const deliverableId = parseInt(req.params.deliverableId);
    if (isNaN(deliverableId)) return res.status(400).json({ error: 'Invalid deliverable ID' });

    const result = await pushToGoogleDocs(deliverableId);
    res.json(result);
  } catch (err) {
    console.error('[Google Docs Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/docs/:deliverableId/gdocs-link — Get Google Docs public link
 */
router.get('/:deliverableId/gdocs-link', (req, res) => {
  try {
    const deliverableId = parseInt(req.params.deliverableId);
    const db = getDb();
    const deliverable = db.prepare('SELECT google_doc_id, google_doc_url FROM deliverables WHERE id = ?').get(deliverableId);
    
    if (!deliverable || !deliverable.google_doc_url) {
      return res.json({ success: false, error: 'No Google Doc linked' });
    }

    res.json({
      success: true,
      docId: deliverable.google_doc_id,
      docUrl: deliverable.google_doc_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/docs/gdocs-status — Check if Google Docs integration is enabled
 */
router.get('/gdocs-status', (req, res) => {
  res.json({ enabled: isGoogleDocsEnabled() });
});

/**
 * GET /docs/:slug
 * Public reader view for extracted creator resources
 */
router.get('/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const db = getDb();

    const deliverable = db.prepare('SELECT * FROM deliverables WHERE slug = ?').get(slug);

    if (!deliverable) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Resource Not Found</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 4rem; background: #0F172A; color: #F8FAFC;">
          <h1>404 — Extracted Resource Not Found</h1>
          <p style="color: #94A3B8; margin: 1rem 0;">The companion resource you are looking for does not exist or has been moved.</p>
          <a href="/" style="color: #10B981; text-decoration: none; font-weight: bold;">Return to Studio</a>
        </body>
        </html>
      `);
    }

    // Increment views count
    db.prepare('UPDATE deliverables SET views_count = views_count + 1 WHERE id = ?').run(deliverable.id);
    deliverable.views_count += 1;

    // Check if this deliverable is tied to an Instagram post
    const post = db.prepare('SELECT * FROM instagram_posts WHERE deliverable_url LIKE ? OR campaign_id = ? LIMIT 1').get(`%${slug}%`, deliverable.campaign_id);

    // Direct redirect if requested or if authentic external resource is available
    if (req.query.direct === 'true' && post && post.deliverable_url && post.deliverable_url.startsWith('http') && !post.deliverable_url.includes('/docs/')) {
      return res.redirect(post.deliverable_url);
    }

    // Render Clean Extracted Creator Resource Landing View
    const html = renderExtractedResourceHtml({ deliverable, post });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Docs Route Error]:', err);
    res.status(500).send('Internal Server Error rendering document.');
  }
});

module.exports = router;

