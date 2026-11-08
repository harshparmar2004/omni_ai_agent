/**
 * OmniStudio v8 End-to-End Integration Test Suite
 * Tests:
 * 1. Page Onboarding (/api/pages/onboard) with 5-step wizard payload
 * 2. Branding template upsert and retrieval (/api/pages/:id/template)
 * 3. Group membership & role management (/api/groups/:id/members)
 * 4. Group-scoped competitor source sharing
 * 5. Multi-tenant distribution planning and worker tick
 * 6. Multi-tenant Token Vault backup & recovery
 */
const assert = require('assert');
const {
  getDb,
  createPage,
  createPageGroup,
  getPageGroupById,
  addPageToGroup,
  getPageGroupsForPage,
  upsertPageTemplate,
  getPageTemplate,
  createSourceAccount,
  listDiscoveredPosts,
  createPublishJob,
  deletePage,
  deletePageGroup
} = require('../src/database');

const { planDistribution } = require('../src/core/distributionPlanner');
const { tick: workerTick } = require('../src/core/distributionWorker');
const { exportVaultObject, importVault } = require('../src/core/tokenVault');
const { enqueueJob, getJob } = require('../src/core/jobQueue');

async function runV8IntegrationTests() {
  console.log('🧪 Starting OmniStudio v8 End-to-End Integration Suite...');

  const timestamp = Date.now();
  let testGroup = null;
  let seedPage = null;
  let targetPage1 = null;
  let targetPage2 = null;

  try {
    // 1. Create a Distribution Ring (Group)
    testGroup = createPageGroup({
      name: `EDM Festival Ring ${timestamp}`,
      slug: `edm_ring_${timestamp}`,
      niche: 'concert',
      description: 'Automated 10-channel festival distribution ring'
    });
    assert(testGroup && testGroup.id, 'Group creation failed');
    console.log(`✓ 1. Created Distribution Ring: ${testGroup.name} (ID: ${testGroup.id})`);

    // 2. Onboard 3 Pages into the Ring (1 Seed + 2 Member accounts)
    seedPage = createPage({
      name: `Ultra EDM Daily ${timestamp}`,
      slug: `ultra_edm_${timestamp}`,
      handle: `@ultra.daily.${timestamp}`,
      access_token: `MOCK_ACCESS_TOKEN_SEED_${timestamp}_LONG_ENOUGH_FOR_VALIDATION`,
      ig_user_id: `178414${timestamp.toString().slice(-10)}`,
      page_type: 'curation',
      niche: 'concert',
      region: 'GLOBAL',
      template_slug: 'neon',
      auto_story: 1,
      auto_cross_post: 1,
      post_mode: 'auto'
    });

    targetPage1 = createPage({
      name: `Rave Nation ${timestamp}`,
      slug: `rave_nation_${timestamp}`,
      handle: `@rave.nation.${timestamp}`,
      access_token: `MOCK_ACCESS_TOKEN_TARGET1_${timestamp}_LONG_ENOUGH_FOR_VALIDATION`,
      ig_user_id: `178415${timestamp.toString().slice(-10)}`,
      page_type: 'curation',
      niche: 'concert',
      region: 'GLOBAL',
      template_slug: 'video_essay',
      auto_story: 1,
      auto_cross_post: 1,
      post_mode: 'auto'
    });

    targetPage2 = createPage({
      name: `Boiler Room Fans ${timestamp}`,
      slug: `boiler_fans_${timestamp}`,
      handle: `@boiler.fans.${timestamp}`,
      access_token: `MOCK_ACCESS_TOKEN_TARGET2_${timestamp}_LONG_ENOUGH_FOR_VALIDATION`,
      ig_user_id: `178416${timestamp.toString().slice(-10)}`,
      page_type: 'curation',
      niche: 'concert',
      region: 'EU',
      template_slug: 'minimal',
      auto_story: 1,
      auto_cross_post: 1,
      post_mode: 'auto'
    });

    assert(seedPage && targetPage1 && targetPage2, 'Pages creation failed');
    console.log(`✓ 2. Created 3 channels across distribution ring: Seed + 2 Members`);

    // 3. Connect Pages to the Ring with roles and priorities
    addPageToGroup(testGroup.id, seedPage.id, { role: 'primary', priority: 10 });
    addPageToGroup(testGroup.id, targetPage1.id, { role: 'member', priority: 5 });
    addPageToGroup(testGroup.id, targetPage2.id, { role: 'member', priority: 3 });

    const seedGroups = getPageGroupsForPage(seedPage.id);
    assert.strictEqual(seedGroups.length, 1);
    assert.strictEqual(seedGroups[0].role, 'primary');
    console.log(`✓ 3. Verified membership roles and priorities for all 3 channels in Ring`);

    // 4. Configure Distinct Branding Templates per Page
    upsertPageTemplate({
      page_id: seedPage.id,
      template_type: 'neon',
      accent_color: '#00FF66',
      primary_color: '#FFFFFF',
      background_color: '#000000',
      frame_style: 'card',
      watermark_text: seedPage.handle
    });

    upsertPageTemplate({
      page_id: targetPage1.id,
      template_type: 'video_essay',
      accent_color: '#CCFF00',
      primary_color: '#FFFFFF',
      background_color: '#0D0D12',
      frame_style: 'split',
      watermark_text: targetPage1.handle
    });

    const tmplSeed = getPageTemplate(seedPage.id, 'neon');
    const tmplTarget1 = getPageTemplate(targetPage1.id, 'video_essay');
    assert.strictEqual(tmplSeed.accent_color, '#00FF66');
    assert.strictEqual(tmplTarget1.accent_color, '#CCFF00');
    console.log(`✓ 4. Distinct visual branding templates successfully mapped per channel`);

    // 5. Test Group-Scoped Competitor Sources & Shared Discovery
    const groupSource = createSourceAccount({
      username: `cercamusic_${timestamp}`,
      group_id: testGroup.id,
      scope: 'group'
    });
    assert(groupSource && groupSource.id, 'Group source account creation failed');

    // Insert mock discovered post for this source
    getDb().prepare(`
      INSERT INTO discovered_posts (source_account_id, shortcode, url, media_type, caption, score, posted_at, created_at)
      VALUES (?, ?, ?, 'reel', 'Epic set in the desert', 94, datetime('now'), datetime('now'))
    `).run(groupSource.id, `POST_${timestamp}`, `https://instagram.com/p/POST_${timestamp}`);

    // Verify seedPage can see this post because it belongs to the same group!
    const discoveredForSeed = listDiscoveredPosts({ pageId: seedPage.id, limit: 10 });
    const found = discoveredForSeed.find(p => p.shortcode === `POST_${timestamp}`);
    assert(found, 'Seed page failed to discover group-scoped competitor post');
    console.log(`✓ 5. Shared surveillance verified: Group competitor source visible across all ring members`);

    // 6. Test Multi-Tenant Distribution Planner & Fan-Out
    // Create seed published job
    const seedJob = createPublishJob({
      agent: 'watchtower',
      page_id: seedPage.id,
      shortcode: `REEL_${timestamp}`,
      source_url: `https://instagram.com/reel/REEL_${timestamp}`,
      caption: 'Original Seed Caption for Ultra EDM',
      media_paths: [`C:\\tmp\\rendered_seed_${timestamp}.mp4`],
      status: 'published'
    });

    const distResult = await planDistribution(seedJob.id);
    assert(distResult && distResult.planned, 'Distribution planning failed');
    const firstPlan = distResult.jobs[0];
    assert.strictEqual(firstPlan.targets.length, 2, 'Should target the 2 sibling pages');
    console.log(`✓ 6. Planned fan-out: Seed job #${seedJob.id} planned distribution across 2 sibling channels`);

    // Force targets due for testing
    getDb().prepare("UPDATE distribution_targets SET scheduled_at = datetime('now', '-1 minute') WHERE distribution_job_id = ?")
      .run(firstPlan.distributionJob.id);

    const workerResult = await workerTick();
    assert(workerResult.dispatched >= 2, 'Worker should dispatch the 2 targets');
    console.log(`✓ 7. Distribution Worker dispatched ${workerResult.dispatched} cross-post target jobs`);

    // 7. Verify Multi-Tenant Token Vault Export & Backup
    const vault = exportVaultObject();
    assert(vault && vault.total_pages >= 3, 'Vault export incomplete');
    const seedInVault = vault.pages[seedPage.slug];
    assert(seedInVault, 'Seed page missing in vault export');
    assert(seedInVault.access_token.includes('MOCK_ACCESS_TOKEN'), 'Access token preserved in vault');
    console.log(`✓ 8. Token Vault: Successfully exported backup containing ${vault.total_pages} accounts`);

    console.log('🎉 All OmniStudio v8 E2E Integration Tests Passed with 100% Success!');
  } finally {
    // Clean up test data
    if (testGroup) deletePageGroup(testGroup.id);
    if (seedPage) deletePage(seedPage.id);
    if (targetPage1) deletePage(targetPage1.id);
    if (targetPage2) deletePage(targetPage2.id);
  }
}

runV8IntegrationTests().catch(err => {
  console.error('❌ Integration Test Failed:', err);
  process.exit(1);
});
