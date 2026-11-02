const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { getDb, getPages, getSourceAccounts, listPublishJobs, getSetting } = require('../src/database');
const { buildCaption, cleanRawCaption, extractHashtags } = require('../src/core/captionBuilder');
const { enqueueJob, getJob, listJobs, updateJobProgress, deleteJob } = require('../src/core/jobQueue');
const { maskToken } = require('../src/core/tokenManager');
const { evaluateAndSelectPosts } = require('../src/agents/watchtower/selector');

test('OmniStudio v7 Subsystems Test Suite', async (t) => {
  await t.test('1. Database v7 Schema Integrity', () => {
    const db = getDb();
    assert.ok(db, 'Database should be initialized');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const expectedTables = ['pages', 'source_accounts', 'discovered_posts', 'publish_jobs', 'agent_runs', 'settings'];
    for (const tbl of expectedTables) {
      assert.ok(tables.includes(tbl), `Table ${tbl} should exist in v7 schema`);
    }

    const pages = getPages();
    assert.ok(Array.isArray(pages), 'getPages should return an array');
    assert.ok(pages.length > 0, 'Should have at least 1 migrated target page');
    const primary = pages.find(p => p.slug === 'gta6' || p.username === 'gta6_updates_007');
    assert.ok(primary, 'Primary target page @gta6_updates_007 must exist');

    const sources = getSourceAccounts();
    assert.ok(Array.isArray(sources), 'getSourceAccounts should return an array');
  });

  await t.test('2. Core Caption Builder & Attribution Sanitization', () => {
    const rawCaption = "🔥 GTA 6 Trailer Breakdown! Link in bio for full video!! Comment LINK below to get the secret doc! DM me NOW! #gta6 #gaming #gta6";
    const built = buildCaption({
      rawCaption,
      sourceUsername: 'rockstargames',
      page: {
        attribution_enabled: 1,
        slug: 'gta6',
        handle: '@gta6_updates_007',
        default_hashtags: '#rockstargames #gtavi'
      }
    });

    assert.ok(built, 'Should generate caption');
    assert.ok(!built.includes('@rockstargames'), 'Zero Credits Rule: Should not include external attribution');
    assert.ok(!built.toLowerCase().includes('comment link'), 'Should strip spam comment CTA');
    assert.ok(!built.toLowerCase().includes('dm me now'), 'Should strip spam DM CTA');
    assert.ok(built.includes('#gta6'), 'Should preserve relevant hashtags');
    assert.ok(built.includes('#rockstargames'), 'Should append page default hashtags');
    assert.ok(built.length <= 2200, 'Must not exceed Meta 2200 char limit');
  });

  await t.test('3. Core Token Manager Security & Masking', () => {
    const sampleToken = 'IGAAYJvfGkRZCRBZAFpwOTN2ZAE8abcdef';
    const masked = maskToken(sampleToken);
    assert.ok(masked.startsWith('IGAA...'), 'Should mask token securely with prefix');
    assert.ok(masked.endsWith('cdef'), 'Should preserve last 4 chars');
    assert.ok(!masked.includes('OTN2ZAE8'), 'Must hide internal secret characters');
    assert.equal(maskToken(''), '');
  });

  await t.test('4. Watchtower Selector Functionality', async () => {
    assert.equal(typeof evaluateAndSelectPosts, 'function', 'evaluateAndSelectPosts must be an exported function');
  });

  await t.test('5. Shared Publishing Core Job Queue Operations', async () => {
    const testShortcode = 'TEST_SC_' + Date.now();
    const enqueueRes = await enqueueJob({
      agent: 'reposter',
      pageId: 1,
      shortcode: testShortcode,
      sourceUrl: `https://www.instagram.com/reel/${testShortcode}/`,
      caption: 'Unit Test Reel #test',
      status: 'pending_review'
    });

    assert.ok(enqueueRes.job?.id, 'Should return enqueued job id');
    const jobId = enqueueRes.job.id;

    const retrieved = getJob(jobId);
    assert.equal(retrieved.shortcode, testShortcode);
    assert.equal(retrieved.status, 'pending_review');

    // Update progress
    updateJobProgress(jobId, 'queued', 'approved');
    const updated = getJob(jobId);
    assert.equal(updated.status, 'queued');
    assert.equal(updated.current_step, 'approved');

    // Clean up test job
    deleteJob(jobId);
    assert.equal(getJob(jobId), undefined);
  });

  await t.test('6. Clubbing Cult Universal Neon Green Aesthetic Template & Caption Formatting', () => {
    const { generateFeedPostOverlay, generateStoryOverlay, generateFeedWatermark } = require('../src/utils/ffmpegHelper');
    const fs = require('fs');

    // 1. Caption Builder
    const rawCaption = "Wildest festival drop ever at Tomorrowland! Follow @tomorrowland for more! Comment TRACK for link. #rave #edm";
    const built = buildCaption({
      rawCaption,
      sourceUsername: 'tomorrowland',
      page: {
        id: 3,
        slug: 'clubbing',
        name: 'Clubbing Cult',
        handle: '@clubbingcult'
      }
    });

    assert.ok(built.includes('@clubbingcult'), 'Should include Clubbing Cult handle');
    assert.ok(built.includes('Rate this track/set'), 'Should include clubbing engagement prompt');
    assert.ok(built.includes('party crew'), 'Should include clubbing save CTA');
    assert.ok(built.includes('#clubbing'), 'Should include #clubbing hashtag');
    assert.ok(!built.includes('@tomorrowland'), 'Should strip competitor mention');

    // 2. 9:16 Vertical Template
    const vPath = generateFeedPostOverlay('clubbingcult', {
      cardX: 24, cardY: 24, cardW: 1032, cardH: 1872, isVertical: true, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(vPath), 'Vertical overlay must exist');
    assert.ok(fs.statSync(vPath).size > 10000, 'Vertical overlay must be valid PNG');

    // 3. 16:9 Landscape Adaptive Template
    const lPath = generateFeedPostOverlay('clubbingcult', {
      cardX: 24, cardY: 670, cardW: 1032, cardH: 580, isVertical: false, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(lPath), 'Landscape overlay must exist');

    // 4. Story Card Overlay
    const sPath = generateStoryOverlay('clubbingcult', {
      cardX: 72, cardY: 240, cardW: 936, cardH: 1440, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(sPath), 'Story overlay must exist');

    // 5. Branded Watermark Badge
    const wmPath = generateFeedWatermark('clubbingcult', { theme: 'clubbing' });
    assert.ok(fs.existsSync(wmPath), 'Watermark badge must exist');
  });
});
