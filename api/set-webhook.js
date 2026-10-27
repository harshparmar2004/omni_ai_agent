const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

module.exports = async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${proto}://${host}/api/telegram-webhook`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      url: webhookUrl,
      drop_pending_updates: false
    });

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OmniStudio Telegram Webhook Linked</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0e14; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161922; border: 1px solid #232734; border-radius: 12px; padding: 2rem 2.5rem; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #10b981; font-size: 1.5rem; margin-top: 0; }
            code { background: #0c0e14; padding: 4px 8px; border-radius: 6px; font-family: monospace; color: #38bdf8; font-size: 0.85rem; word-break: break-all; }
            .btn { display: inline-block; margin-top: 1.5rem; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Telegram Webhook Active!</h1>
            <p>Your Telegram Bot is now connected to:</p>
            <p><code>${webhookUrl}</code></p>
            <p style="color: #94a3b8; font-size: 0.9rem;">Whenever you share a reel on Telegram, it will automatically trigger the GitHub Actions cloud engine to publish to your Feed and Story!</p>
            <a href="/" class="btn">Open OmniStudio Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to set webhook',
      detail: err.response?.data || err.message
    });
  }
};
