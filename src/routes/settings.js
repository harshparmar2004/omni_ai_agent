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
      watchtower_paused: raw.watchtower_paused || '0',
      watchtower_interval_hours: raw.watchtower_interval_hours || '3',
      media_retention_hours: raw.media_retention_hours || '48',
      mode: raw.mode || 'live',
      public_media_url: raw.public_media_url || ''
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
      // Never overwrite with masked asterisks
      if (typeof val === 'string' && val.includes('...')) {
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
