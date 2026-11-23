const axios = require('axios');

const ACTIVE_FALLBACK_TOKEN = '8887232624:AAGI8q912YhGLF10wfPc1EtOTR1DFzkVEkI';
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const ALLOWED_CHATS = (process.env.ALLOWED_CHAT_IDS || '5443723531').split(',').map(s => s.trim());

function getGitHubDispatchTokens() {
  const env1 = (process.env.GH_DISPATCH_TOKEN || '').trim();
  const env2 = (process.env.GITHUB_TOKEN || '').trim();
  const list = [env1, env2].filter(t => Boolean(t && t.length > 20));
  return Array.from(new Set(list));
}

function getTelegramToken() {
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!envToken || envToken.includes('AAEiRpeqL8bGayHVREpp57eaFc_liOfyNUE') || envToken.includes('AAEnLK8S434FRjtg70XMZRBZVWrg6PFgHpk') || envToken.length < 20) {
    return ACTIVE_FALLBACK_TOKEN;
  }
  return envToken;
}

const recentEvents = [];
function recordEvent(type, data = {}) {
  try {
    recentEvents.unshift({
      timestamp: new Date().toISOString(),
      type,
      ...data
    });
    if (recentEvents.length > 30) recentEvents.pop();
  } catch (e) {}
}

async function sendTelegram(chatId, text, extra = {}) {
  const token = getTelegramToken();
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      ...extra
    }, { timeout: 10000 });
    return res.data?.result;
  } catch (err) {
    console.error('[Telegram Send Error (HTML)]:', err.response?.data || err.message);
    try {
      const plainText = String(text).replace(/<[^>]*>/g, '');
      const retryRes = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: plainText,
        disable_web_page_preview: false,
        ...extra
      }, { timeout: 10000 });
      return retryRes.data?.result;
    } catch (retryErr) {
      console.error('[Telegram Send Error (Plain Text Retry)]:', retryErr.response?.data || retryErr.message);
      recordEvent('send_error', { chatId, error: retryErr.response?.data?.description || retryErr.message });
      return null;
    }
  }
}

async function editTelegram(chatId, messageId, text, extra = {}) {
  const token = getTelegramToken();
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
      chat_id: chatId,
      message_id: parseInt(messageId, 10),
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      ...extra
    }, { timeout: 10000 });
    return res.data?.result;
  } catch (err) {
    console.error('[Telegram Edit Error (HTML)]:', err.response?.data || err.message);
    try {
      const plainText = String(text).replace(/<[^>]*>/g, '');
      const retryRes = await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
        chat_id: chatId,
        message_id: parseInt(messageId, 10),
        text: plainText,
        disable_web_page_preview: false,
        ...extra
      }, { timeout: 10000 });
      return retryRes.data?.result;
    } catch (retryErr) {
      console.error('[Telegram Edit Error (Plain Text Retry)]:', retryErr.response?.data || retryErr.message);
      return null;
    }
  }
}

async function answerCallbackQuery(queryId, text = '') {
  const token = getTelegramToken();
  try {
    await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      callback_query_id: queryId,
      text: text
    }, { timeout: 5000 });
  } catch (err) {}
}

let cachedPages = null;
let lastPagesFetch = 0;

async function getPagesList() {
  const now = Date.now();
  if (cachedPages && (now - lastPagesFetch < 60000)) {
    return cachedPages;
  }

  // 1. If OMNI_SERVER_URL is provided, fetch dynamic pages from live backend vault
  const serverUrl = (process.env.OMNI_SERVER_URL || process.env.OMNI_API_URL || '').trim().replace(/\/$/, '');
  const masterKey = (process.env.OMNI_MASTER_KEY || 'omni_vault_master_secret').trim();

  if (serverUrl) {
    try {
      const res = await axios.get(`${serverUrl}/api/system/vault/sync`, {
        headers: { 'x-master-key': masterKey },
        timeout: 4000
      });
      if (res.data && res.data.pages) {
        const pagesArray = Object.values(res.data.pages).filter(p => p.is_active !== false).map(p => ({
          id: String(p.id),
          slug: p.slug || p.handle?.replace(/^@/, ''),
          name: p.name,
          handle: p.handle,
          icon: p.slug?.includes('cherry') ? '🍒' : (p.slug?.includes('gta') ? '🎮' : (p.slug?.includes('club') ? '🍸' : (p.slug?.includes('movie') ? '🎬' : '🧠')))
        }));
        if (pagesArray.length > 0) {
          cachedPages = pagesArray;
          lastPagesFetch = now;
          return pagesArray;
        }
      }
    } catch (e) {
      console.warn('[Webhook] Remote vault pages fetch failed, falling back to local:', e.message);
    }
  }

  // 2. Local config/pages.json
  try {
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(process.cwd(), 'config', 'pages.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      cachedPages = parsed;
      lastPagesFetch = now;
      return parsed;
    }
  } catch (e) {}

  return [
    { id: '1', slug: 'gta6', name: 'GTA 6 Updates 007', handle: '@gta6_updates_007', icon: '🎮' },
    { id: '2', slug: 'movies', name: 'Movie Series 365', handle: '@movie_series_365', icon: '🎬' },
    { id: '3', slug: 'clubbing', name: 'Clubbing Cult', handle: '@clubbingcult', icon: '🍸' },
    { id: '4', slug: 'cult_information', name: 'Cult Information', handle: '@cult_information', icon: '🧠' },
    { id: '5', slug: 'cherry', name: 'Cherry', handle: '@cherry_official', icon: '🍒', page_type: 'ai_influencer', is_ai_influencer: 1 }
  ];
}

function resolveAutoTargetPage(text = '', requestedId = null) {
  if (requestedId && ['1', '2', '3', '4', '5'].includes(String(requestedId))) {
    return String(requestedId);
  }
  const lower = (text || '').toLowerCase();
  if (lower.includes('page:5') || lower.includes('p:5') || lower.includes('@cherry') || lower.includes('cherry') || /influencer|model|outfit|lifestyle|cherry/i.test(lower)) {
    return '5'; // @cherry_official
  }
  if (lower.includes('page:2') || lower.includes('p:2') || lower.includes('@movie_series_365') || /movie|film|series|cinema|netflix|hollywood|trailer|actor|actress|scene|imdb/i.test(lower)) {
    return '2'; // @movie_series_365
  }
  if (lower.includes('page:1') || lower.includes('@gta6_updates_007') || /gta|rockstar|gaming|gameplay/i.test(lower)) {
    return '1'; // @gta6_updates_007
  }
  if (lower.includes('page:3') || lower.includes('@clubbingcult') || /rave|clubbing|party|techno|dj|festival/i.test(lower)) {
    return '3'; // @clubbingcult
  }
  // Default to Cult Information (Page #4, active & healthy token)
  return '4';
}

function buildPageSelectionKeyboard(shortcode, pages) {
  const keyboard = [];
  for (let i = 0; i < pages.length; i += 2) {
    const pair = pages.slice(i, i + 2);
    keyboard.push(pair.map(p => ({
      text: `${p.icon || '📱'} ${p.name}`,
      callback_data: `post:${p.id}:${shortcode}`
    })));
  }
  keyboard.push([
    { text: '✖ Cancel', callback_data: `cancel:${shortcode}` }
  ]);
  return keyboard;
}

async function dispatchJobToRunner({ url, shortcode, pageId, chatId, messageId = null, isForce = false }) {
  const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
  const pages = await getPagesList();
  const targetPage = pages.find(p => String(p.id) === String(pageId)) || { name: 'Cult Information', handle: '@cult_information', id: '4' };

  const cloudRunUrl = (process.env.CLOUD_RUN_WORKER_URL || process.env.CLOUD_RUN_URL || '').trim().replace(/\/$/, '');
  const isCloudRun = Boolean(cloudRunUrl);

  const statusText =
    `⚡ <b>Agent 1 (Reposter Engine) Engaged:</b> <code>#${shortcode}</code>${isForce ? ' (RE-PUBLISHING)' : ''}\n` +
    `📱 <b>Destination:</b> <code>${targetPage.handle}</code> (${targetPage.name})\n\n` +
    `⏳ <b>1. Ingest:</b> ${isForce ? 'Re-publish approved by operator...' : (isCloudRun ? 'Cloud Run worker connecting...' : 'Cloud runner spawned & initializing...')}\n` +
    `⚪ <b>2. Download:</b> Waiting\n` +
    `⚪ <b>3. AI Hook & Copy:</b> Waiting\n` +
    `⚪ <b>4. Publishing:</b> Waiting (Reel & Story)\n\n` +
    `<i>Status: Running on 24/7 cloud servers (publishes autonomously even if phone is switched off)</i>`;

  // Quick switch destination buttons
  const otherPages = pages.filter(p => String(p.id) !== String(pageId));
  const keyboard = [];
  const switchRow = otherPages.map(p => ({
    text: `Switch to ${p.handle}`,
    callback_data: `post:${p.id}:${shortcode}`
  }));
  if (switchRow.length > 0) {
    keyboard.push(switchRow.slice(0, 2));
    if (switchRow.length > 2) keyboard.push(switchRow.slice(2));
  }
  keyboard.push([{ text: '✖ Cancel', callback_data: `cancel:${shortcode}` }]);

  let activeMessageId = messageId;
  if (activeMessageId) {
    await editTelegram(chatId, activeMessageId, statusText, {
      reply_markup: { inline_keyboard: keyboard }
    });
  } else {
    const sent = await sendTelegram(chatId, statusText, {
      reply_markup: { inline_keyboard: keyboard }
    });
    if (sent?.message_id) {
      activeMessageId = String(sent.message_id);
    }
  }

  // 1. Direct Cloud Run Dispatch (if configured)
  if (cloudRunUrl) {
    try {
      console.log(`[Webhook] Dispatching directly to Cloud Run at ${cloudRunUrl}... (Force: ${isForce})`);
      await axios.post(
        `${cloudRunUrl}/api/reposter/jobs`,
        {
          url: url || `https://www.instagram.com/reel/${shortcode}/`,
          chatId: String(chatId),
          chat_id: String(chatId),
          pageId: parseInt(pageId, 10),
          page_id: parseInt(pageId, 10),
          messageId: String(activeMessageId || ''),
          message_id: String(activeMessageId || ''),
          origin: 'telegram_cloud',
          force: isForce
        },
        { timeout: 10000 }
      );
      console.log(`[Webhook] ✓ Successfully dispatched to Cloud Run for #${shortcode}`);
      return { success: true, runner: 'cloud_run' };
    } catch (crErr) {
      console.warn(`[Webhook Cloud Run Warning]: ${crErr.message}. Falling back to GitHub Actions runner...`);
    }
  }

  const tokenCandidates = getGitHubDispatchTokens();

  if (tokenCandidates.length === 0) {
    if (activeMessageId) {
      await editTelegram(
        chatId,
        activeMessageId,
        `⚠️ <b>GitHub Token Required</b>\n` +
        `To allow Vercel to trigger GitHub Actions, please add <code>GH_DISPATCH_TOKEN</code> in your Vercel project environment variables.\n` +
        `Generate a token at https://github.com/settings/tokens with 'workflow' scope.`
      );
    }
    return { success: false, error: 'no_github_token' };
  }

  const workflowCandidates = ['.github/workflows/repost-job.yml', 'repost-job.yml', '393722735'];
  let dispatchSuccess = false;
  let lastErrDetail = '';

  for (const token of tokenCandidates) {
    for (const wf of workflowCandidates) {
      try {
        const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${wf}/dispatches`;
        await axios.post(
          dispatchUrl,
          {
            ref: 'main',
            inputs: {
              url: url || `https://www.instagram.com/reel/${shortcode}/`,
              chat_id: String(chatId),
              page_id: String(pageId),
              message_id: String(activeMessageId || ''),
              force: isForce ? 'true' : 'false'
            }
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'OmniStudio-Vercel-Bridge'
            },
            timeout: 15000
          }
        );

        console.log(`[Webhook] ✓ GitHub Actions Dispatched via '${wf}' for #${shortcode} on Page #${pageId} (Force: ${isForce})`);
        dispatchSuccess = true;
        break;
      } catch (err) {
        lastErrDetail = err.response?.data?.message || err.message;
        console.warn(`[Webhook Dispatch Attempt Failed for '${wf}']: ${lastErrDetail}`);
      }
    }
    if (dispatchSuccess) break;
  }

  if (!dispatchSuccess && activeMessageId) {
    let helpMsg = `❌ <b>Cloud Dispatch Failed:</b> ${lastErrDetail}\n\n`;
    const errLower = String(lastErrDetail).toLowerCase();

    if (errLower.includes('resource not accessible') || errLower.includes('403')) {
      helpMsg +=
        `🔍 <b>Permission Missing on GitHub Token:</b>\n` +
        `Your fine-grained GitHub token lacks <b>Actions: Read and write</b> permission.\n\n` +
        `🛠️ <b>Quick 15-Second Fix:</b>\n` +
        `1. Go to <a href="https://github.com/settings/tokens?type=beta">GitHub Fine-grained Tokens</a>\n` +
        `2. Click on your token\n` +
        `3. Under <b>Repository permissions</b>, find <b>Actions</b> and set it to <b>Read and write</b>\n` +
        `4. Click <b>Save changes</b> at the bottom!\n\n` +
        `<i>Alternatively, generate a classic token with 'repo' and 'workflow' scopes checked.</i>`;
    } else if (errLower.includes('not found') || errLower.includes('404')) {
      helpMsg +=
        `🔍 <b>Why this happened:</b> GitHub returned 404 (Not Found). The token lacks access to <code>${GITHUB_REPO}</code> or lacks the <b>workflow</b> scope.\n\n` +
        `🛠️ <b>How to fix:</b>\n` +
        `1. Go to <a href="https://github.com/settings/tokens">GitHub Tokens</a> and ensure <b>workflow</b> scope is enabled\n` +
        `2. In Vercel Project Settings &gt; Environment Variables, update <code>GH_DISPATCH_TOKEN</code>.`;
    } else {
      helpMsg += `Please verify that your GitHub token has <b>Actions: Read and write</b> permissions for <code>${GITHUB_REPO}</code>.`;
    }
    await editTelegram(chatId, activeMessageId, helpMsg);
    return { success: false, error: lastErrDetail };
  }

  return { success: true, runner: 'github_actions' };
}

async function handler(req, res) {
  if (req.method === 'GET') {
    const tokens = getGitHubDispatchTokens();
    return res.status(200).json({
      status: 'active',
      service: 'OmniStudio Telegram Webhook Bridge v8',
      tokens_configured: tokens.length,
      allowed_chats: ALLOWED_CHATS,
      recent_events: recentEvents.slice(0, 15)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let update = req.body;
  if (typeof update === 'string') {
    try { update = JSON.parse(update); } catch (e) { update = null; }
  } else if (Buffer.isBuffer(update)) {
    try { update = JSON.parse(update.toString('utf8')); } catch (e) { update = null; }
  }

  if (!update || typeof update !== 'object') {
    return res.status(200).json({ ok: true, empty: true });
  }

  const msg = update.message || update.callback_query?.message || update.channel_post || update.edited_message;
  if (!msg) {
    return res.status(200).json({ ok: true });
  }

  const chatId = msg.chat?.id;
  const senderId = msg.from?.id;

  let text = (
    update.message?.text ||
    update.message?.caption ||
    update.channel_post?.text ||
    update.channel_post?.caption ||
    update.edited_message?.text ||
    update.edited_message?.caption ||
    ''
  ).trim();

  // If text doesn't contain a link, check entities for url
  const allEntities = [
    ...(update.message?.entities || []),
    ...(update.message?.caption_entities || []),
    ...(update.channel_post?.entities || [])
  ];
  for (const ent of allEntities) {
    if (ent.url && !text.includes(ent.url)) {
      text += ' ' + ent.url;
    }
  }

  recordEvent('inbound_update', {
    update_id: update.update_id,
    chat_id: chatId,
    sender_id: senderId,
    is_callback: Boolean(update.callback_query),
    text_preview: text.slice(0, 100)
  });

  if (!chatId) return res.status(200).json({ ok: true });

  // Security Gate (allows if chatId is authorized or senderId is authorized)
  const isAuthorized = ALLOWED_CHATS.includes(String(chatId)) || (senderId && ALLOWED_CHATS.includes(String(senderId)));
  if (!isAuthorized) {
    await sendTelegram(chatId, `⛔ <b>Access Denied</b>\nChat ID <code>${chatId}</code> (User: <code>${senderId || 'unknown'}</code>) is not authorized.`);
    return res.status(200).json({ ok: true, access_denied: true });
  }

  // Handle Callback Queries (Button Clicks)
  if (update.callback_query) {
    const cb = update.callback_query;
    const queryId = cb.id;
    const messageId = cb.message?.message_id;
    const data = (cb.data || '').trim();

    await answerCallbackQuery(queryId);

    const parts = data.split(':');
    const action = parts[0];

    if (action === 'cancel') {
      await editTelegram(chatId, messageId, '✖ <i>Repost cancelled.</i>');
      return res.status(200).json({ ok: true });
    }

    if (action === 'ask_republish') {
      const pageId = parts[1] || '1';
      const shortcode = parts[2];
      const pages = await getPagesList();
      const targetPage = pages.find(p => String(p.id) === String(pageId)) || { name: 'Destination Page', handle: `@page_${pageId}` };

      await editTelegram(
        chatId,
        messageId,
        `⚠️ <b>Reel Already Published on ${targetPage.handle}!</b>\n\n` +
        `This reel (<code>#${shortcode}</code>) was previously posted to <b>${targetPage.name}</b>.\n\n` +
        `👉 <b>Do you want to publish it one more time on ${targetPage.handle}?</b>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `🔁 Yes, Publish Again to ${targetPage.handle}`, callback_data: `republish:${pageId}:${shortcode}` }],
              [{ text: '✖ Cancel', callback_data: `cancel:${shortcode}` }]
            ]
          }
        }
      );
      return res.status(200).json({ ok: true });
    }

    if (action === 'post' || action === 'retry' || action === 'republish') {
      const isForce = action === 'republish';
      const pageId = parts[1] || '4';
      const shortcode = parts[2];

      if (pageId === '3' && !isForce) {
        const pages = await getPagesList();
        const targetPage = pages.find(p => String(p.id) === String(pageId)) || { name: 'Requested Page', handle: `@page_${pageId}` };
        await editTelegram(
          chatId,
          messageId,
          `⚠️ <b>Meta Token Invalidation Warning</b>\n\n` +
          `The Instagram access token for <b>${targetPage.name}</b> (${targetPage.handle}) has expired (Meta Code 190: Session Invalidated).\n\n` +
          `👉 <b>Please choose an active healthy page, or attempt anyway:</b>`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🧠 Post to Cult Information (@cult_information)', callback_data: `post:4:${shortcode}` }],
                [{ text: '🎮 Post to GTA 6 Updates (@gta6_updates_007)', callback_data: `post:1:${shortcode}` }],
                [{ text: '🎬 Post to Movie Series 365 (@movie_series_365)', callback_data: `post:2:${shortcode}` }],
                [{ text: `⚠️ Force Attempt ${targetPage.handle}`, callback_data: `republish:${pageId}:${shortcode}` }],
                [{ text: '✖ Cancel', callback_data: `cancel:${shortcode}` }]
              ]
            }
          }
        );
        return res.status(200).json({ ok: true });
      }

      await dispatchJobToRunner({
        url: `https://www.instagram.com/reel/${shortcode}/`,
        shortcode,
        pageId,
        chatId,
        messageId,
        isForce
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  }

  // Handle Commands
  if (text.startsWith('/start') || text.startsWith('/help')) {
    await sendTelegram(
      chatId,
      `👋 <b>Welcome to OmniStudio v7 Autonomous Cloud Agent!</b>\n\n` +
      `Your agents run <b>24/7 in the cloud</b> — even when your laptop is turned off.\n\n` +
      `<b>⚡ Agent 1 (On-Demand Reposter):</b>\n` +
      `• Share any Instagram Reel or Post link here.\n` +
      `• Auto-downloads media, writes viral hook, transcodes & publishes to Feed + Story in <50s.\n\n` +
      `<b>🛰️ Agent 2 (Watchtower 24/7 Surveillance):</b>\n` +
      `• Monitors competitors and auto-publishes 7 viral reels/day at peak IST times.\n\n` +
      `<b>📋 Commands:</b>\n` +
      `• <code>/post</code> — Trigger competitor scan & publish winner immediately\n` +
      `• <code>/post force</code> — Force publish immediately even if outside peak window\n` +
      `• <code>/pages</code> — View all 4 connected accounts & daily quotas\n` +
      `• <code>/status</code> — View cloud gateway, runners, and IST schedule\n` +
      `• <code>/queue</code> — View dispatch queue status\n\n` +
      `<i>Tip: Just share any Instagram Reel link or tap /post!</i>`
    );
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/pages')) {
    const pages = await getPagesList();
    let msg = `📱 <b>Connected OmniStudio Instagram Destinations (${pages.length}/4):</b>\n\n`;
    for (const p of pages) {
      msg += `${p.icon || '📱'} <b>${p.name}</b> (Page #${p.id})\n`;
      msg += `   • Handle: <code>${p.handle}</code>\n`;
      msg += `   • Daily Target: <b>7 High-Virality Reels / Day</b>\n`;
      msg += `   • Attribution: Zero Creator Credits (100% Brand Native)\n`;
      msg += `   • Cross-Publishing: Feed + Story\n\n`;
    }
    msg += `💡 <i>To repost, simply share any Instagram reel link here and select your target account!</i>`;
    await sendTelegram(chatId, msg);
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/queue')) {
    await sendTelegram(
      chatId,
      `📊 <b>OmniStudio Cloud Dispatch & Queue Engine</b>\n\n` +
      `🟢 <b>Queue State:</b> Ready (Serverless & GitHub Actions Direct)\n` +
      `⚡ <b>Worker Pipeline:</b> GitHub Actions Cloud (Zero Laptop Required)\n` +
      `📦 <b>Active Jobs:</b> Dispatched asynchronously with real-time status reporting\n\n` +
      `<i>Tip: Send any Instagram link to immediately trigger a new repost job.</i>`
    );
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/status')) {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true });
    const istHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }), 10);
    const isNight = istHour >= 22 || istHour < 8;

    await sendTelegram(
      chatId,
      `🛰️ <b>OmniStudio v7 Cloud Engine Status</b>\n\n` +
      `🟢 <b>Serverless Gateway:</b> Active on Vercel 24/7\n` +
      `🤖 <b>Telegram Autonomous Bridge:</b> Online (No Laptop Required)\n` +
      `⚡ <b>Automation Engine:</b> GitHub Actions Cloud\n` +
      `🕒 <b>Current IST Time:</b> <code>${istTimeStr} IST</code>\n` +
      `🛡️ <b>Audience Window Status:</b> ${isNight ? '🌙 Night Blackout Active (Resumes 08:30 IST)' : '☀️ Active Daytime Engagement Window'}\n\n` +
      `📱 <b>Connected Pages (4):</b>\n` +
      `• 🎮 <code>@gta6_updates_007</code> (7/day)\n` +
      `• 🍿 <code>@movie_series_365</code> (7/day)\n` +
      `• 🪩 <code>@clubbingcult</code> (7/day)\n` +
      `• 💡 <code>@cult_information</code> (7/day)\n\n` +
      `📅 <b>Automated IST Posting Schedule:</b>\n` +
      `• 🌅 <b>Morning (08:30 - 11:30 IST):</b> 09:00 AM & 10:30 AM\n` +
      `• 🥪 <b>Lunch (12:30 - 16:30 IST):</b> 01:30 PM & 03:30 PM\n` +
      `• 🌆 <b>Evening (17:00 - 21:30 IST):</b> 06:30 PM, 08:00 PM & 09:15 PM\n` +
      `• 🌙 <b>Night Blackout:</b> 21:30 - 08:30 IST\n\n` +
      `💡 <i>Send <code>/post</code> anytime to trigger a Watchtower cycle instantly!</i>`
    );
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/post') || text.startsWith('/scan') || text.startsWith('/watchtower')) {
    const tokens = getGitHubDispatchTokens();
    if (tokens.length === 0) {
      await sendTelegram(
        chatId,
        `⚠️ <b>GitHub Token Required</b>\n` +
        `<code>GH_DISPATCH_TOKEN</code> is not set in your Vercel project environment variables.\n` +
        `Please add it at https://vercel.com.`
      );
      return res.status(200).json({ ok: true });
    }

    const isForce = text.includes('force');
    let targetPageName = 'All Configured Pages';
    if (text.includes('movie') || text.includes('2')) targetPageName = '@movie_series_365';
    else if (text.includes('clubbing') || text.includes('3')) targetPageName = '@clubbingcult';
    else if (text.includes('cult') || text.includes('4')) targetPageName = '@cult_information';
    else if (text.includes('cherry') || text.includes('5')) targetPageName = '@cherry_official';
    else if (text.includes('gta') || text.includes('1')) targetPageName = '@gta6_updates_007';

    await sendTelegram(
      chatId,
      `🛰️ <b>Agent 2 (Watchtower 24/7) Engaged!</b>\n\n` +
      `🔍 <b>Task:</b> Scanning competitor accounts for fresh viral reels\n` +
      `📱 <b>Target:</b> <code>${targetPageName}</code>\n` +
      `⚙️ <b>Mode:</b> ${isForce ? '⚡ Force Instant Publish (Blackout Bypassed)' : '🎯 Peak Virality Pacing'}\n\n` +
      `<i>Cloud runner dispatched. As soon as the winning reel is transcoded & published, you will receive the live Instagram link here!</i>`
    );

    const wtCandidates = ['.github/workflows/watchtower-cron.yml', 'watchtower-cron.yml', '393660179'];
    let wtSuccess = false;
    let wtErrDetail = '';

    for (const token of tokens) {
      for (const wf of wtCandidates) {
        try {
          const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${wf}/dispatches`;
          const dispatchPayload = { ref: 'main' };
          if (isForce) {
            dispatchPayload.inputs = { force: 'true' };
          }
          await axios.post(
            dispatchUrl,
            dispatchPayload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'OmniStudio-Telegram-Bridge'
              },
              timeout: 15000
            }
          );
          console.log(`[Telegram Webhook] ✓ Watchtower workflow dispatched via '${wf}' (Force: ${isForce})`);
          wtSuccess = true;
          break;
        } catch (err) {
          wtErrDetail = err.response?.data?.message || err.message;
          console.warn(`[Watchtower Telegram Dispatch Attempt Failed for '${wf}']: ${wtErrDetail}`);
        }
      }
      if (wtSuccess) break;
    }

    if (!wtSuccess) {
      await sendTelegram(
        chatId,
        `❌ <b>Watchtower Dispatch Failed:</b> ${wtErrDetail}\nPlease check your GitHub token permissions.`
      );
    }
    return res.status(200).json({ ok: true });
  }

  // Check Instagram Link (matches reel, reels, p, tv, share/reel, share/p across instagram.com and instagr.am)
  const match = text.match(/https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:instagram\.com|instagr\.am)\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|reels|tv|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i);

  if (!match) {
    await sendTelegram(
      chatId,
      `👋 <b>OmniStudio Cloud Assistant</b>\n\n` +
      `To process and publish a video, please paste or share any Instagram Reel or Post link here!\n\n` +
      `💡 <i>Example:</i> <code>https://www.instagram.com/reel/DgCQ8Mwkgl8/</code>\n\n` +
      `<b>Available Commands:</b>\n` +
      `• <code>/pages</code> — View your connected channels (Cult Info, Cherry, GTA6, etc.)\n` +
      `• <code>/status</code> — Check 24/7 cloud health & schedule\n` +
      `• <code>/post</code> — Trigger an instant surveillance scan`
    );
    return res.status(200).json({ ok: true });
  }

  const rawUrl = match[0];
  const shortcode = match[1];
  const reelUrl = `https://www.instagram.com/reel/${shortcode}/`;

  console.log(`[Webhook] Inbound Instagram URL: ${rawUrl} (Shortcode: ${shortcode})`);

  // Auto-resolve target page (e.g. cherry, cult, movie, clubbing, gta)
  const targetPageId = resolveAutoTargetPage(text);

  console.log(`[Webhook] Autonomous Instant Trigger: #${shortcode} -> Page #${targetPageId}`);

  // Dispatches to GitHub Actions immediately, sends stepper status message with switch buttons to Telegram
  const dispatchResult = await dispatchJobToRunner({
    url: reelUrl,
    shortcode,
    pageId: targetPageId,
    chatId,
    messageId: null,
    isForce: false
  });

  recordEvent('dispatched_reel', { shortcode, pageId: targetPageId, success: dispatchResult?.success });

  return res.status(200).json({ ok: true, auto_dispatched: true, pageId: targetPageId, shortcode, dispatch: dispatchResult });
}

module.exports = handler;
module.exports.resolveAutoTargetPage = resolveAutoTargetPage;
module.exports.buildPageSelectionKeyboard = buildPageSelectionKeyboard;
module.exports.dispatchJobToRunner = dispatchJobToRunner;
module.exports.getPagesList = getPagesList;


