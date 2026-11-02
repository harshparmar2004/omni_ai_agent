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
  const theme = options.theme || (cleanHandle.includes('club') || (options.page && options.page.slug === 'clubbing') ? 'clubbing' : (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies') ? 'movies' : 'gta6'));
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';

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
  vig.addColorStop(1, isClubbing ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.70)');
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
  ctx.fillStyle = isClubbing ? 'rgba(4, 18, 10, 0.90)' : 'rgba(14, 14, 18, 0.88)';
  ctx.strokeStyle = isClubbing ? 'rgba(0, 255, 163, 0.45)' : (isMovie ? 'rgba(255, 215, 120, 0.35)' : 'rgba(247, 37, 133, 0.35)');
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
  if (ctx.roundRect) {
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
  } else {
    ctx.rect(ctaX, ctaY, ctaW, ctaH);
  }
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
function generateClubbingCyberOverlay(handle, options = {}) {
  const cleanHandle = (handle || 'clubbingcult').replace(/^@/, '');
  const isVertical = options.isVertical !== undefined ? options.isVertical : true;
  const {
    cardW = isVertical ? 828 : 920,
    cardH = isVertical ? 1472 : 518,
    cardX = isVertical ? 126 : 80,
    cardY = isVertical ? 215 : 701,
  } = options;

  const { createCanvas } = require('@napi-rs/canvas');
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

  // 6. Top HUD Header Badge: Shifted upside, displays @CLUBBINGCULT
  const headerY = Math.max(70, cardY - (isVertical ? 82 : 95));
  const badgeW = isVertical ? 580 : 600;
  const badgeH = isVertical ? 62 : 66;
  const badgeX = (width - badgeW) / 2;
  const headerCut = isVertical ? 15 : 16;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 8, 4, 0.95)';
  drawChamferedRect(ctx, badgeX, headerY, badgeW, badgeH, headerCut);
  ctx.fill();

  ctx.shadowColor = 'rgba(0, 255, 163, 0.85)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = neonGreen;
  ctx.lineWidth = 2.5;
  drawChamferedRect(ctx, badgeX, headerY, badgeW, badgeH, headerCut);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.5)';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, badgeX + 4, headerY + 4, badgeW - 8, badgeH - 8, headerCut - 2);
  ctx.stroke();

  const topBadgeText = isVertical ? `@ C L U B B I N G C U L T` : `C L U B B I N G   C U L T`;
  ctx.font = '900 21px "Arial Black", Arial, sans-serif';
  ctx.fillStyle = '#E8FFF4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 255, 163, 0.75)';
  ctx.shadowBlur = 10;
  ctx.fillText(topBadgeText, width / 2, headerY + badgeH / 2 + 1);
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
  ctx.save();
  ctx.translate(leftX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('C L U B B I N G   C U L T   •   O F F I C I A L', 0, 0);
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
    ctx.font = '900 18px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = neonGreen;
    ctx.shadowColor = 'rgba(0, 255, 163, 0.75)';
    ctx.shadowBlur = 10;
    ctx.fillText('@ C L U B B I N G C U L T', width / 2, footerTextY);
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
  const clean = rawHeadline.replace(/^["'“”]/, '').replace(/["'“”]$/, '');

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
    const viralPattern = /^(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\d+[-a-zA-Z0-9]+|world's|first|secret|unveiled|record|million|billion|trillion|blackwell|breakthrough)$/i;

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
 * Generates the authentic Evolving AI & Cult Information Video-Essay Overlay
 * Solid black 1080x1920 canvas with:
 * - Prominent 92px circular brand avatar + bold page name + verified blue badge + handle
 * - Bold 46px viral headline hook with brand lime accent word highlighting
 * - Transparent cutout for centered video content
 * - Clean solid black safe margins at bottom for Instagram native UI
 */
async function generateEvolvingAiOverlay(handle, options = {}) {
  const cleanHandle = (handle || 'cult_information').replace(/^@/, '');
  const {
    cardX = 0,
    cardY = 640,
    cardW = 1080,
    cardH = 608,
    pageName = options.page?.name || (cleanHandle.includes('cult') ? 'Cult Information' : 'Evolving AI'),
    hookHeadline = options.hookHeadline || options.headline || 'The next generation of AI is evolving faster than anyone expected'
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

  // 3. Header Section (Left Aligned, prominent bold modern layout)
  const marginX = 56;
  const headerTopY = options.headerTopY || 220;

  // Circular Logo Avatar (92px diameter - 50% larger than old 64px)
  const avatarSize = 92;
  const avatarCenter = marginX + avatarSize / 2;
  const avatarCenterY = headerTopY + avatarSize / 2;
  const brandingDir = path.join(__dirname, '..', '..', 'public', 'branding');
  const candidateAvatarPaths = [
    options.avatarPath,
    path.join(brandingDir, `${cleanHandle}_avatar.png`),
    path.join(brandingDir, `${cleanHandle}_avatar.jpg`),
    path.join(brandingDir, 'cult_information_avatar.png'),
    path.join(brandingDir, 'cult_information_logo_master.png'),
    path.join(brandingDir, 'cult_avatar.png'),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.png`),
    path.join(brandingDir, `${options.page?.slug || 'page'}_avatar.jpg`)
  ].filter(Boolean);

  const existingAvatarPath = candidateAvatarPaths.find(p => fs.existsSync(p));

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
    bgGrad.addColorStop(0, '#1C1C1E');
    bgGrad.addColorStop(1, '#0C0C0E');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    const words = (pageName || 'Channel').trim().split(/\s+/);
    const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();

    ctx.fillStyle = '#c1d82f'; // Cult signature lime
    ctx.font = '900 32px "Arial Black", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, avatarCenter, avatarCenterY);
  }
  ctx.restore();

  // Avatar border ring with brand lime accent & subtle ambient glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenter, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#c1d82f';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(193, 216, 47, 0.4)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();

  // Page Name + Verified Badge
  const textLeftX = marginX + avatarSize + 22;
  ctx.save();
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(pageName, textLeftX, headerTopY + 28);

  const nameWidth = ctx.measureText(pageName).width;
  drawVerifiedBadge(ctx, textLeftX + nameWidth + 12, headerTopY + 16, 24);

  // Handle below name
  ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#999999'; // iOS muted gray
  ctx.fillText(cleanHandle.startsWith('@') ? cleanHandle : '@' + cleanHandle, textLeftX, headerTopY + 68);
  ctx.restore();

  // 4. Punchy Viral Headline / Hook with Brand Color Word Highlighting
  const headlineY = headerTopY + avatarSize + 36;
  const maxTextWidth = width - (marginX * 2);
  const highlightColor = options.highlightColor || '#c1d82f'; // Signature Cult lime green

  ctx.save();
  ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textBaseline = 'top';

  const cleanHeadline = (hookHeadline || 'Breakthrough AI technology is evolving faster than anyone expected')
    .replace(/^["'“”]/, '')
    .replace(/["'“”]$/, '');

  const tokens = parseHeadlineTokens(cleanHeadline);
  const lines = wrapTokens(ctx, tokens, maxTextWidth);
  const lineHeight = 60;
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

  const theme = options.theme || (
    (cleanHandle.includes('clubbing') || (options.page && options.page.slug === 'clubbing')) ? 'clubbing' :
    (cleanHandle.includes('movie') || (options.page && options.page.slug === 'movies')) ? 'movies' :
    (cleanHandle.includes('cult_info') || cleanHandle.includes('cultinformation') || (options.page && options.page.slug === 'cult_information') || cleanHandle.includes('evolving') || (options.page && options.page.slug === 'ai_curation')) ? 'video_essay' : 'gta6'
  );
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay' || theme === 'evolving_ai' || theme === 'cult_information' || theme === 'ai_curation';

  if (isClubbing) {
    return generateClubbingCyberOverlay(cleanHandle, options);
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
  } else {
    // Existing Top Account Badge for Movies & GTA 6
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
  const theme = options.theme || (
    (handle.includes('clubbing') || options.page?.slug === 'clubbing') ? 'clubbing' :
    (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' :
    (handle.includes('cult_info') || handle.includes('cultinformation') || options.page?.slug === 'cult_information' || handle.includes('evolving') || options.page?.slug === 'ai_curation' ? 'video_essay' : 'gta6'))
  );
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';
  const isVideoEssay = theme === 'video_essay' || theme === 'evolving_ai' || theme === 'cult_information' || theme === 'ai_curation';

  let cardW, cardH, cardX, cardY, videoFilter;

  if (isVideoEssay) {
    // Evolving AI & Cult Information Minimalist Center Layout:
    if (isVertical) {
      const isPreFormatted = await isLetterboxedReel(absPath);
      if (isPreFormatted) {
        // Pre-formatted reel from competitor (e.g. @evolving.ai):
        // Keep video at 1080:1920 in its original center position!
        // The Cult Information overlay covers Y=0 to 680 in solid black,
        // completely obliterating any competitor header and title text (e.g. at Y=580-664)!
        cardW = 1080;
        cardH = 680;
        cardX = 0;
        cardY = 680;

        videoFilter = [
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]',
          '[v0][1:v]overlay=0:0[outv]'
        ].join(';');
      } else {
        // Raw full-frame vertical video: frame into centered video-essay card
        cardW = 1080;
        cardH = 960;
        cardX = 0;
        cardY = 680;

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
      // 4:5 or standard portrait
      cardW = 1080;
      cardH = Math.round(cardW / aspect);
      if (cardH > 1300) cardH = 1300;
      cardH = Math.floor(cardH / 2) * 2;
      cardX = 0;
      cardY = Math.round((1920 - cardH) / 2);

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
      cardY = Math.round((1920 - cardH) / 2);

      videoFilter = [
        '[0:v]split=2[bg_raw][fg_raw]',
        '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]',
        `[fg_raw]scale=${cardW}:${cardH}[card]`,
        `[bg][card]overlay=${cardX}:${cardY}[v1]`,
        '[v1][1:v]overlay=0:0[outv]'
      ].join(';');
    }
  }

  const overlayPngPath = await generateFeedPostOverlay(handle, { cardX, cardY, cardW, cardH, isVertical, theme, ...options });

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const framedOutput = path.join(dir, `${base}_feed_framed.mp4`);

  const themeName = isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : (isVideoEssay ? 'Cult Information Video-Essay' : 'GTA 6 Vice City'));
  console.log(`[FFmpeg Helper] 🎨 Composing ${themeName} Framed Feed Reel for @${handle} (${isVertical ? '9:16 Full Immersion' : `${inW}x${inH} Adaptive`} ${cardW}x${cardH})...`);

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
  const theme = options.theme || (handle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' : (options.page?.slug === 'movies' || handle.includes('movie') ? 'movies' : 'gta6'));
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
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

  const themeName = isClubbing ? 'Clubbing Cult Neon Green' : (isMovie ? 'Cinematic Movie' : 'GTA 6');
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
  const theme = options.theme || (cleanHandle.includes('club') || options.page?.slug === 'clubbing' ? 'clubbing' : (options.page?.slug === 'movies' || cleanHandle.includes('movie') ? 'movies' : 'gta6'));
  const isClubbing = theme === 'clubbing' || theme === 'clubbingcult';
  const isMovie = theme === 'movies';

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
  prepareVideoForFeedCard,
  extractVideoCover
};

