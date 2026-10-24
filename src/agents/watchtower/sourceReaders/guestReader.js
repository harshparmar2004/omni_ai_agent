const { exec } = require('child_process');
const path = require('path');

/**
 * OmniStudio v7 — Watchtower Guest Mode Source Reader
 * Inspects public Instagram creator profiles using Playwright guest automation
 * without requiring any bot account login.
 */

function readSourcePosts(username, limit = 6) {
  return new Promise((resolve) => {
    const cleanUser = username.replace(/^@/, '').trim();
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

      if (!data || !data.success) {
        const errMsg = data?.error || stderr || error?.message || 'Failed to inspect profile';
        return resolve({
          success: false,
          username: cleanUser,
          error: errMsg,
          posts: []
        });
      }

      const recentUrls = data.recent_post_urls || [];
      console.log(`[Watchtower Guest Reader] @${cleanUser}: Scraper returned ${recentUrls.length} recent reels.`);
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
        followers: data.followers || 'N/A',
        postsCount: data.posts_count || 'N/A',
        posts
      });
    });
  });
}

module.exports = {
  readSourcePosts
};
