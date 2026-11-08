const {
  getPendingDistributionTargets,
  updateDistributionTarget,
  getDistributionJobById,
  updateDistributionJob,
  getPublishJobById,
  getPageById,
  getPublishedCountToday,
  getDistributionTargets
} = require('../database');
const { enqueueJob } = require('./jobQueue');
const notifier = require('./notifier');

class DistributionWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = null;
    this.isProcessing = false;
    this.tick = this.tick.bind(this);
  }

  start(intervalMs = 6000) {
    if (this.pollInterval) return;
    this.isRunning = true;
    console.log('[Distribution Worker] 🔗 Starting Multi-Page Distribution Worker...');

    this.pollInterval = setInterval(() => {
      this.tick().catch(e => console.error('[Distribution Worker Error]:', e));
    }, intervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
  }

  async tick() {
    if (this.isProcessing) return { dispatched: 0 };
    this.isProcessing = true;
    let dispatchedCount = 0;

    try {
      const nowIso = new Date().toISOString();
      const pendingTargets = getPendingDistributionTargets(nowIso);

      if (pendingTargets.length === 0) {
        return { dispatched: 0 };
      }

      console.log(`[Distribution Worker] ⚡ Found ${pendingTargets.length} scheduled cross-post target(s) due for dispatch.`);

      for (const target of pendingTargets) {
        try {
          const targetPage = getPageById(target.target_page_id);
          if (!targetPage || !targetPage.is_active) {
            updateDistributionTarget(target.id, {
              status: 'skipped',
              error: `Target page #${target.target_page_id} is inactive or deleted`
            });
            continue;
          }

          // Check target page quota
          const todayCount = getPublishedCountToday(targetPage.id);
          if (todayCount >= (targetPage.daily_quota || 5)) {
            console.log(`[Distribution Worker] ⏸️ Target page ${targetPage.handle} reached daily quota (${todayCount}/${targetPage.daily_quota}). Delaying by 30 min.`);
            const delayedTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            updateDistributionTarget(target.id, {
              scheduled_at: delayedTime,
              error: `Quota reached (${todayCount}/${targetPage.daily_quota}); postponed`
            });
            continue;
          }

          // Fetch origin job to reuse downloaded media files & viral hook headline
          let originMediaPaths = [];
          let originMediaType = 'reel';
          let originHookHeadline = '';
          if (target.origin_job_id) {
            const originJob = getPublishJobById(target.origin_job_id);
            if (originJob) {
              originMediaType = originJob.media_type || 'reel';
              originHookHeadline = originJob.hook_headline || '';
              try {
                originMediaPaths = typeof originJob.media_paths === 'string'
                  ? JSON.parse(originJob.media_paths || '[]')
                  : (originJob.media_paths || []);
              } catch (e) {
                originMediaPaths = [];
              }
            }
          }

          // Enqueue publishing job for target page (reuses shared video & master hook, swaps target page branding)
          const enqueued = await enqueueJob({
            agent: 'watchtower',
            pageId: targetPage.id,
            originJobId: target.origin_job_id || null,
            hookHeadline: originHookHeadline,
            shortcode: target.shortcode,
            sourceUrl: target.source_url,
            mediaType: originMediaType,
            mediaPaths: originMediaPaths,
            caption: '', // Automatically formats hashtags & CTA for target page theme
            status: 'queued'
          });

          // Mark target as dispatched
          updateDistributionTarget(target.id, {
            status: 'dispatched',
            publish_job_id: enqueued.job.id,
            error: ''
          });

          console.log(`[Distribution Worker] ✓ Dispatched cross-post #${target.shortcode} to target ${targetPage.handle} (Job #${enqueued.job.id})`);

          // Check parent distribution job completion status
          this.checkJobCompletion(target.distribution_job_id);

          notifier.emitDashboardEvent('distribution_target_dispatched', {
            targetId: target.id,
            pageHandle: targetPage.handle,
            shortcode: target.shortcode,
            jobId: enqueued.job.id
          });

          dispatchedCount++;
        } catch (targetErr) {
          console.error(`[Distribution Worker] Error dispatching target #${target.id}:`, targetErr.message);
          updateDistributionTarget(target.id, {
            status: 'failed',
            error: targetErr.message
          });
        }
      }

      return { dispatched: dispatchedCount };
    } finally {
      this.isProcessing = false;
    }
  }

  checkJobCompletion(distributionJobId) {
    try {
      const targets = getDistributionTargets(distributionJobId);
      const total = targets.length;
      const completed = targets.filter(t => t.status === 'published' || t.publish_job_status === 'published').length;
      const dispatched = targets.filter(t => t.status === 'dispatched' || t.status === 'published').length;
      const failed = targets.filter(t => t.status === 'failed' || t.publish_job_status === 'failed').length;

      let newStatus = 'distributing';
      if (completed + failed >= total && total > 0) {
        newStatus = completed > 0 ? 'completed' : 'failed';
      }

      updateDistributionJob(distributionJobId, {
        completed_targets: completed || dispatched,
        failed_targets: failed,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      });
    } catch (e) {
      console.warn('[Distribution Worker] Notice updating job completion:', e.message);
    }
  }
}

const distributionWorker = new DistributionWorker();

module.exports = distributionWorker;
