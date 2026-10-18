const express = require('express');
const router = express.Router();
const notifier = require('../core/notifier');
const { selfTestTunnel } = require('../core/mediaHost');
const { auditAllPageTokens } = require('../core/tokenManager');
const { pruneExpiredMediaCache } = require('../core/mediaCleaner');
const { getSetting, getDb } = require('../database');

/**
 * GET /api/system/health
 * Comprehensive diagnostic check of all core subsystems
 */
router.get('/health', async (req, res) => {
  try {
    // 1. Database check
    let dbStatus = 'ok';
    try {
      getDb().prepare('SELECT 1').get();
    } catch (e) {
      dbStatus = 'error: ' + e.message;
    }

    // 2. Tunnel check
    const tunnelHealth = await selfTestTunnel();

    // 3. Telegram Bot check
    const tgToken = getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN;
    const allowedChatIds = getSetting('telegram_allowed_chat_ids', '');
    const tgStatus = {
      configured: Boolean(tgToken),
      hasAllowedChatIds: Boolean(allowedChatIds)
    };

    // 4. Meta Page Tokens check
    const pagesAudit = await auditAllPageTokens();

    res.json({
      status: 'online',
      version: '7.0',
      database: dbStatus,
      tunnel: tunnelHealth,
      telegram: tgStatus,
      pages: pagesAudit,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/system/events
 * Real-time Server-Sent Events (SSE) stream for dashboard live activity
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  notifier.addSseClient(res);
});

/**
 * POST /api/system/media/prune
 */
router.post('/media/prune', (req, res) => {
  try {
    const hours = req.body.hours ? parseInt(req.body.hours, 10) : null;
    const result = pruneExpiredMediaCache(hours);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/system/telegram/test
 */
router.post('/telegram/test', async (req, res) => {
  try {
    const chatId = req.body.chatId || getSetting('telegram_allowed_chat_ids', '').split(',')[0]?.trim();
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID required' });
    }

    const testMsg = `🔔 <b>OmniStudio v7 Test Alert</b>\n\n` +
      `System health check completed successfully at <code>${new Date().toLocaleTimeString()}</code>. ` +
      `Telegram messaging bridge is fully active!`;

    const sent = await notifier.sendTelegramMessage(chatId, testMsg);
    res.json({ success: Boolean(sent), result: sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
