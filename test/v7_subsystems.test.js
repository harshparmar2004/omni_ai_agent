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

  await t.test('10. Video Vision Service & On-Screen Reel OCR Subsystem', async () => {
    const { extractSnapshotFrame, detectOnScreenHeadline } = require('../src/core/videoVisionService');
    const { generateFeedPostOverlay } = require('../src/utils/ffmpegHelper');
    const fs = require('fs');

    assert.equal(typeof extractSnapshotFrame, 'function', 'extractSnapshotFrame must be exported');
    assert.equal(typeof detectOnScreenHeadline, 'function', 'detectOnScreenHeadline must be exported');

    // Handle missing or invalid video path safely
    const missingRes = await detectOnScreenHeadline('/non/existent/video.mp4');
    assert.equal(missingRes.found, false);
    assert.equal(missingRes.reason, 'file_not_found');

    // Verify 740px deep blackout overlay generation for competitor text elimination
    const deepOverlay = await generateFeedPostOverlay('cult_information', {
      cardX: 0,
      cardY: 740,
      cardW: 1080,
      cardH: 680,
      isVertical: true,
      theme: 'video_essay',
      hookHeadline: "Scientists Made The First **Living Thing** Built For **Mars**"
    });

    assert.ok(fs.existsSync(deepOverlay), 'Deep blackout overlay file must exist');
    assert.ok(fs.statSync(deepOverlay).size > 10000, 'Deep blackout overlay must be non-empty PNG');
  });

  await t.test('11. Deterministic Active Video Auto-Cropper & Competitor Text Elimination', async () => {
    const { detectActiveVideoBounds, generateEvolvingAiOverlay } = require('../src/utils/ffmpegHelper');
    const { createCanvas } = require('@napi-rs/canvas');
    const fs = require('fs');

    assert.equal(typeof detectActiveVideoBounds, 'function', 'detectActiveVideoBounds must be an exported function');

    // 1. Safe handling on missing file
    const safeRes = await detectActiveVideoBounds('/non/existent/video.mp4');
    assert.equal(safeRes.isLetterboxed, false);
    assert.equal(safeRes.startY, 0);

    // 2. Synthetic letterboxed video test frame (1080x1920 with 16:9 video at Y=656 to 1264 and text lines at Y=230)
    const testCanvas = createCanvas(1080, 1920);
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1080, 1920);

    // Floating text span (simulating competitor title: 20px high)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(100, 230, 400, 20);

    // Active video footage span (simulating 16:9 video: 608px high, rich brightness and colors)
    ctx.fillStyle = '#4488AA';
    ctx.fillRect(0, 656, 1080, 608);

    const tmpFrame = path.join(__dirname, 'temp_test_letterbox_frame.png');
    fs.writeFileSync(tmpFrame, testCanvas.toBuffer('image/png'));

    try {
      const bounds = await detectActiveVideoBounds(tmpFrame);
      assert.equal(bounds.isLetterboxed, true, 'Must detect letterboxing');
      assert.ok(bounds.height >= 550 && bounds.height <= 650, `Detected video height should be ~608px, got ${bounds.height}`);
      assert.ok(bounds.startY >= 640 && bounds.startY <= 670, `Detected startY should be ~656px, got ${bounds.startY}`);
      // Assert that the floating text at Y=230 was completely excluded from the video bounds!
      assert.ok(bounds.startY > 300, 'Floating text at Y=230 must be excluded from active video bounds');
    } finally {
      if (fs.existsSync(tmpFrame)) fs.unlinkSync(tmpFrame);
    }
  });

  await t.test('12. Dynamic Cult Electric Lime Color Highlighting Across Short & Long Reel Headlines', () => {
    const { parseHeadlineTokens } = require('../src/utils/ffmpegHelper');

    // 1. Low word count (5 words): must highlight 2 words (~40%)
    const shortHeadline = 'Brain Chips Are Now Reality';
    const shortTokens = parseHeadlineTokens(shortHeadline);
    const shortHighlights = shortTokens.filter(t => t.highlight);
    assert.equal(shortHighlights.length, 2, '5-word headline must have 2 words highlighted in Cult color theme');

    // 2. Medium word count (7 words): must highlight 3 words (~43%)
    const medHeadline = 'Mystery Of The 2000-Year-Old Greek Computer Solved';
    const medTokens = parseHeadlineTokens(medHeadline);
    const medHighlights = medTokens.filter(t => t.highlight);
    assert.equal(medHighlights.length, 3, '7-word headline must have 3 words highlighted in Cult color theme');

    // 3. Standard headline with explicit markup but only 1 highlighted word: must augment to 4 words (~36%)
    const singleMarked = 'These Robotic Arms Are powered by **Algae**. Watch How They Move';
    const singleTokens = parseHeadlineTokens(singleMarked);
    const singleHighlights = singleTokens.filter(t => t.highlight);
    assert.equal(singleHighlights.length, 4, '11-word headline must augment to 4 words highlighted in Cult color theme');
    assert.ok(singleHighlights.some(t => t.text.includes('Algae')), 'Must preserve original highlighted word');
    assert.ok(singleHighlights.some(t => t.text.includes('Robotic')), 'Must augment with high-impact keyword Robotic');

    // 4. Long headline (17 words): must highlight 6 words in Cult color theme
    const longHeadline = 'China Built The World\'s First AI Hospital Town Where Patients Are Treated By Robots In Real Time';
    const longTokens = parseHeadlineTokens(longHeadline);
    const longHighlights = longTokens.filter(t => t.highlight);
    assert.equal(longHighlights.length, 6, '17-word headline must highlight 6 words in Cult color theme');

    // 5. No consecutive 3-word highlight run (max run <= 2) to maintain typography aesthetics
    for (let i = 0; i < longTokens.length - 2; i++) {
      const threeInARow = longTokens[i].highlight && longTokens[i + 1].highlight && longTokens[i + 2].highlight;
      assert.ok(!threeInARow, 'Must never create 3 consecutive highlighted words in a row');
    }
  });

  await t.test('13. Foolproof Headline Asterisk Elimination & Tabular Spec Sheet Debris Rejection', () => {
    const { parseHeadlineTokens } = require('../src/utils/ffmpegHelper');

    // 1. Problem string from screenshot: glued asterisks and quad stars must NEVER leak into token text
    const problemInput = 'Claude Fable **5.2** Claude Opus **5.5** **$81.10** **1** hs**56m****52s** **$45.97** **3** h **11m** **26s**';
    const tokens = parseHeadlineTokens(problemInput);

    // Assert that NO token contains any asterisk characters
    for (const token of tokens) {
      assert.ok(!token.text.includes('*'), `Token "${token.text}" must NOT contain any asterisks`);
      assert.ok(token.text.length > 0, 'Token text must not be empty');
    }

    // 2. Assert that hs, 56m, and 52s are separated into clean individual tokens
    const tokenTexts = tokens.map(t => t.text);
    assert.ok(tokenTexts.includes('hs'), 'Must extract hs as separate token');
    assert.ok(tokenTexts.includes('56m'), 'Must extract 56m as separate token');
    assert.ok(tokenTexts.includes('52s'), 'Must extract 52s as separate token');

    // 3. Stray asterisks or triple stars
    const strayInput = '***Breaking News*** with stray ** asterisks * everywhere';
    const strayTokens = parseHeadlineTokens(strayInput);
    for (const token of strayTokens) {
      assert.ok(!token.text.includes('*'), `Stray token "${token.text}" must not contain any asterisks`);
    }
  });

  await t.test('14. Zero-Click Instant Autonomous Cloud Dispatch & Target Resolver', () => {
    const { resolveAutoTargetPage } = require('../api/telegram-webhook');

    // 1. Plain Instagram URL with no text -> defaults to Page 4 (@cult_information)
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/DEb9X7oTq12/'), '4', 'Plain URL must default to Cult Information (Page 4)');

    // 2. Movie/cinema keywords in shared text -> routes to Page 2 (@movie_series_365)
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ Check out this new Netflix movie trailer!'), '2');
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ Best scene in cinema history'), '2');
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ New sci-fi series review'), '2');
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ page:2'), '2');

    // 3. Gaming/GTA keywords -> routes to Page 1
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ GTA 6 gameplay leak'), '1');

    // 4. Clubbing/party keywords -> routes to Page 3
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ Underground techno rave festival'), '3');

    // 5. Tech/AI/general cult content -> routes to Page 4
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ Why humans created language 50000 years ago'), '4');
    assert.equal(resolveAutoTargetPage('https://www.instagram.com/reel/123/ Neuralink breakthrough in robotics'), '4');
  });

  await t.test('15. Extended Meta Container Polling & Audible Lock-Screen Notifications', () => {
    const publisherCode = fs.readFileSync(path.join(__dirname, '../src/core/publisher.js'), 'utf8');
    const jobWorkerCode = fs.readFileSync(path.join(__dirname, '../src/core/jobWorker.js'), 'utf8');
    const repostSingleCode = fs.readFileSync(path.join(__dirname, '../scripts/repost_single.js'), 'utf8');

    // 1. Extended Container Polling to 80 attempts (~180s)
    assert.ok(publisherCode.includes('maxAttempts = 80'), 'Meta container polling must support up to 80 attempts');
    assert.ok(publisherCode.includes('delay = attempts < 5 ? 1500 : (attempts < 25 ? 2000 : 3000)'), 'Tiered delay backoff must be implemented');

    // 2. Audible notification with disable_notification: false on live publish
    assert.ok(jobWorkerCode.includes('disable_notification: false'), 'jobWorker must trigger audible notification with disable_notification: false');
    assert.ok(repostSingleCode.includes('disable_notification: false'), 'repost_single must trigger audible notification with disable_notification: false');
    assert.ok(jobWorkerCode.includes('REEL IS LIVE ON INSTAGRAM'), 'jobWorker must broadcast high-visibility LIVE confirmation');
    assert.ok(repostSingleCode.includes('REEL IS LIVE ON INSTAGRAM'), 'repost_single must broadcast high-visibility LIVE confirmation');
  });
});


