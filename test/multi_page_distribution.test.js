const assert = require('assert');
const {
  getDb,
  createPublishJob,
  getPublishJobById,
  getPageById,
  createPageGroup,
  addPageToGroup,
  listPageGroups
} = require('../src/database');
const { planDistribution } = require('../src/core/distributionPlanner');
const distributionWorker = require('../src/core/distributionWorker');

console.log('🧪 Testing Multi-Page Distribution Fan-Out Network...');

const db = getDb();

// 1. Ensure a distribution group exists
let group = db.prepare("SELECT * FROM page_groups WHERE slug = 'cult_network'").get();
if (!group) {
  group = createPageGroup({
    slug: 'cult_network',
    name: 'Cult Knowledge Network',
    description: 'Interconnected editorial pages sharing viral knowledge reels',
    niche: 'knowledge',
    cross_post_mode: 'auto',
    cross_post_delay_min: 5,
    cross_post_delay_max: 15
  });
}

// 2. Ensure at least two active pages are members
// Cult Information (Page ID 4) and Clubbing Cult (Page ID 3) or a clone
addPageToGroup(group.id, 4, 'origin', 1);
addPageToGroup(group.id, 3, 'member', 2);

// Create a simulated 3rd page for the test: Cult AI Daily
let page3 = db.prepare("SELECT * FROM pages WHERE slug = 'cult_ai_daily'").get();
if (!page3) {
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO pages (slug, name, handle, ig_user_id, access_token, caption_template, default_hashtags, post_mode, is_active, created_at, updated_at)
    VALUES ('cult_ai_daily', 'Cult AI Daily', '@cult_ai_daily', 'TEST_ID_3', 'TEST_TOKEN_3', '{caption}\n\n{hashtags}', '#cultai #ai', 'auto', 1, ?, ?)
  `).run(now, now);
  page3 = getPageById(info.lastInsertRowid);
}
addPageToGroup(group.id, page3.id, 'member', 3);

// 3. Create a master origin job on Page 4 (Cult Information)
const testShortcode = `test_dist_${Date.now()}`;
const originJob = createPublishJob({
  agent: 'watchtower',
  page_id: 4,
  shortcode: testShortcode,
  source_url: `https://www.instagram.com/reel/${testShortcode}/`,
  media_type: 'reel',
  media_paths: ['/generated/downloads/reel_DfZqnfuArzx.mp4'],
  hook_headline: 'Tech Billionaires Unite for an **80s-style** Charity Anthem Called We Were Always Blue',
  caption: 'Silicon Valley tech elite charity satire breakdown.',
  status: 'published'
});

assert(originJob.id, 'Origin job must be created');
assert.strictEqual(originJob.hook_headline, 'Tech Billionaires Unite for an **80s-style** Charity Anthem Called We Were Always Blue');

// 4. Plan distribution across the network
(async () => {
  const planResult = await planDistribution(originJob.id, {
    groupId: group.id,
    immediate: true,
    ignoreQuota: true,
    force: true
  });

  console.log('Distribution plan created:', planResult);
  assert(planResult.planned, 'Distribution must be planned');
  assert(planResult.jobs[0].targets.length >= 1, 'Must have at least 1 target page');

  // 5. Tick distribution worker to dispatch jobs to targets
  const tickResult = await distributionWorker.tick();
  console.log('Distribution worker tick dispatched:', tickResult);
  assert(tickResult.dispatched >= 1, 'Must dispatch at least 1 cross-post job');

  // 6. Verify target jobs in database
  const targetJobs = db.prepare("SELECT * FROM publish_jobs WHERE shortcode = ? AND id != ?").all(testShortcode, originJob.id);
  console.log(`Found ${targetJobs.length} dispatched target jobs:`);

  for (const tj of targetJobs) {
    const targetPage = getPageById(tj.page_id);
    console.log(`  -> Job #${tj.id} for Page #${tj.page_id} (${targetPage.name} - ${targetPage.handle})`);
    console.log(`     Origin Job ID: ${tj.origin_job_id}`);
    console.log(`     Shared Hook: "${tj.hook_headline}"`);
    console.log(`     Shared Media: ${tj.media_paths}`);

    assert.strictEqual(tj.origin_job_id, originJob.id, 'Target job must reference origin_job_id');
    assert.strictEqual(tj.hook_headline, originJob.hook_headline, 'Target job must inherit master hook headline');
    assert.strictEqual(tj.media_paths, originJob.media_paths, 'Target job must reuse pre-downloaded media path');
  }

  console.log('✅ Multi-Page Distribution Fan-Out verified cleanly!');
})();
