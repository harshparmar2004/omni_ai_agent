const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { publishReelToInstagram, publishImageToInstagram, publishCarouselToInstagram } = require('../services/instagramPublisher');
const { pushToInstaAutoBridge } = require('../services/bridgeService');
const { conductDeepResearch } = require('../services/researchService');
const { generateDeliverable } = require('../services/deliverableService');
const { generateReelMedia } = require('../services/mediaService');
const { generatePDF } = require('../services/pdfService');
const { pushToGoogleDocs, isGoogleDocsEnabled } = require('../services/googleDocsMcp');

/**
 * POST /api/publish/instagram — Publish Reel to Instagram + Bridge
 */
router.post('/instagram', async (req, res) => {
  try {
    const { media_asset_id, deliverable_id, caption, topic, lead_magnet_title } = req.body || {};
    const db = getDb();

    let asset = null;
    let deliverable = null;

    if (media_asset_id) {
      asset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(media_asset_id);
    }
    if (deliverable_id || asset?.deliverable_id) {
      const dId = deliverable_id || asset.deliverable_id;
      deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(dId);
    }

    const activeCaption = caption || asset?.caption || 'Comment below to get the full architecture guide!';
    const videoUrl = asset?.video_url || '/generated/reels/test_reel.mp4';
    const coverUrl = asset?.image_url || '/generated/images/test.png';
    const activeTopic = topic || deliverable?.title || 'Autonomous AI Architecture';
    const activeLeadTitle = lead_magnet_title || deliverable?.title || activeTopic;
    const triggerKeyword = asset?.trigger_keyword || 'DRAG';
    const deliverableUrl = deliverable?.public_url || 'http://localhost:4000/docs/autonomous-guide';

    const pubResult = await publishReelToInstagram({ videoUrl, caption: activeCaption, coverUrl });

    const bridgeResult = await pushToInstaAutoBridge({
      mediaAssetId: asset?.id || null,
      deliverableId: deliverable?.id || null,
      topic: activeTopic,
      leadMagnetTitle: activeLeadTitle,
      triggerKeyword: triggerKeyword,
      deliverableUrl: deliverableUrl,
      igMediaId: pubResult.ig_media_id,
      igPermalink: pubResult.permalink,
      caption: activeCaption
    });

    res.json({
      success: true,
      message: `Reel published (#${pubResult.ig_media_id}) and ${bridgeResult.success ? 'armed in InstaAuto!' : 'saved in Virtual Sheet!'}`,
      publish: pubResult,
      bridge: bridgeResult
    });
  } catch (err) {
    console.error('[Publish Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/publish/image — Publish Image Post to Instagram + Bridge
 */
router.post('/image', async (req, res) => {
  try {
    const { media_asset_id, deliverable_id, caption } = req.body || {};
    const db = getDb();

    let asset = media_asset_id ? db.prepare('SELECT * FROM media_assets WHERE id = ?').get(media_asset_id) : null;
    let deliverable = null;
    if (deliverable_id || asset?.deliverable_id) {
      deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(deliverable_id || asset?.deliverable_id);
    }

    const imageUrl = asset?.thumbnail_url || asset?.image_url || '/generated/images/test.png';
    const activeCaption = caption || asset?.caption || 'Check out this research!';

    const pubResult = await publishImageToInstagram({ imageUrl, caption: activeCaption });

    // Bridge to InstaAuto
    const bridgeResult = await pushToInstaAutoBridge({
      mediaAssetId: asset?.id || null,
      deliverableId: deliverable?.id || null,
      topic: deliverable?.title || 'Research Post',
      leadMagnetTitle: deliverable?.title || 'Research Guide',
      triggerKeyword: asset?.trigger_keyword || 'GUIDE',
      deliverableUrl: deliverable?.public_url || '',
      igMediaId: pubResult.ig_media_id,
      igPermalink: pubResult.permalink,
      caption: activeCaption,
      contentType: 'image'
    });

    res.json({
      success: true,
      message: `Image post published (#${pubResult.ig_media_id})!`,
      publish: pubResult,
      bridge: bridgeResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/publish/carousel — Publish Carousel to Instagram + Bridge
 */
router.post('/carousel', async (req, res) => {
  try {
    const { media_asset_id, deliverable_id, caption, image_urls } = req.body || {};
    const db = getDb();

    let asset = media_asset_id ? db.prepare('SELECT * FROM media_assets WHERE id = ?').get(media_asset_id) : null;
    let deliverable = null;
    if (deliverable_id || asset?.deliverable_id) {
      deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(deliverable_id || asset?.deliverable_id);
    }

    // Build image URLs array
    let images = image_urls || [];
    if (images.length < 2 && asset) {
      // Auto-generate carousel from the 3 image variants
      images = [
        asset.image_url,
        asset.thumbnail_url || asset.image_url
      ].filter(Boolean);
    }

    if (images.length < 2) {
      return res.status(400).json({ error: 'Carousel requires at least 2 images' });
    }

    const activeCaption = caption || asset?.caption || 'Swipe for the full breakdown!';

    const pubResult = await publishCarouselToInstagram({ imageUrls: images, caption: activeCaption });

    const bridgeResult = await pushToInstaAutoBridge({
      mediaAssetId: asset?.id || null,
      deliverableId: deliverable?.id || null,
      topic: deliverable?.title || 'Research Carousel',
      leadMagnetTitle: deliverable?.title || 'Research Guide',
      triggerKeyword: asset?.trigger_keyword || 'GUIDE',
      deliverableUrl: deliverable?.public_url || '',
      igMediaId: pubResult.ig_media_id,
      igPermalink: pubResult.permalink,
      caption: activeCaption,
      contentType: 'carousel'
    });

    res.json({
      success: true,
      message: `Carousel published (#${pubResult.ig_media_id}) with ${images.length} images!`,
      publish: pubResult,
      bridge: bridgeResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/auto-run — Enhanced One-Click Auto-Pilot
 * Now supports content_type parameter: 'reel', 'image', or 'carousel'
 */
router.post('/auto-run', async (req, res) => {
  const startTime = Date.now();
  try {
    const { topic, niche, depth, provider, model, content_type } = req.body || {};
    const activeTopic = topic && topic.trim() ? topic.trim() : 'Autonomous Multi-Agent Swarms in 2026';
    const activeNiche = niche || 'AI Engineering';
    const activeContentType = content_type || 'reel';

    console.log('\n======================================================');
    console.log(`[Auto-Pilot v2.0] 🚀 Starting Enhanced Pipeline: "${activeTopic}"`);
    console.log(`[Auto-Pilot v2.0] Provider: ${provider || 'default'} | Depth: ${depth || 'deep'} | Type: ${activeContentType}`);
    console.log('======================================================');

    // Stage 1: Deep Research Engine (with provider selection)
    const researchResult = await conductDeepResearch({
      topic: activeTopic,
      niche: activeNiche,
      depth: depth || 'deep',
      provider: provider,
      model: model
    });

    // Stage 2: Deliverable Document Generator
    const deliverable = await generateDeliverable({
      campaignId: researchResult.campaignId,
      title: researchResult.title,
      summary: researchResult.summary,
      key_concepts: researchResult.key_concepts,
      code_snippets: researchResult.code_snippets,
      diagram_mermaid: researchResult.diagram_mermaid,
      diagram_url: researchResult.diagram_url,
      cover_url: researchResult.cover_url,
      banner_url: researchResult.banner_url,
      topic: researchResult.topic
    });

    // Stage 2b: Generate PDF
    let pdfResult = null;
    try {
      pdfResult = await generatePDF(researchResult.campaignId);
      console.log(`[Auto-Pilot v2.0] 📄 PDF generated: ${pdfResult.pdfPath}`);
    } catch (err) {
      console.warn(`[Auto-Pilot v2.0] PDF generation skipped: ${err.message}`);
    }

    // Stage 2c: Push to Google Docs (if enabled)
    let gdocsResult = null;
    if (isGoogleDocsEnabled()) {
      try {
        gdocsResult = await pushToGoogleDocs(deliverable.id);
        console.log(`[Auto-Pilot v2.0] 📝 Google Doc: ${gdocsResult.docUrl}`);
      } catch (err) {
        console.warn(`[Auto-Pilot v2.0] Google Docs push skipped: ${err.message}`);
      }
    }

    // Stage 3: Multi-Modal Media Generation
    const media = await generateReelMedia({
      deliverableId: deliverable.id,
      topic: activeTopic,
      title: deliverable.title,
      summary: researchResult.summary,
      insights: researchResult.key_concepts,
      contentType: activeContentType
    });

    // Stage 4: Publish to Instagram (based on content type)
    let publish;
    if (activeContentType === 'image') {
      publish = await publishImageToInstagram({
        imageUrl: media.image_feed_url || media.image_square_url || media.image_url,
        caption: media.caption
      });
    } else if (activeContentType === 'carousel') {
      publish = await publishCarouselToInstagram({
        imageUrls: [media.image_url, media.image_square_url, media.image_feed_url].filter(Boolean),
        caption: media.caption
      });
    } else {
      publish = await publishReelToInstagram({
        videoUrl: media.video_url,
        caption: media.caption,
        coverUrl: media.image_url
      });
    }

    // Stage 5: Bridge to InstaAuto
    const bridge = await pushToInstaAutoBridge({
      mediaAssetId: media.mediaAssetId,
      deliverableId: deliverable.id,
      topic: activeTopic,
      leadMagnetTitle: deliverable.title,
      triggerKeyword: media.trigger_keyword,
      deliverableUrl: deliverable.public_url,
      igMediaId: publish.ig_media_id,
      igPermalink: publish.permalink,
      caption: media.caption,
      contentType: activeContentType
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Auto-Pilot v2.0] 🏆 Enhanced Pipeline Completed in ${elapsed}s!`);

    res.json({
      success: true,
      elapsedSeconds: elapsed,
      message: `Enhanced Pipeline completed! ${activeContentType} #${publish.ig_media_id} armed with keyword "${media.trigger_keyword}"`,
      pipeline: {
        stage1_research: {
          campaignId: researchResult.campaignId,
          title: researchResult.title,
          provider: researchResult.provider,
          model: researchResult.model,
          confidence: researchResult.confidence_score,
          iterations: researchResult.iterations
        },
        stage2_deliverable: {
          id: deliverable.id,
          slug: deliverable.slug,
          url: deliverable.public_url,
          pdf: pdfResult?.pdfPath || null,
          google_doc: gdocsResult?.docUrl || null
        },
        stage3_media: {
          mediaId: media.mediaAssetId,
          keyword: media.trigger_keyword,
          content_type: activeContentType,
          images: {
            cover916: media.image_url,
            square11: media.image_square_url,
            feed45: media.image_feed_url
          },
          video_url: media.video_url || null
        },
        stage4_publish: {
          ig_media_id: publish.ig_media_id,
          permalink: publish.permalink,
          content_type: publish.content_type
        },
        stage5_bridge: {
          armed: bridge.success,
          ruleId: bridge.ruleId,
          status: bridge.status
        }
      }
    });
  } catch (err) {
    console.error('[Auto-Pilot v2.0 Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
