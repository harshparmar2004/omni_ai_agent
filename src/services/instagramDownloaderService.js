const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Instagram Downloader Service
 * Integrates yt-dlp, Playwright, and Instagrapi for downloading videos, reels, and captions.
 */

/**
 * Download Instagram Video or Reel
 * @param {string} url - Instagram Post/Reel URL
 * @returns {Promise<Object>} Downloaded media metadata and local path
 */
function downloadInstagramMedia(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.trim()) {
      return reject(new Error('Instagram URL is required'));
    }

    const outputDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'instagram_downloader.py');
    const safeUrl = url.trim().replace(/"/g, '\\"');
    const command = `python "${scriptPath}" "${safeUrl}" "${outputDir.replace(/\\/g, '/')}"`;

    console.log(`[Instagram Downloader] 📥 Downloading video/media from: ${safeUrl}`);

    exec(command, { timeout: 60000 }, async (error, stdout, stderr) => {
      try {
        const output = stdout.trim();
        const jsonStart = output.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(output.slice(jsonStart));
          if (parsed.success) {
            const isVideo = Boolean(parsed.is_video || parsed.type === 'video' || parsed.type === 'reel' || (parsed.relative_url && parsed.relative_url.endsWith('.mp4')));
            if (isVideo) {
              const localFile = parsed.local_file 
                ? path.join(outputDir, parsed.local_file)
                : (parsed.relative_url ? path.join(__dirname, '..', '..', 'public', parsed.relative_url.replace(/^\//, '')) : null);
              
              if (localFile && fs.existsSync(localFile)) {
                try {
                  const { ensureMetaCompliantVideo } = require('../utils/ffmpegHelper');
                  console.log(`[Instagram Downloader] 🔍 Verifying Meta Graph API video codec compliance for ${localFile}...`);
                  const compResult = await ensureMetaCompliantVideo(localFile);
                  if (compResult?.transcoded) {
                    console.log(`[Instagram Downloader] ✨ Video transcoded to Meta-compliant H.264/AAC MP4`);
                  }
                } catch (vErr) {
                  console.warn(`[Instagram Downloader] Codec validation note: ${vErr.message}`);
                }
              }
            }
          }
          return resolve(parsed);
        }
        return resolve({
          success: false,
          error: stderr || output || 'Failed to download media'
        });
      } catch (parseErr) {
        return resolve({
          success: false,
          error: `Parser error: ${parseErr.message}`
        });
      }
    });
  });
}

module.exports = {
  downloadInstagramMedia
};
