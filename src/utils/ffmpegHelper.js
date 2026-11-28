const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Initialize GlobalFonts for cross-platform Linux (Ubuntu) & Windows typography
try {
  const { GlobalFonts } = require('@napi-rs/canvas');
  const fontsDir = path.join(__dirname, '..', '..', 'public', 'fonts');
  const boldPath = path.join(fontsDir, 'Roboto-Bold.ttf');
  const medPath = path.join(fontsDir, 'Roboto-Medium.ttf');
  const blackPath = path.join(fontsDir, 'Roboto-Black.ttf');
  if (fs.existsSync(boldPath)) GlobalFonts.registerFromPath(boldPath, 'RobotoBold');
  if (fs.existsSync(medPath)) GlobalFonts.registerFromPath(medPath, 'RobotoMedium');
  if (fs.existsSync(blackPath)) GlobalFonts.registerFromPath(blackPath, 'RobotoBlack');
} catch (_) {}

/**
 * Dynamically resolves visual template theme from page metadata without hardcoded account rules.
 * Supports: 'clubbing' (Cyber/Party HUD), 'movies' (Cinematic Gold), 'video_essay' (Editorial Lime), 'gta6' (Vice City Card)
 */
function resolvePageTheme(pageOrHandle, explicitTheme = null) {
  if (explicitTheme && ['cherry', 'clubbing', 'movies', 'video_essay', 'gta6', 'minimal'].includes(explicitTheme)) {
    return explicitTheme;
  }

  const page = (typeof pageOrHandle === 'object' && pageOrHandle !== null) ? pageOrHandle : {};
  const handle = (typeof pageOrHandle === 'string' ? pageOrHandle : (page.handle || '')).toLowerCase().replace(/^@+/, '');
  const slug = (page.slug || '').toLowerCase();
  const name = (page.name || '').toLowerCase();
  const preset = (page.template_preset || page.brand_theme || page.template_slug || '').toLowerCase();
  const niche = (page.niche || '').toLowerCase();

  const combined = `${handle} ${slug} ${name} ${preset} ${niche}`;

  // 0. AI Influencer / Cherry Theme (e.g. Cherry, @cherry_official)
  if (
    explicitTheme === 'cherry' ||
    page.is_ai_influencer ||
    page.page_type === 'ai_influencer' ||
    page.influencer_profile_id === 'cherry' ||
    slug === 'cherry' ||
    handle.includes('cherry') ||
    combined.includes('cherry') ||
    preset === 'cherry'
  ) {
    return 'cherry';
  }

  // 1. Party / Clubbing / Rave / EDM / Concert / Cyber Theme (e.g. Cult Party, Clubbing Cult)
  if (
    preset === 'cyber_hud' || preset === 'cyberpunk_green' || preset === 'neon' || preset === 'party' ||
    combined.includes('club') || combined.includes('party') || combined.includes('rave') ||
    combined.includes('edm') || combined.includes('concert') || combined.includes('nightlife') ||
    combined.includes('dance') || combined.includes('festival') || combined.includes('techno')
  ) {
    return 'clubbing';
  }

  // 2. Movie / Cinema / Series / Entertainment Theme (e.g. Movie Series 365, Cinema Cult)
  if (
    preset === 'cinematic' || preset === 'cinematic_gold' || preset === 'cinema' || preset === 'movies' ||
    combined.includes('movie') || combined.includes('cinema') || combined.includes('film') ||
    combined.includes('series') || combined.includes('show') || combined.includes('theater')
  ) {
    return 'movies';
  }

  // 3. Editorial / Video-Essay / Cult Information Theme (e.g. Cult Information, Evolving AI)
  if (
    preset === 'video_essay' || preset === 'electric_lime' || preset === 'editorial' ||
    combined.includes('cult_info') || combined.includes('cultinformation') ||
    (combined.includes('cult') && combined.includes('info')) ||
    combined.includes('evolving') || combined.includes('ai_curation') || combined.includes('tech') ||
    combined.includes('essay') || combined.includes('knowledge')
  ) {
    return 'video_essay';
  }

  // 4. Gaming / GTA 6 Theme
  if (combined.includes('gta') || combined.includes('game') || combined.includes('vice_city') || preset === 'minimal_card') {
    return 'gta6';
  }

  return 'gta6';
}

/**
 * Renders a 9:16 vertical MP4 reel using FFmpeg
 * Combines image/slides, audio track, and kinetic subtitle text
 */
async function renderReelVideo({
  imagePath,
  audioPath,
  outputPath,
  duration = 8,
  hookText = '',
  keyword = 'DRAG'
}) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`[FFmpeg Helper] 🎬 Starting 9:16 Reel render to ${outputPath}...`);

    // Clean text strings for FFmpeg drawtext or subtitle overlays
    const cleanHook = (hookText || 'Autonomous AI Blueprint 2026')
      .replace(/['":\\]/g, '')
      .slice(0, 70);

    const cleanKeyword = (keyword || 'DRAG').toUpperCase();

    // Escape Windows backslashes for FFmpeg filter paths if needed
    const hasImage = imagePath && fs.existsSync(imagePath);
    const hasAudio = audioPath && fs.existsSync(audioPath);

    let ffmpegArgs = [];

    if (hasImage && hasAudio) {
      // Loop image + multiplex audio with vertical 9:16 scaling (1080x1920)
      ffmpegArgs = [
        '-loop', '1',
        '-i', imagePath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-t', String(duration),
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ];
    } else if (hasAudio) {
      // Synthesize elegant animated dark terracotta canvas (1080x1920) + audio
      ffmpegArgs = [
        '-f', 'lavfi',
        '-i', `color=c=0x1E1B18:s=1080x1920:d=${duration}`,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ];
    } else {
      // Synthesize both video color canvas + silence audio
      ffmpegArgs = [
        '-f', 'lavfi',
        '-i', `color=c=0x1E1B18:s=1080x1920:d=${duration}`,
        '-f', 'lavfi',
        '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`,
        '-c:v', 'libx264',
        '-t', String(duration),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-y',
        outputPath
      ];
    }

    const proc = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[FFmpeg Helper] ✅ Successfully generated Reel MP4: ${outputPath}`);
        resolve({
          success: true,
          outputPath,
          duration
        });
      } else {
        console.error(`[FFmpeg Helper Error] FFmpeg exited with code ${code}:`, stderr.slice(-400));
        // Fallback: If advanced filter failed, create a minimal clean MP4
        fallbackMinimalReel(outputPath, duration)
          .then(resolve)
          .catch(reject);
      }
    });

    proc.on('error', (err) => {
      console.error('[FFmpeg Process Error]:', err);
      fallbackMinimalReel(outputPath, duration)
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Fallback ultra-safe generator
 */
function fallbackMinimalReel(outputPath, duration = 6) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi',
      '-i', `color=c=0xD97757:s=720x1280:d=${duration}`,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=mono:sample_rate=44100',
      '-t', String(duration),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-y',
      outputPath
    ];

    const p = spawn('ffmpeg', args);
    p.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve({ success: true, outputPath, duration, note: 'fallback_render' });
      } else {
        reject(new Error(`Failed to render fallback reel (code ${code})`));
      }
    });
  });
}

/**
 * Quick non-blocking validation of whether a video already meets Meta requirements
 * (H.264 video codec + YUV color + stereo audio track)
 */
function isMetaCompliantVideo(inputVideoPath) {
  if (!fs.existsSync(inputVideoPath)) return false;
  try {
    const { execSync } = require('child_process');
    const probeRaw = execSync(
      `ffprobe -v error -show_entries stream=codec_type,codec_name,pix_fmt -of json "${inputVideoPath}"`,
      { timeout: 8000 }
    ).toString();
    const probeData = JSON.parse(probeRaw);
    const streams = probeData?.streams || [];
    const videoStream = streams.find(s => s.codec_type === 'video');
    const audioStream = streams.find(s => s.codec_type === 'audio');
    const isH264 = videoStream?.codec_name === 'h264';
    const isYuv = !videoStream?.pix_fmt || videoStream.pix_fmt.includes('yuv420');
    const hasAudio = Boolean(audioStream);
    return Boolean(isH264 && isYuv && hasAudio);
  } catch (e) {
    return false;
  }
}

/**
 * Universal Meta Graph API v21.0 Video Codec Validator & Transcoder
 * Guarantees video has h264 video, yuv420p pixel format, aac stereo audio, and faststart.
 * Transcodes vp9, av1, hevc, prores, webm, or silent video into pristine Meta-compliant MP4.
 */
function ensureMetaCompliantVideo(inputVideoPath, targetOutputPath = null) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputVideoPath)) {
      return reject(new Error(`Input video not found: ${inputVideoPath}`));
    }

    const { execSync } = require('child_process');
    let probeData = null;

    try {
      const probeRaw = execSync(
        `ffprobe -v error -show_entries stream=codec_type,codec_name,pix_fmt -of json "${inputVideoPath}"`,
        { timeout: 15000 }
      ).toString();
      probeData = JSON.parse(probeRaw);
    } catch (e) {
      console.warn(`[FFmpeg Helper] ffprobe check failed: ${e.message}. Proceeding to transcode directly.`);
    }

    const streams = probeData?.streams || [];
    const videoStream = streams.find(s => s.codec_type === 'video');
    const audioStream = streams.find(s => s.codec_type === 'audio');

    const isH264 = videoStream?.codec_name === 'h264';
    const hasAudio = Boolean(audioStream);
    const finalDest = targetOutputPath || inputVideoPath;

    // Fast-path bypass: if already H.264 with audio and target is same as input
    if (isH264 && hasAudio && (!targetOutputPath || targetOutputPath === inputVideoPath)) {
      console.log(`[FFmpeg Helper] ⚡ Video is already Meta-compliant H.264/Audio. Fast bypass enabled.`);
      return resolve({ success: true, outputPath: inputVideoPath, transcoded: false });
    }

    console.log(`[FFmpeg Helper] 🎨 Applying Fast Meta Transcode... (audio:${hasAudio ? 'yes' : 'none'})`);

    const tempOut = path.join(path.dirname(finalDest), `transcode_temp_${Date.now()}.mp4`);

    let ffmpegArgs = [];
    if (hasAudio) {
      ffmpegArgs = [
        '-y',
        '-i', inputVideoPath,
        '-filter_complex',
        '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v];[0:a]volume=1.15,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]',
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        '-tune', 'fastdecode',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        tempOut
      ];
    } else {
      // Input has no audio: add clean silent stereo audio track + preserve native aspect ratio
      ffmpegArgs = [
        '-y',
        '-i', inputVideoPath,
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex',
        '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v]',
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        tempOut
      ];
    }

    const proc = spawn('ffmpeg', ffmpegArgs);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(tempOut)) {
        try {
          if (fs.existsSync(finalDest) && finalDest !== tempOut) {
            fs.unlinkSync(finalDest);
          }
          fs.renameSync(tempOut, finalDest);
          console.log(`[FFmpeg Helper] ✅ Video successfully transcoded to Meta H.264/AAC: ${finalDest}`);
          resolve({ success: true, outputPath: finalDest, transcoded: true });
        } catch (renameErr) {
          // If rename fails (e.g. cross-device), copy and delete
          try {
            fs.copyFileSync(tempOut, finalDest);
            fs.unlinkSync(tempOut);
            resolve({ success: true, outputPath: finalDest, transcoded: true });
          } catch (copyErr) {
            reject(new Error(`Failed to save transcoded video: ${copyErr.message}`));
          }
        }
      } else {
        if (fs.existsSync(tempOut)) try { fs.unlinkSync(tempOut); } catch (e) {}
        console.error(`[FFmpeg Helper] Transcode failed (code ${code}):`, stderr.slice(-400));
        reject(new Error(`FFmpeg transcoding failed (code ${code}): ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      if (fs.existsSync(tempOut)) try { fs.unlinkSync(tempOut); } catch (e) {}
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Ensures an image is strictly Meta Graph API compliant:
 * - Format: JPEG (.jpg)
 * - Color space: sRGB, pixel format yuvj420p
 * - Resolution: up to 1080px width, aspect ratio between 4:5 and 1.91:1
 * Converts PNG/WebP and non-compliant formats automatically.
 */
async function ensureMetaCompliantImage(inputImagePath) {
  if (!inputImagePath) throw new Error('No image path provided');

  let absPath = inputImagePath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputImagePath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) {
      absPath = candidate;
    }
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`Image file not found on disk: ${absPath}`);
  }

  const ext = path.extname(absPath).toLowerCase();
  const dir = path.dirname(absPath);
  const baseName = path.basename(absPath, ext);
  const targetJpgPath = path.join(dir, `${baseName}.jpg`);

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const getRelUrl = (p) => {
    let rel = p.replace(publicDir, '').replace(/\\/g, '/');
    if (!rel.startsWith('/')) rel = '/' + rel;
    return rel;
  };

  // If already a .jpg and exists, verify or quickly transcode
  return new Promise((resolve, reject) => {
    const tempOut = path.join(dir, `${baseName}_meta_${Date.now()}.jpg`);
    const ffmpegArgs = [
      '-y',
      '-i', absPath,
      '-vf', 'scale=w=1080:h=-2:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-q:v', '2',
      '-pix_fmt', 'yuvj420p',
      tempOut
    ];

    const proc = spawn('ffmpeg', ffmpegArgs);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(tempOut)) {
        try {
          if (fs.existsSync(targetJpgPath) && targetJpgPath !== tempOut) {
            fs.unlinkSync(targetJpgPath);
          }
          fs.renameSync(tempOut, targetJpgPath);
          const relUrl = getRelUrl(targetJpgPath);
          console.log(`[FFmpeg Helper] ✅ Image verified & Meta-compliant: ${relUrl}`);
          resolve({
            success: true,
            filePath: targetJpgPath,
            url: relUrl
          });
        } catch (renameErr) {
          try {
            fs.copyFileSync(tempOut, targetJpgPath);
            fs.unlinkSync(tempOut);
            resolve({
              success: true,
              filePath: targetJpgPath,
              url: getRelUrl(targetJpgPath)
            });
          } catch (copyErr) {
            reject(new Error(`Failed to save Meta JPEG: ${copyErr.message}`));
          }
        }
      } else {
        if (fs.existsSync(tempOut)) try { fs.unlinkSync(tempOut); } catch (e) {}
        reject(new Error(`FFmpeg image conversion failed (code ${code}): ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      if (fs.existsSync(tempOut)) try { fs.unlinkSync(tempOut); } catch (e) {}
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Computes pixel-perfect card dimensions and sticker placements for any media aspect ratio
 * Ensures 100% gapless fit inside the 1080x1920 story canvas
 */
function computeStoryCardGeometry(inputWidth, inputHeight) {
  const canvasW = 1080;
  const canvasH = 1920;
  const ratio = (inputWidth && inputHeight) ? (inputWidth / inputHeight) : (9 / 16);

  let cardW, cardH;
  if (ratio <= 0.65) {
    // 9:16 Vertical Reel (e.g. 1080x1920)
    cardW = 860;
    cardH = Math.round(cardW / ratio);
    if (cardH > 1528) {
      cardH = 1528;
      cardW = Math.round(cardH * ratio);
    }
  } else if (ratio >= 1.35) {
    // 16:9 Landscape / Widescreen Cinema (e.g. 1920x1080)
    cardW = 1032;
    cardH = Math.round(cardW / ratio);
    if (cardH > 720) {
      cardH = 720;
      cardW = Math.round(cardH * ratio);
    }
  } else if (ratio >= 0.95 && ratio <= 1.05) {
    // 1:1 Square (e.g. 1080x1080)
    cardW = 1000;
    cardH = 1000;
  } else {
    // 4:5 Portrait (e.g. 1080x1350)
    cardW = 1000;
    cardH = Math.round(cardW / ratio);
    if (cardH > 1260) {
      cardH = 1260;
      cardW = Math.round(cardH * ratio);
    }
  }

  // Enforce even dimensions for FFmpeg compliance
  cardW = Math.floor(cardW / 2) * 2;
  cardH = Math.floor(cardH / 2) * 2;

  const cardX = Math.round((canvasW - cardW) / 2);
  const cardY = Math.round((canvasH - cardH) / 2);

  // Ergonomic placements for floating header badge and CTA sticker
  const headerH = 54;
  const headerW = Math.min(cardW, 580);
  const headerX = Math.round((canvasW - headerW) / 2);
  const headerY = Math.max(120, cardY - headerH - 22);

  const ctaH = 54;
  const ctaW = Math.min(cardW - 40, 440);
  const ctaX = Math.round((canvasW - ctaW) / 2);
  const ctaY = Math.min(canvasH - ctaH - 110, cardY + cardH + 24);

  return { cardW, cardH, cardX, cardY, headerW, headerH, headerX, headerY, ctaW, ctaH, ctaX, ctaY, ratio };
}

/**
 * Generates clean aesthetic UI overlay PNG for Instagram Story Reshare Card
 * Dynamically adapts to any media aspect ratio (vertical, landscape, square)
 */
function generateStoryOverlay(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || 'gta6_updates_007').replace(/^@/, '');
  const isCherry = options.theme === 'cherry' || cleanHandle.includes('cherry') || (options.page && (options.page.slug === 'cherry' || options.page.is_ai_influencer || options.page.influencer_profile_id === 'cherry'));
  const theme = options.theme || (
    isCherry ? 'cherry' :
    (cleanHandle.includes('club') || (options.page && options.page.slug === 'clubbing') ? 'clubbing' :
    (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies') ? 'movies' :
    (cleanHandle.includes('cult') || (options.page && options.page.slug === 'cult_information') || cleanHandle.includes('evolving') || (options.page && options.page.slug === 'ai_curation') ? 'video_essay' : 'gta6')))
  );
  const isClubbing = !isCherry && (theme === 'clubbing' || theme === 'clubbingcult');
  const isMovie = !isCherry && (theme === 'movies');
  const isVideoEssay = !isCherry && (theme === 'video_essay' || theme === 'cult_information' || theme === 'evolving_ai');
  const isGTA6 = !isCherry && !isClubbing && !isMovie && !isVideoEssay;

  // Compute or inherit dynamic geometry
  const computed = computeStoryCardGeometry(options.inputWidth || 1080, options.inputHeight || 1920);
  const cardX = options.cardX !== undefined ? options.cardX : computed.cardX;
  const cardY = options.cardY !== undefined ? options.cardY : computed.cardY;
  const cardW = options.cardW !== undefined ? options.cardW : computed.cardW;
  const cardH = options.cardH !== undefined ? options.cardH : computed.cardH;
  const headerX = options.headerX !== undefined ? options.headerX : Math.round((width - Math.min(cardW, 580)) / 2);
  const headerY = options.headerY !== undefined ? options.headerY : Math.max(120, cardY - 54 - 22);
  const headerW = options.headerW !== undefined ? options.headerW : Math.min(cardW, 580);
  const headerH = options.headerH !== undefined ? options.headerH : 54;
  const ctaX = options.ctaX !== undefined ? options.ctaX : Math.round((width - Math.min(cardW - 40, 440)) / 2);
  const ctaY = options.ctaY !== undefined ? options.ctaY : Math.min(height - 54 - 110, cardY + cardH + 24);
  const ctaW = options.ctaW !== undefined ? options.ctaW : Math.min(cardW - 40, 440);
  const ctaH = options.ctaH !== undefined ? options.ctaH : 54;

  // 1. Ambient Background color tint & vignette
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isCherry) {
    bgGrad.addColorStop(0, 'rgba(28, 6, 16, 0.94)');
    bgGrad.addColorStop(0.5, 'rgba(18, 4, 12, 0.88)');
    bgGrad.addColorStop(1, 'rgba(10, 2, 8, 0.96)');
  } else if (isClubbing) {
    bgGrad.addColorStop(0, 'rgba(4, 18, 10, 0.85)');
    bgGrad.addColorStop(0.5, 'rgba(6, 28, 14, 0.72)');
    bgGrad.addColorStop(1, 'rgba(2, 12, 6, 0.90)');
  } else if (isMovie) {
    bgGrad.addColorStop(0, 'rgba(8, 8, 12, 0.78)');
    bgGrad.addColorStop(0.5, 'rgba(22, 14, 18, 0.65)');
    bgGrad.addColorStop(1, 'rgba(6, 6, 8, 0.85)');
  } else if (isVideoEssay) {
    bgGrad.addColorStop(0, 'rgba(10, 10, 14, 0.96)');
    bgGrad.addColorStop(0.5, 'rgba(18, 18, 24, 0.88)');
    bgGrad.addColorStop(1, 'rgba(8, 8, 10, 0.96)');
  } else {
    bgGrad.addColorStop(0, 'rgba(10, 2, 24, 0.82)');
    bgGrad.addColorStop(0.5, 'rgba(38, 8, 60, 0.65)');
    bgGrad.addColorStop(1, 'rgba(10, 2, 24, 0.85)');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, 350, width / 2, height / 2, 950);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, isCherry ? 'rgba(0, 0, 0, 0.82)' : (isClubbing ? 'rgba(0, 0, 0, 0.85)' : (isVideoEssay ? 'rgba(0, 0, 0, 0.90)' : 'rgba(0, 0, 0, 0.75)')));
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Center Card Cutout (smooth rounded corners)
  const radius = 18;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.clip();
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  // 3. Signature Framing / Border around the media card
  if (isCherry) {
    ctx.save();
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#FF3366');
    borderGrad.addColorStop(0.35, '#FFB6C1');
    borderGrad.addColorStop(0.70, '#FF758C');
    borderGrad.addColorStop(1, '#FF2A6D');
    ctx.shadowColor = 'rgba(255, 51, 102, 0.55)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 14);
    else ctx.rect(cardX + 6, cardY + 6, cardW - 12, cardH - 12);
    ctx.stroke();

    const bLen = Math.min(36, Math.round(cardW * 0.07));
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FF758C';
    ctx.shadowColor = 'rgba(255, 117, 140, 0.65)';
    ctx.shadowBlur = 10;

    // TL
    ctx.beginPath();
    ctx.moveTo(cardX - 5, cardY + bLen); ctx.lineTo(cardX - 5, cardY - 5); ctx.lineTo(cardX + bLen, cardY - 5);
    ctx.stroke();

    // TR
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY - 5); ctx.lineTo(cardX + cardW + 5, cardY - 5); ctx.lineTo(cardX + cardW + 5, cardY + bLen);
    ctx.stroke();

    // BL
    ctx.beginPath();
    ctx.moveTo(cardX - 5, cardY + cardH - bLen); ctx.lineTo(cardX - 5, cardY + cardH + 5); ctx.lineTo(cardX + bLen, cardY + cardH + 5);
    ctx.stroke();

    // BR
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 5); ctx.lineTo(cardX + cardW + 5, cardY + cardH + 5); ctx.lineTo(cardX + cardW + 5, cardY - bLen);
    ctx.stroke();

    const botBarW = Math.min(640, cardW - 60);
    const botBarX = cardX + (cardW - botBarW) / 2;
    const botBarY = cardY + cardH - 10;
    const botGrad = ctx.createLinearGradient(botBarX, botBarY, botBarX + botBarW, botBarY);
    botGrad.addColorStop(0, 'rgba(255, 51, 102, 0)');
    botGrad.addColorStop(0.2, '#FF3366');
    botGrad.addColorStop(0.5, '#FFB6C1');
    botGrad.addColorStop(0.8, '#FF758C');
    botGrad.addColorStop(1, 'rgba(255, 117, 140, 0)');
    ctx.fillStyle = botGrad;
    ctx.shadowColor = 'rgba(255, 51, 102, 0.75)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(botBarX, botBarY, botBarW, 6, 3);
    else ctx.rect(botBarX, botBarY, botBarW, 6);
    ctx.fill();

    ctx.font = '800 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('◄ ◄  CHERRY • OFFICIAL AI INFLUENCER  ► ►', cardX + cardW / 2, botBarY - 14);
    ctx.restore();
  } else if (isGTA6) {
    // 8px glowing multi-stop neon gradient border
    ctx.save();
    const bGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    bGrad.addColorStop(0, '#00F0FF');
    bGrad.addColorStop(0.3, '#7209B7');
    bGrad.addColorStop(0.65, '#F72585');
    bGrad.addColorStop(1, '#FF8A00');
    ctx.shadowColor = 'rgba(247, 37, 133, 0.75)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = bGrad;
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.stroke();

    // Inner accent rail
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX + 9, cardY + 9, cardW - 18, cardH - 18, 12);
    else ctx.rect(cardX + 9, cardY + 9, cardW - 18, cardH - 18);
    ctx.stroke();

    // 4 Prominent Corner Registration Brackets
    const bLen = Math.min(42, Math.round(cardW * 0.08));
    ctx.lineWidth = 5;

    // TL (Cyan)
    ctx.strokeStyle = '#00F0FF';
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cardX - 6, cardY + bLen); ctx.lineTo(cardX - 6, cardY - 6); ctx.lineTo(cardX + bLen, cardY - 6);
    ctx.stroke();

    // TR (Pink)
    ctx.strokeStyle = '#F72585';
    ctx.shadowColor = '#F72585';
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY + bLen);
    ctx.stroke();

    // BL (Pink)
    ctx.strokeStyle = '#F72585';
    ctx.shadowColor = '#F72585';
    ctx.beginPath();
    ctx.moveTo(cardX - 6, cardY + cardH - bLen); ctx.lineTo(cardX - 6, cardY + cardH + 6); ctx.lineTo(cardX + bLen, cardY + cardH + 6);
    ctx.stroke();

    // BR (Sunset Orange)
    ctx.strokeStyle = '#FF8A00';
    ctx.shadowColor = '#FF8A00';
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY - bLen);
    ctx.stroke();

    // Bottom Boundary Theme Bar
    const botBarW = Math.min(680, cardW - 80);
    const botBarX = cardX + (cardW - botBarW) / 2;
    const botBarY = cardY + cardH - 12;

    const botGrad = ctx.createLinearGradient(botBarX, botBarY, botBarX + botBarW, botBarY);
    botGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    botGrad.addColorStop(0.15, '#00F0FF');
    botGrad.addColorStop(0.5, '#F72585');
    botGrad.addColorStop(0.85, '#FF8A00');
    botGrad.addColorStop(1, 'rgba(255, 138, 0, 0)');
    ctx.fillStyle = botGrad;
    ctx.shadowColor = 'rgba(255, 138, 0, 0.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(botBarX, botBarY, botBarW, 8, 4);
    else ctx.rect(botBarX, botBarY, botBarW, 8);
    ctx.fill();

    ctx.font = '900 13px Impact, Arial Black, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('◄ ◄  GTA VI • VICE CITY  ► ►', cardX + cardW / 2, botBarY - 14);
    ctx.restore();
  } else if (isMovie) {
    ctx.save();
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#FFD166');
    borderGrad.addColorStop(0.35, '#FFB703');
    borderGrad.addColorStop(0.70, '#C1121F');
    borderGrad.addColorStop(1, '#E5A93C');
    ctx.shadowColor = 'rgba(255, 183, 3, 0.70)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.40)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX + 9, cardY + 9, cardW - 18, cardH - 18, 12);
    else ctx.rect(cardX + 9, cardY + 9, cardW - 18, cardH - 18);
    ctx.stroke();

    const bLen = Math.min(42, Math.round(cardW * 0.08));
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FFD166';
    ctx.shadowColor = '#FFD166';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cardX - 6, cardY + bLen); ctx.lineTo(cardX - 6, cardY - 6); ctx.lineTo(cardX + bLen, cardY - 6);
    ctx.stroke();

    ctx.strokeStyle = '#FFB703';
    ctx.shadowColor = '#FFB703';
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY + bLen);
    ctx.stroke();

    ctx.strokeStyle = '#FFB703';
    ctx.beginPath();
    ctx.moveTo(cardX - 6, cardY + cardH - bLen); ctx.lineTo(cardX - 6, cardY + cardH + 6); ctx.lineTo(cardX + bLen, cardY + cardH + 6);
    ctx.stroke();

    ctx.strokeStyle = '#E5A93C';
    ctx.shadowColor = '#E5A93C';
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY - bLen);
    ctx.stroke();

    const botBarW = Math.min(680, cardW - 80);
    const botBarX = cardX + (cardW - botBarW) / 2;
    const botBarY = cardY + cardH - 12;
    const botGrad = ctx.createLinearGradient(botBarX, botBarY, botBarX + botBarW, botBarY);
    botGrad.addColorStop(0, 'rgba(255, 209, 102, 0)');
    botGrad.addColorStop(0.2, '#FFD166');
    botGrad.addColorStop(0.5, '#FFB703');
    botGrad.addColorStop(0.8, '#C1121F');
    botGrad.addColorStop(1, 'rgba(193, 18, 31, 0)');
    ctx.fillStyle = botGrad;
    ctx.shadowColor = 'rgba(255, 183, 3, 0.85)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(botBarX, botBarY, botBarW, 8, 4);
    else ctx.rect(botBarX, botBarY, botBarW, 8);
    ctx.fill();

    ctx.font = 'bold 12px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('◄ ◄  DAILY MOVIE & SERIES RECOMMENDATIONS  ► ►', cardX + cardW / 2, botBarY - 14);
    ctx.restore();
  } else if (isVideoEssay) {
    // Cult Information Editorial Archive Framing
    ctx.save();
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#CCFF00');
    borderGrad.addColorStop(0.35, '#FFFFFF');
    borderGrad.addColorStop(0.70, '#A6FF00');
    borderGrad.addColorStop(1, '#CCFF00');
    ctx.shadowColor = 'rgba(204, 255, 0, 0.40)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.stroke();

    // Inner subtle white rail
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 14);
    else ctx.rect(cardX + 6, cardY + 6, cardW - 12, cardH - 12);
    ctx.stroke();

    // 4 Minimalist Corner Tick Brackets (Documentary / Archive style)
    const bLen = Math.min(32, Math.round(cardW * 0.06));
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#CCFF00';
    ctx.shadowColor = 'rgba(204, 255, 0, 0.55)';
    ctx.shadowBlur = 8;

    // TL
    ctx.beginPath();
    ctx.moveTo(cardX - 4, cardY + bLen); ctx.lineTo(cardX - 4, cardY - 4); ctx.lineTo(cardX + bLen, cardY - 4);
    ctx.stroke();

    // TR
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY - 4); ctx.lineTo(cardX + cardW + 4, cardY - 4); ctx.lineTo(cardX + cardW + 4, cardY + bLen);
    ctx.stroke();

    // BL
    ctx.beginPath();
    ctx.moveTo(cardX - 4, cardY + cardH - bLen); ctx.lineTo(cardX - 4, cardY + cardH + 4); ctx.lineTo(cardX + bLen, cardY + cardH + 4);
    ctx.stroke();

    // BR
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 4); ctx.lineTo(cardX + cardW + 4, cardY + cardH + 4); ctx.lineTo(cardX + cardW + 4, cardY - bLen);
    ctx.stroke();

    // Bottom Boundary Brand Bar
    const botBarW = Math.min(640, cardW - 60);
    const botBarX = cardX + (cardW - botBarW) / 2;
    const botBarY = cardY + cardH - 10;
    const botGrad = ctx.createLinearGradient(botBarX, botBarY, botBarX + botBarW, botBarY);
    botGrad.addColorStop(0, 'rgba(204, 255, 0, 0)');
    botGrad.addColorStop(0.2, '#CCFF00');
    botGrad.addColorStop(0.5, '#FFFFFF');
    botGrad.addColorStop(0.8, '#A6FF00');
    botGrad.addColorStop(1, 'rgba(166, 255, 0, 0)');
    ctx.fillStyle = botGrad;
    ctx.shadowColor = 'rgba(204, 255, 0, 0.65)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(botBarX, botBarY, botBarW, 6, 3);
    else ctx.rect(botBarX, botBarY, botBarW, 6);
    ctx.fill();

    ctx.font = '800 12px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('◄ ◄  CULT INFORMATION • UNTOLD KNOWLEDGE  ► ►', cardX + cardW / 2, botBarY - 14);
    ctx.restore();
  } else {
    // Clubbing Cult
    ctx.save();
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#00FFA3');
    borderGrad.addColorStop(0.5, '#00E5FF');
    borderGrad.addColorStop(1, '#39FF14');
    ctx.shadowColor = 'rgba(0, 255, 163, 0.60)';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Top Header Box
  if (isCherry) {
    const badgeText1 = '[ NEW REEL ]';
    const badgeSep = '   ';
    const badgeText2 = '🍒 CHERRY';

    ctx.save();
    ctx.font = '900 20px "Segoe UI", Arial, sans-serif';
    const w1 = ctx.measureText(badgeText1).width;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    const wSep = ctx.measureText(badgeSep).width;
    ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
    const w2 = ctx.measureText(badgeText2).width;

    const padX = 26;
    const hBoxW = Math.min(width - 60, Math.round(w1 + wSep + w2 + padX * 2));
    const hBoxH = 54;
    const hBoxX = Math.round((width - hBoxW) / 2);
    const hBoxY = headerY;

    ctx.shadowColor = 'rgba(255, 51, 102, 0.55)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(26, 6, 16, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX, hBoxY, hBoxW, hBoxH, 27);
    else ctx.rect(hBoxX, hBoxY, hBoxW, hBoxH);
    ctx.fill();

    const hbGrad = ctx.createLinearGradient(hBoxX, hBoxY, hBoxX + hBoxW, hBoxY + hBoxH);
    hbGrad.addColorStop(0, '#FF3366');
    hbGrad.addColorStop(0.5, '#FFB6C1');
    hbGrad.addColorStop(1, '#FF758C');
    ctx.strokeStyle = hbGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4, 25);
    else ctx.rect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4);
    ctx.stroke();

    let curX = hBoxX + padX;
    const textCenterY = hBoxY + hBoxH / 2 + 1;

    ctx.font = '900 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FF758C';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(badgeText1, curX, textCenterY);
    curX += w1;

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
    ctx.fillText(badgeSep, curX, textCenterY);
    curX += wSep;

    ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText2, curX, textCenterY);
    ctx.restore();
  } else if (isGTA6) {
    const pageName = options.pageName || options.page?.name || (cleanHandle.includes('gta') ? 'GTA 6 Updates 007' : cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    const badgeText1 = pageName;
    const badgeSep = '  |  ';
    const badgeText2 = 'GTA VI';

    ctx.save();
    ctx.font = 'bold 22px Arial, sans-serif';
    const w1 = ctx.measureText(badgeText1).width;
    ctx.font = 'bold 20px Arial, sans-serif';
    const wSep = ctx.measureText(badgeSep).width;
    ctx.font = '600 22px Arial, sans-serif';
    const w2 = ctx.measureText(badgeText2).width;

    const padX = 26;
    const hBoxW = Math.min(width - 60, Math.round(w1 + wSep + w2 + padX * 2));
    const hBoxH = 54;
    const hBoxX = Math.round((width - hBoxW) / 2);
    const hBoxY = headerY;

    ctx.shadowColor = 'rgba(0, 240, 255, 0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(14, 4, 26, 0.94)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX, hBoxY, hBoxW, hBoxH, 8);
    else ctx.rect(hBoxX, hBoxY, hBoxW, hBoxH);
    ctx.fill();

    const hbGrad = ctx.createLinearGradient(hBoxX, hBoxY, hBoxX + hBoxW, hBoxY + hBoxH);
    hbGrad.addColorStop(0, '#00F0FF');
    hbGrad.addColorStop(0.5, '#F72585');
    hbGrad.addColorStop(1, '#00F0FF');
    ctx.strokeStyle = hbGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4, 6);
    else ctx.rect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4);
    ctx.stroke();

    let curX = hBoxX + padX;
    const textCenterY = hBoxY + hBoxH / 2 + 1;

    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(badgeText1, curX, textCenterY);
    curX += w1;

    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(badgeSep, curX, textCenterY);
    curX += wSep;

    ctx.font = '600 22px Arial, sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(badgeText2, curX, textCenterY);
    ctx.restore();
  } else if (isVideoEssay) {
    const pageName = options.pageName || options.page?.name || (cleanHandle.includes('cult') ? 'Cult Information' : cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    const badgeText1 = '[ NEW POST ]';
    const badgeSep = '   ';
    const badgeText2 = pageName.toUpperCase();

    ctx.save();
    ctx.font = '900 20px "Segoe UI", Arial, sans-serif';
    const w1 = ctx.measureText(badgeText1).width;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    const wSep = ctx.measureText(badgeSep).width;
    ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
    const w2 = ctx.measureText(badgeText2).width;

    const padX = 26;
    const hBoxW = Math.min(width - 60, Math.round(w1 + wSep + w2 + padX * 2));
    const hBoxH = 54;
    const hBoxX = Math.round((width - hBoxW) / 2);
    const hBoxY = headerY;

    ctx.shadowColor = 'rgba(204, 255, 0, 0.55)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(10, 10, 14, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX, hBoxY, hBoxW, hBoxH, 27);
    else ctx.rect(hBoxX, hBoxY, hBoxW, hBoxH);
    ctx.fill();

    const hbGrad = ctx.createLinearGradient(hBoxX, hBoxY, hBoxX + hBoxW, hBoxY + hBoxH);
    hbGrad.addColorStop(0, '#CCFF00');
    hbGrad.addColorStop(0.5, '#FFFFFF');
    hbGrad.addColorStop(1, '#A6FF00');
    ctx.strokeStyle = hbGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4, 25);
    else ctx.rect(hBoxX + 2, hBoxY + 2, hBoxW - 4, hBoxH - 4);
    ctx.stroke();

    let curX = hBoxX + padX;
    const textCenterY = hBoxY + hBoxH / 2 + 1;

    ctx.font = '900 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#CCFF00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(badgeText1, curX, textCenterY);
    curX += w1;

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
    ctx.fillText(badgeSep, curX, textCenterY);
    curX += wSep;

    ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText2, curX, textCenterY);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = isClubbing ? 'rgba(4, 18, 10, 0.90)' : 'rgba(14, 14, 18, 0.88)';
    ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.45)' : 'rgba(255, 215, 120, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(headerX, headerY, headerW, headerH, 27);
    else ctx.rect(headerX, headerY, headerW, headerH);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isClubbing) {
      ctx.fillText(`@${cleanHandle.toLowerCase()}`, width / 2, headerY + headerH / 2);
    } else {
      ctx.fillText(`@${cleanHandle}  |  Cinema Picks`, width / 2, headerY + headerH / 2);
    }
  }

  // 5. Bottom CTA Sticker
  if (isCherry) {
    const ctaBoxW = Math.min(width - 80, Math.max(cardW - 40, 520));
    const ctaBoxH = 66;
    const ctaBoxX = Math.round((width - ctaBoxW) / 2);
    const ctaBoxY = Math.min(height - ctaBoxH - 96, cardY + cardH + 18);

    ctx.save();
    ctx.shadowColor = 'rgba(255, 51, 102, 0.55)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(24, 6, 16, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ctaBoxX, ctaBoxY, ctaBoxW, ctaBoxH, 33);
    else ctx.rect(ctaBoxX, ctaBoxY, ctaBoxW, ctaBoxH);
    ctx.fill();

    const ctaGrad = ctx.createLinearGradient(ctaBoxX, ctaBoxY, ctaBoxX + ctaBoxW, ctaBoxY + ctaBoxH);
    ctaGrad.addColorStop(0, '#FF3366');
    ctaGrad.addColorStop(0.5, '#FFB6C1');
    ctaGrad.addColorStop(1, '#FF758C');
    ctx.strokeStyle = ctaGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ctaBoxX + 2, ctaBoxY + 2, ctaBoxW - 4, ctaBoxH - 4, 31);
    else ctx.rect(ctaBoxX + 2, ctaBoxY + 2, ctaBoxW - 4, ctaBoxH - 4);
    ctx.stroke();

    // Line 1: Primary Action
    ctx.font = '900 17px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FF758C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('TAP TO WATCH FULL REEL  ►', width / 2, ctaBoxY + 23);

    // Line 2: Follow for more
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.fillText(`FOLLOW @${cleanHandle} FOR MORE`, width / 2, ctaBoxY + 45);
    ctx.restore();
  } else if (isVideoEssay) {
    const ctaBoxW = Math.min(width - 80, Math.max(cardW - 40, 520));
    const ctaBoxH = 66;
    const ctaBoxX = Math.round((width - ctaBoxW) / 2);
    const ctaBoxY = Math.min(height - ctaBoxH - 96, cardY + cardH + 18);

    ctx.save();
    ctx.shadowColor = 'rgba(204, 255, 0, 0.50)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(12, 12, 16, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ctaBoxX, ctaBoxY, ctaBoxW, ctaBoxH, 33);
    else ctx.rect(ctaBoxX, ctaBoxY, ctaBoxW, ctaBoxH);
    ctx.fill();

    const ctaGrad = ctx.createLinearGradient(ctaBoxX, ctaBoxY, ctaBoxX + ctaBoxW, ctaBoxY + ctaBoxH);
    ctaGrad.addColorStop(0, '#CCFF00');
    ctaGrad.addColorStop(0.5, '#FFFFFF');
    ctaGrad.addColorStop(1, '#A6FF00');
    ctx.strokeStyle = ctaGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ctaBoxX + 2, ctaBoxY + 2, ctaBoxW - 4, ctaBoxH - 4, 31);
    else ctx.rect(ctaBoxX + 2, ctaBoxY + 2, ctaBoxW - 4, ctaBoxH - 4);
    ctx.stroke();

    // Line 1: Primary Action
    ctx.font = '900 17px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#CCFF00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText('TAP TO WATCH FULL REEL  ►', width / 2, ctaBoxY + 23);

    // Line 2: Follow for more build-up
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.fillText(`FOLLOW @${cleanHandle} FOR MORE DEEP KNOWLEDGE`, width / 2, ctaBoxY + 45);
    ctx.restore();
  } else {
    ctx.save();
    const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
    if (isClubbing) {
      ctaGrad.addColorStop(0, 'rgba(0, 255, 163, 0.95)');
      ctaGrad.addColorStop(1, 'rgba(0, 180, 110, 0.95)');
      ctx.shadowColor = 'rgba(0, 255, 163, 0.55)';
    } else if (isMovie) {
      ctaGrad.addColorStop(0, 'rgba(193, 18, 31, 0.90)');
      ctaGrad.addColorStop(1, 'rgba(120, 0, 0, 0.90)');
      ctx.shadowColor = 'rgba(193, 18, 31, 0.45)';
    } else {
      ctaGrad.addColorStop(0, 'rgba(247, 37, 133, 0.95)');
      ctaGrad.addColorStop(1, 'rgba(114, 9, 183, 0.95)');
      ctx.shadowColor = 'rgba(247, 37, 133, 0.65)';
    }
    ctx.shadowBlur = 18;
    ctx.fillStyle = ctaGrad;
    ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.5)' : (isMovie ? 'rgba(255, 215, 120, 0.5)' : 'rgba(0, 240, 255, 0.50)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
    else ctx.rect(ctaX, ctaY, ctaW, ctaH);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isClubbing ? '#051209' : '#FFFFFF';
    ctx.font = '900 19px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    if (isClubbing) {
      ctx.fillText('Watch Live Set  >', width / 2, ctaY + ctaH / 2);
    } else if (isMovie) {
      ctx.fillText('Watch Full Scene  >', width / 2, ctaY + ctaH / 2);
    } else {
      ctx.fillText('Watch Full Reel  >', width / 2, ctaY + ctaH / 2);
    }
  }

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `story_overlay_${cleanHandle || 'default'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
}

/**
 * Generates sleek GTA VI Identity Watermark Badge for Feed Reels/Posts
 */
function generateFeedWatermark(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const w = 340;
  const h = 72;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || 'gta6_updates_007').replace(/^@/, '');
  const isClubbing = cleanHandle.includes('club') || options.theme === 'clubbing' || options.page?.slug === 'clubbing';
  const isMovie = cleanHandle.includes('movie') || options.theme === 'movies' || options.page?.slug === 'movies';

  ctx.save();
  ctx.fillStyle = isClubbing ? 'rgba(4, 18, 10, 0.88)' : (isMovie ? 'rgba(12, 10, 14, 0.88)' : 'rgba(13, 2, 33, 0.78)');
  ctx.shadowColor = isClubbing ? 'rgba(0, 255, 163, 0.65)' : (isMovie ? 'rgba(255, 183, 3, 0.65)' : 'rgba(247, 37, 133, 0.5)');
  ctx.shadowBlur = 12;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, w, h, 36);
  } else {
    ctx.rect(0, 0, w, h);
  }
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  if (isClubbing) {
    borderGrad.addColorStop(0, '#00FFA3');
    borderGrad.addColorStop(0.5, '#00E5FF');
    borderGrad.addColorStop(1, '#39FF14');
  } else if (isMovie) {
    borderGrad.addColorStop(0, '#FFD166');
    borderGrad.addColorStop(0.5, '#FFB703');
    borderGrad.addColorStop(1, '#C1121F');
  } else {
    borderGrad.addColorStop(0, '#00F0FF');
    borderGrad.addColorStop(0.5, '#F72585');
    borderGrad.addColorStop(1, '#FF8A00');
  }
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Monogram / Brand tag
  ctx.fillStyle = isClubbing ? '#00FFA3' : (isMovie ? '#FFD166' : '#F72585');
  ctx.font = '900 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const monogram = isClubbing ? 'CC' : (isMovie ? '365' : 'VI');
  ctx.fillText(monogram, 18, h / 2);

  // Separator bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(64, 16, 1.5, 40);

  // Handle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`@${cleanHandle}`, 78, h / 2);

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const watermarkPath = path.join(genDir, `feed_watermark_${cleanHandle || 'default'}.png`);
  fs.writeFileSync(watermarkPath, canvas.toBuffer('image/png'));
  return watermarkPath;
}

/**
 * Applies subtle branded identity watermark to Feed Reel MP4
 */
async function applyBrandedFeedOverlay(inputVideoPath, options = {}) {
  if (!inputVideoPath) throw new Error('No input video path for watermark');

  let absPath = inputVideoPath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputVideoPath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) absPath = candidate;
  }
  if (!fs.existsSync(absPath)) throw new Error(`Video not found: ${absPath}`);

  const handle = (options.handle || 'gta6_updates_007').replace(/^@+/, '');
  const watermarkPngPath = generateFeedWatermark(handle, options);

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const brandedOutput = path.join(dir, `${base}_branded.mp4`);

  return new Promise((resolve) => {
    // Top-right corner with 40px padding
    const args = [
      '-y',
      '-i', absPath,
      '-i', watermarkPngPath,
      '-filter_complex', '[0:v][1:v]overlay=main_w-overlay_w-40:80[outv]',
      '-map', '[outv]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      brandedOutput
    ];

    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(brandedOutput)) {
        console.log(`[FFmpeg Helper] ✅ Branded Feed Reel generated: ${brandedOutput}`);
        resolve(brandedOutput);
      } else {
        console.warn(`[FFmpeg Helper] ⚠️ Watermark overlay exited with code ${code}, falling back to original video`);
        resolve(inputVideoPath);
      }
    });
    proc.on('error', (err) => {
      console.warn(`[FFmpeg Helper] Watermark overlay spawn error: ${err.message}, falling back to original`);
      resolve(inputVideoPath);
    });
  });
}

/**
 * Draws a chamfered polygon (rectangle with cut 45-degree corners)
 */
function drawChamferedRect(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

/**
 * Draws a diamond node
 */
function drawDiamond(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
}

/**
 * Generates the authentic Cyberpunk HUD Frame Template for Clubbing Cult (@clubbingcult)
 * Features:
 * - Chamfered Top HUD Badge with C L U B B I N G   C U L T and diamond node connector lines
 * - Heavy Corner Registration L-Brackets (Top/Bottom/Left/Right)
 * - Dual neon green chamfered video frame cutout
 * - Vertical technical side rails: "CLUBBING CULT • OFFICIAL" & "LIVE SETS • PERFORMANCES"
 * - Bottom divider with centered diamond node, ● LIVE pulse dot, @CLUBBINGCULT, and NIGHTLIFE tags
 * - Deep obsidian void with ambient neon dot matrix grid
 */
async function generateClubbingCyberOverlay(handle, options = {}) {
  const cleanHandle = (handle || 'clubbingcult').replace(/^@/, '');
  const isVertical = options.isVertical !== undefined ? options.isVertical : true;
  const {
    cardW = isVertical ? 828 : 920,
    cardH = isVertical ? 1472 : 518,
    cardX = isVertical ? 126 : 80,
    cardY = isVertical ? 215 : 701,
  } = options;

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const neonGreen = '#00FFA3';
  const neonLime = '#39FF14';
  const darkBg = '#030604';

  // 1. Dark ambient background
  ctx.fillStyle = darkBg;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle dot matrix grid in the background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 255, 163, 0.08)';
  const gridSpacing = 38;
  for (let gx = 30; gx < width; gx += gridSpacing) {
    for (let gy = 30; gy < height; gy += gridSpacing) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. Clear cutout where video plays (chamfered window)
  const cutSize = isVertical ? 28 : 20;
  ctx.save();
  drawChamferedRect(ctx, cardX, cardY, cardW, cardH, cutSize);
  ctx.clip();
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  // 4. Double neon green chamfered border
  ctx.save();
  ctx.shadowColor = 'rgba(0, 255, 163, 0.75)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = 2.5;
  drawChamferedRect(ctx, cardX, cardY, cardW, cardH, cutSize);
  ctx.stroke();

  // Inner hairline rail
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.45)';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, cardX + 6, cardY + 6, cardW - 12, cardH - 12, Math.max(8, cutSize - 4));
  ctx.stroke();
  ctx.restore();

  // 5. Four Heavy Corner Registration L-Brackets
  const bMargin = 12;
  const bLen = isVertical ? 58 : 45;
  const bThick = 4.5;

  ctx.save();
  ctx.shadowColor = '#00FFA3';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = bThick;
  ctx.lineCap = 'square';

  // TL
  ctx.beginPath();
  ctx.moveTo(cardX - bMargin, cardY - bMargin + bLen);
  ctx.lineTo(cardX - bMargin, cardY - bMargin);
  ctx.lineTo(cardX - bMargin + bLen, cardY - bMargin);
  ctx.stroke();

  // TR
  ctx.beginPath();
  ctx.moveTo(cardX + cardW + bMargin - bLen, cardY - bMargin);
  ctx.lineTo(cardX + cardW + bMargin, cardY - bMargin);
  ctx.lineTo(cardX + cardW + bMargin, cardY - bMargin + bLen);
  ctx.stroke();

  // BL
  ctx.beginPath();
  ctx.moveTo(cardX - bMargin, cardY + cardH + bMargin - bLen);
  ctx.lineTo(cardX - bMargin, cardY + cardH + bMargin);
  ctx.lineTo(cardX - bMargin + bLen, cardY + cardH + bMargin);
  ctx.stroke();

  // BR
  ctx.beginPath();
  ctx.moveTo(cardX + cardW + bMargin - bLen, cardY + cardH + bMargin);
  ctx.lineTo(cardX + cardW + bMargin, cardY + cardH + bMargin);
  ctx.lineTo(cardX + cardW + bMargin, cardY + cardH + bMargin - bLen);
  ctx.stroke();
  ctx.restore();

  // 6. Top HUD Header Badge: Prominently displays Logo + Page Name + Handle
  const brandingDir = path.join(__dirname, '..', '..', 'public', 'branding');
  const candidateAvatarPaths = [
    options.avatarPath,
    options.page?.avatar_path,
    options.page?.brand_logo_path,
    path.join(brandingDir, `${cleanHandle}_avatar.png`),
    path.join(brandingDir, `${cleanHandle}_avatar.jpg`),
    path.join(brandingDir, 'clubbingcult_avatar.png'),
    path.join(brandingDir, 'clubbing_avatar.png'),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.png`),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.jpg`)
  ].filter(Boolean);
  const existingAvatarPath = candidateAvatarPaths.find(p => fs.existsSync(p));

  const rawClubName = (options.pageName || options.page?.name || cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).trim();
  const rawHandle = options.page?.handle || cleanHandle;
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;

  // Measure content widths
  ctx.save();
  ctx.font = '900 24px RobotoBlack, "Arial Black", Arial, sans-serif';
  const nameW = ctx.measureText(rawClubName).width;
  ctx.font = 'bold 20px RobotoMedium, Arial, sans-serif';
  const sepW = ctx.measureText('  |  ').width;
  ctx.font = 'bold 22px RobotoBold, Arial, sans-serif';
  const handleW = ctx.measureText(displayHandle).width;
  ctx.restore();

  const avSize = 42;
  const avGap = 16;
  const innerPadX = 24;
  const totalContentW = avSize + avGap + nameW + sepW + handleW;

  // Elevate top box upwards as requested: floats cleanly at Y=88-92 with clear space before video at cardY
  const headerY = isVertical ? Math.max(76, Math.min(92, cardY - 118)) : Math.max(70, cardY - 98);
  const badgeW = Math.min(width - 60, Math.max(isVertical ? 580 : 660, totalContentW + innerPadX * 2));
  const badgeH = isVertical ? 64 : 68;
  const badgeX = Math.round((width - badgeW) / 2);
  const headerCut = isVertical ? 15 : 16;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 8, 4, 0.95)';
  drawChamferedRect(ctx, badgeX, headerY, badgeW, badgeH, headerCut);
  ctx.fill();

  ctx.shadowColor = 'rgba(0, 255, 163, 0.85)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = 2.5;
  drawChamferedRect(ctx, badgeX, headerY, badgeW, badgeH, headerCut);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.5)';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, badgeX + 4, headerY + 4, badgeW - 8, badgeH - 8, headerCut - 2);
  ctx.stroke();

  // Content start X
  const contentStartX = badgeX + (badgeW - totalContentW) / 2;
  const badgeCenterY = headerY + badgeH / 2;

  // Draw Avatar / Monogram Logo on left
  const avX = contentStartX;
  const avY = badgeCenterY - avSize / 2;
  const avCx = avX + avSize / 2;
  const avCy = badgeCenterY;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avCx, avCy, avSize / 2, 0, Math.PI * 2);
  ctx.clip();

  if (existingAvatarPath) {
    try {
      const avatarImg = await loadImage(existingAvatarPath);
      ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
    } catch (_) {
      ctx.fillStyle = '#06160C';
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#06160C';
    ctx.fill();
    ctx.fillStyle = neonGreen;
    ctx.font = '900 18px RobotoBlack, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = rawClubName.split(/\s+/).filter(Boolean);
    const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
    ctx.fillText(initials || 'CP', avCx, avCy);
  }
  ctx.restore();

  // Neon Avatar Outline Ring
  ctx.save();
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00FFA3';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(avCx, avCy, avSize / 2 + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Draw Page Name + Separator + Handle
  let textX = avX + avSize + avGap;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Page Name in bold crisp white
  ctx.font = '900 24px RobotoBlack, "Arial Black", Arial, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 255, 163, 0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(rawClubName, textX, badgeCenterY + 1);
  textX += nameW;

  // Separator in neon cyan
  ctx.font = 'bold 20px RobotoMedium, Arial, sans-serif';
  ctx.fillStyle = 'rgba(0, 255, 163, 0.55)';
  ctx.shadowBlur = 0;
  ctx.fillText('  |  ', textX, badgeCenterY + 1);
  textX += sepW;

  // Handle in electric neon lime
  ctx.font = 'bold 22px RobotoBold, Arial, sans-serif';
  ctx.fillStyle = neonLime;
  ctx.shadowColor = 'rgba(57, 255, 20, 0.7)';
  ctx.shadowBlur = 8;
  ctx.fillText(displayHandle, textX, badgeCenterY + 1);

  ctx.restore();
  ctx.restore();

  // Flanking horizontal connector lines with diamond nodes
  const lineY = headerY + badgeH / 2;
  ctx.save();
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(0, 255, 163, 0.7)';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(cardX - bMargin, lineY);
  ctx.lineTo(badgeX - 12, lineY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(badgeX + badgeW + 12, lineY);
  ctx.lineTo(cardX + cardW + bMargin, lineY);
  ctx.stroke();

  ctx.fillStyle = neonGreen;
  drawDiamond(ctx, cardX - bMargin, lineY, 5);
  ctx.fill();
  drawDiamond(ctx, badgeX - 12, lineY, 4);
  ctx.fill();
  drawDiamond(ctx, badgeX + badgeW + 12, lineY, 4);
  ctx.fill();
  drawDiamond(ctx, cardX + cardW + bMargin, lineY, 5);
  ctx.fill();
  ctx.restore();

  // 7. Side Vertical Text Rails (Left & Right)
  ctx.save();
  ctx.font = 'bold 14px "Courier New", monospace, sans-serif';
  ctx.fillStyle = 'rgba(0, 255, 163, 0.40)';
  ctx.shadowColor = 'rgba(0, 255, 163, 0.3)';
  ctx.shadowBlur = 4;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerY = cardY + cardH / 2;
  const leftX = Math.max(30, (cardX - bMargin) / 2);
  const sideBrand = rawClubName.toUpperCase().split('').join(' ') + '   •   O F F I C I A L';
  ctx.save();
  ctx.translate(leftX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(sideBrand, 0, 0);
  ctx.restore();

  const rightX = Math.min(width - 30, width - (cardX - bMargin) / 2);
  ctx.save();
  ctx.translate(rightX, centerY);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('L I V E   S E T S   •   P E R F O R M A N C E S', 0, 0);
  ctx.restore();
  ctx.restore();

  // 8. Bottom Footer Section (Shifted up with template, center kept clear for IG caption)
  const footerLineY = isVertical ? (cardY + cardH + bMargin + 26) : Math.min(1820, cardY + cardH + bMargin + 40);

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0, 255, 163, 0.5)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(cardX - bMargin, footerLineY);
  ctx.lineTo(width / 2 - 20, footerLineY);
  ctx.moveTo(width / 2 + 20, footerLineY);
  ctx.lineTo(cardX + cardW + bMargin, footerLineY);
  ctx.stroke();

  ctx.fillStyle = neonGreen;
  drawDiamond(ctx, width / 2, footerLineY, 5);
  ctx.fill();
  ctx.restore();

  const footerTextY = footerLineY + (isVertical ? 26 : 36);

  // Left: ● LIVE
  ctx.save();
  ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
  ctx.fillStyle = 'rgba(0, 255, 163, 0.55)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  ctx.shadowColor = neonLime;
  ctx.shadowBlur = 8;
  ctx.fillStyle = neonLime;
  ctx.beginPath();
  ctx.arc(cardX - bMargin + 6, footerTextY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0, 255, 163, 0.60)';
  ctx.fillText('  LIVE', cardX - bMargin + 14, footerTextY);

  // Center: Only for landscape/square. For 9:16 vertical, kept CLEAR as requested by user!
  if (!isVertical) {
    ctx.font = '900 18px RobotoBlack, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = neonGreen;
    ctx.shadowColor = 'rgba(0, 255, 163, 0.75)';
    ctx.shadowBlur = 10;
    const botHandleTag = '@ ' + displayHandle.replace(/^@/, '').toUpperCase().split('').join(' ');
    ctx.fillText(botHandleTag, width / 2, footerTextY);
  }

  // Right: NIGHTLIFE
  ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0, 255, 163, 0.55)';
  ctx.shadowBlur = 0;
  ctx.fillText('N I G H T L I F E', cardX + cardW + bMargin, footerTextY);
  ctx.restore();

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `feed_frame_overlay_${cleanHandle || 'clubbingcult'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Calculates optimal brand highlight count based on headline word length
 * Ensures generous brand color proportion:
 * - 4 to 6 words: 2 highlighted words (~35-50%)
 * - 7 to 8 words: 3 highlighted words (~38-43%)
 * - 9 to 11 words: 4 highlighted words (~36-44%)
 * - 12 to 14 words: 5 highlighted words (~36-42%)
 * - 15+ words: 6 highlighted words (capped at 6)
 */
function getTargetHighlightCount(totalWords) {
  if (totalWords <= 3) return Math.min(1, totalWords);
  if (totalWords <= 6) return 2;
  if (totalWords <= 8) return 3;
  if (totalWords <= 11) return 4;
  if (totalWords <= 14) return 5;
  return Math.min(6, Math.max(5, Math.round(totalWords * 0.38)));
}

/**
 * Checks if a token can be highlighted without creating a run of more than maxRun adjacent highlights
 */
function canHighlightWithoutExceedingMaxRun(tokens, idx, maxRun = 2) {
  let left = 0;
  for (let i = idx - 1; i >= 0 && tokens[i]?.highlight; i--) left++;
  let right = 0;
  for (let i = idx + 1; i < tokens.length && tokens[i]?.highlight; i++) right++;
  return (left + 1 + right) <= maxRun;
}

/**
 * Tokenizes headline text supporting explicit markdown (**highlighted**)
 * as well as smart automatic keyword/number highlighting in Cult brand colors (#CCFF00).
 * Guarantees balanced, dynamic color highlighting across all new reels.
 */
function parseHeadlineTokens(rawHeadline) {
  if (!rawHeadline) return [];
  let clean = rawHeadline
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\*\*\s+([.,;:!?])/g, '**$1')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/^["'“”\s]+/, '')
    .replace(/["'“”\s]+$/, '')
    .trim();

  // Normalize touching markdown boundaries:
  // 1. Quad asterisks or more: `****` -> `** **` (e.g. `**56m****52s**` -> `**56m** **52s**`)
  clean = clean.replace(/\*{4,}/g, '** **');
  // 2. Triple asterisks: `***` -> `**`
  clean = clean.replace(/\*{3}/g, '**');
  // 3. Glued opening asterisks preceded by alphanumeric: `hs**56m` -> `hs **56m`
  clean = clean.replace(/([a-zA-Z0-9$%])\*\*([^\s*]+)/g, '$1 **$2');
  // 4. Glued closing asterisks followed by alphanumeric: `56m**next` -> `56m** next`
  clean = clean.replace(/([^\s*]+)\*\*([a-zA-Z0-9$%])/g, '$1** $2');
  clean = clean.replace(/\s+/g, ' ').trim();

  const stopWords = new Set([
    'a','an','the','about','above','after','again','against','all','also','and','any',
    'are','as','at','be','because','been','before','being','below','between','both',
    'but','by','came','can','cant','cannot','come','could','did','do','does','doing',
    'down','during','each','even','ever','every','for','from','further','get','got',
    'had','has','have','having','he','her','here','hers','herself','him','himself',
    'his','how','i','if','in','into','is','it','its','itself','just','leave','let',
    'me','more','most','much','my','myself','no','nor','not','of','off','on','once',
    'only','or','other','ought','our','ours','ourselves','out','over','own','same',
    'she','should','so','some','someone','something','started','such','than','that',
    'theirs','them','themselves','then','there','these','they','this','those',
    'through','to','too','under','until','up','very','was','wasnt','we','were','werent',
    'what','when','where','which','while','who','whom','why','will','with','wont',
    'would','wouldnt','you','your','yours','yourself','yourselves'
  ]);

  const viralPattern = /^(\$?\d[\d,\.]*(?:[%xXkKmMbBtTsS]|th|rd|st|nd)?(?:-[a-zA-Z0-9]+)?|\d+[-a-zA-Z0-9]+|world's|first|secret|secrets|unveiled|revealed|exposed|shocking|banned|billionaires|billionaire|anthem|satire|record|million|billion|trillion|hundred|blackwell|breakthrough|warning|mystery|truth|danger|leaked|classified|impossible|ai|robot|robots|robotic|arms|algae|beat|players|table|tennis|moves|move|revolution|future|underground|ocean|antarctic|human|quantum|overheating|supercluster|living|organism|organisms|brain|engine|supercomputer|discovery|discovered|intelligence)$/i;

  const hasExplicitMarkup = /\*\*.*?\*\*|\*.*?\*|<hl>.*?<\/hl>/.test(clean);
  const tokens = [];

  if (hasExplicitMarkup) {
    const regex = /(\*\*([^*]+)\*\*([.,;:!?]*)|<hl>([^<]+)<\/hl>([.,;:!?]*)|\S+)/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      if (match[2]) {
        const punct = match[3] || '';
        const words = match[2].trim().split(/\s+/);
        words.forEach((w, idx) => {
          tokens.push({ text: idx === words.length - 1 ? (w + punct) : w, highlight: true });
        });
      } else if (match[4]) {
        const punct = match[5] || '';
        const words = match[4].trim().split(/\s+/);
        words.forEach((w, idx) => {
          tokens.push({ text: idx === words.length - 1 ? (w + punct) : w, highlight: true });
        });
      } else {
        tokens.push({ text: match[0], highlight: false });
      }
    }

    // Dynamic brand color augmentation:
    // If explicit markup highlighted fewer words than targetHighlights, augment key content words!
    let currentHighlights = tokens.filter(t => t.highlight).length;
    const targetHighlights = getTargetHighlightCount(tokens.length);

    if (currentHighlights < targetHighlights) {
      const candidates = [];
      tokens.forEach((t, idx) => {
        if (!t.highlight) {
          const cleanW = t.text.replace(/^[^a-zA-Z0-9$]+|[^a-zA-Z0-9%]+$/g, '');
          const lower = cleanW.toLowerCase();
          let score = cleanW.length;
          if (viralPattern.test(cleanW)) score += 100;
          if (stopWords.has(lower)) score = -100;
          if (cleanW.length < 3) score = -50;
          if (cleanW && cleanW[0] === cleanW[0].toUpperCase() && cleanW[0] !== cleanW[0].toLowerCase()) score += 10;
          if (score > 0) {
            candidates.push({ idx, score, text: t.text });
          }
        }
      });

      candidates.sort((a, b) => b.score - a.score);

      // Pass A: Candidates that do not exceed maxRun of 2 consecutive highlights
      for (const cand of candidates) {
        if (currentHighlights >= targetHighlights) break;
        if (canHighlightWithoutExceedingMaxRun(tokens, cand.idx, 2)) {
          tokens[cand.idx].highlight = true;
          currentHighlights++;
        }
      }

      // Pass B: If still under target, pick remaining candidates
      if (currentHighlights < targetHighlights) {
        for (const cand of candidates) {
          if (currentHighlights >= targetHighlights) break;
          if (!tokens[cand.idx].highlight) {
            tokens[cand.idx].highlight = true;
            currentHighlights++;
          }
        }
      }
    }
  } else {
    // Smart auto-highlighting: numbers, currencies, percentages, and high-impact viral trigger words
    const words = clean.split(/\s+/);
    const targetHighlights = getTargetHighlightCount(words.length);
    let highlightCount = 0;

    const tokenList = words.map(w => {
      const cleanW = w.replace(/^[^a-zA-Z0-9$]+|[^a-zA-Z0-9%]+$/g, '');
      return { text: w, highlight: false, cleanW, lower: cleanW.toLowerCase() };
    });

    // Score all words
    const candidates = [];
    tokenList.forEach((t, idx) => {
      let score = t.cleanW.length;
      if (viralPattern.test(t.cleanW)) score += 100;
      if (stopWords.has(t.lower)) score = -100;
      if (t.cleanW.length < 3) score = -50;
      if (t.cleanW && t.cleanW[0] === t.cleanW[0].toUpperCase() && t.cleanW[0] !== t.cleanW[0].toLowerCase()) score += 10;
      if (score > 0) candidates.push({ idx, score });
    });

    candidates.sort((a, b) => b.score - a.score);

    // Pass 1: High-scoring candidates respecting maxRun of 2
    for (const cand of candidates) {
      if (highlightCount >= targetHighlights) break;
      if (canHighlightWithoutExceedingMaxRun(tokenList, cand.idx, 2)) {
        tokenList[cand.idx].highlight = true;
        highlightCount++;
      }
    }

    // Pass 2: Remaining candidates if needed
    if (highlightCount < targetHighlights) {
      for (const cand of candidates) {
        if (highlightCount >= targetHighlights) break;
        if (!tokenList[cand.idx].highlight) {
          tokenList[cand.idx].highlight = true;
          highlightCount++;
        }
      }
    }

    // Pass 3: Safety guarantee for short headlines
    if (highlightCount < Math.min(2, tokenList.length)) {
      for (let i = tokenList.length - 1; i >= 0; i--) {
        if (highlightCount >= Math.min(2, tokenList.length)) break;
        if (!tokenList[i].highlight && !stopWords.has(tokenList[i].lower)) {
          tokenList[i].highlight = true;
          highlightCount++;
        }
      }
    }

    tokens.push(...tokenList.map(t => ({ text: t.text, highlight: t.highlight })));
  }

  // Absolute typography safety: strip any dangling asterisks or brackets from token text
  // Guarantees literal asterisks can NEVER be drawn to the canvas under any edge case!
  const sanitizedTokens = [];
  for (const t of tokens) {
    const textClean = t.text.replace(/[\*<>]+/g, '').trim();
    if (textClean.length > 0) {
      sanitizedTokens.push({ text: textClean, highlight: t.highlight });
    }
  }

  return sanitizedTokens;
}

function wrapTokens(ctx, tokens, maxWidth) {
  if (!tokens || tokens.length === 0) return [];
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;
  const spaceWidth = ctx.measureText(' ').width;

  for (const token of tokens) {
    const tokenWidth = ctx.measureText(token.text).width;
    const addedWidth = currentLine.length > 0 ? (spaceWidth + tokenWidth) : tokenWidth;

    if (currentLine.length > 0 && (currentWidth + addedWidth) > maxWidth) {
      lines.push(currentLine);
      currentLine = [token];
      currentWidth = tokenWidth;
    } else {
      currentLine.push(token);
      currentWidth += addedWidth;
    }
  }

  if (currentLine.length > 0) lines.push(currentLine);

  // Anti-orphan rule: If the last line has only 1 word and previous line has > 2 words,
  // pull the last word from the previous line to form a balanced couplet!
  if (lines.length > 1) {
    const lastLine = lines[lines.length - 1];
    const prevLine = lines[lines.length - 2];
    if (lastLine.length === 1 && prevLine.length > 2) {
      const moved = prevLine.pop();
      lastLine.unshift(moved);
    }
  }

  return lines;
}

function drawVerifiedBadge(ctx, x, y, size = 24) {
  ctx.save();
  ctx.fillStyle = '#0095F6'; // Instagram verified blue
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Crisp white checkmark
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.52);
  ctx.lineTo(x + size * 0.44, y + size * 0.68);
  ctx.lineTo(x + size * 0.74, y + size * 0.34);
  ctx.stroke();
  ctx.restore();
}

/**
 * Detects whether an incoming 9:16 vertical video is pre-formatted
 * with black letterboxing / competitor header card (e.g. from @evolving.ai).
 */
async function isLetterboxedReel(videoOrImagePath) {
  try {
    let framePath = videoOrImagePath;
    let tempFrame = false;

    if (videoOrImagePath.endsWith('.mp4') || videoOrImagePath.endsWith('.mov') || videoOrImagePath.endsWith('.mkv')) {
      const publicDir = path.join(__dirname, '..', '..', 'public');
      const genDir = path.join(publicDir, 'generated');
      if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
      framePath = path.join(genDir, `inspect_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      execSync(`ffmpeg -y -ss 00:00:01 -i "${videoOrImagePath}" -vframes 1 -q:v 3 "${framePath}"`, { stdio: 'ignore' });
      tempFrame = true;
    }

    if (!fs.existsSync(framePath)) return false;

    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const img = await loadImage(framePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let topBrightnessSum = 0;
    let samplePoints = 0;
    const yTop = Math.floor(img.height * 0.04);

    for (const xFrac of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const x = Math.floor(img.width * xFrac);
      const pixel = ctx.getImageData(x, yTop, 1, 1).data;
      const brightness = (pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114);
      topBrightnessSum += brightness;
      samplePoints++;
    }

    if (tempFrame && fs.existsSync(framePath)) {
      try { fs.unlinkSync(framePath); } catch (e) {}
    }

    const avgTopBrightness = topBrightnessSum / samplePoints;
    return avgTopBrightness < 25;
  } catch (err) {
    return false;
  }
}

/**
 * Detects the active video rectangle inside an incoming reel,
 * distinguishing actual moving video content from letterbox black bands and floating competitor text.
 * @param {string} videoOrImagePath - Path to video or frame image
 * @returns {Promise<{ isLetterboxed: boolean, startY: number, endY: number, height: number, totalHeight: number }>}
 */
async function detectActiveVideoBounds(videoOrImagePath) {
  let framePath = videoOrImagePath;
  let tempFrame = false;

  if (!videoOrImagePath || !fs.existsSync(videoOrImagePath)) {
    return { isLetterboxed: false, startY: 0, endY: 1920, height: 1920, totalHeight: 1920 };
  }

  try {
    const ext = path.extname(videoOrImagePath).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);
    if (isVideo) {
      const publicDir = path.join(__dirname, '..', '..', 'public');
      const genDir = path.join(publicDir, 'generated');
      if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
      framePath = path.join(genDir, `bounds_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      execSync(`ffmpeg -y -ss 00:00:01.500 -i "${videoOrImagePath}" -vframes 1 -q:v 3 "${framePath}"`, { stdio: 'ignore', timeout: 8000 });
      tempFrame = true;
    }

    if (!fs.existsSync(framePath)) {
      return { isLetterboxed: false, startY: 0, endY: 1920, height: 1920, totalHeight: 1920 };
    }

    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const img = await loadImage(framePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const startX = Math.floor(img.width * 0.15);
    const endX = Math.floor(img.width * 0.85);
    const sampleW = endX - startX;

    // Scan horizontal lines across height
    const rowBrightness = [];
    for (let y = 0; y < img.height; y++) {
      let sum = 0;
      for (let x = startX; x < endX; x += 4) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        sum += (p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114);
      }
      rowBrightness.push(sum / (sampleW / 4));
    }

    // Group rows into continuous spans
    const spans = [];
    let currentSpan = null;
    for (let y = 0; y < img.height; y++) {
      const isBright = rowBrightness[y] > 4.0;
      if (isBright) {
        if (!currentSpan) {
          currentSpan = { startY: y, endY: y, maxB: rowBrightness[y] };
        } else {
          currentSpan.endY = y;
          currentSpan.maxB = Math.max(currentSpan.maxB, rowBrightness[y]);
        }
      } else {
        if (currentSpan) {
          currentSpan.height = currentSpan.endY - currentSpan.startY + 1;
          spans.push(currentSpan);
          currentSpan = null;
        }
      }
    }
    if (currentSpan) {
      currentSpan.height = currentSpan.endY - currentSpan.startY + 1;
      spans.push(currentSpan);
    }

    // A real video must be at least 15% of total frame height (floating text lines are 1-4%)
    const minVideoHeight = img.height * 0.15;
    const videoSpans = spans.filter(s => s.height >= minVideoHeight);

    if (videoSpans.length === 0) {
      return { isLetterboxed: false, startY: 0, endY: img.height, height: img.height, totalHeight: img.height };
    }

    // Pick the largest span as the primary video content
    videoSpans.sort((a, b) => b.height - a.height);
    const primary = videoSpans[0];

    // If primary video spans >= 85% of total height, it's a full-frame video
    const isLetterboxed = primary.height < (img.height * 0.85);

    return {
      isLetterboxed,
      startY: primary.startY,
      endY: primary.endY,
      height: primary.height,
      totalHeight: img.height
    };
  } catch (err) {
    console.warn(`[FFmpeg Helper] Video bounds detection notice: ${err.message}`);
    return { isLetterboxed: false, startY: 0, endY: 1920, height: 1920, totalHeight: 1920 };
  } finally {
    if (tempFrame && fs.existsSync(framePath)) {
      try { fs.unlinkSync(framePath); } catch (_) {}
    }
  }
}

/**
 * Generates the authentic Evolving AI & Cult Information Video-Essay Overlay
 * Solid black 1080x1920 canvas with:
 * - Prominent 92px circular brand avatar + bold page name + verified blue badge + handle
 * - Bold 46px viral headline hook with brand lime accent word highlighting
 * - Transparent cutout for centered video content
 * - Clean solid black safe margins at bottom for Instagram native UI
 */
async function generateEvolvingAiOverlay(handle, options = {}) {
  const cleanHandle = (handle || options.page?.handle || 'cult_information').replace(/^@+/, '');
  const rawPageName = (options.pageName || options.page?.name || cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).trim();
  const pageName = rawPageName.replace(/^@+/, '');

  let rawHookCandidate = (options.hookHeadline || options.headline || '').trim();
  try {
    const { isCompetitorAccountName } = require('../core/videoVisionService');
    if (!rawHookCandidate || isCompetitorAccountName(rawHookCandidate.replace(/\*\*/g, '')) || rawHookCandidate.split(/\s+/).length < 3) {
      rawHookCandidate = 'Breakthrough technology is evolving faster than anyone expected';
    }
  } catch (_) {
    if (!rawHookCandidate || rawHookCandidate.split(/\s+/).length < 3) {
      rawHookCandidate = 'Breakthrough technology is evolving faster than anyone expected';
    }
  }
  const hookHeadline = rawHookCandidate;
  const {
    cardX = 0,
    cardY = 640,
    cardW = 1080,
    cardH = 608
  } = options;

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Solid pitch black background (pure #000000)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 2. Clear cutout where the video plays cleanly without borders
  ctx.clearRect(cardX, cardY, cardW, cardH);

  // 3. Ergonomic & Responsive Layout
  const marginX = 64;
  const maxTextWidth = 950; // Optimized wide, screen-filling hook without touching side edges (65px margins)
  const spaceAboveVideo = 26; // Snug, ergonomic breathing room right above video card
  const spaceBetweenHeaderAndHeadline = 24;

  const headerAlign = options.headerAlign || options.page?.header_align || 'center';
  const isCentered = headerAlign === 'center';
  const avatarSize = 98; // Prominent, clear 98px avatar diameter (bigger and clearer)

  const cleanHeadline = (hookHeadline || 'Breakthrough AI technology is evolving faster than anyone expected')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”\s]+/, '')
    .replace(/["'“”\s]+$/, '')
    .trim();

  const tokens = parseHeadlineTokens(cleanHeadline);

  // Dynamic Single-Line Priority Scaling & Balanced Anti-Orphan Layout
  // Check if headline can fit on ONE single line by smoothly scaling font size [54px down to 40px]
  let fontSize = 54;
  let lines = null;

  for (let candidateFs = 54; candidateFs >= 40; candidateFs -= 2) {
    ctx.font = `800 ${candidateFs}px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    const spaceWidth = ctx.measureText(' ').width;
    let singleLineWidth = 0;
    for (let i = 0; i < tokens.length; i++) {
      singleLineWidth += ctx.measureText(tokens[i].text).width + (i > 0 ? spaceWidth : 0);
    }
    if (singleLineWidth <= maxTextWidth) {
      fontSize = candidateFs;
      lines = [tokens]; // Perfectly fits on ONE single enhanced line!
      break;
    }
  }

  // If text is genuinely long (> 50 chars or > 10 words) and cannot fit on 1 line even at 40px,
  // use balanced multi-line wrapping with strict anti-orphan protection
  if (!lines) {
    const wordsCount = tokens.length;
    if (cleanHeadline.length > 85 || wordsCount > 17) {
      fontSize = 42;
    } else if (cleanHeadline.length > 70 || wordsCount > 14) {
      fontSize = 46;
    } else {
      fontSize = 48;
    }
    ctx.font = `800 ${fontSize}px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    lines = wrapTokens(ctx, tokens, maxTextWidth);
  }

  const lineHeight = Math.round(fontSize * 1.22); // Clean optical vertical rhythm
  const totalTextHeight = lines.length * lineHeight;
  const totalBrandingHeight = avatarSize + spaceBetweenHeaderAndHeadline + totalTextHeight;

  // 4. Flexible Dynamic Positioning based on Video Bounds (cardY)
  // Anchors right above video card ("a little bit bottom") rather than being pinned to the top!
  const minSafeTopMargin = 120; // Safe clearance below Instagram's top chrome
  let headerTopY;
  let headlineY;

  if (options.headerTopY !== undefined && options.headlineY !== undefined) {
    headerTopY = options.headerTopY;
    headlineY = options.headlineY;
  } else {
    const idealTopY = cardY - spaceAboveVideo - totalBrandingHeight;
    if (idealTopY >= minSafeTopMargin) {
      if (cardY > 600) {
        // When cardY is low (e.g. 16:9 landscape at cardY=656), weight 75% toward video so branding sits comfortably bottom
        const availableSpace = cardY - spaceAboveVideo - minSafeTopMargin;
        headerTopY = minSafeTopMargin + Math.round((availableSpace - totalBrandingHeight) * 0.75);
      } else {
        // For 1:1 square video (cardY=420) and 9:16 vertical card (cardY=520), place comfortably right above video!
        headerTopY = idealTopY;
      }
    } else {
      headerTopY = Math.max(90, cardY - spaceAboveVideo - totalBrandingHeight);
    }
    headlineY = headerTopY + avatarSize + spaceBetweenHeaderAndHeadline;
  }

  const brandingDir = path.join(__dirname, '..', '..', 'public', 'branding');
  const candidateAvatarPaths = [
    options.avatarPath,
    options.page?.avatar_path,
    options.page?.brand_logo_path,
    path.join(brandingDir, `${cleanHandle}_avatar.png`),
    path.join(brandingDir, `${cleanHandle}_avatar.jpg`),
    path.join(brandingDir, 'cult_information_avatar.png'),
    path.join(brandingDir, 'cult_information_avatar.jpg'),
    path.join(brandingDir, 'cult_information_logo_master.png'),
    path.join(brandingDir, 'cult_avatar.png'),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.png`),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.jpg`)
  ].filter(Boolean);

  const existingAvatarPath = candidateAvatarPaths.find(p => fs.existsSync(p));
  const highlightColor = options.highlightColor || '#CCFF00'; // High-Energy Cult Electric Lime
  const rawHandle = options.page?.handle || cleanHandle;
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;

  if (isCentered) {
    // 5A. Centered Middle Header: [ (Cult Logo)  @cult_information  ✔ ]
    ctx.font = 'bold 34px "Segoe UI", Roboto, Arial, sans-serif';
    const handleW = ctx.measureText(displayHandle).width;
    const badgeSize = 26;
    const gap = 16;
    const totalHeaderW = avatarSize + gap + handleW + 12 + badgeSize;
    const headerStartX = Math.round((width - totalHeaderW) / 2);

    const avatarX = headerStartX;
    const avatarY = headerTopY;
    const avatarCenter = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;

    // Solid dark backdrop
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#08080A';
    ctx.fill();
    ctx.restore();

    // Signature Cult Neon Lime Double Glow Border Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2.8;
    ctx.shadowColor = 'rgba(204, 255, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    // Circular Avatar with internal padding (8%) so "CULT INFORMATION" text is 100% visible and never clipped!
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (existingAvatarPath) {
      try {
        const avatarImg = await loadImage(existingAvatarPath);
        const pad = Math.round(avatarSize * 0.08);
        ctx.drawImage(avatarImg, avatarX + pad, avatarY + pad, avatarSize - pad * 2, avatarSize - pad * 2);
      } catch (e) {
        console.warn('[FFmpeg Helper] Avatar image load error:', e.message);
      }
    } else {
      const bgGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      bgGrad.addColorStop(0, '#1E1E24');
      bgGrad.addColorStop(1, '#0A0A0F');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      const words = (pageName || 'Channel').trim().split(/\s+/);
      const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
      ctx.fillStyle = '#CCFF00';
      ctx.font = '900 34px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avatarCenter, avatarCenterY);
    }
    ctx.restore();

    // Centered Handle + Blue Verified Badge
    ctx.save();
    ctx.font = 'bold 34px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    const textX = avatarX + avatarSize + gap;
    ctx.fillText(displayHandle, textX, avatarCenterY);
    drawVerifiedBadge(ctx, textX + handleW + 12, avatarCenterY - (badgeSize / 2), badgeSize);
    ctx.restore();
  } else {
    // 5B. Left-Aligned Header: [ (Cult Logo) ]  Cult Information ✔ / @cult_information
    const avatarX = marginX;
    const avatarY = headerTopY;
    const avatarCenter = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#08080A';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2.8;
    ctx.shadowColor = 'rgba(204, 255, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (existingAvatarPath) {
      try {
        const avatarImg = await loadImage(existingAvatarPath);
        const pad = Math.round(avatarSize * 0.08);
        ctx.drawImage(avatarImg, avatarX + pad, avatarY + pad, avatarSize - pad * 2, avatarSize - pad * 2);
      } catch (e) {
        console.warn('[FFmpeg Helper] Avatar image load error:', e.message);
      }
    } else {
      const bgGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      bgGrad.addColorStop(0, '#1E1E24');
      bgGrad.addColorStop(1, '#0A0A0F');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      const words = (pageName || 'Channel').trim().split(/\s+/);
      const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
      ctx.fillStyle = '#CCFF00';
      ctx.font = '900 34px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avatarCenter, avatarCenterY);
    }
    ctx.restore();

    // Page Name + Verified Badge
    const textLeftX = marginX + avatarSize + 20;
    ctx.save();
    ctx.font = 'bold 34px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    const nameCenterY = headerTopY + 32;
    ctx.fillText(pageName, textLeftX, nameCenterY);

    const rawNameWidth = ctx.measureText(pageName).width;
    const nameWidth = (rawNameWidth && rawNameWidth > 50 && rawNameWidth < 450) ? rawNameWidth : 260;
    const badgeSize = 24;
    drawVerifiedBadge(ctx, textLeftX + nameWidth + 12, nameCenterY - (badgeSize / 2), badgeSize);

    // Handle below name
    ctx.font = '500 24px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#A1A1AA';
    const handleCenterY = headerTopY + 68;
    ctx.fillText(displayHandle, textLeftX, handleCenterY);
    ctx.restore();
  }

  // 6. Punchy Viral Headline - Center-Aligned with Cult Electric Lime Highlighting
  ctx.save();
  ctx.font = `800 ${fontSize}px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'top';
  const spaceWidth = ctx.measureText(' ').width;

  lines.forEach((lineTokens, lineIdx) => {
    let lineWidth = 0;
    for (let i = 0; i < lineTokens.length; i++) {
      lineWidth += ctx.measureText(lineTokens[i].text).width + (i > 0 ? spaceWidth : 0);
    }
    let currentX = Math.round((width - lineWidth) / 2);
    const currentY = headlineY + (lineIdx * lineHeight);

    for (const token of lineTokens) {
      if (token.highlight) {
        ctx.save();
        ctx.fillStyle = highlightColor;
        ctx.shadowColor = 'rgba(204, 255, 0, 0.45)';
        ctx.shadowBlur = 8;
        ctx.fillText(token.text, currentX, currentY);
        ctx.restore();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(token.text, currentX, currentY);
      }
      currentX += ctx.measureText(token.text).width + spaceWidth;
    }
  });
  ctx.restore();

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `feed_frame_overlay_${cleanHandle || 'cult_information'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
}

/**
 * Generates Feed Reel Frame Template Overlay
 * Supports adaptive geometry: 9:16 vertical full screen, 16:9 landscape, 1:1 square.
 * Theme-aware: 'movies' (cinematic gold/amber/crimson) vs 'gta6' (Vice City neon cyan/pink) vs 'clubbing' (Cyberpunk HUD) vs 'evolving_ai' (Minimalist Video-Essay).
 */
async function generateFeedPostOverlay(handle, options = {}) {
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || 'gta6_updates_007').replace(/^@/, '');
  const {
    cardX = 24,
    cardY = 24,
    cardW = 1032,
    cardH = 1872,
    isVertical = true
  } = options;

  const theme = resolvePageTheme(options.page || cleanHandle, options.theme);
  const isClubbing = theme === 'clubbing';
  const isMovie = theme === 'movies';
  const isVideoEssay = (options.showHeadline === true) || theme === 'video_essay';

  if (isClubbing) {
    return await generateClubbingCyberOverlay(cleanHandle, options);
  }
  if (isVideoEssay) {
    return await generateEvolvingAiOverlay(cleanHandle, options);
  }

  // 1. Ambient Background for letterboxed videos (landscape / square)
  if (!isVertical) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (isClubbing) {
      bgGrad.addColorStop(0, 'rgba(4, 18, 10, 0.90)');
      bgGrad.addColorStop(0.5, 'rgba(8, 30, 16, 0.78)');
      bgGrad.addColorStop(1, 'rgba(2, 12, 6, 0.92)');
    } else if (isMovie) {
      bgGrad.addColorStop(0, 'rgba(12, 10, 14, 0.88)');
      bgGrad.addColorStop(0.5, 'rgba(28, 16, 12, 0.75)');
      bgGrad.addColorStop(1, 'rgba(12, 10, 14, 0.88)');
    } else {
      bgGrad.addColorStop(0, 'rgba(10, 2, 24, 0.75)');
      bgGrad.addColorStop(0.5, 'rgba(38, 8, 60, 0.65)');
      bgGrad.addColorStop(1, 'rgba(10, 2, 24, 0.75)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Vignette
    const vig = ctx.createRadialGradient(width / 2, height / 2, 350, width / 2, height / 2, 900);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, (isClubbing || isMovie) ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    // Clear cutout where video plays
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
    ctx.clip();
    ctx.clearRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Bolder Boundaries (8px multi-stop gradient border) — for GTA 6 & Movies
  if (!isClubbing) {
    ctx.save();
    const bGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    if (isMovie) {
      bGrad.addColorStop(0, '#FFD166');
      bGrad.addColorStop(0.35, '#FFB703');
      bGrad.addColorStop(0.70, '#C1121F');
      bGrad.addColorStop(1, '#E5A93C');
      ctx.shadowColor = 'rgba(255, 183, 3, 0.70)';
    } else {
      bGrad.addColorStop(0, '#00F0FF');
      bGrad.addColorStop(0.3, '#7209B7');
      bGrad.addColorStop(0.65, '#F72585');
      bGrad.addColorStop(1, '#FF8A00');
      ctx.shadowColor = 'rgba(247, 37, 133, 0.75)';
    }

    ctx.shadowBlur = 22;
    ctx.strokeStyle = bGrad;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
    ctx.stroke();

    // Inner accent rail
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isMovie ? 'rgba(255, 209, 102, 0.40)' : 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX + 9, cardY + 9, cardW - 18, cardH - 18, 12);
    ctx.stroke();

    // 3. Prominent Corner Brackets (Registration Marks)
    const bLen = 42;
    ctx.lineWidth = 5;

    if (isMovie) {
      // TL (Champagne Gold)
      ctx.strokeStyle = '#FFD166';
      ctx.shadowColor = '#FFD166';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cardX - 6, cardY + bLen); ctx.lineTo(cardX - 6, cardY - 6); ctx.lineTo(cardX + bLen, cardY - 6);
      ctx.stroke();

      // TR (Amber Gold)
      ctx.strokeStyle = '#FFB703';
      ctx.shadowColor = '#FFB703';
      ctx.beginPath();
      ctx.moveTo(cardX + cardW - bLen, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY + bLen);
      ctx.stroke();

      // BL (Amber Gold)
      ctx.strokeStyle = '#FFB703';
      ctx.shadowColor = '#FFB703';
      ctx.beginPath();
      ctx.moveTo(cardX - 6, cardY + cardH - bLen); ctx.lineTo(cardX - 6, cardY + cardH + 6); ctx.lineTo(cardX + bLen, cardY + cardH + 6);
      ctx.stroke();

      // BR (Burnished Gold)
      ctx.strokeStyle = '#E5A93C';
      ctx.shadowColor = '#E5A93C';
      ctx.beginPath();
      ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH - bLen);
      ctx.stroke();
    } else {
      // TL (Cyan)
      ctx.strokeStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cardX - 6, cardY + bLen); ctx.lineTo(cardX - 6, cardY - 6); ctx.lineTo(cardX + bLen, cardY - 6);
      ctx.stroke();

      // TR (Pink)
      ctx.strokeStyle = '#F72585';
      ctx.shadowColor = '#F72585';
      ctx.beginPath();
      ctx.moveTo(cardX + cardW - bLen, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY - 6); ctx.lineTo(cardX + cardW + 6, cardY + bLen);
      ctx.stroke();

      // BL (Pink)
      ctx.strokeStyle = '#F72585';
      ctx.shadowColor = '#F72585';
      ctx.beginPath();
      ctx.moveTo(cardX - 6, cardY + cardH - bLen); ctx.lineTo(cardX - 6, cardY + cardH + 6); ctx.lineTo(cardX + bLen, cardY + cardH + 6);
      ctx.stroke();

      // BR (Sunset Orange)
      ctx.strokeStyle = '#FF8A00';
      ctx.shadowColor = '#FF8A00';
      ctx.beginPath();
      ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY - bLen);
      ctx.stroke();
    }

    // 4. Bottom Boundary Theme Bar
    const botBarW = Math.min(680, cardW - 80);
    const botBarX = cardX + (cardW - botBarW) / 2;
    const botBarY = cardY + cardH - 12;

    const botGrad = ctx.createLinearGradient(botBarX, botBarY, botBarX + botBarW, botBarY);
    if (isMovie) {
      botGrad.addColorStop(0, 'rgba(255, 209, 102, 0)');
      botGrad.addColorStop(0.2, '#FFD166');
      botGrad.addColorStop(0.5, '#FFB703');
      botGrad.addColorStop(0.8, '#C1121F');
      botGrad.addColorStop(1, 'rgba(193, 18, 31, 0)');
      ctx.fillStyle = botGrad;
      ctx.shadowColor = 'rgba(255, 183, 3, 0.85)';
    } else {
      botGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      botGrad.addColorStop(0.15, '#00F0FF');
      botGrad.addColorStop(0.5, '#F72585');
      botGrad.addColorStop(0.85, '#FF8A00');
      botGrad.addColorStop(1, 'rgba(255, 138, 0, 0)');
      ctx.fillStyle = botGrad;
      ctx.shadowColor = 'rgba(255, 138, 0, 0.9)';
    }

    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(botBarX, botBarY, botBarW, 8, 4);
    ctx.fill();

    ctx.font = isMovie ? 'bold 12px "Helvetica Neue", Arial, sans-serif' : '900 13px Impact, Arial Black, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    if (isMovie) {
      ctx.fillText('◄ ◄  DAILY MOVIE & SERIES RECOMMENDATIONS  ► ►', cardX + cardW / 2, botBarY - 14);
    } else {
      ctx.fillText('◄ ◄  GTA VI • VICE CITY  ► ►', cardX + cardW / 2, botBarY - 14);
    }
    ctx.restore();
  }

  // 5. Account Branding Box
  if (isClubbing) {
    // Sleek Modern Center Glass Pill — ONLY @clubbingcult, NO boundaries
    const badgePosition = options.badgePosition || process.env.CLUBBING_BADGE_POSITION || 'center';
    const badgeY = options.badgeY || (badgePosition === 'top' ? 220 : (badgePosition === 'upper-middle' ? 560 : 960));
    const text = `@${cleanHandle.toLowerCase()}`;

    ctx.save();
    ctx.font = '900 28px "Arial Black", Impact, sans-serif';
    const textMetrics = ctx.measureText(text);

    const iconSpace = 38;
    const padX = 30;
    const boxW = textMetrics.width + padX * 2 + iconSpace;
    const boxH = 58;
    const boxX = (width - boxW) / 2;
    const boxY = badgeY - boxH / 2;
    const radius = 29;

    // Ambient glow
    ctx.shadowColor = 'rgba(0, 255, 163, 0.75)';
    ctx.shadowBlur = 22;

    // Obsidian glass pill
    ctx.fillStyle = 'rgba(4, 14, 8, 0.88)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    // Electric neon gradient border (2.5px)
    const bGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    bGrad.addColorStop(0, '#00FFA3');
    bGrad.addColorStop(0.5, '#00E5FF');
    bGrad.addColorStop(1, '#39FF14');
    ctx.strokeStyle = bGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, radius - 2);
    ctx.stroke();

    // Pulse dot
    const dotX = boxX + padX + 8;
    const dotY = badgeY;
    ctx.shadowColor = '#00FFA3';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#00FFA3';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, dotX + 18, badgeY);

    ctx.restore();
  } else if (isMovie) {
    // 5. Authentic Cinema Picks / Movie Recommendations Floating Header Box
    // Sleek, compact little box with golden glow matching target design (media_1794145464149.jpg)
    // No avatar circle, no blue tick — clean handle/page + Cinema Picks
    const rawHandle = (options.page?.handle || cleanHandle || 'movie_series_365').trim();
    const handleText = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;
    const badgeText1 = handleText;
    const badgeSep = '  |  ';
    const badgeText2 = 'Cinema Picks';

    ctx.save();
    ctx.font = 'bold 22px Arial, "Helvetica Neue", Roboto, sans-serif';
    const w1 = ctx.measureText(badgeText1).width;
    ctx.font = 'bold 20px Arial, "Helvetica Neue", Roboto, sans-serif';
    const wSep = ctx.measureText(badgeSep).width;
    ctx.font = '600 22px Arial, "Helvetica Neue", Roboto, sans-serif';
    const w2 = ctx.measureText(badgeText2).width;

    const padX = 26;
    const boxW = Math.round(w1 + wSep + w2 + padX * 2);
    const boxH = 48;
    const boxX = Math.round((width - boxW) / 2);
    // Position floating directly above cardY with clean clearance
    const boxY = (cardY >= 200) ? Math.max(120, cardY - boxH - 18) : 140;

    // Glowing obsidian glass box
    ctx.shadowColor = 'rgba(255, 183, 3, 0.85)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(10, 10, 14, 0.94)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    // Golden gradient border (2.5px)
    const bGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    bGrad.addColorStop(0, '#FFD166');
    bGrad.addColorStop(0.5, '#FFB703');
    bGrad.addColorStop(1, '#FFD166');
    ctx.strokeStyle = bGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner subtle border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, 6);
    ctx.stroke();

    // Text rendering: @movie_series_365 | Cinema Picks
    let curX = boxX + padX;
    const textCenterY = boxY + boxH / 2 + 1;

    // Part 1: Handle in crisp white
    ctx.font = 'bold 22px Arial, "Helvetica Neue", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(badgeText1, curX, textCenterY);
    curX += w1;

    // Part 2: Separator in amber gold
    ctx.font = 'bold 20px Arial, "Helvetica Neue", Roboto, sans-serif';
    ctx.fillStyle = '#FFB703';
    ctx.fillText(badgeSep, curX, textCenterY);
    curX += wSep;

    // Part 3: "Cinema Picks" in champagne gold
    ctx.font = '600 22px Arial, "Helvetica Neue", Roboto, sans-serif';
    ctx.fillStyle = '#FFD166';
    ctx.fillText(badgeText2, curX, textCenterY);

    ctx.restore();
  } else {
    // 5. Top Safe-Zone Header for GTA 6, and Other Custom Themes
    const isGTA6 = theme === 'gta6' || theme === 'gta' || (!isMovie && !isClubbing && !isVideoEssay);
    const highlightColor = isGTA6 ? '#00F0FF' : (options.highlightColor || '#38BDF8');
    const secondaryColor = isGTA6 ? '#F72585' : '#0284C7';

    const defaultNames = {
      gta6: 'GTA 6 Updates 007',
      movies: 'Movie Series 365',
      cinema: 'Movie Series 365',
      clubbing: 'Clubbing Cult',
      video_essay: 'Cult Information',
      default: cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    };
    const pageName = options.pageName || (cleanHandle.includes('movie') ? 'Movie Series 365' : (options.page?.name || defaultNames[theme] || (isMovie ? defaultNames.movies : (isGTA6 ? defaultNames.gta6 : defaultNames.default))));

    const defaultHooks = {
      gta6: 'Rockstar Just Confirmed A **Massive New Feature** For GTA VI',
      movies: 'The **Most Mind-Bending** Cinematic Thriller You Cannot Miss',
      cinema: 'The **Most Mind-Bending** Cinematic Thriller You Cannot Miss',
      clubbing: 'The **Wildest Underground Festival** Moment That Went Viral',
      video_essay: 'Breakthrough AI Technology Is Evolving Faster Than **Anyone Expected**',
      default: 'The **Biggest Announcement** That Everyone Is Talking About'
    };
    const rawHook = options.hookHeadline || options.headline || defaultHooks[theme] || (isMovie ? defaultHooks.movies : (isGTA6 ? defaultHooks.gta6 : defaultHooks.default));
    const cleanHeadline = (rawHook || '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^["'“”\s]+/, '')
      .replace(/["'“”\s]+$/, '')
      .trim();

    const marginX = 54;
    const maxTextWidth = width - (marginX * 2);
    const brandingDir = path.join(__dirname, '..', '..', 'public', 'branding');
    const candidateAvatarPaths = [
      options.avatarPath,
      options.page?.avatar_path,
      path.join(brandingDir, `${cleanHandle}_avatar.png`),
      path.join(brandingDir, `${cleanHandle}_avatar.jpg`),
      path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.png`),
      path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.jpg`),
      path.join(brandingDir, isMovie ? 'movies_avatar.png' : 'gta6_avatar.png'),
      path.join(brandingDir, isMovie ? 'movie_series_365_avatar.png' : 'gta6_updates_007_avatar.png'),
      path.join(brandingDir, 'cult_information_avatar.png')
    ].filter(Boolean);

    const existingAvatarPath = candidateAvatarPaths.find(p => fs.existsSync(p));

    // When cardY is >= 350 AND page is an editorial video-essay (Cult Information) with headline enabled
    if (cardY >= 350 && (isVideoEssay || options.showHeadline === true)) {
      const avatarSize = 80;
      const spaceAboveVideo = 28;
      const spaceBetweenHeaderAndHeadline = 22;

      const wordsCount = cleanHeadline.split(/\s+/).length;
      const fontSize = (wordsCount > 13 || cleanHeadline.length > 70) ? 32 : 35;
      const lineHeight = fontSize + 12;

      ctx.font = `800 ${fontSize}px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
      const tokens = parseHeadlineTokens(cleanHeadline);
      const lines = wrapTokens(ctx, tokens, maxTextWidth);
      const totalTextHeight = lines.length * lineHeight;
      const totalBrandingHeight = avatarSize + spaceBetweenHeaderAndHeadline + totalTextHeight;

      const minSafeTopMargin = 136;
      let headerTopY, headlineY;

      if (options.headerTopY !== undefined && options.headlineY !== undefined) {
        headerTopY = options.headerTopY;
        headlineY = options.headlineY;
      } else {
        const spaceAbove = cardY - spaceAboveVideo;
        const desiredTopY = spaceAbove - totalBrandingHeight;
        if (desiredTopY >= minSafeTopMargin) {
          if (cardY > 520) {
            const availableSpace = cardY - spaceAboveVideo - minSafeTopMargin;
            headerTopY = minSafeTopMargin + Math.round((availableSpace - totalBrandingHeight) * 0.60);
          } else {
            headerTopY = desiredTopY;
          }
        } else {
          headerTopY = Math.max(100, cardY - totalBrandingHeight - spaceAboveVideo);
        }
        headlineY = headerTopY + avatarSize + spaceBetweenHeaderAndHeadline;
      }

      const avatarCenter = marginX + avatarSize / 2;
      const avatarCenterY = headerTopY + avatarSize / 2;

      // 1. Avatar Backdrop & Clipping
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isMovie ? '#1A0E04' : (isGTA6 ? '#130424' : '#0B0F19');
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (existingAvatarPath) {
        try {
          const avatarImg = await loadImage(existingAvatarPath);
          const pad = isVideoEssay ? Math.round(avatarSize * 0.08) : 0;
          ctx.drawImage(avatarImg, marginX + pad, headerTopY + pad, avatarSize - pad * 2, avatarSize - pad * 2);
        } catch (e) {
          console.warn('[FFmpeg Helper] Avatar image load error:', e.message);
        }
      } else {
        const bgGrad = ctx.createLinearGradient(marginX, headerTopY, marginX + avatarSize, headerTopY + avatarSize);
        if (isMovie) {
          bgGrad.addColorStop(0, '#2D1B06');
          bgGrad.addColorStop(1, '#0F0903');
        } else if (isGTA6) {
          bgGrad.addColorStop(0, '#240046');
          bgGrad.addColorStop(1, '#090212');
        } else {
          bgGrad.addColorStop(0, '#1E293B');
          bgGrad.addColorStop(1, '#0F172A');
        }
        ctx.fillStyle = bgGrad;
        ctx.fill();

        const words = (pageName || 'Channel').trim().split(/\s+/);
        const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
        ctx.fillStyle = '#CCFF00';
        ctx.font = '900 32px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, avatarCenter, avatarCenterY);
      }
      ctx.restore();

      // 2. Dual-Glow Neon Avatar Ring
      const ringColor = isVideoEssay ? '#CCFF00' : highlightColor;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(marginX, headerTopY, marginX + avatarSize, headerTopY + avatarSize);
      ringGrad.addColorStop(0, ringColor);
      ringGrad.addColorStop(1, isVideoEssay ? '#A3E635' : secondaryColor);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isVideoEssay ? 'rgba(204, 255, 0, 0.75)' : (isMovie ? 'rgba(255, 183, 3, 0.75)' : 'rgba(56, 189, 248, 0.7)');
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // 3. Page Name & Verified Badge
      const textLeftX = marginX + avatarSize + 18;
      ctx.save();
      ctx.font = 'bold 28px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      const nameCenterY = headerTopY + 26;
      ctx.fillText(pageName, textLeftX, nameCenterY);

      const nameWidth = ctx.measureText(pageName).width;
      const badgeSize = 20;
      drawVerifiedBadge(ctx, textLeftX + nameWidth + 10, nameCenterY - (badgeSize / 2), badgeSize);

      // 4. Handle below Page Name
      ctx.font = '500 20px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#A0A0AB';
      ctx.textBaseline = 'middle';
      const handleCenterY = headerTopY + 56;
      const displayHandle = cleanHandle.startsWith('@') ? cleanHandle : '@' + cleanHandle;
      ctx.fillText(displayHandle, textLeftX, handleCenterY);

      // Right-aligned theme badge in small box
      const tagText = isMovie ? 'CINEMA PICKS' : (isGTA6 ? 'GTA VI' : 'OFFICIAL');
      ctx.font = '900 14px "Arial Black", Arial, sans-serif';
      const tagW = ctx.measureText(tagText).width + 20;
      const tagH = 30;
      const tagX = width - marginX - tagW;
      const tagY = headerTopY + 20;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 8);
      ctx.fill();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = ringColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagX + tagW / 2, tagY + tagH / 2 + 1);

      ctx.restore();

      // 5. Punchy Viral Hook Headline with Theme Highlight
      ctx.save();
      ctx.font = `800 ${fontSize}px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
      ctx.textBaseline = 'top';
      const spaceWidth = ctx.measureText(' ').width;

      lines.forEach((lineTokens, lineIdx) => {
        let lineWidth = 0;
        for (let i = 0; i < lineTokens.length; i++) {
          lineWidth += ctx.measureText(lineTokens[i].text).width + (i > 0 ? spaceWidth : 0);
        }
        let currentX = isVideoEssay ? Math.round((width - lineWidth) / 2) : marginX;
        const currentY = headlineY + (lineIdx * lineHeight);
        for (const token of lineTokens) {
          if (token.highlight) {
            ctx.save();
            ctx.fillStyle = isVideoEssay ? '#CCFF00' : highlightColor;
            ctx.shadowColor = isVideoEssay ? 'rgba(204, 255, 0, 0.45)' : 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8;
            ctx.fillText(token.text, currentX, currentY);
            ctx.restore();
          } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(token.text, currentX, currentY);
          }
          currentX += ctx.measureText(token.text).width + spaceWidth;
        }
      });
      ctx.restore();
    } else {
      // 5. Sleek Floating Header Box for Full-Bleed Vertical Video (GTA 6 & Other Themes)
      // Matches the clean centered floating aesthetic without covering the video with a bulky banner
      const rawPageName = (options.pageName || options.page?.name || defaultNames[theme] || cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).trim();
      const displayPageName = rawPageName.replace(/^@+/, '');
      const rawHandle = (options.page?.handle || cleanHandle).trim();
      const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;

      const badgeText1 = displayPageName;
      const badgeSep = '  |  ';
      const badgeText2 = isGTA6 ? 'GTA VI' : displayHandle;

      ctx.save();
      ctx.font = 'bold 24px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      const w1 = ctx.measureText(badgeText1).width;
      ctx.font = 'bold 20px RobotoMedium, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      const wSep = ctx.measureText(badgeSep).width;
      ctx.font = '600 22px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      const w2 = ctx.measureText(badgeText2).width;

      const padX = 26;
      const boxW = Math.min(width - 60, Math.round(w1 + wSep + w2 + padX * 2));
      const boxH = 54;
      const boxX = Math.round((width - boxW) / 2);
      const boxY = isVertical ? Math.max(86, Math.min(96, cardY - boxH - 24)) : 96;

      // Obsidian glass box
      ctx.shadowColor = isGTA6 ? 'rgba(0, 240, 255, 0.75)' : 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = isGTA6 ? 'rgba(14, 4, 26, 0.94)' : 'rgba(8, 12, 20, 0.94)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 8);
      ctx.fill();

      // Cyber/theme gradient border (2.5px)
      const bGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      bGrad.addColorStop(0, highlightColor);
      bGrad.addColorStop(0.5, secondaryColor);
      bGrad.addColorStop(1, highlightColor);
      ctx.strokeStyle = bGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner subtle border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, 6);
      ctx.stroke();

      // Text rendering: [Page Name] | [Vice City / @handle]
      let curX = boxX + padX;
      const textCenterY = boxY + boxH / 2 + 1;

      // Part 1: Page Name in crisp white
      ctx.font = 'bold 22px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(badgeText1, curX, textCenterY);
      curX += w1;

      // Part 2: Separator in accent color
      ctx.font = 'bold 20px RobotoMedium, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      ctx.fillStyle = highlightColor;
      ctx.fillText(badgeSep, curX, textCenterY);
      curX += wSep;

      // Part 3: Subtitle/Handle in secondary accent / crisp white
      ctx.font = '600 22px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
      ctx.fillStyle = highlightColor;
      ctx.fillText(badgeText2, curX, textCenterY);

      ctx.restore();
    }
  }

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `feed_frame_overlay_${cleanHandle || 'default'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
}

/**
 * Frames video in GTA 6 Vice City aesthetic template for Feed Reel
 * Automatically detects aspect ratio (9:16 vertical, 16:9 landscape, 1:1 square)
 */
async function prepareVideoForFeedCard(inputVideoPath, options = {}) {
  if (!inputVideoPath) throw new Error('No input video path for feed card');

  let absPath = inputVideoPath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputVideoPath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) absPath = candidate;
  }
  if (!fs.existsSync(absPath)) throw new Error(`Video not found: ${absPath}`);

  const handle = (options.handle || 'gta6_updates_007').replace(/^@+/, '');

  // 1. Detect aspect ratio and audio via ffprobe
  const { execSync } = require('child_process');
  let inW = 1080;
  let inH = 1920;
  let hasAudio = false;
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries stream=width,height,codec_type -of json "${absPath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(raw);
    const vStream = data?.streams?.find(s => s.codec_type === 'video');
    const aStream = data?.streams?.find(s => s.codec_type === 'audio');
    inW = vStream?.width || 1080;
    inH = vStream?.height || 1920;
    hasAudio = Boolean(aStream);
  } catch (e) {
    console.warn(`[FFmpeg Helper] ffprobe dimension warning: ${e.message}`);
  }

  const aspect = inW / inH;
  const isVertical = aspect <= 0.65; // ~9:16 vertical
  const theme = resolvePageTheme(options.page || handle, options.theme);
  const isClubbing = theme === 'clubbing';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay';

  let cardW, cardH, cardX, cardY, videoFilter;

  if (isVideoEssay) {
    // Evolving AI & Cult Information Minimalist Center Layout:
    if (isVertical) {
      const bounds = await detectActiveVideoBounds(absPath);
      if (bounds && bounds.isLetterboxed && bounds.height > 100) {
        // Competitor or letterboxed reel (e.g. @evolving.ai style):
        // Physically crop the input video to ONLY the active video window,
        // completely eliminating 100% of competitor headers, titles, and floating text!
        const cropY = Math.max(0, Math.floor(bounds.startY / 2) * 2);
        const cropH = Math.floor(bounds.height / 2) * 2;
        const activeAspect = inW / cropH;

        cardW = 1080;
        cardH = Math.round(cardW / activeAspect);
        if (cardH > 1150) cardH = 1150;
        cardH = Math.floor(cardH / 2) * 2;
        cardX = 0;
        cardY = Math.max(380, Math.round((1920 - cardH) / 2)); // Guaranteed safe top space for branding

        console.log(`[FFmpeg Helper] ✂️ Auto-Cropped active video bounds: Y=${cropY} H=${cropH} -> Framed to ${cardW}x${cardH} at Y=${cardY}`);
        videoFilter = [
          `[0:v]crop=in_w:${cropH}:0:${cropY},scale=${cardW}:${cardH},pad=1080:1920:0:${cardY}:color=black[v1]`,
          '[v1][1:v]overlay=0:0[outv]'
        ].join(';');
      } else {
        // Raw full-frame vertical video: frame into centered video-essay card in TRUE MIDDLE
        cardW = 1080;
        cardH = 880;
        cardX = 0;
        cardY = Math.round((1920 - cardH) / 2); // 520px: exact vertical symmetry (520 top, 520 bottom)

        videoFilter = [
          `[0:v]scale=${cardW}:${cardH}:force_original_aspect_ratio=increase,crop=${cardW}:${cardH},pad=1080:1920:${cardX}:${cardY}:color=black[v1]`,
          '[v1][1:v]overlay=0:0[outv]'
        ].join(';');
      }
    } else if (aspect >= 1.3) {
      // 16:9 Landscape Video (e.g. 1080x608): exact vertical symmetry!
      cardW = 1080;
      cardH = Math.round(cardW / aspect);
      cardH = Math.floor(cardH / 2) * 2;
      cardX = 0;
      cardY = Math.round((1920 - cardH) / 2); // 656px for 16:9 (656 top, 656 bottom)

      videoFilter = [
        `[0:v]scale=${cardW}:${cardH}:force_original_aspect_ratio=increase,crop=${cardW}:${cardH},pad=1080:1920:${cardX}:${cardY}:color=black[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    } else if (aspect >= 0.95 && aspect <= 1.05) {
      // 1:1 Square Video (e.g. 1080x1080): exact vertical symmetry!
      cardW = 1080;
      cardH = 1080;
      cardX = 0;
      cardY = 420; // 420 top, 420 bottom

      videoFilter = [
        `[0:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,pad=1080:1920:0:420:color=black[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    } else {
      // 4:5 or standard portrait: ensure zero collision with top branding
      cardW = 1080;
      cardH = Math.round(cardW / aspect);
      if (cardH > 1150) cardH = 1150;
      cardH = Math.floor(cardH / 2) * 2;
      cardX = 0;
      cardY = Math.max(380, Math.round((1920 - cardH) / 2));

      videoFilter = [
        `[0:v]scale=${cardW}:${cardH}:force_original_aspect_ratio=increase,crop=${cardW}:${cardH},pad=1080:1920:${cardX}:${cardY}:color=black[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    }
  } else if (isVertical) {
    if (isClubbing) {
      // Clubbing Cult Cyberpunk HUD: 9:16 Full-Scale Exact Ratio (828x1472 @ 126, 215)
      cardW = 828;
      cardH = 1472;
      cardX = 126;
      cardY = 215;

      videoFilter = [
        `[0:v]scale=${cardW}:${cardH}:force_original_aspect_ratio=increase,crop=${cardW}:${cardH},pad=1080:1920:${cardX}:${cardY}:color=black[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    } else {
      const bounds = await detectActiveVideoBounds(absPath);
      if (bounds && bounds.isLetterboxed && bounds.height > 100) {
        // Letterboxed video (e.g. movie/gameplay clip with black bars):
        // Automatically crop active video window to eliminate competitor black bars/headers
        const cropY = Math.max(0, Math.floor(bounds.startY / 2) * 2);
        const cropH = Math.floor(bounds.height / 2) * 2;
        const activeAspect = inW / cropH;

        cardW = 1032;
        cardH = Math.round(cardW / activeAspect);
        if (cardH > 1150) cardH = 1150;
        cardH = Math.floor(cardH / 2) * 2;
        cardX = Math.round((1080 - cardW) / 2);
        cardY = Math.max(420, Math.round((1920 - cardH) / 2));

        console.log(`[FFmpeg Helper] ✂️ Auto-Cropped active bounds for ${theme}: Y=${cropY} H=${cropH} -> Framed to ${cardW}x${cardH} at Y=${cardY}`);
        videoFilter = [
          `[0:v]crop=in_w:${cropH}:0:${cropY}[cropped]`,
          `[cropped]split=2[bg_raw][fg_raw]`,
          `[bg_raw]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:1,scale=1080:1920:flags=fast_bilinear[bg]`,
          `[fg_raw]scale=${cardW}:${cardH}[card]`,
          `[bg][card]overlay=${cardX}:${cardY}[v1]`,
          `[v1][1:v]overlay=0:0[outv]`
        ].join(';');
      } else {
        if (isMovie) {
          // Movie clips: Keep framed in center so golden header floats cleanly above video
          cardW = 1032;
          cardH = 1420;
          cardX = 24;
          cardY = Math.round((1920 - cardH) / 2); // 250px top margin, perfect for header badge!

          videoFilter = [
            '[0:v]split=2[bg_raw][fg_raw]',
            '[bg_raw]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:1,scale=1080:1920:flags=fast_bilinear[bg]',
            `[fg_raw]scale=${cardW}:${cardH}:force_original_aspect_ratio=increase,crop=${cardW}:${cardH}[card]`,
            `[bg][card]overlay=${cardX}:${cardY}[v1]`,
            '[v1][1:v]overlay=0:0[outv]'
          ].join(';');
        } else {
          // 9:16 Full Screen Immersion with narrow boundaries
          cardW = 1032;
          cardH = 1872;
          cardX = 24;
          cardY = 24;

          videoFilter = [
            '[0:v]scale=1032:1872:force_original_aspect_ratio=increase,crop=1032:1872,pad=1080:1920:24:24:color=black[v1]',
            '[v1][1:v]overlay=0:0[outv]'
          ].join(';');
        }
      }
    }
  } else {
    // Landscape (16:9) or Square (1:1) / Portrait (4:5)
    if (isClubbing) {
      // Clubbing Cult Cyberpunk HUD: Adaptive Card for Landscape/Square
      cardW = aspect >= 1.5 ? 920 : 860;
      cardH = Math.round(cardW / aspect);
      if (cardH > 1460) {
        cardH = 1460;
        cardW = Math.round(cardH * aspect);
      }
      cardW = Math.floor(cardW / 2) * 2;
      cardH = Math.floor(cardH / 2) * 2;
      cardX = Math.round((1080 - cardW) / 2);
      cardY = Math.round((1920 - cardH) / 2) - 10;

      videoFilter = [
        '[0:v]split=2[bg_raw][fg_raw]',
        '[bg_raw]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:1,scale=1080:1920:flags=fast_bilinear[bg]',
        `[fg_raw]scale=${cardW}:${cardH}[card]`,
        `[bg][card]overlay=${cardX}:${cardY}[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    } else {
      cardW = 1032;
      cardH = Math.round(cardW / aspect);
      if (cardH > 1650) {
        cardH = 1650;
        cardW = Math.round(cardH * aspect);
      }
      // Ensure even dimensions for libx264
      cardW = Math.floor(cardW / 2) * 2;
      cardH = Math.floor(cardH / 2) * 2;
      cardX = Math.round((1080 - cardW) / 2);
      cardY = Math.max(420, Math.round((1920 - cardH) / 2));

      videoFilter = [
        '[0:v]split=2[bg_raw][fg_raw]',
        '[bg_raw]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:1,scale=1080:1920:flags=fast_bilinear[bg]',
        `[fg_raw]scale=${cardW}:${cardH}[card]`,
        `[bg][card]overlay=${cardX}:${cardY}[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    }
  }

  // For Video-Essay (Cult Information), guarantee on-screen headline OCR from reel if not already provided
  let isInvalidHook = !options.hookHeadline || options.hookHeadline.includes('The next generation of AI is evolving') || options.hookHeadline.includes('The shocking untold truth');
  try {
    const { isCompetitorAccountName } = require('../core/videoVisionService');
    if (options.hookHeadline && isCompetitorAccountName(options.hookHeadline.replace(/\*\*/g, ''))) {
      isInvalidHook = true;
    }
  } catch (_) {}

  if (isVideoEssay && isInvalidHook) {
    try {
      const { detectOnScreenHeadline, isCompetitorAccountName } = require('../core/videoVisionService');
      const visionRes = await detectOnScreenHeadline(absPath);
      if (visionRes && visionRes.found && visionRes.headline && !isCompetitorAccountName(visionRes.headline.replace(/\*\*/g, ''))) {
        options.hookHeadline = visionRes.headline;
        console.log(`[FFmpeg Helper] 👁️ Auto-detected on-screen hook headline from reel: "${options.hookHeadline}"`);
      }
    } catch (_) {}
  }

  const overlayPngPath = await generateFeedPostOverlay(handle, { cardX, cardY, cardW, cardH, isVertical, theme, pageName: options.pageName || options.page?.name, ...options });

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const framedOutput = path.join(dir, `${base}_feed_framed.mp4`);

  const themeName = isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information Video-Essay' : 'GTA 6 Vice City'));
  console.log(`[FFmpeg Helper] 🎨 Composing ${themeName} Framed Feed Reel for @${handle} (${isVertical ? '9:16 Full Immersion' : `${inW}x${inH} Adaptive`} ${cardW}x${cardH})...`);

  // Clean original audio preservation & normalization (preserves authentic original video audio)
  const inputArgs = ['-y', '-i', absPath, '-i', overlayPngPath];
  const fullFilter = hasAudio
    ? `${videoFilter};[0:a]volume=1.15,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[outa]`
    : `${videoFilter};anullsrc=channel_layout=stereo:sample_rate=44100[outa]`;

  return new Promise((resolve) => {
    const args = [
      ...inputArgs,
      '-filter_complex', fullFilter,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-tune', 'fastdecode',
      '-crf', '22',
      '-threads', '0',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-ac', '2',
      '-shortest',
      '-movflags', '+faststart',
      framedOutput
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(framedOutput)) {
        console.log(`[FFmpeg Helper] ✅ ${isClubbing ? 'Clubbing Cult' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information' : 'GTA 6'))} Framed Feed Reel generated: ${framedOutput}`);
        resolve(framedOutput);
      } else {
        console.warn(`[FFmpeg Helper] ⚠️ Feed frame FFmpeg exited with code ${code}, falling back to original media`);
        resolve(inputVideoPath);
      }
    });
    proc.on('error', (err) => {
      console.warn(`[FFmpeg Helper] Feed frame render error: ${err.message}, falling back to original`);
      resolve(inputVideoPath);
    });
  });
}

/**
 * Prepares video for Instagram Story container as an authentic "Reel Reshare Card":
 * 1. Preserves original video aspect ratio in a centered card (never stretched).
 * 2. Renders dynamic ambient blurred background.
 * 3. Overlays branded handle header and "Watch Full Reel" CTA aligned with Meta user_tags.
 * 4. Limits duration to <= 59.5 seconds for Meta Story compliance.
 */
async function prepareVideoForStory(inputVideoPath, options = {}) {
  if (!inputVideoPath) {
    throw new Error('No input video path provided for story');
  }

  let absPath = inputVideoPath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputVideoPath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) {
      absPath = candidate;
    }
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`Input video not found: ${absPath}`);
  }

  const handle = (options.handle || 'gta6_updates_007').replace(/^@+/, '');
  const theme = options.theme || (
    handle.includes('cherry') || options.page?.slug === 'cherry' || options.page?.is_ai_influencer ? 'cherry' :
    (handle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' :
    (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' :
    (handle.includes('cult') || options.page?.slug === 'cult_information' || handle.includes('evolving') || options.page?.slug === 'ai_curation' ? 'video_essay' : 'gta6')))
  );
  const isCherry = theme === 'cherry';
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay' || theme === 'cult_information' || theme === 'evolving_ai';

  const { execSync } = require('child_process');
  let duration = 0;
  let videoWidth = 1080;
  let videoHeight = 1920;
  try {
    const raw = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of json "${absPath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(raw);
    const stream = data?.streams?.[0] || {};
    videoWidth = parseInt(stream.width) || 1080;
    videoHeight = parseInt(stream.height) || 1920;
    duration = parseFloat(stream.duration || data?.format?.duration) || 0;
  } catch (e) {
    console.warn(`[FFmpeg Helper] Story ffprobe metadata error: ${e.message}`);
  }

  // Compute dynamic card geometry tailored exactly to the video's aspect ratio
  const geom = computeStoryCardGeometry(videoWidth, videoHeight);
  const overlayPngPath = generateStoryOverlay(handle, { ...options, theme, ...geom });

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const storyOutput = path.join(dir, `${base}_story_card.mp4`);

  const themeName = isCherry ? 'Cherry Rose-Gold Ambient' : (isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information Editorial' : 'GTA 6')));
  console.log(`[FFmpeg Helper] 🎨 Composing ${themeName} Instagram Story Reel Card for @${handle} (${videoWidth}x${videoHeight} -> Card ${geom.cardW}x${geom.cardH} @ ${geom.cardX},${geom.cardY})...`);

  const filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:1,eq=brightness=-0.32:contrast=0.94,scale=1080:1920:flags=fast_bilinear[bg]',
    `[fg_raw]scale=${geom.cardW}:${geom.cardH}:force_original_aspect_ratio=increase,crop=${geom.cardW}:${geom.cardH}[card]`,
    `[bg][card]overlay=${geom.cardX}:${geom.cardY}[v1]`,
    '[v1][1:v]overlay=0:0[outv]'
  ].join(';');

  // Ensure story video meets Meta's minimum 3.0s duration requirement and <= 59.5s max
  const clipLimit = duration > 0 ? (duration > 60 ? '59.5' : String(Math.max(duration, 3.5))) : '59.5';

  return new Promise((resolve) => {
    const args = [
      '-y',
      '-i', absPath,
      '-i', overlayPngPath,
      '-t', clipLimit,
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-tune', 'fastdecode',
      '-crf', '22',
      '-threads', '0',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      storyOutput
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(storyOutput)) {
        console.log(`[FFmpeg Helper] ✅ Story Reel Card generated: ${storyOutput}`);
        const publicDir = path.join(__dirname, '..', '..', 'public');
        let rel = storyOutput.replace(publicDir, '').replace(/\\/g, '/');
        if (!rel.startsWith('/')) rel = '/' + rel;
        resolve(rel);
      } else {
        console.warn(`[FFmpeg Helper] ⚠️ Story Reel Card FFmpeg exited with code ${code}, falling back to original media`);
        resolve(inputVideoPath);
      }
    });
    proc.on('error', (err) => {
      console.warn(`[FFmpeg Helper] Story render error: ${err.message}, falling back to original`);
      resolve(inputVideoPath);
    });
  });
}

/**
 * Prepares image for Instagram Story container as an authentic Post Card:
 * 1. Preserves original image aspect ratio in a centered card.
 * 2. Renders dynamic blurred background from the image.
 * 3. Overlays branded header and "View Post" CTA.
 */
async function prepareImageForStory(inputImagePath, options = {}) {
  if (!inputImagePath) throw new Error('No input image path provided for story');

  let absPath = inputImagePath;
  if (!fs.existsSync(absPath)) {
    const cleanRel = inputImagePath.replace(/^[/\\]+/, '');
    const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
    if (fs.existsSync(candidate)) absPath = candidate;
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`Input image not found: ${absPath}`);
  }

  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const cleanHandle = (options.handle || 'gta6_updates_007').replace(/^@/, '');
  const theme = options.theme || (
    cleanHandle.includes('cherry') || options.page?.slug === 'cherry' || options.page?.is_ai_influencer ? 'cherry' :
    (cleanHandle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' :
    (options.page?.slug === 'movies' || cleanHandle.includes('movie') ? 'movies' :
    (cleanHandle.includes('cult') || options.page?.slug === 'cult_information' || cleanHandle.includes('evolving') || options.page?.slug === 'ai_curation' ? 'video_essay' : 'gta6')))
  );
  const isCherry = theme === 'cherry';
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay' || theme === 'cult_information' || theme === 'evolving_ai';

  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const img = await loadImage(absPath);

  // 1. Draw ambient blurred background with theme gradient
  ctx.drawImage(img, -width * 0.25, -height * 0.25, width * 1.5, height * 1.5);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isCherry) {
    bgGrad.addColorStop(0, 'rgba(28, 6, 16, 0.94)');
    bgGrad.addColorStop(0.5, 'rgba(18, 4, 12, 0.88)');
    bgGrad.addColorStop(1, 'rgba(10, 2, 8, 0.96)');
  } else if (isClubbing) {
    bgGrad.addColorStop(0, 'rgba(4, 18, 10, 0.85)');
    bgGrad.addColorStop(0.5, 'rgba(6, 28, 14, 0.72)');
    bgGrad.addColorStop(1, 'rgba(2, 12, 6, 0.90)');
  } else if (isMovie) {
    bgGrad.addColorStop(0, 'rgba(8, 8, 12, 0.78)');
    bgGrad.addColorStop(0.5, 'rgba(22, 14, 18, 0.65)');
    bgGrad.addColorStop(1, 'rgba(6, 6, 8, 0.85)');
  } else if (isVideoEssay) {
    bgGrad.addColorStop(0, 'rgba(10, 10, 14, 0.96)');
    bgGrad.addColorStop(0.5, 'rgba(18, 18, 24, 0.88)');
    bgGrad.addColorStop(1, 'rgba(8, 8, 10, 0.96)');
  } else {
    bgGrad.addColorStop(0, 'rgba(10, 4, 24, 0.80)');
    bgGrad.addColorStop(0.5, 'rgba(28, 8, 45, 0.65)');
    bgGrad.addColorStop(1, 'rgba(8, 2, 16, 0.88)');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, 350, width / 2, height / 2, 950);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, isCherry ? 'rgba(0, 0, 0, 0.82)' : ((isClubbing || isMovie) ? 'rgba(0, 0, 0, 0.85)' : (isVideoEssay ? 'rgba(0, 0, 0, 0.90)' : 'rgba(0, 0, 0, 0.70)')));
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Compute dynamic card geometry tailored to image aspect ratio
  const geom = computeStoryCardGeometry(img.width, img.height);
  const { cardX, cardY, cardW, cardH } = geom;
  const radius = 18;

  // Draw centered image inside card with rounded corners
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  // 3. Composite full branded Story overlay on top (borders, corner brackets, header, bottom bar, CTA)
  const overlayPngPath = generateStoryOverlay(cleanHandle, {
    ...options,
    theme,
    ...geom,
    inputWidth: img.width,
    inputHeight: img.height
  });
  const overlayImg = await loadImage(overlayPngPath);
  ctx.drawImage(overlayImg, 0, 0, width, height);

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const storyOutput = path.join(dir, `${base}_story_card.jpg`);

  fs.writeFileSync(storyOutput, canvas.toBuffer('image/jpeg'));

  const publicDir = path.join(__dirname, '..', '..', 'public');
  let rel = storyOutput.replace(publicDir, '').replace(/\\/g, '/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  return rel;
}

/**
 * Extracts an authentic high-resolution video frame at a given offset (default 1.5s)
 * Used as a genuine, non-AI cover thumbnail for Instagram Reels
 */
function extractVideoCover(inputVideoPath, shortcode = 'reel', offsetSec = 1.5) {
  return new Promise((resolve) => {
    let absPath = inputVideoPath;
    if (!fs.existsSync(absPath)) {
      const cleanRel = inputVideoPath.replace(/^[/\\]+/, '');
      const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
      if (fs.existsSync(candidate)) absPath = candidate;
    }

    if (!fs.existsSync(absPath)) {
      console.warn(`[FFmpeg Helper] Video not found for cover extraction: ${absPath}`);
      return resolve(null);
    }

    const publicDir = path.join(__dirname, '..', '..', 'public');
    const downloadsDir = path.join(publicDir, 'generated', 'downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

    const cleanCode = (shortcode || 'reel').replace(/[^a-zA-Z0-9_-]/g, '');
    const coverFileName = `cover_${cleanCode}_${Date.now()}.jpg`;
    const coverAbsPath = path.join(downloadsDir, coverFileName);

    const args = [
      '-y',
      '-ss', String(offsetSec),
      '-i', absPath,
      '-vframes', '1',
      '-q:v', '2',
      coverAbsPath
    ];

    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(coverAbsPath)) {
        let rel = coverAbsPath.replace(publicDir, '').replace(/\\/g, '/');
        if (!rel.startsWith('/')) rel = '/' + rel;
        console.log(`[FFmpeg Helper] 📸 Extracted authentic video cover at ${offsetSec}s: ${rel}`);
        resolve({ absPath: coverAbsPath, relPath: rel });
      } else {
        console.warn(`[FFmpeg Helper] Cover extraction exited with code ${code}`);
        resolve(null);
      }
    });
    proc.on('error', (err) => {
      console.warn(`[FFmpeg Helper] Cover extraction error: ${err.message}`);
      resolve(null);
    });
  });
}

module.exports = {
  renderReelVideo,
  isMetaCompliantVideo,
  ensureMetaCompliantVideo,
  ensureMetaCompliantImage,
  prepareVideoForStory,
  prepareImageForStory,
  computeStoryCardGeometry,
  generateStoryOverlay,
  generateFeedWatermark,
  applyBrandedFeedOverlay,
  generateFeedPostOverlay,
  generateClubbingCyberOverlay,
  generateEvolvingAiOverlay,
  isLetterboxedReel,
  detectActiveVideoBounds,
  parseHeadlineTokens,
  wrapTokens,
  prepareVideoForFeedCard,
  extractVideoCover,
  resolvePageTheme
};

