const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function runMigration() {
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'database.sqlite');

  console.log(`[Migration v7] Connecting to database at: ${dbPath}`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF'); // temporary for migration

  console.log('[Migration v7] Creating v7 schema tables if not exist...');

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
  `);

  console.log('[Migration v7] Tables verified.');

  // Check if legacy connected_pages exists
  const hasConnectedPages = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='connected_pages'").get().count > 0;
  if (hasConnectedPages) {
    const legacyPages = db.prepare('SELECT * FROM connected_pages').all();
    console.log(`[Migration v7] Migrating ${legacyPages.length} connected_pages to pages...`);
    const insertPage = db.prepare(`
      INSERT OR IGNORE INTO pages (
        id, slug, name, handle, ig_user_id, access_token, caption_template,
        default_hashtags, attribution_enabled, watermark_enabled, post_mode,
        posts_per_cycle, daily_quota, min_spacing_minutes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of legacyPages) {
      insertPage.run(
        p.id,
        p.slug,
        p.name || p.slug,
        p.handle || `@${p.slug}`,
        p.meta_ig_user_id || '',
        p.meta_page_token || '',
        p.attribution_template || '{caption}\n\n{attribution}\n\n{hashtags}',
        '', // default_hashtags
        1,  // attribution_enabled
        0,  // watermark_enabled
        p.autopilot_enabled === 1 ? 'auto' : 'review',
        1,  // posts_per_cycle
        p.daily_quota || 3,
        60, // min_spacing_minutes
        p.is_active !== undefined ? p.is_active : 1,
        p.created_at || new Date().toISOString(),
        p.updated_at || new Date().toISOString()
      );
    }
  }

  // Ensure fallback GTA6 page exists if pages is empty
  const pageCount = db.prepare('SELECT count(*) as count FROM pages').get().count;
  if (pageCount === 0) {
    console.log('[Migration v7] Seeding default GTA6 page...');
    db.prepare(`
      INSERT INTO pages (
        slug, name, handle, ig_user_id, access_token, caption_template,
        default_hashtags, attribution_enabled, watermark_enabled, post_mode,
        posts_per_cycle, daily_quota, min_spacing_minutes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'gta6',
      'GTA 6 Updates 007',
      '@gta6_updates_007',
      '17841428668115319',
      'IGAAYJvfGkRZCRBZAFpwZAU9uWkpsZA0E4S2g1QVVJd3hhZA09mODVfblQ1ZAU1lMUlRcmc0eTJWQ3dEblQwc052Vkh0N1o1eEV4UUR4aTRZAdU5JbVd3b3h4S2tYOGhWbGlpMUVQY29SUnBZAUGN4NkxVSHRHTU0weWZA5TG43ZAFZAad01QZAwZDZD',
      '{caption}\n\n{attribution}\n\n{hashtags}',
      '#GTA6 #RockstarGames #GTAViceCity #GamingNews #Gamer',
      1,
      0,
      'auto',
      1,
      3,
      60,
      1,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  // Migrate tracked_instagram_channels -> source_accounts
  const hasTrackedChannels = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='tracked_instagram_channels'").get().count > 0;
  if (hasTrackedChannels) {
    const legacyChannels = db.prepare('SELECT * FROM tracked_instagram_channels').all();
    console.log(`[Migration v7] Migrating ${legacyChannels.length} tracked channels to source_accounts...`);
    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO source_accounts (
        id, username, page_id, is_active, health, consecutive_failures,
        last_error, last_checked_at, last_new_post_at, synced_posts_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pages = db.prepare('SELECT id, slug FROM pages').all();
    const pageMap = new Map(pages.map(p => [p.slug, p.id]));
    const defaultPageId = pages[0]?.id || 1;

    for (const c of legacyChannels) {
      const destSlug = c.destination_account || 'gta6';
      const pageId = pageMap.get(destSlug) || defaultPageId;
      insertSource.run(
        c.id,
        c.username.replace(/^@/, '').toLowerCase().trim(),
        pageId,
        c.is_active !== undefined ? c.is_active : 1,
        'ok',
        0,
        '',
        c.last_scraped_at || null,
        null,
        c.synced_posts_count || 0,
        c.created_at || new Date().toISOString()
      );
    }
  }

  // Migrate published posts from instagram_posts -> publish_jobs
  const hasInstagramPosts = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='instagram_posts'").get().count > 0;
  if (hasInstagramPosts) {
    const publishedPosts = db.prepare("SELECT * FROM instagram_posts WHERE status = 'published' AND ig_permalink IS NOT NULL").all();
    console.log(`[Migration v7] Migrating ${publishedPosts.length} published posts to publish_jobs...`);
    const insertJob = db.prepare(`
      INSERT OR IGNORE INTO publish_jobs (
        agent, page_id, discovered_post_id, shortcode, source_url, media_type,
        media_paths, caption, status, current_step, attempts, error,
        ig_media_id, permalink, telegram_chat_id, telegram_message_id, created_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pages = db.prepare('SELECT id, slug FROM pages').all();
    const pageMap = new Map(pages.map(p => [p.slug, p.id]));
    const defaultPageId = pages[0]?.id || 1;

    for (const p of publishedPosts) {
      const pageId = pageMap.get(p.destination_account || 'gta6') || defaultPageId;
      // Extract shortcode from deliverable_url or permalink or generate fallback
      let sc = 'imported_' + p.id;
      const m1 = (p.deliverable_url || '').match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      const m2 = (p.ig_permalink || '').match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (m1) sc = m1[1];
      else if (m2) sc = m2[1];

      const agent = (p.origin_source || '').startsWith('channel:') ? 'watchtower' : 'reposter';

      insertJob.run(
        agent,
        pageId,
        null,
        sc,
        p.deliverable_url || p.ig_permalink || '',
        p.content_type || 'reel',
        p.media_urls || '[]',
        p.caption || p.hook_text || '',
        'published',
        'live',
        1,
        '',
        p.ig_media_id || '',
        p.ig_permalink || '',
        '',
        '',
        p.created_at || new Date().toISOString(),
        p.published_at || p.created_at || new Date().toISOString()
      );
    }
  }

  // Migrate autonomous_ingestion_log shortcodes to discovered_posts so they are not re-discovered
  const hasIngestionLog = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='autonomous_ingestion_log'").get().count > 0;
  if (hasIngestionLog) {
    const logs = db.prepare("SELECT * FROM autonomous_ingestion_log").all();
    console.log(`[Migration v7] Migrating ${logs.length} ingestion logs to discovered_posts...`);
    const insertDiscovered = db.prepare(`
      INSERT OR IGNORE INTO discovered_posts (
        source_account_id, run_id, shortcode, url, media_type, caption,
        like_count, comment_count, view_count, posted_at, score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of logs) {
      let st = 'new';
      if (l.status === 'published') st = 'published';
      else if (l.status === 'rejected') st = 'skipped';
      else if (l.status === 'staged') st = 'pending_review';

      insertDiscovered.run(
        l.channel_id || null,
        null,
        l.shortcode,
        l.source_post_url || `https://www.instagram.com/p/${l.shortcode}/`,
        l.content_type || 'reel',
        l.raw_caption || l.repurposed_caption || '',
        0, 0, 0,
        null,
        (l.llm_fit_score || 0) / 100,
        st,
        l.created_at || new Date().toISOString()
      );
    }
  }

  // Update settings defaults
  const setSetting = (k, v) => {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, v);
  };
  const getSetting = (k) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    return row ? row.value : null;
  };

  if (!getSetting('telegram_allowed_chat_ids')) {
    setSetting('telegram_allowed_chat_ids', '5443723531');
  }
  if (!getSetting('watchtower_paused')) {
    setSetting('watchtower_paused', '0');
  }
  if (!getSetting('watchtower_interval_hours')) {
    setSetting('watchtower_interval_hours', '3');
  }
  if (!getSetting('media_retention_hours')) {
    setSetting('media_retention_hours', '48');
  }
  if (!getSetting('mode')) {
    setSetting('mode', 'live');
  }

  db.pragma('foreign_keys = ON');

  console.log('\n[Migration v7] Migration completed successfully!');
  console.log('--------------------------------------------------');
  console.log(`Pages:            ${db.prepare('SELECT count(*) as c FROM pages').get().c}`);
  console.log(`Source Accounts:  ${db.prepare('SELECT count(*) as c FROM source_accounts').get().c}`);
  console.log(`Discovered Posts: ${db.prepare('SELECT count(*) as c FROM discovered_posts').get().c}`);
  console.log(`Publish Jobs:     ${db.prepare('SELECT count(*) as c FROM publish_jobs').get().c}`);
  console.log(`Agent Runs:       ${db.prepare('SELECT count(*) as c FROM agent_runs').get().c}`);
  console.log('--------------------------------------------------\n');

  db.close();
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
