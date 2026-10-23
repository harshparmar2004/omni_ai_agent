require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize SQLite v7 database (safely wrapped for serverless environments)
try {
  getDb();
} catch (e) {
  console.warn('[DB Boot Notice]: Serverless mode, skipping local SQLite initialization');
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(path.join(__dirname, 'public', 'generated')));

// ─────────────────────────────────────────────────────────────
// OmniStudio v7 API Routes
// ─────────────────────────────────────────────────────────────
app.use('/api/reposter', require('./src/routes/reposter'));
app.use('/api/jobs', require('./src/routes/jobs'));
app.use('/api/watchtower', require('./src/routes/watchtower'));
app.use('/api/sources', require('./src/routes/sources'));
app.use('/api/discoveries', require('./src/routes/discoveries'));
app.use('/api/pages', require('./src/routes/pages'));
app.use('/api/system', require('./src/routes/system'));
app.use('/api/settings', require('./src/routes/settings'));

// Fallback for Single Page Application (SPA)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/generated')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handling
app.use((err, req, res, next) => {
  console.error('[OmniStudio Server Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Express server bound explicitly to 0.0.0.0
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n======================================================');
    console.log('🚀 OMNISTUDIO v7 — Autonomous Two-Agent Instagram Platform');
    console.log(`🌐 Local Web Dashboard: http://localhost:${PORT}`);
    console.log('🤖 Agent 1: Reposter (Telegram & Dashboard Inbound ➔ Instagram Live)');
    console.log('🛰️ Agent 2: Watchtower (24/7 Monitored Sources ➔ Instagram Auto-Post)');
    console.log('======================================================\n');

    const { startTunnel } = require('./src/core/mediaHost');
    const jobWorkerPool = require('./src/core/jobWorker');
    const { startTelegramBot } = require('./src/agents/reposter/telegramBot');
    const watchtowerScheduler = require('./src/agents/watchtower/scheduler');
    const { pruneExpiredMediaCache } = require('./src/core/mediaCleaner');

    // 1. Start self-healing Cloudflare public tunnel for Meta Graph API uploads
    startTunnel(PORT).catch(e => console.warn('[Tunnel Boot Notice]:', e.message));

    // 2. Start shared publishing core job worker pool
    jobWorkerPool.start(3000);

    // 3. Start Agent 1: Reposter Telegram bot listener
    startTelegramBot().catch(e => console.warn('[Telegram Bot Boot Notice]:', e.message));

    // 4. Start Agent 2: Watchtower 24/7 surveillance scheduler
    watchtowerScheduler.start();

    // 5. Initial cleanup of expired temporary media
    try {
      pruneExpiredMediaCache();
    } catch (e) {
      console.warn('[Media Cleaner Boot Notice]:', e.message);
    }
  });
}

module.exports = app;
