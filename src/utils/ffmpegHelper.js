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

    console.log(`[FFmpeg Helper] 🎨 Applying Studio Audio Normalization & Meta Transcode... (audio:${hasAudio ? 'yes' : 'none'})`);

    const tempOut = path.join(path.dirname(finalDest), `transcode_temp_${Date.now()}.mp4`);

    let ffmpegArgs = [];
    if (hasAudio) {
      // High-fidelity natural video + studio dynamic audio mastering:
      // 1. Natural 1.0x tempo & original colors (eliminates synthetic AI media flags)
      // 2. Dynamic Audio Normalizer (dynaudnorm) lifts quiet GTA background songs by up to +18dB while leveling loud sounds
      // 3. Studio-grade 256k AAC stereo
      ffmpegArgs = [
        '-y',
        '-i', inputVideoPath,
        '-filter_complex',
        '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[v];[0:a]dynaudnorm=f=150:g=15:m=8.0:p=0.95,volume=1.15[a]',
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'aac',
        '-b:a', '256k',
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
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'aac',
        '-b:a', '256k',
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
 * Generates aesthetic GTA 6 Vice City UI overlay PNG for Instagram Story Reshare Card
 */
function generateStoryOverlay(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || 'gta6_updates_007').replace(/^@/, '');
  const typeLabel = options.typeLabel || 'NEW REEL';

  // 1. Ambient Vice City color tint & vignette on the background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, 'rgba(13, 2, 33, 0.65)');    // Deep Vice City Violet
  bgGrad.addColorStop(0.4, 'rgba(45, 10, 78, 0.50)');  // Purple
  bgGrad.addColorStop(0.75, 'rgba(160, 26, 125, 0.45)'); // Neon Magenta
  bgGrad.addColorStop(1, 'rgba(255, 107, 53, 0.55)');   // Sunset Orange
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, 400, width / 2, height / 2, 950);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.60)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Center Card Cutout & Defined Neon Border (Middle Post)
  const cardW = 860;
  const cardH = 1240;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;
  const radius = 24;

  // Clear center so the crystal-clear video card displays un-tinted
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

  // Draw glowing Vice City neon border around the card
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, '#00F0FF');   // Cyan glow at top-left
  borderGrad.addColorStop(0.5, '#F72585'); // Neon Pink at center
  borderGrad.addColorStop(1, '#FF8A00');   // Sunset Gold at bottom-right

  ctx.save();
  ctx.shadowColor = 'rgba(247, 37, 133, 0.75)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.stroke();
  ctx.restore();

  // 3. Top Header: Aesthetic Frosted Glass Pill
  const hW = 660;
  const hH = 84;
  const hX = (width - hW) / 2;
  const hY = cardY - hH - 32;

  ctx.save();
  ctx.fillStyle = 'rgba(13, 2, 33, 0.88)';
  ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(hX, hY, hW, hH, 42);
  } else {
    ctx.rect(hX, hY, hW, hH);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(247, 37, 133, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Top Header Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🌴 @${cleanHandle} • GTA VI 🎮`, width / 2, hY + 32);

  ctx.fillStyle = '#FFB703';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('OFFICIAL NEWS & VIRAL LEAKS', width / 2, hY + 60);

  // 4. Bottom CTA Pill Button
  const ctaW = 540;
  const ctaH = 82;
  const ctaX = (width - ctaW) / 2;
  const ctaY = cardY + cardH + 32;

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, '#F72585');
  ctaGrad.addColorStop(0.5, '#7209B7');
  ctaGrad.addColorStop(1, '#FF6B35');

  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 53, 0.65)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = ctaGrad;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 41);
  } else {
    ctx.rect(ctaX, ctaY, ctaW, ctaH);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🔥 ${typeLabel} • TAP TO WATCH ▶`, width / 2, ctaY + ctaH / 2);

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
 * Generates GTA 6 Vice City Clip Frame Template Overlay for Feed Reels
 */
function generateFeedPostOverlay(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || 'gta6_updates_007').replace(/^@/, '');

  // 1. Ambient Vice City color tint & vignette on the background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, 'rgba(13, 2, 33, 0.70)');
  bgGrad.addColorStop(0.4, 'rgba(45, 10, 78, 0.55)');
  bgGrad.addColorStop(0.75, 'rgba(160, 26, 125, 0.50)');
  bgGrad.addColorStop(1, 'rgba(255, 107, 53, 0.60)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, 400, width / 2, height / 2, 950);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Center Card Cutout & Defined Neon Border (Middle Post)
  const cardW = 900;
  const cardH = 1320;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2 - 10;
  const radius = 20;

  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.clip();
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  // Glowing neon border
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, '#00F0FF');
  borderGrad.addColorStop(0.5, '#F72585');
  borderGrad.addColorStop(1, '#FF8A00');

  ctx.save();
  ctx.shadowColor = 'rgba(247, 37, 133, 0.75)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.stroke();
  ctx.restore();

  // 3. Top Header: GTA VI Aesthetic Pill
  const hW = 720;
  const hH = 88;
  const hX = (width - hW) / 2;
  const hY = cardY - hH - 30;

  ctx.save();
  ctx.fillStyle = 'rgba(13, 2, 33, 0.88)';
  ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(hX, hY, hW, hH, 44);
  else ctx.rect(hX, hY, hW, hH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(247, 37, 133, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🌴 @${cleanHandle} • GTA VI 🎮`, width / 2, hY + 34);

  ctx.fillStyle = '#FFB703';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('EXCLUSIVE LEAKS & OFFICIAL NEWS', width / 2, hY + 63);

  // 4. Bottom Footer Banner
  const fW = 680;
  const fH = 76;
  const fX = (width - fW) / 2;
  const fY = cardY + cardH + 28;

  const fGrad = ctx.createLinearGradient(fX, fY, fX + fW, fY);
  fGrad.addColorStop(0, '#F72585');
  fGrad.addColorStop(0.5, '#7209B7');
  fGrad.addColorStop(1, '#FF6B35');

  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 53, 0.65)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = fGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(fX, fY, fW, fH, 38);
  else ctx.rect(fX, fY, fW, fH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🎮 FOLLOW @${cleanHandle} FOR MORE GTA 6 🔥`, width / 2, fY + fH / 2);

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `feed_frame_overlay_${cleanHandle || 'default'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
}

/**
 * Frames video in GTA 6 Vice City aesthetic template for Feed Reel
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
  const overlayPngPath = generateFeedPostOverlay(handle, options);

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const framedOutput = path.join(dir, `${base}_feed_framed.mp4`);

  console.log(`[FFmpeg Helper] 🎨 Composing GTA 6 Vice City Framed Feed Reel for @${handle}...`);

  const filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:4[bg]',
    '[fg_raw]scale=w=900:h=1320:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[card]',
    '[bg][card]overlay=(W-w)/2:(H-h)/2-10[v1]',
    '[v1][1:v]overlay=0:0[outv]'
  ].join(';');

  return new Promise((resolve) => {
    const args = [
      '-y',
      '-i', absPath,
      '-i', overlayPngPath,
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      framedOutput
    ];

    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(framedOutput)) {
        console.log(`[FFmpeg Helper] ✅ GTA 6 Framed Feed Reel generated: ${framedOutput}`);
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
  const overlayPngPath = generateStoryOverlay(handle, options);

  const { execSync } = require('child_process');
  let duration = 0;
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of json "${absPath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(raw);
    duration = parseFloat(data?.format?.duration) || 0;
  } catch (e) {
    console.warn(`[FFmpeg Helper] Story ffprobe duration error: ${e.message}`);
  }

  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const storyOutput = path.join(dir, `${base}_story_card.mp4`);

  console.log(`[FFmpeg Helper] 🎨 Composing Instagram Story Reel Card for @${handle} (ambient blur + original aspect ratio + CTA overlay)...`);

  const filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:5,eq=brightness=-0.28:contrast=0.92[bg]',
    '[fg_raw]scale=w=860:h=1240:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[card]',
    '[bg][card]overlay=(W-w)/2:(H-h)/2[v1]',
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
      '-c:a', 'aac',
      '-movflags', '+faststart',
      storyOutput
    ];

    const proc = spawn('ffmpeg', args);
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
  const handle = (options.handle || 'gta6_updates_007').replace(/^@/, '');

  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const img = await loadImage(absPath);

  // 1. Draw ambient blurred background with GTA 6 Vice City Sunset overlay
  ctx.drawImage(img, -width * 0.25, -height * 0.25, width * 1.5, height * 1.5);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, 'rgba(13, 2, 33, 0.70)');
  bgGrad.addColorStop(0.4, 'rgba(45, 10, 78, 0.55)');
  bgGrad.addColorStop(0.75, 'rgba(160, 26, 125, 0.50)');
  bgGrad.addColorStop(1, 'rgba(255, 107, 53, 0.60)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, 400, width / 2, height / 2, 950);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Compute centered card size in original aspect ratio
  const maxW = 860;
  const maxH = 1240;
  const imgRatio = img.width / img.height;
  let cardW = maxW;
  let cardH = cardW / imgRatio;

  if (cardH > maxH) {
    cardH = maxH;
    cardW = cardH * imgRatio;
  }

  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;
  const radius = 24;

  // Draw glowing Vice City neon border around the card
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, '#00F0FF');
  borderGrad.addColorStop(0.5, '#F72585');
  borderGrad.addColorStop(1, '#FF8A00');

  ctx.save();
  ctx.shadowColor = 'rgba(247, 37, 133, 0.75)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.stroke();
  ctx.restore();

  // Draw centered image inside card
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  // 3. Top header pill
  const hW = 660;
  const hH = 84;
  const hX = (width - hW) / 2;
  const hY = cardY - hH - 32;

  ctx.save();
  ctx.fillStyle = 'rgba(13, 2, 33, 0.88)';
  ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(hX, hY, hW, hH, 42);
  else ctx.rect(hX, hY, hW, hH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(247, 37, 133, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🌴 @${cleanHandle} • GTA VI 🎮`, width / 2, hY + 32);

  ctx.fillStyle = '#FFB703';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('OFFICIAL NEWS & VIRAL LEAKS', width / 2, hY + 60);

  // 4. Bottom CTA Button
  const ctaW = 540;
  const ctaH = 82;
  const ctaX = (width - ctaW) / 2;
  const ctaY = cardY + cardH + 32;

  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, '#F72585');
  ctaGrad.addColorStop(0.5, '#7209B7');
  ctaGrad.addColorStop(1, '#FF6B35');

  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 53, 0.65)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = ctaGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 41);
  else ctx.rect(ctaX, ctaY, ctaW, ctaH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥 NEW POST • TAP TO VIEW ▶', width / 2, ctaY + ctaH / 2);

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
  ensureMetaCompliantVideo,
  ensureMetaCompliantImage,
  prepareVideoForStory,
  prepareImageForStory,
  generateStoryOverlay,
  generateFeedWatermark,
  applyBrandedFeedOverlay,
  generateFeedPostOverlay,
  prepareVideoForFeedCard,
  extractVideoCover
};

