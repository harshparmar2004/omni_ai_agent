const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb, getSetting, setSetting } = require('../database');

/**
 * GET /api/settings
 * Retrieve platform configurations
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    res.json({
      success: true,
      settings: {
        mode: settings.mode || 'mock',
        instaauto_bridge_url: settings.instaauto_bridge_url || 'http://localhost:3000/api/agent/bridge',
        gemini_api_key: settings.gemini_api_key ? maskKey(settings.gemini_api_key) : '',
        openai_api_key: settings.openai_api_key ? maskKey(settings.openai_api_key) : '',
        elevenlabs_api_key: settings.elevenlabs_api_key ? maskKey(settings.elevenlabs_api_key) : '',
        meta_page_token: settings.meta_page_token ? maskKey(settings.meta_page_token) : '',
        meta_ig_user_id: settings.meta_ig_user_id || '17841400000000000',
        public_base_url: settings.public_base_url || 'http://localhost:4000',
        // v2.0 — Multi-LLM Providers
        claude_api_key: settings.claude_api_key ? maskKey(settings.claude_api_key) : '',
        groq_api_key: settings.groq_api_key ? maskKey(settings.groq_api_key) : '',
        ollama_endpoint: settings.ollama_endpoint || 'http://localhost:11434',
        default_provider: settings.default_provider || 'gemini',
        default_model: settings.default_model || 'gemini-2.5-flash',
        niche_domain: settings.niche_domain || 'AI Engineering & Hackathons',
        min_score_threshold: settings.min_score_threshold || '70',
        failover_chain: settings.failover_chain || 'gemini,claude,openai,groq,ollama',
        // v2.0 — Google Docs
        google_client_id: settings.google_client_id || '',
        google_client_secret: settings.google_client_secret ? maskKey(settings.google_client_secret) : '',
        google_refresh_token: settings.google_refresh_token ? '****configured****' : '',
        google_docs_enabled: settings.google_docs_enabled || 'false',
        google_docs_folder_id: settings.google_docs_folder_id || '',
        // v2.0 — Image & Content
        imagen_api_key: settings.imagen_api_key ? maskKey(settings.imagen_api_key) : '',
        image_engine: settings.image_engine || 'canvas',
        instagram_handle: settings.instagram_handle || '@harshparmar007__',
        default_content_type: settings.default_content_type || 'reel',
        public_media_url: settings.public_media_url || 'http://localhost:4000',
        ngrok_url: settings.ngrok_url || '',
        // Meta App Credentials
        meta_app_id: settings.meta_app_id || '',
        meta_app_secret: settings.meta_app_secret ? maskKey(settings.meta_app_secret) : '',
        telegram_bot_token: settings.telegram_bot_token ? maskKey(settings.telegram_bot_token) : ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/settings
 * Save platform configurations
 */
router.post('/', (req, res) => {
  try {
    const allowedKeys = [
      'mode', 'instaauto_bridge_url',
      'gemini_api_key', 'openai_api_key', 'elevenlabs_api_key',
      'meta_page_token', 'meta_ig_user_id', 'public_base_url',
      'meta_app_id', 'meta_app_secret',
      // v2.0 & v4.0 keys
      'claude_api_key', 'groq_api_key', 'ollama_endpoint',
      'default_provider', 'default_model', 'niche_domain', 'min_score_threshold',
      'failover_chain',
      'google_client_id', 'google_client_secret', 'google_refresh_token',
      'google_docs_enabled', 'google_docs_folder_id',
      'imagen_api_key', 'image_engine', 'instagram_handle',
      'default_content_type', 'public_media_url', 'ngrok_url',
      'telegram_bot_token'
    ];

    for (const [key, val] of Object.entries(req.body || {})) {
      if (allowedKeys.includes(key) && val !== undefined) {
        // Do not overwrite with masked asterisks
        if (typeof val === 'string' && val.includes('****')) {
          continue;
        }
        setSetting(key, val);
        if (key === 'instagram_handle') {
          setSetting('brand_handle', val);
        }
      }
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/settings/exchange-token
 * Automatically exchanges short-lived user token into 60-day / permanent Page token,
 * discovers linked Instagram Business accounts, and saves them automatically!
 */
router.post('/exchange-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const appId = getSetting('meta_app_id', '1699561267808244');
    const appSecret = getSetting('meta_app_secret', 'f5328133123b2b43dcc44ae3aab9c57b');

    // 1. Check if token is an Instagram Direct User/Creator Access Token
    if (token.startsWith('IGAA') || token.startsWith('IGQJ') || token.startsWith('IG')) {
      console.log('[Meta Token Exchange] 📸 Detected Instagram Direct User Token. Querying graph.instagram.com...');
      try {
        const meRes = await axios.get('https://graph.instagram.com/me', {
          params: {
            fields: 'id,user_id,username,name,account_type',
            access_token: token
          },
          timeout: 15000
        });

        const userData = meRes.data || {};
        const igUserId = userData.user_id || userData.id;
        const username = userData.username || 'creator';

        let finalToken = token;
        try {
          const refRes = await axios.get('https://graph.instagram.com/refresh_access_token', {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: token
            },
            timeout: 15000
          });
          if (refRes.data?.access_token) {
            finalToken = refRes.data.access_token;
            console.log('[Meta Token Exchange] Refreshed 60-day token successfully!');
          }
        } catch (refErr) {
          console.warn('[Meta Token Exchange] Refresh note:', refErr.response?.data?.error?.message || refErr.message);
        }

        setSetting('meta_page_token', finalToken);
        setSetting('meta_ig_user_id', igUserId);
        setSetting('instagram_handle', `@${username}`);
        setSetting('brand_handle', `@${username}`);
        setSetting('mode', 'live');

        return res.json({
          success: true,
          message: `🎉 Successfully connected Instagram @${username} (Account ID: ${igUserId})! Mode set to Live.`,
          ig_user_id: igUserId,
          handle: `@${username}`,
          account_type: userData.account_type || 'Creator'
        });
      } catch (igErr) {
        console.warn('[Meta Token Exchange] Instagram Direct error:', igErr.response?.data || igErr.message);
      }
    }

    // 2. Exchange short-lived token for long-lived Facebook user access token
    let longLivedToken = token;
    try {
      const exchangeRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: token
        },
        timeout: 15000
      });
      if (exchangeRes.data?.access_token) {
        longLivedToken = exchangeRes.data.access_token;
      }
    } catch (e) {
      console.warn('[Meta Token Exchange] Exchange note:', e.response?.data?.error?.message || e.message);
    }

    // 3. Query me/accounts with the token to discover pages and linked Instagram accounts
    const accountsRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        fields: 'name,access_token,instagram_business_account{id,username}',
        access_token: longLivedToken
      },
      timeout: 15000
    });

    const pages = accountsRes.data?.data || [];
    let savedPage = null;
    let savedIgId = null;
    let savedPageToken = null;

    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        savedPage = page.name;
        savedIgId = page.instagram_business_account.id;
        savedPageToken = page.access_token;
        const igUsername = page.instagram_business_account.username;

        setSetting('meta_page_token', savedPageToken);
        setSetting('meta_ig_user_id', savedIgId);
        if (igUsername) {
          setSetting('instagram_handle', `@${igUsername}`);
          setSetting('brand_handle', `@${igUsername}`);
        }
        setSetting('mode', 'live');
        break;
      }
    }

    if (savedIgId) {
      return res.json({
        success: true,
        message: `🎉 Successfully connected Instagram account @${getSetting('instagram_handle')} (ID: ${savedIgId}) via Facebook Page "${savedPage}"! Mode set to Live.`,
        page_name: savedPage,
        ig_user_id: savedIgId,
        handle: getSetting('instagram_handle')
      });
    }

    // Fallback if no linked IG account found on pages
    return res.json({
      success: true,
      message: 'Token validated, but no linked Instagram Business account was found on your Facebook Pages yet.',
      pages: pages.map(p => ({ name: p.name, has_ig: Boolean(p.instagram_business_account?.id) })),
      long_lived_token: longLivedToken
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

/**
 * GET /api/overview/stats
 * Instagram Studio & Autonomous Bot Metrics + Pipeline Health Check
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // Instagram Studio Metrics
    const totalIngestedCount = db.prepare('SELECT COUNT(*) as count FROM autonomous_ingestion_log').get()?.count || 0;
    const totalPostsCount = db.prepare('SELECT COUNT(*) as count FROM instagram_posts').get()?.count || 0;
    const directRepostsCount = db.prepare("SELECT COUNT(*) as count FROM instagram_posts WHERE post_intent = 'direct_repost'").get()?.count || 0;
    const leadMagnetsCount = db.prepare("SELECT COUNT(*) as count FROM instagram_posts WHERE post_intent = 'lead_magnet'").get()?.count || 0;
    const publishedCount = db.prepare("SELECT COUNT(*) as count FROM instagram_posts WHERE status = 'published'").get()?.count || 0;
    const stagedQueueCount = db.prepare("SELECT COUNT(*) as count FROM instagram_posts WHERE status IN ('ready_to_post', 'scheduled', 'staged')").get()?.count || 0;
    const channelsCount = db.prepare('SELECT COUNT(*) as count FROM tracked_instagram_channels WHERE is_active = 1').get()?.count || 0;

    // Recent posts for live activity stream
    const recentPosts = db.prepare(`
      SELECT id, content_type, hook_text, caption, thumbnail_url, post_intent, 
             trigger_keyword, trending_song_title, trending_song_artist, status, 
             ig_permalink, ig_media_id, created_at, published_at
      FROM instagram_posts 
      ORDER BY id DESC 
      LIMIT 8
    `).all();

    // Check InstaAuto bridge health
    const bridgeUrl = getSetting('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge');
    const statusUrl = bridgeUrl.replace('/bridge', '/status');
    let instaAutoOnline = false;
    let instaAutoInfo = null;

    try {
      const ping = await axios.get(statusUrl, { timeout: 2000 });
      if (ping.status === 200) {
        instaAutoOnline = true;
        instaAutoInfo = ping.data;
      }
    } catch (e) {
      instaAutoOnline = false;
    }

    res.json({
      success: true,
      stats: {
        // Instagram-Centric Metrics
        total_ingested: Math.max(totalIngestedCount, totalPostsCount),
        direct_reposts: directRepostsCount,
        lead_magnets: leadMagnetsCount,
        published_posts: publishedCount,
        staged_queue: stagedQueueCount,
        active_channels: channelsCount,
        // Backwards compatibility counters
        total_topics: totalPostsCount,
        deliverables_active: leadMagnetsCount,
        reels_published: publishedCount,
        funnels_armed: leadMagnetsCount
      },
      recent_posts: recentPosts,
      bridge_connection: {
        target_url: bridgeUrl,
        is_online: instaAutoOnline,
        details: instaAutoInfo
      },
      mode: getSetting('mode', 'mock'),
      default_provider: getSetting('default_provider', 'gemini'),
      default_model: getSetting('default_model', 'gemini-2.5-flash'),
      niche_domain: getSetting('niche_domain', 'AI Engineering & Hackathons')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function maskKey(str) {
  if (!str || str.length <= 8) return '********';
  return str.slice(0, 4) + '****' + str.slice(-4);
}

module.exports = router;
