#!/usr/bin/env node

/**
 * OmniStudio — Telegram Mode Switcher & Webhook Controller
 * 
 * Usage:
 *   node scripts/telegram_switch.js status   -> Check current webhook and polling mode
 *   node scripts/telegram_switch.js local    -> Release webhook so bot runs locally via long-polling
 *   node scripts/telegram_switch.js cloud    -> Re-attach webhook to 24/7 Vercel serverless endpoint
 */

const axios = require('axios');
const path = require('path');
const { getSetting, setSetting } = require('../src/database');

const DEFAULT_WEBHOOK_URL = 'https://omni-ai-agent-tawny.vercel.app/api/telegram-webhook';
const FALLBACK_BOT_TOKEN = '8887232624:AAGI8q912YhGLF10wfPc1EtOTR1DFzkVEkI';

function getBotToken() {
  const t = (getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!t || t.length < 20 || t.includes('AAEiRpeqL8bGayHVREpp57eaFc_liOfyNUE')) {
    return FALLBACK_BOT_TOKEN;
  }
  return t;
}

async function checkStatus(token) {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`, { timeout: 10000 });
    const info = res.data?.result || {};
    console.log('======================================================');
    console.log('🤖 OmniStudio Telegram Bot Status');
    console.log('======================================================');
    if (info.url) {
      console.log(`🌐 Mode: CLOUD WEBHOOK (Serverless)`);
      console.log(`📍 Webhook URL: ${info.url}`);
      console.log(`⏳ Pending Updates: ${info.pending_update_count || 0}`);
      if (info.last_error_message) {
        console.log(`⚠️ Last Delivery Error: ${info.last_error_message}`);
        console.log(`⏱️ Error Date: ${info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString() : 'N/A'}`);
      }
    } else {
      console.log(`💻 Mode: LOCAL POLLING (Direct PC Execution)`);
      console.log(`📍 Webhook URL: None (Webhook is deleted)`);
      console.log(`⏳ Pending Updates: ${info.pending_update_count || 0}`);
      console.log(`✓ Ready for local processing: Start with "npm run bot:local" or "npm start".`);
    }
    console.log('======================================================\n');
    return info;
  } catch (err) {
    console.error('❌ Failed to retrieve Telegram webhook info:', err.response?.data || err.message);
  }
}

async function switchToLocal(token) {
  console.log('🔄 Switching Telegram bot to LOCAL POLLING mode...');
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      drop_pending_updates: false
    }, { timeout: 10000 });

    if (res.data?.ok) {
      setSetting('telegram_mode', 'local');
      console.log('✅ Webhook successfully deleted from Telegram servers!');
      console.log('💻 Local polling mode is now ACTIVE.');
      console.log('\nYou can now run:');
      console.log('   npm run bot:local');
      console.log('and send reels to Telegram. All downloads, AI generation, and FFmpeg rendering will run directly on your PC with zero GitHub token dependencies!\n');
    } else {
      console.warn('⚠️ Telegram response:', res.data);
    }
  } catch (err) {
    console.error('❌ Error releasing webhook:', err.response?.data || err.message);
  }
}

async function switchToCloud(token, customUrl = null) {
  const targetUrl = customUrl || process.env.VERCEL_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  console.log(`🔄 Switching Telegram bot to CLOUD WEBHOOK mode: ${targetUrl}...`);
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: targetUrl,
      allowed_updates: [
        'message',
        'callback_query',
        'edited_message'
      ]
    }, { timeout: 10000 });

    if (res.data?.ok) {
      setSetting('telegram_mode', 'cloud');
      console.log('✅ Webhook successfully registered with Telegram servers!');
      console.log(`🌐 Cloud webhook active at: ${targetUrl}`);
      console.log('\nMake sure GH_DISPATCH_TOKEN is configured in Vercel environment variables with repo and workflow permissions.\n');
    } else {
      console.warn('⚠️ Telegram response:', res.data);
    }
  } catch (err) {
    console.error('❌ Error registering webhook:', err.response?.data || err.message);
  }
}

async function main() {
  const command = (process.argv[2] || 'status').toLowerCase();
  const token = getBotToken();

  switch (command) {
    case 'local':
      await switchToLocal(token);
      await checkStatus(token);
      break;
    case 'cloud':
      const customUrl = process.argv[3];
      await switchToCloud(token, customUrl);
      await checkStatus(token);
      break;
    case 'status':
    default:
      await checkStatus(token);
      break;
  }
}

main().catch(console.error);
