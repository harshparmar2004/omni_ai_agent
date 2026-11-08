const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  getPages,
  createPage,
  createPageGroup,
  addPageToGroup,
  getPageGroupsForPage,
  getGroupMembers,
  createSourceAccount,
  getSourceAccounts,
  createDiscoveredPost,
  listDiscoveredPosts,
  getDb
} = require('../src/database');
const { planDistribution } = require('../src/core/distributionPlanner');
const { enqueueJob, getJob, updateJobProgress } = require('../src/core/jobQueue');

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 City Network Auto-Distribution & Multi-Format Verification');
  console.log('======================================================\n');

  const timestamp = Date.now();
  const db = getDb();

  // 1. Create a City Distribution Ring: "Delhi Nightlife Network"
  const cityGroup = createPageGroup({
    name: `Delhi Nightlife Network ${timestamp}`,
    slug: `delhi_nightlife_${timestamp}`,
    description: 'Autonomous multi-page city network for Delhi clubs',
    niche: 'nightlife',
    cross_post_mode: 'auto',
    cross_post_delay_min: 15,
    cross_post_delay_max: 30
  });
  console.log(`✓ Created City Network Ring: "${cityGroup.name}" (ID #${cityGroup.id})`);

  // 2. Create 3 Sibling City Pages in Delhi
  const pageA = createPage({
    slug: `delhi_clubbing_${timestamp}`,
    name: 'Delhi Clubbing Official',
    handle: `@delhiclubbing_${timestamp}`,
    ig_user_id: `1784140001_${timestamp}`,
    access_token: `EAAB_TOKEN_A_${timestamp}`,
    page_type: 'business',
    niche: 'nightlife',
    template_slug: 'clubbing',
    auto_cross_post: 1
  });

  const pageB = createPage({
    slug: `delhi_nightlife_${timestamp}`,
    name: 'Delhi Nightlife Guide',
    handle: `@delhinightlife_${timestamp}`,
    ig_user_id: `1784140002_${timestamp}`,
    access_token: `EAAB_TOKEN_B_${timestamp}`,
    page_type: 'business',
    niche: 'nightlife',
    template_slug: 'neon',
    auto_cross_post: 1
  });

  const pageC = createPage({
    slug: `delhi_parties_${timestamp}`,
    name: 'Delhi Weekend Parties',
    handle: `@delhiparties_${timestamp}`,
    ig_user_id: `1784140003_${timestamp}`,
    access_token: `EAAB_TOKEN_C_${timestamp}`,
    page_type: 'business',
    niche: 'nightlife',
    template_slug: 'video_essay',
    auto_cross_post: 1
  });

  console.log(`✓ Created 3 City Pages: ${pageA.handle}, ${pageB.handle}, ${pageC.handle}`);

  // 3. Add all 3 pages to the City Distribution Ring
  addPageToGroup(cityGroup.id, pageA.id, { role: 'primary', priority: 1 });
  addPageToGroup(cityGroup.id, pageB.id, { role: 'member', priority: 2 });
  addPageToGroup(cityGroup.id, pageC.id, { role: 'member', priority: 3 });

  const members = getGroupMembers(cityGroup.id);
  assert.strictEqual(members.length, 3, 'Group must have 3 members');
  console.log(`✓ Linked 3 pages into "${cityGroup.name}" with primary seed: ${pageA.handle}`);

  // 4. Add a club source to the City Group (Scope: 'group')
  const clubSource = createSourceAccount({
    username: `kittysu_delhi_${timestamp}`,
    group_id: cityGroup.id,
    scope: 'group'
  });
  console.log(`✓ Added club source @${clubSource.username} bound to Group #${cityGroup.id}`);

  // 5. Verify that ANY member page of this group discovers content from this club
  const flyerShortcode = `FLYER_${timestamp}`;
  const flyerPost = createDiscoveredPost({
    source_account_id: clubSource.id,
    shortcode: flyerShortcode,
    url: `https://www.instagram.com/p/${flyerShortcode}/`,
    media_type: 'image',
    caption: 'Weekend DJ Lineup Announcement at Kitty Su Delhi! #delhinightlife',
    score: 92.0,
    status: 'new'
  });

  const pageADiscoveries = listDiscoveredPosts({ pageId: pageA.id });
  const hasFlyer = pageADiscoveries.some(d => d.shortcode === flyerShortcode);
  assert.strictEqual(hasFlyer, true, 'Page A should inherit discoveries from the group-level club source');
  console.log(`✓ Multi-Format Discovery: Page A saw flyer post #${flyerShortcode} (Type: ${flyerPost.media_type})`);

  // 6. Test Selector with Multi-Format content
  const { evaluateAndSelectPosts } = require('../src/agents/watchtower/selector');
  const selectionResults = await evaluateAndSelectPosts({ pageId: pageA.id, force: true });
  console.log(`✓ Content Selector evaluated ${selectionResults.length} page(s) successfully`);

  // 7. Test Autonomous Fan-Out Distribution from Page A to Pages B and C
  const originJobEnqueued = await enqueueJob({
    agent: 'watchtower',
    pageId: pageA.id,
    shortcode: flyerShortcode,
    sourceUrl: flyerPost.url,
    mediaType: 'image',
    mediaPaths: ['/generated/downloads/sample_flyer.jpg'],
    hookHeadline: '🔥 MASSIVE WEEKEND LINEUP DROP IN DELHI',
    caption: 'Delhi is not ready for this weekend! See you at Kitty Su #delhiclubbing',
    status: 'queued'
  });

  // Mark origin job as published live on Page A
  const originJobPublished = updateJobProgress(originJobEnqueued.job.id, 'published', 'live', {
    ig_media_id: `IG_MEDIA_${timestamp}`,
    permalink: `https://instagram.com/p/${flyerShortcode}/`
  });
  console.log(`✓ Origin Job #${originJobPublished.id} published live on ${pageA.handle}`);

  // Trigger Distribution Planner
  const distPlan = await planDistribution(originJobPublished.id);
  assert.strictEqual(distPlan.planned, true, 'Distribution must be planned for sibling pages');
  assert.strictEqual(distPlan.jobs.length, 1, 'Should plan 1 distribution job');

  const targets = distPlan.jobs[0].targets;
  assert.strictEqual(targets.length, 2, 'Should fan out to exactly 2 sibling pages (Page B and Page C)');
  console.log(`✓ Fan-Out Planned: Created distribution for ${targets.length} sibling pages:`);
  for (const t of targets) {
    console.log(`  - Target Page #${t.target_page_id} (${t.page_handle || 'sibling'}): Scheduled for ${t.scheduled_at}`);
  }

  // 8. Test Child Guardrail: Child jobs should NEVER trigger a secondary fan-out
  const childJobSim = {
    id: 999999,
    page_id: pageB.id,
    origin_job_id: originJobPublished.id,
    shortcode: flyerShortcode
  };
  const childFanOut = await planDistribution(childJobSim);
  assert.strictEqual(childFanOut.planned, false, 'Child job must not trigger secondary fanout');
  assert.strictEqual(childFanOut.reason, 'is_child_job', 'Reason must be is_child_job');
  console.log(`✓ Anti-Recursion Guardrail: Child job successfully prevented from cascading fan-out`);

  // Cleanup test entities from database
  try {
    db.prepare('DELETE FROM distribution_targets WHERE distribution_job_id = ?').run(distPlan.jobs[0].distributionJob.id);
    db.prepare('DELETE FROM distribution_jobs WHERE id = ?').run(distPlan.jobs[0].distributionJob.id);
    db.prepare('DELETE FROM publish_jobs WHERE shortcode = ?').run(flyerShortcode);
    db.prepare('DELETE FROM discovered_posts WHERE shortcode = ?').run(flyerShortcode);
    db.prepare('DELETE FROM source_accounts WHERE id = ?').run(clubSource.id);
    db.prepare('DELETE FROM page_group_members WHERE group_id = ?').run(cityGroup.id);
    db.prepare('DELETE FROM page_groups WHERE id = ?').run(cityGroup.id);
    db.prepare('DELETE FROM pages WHERE id IN (?, ?, ?)').run(pageA.id, pageB.id, pageC.id);
    console.log(`✓ Test cleanup complete`);
  } catch (cleanErr) {
    console.warn(`Cleanup notice:`, cleanErr.message);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL CITY NETWORK AUTO-DISTRIBUTION TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
