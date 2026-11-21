const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

test('🍒 AI Influencer Cherry - Component 1: Configuration & Database Registration', async (t) => {
  // 1. Verify config/pages.json entry
  const pagesConfigPath = path.join(__dirname, '..', 'config', 'pages.json');
  assert.ok(fs.existsSync(pagesConfigPath), 'config/pages.json must exist');
  const pages = JSON.parse(fs.readFileSync(pagesConfigPath, 'utf8'));
  const cherryConfig = pages.find(p => p.slug === 'cherry');
  assert.ok(cherryConfig, 'Cherry page must be registered in config/pages.json');
  assert.equal(cherryConfig.id, '5');
  assert.equal(cherryConfig.handle, '@cherry_official');
  assert.equal(cherryConfig.icon, '🍒');
  assert.equal(cherryConfig.page_type, 'ai_influencer');
  assert.equal(cherryConfig.influencer_profile_id, 'cherry');
  assert.equal(cherryConfig.is_ai_influencer, 1);

  // 2. Verify Database initialization seeds Cherry
  const { getPageBySlug, getDb } = require('../src/database');
  const dbPage = getPageBySlug('cherry');
  assert.ok(dbPage, 'Database must have seeded cherry page row');
  assert.equal(dbPage.slug, 'cherry');
  assert.equal(dbPage.name, 'Cherry');
  assert.equal(dbPage.handle, '@cherry_official');
  assert.equal(dbPage.page_type, 'ai_influencer');
  assert.equal(dbPage.influencer_profile_id, 'cherry');
  assert.equal(dbPage.is_ai_influencer, 1);
});

test('🍒 AI Influencer Cherry - Component 2: Character Bible & Wan 3.0 Standard Config', async (t) => {
  const { loadInfluencerProfile } = require('../src/core/aiInfluencerService');

  // Load by slug
  const profileBySlug = loadInfluencerProfile('cherry');
  assert.ok(profileBySlug, 'Profile must load for slug "cherry"');
  assert.equal(profileBySlug.id, 'cherry');
  assert.equal(profileBySlug.name, 'Cherry');
  assert.equal(profileBySlug.handle, '@cherry_official');
  assert.equal(profileBySlug.age, 21);

  // Verify Alibaba Wan 3.0 Standard settings & 7-Second Budget Guard
  assert.equal(profileBySlug.provider, 'alibaba_wan');
  assert.equal(profileBySlug.wan_settings?.model, 'wan3.0-video', 'Must use discounted wan3.0-video standard model');
  assert.equal(profileBySlug.wan_settings?.backend, 'dashscope', 'Must use direct Alibaba Cloud DashScope backend');
  assert.equal(profileBySlug.wan_settings?.resolution, '720p', 'Must lock in 720p standard tier');
  assert.equal(profileBySlug.wan_settings?.aspect_ratio, '9:16');
  assert.equal(profileBySlug.wan_settings?.max_duration_seconds, 7, 'Must enforce 7-second viral hook budget guard');
  assert.equal(profileBySlug.wan_settings?.enable_audio, true, 'Audio generation must be enabled');

  // Load by handle variant
  const profileByHandle = loadInfluencerProfile('cherry_official');
  assert.equal(profileByHandle.id, 'cherry');

  // Verify asset directory setup
  const assetReadme = path.join(__dirname, '..', 'public', 'influencers', 'cherry', 'README.md');
  assert.ok(fs.existsSync(assetReadme), 'Cherry asset README must exist');
});

test('🍒 AI Influencer Cherry - Component 3: Telegram Bot Dedicated Button & Routing', async (t) => {
  const telegramBotPath = path.join(__dirname, '..', 'src', 'agents', 'reposter', 'telegramBot.js');
  const botCode = fs.readFileSync(telegramBotPath, 'utf8');

  // Test getPageIcon and sortPages via regex / logic
  assert.match(botCode, /slug === 'cherry' \|\| handle\.includes\('cherry'\) \|\| page\.is_ai_influencer.*return '🍒'/, 'getPageIcon must return 🍒 for Cherry');
  assert.match(botCode, /const order = \['cherry', 'cult_information'/, 'sortPages must place cherry at top');

  // Verify Webhook Fallback & Auto-Router in api/telegram-webhook.js
  const webhookPath = path.join(__dirname, '..', 'api', 'telegram-webhook.js');
  const webhookCode = fs.readFileSync(webhookPath, 'utf8');
  assert.match(webhookCode, /id: '5', slug: 'cherry', name: 'Cherry', handle: '@cherry_official', icon: '🍒'/, 'Webhook must register Cherry in fallback');
  assert.match(webhookCode, /lower\.includes\('@cherry'\) \|\| lower\.includes\('cherry'\)/, 'resolveAutoTargetPage must recognize cherry');
});

test('🍒 AI Influencer Cherry - Component 4 & 5: Story Overlay Canvas & Theme Resolution', async (t) => {
  const { resolvePageTheme, generateStoryOverlay } = require('../src/utils/ffmpegHelper');

  // Theme resolution test
  const theme = resolvePageTheme({ slug: 'cherry', is_ai_influencer: 1, handle: '@cherry_official' });
  assert.equal(theme, 'cherry', 'resolvePageTheme must return "cherry" for Cherry channel');

  // Story overlay canvas test
  const overlayPath = generateStoryOverlay('cherry_official', {
    theme: 'cherry',
    pageName: 'Cherry',
    page: { slug: 'cherry', name: 'Cherry', handle: '@cherry_official' }
  });

  assert.ok(overlayPath, 'Story overlay must return generated file path');
  assert.ok(fs.existsSync(overlayPath), 'Story overlay PNG must exist on disk');
  const stat = fs.statSync(overlayPath);
  assert.ok(stat.size > 5000, `Overlay file must be valid non-empty PNG (was ${stat.size} bytes)`);
});

test('🍒 AI Influencer Cherry - Component 6: First-Person Lifestyle Copywriting Engine', async (t) => {
  const { generateInfluencerCaption } = require('../src/core/llmService');

  const result = await generateInfluencerCaption({
    page: { slug: 'cherry', name: 'Cherry', handle: '@cherry_official' },
    profile: { id: 'cherry', name: 'Cherry', handle: '@cherry_official' },
    rawCaption: 'Dancing in the golden hour sunlight'
  });

  assert.ok(result.caption, 'Must generate caption');
  assert.equal(result.provider, 'cherry_persona', 'Must use cherry_persona provider');
  assert.equal(result.model, 'first_person_lifestyle');
  assert.match(result.caption, /@cherry_official/, 'Caption must mention Cherry handle');
  assert.match(result.caption, /#cherry/, 'Caption must contain #cherry tag');
  assert.match(result.caption, /#aiinfluencer/, 'Caption must contain #aiinfluencer tag');
  assert.match(result.caption, /#outfitinspo/, 'Caption must contain #outfitinspo tag');
});
