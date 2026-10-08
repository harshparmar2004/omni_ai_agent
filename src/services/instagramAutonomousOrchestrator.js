const path = require('path');
const {
  getDb,
  getSetting,
  getTrackedChannels,
  getTrackedChannelById,
  updateTrackedChannel,
  addAutonomousLog,
  updateAutonomousLog,
  getAutonomousLogs,
  getAutonomousLogById,
  getAutonomousLogByShortcode,
  getBrandAssets,
  getConnectedPageBySlug
} = require('../database');

const { downloadInstagramMedia } = require('./instagramDownloaderService');
const { evaluateAndTransformPost } = require('./instagramRankingService');
const { cleanseCaption, cleanseAndBrandMedia } = require('./instagramBrandCleanserService');
const { harvestLeadMagnet } = require('./instagramDmHarvesterService');
const { recommendTrendingAudio } = require('./trendingAudioService');
const { scrapeInstagramUrl } = require('./instagramScraperService');

/**
 * OmniResearch v4.0 — Master Autonomous Instagram Pipeline Orchestrator
 * Connects 24/7 channel ingestion, LLM quality ranking, brand cleansing,
 * DM lead magnet harvesting, and auto-publishing into a single cohesive agent.
 */

async function processSinglePost(postUrlOrOptions, channelUsername = '', channelId = null, options = {}) {
  let postUrl = '';
  let preSupplied = null;
  if (typeof postUrlOrOptions === 'string') {
    postUrl = postUrlOrOptions;
  } else if (postUrlOrOptions && typeof postUrlOrOptions === 'object') {
    postUrl = postUrlOrOptions.cleanPostUrl || postUrlOrOptions.source_post_url || postUrlOrOptions.postUrl || '';
    channelUsername = channelUsername || postUrlOrOptions.author || postUrlOrOptions.channel_username || '';
    channelId = channelId || postUrlOrOptions.channelId || null;
    options = Object.assign({}, postUrlOrOptions.options || {}, options, postUrlOrOptions);
    preSupplied = postUrlOrOptions;
  }

  console.log(`[Autonomous Agent] 🚀 Ingesting post: ${postUrl}...`);
  const m = postUrl.match(/instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = m ? m[1] : (preSupplied?.shortcode || `post_${Date.now()}`);
  const cleanPostUrl = shortcode.startsWith('post_') ? postUrl : `https://www.instagram.com/p/${shortcode}/`;

  // ── Step 1: Download Media (Scoped Downloader) ──────────────────────────
  let dlResult;
  if (preSupplied && preSupplied.mediaPaths && (preSupplied.rawCaption || preSupplied.rawHook)) {
    dlResult = {
      success: true,
      media_paths: preSupplied.mediaPaths,
      type: preSupplied.contentType || 'reel',
      caption: preSupplied.rawCaption || '',
      title: preSupplied.rawHook || '',
      uploader: channelUsername
    };
  } else {
    try {
      dlResult = await downloadInstagramMedia(cleanPostUrl);
      if (!dlResult.success) {
        throw new Error(dlResult.error || 'Failed to download media');
      }
    } catch (err) {
      console.error(`[Autonomous Agent] Download failed: ${err.message}`);
      throw err;
    }
  }

  const isVideo = Boolean(dlResult.is_video || dlResult.type === 'video' || dlResult.type === 'reel' || (dlResult.relative_url && dlResult.relative_url.endsWith('.mp4')));
  const isCarousel = Boolean(dlResult.is_carousel || dlResult.type === 'carousel' || (dlResult.slides && dlResult.slides.length > 1));
  const contentType = isVideo ? 'reel' : (isCarousel ? 'carousel' : 'photo');
  const rawCaption = dlResult.caption || dlResult.title || '';
  const rawHook = dlResult.title || (rawCaption ? rawCaption.split('\n')[0].substring(0, 140) : 'Instagram Post');
  const author = dlResult.uploader || dlResult.owner || channelUsername || 'instagram';

  // Gather media paths
  let mediaPaths = [];
  if (dlResult.slides && dlResult.slides.length > 0) {
    mediaPaths = dlResult.slides.map(s => s.relative_url);
  } else if (dlResult.relative_url) {
    mediaPaths = [dlResult.relative_url];
  }

  // Record initial entry in autonomous_ingestion_log (or update if already ingested)
  let log = getAutonomousLogByShortcode(shortcode);
  if (log) {
    console.log(`[Autonomous Agent] Post ${shortcode} already in database. Refreshing log...`);
    log = updateAutonomousLog(log.id, {
      channel_id: channelId,
      channel_username: author,
      source_post_url: cleanPostUrl,
      content_type: contentType,
      downloaded_media_paths: mediaPaths,
      raw_caption: rawCaption,
      raw_hook: rawHook,
      status: 'ingested'
    });
  } else {
    log = addAutonomousLog({
      channel_id: channelId,
      channel_username: author,
      source_post_url: cleanPostUrl,
      shortcode,
      content_type: contentType,
      downloaded_media_paths: mediaPaths,
      raw_caption: rawCaption,
      raw_hook: rawHook,
      status: 'ingested'
    });
  }

  // ── Step 2 & 3: Concurrently Run LLM Ranking & Media Cleansing ─────────
  const channel = channelId ? getTrackedChannelById(channelId) : null;
  const destination = options.destination || (channel ? (channel.destination_account || 'tech') : 'gta6');
  const targetPage = getConnectedPageBySlug(destination);

  console.log(`[Autonomous Agent] ⚡ Concurrently evaluating post with LLM ranker & cleansing media assets for [${destination.toUpperCase()}]...`);
  const competitorHandles = [author, channelUsername].filter(Boolean);

  const [rankResult, mediaCleanse] = await Promise.all([
    evaluateAndTransformPost({
      caption: rawCaption,
      hook: rawHook,
      author,
      content_type: contentType,
      slides_count: mediaPaths.length,
      min_score_threshold: 70,
      destination,
      directPostOnly: Boolean(options.directPostOnly),
      forceApprove: Boolean(options.forceApprove)
    }),
    cleanseAndBrandMedia(mediaPaths, contentType, competitorHandles, destination)
  ]);

  log = updateAutonomousLog(log.id, {
    llm_fit_score: rankResult.fit_score,
    llm_decision: rankResult.decision,
    llm_reasoning: rankResult.reasoning,
    detected_topic: rankResult.detected_topic,
    detected_trigger_keyword: rankResult.detected_trigger_keyword,
    repurposed_hook: rankResult.repurposed_hook,
    repurposed_caption: rankResult.repurposed_caption,
    destination_account: destination,
    post_intent: rankResult.post_intent || (rankResult.detected_trigger_keyword ? 'lead_magnet' : 'direct_repost'),
    status: 'ranked'
  });

  // If rejected by LLM, archive as rejected and stop pipeline
  if (rankResult.decision === 'REJECTED') {
    console.log(`[Autonomous Agent] 🛑 Post rejected (Fit Score: ${rankResult.fit_score}/100) — ${rankResult.reasoning}`);
    return {
      success: false,
      log: updateAutonomousLog(log.id, { status: 'rejected' }),
      message: `Post rejected: ${rankResult.reasoning}`
    };
  }

  console.log(`[Autonomous Agent] ⭐ Post APPROVED (Score: ${rankResult.fit_score}/100) for [${destination.toUpperCase()}] — Mode: [${rankResult.post_intent?.toUpperCase() || 'DIRECT_REPOST'}]`);

  // Cleanse Caption (instant string regex replacement with destination handle)
  const captionCleanse = await cleanseCaption(rankResult.repurposed_caption, competitorHandles, destination);

  log = updateAutonomousLog(log.id, {
    repurposed_caption: captionCleanse.cleanedCaption,
    discarded_tags: [...captionCleanse.discardedTags, ...mediaCleanse.discardedTags],
    cleaned_media_paths: mediaCleanse.cleanedMediaPaths,
    status: 'cleansed'
  });

  // ── Step 4: Autonomous Lead Magnet vs Direct Repost Branching ────────────

  let isDirectRepost;
  if (options.directPostOnly) {
    isDirectRepost = true;
  } else if (targetPage) {
    if (targetPage.workflow_type === 'direct_repost') {
      isDirectRepost = true;
    } else if (targetPage.workflow_type === 'lead_magnet') {
      isDirectRepost = false;
    } else {
      isDirectRepost = rankResult.post_intent === 'direct_repost' || !rankResult.detected_trigger_keyword;
    }
  } else {
    isDirectRepost = rankResult.post_intent === 'direct_repost' || !rankResult.detected_trigger_keyword;
  }

  // Ensure trigger keyword is set if lead magnet mode is active
  if (!isDirectRepost && !rankResult.detected_trigger_keyword) {
    rankResult.detected_trigger_keyword = targetPage?.custom_trigger_keyword || 'PROJECT';
  }

  let harvestResult = {
    harvested_deliverable_url: '',
    harvested_deliverable_type: 'none',
    extracted_resources: [],
    pdf_url: '',
    dm_comment_posted: false,
    dm_response_received: false
  };

  if (isDirectRepost) {
    console.log(`[Autonomous Agent] ⚡ Direct Viral Repost Mode [${destination.toUpperCase()}]: Skipping resource extraction and PDF synthesis.`);
    log = updateAutonomousLog(log.id, {
      post_intent: 'direct_repost',
      status: 'cleansed'
    });
  } else {
    console.log(`[Autonomous Agent] 🎯 Lead Magnet Mode [${destination.toUpperCase()}]: Harvesting lead magnet for keyword "${rankResult.detected_trigger_keyword}"...`);
    harvestResult = await harvestLeadMagnet({
      source_post_url: postUrl,
      channel_username: author,
      raw_caption: rawCaption,
      raw_hook: rawHook,
      repurposed_hook: rankResult.repurposed_hook,
      detected_topic: rankResult.detected_topic,
      detected_trigger_keyword: rankResult.detected_trigger_keyword,
      brand_handle: targetPage?.handle || brand.brand_handle,
      shortcode
    });

    log = updateAutonomousLog(log.id, {
      post_intent: 'lead_magnet',
      harvested_deliverable_url: harvestResult.harvested_deliverable_url,
      harvested_deliverable_type: harvestResult.harvested_deliverable_type,
      extracted_resources: harvestResult.extracted_resources || [],
      dm_comment_posted: harvestResult.dm_comment_posted ? 1 : 0,
      dm_response_received: harvestResult.dm_response_received ? 1 : 0,
      status: 'harvested'
    });
  }

  // ── Step 5: Audio Selection ─────────────────────────────────────────────
  const audio = recommendTrendingAudio(rankResult.detected_topic, contentType);
  log = updateAutonomousLog(log.id, {
    selected_song_title: audio.title,
    selected_song_artist: audio.artist,
    selected_song_audio_url: audio.audio_url
  });

  // ── Step 6: Stage into Ready to Post Queue (instagram_posts) ───────────
  console.log(`[Autonomous Agent] 📥 Staging into Ready to Post Queue for [${destination.toUpperCase()}] (${isDirectRepost ? 'Direct Repost' : 'Lead Magnet'})...`);
  const db = getDb();
  const effectiveMediaUrls = mediaCleanse.cleanedMediaPaths.length > 0 ? mediaCleanse.cleanedMediaPaths : mediaPaths;
  const thumbnail = effectiveMediaUrls[0] || '/generated/assets/brand_logo.svg';

  const originSource = channelId ? `channel:@${author || 'monitored'}` : 'mobile_bot';

  const insertPost = db.prepare(`
    INSERT INTO instagram_posts (
      campaign_id, deliverable_id, content_type, status, hook_text, caption,
      trigger_keyword, trending_song_title, trending_song_artist, trending_song_audio_url, audio_vibe,
      media_urls, thumbnail_url, deliverable_url, pdf_url, origin_source, extracted_resources, post_intent, destination_account, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    null,
    null,
    contentType === 'reel' ? 'reel' : (contentType === 'carousel' ? 'carousel' : 'image'),
    'ready_to_post',
    rankResult.repurposed_hook,
    captionCleanse.cleanedCaption,
    isDirectRepost ? '' : rankResult.detected_trigger_keyword,
    audio.title,
    audio.artist,
    audio.audio_url,
    audio.vibe,
    JSON.stringify(effectiveMediaUrls),
    thumbnail,
    harvestResult.harvested_deliverable_url || '',
    harvestResult.pdf_url || '',
    originSource,
    JSON.stringify(harvestResult.extracted_resources || []),
    isDirectRepost ? 'direct_repost' : 'lead_magnet',
    destination,
    new Date().toISOString()
  );

  const postId = insertPost.lastInsertRowid;
  updateAutonomousLog(log.id, { staged_post_id: postId, destination_account: destination });

  // ── Step 7: Check Auto-Pilot / Direct Publish Mode ───────────────────────
  const autoPilotGlobal = getSetting('instagram_autopilot_enabled', '0') === '1' || (targetPage?.autopilot_enabled === 1);
  const autoPilotChannel = channelId ? (getTrackedChannelById(channelId)?.auto_post_enabled === 1) : false;
  const shouldAutoPublish = Boolean(options.autoPublish || autoPilotGlobal || autoPilotChannel);

  let publishResult = null;
  if (shouldAutoPublish) {
    console.log(`[Autonomous Agent] 🚀 Auto-Publish is ACTIVE! Direct publishing post #${postId} via Meta/Microservice API to [${destination.toUpperCase()}]...`);
    try {
      const { executePublishPipeline } = require('./instagramPublisher');
      publishResult = await executePublishPipeline(postId);
      console.log(`[Autonomous Agent] ✅ Post #${postId} directly published! Permalink: ${publishResult.permalink}`);
      
      if (publishResult && publishResult.success && publishResult.mode !== 'mock') {
        log = updateAutonomousLog(log.id, {
          status: 'published',
          ig_media_id: publishResult.ig_media_id,
          ig_permalink: publishResult.permalink,
          published_at: publishResult.published_at
        });
      }

      // Arm InstaAuto Bridge if lead magnet
      if (publishResult?.success && publishResult?.ig_media_id && targetPage?.workflow_type === 'lead_magnet' && targetPage?.instaauto_enabled !== 0) {
        try {
          const { pushToInstaAutoBridge } = require('./bridgeService');
          await pushToInstaAutoBridge({
            topic: rankResult.detected_topic || 'Lead Magnet',
            leadMagnetTitle: rankResult.repurposed_hook || 'Free Resource',
            triggerKeyword: rankResult.detected_trigger_keyword || targetPage?.custom_trigger_keyword || 'PROJECT',
            deliverableUrl: harvestResult.harvested_deliverable_url || '',
            igMediaId: publishResult.ig_media_id,
            igPermalink: publishResult.permalink,
            caption: captionCleanse.cleanedCaption,
            contentType: contentType === 'reel' ? 'reel' : 'carousel'
          });
        } catch (bridgeErr) {
          console.warn(`[Autonomous Agent] Bridge auto-arm notice: ${bridgeErr.message}`);
        }
      }
    } catch (pubErr) {
      console.error(`[Autonomous Agent] Auto-publish error: ${pubErr.message}`);
      log = updateAutonomousLog(log.id, { status: 'staged' });
    }
  } else {
    log = updateAutonomousLog(log.id, { status: 'staged' });
  }

  return {
    success: true,
    log: getAutonomousLogById(log.id),
    postId,
    staged: true,
    published: Boolean(publishResult?.success),
    publishResult,
    message: publishResult?.success
      ? `🎉 Autonomously processed and directly published post #${postId} to Instagram (${publishResult.permalink})!`
      : `🎉 Autonomously processed @${author} post: Fit Score ${rankResult.fit_score}/100, branded with our logo, and staged for publishing!`
  };
}

/**
 * Poll all active monitored channels (up to 20+ profiles)
 */
async function pollAllMonitoredChannels() {
  const channels = getTrackedChannels().filter(c => c.is_active);
  console.log(`[Autonomous Orchestrator] 📡 Polling ${channels.length} active target channels...`);

  const results = [];
  let newIngestedCount = 0;

  for (const ch of channels) {
    try {
      console.log(`[Autonomous Orchestrator] Checking @${ch.username}...`);
      const scrapeRes = await scrapeInstagramUrl(ch.profile_url || `https://www.instagram.com/${ch.username}/`);
      
      const recentUrls = scrapeRes?.recent_post_urls || [];
      if (recentUrls.length === 0) {
        results.push({ channel: ch.username, status: 'no_posts_found' });
        continue;
      }

      const latestPostUrl = recentUrls[0];
      const m = latestPostUrl.match(/\/p\/([A-Za-z0-9_-]+)/) || latestPostUrl.match(/\/reel\/([A-Za-z0-9_-]+)/);
      const latestShortcode = m ? m[1] : '';

      // Check if already processed
      const existing = getDb().prepare('SELECT id FROM autonomous_ingestion_log WHERE shortcode = ?').get(latestShortcode);
      if (existing || latestShortcode === ch.last_post_shortcode) {
        results.push({ channel: ch.username, status: 'up_to_date', shortcode: latestShortcode });
        continue;
      }

      console.log(`[Autonomous Orchestrator] ⚡ NEW post detected for @${ch.username}: ${latestPostUrl}`);
      const procRes = await processSinglePost(latestPostUrl, ch.username, ch.id);
      
      updateTrackedChannel(ch.id, {
        last_post_shortcode: latestShortcode,
        synced_posts_count: (ch.synced_posts_count || 0) + 1,
        last_scraped_at: new Date().toISOString()
      });

      newIngestedCount++;
      results.push({ channel: ch.username, status: 'ingested_and_processed', ...procRes });
    } catch (err) {
      console.error(`[Autonomous Orchestrator] Error polling @${ch.username}: ${err.message}`);
      results.push({ channel: ch.username, status: 'error', error: err.message });
    }
  }

  return {
    success: true,
    totalPolled: channels.length,
    newPostsIngested: newIngestedCount,
    details: results
  };
}

module.exports = {
  processSinglePost,
  pollAllMonitoredChannels
};
