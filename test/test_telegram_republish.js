const assert = require('assert');
const {
  getDb,
  getPages,
  createPage,
  getPublishJob,
  createPublishJob,
  updatePublishJob,
  getJobEvents
} = require('../src/database');
const { submitLink } = require('../src/agents/reposter/reposterAgent');
const { enqueueJob } = require('../src/core/jobQueue');

async function runTelegramRepublishTest() {
  console.log('======================================================');
  console.log('🧪 Testing Telegram Reel Already Published Re-Publish Flow');
  console.log('======================================================\n');

  const db = getDb();
  const testShortcode = `TEST_REEL_${Date.now()}`;
  const testUrl = `https://www.instagram.com/reel/${testShortcode}/`;

  // 1. Ensure target test page exists
  let pages = getPages({ isActiveOnly: true });
  let targetPage = pages.find(p => p.handle.includes('movie')) || pages[0];
  if (!targetPage) {
    targetPage = createPage({
      name: 'Movie Series 365',
      slug: `movies_test_${Date.now()}`,
      handle: '@movie_series_365',
      ig_user_id: '178414000000',
      access_token: 'mock_token'
    });
  }
  console.log(`✓ 1. Target Page: ${targetPage.name} (${targetPage.handle})`);

  // 2. Submit initial reel & simulate it being published live
  const initialRes = await submitLink({
    url: testUrl,
    pageId: targetPage.id,
    origin: 'telegram_test'
  });
  assert(initialRes.job, 'Job should be created');
  console.log(`✓ 2. Initial Job #${initialRes.job.id} enqueued for #${testShortcode}`);

  // Mark job as published live
  updatePublishJob(initialRes.job.id, {
    status: 'published',
    published_at: new Date().toISOString(),
    permalink: `https://www.instagram.com/p/${testShortcode}/`
  });
  const publishedJob = getPublishJob(targetPage.id, testShortcode);
  assert.strictEqual(publishedJob.status, 'published');
  console.log(`✓ 3. Job #${initialRes.job.id} marked as published live`);

  // 3. User shares the same reel again in Telegram (without force)
  const duplicateRes = await submitLink({
    url: testUrl,
    pageId: targetPage.id,
    origin: 'telegram_test',
    force: false
  });
  assert.strictEqual(duplicateRes.duplicate, true, 'Should detect duplicate');
  assert.strictEqual(duplicateRes.alreadyPublished, true, 'Should detect alreadyPublished');
  console.log('✓ 4. Duplicate Detection: submitLink safely refused duplicate without force');

  // 4. Operator clicks "🔁 Yes, Publish Again" (force: true)
  const republishRes = await submitLink({
    url: testUrl,
    pageId: targetPage.id,
    origin: 'telegram_test',
    force: true
  });
  assert.strictEqual(republishRes.duplicate, false, 'Duplicate flag should be false when forced');
  assert.strictEqual(republishRes.republish, true, 'Republish flag should be true');
  assert.strictEqual(republishRes.job.status, 'queued', 'Job status should be reset to queued');
  console.log(`✓ 5. Re-Publish Activated: Job #${republishRes.job.id} re-queued for execution`);

  // 5. Verify audit event was logged
  const events = getJobEvents(initialRes.job.id);
  const republishEvent = events.find(e => e.status === 'republish_forced');
  assert(republishEvent, 'Audit log should record republish_forced event');
  console.log(`✓ 6. Audit Trail Verified: Logged "${republishEvent.message}"`);

  // Cleanup test job
  db.prepare('DELETE FROM job_events WHERE job_id = ?').run(initialRes.job.id);
  db.prepare('DELETE FROM publish_jobs WHERE id = ?').run(initialRes.job.id);
  console.log('✓ 7. Test cleanup complete');

  console.log('\n======================================================');
  console.log('🎉 TELEGRAM RE-PUBLISH CONFIRMATION FLOW TEST PASSED 100%!');
  console.log('======================================================');
}

runTelegramRepublishTest().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
