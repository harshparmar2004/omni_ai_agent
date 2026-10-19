const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (db) return db;

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'database.sqlite');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initV7Schema(db);

  return db;
}

function initV7Schema(db) {
  db.exec(`
    -- 1. Destination Instagram Pages
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      ig_user_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      token_expires_at TEXT,
      caption_template TEXT DEFAULT '{caption}\n\n{attribution}\n\n{hashtags}',
      default_hashtags TEXT DEFAULT '',
      attribution_enabled INTEGER DEFAULT 1,
      watermark_enabled INTEGER DEFAULT 0,
      post_mode TEXT DEFAULT 'review', -- 'auto' | 'review'
      posts_per_cycle INTEGER DEFAULT 1,
      daily_quota INTEGER DEFAULT 3,
      min_spacing_minutes INTEGER DEFAULT 60,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

    -- 2. Source Accounts to Monitor (Watchtower)
    CREATE TABLE IF NOT EXISTS source_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      is_active INTEGER DEFAULT 1,
      health TEXT DEFAULT 'ok', -- 'ok' | 'failing' | 'paused'
      consecutive_failures INTEGER DEFAULT 0,
      last_error TEXT DEFAULT '',
      last_checked_at TEXT,
      last_new_post_at TEXT,
      synced_posts_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sources_username ON source_accounts(username);
    CREATE INDEX IF NOT EXISTS idx_sources_page ON source_accounts(page_id);

    -- 3. Discovered Posts (Watchtower)
    CREATE TABLE IF NOT EXISTS discovered_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_account_id INTEGER REFERENCES source_accounts(id) ON DELETE CASCADE,
      run_id INTEGER,
      shortcode TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'reel', -- reel, carousel, image
      caption TEXT DEFAULT '',
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      posted_at TEXT,
      score REAL DEFAULT 0.0,
      status TEXT DEFAULT 'new', -- new, pending_review, selected, skipped, published
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_discovered_shortcode ON discovered_posts(shortcode);
    CREATE INDEX IF NOT EXISTS idx_discovered_status ON discovered_posts(status);

    -- 4. Publish Jobs (Shared Core Queue & History)
    CREATE TABLE IF NOT EXISTS publish_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL, -- 'reposter' | 'watchtower'
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      discovered_post_id INTEGER REFERENCES discovered_posts(id) ON DELETE SET NULL,
      shortcode TEXT NOT NULL,
      source_url TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'reel', -- reel, carousel, image
      media_paths TEXT DEFAULT '[]',
      caption TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued', -- queued, downloading, ready, publishing, published, failed
      current_step TEXT DEFAULT 'init',
      attempts INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      ig_media_id TEXT DEFAULT '',
      permalink TEXT DEFAULT '',
      telegram_chat_id TEXT DEFAULT '',
      telegram_message_id TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      published_at TEXT,
      UNIQUE(page_id, shortcode)
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON publish_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_page ON publish_jobs(page_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_shortcode ON publish_jobs(shortcode);

    -- 5. Agent Runs (Watchtower Cycle Audit)
    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL DEFAULT 'watchtower',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      sources_checked INTEGER DEFAULT 0,
      new_posts INTEGER DEFAULT 0,
      published INTEGER DEFAULT 0,
      errors TEXT DEFAULT '[]'
    );

    -- 6. Key-Value Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ─────────────────────────────────────────────────────────────
// Settings Operations
// ─────────────────────────────────────────────────────────────

function getSetting(key, defaultValue = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row || row.value === undefined || row.value === null) return defaultValue;
  return row.value;
}

function setSetting(key, value) {
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, val);
  return val;
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Pages Operations (Connected Destination Accounts)
// ─────────────────────────────────────────────────────────────

function getPages(options = {}) {
  let sql = 'SELECT * FROM pages';
  const params = [];
  if (options.isActiveOnly) {
    sql += ' WHERE is_active = 1';
  }
  sql += ' ORDER BY id ASC';
  return getDb().prepare(sql).all(...params);
}

function getPageById(id) {
  return getDb().prepare('SELECT * FROM pages WHERE id = ?').get(id);
}

function getPageBySlug(slug) {
  return getDb().prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
}

function createPage(data) {
  const now = new Date().toISOString();
  const stmt = getDb().prepare(`
    INSERT INTO pages (
      slug, name, handle, ig_user_id, access_token, token_expires_at,
      caption_template, default_hashtags, attribution_enabled, watermark_enabled,
      post_mode, posts_per_cycle, daily_quota, min_spacing_minutes, is_active,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.slug.toLowerCase().trim(),
    data.name.trim(),
    data.handle.trim(),
    data.ig_user_id.trim(),
    data.access_token.trim(),
    data.token_expires_at || null,
    data.caption_template || '{caption}\n\n{attribution}\n\n{hashtags}',
    data.default_hashtags || '',
    data.attribution_enabled !== undefined ? (data.attribution_enabled ? 1 : 0) : 1,
    data.watermark_enabled !== undefined ? (data.watermark_enabled ? 1 : 0) : 0,
    data.post_mode || 'review',
    data.posts_per_cycle || 1,
    data.daily_quota || 3,
    data.min_spacing_minutes || 60,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    now,
    now
  );
  return getPageById(info.lastInsertRowid);
}

function updatePage(id, data) {
  const page = getPageById(id);
  if (!page) throw new Error(`Page #${id} not found`);

  const fields = [];
  const params = [];

  const allowed = [
    'slug', 'name', 'handle', 'ig_user_id', 'access_token', 'token_expires_at',
    'caption_template', 'default_hashtags', 'attribution_enabled', 'watermark_enabled',
    'post_mode', 'posts_per_cycle', 'daily_quota', 'min_spacing_minutes', 'is_active'
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (typeof data[key] === 'boolean') {
        params.push(data[key] ? 1 : 0);
      } else {
        params.push(data[key]);
      }
    }
  }

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  getDb().prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getPageById(id);
}

function deletePage(id) {
  return getDb().prepare('DELETE FROM pages WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────
// Source Accounts Operations (Watchtower)
// ─────────────────────────────────────────────────────────────

function getSourceAccounts(options = {}) {
  let sql = `
    SELECT s.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle
    FROM source_accounts s
    LEFT JOIN pages p ON s.page_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (options.pageId) {
    sql += ' AND s.page_id = ?';
    params.push(options.pageId);
  }
  if (options.isActiveOnly) {
    sql += ' AND s.is_active = 1';
  }
  sql += ' ORDER BY s.id ASC';
  return getDb().prepare(sql).all(...params);
}

function getSourceAccountById(id) {
  return getDb().prepare(`
    SELECT s.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle
    FROM source_accounts s
    LEFT JOIN pages p ON s.page_id = p.id
    WHERE s.id = ?
  `).get(id);
}

function getSourceAccountByUsername(username) {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  return getDb().prepare('SELECT * FROM source_accounts WHERE username = ?').get(clean);
}

function createSourceAccount(data) {
  const username = data.username.replace(/^@/, '').toLowerCase().trim();
  const existing = getSourceAccountByUsername(username);
  if (existing) {
    updateSourceAccount(existing.id, {
      page_id: data.page_id,
      is_active: 1,
      health: 'ok'
    });
    return getSourceAccountById(existing.id);
  }

  const stmt = getDb().prepare(`
    INSERT INTO source_accounts (
      username, page_id, is_active, health, consecutive_failures,
      last_error, last_checked_at, last_new_post_at, synced_posts_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    username,
    data.page_id,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    data.health || 'ok',
    0,
    '',
    null,
    null,
    0,
    new Date().toISOString()
  );
  return getSourceAccountById(info.lastInsertRowid);
}

function updateSourceAccount(id, data) {
  const fields = [];
  const params = [];

  const allowed = [
    'username', 'page_id', 'is_active', 'health', 'consecutive_failures',
    'last_error', 'last_checked_at', 'last_new_post_at', 'synced_posts_count'
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (typeof data[key] === 'boolean') {
        params.push(data[key] ? 1 : 0);
      } else {
        params.push(data[key]);
      }
    }
  }

  if (fields.length === 0) return getSourceAccountById(id);

  params.push(id);
  getDb().prepare(`UPDATE source_accounts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getSourceAccountById(id);
}

function deleteSourceAccount(id) {
  return getDb().prepare('DELETE FROM source_accounts WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────
// Discovered Posts Operations (Watchtower)
// ─────────────────────────────────────────────────────────────

function getDiscoveredPostByShortcode(shortcode) {
  return getDb().prepare('SELECT * FROM discovered_posts WHERE shortcode = ?').get(shortcode);
}

function getDiscoveredPostById(id) {
  return getDb().prepare(`
    SELECT d.*, s.username as source_username, s.page_id
    FROM discovered_posts d
    LEFT JOIN source_accounts s ON d.source_account_id = s.id
    WHERE d.id = ?
  `).get(id);
}

function createDiscoveredPost(data) {
  const stmt = getDb().prepare(`
    INSERT INTO discovered_posts (
      source_account_id, run_id, shortcode, url, media_type,
      caption, like_count, comment_count, view_count, posted_at,
      score, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.source_account_id || null,
    data.run_id || null,
    data.shortcode,
    data.url,
    data.media_type || 'reel',
    data.caption || '',
    data.like_count || 0,
    data.comment_count || 0,
    data.view_count || 0,
    data.posted_at || null,
    data.score || 0.0,
    data.status || 'new',
    new Date().toISOString()
  );
  return getDiscoveredPostById(info.lastInsertRowid);
}

function updateDiscoveredPost(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['score', 'status', 'run_id', 'like_count', 'comment_count', 'view_count', 'caption'];
  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(data[k]);
    }
  }
  if (fields.length === 0) return getDiscoveredPostById(id);
  params.push(id);
  getDb().prepare(`UPDATE discovered_posts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getDiscoveredPostById(id);
}

function listDiscoveredPosts(options = {}) {
  let sql = `
    SELECT d.*, s.username as source_username, p.slug as page_slug, p.name as page_name
    FROM discovered_posts d
    LEFT JOIN source_accounts s ON d.source_account_id = s.id
    LEFT JOIN pages p ON s.page_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (options.status) {
    sql += ' AND d.status = ?';
    params.push(options.status);
  }
  if (options.pageId) {
    sql += ' AND s.page_id = ?';
    params.push(options.pageId);
  }
  if (options.sourceAccountId) {
    sql += ' AND d.source_account_id = ?';
    params.push(options.sourceAccountId);
  }

  sql += ' ORDER BY d.id DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  return getDb().prepare(sql).all(...params);
}

// ─────────────────────────────────────────────────────────────
// Publish Jobs Operations (Shared Core Queue & History)
// ─────────────────────────────────────────────────────────────

function getPublishJobById(id) {
  return getDb().prepare(`
    SELECT j.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle
    FROM publish_jobs j
    LEFT JOIN pages p ON j.page_id = p.id
    WHERE j.id = ?
  `).get(id);
}

function getPublishJob(pageId, shortcode) {
  return getDb().prepare(`
    SELECT * FROM publish_jobs WHERE page_id = ? AND shortcode = ?
  `).get(pageId, shortcode);
}

function createPublishJob(data) {
  const stmt = getDb().prepare(`
    INSERT INTO publish_jobs (
      agent, page_id, discovered_post_id, shortcode, source_url,
      media_type, media_paths, caption, status, current_step,
      attempts, error, ig_media_id, permalink, telegram_chat_id,
      telegram_message_id, created_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.agent || 'reposter',
    data.page_id,
    data.discovered_post_id || null,
    data.shortcode,
    data.source_url,
    data.media_type || 'reel',
    typeof data.media_paths === 'string' ? data.media_paths : JSON.stringify(data.media_paths || []),
    data.caption || '',
    data.status || 'queued',
    data.current_step || 'init',
    data.attempts || 0,
    data.error || '',
    data.ig_media_id || '',
    data.permalink || '',
    data.telegram_chat_id || '',
    data.telegram_message_id || '',
    new Date().toISOString(),
    null
  );
  return getPublishJobById(info.lastInsertRowid);
}

function updatePublishJob(id, data) {
  const fields = [];
  const params = [];

  const allowed = [
    'status', 'current_step', 'attempts', 'error', 'media_paths',
    'caption', 'ig_media_id', 'permalink', 'telegram_chat_id',
    'telegram_message_id', 'published_at'
  ];

  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      if (k === 'media_paths' && typeof data[k] !== 'string') {
        params.push(JSON.stringify(data[k]));
      } else {
        params.push(data[k]);
      }
    }
  }

  if (fields.length === 0) return getPublishJobById(id);
  params.push(id);
  getDb().prepare(`UPDATE publish_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getPublishJobById(id);
}

function listPublishJobs(options = {}) {
  let sql = `
    SELECT j.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle
    FROM publish_jobs j
    LEFT JOIN pages p ON j.page_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (options.status) {
    if (Array.isArray(options.status)) {
      sql += ` AND j.status IN (${options.status.map(() => '?').join(',')})`;
      params.push(...options.status);
    } else {
      sql += ' AND j.status = ?';
      params.push(options.status);
    }
  }
  if (options.pageId) {
    sql += ' AND j.page_id = ?';
    params.push(options.pageId);
  }
  if (options.agent) {
    sql += ' AND j.agent = ?';
    params.push(options.agent);
  }

  sql += ' ORDER BY j.id DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  return getDb().prepare(sql).all(...params);
}

// Count jobs published for a page today
function getPublishedCountToday(pageId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const row = getDb().prepare(`
    SELECT count(*) as count FROM publish_jobs
    WHERE page_id = ? AND status = 'published' AND published_at >= ?
  `).get(pageId, todayStart.toISOString());
  return row ? row.count : 0;
}

// Get timestamp of latest published job for a page
function getLastPublishedTimestamp(pageId) {
  const row = getDb().prepare(`
    SELECT published_at FROM publish_jobs
    WHERE page_id = ? AND status = 'published' AND published_at IS NOT NULL
    ORDER BY id DESC LIMIT 1
  `).get(pageId);
  return row ? row.published_at : null;
}

// ─────────────────────────────────────────────────────────────
// Agent Runs Operations (Watchtower Auditing)
// ─────────────────────────────────────────────────────────────

function createAgentRun(data = {}) {
  const stmt = getDb().prepare(`
    INSERT INTO agent_runs (agent, started_at, finished_at, sources_checked, new_posts, published, errors)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.agent || 'watchtower',
    new Date().toISOString(),
    null,
    0,
    0,
    0,
    '[]'
  );
  return getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(info.lastInsertRowid);
}

function updateAgentRun(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['finished_at', 'sources_checked', 'new_posts', 'published', 'errors'];
  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      if (k === 'errors' && typeof data[k] !== 'string') {
        params.push(JSON.stringify(data[k]));
      } else {
        params.push(data[k]);
      }
    }
  }
  if (fields.length === 0) return getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(id);
  params.push(id);
  getDb().prepare(`UPDATE agent_runs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(id);
}

function listAgentRuns(limit = 20) {
  return getDb().prepare('SELECT * FROM agent_runs ORDER BY id DESC LIMIT ?').all(limit);
}

// ─────────────────────────────────────────────────────────────
// Backwards Compatibility Bridge
// (Allows any existing services to query pages/channels safely during migration)
// ─────────────────────────────────────────────────────────────

function getConnectedPages(options = {}) {
  return getPages(options);
}
function getConnectedPageBySlug(slug) {
  return getPageBySlug(slug);
}
function getTrackedChannels() {
  return getSourceAccounts();
}
function getBrandAssets() {
  return { brand_handle: getSetting('instagram_handle', '@gta6_updates_007') };
}

// ─────────────────────────────────────────────────────────────
// Unified Pipeline Aggregation
// ─────────────────────────────────────────────────────────────

function getPipelineSummary(pageId = null) {
  const pId = pageId ? parseInt(pageId, 10) : null;
  const db = getDb();

  // 1. Sources count
  let sourcesSql = 'SELECT count(*) as c FROM source_accounts WHERE is_active = 1';
  const sourcesParams = [];
  if (pId) {
    sourcesSql += ' AND page_id = ?';
    sourcesParams.push(pId);
  }
  const sourcesCount = db.prepare(sourcesSql).get(...sourcesParams)?.c || 0;

  // 2. Discovered (raw)
  let discSql = `
    SELECT count(*) as c FROM discovered_posts d
    LEFT JOIN source_accounts s ON d.source_account_id = s.id
    WHERE d.status IN ('new', 'discovered')
  `;
  const discParams = [];
  if (pId) {
    discSql += ' AND s.page_id = ?';
    discParams.push(pId);
  }
  const discoveredCount = db.prepare(discSql).get(...discParams)?.c || 0;

  // 3. AI Ranked (score >= 70, not skipped or published)
  let rankedSql = `
    SELECT count(*) as c FROM discovered_posts d
    LEFT JOIN source_accounts s ON d.source_account_id = s.id
    WHERE d.score >= 70 AND d.status NOT IN ('published', 'skipped')
  `;
  const rankedParams = [];
  if (pId) {
    rankedSql += ' AND s.page_id = ?';
    rankedParams.push(pId);
  }
  const rankedCount = db.prepare(rankedSql).get(...rankedParams)?.c || 0;

  // 4. Jobs by status
  const jobParams = [];
  let pageJobClause = '';
  if (pId) {
    pageJobClause = ' WHERE page_id = ?';
    jobParams.push(pId);
  }

  const jobRows = db.prepare(`
    SELECT status, count(*) as c FROM publish_jobs
    ${pageJobClause}
    GROUP BY status
  `).all(...jobParams);

  const jobCounts = {
    pending_review: 0,
    queued: 0,
    downloading: 0,
    ready: 0,
    publishing: 0,
    published: 0,
    failed: 0
  };
  for (const r of jobRows) {
    if (jobCounts[r.status] !== undefined) {
      jobCounts[r.status] = r.c;
    }
  }

  const activeCount = jobCounts.queued + jobCounts.downloading + jobCounts.ready + jobCounts.publishing;

  return {
    pageId: pId,
    sources: sourcesCount,
    discovered: discoveredCount,
    ranked: rankedCount,
    review: jobCounts.pending_review,
    active: activeCount,
    published: jobCounts.published,
    failed: jobCounts.failed
  };
}

function getReposterPipelineSummary(pageId = null) {
  const pId = pageId ? parseInt(pageId, 10) : null;
  const db = getDb();

  const params = ['reposter'];
  let pageClause = '';
  if (pId) {
    pageClause = ' AND page_id = ?';
    params.push(pId);
  }

  const rows = db.prepare(`
    SELECT status, count(*) as c FROM publish_jobs
    WHERE agent = ? ${pageClause}
    GROUP BY status
  `).all(...params);

  const counts = {
    pending_review: 0,
    queued: 0,
    downloading: 0,
    ready: 0,
    publishing: 0,
    published: 0,
    failed: 0
  };

  let totalIngested = 0;
  for (const r of rows) {
    if (counts[r.status] !== undefined) {
      counts[r.status] = r.c;
    }
    totalIngested += r.c;
  }

  return {
    pageId: pId,
    ingested: totalIngested,
    downloading: counts.queued + counts.downloading,
    ready: counts.ready + counts.publishing + counts.pending_review,
    published: counts.published,
    failed: counts.failed
  };
}

module.exports = {
  getDb,
  // Settings
  getSetting,
  setSetting,
  getAllSettings,
  // Pages
  getPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  // Source Accounts
  getSourceAccounts,
  getSourceAccountById,
  getSourceAccountByUsername,
  createSourceAccount,
  updateSourceAccount,
  deleteSourceAccount,
  // Discovered Posts
  getDiscoveredPostByShortcode,
  getDiscoveredPostById,
  createDiscoveredPost,
  updateDiscoveredPost,
  listDiscoveredPosts,
  // Publish Jobs
  getPublishJobById,
  getPublishJob,
  createPublishJob,
  updatePublishJob,
  listPublishJobs,
  getPublishedCountToday,
  getLastPublishedTimestamp,
  // Agent Runs
  createAgentRun,
  updateAgentRun,
  listAgentRuns,
  // Backwards compatibility
  getConnectedPages,
  getConnectedPageBySlug,
  getTrackedChannels,
  getBrandAssets,
  // Pipeline
  getPipelineSummary,
  getReposterPipelineSummary
};
