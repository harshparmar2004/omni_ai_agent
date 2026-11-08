const axios = require('axios');

const ACTIVE_FALLBACK_TOKEN = '8887232624:AAGI8q912YhGLF10wfPc1EtOTR1DFzkVEkI';
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const ALLOWED_CHATS = (process.env.ALLOWED_CHAT_IDS || '5443723531').split(',').map(s => s.trim());

function getTelegramToken() {
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!envToken || envToken.includes('AAEiRpeqL8bGayHVREpp57eaFc_liOfyNUE') || envToken.includes('AAEnLK8S434FRjtg70XMZRBZVWrg6PFgHpk') || envToken.length < 20) {
    return ACTIVE_FALLBACK_TOKEN;
  }
  return envToken;
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
    console.error('[Telegram Send Error]:', err.response?.data || err.message);
    return null;
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
    console.error('[Telegram Edit Error]:', err.response?.data || err.message);
    return null;
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
          icon: p.slug?.includes('gta') ? '🎮' : (p.slug?.includes('club') ? '🪩' : (p.slug?.includes('movie') ? '🍿' : '💡'))
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
    { id: '2', slug: 'movies', name: 'Movie Recommendations', handle: '@movie_series_365', icon: '🍿' },
    { id: '3', slug: 'clubbing', name: 'Clubbing Cult', handle: '@clubbingcult', icon: '🪩' },
    { id: '4', slug: 'cult_information', name: 'Cult Information', handle: '@cult_information', icon: '💡' }
  ];
}

module.exports = async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', service: 'OmniStudio Telegram Webhook Bridge v7' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const update = req.body;
  if (!update) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.callback_query?.message;
  if (!msg) {
    return res.status(200).json({ ok: true });
  }

  const chatId = msg.chat?.id;
  const text = (update.message?.text || '').trim();

  if (!chatId) return res.status(200).json({ ok: true });

  // Security Gate
  if (!ALLOWED_CHATS.includes(String(chatId))) {
    await sendTelegram(chatId, `⛔ <b>Access Denied</b>\nChat ID <code>${chatId}</code> is not authorized.`);
    return res.status(200).json({ ok: true });
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
      const pageId = parts[1] || '1';
      const shortcode = parts[2];
      const pages = await getPagesList();
      const targetPage = pages.find(p => String(p.id) === String(pageId)) || { name: 'Destination Page', handle: `@page_${pageId}` };

      const cloudRunUrl = (process.env.CLOUD_RUN_WORKER_URL || process.env.CLOUD_RUN_URL || '').trim().replace(/\/$/, '');
      const isCloudRun = Boolean(cloudRunUrl);

      // Update message with in-place stepper
      await editTelegram(
        chatId,
        messageId,
        `⚡ <b>Agent 1 (Reposter Engine) Engaged:</b> <code>#${shortcode}</code>${isForce ? ' (RE-PUBLISHING)' : ''}\n` +
        `📱 <b>Destination:</b> <code>${targetPage.handle}</code> (${targetPage.name})\n\n` +
        `⏳ <b>1. Ingest:</b> ${isForce ? 'Re-publish approved by operator...' : (isCloudRun ? 'Cloud Run worker connecting...' : 'Cloud runner initializing...')}\n` +
        `⚪ <b>2. Download:</b> Waiting\n` +
        `⚪ <b>3. AI Hook & Copy:</b> Waiting\n` +
        `⚪ <b>4. Publishing:</b> Waiting (Reel & Story)\n\n` +
        `<i>Status: ${isCloudRun ? 'Dispatching to high-speed Cloud Run service...' : 'Spawning turbocharged cloud runner...'}</i>`
      );

      // 1. Direct Cloud Run Dispatch (if configured)
      if (cloudRunUrl) {
        try {
          console.log(`[Webhook] Dispatching directly to Cloud Run at ${cloudRunUrl}... (Force: ${isForce})`);
          await axios.post(
            `${cloudRunUrl}/api/reposter/jobs`,
            {
              url: `https://www.instagram.com/reel/${shortcode}/`,
              chatId: String(chatId),
              chat_id: String(chatId),
              pageId: parseInt(pageId, 10),
              page_id: parseInt(pageId, 10),
              messageId: String(messageId),
              message_id: String(messageId),
              origin: 'telegram_cloud',
              force: isForce
            },
            { timeout: 10000 }
          );
          console.log(`[Webhook] ✓ Successfully dispatched to Cloud Run for #${shortcode}`);
          return res.status(200).json({ ok: true, runner: 'cloud_run' });
        } catch (crErr) {
          console.warn(`[Webhook Cloud Run Warning]: ${crErr.message}. Falling back to GitHub Actions runner...`);
        }
      }

      // 2. Trigger Turbocharged GitHub Actions Workflow
      if (!GITHUB_TOKEN) {
        await sendTelegram(
          chatId,
          `⚠️ <b>GitHub Token Required</b>\n` +
          `To allow Vercel to trigger GitHub Actions, please add <code>GH_DISPATCH_TOKEN</code> in your Vercel project environment variables.\n` +
          `Generate a free token at https://github.com/settings/tokens with 'repo' scope.`
        );
        return res.status(200).json({ ok: true });
      }

      try {
        const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/repost-job.yml/dispatches`;
        await axios.post(
          dispatchUrl,
          {
            ref: 'main',
            inputs: {
              url: `https://www.instagram.com/reel/${shortcode}/`,
              chat_id: String(chatId),
              page_id: String(pageId),
              message_id: String(messageId),
              force: isForce ? 'true' : 'false'
            }
          },
          {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'OmniStudio-Vercel-Bridge'
            },
            timeout: 15000
          }
        );

        console.log(`[Webhook] GitHub Actions Dispatched for #${shortcode} on Page #${pageId} (Force: ${isForce}, Message ID: ${messageId})`);
      } catch (err) {
        console.error('[Webhook Dispatch Error]:', err.response?.data || err.message);
        const detail = err.response?.data?.message || err.message;
        await editTelegram(
          chatId,
          messageId,
          `❌ <b>Cloud Dispatch Failed:</b> ${detail}\nPlease check your GitHub token permissions.`
        );
      }

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
    if (!GITHUB_TOKEN) {
      await sendTelegram(
        chatId,
        `⚠️ <b>GitHub Token Required</b>\n` +
        `<code>GH_DISPATCH_TOKEN</code> is not set in your Vercel project environment variables.\n` +
        `Please add it with 'repo' scope at https://vercel.com.`
      );
      return res.status(200).json({ ok: true });
    }

    const isForce = text.includes('force');
    let targetPageName = 'All Configured Pages';
    if (text.includes('movie') || text.includes('2')) targetPageName = '@movie_series_365';
    else if (text.includes('clubbing') || text.includes('3')) targetPageName = '@clubbingcult';
    else if (text.includes('cult') || text.includes('4')) targetPageName = '@cult_information';
    else if (text.includes('gta') || text.includes('1')) targetPageName = '@gta6_updates_007';

    await sendTelegram(
      chatId,
      `🛰️ <b>Agent 2 (Watchtower 24/7) Engaged!</b>\n\n` +
      `🔍 <b>Task:</b> Scanning competitor accounts for fresh viral reels\n` +
      `📱 <b>Target:</b> <code>${targetPageName}</code>\n` +
      `⚙️ <b>Mode:</b> ${isForce ? '⚡ Force Instant Publish (Blackout Bypassed)' : '🎯 Peak Virality Pacing'}\n\n` +
      `<i>Cloud runner dispatched. As soon as the winning reel is transcoded & published, you will receive the live Instagram link here!</i>`
    );

    try {
      const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/watchtower-cron.yml/dispatches`;
      const dispatchPayload = { ref: 'main' };
      if (isForce) {
        dispatchPayload.inputs = { force: 'true' };
      }
      await axios.post(
        dispatchUrl,
        dispatchPayload,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'OmniStudio-Telegram-Bridge'
          },
          timeout: 15000
        }
      );
      console.log(`[Telegram Webhook] Watchtower workflow dispatched successfully (Force: ${isForce})`);
    } catch (err) {
      console.error('[Watchtower Telegram Dispatch Error]:', err.response?.data || err.message);
      const detail = err.response?.data?.message || err.message;
      await sendTelegram(
        chatId,
        `❌ <b>Watchtower Dispatch Failed:</b> ${detail}\nPlease check your GitHub token permissions.`
      );
    }
    return res.status(200).json({ ok: true });
  }

  // Check Instagram Link
  const match = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);

  if (!match) {
    if (text.startsWith('/')) {
      await sendTelegram(chatId, `ℹ️ Unknown command. Send <code>/post</code> to scan competitors, <code>/pages</code> to view accounts, or paste an Instagram link.`);
    }
    return res.status(200).json({ ok: true });
  }

  const reelUrl = match[0];
  const shortcode = match[1];

  console.log(`[Webhook] Inbound Instagram URL: ${reelUrl} (Shortcode: ${shortcode})`);

  // Build Interactive Destination Page Selection Keyboard
  const pages = await getPagesList();
  const keyboard = [];
  for (const p of pages) {
    keyboard.push([
      { text: `${p.icon || '📱'} Post to ${p.name} (${p.handle})`, callback_data: `post:${p.id}:${shortcode}` }
    ]);
  }
  keyboard.push([
    { text: '✖ Cancel', callback_data: `cancel:${shortcode}` }
  ]);

  await sendTelegram(
    chatId,
    `📥 <b>Instagram Reel Received!</b>\n\n` +
    `🔗 <b>Shortcode:</b> <code>#${shortcode}</code>\n` +
    `🎬 <b>Source:</b> <a href="${reelUrl}">${reelUrl}</a>\n\n` +
    `👉 <b>On which account would you like to post this reel?</b>`,
    {
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );

  return res.status(200).json({ ok: true });
};
