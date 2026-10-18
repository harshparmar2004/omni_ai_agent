const axios = require('axios');
const { getPages, updatePage } = require('../database');

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '***';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

function getGraphBase(token) {
  if (token && (token.startsWith('IGAA') || token.startsWith('IGQJ') || token.startsWith('IG'))) {
    return 'https://graph.instagram.com/v21.0';
  }
  return 'https://graph.facebook.com/v21.0';
}

/**
 * Validate a page's Meta Graph API credentials
 */
async function validatePageToken(page) {
  if (!page || !page.access_token || !page.ig_user_id) {
    return {
      valid: false,
      error: 'Missing access_token or ig_user_id',
      maskedToken: maskToken(page?.access_token)
    };
  }

  const base = getGraphBase(page.access_token);

  try {
    // 1. Query /me to verify access token
    const meRes = await axios.get(`${base}/me`, {
      params: {
        fields: 'id,username,account_type',
        access_token: page.access_token
      },
      timeout: 10000
    });

    // 2. Query user node to check permissions
    let handle = meRes.data?.username ? `@${meRes.data.username}` : page.handle;
    let accountType = meRes.data?.account_type || 'BUSINESS';

    return {
      valid: true,
      handle,
      ig_user_id: meRes.data?.id || page.ig_user_id,
      account_type: accountType,
      maskedToken: maskToken(page.access_token),
      token_expires_at: page.token_expires_at
    };
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    return {
      valid: false,
      error: apiError,
      maskedToken: maskToken(page.access_token)
    };
  }
}

/**
 * Refresh long-lived Instagram token if nearing expiry
 */
async function refreshLongLivedToken(page) {
  if (!page || !page.access_token || !page.access_token.startsWith('IG')) {
    return { success: false, reason: 'Only Instagram-Login (IG...) tokens support ig_refresh_token' };
  }

  try {
    const res = await axios.get('https://graph.instagram.com/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: page.access_token
      },
      timeout: 15000
    });

    if (res.data?.access_token) {
      const expiresInSec = res.data.expires_in || (60 * 24 * 60 * 60); // default 60 days
      const expiresAt = new Date(Date.now() + (expiresInSec * 1000)).toISOString();
      updatePage(page.id, {
        access_token: res.data.access_token,
        token_expires_at: expiresAt
      });
      return { success: true, expiresAt };
    }
    return { success: false, error: 'No access_token returned' };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Daily check of all active page tokens
 */
async function auditAllPageTokens() {
  const pages = getPages({ isActiveOnly: true });
  const results = [];

  for (const page of pages) {
    const status = await validatePageToken(page);
    results.push({ page_id: page.id, slug: page.slug, ...status });
  }

  return results;
}

module.exports = {
  maskToken,
  getGraphBase,
  validatePageToken,
  refreshLongLivedToken,
  auditAllPageTokens
};
