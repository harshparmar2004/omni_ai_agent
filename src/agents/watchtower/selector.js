const {
  getPages,
  listDiscoveredPosts,
  updateDiscoveredPost,
  getPublishedCountToday,
  getPostsCountInWindow,
  getSetting,
  getDb
} = require('../../database');
const { enqueueJob } = require('../../core/jobQueue');
const notifier = require('../../core/notifier');
const { shortcodeToTimestamp } = require('./sourceReaders/guestReader');

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

  // Peak window definitions: Morning (08:30 - 11:30 IST), Lunch (12:30 - 16:30 IST), Evening (17:00 - 21:30 IST)
  // Night blackout: 21:30 PM to 08:30 AM IST (ZERO POSTING to prevent bot flags)
  const windows = [
    {
      id: 'morning',
      name: 'Morning Audience Wave',
      rangeStr: '08:30 – 11:30 IST',
      startHour: 8.5,
      endHour: 11.5,
      target: 2
    },
    {
      id: 'lunch',
      name: 'Lunchtime & Afternoon Surge',
      rangeStr: '12:30 – 16:30 IST',
      startHour: 12.5,
      endHour: 16.5,
      target: 2
    },
    {
      id: 'evening',
      name: 'Evening Prime-Time Viral Peak',
      rangeStr: '17:00 – 21:30 IST',
      startHour: 17.0,
      endHour: 21.5,
      target: 3
    }
  ];

  let activeWindow = null;
  const isNightBlackout = (t >= 21.5 || t < 8.5);

  if (t >= 8.5 && t < 11.5) {
    activeWindow = windows[0];
  } else if (t >= 12.5 && t < 16.5) {
    activeWindow = windows[1];
  } else if (t >= 17.0 && t < 21.5) {
    activeWindow = windows[2];
  }

  let nextWindow = null;
  if (!activeWindow) {
    if (t < 8.5) nextWindow = { ...windows[0], countdown: 'Starts at 08:30 AM IST' };
    else if (t < 12.5) nextWindow = { ...windows[1], countdown: 'Starts at 12:30 PM IST' };
    else if (t < 17.0) nextWindow = { ...windows[2], countdown: 'Starts at 05:00 PM IST' };
    else nextWindow = { ...windows[0], countdown: 'Starts at 08:30 AM IST tomorrow' };
  }

  let windowStartIso = null;
  if (activeWindow) {
    const startH = Math.floor(activeWindow.startHour);
    const startM = Math.round((activeWindow.startHour - startH) * 60);
    // In IST (UTC + 5:30), offset is +330 minutes
    const offsetMs = 330 * 60 * 1000;
    const istMidnightUtc = Date.UTC(z.year, z.month, z.day, 0, 0, 0) - offsetMs;
    const windowStartMs = istMidnightUtc + (startH * 60 + startM) * 60 * 1000;
    windowStartIso = new Date(windowStartMs).toISOString();
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

    // 3. Fetch candidate discoveries mapped to this page's sources (strictly video reels)
    const rawCandidates = listDiscoveredPosts({
      pageId: page.id
    }).filter(c => c.status === 'new' || c.status === 'reservoir_buffer');

    // Strict Deduplication: Fetch all shortcodes that have already been queued or published for this page
    const existingShortcodes = new Set();
    try {
      const rows = getDb().prepare("SELECT shortcode FROM publish_jobs WHERE page_id = ? AND status != 'failed'").all(page.id);
      for (const r of rows) existingShortcodes.add(r.shortcode);
    } catch (e) {}

    const now = Date.now();
    const MAX_RESERVOIR_AGE_HOURS = 336; // 14 days backlog buffer for high-scoring evergreen reels

    // Filter valid, unposted video reels within 14 days
    const validCandidates = rawCandidates.filter(c => {
      if (c.media_type && c.media_type !== 'reel') return false;
      if (existingShortcodes.has(c.shortcode)) return false;

      const parsed = shortcodeToTimestamp(c.shortcode);
      const postDate = parsed?.date || (c.posted_at ? new Date(c.posted_at) : new Date());
      const ageHours = (now - postDate.getTime()) / (1000 * 60 * 60);
      if (ageHours > MAX_RESERVOIR_AGE_HOURS) {
        try { updateDiscoveredPost(c.id, { status: 'stale_rejected' }); } catch (e) {}
        return false;
      }
      return true;
    });

    if (validCandidates.length === 0) {
      console.log(`[Watchtower Selector] ℹ️ Page ${page.handle} has no valid candidate reels in feed or reservoir.`);
      continue;
    }

    // 4. Divide into 2 Tiers:
    // Tier 1: Fresh Viral Candidates (< 24 hours old)
    // Tier 2: Evergreen Fallback Reservoir (24h - 14d backlog buffer)
    const scoredCandidates = validCandidates.map(c => {
      const parsed = shortcodeToTimestamp(c.shortcode);
      const postDate = parsed?.date || (c.posted_at ? new Date(c.posted_at) : new Date());
      const postTimeMs = postDate.getTime();
      const ageHours = Math.max(0, (now - postTimeMs) / (1000 * 60 * 60));

      let freshnessMultiplier = 1.0;
      if (ageHours > 72) freshnessMultiplier = 0.35;
      else if (ageHours > 24) freshnessMultiplier = 0.55;
      else if (ageHours > 12) freshnessMultiplier = 0.75;
      else if (ageHours > 6) freshnessMultiplier = 0.9;

      const rawEngagement = (c.like_count || 0) + ((c.comment_count || 0) * 2);
      const compositeScore = Math.round((1000000 + (postTimeMs / 1000000) + rawEngagement) * freshnessMultiplier);

      return {
        ...c,
        postDate,
        postTimeMs,
        ageHours: Math.round(ageHours * 10) / 10,
        compositeScore,
        isFresh: ageHours <= 24
      };
    });

    const tier1Fresh = scoredCandidates.filter(c => c.isFresh);
    const tier2Reservoir = scoredCandidates.filter(c => !c.isFresh);

    // Sort Tier 1 descending by true post publication time (absolute freshest first)
    tier1Fresh.sort((a, b) => b.postTimeMs - a.postTimeMs);

    // Sort Tier 2 descending by composite score (highest virality backlog first)
    tier2Reservoir.sort((a, b) => b.compositeScore - a.compositeScore);

    const winners = [];
    const usedCreators = new Set();

    // Step A: Pick top fresh reels from Tier 1 (with creator diversity)
    for (const post of tier1Fresh) {
      if (winners.length >= allowedCount) break;
      const creator = (post.source_username || '').toLowerCase();
      if (creator && usedCreators.has(creator) && tier1Fresh.length > allowedCount) {
        continue; // Try to pick different creators
      }
      post.selection_tier = 'fresh';
      winners.push(post);
      if (creator) usedCreators.add(creator);
    }

    // Step B: If fewer than allowedCount, engage Tier 2 Reservoir Fallback (2nd/3rd ranked backlog)
    if (winners.length < allowedCount && tier2Reservoir.length > 0) {
      const needed = allowedCount - winners.length;
      console.log(`[Watchtower Selector] 📦 Reservoir Fallback engaged for ${page.handle}: needed ${needed} reel(s) to hit on-time target.`);
      
      for (const post of tier2Reservoir) {
        if (winners.length >= allowedCount) break;
        const creator = (post.source_username || '').toLowerCase();
        if (creator && usedCreators.has(creator) && tier2Reservoir.length > needed) {
          continue; // Prioritize creators not already chosen in this window
        }
        post.selection_tier = 'reservoir_fallback';
        winners.push(post);
        if (creator) usedCreators.add(creator);
        console.log(`[Watchtower Selector] 📦 Backlog Pick: @${post.source_username || 'creator'} #${post.shortcode} (Rank #2/3 unposted reel, age ${post.ageHours}h, score ${post.compositeScore})`);
      }
    }

    // Fallback: If still under target and we skipped duplicate creators, relax creator diversity
    if (winners.length < allowedCount) {
      const remainingCandidates = scoredCandidates.filter(c => !winners.some(w => w.id === c.id));
      for (const post of remainingCandidates) {
        if (winners.length >= allowedCount) break;
        post.selection_tier = post.isFresh ? 'fresh' : 'reservoir_fallback';
        winners.push(post);
      }
    }

    if (winners.length === 0) continue;

    console.log(`[Watchtower Selector] 🎯 Finalized ${winners.length} winner posts for ${page.handle} (${winners.filter(w => w.selection_tier === 'fresh').length} fresh, ${winners.filter(w => w.selection_tier === 'reservoir_fallback').length} reservoir fallback)`);

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
