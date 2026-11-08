const express = require('express');
const router = express.Router();
const {
  getPageGroups,
  getPageGroupById,
  createPageGroup,
  updatePageGroup,
  deletePageGroup,
  getGroupMembers,
  addPageToGroup,
  removePageFromGroup,
  getSourceAccounts,
  createSourceAccount,
  listDistributionJobs,
  getPageById
} = require('../database');
const { validatePageToken, maskToken } = require('../core/tokenManager');

/**
 * GET /api/groups
 * List all distribution groups
 */
router.get('/', (req, res) => {
  try {
    const { niche, isActiveOnly } = req.query;
    const filter = {};
    if (niche) filter.niche = niche;
    if (isActiveOnly) filter.isActiveOnly = isActiveOnly === 'true';

    const groups = getPageGroups(filter);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups
 * Create new distribution group
 */
router.post('/', (req, res) => {
  try {
    const { name, slug, description, niche, cross_post_mode, cross_post_delay_min, cross_post_delay_max } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const group = createPageGroup({
      name,
      slug,
      description,
      niche,
      cross_post_mode,
      cross_post_delay_min,
      cross_post_delay_max
    });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id
 * Get full group workspace (members, sources, distribution jobs)
 */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const group = getPageGroupById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const members = getGroupMembers(id).map(m => ({
      ...m,
      access_token_masked: maskToken(m.access_token)
    }));

    const sources = getSourceAccounts({ groupId: id });
    const distributions = listDistributionJobs({ groupId: id, limit: 10 });

    res.json({
      group,
      members,
      sources,
      distributions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id
 * Update group settings
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = updatePageGroup(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id
 * Delete group
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    deletePageGroup(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/members
 * Add page to group
 */
router.post('/:id/members', (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { page_id, role, priority } = req.body;
    if (!page_id) return res.status(400).json({ error: 'page_id is required' });

    const members = addPageToGroup(groupId, parseInt(page_id, 10), {
      role: role || 'member',
      priority: priority !== undefined ? parseInt(priority, 10) : 0
    });
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/members/:pageId
 * Remove page from group
 */
router.delete('/:id/members/:pageId', (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const pageId = parseInt(req.params.pageId, 10);
    removePageFromGroup(groupId, pageId);
    res.json({ success: true, groupId, pageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/groups/:id/members/:pageId
 * Update member role and priority in group
 */
router.patch('/:id/members/:pageId', (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const pageId = parseInt(req.params.pageId, 10);
    const { role, priority } = req.body;
    const { getDb } = require('../database');
    const db = getDb();
    if (role !== undefined) {
      db.prepare('UPDATE page_group_members SET role = ? WHERE group_id = ? AND page_id = ?').run(role, groupId, pageId);
    }
    if (priority !== undefined) {
      db.prepare('UPDATE page_group_members SET priority = ? WHERE group_id = ? AND page_id = ?').run(parseInt(priority, 10), groupId, pageId);
    }
    const members = getGroupMembers(groupId);
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/sources
 * Add group-wide source account
 */
router.post('/:id/sources', (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const cleanUser = username.replace(/^@/, '').replace(/https?:\/\/(?:www\.)?instagram\.com\//, '').replace(/\/.*$/, '').trim();
    const source = createSourceAccount({
      username: cleanUser,
      group_id: groupId,
      scope: 'group'
    });

    setImmediate(async () => {
      try {
        const { scanSingleSource } = require('../agents/watchtower/scanner');
        await scanSingleSource(source.id, { evaluate: true });
      } catch (err) {
        console.error(`[Group Source Auto-Scan Error]: ${err.message}`);
      }
    });

    res.json({ success: true, source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/sources/:sourceId
 * Delete group source account
 */
router.delete('/:id/sources/:sourceId', (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const { deleteSourceAccount } = require('../database');
    deleteSourceAccount(sourceId);
    res.json({ success: true, sourceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/test-tokens
 * Bulk test Meta Graph API tokens for all pages in this group
 */
router.post('/:id/test-tokens', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const members = getGroupMembers(groupId);

    const results = [];
    for (const m of members) {
      const page = getPageById(m.page_id);
      if (!page) continue;
      const status = await validatePageToken(page);
      results.push({
        page_id: page.id,
        handle: page.handle,
        name: page.name,
        ...status
      });
    }

    res.json({
      success: true,
      total: results.length,
      valid: results.filter(r => r.valid).length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
