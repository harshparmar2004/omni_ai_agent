const axios = require('axios');
const path = require('path');
const {
  getDb,
  getActiveScout,
  incrementScoutUsage,
  createScoutHarvestJob,
  getScoutHarvestJobById,
  getScoutHarvestJobByShortcode,
  updateScoutHarvestJob,
  appendScoutHarvestTrace,
  updateAutonomousLog,
  getAutonomousLogByShortcode
} = require('../database');
const { scrapeCreatorBioLink } = require('./instagramResourceExtractor');

const MICROSERVICE_URL = 'http://127.0.0.1:8001';

/**
 * OmniResearch v6.0 — Autonomous Scout Harvest Job State Machine
 * 
 * Executes full asynchronous link hunt:
 * 1. Resolves creator identity (numeric PK + username)
 * 2. Snapshots baseline timestamp
 * 3. Auto-follows creator if needed
 * 4. Posts trigger keyword comment with humanized jitter
 * 5. Actively listens to BOTH Primary Inbox & Message Requests (Pending Inbox)
 * 6. Handles ManyChat conversational questions & link cards
 * 7. Unshortens and sanitizes deliverable URL
 * 8. Deletes Scout's comment on completion
 * 9. Updates staged post & notifies Telegram with exact real link
 */

/**
 * Unshorten URLs to find true destination
 */
async function unshortenUrl(shortUrl, maxRedirects = 5) {
  if (!shortUrl) return shortUrl;
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects,
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      validateStatus: status => status >= 200 && status < 400
    });
    return res.request?.res?.responseUrl || res.config?.url || shortUrl;
  } catch (err) {
    try {
      let currentUrl = shortUrl;
      for (let i = 0; i < maxRedirects; i++) {
        const headRes = await axios.head(currentUrl, {
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400,
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (headRes.headers && headRes.headers.location) {
          currentUrl = new URL(headRes.headers.location, currentUrl).href;
        } else {
          break;
        }
      }
      return currentUrl;
    } catch (headErr) {
      return shortUrl;
    }
  }
}

/**
 * Filter out Instagram internal URLs and keep real external destinations
 */
function cleanExtractedLinks(urls = []) {
  const clean = [];
  for (const u of urls) {
    if (!u) continue;
    const low = u.toLowerCase();
    if (low.includes('instagram.com') || low.includes('facebook.com') || low.includes('ig.me')) {
      continue;
    }
    clean.push(u);
  }
  return [...new Set(clean)];
}

/**
 * Dispatch an autonomous harvest job in the background (non-blocking)
 */
async function dispatchScoutHarvestJob(options = {}) {
  const {
    shortcode = '',
    sourcePostUrl = '',
    creatorUsername = '',
    creatorPk = '',
    triggerKeyword = '',
    postId = null,
    telegramChatId = null
  } = options;

  console.log(`\n======================================================`);
  console.log(`[Harvest Job] 🚀 Dispatching Autonomous Scout Job for ${shortcode}`);
  console.log(`[Harvest Job] Creator: @${creatorUsername || 'unknown'} (PK: ${creatorPk || 'unresolved'}) | Keyword: "${triggerKeyword}"`);
  console.log(`======================================================`);

  const job = createScoutHarvestJob({
    shortcode,
    source_post_url: sourcePostUrl,
    creator_username: creatorUsername,
    creator_pk: creatorPk,
    trigger_keyword: triggerKeyword,
    status: 'pending',
    harvest_stage: 'dispatched',
    post_id: postId,
    telegram_chat_id: telegramChatId,
    trace_log: [{
      time: new Date().toISOString(),
      event: 'job_dispatched',
      details: { shortcode, creatorUsername, triggerKeyword }
    }]
  });

  // Launch execution asynchronously without awaiting
  runHarvestExecution(job.id).catch(err => {
    console.error(`[Harvest Job] Unhandled error in job #${job.id}:`, err);
  });

  return job;
}

/**
 * Executes the full background state machine for a harvest job
 */
async function runHarvestExecution(jobId) {
  let job = getScoutHarvestJobById(jobId);
  if (!job) return;

  const db = getDb();
  const shortcode = job.shortcode;
  const sourcePostUrl = job.source_post_url;
  let creatorUsername = job.creator_username || '';
  let creatorPk = job.creator_pk || '';
  let triggerKeyword = job.trigger_keyword || '';
  const telegramChatId = job.telegram_chat_id;

  try {
    // ── STAGE 1: Creator Resolution & Baseline Timestamp ────────────────────
    appendScoutHarvestTrace(jobId, 'resolving_creator', { shortcode, sourcePostUrl });
    updateScoutHarvestJob(jobId, { status: 'resolving', harvest_stage: 'resolving_creator' });

    if (!creatorPk || !creatorUsername || creatorUsername === 'instagram' || creatorUsername.includes('#1')) {
      try {
        const ownerRes = await axios.get(`${MICROSERVICE_URL}/media/owner`, {
          params: { url: sourcePostUrl },
          timeout: 15000
        });
        if (ownerRes.data && ownerRes.data.success) {
          creatorUsername = ownerRes.data.owner_username || creatorUsername;
          creatorPk = ownerRes.data.owner_pk || creatorPk;
          updateScoutHarvestJob(jobId, {
            creator_username: creatorUsername,
            creator_pk: creatorPk
          });
          appendScoutHarvestTrace(jobId, 'creator_resolved', {
            creator_username: creatorUsername,
            creator_pk: creatorPk
          });
        }
      } catch (ownerErr) {
        console.warn(`[Harvest Job] /media/owner notice: ${ownerErr.message}`);
      }
    }

    // Capture baseline timestamp (epoch seconds) before commenting
    const sinceTs = Math.floor(Date.now() / 1000) - 2;

    // Check active scout account
    const scout = getActiveScout();
    if (!scout) {
      throw new Error('No active Scout account configured in database.');
    }
    updateScoutHarvestJob(jobId, { scout_username: scout.username });

    // ── STAGE 2: Auto-Follow Creator (Satisfies Follow-Gated ManyChat Bots) ──
    if (creatorPk || creatorUsername) {
      try {
        appendScoutHarvestTrace(jobId, 'following_creator', { creatorPk, creatorUsername });
        await axios.post(`${MICROSERVICE_URL}/user/follow`, {
          user_pk: creatorPk || null,
          username: creatorUsername || null
        }, { timeout: 10000 });
        appendScoutHarvestTrace(jobId, 'followed_creator_success');
      } catch (followErr) {
        appendScoutHarvestTrace(jobId, 'follow_creator_notice', { error: followErr.message });
      }
    }

    // ── STAGE 3: Comment Keyword on Creator's Reel ──────────────────────────
    if (triggerKeyword) {
      const jitterMs = Math.floor(Math.random() * 2500) + 3000;
      console.log(`[Harvest Job] ⏳ Humanized pause (${(jitterMs / 1000).toFixed(1)}s) before commenting as @${scout.username}...`);
      await new Promise(r => setTimeout(r, jitterMs));

      appendScoutHarvestTrace(jobId, 'posting_comment', {
        triggerKeyword,
        scoutUsername: scout.username
      });
      updateScoutHarvestJob(jobId, { harvest_stage: 'posting_comment' });

      let commentPk = '';
      let mediaPk = '';

      try {
        const commentRes = await axios.post(`${MICROSERVICE_URL}/media/comment`, {
          media_url: sourcePostUrl,
          text: triggerKeyword.trim()
        }, { timeout: 18000 });

        if (commentRes.data && commentRes.data.success) {
          commentPk = commentRes.data.comment_pk || '';
          mediaPk = commentRes.data.media_pk || '';
          incrementScoutUsage(scout.id);
          updateScoutHarvestJob(jobId, {
            comment_pk: commentPk,
            media_pk: mediaPk,
            status: 'commented',
            harvest_stage: 'comment_posted'
          });
          appendScoutHarvestTrace(jobId, 'comment_posted_success', { commentPk, mediaPk });
          console.log(`[Harvest Job] ✅ Scout commented "${triggerKeyword}" on ${shortcode}! (Comment PK: ${commentPk})`);
        } else {
          const errMsg = commentRes.data?.error || 'Unknown comment error';
          appendScoutHarvestTrace(jobId, 'comment_rejected', { error: errMsg });
          console.warn(`[Harvest Job] ⚠️ Scout comment rejected: ${errMsg}`);
        }
      } catch (cmtErr) {
        appendScoutHarvestTrace(jobId, 'comment_failed', { error: cmtErr.message });
        console.warn(`[Harvest Job] ⚠️ Comment dispatch error: ${cmtErr.message}`);
      }
    }

    // ── STAGE 4: Listen to Both Primary Inbox & Message Requests ────────────
    updateScoutHarvestJob(jobId, { status: 'listening', harvest_stage: 'listening_dms' });
    appendScoutHarvestTrace(jobId, 'listening_dms_started', {
      creatorUsername,
      creatorPk,
      sinceTs,
      timeoutSeconds: 240
    });

    const startTime = Date.now();
    const maxListenTimeMs = 240000; // 4 minutes
    let harvestedUrl = '';
    let rawDmText = '';
    let harvestedLinks = [];
    let botRepliesCount = 0;

    console.log(`[Harvest Job] 👂 Listening for inbound DM from @${creatorUsername || 'creator'} across Primary Inbox & Message Requests (up to 4m)...`);

    while (Date.now() - startTime < maxListenTimeMs) {
      try {
        let msgs = [];
        let threadId = null;
        let folder = 'inbox';

        const checkRes = await axios.get(`${MICROSERVICE_URL}/direct/creator_messages`, {
          params: {
            user_pk: creatorPk || null,
            username: creatorUsername || null,
            since_ts: sinceTs
          },
          timeout: 10000
        });

        if (checkRes.data && checkRes.data.found && Array.isArray(checkRes.data.messages) && checkRes.data.messages.length > 0) {
          msgs = checkRes.data.messages;
          threadId = checkRes.data.thread_id;
          folder = checkRes.data.folder;
        } else if (Date.now() - startTime > 12000) {
          // If no NEW message arrived after 12s, check if creator previously sent a message in this thread
          // (ManyChat often configures "trigger flow once per user", so re-triggers won't send duplicate DMs)
          try {
            const historyRes = await axios.get(`${MICROSERVICE_URL}/direct/creator_messages`, {
              params: {
                user_pk: creatorPk || null,
                username: creatorUsername || null,
                since_ts: 0
              },
              timeout: 10000
            });
            if (historyRes.data && historyRes.data.found && Array.isArray(historyRes.data.messages) && historyRes.data.messages.length > 0) {
              msgs = historyRes.data.messages;
              threadId = historyRes.data.thread_id;
              folder = historyRes.data.folder;
            }
          } catch (histErr) {}
        }

        if (msgs.length > 0) {
          // 1. Inspect all delivered messages for URLs
          for (const m of msgs) {
            const rawUrls = m.urls || [];
            const cleanUrls = cleanExtractedLinks(rawUrls);

            if (cleanUrls.length > 0) {
              const directUrl = cleanUrls[0];
              const unshortened = await unshortenUrl(directUrl);
              harvestedUrl = unshortened;
              rawDmText = m.text || directUrl;
              harvestedLinks = cleanUrls;
              appendScoutHarvestTrace(jobId, 'link_captured', {
                rawUrl: directUrl,
                canonicalUrl: unshortened,
                folder,
                threadId
              });
              console.log(`[Harvest Job] 🎯 Captured authentic deliverable URL: ${unshortened} (Folder: ${folder})`);
              break;
            }
          }

          if (harvestedUrl) {
            break; // Success! Break out of polling loop
          }

          // 2. If no link yet, inspect for bot interactive prompt
          if (botRepliesCount < 2 && msgs.length > 0) {
            const newest = msgs[0];
            const text = (newest.text || '').toLowerCase();
            const isInteractive = text.includes('link') || text.includes('find') || text.includes('which') || text.includes('help') || text.includes('story') || text.includes('reply') || text.includes('comment');

            if (isInteractive) {
              appendScoutHarvestTrace(jobId, 'interactive_prompt_detected', { text: newest.text });
              console.log(`[Harvest Job] 💬 Creator bot sent interactive prompt: "${newest.text.substring(0, 60)}...". Replying with "${triggerKeyword || 'link'}"...`);

              // If message is in pending requests folder, approve thread first
              if (folder === 'pending' && threadId) {
                try {
                  await axios.post(`${MICROSERVICE_URL}/direct/approve_request`, { thread_id: threadId }, { timeout: 8000 });
                } catch (appErr) {}
              }

              // Send reply
              try {
                await axios.post(`${MICROSERVICE_URL}/direct/send`, {
                  thread_id: threadId,
                  text: triggerKeyword || 'link'
                }, { timeout: 8000 });
                botRepliesCount++;
                updateScoutHarvestJob(jobId, { bot_replies_count: botRepliesCount });
                appendScoutHarvestTrace(jobId, 'bot_replied', { replyText: triggerKeyword || 'link', count: botRepliesCount });
              } catch (sendErr) {
                appendScoutHarvestTrace(jobId, 'bot_reply_error', { error: sendErr.message });
              }
            }
          }
        }
      } catch (pollErr) {
        // Continue polling until timeout
      }

      // Wait 6 seconds between polls
      await new Promise(r => setTimeout(r, 6000));
    }

    // ── STAGE 5: Cleanup & Fallbacks ────────────────────────────────────────
    job = getScoutHarvestJobById(jobId);

    // 1. Auto-delete Scout's comment to keep target creator's comment section clean
    if (job.comment_pk) {
      try {
        appendScoutHarvestTrace(jobId, 'deleting_scout_comment', { commentPk: job.comment_pk, mediaPk: job.media_pk });
        await axios.delete(`${MICROSERVICE_URL}/media/comment`, {
          data: {
            media_url: sourcePostUrl,
            media_pk: job.media_pk || null,
            comment_pk: job.comment_pk
          },
          timeout: 10000
        });
        appendScoutHarvestTrace(jobId, 'scout_comment_deleted');
        console.log(`[Harvest Job] 🧹 Scout comment ${job.comment_pk} cleaned up.`);
      } catch (delErr) {
        appendScoutHarvestTrace(jobId, 'comment_delete_notice', { error: delErr.message });
      }
    }

    // 2. Finalize harvest outcome
    const nowIso = new Date().toISOString();
    let finalStatus = 'failed';
    let finalMethod = 'none';

    if (harvestedUrl) {
      finalStatus = 'captured';
      finalMethod = 'scout_dm';
    } else {
      // Fallback: Check creator bio
      console.log(`[Harvest Job] ℹ️ No DM received in 4m. Checking creator @${creatorUsername} bio link...`);
      try {
        const bioLink = await scrapeCreatorBioLink(creatorUsername);
        if (bioLink) {
          const cleanBio = await unshortenUrl(bioLink);
          harvestedUrl = cleanBio;
          finalStatus = 'captured';
          finalMethod = 'creator_bio';
          appendScoutHarvestTrace(jobId, 'bio_link_captured', { bioLink: cleanBio });
        }
      } catch (bioErr) {}
    }

    if (!harvestedUrl) {
      finalStatus = 'no_reply';
      finalMethod = 'source_post';
      harvestedUrl = sourcePostUrl;
      appendScoutHarvestTrace(jobId, 'harvest_timeout_fallback', { fallbackUrl: sourcePostUrl });
    }

    // Update Scout Harvest Job row
    updateScoutHarvestJob(jobId, {
      status: finalStatus,
      harvest_stage: 'completed',
      harvest_method: finalMethod,
      harvested_url: harvestedUrl,
      raw_dm_text: rawDmText,
      extracted_links: harvestedLinks,
      completed_at: nowIso
    });

    // Update Staged Post in database
    if (job.post_id) {
      db.prepare(`UPDATE instagram_posts SET deliverable_url = ? WHERE id = ?`).run(harvestedUrl, job.post_id);
    }
    const log = getAutonomousLogByShortcode(shortcode);
    if (log) {
      updateAutonomousLog(log.id, {
        harvested_deliverable_url: harvestedUrl,
        dm_response_received: finalStatus === 'captured' ? 1 : 0
      });
    }

    // Arm InstaAuto on Port 3000 if deliverable is ready
    if (finalStatus === 'captured') {
      try {
        const { checkInstaAutoHealth, syncPostDeliverableToInstaAuto } = require('./bridgeService');
        const h = await checkInstaAutoHealth();
        if (h.online && job.post_id) {
          const postRow = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(job.post_id);
          if (postRow) {
            await syncPostDeliverableToInstaAuto(postRow);
            appendScoutHarvestTrace(jobId, 'instaauto_armed');
          }
        }
      } catch (bridgeErr) {}
    }

    // ── STAGE 6: Send Telegram Follow-Up Notification ───────────────────────
    if (telegramChatId) {
      const { sendTelegramMessage } = require('./telegramBotService');
      if (finalStatus === 'captured') {
        const msg = [
          `🎯 <b>Authentic Source Link Captured!</b> (<code>${shortcode}</code>)`,
          ``,
          `🔗 <b>Verified Link:</b>`,
          `👉 <a href="${harvestedUrl}">${harvestedUrl}</a>`,
          ``,
          `💬 <b>Comment-to-DM Trigger:</b> <code>${triggerKeyword || 'LINK'}</code>`,
          `⚡ <b>Harvest Method:</b> ${finalMethod === 'scout_dm' ? 'Inbound Creator DM (ManyChat)' : 'Creator Bio Hub'}`,
          `🤖 <b>InstaAuto Status:</b> 🟢 Staged & Armed for Commenters on Port 3000`,
          ``,
          `<i>Use <code>/trace ${shortcode}</code> anytime to view the complete background audit log!</i>`
        ].join('\n');
        await sendTelegramMessage(telegramChatId, msg, { disable_web_page_preview: false });
      } else {
        const msg = [
          `⚠️ <b>Scout Notice for Post</b> <code>${shortcode}</code>`,
          ``,
          `The creator's automated bot did not deliver a private DM link within 4 minutes.`,
          `🔗 <b>Defaulted Source:</b> <a href="${harvestedUrl}">${harvestedUrl}</a>`,
          ``,
          `<i>Type <code>/trace ${shortcode}</code> to inspect why the creator bot did not reply.</i>`
        ].join('\n');
        await sendTelegramMessage(telegramChatId, msg, { disable_web_page_preview: true });
      }
    }

    console.log(`[Harvest Job] 🏁 Job #${jobId} finalized: ${finalStatus} (${harvestedUrl})`);

  } catch (err) {
    console.error(`[Harvest Job] ❌ Job #${jobId} failed:`, err);
    updateScoutHarvestJob(jobId, {
      status: 'failed',
      harvest_stage: 'error',
      error_message: err.message,
      completed_at: new Date().toISOString()
    });
    appendScoutHarvestTrace(jobId, 'job_failed', { error: err.message });
  }
}

/**
 * Returns formatted trace log for a shortcode for Telegram /trace command
 */
function getHarvestJobTrace(shortcode) {
  const job = getScoutHarvestJobByShortcode(shortcode);
  if (!job) return null;
  return {
    id: job.id,
    shortcode: job.shortcode,
    status: job.status,
    creator_username: job.creator_username,
    creator_pk: job.creator_pk,
    trigger_keyword: job.trigger_keyword,
    harvest_method: job.harvest_method,
    harvested_url: job.harvested_url,
    started_at: job.started_at,
    completed_at: job.completed_at,
    traces: Array.isArray(job.trace_log) ? job.trace_log : []
  };
}

module.exports = {
  dispatchScoutHarvestJob,
  getScoutHarvestJobByShortcode,
  getHarvestJobTrace,
  unshortenUrl
};
