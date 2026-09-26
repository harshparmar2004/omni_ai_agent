const express = require('express');
const router = express.Router();
const { getAuthUrl, exchangeCode } = require('../services/googleDocsMcp');

/**
 * OAuth2 Routes for Google Docs Integration
 */

// GET /api/oauth/google — Start OAuth2 flow
router.get('/google', (req, res) => {
  const result = getAuthUrl();
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.redirect(result.url);
});

// GET /api/oauth/google/callback — OAuth2 callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    const result = await exchangeCode(code);

    // Redirect back to settings with success message
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Google Docs Connected</title></head>
      <body style="font-family: 'Inter', sans-serif; background: #FAF8F5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <h2 style="color: #1E1B18;">✅ Google Docs Connected!</h2>
          <p style="color: #7A7268;">Your OmniResearch AI is now linked to Google Docs.</p>
          <p style="color: #7A7268;">Research briefs will be automatically pushed as public Google Docs.</p>
          <a href="http://localhost:4000/#/settings" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #D97757; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Back to Settings</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`OAuth Error: ${err.message}`);
  }
});

module.exports = router;
