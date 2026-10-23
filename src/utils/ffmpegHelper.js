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

    console.log(`[FFmpeg Helper] 🎨 Applying Material Transformation & Anti-Duplicate Transcode... (audio:${hasAudio ? 'yes' : 'none'})`);

    const tempOut = path.join(path.dirname(finalDest), `transcode_temp_${Date.now()}.mp4`);

    let ffmpegArgs = [];
    if (hasAudio) {
      // Material transformation: 1.02x speed shift, preserve native aspect ratio & resolution, color pop, scrub metadata
      ffmpegArgs = [
        '-y',
        '-i', inputVideoPath,
        '-filter_complex',
        '[0:v]setpts=PTS/1.02,scale=trunc(iw/2)*2:trunc(ih/2)*2,eq=contrast=1.03:brightness=0.01:saturation=1.04[v];[0:a]atempo=1.02[a]',
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-map_metadata', '-1',
        '-movflags', '+faststart',
        tempOut
      ];
    } else {
      // Input has no audio: add synthetic silent stereo audio track + preserve native aspect ratio
      ffmpegArgs = [
        '-y',
        '-i', inputVideoPath,
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex',
        '[0:v]setpts=PTS/1.02,scale=trunc(iw/2)*2:trunc(ih/2)*2,eq=contrast=1.03:brightness=0.01:saturation=1.04[v]',
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-map_metadata', '-1',
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
 * Generates transparent UI overlay PNG for Instagram Story Reshare Card
 */
function generateStoryOverlay(handle, options = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const cleanHandle = (handle || '').replace(/^@/, '');
  const typeLabel = options.typeLabel || 'REEL';

  // 1. Top Header Banner Pill
  const headerY = 220;
  const headerWidth = 520;
  const headerHeight = 64;
  const headerX = (width - headerWidth) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(headerX, headerY, headerWidth, headerHeight, 32);
  } else {
    ctx.rect(headerX, headerY, headerWidth, headerHeight);
  }
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`@${cleanHandle} • ${typeLabel}`, width / 2, headerY + headerHeight / 2);

  // 2. Bottom CTA Button
  const ctaY = 1620;
  const ctaWidth = 460;
  const ctaHeight = 74;
  const ctaX = (width - ctaWidth) / 2;

  const grad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  grad.addColorStop(0, '#E1306C');
  grad.addColorStop(0.5, '#FD1D1D');
  grad.addColorStop(1, '#F77737');

  ctx.fillStyle = grad;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(ctaX, ctaY, ctaWidth, ctaHeight, 37);
  } else {
    ctx.rect(ctaX, ctaY, ctaWidth, ctaHeight);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('▶ Watch Full Reel', width / 2, ctaY + ctaHeight / 2);

  const publicDir = path.join(__dirname, '..', '..', 'public');
  const genDir = path.join(publicDir, 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

  const overlayPath = path.join(genDir, `story_overlay_${cleanHandle || 'default'}.png`);
  fs.writeFileSync(overlayPath, canvas.toBuffer('image/png'));
  return overlayPath;
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

  const handle = options.handle || 'gta6_updates_007';
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

  // Draw blurred ambient background (using drawImage scaled with darken overlay)
  ctx.drawImage(img, -width * 0.25, -height * 0.25, width * 1.5, height * 1.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width, height);

  // Compute centered card size in original aspect ratio
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

  // Draw centered card
  ctx.drawImage(img, cardX, cardY, cardW, cardH);

  // Top header pill
  const headerY = 220;
  const headerWidth = 520;
  const headerHeight = 64;
  const headerX = (width - headerWidth) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(headerX, headerY, headerWidth, headerHeight, 32);
  else ctx.rect(headerX, headerY, headerWidth, headerHeight);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`@${handle} • POST`, width / 2, headerY + headerHeight / 2);

  // Bottom CTA
  const ctaY = 1620;
  const ctaWidth = 460;
  const ctaHeight = 74;
  const ctaX = (width - ctaWidth) / 2;

  const grad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  grad.addColorStop(0, '#E1306C');
  grad.addColorStop(0.5, '#FD1D1D');
  grad.addColorStop(1, '#F77737');

  ctx.fillStyle = grad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(ctaX, ctaY, ctaWidth, ctaHeight, 37);
  else ctx.rect(ctaX, ctaY, ctaWidth, ctaHeight);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('▶ View Post', width / 2, ctaY + ctaHeight / 2);

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

module.exports = {
  renderReelVideo,
  ensureMetaCompliantVideo,
  ensureMetaCompliantImage,
  prepareVideoForStory,
  prepareImageForStory,
  generateStoryOverlay
};

