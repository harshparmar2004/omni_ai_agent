const { getDb, getTrackedChannels, getTrackedChannelById, getTrackedChannelByUsername, addTrackedChannel, updateTrackedChannel, getBrandAssets } = require('../database');
const { scrapeInstagramUrl } = require('./instagramScraperService');
const { recommendTrendingAudio } = require('./trendingAudioService');

/**
 * OmniResearch v3.5 — Instagram Channel Tracker & Ingestion Service
 * Continuously tracks target Instagram pages, auto-extracts content,
 * and stages ready-to-publish posts with branded keywords into the posting queue.
 */

/**
 * Add an Instagram channel to monitor
 * @param {string} input - Instagram URL or username (@username)
 */
async function registerTrackedChannel(input, destinationAccount = 'tech') {
  if (!input || !input.trim()) {
    throw new Error('Username or Instagram URL is required');
  }

  const clean = input.trim();
  // Extract username
  let username = clean.replace(/^@/, '');
  const urlMatch = clean.match(/instagram\.com\/([A-Za-z0-9_.-]+)/i);
  if (urlMatch) {
    username = urlMatch[1].replace('/', '');
  }

  // Check if already monitored
  const existing = getTrackedChannelByUsername(username);
  if (existing) {
    return {
      success: true,
      alreadyExisted: true,
      channel: existing,
      message: `@${username} is already in your monitored list!`
    };
  }

  // Attempt live scrape to fetch real profile metadata
  let scraped = null;
  try {
    const scrapeRes = await scrapeInstagramUrl(`https://www.instagram.com/${username}/`);
    if (scrapeRes && scrapeRes.success) {
      scraped = scrapeRes;
    }
  } catch (err) {
    console.warn(`[Channel Tracker] Warning: Initial scrape for @${username} had error: ${err.message}. Proceeding with standard channel creation.`);
  }

  const latestShortcode = (scraped && scraped.recent_post_urls && scraped.recent_post_urls[0])
    ? (scraped.recent_post_urls[0].match(/\/p\/([A-Za-z0-9_-]+)/) || [])[1] || ''
    : '';

  const nicheTag = destinationAccount === 'gta6' ? 'gaming' : 'tech';

  const newChannel = addTrackedChannel({
    username,
    profile_url: `https://www.instagram.com/${username}/`,
    display_name: username.charAt(0).toUpperCase() + username.slice(1),
    bio: scraped ? (scraped.bio || '') : `Target account @${username} monitored for viral content.`,
    followers_count: scraped ? (scraped.followers || 'N/A') : 'N/A',
    following_count: scraped ? (scraped.following || 'N/A') : 'N/A',
    posts_count: scraped ? (scraped.posts_count || 'N/A') : 'N/A',
    avatar_url: scraped ? (scraped.profile_pic || '') : '',
    last_post_shortcode: '', // Left empty so first stealth scan ingests and evaluates the latest reel
    synced_posts_count: 0,
    niche_tag: nicheTag,
    destination_account: destinationAccount,
    is_active: 1
  });

  return {
    success: true,
    alreadyExisted: false,
    channel: newChannel,
    message: `Successfully added and verified @${username} to your channel tracker!`
  };
}

/**
 * Check a single channel for new posts and auto-stage into queue
 * @param {number} channelId
 */
async function syncSingleChannel(channelId) {
  const channel = getTrackedChannelById(channelId);
  if (!channel) throw new Error(`Tracked channel #${channelId} not found`);

  console.log(`[Channel Tracker] 📡 Checking @${channel.username} for new posts...`);
  const profileUrl = channel.profile_url || `https://www.instagram.com/${channel.username}/`;
  
  let scrapeRes;
  try {
    scrapeRes = await scrapeInstagramUrl(profileUrl);
  } catch (err) {
    throw new Error(`Failed to scrape @${channel.username}: ${err.message}`);
  }

  const nowIso = new Date().toISOString();
  const updates = {
    last_scraped_at: nowIso
  };

  if (scrapeRes.followers && scrapeRes.followers !== 'N/A') updates.followers_count = scrapeRes.followers;
  if (scrapeRes.following && scrapeRes.following !== 'N/A') updates.following_count = scrapeRes.following;
  if (scrapeRes.posts_count && scrapeRes.posts_count !== 'N/A') updates.posts_count = scrapeRes.posts_count;
  if (scrapeRes.profile_pic) updates.avatar_url = scrapeRes.profile_pic;
  if (scrapeRes.bio) updates.bio = scrapeRes.bio;

  const recentUrls = scrapeRes.recent_post_urls || [];
  if (recentUrls.length === 0) {
    updateTrackedChannel(channel.id, updates);
    return {
      success: true,
      synced: false,
      message: `Checked @${channel.username}. No post URLs visible on public feed.`,
      channel: getTrackedChannelById(channel.id)
    };
  }

  const latestPostUrl = recentUrls[0];
  const shortcodeMatch = latestPostUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
  const latestShortcode = shortcodeMatch ? shortcodeMatch[1] : '';

  // Check if we already staged this post
  const db = getDb();
  const existingPost = db.prepare("SELECT id FROM instagram_posts WHERE caption LIKE ? OR hook_text LIKE ?").get(
    `%${latestShortcode}%`,
    `%${channel.username}%`
  );

  const isNewPost = latestShortcode && latestShortcode !== channel.last_post_shortcode && !existingPost;

  if (!isNewPost) {
    updateTrackedChannel(channel.id, updates);
    return {
      success: true,
      synced: false,
      message: `Checked @${channel.username}. Up to date (latest post shortcode: ${channel.last_post_shortcode || 'active'}).`,
      channel: getTrackedChannelById(channel.id)
    };
  }

  // Scrape and run through full Autonomous Agentic Pipeline
  console.log(`[Channel Tracker] ⚡ New post detected for @${channel.username}: ${latestPostUrl}. Processing with Autonomous Orchestrator...`);
  const { processSinglePost } = require('./instagramAutonomousOrchestrator');
  
  let procRes;
  try {
    procRes = await processSinglePost(latestPostUrl, channel.username, channel.id);
  } catch (err) {
    console.error(`[Channel Tracker] Error in autonomous pipeline for @${channel.username}: ${err.message}`);
    throw err;
  }

  updates.last_post_shortcode = latestShortcode;
  updates.synced_posts_count = (channel.synced_posts_count || 0) + 1;
  updateTrackedChannel(channel.id, updates);

  return {
    success: true,
    synced: true,
    newPostId: procRes.postId,
    postUrl: latestPostUrl,
    hook: procRes.log?.repurposed_hook || `Engineering breakdown from @${channel.username}`,
    keyword: procRes.log?.detected_trigger_keyword || 'GUIDE',
    channel: getTrackedChannelById(channel.id),
    message: procRes.message || `🎉 Extracted new post from @${channel.username} and staged into Ready to Post Queue!`
  };
}

/**
 * Check all active monitored channels
 */
async function syncAllActiveChannels() {
  const channels = getTrackedChannels().filter(c => c.is_active);
  console.log(`[Channel Tracker] 🚀 Syncing all ${channels.length} active channels...`);

  const results = [];
  let newPostsCount = 0;

  for (const ch of channels) {
    try {
      const res = await syncSingleChannel(ch.id);
      results.push({ channel: ch.username, success: true, ...res });
      if (res.synced) newPostsCount++;
    } catch (err) {
      results.push({ channel: ch.username, success: false, error: err.message });
    }
  }

  return {
    success: true,
    totalChannels: channels.length,
    newPostsAdded: newPostsCount,
    details: results
  };
}

/**
 * Bulk add multiple Instagram channels to monitor
 * @param {Array<string>|string} inputs - Array of handles or comma/newline delimited text
 * @param {string} nicheTag - Optional niche tag (e.g. 'tech')
 */
async function batchRegisterTrackedChannels(inputs, nicheTag = 'tech', destinationAccount = 'tech') {
  let list = [];
  if (Array.isArray(inputs)) {
    list = inputs;
  } else if (typeof inputs === 'string') {
    list = inputs.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean);
  }

  const results = {
    added: [],
    alreadyExisted: [],
    errors: []
  };

  const effectiveNiche = nicheTag || (destinationAccount === 'gta6' ? 'gaming' : 'tech');

  for (const raw of list) {
    if (!raw) continue;
    let username = raw.trim().replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '').replace(/[^A-Za-z0-9_.-]/g, '');
    if (!username) continue;

    try {
      const existing = getTrackedChannelByUsername(username);
      if (existing) {
        if (!existing.is_active || (destinationAccount && existing.destination_account !== destinationAccount)) {
          updateTrackedChannel(existing.id, { is_active: 1, destination_account: destinationAccount });
        }
        results.alreadyExisted.push(existing);
        continue;
      }

      const newChannel = addTrackedChannel({
        username,
        profile_url: `https://www.instagram.com/${username}/`,
        display_name: username.charAt(0).toUpperCase() + username.slice(1),
        bio: `Target creator @${username} monitored for viral content.`,
        followers_count: 'N/A',
        following_count: 'N/A',
        posts_count: 'N/A',
        avatar_url: '',
        last_post_shortcode: '',
        synced_posts_count: 0,
        niche_tag: effectiveNiche,
        destination_account: destinationAccount,
        is_active: 1
      });
      results.added.push(newChannel);
    } catch (err) {
      results.errors.push({ username, error: err.message });
    }
  }

  return {
    success: true,
    totalReceived: list.length,
    addedCount: results.added.length,
    existingCount: results.alreadyExisted.length,
    results
  };
}

module.exports = {
  registerTrackedChannel,
  batchRegisterTrackedChannels,
  syncSingleChannel,
  syncAllActiveChannels
};
