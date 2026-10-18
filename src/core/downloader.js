const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureMetaCompliantVideo, ensureMetaCompliantImage } = require('../utils/ffmpegHelper');

/**
 * OmniStudio v7 — Downloader Service
 * Wraps python scripts/instagram_downloader.py (Playwright + yt-dlp guest mode)
 * Normalises media paths, formats, and ensures strict Meta Graph API compliance.
 */

function extractShortcodeFromUrl(url) {
  if (!url) return '';
  const clean = url.trim();
  const m = clean.match(/instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

function downloadInstagramMedia(url) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return reject(new Error('Instagram URL is required'));
    }

    const shortcode = extractShortcodeFromUrl(url) || `post_${Date.now()}`;
    const cleanUrl = shortcode.startsWith('post_') ? url.trim() : `https://www.instagram.com/p/${shortcode}/`;

    const outputDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'instagram_downloader.py');
    const safeUrl = cleanUrl.replace(/"/g, '\\"');
    const safeOutDir = outputDir.replace(/\\/g, '/');
    const command = `python "${scriptPath}" "${safeUrl}" "${safeOutDir}"`;

    console.log(`[Downloader] 📥 Downloading media for ${shortcode}...`);

    exec(command, { timeout: 70000 }, async (error, stdout, stderr) => {
      let rawResult = null;
      try {
        const out = stdout.trim();
        const jsonStart = out.indexOf('{');
        if (jsonStart !== -1) {
          rawResult = JSON.parse(out.slice(jsonStart));
        }
      } catch (parseErr) {
        console.warn(`[Downloader] Parse warning: ${parseErr.message}`);
      }

      if (!rawResult || !rawResult.success) {
        const errMsg = rawResult?.error || stderr || error?.message || 'Failed to download media';
        console.error(`[Downloader] ❌ Download failed: ${errMsg}`);
        return resolve({
          success: false,
          error: errMsg,
          shortcode
        });
      }

      // Normalise output
      const publicDir = path.join(__dirname, '..', '..', 'public');
      const isVideo = Boolean(rawResult.is_video || rawResult.type === 'video' || rawResult.type === 'reel');
      const isCarousel = Boolean(rawResult.is_carousel || rawResult.type === 'carousel' || (rawResult.slides && rawResult.slides.length > 1));
      const mediaType = isVideo ? 'reel' : (isCarousel ? 'carousel' : 'image');

      let mediaPaths = [];

      if (rawResult.slides && rawResult.slides.length > 0) {
        mediaPaths = rawResult.slides.map(s => s.relative_url);
      } else if (rawResult.relative_url) {
        mediaPaths = [rawResult.relative_url];
      }

      // Ensure Meta compliance
      try {
        if (isVideo && mediaPaths.length > 0) {
          const absVideoPath = path.join(publicDir, mediaPaths[0].replace(/^\//, ''));
          if (fs.existsSync(absVideoPath)) {
            await ensureMetaCompliantVideo(absVideoPath);
          }
        } else if (mediaPaths.length > 0) {
          for (let i = 0; i < mediaPaths.length; i++) {
            const absImgPath = path.join(publicDir, mediaPaths[i].replace(/^\//, ''));
            if (fs.existsSync(absImgPath)) {
              const compRes = await ensureMetaCompliantImage(absImgPath);
              if (compRes && compRes.url) {
                mediaPaths[i] = compRes.url;
              }
            }
          }
        }
      } catch (compErr) {
        console.warn(`[Downloader] Compliance transcode notice: ${compErr.message}`);
      }

      const caption = rawResult.caption || rawResult.title || '';
      const uploader = rawResult.uploader || rawResult.owner || 'instagram';

      console.log(`[Downloader] ✅ Download completed: ${mediaType} (${mediaPaths.length} items) from @${uploader}`);

      return resolve({
        success: true,
        shortcode,
        mediaType,
        mediaPaths,
        caption,
        uploader,
        durationSec: rawResult.duration || 0,
        isVideo,
        isCarousel
      });
    });
  });
}

module.exports = {
  extractShortcodeFromUrl,
  downloadInstagramMedia
};
