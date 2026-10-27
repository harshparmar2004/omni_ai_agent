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

// Auto-ensure ffmpeg is available from bundled ffmpeg-static
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    const ffmpegDir = path.dirname(ffmpegStatic);
    process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
  }
} catch (e) {}

async function main() {
  console.log('======================================================');
  console.log('🛰️ OmniStudio v7 — Scheduled GitHub Actions Cron Runner');
  console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION'}`);
  console.log('======================================================\n');

  // 1. Initialize SQLite Database
  const { getDb, getPages, listPublishJobs, getSetting, setSetting, getPublishJobById } = require('../src/database');
  const db = getDb();
  console.log('✅ SQLite Database connected.');

  // 1b. Ensure destination Page #1 exists and support environment overrides from GitHub Secrets
  let pages = getPages();
  if (pages.length === 0) {
    console.log('📄 No pages found in database, creating default Page #1 (@gta6_updates_007)...');
    const { createPage } = require('../src/database');
    createPage({
      slug: 'gta6',
      name: 'GTA 6 Updates 007',
      handle: '@gta6_updates_007',
      ig_user_id: '17841428668115319',
      access_token: process.env.META_ACCESS_TOKEN || '',
      caption_template: '{caption}\n\n{hashtags}',
      default_hashtags: '#gta6 #gtavi #rockstargames #vicecity #gta6leaks',
      attribution_enabled: 0,
      watermark_enabled: 1,
      post_mode: 'auto',
      posts_per_cycle: 1,
      daily_quota: 7,
      min_spacing_minutes: 120,
      is_active: 1
    });
    pages = getPages();
  }

  // Ensure daily_quota is calibrated to 7 reels/day and attribution is disabled for original brand feel
  try {
    db.prepare("UPDATE pages SET daily_quota = 7, attribution_enabled = 0, caption_template = '{caption}\\n\\n{hashtags}', default_hashtags = '#gta6 #gtavi #rockstargames #vicecity #gta6leaks'").run();
    // Purge any stale non-reel discoveries from cached DB
    db.prepare("DELETE FROM discovered_posts WHERE media_type != 'reel' AND media_type != ''").run();
    // Expire any queued jobs older than 12 hours so stale backlog NEVER blocks or runs
    const expiredJobs = db.prepare("UPDATE publish_jobs SET status = 'failed', error = 'Expired: stale queued job (>12h old)' WHERE status = 'queued' AND created_at < datetime('now', '-12 hours')").run();
    if (expiredJobs.changes > 0) {
      console.log(`[Database Cleanup] 🧹 Purged ${expiredJobs.changes} stale queued jobs older than 12 hours.`);
    }
    // Expire old discovered posts
    db.prepare("UPDATE discovered_posts SET status = 'stale_expired' WHERE status = 'new' AND created_at < datetime('now', '-24 hours')").run();
  } catch (e) {
    console.warn(`[Database Cleanup Warning] ${e.message}`);
  }

  if (process.env.META_ACCESS_TOKEN) {
    console.log('🔑 Injecting META_ACCESS_TOKEN from environment into active pages...');
    for (const p of pages) {
      if (p.is_active && (!p.access_token || p.access_token.length < 20)) {
        db.prepare('UPDATE pages SET access_token = ? WHERE id = ?').run(process.env.META_ACCESS_TOKEN, p.id);
      }
    }
  }

  // 1c. Sync Competitor Accounts from config/competitors.json or COMPETITOR_ACCOUNTS env var
  const { createSourceAccount } = require('../src/database');
  const targetPageId = pages[0]?.id || 1;
  let competitorList = [];

  const competitorsJsonPath = path.join(__dirname, '..', 'config', 'competitors.json');
  if (fs.existsSync(competitorsJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(competitorsJsonPath, 'utf8'));
      if (Array.isArray(parsed)) competitorList.push(...parsed);
    } catch (e) {
      console.warn(`[Config Warning] Could not parse config/competitors.json: ${e.message}`);
    }
  }

  if (process.env.COMPETITOR_ACCOUNTS) {
    const fromEnv = process.env.COMPETITOR_ACCOUNTS.split(',').map(s => s.trim()).filter(Boolean);
    competitorList.push(...fromEnv);
  }

  if (competitorList.length === 0) {
    competitorList = ['grandtheftauto6', 'paradoks.plays', 'gta6.only', 'gta6latest', 'rockstargames'];
  }

  const uniqueCompetitors = [...new Set(competitorList.map(c => c.replace(/^@/, '').toLowerCase().trim()))].filter(Boolean);

  // Synchronize database state strictly with active competitor list:
  // Deactivate any source account previously cached that was removed from dashboard/config
  try {
    if (uniqueCompetitors.length > 0) {
      const placeholders = uniqueCompetitors.map(() => '?').join(',');
      db.prepare(`UPDATE source_accounts SET is_active = 0 WHERE username NOT IN (${placeholders})`).run(...uniqueCompetitors);
    }
  } catch (e) {
    console.warn(`[Sync Warning] Could not prune inactive sources: ${e.message}`);
  }

  for (const comp of uniqueCompetitors) {
    createSourceAccount({
      username: comp,
      page_id: targetPageId,
      is_active: 1
    });
    try {
      db.prepare('UPDATE source_accounts SET is_active = 1 WHERE username = ?').run(comp);
    } catch (e) {}
  }
  console.log(`🎯 Active tracked competitors (${uniqueCompetitors.length}): ${uniqueCompetitors.map(c => '@' + c).join(', ')}`);

  if (process.env.TELEGRAM_BOT_TOKEN) {
    setSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN);
  }
  const adminChatId = process.env.TELEGRAM_CHAT_ID || getSetting('telegram_chat_id') || '5443723531';
  setSetting('telegram_chat_id', adminChatId);
  console.log(`📱 Admin Telegram Chat ID configured: ${adminChatId}`);

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

  const notifier = require('../src/core/notifier');

  // 4. Run Watchtower Surveillance Scanner across competitor accounts
  const { scanAllSources } = require('../src/agents/watchtower/scanner');
  console.log('\n[Cron Runner] 🛰️ Step 1: Scanning monitored competitor accounts...');
  const scanResult = await scanAllSources({ limit: 6, quick: isDryRun });
  console.log(`[Cron Runner] ✓ Scan complete. Monitored sources checked.`);

  if (adminChatId) {
    const newCount = scanResult?.newPostsCount || 0;
    try {
      await notifier.sendTelegramMessage(
        adminChatId,
        `🛰️ <b>Watchtower Surveillance Scan Complete:</b>\n\n` +
        `• Checked: <b>${scanResult?.sourcesChecked || uniqueCompetitors.length}</b> competitor accounts\n` +
        `• Fresh Reels Indexed: <b>+${newCount}</b>\n` +
        `• Time: <code>${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)</code>\n\n` +
        `<i>Evaluating engagement metrics for current audience window...</i>`
      );
    } catch (e) {}
  }

  // 5. Evaluate and Select Candidate Posts (Virality Scoring)
  const { evaluateAndSelectPosts, getPeakWindowStatus } = require('../src/agents/watchtower/selector');
  const windowStatus = getPeakWindowStatus();
  console.log(`\n[Cron Runner] 📊 Step 2: Evaluating virality scores & peak windows (${windowStatus.currentTime})...`);

  const isForce = process.env.FORCE_PUBLISH === 'true';
  const selectedWinners = await evaluateAndSelectPosts({ force: isForce });
  console.log(`[Cron Runner] ✓ Content selection complete. Enqueued ${selectedWinners?.length || 0} winner(s).`);

  if (adminChatId && selectedWinners && selectedWinners.length > 0 && selectedWinners[0].winners?.length > 0) {
    const topW = selectedWinners[0].winners[0];
    try {
      await notifier.sendTelegramMessage(
        adminChatId,
        `🎯 <b>Top Viral Winner Selected:</b>\n\n` +
        `• Source: <code>#${topW.shortcode}</code>\n` +
        `• Virality Score: <b>${topW.compositeScore || 'High'}</b>\n` +
        `• Destination: <b>@gta6_updates_007</b>\n\n` +
        `🎬 <i>Rendering GTA 6 Vice City 1080p frame & Story card...</i>`
      );
    } catch (e) {}
  }

  // 6. Process Queued Jobs (Feed Publish + Story Reel Card)
  // Night Blackout Protection: Zero publishing during Indian night hours (20:30 - 08:30 IST)
  if (windowStatus.isNightBlackout && !isForce) {
    console.log(`\n[Cron Runner] 🌙 Indian Night Blackout Active (${windowStatus.currentTime}). Zero posting overnight to prevent Instagram bot flags. Jobs remain safely staged for morning peak.`);
  } else {
    const jobWorkerPool = require('../src/core/jobWorker');
    const { shortcodeToTimestamp } = require('../src/agents/watchtower/sourceReaders/guestReader');
    const queuedJobs = listPublishJobs({ status: 'queued', limit: 10 });
    console.log(`\n[Cron Runner] 🚀 Step 3: Processing queued publishing job(s) (${queuedJobs.length} available)...`);

    let publishedInCycle = 0;
    const targetPerCycle = pages[0]?.posts_per_cycle || 1;

    for (const job of queuedJobs) {
      if (publishedInCycle >= targetPerCycle) {
        console.log(`[Cron Runner] 🎯 Target for this cycle reached (${publishedInCycle}/${targetPerCycle} reels published).`);
        break;
      }

      // Source reel freshness validation: ensure competitor post was published within 24 hours
      const parsed = shortcodeToTimestamp(job.shortcode);
      if (parsed?.date) {
        const ageHours = (Date.now() - parsed.date.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          console.log(`[Cron Runner] ⏭️ Skipping stale Job #${job.id} [${job.shortcode}]: Source reel was published ${Math.round(ageHours)}h ago (>24h limit).`);
          try {
            db.prepare("UPDATE publish_jobs SET status = 'failed', error = ? WHERE id = ?").run(`Expired: Source reel is ${Math.round(ageHours)}h old`, job.id);
          } catch (e) {}
          continue;
        }
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would process Job #${job.id} for page #${job.page_id} (${job.shortcode})`);
        continue;
      }

      try {
        console.log(`[Cron Runner] 🎬 Executing Job #${job.id} [${job.shortcode}]...`);
        await jobWorkerPool.processJob(job.id, { forceInstant: true });
        const currentJob = getPublishJobById(job.id);
        if (currentJob && currentJob.status === 'published') {
          publishedInCycle++;
          console.log(`[Cron Runner] ✅ Job #${job.id} published live to Instagram! (${publishedInCycle}/${targetPerCycle})`);
          // Instant Telegram notification to admin
          try {
            await notifier.sendTelegramMessage(
              adminChatId,
              `🚀 <b>LIVE ON INSTAGRAM!</b>\n\n` +
              `📱 <b>Account:</b> @gta6_updates_007\n` +
              `🌐 <b>Post URL:</b> <a href="${currentJob.permalink}">${currentJob.permalink}</a>\n` +
              `🎬 <b>Competitor Source:</b> <code>#${currentJob.shortcode}</code>\n` +
              `🆔 <b>Media ID:</b> <code>${currentJob.ig_media_id}</code>\n\n` +
              `✨ <i>Published via Omni AI Autonomous Engine</i>`
            );
            console.log(`[Cron Runner] 📱 Admin Telegram alert sent to ${adminChatId}`);
          } catch (tgErr) {
            console.warn(`[Cron Runner] Telegram notification warning: ${tgErr.message}`);
          }
        } else {
          console.log(`[Cron Runner] ℹ️ Job #${job.id} ended with status: ${currentJob?.status}`);
        }
      } catch (err) {
        console.error(`[Cron Runner] ❌ Job #${job.id} failed: ${err.message}`);
      }
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
