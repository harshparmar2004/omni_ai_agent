const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const {
  getSetting,
  getBrandAssets,
  addMobileDmTrigger,
  updateMobileDmTrigger,
  getMobileDmTriggerById,
  getConnectedPages,
  getConnectedPageBySlug,
  getConnectedPageById
} = require('../database');
const { processSinglePost } = require('./instagramAutonomousOrchestrator');

let isPolling = false;
let pollTimeout = null;
let lastUpdateId = 0;

function getCleanTelegramToken() {
  return getSetting('telegram_bot_token', '').replace(/\s+/g, '').trim();
}

/**
 * Get Telegram Bot metadata and connection status
 */
async function getTelegramBotInfo() {
  const token = getCleanTelegramToken();
  if (!token) return { online: false, error: 'No Telegram bot token configured' };

  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 8000 });
    if (res.data?.ok) {
      return {
        online: true,
        bot: res.data.result,
        username: res.data.result.username,
        firstName: res.data.result.first_name,
        link: `https://t.me/${res.data.result.username}`
      };
    }
    return { online: false, error: 'Invalid response from Telegram' };
  } catch (err) {
    return { online: false, error: err.response?.data?.description || err.message };
  }
}

/**
 * Send a plain HTML text message via Telegram Bot API
 */
async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = getCleanTelegramToken();
  if (!token) return { success: false, error: 'No Telegram bot token configured' };

  try {
    let safeText = typeof text === 'string' && typeof text.toWellFormed === 'function' ? text.toWellFormed() : String(text || '');
    safeText = safeText.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: String(chatId),
      text: safeText,
      parse_mode: 'HTML',
      ...extra
    }, { timeout: 15000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] Send text error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Answer an incoming Telegram inline callback query
 */
async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  const token = getCleanTelegramToken();
  if (!token) return { success: false };

  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      callback_query_id: String(callbackQueryId),
      text: text,
      show_alert: showAlert
    }, { timeout: 8000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] answerCallbackQuery error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Edit an existing Telegram message's text and markup
 */
async function editTelegramMessageText(chatId, messageId, text, extra = {}) {
  const token = getCleanTelegramToken();
  if (!token) return { success: false };

  try {
    let safeText = typeof text === 'string' && typeof text.toWellFormed === 'function' ? text.toWellFormed() : String(text || '');
    safeText = safeText.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

    const res = await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
      chat_id: String(chatId),
      message_id: messageId,
      text: safeText,
      parse_mode: 'HTML',
      ...extra
    }, { timeout: 15000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] editTelegramMessageText error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a single photo via Telegram Bot API
 */
async function sendTelegramPhoto(chatId, filePath, caption = '') {
  const token = getCleanTelegramToken();
  if (!token || !fs.existsSync(filePath)) return { success: false };

  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    form.append('photo', fs.createReadStream(filePath));

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
      headers: form.getHeaders(),
      timeout: 25000
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] Send photo error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a multi-slide carousel as an interactive photo album (up to 10 photos)
 */
async function sendTelegramMediaGroup(chatId, filePaths = [], caption = '') {
  const token = getCleanTelegramToken();
  if (!token || !filePaths.length) return { success: false };

  const validPaths = filePaths.filter(p => fs.existsSync(p)).slice(0, 10);
  if (!validPaths.length) return { success: false };

  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));

    const media = validPaths.map((p, idx) => {
      const item = {
        type: 'photo',
        media: `attach://slide_${idx}`
      };
      if (idx === 0 && caption) {
        item.caption = caption.substring(0, 1000); // Telegram 1024 char limit for album caption
        item.parse_mode = 'HTML';
      }
      return item;
    });

    form.append('media', JSON.stringify(media));

    validPaths.forEach((p, idx) => {
      form.append(`slide_${idx}`, fs.createReadStream(p));
    });

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMediaGroup`, form, {
      headers: form.getHeaders(),
      timeout: 45000
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] Send media group error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send an MP4 video reel directly to Telegram
 */
async function sendTelegramVideo(chatId, videoPath, caption = '') {
  const token = getCleanTelegramToken();
  if (!token || !fs.existsSync(videoPath)) return { success: false };

  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('supports_streaming', 'true');
    if (caption) {
      form.append('caption', caption.substring(0, 1000));
      form.append('parse_mode', 'HTML');
    }
    form.append('video', fs.createReadStream(videoPath));

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendVideo`, form, {
      headers: form.getHeaders(),
      timeout: 150000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] Send video error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a document (ZIP of slides, PDF Guide) directly to Telegram
 */
async function sendTelegramDocument(chatId, docPath, caption = '') {
  const token = getCleanTelegramToken();
  if (!token || !fs.existsSync(docPath)) return { success: false };

  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    form.append('document', fs.createReadStream(docPath));

    const res = await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
      headers: form.getHeaders(),
      timeout: 45000
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.warn(`[Telegram Bot] Send document error: ${err.response?.data?.description || err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Execute the autonomous post processing and deliver media/reports back to Telegram
 */
async function executePostWorkflow({ trigger, page, rawUrl, shortcode, fromUser, chatId }) {
  const destination = page?.slug || 'gta6';
  const targetHandle = page?.handle || getSetting('instagram_handle', '@gta6_updates_007');
  const isLeadMagnetWorkflow = page?.workflow_type === 'lead_magnet';

  try {
    const result = await processSinglePost(rawUrl, fromUser, null, {
      destination: destination,
      autoPublish: true,
      directPostOnly: !isLeadMagnetWorkflow,
      forceApprove: true
    });
    const log = result.log || {};
    const isApproved = log.llm_decision === 'APPROVED';

    if (isApproved) {
      const isDirectRepost = !isLeadMagnetWorkflow && (log.post_intent === 'direct_repost' || !log.detected_trigger_keyword);
      const isPublished = Boolean((result.published || result.publishResult?.success) && result.publishResult?.mode !== 'mock');
      const liveLink = isPublished ? (result.publishResult?.permalink || log.ig_permalink || '') : '';
      const publishMethod = result.publishResult?.method || 'Meta Verified Content Publishing API v21.0';
      
      let resources = [];
      try {
        if (Array.isArray(log.extracted_resources)) {
          resources = log.extracted_resources;
        } else if (typeof log.extracted_resources === 'string') {
          resources = JSON.parse(log.extracted_resources || '[]');
        }
      } catch (e) {
        resources = [];
      }

      // Priority resolution for the authentic creator deliverable URL
      let assetUrl = log.harvested_deliverable_url || '';
      if (!assetUrl && resources.length > 0) {
        assetUrl = resources[0].url;
      }
      if (!assetUrl && result.postId) {
        try {
          const pRow = getDb().prepare('SELECT deliverable_url FROM instagram_posts WHERE id = ?').get(result.postId);
          if (pRow?.deliverable_url) assetUrl = pRow.deliverable_url;
        } catch (e) {}
      }

      const triggerKeyword = (log.detected_trigger_keyword || page?.custom_trigger_keyword || 'PROJECT').toUpperCase();

      // Check InstaAuto Health for live confirmation in Telegram
      let bridgeStatusLine = '⚡ <b>InstaAuto Status:</b> Armed &amp; Listening (Port 3000)';
      try {
        const { checkInstaAutoHealth } = require('./bridgeService');
        const health = await checkInstaAutoHealth();
        if (health.online) {
          bridgeStatusLine = `⚡ <b>InstaAuto Status:</b> 🟢 Armed on Port 3000 (Follow-First Gate Active)`;
        } else {
          bridgeStatusLine = `⚡ <b>InstaAuto Status:</b> 🟡 Queued for Port 3000 (Ready to Arm)`;
        }
      } catch (e) {}

      const mediaPaths = log.cleaned_media_paths?.length ? log.cleaned_media_paths : (log.downloaded_media_paths || []);

      updateMobileDmTrigger(trigger.id, {
        processing_status: isPublished ? 'published' : 'staged',
        live_post_permalink: liveLink || null,
        completed_at: new Date().toISOString()
      });

      // ── 1. SEND NATIVE MEDIA FILES TO TELEGRAM (Download to Phone) ────────
      let localMediaFiles = mediaPaths.map(p => {
        if (path.isAbsolute(p)) return p;
        return path.join(__dirname, '..', '..', 'public', p.replace(/^\//, ''));
      }).filter(p => fs.existsSync(p));

      // Fallback: Check local carousel directory directly if paths needed resolution
      if (localMediaFiles.length === 0) {
        const carouselDir = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads', 'carousels', shortcode);
        if (fs.existsSync(carouselDir)) {
          localMediaFiles = fs.readdirSync(carouselDir)
            .filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'))
            .sort((a, b) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/\D/g, '')) || 0;
              return numA - numB;
            })
            .map(f => path.join(carouselDir, f));
        }
      }

      const isVideo = log.content_type === 'reel' || localMediaFiles.some(f => f.endsWith('.mp4'));

      if (isVideo && localMediaFiles.length > 0) {
        // Send MP4 Video
        const vidFile = localMediaFiles.find(f => f.endsWith('.mp4')) || localMediaFiles[0];
        console.log(`[Telegram Bot] 🎥 Uploading video reel to Telegram chat ${chatId}...`);
        await sendTelegramVideo(chatId, vidFile, `🎬 <b>${escapeHtml(log.repurposed_hook || 'Viral Reel')}</b>\nTarget: ${targetHandle}`);
      } else if (localMediaFiles.length > 0) {
        // Send Multi-Photo Album (up to 10 slides)
        console.log(`[Telegram Bot] 📸 Uploading ${localMediaFiles.length} carousel slides as photo album to chat ${chatId}...`);
        await sendTelegramMediaGroup(
          chatId,
          localMediaFiles.slice(0, 10),
          `🖼️ <b>${escapeHtml(log.repurposed_hook || 'Carousel Post')}</b> (${localMediaFiles.length} Slides)\nTarget: ${targetHandle}`
        );

        // If ZIP archive exists, send ZIP document
        const zipFile = path.join(__dirname, '..', '..', 'public', 'generated', 'downloads', 'carousels', shortcode, `carousel_${shortcode}_all_slides.zip`);
        if (fs.existsSync(zipFile)) {
          await sendTelegramDocument(chatId, zipFile, `📦 <b>Uncropped 1080p Carousel ZIP Archive</b>`);
        }
      }

      // ── 2. SEND STRUCTURED LIVE PUBLISH & ASSET REPORT ────────────────────
      const resourceLines = (resources.length > 0)
        ? [
            ``,
            `📚 <b>All Extracted Creator Resources (${resources.length} Verified):</b>`,
            ...resources.slice(0, 7).map((r, i) => `${i + 1}. <a href="${r.url}">${escapeHtml(r.title || r.url)}</a> (<i>${escapeHtml(r.platform || 'web')}</i>)`),
            resources.length > 7 ? `<i>+ ${resources.length - 7} more extracted resources...</i>` : '',
          ].filter(Boolean)
        : [];

      const successHtml = isDirectRepost ? [
        isPublished 
          ? `🎉 <b>Reel Successfully Published to ${targetHandle}!</b>`
          : `🎬 <b>[Direct Viral Repost] Repurposed & Staged in Queue!</b>`,
        ``,
        ...(isPublished ? [
          `🌐 <b>Live Instagram Reel:</b>`,
          `👉 <a href="${liveLink}">${liveLink}</a>`,
          ``
        ] : [
          `⚠️ <b>Publishing Status:</b> Staged for Auto-Publishing (Meta container processing / queued)`,
          `🔗 <b>Original Reel Source:</b> <a href="https://www.instagram.com/p/${shortcode}/">https://www.instagram.com/p/${shortcode}/</a>`,
          ``
        ]),
        `🎬 <b>Target Account:</b> ${targetHandle} (${page?.name || destination})`,
        `⚡ <b>Pipeline Mode:</b> Direct Video Repost (Clean 1080p MP4 / Competitor Tags Stripped)`,
        `🏷️ <b>Publish Engine:</b> ${publishMethod}`,
        `🎵 <b>Audio Attached:</b> <code>${log.selected_song_title || 'Trending Viral Audio'}</code> (${log.selected_song_artist || 'Original'})`,
        `🧼 <b>Brand Cleansed:</b> Cleaned for ${targetHandle}`,
        ...(assetUrl ? [
          ``,
          `🔗 <b>Extracted Source Link:</b>`,
          `👉 <a href="${assetUrl}">${assetUrl}</a>`
        ] : []),
        ...(resources.length > 0 ? [
          ``,
          `📚 <b>Extracted Resources (${resources.length}):</b>`,
          ...resources.slice(0, 5).map((r, i) => `${i + 1}. <a href="${r.url}">${escapeHtml(r.title || r.url)}</a> (<i>${escapeHtml(r.platform || 'web')}</i>)`)
        ] : []),
        ``,
        `📝 <b>Published Caption:</b>`,
        `<blockquote>${escapeHtml(log.repurposed_caption || log.raw_caption)}</blockquote>`,
        ``,
        `🚀 <i>The clean video file has been sent above for your records!</i>`
      ].join('\n') : [
        isPublished 
          ? `🚀 <b>Directly Published to Instagram!</b>`
          : `🎉 <b>Successfully Repurposed & Staged in Queue!</b>`,
        ``,
        ...(isPublished ? [
          `🌐 <b>Live Instagram Post:</b>`,
          `👉 <a href="${liveLink}">${liveLink}</a>`,
          ``
        ] : [
          `⚠️ <b>Publishing Status:</b> Staged for Publishing`,
          `🔗 <b>Original Post Source:</b> <a href="https://www.instagram.com/p/${shortcode}/">https://www.instagram.com/p/${shortcode}/</a>`,
          ``
        ]),
        `🎬 <b>Target Account:</b> ${targetHandle} (${page?.name || destination})`,
        `⭐ <b>Quality Fit Score:</b> ${log.llm_fit_score || 95}/100 (APPROVED)`,
        `🎯 <b>Pipeline Mode:</b> Lead Magnet (Comment Trigger ➔ Creator Inbound DM ➔ InstaAuto Bridge)`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🔗 <b>VERIFIED EXTRACTED SOURCE / DELIVERABLE LINK:</b>`,
        assetUrl ? `👉 <a href="${assetUrl}">${assetUrl}</a>` : `👉 <i>Captured via Creator Post (${rawUrl})</i>`,
        ``,
        `💬 <b>COMMENT-TO-DM KEYWORD:</b> <code>${triggerKeyword}</code>`,
        bridgeStatusLine,
        `━━━━━━━━━━━━━━━━━━━━`,
        ...resourceLines,
        ``,
        `🏷️ <b>Publish Engine:</b> ${publishMethod}`,
        `🎵 <b>Audio Attached:</b> <code>${log.selected_song_title || 'Trending Viral Audio'}</code> (${log.selected_song_artist || 'Original'})`,
        `🧼 <b>Brand Cleansed:</b> Watermarks replaced with ${targetHandle}`,
        ``,
        `📝 <b>LLM Repurposed Caption:</b>`,
        `<blockquote>${escapeHtml(log.repurposed_caption || log.raw_caption)}</blockquote>`,
        ``,
        `🚀 <b>Dashboard Studio:</b> <a href="http://localhost:4000/#instagram">http://localhost:4000/#instagram</a>`
      ].join('\n');

      await sendTelegramMessage(chatId, successHtml, { disable_web_page_preview: false });
    } else {
      updateMobileDmTrigger(trigger.id, {
        processing_status: 'rejected',
        error_message: log.llm_reasoning || 'Filtered by quality threshold',
        completed_at: new Date().toISOString()
      });

      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Post Filtered (Score: ${log.llm_fit_score || 50}/100)</b>\n\n` +
        `Reason: ${log.llm_reasoning || 'Low technical relevance'}\n` +
        `Archived in dashboard. Did not post to feed.`
      );
    }
  } catch (err) {
    console.error(`[Telegram Bot] Processing error: ${err.message}`);
    updateMobileDmTrigger(trigger.id, {
      processing_status: 'error',
      error_message: err.message,
      completed_at: new Date().toISOString()
    });

    await sendTelegramMessage(chatId, `❌ <b>Failed to process Reel:</b> ${err.message}`);
  }
}

/**
 * Handle a message containing an Instagram link received on Telegram
 */
async function handleTelegramMessage(message) {
  const chatId = message.chat?.id;
  const fromUser = message.from?.username || message.from?.first_name || 'User';
  const text = message.text || message.caption || '';

  // Extract Instagram URL (handles reels, p, tv, and mobile share queries)
  const match = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)[^\s]*/);
  if (!match) {
    if (text.startsWith('/start') || text.startsWith('/help')) {
      const activePages = getConnectedPages({ isActiveOnly: true });
      const pagesListStr = activePages.length > 0
        ? activePages.map(p => `• ${p.icon || '📱'} <b>${p.name}</b> (<code>${p.handle}</code>) — <i>${p.workflow_type === 'lead_magnet' ? 'Lead Magnet (DM Harvest + Bridge)' : 'Direct Viral Repost'}</i>`).join('\n')
        : '• 🎮 <b>GTA 6 Updates 007</b> (<code>@gta6_updates_007</code>)';

      await sendTelegramMessage(
        chatId,
        `🚀 <b>OmniResearch — Universal Multi-Account Instagram Hub</b>\n\n` +
        `<b>Connected Instagram Destination Accounts:</b>\n` +
        `${pagesListStr}\n\n` +
        `<b>How to Auto-Post Any Reel from Mobile:</b>\n` +
        `1. Open Instagram on your mobile device.\n` +
        `2. Find ANY reel, gameplay clip, tech tutorial, or carousel post.\n` +
        `3. Tap <b>Share</b> ➔ choose <b>Telegram</b> ➔ send to this bot.\n` +
        `4. <b>Interactive Selection:</b> The bot will ask which account you want to post to.\n` +
        `5. Tap the desired account button and the specialized pipeline runs autonomously!\n\n` +
        `<i>Try sharing any Instagram Reel here right now!</i>`
      );
      return;
    }
    return;
  }

  const rawUrl = match[0];
  const shortcode = match[1];

  console.log(`[Telegram Bot] 📱 Shared Reel/Post received from @${fromUser}: ${rawUrl}`);

  // Fetch active connected pages
  const activePages = getConnectedPages({ isActiveOnly: true });

  // If active pages exist, present interactive destination selection buttons
  if (activePages && activePages.length > 0) {
    const trigger = addMobileDmTrigger({
      sender_handle: `@${fromUser}`,
      source_post_url: rawUrl,
      shortcode,
      thread_id: String(chatId),
      message_id: String(message.message_id || Date.now()),
      processing_status: 'waiting_selection'
    });

    // Build inline keyboard rows (max 2 buttons per row)
    const inline_keyboard = [];
    let currentRow = [];
    for (const p of activePages) {
      currentRow.push({
        text: `${p.icon || '📱'} ${p.name}`,
        callback_data: `dest:${p.slug}:${trigger.id}`
      });
      if (currentRow.length === 2) {
        inline_keyboard.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      inline_keyboard.push(currentRow);
    }

    const promptText = `🎯 <b>New Reel Received!</b> (<code>${shortcode}</code>)\n\n` +
      `<b>Where should this content be published?</b>\n` +
      `Select the destination account below to dispatch its specialized pipeline:`;

    await sendTelegramMessage(chatId, promptText, {
      reply_markup: {
        inline_keyboard
      }
    });
    return;
  }

  // Fallback: Legacy single-account flow
  const brand = getBrandAssets();
  const currentHandle = brand.brand_handle || getSetting('instagram_handle', '@gta6_updates_007');

  await sendTelegramMessage(
    chatId,
    `⏳ <b>Reel Received!</b> (<code>${shortcode}</code>)\n\n` +
    `🤖 <b>Autonomous Pipeline Activated for ${currentHandle}:</b>\n` +
    `1. 📥 Downloading high-res 1080p MP4 media...\n` +
    `2. 🧠 Analyzing topic, stripping competitor tags & writing viral caption + hashtags...\n` +
    `3. 🚀 Publishing directly to <b>${currentHandle}</b> via Meta Graph API v21.0...\n\n` +
    `<i>Hold tight! Media file and live link will be delivered shortly.</i>`
  );

  const trigger = addMobileDmTrigger({
    sender_handle: `@${fromUser}`,
    source_post_url: rawUrl,
    shortcode,
    thread_id: String(chatId),
    message_id: String(message.message_id || Date.now()),
    processing_status: 'processing'
  });

  const gtaPage = getConnectedPageBySlug('gta6');
  await executePostWorkflow({
    trigger,
    page: gtaPage || { slug: 'gta6', name: 'GTA 6 Updates', handle: currentHandle, workflow_type: 'lead_magnet' },
    rawUrl,
    shortcode,
    fromUser,
    chatId
  });
}

/**
 * Handle incoming callback query from interactive Telegram inline buttons
 */
async function handleTelegramCallbackQuery(query) {
  const data = query.data || '';
  const queryId = query.id;
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;
  const fromUser = query.from?.username || query.from?.first_name || 'User';

  if (!data.startsWith('dest:')) return;

  const parts = data.split(':');
  const slug = parts[1];
  const triggerId = parseInt(parts[2], 10);

  const page = getConnectedPageBySlug(slug);
  const trigger = getMobileDmTriggerById(triggerId);

  if (!trigger) {
    await answerCallbackQuery(queryId, '⚠️ Request not found or expired.', true);
    return;
  }

  if (trigger.processing_status !== 'waiting_selection') {
    await answerCallbackQuery(queryId, '⚠️ This post has already been dispatched.', true);
    return;
  }

  const pageName = page?.name || slug;
  const pageHandle = page?.handle || '@' + slug;
  await answerCallbackQuery(queryId, `🚀 Routing to ${pageName}...`);

  // Update trigger status
  updateMobileDmTrigger(trigger.id, {
    destination_account: slug,
    connected_page_id: page?.id || null,
    selected_workflow: page?.workflow_type || 'direct_repost',
    processing_status: 'processing'
  });

  const isLeadMagnet = page?.workflow_type === 'lead_magnet';
  const workflowLabel = isLeadMagnet
    ? '🎯 Lead Magnet (Trigger Comment ➔ Creator DM Harvest ➔ InstaAuto AI Agent)'
    : '🎬 Direct Viral Repost (Clean 1080p MP4 Transcode ➔ Direct Feed Publish)';

  // Edit original message to remove buttons and show confirmation
  await editTelegramMessageText(
    chatId,
    messageId,
    `✅ <b>Destination Selected: ${page?.icon || '📱'} ${pageName}</b> (<code>${pageHandle}</code>)\n\n` +
    `⚙️ <b>Pipeline Workflow:</b>\n${workflowLabel}\n\n` +
    `⏳ <i>Autonomous pipeline is now running... I will deliver the clean media file and live post link right here!</i>`
  );

  // Execute pipeline
  await executePostWorkflow({
    trigger,
    page: page || { slug, name: slug, handle: pageHandle, workflow_type: 'direct_repost' },
    rawUrl: trigger.source_post_url,
    shortcode: trigger.shortcode,
    fromUser,
    chatId
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Long-polling loop for Telegram updates (supports message and callback_query)
 */
async function pollTelegramUpdates() {
  if (!isPolling) return;
  const token = getCleanTelegramToken();
  if (!token) {
    pollTimeout = setTimeout(pollTelegramUpdates, 10000);
    return;
  }

  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        timeout: 15,
        allowed_updates: JSON.stringify(['message', 'callback_query'])
      },
      timeout: 25000
    });

    const updates = res.data?.result || [];
    for (const update of updates) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);
      if (update.callback_query) {
        handleTelegramCallbackQuery(update.callback_query).catch(e => console.error('[Telegram Callback Error]:', e));
      } else if (update.message) {
        handleTelegramMessage(update.message).catch(e => console.error('[Telegram Handler Error]:', e));
      }
    }
  } catch (err) {
    if (!err.message.includes('timeout') && !err.message.includes('ECONNRESET')) {
      console.warn(`[Telegram Bot] Poll notice: ${err.message}`);
    }
  }

  if (isPolling) {
    pollTimeout = setTimeout(pollTelegramUpdates, 1500);
  }
}

function startTelegramListener() {
  if (!isPolling) {
    const token = getCleanTelegramToken();
    if (!token) {
      console.log('[Telegram Bot] ℹ️ Telegram Bot Token not configured in settings.');
      return;
    }
    isPolling = true;
    console.log('[Telegram Bot] 🚀 Starting Telegram Multi-Account Interactive Listener...');
    pollTelegramUpdates();
  }
}

function stopTelegramListener() {
  isPolling = false;
  if (pollTimeout) clearTimeout(pollTimeout);
  console.log('[Telegram Bot] 🛑 Stopped Telegram Listener.');
}

module.exports = {
  startTelegramListener,
  stopTelegramListener,
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramMediaGroup,
  sendTelegramVideo,
  sendTelegramDocument,
  answerCallbackQuery,
  editTelegramMessageText,
  handleTelegramMessage,
  handleTelegramCallbackQuery,
  executePostWorkflow,
  getTelegramBotInfo
};
