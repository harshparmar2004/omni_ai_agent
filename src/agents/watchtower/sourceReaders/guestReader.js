const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * OmniStudio v7 — Watchtower Guest Mode Source Reader
 * Inspects public Instagram creator profiles using Playwright guest automation
 * with Snowflake ID timestamp extraction and candidate reservoir failover.
 */

function shortcodeToTimestamp(shortcode) {
  if (!shortcode) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let mediaId = 0n;
  for (let i = 0; i < shortcode.length; i++) {
    const idx = BigInt(alphabet.indexOf(shortcode[i]));
    if (idx < 0n) return null;
    mediaId = (mediaId * 64n) + idx;
  }
  const ms = Number((mediaId >> 23n) + 1314220021721n);
  return { date: new Date(ms), mediaId: mediaId.toString() };
}

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

    // Sort descending by true Instagram snowflake publication time
    merged.sort((a, b) => {
      const scA = (a.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
      const scB = (b.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
      const tA = shortcodeToTimestamp(scA)?.date?.getTime() || 0;
      const tB = shortcodeToTimestamp(scB)?.date?.getTime() || 0;
      return tB - tA;
    });

    current[key] = merged.slice(0, 15); // Keep top 15 freshest shortcodes
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

    exec(command, { timeout: 75000 }, (error, stdout, stderr) => {
      let data = null;
      if (error) {
        console.warn(`[Watchtower Guest Reader] @${cleanUser} scraper error: ${error.message}`);
      }
      if (stderr && (stderr.includes('[Scraper') || stderr.includes('Finished'))) {
        console.log(`[Watchtower Guest Reader] @${cleanUser} note: ${stderr.trim()}`);
      }
      try {
        const out = (stdout || '').trim();
        const jsonStart = out.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(out.slice(jsonStart));
        }
      } catch (e) {
        console.warn(`[Watchtower Guest Reader] JSON parse warning: ${e.message}`);
      }

      let candidatePosts = [];

      // 1. Check if scraper returned detailed posts array with timestamps
      if (Array.isArray(data?.posts) && data.posts.length > 0) {
        candidatePosts = data.posts.map(p => ({
          shortcode: p.shortcode,
          url: p.url,
          mediaType: 'reel',
          caption: '',
          likes: 0,
          comments: 0,
          views: 0,
          postedAt: p.posted_at,
          ageHours: p.age_hours,
          mediaId: p.media_id
        }));
      }

      // 2. Fallback to recent_post_urls if posts array is missing
      if (candidatePosts.length === 0 && Array.isArray(data?.recent_post_urls) && data.recent_post_urls.length > 0) {
        for (const url of data.recent_post_urls) {
          const m = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
          if (m) {
            const shortcode = m[1];
            const parsed = shortcodeToTimestamp(shortcode);
            const postedDate = parsed?.date || new Date();
            const ageHours = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
            candidatePosts.push({
              shortcode,
              url: `https://www.instagram.com/reel/${shortcode}/`,
              mediaType: 'reel',
              caption: '',
              likes: 0,
              comments: 0,
              views: 0,
              postedAt: postedDate.toISOString(),
              ageHours: Math.round(ageHours * 10) / 10,
              mediaId: parsed?.mediaId
            });
          }
        }
      }

      // If live scrape succeeded, update reservoir
      if (candidatePosts.length > 0) {
        updateReservoir(cleanUser, candidatePosts.map(p => p.url));
        console.log(`[Watchtower Guest Reader] @${cleanUser}: Scraper returned ${candidatePosts.length} recent reels (top: ${candidatePosts[0].shortcode}, age: ${candidatePosts[0].ageHours}h).`);
      } else {
        // Fallback: Check reservoir if live scrape returned 0 (e.g. cloud datacenter IP wall)
        const reservoir = loadReservoir();
        const fallbackUrls = reservoir[cleanUser] || [];
        if (fallbackUrls.length > 0) {
          console.log(`[Watchtower Guest Reader] 🛡️ Datacenter fallback engaged for @${cleanUser}: Loaded ${fallbackUrls.length} candidate reels from reservoir.`);
          for (const url of fallbackUrls) {
            const m = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
            if (m) {
              const shortcode = m[1];
              const parsed = shortcodeToTimestamp(shortcode);
              const postedDate = parsed?.date || new Date();
              const ageHours = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
              candidatePosts.push({
                shortcode,
                url: `https://www.instagram.com/reel/${shortcode}/`,
                mediaType: 'reel',
                caption: '',
                likes: 0,
                comments: 0,
                views: 0,
                postedAt: postedDate.toISOString(),
                ageHours: Math.round(ageHours * 10) / 10,
                mediaId: parsed?.mediaId
              });
            }
          }
        } else {
          console.log(`[Watchtower Guest Reader] @${cleanUser}: Scraper returned 0 recent reels.`);
        }
      }

      // Sort candidatePosts strictly by Snowflake timestamp descending (newest first)
      candidatePosts.sort((a, b) => {
        const tA = new Date(a.postedAt || 0).getTime();
        const tB = new Date(b.postedAt || 0).getTime();
        return tB - tA;
      });

      return resolve({
        success: true,
        username: cleanUser,
        followers: data?.followers || 'N/A',
        postsCount: data?.posts_count || 'N/A',
        posts: candidatePosts.slice(0, limit)
      });
    });
  });
}

module.exports = {
  readSourcePosts,
  shortcodeToTimestamp
};
