const fs = require('fs');
const path = require('path');
const { getDb } = require('../src/database');

const db = getDb();

// 1. Filesystem audit
const scanDirs = [
  path.join(__dirname, '..', 'public', 'generated', 'downloads'),
  path.join(__dirname, '..', 'public', 'generated', 'reels'),
  path.join(__dirname, '..', 'data', 'downloads'),
  path.join(__dirname, '..', 'public', 'downloads')
];

let totalFiles = 0;
let totalBytes = 0;
const fileList = [];

for (const dir of scanDirs) {
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir);
    for (const file of entries) {
      const fullPath = path.join(dir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isFile() && /\.(mp4|mov|mkv|webm)$/i.test(file)) {
          totalFiles++;
          totalBytes += stats.size;
          fileList.push({
            folder: path.relative(path.join(__dirname, '..'), dir),
            name: file,
            sizeMB: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
            modifiedAt: stats.mtime.toISOString()
          });
        }
      } catch (e) {}
    }
  }
}

// 2. Database audit: Total historical jobs & discovered posts
let totalJobsInDB = 0;
let totalJobsWithMediaInDB = 0;
let totalDiscoveredPosts = 0;
let publishedJobs = 0;
let failedJobs = 0;
let queuedJobs = 0;

try {
  totalJobsInDB = db.prepare('SELECT COUNT(*) as count FROM publish_jobs').get().count;
  totalJobsWithMediaInDB = db.prepare("SELECT COUNT(*) as count FROM publish_jobs WHERE media_paths IS NOT NULL AND media_paths != '[]' AND media_paths != ''").get().count;
  totalDiscoveredPosts = db.prepare('SELECT COUNT(*) as count FROM discovered_posts WHERE is_video = 1').get().count;
  publishedJobs = db.prepare("SELECT COUNT(*) as count FROM publish_jobs WHERE status = 'published'").get().count;
  failedJobs = db.prepare("SELECT COUNT(*) as count FROM publish_jobs WHERE status = 'failed'").get().count;
  queuedJobs = db.prepare("SELECT COUNT(*) as count FROM publish_jobs WHERE status = 'queued' OR status = 'pending_review'").get().count;
} catch (e) {
  console.error('DB query error:', e.message);
}

// 3. Check which database jobs point to files that no longer exist on disk (deleted / pruned)
let jobsWithMissingFiles = 0;
let jobsWithExistingFiles = 0;

try {
  const jobs = db.prepare('SELECT id, shortcode, media_paths, edited_media_path, status, created_at FROM publish_jobs').all();
  for (const j of jobs) {
    let paths = [];
    try { paths = JSON.parse(j.media_paths || '[]'); } catch (_) {}
    if (j.edited_media_path) paths.push(j.edited_media_path);

    if (paths.length > 0) {
      let anyFound = false;
      for (const p of paths) {
        const cleanP = p.replace(/^[/\\]+/, '');
        const abs1 = path.join(__dirname, '..', 'public', cleanP);
        const abs2 = path.isAbsolute(p) ? p : null;
        if (fs.existsSync(abs1) || (abs2 && fs.existsSync(abs2))) {
          anyFound = true;
          break;
        }
      }
      if (anyFound) {
        jobsWithExistingFiles++;
      } else {
        jobsWithMissingFiles++;
      }
    }
  }
} catch (e) {}

// Print JSON summary
const summary = {
  filesystem: {
    totalVideoFilesFound: totalFiles,
    totalStorageMB: parseFloat((totalBytes / 1024 / 1024).toFixed(2)),
    totalStorageGB: parseFloat((totalBytes / 1024 / 1024 / 1024).toFixed(2)),
    storageLocations: scanDirs.filter(d => fs.existsSync(d)).map(d => path.relative(path.join(__dirname, '..'), d))
  },
  database: {
    totalJobsInHistory: totalJobsInDB,
    totalJobsWithMediaAssigned: totalJobsWithMediaInDB,
    totalDiscoveredVideoPostsTracked: totalDiscoveredPosts,
    publishedJobs: publishedJobs,
    failedJobs: failedJobs,
    queuedJobs: queuedJobs
  },
  retentionAnalysis: {
    jobsWhoseFilesAreStillOnDisk: jobsWithExistingFiles,
    jobsWhoseFilesWerePrunedOrDeleted: jobsWithMissingFiles
  },
  fileBreakdown: fileList
};

console.log(JSON.stringify(summary, null, 2));
