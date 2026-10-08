const { spawn } = require('child_process');
const path = require('path');
const { getBrandAssets, getSetting, getConnectedPageBySlug } = require('../database');

/**
 * OmniResearch v4.0 — Brand Cleanser & Visual Tag Replacer Service
 * Sanitizes captions by stripping competitor handles and injecting our brand tag.
 * Inpaints/masks watermarks on photos/carousels and stamps our brand watermark badge.
 * Overlays brand watermark badge on reels/videos using FFmpeg.
 */

function runBrandCleanserScript(args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'brand_cleanser.py');
    const pythonProc = spawn('python', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    pythonProc.stdout.on('data', (d) => { stdout += d.toString(); });
    pythonProc.stderr.on('data', (d) => { stderr += d.toString(); });

    pythonProc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Brand Cleanser script exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Brand Cleanser output: ${stdout}\nStderr: ${stderr}`));
      }
    });

    pythonProc.on('error', reject);
  });
}

/**
 * Cleanse caption text: remove competitor tags and inject our brand handle
 */
async function cleanseCaption(rawCaption, competitorHandles = [], destination = 'gta6') {
  const targetPage = getConnectedPageBySlug(destination);
  const brand = getBrandAssets();
  let ourHandle = (targetPage && targetPage.handle) || '';
  if (!ourHandle) {
    ourHandle = destination === 'tech' 
      ? getSetting('tech_instagram_handle', '@technews_daily_ai') 
      : (brand.brand_handle || getSetting('instagram_handle', '@gta6_updates_007'));
  }

  const res = await runBrandCleanserScript([
    'caption',
    JSON.stringify({ caption: rawCaption || '' }),
    JSON.stringify(competitorHandles),
    ourHandle
  ]);

  return {
    cleanedCaption: res.cleaned_caption || rawCaption,
    discardedTags: res.discarded_tags || [],
    ourBrandHandle: ourHandle
  };
}

/**
 * Cleanse and brand images or video
 */
async function cleanseAndBrandMedia(mediaPaths, contentType = 'carousel', competitorHandles = [], destination = 'gta6') {
  const targetPage = getConnectedPageBySlug(destination);
  const brand = getBrandAssets();
  let ourHandle = (targetPage && targetPage.handle) || '';
  if (!ourHandle) {
    ourHandle = destination === 'tech' 
      ? getSetting('tech_instagram_handle', '@technews_daily_ai') 
      : (brand.brand_handle || getSetting('instagram_handle', '@gta6_updates_007'));
  }
  const logoRelative = brand.brand_logo_url || '/generated/assets/brand_logo.svg';
  
  // Resolve absolute logo path if available
  let logoAbsolute = path.join(__dirname, '..', '..', 'public', logoRelative.replace(/^\//, ''));

  // If carousel or photos
  if (contentType === 'carousel' || contentType === 'photo' || Array.isArray(mediaPaths)) {
    const paths = Array.isArray(mediaPaths) ? mediaPaths : [mediaPaths];
    const absolutePaths = paths.map(p => path.isAbsolute(p) ? p : path.join(__dirname, '..', '..', p.replace(/^\//, '')));

    const res = await runBrandCleanserScript([
      'images',
      JSON.stringify({ images: absolutePaths }),
      JSON.stringify(competitorHandles),
      ourHandle,
      logoAbsolute
    ]);

    // Map back to relative URLs
    const cleanedRelative = (res.cleaned_images || []).map(absP => {
      const rel = absP.replace(/\\/g, '/');
      const idx = rel.indexOf('/public/');
      if (idx !== -1) return rel.substring(idx + 7);
      const genIdx = rel.indexOf('/generated/');
      if (genIdx !== -1) return rel.substring(genIdx);
      return absP;
    });

    return {
      success: true,
      cleanedMediaPaths: cleanedRelative.length > 0 ? cleanedRelative : paths,
      discardedTags: res.discarded_tags || []
    };
  }

  // If video / reel
  if (contentType === 'video' || contentType === 'reel') {
    const videoPath = typeof mediaPaths === 'string' ? mediaPaths : (mediaPaths[0] || '');
    const absoluteVideo = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(__dirname, '..', '..', 'public', videoPath.replace(/^\//, ''));

    let res = { cleaned_video: absoluteVideo, discarded_tags: [] };
    try {
      res = await runBrandCleanserScript([
        'video',
        JSON.stringify({ video: absoluteVideo }),
        JSON.stringify(competitorHandles),
        ourHandle,
        logoAbsolute
      ]);
    } catch (e) {
      console.warn(`[Brand Cleanser] Video script warning: ${e.message}. Proceeding with base video.`);
    }

    let cleanedAbs = res.cleaned_video || absoluteVideo;

    // If brand_cleanser.py already produced cleaned_video, it already rendered libx264/yuv420p/aac.
    // Only invoke ensureMetaCompliantVideo as fallback if brand_cleanser.py failed or bypassed transcode.
    if (!res.cleaned_video || res.cleaned_video === absoluteVideo) {
      try {
        const { ensureMetaCompliantVideo } = require('../utils/ffmpegHelper');
        const compRes = await ensureMetaCompliantVideo(cleanedAbs);
        if (compRes?.outputPath) {
          cleanedAbs = compRes.outputPath;
        }
      } catch (transcodeErr) {
        console.warn(`[Brand Cleanser] Video compliance warning: ${transcodeErr.message}`);
      }
    }

    const rel = cleanedAbs.replace(/\\/g, '/');
    let videoRel = cleanedAbs;
    const idx = rel.indexOf('/public/');
    if (idx !== -1) videoRel = rel.substring(idx + 7);
    else {
      const genIdx = rel.indexOf('/generated/');
      if (genIdx !== -1) videoRel = rel.substring(genIdx);
    }

    return {
      success: true,
      cleanedMediaPaths: [videoRel],
      discardedTags: res.discarded_tags || []
    };
  }

  return { success: true, cleanedMediaPaths: mediaPaths, discardedTags: [] };
}

module.exports = {
  cleanseCaption,
  cleanseAndBrandMedia
};
