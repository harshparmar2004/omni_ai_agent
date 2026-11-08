const assert = require('assert');
const { getPeakWindowStatus, evaluateAndSelectPosts } = require('../src/agents/watchtower/selector');
const { scanSingleSource } = require('../src/agents/watchtower/scanner');
const {
  getSetting,
  setSetting,
  getPages,
  createSourceAccount,
  deleteSourceAccount,
  getSourceAccounts,
  listDiscoveredPosts
} = require('../src/database');

async function runTests() {
  console.log('🧪 Starting Continuous Surveillance & 24/7 Mode Tests...\n');

  // Test 1: getPeakWindowStatus includes is247Mode
  console.log('Test 1: Peak Window Status 24/7 Flag Detection');
  setSetting('watchtower_247_mode', 'true');
  const status247 = getPeakWindowStatus();
  assert.strictEqual(status247.is247Mode, true, 'is247Mode should be true when setting is true');

  setSetting('watchtower_247_mode', 'false');
  const statusNon247 = getPeakWindowStatus();
  assert.strictEqual(statusNon247.is247Mode, false, 'is247Mode should be false when setting is false');
  console.log('  ✓ getPeakWindowStatus() correctly reflects watchtower_247_mode setting');

  // Reset to 24/7 mode
  setSetting('watchtower_247_mode', 'true');

  // Test 2: evaluateAndSelectPosts with 24/7 mode active
  console.log('Test 2: evaluateAndSelectPosts runs without crashing in 24/7 mode');
  const activePages = getPages({ isActiveOnly: true });
  assert(activePages.length > 0, 'Should have at least one active page');
  const testPage = activePages[0];

  const evalResult = await evaluateAndSelectPosts({ pageId: testPage.id, is247Mode: true });
  assert(Array.isArray(evalResult), 'evaluateAndSelectPosts should return an array');
  console.log(`  ✓ evaluateAndSelectPosts evaluated ${evalResult.length} page(s) successfully in 24/7 mode`);

  // Test 3: scanSingleSource resolution & evaluation
  console.log('Test 3: scanSingleSource on-demand indexing');
  // Create a temporary test source
  const testUsername = 'tomorrowland';
  const newSource = createSourceAccount({
    username: testUsername,
    page_id: testPage.id
  });
  assert(newSource && newSource.id, 'Should create source account');
  console.log(`  ✓ Created test source account @${testUsername} (ID: ${newSource.id})`);

  // Scan single source
  const scanResult = await scanSingleSource(newSource.id, { limit: 2, evaluate: false });
  assert.strictEqual(scanResult.success, true, 'scanSingleSource should succeed');
  assert(scanResult.postsFound >= 0, 'postsFound should be non-negative');
  console.log(`  ✓ scanSingleSource completed: ${scanResult.postsFound} posts inspected, ${scanResult.newPostsCount} new reels indexed`);

  // Cleanup test source
  deleteSourceAccount(newSource.id);
  console.log('  ✓ Cleaned up test source account');

  console.log('\n🎉 All Continuous Surveillance Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
