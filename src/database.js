let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  // Safe mock adapter for serverless environments (e.g. Vercel)
  Database = class MockDatabase {
    constructor() {}
    prepare() {
      return {
        all: () => [],
        get: () => null,
        run: () => ({ lastInsertRowid: 1, changes: 1 })
      };
    }
    pragma() {}
    exec() {}
  };
}

const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (db) return db;

  try {
    let dataDir = process.env.DATA_DIR;
    if (!dataDir) {
      if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
        dataDir = '/data';
      } else {
        dataDir = path.join(__dirname, '..', 'data');
      }
    }
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'database.sqlite');
    db = new Database(dbPath);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initV7Schema(db);
  } catch (err) {
    console.warn('[DB Warning] Fallback mock DB used in serverless environment:', err.message);
    db = new Database();
  }

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
      daily_quota INTEGER DEFAULT 12,
      min_spacing_minutes INTEGER DEFAULT 25,
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

  // Seed default peak traffic windows settings
  const defaultSettings = {
    peak_windows_enabled: 'true',
    peak_timezone: 'Asia/Kolkata',
    peak_window_morning: '08:00-11:00|3',
    peak_window_evening: '17:00-21:00|5',
    peak_window_midnight: '23:00-01:00|4',
    watchtower_interval_hours: '3',
    auto_post_to_story: 'true'
  };
  const insertSettingStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSettingStmt.run(k, v);
  }

  // Auto-migrate existing pages to viral anti-spam pacing defaults (120m spacing, 5 daily quota)
  try {
    db.prepare('UPDATE pages SET daily_quota = 5, min_spacing_minutes = 120 WHERE min_spacing_minutes < 120').run();
  } catch (e) {}

  // Story publishing migrations
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_ig_media_id TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_published_at TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_status TEXT DEFAULT "idle"'); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN telegram_message_id TEXT DEFAULT ""'); } catch (e) {}

  // Seed / migrate dedicated Cult Information Video-Essay page
  try {
    db.prepare(`
      UPDATE pages SET
        slug = 'cult_information',
        name = 'Cult Information',
        handle = '@cult_information',
        default_hashtags = '#cultinformation #information #culture #knowledge #curation #mustknow #explore'
      WHERE slug = 'ai_curation'
    `).run();

    const existingCultPage = db.prepare('SELECT id FROM pages WHERE slug = ?').get('cult_information');
    if (!existingCultPage) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO pages (
          slug, name, handle, ig_user_id, access_token, caption_template,
          default_hashtags, attribution_enabled, watermark_enabled, post_mode,
          posts_per_cycle, daily_quota, min_spacing_minutes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'cult_information',
        'Cult Information',
        '@cult_information',
        'PENDING_IG_USER_ID',
        'PENDING_ACCESS_TOKEN',
        '{caption}\n\n{hashtags}',
        '#cultinformation #information #culture #knowledge #curation #mustknow #explore',
        0,
        0,
        'auto',
        1,
        5,
        120,
        1,
        now,
        now
      );
    }
  } catch (e) {
    console.warn('[Database] Notice initializing cult_information page:', e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // v8 Schema: Multi-Tenant Distribution Network
  // ─────────────────────────────────────────────────────────────
  db.exec(`
    -- Page Groups (Distribution Rings)
    CREATE TABLE IF NOT EXISTS page_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      niche TEXT DEFAULT '',
      cross_post_mode TEXT DEFAULT 'auto',
      cross_post_delay_min INTEGER DEFAULT 20,
      cross_post_delay_max INTEGER DEFAULT 45,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pg_slug ON page_groups(slug);

    -- Page-to-Group Membership (M:N)
    CREATE TABLE IF NOT EXISTS page_group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES page_groups(id) ON DELETE CASCADE,
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(group_id, page_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pgm_group ON page_group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_pgm_page ON page_group_members(page_id);

    -- Cross-Post Distribution Jobs
    CREATE TABLE IF NOT EXISTS distribution_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin_job_id INTEGER REFERENCES publish_jobs(id),
      origin_page_id INTEGER NOT NULL REFERENCES pages(id),
      group_id INTEGER REFERENCES page_groups(id),
      shortcode TEXT NOT NULL,
      source_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_targets INTEGER DEFAULT 0,
      completed_targets INTEGER DEFAULT 0,
      failed_targets INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_dist_status ON distribution_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_dist_origin ON distribution_jobs(origin_job_id);

    -- Distribution Job Targets (one row per target page)
    CREATE TABLE IF NOT EXISTS distribution_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distribution_job_id INTEGER NOT NULL REFERENCES distribution_jobs(id) ON DELETE CASCADE,
      target_page_id INTEGER NOT NULL REFERENCES pages(id),
      publish_job_id INTEGER REFERENCES publish_jobs(id),
      status TEXT DEFAULT 'queued',
      scheduled_at TEXT,
      error TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dt_dist ON distribution_targets(distribution_job_id);
    CREATE INDEX IF NOT EXISTS idx_dt_page ON distribution_targets(target_page_id);

    -- Page Templates / Branding Profiles
    CREATE TABLE IF NOT EXISTS page_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      template_type TEXT DEFAULT 'default',
      primary_color TEXT DEFAULT '#FFFFFF',
      accent_color TEXT DEFAULT '#00FF66',
      background_color TEXT DEFAULT '#0D0D12',
      font_family TEXT DEFAULT 'Inter',
      logo_path TEXT DEFAULT '',
      avatar_path TEXT DEFAULT '',
      watermark_text TEXT DEFAULT '',
      frame_style TEXT DEFAULT 'card',
      story_template TEXT DEFAULT 'editorial',
      custom_css TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(page_id, template_type)
    );

    CREATE INDEX IF NOT EXISTS idx_pt_page ON page_templates(page_id);

    -- 10. Job Stage Events (End-to-End Tracking History)
    CREATE TABLE IF NOT EXISTS job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES publish_jobs(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'started',
      message TEXT DEFAULT '',
      meta_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_je_job ON job_events(job_id);
    CREATE INDEX IF NOT EXISTS idx_je_stage ON job_events(stage);
  `);

  // v8 migrations for existing tables (safe ALTER — will no-op if columns exist)
  try { db.exec('ALTER TABLE pages ADD COLUMN page_type TEXT DEFAULT \'destination\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN niche TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN timezone TEXT DEFAULT \'Asia/Kolkata\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN region TEXT DEFAULT \'IN\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN onboarding_status TEXT DEFAULT \'active\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN template_slug TEXT DEFAULT \'default\''); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN auto_story INTEGER DEFAULT 1'); } catch (e) {}
  try { db.exec('ALTER TABLE pages ADD COLUMN auto_cross_post INTEGER DEFAULT 1'); } catch (e) {}

  try { db.exec('ALTER TABLE source_accounts ADD COLUMN group_id INTEGER'); } catch (e) {}
  try { db.exec('ALTER TABLE source_accounts ADD COLUMN scope TEXT DEFAULT \'page\''); } catch (e) {}

  // Tracking migrations for publish_jobs
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN hook_headline TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN edited_media_path TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN edit_theme TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN edit_meta TEXT DEFAULT \'{}\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_status TEXT DEFAULT \'pending\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_ig_media_id TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN story_published_at TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE publish_jobs ADD COLUMN origin_job_id INTEGER REFERENCES publish_jobs(id)'); } catch (e) {}
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
      page_type, niche, timezone, region, onboarding_status, template_slug, auto_story, auto_cross_post,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.page_type || 'destination',
    data.niche || '',
    data.timezone || 'Asia/Kolkata',
    data.region || 'IN',
    data.onboarding_status || 'active',
    data.template_slug || 'default',
    data.auto_story !== undefined ? (data.auto_story ? 1 : 0) : 1,
    data.auto_cross_post !== undefined ? (data.auto_cross_post ? 1 : 0) : 1,
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
    'post_mode', 'posts_per_cycle', 'daily_quota', 'min_spacing_minutes', 'is_active',
    'page_type', 'niche', 'timezone', 'region', 'onboarding_status', 'template_slug',
    'auto_story', 'auto_cross_post'
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
  const db = getDb();
  try { db.prepare('UPDATE publish_jobs SET origin_job_id = NULL WHERE origin_job_id IN (SELECT id FROM publish_jobs WHERE page_id = ?)').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM page_group_members WHERE page_id = ?').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM page_templates WHERE page_id = ?').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM distribution_targets WHERE target_page_id = ?').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM distribution_jobs WHERE origin_page_id = ?').run(id); } catch (e) {}
  return db.prepare('DELETE FROM pages WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────
// Source Accounts Operations (Watchtower)
// ─────────────────────────────────────────────────────────────

function getSourceAccounts(options = {}) {
  let sql = `
    SELECT s.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle,
           pg.name as group_name, pg.slug as group_slug
    FROM source_accounts s
    LEFT JOIN pages p ON s.page_id = p.id
    LEFT JOIN page_groups pg ON s.group_id = pg.id
    WHERE 1=1
  `;
  const params = [];
  if (options.pageId) {
    sql += ' AND s.page_id = ?';
    params.push(options.pageId);
  }
  if (options.groupId) {
    sql += ' AND s.group_id = ?';
    params.push(options.groupId);
  }
  if (options.scope) {
    sql += ' AND s.scope = ?';
    params.push(options.scope);
  }
  if (options.isActiveOnly) {
    sql += ' AND s.is_active = 1';
  }
  sql += ' ORDER BY s.id ASC';
  return getDb().prepare(sql).all(...params);
}

function getSourceAccountById(id) {
  return getDb().prepare(`
    SELECT s.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle,
           pg.name as group_name, pg.slug as group_slug
    FROM source_accounts s
    LEFT JOIN pages p ON s.page_id = p.id
    LEFT JOIN page_groups pg ON s.group_id = pg.id
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
      page_id: data.page_id !== undefined ? data.page_id : existing.page_id,
      group_id: data.group_id !== undefined ? data.group_id : existing.group_id,
      scope: data.scope || existing.scope || 'page',
      is_active: 1,
      health: 'ok'
    });
    return getSourceAccountById(existing.id);
  }

  const stmt = getDb().prepare(`
    INSERT INTO source_accounts (
      username, page_id, group_id, scope, is_active, health, consecutive_failures,
      last_error, last_checked_at, last_new_post_at, synced_posts_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    username,
    data.page_id || null,
    data.group_id || null,
    data.scope || 'page',
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
    'username', 'page_id', 'group_id', 'scope', 'is_active', 'health', 'consecutive_failures',
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

function countDiscoveredPosts(options = {}) {
  let sql = `
    SELECT count(*) as c
    FROM discovered_posts d
    LEFT JOIN source_accounts s ON d.source_account_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (options.status) {
    sql += ' AND d.status = ?';
    params.push(options.status);
  }
  if (options.pageId) {
    sql += ' AND (s.page_id = ? OR s.group_id IN (SELECT group_id FROM page_group_members WHERE page_id = ? AND is_active = 1))';
    params.push(options.pageId, options.pageId);
  }
  if (options.groupId) {
    sql += ' AND s.group_id = ?';
    params.push(options.groupId);
  }
  if (options.sourceAccountId) {
    sql += ' AND d.source_account_id = ?';
    params.push(options.sourceAccountId);
  }

  const row = getDb().prepare(sql).get(...params);
  return row ? row.c : 0;
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
    sql += ' AND (s.page_id = ? OR s.group_id IN (SELECT group_id FROM page_group_members WHERE page_id = ? AND is_active = 1))';
    params.push(options.pageId, options.pageId);
  }
  if (options.groupId) {
    sql += ' AND s.group_id = ?';
    params.push(options.groupId);
  }
  if (options.sourceAccountId) {
    sql += ' AND d.source_account_id = ?';
    params.push(options.sourceAccountId);
  }

  sql += ' ORDER BY d.id DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
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
      telegram_message_id, origin_job_id, hook_headline, created_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.origin_job_id || null,
    data.hook_headline || '',
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
    'telegram_message_id', 'published_at',
    'story_ig_media_id', 'story_published_at', 'story_status',
    'hook_headline', 'edited_media_path', 'edit_theme', 'edit_meta',
    'origin_job_id'
  ];

  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      if ((k === 'media_paths' || k === 'edit_meta') && typeof data[k] !== 'string') {
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

function addJobEvent({ jobId, stage, status = 'started', message = '', meta = {} }) {
  const metaJson = typeof meta === 'string' ? meta : JSON.stringify(meta || {});
  const now = new Date().toISOString();
  const stmt = getDb().prepare(`
    INSERT INTO job_events (job_id, stage, status, message, meta_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(jobId, stage, status, message || '', metaJson, now);
  return { id: Number(info.lastInsertRowid), jobId, stage, status, message, meta, created_at: now };
}

function getJobEvents(jobId) {
  return getDb().prepare(`
    SELECT * FROM job_events WHERE job_id = ? ORDER BY id ASC
  `).all(jobId).map(e => {
    try { e.meta = JSON.parse(e.meta_json || '{}'); } catch (_) { e.meta = {}; }
    return e;
  });
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
  if (options.telegramOnly) {
    sql += " AND j.telegram_chat_id IS NOT NULL AND j.telegram_chat_id != ''";
  }
  if (options.hasMedia) {
    sql += " AND j.media_paths IS NOT NULL AND j.media_paths != '[]' AND j.media_paths != ''";
  }
  if (options.search) {
    sql += ' AND (j.caption LIKE ? OR j.shortcode LIKE ? OR j.permalink LIKE ? OR j.source_url LIKE ? OR p.handle LIKE ? OR p.slug LIKE ? OR j.ig_media_id LIKE ?)';
    const sTerm = `%${options.search}%`;
    params.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  sql += ' ORDER BY j.id DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  return getDb().prepare(sql).all(...params);
}

function countPublishJobs(options = {}) {
  let sql = `
    SELECT count(*) as c
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
  if (options.telegramOnly) {
    sql += " AND j.telegram_chat_id IS NOT NULL AND j.telegram_chat_id != ''";
  }
  if (options.hasMedia) {
    sql += " AND j.media_paths IS NOT NULL AND j.media_paths != '[]' AND j.media_paths != ''";
  }
  if (options.search) {
    sql += ' AND (j.caption LIKE ? OR j.shortcode LIKE ? OR j.permalink LIKE ? OR j.source_url LIKE ? OR p.handle LIKE ? OR p.slug LIKE ? OR j.ig_media_id LIKE ?)';
    const sTerm = `%${options.search}%`;
    params.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  const row = getDb().prepare(sql).get(...params);
  return row ? row.c : 0;
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

// Global & Page-specific Publishing Statistics across channels & agents
function getGlobalPublishingStats(filterPageId = null) {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const pId = filterPageId ? parseInt(filterPageId, 10) : null;

  // 1. Overall counts (respecting filterPageId if provided)
  const pubTodaySql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND published_at >= ? AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND published_at >= ?`;
  const publishedToday = (pId
    ? db.prepare(pubTodaySql).get(todayIso, pId)
    : db.prepare(pubTodaySql).get(todayIso))?.c || 0;

  const pubAllTimeSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status = 'published'`;
  const publishedAllTime = (pId
    ? db.prepare(pubAllTimeSql).get(pId)
    : db.prepare(pubAllTimeSql).get())?.c || 0;

  const inFlightSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status IN ('queued', 'downloading', 'ready', 'publishing') AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status IN ('queued', 'downloading', 'ready', 'publishing')`;
  const activeInFlight = (pId
    ? db.prepare(inFlightSql).get(pId)
    : db.prepare(inFlightSql).get())?.c || 0;

  const failedSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status = 'failed' AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status = 'failed'`;
  const failedCount = (pId
    ? db.prepare(failedSql).get(pId)
    : db.prepare(failedSql).get())?.c || 0;

  // Total all-time jobs processed in system
  const totalJobsSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs`;
  const totalJobs = (pId
    ? db.prepare(totalJobsSql).get(pId)
    : db.prepare(totalJobsSql).get())?.c || 0;

  // Total scraped candidate reels from competitor tracking
  const scrapedSql = pId
    ? `SELECT count(*) as c FROM discovered_posts dp JOIN source_accounts sa ON dp.source_account_id = sa.id WHERE sa.page_id = ?`
    : `SELECT count(*) as c FROM discovered_posts`;
  const totalScraped = (pId
    ? db.prepare(scrapedSql).get(pId)
    : db.prepare(scrapedSql).get())?.c || 0;

  // Published breakdown by agent
  const pubReposterSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND agent = 'reposter' AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND agent = 'reposter'`;
  const publishedReposter = (pId
    ? db.prepare(pubReposterSql).get(pId)
    : db.prepare(pubReposterSql).get())?.c || 0;

  const pubWatchtowerSql = pId
    ? `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND agent = 'watchtower' AND page_id = ?`
    : `SELECT count(*) as c FROM publish_jobs WHERE status = 'published' AND agent = 'watchtower'`;
  const publishedWatchtower = (pId
    ? db.prepare(pubWatchtowerSql).get(pId)
    : db.prepare(pubWatchtowerSql).get())?.c || 0;

  // 2. Breakdown by Origin
  const telegramCount = db.prepare(`
    SELECT count(*) as c FROM publish_jobs
    WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != ''
  `).get()?.c || 0;

  const watchtowerCount = db.prepare(`
    SELECT count(*) as c FROM publish_jobs
    WHERE agent = 'watchtower'
  `).get()?.c || 0;

  const webCount = db.prepare(`
    SELECT count(*) as c FROM publish_jobs
    WHERE (telegram_chat_id IS NULL OR telegram_chat_id = '') AND (agent != 'watchtower' OR agent IS NULL)
  `).get()?.c || 0;

  // 3. Multi-Page Quota Matrix
  const pages = db.prepare('SELECT id, slug, name, handle, daily_quota, is_active FROM pages ORDER BY id ASC').all();
  const pageMatrix = pages.map(p => {
    const todayCount = getPublishedCountToday(p.id);
    const allTimeCount = db.prepare("SELECT count(*) as c FROM publish_jobs WHERE page_id = ? AND status = 'published'").get(p.id)?.c || 0;
    const lastPublishedAt = getLastPublishedTimestamp(p.id);
    const quota = p.daily_quota || 3;
    const quotaPercent = Math.min(100, Math.round((todayCount / quota) * 100));

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      handle: p.handle || `@${p.slug}`,
      daily_quota: quota,
      today_published_count: todayCount,
      all_time_published: allTimeCount,
      last_published_at: lastPublishedAt,
      quota_percent: quotaPercent,
      is_active: Boolean(p.is_active)
    };
  });

  return {
    published_today: publishedToday,
    published_all_time: publishedAllTime,
    published_combined: publishedAllTime,
    published_reposter: publishedReposter,
    published_watchtower: publishedWatchtower,
    total_scraped: totalScraped,
    live_on_instagram: publishedAllTime,
    total_reels: totalJobs,
    active_in_flight: activeInFlight,
    failed_count: failedCount,
    origins: {
      telegram: telegramCount,
      watchtower: watchtowerCount,
      web: webCount
    },
    pages: pageMatrix
  };
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

  // 4. Jobs by status (strictly for Watchtower agent)
  const jobParams = ['watchtower'];
  let pageJobClause = ' WHERE agent = ?';
  if (pId) {
    pageJobClause += ' AND page_id = ?';
    jobParams.push(pId);
  }

  // 5. Downloaded Media (media_paths populated and not empty, strictly for Watchtower agent)
  let dlSql = `
    SELECT count(*) as c FROM publish_jobs
    WHERE agent = 'watchtower' AND media_paths IS NOT NULL AND media_paths != '[]' AND media_paths != ''
  `;
  const dlParams = [];
  if (pId) {
    dlSql += ' AND page_id = ?';
    dlParams.push(pId);
  }
  const downloadedCount = db.prepare(dlSql).get(...dlParams)?.c || 0;

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
    downloaded: downloadedCount,
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

  // Count jobs that have downloaded media files ready locally
  let dlSql = `
    SELECT count(*) as c FROM publish_jobs
    WHERE agent = 'reposter' AND media_paths IS NOT NULL AND media_paths != '[]' AND media_paths != ''
  `;
  const dlParams = [];
  if (pId) {
    dlSql += ' AND page_id = ?';
    dlParams.push(pId);
  }
  const downloadedCount = db.prepare(dlSql).get(...dlParams)?.c || 0;

  return {
    pageId: pId,
    ingested: totalIngested,
    downloaded: downloadedCount,
    ready: counts.ready + counts.publishing + counts.pending_review,
    published: counts.published,
    failed: counts.failed
  };
}

function getPostsCountInWindow(pageId, windowStartIso) {
  const row = getDb().prepare(`
    SELECT count(*) as c FROM publish_jobs
    WHERE page_id = ? AND agent = 'watchtower'
      AND status IN ('published', 'publishing')
      AND (published_at >= ? OR created_at >= ?)
  `).get(pageId, windowStartIso, windowStartIso);
  return row ? row.c : 0;
}

// ─────────────────────────────────────────────────────────────
// v8 Page Groups Operations (Distribution Networks)
// ─────────────────────────────────────────────────────────────

function createPageGroup(data) {
  const now = new Date().toISOString();
  const slug = (data.slug || data.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  const stmt = getDb().prepare(`
    INSERT INTO page_groups (
      slug, name, description, niche, cross_post_mode,
      cross_post_delay_min, cross_post_delay_max, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    slug,
    data.name.trim(),
    data.description || '',
    data.niche || '',
    data.cross_post_mode || 'auto',
    data.cross_post_delay_min !== undefined ? data.cross_post_delay_min : 20,
    data.cross_post_delay_max !== undefined ? data.cross_post_delay_max : 45,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    now,
    now
  );
  return getPageGroupById(info.lastInsertRowid);
}

function updatePageGroup(id, data) {
  const group = getPageGroupById(id);
  if (!group) throw new Error(`Group #${id} not found`);

  const fields = [];
  const params = [];
  const allowed = [
    'slug', 'name', 'description', 'niche', 'cross_post_mode',
    'cross_post_delay_min', 'cross_post_delay_max', 'is_active'
  ];

  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(typeof data[k] === 'boolean' ? (data[k] ? 1 : 0) : data[k]);
    }
  }

  if (fields.length === 0) return group;
  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  getDb().prepare(`UPDATE page_groups SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getPageGroupById(id);
}

function deletePageGroup(id) {
  const db = getDb();
  try { db.prepare('DELETE FROM page_group_members WHERE group_id = ?').run(id); } catch (e) {}
  try { db.prepare('UPDATE source_accounts SET group_id = NULL WHERE group_id = ?').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM distribution_targets WHERE distribution_job_id IN (SELECT id FROM distribution_jobs WHERE group_id = ?)').run(id); } catch (e) {}
  try { db.prepare('DELETE FROM distribution_jobs WHERE group_id = ?').run(id); } catch (e) {}
  return db.prepare('DELETE FROM page_groups WHERE id = ?').run(id);
}

function getGroupMemberCount(groupId) {
  const row = getDb().prepare('SELECT count(*) as c FROM page_group_members WHERE group_id = ? AND is_active = 1').get(groupId);
  return row ? row.c : 0;
}

function getGroupSourceCount(groupId) {
  const row = getDb().prepare('SELECT count(*) as c FROM source_accounts WHERE group_id = ? AND is_active = 1').get(groupId);
  return row ? row.c : 0;
}

function getPageGroups(options = {}) {
  let sql = 'SELECT * FROM page_groups WHERE 1=1';
  const params = [];
  if (options.isActiveOnly) {
    sql += ' AND is_active = 1';
  }
  if (options.niche) {
    sql += ' AND niche = ?';
    params.push(options.niche);
  }
  sql += ' ORDER BY id ASC';
  const groups = getDb().prepare(sql).all(...params);
  return groups.map(g => ({
    ...g,
    member_count: getGroupMemberCount(g.id),
    source_count: getGroupSourceCount(g.id)
  }));
}

function getPageGroupById(id) {
  const g = getDb().prepare('SELECT * FROM page_groups WHERE id = ?').get(id);
  if (!g) return null;
  return {
    ...g,
    member_count: getGroupMemberCount(g.id),
    source_count: getGroupSourceCount(g.id)
  };
}

function getPageGroupBySlug(slug) {
  const g = getDb().prepare('SELECT * FROM page_groups WHERE slug = ?').get(slug);
  if (!g) return null;
  return {
    ...g,
    member_count: getGroupMemberCount(g.id),
    source_count: getGroupSourceCount(g.id)
  };
}

// ─────────────────────────────────────────────────────────────
// v8 Group Membership Operations
// ─────────────────────────────────────────────────────────────

function addPageToGroup(groupId, pageId, options = {}) {
  const stmt = getDb().prepare(`
    INSERT INTO page_group_members (group_id, page_id, role, priority, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(group_id, page_id) DO UPDATE SET
      role = excluded.role,
      priority = excluded.priority,
      is_active = excluded.is_active
  `);
  stmt.run(
    groupId,
    pageId,
    options.role || 'member',
    options.priority !== undefined ? options.priority : 0,
    options.is_active !== undefined ? (options.is_active ? 1 : 0) : 1,
    new Date().toISOString()
  );
  return getGroupMembers(groupId);
}

function removePageFromGroup(groupId, pageId) {
  return getDb().prepare('DELETE FROM page_group_members WHERE group_id = ? AND page_id = ?').run(groupId, pageId);
}

function getGroupMembers(groupId) {
  return getDb().prepare(`
    SELECT m.*, p.slug as page_slug, p.name as page_name, p.handle as page_handle,
           p.ig_user_id, p.daily_quota, p.is_active as page_is_active,
           p.post_mode, p.template_slug, p.access_token
    FROM page_group_members m
    JOIN pages p ON m.page_id = p.id
    WHERE m.group_id = ?
    ORDER BY m.priority ASC, m.id ASC
  `).all(groupId);
}

function getPageGroupsForPage(pageId) {
  return getDb().prepare(`
    SELECT g.*, m.role, m.priority, m.is_active as membership_is_active
    FROM page_groups g
    JOIN page_group_members m ON g.id = m.group_id
    WHERE m.page_id = ?
    ORDER BY g.id ASC
  `).all(pageId);
}

// ─────────────────────────────────────────────────────────────
// v8 Distribution Jobs & Targets Operations
// ─────────────────────────────────────────────────────────────

function createDistributionJob(data) {
  const now = new Date().toISOString();
  const stmt = getDb().prepare(`
    INSERT INTO distribution_jobs (
      origin_job_id, origin_page_id, group_id, shortcode, source_url,
      status, total_targets, completed_targets, failed_targets, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.origin_job_id || null,
    data.origin_page_id,
    data.group_id || null,
    data.shortcode,
    data.source_url,
    data.status || 'pending',
    data.total_targets || 0,
    0,
    0,
    now
  );
  return getDistributionJobById(info.lastInsertRowid);
}

function getDistributionJobById(id) {
  const job = getDb().prepare(`
    SELECT dj.*, op.name as origin_page_name, op.handle as origin_page_handle,
           pg.name as group_name, pg.slug as group_slug
    FROM distribution_jobs dj
    LEFT JOIN pages op ON dj.origin_page_id = op.id
    LEFT JOIN page_groups pg ON dj.group_id = pg.id
    WHERE dj.id = ?
  `).get(id);
  if (!job) return null;
  job.targets = getDistributionTargets(id);
  return job;
}

function updateDistributionJob(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['status', 'total_targets', 'completed_targets', 'failed_targets', 'completed_at'];

  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(data[k]);
    }
  }
  if (fields.length === 0) return getDistributionJobById(id);
  params.push(id);
  getDb().prepare(`UPDATE distribution_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getDistributionJobById(id);
}

function listDistributionJobs(options = {}) {
  let sql = `
    SELECT dj.*, op.name as origin_page_name, op.handle as origin_page_handle,
           pg.name as group_name, pg.slug as group_slug
    FROM distribution_jobs dj
    LEFT JOIN pages op ON dj.origin_page_id = op.id
    LEFT JOIN page_groups pg ON dj.group_id = pg.id
    WHERE 1=1
  `;
  const params = [];
  if (options.status) {
    sql += ' AND dj.status = ?';
    params.push(options.status);
  }
  if (options.groupId) {
    sql += ' AND dj.group_id = ?';
    params.push(options.groupId);
  }
  if (options.originPageId) {
    sql += ' AND dj.origin_page_id = ?';
    params.push(options.originPageId);
  }
  sql += ' ORDER BY dj.id DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  const jobs = getDb().prepare(sql).all(...params);
  for (const j of jobs) {
    j.targets = getDistributionTargets(j.id);
  }
  return jobs;
}

function createDistributionTarget(data) {
  const stmt = getDb().prepare(`
    INSERT INTO distribution_targets (
      distribution_job_id, target_page_id, publish_job_id, status,
      scheduled_at, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.distribution_job_id,
    data.target_page_id,
    data.publish_job_id || null,
    data.status || 'queued',
    data.scheduled_at || null,
    data.error || '',
    new Date().toISOString()
  );
  return getDb().prepare('SELECT * FROM distribution_targets WHERE id = ?').get(info.lastInsertRowid);
}

function updateDistributionTarget(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['publish_job_id', 'status', 'scheduled_at', 'error'];
  for (const k of allowed) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(data[k]);
    }
  }
  if (fields.length === 0) return getDb().prepare('SELECT * FROM distribution_targets WHERE id = ?').get(id);
  params.push(id);
  getDb().prepare(`UPDATE distribution_targets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getDb().prepare('SELECT * FROM distribution_targets WHERE id = ?').get(id);
}

function getDistributionTargets(distributionJobId) {
  return getDb().prepare(`
    SELECT dt.*, p.name as target_page_name, p.handle as target_page_handle,
           p.slug as target_page_slug, pj.status as publish_job_status,
           pj.permalink, pj.ig_media_id
    FROM distribution_targets dt
    JOIN pages p ON dt.target_page_id = p.id
    LEFT JOIN publish_jobs pj ON dt.publish_job_id = pj.id
    WHERE dt.distribution_job_id = ?
    ORDER BY dt.id ASC
  `).all(distributionJobId);
}

function getPendingDistributionTargets(dueBeforeIso = null) {
  const due = dueBeforeIso || new Date().toISOString();
  return getDb().prepare(`
    SELECT dt.*, dj.shortcode, dj.source_url, dj.origin_page_id, dj.origin_job_id,
           p.slug as target_page_slug, p.handle as target_page_handle, p.daily_quota,
           p.template_slug
    FROM distribution_targets dt
    JOIN distribution_jobs dj ON dt.distribution_job_id = dj.id
    JOIN pages p ON dt.target_page_id = p.id
    WHERE dt.status = 'scheduled' AND dt.scheduled_at <= ?
    ORDER BY dt.scheduled_at ASC
  `).all(due);
}

// ─────────────────────────────────────────────────────────────
// v8 Page Templates Operations
// ─────────────────────────────────────────────────────────────

function upsertPageTemplate(data) {
  const now = new Date().toISOString();
  const stmt = getDb().prepare(`
    INSERT INTO page_templates (
      page_id, template_type, primary_color, accent_color, background_color,
      font_family, logo_path, avatar_path, watermark_text, frame_style,
      story_template, custom_css, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(page_id, template_type) DO UPDATE SET
      primary_color = excluded.primary_color,
      accent_color = excluded.accent_color,
      background_color = excluded.background_color,
      font_family = excluded.font_family,
      logo_path = excluded.logo_path,
      avatar_path = excluded.avatar_path,
      watermark_text = excluded.watermark_text,
      frame_style = excluded.frame_style,
      story_template = excluded.story_template,
      custom_css = excluded.custom_css,
      updated_at = excluded.updated_at
  `);
  stmt.run(
    data.page_id,
    data.template_type || 'default',
    data.primary_color || '#FFFFFF',
    data.accent_color || '#00FF66',
    data.background_color || '#0D0D12',
    data.font_family || 'Inter',
    data.logo_path || '',
    data.avatar_path || '',
    data.watermark_text || '',
    data.frame_style || 'card',
    data.story_template || 'editorial',
    data.custom_css || '',
    now,
    now
  );
  return getPageTemplate(data.page_id, data.template_type || 'default');
}

function getPageTemplate(pageId, templateType = 'default') {
  return getDb().prepare('SELECT * FROM page_templates WHERE page_id = ? AND template_type = ?').get(pageId, templateType);
}

function listPageTemplates(pageId) {
  return getDb().prepare('SELECT * FROM page_templates WHERE page_id = ?').all(pageId);
}

function deletePageTemplate(id) {
  return getDb().prepare('DELETE FROM page_templates WHERE id = ?').run(id);
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
  countDiscoveredPosts,
  // Publish Jobs
  getPublishJobById,
  getPublishJob,
  createPublishJob,
  updatePublishJob,
  listPublishJobs,
  countPublishJobs,
  addJobEvent,
  getJobEvents,
  getPublishedCountToday,
  getLastPublishedTimestamp,
  getPostsCountInWindow,
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
  getReposterPipelineSummary,
  getGlobalPublishingStats,
  // v8 Distribution Networks
  createPageGroup,
  updatePageGroup,
  deletePageGroup,
  getPageGroups,
  getPageGroupById,
  getPageGroupBySlug,
  addPageToGroup,
  removePageFromGroup,
  getGroupMembers,
  getPageGroupsForPage,
  createDistributionJob,
  getDistributionJobById,
  updateDistributionJob,
  listDistributionJobs,
  createDistributionTarget,
  updateDistributionTarget,
  getDistributionTargets,
  getPendingDistributionTargets,
  // v8 Page Templates
  upsertPageTemplate,
  getPageTemplate,
  listPageTemplates,
  deletePageTemplate
};
