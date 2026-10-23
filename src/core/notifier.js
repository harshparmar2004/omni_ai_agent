const EventEmitter = require('events');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { getSetting } = require('../database');

class NotifierService extends EventEmitter {
  constructor() {
    super();
    this.sseClients = new Set();
  }

  // ─────────────────────────────────────────────────────────────
  // Server-Sent Events (SSE) for Dashboard Live Updates
  // ─────────────────────────────────────────────────────────────

  addSseClient(res) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  removeSseClient(res) {
    this.sseClients.delete(res);
  }

  emitDashboardEvent(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
    for (const client of this.sseClients) {
      try {
        client.write(`event: ${eventType}\ndata: ${data}\n\n`);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
    this.emit(eventType, payload);
  }

  // ─────────────────────────────────────────────────────────────
  // Telegram Bot API Actions
  // ─────────────────────────────────────────────────────────────

  getTelegramToken() {
    return getSetting('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN;
  }

  async sendTelegramMessage(chatId, text, options = {}) {
    const token = this.getTelegramToken();
    if (!token || !chatId) return null;

    try {
      const res = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: options.parse_mode || 'HTML',
          disable_web_page_preview: options.disable_web_page_preview !== undefined ? options.disable_web_page_preview : true,
          reply_markup: options.reply_markup || undefined
        },
        { timeout: 12000 }
      );
      return res.data?.result;
    } catch (err) {
      console.warn(`[Notifier] Telegram sendMessage error: ${err.response?.data?.description || err.message}`);
      return null;
    }
  }

  async editTelegramMessage(chatId, messageId, text, options = {}) {
    const token = this.getTelegramToken();
    if (!token || !chatId || !messageId) return null;

    try {
      const res = await axios.post(
        `https://api.telegram.org/bot${token}/editMessageText`,
        {
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: options.parse_mode || 'HTML',
          disable_web_page_preview: options.disable_web_page_preview !== undefined ? options.disable_web_page_preview : true,
          reply_markup: options.reply_markup || undefined
        },
        { timeout: 12000 }
      );
      return res.data?.result;
    } catch (err) {
      // If message content is not modified, consider edit successful
      if (err.response?.data?.description?.includes('message is not modified')) {
        return { message_id: messageId, not_modified: true };
      }
      console.warn(`[Notifier] Telegram editMessageText error: ${err.response?.data?.description || err.message}`);
      return null;
    }
  }

  async sendTelegramVideo(chatId, localVideoPath, caption = '') {
    const token = this.getTelegramToken();
    if (!token || !chatId) return null;

    let absPath = localVideoPath;
    if (!fs.existsSync(absPath)) {
      const cleanRel = localVideoPath.replace(/^[/\\]+/, '');
      const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
      if (fs.existsSync(candidate)) {
        absPath = candidate;
      }
    }

    if (!fs.existsSync(absPath)) {
      console.warn(`[Notifier] Video file not found on disk: ${absPath}`);
      return null;
    }

    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('video', fs.createReadStream(absPath));
      if (caption) {
        form.append('caption', caption.substring(0, 1024));
        form.append('parse_mode', 'HTML');
      }

      const res = await axios.post(
        `https://api.telegram.org/bot${token}/sendVideo`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
      return res.data?.result;
    } catch (err) {
      console.warn(`[Notifier] Telegram sendVideo error: ${err.response?.data?.description || err.message}`);
      return null;
    }
  }

  async sendTelegramAlbum(chatId, localImagePaths, caption = '') {
    const token = this.getTelegramToken();
    if (!token || !chatId || !Array.isArray(localImagePaths) || localImagePaths.length === 0) return null;

    try {
      const form = new FormData();
      form.append('chat_id', chatId);

      const mediaArray = [];
      localImagePaths.slice(0, 10).forEach((imgRel, index) => {
        let absPath = imgRel;
        if (!fs.existsSync(absPath)) {
          const cleanRel = imgRel.replace(/^[/\\]+/, '');
          const candidate = path.join(__dirname, '..', '..', 'public', cleanRel);
          if (fs.existsSync(candidate)) {
            absPath = candidate;
          }
        }

        if (fs.existsSync(absPath)) {
          const attachName = `photo_${index}`;
          form.append(attachName, fs.createReadStream(absPath));
          const mediaObj = { type: 'photo', media: `attach://${attachName}` };
          if (index === 0 && caption) {
            mediaObj.caption = caption.substring(0, 1024);
            mediaObj.parse_mode = 'HTML';
          }
          mediaArray.push(mediaObj);
        }
      });

      if (mediaArray.length === 0) return null;

      form.append('media', JSON.stringify(mediaArray));

      const res = await axios.post(
        `https://api.telegram.org/bot${token}/sendMediaGroup`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 45000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
      return res.data?.result;
    } catch (err) {
      console.warn(`[Notifier] Telegram sendMediaGroup error: ${err.response?.data?.description || err.message}`);
      return null;
    }
  }
}

const notifier = new NotifierService();

module.exports = notifier;
