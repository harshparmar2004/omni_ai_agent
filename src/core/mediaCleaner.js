const fs = require('fs');
const path = require('path');
const { getSetting } = require('../database');

/**
 * OmniStudio v7 — Media Cleaner
 * Prunes temporary downloads older than retention period (default 48h)
 */

function pruneExpiredMediaCache(customMaxAgeHours = null) {
  const maxAgeHours = customMaxAgeHours !== null
    ? customMaxAgeHours
    : parseInt(getSetting('media_retention_hours', '48'), 10);

  const baseDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads');
  if (!fs.existsSync(baseDir)) return { prunedFiles: 0, reclaimedBytes: 0 };

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  let prunedFiles = 0;
  let reclaimedBytes = 0;

  function traverse(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        traverse(fullPath);
        // Remove directory if empty
        try {
          if (fs.readdirSync(fullPath).length === 0) {
            fs.rmdirSync(fullPath);
          }
        } catch (e) {}
      } else if (ent.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          const age = now - stats.mtimeMs;
          if (age > maxAgeMs) {
            reclaimedBytes += stats.size;
            fs.unlinkSync(fullPath);
            prunedFiles++;
          }
        } catch (e) {}
      }
    }
  }

  traverse(baseDir);

  if (prunedFiles > 0) {
    console.log(`[Media Cleaner] 🧹 Pruned ${prunedFiles} expired media files (${(reclaimedBytes / 1024 / 1024).toFixed(2)} MB reclaimed).`);
  }

  return { prunedFiles, reclaimedBytes };
}

module.exports = {
  pruneExpiredMediaCache
};
