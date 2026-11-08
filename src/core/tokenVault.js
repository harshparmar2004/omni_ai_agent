const { getPages, updatePage, createPage, getPageBySlug } = require('../database');
const { validatePageToken, maskToken } = require('./tokenManager');

/**
 * OmniStudio v8 — Multi-Tenant Token Vault
 * Centrally manages tokens for 50-100+ Instagram destination accounts.
 * Enables bulk health validation, expiration auditing, and vault backup/restore.
 */

function exportVaultObject() {
  const pages = getPages();
  const vault = {
    version: '8.0.0',
    exported_at: new Date().toISOString(),
    total_pages: pages.length,
    pages: {}
  };

  for (const p of pages) {
    vault.pages[p.slug] = {
      id: p.id,
      name: p.name,
      handle: p.handle,
      ig_user_id: p.ig_user_id,
      access_token: p.access_token,
      token_expires_at: p.token_expires_at,
      niche: p.niche,
      template_slug: p.template_slug,
      daily_quota: p.daily_quota,
      is_active: Boolean(p.is_active)
    };
  }

  return vault;
}

function exportVaultBase64() {
  const obj = exportVaultObject();
  return Buffer.from(JSON.stringify(obj, null, 2)).toString('base64');
}

function importVault(rawVault) {
  let vaultObj = null;
  if (typeof rawVault === 'string') {
    try {
      // Try JSON first
      vaultObj = JSON.parse(rawVault);
    } catch (e) {
      // Try base64
      try {
        const decoded = Buffer.from(rawVault, 'base64').toString('utf-8');
        vaultObj = JSON.parse(decoded);
      } catch (e2) {
        throw new Error('Invalid vault format. Must be JSON or Base64-encoded JSON.');
      }
    }
  } else if (typeof rawVault === 'object') {
    vaultObj = rawVault;
  }

  if (!vaultObj || !vaultObj.pages) {
    throw new Error('Invalid vault object: missing `pages` mapping.');
  }

  const results = {
    total: Object.keys(vaultObj.pages).length,
    created: 0,
    updated: 0,
    errors: []
  };

  for (const [slug, p] of Object.entries(vaultObj.pages)) {
    try {
      const existing = getPageBySlug(slug);
      if (existing) {
        updatePage(existing.id, {
          name: p.name || existing.name,
          handle: p.handle || existing.handle,
          ig_user_id: p.ig_user_id || existing.ig_user_id,
          access_token: p.access_token || existing.access_token,
          token_expires_at: p.token_expires_at || existing.token_expires_at,
          niche: p.niche || existing.niche,
          template_slug: p.template_slug || existing.template_slug,
          daily_quota: p.daily_quota || existing.daily_quota,
          is_active: p.is_active !== undefined ? p.is_active : existing.is_active
        });
        results.updated++;
      } else {
        createPage({
          slug,
          name: p.name || slug,
          handle: p.handle || `@${slug}`,
          ig_user_id: p.ig_user_id || '',
          access_token: p.access_token || '',
          token_expires_at: p.token_expires_at || null,
          niche: p.niche || '',
          template_slug: p.template_slug || 'default',
          daily_quota: p.daily_quota || 5,
          is_active: p.is_active !== undefined ? p.is_active : 1
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push({ slug, error: err.message });
    }
  }

  return results;
}

/**
 * Bulk validates all pages across the network against Meta Graph API
 * Batching 4 requests at a time to stay safely within rate limits
 */
async function validateAllTokens() {
  const pages = getPages({ isActiveOnly: true });
  const results = [];
  const BATCH_SIZE = 4;

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async page => {
      try {
        const status = await validatePageToken(page);
        return {
          id: page.id,
          slug: page.slug,
          handle: page.handle,
          name: page.name,
          valid: status.valid,
          category: status.category,
          token_masked: maskToken(page.access_token),
          error: status.error || ''
        };
      } catch (err) {
        return {
          id: page.id,
          slug: page.slug,
          handle: page.handle,
          name: page.name,
          valid: false,
          error: err.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const validCount = results.filter(r => r.valid).length;

  return {
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    healthPct: results.length > 0 ? Math.round((validCount / results.length) * 100) : 100,
    pages: results
  };
}

module.exports = {
  exportVaultObject,
  exportVaultBase64,
  importVault,
  validateAllTokens
};
