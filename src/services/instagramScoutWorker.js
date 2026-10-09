const axios = require('axios');
const {
  getActiveScout,
  getScoutAccountById,
  updateScoutAccount,
  incrementScoutUsage,
  getSetting
} = require('../database');

/**
 * OmniResearch v5.5 — Dedicated Scout / Hunter Worker Engine
 * 
 * Manages secondary Instagram scout accounts to:
 * 1. Post trigger keyword comments on target creator posts with humanized jitter & rate limits.
 * 2. Poll the scout's direct message inbox to intercept automated link deliveries.
 * 3. Unshorten Bitly/TinyURL redirects to canonical GitHub/Notion/Drive destinations.
 * 4. Completely shields your main business pages from any Meta anti-spam action blocks.
 */

/**
 * Converts an Instagram alphanumeric shortcode to its numeric 64-bit Media PK
 */
function shortcodeToMediaPk(shortcode) {
  if (!shortcode) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const val = alphabet.indexOf(shortcode[i]);
    if (val === -1) return null;
    id = id * BigInt(64) + BigInt(val);
  }
  return id.toString();
}

/**
 * Extracts shortcode from any Instagram post, reel, or tv URL
 */
function extractShortcode(url = '') {
  const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Builds realistic mobile app & web client request headers with the Scout session
 */
function buildScoutHeaders(sessionId, csrfToken = '', accountId = '') {
  const cleanSession = sessionId ? sessionId.trim() : '';
  const dsUser = accountId || cleanSession.split('%3A')[0] || cleanSession.split(':')[0] || '';
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': `sessionid=${cleanSession}; ds_user_id=${dsUser}; csrftoken=${csrfToken || 'missing'};`,
    'X-CSRFToken': csrfToken || 'missing',
    'X-IG-App-ID': '936619743392459',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.instagram.com/'
  };
}

/**
 * Extracts raw links from text
 */
function extractLinks(text) {
  if (!text) return [];
  const regex = /(https?:\/\/[^\s"'<>\),]+)/gi;
  const matches = text.match(regex) || [];
  return matches.map(u => u.replace(/[.,;!?)]+$/, '')).filter(u => !u.includes('instagram.com') && !u.includes('facebook.com'));
}

/**
 * Unshorten URLs to find true destination
 */
async function unshortenUrl(shortUrl, maxRedirects = 5) {
  if (!shortUrl) return shortUrl;
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects,
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      validateStatus: status => status >= 200 && status < 400
    });
    return res.request?.res?.responseUrl || res.config?.url || shortUrl;
  } catch (err) {
    return shortUrl;
  }
}

/**
 * Detect deliverable category
 */
function detectDeliverableType(url = '') {
  const low = url.toLowerCase();
  if (low.includes('.pdf') || low.includes('/pdf')) return 'pdf';
  if (low.includes('notion.site') || low.includes('notion.so')) return 'notion';
  if (low.includes('github.com')) return 'github';
  if (low.includes('drive.google.com') || low.includes('docs.google.com')) return 'drive';
  if (low.includes('dropbox.com')) return 'dropbox';
  return 'resource_link';
}

/**
 * Live health check for a Scout Account session
 */
async function testScoutHealth(scoutId) {
  const scout = getScoutAccountById(scoutId);
  if (!scout) return { success: false, error: 'Scout account not found' };

  console.log(`[Scout Worker] 🩺 Probing health of Scout @${scout.username}...`);
  const now = new Date().toISOString();
  const dsUser = scout.account_id || scout.session_id.split('%3A')[0] || scout.session_id.split(':')[0] || '';

  try {
    const headers = buildScoutHeaders(scout.session_id, '', dsUser);
    const res = await axios.get(`https://www.instagram.com/${scout.username}/`, {
      headers,
      timeout: 12000,
      validateStatus: status => status < 500
    });

    const isHtml = typeof res.data === 'string';
    const hasUser = isHtml && (res.data.includes(scout.username) || res.data.includes('link-profile'));
    const isLoginPrompt = isHtml && (res.data.includes('/accounts/login/') && !res.data.includes('link-profile'));

    if (res.status === 200 && (hasUser || !isLoginPrompt)) {
      updateScoutAccount(scout.id, {
        status: 'active',
        health_status: 'healthy',
        account_id: dsUser || scout.account_id || '',
        last_health_check_at: now,
        last_error: ''
      });
      return {
        success: true,
        healthy: true,
        status: 'active',
        account_id: dsUser,
        username: scout.username,
        user: { username: scout.username, id: dsUser },
        message: `🟢 Scout session for @${scout.username}${dsUser ? ` (Account ID: ${dsUser})` : ''} is valid and active!`
      };
    } else if (res.status === 401 || res.status === 403 || isLoginPrompt) {
      updateScoutAccount(scout.id, {
        status: 'needs_reauth',
        health_status: 'expired',
        last_health_check_at: now,
        last_error: 'Session cookie expired or rejected by Instagram'
      });
      return {
        success: false,
        healthy: false,
        status: 'needs_reauth',
        error: 'Instagram rejected sessionid cookie (401/403). Please update session cookie in Settings.'
      };
    } else {
      updateScoutAccount(scout.id, {
        status: 'active',
        health_status: 'healthy',
        account_id: dsUser || scout.account_id || '',
        last_health_check_at: now,
        last_error: ''
      });
      return {
        success: true,
        healthy: true,
        status: 'active',
        account_id: dsUser,
        username: scout.username,
        message: `🟢 Scout session for @${scout.username} configured successfully!`
      };
    }
  } catch (err) {
    updateScoutAccount(scout.id, {
      health_status: 'error',
      last_health_check_at: now,
      last_error: err.message
    });
    return { success: false, error: err.message };
  }
}

/**
 * Posts a trigger keyword comment on a target creator's reel via the Scout Account
 */
async function postScoutComment({ postUrl, triggerKeyword, niche = 'all', scoutId = null }) {
  if (!postUrl || !triggerKeyword) {
    return { success: false, error: 'Missing post URL or trigger keyword' };
  }

  const shortcode = extractShortcode(postUrl);
  if (!shortcode) {
    return { success: false, error: 'Could not extract valid Instagram shortcode from URL' };
  }

  const mediaPk = shortcodeToMediaPk(shortcode);
  if (!mediaPk) {
    return { success: false, error: 'Could not resolve numeric Media PK from shortcode' };
  }

  // 1. Resolve Scout Account
  let scout = scoutId ? getScoutAccountById(scoutId) : getActiveScout(niche);
  if (!scout) {
    console.warn(`[Scout Worker] ⚠️ No active Scout account available for niche [${niche}].`);
    return {
      success: false,
      reason: 'no_scout_available',
      note: 'No active scout account found in database. Please configure a scout account in Settings.'
    };
  }

  // 2. Enforce Humanized Jitter & Delays (3 to 6 seconds)
  const jitterMs = Math.floor(Math.random() * 3000) + 3000;
  console.log(`[Scout Worker] ⏳ Humanized pause (${(jitterMs / 1000).toFixed(1)}s) before commenting as @${scout.username}...`);
  await new Promise(r => setTimeout(r, jitterMs));

  // 3. Attempt Comment Dispatch
  console.log(`[Scout Worker] 💬 Dispatching comment "${triggerKeyword}" on post ${shortcode} (PK: ${mediaPk}) via Scout @${scout.username}...`);

  try {
    const headers = buildScoutHeaders(scout.session_id);
    const body = `comment_text=${encodeURIComponent(triggerKeyword.trim())}`;

    const res = await axios.post(`https://i.instagram.com/api/v1/media/${mediaPk}/comment/`, body, {
      headers,
      timeout: 15000
    });

    if (res.data?.status === 'ok' || res.data?.comment) {
      incrementScoutUsage(scout.id);
      console.log(`[Scout Worker] ✅ Successfully commented "${triggerKeyword}" on ${shortcode}! Comment ID: ${res.data?.comment?.pk || 'ok'}`);
      return {
        success: true,
        scoutUsername: scout.username,
        scoutId: scout.id,
        commentPk: res.data?.comment?.pk || 'ok',
        triggerKeyword
      };
    } else {
      throw new Error(res.data?.message || 'Instagram returned non-OK comment response');
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.warn(`[Scout Worker] Direct API comment notice: ${errMsg}`);

    // Fallback: Check if local Python microservice is active on port 8001
    try {
      const microRes = await axios.post('http://127.0.0.1:8001/media/comment', {
        media_url: postUrl,
        text: triggerKeyword.trim()
      }, { timeout: 12000 });

      if (microRes.data?.success) {
        incrementScoutUsage(scout.id);
        console.log(`[Scout Worker] ✅ Comment posted via local microservice (:8001)!`);
        return {
          success: true,
          scoutUsername: scout.username,
          scoutId: scout.id,
          commentPk: microRes.data?.comment_pk || 'ok',
          triggerKeyword,
          method: 'microservice_fallback'
        };
      }
    } catch (microErr) {}

    // Check if account hit temporary action block
    if (errMsg.toLowerCase().includes('feedback_required') || errMsg.toLowerCase().includes('restrict')) {
      console.warn(`[Scout Worker] ⚠️ Scout @${scout.username} received action block. Setting cooling down.`);
      updateScoutAccount(scout.id, { status: 'cooling_down', last_error: errMsg });
    }

    return {
      success: false,
      reason: 'comment_failed',
      scoutUsername: scout.username,
      error: errMsg
    };
  }
}

/**
 * Actively polls the Scout's direct message inbox to intercept the creator's automated DM
 */
async function listenForScoutDm({ scoutId, creatorUsername, triggerKeyword, timeoutMs = 35000 }) {
  if (!creatorUsername) return null;

  const scout = scoutId ? getScoutAccountById(scoutId) : getActiveScout();
  if (!scout) return null;

  const cleanCreator = creatorUsername.toLowerCase().replace('@', '').trim();
  const startTime = Date.now();

  console.log(`[Scout Worker] 👂 Scout @${scout.username} listening for incoming DM from @${cleanCreator} (timeout: ${timeoutMs / 1000}s)...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const headers = buildScoutHeaders(scout.session_id);
      const res = await axios.get('https://i.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=10', {
        headers,
        timeout: 8000
      });

      const threads = res.data?.inbox?.threads || [];
      for (const thread of threads) {
        const users = (thread.users || []).map(u => (u.username || '').toLowerCase());
        const matchCreator = users.includes(cleanCreator) || (thread.thread_title || '').toLowerCase().includes(cleanCreator);

        if (matchCreator) {
          // Inspect newest messages in this thread
          const items = thread.items || [];
          for (const item of items.slice(0, 5)) {
            const text = item.text || (item.link && item.link.text) || '';
            const links = extractLinks(text);

            if (links.length > 0) {
              const rawUrl = links[0];
              const canonicalUrl = await unshortenUrl(rawUrl);
              console.log(`[Scout Worker] 🎯 Intercepted authentic creator link from @${cleanCreator}: ${canonicalUrl}`);
              return {
                success: true,
                url: canonicalUrl,
                rawUrl,
                rawMessage: text,
                deliverableType: detectDeliverableType(canonicalUrl),
                scoutUsername: scout.username,
                creator: cleanCreator,
                harvestMethod: 'scout_dm_intercept'
              };
            }
          }
        }
      }
    } catch (err) {
      // Loop continues until timeout
    }

    // Wait 3.0 seconds between polling attempts
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[Scout Worker] ⌛ Polling window ended. No automated DM received from @${cleanCreator} within ${timeoutMs / 1000}s.`);
  return null;
}

/**
 * Executes full Scout Harvester cycle:
 * 1. Checks Scout availability
 * 2. Posts comment trigger
 * 3. Polls DM inbox for creator response
 */
async function executeScoutHarvestCycle({ postUrl, triggerKeyword, creatorUsername, niche = 'all' }) {
  console.log(`\n======================================================`);
  console.log(`[Scout Worker] 🚀 Initiating Autonomous Scout Harvest Cycle`);
  console.log(`[Scout Worker] Target: ${postUrl} | Keyword: "${triggerKeyword}" | Creator: @${creatorUsername || 'unknown'}`);
  console.log(`======================================================`);

  // 1. Post comment
  const commentRes = await postScoutComment({ postUrl, triggerKeyword, niche });
  if (!commentRes.success) {
    return {
      success: false,
      stage: 'comment_failed',
      reason: commentRes.reason || commentRes.error,
      scoutUsername: commentRes.scoutUsername || null
    };
  }

  // 2. Poll DM inbox
  const dmRes = await listenForScoutDm({
    scoutId: commentRes.scoutId,
    creatorUsername,
    triggerKeyword,
    timeoutMs: 35000
  });

  if (dmRes && dmRes.url) {
    return {
      success: true,
      stage: 'dm_captured',
      url: dmRes.url,
      rawUrl: dmRes.rawUrl,
      rawMessage: dmRes.rawMessage,
      deliverableType: dmRes.deliverableType,
      scoutUsername: commentRes.scoutUsername
    };
  }

  return {
    success: false,
    stage: 'dm_timeout',
    scoutUsername: commentRes.scoutUsername,
    reason: 'Creator automated bot did not reply in DM within 35 seconds'
  };
}

module.exports = {
  shortcodeToMediaPk,
  extractShortcode,
  testScoutHealth,
  postScoutComment,
  listenForScoutDm,
  executeScoutHarvestCycle,
  unshortenUrl,
  extractLinks,
  detectDeliverableType
};

