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
