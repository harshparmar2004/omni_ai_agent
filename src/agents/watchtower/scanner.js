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
        const newHealth = failCount >= 5 ? 'warning' : 'retrying';
        console.warn(`[Watchtower Scanner] ⚠️ @${src.username} check failed: ${res.error || 'Unknown error'}`);
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
        let existingJob = null;
        if (src.page_id) {
          existingJob = getPublishJob(src.page_id, p.shortcode);
        } else if (src.group_id) {
          const { getGroupMembers } = require('../../database');
          const members = getGroupMembers(src.group_id);
          for (const m of members) {
            existingJob = getPublishJob(m.page_id, p.shortcode);
            if (existingJob) break;
          }
        }

        if (existingDisc || existingJob) {
          continue;
        }

        const postedAtDate = p.postedAt ? new Date(p.postedAt) : new Date();
        const ageHours = (Date.now() - postedAtDate.getTime()) / (1000 * 60 * 60);

        const isNewSource = (src.synced_posts_count || 0) === 0;
        let postStatus = 'new';
        if (isNewSource) {
          postStatus = ageHours <= 168 ? 'new' : 'stale';
        } else {
          if (ageHours <= 72) postStatus = 'new';
          else if (ageHours <= 168) postStatus = 'reservoir_buffer';
          else postStatus = 'stale';
        }

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
          posted_at: postedAtDate.toISOString(),
          score: 1.0,
          status: postStatus
        });

        if (postStatus === 'new' || postStatus === 'reservoir_buffer') {
          srcNewCount++;
          newPostsCount++;
        }
      }

      console.log(`[Watchtower Scanner] ✓ @${src.username}: ${res.posts.length} posts inspected (+${srcNewCount} new)`);

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

/**
 * Scan a single source account immediately on demand (e.g. when added from dashboard)
 */
async function scanSingleSource(sourceIdentifier, options = {}) {
  const {
    getSourceAccountById,
    getSourceAccountByUsername
  } = require('../../database');

  let src = null;
  if (typeof sourceIdentifier === 'object') {
    src = sourceIdentifier;
  } else if (typeof sourceIdentifier === 'number' || /^\d+$/.test(String(sourceIdentifier))) {
    src = getSourceAccountById(parseInt(sourceIdentifier, 10));
  } else {
    src = getSourceAccountByUsername(String(sourceIdentifier));
  }

  if (!src) {
    throw new Error(`Source account '${sourceIdentifier}' not found`);
  }

  console.log(`[Watchtower Scanner] 🎯 Scanning single source @${src.username} on-demand...`);
  const res = await readSourcePosts(src.username, options.limit || 10);

  if (!res.success) {
    const failCount = (src.consecutive_failures || 0) + 1;
    updateSourceAccount(src.id, {
      consecutive_failures: failCount,
      health: failCount >= 5 ? 'warning' : 'retrying',
      last_error: res.error || 'Scrape failed',
      last_checked_at: new Date().toISOString()
    });
    return { success: false, error: res.error, source: src };
  }

  updateSourceAccount(src.id, {
    consecutive_failures: 0,
    health: 'ok',
    last_error: '',
    last_checked_at: new Date().toISOString()
  });

  let newPostsCount = 0;
  const isNewSource = (src.synced_posts_count || 0) === 0;

  for (const p of res.posts) {
    const existingDisc = getDiscoveredPostByShortcode(p.shortcode);
    let existingJob = null;
    if (src.page_id) {
      existingJob = getPublishJob(src.page_id, p.shortcode);
    } else if (src.group_id) {
      const { getGroupMembers } = require('../../database');
      const members = getGroupMembers(src.group_id);
      for (const m of members) {
        existingJob = getPublishJob(m.page_id, p.shortcode);
        if (existingJob) break;
      }
    }
    if (existingDisc || existingJob) continue;

    const postedAtDate = p.postedAt ? new Date(p.postedAt) : new Date();
    const ageHours = (Date.now() - postedAtDate.getTime()) / (1000 * 60 * 60);

    let postStatus = 'new';
    if (isNewSource) {
      postStatus = ageHours <= 168 ? 'new' : 'stale';
    } else {
      if (ageHours <= 72) postStatus = 'new';
      else if (ageHours <= 168) postStatus = 'reservoir_buffer';
      else postStatus = 'stale';
    }

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
      posted_at: postedAtDate.toISOString(),
      score: 1.0,
      status: postStatus
    });

    if (postStatus === 'new' || postStatus === 'reservoir_buffer') {
      newPostsCount++;
    }
  }

  if (newPostsCount > 0) {
    updateSourceAccount(src.id, {
      last_new_post_at: new Date().toISOString(),
      synced_posts_count: (src.synced_posts_count || 0) + newPostsCount
    });

    if (options.evaluate) {
      try {
        const { evaluateAndSelectPosts } = require('./selector');
        if (src.page_id) {
          await evaluateAndSelectPosts({ pageId: src.page_id, sourceId: src.id, force: true });
        } else if (src.group_id) {
          const { getGroupMembers } = require('../../database');
          const members = getGroupMembers(src.group_id);
          for (const m of members) {
            if (m.page_id && m.is_active && m.page_is_active) {
              await evaluateAndSelectPosts({ pageId: m.page_id, sourceId: src.id, force: true });
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`[Watchtower Scanner] Post-scan evaluation error: ${err.message}`);
      }
    }
  }

  console.log(`[Watchtower Scanner] ✓ On-demand scan complete for @${src.username}: +${newPostsCount} posts/reels added.`);
  return {
    success: true,
    source: src,
    newPostsCount,
    postsFound: res.posts.length
  };
}

module.exports = {
  scanAllSources,
  scanSingleSource
};
