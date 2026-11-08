const assert = require('assert');
const {
  getDb,
  createPage,
  getPageById,
  deletePage,
  createPageGroup,
  getPageGroupById,
  getPageGroupBySlug,
  updatePageGroup,
  deletePageGroup,
  getPageGroups,
  addPageToGroup,
  getGroupMembers,
  getPageGroupsForPage,
  removePageFromGroup,
  upsertPageTemplate,
  getPageTemplate,
  listPageTemplates,
  deletePageTemplate,
  createDistributionJob,
  getDistributionJobById,
  updateDistributionJob,
  createDistributionTarget,
  getDistributionTargets,
  getPendingDistributionTargets,
  updateDistributionTarget
} = require('../src/database');

console.log('🧪 Testing OmniStudio v8 Group & Distribution Operations...');

const runId = Date.now();
// Pre-clean any test rows if left over
try {
  const db = getDb();
  db.prepare("DELETE FROM page_groups WHERE slug LIKE 'test_%'").run();
  db.prepare("DELETE FROM pages WHERE slug LIKE 'test_%'").run();
} catch (e) {}

// 1. Test Page Group CRUD
const testGroup = createPageGroup({
  name: `Test Concert Network ${runId}`,
  slug: `test_concert_network_${runId}`,
  niche: 'concert',
  cross_post_mode: 'auto',
  cross_post_delay_min: 15,
  cross_post_delay_max: 30
});

assert(testGroup.id, 'Group must have an ID');
assert.strictEqual(testGroup.slug, `test_concert_network_${runId}`);
assert.strictEqual(testGroup.niche, 'concert');
console.log('✓ Group created:', testGroup.name);

// Update group
const updatedGroup = updatePageGroup(testGroup.id, {
  description: '10 interconnected music and concert channels'
});
assert.strictEqual(updatedGroup.description, '10 interconnected music and concert channels');
console.log('✓ Group updated successfully');

// 2. Test Page creation with v8 columns
const pageA = createPage({
  slug: `test_concert_primary_${runId}`,
  name: 'Concert Vibes Primary',
  handle: `@concertvibes.primary.${runId}`,
  ig_user_id: `1234567890_${runId}`,
  access_token: 'TEST_TOKEN_A',
  page_type: 'destination',
  niche: 'concert',
  template_slug: 'neon',
  auto_cross_post: true
});

const pageB = createPage({
  slug: `test_concert_secondary_${runId}`,
  name: 'Concert Vibes Secondary',
  handle: `@concertvibes.secondary.${runId}`,
  ig_user_id: `0987654321_${runId}`,
  access_token: 'TEST_TOKEN_B',
  page_type: 'destination',
  niche: 'concert',
  template_slug: 'card',
  auto_cross_post: true
});

assert(pageA.id && pageB.id, 'Test pages must have IDs');
assert.strictEqual(pageA.template_slug, 'neon');
console.log('✓ Test pages created with v8 fields');

// 3. Test Membership
addPageToGroup(testGroup.id, pageA.id, { role: 'primary', priority: 1 });
addPageToGroup(testGroup.id, pageB.id, { role: 'member', priority: 2 });

const members = getGroupMembers(testGroup.id);
assert.strictEqual(members.length, 2, 'Group should have 2 members');
assert.strictEqual(members[0].role, 'primary');
assert.strictEqual(members[1].role, 'member');
console.log('✓ Group members added and verified in priority order');

const pageAGroups = getPageGroupsForPage(pageA.id);
assert.strictEqual(pageAGroups.length, 1);
assert.strictEqual(pageAGroups[0].slug, testGroup.slug);
console.log('✓ Page group reverse lookup verified');

// 4. Test Page Template CRUD
const templateA = upsertPageTemplate({
  page_id: pageA.id,
  template_type: 'default',
  primary_color: '#00FF66',
  accent_color: '#CCFF00',
  frame_style: 'card',
  story_template: 'editorial'
});
assert.strictEqual(templateA.accent_color, '#CCFF00');

const fetchedTemplate = getPageTemplate(pageA.id, 'default');
assert.strictEqual(fetchedTemplate.primary_color, '#00FF66');
console.log('✓ Page template created and retrieved');

// 5. Test Distribution Job & Target Tracking
const distJob = createDistributionJob({
  origin_page_id: pageA.id,
  group_id: testGroup.id,
  shortcode: 'TEST_SHORTCODE_1',
  source_url: 'https://www.instagram.com/reel/TEST_SHORTCODE_1/',
  status: 'distributing',
  total_targets: 1
});
assert(distJob.id, 'Distribution job created');

const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();

const target1 = createDistributionTarget({
  distribution_job_id: distJob.id,
  target_page_id: pageB.id,
  status: 'scheduled',
  scheduled_at: pastDate // Due now
});
assert(target1.id, 'Distribution target created');

const pendingTargets = getPendingDistributionTargets();
assert(pendingTargets.some(t => t.id === target1.id), 'Pending due target should be found');
console.log('✓ Distribution job and pending targets verified');

// Cleanup
deletePageGroup(testGroup.id);
deletePage(pageA.id);
deletePage(pageB.id);

console.log('✅ All Phase 1 Database & Group Operations Tests Passed cleanly!\n');
