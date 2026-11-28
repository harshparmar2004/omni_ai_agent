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

  await t.test('14. Interactive Destination Page Selection Keyboard & Callback Routing', async () => {
    const handler = require('../api/telegram-webhook');
    const { buildPageSelectionKeyboard, getPagesList } = handler;

    const pages = await getPagesList();
    const shortcode = 'TEST_SHORTCODE_123';
    const keyboard = buildPageSelectionKeyboard(shortcode, pages);

    // 1. Must generate a 2-column grid of target pages plus a cancel button
    assert.ok(Array.isArray(keyboard), 'Keyboard must be an array of rows');
    assert.ok(keyboard.length >= 3, 'Must have at least 2 rows of pages plus 1 cancel row');

    // Flatten buttons
    const allButtons = keyboard.flat();
    assert.ok(allButtons.some(b => b.text.includes('Cult Information') && b.callback_data === `post:4:${shortcode}`), 'Cult Information button must exist');
    assert.ok(allButtons.some(b => b.text.includes('Movie Series 365') && b.callback_data === `post:2:${shortcode}`), 'Movie Series 365 button must exist');
    assert.ok(allButtons.some(b => b.text.includes('GTA 6') && b.callback_data === `post:1:${shortcode}`), 'GTA 6 button must exist');
    assert.ok(allButtons.some(b => b.text.includes('Clubbing Cult') && b.callback_data === `post:3:${shortcode}`), 'Clubbing Cult button must exist');
    assert.ok(allButtons.some(b => b.text.includes('Cancel') && b.callback_data === `cancel:${shortcode}`), 'Cancel button must exist');

    // 2. Inbound reel link without explicit page MUST prompt for page selection, not auto-dispatch to page 4
    let jsonResult = null;
    let statusCode = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return {
          json(payload) {
            jsonResult = payload;
            return payload;
          }
        };
      }
    };
    const mockReq = {
      method: 'POST',
      body: {
        update_id: 99999,
        message: {
          message_id: 1234,
          chat: { id: 5443723531 },
          from: { id: 5443723531, username: 'testuser' },
          text: 'https://www.instagram.com/reel/DgFnrysA-Uk/'
        }
      }
    };
    await handler(mockReq, mockRes);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult?.ok, true);
    assert.strictEqual(jsonResult?.prompt_page_selection, true, 'Must prompt for page selection when reel link is sent');
    assert.strictEqual(jsonResult?.shortcode, 'DgFnrysA-Uk');
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

  await t.test('16. Pipeline Acceleration: Downloader Bypass, Workflow Slimming & Parallel Story Pipeline', () => {
    const downloaderCode = fs.readFileSync(path.join(__dirname, '../src/core/downloader.js'), 'utf8');
    const workflowCode = fs.readFileSync(path.join(__dirname, '../.github/workflows/repost-job.yml'), 'utf8');
    const jobWorkerCode = fs.readFileSync(path.join(__dirname, '../src/core/jobWorker.js'), 'utf8');

    // 1. Downloader fast path bypasses redundant initial transcode
    assert.ok(downloaderCode.includes('Skipping redundant pre-transcode pass'), 'Downloader must skip redundant pre-transcode pass for video reels');

    // 2. Workflow slims pip install to fast packages only (yt-dlp requests)
    assert.ok(workflowCode.includes('pip install --quiet --prefer-binary --no-compile yt-dlp requests'), 'Workflow must only install lightweight stream downloader');
    assert.ok(!workflowCode.includes('yt-dlp requests playwright'), 'Workflow must NOT block on heavy Playwright installation');

    // 3. Companion Story publishing runs concurrently with Feed Reel
    assert.ok(jobWorkerCode.includes('storyPromise = publishStory'), 'jobWorker must launch story pipeline in parallel');
    assert.ok(jobWorkerCode.includes('Pipelined Story publish launched concurrently'), 'jobWorker must log pipelined story launch');

    // 4. Zero-Latency OCR Memoization & Direct Hook Passthrough
    const visionServiceCode = fs.readFileSync(path.join(__dirname, '../src/core/videoVisionService.js'), 'utf8');
    const llmServiceCode = fs.readFileSync(path.join(__dirname, '../src/core/llmService.js'), 'utf8');
    const ffmpegCode = fs.readFileSync(path.join(__dirname, '../src/utils/ffmpegHelper.js'), 'utf8');
    const repostSingleCode = fs.readFileSync(path.join(__dirname, '../scripts/repost_single.js'), 'utf8');

    assert.ok(visionServiceCode.includes('_visionCache'), 'videoVisionService must maintain in-memory memoization cache');
    assert.ok(llmServiceCode.includes('if (hookHeadline)'), 'llmService must bypass repeat vision OCR if hookHeadline is already provided');
    assert.ok(jobWorkerCode.includes('hookHeadline'), 'jobWorker must pass hookHeadline directly to buildAiCaptionDetails');

    // 5. High-Speed Encoding: Removal of CPU-heavy dynaudnorm and addition of fastdecode tune
    assert.ok(!ffmpegCode.includes('dynaudnorm'), 'ffmpegHelper must eliminate CPU-choking dynaudnorm audio filter');
    assert.ok(ffmpegCode.includes("'-tune', 'fastdecode'"), 'ffmpegHelper must enable fastdecode tuning');

    // 6. Parallel Tunnel Launch and Link Submission
    assert.ok(repostSingleCode.includes('Promise.all'), 'repost_single must launch tunnel and ingest in parallel');
  });

  await t.test('17. High-Fidelity Reel Headline OCR & Complete Word Preservation Subsystem', () => {
    const cvScript = fs.readFileSync(path.join(__dirname, '../src/utils/opencvTextDetector.py'), 'utf8');
    const visionServiceCode = fs.readFileSync(path.join(__dirname, '../src/core/videoVisionService.js'), 'utf8');
    const { parseHeadlineTokens } = require('../src/utils/ffmpegHelper');

    // 1. OpenCV Contour Bounding Box & Sample Timestamp Fidelity
    assert.ok(cvScript.includes('w > width * 0.12'), 'OpenCV detector must allow single-word / narrow headline lines (w > width * 0.12)');
    assert.ok(cvScript.includes('aspect > 0.75'), 'OpenCV detector must allow square and stacked text lines (aspect > 0.75)');
    assert.ok(cvScript.includes('sample_timestamps = [0.5, 0.8, 1.2, 1.6, 2.0]'), 'OpenCV detector must sample across 5 intro frames up to 2.0s');
    assert.ok(cvScript.includes('clahe_roi = cv2.createCLAHE'), 'OpenCV detector must use CLAHE enhanced grayscale for high-contrast OCR');

    // 2. Vision Service Zero-Word-Loss Filters
    assert.ok(!visionServiceCode.includes('^[a-zA-Z0-9]{1,3}\\s+(?=[A-Z])'), 'Vision service must NEVER strip 1-3 letter starting words (Why, How, The, AI)');
    assert.ok(!visionServiceCode.includes('currentWordCount >= 11'), 'Vision service must NOT truncate headlines prematurely at 11 words');
    assert.ok(visionServiceCode.includes('isAlreadyRoi'), 'localOcrHeadlineDetection must preserve full height of pre-isolated ROI images');
    assert.ok(visionServiceCode.includes('{ isRoi: true }'), 'detectOnScreenHeadline must signal isRoi: true for OpenCV crops');

    // 3. Verbatim Multi-Line Headline Word Preservation Simulation
    const fullViralHeadline = "Why China Built The World's First AI Hospital Town Where Patients Are Treated By Robots In Real Time";
    const words = fullViralHeadline.split(/\s+/);
    assert.equal(words.length, 18, 'Headline must have 18 words');
    assert.equal(words[0], 'Why', 'First word must be "Why"');
    assert.equal(words[words.length - 1], 'Time', 'Last word must be "Time"');

    // Verify tokenization retains every single word without truncation
    const tokens = parseHeadlineTokens(fullViralHeadline);
    const tokenWords = tokens.flatMap(t => t.text.split(/\s+/)).filter(Boolean);
    assert.equal(tokenWords.length, 18, 'All 18 words must be tokenized without loss');
    assert.equal(tokenWords[0], 'Why', 'First token must be "Why"');
    assert.equal(tokenWords[tokenWords.length - 1], 'Time', 'Last token must be "Time"');
  });

  await t.test('18. Authentic Multi-Ratio GTA 6 Story Template & Passthrough Subsystem', () => {
    const { computeStoryCardGeometry, generateStoryOverlay } = require('../src/utils/ffmpegHelper');
    const jobWorkerCode = fs.readFileSync(path.join(__dirname, '../src/core/jobWorker.js'), 'utf8');
    const ffmpegHelperCode = fs.readFileSync(path.join(__dirname, '../src/utils/ffmpegHelper.js'), 'utf8');

    // 1. Multi-Ratio Geometry Responsiveness
    const g16x9 = computeStoryCardGeometry(1920, 1080);
    assert.equal(g16x9.cardW, 1032, '16:9 card width must be 1032px');
    assert.equal(g16x9.cardH, 580, '16:9 card height must be 580px');
    assert.equal(g16x9.cardX, 24, '16:9 card X must be centered at 24px');
    assert.equal(g16x9.cardY, 670, '16:9 card Y must be centered at 670px');

    const g1x1 = computeStoryCardGeometry(1080, 1080);
    assert.equal(g1x1.cardW, 1000, '1:1 card width must be 1000px');
    assert.equal(g1x1.cardH, 1000, '1:1 card height must be 1000px');

    const g9x16 = computeStoryCardGeometry(1080, 1920);
    assert.equal(g9x16.cardW, 860, '9:16 card width must be 860px');
    assert.equal(g9x16.cardH, 1528, '9:16 card height must be 1528px');

    // 2. Story Overlay Generation with GTA 6 Signature Elements
    const gtaOverlay = generateStoryOverlay('gta6_updates_007', {
      inputWidth: 1920,
      inputHeight: 1080,
      theme: 'gta6',
      page: { slug: 'gta6', name: 'GTA 6 Updates 007' }
    });
    assert.ok(fs.existsSync(gtaOverlay), 'GTA 6 Story Overlay file must exist');

    // 3. Story Video Feed Passthrough in jobWorker
    assert.ok(
      jobWorkerCode.includes("storyVideoInput = feedVideoPath || processedMediaPaths[0] || mediaPaths[0]"),
      'jobWorker must pass edited feedVideoPath to publishStory'
    );

    // 4. Zero Distortion Aspect Ratio Fitting in prepareVideoForStory
    assert.ok(
      ffmpegHelperCode.includes('force_original_aspect_ratio=increase,crop=${geom.cardW}:${geom.cardH}[card]'),
      'prepareVideoForStory must use force_original_aspect_ratio=increase,crop to prevent video stretching'
    );
  });

  await t.test('19. Social Media Header & Logo Purging for Clean On-Screen Headline Detection', async () => {
    const { detectOnScreenHeadline, extractHeadlineBlocksFromOcr, isCompetitorAccountName } = require('../src/core/videoVisionService');

    // 1. Rigorous competitor account name purging validation
    assert.ok(isCompetitorAccountName('theaifocus'), 'theaifocus must be detected as competitor account');
    assert.ok(isCompetitorAccountName('@theaifocus'), '@theaifocus must be detected as competitor account');
    assert.ok(isCompetitorAccountName('The AI Focus'), 'The AI Focus must be detected as competitor account');
    assert.ok(isCompetitorAccountName('evolving.ai'), 'evolving.ai must be detected as competitor account');
    assert.ok(!isCompetitorAccountName('AI Just Designed A Real Rocket Engine'), 'Editorial headline must NOT be flagged as competitor account');
    assert.ok(!isCompetitorAccountName('Jensen Huang returns into office'), 'Editorial headline must NOT be flagged as competitor account');

    // 2. OCR text block purging with competitor logo, handle, and headline
    const sampleOcr = "(CO) rain\n\n@theaifocus\nAl Just Designed A Real Rocket Engine\nFrom Scratch With Zero Human Engineers";
    const blocks = extractHeadlineBlocksFromOcr(sampleOcr);
    assert.equal(blocks.length, 1, 'Only genuine headline block must be extracted');
    assert.ok(blocks[0].includes('AI Just Designed A Real Rocket Engine'), 'Headline must be isolated');
    assert.ok(blocks[0].includes('Zero Human Engineers'), 'Headline must be complete');
    assert.ok(!/theaifocus/i.test(blocks[0]), 'Competitor name must be completely purged');
    assert.ok(!/@/.test(blocks[0]), 'Competitor handle must be purged');

    // 3. Live image inspection on uploaded reel frame
    const userUploadedImg = 'C:/Users/harsh parmar/.gemini/antigravity/brain/b0ce8539-8cbf-49fc-a919-749c1c07e5af/.user_uploaded/media_1795848025362_3ebe3f12.jpg';
    if (fs.existsSync(userUploadedImg)) {
      const imgRes = await detectOnScreenHeadline(userUploadedImg, { forceFresh: true });
      assert.ok(imgRes.found, 'Must find headline in uploaded frame');
      assert.ok(imgRes.rawTitle.includes('AI Just Designed A Real Rocket Engine'), 'Must extract Rocket Engine headline');
      assert.ok(imgRes.rawTitle.includes('Zero Human Engineers'), 'Must preserve full headline');
      assert.ok(!/theaifocus/i.test(imgRes.headline), 'Must NOT contain theaifocus');
      assert.ok(!/@/.test(imgRes.headline), 'Must NOT contain @handle');
      assert.ok(imgRes.headline.includes('**'), 'Must contain Cult brand highlights');
    }

    const videoPath = 'public/generated/downloads/reel_DgFnrysA-Uk.mp4';
    if (fs.existsSync(videoPath)) {
      const result = await detectOnScreenHeadline(videoPath, { forceFresh: true });
      assert.ok(result.found, 'Headline hook must be detected');
      assert.ok(!/evolving/i.test(result.headline), 'Competitor logo/account name must NOT appear in headline');
      assert.ok(!/@/.test(result.headline), 'Competitor handles must NOT appear in headline');
      assert.ok(!/k\.\s*red/i.test(result.headline), 'Random UI debris must NOT appear in headline');
      assert.ok(result.rawTitle.includes('Jensen Huang'), 'rawTitle must contain Jensen Huang');
      assert.ok(result.rawTitle.includes('returns into office'), 'rawTitle must contain returns into office');
      assert.ok(result.headline.includes('**'), 'headline must contain brand highlights');
    }
  });

  await t.test('20. Dynamic Single-Line Auto-Fitting & Anti-Orphan Layout Engine', async () => {
    const { generateEvolvingAiOverlay } = require('../src/utils/ffmpegHelper');
    const overlayPath = await generateEvolvingAiOverlay('cult_information', {
      hookHeadline: '**Jensen** Huang as he **returns** into **office**',
      cardX: 0,
      cardY: 640,
      cardW: 1080,
      cardH: 608
    });
    assert.ok(fs.existsSync(overlayPath), 'Overlay PNG must exist');

    // Test anti-orphan wrapping rule
    const { wrapTokens } = require('../src/utils/ffmpegHelper');
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(1080, 1920);
    const ctx = canvas.getContext('2d');
    ctx.font = '800 48px Arial';
    // Construct tokens where last word would greedily orphan
    const sampleTokens = [
      { text: 'Artificial' }, { text: 'Intelligence' }, { text: 'is' },
      { text: 'rapidly' }, { text: 'reshaping' }, { text: 'our' }, { text: 'entire' }, { text: 'future' }
    ];
    const wrapped = wrapTokens(ctx, sampleTokens, 600);
    if (wrapped.length > 1) {
      const lastLine = wrapped[wrapped.length - 1];
      assert.ok(lastLine.length >= 2, 'Anti-orphan rule must guarantee at least 2 words on final line');
    }
  });
});



