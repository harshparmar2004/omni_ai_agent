const {
  getSourceAccounts,
  updateSourceAccount,
  getDiscoveredPostByShortcode,
  createDiscoveredPost,
  getPublishJob
} = require('../../database');
const { readSourcePosts } = require('./sourceReaders/guestReader');
const notifier = require('../../core/notifier');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * OmniStudio v7 — Watchtower Scanner
 * Scans all active monitored sources, identifies new shortcodes,
 * deduplicates against database, and persists fresh discoveries.
 */

async function scanAllSources(options = {}) {
  const sources = getSourceAccounts({ isActiveOnly: true });
  console.log(`[Watchtower Scanner] 🛰️ Commencing surveillance scan across ${sources.length} active sources...`);

  const results = [];
  let newPostsCount = 0;
  const errors = [];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];

    // Inter-source human emulation delay (except first item)
    if (i > 0 && !options.quick) {
      const delayMs = randomInt(8000, 22000);
      console.log(`[Watchtower Pacing] ⏳ Sleeping ${(delayMs / 1000).toFixed(1)}s before checking @${src.username}...`);
      await sleep(delayMs);
    }

    try {
      notifier.emitDashboardEvent('watchtower_scan_progress', {
        current: i + 1,
        total: sources.length,
        source: src.username
      });

      const res = await readSourcePosts(src.username, options.limit || 6);

      if (!res.success) {
        const failCount = (src.consecutive_failures || 0) + 1;
        const newHealth = failCount >= 5 ? 'paused' : 'failing';
        updateSourceAccount(src.id, {
          consecutive_failures: failCount,
          health: newHealth,
          last_error: res.error || 'Scrape failed',
          last_checked_at: new Date().toISOString()
        });
        errors.push({ username: src.username, error: res.error });
        results.push({ username: src.username, status: 'error', error: res.error });
        continue;
      }

      // Success: reset failures and update status
      updateSourceAccount(src.id, {
        consecutive_failures: 0,
        health: 'ok',
        last_error: '',
        last_checked_at: new Date().toISOString()
      });

      let srcNewCount = 0;
      for (const p of res.posts) {
        // Check if shortcode already exists in discovered_posts or publish_jobs
        const existingDisc = getDiscoveredPostByShortcode(p.shortcode);
        const existingJob = src.page_id ? getPublishJob(src.page_id, p.shortcode) : null;

        if (existingDisc || existingJob) {
          continue;
        }

        // Fresh post discovered!
        createDiscoveredPost({
          source_account_id: src.id,
          run_id: options.runId || null,
          shortcode: p.shortcode,
          url: p.url,
          media_type: p.mediaType || 'reel',
          caption: p.caption || '',
          like_count: p.likes || 0,
          comment_count: p.comments || 0,
          view_count: p.views || 0,
          posted_at: p.postedAt || new Date().toISOString(),
          score: 1.0,
          status: 'new'
        });

        srcNewCount++;
        newPostsCount++;
      }

      if (srcNewCount > 0) {
        updateSourceAccount(src.id, {
          last_new_post_at: new Date().toISOString(),
          synced_posts_count: (src.synced_posts_count || 0) + srcNewCount
        });
      }

      results.push({
        username: src.username,
        status: 'ok',
        foundPosts: res.posts.length,
        newPosts: srcNewCount
      });

    } catch (err) {
      console.error(`[Watchtower Scanner Error] @${src.username}: ${err.message}`);
      errors.push({ username: src.username, error: err.message });
      results.push({ username: src.username, status: 'error', error: err.message });
    }
  }

  console.log(`[Watchtower Scanner] ✓ Scan complete: ${sources.length} sources checked, ${newPostsCount} new posts discovered.`);

  return {
    sourcesChecked: sources.length,
    newPostsCount,
    results,
    errors
  };
}

module.exports = {
  scanAllSources
};
