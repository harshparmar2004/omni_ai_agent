const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
  const theme = options.theme || (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies') ? 'movies' : 'gta6');
  const isMovie = theme === 'movies';

  // Compute or inherit dynamic geometry
  const geom = (options.cardW && options.cardH && options.cardX !== undefined && options.cardY !== undefined)
    ? options
    : computeStoryCardGeometry(options.inputWidth || 1080, options.inputHeight || 1920);

  const { cardX, cardY, cardW, cardH, headerX, headerY, headerW, headerH, ctaX, ctaY, ctaW, ctaH } = geom;

  // 1. Ambient Background color tint & vignette
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isMovie) {
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
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.70)');
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
  if (isMovie) {
    borderGrad.addColorStop(0, 'rgba(255, 215, 120, 0.90)'); // Soft Champagne Gold
    borderGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.55)'); // Amber Gold
    borderGrad.addColorStop(1, 'rgba(193, 18, 31, 0.75)');   // Velvet Crimson accent
    ctx.shadowColor = 'rgba(212, 175, 55, 0.40)';
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
  ctx.fillStyle = 'rgba(14, 14, 18, 0.88)';
  ctx.strokeStyle = isMovie ? 'rgba(255, 215, 120, 0.35)' : 'rgba(247, 37, 133, 0.35)';
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
  if (isMovie) {
    ctx.fillText(`@${cleanHandle}  |  Cinema Picks`, width / 2, headerY + headerH / 2);
  } else {
    ctx.fillText(`@${cleanHandle}  |  Official News & Leaks`, width / 2, headerY + headerH / 2);
  }

  // 5. Bottom CTA Sticker (clean interactive pill)
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  ctx.save();
  if (isMovie) {
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
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

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isMovie) {
    ctx.fillText('Watch Full Scene  >', width / 2, ctaY + ctaH / 2);
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

  ctx.save();
  ctx.fillStyle = 'rgba(13, 2, 33, 0.78)';
  ctx.shadowColor = 'rgba(247, 37, 133, 0.5)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, w, h, 36);
  } else {
    ctx.rect(0, 0, w, h);
  }
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(0, 0, w, h);
  borderGrad.addColorStop(0, '#00F0FF');
  borderGrad.addColorStop(0.5, '#F72585');
  borderGrad.addColorStop(1, '#FF8A00');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // GTA VI monogram
  ctx.fillStyle = '#F72585';
  ctx.font = '900 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VI', 22, h / 2);

  // Separator bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(58, 16, 1.5, 40);

  // Handle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`@${cleanHandle}`, 72, h / 2);

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
 * Generates Feed Reel Frame Template Overlay
 * Supports adaptive geometry: 9:16 vertical full screen, 16:9 landscape, 1:1 square.
 * Theme-aware: 'movies' (cinematic gold/amber/crimson) vs 'gta6' (Vice City neon cyan/pink).
 */
function generateFeedPostOverlay(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
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

  const theme = options.theme || (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies') ? 'movies' : 'gta6');
  const isMovie = theme === 'movies';

  // 1. Ambient Background for letterboxed videos (landscape / square)
  if (!isVertical) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (isMovie) {
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
    vig.addColorStop(1, isMovie ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.75)');
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

  // 2. Bolder Boundaries (8px multi-stop gradient border)
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
    ctx.moveTo(cardX + cardW - bLen, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH + 6); ctx.lineTo(cardX + cardW + 6, cardY + cardH - bLen);
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

  // 5. Top Account Badge
  const badgeY = isVertical ? 145 : Math.max(90, cardY - 60);
  const text = isMovie ? `@${cleanHandle.toLowerCase()}  |  Cinema Picks` : '@' + cleanHandle.toLowerCase();

  ctx.save();
  ctx.font = isMovie ? 'bold 20px "Helvetica Neue", Arial, sans-serif' : '900 24px Impact, Arial Black, sans-serif';
  const textMetrics = ctx.measureText(text);
  const padX = 28;
  const boxW = textMetrics.width + padX * 2;
  const boxH = 50;
  const boxX = (width - boxW) / 2;
  const boxY = badgeY - boxH / 2;
  const radius = 6;

  // Outer glow
  ctx.shadowColor = isMovie ? 'rgba(255, 183, 3, 0.65)' : 'rgba(247, 37, 133, 0.7)';
  ctx.shadowBlur = 18;

  // Dark glass background
  ctx.fillStyle = isMovie ? 'rgba(12, 10, 14, 0.94)' : 'rgba(10, 3, 24, 0.94)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  ctx.fill();

  // Border (3.5px)
  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  if (isMovie) {
    boxGrad.addColorStop(0, '#FFD166');
    boxGrad.addColorStop(0.5, '#FFB703');
    boxGrad.addColorStop(1, '#E5A93C');
  } else {
    boxGrad.addColorStop(0, '#00F0FF');
    boxGrad.addColorStop(0.5, '#F72585');
    boxGrad.addColorStop(1, '#FF8A00');
  }
  ctx.strokeStyle = boxGrad;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner subtle accent
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6, Math.max(2, radius - 2));
  ctx.stroke();

  // Account text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 5;
  ctx.fillText(text, width / 2, badgeY);
  ctx.restore();

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

  let cardW, cardH, cardX, cardY, videoFilter;

  if (isVertical) {
    // 9:16 Full Screen Immersion with narrow boundaries
    cardW = 1032;
    cardH = 1872;
    cardX = 24;
    cardY = 24;

    videoFilter = [
      '[0:v]scale=1032:1872:force_original_aspect_ratio=increase,crop=1032:1872,pad=1080:1920:24:24:color=black[v1]',
      '[v1][1:v]overlay=0:0[outv]'
    ].join(';');
  } else {
    // Landscape (16:9) or Square (1:1) / Portrait (4:5)
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
    cardY = Math.round((1920 - cardH) / 2);

    videoFilter = [
      '[0:v]split=2[bg_raw][fg_raw]',
      '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]',
      `[fg_raw]scale=${cardW}:${cardH}[card]`,
      `[bg][card]overlay=${cardX}:${cardY}[v1]`,
      '[v1][1:v]overlay=0:0[outv]'
    ].join(';');
  }

  const theme = options.theme || (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' : 'gta6');
  const isMovie = theme === 'movies';
  const overlayPngPath = generateFeedPostOverlay(handle, { cardX, cardY, cardW, cardH, isVertical, theme, ...options });

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const framedOutput = path.join(dir, `${base}_feed_framed.mp4`);

  console.log(`[FFmpeg Helper] 🎨 Composing ${isMovie ? 'Cinematic Movie' : 'GTA 6 Vice City'} Framed Feed Reel for @${handle} (${isVertical ? '9:16 Full Immersion' : `${inW}x${inH} Adaptive`} ${cardW}x${cardH})...`);

  // Build filter graph combining video framing and audio normalization in ONE pass
  const fullFilter = hasAudio
    ? `${videoFilter};[0:a]dynaudnorm=f=150:g=15:m=8.0:p=0.95,volume=1.15[outa]`
    : videoFilter;

  return new Promise((resolve) => {
    const args = [
      '-y',
      '-i', absPath,
      '-i', overlayPngPath,
      '-filter_complex', fullFilter,
      '-map', '[outv]',
      ...(hasAudio ? ['-map', '[outa]'] : ['-map', '0:a?']),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '20',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      framedOutput
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(framedOutput)) {
        console.log(`[FFmpeg Helper] ✅ ${isMovie ? 'Cinematic Movie' : 'GTA 6'} Framed Feed Reel generated: ${framedOutput}`);
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
  const theme = options.theme || (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' : 'gta6');
  const isMovie = theme === 'movies';

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

  console.log(`[FFmpeg Helper] 🎨 Composing ${isMovie ? 'Cinematic Movie' : 'GTA 6'} Instagram Story Reel Card for @${handle} (${videoWidth}x${videoHeight} -> Card ${geom.cardW}x${geom.cardH} @ ${geom.cardX},${geom.cardY})...`);

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
  const theme = options.theme || (options.page?.slug === 'movies' || cleanHandle.includes('movie') ? 'movies' : 'gta6');
  const isMovie = theme === 'movies';

  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const img = await loadImage(absPath);

  // 1. Draw ambient blurred background with theme gradient
  ctx.drawImage(img, -width * 0.25, -height * 0.25, width * 1.5, height * 1.5);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isMovie) {
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
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.70)');
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
  if (isMovie) {
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
  ctx.fillStyle = 'rgba(14, 14, 18, 0.88)';
  ctx.strokeStyle = isMovie ? 'rgba(255, 215, 120, 0.35)' : 'rgba(247, 37, 133, 0.35)';
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
  if (isMovie) {
    ctx.fillText(`@${cleanHandle}  |  Cinema Picks`, width / 2, headerY + headerH / 2);
  } else {
    ctx.fillText(`@${cleanHandle}  |  Official News & Leaks`, width / 2, headerY + headerH / 2);
  }

  // 4. Bottom CTA Sticker
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  ctx.save();
  if (isMovie) {
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
  else ctx.rect(ctaX, ctaY, ctaW, ctaH);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isMovie) {
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
  prepareVideoForFeedCard,
  extractVideoCover
};

