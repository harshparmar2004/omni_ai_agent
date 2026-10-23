#!/usr/bin/env node

/**
 * OmniStudio v7 — Standalone Scheduled Cron Runner for GitHub Actions
 * Runs one complete surveillance, selection, and publishing cycle,
 * then safely closes tunnels, flushes database, and exits cleanly.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const isDryRun = process.argv.includes('--dry-run');

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
  console.log('🛰️ OmniStudio v7 — Scheduled GitHub Actions Cron Runner');
  console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION'}`);
  console.log('======================================================\n');

  // 1. Initialize SQLite Database
  const { getDb, getPages, listPublishJobs, getSetting, setSetting } = require('../src/database');
  const db = getDb();
  console.log('✅ SQLite Database connected.');

  // 1b. Support environment overrides from GitHub Secrets
  if (process.env.META_ACCESS_TOKEN) {
    console.log('🔑 Injecting META_ACCESS_TOKEN from environment into active pages...');
    const pages = getPages();
    for (const p of pages) {
      if (p.is_active && (!p.access_token || p.access_token.length < 20)) {
        db.prepare('UPDATE pages SET access_token = ? WHERE id = ?').run(process.env.META_ACCESS_TOKEN, p.id);
      }
    }
  }

  if (process.env.TELEGRAM_BOT_TOKEN) {
    setSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN);
  }
  if (process.env.GEMINI_API_KEY) {
    setSetting('gemini_api_key', process.env.GEMINI_API_KEY);
  }

  // 2. Start local static media server
  const basePort = parseInt(process.env.PORT || '4000', 10);
  const PORT = await findOpenPort(basePort);
  const app = express();
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

  // 4. Run Watchtower Surveillance Scanner across competitor accounts
  const { scanAllSources } = require('../src/agents/watchtower/scanner');
  console.log('\n[Cron Runner] 🛰️ Step 1: Scanning monitored competitor accounts...');
  const scanResult = await scanAllSources({ limit: 4, quick: isDryRun });
  console.log(`[Cron Runner] ✓ Scan complete. Monitored sources checked.`);

  // 5. Evaluate and Select Candidate Posts (Virality Scoring)
  const { evaluateAndSelectPosts } = require('../src/agents/watchtower/selector');
  console.log('\n[Cron Runner] 📊 Step 2: Evaluating virality scores & peak windows...');
  const selectedWinners = await evaluateAndSelectPosts({ force: isDryRun });
  console.log(`[Cron Runner] ✓ Content selection complete. Enqueued ${selectedWinners?.length || 0} winner(s).`);

  // 6. Process Queued Jobs (Feed Publish + Story Reel Card)
  const jobWorkerPool = require('../src/core/jobWorker');
  const queuedJobs = listPublishJobs({ status: 'queued', limit: 3 });
  console.log(`\n[Cron Runner] 🚀 Step 3: Processing ${queuedJobs.length} queued publishing job(s)...`);

  for (const job of queuedJobs) {
    if (isDryRun) {
      console.log(`[Dry Run] Would process Job #${job.id} for page #${job.page_id} (${job.shortcode})`);
      continue;
    }

    try {
      console.log(`[Cron Runner] 🎬 Executing Job #${job.id} [${job.shortcode}]...`);
      await jobWorkerPool.processJob(job.id);
      console.log(`[Cron Runner] ✅ Job #${job.id} completed!`);
    } catch (err) {
      console.error(`[Cron Runner] ❌ Job #${job.id} failed: ${err.message}`);
    }
  }

  // 7. Cleanup & Shutdown
  console.log('\n[Cron Runner] 🧹 Cleaning up temporary processes...');
  try {
    closeTunnel();
  } catch (e) {}

  await new Promise((resolve) => server.close(resolve));
  console.log('✅ Server & tunnel closed cleanly.');
  console.log('🎉 Scheduled Cron Cycle Completed Successfully!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fatal Cron Runner Error:', err);
  process.exit(1);
});
