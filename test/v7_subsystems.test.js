const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
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

  await t.test('6. Clubbing Cult Universal Neon Green Aesthetic Template & Caption Formatting', async () => {
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

    // 2. 9:16 Vertical Cyberpunk HUD Template: Full-Scale Exact 9:16 Ratio & @clubbingcult at Top
    const vPath = await generateFeedPostOverlay('clubbingcult', {
      cardX: 126, cardY: 215, cardW: 828, cardH: 1472, isVertical: true, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(vPath), 'Vertical cyber overlay must exist');
    assert.ok(fs.statSync(vPath).size > 10000, 'Vertical cyber overlay must be valid PNG');

    // 3. 16:9 Landscape Adaptive Cyberpunk HUD Template
    const lPath = await generateFeedPostOverlay('clubbingcult', {
      cardX: 80, cardY: 701, cardW: 920, cardH: 518, isVertical: false, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(lPath), 'Landscape cyber overlay must exist');

    // 4. 1:1 Square Adaptive Cyberpunk HUD Template
    const sqPath = await generateFeedPostOverlay('clubbingcult', {
      cardX: 110, cardY: 530, cardW: 860, cardH: 860, isVertical: false, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(sqPath), 'Square cyber overlay must exist');

    // 5. Story Card Overlay
    const sPath = generateStoryOverlay('clubbingcult', {
      cardX: 72, cardY: 240, cardW: 936, cardH: 1440, theme: 'clubbing'
    });
    assert.ok(fs.existsSync(sPath), 'Story overlay must exist');

    // 6. Branded Watermark Badge
    const wmPath = generateFeedWatermark('clubbingcult', { theme: 'clubbing' });
    assert.ok(fs.existsSync(wmPath), 'Watermark badge must exist');
  });

  await t.test('7. Cloud Runner & Container Initialization Latency Optimization', () => {
    const { hasDirectCloudflared } = require('../src/core/tunnelService');
    assert.equal(typeof hasDirectCloudflared, 'function', 'hasDirectCloudflared helper must be exported');
    const directAvailable = hasDirectCloudflared();
    assert.equal(typeof directAvailable, 'boolean', 'hasDirectCloudflared must return a boolean without throwing');

    // Verify Docker & Cloud Run deployment manifests
    const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
    const dockerignorePath = path.join(__dirname, '..', '.dockerignore');
    const deployScriptPath = path.join(__dirname, '..', 'deploy-cloudrun.sh');

    assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist');
    assert.ok(fs.existsSync(dockerignorePath), '.dockerignore must exist');
    assert.ok(fs.existsSync(deployScriptPath), 'deploy-cloudrun.sh must exist');

    const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
    assert.ok(dockerContent.includes('cloudflared'), 'Dockerfile must pre-bake native cloudflared');
    assert.ok(dockerContent.includes('yt-dlp'), 'Dockerfile must pre-bake yt-dlp');
    assert.ok(dockerContent.includes('server.js'), 'Dockerfile must boot server.js');

    // Verify GitHub Actions workflows contain node_modules caching and direct cloudflared
    const repostJobPath = path.join(__dirname, '..', '.github', 'workflows', 'repost-job.yml');
    const cronJobPath = path.join(__dirname, '..', '.github', 'workflows', 'watchtower-cron.yml');

    const repostYml = fs.readFileSync(repostJobPath, 'utf8');
    assert.ok(repostYml.includes('node-cache'), 'repost-job.yml must cache node_modules');
    assert.ok(repostYml.includes('cloudflared'), 'repost-job.yml must install native cloudflared');
    assert.ok(repostYml.includes('pip-cache'), 'repost-job.yml must cache pip packages');

    const cronYml = fs.readFileSync(cronJobPath, 'utf8');
    assert.ok(cronYml.includes('node-cache'), 'watchtower-cron.yml must cache node_modules');
    assert.ok(cronYml.includes('cloudflared'), 'watchtower-cron.yml must install native cloudflared');
  });

  await t.test('8. Dedicated Cult Information Video-Essay Template & Automated Copywriting Engine', async () => {
    const { generateFeedPostOverlay, generateEvolvingAiOverlay } = require('../src/utils/ffmpegHelper');
    const { buildAiCaptionDetails, buildCaption } = require('../src/core/captionBuilder');
    const { getPageBySlug } = require('../src/database');
    const fs = require('fs');

    // 1. Verify Page Schema Seed
    const cultPage = getPageBySlug('cult_information') || getPageBySlug('ai_curation');
    assert.ok(cultPage, 'cult_information page must exist in database');
    assert.equal(cultPage.handle, '@cult_information');
    assert.equal(cultPage.name, 'Cult Information');

    // 2. Caption & Viral Hook Builder
    const rawCaption = "Nvidia announces next-gen Blackwell Ultra GPU with 288GB HBM3e memory. Follow @nvidia for more info! Link in bio. #tech #ai";
    const details = await buildAiCaptionDetails({
      rawCaption,
      sourceUsername: 'nvidia',
      page: cultPage
    });

    assert.ok(details.caption, 'Should produce video-essay caption');
    assert.ok(details.hookHeadline, 'Should generate a viral hook headline');
    assert.ok(details.caption.includes('@cult_information'), 'Should include Cult Information handle');
    assert.ok(details.caption.includes('Save this reel') || details.caption.includes('share with someone'), 'Should include save CTA');
    assert.ok(!details.caption.includes('@nvidia'), 'Zero credits: should strip competitor handle');

    // 3. Cult Information 1080x1920 Video-Essay Overlay Generation with Highlighted Words
    const overlayPath = await generateFeedPostOverlay('cult_information', {
      cardX: 0,
      cardY: 656,
      cardW: 1080,
      cardH: 608,
      isVertical: false,
      theme: 'video_essay',
      page: cultPage,
      hookHeadline: "NVIDIA Just Unveiled The World's First **1-Million-Token** Neural Supercluster"
    });

    assert.ok(fs.existsSync(overlayPath), 'Cult Information overlay file must exist');
    assert.ok(fs.statSync(overlayPath).size > 10000, 'Overlay PNG must be a valid non-empty graphic');
  });

  await t.test('9. Decimal-Safe Headline Preservation & Competitor Letterbox Detection', async () => {
    const { isLetterboxedReel } = require('../src/utils/ffmpegHelper');
    const { buildAiCaptionDetails } = require('../src/core/captionBuilder');
    const { getPageBySlug } = require('../src/database');

    const cultPage = getPageBySlug('cult_information') || { name: 'Cult Information', handle: '@cult_information' };

    // 1. Decimal number preservation in headline ($12.93 BILLION)
    const captionWithDecimals = "NVIDIA is spending $12.93 BILLION on next-generation AI hardware. Link in bio! #tech";
    const details1 = await buildAiCaptionDetails({
      rawCaption: captionWithDecimals,
      sourceUsername: 'techinsider',
      page: cultPage
    });

    assert.ok(details1.hookHeadline.includes('12.93'), 'Must preserve decimal number 12.93 and not truncate at period');
    assert.ok(!details1.hookHeadline.endsWith('$12'), 'Must not truncate at $12');

    // 2. Decimal number preservation ($1.12)
    const captionWithDecimals2 = "OpenAI slashed API inference prices down to $1.12 per million tokens. #ai";
    const details2 = await buildAiCaptionDetails({
      rawCaption: captionWithDecimals2,
      sourceUsername: 'openai',
      page: cultPage
    });

    assert.ok(details2.hookHeadline.includes('1.12'), 'Must preserve decimal number 1.12 and not truncate at period');
    assert.ok(!details2.hookHeadline.endsWith('$1'), 'Must not truncate at $1');

    // 3. Auto-highlighting formatting
    assert.ok(details1.hookHeadline.includes('**'), 'Hook headline should contain highlighted keywords with **');

    // 4. Competitor Letterbox Detection Export
    assert.equal(typeof isLetterboxedReel, 'function', 'isLetterboxedReel must be an exported function');
  });
});
