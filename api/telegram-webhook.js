const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8887232624:AAEnLK8S434FRjtg70XMZRBZVWrg6PFgHpk';
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'harshparmar2004/omni_ai_agent';
const GITHUB_TOKEN = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
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

module.exports = async function handler(req, res) {
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

  // Handle Commands
  if (text.startsWith('/start') || text.startsWith('/help')) {
    await sendTelegram(
      chatId,
      `👋 <b>Welcome to OmniStudio v7 24/7 Cloud Bot!</b>\n\n` +
      `You can share any Instagram Reel or Post link here.\n` +
      `Our cloud agent will automatically:\n` +
      `• Download the highest-quality media\n` +
      `• Generate Groq Llama 3.3 viral copy & hooks\n` +
      `• Transcode with anti-duplicate signature\n` +
      `• Publish the Reel to your Instagram Feed\n` +
      `• Publish the original-aspect Story Reel Card to your Instagram Story\n\n` +
      `<i>Tip: Just paste any Instagram link to test right now!</i>`
    );
    return res.status(200).json({ ok: true });
  }

  if (text.startsWith('/status')) {
    await sendTelegram(
      chatId,
      `🛰️ <b>OmniStudio Cloud Status</b>\n\n` +
      `🟢 <b>Serverless Webhook:</b> Online on Vercel\n` +
      `🛰️ <b>Watchtower Surveillance:</b> 24/7 Scheduled on GitHub Actions\n` +
      `📱 <b>Target Page:</b> @gta6_updates_007 (GTA 6 Updates 007)\n` +
      `⚡ <b>AI Engine:</b> Groq Llama 3.3 70B (High-Speed)`
    );
    return res.status(200).json({ ok: true });
  }

  // Check Instagram Link
  const match = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!match) {
    if (text.startsWith('/')) {
      await sendTelegram(chatId, `ℹ️ Unknown command. Paste an Instagram link to publish.`);
    }
    return res.status(200).json({ ok: true });
  }

  const reelUrl = match[0];
  const shortcode = match[1];

  console.log(`[Webhook] Inbound Instagram URL: ${reelUrl} (Shortcode: ${shortcode})`);

  // Send Single In-Place Stepper Message
  const initialMsg = await sendTelegram(
    chatId,
    `⚡ <b>Agent 1 (Reposter Engine) Engaged:</b> <code>#${shortcode}</code>\n` +
    `📱 <b>Destination:</b> <code>@gta6_updates_007</code>\n\n` +
    `⏳ <b>1. Ingest:</b> Cloud runner initializing...\n` +
    `⚪ <b>2. Download:</b> Waiting\n` +
    `⚪ <b>3. AI Hook & Copy:</b> Waiting\n` +
    `⚪ <b>4. Publishing:</b> Waiting (Reel & Story)\n\n` +
    `<i>Status: Spawning GitHub Actions cloud runner...</i>`
  );

  const messageId = initialMsg?.message_id ? String(initialMsg.message_id) : '';

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
          url: reelUrl,
          chat_id: String(chatId),
          page_id: '1',
          message_id: messageId
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

    console.log(`[Webhook] GitHub Actions Dispatched for #${shortcode} (Message ID: ${messageId})`);
  } catch (err) {
    console.error('[Webhook Dispatch Error]:', err.response?.data || err.message);
    const detail = err.response?.data?.message || err.message;
    await sendTelegram(
      chatId,
      `❌ <b>Cloud Dispatch Failed:</b> ${detail}\nPlease check your GitHub token permissions.`
    );
  }

  return res.status(200).json({ ok: true });
};
