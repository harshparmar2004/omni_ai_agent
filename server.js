require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize SQLite database
getDb();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(path.join(__dirname, 'public', 'generated')));

// API Routes
app.use('/api/research', require('./src/routes/research'));
app.use('/api/media', require('./src/routes/media'));
app.use('/api/publish', require('./src/routes/publish'));
app.use('/api/pipeline', require('./src/routes/publish'));
app.use('/api/matrix', require('./src/routes/matrix'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/overview', require('./src/routes/settings'));

// v2.0 & v3.0 Routes
app.use('/api/llm', require('./src/routes/llm'));
app.use('/api/oauth', require('./src/routes/oauth'));
app.use('/api/docs', require('./src/routes/docs'));
app.use('/api/instagram/webhook', require('./src/routes/instagramWebhook'));
app.use('/api/instagram', require('./src/routes/instagramAgent'));
app.use('/api/nanobanana', require('./src/routes/nanoBanana'));

// Public Companion Guides (/docs/:slug)
app.use('/docs', require('./src/routes/docs'));

// Fallback for SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/docs') || req.path.startsWith('/generated')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[OmniResearch Server Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log('\n======================================================');
  console.log('🚀 OMNIRESEARCH AI — Autonomous Content & Deep Research Engine');
  console.log(`🌐 Local Web Dashboard: http://localhost:${PORT}`);
  console.log(`📄 Public Deliverables Host: http://localhost:${PORT}/docs/:slug`);
  console.log(`📡 Linked InstaAuto Sentinel: http://localhost:3000/api/agent/bridge`);
  console.log('======================================================\n');

  // ── 24/7 Autonomous Channel Poller & Stealth Sentinel Daemon ─────────
  const { startStealthSentinelScheduler } = require('./src/services/stealthSentinelScheduler');
  const { startMobileDmListener } = require('./src/services/instagramMobileDmListener');
  const { startTelegramListener } = require('./src/services/telegramBotService');
  const { startTunnel } = require('./src/services/tunnelService');
  const { startMicroserviceDaemon } = require('./src/services/instagramMicroserviceDaemon');

  // Start Python Instagrapi Mobile Microservice on Port 8001 (Pillar for ManyChat Interception)
  startMicroserviceDaemon().catch(e => console.warn('[Microservice Boot Notice]:', e.message));

  // Start Self-Healing Public Tunnel for Meta Graph API uploads
  startTunnel(PORT).catch(e => console.warn('[Tunnel Boot Notice]:', e.message));

  // Start Mobile Share-to-DM Inbound Listener
  startMobileDmListener(12000);

  // Start Telegram Mobile Inbound Listener (if token configured)
  startTelegramListener();

  // Start Untrackable Stealth Sentinel Scheduler (5 Anti-Tracking Strategies Active)
  startStealthSentinelScheduler();

  // Prune expired temporary media cache on boot (Pillar 4)
  const { pruneExpiredMediaCache } = require('./src/services/mediaCleanerService');
  try {
    pruneExpiredMediaCache(48);
  } catch (e) {
    console.warn('[Media Cleaner Boot Notice]:', e.message);
  }
});

module.exports = app;
