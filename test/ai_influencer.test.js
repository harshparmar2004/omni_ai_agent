const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  loadInfluencerProfile,
  generateDynamicWardrobePrompt,
  transformReelToInfluencer
} = require('../src/core/aiInfluencerService');

const {
  upsertInfluencerProfile,
  getInfluencerProfile,
  listInfluencerProfiles
} = require('../src/database');

const {
  generateInfluencerCaption,
  generateAiCaption
} = require('../src/core/llmService');

test('AI Influencer Avatar Pipeline Subsystem', async (t) => {
  await t.test('1. Character Bible Profile Loading', () => {
    const profile = loadInfluencerProfile('aria_vance');
    assert.ok(profile, 'Profile should load successfully');
    assert.equal(profile.id, 'aria_vance', 'Profile ID should match');
    assert.equal(profile.name, 'Aria Vance', 'Profile Name should match');
    assert.ok(profile.prompt_profile.includes('Aria Vance'), 'Prompt profile should contain character name');
    assert.ok(Array.isArray(profile.reference_images), 'Reference images should be an array');
  });

  await t.test('2. Dynamic Wardrobe Prompt Synthesis', () => {
    const profile = loadInfluencerProfile('aria_vance');
    const prompt1 = generateDynamicWardrobePrompt(profile, { rawCaption: 'Gym workout day' });
    assert.ok(prompt1.includes('Aria'), 'Prompt must mention influencer name');
    assert.ok(prompt1.includes('wearing'), 'Prompt must define clothing');
    assert.ok(prompt1.includes('photorealistic'), 'Prompt must enforce photorealism');
  });

  await t.test('3. Database Persistence & Profile Linking', () => {
    const testProfile = {
      id: 'maya_fit',
      name: 'Maya Fitness',
      handle: '@maya_fit_official',
      provider: 'fal_ai',
      gender: 'female',
      ethnicity: 'latina_athlete',
      prompt_profile: 'raw 8k photo of Maya, 24yo athletic fitness influencer',
      negative_prompt: 'cgi, cartoon, blur',
      reference_images: ['public/influencers/maya/ref1.png']
    };

    const saved = upsertInfluencerProfile(testProfile);
    assert.equal(saved.id, 'maya_fit');
    assert.equal(saved.name, 'Maya Fitness');

    const retrieved = getInfluencerProfile('maya_fit');
    assert.equal(retrieved.handle, '@maya_fit_official');

    const all = listInfluencerProfiles();
    assert.ok(all.some(p => p.id === 'maya_fit'), 'Profile should be listed');
  });

  await t.test('4. First-Person Influencer Copywriting Engine', async () => {
    const page = {
      handle: '@aria_vance_official',
      name: 'Aria Vance',
      is_ai_influencer: 1
    };

    const captionRes = await generateInfluencerCaption({
      page,
      profile: loadInfluencerProfile('aria_vance'),
      rawCaption: 'Awesome summer dance routine'
    });

    assert.ok(captionRes.caption, 'Caption should be generated');
    assert.ok(captionRes.caption.includes('@aria_vance_official'), 'Caption must reference page handle');
    assert.ok(captionRes.caption.includes('#aiinfluencer'), 'Caption must include influencer hashtags');
    assert.equal(captionRes.provider, 'influencer_persona');

    // Test routing via generateAiCaption
    const routed = await generateAiCaption({
      page,
      rawCaption: 'Summer vibe check'
    });
    assert.equal(routed.provider, 'influencer_persona');
  });

  await t.test('5. Video Transformation Subsystem (Simulation Pass)', async () => {
    // Create a mock 1-second video for testing transformation
    const testDir = path.join(__dirname, '../public/generated/influencers');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const mockInput = path.join(testDir, 'test_sample.mp4');
    try {
      const { execSync } = require('child_process');
      execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=360x640:d=1 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -t 1 -pix_fmt yuv420p "${mockInput}"`, { timeout: 10000 });
    } catch (_) {}

    if (fs.existsSync(mockInput)) {
      const profile = loadInfluencerProfile('aria_vance');
      const result = await transformReelToInfluencer(mockInput, profile, { mock: true });

      assert.ok(result.success, 'Transform should succeed');
      assert.ok(fs.existsSync(result.videoPath), 'Transformed video output must exist');
      assert.ok(result.videoPath.endsWith('.mp4'), 'Output must be mp4');
      assert.ok(result.provider.includes('simulated'), 'Provider should report simulated mode');

      // Cleanup
      try { fs.unlinkSync(mockInput); } catch (_) {}
      try { fs.unlinkSync(result.videoPath); } catch (_) {}
    }
  });

  await t.test('6. Alibaba Wan 3.0 Prime Video Engine Settings & Simulation Routing', async () => {
    const profile = loadInfluencerProfile('aria_vance');
    assert.equal(profile.provider, 'alibaba_wan', 'Default provider must be alibaba_wan');
    assert.ok(profile.wan_settings, 'Profile must have wan_settings defined');
    assert.equal(profile.wan_settings.model, 'wan3.0-video-prime', 'Wan model must be wan3.0-video-prime');
    assert.equal(profile.wan_settings.backend, 'dashscope', 'Default backend must be official dashscope');
    assert.equal(profile.wan_settings.guide_scale, 6.0, 'Default guide_scale must be 6.0');
    assert.equal(profile.wan_settings.flow_shift, 5.0, 'Default flow_shift must be 5.0');
    assert.equal(profile.wan_settings.sampling_steps, 25, 'Default sampling_steps must be 25');
    assert.equal(profile.wan_settings.enable_audio, true, 'Wan 3.0 Prime should have enable_audio true');

    // Test simulation dispatch under alibaba_wan provider
    const testDir = path.join(__dirname, '../public/generated/influencers');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const mockInput = path.join(testDir, 'test_wan_sample.mp4');
    try {
      const { execSync } = require('child_process');
      execSync(`ffmpeg -y -f lavfi -i color=c=red:s=360x640:d=1 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -t 1 -pix_fmt yuv420p "${mockInput}"`, { timeout: 10000 });
    } catch (_) {}

    if (fs.existsSync(mockInput)) {
      const result = await transformReelToInfluencer(mockInput, profile, { mock: true, provider: 'alibaba_wan' });
      assert.ok(result.success, 'Wan transformation should succeed');
      assert.ok(fs.existsSync(result.videoPath), 'Transformed video output must exist');
      assert.equal(result.provider, 'alibaba_wan_simulated', 'Provider should reflect alibaba_wan_simulated');
      assert.ok(result.wardrobePrompt, 'Wan transformation must include wardrobe prompt');

      // Cleanup
      try { fs.unlinkSync(mockInput); } catch (_) {}
      try { fs.unlinkSync(result.videoPath); } catch (_) {}
    }
  });
});

