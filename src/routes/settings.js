const express = require('express');
const router = express.Router();
const { getAllSettings, setSetting } = require('../database');

function maskSecret(val) {
  if (!val) return '';
  if (val.length <= 8) return '****';
  return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
}

/**
 * GET /api/settings
 */
router.get('/', (req, res) => {
  try {
    const raw = getAllSettings();
    const safeSettings = {
      ...raw,
      telegram_bot_token: raw.telegram_bot_token ? maskSecret(raw.telegram_bot_token) : '',
      telegram_allowed_chat_ids: raw.telegram_allowed_chat_ids || '5443723531',
      telegram_notifications_enabled: raw.telegram_notifications_enabled !== undefined ? raw.telegram_notifications_enabled : '1',
      watchtower_paused: raw.watchtower_paused || '0',
      watchtower_interval_hours: raw.watchtower_interval_hours || '3',
      watchtower_night_cooldown: raw.watchtower_night_cooldown !== undefined ? raw.watchtower_night_cooldown : '1',
      min_score_threshold: raw.min_score_threshold || '75',
      media_retention_hours: raw.media_retention_hours || '48',
      mode: raw.mode || 'live',
      public_media_url: raw.public_media_url || '',
      default_post_mode: raw.default_post_mode || 'review',
      default_content_type: raw.default_content_type || 'reel',
      brand_handle: raw.brand_handle || raw.instagram_handle || '@gta6_updates_007',
      brand_watermark_position: raw.brand_watermark_position || 'top-right',
      brand_watermark_opacity: raw.brand_watermark_opacity || '0.95',
      default_provider: raw.default_provider || 'ollama',
      meta_app_id: raw.meta_app_id || '1699561267808244',
      meta_app_secret: raw.meta_app_secret ? maskSecret(raw.meta_app_secret) : '',
      gemini_api_key: raw.gemini_api_key ? maskSecret(raw.gemini_api_key) : '',
      groq_api_key: raw.groq_api_key ? maskSecret(raw.groq_api_key) : ''
    };
    res.json({ success: true, settings: safeSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT or POST /api/settings
 */
const saveHandler = (req, res) => {
  try {
    const body = req.body || {};
    for (const [key, val] of Object.entries(body)) {
      if (val === undefined || val === null) continue;
      // Never overwrite with masked asterisks or ellipsis
      if (typeof val === 'string' && (val.includes('...') || val.includes('****'))) {
        continue;
      }
      setSetting(key, val);
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/', saveHandler);
router.put('/', saveHandler);

module.exports = router;
