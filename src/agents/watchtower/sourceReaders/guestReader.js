const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * OmniStudio v7 — Watchtower Guest Mode Source Reader
 * Inspects public Instagram creator profiles using Playwright guest automation
 * with automatic continuous candidate reservoir failover.
 */

function getReservoirPath() {
  return path.resolve(__dirname, '../../../../config/competitor_reservoir.json');
}

function loadReservoir() {
  const p = getReservoirPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return {};
  }
}

function updateReservoir(username, urls) {
  if (!urls || urls.length === 0) return;
  try {
    const p = getReservoirPath();
    const current = loadReservoir();
    const key = username.toLowerCase().trim();
    const existing = current[key] || [];
    const merged = [...new Set([...urls, ...existing])];
    current[key] = merged.slice(0, 20); // Keep 20 freshest shortcodes
    fs.writeFileSync(p, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[Watchtower Guest Reader] Could not update reservoir: ${e.message}`);
  }
}

function readSourcePosts(username, limit = 6) {
  return new Promise((resolve) => {
    const cleanUser = username.replace(/^@/, '').toLowerCase().trim();
    const scriptPath = path.resolve(__dirname, '../../../../scripts/instagram_scraper.py');
    const profileUrl = `https://www.instagram.com/${cleanUser}/`;
    const command = `python "${scriptPath}" "${profileUrl}"`;

    console.log(`[Watchtower Guest Reader] 🔍 Inspecting @${cleanUser}...`);

    exec(command, { timeout: 75000 }, (error, stdout, stderr) => {
      let data = null;
      try {
        const out = stdout.trim();
        const jsonStart = out.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(out.slice(jsonStart));
        }
      } catch (e) {
        console.warn(`[Watchtower Guest Reader] JSON parse warning: ${e.message}`);
      }

      let recentUrls = data?.recent_post_urls || [];

      // If live scrape succeeded with reels, update reservoir
      if (recentUrls.length > 0) {
        updateReservoir(cleanUser, recentUrls);
        console.log(`[Watchtower Guest Reader] @${cleanUser}: Scraper returned ${recentUrls.length} recent reels.`);
      } else {
        // Fallback: Check reservoir if live scrape returned 0 (e.g. cloud datacenter IP wall)
        const reservoir = loadReservoir();
        const fallbackUrls = reservoir[cleanUser] || [];
        if (fallbackUrls.length > 0) {
          console.log(`[Watchtower Guest Reader] 🛡️ Datacenter fallback engaged for @${cleanUser}: Loaded ${fallbackUrls.length} candidate reels from reservoir.`);
          recentUrls = fallbackUrls;
        } else {
          console.log(`[Watchtower Guest Reader] @${cleanUser}: Scraper returned 0 recent reels.`);
        }
      }

      const posts = [];
      for (const url of recentUrls.slice(0, limit)) {
        const m = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (m) {
          const shortcode = m[1];
          posts.push({
            shortcode,
            url: `https://www.instagram.com/reel/${shortcode}/`,
            mediaType: 'reel',
            caption: '',
            likes: 0,
            comments: 0,
            views: 0
          });
        }
      }

      return resolve({
        success: true,
        username: cleanUser,
        followers: data?.followers || 'N/A',
        postsCount: data?.posts_count || 'N/A',
        posts
      });
    });
  });
}

module.exports = {
  readSourcePosts
};
