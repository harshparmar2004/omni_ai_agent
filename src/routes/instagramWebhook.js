const express = require('express');
const router = express.Router();
const { getSetting, getActiveRelayJobs, getRelayJobById } = require('../database');
const {
  handleSharedReelInbound,
  handleInboundCreatorDm,
  simulateRelayWorkflow
} = require('../services/instagramRelayService');

/**
 * Meta Instagram Messenger Webhook & Hermes Relay Gateway
 * Endpoint: /api/instagram/webhook
 */

/**
 * GET /api/instagram/webhook
 * Meta Webhook Verification Challenge Handshake
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = getSetting('instagram_webhook_verify_token', '') || getSetting('meta_webhook_verify_token', '') || 'omni_relay_secret_token_2026';
  const validTokens = new Set([
    expectedToken,
    'omni_relay_secret_token_2026',
    'omni_dm_secret_token_2026'
  ]);

  if (mode === 'subscribe' && validTokens.has(token)) {
    console.log('[Hermes Webhook] ✅ Meta webhook challenge verified successfully!');
    return res.status(200).send(challenge);
  }

  console.warn(`[Hermes Webhook] ❌ Meta webhook verification failed: received "${token}"`);
  return res.sendStatus(403);
});

/**
 * POST /api/instagram/webhook
 * Inbound Meta Event Dispatcher: Shared Reels & ManyChat DMs
 */
router.post('/', async (req, res) => {
  const body = req.body;

  // Acknowledge Meta immediately to avoid retries
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'instagram' && body.object !== 'page') {
    return;
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const messagingEvents = entry.messaging || [];
    for (const event of messagingEvents) {
      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      const message = event.message;

      if (!message) continue;

      // ── CASE 1: Inbound Shared Reel (User shared a post to our bot) ────────
      const shareAttachment = message.attachments?.find(a => a.type === 'share');
      if (shareAttachment && shareAttachment.payload?.url) {
        const reelUrl = shareAttachment.payload.url;
        const reelTitle = shareAttachment.payload.title || message.text || '';
        
        console.log(`[Hermes Webhook] 📥 Received Shared Reel event from user ${senderId}`);
        handleSharedReelInbound({
          senderId,
          senderUsername: '',
          reelUrl,
          reelTitle,
          rawPayload: event
        }).catch(err => console.error('[Hermes Webhook] Shared reel error:', err));
        continue;
      }

      // ── CASE 2: Inbound ManyChat Creator DM (Creator bot sending asset link) ─
      if (message.text || message.quick_reply || message.attachments) {
        const text = message.text || '';
        const buttons = message.attachments?.[0]?.payload?.buttons || [];

        // Check if message contains URLs (ManyChat lead delivery)
        if (text.includes('http') || text.includes('drive.google') || text.includes('notion') || text.includes('bit.ly') || buttons.length > 0) {
          console.log(`[Hermes Webhook] 📬 Intercepted potential ManyChat creator response from ${senderId}`);
          handleInboundCreatorDm({
            creatorId: senderId,
            creatorHandle: '',
            messageText: text,
            buttons
          }).catch(err => console.error('[Hermes Webhook] Creator DM handling error:', err));
        }
      }
    }
  }
});

/**
 * GET /api/instagram/webhook/jobs
 * Active and completed relay jobs for dashboard monitor
 */
router.get('/jobs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const jobs = getActiveRelayJobs(limit);
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/instagram/webhook/simulate
 * Test the full proxy/relay lifecycle without needing live Instagram webhooks
 */
router.post('/simulate', async (req, res) => {
  try {
    const {
      reel_url,
      reel_title,
      sender_username,
      creator_handle,
      simulated_dm_link
    } = req.body || {};

    if (!reel_url) {
      return res.status(400).json({ success: false, error: 'reel_url is required' });
    }

    const result = await simulateRelayWorkflow({
      reelUrl: reel_url,
      reelTitle: reel_title || 'Comment "PLAYBOOK" for the complete guide',
      senderUsername: sender_username || 'harsh_tester',
      creatorHandle: creator_handle || 'top_creator',
      simulatedDmLink: simulated_dm_link || 'https://bit.ly/3xSampleResource'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
