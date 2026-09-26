const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { getDb, getSetting } = require('../database');
const { generateSpeechAudio } = require('../utils/ttsHelper');
const { renderReelVideo } = require('../utils/ffmpegHelper');
const { generateInfographicSet } = require('./nanoBananaEngine');

/**
 * Media Generation Studio Service v2.0
 * Scripts viral content, generates Nano Banana infographic images,
 * and assembles 9:16 MP4 reels
 * Supports: Reel, Image Post, Carousel content types
 */
async function generateReelMedia({
  deliverableId,
  topic,
  title,
  summary,
  insights = [],
  contentType = 'reel'
}) {
  console.log(`\n======================================================`);
  console.log(`[Media Service v2.0] 🎬 Generating Multi-Modal Assets`);
  console.log(`[Media Service v2.0] Topic: ${topic || title} | Type: ${contentType}`);
  console.log(`======================================================`);

  const db = getDb();
  let deliverable = null;
  if (deliverableId) {
    deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(deliverableId);
  }

  const activeTopic = topic || deliverable?.title || 'Autonomous AI Systems in 2026';
  const activeTitle = title || deliverable?.title || activeTopic;
  const niche = deliverable?.niche || getSetting('default_niche', 'AI & Software Architecture');

  // 1. Generate Viral Script, Hook, CTA, and Extract Trigger Keyword
  const scriptData = generateReelScript(activeTopic, activeTitle, summary);

  // 2. Nano Banana Infographic Image Generation (Canvas-based)
  let imagePaths;
  try {
    imagePaths = await generateInfographicSet({
      title: activeTitle,
      hook: scriptData.hook,
      keyword: scriptData.trigger_keyword,
      insights: insights.length > 0 ? insights : [
        'Deterministic state machine validation',
        'Sub-second speculative routing',
        'Zero-token-leakage checkpointing'
      ],
      niche: niche
    });
  } catch (err) {
    console.warn(`[Media Service] Canvas engine failed: ${err.message}. Using FFmpeg fallback.`);
    imagePaths = await fallbackImageGeneration(activeTitle, scriptData);
  }

  const imageRelPath = imagePaths.cover916;
  const imageSquareRelPath = imagePaths.square11;
  const imageFeedRelPath = imagePaths.feed45;

  let videoRelPath = null;
  
  // 3. Generate video only for Reel content type
  if (contentType === 'reel') {
    const timestamp = Date.now();
    const reelsDir = path.join(__dirname, '..', '..', 'public', 'generated', 'reels');
    if (!fs.existsSync(reelsDir)) {
      fs.mkdirSync(reelsDir, { recursive: true });
    }

    // Audio Voiceover
    const audioPath = path.join(reelsDir, `audio_${timestamp}.wav`);
    await generateSpeechAudio(scriptData.script_text, audioPath);

    // Video Assembly
    const videoName = `reel_${timestamp}.mp4`;
    videoRelPath = `/generated/reels/${videoName}`;
    const videoAbsPath = path.join(reelsDir, videoName);
    const coverAbsPath = path.join(__dirname, '..', '..', 'public', imagePaths.cover916);

    await renderReelVideo({
      imagePath: coverAbsPath,
      audioPath: audioPath,
      outputPath: videoAbsPath,
      duration: 8,
      hookText: scriptData.hook,
      keyword: scriptData.trigger_keyword
    });
  }

  // 4. Store Media Asset in Database
  const insertStmt = db.prepare(`
    INSERT INTO media_assets (
      deliverable_id, hook_text, script_text, trigger_keyword, caption,
      image_url, video_url, thumbnail_url, aspect_ratio, generation_engine, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    deliverableId || null,
    scriptData.hook,
    scriptData.script_text,
    scriptData.trigger_keyword,
    scriptData.caption,
    contentType === 'image' ? (imageFeedRelPath || imageSquareRelPath) : imageRelPath,
    videoRelPath || '',
    imageSquareRelPath || imageRelPath,
    contentType === 'reel' ? '9:16' : (contentType === 'carousel' ? '1:1' : '4:5'),
    'nano_banana_v2',
    new Date().toISOString()
  );

  const mediaAssetId = result.lastInsertRowid;
  const savedAsset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(mediaAssetId);

  return {
    success: true,
    mediaAssetId,
    deliverableId,
    content_type: contentType,
    hook_text: scriptData.hook,
    script_text: scriptData.script_text,
    trigger_keyword: scriptData.trigger_keyword,
    caption: scriptData.caption,
    image_url: imageRelPath,
    image_square_url: imageSquareRelPath,
    image_feed_url: imageFeedRelPath,
    video_url: videoRelPath || '',
    thumbnail_url: imageSquareRelPath || imageRelPath,
    created_at: savedAsset.created_at
  };
}

/**
 * Fallback: Generate images via FFmpeg lavfi (solid color) if Canvas fails
 */
async function fallbackImageGeneration(title, scriptData) {
  const timestamp = Date.now();
  const imagesDir = path.join(__dirname, '..', '..', 'public', 'generated', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const variants = [
    { name: `cover_${timestamp}.png`, w: 1080, h: 1920 },
    { name: `square_${timestamp}.png`, w: 1080, h: 1080 },
    { name: `feed_${timestamp}.png`, w: 1080, h: 1350 }
  ];

  for (const v of variants) {
    const outputPath = path.join(imagesDir, v.name);
    await new Promise((resolve) => {
      const args = [
        '-f', 'lavfi', '-i', `color=c=0x1E1B18:s=${v.w}x${v.h}`,
        '-frames:v', '1', '-update', '1', '-y', outputPath
      ];
      const proc = spawn('ffmpeg', args);
      proc.on('close', () => resolve());
      proc.on('error', () => {
        fs.writeFileSync(outputPath, Buffer.alloc(100));
        resolve();
      });
    });
  }

  return {
    cover916: `/generated/images/cover_${timestamp}.png`,
    square11: `/generated/images/square_${timestamp}.png`,
    feed45: `/generated/images/feed_${timestamp}.png`
  };
}

/**
 * Script & CTA Generator with Keyword Extraction
 */
function generateReelScript(topic, title, summary) {
  let keyword = 'DRAG';
  const cleanTopic = (topic || '').toUpperCase();

  let hook = `Stop building basic chatbots in 2026! Here is the actual architecture.`;
  let body = `Most developers get stuck with fragile prompts and hallucinations. The top engineering teams use deterministic state graphs with automated checkpointing and hybrid cross-encoder reranking.`;
  let cta = ``;
  let caption = ``;

  if (cleanTopic.includes('DOCKER') || cleanTopic.includes('CONTAINER') || cleanTopic.includes('CGROUP') || cleanTopic.includes('NAMESPACE') || cleanTopic.includes('KERNEL')) {
    keyword = 'DOCKER';
    hook = `Stop guessing Docker interview questions! Here is the Linux kernel truth.`;
    body = `95% of engineers fail to explain the difference between a process and a container. In reality, Docker is just 8 Linux namespaces, cgroups v2 resource limits, and OverlayFS2 copy-up layers.`;
    cta = `Comment "DOCKER" below and my autonomous agent will instantly DM you the exhaustive 12-page technical interview masterclass and kernel diagnostic suite!`;
    caption = `${title} 🐳\n\nCrush your next Senior/Staff DevOps & Cloud interview. We tore down Docker from Linux kernel syscalls (clone, unshare, pivot_root) to production OOMKilled exit code 137 debugging.\n\nInside the 12-Page Dossier:\n• 8 Kernel Namespaces & cgroups v2 hierarchy\n• Multi-stage distroless build optimization (<25MB)\n• Docker daemon iptables packet flow & DNS resolution\n• Runnable Python cgroup v2 diagnostics\n\n👉 Comment "DOCKER" below and my autonomous agent will DM you the live whitepaper + complete 12-page PDF masterclass!\n\n#docker #devops #kubernetes #linux #cloudengineering #softwareengineering #interviewprep`;
  } else if (cleanTopic.includes('HACKATHON') || cleanTopic.includes('OCTOBER') || cleanTopic.includes('COMPETITION')) {
    keyword = 'WIN';
    hook = `Top 10 Global AI Hackathons in October 2026!`;
    body = `Over 2.5 million dollars in prizes are up for grabs. Here are the top tier verified competitions and winning starter templates.`;
    cta = `Comment "WIN" below and I'll instantly DM you the full 7-page hackathon dossier and registration links!`;
    caption = `${title} 🏆\n\nComplete guide to October 2026's biggest AI hackathons, prize pools, and winning strategies.\n\n👉 Comment "WIN" below for the complete dossier!\n\n#hackathon #ai #coding #developers`;
  } else if (cleanTopic.includes('RAG') || cleanTopic.includes('RETRIEV')) {
    keyword = 'RAG';
    hook = `Stop building basic RAG in 2026! Here is the enterprise retrieval stack.`;
    body = `Standard naive chunking fails at scale. Production retrieval requires speculative routing, semantic chunking, and reciprocal rank fusion.`;
    cta = `Comment "RAG" below and I'll DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nStop building fragile RAG systems. Here is the verified enterprise blueprint.\n\n👉 Comment "RAG" below for the full companion guide!\n\n#aiengineering #rag #softwarearchitecture`;
  } else if (cleanTopic.includes('AGENT') || cleanTopic.includes('SWARM') || cleanTopic.includes('AUTONOMOUS')) {
    keyword = 'AGENT';
    hook = `Stop building basic chatbots in 2026! Here is the multi-agent architecture.`;
    body = `The top engineering teams use deterministic state graphs with automated checkpointing and hybrid cross-encoder reranking.`;
    cta = `Comment "AGENT" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nStop building fragile AI systems that fail in production. Here is the verified blueprint for enterprise deployment.\n\nKey Highlights:\n• Deterministic state machine validation\n• Sub-second speculative routing\n• Zero-token-leakage checkpointing\n\n👉 Comment "AGENT" below and I'll DM you the full companion architecture guide + implementation code repository!\n\n#aiengineering #softwarearchitecture #python #aiagents #techtok #devlife`;
  } else if (cleanTopic.includes('LOCAL') || cleanTopic.includes('DEEPSEEK') || cleanTopic.includes('VLLM')) {
    keyword = 'DEEP';
    cta = `Comment "${keyword}" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nDeploying high-performance local LLMs with vLLM and TensorRT-LLM.\n\n👉 Comment "${keyword}" below for the complete blueprint!\n\n#ai #localllm #deepseek`;
  } else if (cleanTopic.includes('SCALE') || cleanTopic.includes('ENTERPRISE')) {
    keyword = 'SCALE';
    cta = `Comment "${keyword}" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nScaling systems to 10M+ daily events.\n\n👉 Comment "${keyword}" below for the complete guide!\n\n#systemdesign #cloud #scale`;
  } else if (cleanTopic.includes('SYSTEM') || cleanTopic.includes('ARCHITECTURE')) {
    keyword = 'BLUEPRINT';
    cta = `Comment "${keyword}" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nProduction system architecture blueprint.\n\n👉 Comment "${keyword}" below for the complete guide!\n\n#systemdesign #softwarearchitecture`;
  } else if (cleanTopic.includes('MCP') || cleanTopic.includes('PROTOCOL')) {
    keyword = 'MCP';
    cta = `Comment "${keyword}" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nModel Context Protocol architecture and implementation.\n\n👉 Comment "${keyword}" below for the complete guide!\n\n#mcp #anthropic #aiagents`;
  } else {
    const words = cleanTopic.replace(/[^A-Z\s]/g, '').split(/\s+/).filter(w => w.length >= 4 && !['BUILD', 'CREATE', 'WITH', 'FROM', 'HOWTO', 'YOUR', 'WHAT'].includes(w));
    if (words.length > 0) keyword = words[0];
    cta = `Comment "${keyword}" below and I will instantly DM you the complete architecture guide and code templates!`;
    caption = `${title} 🚀\n\nHere is the complete verified deep research dossier.\n\n👉 Comment "${keyword}" below for the complete guide!\n\n#engineering #tech #architecture`;
  }

  const script_text = `${hook} ${body} ${cta}`;

  return {
    hook,
    body,
    cta,
    script_text,
    caption,
    trigger_keyword: keyword
  };
}

module.exports = {
  generateReelMedia,
  generateReelScript
};
