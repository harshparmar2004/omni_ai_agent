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

  // 1b. Ensure destination Page #1 (@gta6_updates_007) and Page #2 (@movie_series_365) exist in database
  const { createPage } = require('../src/database');
  let page1 = db.prepare('SELECT * FROM pages WHERE id = 1').get();
  if (!page1) {
    console.log('📄 Creating default Page #1 (@gta6_updates_007)...');
    createPage({
      slug: 'gta6',
      name: 'GTA 6 Updates 007',
      handle: '@gta6_updates_007',
      ig_user_id: process.env.IG_USER_ID || '17841428668115319',
      access_token: process.env.META_ACCESS_TOKEN || '',
      caption_template: '{caption}\n\n{hashtags}',
      default_hashtags: '#gta6 #gtavi #rockstargames #vicecity #gta6leaks',
      attribution_enabled: 0,
      watermark_enabled: 0,
      post_mode: 'auto',
      posts_per_cycle: 1,
      daily_quota: 7,
      min_spacing_minutes: 90,
      is_active: 1
    });
  }

  let page2 = db.prepare('SELECT * FROM pages WHERE id = 2').get();
  if (!page2) {
    console.log('📄 Creating default Page #2 (@movie_series_365)...');
    createPage({
      slug: 'movies',
      name: 'Movie Recommendations',
      handle: '@movie_series_365',
      ig_user_id: process.env.MOVIE_IG_USER_ID || '29048404444808513',
      access_token: process.env.MOVIE_META_ACCESS_TOKEN || 'IGAAYJvfGkRZCRBZAGFTS1JKMnExVzFCWm9vaDQ2aE9PVlN3UjZApWUNtQ3VrZAUpCa2x2b19pbEI1ZA3gxWldtY1BVUFNHYTBfVFQ3LWV5UEozVlVwS2plV0w3d1lJRU04QzF0cmRNcEY2cHgtbDREeHNYU0thX2txNFdySEFxOU96awZDZD',
      caption_template: '{caption}\n\n{hashtags}',
      default_hashtags: '#movies #movierecommendations #filmtok #cinema #mustwatch #365movies',
      attribution_enabled: 0,
      watermark_enabled: 0,
      post_mode: 'auto',
      posts_per_cycle: 1,
      daily_quota: 7,
      min_spacing_minutes: 90,
      is_active: 1
    });
  }

  // Force both pages to 100% autonomous mode & verified credentials
  try {
    // Purge any stale non-reel discoveries from cached DB
    db.prepare("DELETE FROM discovered_posts WHERE media_type != 'reel' AND media_type != ''").run();
    // Expire any queued jobs older than 12 hours so stale backlog NEVER blocks or runs
    const expiredJobs = db.prepare("UPDATE publish_jobs SET status = 'failed', error = 'Expired: stale queued job (>12h old)' WHERE status = 'queued' AND created_at < datetime('now', '-12 hours')").run();
    if (expiredJobs.changes > 0) {
      console.log(`[Database Cleanup] 🧹 Purged ${expiredJobs.changes} stale queued jobs older than 12 hours.`);
    }
    // Expire old discovered posts
    db.prepare("UPDATE discovered_posts SET status = 'stale_expired' WHERE status = 'new' AND created_at < datetime('now', '-24 hours')").run();
    db.prepare("UPDATE pages SET slug = 'gta6', name = 'GTA 6 Updates 007', handle = '@gta6_updates_007', post_mode = 'auto', daily_quota = 7, min_spacing_minutes = 90, attribution_enabled = 0, watermark_enabled = 0, default_hashtags = '#gta6 #gtavi #rockstargames #vicecity #gta6leaks', is_active = 1 WHERE id = 1").run();
    db.prepare("UPDATE pages SET slug = 'movies', name = 'Movie Recommendations', handle = '@movie_series_365', post_mode = 'auto', daily_quota = 7, min_spacing_minutes = 90, attribution_enabled = 0, watermark_enabled = 0, default_hashtags = '#movies #movierecommendations #filmtok #cinema #mustwatch #365movies', is_active = 1 WHERE id = 2").run();
  } catch (e) {
    console.warn(`[Database Cleanup Warning] ${e.message}`);
  }

  if (process.env.META_ACCESS_TOKEN) {
    db.prepare('UPDATE pages SET access_token = ? WHERE id = 1').run(process.env.META_ACCESS_TOKEN);
  }
  const movieToken = process.env.MOVIE_META_ACCESS_TOKEN || 'IGAAYJvfGkRZCRBZAGFTS1JKMnExVzFCWm9vaDQ2aE9PVlN3UjZApWUNtQ3VrZAUpCa2x2b19pbEI1ZA3gxWldtY1BVUFNHYTBfVFQ3LWV5UEozVlVwS2plV0w3d1lJRU04QzF0cmRNcEY2cHgtbDREeHNYU0thX2txNFdySEFxOU96awZDZD';
  const movieIgId = process.env.MOVIE_IG_USER_ID || '29048404444808513';
  db.prepare('UPDATE pages SET access_token = ?, ig_user_id = ? WHERE id = 2').run(movieToken, movieIgId);
  let pages = getPages({ isActiveOnly: true });

  // 1c. Sync Competitor Accounts from database + config/competitors.json + COMPETITOR_ACCOUNTS env var
  const { createSourceAccount } = require('../src/database');
  let gtaCompetitors = ['grandtheftauto6', 'gta6.only', 'paradoks.plays', 'gta6latest', 'rockstargames'];
  let movieCompetitors = [];

  const competitorsJsonPath = path.join(__dirname, '..', 'config', 'competitors.json');
  if (fs.existsSync(competitorsJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(competitorsJsonPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (parsed.gta6 && Array.isArray(parsed.gta6)) gtaCompetitors = parsed.gta6;
        if (parsed.movies && Array.isArray(parsed.movies)) movieCompetitors = parsed.movies;
      } else if (Array.isArray(parsed)) {
        gtaCompetitors = parsed;
      }
    } catch (e) {
      console.warn(`[Config Warning] Could not parse config/competitors.json: ${e.message}`);
    }
  }

  if (process.env.COMPETITOR_ACCOUNTS) {
    const fromEnv = process.env.COMPETITOR_ACCOUNTS.split(',').map(s => s.trim()).filter(Boolean);
    gtaCompetitors.push(...fromEnv);
  }

  // Register GTA 6 sources for Page 1
  const cleanGta = [...new Set(gtaCompetitors.map(c => c.replace(/^@/, '').toLowerCase().trim()))].filter(Boolean);
  try {
    const placeholders = cleanGta.map(() => '?').join(',');
    db.prepare(`DELETE FROM source_accounts WHERE page_id = 1 AND username NOT IN (${placeholders})`).run(...cleanGta);
  } catch (e) {}
  for (const comp of cleanGta) {
    createSourceAccount({ username: comp, page_id: 1, is_active: 1 });
    try { db.prepare('UPDATE source_accounts SET page_id = 1, is_active = 1 WHERE username = ?').run(comp); } catch (e) {}
  }

  // Register Movie sources for Page 2
  const cleanMovies = [...new Set(movieCompetitors.map(c => c.replace(/^@/, '').toLowerCase().trim()))].filter(Boolean);
  if (cleanMovies.length === 0) {
    try { db.prepare('DELETE FROM source_accounts WHERE page_id = 2').run(); } catch (e) {}
  } else {
    try {
      const placeholders = cleanMovies.map(() => '?').join(',');
      db.prepare(`DELETE FROM source_accounts WHERE page_id = 2 AND username NOT IN (${placeholders})`).run(...cleanMovies);
    } catch (e) {}
    for (const comp of cleanMovies) {
      createSourceAccount({ username: comp, page_id: 2, is_active: 1 });
      try { db.prepare('UPDATE source_accounts SET page_id = 2, is_active = 1 WHERE username = ?').run(comp); } catch (e) {}
    }
  }

  const allActiveSources = [...cleanGta, ...cleanMovies];
  console.log(`🎯 Active tracked competitors (${allActiveSources.length}): GTA 6: [${cleanGta.map(c => '@' + c).join(', ')}] | Movies: [${cleanMovies.map(c => '@' + c).join(', ')}]`);

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

  // 5. Evaluate and Select Candidate Posts (Virality Scoring)
  const { evaluateAndSelectPosts, getPeakWindowStatus } = require('../src/agents/watchtower/selector');
  const windowStatus = getPeakWindowStatus();
  console.log(`\n[Cron Runner] 📊 Step 2: Evaluating virality scores & peak windows (${windowStatus.currentTime})...`);

  const isForce = process.env.FORCE_PUBLISH === 'true';
  const selectedWinners = await evaluateAndSelectPosts({ force: isForce });
  console.log(`[Cron Runner] ✓ Content selection complete. Enqueued ${selectedWinners?.length || 0} winner(s).`);

  const sourcesCount = scanResult?.sourcesChecked || allActiveSources.length;
  const newReelsCount = scanResult?.newPostsCount || 0;
  const winnersByPage = (selectedWinners || []).filter(w => w.winners && w.winners.length > 0);

  // Single Clean Message 1: Scan Summary + Finalized Reel to Post per target page
  if (adminChatId) {
    if (winnersByPage.length > 0) {
      for (const wp of winnersByPage) {
        const topW = wp.winners[0];
        const pageObj = pages.find(p => p.id === wp.pageId) || { handle: wp.handle, name: 'Connected Channel' };
        try {
          await notifier.sendTelegramMessage(
            adminChatId,
            `🛰️ <b>Agent 2: Watchtower Pipeline Engaged</b>\n\n` +
            `📊 <b>Surveillance Summary:</b>\n` +
            `• Monitored Sources Checked: <b>${sourcesCount} accounts</b>\n` +
            `• Fresh Reels Ingested: <b>+${newReelsCount} reels</b>\n` +
            `• Target Audience Window: <b>${windowStatus.activeWindow ? windowStatus.activeWindow.name : 'Peak Wave'}</b>\n\n` +
            `🎯 <b>Finalized Reel to Post:</b>\n` +
            `• Destination: <b>${pageObj.handle}</b> (${pageObj.name})\n` +
            `• Source Reel: <a href="https://www.instagram.com/reel/${topW.shortcode}/">https://www.instagram.com/reel/${topW.shortcode}/</a>\n` +
            `• Source ID: <code>#${topW.shortcode}</code>\n` +
            `• Virality Composite Score: <b>${topW.compositeScore || 'High'}</b>\n\n` +
            `⏳ <i>Pipeline active: Applying bespoke template, generating AI hook, and publishing to Feed + Story...</i>`
          );
        } catch (e) {
          console.warn(`[Cron Runner] Telegram Message 1 error: ${e.message}`);
        }
      }
    } else {
      try {
        await notifier.sendTelegramMessage(
          adminChatId,
          `🛰️ <b>Agent 2: Surveillance Scan Complete</b>\n\n` +
          `• Sources Monitored: <b>${sourcesCount} accounts</b>\n` +
          `• Fresh Reels Ingested: <b>+${newReelsCount} reels</b>\n` +
          `• Status: <i>${windowStatus.isNightBlackout ? '🌙 Night Blackout Active (Zero overnight posting to prevent bot flags)' : 'Window quota already reached. Waiting for next peak slot.'}</i>`
        );
      } catch (e) {}
    }
  }

  // 6. Process Queued Jobs (Feed Publish + Story Reel Card)
  // Night Blackout Protection: Zero publishing during Indian night hours (20:30 - 08:30 IST)
  if (windowStatus.isNightBlackout && !isForce) {
    console.log(`\n[Cron Runner] 🌙 Indian Night Blackout Active (${windowStatus.currentTime}). Zero posting overnight to prevent Instagram bot flags. Jobs remain safely staged for morning peak.`);
  } else {
    const jobWorkerPool = require('../src/core/jobWorker');
    const { shortcodeToTimestamp } = require('../src/agents/watchtower/sourceReaders/guestReader');
    const queuedJobs = listPublishJobs({ status: 'queued', limit: 20 });
    console.log(`\n[Cron Runner] 🚀 Step 3: Processing queued publishing job(s) (${queuedJobs.length} available)...`);

    const publishedByPage = {};
    for (const p of pages) {
      publishedByPage[p.id] = 0;
    }

    for (const job of queuedJobs) {
      const page = pages.find(p => p.id === job.page_id) || getPageById(job.page_id);
      const targetPerCycle = page?.posts_per_cycle || 1;
      const currentCount = publishedByPage[job.page_id] || 0;

      if (currentCount >= targetPerCycle) {
        console.log(`[Cron Runner] 🎯 Target for ${page?.handle || job.page_id} reached (${currentCount}/${targetPerCycle} reels published).`);
        continue;
      }

      // Source reel freshness validation: ensure competitor post was published within 48 hours
      const parsed = shortcodeToTimestamp(job.shortcode);
      if (parsed?.date) {
        const ageHours = (Date.now() - parsed.date.getTime()) / (1000 * 60 * 60);
        if (ageHours > 48) {
          console.log(`[Cron Runner] ⏭️ Skipping stale Job #${job.id} [${job.shortcode}]: Source reel was published ${Math.round(ageHours)}h ago (>48h limit).`);
          try {
            db.prepare("UPDATE publish_jobs SET status = 'failed', error = ? WHERE id = ?").run(`Expired: Source reel is ${Math.round(ageHours)}h old`, job.id);
          } catch (e) {}
          continue;
        }
      }

      if (isDryRun) {
        console.log(`[Dry Run] Would process Job #${job.id} for page #${job.page_id} (${page?.handle || 'Page'}) [${job.shortcode}]`);
        publishedByPage[job.page_id] = (publishedByPage[job.page_id] || 0) + 1;
        continue;
      }

      try {
        console.log(`[Cron Runner] 🎬 Executing Job #${job.id} for ${page?.handle} [${job.shortcode}]...`);
        await jobWorkerPool.processJob(job.id, { forceInstant: true });
        const currentJob = getPublishJobById(job.id);
        if (currentJob && currentJob.status === 'published') {
          publishedByPage[job.page_id] = (publishedByPage[job.page_id] || 0) + 1;
          console.log(`[Cron Runner] ✅ Job #${job.id} published live to Instagram for ${page?.handle}!`);
          // Message 2: Live Publishing Confirmation (Clean single notification)
          try {
            const captionSnippet = currentJob.caption
              ? currentJob.caption.split('\n').filter(Boolean).slice(0, 2).join('\n')
              : '';
            await notifier.sendTelegramMessage(
              adminChatId,
              `🚀 <b>LIVE ON INSTAGRAM!</b>\n\n` +
              `📱 <b>Account:</b> ${page?.handle || '@' + currentJob.page_slug} (${page?.name || 'Omni Channel'})\n` +
              `🌐 <b>Live Reel:</b> <a href="${currentJob.permalink}">${currentJob.permalink}</a>\n` +
              `🎬 <b>Source Reel:</b> <a href="https://www.instagram.com/reel/${currentJob.shortcode}/">https://www.instagram.com/reel/${currentJob.shortcode}/</a>\n` +
              `🆔 <b>Media ID:</b> <code>${currentJob.ig_media_id}</code>\n\n` +
              (captionSnippet ? `📝 <b>Caption Hook:</b>\n<blockquote>${captionSnippet}</blockquote>\n\n` : '') +
              `✨ <i>Published successfully to Feed & Story via Omni AI Engine</i>`
            );
            console.log(`[Cron Runner] 📱 Live confirmation sent to ${adminChatId}`);
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
