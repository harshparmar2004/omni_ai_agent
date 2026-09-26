const axios = require('axios');
const {
  getBrandAssets,
  addMobileDmTrigger,
  updateMobileDmTrigger,
  getMobileDmTriggers,
  getMobileDmTriggerByShortcode
} = require('../database');
const { processSinglePost } = require('./instagramAutonomousOrchestrator');

/**
 * OmniResearch v4.0 — Mobile-First "Share-to-DM" Autonomous Instagram Bot
 * Listens for incoming Reels/Carousels shared via Instagram Direct Message,
 * authenticates the owner (@harshparmar007__), runs the full agentic pipeline,
 * and replies back with live links and scorecards.
 */

const MICROSERVICE_URL = 'http://localhost:8001';
let isPollingActive = false;
let pollingInterval = null;

/**
 * Sends an outbound Instagram DM to a user or thread
 */
async function sendDirectMessage(text, recipientUsername = null, threadId = null) {
  try {
    const res = await axios.post(`${MICROSERVICE_URL}/direct/send`, {
      recipient_username: recipientUsername,
      thread_id: threadId,
      text
    }, { timeout: 10000 });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    console.warn(`[Mobile DM Bot] DM send skipped: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Process a shared post URL from mobile DM
 */
async function handleInboundShare({ url, shortcode, senderHandle, threadId, messageId }) {
  const brand = getBrandAssets();
  const ownerHandle = (brand.brand_handle || 'harshparmar007__').replace(/^@+/, '').toLowerCase();
  const cleanSender = (senderHandle || ownerHandle).replace(/^@+/, '').toLowerCase();

  console.log(`[Mobile DM Bot] 📱 Inbound Share Detected from @${cleanSender}: ${url}`);

  // Check if already processed
  const existing = getMobileDmTriggerByShortcode(shortcode);
  let trigger;
  if (existing && existing.processing_status === 'published') {
    console.log(`[Mobile DM Bot] Shortcode ${shortcode} already published.`);
    return existing;
  } else if (existing) {
    console.log(`[Mobile DM Bot] Retrying processing for shortcode ${shortcode}...`);
    trigger = updateMobileDmTrigger(existing.id, {
      processing_status: 'processing',
      error_message: ''
    });
  } else {
    // Record initial trigger
    trigger = addMobileDmTrigger({
      sender_handle: `@${cleanSender}`,
      source_post_url: url,
      shortcode,
      thread_id: threadId || '',
      message_id: messageId || '',
      processing_status: 'processing'
    });
  }

  // 1. Instant Acknowledgement DM
  await sendDirectMessage(
    `🤖 OmniResearch AI Agent\n\nReel received! Running LLM Ranking, Brand Cleanser, and Lead Magnet extraction... ⏳`,
    senderHandle,
    threadId
  );

  // 2. Execute Full Agentic Pipeline
  try {
    const procResult = await processSinglePost(url, senderHandle, null, {
      autoPublish: true,
      forceApprove: true
    });
    const log = procResult.log || {};
    const isApproved = log.llm_decision === 'APPROVED';

    if (isApproved) {
      const liveLink = procResult.publishResult?.permalink || log.ig_permalink || `https://www.instagram.com/p/${shortcode}/`;
      
      trigger = updateMobileDmTrigger(trigger.id, {
        processing_status: 'published',
        live_post_permalink: liveLink,
        completed_at: new Date().toISOString()
      });

      // 3. Success Notification DM
      const currentHandle = brand.brand_handle || getSetting('instagram_handle', '@gta6_updates_007');
      const successMessage = [
        `🤖 OmniResearch AI Agent`,
        ``,
        `✅ Successfully Published Live!`,
        `⭐ Quality Score: ${log.llm_fit_score || 95}/100 (APPROVED)`,
        `🎬 Target Account: ${currentHandle}`,
        `🎯 Trigger Keyword: ${log.detected_trigger_keyword || 'None (Direct Repost)'}`,
        `🎵 Audio Paired: ${log.selected_song_title || 'Viral Audio'}`,
        ``,
        `🚀 Live on Instagram:`,
        `👉 ${liveLink}`
      ].join('\n');

      await sendDirectMessage(successMessage, senderHandle, threadId);
    } else {
      trigger = updateMobileDmTrigger(trigger.id, {
        processing_status: 'rejected',
        error_message: log.llm_reasoning || 'Rejected by quality threshold',
        completed_at: new Date().toISOString()
      });

      // Low Quality Rejection DM
      const rejectMessage = [
        `🤖 OmniResearch AI Agent`,
        ``,
        `⚠️ Post Filtered (Score: ${log.llm_fit_score || 50}/100 - REJECTED)`,
        `Reason: ${log.llm_reasoning || 'Low technical depth'}`,
        `Action: Archived in dashboard. Did not publish to feed.`
      ].join('\n');

      await sendDirectMessage(rejectMessage, senderHandle, threadId);
    }

    return trigger;
  } catch (err) {
    console.error(`[Mobile DM Bot] Processing error: ${err.message}`);
    updateMobileDmTrigger(trigger.id, {
      processing_status: 'error',
      error_message: err.message,
      completed_at: new Date().toISOString()
    });

    await sendDirectMessage(
      `⚠️ OmniResearch Agent Notice: Failed to process Reel: ${err.message}`,
      senderHandle,
      threadId
    );
    throw err;
  }
}

/**
 * Check inbox for newly shared reels/posts
 */
async function pollInboxShares() {
  try {
    const res = await axios.get(`${MICROSERVICE_URL}/direct/inbox_shares?amount=10`, { timeout: 10000 });
    const shares = res.data?.shares || [];

    const brand = getBrandAssets();
    const ownerHandle = (brand.brand_handle || '@harshparmar007__').replace('@', '').toLowerCase();

    for (const share of shares) {
      const sender = (share.users && share.users[0]) ? share.users[0] : ownerHandle;
      // Process if sender is owner
      if (sender.toLowerCase() === ownerHandle || share.users?.some(u => u.toLowerCase() === ownerHandle)) {
        await handleInboundShare({
          url: share.url,
          shortcode: share.shortcode || `post_${Date.now()}`,
          senderHandle: sender,
          threadId: share.thread_id,
          messageId: share.message_id
        });
      }
    }
  } catch (err) {
    // If microservice not authenticated, log once and keep polling
    if (!err.message.includes('401')) {
      console.warn(`[Mobile DM Bot] Poll check: ${err.message}`);
    }
  }
}

/**
 * Start the continuous background polling loop
 */
function startMobileDmListener(intervalMs = 12000) {
  if (isPollingActive) return;
  isPollingActive = true;
  console.log(`[Mobile DM Bot] 🚀 Starting Mobile "Share-to-DM" Inbound Listener (polling every ${intervalMs/1000}s)...`);

  // First poll after 5s
  setTimeout(pollInboxShares, 5000);

  pollingInterval = setInterval(pollInboxShares, intervalMs);
}

function stopMobileDmListener() {
  if (pollingInterval) clearInterval(pollingInterval);
  isPollingActive = false;
  console.log('[Mobile DM Bot] 🛑 Stopped Mobile DM Inbound Listener.');
}

/**
 * Simulator for testing Share-to-DM triggers on-demand without mobile phone
 */
async function simulateMobileDmTrigger(postUrl, customSender = null) {
  const brand = getBrandAssets();
  const sender = customSender || brand.brand_handle || '@harshparmar007__';
  const m = postUrl.match(/instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = m ? m[1] : `sim_${Date.now()}`;

  return await handleInboundShare({
    url: postUrl,
    shortcode,
    senderHandle: sender,
    threadId: 'simulated_thread',
    messageId: `sim_${Date.now()}`
  });
}

module.exports = {
  startMobileDmListener,
  stopMobileDmListener,
  pollInboxShares,
  handleInboundShare,
  simulateMobileDmTrigger,
  sendDirectMessage
};
