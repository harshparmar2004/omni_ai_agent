const {
  getPublishJobById,
  getPageById,
  getPageGroupsForPage,
  getGroupMembers,
  getPublishJob,
  getPublishedCountToday,
  createDistributionJob,
  createDistributionTarget,
  updateDistributionJob
} = require('../database');
const notifier = require('./notifier');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * OmniStudio v8 — Distribution Planner
 * Converts a published reel into a fan-out distribution across interconnected page networks.
 */
async function planDistribution(originJobId, options = {}) {
  const originJob = typeof originJobId === 'object' ? originJobId : getPublishJobById(originJobId);
  if (!originJob) {
    throw new Error(`Origin job #${originJobId} not found`);
  }

  const originPage = getPageById(originJob.page_id);
  if (!originPage) {
    throw new Error(`Origin page #${originJob.page_id} not found`);
  }

  // Prevent recursive fan-out: child jobs distributed from another page should never trigger secondary fan-out
  if (originJob.origin_job_id && !options.force) {
    console.log(`[Distribution Planner] ℹ️ Job #${originJob.id} is already a distributed child (origin #${originJob.origin_job_id}). Skipping secondary fan-out.`);
    return { planned: false, reason: 'is_child_job' };
  }

  // Check if page allows cross-posting
  if (originPage.auto_cross_post === 0 && !options.force) {
    console.log(`[Distribution Planner] ℹ️ Page ${originPage.handle} has auto_cross_post disabled.`);
    return { planned: false, reason: 'auto_cross_post_disabled' };
  }

  // Fetch groups this page belongs to
  let groups = getPageGroupsForPage(originPage.id);
  if (options.groupId) {
    groups = groups.filter(g => g.id === parseInt(options.groupId, 10));
  }

  if (groups.length === 0) {
    console.log(`[Distribution Planner] ℹ️ Page ${originPage.handle} does not belong to any active distribution groups.`);
    return { planned: false, reason: 'no_groups' };
  }

  const plannedJobs = [];

  for (const group of groups) {
    if (!group.is_active && !options.force) continue;
    if (group.cross_post_mode === 'disabled' && !options.force) continue;

    const allMembers = getGroupMembers(group.id);
    const candidateMembers = allMembers.filter(m => {
      // 1. Skip origin page
      if (m.page_id === originPage.id) return false;
      // 2. Must be active
      if (!m.is_active || !m.page_is_active) return false;
      // 3. Skip if already queued/published on target page
      const existing = getPublishJob(m.page_id, originJob.shortcode);
      if (existing && existing.status !== 'failed') return false;
      // 4. Daily quota check
      if (!options.ignoreQuota) {
        const todayCount = getPublishedCountToday(m.page_id);
        const quota = m.daily_quota || 5;
        if (todayCount >= quota) return false;
      }
      return true;
    });

    if (candidateMembers.length === 0) {
      console.log(`[Distribution Planner] ℹ️ Group '${group.name}' has no available target pages for #${originJob.shortcode}.`);
      continue;
    }

    // Create Distribution Job
    const distJob = createDistributionJob({
      origin_job_id: originJob.id,
      origin_page_id: originPage.id,
      group_id: group.id,
      shortcode: originJob.shortcode,
      source_url: originJob.source_url,
      status: 'distributing',
      total_targets: candidateMembers.length
    });

    const targets = [];
    const minDelay = group.cross_post_delay_min || 20;
    const maxDelay = group.cross_post_delay_max || 45;

    let cumulativeDelayMin = 0;

    for (let i = 0; i < candidateMembers.length; i++) {
      const targetMember = candidateMembers[i];

      let scheduledAtIso;
      if (options.immediate) {
        scheduledAtIso = new Date().toISOString();
      } else {
        const stepDelay = randomInt(minDelay, maxDelay);
        cumulativeDelayMin += stepDelay;
        const scheduledTime = new Date(Date.now() + cumulativeDelayMin * 60 * 1000);
        scheduledAtIso = scheduledTime.toISOString();
      }

      const target = createDistributionTarget({
        distribution_job_id: distJob.id,
        target_page_id: targetMember.page_id,
        status: 'scheduled',
        scheduled_at: scheduledAtIso
      });

      targets.push({
        ...target,
        page_handle: targetMember.page_handle,
        page_name: targetMember.page_name,
        scheduled_at: scheduledAtIso
      });
    }

    plannedJobs.push({
      distributionJob: distJob,
      group,
      targets
    });

    console.log(`[Distribution Planner] 🚀 Planned distribution of #${originJob.shortcode} across ${targets.length} pages in '${group.name}'`);

    // Notify dashboard
    notifier.emitDashboardEvent('distribution_planned', {
      distributionJobId: distJob.id,
      groupName: group.name,
      targetsCount: targets.length,
      shortcode: originJob.shortcode
    });
  }

  return {
    planned: plannedJobs.length > 0,
    jobs: plannedJobs
  };
}

module.exports = {
  planDistribution
};
