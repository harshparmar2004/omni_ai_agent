const {
  getPages,
  listDiscoveredPosts,
  updateDiscoveredPost,
  getPublishedCountToday
} = require('../../database');
const { enqueueJob } = require('../../core/jobQueue');
const notifier = require('../../core/notifier');

/**
 * OmniStudio v7 — Watchtower Content Selector
 * Evaluates candidate discoveries per page using engagement and freshness metrics,
 * then dispatches to Publish Jobs (Auto mode) or Queue (Review mode).
 */

async function evaluateAndSelectPosts() {
  const activePages = getPages({ isActiveOnly: true });
  const results = [];

  for (const page of activePages) {
    // 1. Check remaining quota
    const todayCount = getPublishedCountToday(page.id);
    const quotaRemaining = Math.max(0, page.daily_quota - todayCount);

    if (quotaRemaining === 0) {
      console.log(`[Watchtower Selector] ℹ️ Page ${page.handle} has 0 quota remaining today (${todayCount}/${page.daily_quota}).`);
      continue;
    }

    // 2. Fetch 'new' discoveries mapped to this page's sources
    const candidates = listDiscoveredPosts({
      pageId: page.id,
      status: 'new'
    });

    if (candidates.length === 0) {
      continue;
    }

    // 3. Score candidate posts by real engagement & freshness decay (48h window)
    const now = Date.now();
    const scored = candidates.map(c => {
      const postedAtMs = c.posted_at ? new Date(c.posted_at).getTime() : now;
      const ageHours = Math.max(0, (now - postedAtMs) / (1000 * 60 * 60));
      const freshnessDecay = Math.max(0.2, 1 - (ageHours / 48));

      // Engagement: likes + 2*comments
      const rawEngagement = (c.like_count || 0) + ((c.comment_count || 0) * 2);
      const baseEngagement = rawEngagement > 0 ? rawEngagement : 100;
      const compositeScore = Math.round(baseEngagement * freshnessDecay);

      return {
        ...c,
        compositeScore
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Take up to posts_per_cycle and quotaRemaining
    const takeCount = Math.min(page.posts_per_cycle || 1, quotaRemaining, scored.length);
    const winners = scored.slice(0, takeCount);

    console.log(`[Watchtower Selector] 🎯 Selected ${winners.length} winner posts for ${page.handle} (Mode: ${page.post_mode.toUpperCase()})`);

    let enqueued = 0;
    let reviewCount = 0;

    for (const post of winners) {
      if (page.post_mode === 'auto') {
        // Enqueue directly to shared publishing core
        try {
          await enqueueJob({
            agent: 'watchtower',
            pageId: page.id,
            discoveredPostId: post.id,
            shortcode: post.shortcode,
            sourceUrl: post.url,
            caption: '', // will be built by captionBuilder
            status: 'queued'
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
        // Mark as pending_review for operator approval
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
      reviewCount
    });
  }

  return results;
}

module.exports = {
  evaluateAndSelectPosts
};
