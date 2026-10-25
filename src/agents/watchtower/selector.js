const {
  getPages,
  listDiscoveredPosts,
  updateDiscoveredPost,
  getPublishedCountToday,
  getPostsCountInWindow,
  getSetting
} = require('../../database');
const { enqueueJob } = require('../../core/jobQueue');
const notifier = require('../../core/notifier');

/**
 * OmniStudio v7 — Watchtower Content Selector & Peak Traffic Windows Engine
 * Evaluates candidate discoveries per page using engagement and freshness metrics,
 * and paces publishing into high-traffic Instagram audience windows:
 * - Morning:  08:00 - 11:00 (Target: 3 reels)
 * - Evening:  17:00 - 21:00 (Target: 5 reels)
 * - Midnight: 23:00 - 01:00 (Target: 4 reels)
 */

function getZonedTime(timezone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    const hour = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10) - 1;
    const day = parseInt(map.day, 10);
    return { hour, minute, timeDecimal: hour + (minute / 60), year, month, day, dateStr: `${map.year}-${map.month}-${map.day}` };
  } catch (e) {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    return { hour: h, minute: m, timeDecimal: h + (m / 60), year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), dateStr: d.toISOString().split('T')[0] };
  }
}

function getPeakWindowStatus(customTimezone = null) {
  const enabled = getSetting('peak_windows_enabled', 'true') === 'true';
  const timezone = customTimezone || getSetting('peak_timezone', 'Asia/Kolkata');
  const z = getZonedTime(timezone);
  const t = z.timeDecimal;

  // Peak window definitions: Morning (8:30 - 11:30 IST) & Evening (17:00 - 20:30 IST)
  // Night blackout: 20:30 PM to 08:30 AM IST (ZERO POSTING)
  const windows = [
    {
      id: 'morning',
      name: 'Morning Peak Audience Wave',
      rangeStr: '08:30 – 11:30 IST',
      startHour: 8.5,
      endHour: 11.5,
      target: 3
    },
    {
      id: 'evening',
      name: 'Evening Prime-Time Viral Surge',
      rangeStr: '17:00 – 20:30 IST',
      startHour: 17.0,
      endHour: 20.5,
      target: 4
    }
  ];

  let activeWindow = null;
  const isNightBlackout = (t >= 20.5 || t < 8.5);

  if (t >= 8.5 && t < 11.5) {
    activeWindow = windows[0];
  } else if (t >= 17.0 && t < 20.5) {
    activeWindow = windows[1];
  }

  let nextWindow = null;
  if (!activeWindow) {
    if (t < 8.5) nextWindow = { ...windows[0], countdown: 'Starts at 08:30 AM IST' };
    else if (t < 17.0) nextWindow = { ...windows[1], countdown: 'Starts at 05:00 PM IST' };
    else nextWindow = { ...windows[0], countdown: 'Starts at 08:30 AM IST tomorrow' };
  }

  let windowStartIso = null;
  if (activeWindow) {
    const startH = Math.floor(activeWindow.startHour);
    const startM = Math.round((activeWindow.startHour - startH) * 60);
    const d = new Date();
    d.setHours(startH, startM, 0, 0);
    windowStartIso = d.toISOString();
  }

  return {
    enabled,
    timezone,
    currentTime: `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')} (${timezone})`,
    activeWindow,
    nextWindow,
    windowStartIso,
    isNightBlackout,
    dailyTargetTotal: 7
  };
}

async function evaluateAndSelectPosts(options = {}) {
  const activePages = getPages({ isActiveOnly: true });
  const results = [];
  const windowStatus = getPeakWindowStatus();

  console.log(`[Watchtower Selector] ⏱️ Peak Windows Active: ${windowStatus.activeWindow ? windowStatus.activeWindow.name : 'None (Outside Peak Windows)'} | Time: ${windowStatus.currentTime}`);

  for (const page of activePages) {
    // 1. Check remaining daily quota
    const todayCount = getPublishedCountToday(page.id);
    const dailyQuota = page.daily_quota || 12;
    const dailyQuotaRemaining = Math.max(0, dailyQuota - todayCount);

    if (dailyQuotaRemaining === 0) {
      console.log(`[Watchtower Selector] ℹ️ Page ${page.handle} reached daily quota (${todayCount}/${dailyQuota}).`);
      continue;
    }

    // 2. Determine allowed post count for this cycle
    let allowedCount = page.posts_per_cycle || 1;

    // Strict Night Blackout Enforcement (20:30 PM to 08:30 AM IST)
    if (windowStatus.isNightBlackout && !options.allowNight) {
      console.log(`[Watchtower Selector] 🌙 Indian Night Blackout Active (${windowStatus.currentTime}). Zero posting overnight to prevent Instagram bot flags. Staging reels for morning peak.`);
      continue;
    }

    if (windowStatus.enabled) {
      if (windowStatus.activeWindow) {
        const countInWindow = getPostsCountInWindow(page.id, windowStatus.windowStartIso);
        const windowRemaining = Math.max(0, windowStatus.activeWindow.target - countInWindow);

        console.log(`[Watchtower Selector] 🚀 Window [${windowStatus.activeWindow.name}]: ${countInWindow}/${windowStatus.activeWindow.target} posted so far.`);

        if (windowRemaining === 0 && !options.force) {
          console.log(`[Watchtower Selector] ℹ️ Page ${page.handle} reached window target for ${windowStatus.activeWindow.name}.`);
          continue;
        }

        allowedCount = Math.min(windowRemaining, dailyQuotaRemaining);
      } else if (!options.force) {
        console.log(`[Watchtower Selector] ⏳ Outside peak windows (${windowStatus.currentTime}). Staging candidate reels in reservoir for ${windowStatus.nextWindow?.name || 'next window'}.`);
        continue;
      }
    }

    // 3. Fetch 'new' discoveries mapped to this page's sources (strictly video reels)
    const rawCandidates = listDiscoveredPosts({
      pageId: page.id,
      status: 'new'
    });

    const now = Date.now();
    const MAX_AGE_HOURS = 48; // Strictly reject stale posts older than 48 hours

    const candidates = rawCandidates.filter(c => {
      if (c.media_type && c.media_type !== 'reel') return false;
      const postedAtMs = c.posted_at ? new Date(c.posted_at).getTime() : now;
      const ageHours = (now - postedAtMs) / (1000 * 60 * 60);
      if (ageHours > MAX_AGE_HOURS) {
        try { updateDiscoveredPost(c.id, { status: 'stale_rejected' }); } catch (e) {}
        return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      continue;
    }

    // 4. Score candidate posts prioritizing RECENCY (Newest reel first)
    const scored = candidates.map(c => {
      const postedAtMs = c.posted_at ? new Date(c.posted_at).getTime() : now;
      const ageHours = Math.max(0, (now - postedAtMs) / (1000 * 60 * 60));
      
      // Aggressive recency decay: reels <6h get ~1.0, <12h get 0.8, <24h get 0.5, >24h get 0.1
      const freshnessBoost = Math.max(0.1, 1 - (ageHours / 24));
      
      const rawEngagement = (c.like_count || 0) + ((c.comment_count || 0) * 2);
      // Recency base priority: higher ID is more recently discovered
      const baseRecency = 10000 + (c.id * 10);
      const compositeScore = Math.round((baseRecency + rawEngagement) * freshnessBoost);

      return {
        ...c,
        ageHours: Math.round(ageHours),
        compositeScore
      };
    });

    // Sort descending by compositeScore (strictly newest/freshest first)
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Take up to allowedCount
    const takeCount = Math.min(allowedCount, scored.length);
    if (takeCount === 0) continue;

    const winners = scored.slice(0, takeCount);
    console.log(`[Watchtower Selector] 🎯 Selected ${winners.length} winner posts for ${page.handle} (Mode: ${page.post_mode.toUpperCase()})`);

    const adminChatId = getSetting('telegram_chat_id') || process.env.TELEGRAM_CHAT_ID || '5443723531';
    let enqueued = 0;
    let reviewCount = 0;

    for (const post of winners) {
      if (page.post_mode === 'auto') {
        try {
          await enqueueJob({
            agent: 'watchtower',
            pageId: page.id,
            discoveredPostId: post.id,
            shortcode: post.shortcode,
            sourceUrl: post.url,
            caption: '',
            status: 'queued',
            telegramChatId: adminChatId
          });

          updateDiscoveredPost(post.id, {
            status: 'selected',
            score: post.compositeScore
          });

          enqueued++;
        } catch (e) {
          console.error(`[Watchtower Selector] Enqueue error: ${e.message}`);
        }
      } else {
        updateDiscoveredPost(post.id, {
          status: 'pending_review',
          score: post.compositeScore
        });
        reviewCount++;
      }
    }

    results.push({
      pageId: page.id,
      handle: page.handle,
      mode: page.post_mode,
      evaluated: scored.length,
      enqueued,
      reviewCount,
      winners
    });
  }

  return results;
}

module.exports = {
  evaluateAndSelectPosts,
  getPeakWindowStatus
};
