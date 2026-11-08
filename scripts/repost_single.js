#!/usr/bin/env node

/**
 * OmniStudio v7 — Standalone Single-Reel Repost Runner for GitHub Actions
 * Ingests a single Instagram URL, downloads media, applies anti-duplicate transcode,
 * generates Groq AI viral captions, publishes to Feed + Story, notifies Telegram, and exits.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Auto-ensure ffmpeg and ffprobe are available from bundled static packages
try {
  const ffmpegStatic = require('ffmpeg-static');
  const ffprobeStatic = require('ffprobe-static');
  const pathsToAdd = [];
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    pathsToAdd.push(path.dirname(ffmpegStatic));
  }
  if (ffprobeStatic && ffprobeStatic.path && fs.existsSync(ffprobeStatic.path)) {
    pathsToAdd.push(path.dirname(ffprobeStatic.path));
  }
  if (pathsToAdd.length > 0) {
    process.env.PATH = `${pathsToAdd.join(path.delimiter)}${path.delimiter}${process.env.PATH}`;
  }
} catch (e) {}

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) return args[i + 1];
    if (args[i].startsWith(`${flag}=`)) return args[i].slice(flag.length + 1);
  }
  return defaultValue;
}

const targetUrl = getArg('--url') || process.env.TARGET_URL || '';
const chatId = getArg('--chat-id') || process.env.TELEGRAM_CHAT_ID || '5443723531';
const pageId = parseInt(getArg('--page-id') || process.env.TARGET_PAGE_ID || '1', 10);
const messageId = getArg('--message-id') || process.env.TELEGRAM_MESSAGE_ID || '';
const isDryRun = args.includes('--dry-run');

function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.listen(startPort, '0.0.0.0', () => {
      s.close(() => resolve(startPort));
    });
    s.on('error', () => {
      resolve(findOpenPort(startPort + 1));
    });
  });
}

async function main() {
  console.log('======================================================');
  console.log('🎬 OmniStudio v7 — On-Demand Cloud Reposter Runner');
  console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION'}`);
  console.log('======================================================\n');

  if (!targetUrl) {
    throw new Error('Target Instagram URL (--url) is required.');
  }

  // 1. Initialize SQLite Database
  const { getDb, getPages, createPage, setSetting } = require('../src/database');
  const db = getDb();
  console.log('✅ SQLite Database connected.');

  // 1b. Remote Vault Sync (Optional: pull pages from central Render/Railway instance if running in external runner)
  const vaultSyncUrl = process.env.OMNI_VAULT_SYNC_URL;
  const masterKey = process.env.OMNI_MASTER_KEY;
  if (vaultSyncUrl && masterKey) {
    try {
      console.log(`🔑 Fetching active pages dynamically from central vault: ${vaultSyncUrl}...`);
      const axios = require('axios');
      const { importVault } = require('../src/core/tokenVault');
      const vaultRes = await axios.get(vaultSyncUrl, {
        headers: { 'x-master-key': masterKey },
        timeout: 10000
      });
      if (vaultRes.data && vaultRes.data.pages) {
        importVault(vaultRes.data);
      }
    } catch (vErr) {
      console.warn(`[Vault Sync Warning]: ${vErr.message}`);
    }
  }

  let pages = getPages();
  if (pages.length === 0) {
    throw new Error('No Instagram pages configured in database. Please onboard a page via dashboard.');
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    setSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN);
  }
  if (process.env.GEMINI_API_KEY) {
    setSetting('gemini_api_key', process.env.GEMINI_API_KEY);
  }
  if (process.env.GROQ_API_KEY) {
    setSetting('groq_api_key', process.env.GROQ_API_KEY);
    setSetting('default_provider', 'groq');
  }

  // 2. Start local static media server
  const basePort = parseInt(process.env.PORT || '4000', 10);
  const PORT = await findOpenPort(basePort);
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));
  app.get('/api/settings', (req, res) => res.json({ status: 'ok', port: PORT }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/generated', express.static(path.join(__dirname, '..', 'public', 'generated')));

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Local media server running on http://127.0.0.1:${PORT}`);
      resolve(s);
    });
  });

  // 3. Launch Cloudflare Edge Tunnel
  const { startTunnel, closeTunnel } = require('../src/core/mediaHost');
  let tunnelUrl = null;
  if (!isDryRun) {
    try {
      tunnelUrl = await startTunnel(PORT);
      console.log(`🚀 Edge Tunnel established: ${tunnelUrl}`);
    } catch (e) {
      console.warn(`[Tunnel Warning] ${e.message}`);
    }
  }

  // 4. Ingest Link into Queue
  const { submitLink } = require('../src/agents/reposter/reposterAgent');
  console.log(`\n[Reposter Runner] 📥 Submitting link: ${targetUrl}...`);
  const enqueueResult = await submitLink({
    url: targetUrl,
    pageId: pageId,
    chatId: chatId,
    messageId: messageId,
    origin: 'telegram_cloud'
  });

  const job = enqueueResult.job || enqueueResult;
  const jobId = job?.id || enqueueResult.jobId;
  console.log(`[Reposter Runner] ✓ Enqueued Publish Job #${jobId} [${enqueueResult.shortcode}]`);

  if (!jobId) {
    throw new Error(`Failed to obtain a valid jobId from submitLink (result: ${JSON.stringify(enqueueResult)})`);
  }

  const notifier = require('../src/core/notifier');

  if (messageId) {
    db.prepare('UPDATE publish_jobs SET telegram_message_id = ? WHERE id = ?').run(messageId, jobId);
    job.telegram_message_id = messageId;

    // Immediate feedback: notify Telegram that Cloud Runner is connected and starting media ingest
    const selectedPage = pages.find(p => p.id === pageId) || pages[0];
    const targetHandle = selectedPage?.handle || `@page_${pageId}`;
    try {
      notifier.editTelegramMessage(
        chatId,
        messageId,
        `⚡ <b>Agent 1 (Reposter Engine) Engaged:</b> <code>#${enqueueResult.shortcode || 'reel'}</code>\n` +
        `📱 <b>Destination:</b> <code>${targetHandle}</code>\n\n` +
        `✅ <b>1. Ingest:</b> Cloud runner connected & active\n` +
        `⏳ <b>2. Download:</b> Starting media extraction...\n` +
        `⚪ <b>3. AI Hook & Copy:</b> Waiting\n` +
        `⚪ <b>4. Publishing:</b> Waiting (Reel & Story)\n\n` +
        `<i>Status: Running on cloud worker...</i>`
      ).catch(() => {});
    } catch (e) {}
  }

  // Handle already published duplicate reels unless forced
  const isForce = args.includes('--force') || process.env.FORCE_REPOST === 'true';
  if (enqueueResult.alreadyPublished && job.permalink && !isForce) {
    console.log(`[Reposter Runner] ℹ️ Post #${enqueueResult.shortcode} was already published on ${job.published_at}.`);
    const selectedPage = pages.find(p => p.id === pageId) || pages[0];
    const pageHandleClean = selectedPage?.handle ? selectedPage.handle.replace(/^@/, '') : 'gta6_updates_007';
    try {
      await notifier.sendTelegramMessage(
        chatId,
        `ℹ️ <b>Already Published to Profile:</b>\n\n` +
        `Reel #${enqueueResult.shortcode} was already published to <b>@${pageHandleClean}</b>!\n\n` +
        `🌐 <b>Live Instagram Post:</b> <a href="${job.permalink}">${job.permalink}</a>\n` +
        (job.story_status === 'published' ? `👉 <a href="https://www.instagram.com/stories/${pageHandleClean}/">View Story</a>` : '')
      );
    } catch (e) {}
    try { closeTunnel(); } catch (e) {}
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  }

  // Ensure status is queued so processJob picks it up immediately
  if (job.status !== 'queued') {
    db.prepare("UPDATE publish_jobs SET status = 'queued', attempts = 0, error = '' WHERE id = ?").run(jobId);
  }

  // 5. Process Job Immediately
  if (!isDryRun) {
    const jobWorkerPool = require('../src/core/jobWorker');
    console.log(`\n[Reposter Runner] 🚀 Executing Job #${jobId} end-to-end...`);
    await jobWorkerPool.processJob(jobId);
    console.log(`[Reposter Runner] ✅ Job #${jobId} finished!`);

    const finalJob = db.prepare('SELECT * FROM publish_jobs WHERE id = ?').get(jobId);
    if (finalJob && finalJob.status === 'failed') {
      try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, '.telegram_error_notified'), finalJob.error || 'Job failed');
      } catch (e) {}

      try { closeTunnel(); } catch (e) {}
      try { await new Promise((resolve) => server.close(resolve)); } catch (e) {}
      console.error(`[Reposter Runner] ❌ Job #${jobId} failed: ${finalJob.error}`);
      process.exit(1);
    }
  } else {
    console.log(`[Dry Run] Simulated execution of Job #${jobId}`);
  }

  // 6. Cleanup
  console.log('\n[Reposter Runner] 🧹 Cleaning up temporary processes...');
  try {
    closeTunnel();
  } catch (e) {}

  await new Promise((resolve) => server.close(resolve));
  console.log('✅ Server & tunnel closed cleanly.');
  console.log('🎉 Cloud Reposter Execution Finished Successfully!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fatal Cloud Reposter Error:', err);
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, '.telegram_error_notified'), err.message || 'Fatal error');
  } catch (e) {}
  process.exit(1);
});
