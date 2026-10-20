const axios = require('axios');
const {
  getSetting,
  setSetting,
  getPages,
  getPageById,
  getPublishedCountToday,
  getLastPublishedTimestamp,
  listPublishJobs,
  updatePublishJob
} = require('../../database');
const { submitLink } = require('./reposterAgent');
const { retryJob, updateJobProgress } = require('../../core/jobQueue');
const notifier = require('../../core/notifier');

/**
 * OmniStudio v7 — Agent 1: Reposter Telegram Bot Hub
 * Handles operator input, allow-list access control, inline destination
 * page selection, and in-place message state editing.
 */

let isPolling = false;
let pollingOffset = 0;
let stopRequested = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isChatAuthorized(chatId) {
  const allowedStr = getSetting('telegram_allowed_chat_ids', '5443723531');
  const allowedList = allowedStr.split(',').map(s => s.trim()).filter(Boolean);
  return allowedList.includes(String(chatId));
}

function getTelegramToken() {
  return getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN;
}

async function startTelegramBot() {
  const token = getTelegramToken();
  if (!token) {
    console.log('[Telegram Bot] ⚠️ No telegram_bot_token found in settings. Telegram bot disabled.');
    return;
  }

  if (isPolling) return;
  isPolling = true;
  stopRequested = false;

  console.log('[Telegram Bot] 🤖 OmniStudio v7 Reposter Telegram Bot starting long-polling...');

  // Set bot commands
  try {
    await axios.post(`https://api.telegram.org/bot${token}/setMyCommands`, {
      commands: [
        { command: 'start', description: 'Show welcome & instructions' },
        { command: 'pages', description: 'View connected destination pages & quotas' },
        { command: 'status', description: 'System health, agent state & queue' },
        { command: 'queue', description: 'View pending review & failed jobs' },
        { command: 'help', description: 'Help manual' }
      ]
    }, { timeout: 10000 });
  } catch (e) {}

  pollUpdatesLoop().catch(err => {
    console.error('[Telegram Bot Fatal Error]:', err.message);
    isPolling = false;
  });
}

function stopTelegramBot() {
  stopRequested = true;
  isPolling = false;
  console.log('[Telegram Bot] Stopped.');
}

async function pollUpdatesLoop() {
  const token = getTelegramToken();

  while (!stopRequested) {
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
        params: {
          offset: pollingOffset,
          timeout: 25
        },
        timeout: 35000
      });

      const updates = res.data?.result || [];
      for (const update of updates) {
        pollingOffset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (err) {
      if (stopRequested) break;
      const isNetwork = /timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(err.message);
      if (!isNetwork) {
        console.warn(`[Telegram Bot Poll Error]: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();
  const fromUser = msg.from?.username || msg.from?.first_name || 'Operator';

  if (!chatId || !text) return;

  // ── Access Control (Allow-List Gate) ──────────────────────
  if (!isChatAuthorized(chatId)) {
    console.warn(`[Telegram Bot] ⛔ Unauthorized access attempt from Chat ID: ${chatId} (@${fromUser})`);
    await notifier.sendTelegramMessage(
      chatId,
      `⛔ <b>Access Denied</b>\n\n` +
      `Your Chat ID (<code>${chatId}</code>) is not authorized on this OmniStudio instance.\n` +
      `Add your Chat ID to Settings in the web dashboard to enable access.`
    );
    return;
  }

  // ── Command Handlers ─────────────────────────────────────
  if (text.startsWith('/start') || text.startsWith('/help')) {
    const pages = getPages({ isActiveOnly: true });
    const pagesListStr = pages.length > 0
      ? pages.map(p => `• <b>${escapeHtml(p.name)}</b> (${p.handle}) — Quota: ${p.daily_quota}/day`).join('\n')
      : '<i>No pages configured yet. Add one in the dashboard!</i>';

    const welcome = [
      `👋 <b>Welcome to OmniStudio v7 AI Engine</b>`,
      ``,
      `<b>Agent 1 — Reposter:</b>`,
      `Share any Instagram Reel or Post link here. Choose your destination page and it will be published live via Meta Graph API v21.0 within ~2 minutes!`,
      ``,
      `<b>Connected Destination Pages:</b>`,
      pagesListStr,
      ``,
      `<b>Quick Commands:</b>`,
      `• <code>/pages</code> — Inspect page tokens & today's quotas`,
      `• <code>/status</code> — System health & Watchtower status`,
      `• <code>/queue</code> — Pending review items`,
      `• <code>/pause watchtower</code> — Pause 24/7 background scanner`,
      `• <code>/resume watchtower</code> — Resume 24/7 background scanner`,
      ``,
      `<i>Tip: Just share any Instagram Reel link to get started!</i>`
    ].join('\n');

    await notifier.sendTelegramMessage(chatId, welcome);
    return;
  }

  if (text.startsWith('/pages')) {
    const pages = getPages();
    if (pages.length === 0) {
      await notifier.sendTelegramMessage(chatId, '⚠️ No destination pages configured.');
      return;
    }

    const lines = [`📱 <b>Destination Instagram Pages (${pages.length})</b>`, ``];
    for (const p of pages) {
      const todayCount = getPublishedCountToday(p.id);
      const mode = (p.post_mode || 'review').toUpperCase();
      lines.push(`• <b>${escapeHtml(p.name)}</b> (<code>${p.handle}</code>)`);
      lines.push(`  Mode: <b>${mode}</b> | Today: <b>${todayCount}/${p.daily_quota}</b> posts | Active: ${p.is_active ? '✅' : '⏸️'}`);
      lines.push(``);
    }
    await notifier.sendTelegramMessage(chatId, lines.join('\n'));
    return;
  }

  if (text.startsWith('/status')) {
    const pages = getPages({ isActiveOnly: true });
    const queuedCount = listPublishJobs({ status: ['queued', 'downloading', 'publishing'] }).length;
    const isPaused = getSetting('watchtower_paused', '0') === '1';
    const nextRun = getSetting('watchtower_next_run_at', 'Calculating...');

    const report = [
      `🛰 <b>OmniStudio v7 Status Report</b>`,
      ``,
      `<b>Agent 1 (Reposter):</b> 🟢 Online & Ready`,
      `<b>Agent 2 (Watchtower):</b> ${isPaused ? '⏸️ PAUSED' : '🟢 ACTIVE'}`,
      `<b>Next Watchtower Scan:</b> ${isPaused ? 'Paused' : nextRun}`,
      `<b>Active Publishing Jobs:</b> ${queuedCount}`,
      `<b>Active Destination Pages:</b> ${pages.length}`
    ].join('\n');

    await notifier.sendTelegramMessage(chatId, report);
    return;
  }

  if (text.startsWith('/queue')) {
    const pendingJobs = listPublishJobs({ status: 'pending_review', limit: 5 });
    const failedJobs = listPublishJobs({ status: 'failed', limit: 5 });

    if (pendingJobs.length === 0 && failedJobs.length === 0) {
      await notifier.sendTelegramMessage(chatId, '✅ <b>Queue is clear!</b> No items waiting for review or failed.');
      return;
    }

    const lines = [`📋 <b>Content Review & Queue</b>`, ``];

    for (const j of pendingJobs) {
      lines.push(`⏳ <b>Review Needed:</b> #${j.shortcode} for <b>${j.page_handle || j.page_slug}</b>`);
      lines.push(`🔗 <a href="${j.source_url}">${j.source_url}</a>`);
      lines.push(``);
    }

    for (const f of failedJobs) {
      lines.push(`❌ <b>Failed:</b> #${f.shortcode} — <i>${escapeHtml(f.error)}</i>`);
      lines.push(``);
    }

    await notifier.sendTelegramMessage(chatId, lines.join('\n'));
    return;
  }

  if (text.startsWith('/pause watchtower')) {
    setSetting('watchtower_paused', '1');
    notifier.emitDashboardEvent('watchtower_status', { paused: true });
    await notifier.sendTelegramMessage(chatId, '⏸️ <b>Watchtower agent has been paused.</b> No background scans will run until resumed.');
    return;
  }

  if (text.startsWith('/resume watchtower')) {
    setSetting('watchtower_paused', '0');
    notifier.emitDashboardEvent('watchtower_status', { paused: false });
    await notifier.sendTelegramMessage(chatId, '▶️ <b>Watchtower agent resumed.</b> Background 3-hour surveillance active.');
    return;
  }

  // ── Instagram URL Share Handler ──────────────────────────
  const match = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)[^\s]*/);
  if (!match) {
    await notifier.sendTelegramMessage(
      chatId,
      `ℹ️ Please share a valid Instagram Reel or Post link, or use /help to see available commands.`
    );
    return;
  }

  const rawUrl = match[0];
  const shortcode = match[1];
  const activePages = getPages({ isActiveOnly: true });

  if (activePages.length === 0) {
    await notifier.sendTelegramMessage(chatId, '⚠️ No active destination pages found. Please configure a page in the dashboard.');
    return;
  }

  // Build direct publish destination options for Telegram sharing
  const buttons = [];
  for (const page of activePages) {
    buttons.push([{
      text: `🚀 Post to ${page.name} (${page.handle})`,
      callback_data: `post:${page.id}:${shortcode}`
    }]);
  }

  // Add auxiliary options
  buttons.push([
    { text: '✏️ Review Caption First', callback_data: `review:${activePages[0].id}:${shortcode}` },
    { text: '✖ Cancel', callback_data: `cancel:${shortcode}` }
  ]);

  await notifier.sendTelegramMessage(
    chatId,
    `📥 <b>Instagram Reel Received!</b>\n\n` +
    `🔗 <b>Shortcode:</b> <code>${shortcode}</code>\n` +
    `👉 Select destination page to repost:`,
    {
      reply_markup: { inline_keyboard: buttons }
    }
  );
}

async function handleCallbackQuery(cb) {
  const token = getTelegramToken();
  const queryId = cb.id;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data = (cb.data || '').trim();

  // Answer callback query to dismiss spinner in Telegram UI
  try {
    await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      callback_query_id: queryId
    }, { timeout: 5000 });
  } catch (e) {}

  if (!isChatAuthorized(chatId)) return;

  const parts = data.split(':');
  const action = parts[0];

  if (action === 'cancel') {
    await notifier.editTelegramMessage(chatId, messageId, '✖ <i>Repost cancelled.</i>');
    return;
  }

  if (action === 'retry_job') {
    const jobId = parseInt(parts[1], 10);
    try {
      retryJob(jobId);
      await notifier.editTelegramMessage(chatId, messageId, `🔁 <i>Job #${jobId} re-queued for execution...</i>`);
    } catch (e) {
      await notifier.sendTelegramMessage(chatId, `⚠️ Could not retry job: ${e.message}`);
    }
    return;
  }

  if (action === 'post' || action === 'review') {
    const pageId = parseInt(parts[1], 10);
    const shortcode = parts[2];
    const page = getPageById(pageId);

    if (!page) {
      await notifier.editTelegramMessage(chatId, messageId, '⚠️ Selected page no longer exists.');
      return;
    }

    const reviewCaption = action === 'review';
    const sourceUrl = `https://www.instagram.com/p/${shortcode}/`;

    // Edit message to initial progress state
    await notifier.editTelegramMessage(
      chatId,
      messageId,
      [
        `🎬 <b>REPOST PIPELINE: ${page.handle}</b>`,
        `📱 <b>Destination:</b> ${escapeHtml(page.name)} (<code>${page.handle}</code>)`,
        `🔗 <b>Source Reel:</b> <code>#${shortcode}</code>`,
        ``,
        `<code>[1. Ingest] ──> [2. Download] ──> [3. AI Copy] ──> [4. Live]</code>`,
        ``,
        `▶ <b>1. Ingestion:</b> ✅ Received from Telegram`,
        `▶ <b>2. Download:</b> ⏳ Initializing 1080p fetch...`,
        `▶ <b>3. AI Copy:</b> ⚪ Waiting`,
        `▶ <b>4. Meta Live:</b> ⚪ Waiting`
      ].join('\n')
    );

    try {
      const res = await submitLink({
        url: sourceUrl,
        pageId: page.id,
        origin: 'telegram',
        chatId: String(chatId),
        messageId: String(messageId),
        reviewCaption
      });

      if (res.duplicate && res.alreadyPublished) {
        await notifier.editTelegramMessage(
          chatId,
          messageId,
          `⚠️ <b>Already Published!</b>\n\n` +
          `This reel was already posted to ${page.handle} on ${res.job?.published_at}.\n` +
          `👉 <a href="${res.job?.permalink}">${res.job?.permalink}</a>`
        );
      } else if (res.duplicate && res.inProgress) {
        await notifier.editTelegramMessage(
          chatId,
          messageId,
          `⏳ <b>In Progress:</b> This reel is already in the queue for ${page.handle} (${res.job?.status}).`
        );
      }
    } catch (err) {
      await notifier.editTelegramMessage(
        chatId,
        messageId,
        `❌ <b>Error:</b> <i>${err.message}</i>`
      );
    }
  }
}

module.exports = {
  startTelegramBot,
  stopTelegramBot
};
