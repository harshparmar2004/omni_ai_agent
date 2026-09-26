const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

/**
 * OmniStudio AI v5.0 — Automated Media Cleaner Service (Pillar 4)
 * Prunes unposted, rejected, and orphaned video/image downloads older than 48 hours
 * to prevent disk bloat, while strictly safeguarding active, scheduled, and published media.
 */

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Gathers the complete set of media filenames that must NEVER be deleted.
 */
function getProtectedMediaFilenames() {
  const protectedSet = new Set([
    'brand_logo.svg',
    '.gitkeep',
    'placeholder.png',
    'test_reel.mp4'
  ]);

  try {
    const db = getDb();

    // 1. Protect all media in instagram_posts with status 'ready_to_post', 'scheduled', or 'published'
    const activePosts = db.prepare(`
      SELECT media_urls, thumbnail_url 
      FROM instagram_posts 
      WHERE status IN ('ready_to_post', 'scheduled', 'published')
    `).all();

    for (const post of activePosts) {
      if (post.thumbnail_url) {
        protectedSet.add(path.basename(post.thumbnail_url));
      }
      if (post.media_urls) {
        try {
          const parsed = JSON.parse(post.media_urls);
          if (Array.isArray(parsed)) {
            parsed.forEach(u => protectedSet.add(path.basename(u)));
          }
        } catch (e) {}
      }
    }

    // 2. Protect candidate reels in autonomous_ingestion_log from the last 72 hours
    const recentLogs = db.prepare(`
      SELECT downloaded_media_paths, cleaned_media_paths 
      FROM autonomous_ingestion_log
      WHERE status IN ('ranked', 'cleansed', 'harvested', 'published', 'staged', 'queued_for_ingestion')
        AND created_at >= datetime('now', '-3 days')
    `).all();

    for (const log of recentLogs) {
      if (log.downloaded_media_paths) {
        try {
          const parsed = JSON.parse(log.downloaded_media_paths);
          if (Array.isArray(parsed)) {
            parsed.forEach(u => protectedSet.add(path.basename(u)));
          }
        } catch (e) {}
      }
      if (log.cleaned_media_paths) {
        try {
          const parsed = JSON.parse(log.cleaned_media_paths);
          if (Array.isArray(parsed)) {
            parsed.forEach(u => protectedSet.add(path.basename(u)));
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn(`[Media Cleaner] Warning loading protected media paths: ${err.message}`);
  }

  return protectedSet;
}

/**
 * Prunes orphaned and rejected files older than retentionHours from public/generated/downloads
 * @param {number} retentionHours File age threshold in hours (default: 48)
 * @returns {object} { prunedFilesCount, bytesReclaimed, bytesReclaimedFormatted, protectedCount }
 */
function pruneExpiredMediaCache(retentionHours = 48) {
  const downloadsDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    return { prunedFilesCount: 0, bytesReclaimed: 0, bytesReclaimedFormatted: '0 Bytes', protectedCount: 0 };
  }

  const protectedFiles = getProtectedMediaFilenames();
  const maxAgeMs = retentionHours * 60 * 60 * 1000;
  const now = Date.now();

  let prunedFilesCount = 0;
  let bytesReclaimed = 0;

  try {
    const files = fs.readdirSync(downloadsDir);

    for (const file of files) {
      const filePath = path.join(downloadsDir, file);

      // Do not delete protected files
      if (protectedFiles.has(file)) {
        continue;
      }

      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        const ageMs = now - stat.mtimeMs;
        if (ageMs > maxAgeMs) {
          bytesReclaimed += stat.size;
          fs.unlinkSync(filePath);
          prunedFilesCount++;
        }
      } catch (e) {
        // Skip busy or locked files
      }
    }

    const bytesFormatted = formatBytes(bytesReclaimed);
    if (prunedFilesCount > 0) {
      console.log(`[Media Cleaner] 🧹 Pruned ${prunedFilesCount} expired files older than ${retentionHours}h (${bytesFormatted} reclaimed). Protected ${protectedFiles.size} active assets.`);
    } else {
      console.log(`[Media Cleaner] ✓ Storage clean. Protected ${protectedFiles.size} active assets.`);
    }

    return {
      prunedFilesCount,
      bytesReclaimed,
      bytesReclaimedFormatted: bytesFormatted,
      protectedCount: protectedFiles.size
    };
  } catch (err) {
    console.error(`[Media Cleaner Error]: ${err.message}`);
    return { error: err.message, prunedFilesCount, bytesReclaimed };
  }
}

module.exports = {
  pruneExpiredMediaCache,
  getProtectedMediaFilenames
};
