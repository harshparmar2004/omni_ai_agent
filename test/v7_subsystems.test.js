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

  await t.test('6. Video Branding & Interactive Template Studio API', async () => {
    const app = require('../api/index');
    const http = require('http');
    const server = http.createServer(app);

    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Fetch template configs
      const getRes = await fetch(`${baseUrl}/api/reposter/templates?pageId=1`);
      assert.equal(getRes.status, 200);
      const tmpl = await getRes.json();
      assert.ok(tmpl.accent_color, 'Should have accent color');
      assert.ok(tmpl.aspect_ratio_mode, 'Should have aspect ratio mode');
      assert.equal(tmpl.brand_logo_icon, '🎮', 'Page 1 should have gaming icon');

      // 2. Upload Figma PNG Base64
      // 1x1 transparent PNG base64:
      const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const uploadRes = await fetch(`${baseUrl}/api/reposter/templates/upload-figma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: samplePngBase64,
          page_id: 1
        })
      });
      assert.equal(uploadRes.status, 200);
      const uploadData = await uploadRes.json();
      assert.equal(uploadData.success, true);
      assert.ok(uploadData.url.endsWith('.png'), 'Should return PNG URL');
      assert.equal(uploadData.config.template_type, 'figma');

      // 3. Apply Template with dynamic aspect ratio and logo
      const applyRes = await fetch(`${baseUrl}/api/reposter/jobs/18111603524617292/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: 1,
          aspect_ratio_mode: '16:9',
          brand_logo_icon: '⚡',
          header_text: '@gta6_updates_007 | 4K Leak',
          accent_color: '#00F0FF'
        })
      });
      assert.equal(applyRes.status, 200);
      const applyData = await applyRes.json();
      assert.equal(applyData.success, true);
      assert.equal(applyData.template.aspect_ratio_mode, '16:9');
      assert.equal(applyData.template.brand_logo_icon, '⚡');
    } finally {
      server.close();
    }
  });
});

