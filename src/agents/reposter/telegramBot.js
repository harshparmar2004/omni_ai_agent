const axios = require('axios');
const {
  getSetting,
  setSetting,
  getPages,
  getPageById,
  getPublishedCountToday,
  getLastPublishedTimestamp,
  listPublishJobs,
  updatePublishJob,
  getPublishJob,
  getPageGroups,
  getGroupMembers,
  getPageGroupById
} = require('../../database');
const { submitLink } = require('./reposterAgent');
const { retryJob, updateJobProgress } = require('../../core/jobQueue');
const { validateAllTokens } = require('../../core/tokenVault');
const { planDistribution } = require('../../core/distributionPlanner');
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
  const t = (getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!t || t.includes('AAEiRpeqL8bGayHVREpp57eaFc_liOfyNUE') || t.includes('AAEnLK8S434FRjtg70XMZRBZVWrg6PFgHpk') || t.length < 20) {
    return '8887232624:AAGI8q912YhGLF10wfPc1EtOTR1DFzkVEkI';
  }
  return t;
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

  // Check if a cloud webhook is already active
  try {
    const hookInfo = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`, { timeout: 8000 });
    if (hookInfo.data?.result?.url) {
      console.log(`[Telegram Bot] 🌐 Cloud Webhook is active: ${hookInfo.data.result.url}`);
      console.log(`[Telegram Bot] ℹ️ Local polling skipped to allow 24/7 cloud serverless operation without conflict.`);
      isPolling = false;
      return;
    }
  } catch (e) {
    console.warn('[Telegram Bot] Webhook check notice:', e.message);
  }

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
  while (!stopRequested) {
    const token = getTelegramToken();
    if (!token) {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

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
      if (err.response?.status === 409) {
        console.log('[Telegram Bot] ℹ️ 409 Conflict: Cloud webhook is currently active. Pausing local polling loop to let cloud serverless handler process updates.');
        isPolling = false;
        break;
      }
      const isGatewayError = err.response && (err.response.status === 502 || err.response.status === 503 || err.response.status === 504);
      if (isGatewayError) {
        console.warn(`[Telegram Bot] ⚠️ Telegram API Gateway temporarily unavailable (HTTP ${err.response.status}). Retrying in 8s...`);
        await new Promise(r => setTimeout(r, 8000));
      } else {
        const isNetwork = /timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(err.message);
        if (!isNetwork) {
          console.warn(`[Telegram Bot Poll Error]: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 4000));
      }
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

  if (text.startsWith('/groups')) {
    const groups = getPageGroups();
    if (groups.length === 0) {
      await notifier.sendTelegramMessage(chatId, 'ℹ️ No distribution groups configured yet. Create page groups in the dashboard to connect networks.');
      return;
    }

    const lines = [
      `🌐 <b>OmniStudio v8 Distribution Networks</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``
    ];

    for (const g of groups) {
      lines.push(`🔗 <b>${escapeHtml(g.name)}</b> (<code>${g.slug}</code>)`);
      lines.push(`• <b>Pages Connected:</b> ${g.member_count} channels`);
      lines.push(`• <b>Sources Tracked:</b> ${g.source_count} accounts`);
      lines.push(`• <b>Cross-Post Mode:</b> <code>${g.cross_post_mode}</code> (delay: ${g.cross_post_delay_min}-${g.cross_post_delay_max}m)`);
      lines.push(``);
    }

    await notifier.sendTelegramMessage(chatId, lines.join('\n'));
    return;
  }

  if (text.startsWith('/tokens')) {
    await notifier.sendTelegramMessage(chatId, '⏳ Checking Meta Graph API status across all connected pages...');
    try {
      const audit = await validateAllTokens();
      const lines = [
        `🔑 <b>OmniStudio Token Vault Health: ${audit.healthPct}%</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `✅ <b>Valid Accounts:</b> ${audit.valid}/${audit.total}`,
        `❌ <b>Action Needed:</b> ${audit.invalid}`,
        ``
      ];

      for (const p of audit.pages) {
        const icon = p.valid ? '✅' : '❌';
        lines.push(`${icon} <b>${escapeHtml(p.handle)}:</b> ${p.valid ? (p.category || 'Active') : (p.error || 'Expired')}`);
      }

      await notifier.sendTelegramMessage(chatId, lines.join('\n'));
    } catch (e) {
      await notifier.sendTelegramMessage(chatId, `⚠️ Token check failed: ${e.message}`);
    }
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
  const activeGroups = getPageGroups({ isActiveOnly: true });

  if (activePages.length === 0) {
    await notifier.sendTelegramMessage(chatId, '⚠️ No active destination pages found. Please configure a page in the dashboard.');
    return;
  }

  // Build direct publish destination options for Telegram sharing
  const buttons = [];

  // Group Distribution Rings (if groups configured)
  for (const group of activeGroups) {
    if (group.member_count > 1) {
      buttons.push([{
        text: `🌐 Distribute to All: ${group.name} (${group.member_count} Pages)`,
        callback_data: `dist:${group.id}:${shortcode}`
      }]);
    }
  }

  // Individual Pages
  for (const page of activePages) {
    const isCultInfo = page.slug === 'cult_information' || (page.handle && (page.handle.includes('cult_info') || page.handle.includes('cultinformation')));
    const isAi = page.slug === 'ai_curation' || (page.handle && page.handle.includes('evolving'));
    const isClub = page.slug === 'clubbing' || (page.handle && page.handle.includes('clubbing'));
    const isMovie = page.slug === 'movies' || (page.handle && page.handle.includes('movie'));
    const icon = isCultInfo ? '⚡' : (isAi ? '🤖' : (isClub ? '🪩' : (isMovie ? '🍿' : '🚀')));

    const existing = getPublishJob(page.id, shortcode);
    const isAlreadyPub = existing && existing.status === 'published';
    const statusTag = isAlreadyPub ? ' (Already Posted ✅)' : '';

    buttons.push([{
      text: `${icon} Post to ${page.name} (${page.handle})${statusTag}`,
      callback_data: isAlreadyPub ? `ask_republish:${page.id}:${shortcode}` : `post:${page.id}:${shortcode}`
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
    `👉 Select destination page or distribution network:`,
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

  if (action === 'dist') {
    const groupId = parseInt(parts[1], 10);
    const shortcode = parts[2];
    const group = getPageGroupById(groupId);
    if (!group) {
      await notifier.editTelegramMessage(chatId, messageId, '⚠️ Distribution group no longer exists.');
      return;
    }

    const members = getGroupMembers(groupId);
    if (members.length === 0) {
      await notifier.editTelegramMessage(chatId, messageId, `⚠️ No active pages connected to group '${group.name}'.`);
      return;
    }

    const primaryPage = members.find(m => m.role === 'primary') || members[0];
    const sourceUrl = `https://www.instagram.com/p/${shortcode}/`;

    await notifier.editTelegramMessage(
      chatId,
      messageId,
      [
        `🌐 <b>NETWORK DISTRIBUTION: ${escapeHtml(group.name)}</b>`,
        `📱 <b>Primary Seed Page:</b> ${escapeHtml(primaryPage.page_name)} (<code>${primaryPage.page_handle}</code>)`,
        `👥 <b>Distribution Ring:</b> ${members.length} interconnected pages`,
        `🔗 <b>Reel Shortcode:</b> <code>#${shortcode}</code>`,
        ``,
        `⏳ <i>Submitting to seed channel... Once published, reel will automatically fan out with unique branding to all ${members.length - 1} sibling channels.</i>`
      ].join('\n')
    );

    try {
      const res = await submitLink({
        url: sourceUrl,
        pageId: primaryPage.page_id,
        origin: 'telegram',
        chatId: String(chatId),
        messageId: String(messageId),
        reviewCaption: false
      });

      if (res.job) {
        planDistribution(res.job.id, { groupId }).catch(e => {
          console.warn('[Telegram Dist Notice]:', e.message);
        });
      }
    } catch (err) {
      await notifier.editTelegramMessage(chatId, messageId, `❌ <b>Error:</b> <i>${err.message}</i>`);
    }
    return;
  }

  if (action === 'ask_republish') {
    const pageId = parseInt(parts[1], 10);
    const shortcode = parts[2];
    const page = getPageById(pageId);
    if (!page) {
      await notifier.editTelegramMessage(chatId, messageId, '⚠️ Selected page no longer exists.');
      return;
    }
    const existing = getPublishJob(page.id, shortcode);
    const pubDate = existing?.published_at ? new Date(existing.published_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'earlier';
    const perma = existing?.permalink ? `\n🔗 <b>Live Post:</b> <a href="${existing.permalink}">${existing.permalink}</a>` : '';

    await notifier.editTelegramMessage(
      chatId,
      messageId,
      `⚠️ <b>Reel Already Published on ${escapeHtml(page.handle)}!</b>\n\n` +
      `This reel (<code>#${shortcode}</code>) was already posted to <b>${escapeHtml(page.name)}</b> on <code>${pubDate}</code>.${perma}\n\n` +
      `👉 <b>Do you want to publish it one more time on ${escapeHtml(page.handle)}?</b>`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `🔁 Yes, Publish Again to ${page.handle}`, callback_data: `republish:${page.id}:${shortcode}` }
            ],
            [
              { text: '✖ Cancel', callback_data: `cancel:${shortcode}` }
            ]
          ]
        }
      }
    );
    return;
  }

  if (action === 'post' || action === 'review' || action === 'republish') {
    const pageId = parseInt(parts[1], 10);
    const shortcode = parts[2];
    const isRepublish = action === 'republish';
    const page = getPageById(pageId);

    if (!page) {
      await notifier.editTelegramMessage(chatId, messageId, '⚠️ Selected page no longer exists.');
      return;
    }

    // Safety gate: if already published and operator didn't explicitly tap republish, ask first!
    if (!isRepublish) {
      const existing = getPublishJob(page.id, shortcode);
      if (existing && existing.status === 'published') {
        const pubDate = existing.published_at ? new Date(existing.published_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'earlier';
        const perma = existing.permalink ? `\n🔗 <b>Live Post:</b> <a href="${existing.permalink}">${existing.permalink}</a>` : '';
        await notifier.editTelegramMessage(
          chatId,
          messageId,
          `⚠️ <b>Reel Already Published on ${escapeHtml(page.handle)}!</b>\n\n` +
          `This reel (<code>#${shortcode}</code>) was already posted to <b>${escapeHtml(page.name)}</b> on <code>${pubDate}</code>.${perma}\n\n` +
          `👉 <b>Do you want to publish it one more time on ${escapeHtml(page.handle)}?</b>`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `🔁 Yes, Publish Again to ${page.handle}`, callback_data: `republish:${page.id}:${shortcode}` }
                ],
                [
                  { text: '✖ Cancel', callback_data: `cancel:${shortcode}` }
                ]
              ]
            }
          }
        );
        return;
      }
    }

    const reviewCaption = action === 'review';
    const sourceUrl = `https://www.instagram.com/p/${shortcode}/`;

    // Edit message to initial progress state
    await notifier.editTelegramMessage(
      chatId,
      messageId,
      [
        `🎬 <b>REPOST PIPELINE: ${page.handle}${isRepublish ? ' (RE-PUBLISHING)' : ''}</b>`,
        `📱 <b>Destination:</b> ${escapeHtml(page.name)} (<code>${page.handle}</code>)`,
        `🔗 <b>Source Reel:</b> <code>#${shortcode}</code>`,
        ``,
        `<code>[1. Ingest] ──> [2. Download] ──> [3. AI Copy] ──> [4. Live]</code>`,
        ``,
        `▶ <b>1. Ingestion:</b> ✅ ${isRepublish ? 'Re-publish approved by operator' : 'Received from Telegram'}`,
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
        reviewCaption,
        force: isRepublish
      });

      if (res.duplicate && res.alreadyPublished && !isRepublish) {
        const pubDate = res.job?.published_at ? new Date(res.job.published_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'earlier';
        const perma = res.job?.permalink ? `\n🔗 <b>Live Post:</b> <a href="${res.job.permalink}">${res.job.permalink}</a>` : '';
        await notifier.editTelegramMessage(
          chatId,
          messageId,
          `⚠️ <b>Reel Already Published on ${escapeHtml(page.handle)}!</b>\n\n` +
          `This reel was already posted to ${page.handle} on ${pubDate}.${perma}\n\n` +
          `👉 <b>Do you want to publish it one more time on ${escapeHtml(page.handle)}?</b>`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: `🔁 Yes, Publish Again to ${page.handle}`, callback_data: `republish:${page.id}:${shortcode}` }],
                [{ text: '✖ Cancel', callback_data: `cancel:${shortcode}` }]
              ]
            }
          }
        );
      } else if (res.duplicate && res.inProgress && !isRepublish) {
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
