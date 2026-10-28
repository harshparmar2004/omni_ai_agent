const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const ALLOWED_CHATS = (process.env.ALLOWED_CHAT_IDS || '5443723531').split(',').map(s => s.trim());

async function sendTelegram(chatId, text, extra = {}) {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
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
  try {
    const res = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
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
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      callback_query_id: queryId,
      text: text
    }, { timeout: 5000 });
  } catch (err) {}
}

function getPagesList() {
  try {
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(process.cwd(), 'config', 'pages.json');
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch (e) {}
  return [
    { id: '1', slug: 'gta6', name: 'GTA 6 Updates 007', handle: '@gta6_updates_007', icon: '🎮' },
    { id: '2', slug: 'movies', name: 'Movie Recommendations', handle: '@movie_series_365', icon: '🍿' }
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

    if (action === 'post') {
      const pageId = parts[1];
      const shortcode = parts[2];
      const pages = getPagesList();
      const targetPage = pages.find(p => String(p.id) === String(pageId)) || { name: 'Destination Page', handle: `@page_${pageId}` };

      // Update message with in-place stepper
      await editTelegram(
        chatId,
        messageId,
        `⚡ <b>Agent 1 (Reposter Engine) Engaged:</b> <code>#${shortcode}</code>\n` +
        `📱 <b>Destination:</b> <code>${targetPage.handle}</code> (${targetPage.name})\n\n` +
        `⏳ <b>1. Ingest:</b> Cloud runner initializing...\n` +
        `⚪ <b>2. Download:</b> Waiting\n` +
        `⚪ <b>3. AI Hook & Copy:</b> Waiting\n` +
        `⚪ <b>4. Publishing:</b> Waiting (Reel & Story)\n\n` +
        `<i>Status: Spawning GitHub Actions cloud runner...</i>`
      );

      // Trigger GitHub Actions Workflow
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
              message_id: String(messageId)
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

        console.log(`[Webhook] GitHub Actions Dispatched for #${shortcode} on Page #${pageId} (Message ID: ${messageId})`);
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
      `<b>⚡ Agent 1 (On-Demand Reposter):</b>\n` +
      `• Share any Instagram Reel or Post link here.\n` +
      `• Auto-downloads media, writes viral hook, transcodes & publishes to Feed + Story in <50s.\n\n` +
      `<b>🛰️ Agent 2 (Watchtower 24/7 Surveillance):</b>\n` +
      `• <code>/post</code> — Trigger autonomous competitor scan & publish viral winner immediately\n` +
      `• <code>/post force</code> — Force publish immediately even if outside peak window\n` +
      `• <code>/status</code> — View system health, quota, and peak schedule\n\n` +
      `<i>Tip: Just tap /post or share any Instagram Reel link!</i>`
    );
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/status')) {
    await sendTelegram(
      chatId,
      `🛰️ <b>OmniStudio v7 Cloud Engine Status</b>\n\n` +
      `🟢 <b>Serverless Gateway:</b> Active on Vercel\n` +
      `📱 <b>Target Page:</b> <code>@gta6_updates_007</code>\n` +
      `🎯 <b>Daily Quota:</b> 7 High-Virality Reels / Day\n` +
      `🚫 <b>Zero Creator Credits:</b> Active (100% Brand Native)\n` +
      `⚡ <b>AI Engine:</b> Groq Llama 3.3 70B (High-Speed)\n\n` +
      `📅 <b>Automated IST Posting Schedule:</b>\n` +
      `• 🌅 <b>Morning (08:30 - 11:30 IST):</b> 09:00 AM & 10:30 AM\n` +
      `• 🥪 <b>Lunch (12:30 - 16:30 IST):</b> 01:30 PM & 03:30 PM\n` +
      `• 🌆 <b>Evening (17:00 - 21:30 IST):</b> 06:30 PM, 08:00 PM & 09:15 PM\n` +
      `• 🌙 <b>Night Blackout:</b> 21:30 - 08:30 IST (Zero overnight posting to prevent bot flags)\n\n` +
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
    await sendTelegram(
      chatId,
      `🛰️ <b>Agent 2 (Watchtower 24/7) Engaged!</b>\n\n` +
      `🔍 <b>Task:</b> Scanning your active competitor accounts for fresh viral reels\n` +
      `📱 <b>Target:</b> <code>@gta6_updates_007</code>\n` +
      `⚙️ <b>Mode:</b> ${isForce ? 'Force Instant Publish (Blackout Bypassed)' : 'Peak Virality Scoring'}\n\n` +
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
      await sendTelegram(chatId, `ℹ️ Unknown command. Send <code>/post</code> to scan competitors or paste an Instagram link.`);
    }
    return res.status(200).json({ ok: true });
  }

  const reelUrl = match[0];
  const shortcode = match[1];

  console.log(`[Webhook] Inbound Instagram URL: ${reelUrl} (Shortcode: ${shortcode})`);

  // Build Interactive Destination Page Selection Keyboard
  const pages = getPagesList();
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
