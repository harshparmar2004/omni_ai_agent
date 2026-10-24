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

  // Peak window definitions
  const windows = [
    {
      id: 'morning',
      name: 'Morning Audience Wave',
      rangeStr: '08:00 – 11:00',
      startHour: 8.0,
      endHour: 11.0,
      target: 3
    },
    {
      id: 'evening',
      name: 'Evening Prime-Time Viral Surge',
      rangeStr: '17:00 – 21:00',
      startHour: 17.0,
      endHour: 21.0,
      target: 5
    },
    {
      id: 'midnight',
      name: 'Midnight Night-Owl Wave',
      rangeStr: '23:00 – 01:00',
      startHour: 23.0,
      endHour: 1.0,
      target: 4
    }
  ];

  let activeWindow = null;

  if (t >= 8.0 && t < 11.0) {
    activeWindow = windows[0];
  } else if (t >= 17.0 && t < 21.0) {
    activeWindow = windows[1];
  } else if (t >= 23.0 || t < 1.0) {
    activeWindow = windows[2];
  }

  let nextWindow = null;
  if (!activeWindow) {
    if (t < 8.0) nextWindow = { ...windows[0], countdown: 'Starts at 08:00' };
    else if (t < 17.0) nextWindow = { ...windows[1], countdown: 'Starts at 17:00' };
    else if (t < 23.0) nextWindow = { ...windows[2], countdown: 'Starts at 23:00' };
    else nextWindow = { ...windows[0], countdown: 'Starts at 08:00 tomorrow' };
  }

  let windowStartIso = null;
  if (activeWindow) {
    const startH = Math.floor(activeWindow.startHour);
    const d = new Date();
    if (activeWindow.id === 'midnight' && z.hour < 1) {
      d.setDate(d.getDate() - 1);
    }
    d.setHours(startH, 0, 0, 0);
    windowStartIso = d.toISOString();
  }

  return {
    enabled,
    timezone,
    currentTime: `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')} (${timezone})`,
    activeWindow,
    nextWindow,
    windowStartIso,
    dailyTargetTotal: 12
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
    const candidates = rawCandidates.filter(c => {
      if (c.media_type && c.media_type !== 'reel') return false;
      return true;
    });

    if (candidates.length === 0) {
      continue;
    }

    // 4. Score candidate posts by real engagement & freshness decay (48h window)
    const now = Date.now();
    const scored = candidates.map(c => {
      const postedAtMs = c.posted_at ? new Date(c.posted_at).getTime() : now;
      const ageHours = Math.max(0, (now - postedAtMs) / (1000 * 60 * 60));
      const freshnessDecay = Math.max(0.2, 1 - (ageHours / 48));

      // Engagement: likes + 2*comments
      const rawEngagement = (c.like_count || 0) + ((c.comment_count || 0) * 2);
      const baseEngagement = rawEngagement > 0 ? rawEngagement : 100;
      let compositeScore = Math.round(baseEngagement * freshnessDecay);

      return {
        ...c,
        compositeScore
      };
    });

    // Sort descending by composite virality score
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
