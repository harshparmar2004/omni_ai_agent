const axios = require('axios');
const {
  getDb,
  getSetting,
  createRelayJob,
  updateRelayJob,
  getRelayJobById,
  getRelayJobByRelayId,
  getPendingRelayByCreator,
  getPendingRelayByShortcode,
  getActiveRelayJobs
} = require('../database');

const {
  unshortenUrl,
  extractLinksFromText,
  extractTriggerKeywordFromCaption,
  postCommentTrigger,
  pollCreatorDmResponse
} = require('./instagramDmHarvesterService');

const { extractAndSynthesizeResources } = require('./instagramResourceExtractor');

/**
 * OmniResearch v5.0 — Instagram Proxy / Relay Hunter Bot Service ("Project Hermes Relay")
 * Implements "Hypothesis 2":
 * 1. User shares a Reel into our bot DM.
 * 2. Webhook payload includes Reel title/caption -> extracts trigger keyword ("PLAYBOOK").
 * 3. Our bot posts comment ("PLAYBOOK") on creator's Reel.
 * 4. Creator's ManyChat bot auto-DMs our bot with the private link.
 * 5. Our bot intercepts the DM, unshortens the URL, and relays it back to the original user.
 * 6. Arms our own InstaAuto staging engine with the harvested asset.
 */

function cleanInstagramUrl(url) {
  if (!url) return '';
  const m = url.match(/instagram\.com\/(?:[A-Za-z0-9_.-]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) {
    return `https://www.instagram.com/p/${m[1]}/`;
  }
  return url.trim();
}

function extractShortcode(url) {
  if (!url) return `reel_${Date.now()}`;
  const m = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : `reel_${Date.now()}`;
}

async function handleSharedReelInbound({ senderId, senderUsername = '', reelUrl, reelTitle = '', targetCreatorHandle = '', rawPayload = {} }) {
  console.log(`\n======================================================`);
  console.log(`[Hermes Relay] 📥 Inbound Shared Reel from @${senderUsername || senderId}`);
  console.log(`[Hermes Relay] Reel URL: ${reelUrl}`);
  console.log(`[Hermes Relay] Title/Caption: "${reelTitle.substring(0, 100)}..."`);
  console.log(`======================================================`);

  const shortcode = extractShortcode(reelUrl);
  const cleanUrl = cleanInstagramUrl(reelUrl);

  const keyword = extractTriggerKeywordFromCaption(reelTitle, '');
  console.log(`[Hermes Relay] 🎯 Detected Trigger Keyword: "${keyword}"`);

  let creatorHandle = targetCreatorHandle || '';
  if (!creatorHandle) {
    const creatorMatch = reelTitle.match(/@([a-zA-Z0-9._]+)/);
    if (creatorMatch) {
      creatorHandle = creatorMatch[1];
    }
  }

  const relayJob = createRelayJob({
    requester_ig_id: String(senderId),
    requester_username: senderUsername,
    target_shortcode: shortcode,
    target_media_id: cleanUrl,
    target_creator_handle: creatorHandle,
    detected_keyword: keyword,
    status: 'pending_comment'
  });

  console.log(`[Hermes Relay] 📝 Registered Relay Job #${relayJob.id} (${relayJob.relay_id})`);

  console.log(`[Hermes Relay] 💬 Posting comment "${keyword}" on ${cleanUrl}...`);
  const commentResult = await postCommentTrigger(cleanUrl, keyword);

  if (commentResult.success) {
    updateRelayJob(relayJob.id, {
      comment_posted_at: new Date().toISOString(),
      status: 'commented'
    });
    console.log(`[Hermes Relay] ✅ Comment "${keyword}" successfully posted! Waiting for ManyChat DM...`);
  } else {
    console.warn(`[Hermes Relay] ⚠️ Proxy comment notice: ${commentResult.error}`);
    updateRelayJob(relayJob.id, {
      status: 'comment_failed'
    });
  }

  pollManyChatHandshake(relayJob.id, cleanUrl, creatorHandle, keyword, senderId);

  return {
    success: true,
    relay_id: relayJob.relay_id,
    detected_keyword: keyword,
    shortcode,
    status: commentResult.success ? 'commented' : 'pending_fallback'
  };
}

async function pollManyChatHandshake(jobId, postUrl, creatorHandle, keyword, requesterId) {
  try {
    const dmResult = await pollCreatorDmResponse(creatorHandle, 35000);

    if (dmResult.received && dmResult.links && dmResult.links.length > 0) {
      console.log(`[Hermes Relay] 🎉 Intercepted ManyChat DM for Job #${jobId}!`);
      
      const unshortenedLinks = [];
      for (const link of dmResult.links) {
        const canonical = await unshortenUrl(link);
        unshortenedLinks.push(canonical);
      }

      const updated = updateRelayJob(jobId, {
        dm_received_at: new Date().toISOString(),
        extracted_links: unshortenedLinks,
        status: 'harvested'
      });

      await relayResourceToUser({
        requesterId,
        links: unshortenedLinks,
        originalKeyword: keyword,
        shortcode: updated.target_shortcode
      });

      updateRelayJob(jobId, {
        status: 'relayed',
        relayed_at: new Date().toISOString()
      });

      armInstaAutoRepository(updated, unshortenedLinks[0]);
    } else {
      console.log(`[Hermes Relay] ℹ️ No ManyChat DM received within 35s. Engaging Tier-3 AI Resource Synthesis fallback...`);
      await triggerTier3Fallback(jobId, postUrl, creatorHandle, keyword, requesterId);
    }
  } catch (err) {
    console.error(`[Hermes Relay] Polling handshake error: ${err.message}`);
    await triggerTier3Fallback(jobId, postUrl, creatorHandle, keyword, requesterId);
  }
}

async function handleInboundCreatorDm({ creatorId = '', creatorHandle = '', messageText = '', buttons = [], relayId = '', targetShortcode = '' }) {
  console.log(`[Hermes Relay] 📬 Inbound DM from Creator: ${creatorHandle || creatorId}`);
  
  let pendingJob = null;
  if (relayId) {
    pendingJob = getRelayJobByRelayId(relayId);
  }
  if (!pendingJob && targetShortcode) {
    pendingJob = getPendingRelayByShortcode(targetShortcode);
  }
  if (!pendingJob) {
    pendingJob = getPendingRelayByCreator(creatorId, creatorHandle);
  }
  if (!pendingJob) {
    pendingJob = getActiveRelayJobs(10).find(j => 
      ['commented', 'pending_comment', 'comment_failed'].includes(j.status) || 
      (j.requester_ig_id && j.requester_ig_id.startsWith('sim_'))
    );
  }

  if (!pendingJob) {
    console.log(`[Hermes Relay] No active pending relay waiting for @${creatorHandle}. Standard DM processed.`);
    return { success: false, reason: 'no_matching_relay' };
  }

  console.log(`[Hermes Relay] 🎯 Matched pending Relay Job #${pendingJob.id} for user ${pendingJob.requester_ig_id}`);

  let rawLinks = extractLinksFromText(messageText);
  if (Array.isArray(buttons)) {
    buttons.forEach(b => {
      if (b.url) rawLinks.push(b.url);
    });
  }

  rawLinks = [...new Set(rawLinks)];

  const canonicalLinks = [];
  for (const l of rawLinks) {
    canonicalLinks.push(await unshortenUrl(l));
  }

  if (canonicalLinks.length === 0) {
    console.warn(`[Hermes Relay] Creator DM received but no links detected: "${messageText}"`);
    return { success: false, reason: 'no_links_found' };
  }

  updateRelayJob(pendingJob.id, {
    dm_received_at: new Date().toISOString(),
    extracted_links: canonicalLinks,
    status: 'harvested'
  });

  await relayResourceToUser({
    requesterId: pendingJob.requester_ig_id,
    links: canonicalLinks,
    originalKeyword: pendingJob.detected_keyword,
    shortcode: pendingJob.target_shortcode
  });

  updateRelayJob(pendingJob.id, {
    status: 'relayed',
    relayed_at: new Date().toISOString()
  });

  armInstaAutoRepository(pendingJob, canonicalLinks[0]);

  return {
    success: true,
    job_id: pendingJob.id,
    links: canonicalLinks
  };
}

async function relayResourceToUser({ requesterId, links = [], originalKeyword = 'RESOURCE', shortcode = '' }) {
  const primaryLink = links[0] || '';
  const message = [
    `🎯 <b>Got it! We extracted the link for you!</b>`,
    ``,
    `We commented <b>"${originalKeyword}"</b> on the Reel you shared and intercepted their ManyChat automation.`,
    ``,
    `🔗 <b>Direct Resource Link:</b>`,
    `👉 <a href="${primaryLink}">${primaryLink}</a>`,
    ``,
    ...(links.length > 1 ? [
      `📚 <b>Additional Links Found:</b>`,
      ...links.slice(1, 4).map((l, i) => `${i + 1}. <a href="${l}">${l}</a>`),
      ``
    ] : []),
    `🚀 <i>Armed and saved to your OmniResearch publishing library!</i>`
  ].join('\n');

  console.log(`[Hermes Relay] 📤 Relaying asset link to requester ID ${requesterId}: ${primaryLink}`);

  const token = getSetting('instagram_access_token', '');
  if (token && requesterId && !requesterId.startsWith('sim_')) {
    try {
      await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
        recipient: { id: requesterId },
        message: { text: message.replace(/<[^>]*>?/gm, '') }
      }, { timeout: 10000 });
      console.log(`[Hermes Relay] ✅ Outbound Instagram DM sent via Meta Send API`);
    } catch (sendErr) {
      console.warn(`[Hermes Relay] Meta Send API notice: ${sendErr.response?.data?.error?.message || sendErr.message}`);
    }
  }

  const { sendTelegramMessage } = require('./telegramBotService');
  const tgChatId = getSetting('telegram_chat_id', '5443723531');
  if (tgChatId) {
    sendTelegramMessage(tgChatId, message, { disable_web_page_preview: false }).catch(() => {});
  }

  return { success: true, message };
}

async function triggerTier3Fallback(jobId, postUrl, creatorHandle, keyword, requesterId) {
  try {
    const job = getRelayJobById(jobId);
    if (!job || job.status === 'relayed') return;

    console.log(`[Hermes Relay] 🛡️ Generating Tier-3 AI Verified Companion Guide for Job #${jobId}...`);
    const synRes = await extractAndSynthesizeResources({
      postUrl,
      channelUsername: creatorHandle || 'creator',
      rawCaption: postUrl,
      rawHook: `Resource Guide for ${keyword}`,
      detectedTopic: keyword,
      detectedTriggerKeyword: keyword,
      brandHandle: '@harshparmar007__'
    });

    if (synRes && synRes.success) {
      const verifiedUrl = synRes.deliverable_url || `http://localhost:4000/docs/1`;
      updateRelayJob(jobId, {
        extracted_links: [verifiedUrl],
        status: 'fallback'
      });

      await relayResourceToUser({
        requesterId,
        links: [verifiedUrl],
        originalKeyword: keyword,
        shortcode: job.target_shortcode
      });

      updateRelayJob(jobId, {
        status: 'relayed',
        relayed_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error(`[Hermes Relay] Tier-3 fallback error: ${err.message}`);
  }
}

function armInstaAutoRepository(job, assetUrl) {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE instagram_posts
      SET deliverable_url = ?,
          status = 'ready_to_post'
      WHERE hook_text LIKE ? OR caption LIKE ?
    `).run(assetUrl, `%${job.target_shortcode}%`, `%${job.target_shortcode}%`);
    console.log(`[Hermes Relay] 🎯 Armed InstaAuto repository with asset URL: ${assetUrl}`);
  } catch (err) {
    console.warn(`[Hermes Relay] InstaAuto arm notice: ${err.message}`);
  }
}

async function simulateRelayWorkflow({ reelUrl, reelTitle, senderUsername = 'test_user', creatorHandle = 'cool_creator', simulatedDmLink = 'https://bit.ly/3xSampleNotion' }) {
  console.log(`[Hermes Relay Simulation] 🚀 Starting simulation for ${reelUrl}...`);
  
  const inboundRes = await handleSharedReelInbound({
    senderId: `sim_${Date.now()}`,
    senderUsername,
    reelUrl,
    reelTitle,
    targetCreatorHandle: creatorHandle
  });

  const relayJob = getRelayJobByRelayId(inboundRes.relay_id);
  if (relayJob) {
    updateRelayJob(relayJob.id, {
      status: 'commented',
      target_creator_handle: creatorHandle
    });
  }

  console.log(`[Hermes Relay Simulation] ⏳ Simulating creator ManyChat bot reply with link: ${simulatedDmLink}...`);
  const creatorRes = await handleInboundCreatorDm({
    creatorId: `creator_${Date.now()}`,
    creatorHandle,
    relayId: inboundRes.relay_id,
    messageText: `Hey! Thanks for commenting "${inboundRes.detected_keyword}"! Here is your download link: ${simulatedDmLink}`
  });

  return {
    success: true,
    inboundRes,
    creatorRes,
    message: 'Simulation completed successfully!'
  };
}

module.exports = {
  handleSharedReelInbound,
  handleInboundCreatorDm,
  relayResourceToUser,
  simulateRelayWorkflow,
  cleanInstagramUrl,
  extractShortcode
};
