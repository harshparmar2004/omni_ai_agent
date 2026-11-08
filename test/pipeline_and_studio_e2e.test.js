/**
 * OmniStudio v8 — Pipeline Tracking & Agent 3 Studio E2E Test Suite
 * Validates stage event tracking, studio presets & re-rendering, bulk page ops, and fan-out timeline.
 */

const assert = require('assert');
const http = require('http');
const db = require('../src/database');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PIPELINE TRACKING & AGENT 3 STUDIO TESTS');
  console.log('======================================================\n');

  // Test 1: Direct Database job_events insertion and retrieval
  console.log('Test 1: Testing job_events schema & CRUD in database...');
  const anyJob = db.getDb().prepare('SELECT id FROM publish_jobs LIMIT 1').get();
  assert(anyJob, 'Must have at least one job in publish_jobs');
  const testJobId = anyJob.id;
  const event1 = db.addJobEvent({
    jobId: testJobId,
    stage: 'ingestion',
    status: 'completed',
    message: 'Reel shortcode DfY69PcRR30 ingested via Agent 2',
    meta: { shortcode: 'DfY69PcRR30', width: 1080, height: 1920 }
  });
  assert(event1 && event1.id, 'addJobEvent should return created event with ID');
  assert.strictEqual(event1.stage, 'ingestion');

  const event2 = db.addJobEvent({
    jobId: testJobId,
    stage: 'rendering',
    status: 'completed',
    message: 'Agent 3 rendered video frame with theme: neon',
    meta: { theme: 'neon', hook: 'TEST HOOK LINE' }
  });
  assert(event2 && event2.id);

  const events = db.getJobEvents(testJobId);
  assert(events.length >= 2, 'Should retrieve at least 2 events for testJobId');
  assert(events.some(e => e.id === event1.id && e.stage === 'ingestion'), 'Event 1 must be present');
  assert(events.some(e => e.id === event2.id && e.stage === 'rendering'), 'Event 2 must be present');
  console.log('  ✓ job_events table & getJobEvents working perfectly');

  // Test 2: Pipeline Stats API (/api/pipeline/stats)
  console.log('\nTest 2: GET /api/pipeline/stats...');
  const statsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/stats',
    method: 'GET'
  });
  assert.strictEqual(statsRes.statusCode, 200);
  assert(statsRes.body && statsRes.body.success, 'stats endpoint should return success');
  assert(typeof statsRes.body.stats.total === 'number');
  console.log(`  ✓ stats returned successfully: ${statsRes.body.stats.total} total jobs in system`);

  // Test 3: Pipeline Jobs List API (/api/pipeline/jobs)
  console.log('\nTest 3: GET /api/pipeline/jobs...');
  const jobsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/jobs?limit=5',
    method: 'GET'
  });
  assert.strictEqual(jobsRes.statusCode, 200);
  assert(jobsRes.body && jobsRes.body.jobs, 'jobs endpoint should return array of jobs');
  console.log(`  ✓ retrieved ${jobsRes.body.jobs.length} jobs with edit metadata parsed`);

  // Test 4: Pipeline Single Job Audit Detail (/api/pipeline/jobs/:id)
  console.log('\nTest 4: GET /api/pipeline/jobs/1...');
  const jobDetailRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/jobs/1',
    method: 'GET'
  });
  assert.strictEqual(jobDetailRes.statusCode, 200);
  assert(jobDetailRes.body && jobDetailRes.body.job, 'Should return job detail');
  assert(Array.isArray(jobDetailRes.body.events), 'Should return job_events array');
  assert(Array.isArray(jobDetailRes.body.distributionTargets), 'Should return distributionTargets array');
  console.log(`  ✓ retrieved job #1 with ${jobDetailRes.body.events.length} audit events`);

  // Test 5: Studio Presets API (/api/studio/presets)
  console.log('\nTest 5: GET /api/studio/presets...');
  const presetsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/studio/presets',
    method: 'GET'
  });
  assert.strictEqual(presetsRes.statusCode, 200);
  assert(presetsRes.body && presetsRes.body.presets, 'Should return presets array');
  assert.strictEqual(presetsRes.body.presets.length, 5, 'Should return 5 aesthetic presets');
  const presetIds = presetsRes.body.presets.map(p => p.id);
  assert(presetIds.includes('neon'), 'Must include neon preset');
  assert(presetIds.includes('video_essay'), 'Must include video_essay preset');
  assert(presetIds.includes('cinema'), 'Must include cinema preset');
  assert(presetIds.includes('gta6'), 'Must include gta6 preset');
  assert(presetIds.includes('minimal'), 'Must include minimal preset');
  console.log('  ✓ 5 aesthetic presets validated (neon, video_essay, cinema, gta6, minimal)');

  // Test 6: Studio Recent Renders API (/api/studio/recent)
  console.log('\nTest 6: GET /api/studio/recent...');
  const recentRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/studio/recent',
    method: 'GET'
  });
  assert.strictEqual(recentRes.statusCode, 200);
  assert(recentRes.body && Array.isArray(recentRes.body.recent), 'Should return recent renders');
  console.log(`  ✓ retrieved ${recentRes.body.recent.length} recent studio renders`);

  // Test 7: Distribution Upcoming Timeline API (/api/distribution/upcoming)
  console.log('\nTest 7: GET /api/distribution/upcoming...');
  const upcomingRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/distribution/upcoming',
    method: 'GET'
  });
  assert.strictEqual(upcomingRes.statusCode, 200);
  assert(upcomingRes.body && Array.isArray(upcomingRes.body.upcoming), 'Should return upcoming cross-posts');
  console.log(`  ✓ retrieved upcoming fan-outs list (${upcomingRes.body.upcoming.length} scheduled)`);

  // Test 8: Bulk Page Operations API (/api/pages/bulk)
  console.log('\nTest 8: PATCH /api/pages/bulk...');
  const bulkRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pages/bulk',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    pageIds: [1],
    action: 'set_quota',
    value: 4
  });
  assert.strictEqual(bulkRes.statusCode, 200);
  assert(bulkRes.body && bulkRes.body.success, 'Bulk operation should succeed');
  const page1 = db.getPageById(1);
  assert.strictEqual(page1.daily_quota, 4, 'Page 1 daily quota should be updated to 4');
  console.log('  ✓ bulk quota update applied directly to database');

  // Test 9: Clean up test job_events
  console.log('\nTest 9: Cleanup test events...');
  db.getDb().prepare('DELETE FROM job_events WHERE id IN (?, ?)').run(event1.id, event2.id);
  console.log('  ✓ cleaned up test data');

  console.log('\n======================================================');
  console.log('🎉 ALL PIPELINE TRACKING & AGENT 3 STUDIO TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
