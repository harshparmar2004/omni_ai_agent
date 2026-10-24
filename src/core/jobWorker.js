const path = require('path');
const fs = require('fs');
const { getPageById, updateDiscoveredPost, getPublishedCountToday, getLastPublishedTimestamp, getSetting } = require('../database');
const { updateJobProgress, getJob, listJobs } = require('./jobQueue');
const { downloadInstagramMedia } = require('./downloader');
const { buildCaption, buildAiCaption } = require('./captionBuilder');
const { publishReel, publishCarousel, publishImage, publishStory } = require('./publisher');
const notifier = require('./notifier');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * OmniStudio v7 — Shared Publishing Job Worker
 * Concurrency: strictly 1 active job per page at any time.
 * Handles end-to-end execution, in-place Telegram reporting, and retry logic.
 */

class JobWorkerPool {
  constructor() {
    this.activePages = new Set(); // pageIds currently processing a job
    this.isPolling = false;
    this.pollInterval = null;
  }

  start(intervalMs = 3000) {
    if (this.pollInterval) return;
    console.log('[Job Worker] ⚡ Starting shared publishing worker pool...');

    // Recover jobs interrupted by previous restart
    this.recoverInterruptedJobs().catch(e => console.warn('[Job Worker] Recovery notice:', e.message));

    this.pollInterval = setInterval(() => {
      this.tick().catch(e => console.error('[Job Worker Error]:', e));
    }, intervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async recoverInterruptedJobs() {
    const interrupted = listJobs({ status: ['downloading', 'publishing'] });
    for (const job of interrupted) {
      console.log(`[Job Worker] 🔄 Resetting interrupted job #${job.id} (${job.shortcode}) to queued...`);
      updateJobProgress(job.id, 'queued', 'recovered_from_restart', {
        error: 'Interrupted by server restart; automatically re-queued'
      });
    }
  }

  async tick() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Find queued jobs
      const queuedJobs = listJobs({ status: 'queued', limit: 10 });
      if (queuedJobs.length === 0) {
        this.isPolling = false;
        return;
      }

      for (const job of queuedJobs) {
        // Enforce 1 active job per page concurrency
        if (this.activePages.has(job.page_id)) {
          continue;
        }

        // Lock page and process job asynchronously
        this.activePages.add(job.page_id);
        this.processJob(job.id).finally(() => {
          this.activePages.delete(job.page_id);
        });
      }
    } finally {
      this.isPolling = false;
    }
  }

  async updateTelegramProgress(job, lines, replyMarkup = null) {
    if (!job.telegram_chat_id) return;
    const text = lines.join('\n');
    if (job.telegram_message_id) {
      try {
        const res = await notifier.editTelegramMessage(job.telegram_chat_id, job.telegram_message_id, text, {
          reply_markup: replyMarkup
        });
        if (res) return res;
      } catch (e) {}
    }
    const res = await notifier.sendTelegramMessage(job.telegram_chat_id, text, {
      reply_markup: replyMarkup
    });
    if (res && res.message_id) {
      job.telegram_message_id = String(res.message_id);
      try {
        const { updatePublishJob } = require('../database');
        updatePublishJob(job.id, { telegram_message_id: String(res.message_id) });
      } catch (e) {}
    }
    return res;
  }

  async processJob(jobId, options = {}) {
    let job = getJob(jobId);
    if (!job || job.status !== 'queued') return;

    const page = getPageById(job.page_id);
    if (!page) {
      updateJobProgress(jobId, 'failed', 'error', { error: `Page #${job.page_id} not found` });
      return;
    }

    // Check page daily quota
    const todayCount = getPublishedCountToday(page.id);
    if (todayCount >= page.daily_quota && job.agent === 'watchtower') {
      console.log(`[Job Worker] ⏸️ Page ${page.handle} reached daily quota (${todayCount}/${page.daily_quota}). Holding job #${job.id}.`);
      updateJobProgress(jobId, 'queued', 'quota_hold', {
        error: `Daily quota reached (${todayCount}/${page.daily_quota}). Waiting for next window.`
      });
      return;
    }

    // Hard safety barrier for Meta Graph API 25-reels/day limit
    if (todayCount >= 24) {
      console.log(`[Job Worker] 🛑 Meta Graph API 25 post barrier triggered (${todayCount}/25). Holding job #${job.id} for safety.`);
      updateJobProgress(jobId, 'queued', 'meta_limit_hold', {
        error: `Meta Graph API 25-reels/day safety barrier active (${todayCount}/25). Post held to prevent account restrictions.`
      });
      return;
    }

    // Check min spacing between posts (Applies exclusively to Agent 2: Watchtower autonomous surveillance)
    // Agent 1 (Telegram / Reposter) publishes immediately on-demand without schedule delays
    if (job.agent === 'watchtower' && page.min_spacing_minutes > 0 && !job.force_instant && !options.forceInstant) {
      const lastPublishedAt = getLastPublishedTimestamp(page.id);
      if (lastPublishedAt) {
        const elapsedMin = (Date.now() - new Date(lastPublishedAt).getTime()) / (1000 * 60);
        if (elapsedMin < page.min_spacing_minutes) {
          const waitMin = Math.ceil(page.min_spacing_minutes - elapsedMin);
          console.log(`[Job Worker] ⏳ Watchtower pacing guard: Waiting ${waitMin}m before next autonomous post on ${page.handle}...`);
          return; // Will automatically pick up in future ticks when cooldown expires
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`[Job Worker] 🚀 Executing Job #${job.id} for ${page.handle} [Agent: ${job.agent.toUpperCase()}]`);
    console.log(`[Job Worker] Source: ${job.source_url}`);
    console.log(`======================================================\n`);

    const shortcode = job.shortcode || 'reel';
    const renderStepperMsg = (stepNum, statusLine, subDetail = '') => [
      `⚡ <b>OmniStudio Pipeline:</b> <code>#${shortcode}</code>`,
      `📱 <b>Target Page:</b> <code>${page.handle}</code>`,
      ``,
      `✅ <b>1. Ingest:</b> Cloud runner active`,
      `▶ <b>2. Download:</b> ${stepNum > 2 ? '✅ 1080p MP4 Ready' : (stepNum === 2 ? '⏳ Downloading & transcoding...' : '⚪ Waiting')}`,
      `▶ <b>3. AI Copy:</b> ${stepNum > 3 ? '✅ Hook & Attribution Ready' : (stepNum === 3 ? '⏳ Crafting viral caption...' : '⚪ Waiting')}`,
      `▶ <b>4. Publishing:</b> ${stepNum === 4 ? (subDetail || '⏳ Publishing Feed & Story in parallel...') : '⚪ Waiting'}`,
      ``,
      statusLine ? `<i>Status: ${statusLine}</i>` : ''
    ].filter(Boolean);

    try {
      // ── Step 1: Download Media ──────────────────────────────
      job = updateJobProgress(jobId, 'downloading', 'download_starting');
      await this.updateTelegramProgress(job, renderStepperMsg(2, 'Downloading media & applying anti-duplicate transcode...'));

      let mediaPaths = [];
      let rawCaption = job.caption || '';
      let sourceUploader = '';
      let mediaType = job.media_type || 'reel';

      try {
        mediaPaths = JSON.parse(job.media_paths || '[]');
      } catch (e) {
        mediaPaths = [];
      }

      const publicDir = path.join(__dirname, '..', '..', 'public');
      const filesExistOnDisk = mediaPaths.length > 0 && mediaPaths.every(p => {
        const cleanRel = (p || '').replace(/^[/\\]+/, '');
        return fs.existsSync(path.join(publicDir, cleanRel));
      });

      if (!filesExistOnDisk) {
        const dl = await downloadInstagramMedia(job.source_url);
        if (!dl.success || !dl.mediaPaths || dl.mediaPaths.length === 0) {
          throw new Error(dl.error || 'Failed to download media');
        }
        mediaPaths = dl.mediaPaths;
        mediaType = dl.mediaType;
        sourceUploader = dl.uploader;
        if (!rawCaption) rawCaption = dl.caption;

        job = updateJobProgress(jobId, 'downloading', 'download_complete', {
          media_paths: mediaPaths,
          media_type: mediaType
        });
      }

      await this.updateTelegramProgress(job, renderStepperMsg(3, `1080p ${mediaType.toUpperCase()} ready. Generating viral caption...`));

      // ── Step 2: Build Caption ───────────────────────────────
      job = updateJobProgress(jobId, 'ready', 'caption_building');
      const finalCaption = job.caption && job.caption !== rawCaption
        ? job.caption // user edited caption
        : await buildAiCaption({ rawCaption, sourceUsername: sourceUploader, page });

      job = updateJobProgress(jobId, 'ready', 'caption_ready', { caption: finalCaption });

      // ── Step 3: Meta Graph API Publishing (Feed first, then Story) ──
      job = updateJobProgress(jobId, 'publishing', 'meta_upload');
      await this.updateTelegramProgress(job, renderStepperMsg(4, 'Uploading Feed container to Instagram...', '⏳ Ingesting Reel video...'));

      const onProgress = (step, current, total) => {
        if (step === 'polling') {
          this.updateTelegramProgress(
            job,
            renderStepperMsg(4, 'Processing media container on Instagram...', `⏳ Verifying Meta container (${current}/${total})...`)
          ).catch(() => {});
        }
      };

      const autoPostStory = getSetting('auto_post_to_story', 'true') === 'true';

      let pubResult = null;
      if (mediaType === 'reel') {
        let feedVideoPath = mediaPaths[0];
        const brandingMode = process.env.FEED_BRANDING_MODE || getSetting('feed_branding_mode', 'frame');

        if (brandingMode === 'frame') {
          try {
            const { prepareVideoForFeedCard } = require('../utils/ffmpegHelper');
            console.log(`[Job Worker] 🎨 Applying GTA 6 Vice City Framed Template to Feed Reel for ${page.handle}...`);
            const framed = await prepareVideoForFeedCard(mediaPaths[0], { handle: page.handle });
            if (framed) {
              const absCandidate = (path.isAbsolute(framed) && fs.existsSync(framed))
                ? framed
                : path.join(__dirname, '..', '..', 'public', framed.replace(/^[/\\]+/, ''));
              if (fs.existsSync(absCandidate)) {
                feedVideoPath = absCandidate;
              }
            }
          } catch (frameErr) {
            console.warn(`[Job Worker] Feed frame notice: ${frameErr.message}`);
          }
        } else if (brandingMode === 'watermark') {
          try {
            const { applyBrandedFeedOverlay } = require('../utils/ffmpegHelper');
            console.log(`[Job Worker] 🎨 Applying custom GTA 6 identity watermark to Reel for ${page.handle}...`);
            const branded = await applyBrandedFeedOverlay(mediaPaths[0], { handle: page.handle });
            if (branded) {
              const absCandidate = (path.isAbsolute(branded) && fs.existsSync(branded))
                ? branded
                : path.join(__dirname, '..', '..', 'public', branded.replace(/^[/\\]+/, ''));
              if (fs.existsSync(absCandidate)) {
                feedVideoPath = absCandidate;
              }
            }
          } catch (wmErr) {
            console.warn(`[Job Worker] Watermark notice: ${wmErr.message}`);
          }
        }

        pubResult = await publishReel({
          page,
          videoPath: feedVideoPath,
          caption: finalCaption,
          coverPath: null,
          onProgress
        });
      } else if (mediaType === 'carousel') {
        pubResult = await publishCarousel({
          page,
          imagePaths: mediaPaths,
          caption: finalCaption,
          onProgress
        });
      } else {
        pubResult = await publishImage({
          page,
          imagePath: mediaPaths[0],
          caption: finalCaption,
          onProgress
        });
      }

      if (!pubResult || !pubResult.success || !pubResult.ig_media_id) {
        throw new Error(pubResult?.error || 'Publish did not return an Instagram media ID');
      }

      // ── Step 3b: Publish Instagram Story ──
      let storyResult = null;
      if (autoPostStory && mediaPaths[0]) {
        try {
          await this.updateTelegramProgress(
            job,
            renderStepperMsg(4, 'Feed published! Publishing Instagram Story...', '⏳ Creating Story card...')
          ).catch(() => {});

          console.log(`[Job Worker] 🌟 Auto-publishing content to Instagram Story for ${page.handle}...`);
          storyResult = await publishStory({
            page,
            videoPath: mediaType === 'reel' ? mediaPaths[0] : null,
            imagePath: (mediaType === 'image' || mediaType === 'carousel') ? mediaPaths[0] : null
          });
          console.log(`[Job Worker] ✅ Instagram Story published live! Story Media ID: ${storyResult?.ig_media_id}`);
        } catch (storyErr) {
          console.warn(`[Job Worker] ⚠️ Instagram Story publishing notice: ${storyErr.message}`);
        }
      }

      // ── Step 4: Finalise Success (Single In-Place Telegram Message) ────
      const publishedAt = pubResult.published_at || new Date().toISOString();
      job = updateJobProgress(jobId, 'published', 'live', {
        ig_media_id: pubResult.ig_media_id,
        permalink: pubResult.permalink,
        published_at: publishedAt,
        story_ig_media_id: storyResult?.ig_media_id || '',
        story_published_at: storyResult?.published_at || null,
        story_status: storyResult?.success ? 'published' : 'idle',
        error: ''
      });

      // Update discovered_posts row if linked
      if (job.discovered_post_id) {
        try {
          updateDiscoveredPost(job.discovered_post_id, { status: 'published' });
        } catch (e) {}
      }

      // Telegram success announcement with clickable live links, creator attribution, full caption, and story ID
      const successLines = [
        `🎉 <b>Published Live to Instagram!</b>`,
        `📱 <b>Destination:</b> ${escapeHtml(page.name)} (<code>${page.handle}</code>)`,
        `🔗 <b>Source Reel:</b> <code>#${shortcode}</code>`,
        ``,
        `✅ <b>Feed Reel Published Live</b>`,
        storyResult?.success ? `✅ <b>Instagram Story Published Live</b>` : '',
        ``,
        `🌐 <b>Live Reel:</b> <a href="${pubResult.permalink}">${pubResult.permalink}</a>`,
        storyResult?.success ? `🌟 <b>Story:</b> <a href="${storyResult.story_url}">View on Instagram Story</a>` : '',
        ``,
        `🆔 <b>Media ID:</b> <code>${pubResult.ig_media_id}</code>`,
        storyResult?.success ? `🆔 <b>Story ID:</b> <code>${storyResult.ig_media_id}</code>` : '',
        sourceUploader && sourceUploader !== 'instagram' ? `🙌 <b>Original Creator:</b> @${sourceUploader}` : '',
        ``,
        `📝 <b>Instagram Post Caption:</b>`,
        `<blockquote>${escapeHtml(finalCaption)}</blockquote>`
      ].filter(Boolean);

      await this.updateTelegramProgress(job, successLines);

      console.log(`[Job Worker] ✅ Job #${job.id} completed! Live at: ${pubResult.permalink}`);

    } catch (err) {
      console.error(`[Job Worker Error] Job #${job.id} failed: ${err.message}`);
      const attempts = (job.attempts || 0) + 1;
      const isTransient = /ECONNRESET|ETIMEDOUT|timeout|502|503|504|2207001|2207003/i.test(err.message);

      if (isTransient && attempts < 3) {
        console.log(`[Job Worker] ⚠️ Transient error on #${job.id}. Re-queuing (attempt ${attempts}/3)...`);
        job = updateJobProgress(jobId, 'queued', 'retry_wait', {
          attempts,
          error: `Transient error (attempt ${attempts}): ${err.message}`
        });
      } else {
        job = updateJobProgress(jobId, 'failed', 'failed', {
          attempts,
          error: err.message
        });

        // Surface exact failure in Telegram with Retry button
        await this.updateTelegramProgress(job, [
          `❌ <b>Publishing Failed for ${page.handle}</b>`,
          ``,
          `⚠️ <b>Error:</b> <code>${escapeHtml(err.message)}</code>`,
          `🔗 <b>Source:</b> <a href="${job.source_url}">${job.source_url}</a>`
        ], {
          inline_keyboard: [
            [{ text: '🔁 Retry Now', callback_data: `retry_job:${job.id}` }]
          ]
        });
      }
    }
  }
}

const jobWorkerPool = new JobWorkerPool();

module.exports = jobWorkerPool;
