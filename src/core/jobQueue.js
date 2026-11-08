const {
  getPublishJobById,
  getPublishJob,
  createPublishJob,
  updatePublishJob,
  listPublishJobs,
  addJobEvent,
  getJobEvents,
  getDb
} = require('../database');
const notifier = require('./notifier');

/**
 * OmniStudio v7 — Job Queue Service
 * Manages publish jobs, enforces page-level deduplication,
 * and broadcasts state changes to SSE clients and Telegram.
 */

async function enqueueJob({
  agent = 'reposter',
  pageId,
  shortcode,
  sourceUrl,
  caption = '',
  mediaType = 'reel',
  mediaPaths = [],
  discoveredPostId = null,
  telegramChatId = '',
  telegramMessageId = '',
  originJobId = null,
  hookHeadline = '',
  status = 'queued'
}) {
  if (!pageId || !shortcode || !sourceUrl) {
    throw new Error('pageId, shortcode, and sourceUrl are required to enqueue a job');
  }

  // 1. Deduplication Gate
  const existing = getPublishJob(pageId, shortcode);
  if (existing) {
    if (existing.status === 'published') {
      return {
        job: existing,
        duplicate: true,
        alreadyPublished: true,
        message: `Post #${shortcode} was already published to this page on ${existing.published_at}.`
      };
    }
    if (['queued', 'downloading', 'ready', 'publishing'].includes(existing.status)) {
      return {
        job: existing,
        duplicate: true,
        inProgress: true,
        message: `Post #${shortcode} is already in the queue (${existing.status}).`
      };
    }
    if (existing.status === 'failed') {
      // Re-queue the failed job
      const updated = updatePublishJob(existing.id, {
        status: 'queued',
        current_step: 'init',
        error: '',
        attempts: 0,
        caption: caption || existing.caption,
        origin_job_id: originJobId || existing.origin_job_id,
        hook_headline: hookHeadline || existing.hook_headline,
        telegram_chat_id: telegramChatId || existing.telegram_chat_id,
        telegram_message_id: telegramMessageId || existing.telegram_message_id
      });
      notifier.emitDashboardEvent('job_updated', updated);
      return { job: updated, duplicate: false, requeued: true };
    }
  }

  // 2. Insert new job
  const newJob = createPublishJob({
    agent,
    page_id: pageId,
    discovered_post_id: discoveredPostId,
    shortcode,
    source_url: sourceUrl,
    media_type: mediaType,
    media_paths: mediaPaths,
    caption,
    status,
    current_step: 'init',
    attempts: 0,
    telegram_chat_id: telegramChatId,
    telegram_message_id: telegramMessageId,
    origin_job_id: originJobId,
    hook_headline: hookHeadline
  });

  notifier.emitDashboardEvent('job_created', newJob);
  return { job: newJob, duplicate: false };
}

function updateJobProgress(jobId, status, currentStep, extra = {}) {
  const updated = updatePublishJob(jobId, {
    status,
    current_step: currentStep,
    ...extra
  });

  try {
    addJobEvent({
      jobId,
      stage: currentStep || status,
      status: status === 'failed' ? 'failed' : (status === 'published' ? 'done' : 'started'),
      message: extra.error || extra.message || currentStep || '',
      meta: extra
    });
  } catch (e) {}

  if (updated) {
    notifier.emitDashboardEvent('job_updated', updated);
  }
  return updated;
}

function recordStage(jobId, stage, status = 'started', message = '', meta = {}) {
  try {
    addJobEvent({ jobId, stage, status, message, meta });
    notifier.emitDashboardEvent('job_stage', { jobId, stage, status, message, meta, timestamp: new Date().toISOString() });
  } catch (e) {}
}

function getJob(id) {
  return getPublishJobById(id);
}

function listJobs(options = {}) {
  return listPublishJobs(options);
}

function retryJob(id) {
  const job = getPublishJobById(id);
  if (!job) throw new Error(`Job #${id} not found`);
  return updateJobProgress(id, 'queued', 'retry_queued', {
    error: '',
    attempts: 0
  });
}

function deleteJob(id) {
  const db = getDb();
  try { db.prepare('DELETE FROM job_events WHERE job_id = ?').run(id); } catch (e) {}
  try { db.prepare('UPDATE distribution_targets SET publish_job_id = NULL WHERE publish_job_id = ?').run(id); } catch (e) {}
  try { db.prepare('UPDATE distribution_jobs SET origin_job_id = NULL WHERE origin_job_id = ?').run(id); } catch (e) {}
  db.prepare('DELETE FROM publish_jobs WHERE id = ?').run(id);
  notifier.emitDashboardEvent('job_deleted', { id });
  return { success: true, id };
}

module.exports = {
  enqueueJob,
  updateJobProgress,
  recordStage,
  getJob,
  listJobs,
  retryJob,
  deleteJob
};
