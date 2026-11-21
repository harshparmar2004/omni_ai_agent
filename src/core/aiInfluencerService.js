const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { spawn, execSync } = require('child_process');

/**
 * Loads an AI Influencer profile by ID, handle, or slug.
 * Checks SQLite DB first, then config/influencers/<id>.json, then defaults to Aria Vance.
 */
function loadInfluencerProfile(influencerIdOrSlug) {
  const cleanId = String(influencerIdOrSlug || 'aria_vance').replace(/^@/, '').toLowerCase().trim();

  // 1. Try DB lookup
  try {
    const { getInfluencerProfile } = require('../database');
    const dbProfile = getInfluencerProfile(cleanId);
    if (dbProfile) {
      let parsedRef = [];
      let parsedCfg = {};
      try { parsedRef = JSON.parse(dbProfile.reference_images_json || '[]'); } catch (_) {}
      try { parsedCfg = JSON.parse(dbProfile.config_json || '{}'); } catch (_) {}
      return {
        ...dbProfile,
        reference_images: parsedRef,
        config: parsedCfg
      };
    }
  } catch (_) {}

  // 2. Try JSON file lookup in config/influencers/
  const configDir = path.join(__dirname, '..', '..', 'config', 'influencers');
  const candidates = [
    path.join(configDir, `${cleanId}.json`),
    path.join(configDir, `${cleanId.replace(/_official$/, '')}.json`),
    path.join(configDir, 'aria_vance.json'),
    path.join(configDir, 'default_influencer.json')
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw);
      } catch (_) {}
    }
  }

  // 3. Fallback Built-in Default: Aria Vance
  return {
    id: 'aria_vance',
    name: 'Aria Vance',
    handle: '@aria_vance_official',
    gender: 'female',
    age: 22,
    ethnicity: 'caucasian_brunette',
    features: {
      eye_color: 'hazel green',
      hair_style: 'long wavy espresso brown',
      physique: 'fit athletic toned, natural aesthetic proportions',
      signature_vibe: 'luxury streetwear, aesthetic fitness, high-fashion lifestyle'
    },
    reference_images: [
      'public/influencers/aria_vance/face_front.png',
      'public/influencers/aria_vance/face_angle.png'
    ],
    prompt_profile: 'hyper-realistic raw portrait photo of Aria Vance, 22yo, hazel eyes, natural skin texture with subtle pores, long wavy espresso brown hair, soft rim lighting, photorealistic 8k',
    negative_prompt: 'cgi, 3d render, anime, plastic smooth skin, distorted hands, extra fingers, cartoon, blurry, low resolution',
    provider: 'alibaba_wan',
    mode: 'real_world_passthrough',
    wan_settings: {
      model: 'wan3.0-prime',
      guide_scale: 6.0,
      flow_shift: 5.0,
      sampling_steps: 25,
      strength: 0.82,
      resolution: '720p',
      aspect_ratio: '9:16',
      backend: 'fal_ai',
      enable_audio: true
    },
    enable_codeformer: true,
    fidelity_weight: 0.88
  };
}

/**
 * Dynamic wardrobe prompt generator based on context (mood, scene, time of day)
 */
function generateDynamicWardrobePrompt(influencerProfile, context = {}) {
  const aesthetic = influencerProfile?.features?.signature_vibe || 'luxury streetwear and fitness lifestyle';
  const wardrobePresets = [
    'wearing a tailored oversized cream bomber jacket and high-waisted distressed denim',
    'wearing sleek matte black athletic gym set with white minimalist sneakers',
    'wearing a chic ribbed emerald knit dress with subtle gold jewelry',
    'wearing an off-shoulder vintage wash graphic sweatshirt and layered accessories',
    'wearing a structured neutral-tone blazer over a fitted crop top with streetwear trousers'
  ];

  // Pick deterministic preset based on date or context hash
  const seed = String(context.rawCaption || context.hookHeadline || new Date().toISOString().slice(0, 10));
  let hashNum = 0;
  for (let i = 0; i < seed.length; i++) hashNum = (hashNum + seed.charCodeAt(i)) % wardrobePresets.length;

  return `${influencerProfile?.name || 'Aria'} ${wardrobePresets[hashNum]}, ${aesthetic}, photorealistic 8k, natural lighting, high dynamic range`;
}

/**
 * Transforms an input video reel into the persistent AI Influencer persona.
 * Supports Fal.ai, Higgsfield, Viggle, Replicate, and local simulation fallback.
 */
async function transformReelToInfluencer(inputVideoPath, influencerProfile = null, options = {}) {
  if (!inputVideoPath) throw new Error('No input video path provided for AI influencer transformation');

  let absPath = inputVideoPath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputVideoPath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) absPath = candidate;
  }
  if (!fs.existsSync(absPath)) throw new Error(`Input video not found: ${absPath}`);

  const profile = influencerProfile || loadInfluencerProfile(options.influencerId || options.page?.influencer_profile_id);
  const provider = (options.provider || profile.provider || 'alibaba_wan').toLowerCase();

  const outDir = path.join(__dirname, '..', '..', 'public', 'generated', 'influencers');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileHash = crypto.createHash('md5').update(`${absPath}_${profile.id}_${Date.now()}`).digest('hex').slice(0, 10);
  const targetOutput = path.join(outDir, `${profile.id}_${fileHash}.mp4`);

  console.log(`[AI Influencer] 💃 Processing Reel for ${profile.name} (${profile.handle}) using ${provider.toUpperCase()} provider...`);

  // Provider Dispatch
  const wanKey = process.env.WAN_API_KEY || process.env.ALIBABA_WAN_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.FAL_KEY || process.env.FAL_AI_KEY;
  const falKey = process.env.FAL_KEY || process.env.FAL_AI_KEY;
  const higgsfieldKey = process.env.HIGGSFIELD_API_KEY || process.env.HIGGSFIELD_KEY;
  const viggleKey = process.env.VIGGLE_API_KEY;
  const replicateKey = process.env.REPLICATE_API_TOKEN;

  const isMock = process.env.MOCK_AI_INFLUENCER === 'true' || options.mock || (!wanKey && !falKey && !higgsfieldKey && !viggleKey && !replicateKey);

  if (isMock) {
    return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
  }

  // 1. Alibaba Wan 2.1 Video Foundation Model (Wan 14B V2V / I2V)
  if ((provider === 'alibaba_wan' || provider === 'wan' || provider === 'wan_video') && wanKey) {
    try {
      return await executeAlibabaWanTransform(absPath, targetOutput, profile, wanKey, options);
    } catch (e) {
      console.warn(`[AI Influencer] ⚠️ Alibaba Wan provider failed: ${e.message}, falling back to simulation`);
      return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
    }
  }

  // 2. Fal.ai Provider Adapter (High-Fidelity Face & Skin Swap)
  if (provider === 'fal_ai' && falKey) {
    try {
      return await executeFalAiTransform(absPath, targetOutput, profile, falKey, options);
    } catch (e) {
      console.warn(`[AI Influencer] ⚠️ Fal.ai provider failed: ${e.message}, falling back to simulation`);
      return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
    }
  }

  // 3. Higgsfield Provider Adapter (Character Video-to-Video Transformation)
  if (provider === 'higgsfield' && higgsfieldKey) {
    try {
      return await executeHiggsfieldTransform(absPath, targetOutput, profile, higgsfieldKey, options);
    } catch (e) {
      console.warn(`[AI Influencer] ⚠️ Higgsfield provider failed: ${e.message}, falling back to simulation`);
      return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
    }
  }

  // 4. Viggle Provider Adapter (Motion Transfer)
  if (provider === 'viggle' && viggleKey) {
    try {
      return await executeViggleTransform(absPath, targetOutput, profile, viggleKey, options);
    } catch (e) {
      console.warn(`[AI Influencer] ⚠️ Viggle provider failed: ${e.message}, falling back to simulation`);
      return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
    }
  }

  return await simulateInfluencerTransformation(absPath, targetOutput, profile, provider);
}

/**
 * Alibaba Wan Video Foundation Model Adapter (Wan 3.0 Prime & Wan 2.1 Video-to-Video & Image-to-Video)
 * Supports Fal.ai serverless Wan 3.0 Prime endpoint, Alibaba Cloud DashScope / Bailian API, or ComfyUI node.
 */
async function executeAlibabaWanTransform(inputVideoPath, targetOutput, profile, apiKey, options = {}) {
  const wanCfg = profile.wan_settings || {};
  const backend = (options.backend || wanCfg.backend || 'fal_ai').toLowerCase();
  const model = options.model || wanCfg.model || 'wan3.0-prime';
  const prompt = options.prompt || generateDynamicWardrobePrompt(profile, options);
  const negativePrompt = options.negative_prompt || profile.negative_prompt || 'cgi, 3d render, anime, plastic smooth skin, distorted hands, cartoon, blurry, low resolution';
  const isWan3 = /3\.0|prime/i.test(model);

  console.log(`[AI Influencer] 🚀 Calling Alibaba Wan [Model: ${model.toUpperCase()}] [Backend: ${backend.toUpperCase()}] for ${profile.name}...`);
  console.log(`[AI Influencer] 📝 Wan Prompt: "${prompt}"`);

  // Path A: Fal.ai Serverless Wan 3.0 Prime / Wan 2.1 Video-to-Video Endpoint
  if (backend === 'fal_ai' || (!process.env.DASHSCOPE_API_KEY && (process.env.FAL_KEY || process.env.FAL_AI_KEY))) {
    const falEndpoint = isWan3
      ? 'https://queue.fal.run/alibaba/wan-3.0-prime/video-to-video'
      : 'https://queue.fal.run/fal-ai/wan/v2.1/video-to-video';
    const referenceImage = profile.reference_images?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';

    const payload = {
      prompt,
      negative_prompt: negativePrompt,
      video_url: options.publicVideoUrl || `file://${inputVideoPath}`,
      image_url: referenceImage,
      strength: wanCfg.strength || options.strength || 0.82,
      guide_scale: wanCfg.guide_scale || 6.0,
      flow_shift: wanCfg.flow_shift || 5.0,
      sampling_steps: wanCfg.sampling_steps || 25,
      aspect_ratio: wanCfg.aspect_ratio || '9:16',
      resolution: wanCfg.resolution || '720p',
      enable_audio: wanCfg.enable_audio ?? true
    };

    const response = await axios.post(falEndpoint, payload, {
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    const statusUrl = response.data?.status_url;
    const requestId = response.data?.request_id;
    console.log(`[AI Influencer] Alibaba Wan (${model}) [Fal.ai] Job Queued: Request ID ${requestId}`);

    let videoResultUrl = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 180000) {
      await new Promise(r => setTimeout(r, 5000));
      const checkRes = await axios.get(statusUrl || `https://queue.fal.run/fal-ai/wan/requests/${requestId}/status`, {
        headers: { 'Authorization': `Key ${apiKey}` }
      });
      if (checkRes.data?.status === 'COMPLETED') {
        videoResultUrl = checkRes.data?.video?.url || checkRes.data?.output?.video_url;
        break;
      }
      if (checkRes.data?.status === 'FAILED') {
        throw new Error(`Alibaba Wan generation failed: ${checkRes.data?.error || 'Unknown error'}`);
      }
    }

    if (videoResultUrl) {
      const writer = fs.createWriteStream(targetOutput);
      const streamRes = await axios({ url: videoResultUrl, method: 'GET', responseType: 'stream' });
      streamRes.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return {
        success: true,
        videoPath: targetOutput,
        provider: 'alibaba_wan',
        backend: 'fal_ai',
        model,
        influencerId: profile.id,
        requestId,
        prompt
      };
    }

    throw new Error('Alibaba Wan polling timed out or returned empty video URL');
  }

  // Path B: Alibaba Cloud DashScope / Bailian API
  if (backend === 'dashscope' || process.env.DASHSCOPE_API_KEY) {
    const dashKey = process.env.DASHSCOPE_API_KEY || apiKey;
    const dashModel = isWan3 ? (model.includes('prime') ? 'wan3.0-video-prime' : 'wan3.0-video') : (wanCfg.model || 'wanx2.1-v2v');
    const dashPayload = {
      model: dashModel,
      input: {
        prompt,
        negative_prompt: negativePrompt,
        video_url: options.publicVideoUrl || `file://${inputVideoPath}`
      },
      parameters: {
        guide_scale: wanCfg.guide_scale || 6.0,
        flow_shift: wanCfg.flow_shift || 5.0,
        sampling_steps: wanCfg.sampling_steps || 25,
        enable_audio: wanCfg.enable_audio ?? true
      }
    };

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation',
      dashPayload,
      {
        headers: {
          'Authorization': `Bearer ${dashKey}`,
          'X-DashScope-Async': 'enable',
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const taskId = response.data?.output?.task_id;
    console.log(`[AI Influencer] Alibaba Wan (${dashModel}) [DashScope] Task Queued: ${taskId}`);

    const startTime = Date.now();
    let videoResultUrl = null;
    while (Date.now() - startTime < 180000) {
      await new Promise(r => setTimeout(r, 5000));
      const checkRes = await axios.get(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${dashKey}` }
      });
      const taskStatus = checkRes.data?.output?.task_status;
      if (taskStatus === 'SUCCEEDED') {
        videoResultUrl = checkRes.data?.output?.video_url;
        break;
      }
      if (taskStatus === 'FAILED') {
        throw new Error(`DashScope Wan generation failed: ${checkRes.data?.output?.message || 'Task failed'}`);
      }
    }

    if (videoResultUrl) {
      const writer = fs.createWriteStream(targetOutput);
      const streamRes = await axios({ url: videoResultUrl, method: 'GET', responseType: 'stream' });
      streamRes.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return {
        success: true,
        videoPath: targetOutput,
        provider: 'alibaba_wan',
        backend: 'dashscope',
        model: dashModel,
        influencerId: profile.id,
        taskId,
        prompt
      };
    }

    throw new Error('DashScope Wan polling timed out or returned empty video URL');
  }

  // Fallback to simulation
  return await simulateInfluencerTransformation(inputVideoPath, targetOutput, profile, 'alibaba_wan');
}

/**
 * Fal.ai API Execution Adapter (Video Face & Identity Swap)
 */
async function executeFalAiTransform(inputVideoPath, targetOutput, profile, apiKey, options = {}) {
  console.log(`[AI Influencer] ⚡ Calling Fal.ai Video Face Swap API for ${profile.name}...`);
  // Note: When live credentials are active, this submits the job to fal.ai endpoint
  // https://queue.fal.run/fal-ai/face-swap/video
  const referenceImage = profile.reference_images?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';
  
  // Submit request to Fal.ai
  const response = await axios.post(
    'https://queue.fal.run/fal-ai/face-swap/video',
    {
      video_url: options.publicVideoUrl || `file://${inputVideoPath}`,
      face_image_url: referenceImage,
      fidelity: profile.fidelity_weight || 0.88
    },
    {
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const statusUrl = response.data?.status_url;
  const requestId = response.data?.request_id;
  console.log(`[AI Influencer] Fal.ai Job Queued: Request ID ${requestId}`);

  // Poll for completion (up to 120s)
  let videoResultUrl = null;
  const startTime = Date.now();
  while (Date.now() - startTime < 120000) {
    await new Promise(r => setTimeout(r, 4000));
    const checkRes = await axios.get(statusUrl || `https://queue.fal.run/fal-ai/face-swap/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${apiKey}` }
    });
    if (checkRes.data?.status === 'COMPLETED') {
      videoResultUrl = checkRes.data?.video?.url || checkRes.data?.output?.video_url;
      break;
    }
  }

  if (videoResultUrl) {
    const writer = fs.createWriteStream(targetOutput);
    const streamRes = await axios({ url: videoResultUrl, method: 'GET', responseType: 'stream' });
    streamRes.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return {
      success: true,
      videoPath: targetOutput,
      provider: 'fal_ai',
      influencerId: profile.id,
      requestId
    };
  }

  throw new Error('Fal.ai polling timed out or returned empty video URL');
}

/**
 * Higgsfield Doppl API Adapter (Character Video-to-Video)
 */
async function executeHiggsfieldTransform(inputVideoPath, targetOutput, profile, apiKey, options = {}) {
  console.log(`[AI Influencer] ⚡ Calling Higgsfield AI Character Doppl API for ${profile.name}...`);
  // Standard Higgsfield Doppl API endpoint
  const payload = {
    model: 'doppl-v1',
    prompt: generateDynamicWardrobePrompt(profile, options),
    negative_prompt: profile.negative_prompt,
    character_id: profile.id,
    video_source: options.publicVideoUrl || `file://${inputVideoPath}`
  };

  const response = await axios.post('https://api.higgsfield.ai/v1/video/transform', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const jobId = response.data?.job_id || response.data?.id;
  console.log(`[AI Influencer] Higgsfield Job Queued: ID ${jobId}`);

  // Polling loop
  const startTime = Date.now();
  let videoResultUrl = null;
  while (Date.now() - startTime < 180000) {
    await new Promise(r => setTimeout(r, 5000));
    const checkRes = await axios.get(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (checkRes.data?.status === 'succeeded' || checkRes.data?.state === 'completed') {
      videoResultUrl = checkRes.data?.output_url || checkRes.data?.video_url;
      break;
    }
  }

  if (videoResultUrl) {
    const writer = fs.createWriteStream(targetOutput);
    const streamRes = await axios({ url: videoResultUrl, method: 'GET', responseType: 'stream' });
    streamRes.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return {
      success: true,
      videoPath: targetOutput,
      provider: 'higgsfield',
      influencerId: profile.id,
      jobId
    };
  }

  throw new Error('Higgsfield polling timed out');
}

/**
 * Viggle AI Motion Transfer Adapter
 */
async function executeViggleTransform(inputVideoPath, targetOutput, profile, apiKey, options = {}) {
  console.log(`[AI Influencer] ⚡ Calling Viggle AI Motion Transfer API for ${profile.name}...`);
  // Viggle AI character motion transfer
  const payload = {
    image_url: profile.reference_images?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    video_url: options.publicVideoUrl || `file://${inputVideoPath}`,
    bg_mode: 2 // preserve environment
  };

  const response = await axios.post('https://api.viggle.ai/v1/animate', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const taskId = response.data?.task_id;
  const startTime = Date.now();
  let videoResultUrl = null;
  while (Date.now() - startTime < 150000) {
    await new Promise(r => setTimeout(r, 5000));
    const checkRes = await axios.get(`https://api.viggle.ai/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (checkRes.data?.status === 'success') {
      videoResultUrl = checkRes.data?.result_url;
      break;
    }
  }

  if (videoResultUrl) {
    const writer = fs.createWriteStream(targetOutput);
    const streamRes = await axios({ url: videoResultUrl, method: 'GET', responseType: 'stream' });
    streamRes.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return {
      success: true,
      videoPath: targetOutput,
      provider: 'viggle',
      influencerId: profile.id,
      taskId
    };
  }

  throw new Error('Viggle polling timed out');
}

/**
 * Local High-Fidelity Simulation Pass
 * Applies subtle aesthetic color grading, skin tone warming, and high-frequency sharpness
 * to simulate the AI influencer rendering pass in offline/testing environments.
 */
function simulateInfluencerTransformation(inputVideoPath, targetOutput, profile, provider) {
  return new Promise((resolve) => {
    console.log(`[AI Influencer] 🎬 Rendering offline simulation for ${profile.name} (${provider})...`);

    // Color grading filter: slight warm skin tone curve + subtle saturation + unsharp mask
    const filter = 'eq=saturation=1.06:contrast=1.04:brightness=0.01,unsharp=3:3:0.4:3:3:0.0';

    const args = [
      '-y',
      '-i', inputVideoPath,
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      targetOutput
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(targetOutput)) {
        console.log(`[AI Influencer] ✅ Transformed Influencer Reel ready: ${targetOutput}`);
        resolve({
          success: true,
          videoPath: targetOutput,
          provider: `${provider}_simulated`,
          influencerId: profile.id,
          characterName: profile.name,
          wardrobePrompt: generateDynamicWardrobePrompt(profile)
        });
      } else {
        console.warn(`[AI Influencer] ⚠️ Simulation exited with code ${code}, falling back to original video`);
        resolve({
          success: false,
          videoPath: inputVideoPath,
          provider: 'fallback_original',
          influencerId: profile.id
        });
      }
    });

    proc.on('error', (err) => {
      console.warn(`[AI Influencer] Simulation spawn error: ${err.message}`);
      resolve({
        success: false,
        videoPath: inputVideoPath,
        provider: 'fallback_original',
        influencerId: profile.id
      });
    });
  });
}

module.exports = {
  loadInfluencerProfile,
  generateDynamicWardrobePrompt,
  transformReelToInfluencer,
  executeAlibabaWanTransform
};
