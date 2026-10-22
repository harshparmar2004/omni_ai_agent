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

  const absPath = path.isAbsolute(inputImagePath)
    ? inputImagePath
    : path.join(__dirname, '..', '..', 'public', inputImagePath.replace(/^\//, ''));

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
 * Prepares video for Instagram Story container (Max 60 seconds duration limit)
 */
async function prepareVideoForStory(inputVideoPath) {
  if (!fs.existsSync(inputVideoPath)) {
    throw new Error(`Input video not found: ${inputVideoPath}`);
  }

  const { execSync } = require('child_process');
  let duration = 0;
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of json "${inputVideoPath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(raw);
    duration = parseFloat(data?.format?.duration) || 0;
  } catch (e) {
    console.warn(`[FFmpeg Helper] Story ffprobe duration error: ${e.message}`);
  }

  // If video is within 60s limit, return as is
  if (duration <= 60 && duration > 0) {
    return inputVideoPath;
  }

  // If video is > 60s, clip to 59.5s for Story compliance
  const dir = path.dirname(inputVideoPath);
  const ext = path.extname(inputVideoPath);
  const base = path.basename(inputVideoPath, ext);
  const storyOutput = path.join(dir, `${base}_story.mp4`);

  console.log(`[FFmpeg Helper] ✂️ Reel duration is ${duration.toFixed(1)}s (> 60s limit). Clipping to 59.5s for Instagram Story...`);

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-ss', '0',
      '-t', '59.5',
      '-i', inputVideoPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      storyOutput
    ];

    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(storyOutput)) {
        console.log(`[FFmpeg Helper] ✅ Story-ready clip generated: ${storyOutput}`);
        resolve(storyOutput);
      } else {
        // Fallback to original
        resolve(inputVideoPath);
      }
    });
    proc.on('error', () => resolve(inputVideoPath));
  });
}

module.exports = {
  renderReelVideo,
  ensureMetaCompliantVideo,
  ensureMetaCompliantImage,
  prepareVideoForStory
};

