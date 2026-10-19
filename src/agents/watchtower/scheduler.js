const {
  getSetting,
  setSetting,
  createAgentRun,
  updateAgentRun,
  listAgentRuns
} = require('../../database');
const { scanAllSources } = require('./scanner');
const { evaluateAndSelectPosts } = require('./selector');
const { pruneExpiredMediaCache } = require('../../core/mediaCleaner');
const notifier = require('../../core/notifier');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class WatchtowerScheduler {
  constructor() {
    this.timerHandle = null;
    this.isScanning = false;
    this.isRunning = false;
  }

  calculateNextIntervalMs() {
    const now = new Date();
    const currentHour = now.getHours() + (now.getMinutes() / 60);

    // Night mode cooldown between 01:00 AM and 06:30 AM
    const isNight = currentHour >= 1.0 && currentHour < 6.5;
    if (isNight) {
      const nightHours = 5;
      const nightJitterMin = randomInt(15, 45);
      const totalMinutes = (nightHours * 60) + nightJitterMin;
      console.log(`[Watchtower Chronos] 🌙 Night Mode Active (Circadian Cooldown). Next scan in ${nightHours}h ${nightJitterMin}m.`);
      return totalMinutes * 60 * 1000;
    }

    // Standard interval: base (default 3h) + dynamic jitter (11 - 35 min)
    const baseHours = parseInt(getSetting('watchtower_interval_hours', '3'), 10);
    const jitterMin = randomInt(11, 35);
    const totalMinutes = (baseHours * 60) + jitterMin;
    console.log(`[Watchtower Chronos] ⏱️ Next scan in ${baseHours}h ${jitterMin}m (${totalMinutes}m total).`);
    return totalMinutes * 60 * 1000;
  }

  scheduleNext(delayMs = null) {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const intervalMs = delayMs !== null ? delayMs : this.calculateNextIntervalMs();
    const nextDate = new Date(Date.now() + intervalMs);

    setSetting('watchtower_next_run_at', nextDate.toISOString());

    console.log(`[Watchtower Chronos] 📅 Scheduled next scan for: ${nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`);

    this.timerHandle = setTimeout(() => {
      this.executeCycle().catch(e => console.error('[Watchtower Cycle Error]:', e));
    }, intervalMs);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Watchtower Scheduler] 🛰️ Initializing 24/7 Watchtower Daemon...');

    // Check if next run was already scheduled in DB
    const savedNextRun = getSetting('watchtower_next_run_at');
    if (savedNextRun) {
      const remainingMs = new Date(savedNextRun).getTime() - Date.now();
      if (remainingMs > 5000 && remainingMs < (8 * 60 * 60 * 1000)) {
        console.log(`[Watchtower Scheduler] Resuming existing schedule: scan due in ${(remainingMs / 1000 / 60).toFixed(1)} min.`);
        this.scheduleNext(remainingMs);
        return;
      }
    }

    // Initial scan after 45s boot cooldown
    this.scheduleNext(45000);

    // Lightweight peak traffic window evaluation check every 15 minutes
    this.windowCheckInterval = setInterval(async () => {
      try {
        const isPaused = getSetting('watchtower_paused', '0') === '1';
        if (!isPaused && !this.isScanning) {
          await evaluateAndSelectPosts();
        }
      } catch (e) {
        console.warn('[Watchtower Window Check Notice]:', e.message);
      }
    }, 15 * 60 * 1000);
  }

  stop() {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    if (this.windowCheckInterval) {
      clearInterval(this.windowCheckInterval);
      this.windowCheckInterval = null;
    }
    this.isRunning = false;
  }

  async executeCycle(options = {}) {
    const isPaused = getSetting('watchtower_paused', '0') === '1';
    if (isPaused && !options.force) {
      console.log('[Watchtower] ⏸️ Scanner is paused. Skipping scheduled cycle.');
      this.scheduleNext();
      return { success: false, message: 'Watchtower paused' };
    }

    if (this.isScanning) {
      console.log('[Watchtower] Scan already in progress.');
      return { success: false, message: 'Scan in progress' };
    }

    this.isScanning = true;
    const run = createAgentRun({ agent: 'watchtower' });
    setSetting('watchtower_last_run_at', new Date().toISOString());

    console.log(`\n======================================================`);
    console.log(`[Watchtower] 🛰️ Commencing Surveillance Cycle Run #${run.id}`);
    console.log(`======================================================\n`);

    let scanRes = null;
    let selectRes = null;

    try {
      // 1. Scan Sources
      scanRes = await scanAllSources({ runId: run.id, quick: options.quick });

      // 2. Evaluate & Select
      selectRes = await evaluateAndSelectPosts({ force: options.force });

      // 3. Auto-Prune Media Cache
      try {
        pruneExpiredMediaCache();
      } catch (e) {}

      // 4. Update Agent Run Record
      const finishedAt = new Date().toISOString();
      const autoEnqueued = selectRes.reduce((acc, r) => acc + (r.enqueued || 0), 0);

      updateAgentRun(run.id, {
        finished_at: finishedAt,
        sources_checked: scanRes.sourcesChecked,
        new_posts: scanRes.newPostsCount,
        published: autoEnqueued,
        errors: scanRes.errors || []
      });

      // 5. Send Telegram Summary Report (PRD §7.2)
      const allowedChatId = getSetting('telegram_allowed_chat_ids', '5443723531').split(',')[0]?.trim();
      if (allowedChatId) {
        const nextTimeStr = new Date(Date.now() + 3 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const summaryLines = [
          `🛰 <b>Watchtower Run #${run.id} Summary</b>`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `🔍 <b>Sources Checked:</b> ${scanRes.sourcesChecked}`,
          `⚡ <b>New Posts Found:</b> ${scanRes.newPostsCount}`,
          `🚀 <b>Dispatched to Publish:</b> ${autoEnqueued}`,
          ``
        ];

        for (const sr of selectRes) {
          if (sr.enqueued > 0) {
            summaryLines.push(`• <b>${sr.handle}:</b> ${sr.enqueued} post(s) queued for auto-posting`);
          }
          if (sr.reviewCount > 0) {
            summaryLines.push(`• <b>${sr.handle}:</b> ${sr.reviewCount} post(s) waiting in review queue`);
          }
        }

        if (scanRes.errors.length > 0) {
          summaryLines.push(``);
          summaryLines.push(`⚠️ <b>Failures:</b> ${scanRes.errors.length} source(s) could not be scraped.`);
        }

        summaryLines.push(`━━━━━━━━━━━━━━━━━━━━`);
        summaryLines.push(`Next cycle: ~${nextTimeStr}`);

        notifier.sendTelegramMessage(allowedChatId, summaryLines.join('\n')).catch(() => {});
      }

      notifier.emitDashboardEvent('watchtower_cycle_complete', {
        runId: run.id,
        sourcesChecked: scanRes.sourcesChecked,
        newPosts: scanRes.newPostsCount,
        autoEnqueued
      });

    } catch (err) {
      console.error(`[Watchtower Fatal Cycle Error]: ${err.message}`);
      updateAgentRun(run.id, {
        finished_at: new Date().toISOString(),
        errors: [{ error: err.message }]
      });
    } finally {
      this.isScanning = false;
      this.scheduleNext();
    }

    return {
      success: true,
      runId: run.id,
      scan: scanRes,
      selection: selectRes
    };
  }

  getStatus() {
    const isPaused = getSetting('watchtower_paused', '0') === '1';
    const nextRunAt = getSetting('watchtower_next_run_at');
    let nextRunInMs = 0;
    if (nextRunAt) {
      nextRunInMs = Math.max(0, new Date(nextRunAt).getTime() - Date.now());
    }
    return {
      isRunning: this.isRunning,
      isScanning: this.isScanning,
      isPaused,
      paused: isPaused,
      lastRunAt: getSetting('watchtower_last_run_at'),
      nextRunAt,
      nextRunInMs,
      intervalHours: parseInt(getSetting('watchtower_interval_hours', '3'), 10)
    };
  }
}

const watchtowerScheduler = new WatchtowerScheduler();

module.exports = watchtowerScheduler;
