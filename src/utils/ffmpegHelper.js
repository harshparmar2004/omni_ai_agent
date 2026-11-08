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
  if (explicitTheme && ['clubbing', 'movies', 'video_essay', 'gta6', 'minimal'].includes(explicitTheme)) {
    return explicitTheme;
  }

  const page = (typeof pageOrHandle === 'object' && pageOrHandle !== null) ? pageOrHandle : {};
  const handle = (typeof pageOrHandle === 'string' ? pageOrHandle : (page.handle || '')).toLowerCase().replace(/^@+/, '');
  const slug = (page.slug || '').toLowerCase();
  const name = (page.name || '').toLowerCase();
  const preset = (page.template_preset || page.brand_theme || page.template_slug || '').toLowerCase();
  const niche = (page.niche || '').toLowerCase();

  const combined = `${handle} ${slug} ${name} ${preset} ${niche}`;

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
        '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v];[0:a]dynaudnorm=f=150:g=15:m=8.0:p=0.95,volume=1.15[a]',
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
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
    // 9:16 Vertical Reel
    cardW = 760;
    cardH = Math.round(cardW / ratio);
    if (cardH > 1360) {
      cardH = 1360;
      cardW = Math.round(cardH * ratio);
    }
  } else if (ratio <= 1.25) {
    // 4:5 Portrait / 1:1 Square
    cardW = 880;
    cardH = Math.round(cardW / ratio);
    if (cardH > 1150) {
      cardH = 1150;
      cardW = Math.round(cardH * ratio);
    }
  } else {
    // 16:9 Landscape / Widescreen Cinema
    cardW = 960;
    cardH = Math.round(cardW / ratio);
    if (cardH > 700) {
      cardH = 700;
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
  const headerY = Math.max(120, cardY - headerH - 24);

  const ctaH = 54;
  const ctaW = Math.min(cardW - 40, 440);
  const ctaX = Math.round((canvasW - ctaW) / 2);
  const ctaY = Math.min(canvasH - ctaH - 120, cardY + cardH + 24);

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
  const typeLabel = options.typeLabel || 'NEW REEL';
  const theme = options.theme || (
    cleanHandle.includes('club') || (options.page && options.page.slug === 'clubbing') ? 'clubbing' :
    (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies') ? 'movies' :
    (cleanHandle.includes('cult') || (options.page && options.page.slug === 'cult_information') || cleanHandle.includes('evolving') || (options.page && options.page.slug === 'ai_curation') ? 'video_essay' : 'gta6'))
  );
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay' || theme === 'cult_information' || theme === 'evolving_ai';

  // Compute or inherit dynamic geometry
  const computed = computeStoryCardGeometry(options.inputWidth || 1080, options.inputHeight || 1920);
  const cardX = options.cardX !== undefined ? options.cardX : computed.cardX;
  const cardY = options.cardY !== undefined ? options.cardY : computed.cardY;
  const cardW = options.cardW !== undefined ? options.cardW : computed.cardW;
  const cardH = options.cardH !== undefined ? options.cardH : computed.cardH;
  const headerX = options.headerX !== undefined ? options.headerX : Math.round((width - Math.min(cardW, 580)) / 2);
  const headerY = options.headerY !== undefined ? options.headerY : Math.max(120, cardY - 54 - 24);
  const headerW = options.headerW !== undefined ? options.headerW : Math.min(cardW, 580);
  const headerH = options.headerH !== undefined ? options.headerH : 54;
  const ctaX = options.ctaX !== undefined ? options.ctaX : Math.round((width - Math.min(cardW - 40, 440)) / 2);
  const ctaY = options.ctaY !== undefined ? options.ctaY : Math.min(height - 54 - 120, cardY + cardH + 24);
  const ctaW = options.ctaW !== undefined ? options.ctaW : Math.min(cardW - 40, 440);
  const ctaH = options.ctaH !== undefined ? options.ctaH : 54;

  // 1. Ambient Background color tint & vignette
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isClubbing) {
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
  vig.addColorStop(1, isClubbing ? 'rgba(0, 0, 0, 0.85)' : (isVideoEssay ? 'rgba(0, 0, 0, 0.90)' : 'rgba(0, 0, 0, 0.70)'));
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Center Card Cutout (smooth rounded corners)
  const radius = 24;
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

  // 3. Sleek hairline border around the media card
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  ctx.save();
  if (isClubbing) {
    borderGrad.addColorStop(0, '#00FFA3');   // Electric Neon Green
    borderGrad.addColorStop(0.5, '#00E5FF'); // Laser Mint / Cyan
    borderGrad.addColorStop(1, '#39FF14');   // Electric Lime
    ctx.shadowColor = 'rgba(0, 255, 163, 0.60)';
  } else if (isMovie) {
    borderGrad.addColorStop(0, 'rgba(255, 215, 120, 0.90)'); // Soft Champagne Gold
    borderGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.55)'); // Amber Gold
    borderGrad.addColorStop(1, 'rgba(193, 18, 31, 0.75)');   // Velvet Crimson accent
    ctx.shadowColor = 'rgba(212, 175, 55, 0.40)';
  } else if (isVideoEssay) {
    borderGrad.addColorStop(0, '#CCFF00');   // Electric Lime
    borderGrad.addColorStop(0.5, '#FFFFFF'); // Clean White Accent
    borderGrad.addColorStop(1, '#A6FF00');   // Vivid Lime
    ctx.shadowColor = 'rgba(204, 255, 0, 0.50)';
  } else {
    borderGrad.addColorStop(0, '#00F0FF');   // Cyan glow
    borderGrad.addColorStop(0.5, '#F72585'); // Neon Pink
    borderGrad.addColorStop(1, '#FF8A00');   // Sunset Orange
    ctx.shadowColor = 'rgba(247, 37, 133, 0.45)';
  }

  ctx.shadowBlur = 16;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Top Header: Minimal Frosted Glass Badge
  ctx.save();
  ctx.fillStyle = isClubbing ? 'rgba(4, 18, 10, 0.90)' : (isVideoEssay ? 'rgba(14, 14, 18, 0.95)' : 'rgba(14, 14, 18, 0.88)');
  ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.45)' : (isMovie ? 'rgba(255, 215, 120, 0.35)' : (isVideoEssay ? 'rgba(204, 255, 0, 0.60)' : 'rgba(247, 37, 133, 0.35)'));
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(headerX, headerY, headerW, headerH, 27);
  } else {
    ctx.rect(headerX, headerY, headerW, headerH);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Top Header Text (safe typography)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isClubbing) {
    ctx.fillText(`@${cleanHandle.toLowerCase()}`, width / 2, headerY + headerH / 2);
  } else if (isMovie) {
    ctx.fillText(`@${cleanHandle}  |  Cinema Picks`, width / 2, headerY + headerH / 2);
  } else if (isVideoEssay) {
    ctx.fillText(`⚡ ${cleanHandle.includes('cult') ? 'Cult Information' : 'Evolving AI'}  |  Daily Knowledge`, width / 2, headerY + headerH / 2);
  } else {
    ctx.fillText(`@${cleanHandle}  |  Official News & Leaks`, width / 2, headerY + headerH / 2);
  }

  // 5. Bottom CTA Sticker (clean interactive pill)
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  ctx.save();
  if (isClubbing) {
    ctaGrad.addColorStop(0, 'rgba(0, 255, 163, 0.95)');
    ctaGrad.addColorStop(1, 'rgba(0, 180, 110, 0.95)');
    ctx.shadowColor = 'rgba(0, 255, 163, 0.55)';
  } else if (isMovie) {
    ctaGrad.addColorStop(0, 'rgba(193, 18, 31, 0.90)');
    ctaGrad.addColorStop(1, 'rgba(120, 0, 0, 0.90)');
    ctx.shadowColor = 'rgba(193, 18, 31, 0.45)';
  } else if (isVideoEssay) {
    ctaGrad.addColorStop(0, '#CCFF00');
    ctaGrad.addColorStop(1, '#99E600');
    ctx.shadowColor = 'rgba(204, 255, 0, 0.60)';
  } else {
    ctaGrad.addColorStop(0, 'rgba(247, 37, 133, 0.90)');
    ctaGrad.addColorStop(1, 'rgba(114, 9, 183, 0.90)');
    ctx.shadowColor = 'rgba(247, 37, 133, 0.45)';
  }
  ctx.shadowBlur = 14;
  ctx.fillStyle = ctaGrad;
  ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.5)' : (isVideoEssay ? 'rgba(204, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.25)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
  } else {
    ctx.rect(ctaX, ctaY, ctaW, ctaH);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = isClubbing ? '#051209' : (isVideoEssay ? '#000000' : '#FFFFFF');
  ctx.font = isVideoEssay ? '900 20px Arial, sans-serif' : 'bold 19px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isClubbing) {
    ctx.fillText('Watch Live Set  >', width / 2, ctaY + ctaH / 2);
  } else if (isMovie) {
    ctx.fillText('Watch Full Scene  >', width / 2, ctaY + ctaH / 2);
  } else if (isVideoEssay) {
    ctx.fillText('⚡ Watch Full Reel  >', width / 2, ctaY + ctaH / 2);
  } else {
    ctx.fillText('Watch Full Reel  >', width / 2, ctaY + ctaH / 2);
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
 * Tokenizes headline text supporting explicit markdown (**highlighted**)
 * as well as smart automatic keyword/number highlighting in brand colors.
 */
function parseHeadlineTokens(rawHeadline) {
  if (!rawHeadline) return [];
  const clean = rawHeadline
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”\s]+/, '')
    .replace(/["'“”\s]+$/, '')
    .trim();

  const hasExplicitMarkup = /\*\*.*?\*\*|\*.*?\*|<hl>.*?<\/hl>/.test(clean);
  const tokens = [];

  if (hasExplicitMarkup) {
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|<hl>([^<]+)<\/hl>|\S+)/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      if (match[2]) {
        match[2].trim().split(/\s+/).forEach(w => tokens.push({ text: w, highlight: true }));
      } else if (match[3]) {
        match[3].trim().split(/\s+/).forEach(w => tokens.push({ text: w, highlight: true }));
      } else if (match[4]) {
        match[4].trim().split(/\s+/).forEach(w => tokens.push({ text: w, highlight: true }));
      } else {
        tokens.push({ text: match[0], highlight: false });
      }
    }
  } else {
    // Smart auto-highlighting: numbers, currencies, percentages, and high-impact viral trigger words
    const words = clean.split(/\s+/);
    let highlightCount = 0;
    const maxAutoHighlights = 2;
    const viralPattern = /^(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\d+[-a-zA-Z0-9]+|world's|first|secret|secrets|unveiled|revealed|exposed|shocking|banned|billionaires|billionaire|anthem|satire|record|million|billion|trillion|blackwell|breakthrough|warning|mystery|truth|danger|leaked|classified|impossible|ai|robot|robots|revolution|future)$/i;

    const stopWords = new Set([
      'about','above','after','again','against','all','also','and','any','because','been',
      'before','being','below','between','both','came','come','could','doing','down',
      'during','each','even','ever','every','from','further','great','have','having',
      'here','into','just','leave','more','most','much','never','only','other','over',
      'same','should','some','someone','something','started','such','than','that','their',
      'theirs','them','then','there','these','they','thing','things','this','those',
      'through','under','until','very','what','when','where','which','while','with',
      'would','your','yours'
    ]);

    // Pass 1: Check viral pattern and numbers
    const tokenList = words.map(w => {
      const cleanW = w.replace(/^[^a-zA-Z0-9$]+|[^a-zA-Z0-9%]+$/g, '');
      const shouldHighlight = highlightCount < maxAutoHighlights && viralPattern.test(cleanW);
      if (shouldHighlight) highlightCount++;
      return { text: w, highlight: shouldHighlight, clean: cleanW.toLowerCase() };
    });

    // Pass 2: If no words were highlighted, guarantee 1-2 semantic content words get brand lime highlight!
    if (highlightCount === 0) {
      const candidates = [];
      tokenList.forEach((t, idx) => {
        if (t.clean.length >= 5 && !stopWords.has(t.clean)) {
          candidates.push({ idx, length: t.clean.length });
        }
      });
      // Sort candidates by length descending to pick the most impactful words
      candidates.sort((a, b) => b.length - a.length);
      if (candidates.length > 0) {
        tokenList[candidates[0].idx].highlight = true;
        highlightCount++;
        if (candidates.length > 1 && Math.abs(candidates[0].idx - candidates[1].idx) > 1) {
          tokenList[candidates[1].idx].highlight = true;
          highlightCount++;
        }
      } else if (tokenList.length >= 3) {
        tokenList[tokenList.length - 2].highlight = true;
      }
    }

    tokens.push(...tokenList.map(t => ({ text: t.text, highlight: t.highlight })));
  }

  return tokens;
}

function wrapTokens(ctx, tokens, maxWidth) {
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
  const hookHeadline = options.hookHeadline || options.headline || 'The next generation of AI is evolving faster than anyone expected';
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

  // 3. Ergonomic Downward Layout & Spacing:
  // Dynamically position Cult Information logo & headline closer to the video (cardY),
  // leaving comfortable top margin below Instagram chrome and ensuring 100% black belt coverage!
  const marginX = 54;
  const maxTextWidth = width - (marginX * 2);
  const avatarSize = 118; // Prominent, high-impact brand logo (was 84px)
  const lineHeight = 62;
  const spaceAboveVideo = 36;
  const spaceBetweenHeaderAndHeadline = 28;

  ctx.font = '900 48px RobotoBlack, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';

  const cleanHeadline = (hookHeadline || 'Breakthrough AI technology is evolving faster than anyone expected')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”\s]+/, '')
    .replace(/["'“”\s]+$/, '')
    .trim();

  const tokens = parseHeadlineTokens(cleanHeadline);
  const lines = wrapTokens(ctx, tokens, maxTextWidth);
  const totalTextHeight = lines.length * lineHeight;

  // 3. Ergonomic Top-Anchored & Responsive Ratio Layout:
  const minSafeTopMargin = 124; // Clean margin below Instagram's top header bar
  const totalBrandingHeight = avatarSize + spaceBetweenHeaderAndHeadline + totalTextHeight;

  let headerTopY;
  let headlineY;

  if (options.headerTopY !== undefined && options.headlineY !== undefined) {
    headerTopY = options.headerTopY;
    headlineY = options.headlineY;
  } else {
    const availableTopSpace = cardY - spaceAboveVideo - minSafeTopMargin;

    if (availableTopSpace >= totalBrandingHeight + 30) {
      const idealHeaderY = minSafeTopMargin + Math.round((availableTopSpace - totalBrandingHeight) / 2);
      headerTopY = Math.min(Math.max(minSafeTopMargin, idealHeaderY), 190);
      headlineY = headerTopY + avatarSize + spaceBetweenHeaderAndHeadline;
    } else {
      headerTopY = Math.max(100, Math.min(minSafeTopMargin, cardY - totalBrandingHeight - spaceAboveVideo));
      headlineY = headerTopY + avatarSize + spaceBetweenHeaderAndHeadline;
    }
  }

  // Circular Logo Avatar (118px diameter)
  const avatarCenter = marginX + avatarSize / 2;
  const avatarCenterY = headerTopY + avatarSize / 2;
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

  // Solid dark backdrop for avatar circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#08080A';
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
      ctx.drawImage(avatarImg, marginX, headerTopY, avatarSize, avatarSize);
    } catch (e) {
      console.warn('[FFmpeg Helper] Avatar image load error:', e.message);
    }
  } else {
    // Dynamic Modern Monogram based on actual page name
    const bgGrad = ctx.createLinearGradient(marginX, headerTopY, marginX + avatarSize, headerTopY + avatarSize);
    bgGrad.addColorStop(0, '#1E1E24');
    bgGrad.addColorStop(1, '#0A0A0F');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    const words = (pageName || 'Channel').trim().split(/\s+/);
    const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();

    ctx.fillStyle = options.highlightColor || '#c1d82f'; // Cult signature lime
    ctx.font = '900 42px RobotoBlack, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, avatarCenter, avatarCenterY);
  }
  ctx.restore();

  // Signature Cult Neon Lime Double Glow Border Ring
  const highlightColor = options.highlightColor || '#c1d82f'; // Signature Cult neon lime green
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = 'rgba(193, 216, 47, 0.5)';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  // Page Name + Verified Badge
  const textLeftX = marginX + avatarSize + 22;
  ctx.save();
  ctx.font = 'bold 36px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  const nameCenterY = headerTopY + 38;
  ctx.fillText(pageName, textLeftX, nameCenterY);

  const rawNameWidth = ctx.measureText(pageName).width;
  const nameWidth = (rawNameWidth && rawNameWidth > 50 && rawNameWidth < 450) ? rawNameWidth : 260;
  const badgeSize = 24;
  drawVerifiedBadge(ctx, textLeftX + nameWidth + 12, nameCenterY - (badgeSize / 2), badgeSize);

  // Handle below name
  ctx.font = '500 24px RobotoMedium, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
  ctx.fillStyle = '#A0A0AB'; // Sleek iOS silver
  ctx.textBaseline = 'middle';
  const handleCenterY = headerTopY + 80;
  const rawHandle = options.page?.handle || cleanHandle;
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;
  ctx.fillText(displayHandle, textLeftX, handleCenterY);
  ctx.restore();

  // 4. Punchy Viral Headline / Hook with Brand Color Word Highlighting
  ctx.save();
  ctx.font = '900 48px RobotoBlack, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
  ctx.textBaseline = 'top';
  const spaceWidth = ctx.measureText(' ').width;

  lines.forEach((lineTokens, lineIdx) => {
    let currentX = marginX;
    const currentY = headlineY + (lineIdx * lineHeight);
    for (const token of lineTokens) {
      ctx.fillStyle = token.highlight ? highlightColor : '#FFFFFF';
      ctx.fillText(token.text, currentX, currentY);
      currentX += ctx.measureText(token.text).width + spaceWidth;
    }
  });
  ctx.restore();

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `feed_frame_overlay_${cleanHandle || 'evolving_ai'}.png`);
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
    // Elevated upwards into safe upper margin with cinema avatar, verified badge, and clean dynamic page name
    const rawPageName = (options.pageName || options.page?.name || cleanHandle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).trim();
    const displayPageName = rawPageName.replace(/^@+/, '');
    const rawHandle = (options.page?.handle || cleanHandle).trim();
    const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle.replace(/^@+/, '')}`;

    const brandingDir = path.join(__dirname, '..', '..', 'public', 'branding');
    const candidateAvatarPaths = [
      options.avatarPath,
      options.page?.avatar_path,
      options.page?.brand_logo_path,
      path.join(brandingDir, `${cleanHandle}_avatar.png`),
      path.join(brandingDir, `${cleanHandle}_avatar.jpg`),
      path.join(brandingDir, 'movie_series_365_avatar.png'),
      path.join(brandingDir, 'movies_avatar.png'),
      path.join(brandingDir, 'cinema_avatar.png')
    ].filter(Boolean);
    const existingAvatarPath = candidateAvatarPaths.find(p => fs.existsSync(p));

    const avSize = 36;
    const avGap = 12;
    const badgeSep = '  |  ';
    const badgeText2 = 'Cinema Picks';

    ctx.save();
    ctx.font = 'bold 24px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    const nameW = ctx.measureText(displayPageName).width;
    const badgeW24 = 24; // verified checkmark
    const badgeGap = 8;
    ctx.font = 'bold 20px RobotoMedium, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    const sepW = ctx.measureText(badgeSep).width;
    ctx.font = '600 22px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    const subW = ctx.measureText(badgeText2).width;

    const padX = 24;
    const totalContentW = avSize + avGap + nameW + badgeGap + badgeW24 + sepW + subW;
    const boxW = Math.min(width - 60, Math.round(totalContentW + padX * 2));
    const boxH = 58;
    const boxX = Math.round((width - boxW) / 2);
    // Elevated upwards cleanly as requested by user (Y ~ 92-96px)
    const boxY = isVertical ? Math.max(86, Math.min(96, cardY - boxH - 24)) : 96;
    const radius = 12;

    // Glowing obsidian glass box
    ctx.shadowColor = 'rgba(255, 183, 3, 0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(10, 10, 16, 0.94)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
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
    ctx.roundRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, radius - 2);
    ctx.stroke();

    // Content Start X
    const contentStartX = boxX + (boxW - totalContentW) / 2;
    const centerY = boxY + boxH / 2;

    // 1. Cinema Avatar Logo on Left
    const avX = contentStartX;
    const avY = centerY - avSize / 2;
    const avCx = avX + avSize / 2;
    const avCy = centerY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avCx, avCy, avSize / 2, 0, Math.PI * 2);
    ctx.clip();

    if (existingAvatarPath) {
      try {
        const avatarImg = await loadImage(existingAvatarPath);
        ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
      } catch (_) {
        ctx.fillStyle = '#1A0E04';
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#1A0E04';
      ctx.fill();
      ctx.fillStyle = '#FFD166';
      ctx.font = '900 16px RobotoBlack, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = displayPageName.split(/\s+/).filter(Boolean);
      const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
      ctx.fillText(initials || 'MS', avCx, avCy);
    }
    ctx.restore();

    // Golden Avatar Ring
    ctx.save();
    ctx.strokeStyle = '#FFD166';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 183, 3, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(avCx, avCy, avSize / 2 + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Page Name in crisp white
    let curX = avX + avSize + avGap;
    ctx.save();
    ctx.font = 'bold 24px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(displayPageName, curX, centerY + 1);
    curX += nameW + badgeGap;

    // 3. Verified Badge
    drawVerifiedBadge(ctx, curX, centerY - (badgeW24 / 2), badgeW24);
    curX += badgeW24;

    // 4. Separator in amber gold
    ctx.font = 'bold 20px RobotoMedium, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#FFB703';
    ctx.fillText(badgeSep, curX, centerY + 1);
    curX += sepW;

    // 5. "Cinema Picks" in champagne gold
    ctx.font = '600 22px RobotoBold, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#FFD166';
    ctx.fillText(badgeText2, curX, centerY + 1);
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
      const avatarSize = 118;
      const lineHeight = 62;
      const spaceAboveVideo = 36;
      const spaceBetweenHeaderAndHeadline = 26;

      ctx.font = '900 48px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      const tokens = parseHeadlineTokens(cleanHeadline);
      const lines = wrapTokens(ctx, tokens, maxTextWidth);
      const totalTextHeight = lines.length * lineHeight;
      const totalBrandingHeight = avatarSize + spaceBetweenHeaderAndHeadline + totalTextHeight;

      const minSafeTopMargin = 124;
      const availableTopSpace = cardY - spaceAboveVideo - minSafeTopMargin;
      let headerTopY, headlineY;

      if (availableTopSpace >= totalBrandingHeight + 30) {
        const idealHeaderY = minSafeTopMargin + Math.round((availableTopSpace - totalBrandingHeight) / 2);
        headerTopY = Math.min(Math.max(minSafeTopMargin, idealHeaderY), 190);
        headlineY = headerTopY + avatarSize + spaceBetweenHeaderAndHeadline;
      } else {
        headerTopY = Math.max(100, Math.min(minSafeTopMargin, cardY - totalBrandingHeight - spaceAboveVideo));
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
          ctx.drawImage(avatarImg, marginX, headerTopY, avatarSize, avatarSize);
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
        ctx.fillStyle = highlightColor;
        ctx.font = '900 44px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, avatarCenter, avatarCenterY);
      }
      ctx.restore();

      // 2. Dual-Glow Neon Avatar Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(marginX, headerTopY, marginX + avatarSize, headerTopY + avatarSize);
      ringGrad.addColorStop(0, highlightColor);
      ringGrad.addColorStop(1, secondaryColor);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = isMovie ? 'rgba(255, 183, 3, 0.75)' : (isGTA6 ? 'rgba(247, 37, 133, 0.8)' : 'rgba(56, 189, 248, 0.7)');
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();

      // 3. Page Name & Verified Badge
      const textLeftX = marginX + avatarSize + 22;
      ctx.save();
      ctx.font = 'bold 36px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      const nameCenterY = headerTopY + 38;
      ctx.fillText(pageName, textLeftX, nameCenterY);

      const nameWidth = ctx.measureText(pageName).width;
      const badgeSize = 24;
      drawVerifiedBadge(ctx, textLeftX + nameWidth + 12, nameCenterY - (badgeSize / 2), badgeSize);

      // 4. Handle below Page Name
      ctx.font = '500 24px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#A0A0AB';
      ctx.textBaseline = 'middle';
      const handleCenterY = headerTopY + 80;
      const displayHandle = cleanHandle.startsWith('@') ? cleanHandle : '@' + cleanHandle;
      ctx.fillText(displayHandle, textLeftX, handleCenterY);

      // Right-aligned theme badge in small box
      const tagText = isMovie ? 'CINEMA PICKS' : (isGTA6 ? 'GTA VI' : 'OFFICIAL');
      ctx.font = '900 16px "Arial Black", Arial, sans-serif';
      const tagW = ctx.measureText(tagText).width + 24;
      const tagH = 34;
      const tagX = width - marginX - tagW;
      const tagY = headerTopY + 28;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 8);
      ctx.fill();
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = highlightColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagX + tagW / 2, tagY + tagH / 2 + 1);

      ctx.restore();

      // 5. Punchy Viral Hook Headline with Theme Highlight
      ctx.save();
      ctx.font = '900 48px Arial, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      ctx.textBaseline = 'top';
      const spaceWidth = ctx.measureText(' ').width;

      lines.forEach((lineTokens, lineIdx) => {
        let currentX = marginX;
        const currentY = headlineY + (lineIdx * lineHeight);
        for (const token of lineTokens) {
          ctx.fillStyle = token.highlight ? highlightColor : '#FFFFFF';
          ctx.fillText(token.text, currentX, currentY);
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
          `[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]`,
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
            '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]',
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
        '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4[bg]',
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
        '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]',
        `[fg_raw]scale=${cardW}:${cardH}[card]`,
        `[bg][card]overlay=${cardX}:${cardY}[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    }
  }

  const overlayPngPath = await generateFeedPostOverlay(handle, { cardX, cardY, cardW, cardH, isVertical, theme, pageName: options.pageName || options.page?.name, ...options });

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const framedOutput = path.join(dir, `${base}_feed_framed.mp4`);

  const themeName = isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information Video-Essay' : 'GTA 6 Vice City'));
  console.log(`[FFmpeg Helper] 🎨 Composing ${themeName} Framed Feed Reel for @${handle} (${isVertical ? '9:16 Full Immersion' : `${inW}x${inH} Adaptive`} ${cardW}x${cardH})...`);

  // Build filter graph combining video framing and audio normalization in ONE pass
  // Guarantees compliant stereo 44.1kHz AAC audio stream for Meta Graph API Reel ingestion
  const fullFilter = hasAudio
    ? `${videoFilter};[0:a]dynaudnorm=f=150:g=15:m=8.0:p=0.95,volume=1.15,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[outa]`
    : `${videoFilter};anullsrc=channel_layout=stereo:sample_rate=44100[outa]`;

  return new Promise((resolve) => {
    const args = [
      '-y',
      '-i', absPath,
      '-i', overlayPngPath,
      '-filter_complex', fullFilter,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '20',
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
    handle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' :
    (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' :
    (handle.includes('cult') || options.page?.slug === 'cult_information' || handle.includes('evolving') || options.page?.slug === 'ai_curation' ? 'video_essay' : 'gta6'))
  );
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

  const themeName = isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information Editorial' : 'GTA 6'));
  console.log(`[FFmpeg Helper] 🎨 Composing ${themeName} Instagram Story Reel Card for @${handle} (${videoWidth}x${videoHeight} -> Card ${geom.cardW}x${geom.cardH} @ ${geom.cardX},${geom.cardY})...`);

  const filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=32:5,eq=brightness=-0.32:contrast=0.94[bg]',
    `[fg_raw]scale=${geom.cardW}:${geom.cardH}[card]`,
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
      '-crf', '20',
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
    cleanHandle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' :
    (options.page?.slug === 'movies' || cleanHandle.includes('movie') ? 'movies' :
    (cleanHandle.includes('cult') || options.page?.slug === 'cult_information' || cleanHandle.includes('evolving') || options.page?.slug === 'ai_curation' ? 'video_essay' : 'gta6'))
  );
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
  if (isClubbing) {
    bgGrad.addColorStop(0, 'rgba(4, 18, 10, 0.85)');
    bgGrad.addColorStop(0.5, 'rgba(6, 28, 14, 0.72)');
    bgGrad.addColorStop(1, 'rgba(2, 12, 6, 0.90)');
  } else if (isMovie) {
    bgGrad.addColorStop(0, 'rgba(8, 8, 12, 0.78)');
    bgGrad.addColorStop(0.5, 'rgba(22, 14, 18, 0.65)');
    bgGrad.addColorStop(1, 'rgba(6, 6, 8, 0.85)');
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
  vig.addColorStop(1, (isClubbing || isMovie) ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.70)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Compute dynamic card geometry tailored to image aspect ratio
  const geom = computeStoryCardGeometry(img.width, img.height);
  const { cardX, cardY, cardW, cardH, headerX, headerY, headerW, headerH, ctaX, ctaY, ctaW, ctaH } = geom;
  const radius = 24;

  // Draw centered image inside card with rounded corners
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  // Draw sleek hairline border around the image card
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  ctx.save();
  if (isClubbing) {
    borderGrad.addColorStop(0, '#00FFA3');
    borderGrad.addColorStop(0.5, '#00E5FF');
    borderGrad.addColorStop(1, '#39FF14');
    ctx.shadowColor = 'rgba(0, 255, 163, 0.60)';
  } else if (isMovie) {
    borderGrad.addColorStop(0, 'rgba(255, 215, 120, 0.90)');
    borderGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.55)');
    borderGrad.addColorStop(1, 'rgba(193, 18, 31, 0.75)');
    ctx.shadowColor = 'rgba(212, 175, 55, 0.40)';
  } else {
    borderGrad.addColorStop(0, '#00F0FF');
    borderGrad.addColorStop(0.5, '#F72585');
    borderGrad.addColorStop(1, '#FF8A00');
    ctx.shadowColor = 'rgba(247, 37, 133, 0.45)';
  }

  ctx.shadowBlur = 16;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.stroke();
  ctx.restore();

  // 3. Top Header: Minimal Frosted Glass Badge
  ctx.save();
  ctx.fillStyle = isClubbing ? 'rgba(4, 18, 10, 0.90)' : 'rgba(14, 14, 18, 0.88)';
  ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.45)' : (isMovie ? 'rgba(255, 215, 120, 0.35)' : 'rgba(247, 37, 133, 0.35)');
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
    ctx.fillText(`@${cleanHandle}  |  Live Sets & Parties`, width / 2, headerY + headerH / 2);
  } else if (isMovie) {
    ctx.fillText(`@${cleanHandle}  |  Cinema Picks`, width / 2, headerY + headerH / 2);
  } else {
    ctx.fillText(`@${cleanHandle}  |  Official News & Leaks`, width / 2, headerY + headerH / 2);
  }

  // 4. Bottom CTA Sticker
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  ctx.save();
  if (isClubbing) {
    ctaGrad.addColorStop(0, 'rgba(0, 255, 163, 0.95)');
    ctaGrad.addColorStop(1, 'rgba(0, 180, 110, 0.95)');
    ctx.shadowColor = 'rgba(0, 255, 163, 0.55)';
  } else if (isMovie) {
    ctaGrad.addColorStop(0, 'rgba(193, 18, 31, 0.90)');
    ctaGrad.addColorStop(1, 'rgba(120, 0, 0, 0.90)');
    ctx.shadowColor = 'rgba(193, 18, 31, 0.45)';
  } else {
    ctaGrad.addColorStop(0, 'rgba(247, 37, 133, 0.90)');
    ctaGrad.addColorStop(1, 'rgba(114, 9, 183, 0.90)');
    ctx.shadowColor = 'rgba(247, 37, 133, 0.45)';
  }
  ctx.shadowBlur = 14;
  ctx.fillStyle = ctaGrad;
  ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.5)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
  else ctx.rect(ctaX, ctaY, ctaW, ctaH);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = isClubbing ? '#051209' : '#FFFFFF';
  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isClubbing) {
    ctx.fillText('Watch Live Set  >', width / 2, ctaY + ctaH / 2);
  } else if (isMovie) {
    ctx.fillText('View Full Post  >', width / 2, ctaY + ctaH / 2);
  } else {
    ctx.fillText('View Full Post  >', width / 2, ctaY + ctaH / 2);
  }

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
  prepareVideoForFeedCard,
  extractVideoCover,
  resolvePageTheme
};

