const assert = require('assert');
const {
  getDb,
  createPage,
  deletePage,
  createPageGroup,
  deletePageGroup,
  addPageToGroup,
  createPublishJob,
  getPublishJobById,
  getDistributionJobById
} = require('../src/database');
const { deleteJob } = require('../src/core/jobQueue');
const { planDistribution } = require('../src/core/distributionPlanner');
const distributionWorker = require('../src/core/distributionWorker');

console.log('🧪 Testing OmniStudio v8 Distribution Planner & Worker...');

const runId = Date.now();

// 1. Create 3 test pages in a concert network group
const group = createPageGroup({
  name: `Concert Ring ${runId}`,
  slug: `concert_ring_${runId}`,
  niche: 'concert',
  cross_post_mode: 'auto',
  cross_post_delay_min: 5,
  cross_post_delay_max: 10
});

const pageA = createPage({
  slug: `concert_a_${runId}`,
  name: 'Concert Page A',
  handle: `@concert.a.${runId}`,
  ig_user_id: `user_a_${runId}`,
  access_token: 'TOKEN_A',
  auto_cross_post: true
});

const pageB = createPage({
  slug: `concert_b_${runId}`,
  name: 'Concert Page B',
  handle: `@concert.b.${runId}`,
  ig_user_id: `user_b_${runId}`,
  access_token: 'TOKEN_B',
  auto_cross_post: true
});

const pageC = createPage({
  slug: `concert_c_${runId}`,
  name: 'Concert Page C',
  handle: `@concert.c.${runId}`,
  ig_user_id: `user_c_${runId}`,
  access_token: 'TOKEN_C',
  auto_cross_post: true
});

addPageToGroup(group.id, pageA.id, { role: 'primary', priority: 1 });
addPageToGroup(group.id, pageB.id, { role: 'member', priority: 2 });
addPageToGroup(group.id, pageC.id, { role: 'member', priority: 3 });

// 2. Simulate origin published reel on Page A
const originJob = createPublishJob({
  agent: 'watchtower',
  page_id: pageA.id,
  shortcode: `REEL_${runId}`,
  source_url: `https://www.instagram.com/reel/REEL_${runId}/`,
  media_type: 'reel',
  media_paths: ['/generated/test_reel.mp4'],
  caption: 'Epic concert moment live!',
  status: 'published'
});

// 3. Run Distribution Planner
async function runTest() {
  const planResult = await planDistribution(originJob.id, { immediate: true });
  assert.strictEqual(planResult.planned, true, 'Distribution should be planned');
  assert.strictEqual(planResult.jobs.length, 1, 'Should plan 1 distribution job for the group');

  const distJobDetails = planResult.jobs[0];
  assert.strictEqual(distJobDetails.targets.length, 2, 'Should target Page B and Page C (excluding Page A)');
  console.log(`✓ Distribution planned successfully across ${distJobDetails.targets.length} target pages`);

  // 4. Test Distribution Worker Tick
  console.log('Testing Distribution Worker dispatch...');
  await distributionWorker.tick();

  const reloadedDistJob = getDistributionJobById(distJobDetails.distributionJob.id);
  assert(reloadedDistJob.targets.every(t => t.status === 'dispatched'), 'All targets should now be dispatched to queue');
  console.log('✓ All distribution targets dispatched by worker to publish queue');

  // Verify created publish jobs for targets
  for (const t of reloadedDistJob.targets) {
    assert(t.publish_job_id, 'Target must have a publish_job_id');
    const childJob = getPublishJobById(t.publish_job_id);
    assert(childJob, 'Child job must exist in publish_jobs');
    assert.strictEqual(childJob.shortcode, `REEL_${runId}`);
    console.log(`✓ Child job created for ${t.target_page_handle}: Job #${childJob.id}`);
    deleteJob(childJob.id);
  }

  // Cleanup
  deleteJob(originJob.id);
  deletePageGroup(group.id);
  deletePage(pageA.id);
  deletePage(pageB.id);
  deletePage(pageC.id);

  console.log('✅ All Distribution Planner & Worker Tests Passed cleanly!\n');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
