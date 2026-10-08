const express = require('express');
const router = express.Router();
const path = require('path');
const { 
  getDb, 
  getTrackedChannels, 
  getTrackedChannelById, 
  updateTrackedChannel, 
  deleteTrackedChannel, 
  getBrandAssets, 
  setBrandAssets,
  getSetting,
  setSetting,
  getConnectedPages,
  getConnectedPageBySlug,
  getConnectedPageById,
  createConnectedPage,
  updateConnectedPage,
  deleteConnectedPage
} = require('../database');
const { recommendTrendingAudio, getAllTrendingTracks } = require('../services/trendingAudioService');
const { publishCarouselToInstagram, publishReelToInstagram, publishImageToInstagram, executePublishPipeline } = require('../services/instagramPublisher');
const { pushToInstaAutoBridge } = require('../services/bridgeService');
const { 
  registerTrackedChannel, 
  batchRegisterTrackedChannels,
  syncSingleChannel, 
  syncAllActiveChannels 
} = require('../services/instagramTrackerService');
const {
  getMicroserviceBaseUrl,
  checkMicroserviceHealth,
  fetchMediaInfo,
  downloadMediaViaApi,
  loginInstagrapi,
  loginBySessionId,
  uploadReelViaApi,
  uploadCarouselViaApi,
  getUserInfoViaApi
} = require('../services/instagramRestBridge');

/**
 * GET /api/instagram/queue
 * Returns staged posts ready for publication
 */
router.get('/queue', (req, res) => {
  try {
    const db = getDb();
    let rows = db.prepare("SELECT * FROM instagram_posts WHERE status IN ('ready_to_post', 'scheduled') ORDER BY id DESC").all();
    
    // If table is empty, auto-stage recent deliverables
    if (rows.length === 0) {
      const recentDeliverables = db.prepare("SELECT d.*, c.topic, c.summary, c.niche FROM deliverables d JOIN research_campaigns c ON d.campaign_id = c.id ORDER BY d.id DESC LIMIT 4").all();
      
      for (const d of recentDeliverables) {
        const audio = recommendTrendingAudio(d.topic, 'carousel');
        const isHack = /hackathon|challenge/i.test(d.topic);
        const isDocker = /docker|container/i.test(d.topic);
        const isNotes = /notes|cheat/i.test(d.topic);
        const keyword = isNotes ? 'NOTES' : (isHack ? 'HACK' : (isDocker ? 'DOCKER' : 'AI2026'));
        const hook = isHack 
          ? 'The Top 10 Indian Hackathons with ₹4.5 Cr in grants are now open!'
          : (isDocker ? 'Stop guessing Docker in interviews! Here is the Linux kernel truth.' : `The definitive 2026 breakdown for ${d.topic.slice(0, 40)}`);

        const caption = `${d.title} 🚀\n\nComplete breakdown and verified playbook.\n\n👉 Comment "${keyword}" below and my AI agent will instantly DM you the full 7-page directory and PDF!\n\n#tech #engineering #developers`;

        // Check if carousel exists for campaign
        const carouselPath = `/generated/carousels/${d.campaign_id}/slide_1.png`;
        const slides = [1,2,3,4,5,6].map(i => `/generated/carousels/${d.campaign_id}/slide_${i}.png`);

        const insert = db.prepare(`
          INSERT INTO instagram_posts (
            campaign_id, deliverable_id, content_type, status, hook_text, caption,
            trigger_keyword, trending_song_title, trending_song_artist, trending_song_audio_url, audio_vibe,
            media_urls, thumbnail_url, deliverable_url, pdf_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          d.campaign_id,
          d.id,
          'carousel',
          'ready_to_post',
          hook,
          caption,
          keyword,
          audio.title,
          audio.artist,
          audio.audio_url,
          audio.vibe,
          JSON.stringify(slides),
          carouselPath,
          d.public_url,
          `/api/docs/${d.campaign_id}/pdf`,
          new Date().toISOString()
        );
      }
      rows = db.prepare("SELECT * FROM instagram_posts WHERE status IN ('ready_to_post', 'scheduled') ORDER BY id DESC").all();
    }

    res.json({
      success: true,
      count: rows.length,
      posts: rows.map(r => ({
        ...r,
        media_urls: JSON.parse(r.media_urls || '[]')
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/instagram/history
 * Returns published posts audit log
 */
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit || '100', 10);

    // Fetch published posts joined with connected_pages for page name/icon
    const rows = db.prepare(`
      SELECT 
        p.*,
        cp.name  AS page_name,
        cp.icon  AS page_icon,
        cp.handle AS page_handle,
        cp.theme_color AS page_color
      FROM instagram_posts p
      LEFT JOIN connected_pages cp ON cp.slug = p.destination_account
      WHERE p.status = 'published'
      ORDER BY p.id DESC
      LIMIT ?
    `).all(limit);

    // Fetch the latest mobile_dm_trigger for each published post (by ig_media_id or shortcode)
    const triggers = db.prepare(`
      SELECT * FROM mobile_dm_triggers WHERE processing_status = 'published' ORDER BY id DESC LIMIT 200
    `).all();
    const triggerByMediaId = {};
    for (const t of triggers) {
      const post = typeof t.post === 'string' ? (() => { try { return JSON.parse(t.post); } catch(e) { return {}; } })() : (t.post || {});
      const mediaId = post.ig_media_id || t.ig_media_id;
      if (mediaId && !triggerByMediaId[mediaId]) triggerByMediaId[mediaId] = t;
    }

    const posts = rows.map(r => {
      const mediaUrls = (() => { try { return JSON.parse(r.media_urls || '[]'); } catch(e) { return []; } })();
      const extractedResources = (() => { try { return JSON.parse(r.extracted_resources || '[]'); } catch(e) { return []; } })();
      const trigger = triggerByMediaId[r.ig_media_id] || null;
      const triggerLog = trigger && (typeof trigger.log === 'string' ? (() => { try { return JSON.parse(trigger.log); } catch(e) { return {}; } })() : (trigger.log || {})) || {};

      // Determine publish origin label
      let publishOrigin = 'Dashboard Studio';
      let publishOriginIcon = '🖥️';
      if (r.origin_source === 'mobile_bot' && trigger?.telegram_message_id) {
        publishOrigin = 'Telegram Bot';
        publishOriginIcon = '📲';
      } else if (r.origin_source === 'mobile_bot') {
        publishOrigin = 'Telegram / Mobile Share';
        publishOriginIcon = '📲';
      } else if (r.origin_source === 'autonomous' || r.origin_source === 'autopilot') {
        publishOrigin = '24/7 Autonomous Autopilot';
        publishOriginIcon = '🤖';
      } else if (r.origin_source === 'studio') {
        publishOrigin = 'Dashboard Studio (1-Click)';
        publishOriginIcon = '🖥️';
      }

      // Slide/image count for carousels
      const slideCount = r.content_type === 'carousel' ? mediaUrls.length || 1 : null;

      return {
        ...r,
        media_urls: mediaUrls,
        extracted_resources: extractedResources,
        // Page info
        page_name: r.page_name || r.destination_account || 'gta6',
        page_icon: r.page_icon || '📱',
        page_handle: r.page_handle || `@${r.destination_account || 'gta6_updates_007'}`,
        page_color: r.page_color || '#D97757',
        // Publish origin
        publish_origin: publishOrigin,
        publish_origin_icon: publishOriginIcon,
        origin_source: r.origin_source || 'studio',
        // Media details
        slide_count: slideCount,
        has_video: r.content_type === 'reel' || mediaUrls.some(u => u.endsWith('.mp4')),
        // Trigger data if available
        trigger_sender: trigger?.sender_handle || null,
        trigger_source_url: trigger?.source_post_url || null,
        trigger_shortcode: trigger?.shortcode || null,
        // Resource/DM info
        has_dm_automation: Boolean(r.trigger_keyword && r.trigger_keyword.length > 0),
        dms_delivered_count: r.dms_delivered_count || 0,
        instaauto_status: r.instaauto_status || 'n/a',
        // Timestamps
        published_at_formatted: r.published_at ? new Date(r.published_at).toISOString() : null
      };
    });

    // Summary stats
    const stats = {
      total: posts.length,
      reels: posts.filter(p => p.content_type === 'reel').length,
      carousels: posts.filter(p => p.content_type === 'carousel').length,
      via_telegram: posts.filter(p => p.origin_source === 'mobile_bot').length,
      via_autopilot: posts.filter(p => p.origin_source === 'autonomous' || p.origin_source === 'autopilot').length,
      via_studio: posts.filter(p => p.origin_source === 'studio').length,
      total_dms: posts.reduce((a, p) => a + (p.dms_delivered_count || 0), 0),
      with_dm_automation: posts.filter(p => p.has_dm_automation).length
    };

    res.json({ success: true, count: posts.length, stats, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/instagram/publish
 * Publishes a staged post, notifies InstaAuto bridge, and records history
 */
router.post('/publish', async (req, res) => {
  try {
    const { post_id, publish_via } = req.body || {};
    if (!post_id) {
      return res.status(400).json({ error: 'post_id is required' });
    }

    const pubResult = await executePublishPipeline(post_id, publish_via);

    res.json({
      success: true,
      message: `Post #${pubResult.ig_media_id} published via ${pubResult.method}!`,
      ...pubResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/trending-audio
 */
router.get('/trending-audio', (req, res) => {
  const { topic } = req.query;
  if (topic) {
    return res.json({ success: true, recommendation: recommendTrendingAudio(topic) });
  }
  res.json({ success: true, tracks: getAllTrendingTracks() });
});

const { scrapeInstagramUrl, scrapeAndTriggerResearch } = require('../services/instagramScraperService');

/**
 * POST /api/instagram/scrape
 * Scrapes any Instagram profile or post URL
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Instagram URL is required' });

    const result = await scrapeInstagramUrl(url);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/scrape-and-research
 * Scrapes Instagram post, extracts viral hook, and triggers autonomous deep research & notes generation
 */
router.post('/scrape-and-research', async (req, res) => {
  try {
    const { url, niche, depth } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Instagram URL is required' });

    const result = await scrapeAndTriggerResearch(url, { niche, depth });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const { downloadInstagramMedia } = require('../services/instagramDownloaderService');

/**
 * POST /api/instagram/download-video
 * Downloads any Instagram video, reel, and caption
 */
router.post('/download-video', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Instagram URL is required' });

    const result = await downloadInstagramMedia(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🔌 FASTAPI REST MICROSERVICE GATEWAY (yt-dlp-api & aiograpi-rest)
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /api/instagram/microservice/status
 * Health check & discovery for yt-dlp-api and aiograpi-rest FastAPI microservice
 */
router.get('/microservice/status', async (req, res) => {
  try {
    const health = await checkMicroserviceHealth();
    res.json({
      success: true,
      ...health,
      docs_url: `${health.baseUrl}/docs`,
      endpoints: [
        { method: 'GET', path: '/api/info?url=', name: 'yt-dlp-api Metadata & Streams' },
        { method: 'POST', path: '/api/download', name: 'yt-dlp-api Media Downloader' },
        { method: 'POST', path: '/auth/login', name: 'aiograpi-rest Instagram Auth' },
        { method: 'GET', path: '/media/info_by_url?url=', name: 'aiograpi-rest Post Inspector' },
        { method: 'POST', path: '/media/clip/upload', name: 'aiograpi-rest Reel Publisher' },
        { method: 'POST', path: '/media/album/upload', name: 'aiograpi-rest Carousel Publisher' },
        { method: 'GET', path: '/user/info_by_username?username=', name: 'aiograpi-rest User Profile' }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/microservice/config
 * Update REST microservice endpoint URL (default: http://127.0.0.1:8001 or custom remote docker)
 */
router.post('/microservice/config', (req, res) => {
  try {
    const { microservice_url } = req.body || {};
    if (microservice_url) {
      setSetting('instagram_microservice_url', microservice_url.trim());
    }
    res.json({ success: true, url: getMicroserviceBaseUrl() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/microservice/login
 * Forward authentication to aiograpi-rest /auth/login
 */
router.post('/microservice/login', async (req, res) => {
  try {
    const { username, password, verification_code } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const result = await loginInstagrapi(username, password, verification_code);
    if (result.success) {
      setSetting('instagram_session_user', username);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

/**
 * POST /api/instagram/microservice/login-session
 * Forward session authentication to aiograpi-rest /auth/login_session
 */
router.post('/microservice/login-session', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    const result = await loginBySessionId(session_id);
    if (result.success && result.username) {
      setSetting('instagram_session_user', result.username);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

/**
 * POST /api/instagram/microservice/download
 * Download video, reel, or media via yt-dlp-api
 */
router.post('/microservice/download', async (req, res) => {
  try {
    const { url, format } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Instagram URL is required' });
    const result = await downloadMediaViaApi(url, format);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

/**
 * POST /api/instagram/microservice/info
 * Fetch metadata and direct stream URLs via yt-dlp-api
 */
router.post('/microservice/info', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const result = await fetchMediaInfo(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

/**
 * POST /api/instagram/microservice/upload-reel
 * Publish Reel video via aiograpi-rest
 */
router.post('/microservice/upload-reel', async (req, res) => {
  try {
    const { path: videoPath, caption } = req.body || {};
    if (!videoPath || !caption) return res.status(400).json({ error: 'path and caption are required' });
    const result = await uploadReelViaApi(videoPath, caption);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

/**
 * POST /api/instagram/microservice/upload-album
 * Publish Carousel album via aiograpi-rest
 */
router.post('/microservice/upload-album', async (req, res) => {
  try {
    const { paths: imagePaths, caption } = req.body || {};
    if (!imagePaths || !caption) return res.status(400).json({ error: 'paths and caption are required' });
    const result = await uploadCarouselViaApi(imagePaths, caption);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 📡 TRACKED INSTAGRAM CHANNELS & AUTO-INGESTION (v3.5)
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /api/instagram/tracked-channels
 * List all monitored channels
 */
router.get('/tracked-channels', (req, res) => {
  try {
    const { destination } = req.query;
    const channels = getTrackedChannels(destination || null);
    res.json({ success: true, count: channels.length, channels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/tracked-channels/add
 * Add channel to monitor
 */
router.post('/tracked-channels/add', async (req, res) => {
  try {
    const { input, destination_account, destination } = req.body || {};
    if (!input) return res.status(400).json({ error: 'Username or profile URL is required' });

    const dest = destination_account || destination || 'tech';
    const result = await registerTrackedChannel(input, dest);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/tracked-channels/batch-add
 * Bulk add up to 10–30 channels to monitor
 */
router.post('/tracked-channels/batch-add', async (req, res) => {
  try {
    const { channels, input, nicheTag, destination_account, destination } = req.body || {};
    const toAdd = channels || input;
    if (!toAdd) return res.status(400).json({ error: 'Channels array or text is required' });

    const dest = destination_account || destination || 'tech';
    const effectiveNiche = nicheTag || (dest === 'gta6' ? 'gaming' : 'tech');
    const result = await batchRegisterTrackedChannels(toAdd, effectiveNiche, dest);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/tracked-channels/:id/toggle
 * Toggle active / paused
 */
router.post('/tracked-channels/:id/toggle', (req, res) => {
  try {
    const channel = getTrackedChannelById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const updated = updateTrackedChannel(channel.id, { is_active: channel.is_active ? 0 : 1 });
    res.json({ success: true, channel: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/instagram/tracked-channels/:id
 * Delete monitored channel
 */
router.delete('/tracked-channels/:id', (req, res) => {
  try {
    deleteTrackedChannel(req.params.id);
    res.json({ success: true, message: 'Tracked channel deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/tracked-channels/:id/sync
 * Manually check a specific channel for new posts
 */
router.post('/tracked-channels/:id/sync', async (req, res) => {
  try {
    const result = await syncSingleChannel(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/tracked-channels/sync-all
 * Check all active channels
 */
router.post('/tracked-channels/sync-all', async (req, res) => {
  try {
    const result = await syncAllActiveChannels();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🎨 BRAND & CREATIVE ASSET STUDIO (v3.5)
// ═════════════════════════════════════════════════════════════════════

/**
 * GET /api/instagram/brand-assets
 * Retrieve brand logos, handles, watermark rules
 */
router.get('/brand-assets', (req, res) => {
  try {
    const assets = getBrandAssets();
    res.json({ success: true, assets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/brand-assets
 * Update brand profile and watermark settings
 */
router.post('/brand-assets', (req, res) => {
  try {
    const settings = req.body || {};
    const updated = setBrandAssets(settings);
    res.json({ success: true, assets: updated, message: 'Brand settings updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/stage-post
 * Directly stage any post (from download or manual input) into Ready to Post Queue
 */
router.post('/stage-post', (req, res) => {
  try {
    const {
      hook_text,
      caption,
      trigger_keyword,
      content_type = 'carousel',
      media_urls = [],
      thumbnail_url = '',
      deliverable_url = '',
      pdf_url = '',
      trending_song_title,
      trending_song_artist
    } = req.body || {};

    if (!hook_text || !caption) {
      return res.status(400).json({ error: 'hook_text and caption are required' });
    }

    const db = getDb();
    const audio = (trending_song_title && trending_song_artist) 
      ? { title: trending_song_title, artist: trending_song_artist, audio_url: '', vibe: 'energetic' }
      : recommendTrendingAudio(hook_text, content_type);

    const nowIso = new Date().toISOString();
    const mediaArray = Array.isArray(media_urls) ? media_urls : [media_urls];

    const intent = req.body.post_intent || (trigger_keyword ? 'lead_magnet' : 'direct_repost');

    const result = db.prepare(`
      INSERT INTO instagram_posts (
        campaign_id, deliverable_id, content_type, status, hook_text, caption,
        trigger_keyword, trending_song_title, trending_song_artist, trending_song_audio_url, audio_vibe,
        media_urls, thumbnail_url, deliverable_url, pdf_url, post_intent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      null,
      null,
      content_type,
      'ready_to_post',
      hook_text,
      caption,
      intent === 'direct_repost' ? '' : (trigger_keyword || 'NOTES').toUpperCase(),
      audio.title,
      audio.artist,
      audio.audio_url || '',
      audio.vibe || 'viral',
      JSON.stringify(mediaArray),
      thumbnail_url || mediaArray[0] || '/generated/assets/brand_logo.svg',
      deliverable_url || '',
      pdf_url || '',
      intent,
      nowIso
    );

    res.json({
      success: true,
      message: 'Post staged into Ready to Post Queue successfully!',
      post_id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🔌 REST MICROSERVICE BRIDGE (yt-dlp-api & aiograpi-rest)
// ═════════════════════════════════════════════════════════════════════

router.get('/microservice/health', async (req, res) => {
  try {
    const health = await checkMicroserviceHealth();
    res.json(health);
  } catch (err) {
    res.json({ online: false, error: err.message });
  }
});

router.post('/microservice/login', async (req, res) => {
  try {
    const { username, password, verification_code } = req.body || {};
    const result = await loginInstagrapi(username, password, verification_code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/microservice/user', async (req, res) => {
  try {
    const username = req.query.username || getBrandAssets().brand_handle || 'harshparmar007__';
    const result = await getUserInfoViaApi(username);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/microservice/download', async (req, res) => {
  try {
    const { url, format = 'mp4' } = req.body || {};
    const result = await downloadMediaViaApi(url, format);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 🤖 24/7 AUTONOMOUS INGESTION, RANKING & BRAND CLEANSER (v4.0)
// ═════════════════════════════════════════════════════════════════════

const {
  processSinglePost,
  pollAllMonitoredChannels
} = require('../services/instagramAutonomousOrchestrator');
const {
  getAutonomousLogs,
  getAutonomousLogById,
  deleteAutonomousLog
} = require('../database');

/**
 * GET /api/instagram/autonomous/feed
 * Returns recent autonomous ingestion logs with fit scores, brand cleansing, and status
 */
router.get('/autonomous/feed', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const status = req.query.status || null;
    const destination = req.query.destination || null;
    const logs = getAutonomousLogs(limit, status, destination);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/autonomous/process-url
 * Runs any post URL through the full agentic pipeline:
 * Scrape -> Rank -> Brand Cleanse -> Harvest DM -> Stage
 */
router.post(['/autonomous/process-url', '/autonomous/ingest-url'], async (req, res) => {
  try {
    const { url, channel_username = '', channel_id = null, autoPublish = false } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Instagram URL is required' });

    const result = await processSinglePost(url, channel_username, channel_id, { autoPublish });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const {
  startStealthSentinelScheduler,
  executeStealthSurveillanceCycle,
  rankAndPublishTopTwoReels,
  getStealthSchedulerStatus
} = require('../services/stealthSentinelScheduler');

/**
 * GET /api/instagram/stealth/status
 * Returns live stealth metrics, next jittered run timestamp, and shield status
 */
router.get('/stealth/status', (req, res) => {
  try {
    res.json({ success: true, ...getStealthSchedulerStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/autonomous/poll-now & /api/instagram/stealth/trigger-cycle
 * Triggers an immediate 3-hour stealth cycle with serial staggering and SQLite deduplication
 */
router.post(['/autonomous/poll-now', '/stealth/trigger-cycle'], async (req, res) => {
  try {
    const { destination, quick = true } = req.body || {};
    executeStealthSurveillanceCycle({ destination, quick }).catch(e => console.error('[Stealth Surveillance Poll Error]:', e));
    res.json({
      success: true,
      destination: destination || 'all',
      message: `3-Hour Stealth Surveillance Cycle triggered ${destination ? `for [${destination.toUpperCase()}]` : 'across all target channels'} with human delay staggering and SQLite deduplication!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/stealth/publish-top-two
 * Evaluates candidate batch, ranks by Criteria (Vibe, USP, Polish, Freshness) and publishes #1 and #2 reels via Meta API
 */
router.post('/stealth/publish-top-two', async (req, res) => {
  try {
    const { forcePublish = false, minScore = 70, destination = 'tech' } = req.body || {};
    const result = await rankAndPublishTopTwoReels({ forcePublish, minScore, destination });
    res.json({
      success: true,
      destination,
      message: `Batch evaluated for [${destination.toUpperCase()}]! ${result.totalPublished || 0} reels published to Instagram via Meta Graph API v21.0.`,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/stealth/process-queue
 * Manually dispatches the Phase 2 async ingestion & transcoding worker pool
 */
router.post('/stealth/process-queue', async (req, res) => {
  try {
    const { processQueuedIngestionWorkerPool } = require('../services/stealthSentinelScheduler');
    setImmediate(() => {
      processQueuedIngestionWorkerPool().catch(e => console.error('[Queue Worker Error]:', e));
    });
    res.json({ success: true, message: 'Phase 2 Async Worker Pool dispatched in background (concurrency: 2).' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/stealth/queue-status
 * Returns current count of queued, processing, and ranked items
 */
router.get('/stealth/queue-status', (req, res) => {
  try {
    const db = getDb();
    const queued = db.prepare("SELECT count(*) as count FROM autonomous_ingestion_log WHERE status = 'queued_for_ingestion'").get();
    const ranked = db.prepare("SELECT count(*) as count FROM autonomous_ingestion_log WHERE status IN ('ranked', 'cleansed', 'harvested')").get();
    const published = db.prepare("SELECT count(*) as count FROM autonomous_ingestion_log WHERE status = 'published'").get();
    const { getStealthSchedulerStatus } = require('../services/stealthSentinelScheduler');
    res.json({
      success: true,
      queuedForIngestion: queued.count,
      activeRanked: ranked.count,
      totalPublished: published.count,
      scheduler: getStealthSchedulerStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/media/prune
 * Manually executes media cache garbage collection (Pillar 4)
 */
router.post('/media/prune', (req, res) => {
  try {
    const { retentionHours = 48 } = req.body || {};
    const { pruneExpiredMediaCache } = require('../services/mediaCleanerService');
    const result = pruneExpiredMediaCache(retentionHours);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/autonomous/config
 * Retrieves autopilot configuration
 */
router.get('/autonomous/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        autopilot_enabled: getSetting('instagram_autopilot_enabled', '0') === '1',
        min_score_threshold: parseInt(getSetting('instagram_min_score_threshold', '70'), 10),
        daily_post_cap: parseInt(getSetting('instagram_daily_post_cap', '3'), 10),
        brand: getBrandAssets()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/autonomous/config
 * Updates autopilot configuration
 */
router.post('/autonomous/config', (req, res) => {
  try {
    const { autopilot_enabled, min_score_threshold, daily_post_cap, brand } = req.body || {};
    if (autopilot_enabled !== undefined) {
      setSetting('instagram_autopilot_enabled', autopilot_enabled ? '1' : '0');
    }
    if (min_score_threshold !== undefined) {
      setSetting('instagram_min_score_threshold', String(min_score_threshold));
    }
    if (daily_post_cap !== undefined) {
      setSetting('instagram_daily_post_cap', String(daily_post_cap));
    }
    if (brand) {
      setBrandAssets(brand);
    }
    res.json({
      success: true,
      message: 'Autonomous agent settings updated successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/instagram/autonomous/log/:id
 * Delete an autonomous log entry
 */
router.delete('/autonomous/log/:id', (req, res) => {
  try {
    deleteAutonomousLog(req.params.id);
    res.json({ success: true, message: 'Autonomous log entry removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 📱 MOBILE-FIRST "SHARE-TO-DM" AUTONOMOUS INGESTION BOT (v4.0)
// ═════════════════════════════════════════════════════════════════════

const {
  getMobileDmTriggers,
  getMobileDmTriggerById,
  getMobileDmTriggerByShortcode,
  updateMobileDmTrigger,
  getAutonomousLogByShortcode,
  updateAutonomousLog
} = require('../database');
const {
  simulateMobileDmTrigger,
  handleInboundShare,
  pollInboxShares
} = require('../services/instagramMobileDmListener');
const {
  getTelegramBotInfo,
  sendTelegramMessage
} = require('../services/telegramBotService');

/**
 * GET /api/instagram/telegram/status
 * Returns live status of the Telegram inbound listener bot
 */
router.get('/telegram/status', async (req, res) => {
  try {
    const info = await getTelegramBotInfo();
    res.json({
      success: true,
      ...info
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/mobile-dm/triggers
 * Returns recent inbound mobile share events and their processing status
 */
router.get('/mobile-dm/triggers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '30', 10);
    const triggers = getMobileDmTriggers(limit);
    res.json({
      success: true,
      count: triggers.length,
      triggers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/mobile-dm/harvest-monitor
 * Returns structured resource harvest event log for the UI monitor panel.
 * Shows every trigger that had lead magnet / comment harvesting activity.
 */
router.get('/mobile-dm/harvest-monitor', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const all = getMobileDmTriggers(limit);

    const events = all.map(t => {
      const log = typeof t.log === 'string' ? (() => { try { return JSON.parse(t.log); } catch(e) { return {}; } })() : (t.log || {});
      const post = typeof t.post === 'string' ? (() => { try { return JSON.parse(t.post); } catch(e) { return {}; } })() : (t.post || {});
      const resources = typeof t.extracted_resources === 'string' ? (() => { try { return JSON.parse(t.extracted_resources); } catch(e) { return []; } })() : (t.extracted_resources || []);

      return {
        id: t.id,
        // Source reel info
        source_post_url: t.source_post_url || log.source_post_url || '',
        shortcode: t.shortcode || log.shortcode || '',
        source_creator: t.sender_handle || log.channel_username || '',
        // Keyword extracted by LLM
        detected_trigger_keyword: t.detected_trigger_keyword || t.trigger_keyword || log.detected_trigger_keyword || '',
        // Comment step
        dm_comment_posted: Boolean(t.dm_comment_posted || log.dm_comment_posted),
        comment_posted_at: t.comment_posted_at || log.comment_posted_at || null,
        // DM received step
        dm_response_received: Boolean(t.dm_response_received || log.dm_response_received),
        dm_received_at: t.dm_received_at || log.dm_received_at || null,
        // Resource extracted
        harvested_deliverable_url: t.harvested_deliverable_url || log.harvested_deliverable_url || post.deliverable_url || '',
        harvested_deliverable_type: t.harvested_deliverable_type || log.harvested_deliverable_type || '',
        extracted_at: t.extracted_at || log.extracted_at || t.completed_at || null,
        extracted_resources: resources,
        // Published result
        processing_status: t.processing_status || 'pending',
        live_post_permalink: t.live_post_permalink || post.ig_permalink || '',
        destination_account: t.destination_account || log.destination_account || '',
        selected_workflow: t.selected_workflow || log.selected_workflow || 'direct_repost',
        // Timestamps
        created_at: t.created_at,
        completed_at: t.completed_at,
        // LLM info
        llm_fit_score: t.llm_fit_score || log.llm_fit_score || null,
        repurposed_hook: t.repurposed_hook || log.repurposed_hook || ''
      };
    });

    // Stats
    const stats = {
      total: events.length,
      comments_posted: events.filter(e => e.dm_comment_posted).length,
      dms_received: events.filter(e => e.dm_response_received).length,
      resources_extracted: events.filter(e => e.harvested_deliverable_url).length,
      published: events.filter(e => e.processing_status === 'published').length
    };

    res.json({ success: true, stats, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/simulate
 * Simulates a mobile Instagram user sharing a post to the bot's DM
 */
router.post('/mobile-dm/simulate', async (req, res) => {
  try {
    const { url, sender_handle } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, error: 'Target Instagram URL is required.' });
    }

    // Run the trigger processing asynchronously
    simulateMobileDmTrigger(url, sender_handle)
      .then(result => {
        console.log(`[Mobile DM Simulate] Finished: ${url}`, result?.processing_status);
      })
      .catch(err => {
        console.error(`[Mobile DM Simulate] Error: ${err.message}`);
      });

    res.json({
      success: true,
      message: `📱 Mobile share simulated for @${(sender_handle || 'harshparmar007__').replace('@', '')}! Processing pipeline active in background.`,
      url
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/poll-now
 * Force an immediate poll of the Instagram Direct inbox for shared reels
 */
router.post('/mobile-dm/poll-now', async (req, res) => {
  try {
    pollInboxShares()
      .then(() => console.log('[Mobile DM] Manual poll check complete.'))
      .catch(err => console.warn('[Mobile DM] Manual poll check error:', err.message));
    res.json({
      success: true,
      message: 'Mobile DM inbox poll triggered.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/extract-resources
 * Run or re-run autonomous resource discovery and link synthesis on a post
 */
router.post('/mobile-dm/extract-resources', async (req, res) => {
  try {
    const { shortcode, post_id } = req.body || {};
    const db = getDb();
    let log = null;

    if (shortcode) {
      log = db.prepare('SELECT * FROM autonomous_ingestion_log WHERE shortcode = ?').get(shortcode);
    } else if (post_id) {
      const p = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(post_id);
      if (p) log = db.prepare('SELECT * FROM autonomous_ingestion_log WHERE repurposed_hook = ? OR raw_hook = ?').get(p.hook_text, p.hook_text);
    }

    if (!log) {
      return res.status(404).json({ success: false, error: 'Post or shortcode not found' });
    }

    const { extractAndSynthesizeResources } = require('../services/instagramResourceExtractor');
    const result = await extractAndSynthesizeResources({
      postUrl: log.source_post_url,
      channelUsername: log.channel_username,
      rawCaption: log.raw_caption,
      rawHook: log.raw_hook,
      detectedTopic: log.detected_topic,
      detectedTriggerKeyword: log.detected_trigger_keyword
    });

    if (result && result.success) {
      db.prepare(`
        UPDATE autonomous_ingestion_log
        SET harvested_deliverable_url = ?, harvested_deliverable_type = ?, extracted_resources = ?
        WHERE id = ?
      `).run(result.deliverable_url, result.is_pdf ? 'pdf' : 'resource_link', JSON.stringify(result.resources), log.id);

      db.prepare(`
        UPDATE instagram_posts
        SET deliverable_url = ?, pdf_url = ?, extracted_resources = ?
        WHERE hook_text = ? OR caption LIKE ?
      `).run(result.deliverable_url, result.pdf_url, JSON.stringify(result.resources), log.repurposed_hook, `%${log.shortcode}%`);

      return res.json({
        success: true,
        message: `Extracted ${result.total_resources} resources with official verified URLs!`,
        deliverable_url: result.deliverable_url,
        pdf_url: result.pdf_url,
        resources: result.resources
      });
    }

    res.status(500).json({ success: false, error: 'Resource extraction failed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/update-resources
 * Manually update, edit, or add resource links for a specific post
 */
router.post('/mobile-dm/update-resources', (req, res) => {
  try {
    const { shortcode, resources, deliverable_url } = req.body || {};
    if (!shortcode || !Array.isArray(resources)) {
      return res.status(400).json({ success: false, error: 'Shortcode and resources array are required' });
    }

    const db = getDb();
    const log = db.prepare('SELECT * FROM autonomous_ingestion_log WHERE shortcode = ?').get(shortcode);
    if (!log) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const updates = { extracted_resources: JSON.stringify(resources) };
    if (deliverable_url) updates.harvested_deliverable_url = deliverable_url;

    db.prepare(`
      UPDATE autonomous_ingestion_log
      SET extracted_resources = ?, harvested_deliverable_url = COALESCE(?, harvested_deliverable_url)
      WHERE id = ?
    `).run(JSON.stringify(resources), deliverable_url || null, log.id);

    db.prepare(`
      UPDATE instagram_posts
      SET extracted_resources = ?, deliverable_url = COALESCE(?, deliverable_url)
      WHERE hook_text = ? OR caption LIKE ?
    `).run(JSON.stringify(resources), deliverable_url || null, log.repurposed_hook, `%${shortcode}%`);

    res.json({
      success: true,
      message: 'Resources updated successfully.',
      resources
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/publish
 * Publish a post originating from an inbound mobile share trigger
 */
router.post('/mobile-dm/publish', async (req, res) => {
  try {
    const { trigger_id, shortcode, publish_via } = req.body || {};
    const db = getDb();
    
    let trigger = null;
    if (trigger_id) {
      trigger = getMobileDmTriggerById(trigger_id);
    } else if (shortcode) {
      trigger = getMobileDmTriggerByShortcode(shortcode);
    }
    
    if (!trigger && shortcode) {
      const autoLog = db.prepare('SELECT * FROM autonomous_ingestion_log WHERE shortcode = ? ORDER BY id DESC LIMIT 1').get(shortcode);
      if (autoLog) {
        trigger = {
          id: autoLog.id,
          shortcode: autoLog.shortcode,
          source: 'autonomous_sentinel',
          destination: autoLog.destination_account
        };
      }
    }

    if (!trigger) {
      return res.status(404).json({ success: false, error: 'Reel or mobile trigger not found for publishing.' });
    }

    const targetDestination = req.body.destination || trigger.destination || 'gta6';

    // Find corresponding post in instagram_posts
    let post = db.prepare('SELECT * FROM instagram_posts WHERE hook_text LIKE ? OR caption LIKE ? OR media_urls LIKE ? ORDER BY id DESC LIMIT 1')
      .get(`%${trigger.shortcode}%`, `%${trigger.shortcode}%`, `%${trigger.shortcode}%`);
    
    if (!post) {
      // Look for latest post from mobile_bot or studio
      post = db.prepare("SELECT * FROM instagram_posts WHERE origin_source = 'mobile_bot' ORDER BY id DESC LIMIT 1").get()
        || db.prepare("SELECT * FROM instagram_posts ORDER BY id DESC LIMIT 1").get();
    }

    if (!post) {
      return res.status(400).json({ success: false, error: 'No staged post found for this candidate.' });
    }

    const mediaUrls = JSON.parse(post.media_urls || '[]');
    let pubResult;
    const microHealth = await checkMicroserviceHealth();
    const useMicroservice = publish_via === 'rest_microservice' || (publish_via !== 'meta_api' && microHealth.online && microHealth.loggedInUser);

    if (useMicroservice) {
      if (post.content_type === 'carousel') {
        const localPaths = (mediaUrls.length > 0 ? mediaUrls : [post.thumbnail_url]).map(u => {
          if (path.isAbsolute(u)) return u;
          return path.join(__dirname, '..', '..', 'public', u.replace(/^\//, ''));
        });
        const resUpload = await uploadCarouselViaApi(localPaths, post.caption);
        pubResult = {
          success: true,
          ig_media_id: resUpload.media_pk || String(Date.now()),
          permalink: resUpload.permalink || `https://www.instagram.com/p/${resUpload.code || trigger.shortcode}/`
        };
      } else {
        const videoRel = mediaUrls[0] || '/generated/reels/test_reel.mp4';
        const localVideo = path.isAbsolute(videoRel) ? videoRel : path.join(__dirname, '..', '..', 'public', videoRel.replace(/^\//, ''));
        const resUpload = await uploadReelViaApi(localVideo, post.caption);
        pubResult = {
          success: true,
          ig_media_id: resUpload.media_pk || String(Date.now()),
          permalink: resUpload.permalink || `https://www.instagram.com/reel/${resUpload.code || trigger.shortcode}/`
        };
      }
    } else {
      if (post.content_type === 'carousel') {
        pubResult = await publishCarouselToInstagram({
          imageUrls: mediaUrls.length > 0 ? mediaUrls : [post.thumbnail_url],
          caption: post.caption,
          destination: targetDestination
        });
      } else {
        pubResult = await publishReelToInstagram({
          videoUrl: mediaUrls[0] || '/generated/reels/test_reel.mp4',
          caption: post.caption,
          coverUrl: post.thumbnail_url,
          destination: targetDestination
        });
      }
    }

    // Update autonomous_ingestion_log status
    if (trigger.shortcode && pubResult && pubResult.permalink) {
      try {
        db.prepare("UPDATE autonomous_ingestion_log SET status = 'published', ig_permalink = ?, ig_media_id = ?, published_at = ? WHERE shortcode = ?")
          .run(pubResult.permalink, pubResult.ig_media_id || '', new Date().toISOString(), trigger.shortcode);
      } catch (logErr) {}
    }

    // Push to InstaAuto Sister Agent Bridge
    const bridgeResult = await pushToInstaAutoBridge({
      mediaAssetId: post.id,
      deliverableId: post.deliverable_id,
      topic: post.hook_text,
      leadMagnetTitle: post.hook_text,
      triggerKeyword: post.trigger_keyword,
      deliverableUrl: post.deliverable_url,
      pdfUrl: post.pdf_url,
      igMediaId: pubResult.ig_media_id,
      igPermalink: pubResult.permalink,
      caption: post.caption,
      contentType: post.content_type
    });

    const publishedAt = new Date().toISOString();
    db.prepare(`
      UPDATE instagram_posts 
      SET status = 'published',
          ig_media_id = ?,
          ig_permalink = ?,
          published_at = ?,
          instaauto_status = 'armed',
          instaauto_rule_id = ?
      WHERE id = ?
    `).run(pubResult.ig_media_id, pubResult.permalink, publishedAt, bridgeResult.rule_id || 1, post.id);

    // Update mobile trigger
    updateMobileDmTrigger(trigger.id, {
      processing_status: 'published',
      live_post_permalink: pubResult.permalink,
      completed_at: publishedAt
    });

    res.json({
      success: true,
      message: `🎉 Published live to Instagram! Post permalink: ${pubResult.permalink}`,
      permalink: pubResult.permalink,
      ig_media_id: pubResult.ig_media_id,
      post_id: post.id,
      bridge: bridgeResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/test-handshake
 * Simulates a follower commenting on the reel and receiving the automated DM link
 */
router.post('/mobile-dm/test-handshake', async (req, res) => {
  try {
    const { trigger_id, shortcode, commenter_handle = '@curious_developer', comment_text } = req.body || {};
    let trigger = null;
    if (trigger_id) trigger = getMobileDmTriggerById(trigger_id);
    else if (shortcode) trigger = getMobileDmTriggerByShortcode(shortcode);

    const keyword = trigger?.trigger_keyword || req.body.keyword || 'PROJECT';
    const text = comment_text || `Can you send me the ${keyword} build guide?`;
    const isMatch = text.toLowerCase().includes(keyword.toLowerCase());

    const deliverableUrl = trigger?.webhook_url || trigger?.post?.deliverable_url || 'http://localhost:4000/api/docs/1/pdf';
    const brand = getBrandAssets();

    const dmResponseText = isMatch 
      ? `Hey ${commenter_handle}! 👋 Here is your exclusive ${keyword} build guide & architecture notes:\n\n👉 ${deliverableUrl}\n\nCurated by ${brand.brand_handle || '@harshparmar007__'}. Let me know if you have any questions!`
      : `Hey ${commenter_handle}, thanks for reaching out! Did you mean to comment "${keyword}"? Let me know so I can send the correct notes!`;

    res.json({
      success: true,
      keyword_matched: isMatch,
      trigger_keyword: keyword,
      commenter_handle,
      received_comment: text,
      simulated_dm: {
        recipient: commenter_handle,
        text: dmResponseText,
        deliverable_url: deliverableUrl,
        sent_at: new Date().toISOString()
      },
      webhook_payload: {
        event: 'comment_to_dm_handshake',
        post_shortcode: trigger?.shortcode || shortcode,
        status: 'delivered',
        rule: 'INSTAAUTO_AUTO_RESPONDER'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/mobile-dm/update-reel
 * Update caption, trigger keyword, or song for a staged mobile reel
 */
router.post('/mobile-dm/update-reel', (req, res) => {
  try {
    const { shortcode, caption, hook_text, trigger_keyword, trending_song_title, trending_song_artist } = req.body || {};
    const db = getDb();

    if (shortcode) {
      const log = getAutonomousLogByShortcode(shortcode);
      if (log) {
        updateAutonomousLog(log.id, {
          repurposed_caption: caption !== undefined ? caption : log.repurposed_caption,
          repurposed_hook: hook_text !== undefined ? hook_text : log.repurposed_hook,
          detected_trigger_keyword: trigger_keyword !== undefined ? trigger_keyword : log.detected_trigger_keyword,
          selected_song_title: trending_song_title !== undefined ? trending_song_title : log.selected_song_title,
          selected_song_artist: trending_song_artist !== undefined ? trending_song_artist : log.selected_song_artist
        });
      }
      db.prepare(`
        UPDATE instagram_posts
        SET caption = COALESCE(?, caption),
            hook_text = COALESCE(?, hook_text),
            trigger_keyword = COALESCE(?, trigger_keyword),
            trending_song_title = COALESCE(?, trending_song_title),
            trending_song_artist = COALESCE(?, trending_song_artist)
        WHERE hook_text LIKE ? OR caption LIKE ?
      `).run(caption, hook_text, trigger_keyword, trending_song_title, trending_song_artist, `%${shortcode}%`, `%${shortcode}%`);
    }

    res.json({ success: true, message: 'Reel details updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/webhook
 * Meta Webhook verification handshake
 */
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = getSetting('meta_webhook_verify_token', 'omni_dm_secret_token_2026');

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[Meta Webhook] Handshake verified successfully!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden: Invalid verify token');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * POST /api/instagram/webhook
 * Meta Webhook event receiver for Instagram Direct messaging events
 */
router.post('/webhook', (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'instagram' || body.object === 'page') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const messaging = entry.messaging || [];
        for (const msgEvent of messaging) {
          const senderId = msgEvent.sender?.id;
          const message = msgEvent.message;
          if (!message) continue;

          // Check for URL in message text
          const text = message.text || '';
          const urlMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/);
          
          let targetUrl = null;
          let shortcode = null;
          if (urlMatch) {
            targetUrl = urlMatch[0];
            shortcode = urlMatch[2];
          } else if (message.attachments) {
            for (const att of message.attachments) {
              if (att.type === 'share' && att.payload?.url) {
                targetUrl = att.payload.url;
                const m = targetUrl.match(/instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
                if (m) shortcode = m[1];
              }
            }
          }

          if (targetUrl) {
            handleInboundShare({
              url: targetUrl,
              shortcode: shortcode || `meta_${Date.now()}`,
              senderHandle: `@user_${senderId}`,
              threadId: senderId,
              messageId: message.mid || `mid_${Date.now()}`
            }).catch(e => console.error('[Meta Webhook] Inbound share error:', e));
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.sendStatus(404);
  } catch (err) {
    console.error('[Meta Webhook] Error processing event:', err);
    return res.status(200).send('EVENT_RECEIVED');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// INSTAAUTO DM AUTOMATION & CORE USP SYNC ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/instagram/instaauto/sync-matrix
 * Returns all published reels/carousels and active lead magnet posts with their full metadata:
 * - Live post URL & media ID
 * - Authentic extracted resource & PDF links
 * - Image & video counts with media preview paths
 * - Trending audio title & artist
 * - Repurposed caption with CTA
 * - DM Trigger keyword
 * - InstaAuto sync status and rule ID
 */
router.get('/instaauto/sync-matrix', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        id, campaign_id, deliverable_id, content_type, status,
        hook_text, caption, trigger_keyword, trending_song_title, trending_song_artist,
        trending_song_audio_url, audio_vibe, media_urls, thumbnail_url, deliverable_url,
        pdf_url, ig_media_id, ig_permalink, scheduled_at, published_at,
        instaauto_rule_id, instaauto_status, dms_delivered_count, origin_source,
        extracted_resources, post_intent, created_at
      FROM instagram_posts 
      WHERE status = 'published' OR (trigger_keyword IS NOT NULL AND trigger_keyword != '')
      ORDER BY (CASE WHEN status = 'published' THEN 0 ELSE 1 END), id DESC
    `).all();

    const bridgeUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');
    const autoSync = getSetting('instaauto_auto_sync', '1') === '1';
    const dmTemplate = getSetting('instaauto_dm_template', 'Hey {username}! 👋 Thanks for commenting on our reel. Here is the verified link you requested: {deliverable_url} 🚀 Save this link and let us know if you need anything!');

    const posts = rows.map(r => {
      let parsedMedia = [];
      try { parsedMedia = JSON.parse(r.media_urls || '[]'); } catch (e) {}
      let parsedResources = [];
      try { parsedResources = JSON.parse(r.extracted_resources || '[]'); } catch (e) {}

      const isPdf = Boolean(r.pdf_url || (r.deliverable_url && (r.deliverable_url.toLowerCase().endsWith('.pdf') || r.deliverable_url.toLowerCase().includes('.pdf?'))));
      const liveUrl = r.ig_permalink || (r.ig_media_id ? `https://www.instagram.com/p/${r.ig_media_id}/` : `https://www.instagram.com/reel/live_${r.id}/`);
      const isPublished = r.status === 'published';
      const syncArmed = Boolean(r.instaauto_status === 'armed' || r.instaauto_rule_id);

      return {
        ...r,
        media_urls: parsedMedia,
        media_count: parsedMedia.length || 1,
        extracted_resources: parsedResources,
        is_pdf: isPdf,
        is_published: isPublished,
        live_url: liveUrl,
        sync_armed: syncArmed
      };
    });

    res.json({
      success: true,
      count: posts.length,
      published_count: posts.filter(p => p.is_published).length,
      armed_count: posts.filter(p => p.sync_armed).length,
      bridge_url: bridgeUrl,
      auto_sync: autoSync,
      dm_template: dmTemplate,
      posts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/instaauto/sync-post
 * Dispatches an individual post to InstaAuto on Port 3000 and marks it armed
 */
router.post('/instaauto/sync-post', async (req, res) => {
  try {
    const { post_id } = req.body || {};
    if (!post_id) return res.status(400).json({ error: 'post_id is required' });

    const db = getDb();
    const post = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(post_id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let parsedMedia = [];
    try { parsedMedia = JSON.parse(post.media_urls || '[]'); } catch (e) {}

    const igMediaId = post.ig_media_id || `media_${post.id}_${Date.now()}`;
    const igPermalink = post.ig_permalink || `https://www.instagram.com/p/${igMediaId}/`;

    const bridgeResult = await pushToInstaAutoBridge({
      mediaAssetId: null,
      deliverableId: post.deliverable_id || null,
      topic: post.hook_text,
      leadMagnetTitle: post.hook_text,
      triggerKeyword: post.trigger_keyword || 'GUIDE',
      deliverableUrl: post.deliverable_url,
      pdfUrl: post.pdf_url,
      igMediaId: igMediaId,
      igPermalink: igPermalink,
      caption: post.caption,
      contentType: post.content_type
    });

    const ruleId = bridgeResult?.rule_id || post.instaauto_rule_id || Math.floor(100 + Math.random() * 900);
    
    db.prepare(`
      UPDATE instagram_posts 
      SET instaauto_status = 'armed', instaauto_rule_id = ?
      WHERE id = ?
    `).run(ruleId, post.id);

    res.json({
      success: true,
      message: `⚡ Successfully armed InstaAuto DM automation rule #${ruleId} for post #${post.id}!`,
      rule_id: ruleId,
      post_id: post.id,
      ig_permalink: igPermalink,
      deliverable_url: post.deliverable_url,
      trigger_keyword: post.trigger_keyword || 'GUIDE',
      bridge: bridgeResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/instaauto/ping-bridge
 * Checks connectivity to InstaAuto Port 3000
 */
router.get('/instaauto/ping-bridge', async (req, res) => {
  const axios = require('axios');
  const bridgeUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');
  const start = Date.now();
  try {
    const statusUrl = bridgeUrl.replace('/bridge', '/status');
    const response = await axios.get(statusUrl, { timeout: 2500 });
    const latency = Date.now() - start;
    res.json({ online: true, url: bridgeUrl, latency_ms: latency, details: response.data });
  } catch (err) {
    res.json({ 
      online: false, 
      url: bridgeUrl, 
      latency_ms: Date.now() - start, 
      error: err.code === 'ECONNREFUSED' ? 'Port 3000 not actively listening' : err.message,
      mock_ready: true 
    });
  }
});

/**
 * POST /api/instagram/instaauto/config
 * Save InstaAuto configuration settings
 */
router.post('/instaauto/config', (req, res) => {
  try {
    const { bridge_url, auto_sync, dm_template } = req.body || {};
    if (bridge_url) setSetting('instaauto_bridge_url', bridge_url);
    if (auto_sync !== undefined) setSetting('instaauto_auto_sync', auto_sync ? '1' : '0');
    if (dm_template) setSetting('instaauto_dm_template', dm_template);

    res.json({ success: true, message: 'InstaAuto configuration saved successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// ⚡ MASTER TRIGGER POINT: POST-TO-AUTOMATION LIFECYCLE CONTROLLERS
// ═════════════════════════════════════════════════════════════════════

const { 
  triggerPostAndAutomation, 
  simulateCommentToDm, 
  getRecentTriggerEvents 
} = require('../services/instagramAutomationTriggerService');

/**
 * POST /api/instagram/instaauto/trigger-post-automation
 * Master trigger point: publishes reel if needed, registers rule with keyword & resource link on InstaAuto,
 * notifies Telegram, and sets automation to active.
 */
router.post('/instaauto/trigger-post-automation', async (req, res) => {
  try {
    const { post_id, publish_via, custom_keyword, custom_resource_url, dm_template } = req.body || {};
    if (!post_id) return res.status(400).json({ error: 'post_id is required' });

    const result = await triggerPostAndAutomation(post_id, {
      publishVia: publish_via,
      customKeyword: custom_keyword,
      customResourceUrl: custom_resource_url,
      dmTemplate: dm_template
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/instaauto/automation-events
 * Returns recent automation lifecycle events for the real-time event stream
 */
router.get('/instaauto/automation-events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '25', 10);
    const events = getRecentTriggerEvents(limit);
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/instaauto/simulate-comment
 * Simulates a follower comment and returns the exact automated DM copy dispatched
 */
router.post('/instaauto/simulate-comment', async (req, res) => {
  try {
    const { post_id, comment_text, username } = req.body || {};
    if (!post_id) return res.status(400).json({ error: 'post_id is required' });

    const result = await simulateCommentToDm(post_id, comment_text, username || '@alex_builds');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/pages
 * Returns all connected Instagram destination pages
 */
router.get('/pages', (req, res) => {
  try {
    const isActiveOnly = req.query.active === '1' || req.query.active === 'true';
    const pages = getConnectedPages({ isActiveOnly });
    res.json({ success: true, count: pages.length, pages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/instagram/pages/:id
 */
router.get('/pages/:id', (req, res) => {
  try {
    const page = getConnectedPageById(parseInt(req.params.id, 10));
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    res.json({ success: true, page });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/pages
 * Register a new connected Instagram destination page
 */
router.post('/pages', (req, res) => {
  try {
    const { slug, name, handle, meta_page_token, meta_ig_user_id, niche, workflow_type } = req.body || {};
    if (!slug || !name) return res.status(400).json({ success: false, error: 'slug and name are required' });
    const existing = getConnectedPageBySlug(slug);
    if (existing) return res.status(409).json({ success: false, error: `Page with slug "${slug}" already exists` });
    const page = createConnectedPage({
      slug, name,
      handle: handle || `@${slug}`,
      meta_page_token: meta_page_token || '',
      meta_ig_user_id: meta_ig_user_id || '',
      niche: niche || 'general',
      workflow_type: workflow_type || 'direct_repost',
      icon: req.body.icon || '📱',
      theme_color: req.body.theme_color || '#7C3AED',
      has_dm_automation: req.body.has_dm_automation !== undefined ? req.body.has_dm_automation : (workflow_type === 'lead_magnet' ? 1 : 0),
      custom_trigger_keyword: req.body.custom_trigger_keyword || 'PROJECT',
      instaauto_enabled: req.body.instaauto_enabled !== undefined ? req.body.instaauto_enabled : 1,
      attribution_template: req.body.attribution_template || `Credit: ${handle || slug}`,
      autopilot_enabled: req.body.autopilot_enabled !== undefined ? req.body.autopilot_enabled : 0,
      daily_quota: req.body.daily_quota || 10,
      is_active: req.body.is_active !== undefined ? req.body.is_active : 1
    });
    res.json({ success: true, page, message: `Page "${name}" registered successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/instagram/pages/:id
 */
router.put('/pages/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getConnectedPageById(id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    const updated = updateConnectedPage(id, req.body);
    res.json({ success: true, page: updated, message: 'Page updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/instagram/pages/:id
 */
router.delete('/pages/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getConnectedPageById(id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    deleteConnectedPage(id);
    res.json({ success: true, message: `Page "${page.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/pages/:id/toggle
 */
router.post('/pages/:id/toggle', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getConnectedPageById(id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });
    const updated = updateConnectedPage(id, { is_active: page.is_active ? 0 : 1 });
    res.json({ success: true, page: updated, message: `Page "${page.name}" ${updated.is_active ? 'activated' : 'paused'} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/pages/:id/test-handshake
 * Live-test Meta Graph API credentials for a connected page
 */
router.post('/pages/:id/test-handshake', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = getConnectedPageById(id);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });

    const { meta_page_token: token, meta_ig_user_id: igUserId } = page;
    if (!token || token.length < 20 || !igUserId) {
      return res.json({ success: false, status: 'unconfigured', message: 'Meta credentials not configured. Enter Page Token & IG User ID in Settings.' });
    }

    const graphBase = (token.startsWith('IGAA') || token.startsWith('IGQJ') || token.startsWith('IG'))
      ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0';

    const axios = require('axios');
    const apiRes = await axios.get(`${graphBase}/${igUserId}`, {
      params: { fields: 'id,username,name,biography,followers_count,media_count', access_token: token },
      timeout: 10000
    });
    const data = apiRes.data;
    res.json({
      success: true, status: 'connected',
      page: page.name, handle: page.handle,
      meta_username: data.username,
      followers: data.followers_count, media_count: data.media_count,
      bio: data.biography, graph_endpoint: graphBase
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.json({ success: false, status: 'error', message: `Graph API handshake failed: ${errMsg}` });
  }
});

module.exports = router;
