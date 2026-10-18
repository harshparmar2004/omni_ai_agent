const path = require('path');
const fs = require('fs');
const { getPageById, updateDiscoveredPost, getPublishedCountToday, getLastPublishedTimestamp, getSetting } = require('../database');
const { updateJobProgress, getJob, listJobs } = require('./jobQueue');
const { downloadInstagramMedia } = require('./downloader');
const { buildCaption, buildAiCaption } = require('./captionBuilder');
const { publishReel, publishCarousel, publishImage } = require('./publisher');
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
    if (!job.telegram_chat_id || !job.telegram_message_id) return;
    const text = lines.join('\n');
    await notifier.editTelegramMessage(job.telegram_chat_id, job.telegram_message_id, text, {
      reply_markup: replyMarkup
    });
  }

  async processJob(jobId) {
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

    // Check min spacing between posts (for Watchtower jobs)
    if (job.agent === 'watchtower' && page.min_spacing_minutes > 0) {
      const lastPublishedAt = getLastPublishedTimestamp(page.id);
      if (lastPublishedAt) {
        const elapsedMin = (Date.now() - new Date(lastPublishedAt).getTime()) / (1000 * 60);
        if (elapsedMin < page.min_spacing_minutes) {
          const waitMin = Math.ceil(page.min_spacing_minutes - elapsedMin);
          console.log(`[Job Worker] ⏳ Spacing delay: Waiting ${waitMin}m before next post on ${page.handle}...`);
          return; // Will pick up in future ticks
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`[Job Worker] 🚀 Executing Job #${job.id} for ${page.handle} [Agent: ${job.agent.toUpperCase()}]`);
    console.log(`[Job Worker] Source: ${job.source_url}`);
    console.log(`======================================================\n`);

    const tgHeader = `🎬 <b>Reposting to ${page.handle}</b>`;

    try {
      // ── Step 1: Download Media ──────────────────────────────
      job = updateJobProgress(jobId, 'downloading', 'download_starting');
      await this.updateTelegramProgress(job, [
        tgHeader,
        `⏳ <b>Downloading 1080p media...</b>`
      ]);

      let mediaPaths = [];
      let rawCaption = job.caption || '';
      let sourceUploader = '';
      let mediaType = job.media_type || 'reel';

      try {
        mediaPaths = JSON.parse(job.media_paths || '[]');
      } catch (e) {
        mediaPaths = [];
      }

      if (mediaPaths.length === 0) {
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

      await this.updateTelegramProgress(job, [
        tgHeader,
        `✅ <b>Media downloaded</b> (1080p ${mediaType.toUpperCase()})`,
        `⏳ <b>Generating viral caption with AI...</b>`
      ]);

      // ── Step 2: Build Caption ───────────────────────────────
      job = updateJobProgress(jobId, 'ready', 'caption_building');
      const finalCaption = job.caption && job.caption !== rawCaption
        ? job.caption // user edited caption
        : await buildAiCaption({ rawCaption, sourceUsername: sourceUploader, page });

      job = updateJobProgress(jobId, 'ready', 'caption_ready', { caption: finalCaption });

      // ── Step 3: Meta Graph API Publishing ────────────────────
      job = updateJobProgress(jobId, 'publishing', 'meta_upload');
      await this.updateTelegramProgress(job, [
        tgHeader,
        `✅ <b>Media downloaded</b> (${mediaType.toUpperCase()})`,
        `✅ <b>AI Caption & Attribution ready</b>`,
        `⏳ <b>Uploading to Meta Graph API v21.0...</b>`
      ]);

      const onProgress = (step, current, total) => {
        if (step === 'polling') {
          this.updateTelegramProgress(job, [
            tgHeader,
            `✅ <b>Media downloaded</b>`,
            `✅ <b>AI Caption generated</b>`,
            `⏳ <b>Meta transcoding & processing...</b> (attempt ${current}/${total})`
          ]).catch(() => {});
        }
      };

      let pubResult = null;
      if (mediaType === 'reel') {
        pubResult = await publishReel({
          page,
          videoPath: mediaPaths[0],
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

      // ── Step 4: Finalise Success ─────────────────────────────
      const publishedAt = pubResult.published_at || new Date().toISOString();
      job = updateJobProgress(jobId, 'published', 'live', {
        ig_media_id: pubResult.ig_media_id,
        permalink: pubResult.permalink,
        published_at: publishedAt,
        error: ''
      });

      // Update discovered_posts row if linked
      if (job.discovered_post_id) {
        try {
          updateDiscoveredPost(job.discovered_post_id, { status: 'published' });
        } catch (e) {}
      }

      // Telegram success announcement with clickable live link, creator attribution, and full caption
      const successLines = [
        `🎉 <b>Reel Successfully Published to ${page.handle}!</b>`,
        ``,
        `🌐 <b>Live Instagram Link:</b>`,
        `👉 <a href="${pubResult.permalink}">${pubResult.permalink}</a>`,
        ``
      ];
      if (sourceUploader && sourceUploader !== 'instagram') {
        successLines.push(`🙌 <b>Original Creator:</b> @${sourceUploader}`);
      }
      successLines.push(`🆔 <b>Media ID:</b> <code>${pubResult.ig_media_id}</code>`);
      successLines.push(``);
      successLines.push(`📝 <b>Published Caption:</b>`);
      successLines.push(`<blockquote>${escapeHtml(finalCaption)}</blockquote>`);

      await this.updateTelegramProgress(job, successLines);

      // Deliver video preview to chat
      if (job.telegram_chat_id && mediaType === 'reel' && mediaPaths[0]) {
        notifier.sendTelegramVideo(
          job.telegram_chat_id,
          mediaPaths[0],
          `🎬 <b>Live on Instagram (${page.handle}):</b> <a href="${pubResult.permalink}">${pubResult.permalink}</a>`
        ).catch(() => {});
      }

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
          `⚠️ <b>Error:</b> <i>${err.message}</i>`,
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
