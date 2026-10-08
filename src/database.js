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

  // Enable Write-Ahead Logging (WAL) for high concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedInitialData(db);

  return db;
}

function initSchema(db) {
  db.exec(`
    -- 1. Research Campaigns
    CREATE TABLE IF NOT EXISTS research_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      niche TEXT,
      summary TEXT,
      key_insights TEXT, -- JSON array
      code_snippets TEXT, -- JSON array
      mermaid_diagram TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL
    );

    -- 2. Deliverable Documents
    CREATE TABLE IF NOT EXISTS deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      markdown_content TEXT NOT NULL,
      public_url TEXT NOT NULL,
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(campaign_id) REFERENCES research_campaigns(id) ON DELETE SET NULL
    );

    -- 3. Media Assets & Reel Content
    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deliverable_id INTEGER,
      hook_text TEXT NOT NULL,
      script_text TEXT NOT NULL,
      trigger_keyword TEXT NOT NULL,
      caption TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      thumbnail_url TEXT,
      aspect_ratio TEXT DEFAULT '9:16',
      generation_engine TEXT DEFAULT 'nano_banana',
      created_at TEXT NOT NULL,
      FOREIGN KEY(deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL
    );

    -- 4. Internal Matrix & Bridge Audit Log ("Virtual Sheet")
    CREATE TABLE IF NOT EXISTS deliverables_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_asset_id INTEGER,
      deliverable_id INTEGER,
      topic TEXT NOT NULL,
      lead_magnet_title TEXT NOT NULL,
      trigger_keyword TEXT NOT NULL,
      deliverable_url TEXT NOT NULL,
      ig_media_id TEXT,
      ig_permalink TEXT,
      caption TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- draft, generating, published, armed
      instaauto_rule_id INTEGER,
      instaauto_response TEXT,
      created_at TEXT NOT NULL,
      armed_at TEXT,
      FOREIGN KEY(media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
      FOREIGN KEY(deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL
    );

    -- 5. Global Settings & API Keys
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- 6. Instagram Posts Queue & History (v3.0)
    CREATE TABLE IF NOT EXISTS instagram_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      deliverable_id INTEGER,
      content_type TEXT NOT NULL DEFAULT 'carousel',
      status TEXT NOT NULL DEFAULT 'ready_to_post',
      hook_text TEXT NOT NULL,
      caption TEXT NOT NULL,
      trigger_keyword TEXT NOT NULL,
      trending_song_title TEXT,
      trending_song_artist TEXT,
      trending_song_audio_url TEXT,
      audio_vibe TEXT,
      media_urls TEXT NOT NULL,
      thumbnail_url TEXT,
      deliverable_url TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      ig_media_id TEXT,
      ig_permalink TEXT,
      scheduled_at TEXT,
      published_at TEXT,
      instaauto_rule_id INTEGER,
      instaauto_status TEXT DEFAULT 'pending',
      dms_delivered_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(campaign_id) REFERENCES research_campaigns(id) ON DELETE SET NULL,
      FOREIGN KEY(deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL
    );

    -- 7. Tracked Instagram Channels (Channel Tracker & Ingestion Engine)
    CREATE TABLE IF NOT EXISTS tracked_instagram_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      profile_url TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      followers_count TEXT DEFAULT '0',
      following_count TEXT DEFAULT '0',
      posts_count TEXT DEFAULT '0',
      avatar_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      last_scraped_at TEXT,
      last_post_shortcode TEXT,
      synced_posts_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 8. Autonomous Ingestion, Ranking & Auto-Publish Log (v4.0)
    CREATE TABLE IF NOT EXISTS autonomous_ingestion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER,
      channel_username TEXT NOT NULL,
      source_post_url TEXT NOT NULL,
      shortcode TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL, -- reel, carousel, photo
      downloaded_media_paths TEXT NOT NULL, -- JSON array of local file paths
      raw_caption TEXT,
      raw_hook TEXT,
      
      -- AI Evaluation & Ranking
      llm_fit_score INTEGER DEFAULT 0,
      llm_decision TEXT DEFAULT 'PENDING', -- APPROVED, REJECTED, NEEDS_REVIEW
      llm_reasoning TEXT,
      detected_topic TEXT,
      detected_trigger_keyword TEXT,

      -- Brand Cleansing Audit
      discarded_tags TEXT, -- JSON array of removed competitor handles (e.g. ["@the.natasha.ai"])
      cleaned_media_paths TEXT, -- JSON array of re-branded media files with our logo

      -- Lead Magnet & DM Harvester
      harvested_deliverable_url TEXT,
      harvested_deliverable_type TEXT,
      dm_comment_posted INTEGER DEFAULT 0,
      dm_response_received INTEGER DEFAULT 0,
      
      -- Transformed Content
      repurposed_hook TEXT,
      repurposed_caption TEXT,
      selected_song_title TEXT,
      selected_song_artist TEXT,
      selected_song_audio_url TEXT,
      
      -- Publishing Status
      status TEXT DEFAULT 'ingested', -- ingested, ranked, cleansed, harvesting, staged, publishing, published, rejected
      ig_media_id TEXT,
      ig_permalink TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      
      FOREIGN KEY(channel_id) REFERENCES tracked_instagram_channels(id) ON DELETE CASCADE
    );

    -- 9. Mobile-First Share-to-DM Triggers Table (v4.0)
    CREATE TABLE IF NOT EXISTS mobile_dm_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_handle TEXT NOT NULL,
      source_post_url TEXT NOT NULL,
      shortcode TEXT NOT NULL,
      thread_id TEXT,
      message_id TEXT,
      processing_status TEXT DEFAULT 'received', -- received, processing, published, rejected, error
      live_post_permalink TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    -- 10. Instagram Proxy / Relay Jobs Table (Hypothesis 2)
    CREATE TABLE IF NOT EXISTS instagram_relay_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relay_id TEXT UNIQUE NOT NULL,
      requester_ig_id TEXT NOT NULL,
      requester_username TEXT,
      target_shortcode TEXT NOT NULL,
      target_media_id TEXT,
      target_creator_id TEXT,
      target_creator_handle TEXT,
      detected_keyword TEXT NOT NULL,
      comment_posted_at TEXT,
      dm_received_at TEXT,
      extracted_links TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending_comment', -- pending_comment, commented, harvested, relayed, fallback
      retry_count INTEGER DEFAULT 0,
      relayed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_relay_creator ON instagram_relay_jobs(target_creator_id, status);
    CREATE INDEX IF NOT EXISTS idx_relay_shortcode ON instagram_relay_jobs(target_shortcode, status);

    -- 11. Instagram Automation Lifecycle Events Log
    CREATE TABLE IF NOT EXISTS instagram_automation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      event_type TEXT NOT NULL,
      ig_media_id TEXT,
      ig_permalink TEXT,
      trigger_keyword TEXT,
      resource_url TEXT,
      dm_message TEXT,
      rule_id INTEGER,
      status TEXT DEFAULT 'success',
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auto_event_post ON instagram_automation_events(post_id);
    CREATE INDEX IF NOT EXISTS idx_auto_event_type ON instagram_automation_events(event_type);

    -- 12. Connected Instagram Pages & Multi-Tenant Registry (v5.0)
    CREATE TABLE IF NOT EXISTS connected_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,             -- e.g. 'tech', 'gta6', 'politics', 'fitness'
      name TEXT NOT NULL,                    -- e.g. 'Tech News Daily AI', 'GTA 6 Updates 007'
      handle TEXT NOT NULL,                  -- e.g. '@technews_daily_ai'
      meta_page_token TEXT NOT NULL,         -- Meta Graph API System User / Page Access Token
      meta_ig_user_id TEXT NOT NULL,         -- Instagram Business Account ID
      niche TEXT NOT NULL DEFAULT 'tech',    -- 'tech', 'gaming', 'politics', 'finance', 'gadgets'
      workflow_type TEXT NOT NULL DEFAULT 'lead_magnet', -- 'lead_magnet', 'direct_repost', 'editorial'
      icon TEXT DEFAULT '📱',                -- Emoji for UI & Telegram buttons
      theme_color TEXT DEFAULT '#7C3AED',    -- Hex color for UI branding
      has_dm_automation INTEGER DEFAULT 1,   -- 1 = ManyChat Comment-to-DM Harvester, 0 = No DM harvesting
      custom_trigger_keyword TEXT DEFAULT 'PROJECT', -- Keyword users comment on OUR post
      lead_magnet_instructions TEXT,         -- Custom system prompt for caption generation
      instaauto_enabled INTEGER DEFAULT 1,
      instaauto_rule_template TEXT DEFAULT '{"follow_required": true, "reply_message": "Hey! Here is your requested link: {deliverable_url}"}',
      attribution_template TEXT DEFAULT '💡 Reel Source: @{author} | Follow @{my_handle} for daily updates!',
      autopilot_enabled INTEGER DEFAULT 0,
      daily_quota INTEGER DEFAULT 3,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_connected_pages_slug ON connected_pages(slug);
  `);

  // ─── v2.0, v3.0, v4.0 & v5.0 Schema Migration ─────────────────────────────
  const migrations = [
    "ALTER TABLE research_campaigns ADD COLUMN provider TEXT DEFAULT 'synthetic'",
    "ALTER TABLE research_campaigns ADD COLUMN model TEXT DEFAULT ''",
    "ALTER TABLE research_campaigns ADD COLUMN iterations INTEGER DEFAULT 1",
    "ALTER TABLE research_campaigns ADD COLUMN confidence_score REAL DEFAULT 0.85",
    "ALTER TABLE research_campaigns ADD COLUMN sources TEXT DEFAULT '[]'",
    "ALTER TABLE research_campaigns ADD COLUMN token_usage TEXT DEFAULT '{}'",
    "ALTER TABLE deliverables ADD COLUMN google_doc_id TEXT DEFAULT ''",
    "ALTER TABLE deliverables ADD COLUMN google_doc_url TEXT DEFAULT ''",
    "ALTER TABLE deliverables ADD COLUMN pdf_url TEXT DEFAULT ''",
    "ALTER TABLE deliverables_matrix ADD COLUMN content_type TEXT DEFAULT 'reel'",
    "ALTER TABLE deliverables_matrix ADD COLUMN thumbnail_url TEXT DEFAULT ''",
    "ALTER TABLE deliverables_matrix ADD COLUMN google_doc_url TEXT DEFAULT ''",
    "ALTER TABLE deliverables_matrix ADD COLUMN pdf_url TEXT DEFAULT ''",
    "ALTER TABLE deliverables_matrix ADD COLUMN provider TEXT DEFAULT ''",
    "ALTER TABLE deliverables_matrix ADD COLUMN confidence_score REAL DEFAULT 0.0",
    "ALTER TABLE tracked_instagram_channels ADD COLUMN niche_tag TEXT DEFAULT 'tech'",
    "ALTER TABLE tracked_instagram_channels ADD COLUMN auto_post_enabled INTEGER DEFAULT 0",
    "ALTER TABLE tracked_instagram_channels ADD COLUMN min_score_threshold INTEGER DEFAULT 75",
    "ALTER TABLE instagram_posts ADD COLUMN origin_source TEXT DEFAULT 'studio'",
    "ALTER TABLE autonomous_ingestion_log ADD COLUMN extracted_resources TEXT DEFAULT '[]'",
    "ALTER TABLE instagram_posts ADD COLUMN extracted_resources TEXT DEFAULT '[]'",
    "ALTER TABLE instagram_posts ADD COLUMN post_intent TEXT DEFAULT 'lead_magnet'",
    "ALTER TABLE autonomous_ingestion_log ADD COLUMN post_intent TEXT DEFAULT 'lead_magnet'",
    "ALTER TABLE autonomous_ingestion_log ADD COLUMN staged_post_id INTEGER",
    "ALTER TABLE instagram_posts ADD COLUMN destination_account TEXT DEFAULT 'gta6'",
    "ALTER TABLE autonomous_ingestion_log ADD COLUMN destination_account TEXT DEFAULT 'tech'",
    "ALTER TABLE tracked_instagram_channels ADD COLUMN destination_account TEXT DEFAULT 'tech'",
    "ALTER TABLE mobile_dm_triggers ADD COLUMN destination_account TEXT DEFAULT NULL",
    "ALTER TABLE mobile_dm_triggers ADD COLUMN connected_page_id INTEGER",
    "ALTER TABLE mobile_dm_triggers ADD COLUMN selected_workflow TEXT DEFAULT NULL",
    "ALTER TABLE mobile_dm_triggers ADD COLUMN telegram_message_id TEXT",
    "ALTER TABLE instagram_posts ADD COLUMN connected_page_id INTEGER",
    "ALTER TABLE tracked_instagram_channels ADD COLUMN connected_page_id INTEGER",
    "ALTER TABLE autonomous_ingestion_log ADD COLUMN connected_page_id INTEGER"
  ];

  for (const sql of migrations) {
    try { db.exec(sql); } catch (e) { /* Column already exists — safe to skip */ }
  }

  try {
    db.exec("UPDATE tracked_instagram_channels SET destination_account = 'gta6', niche_tag = 'gaming' WHERE username = 'gtaleaks' OR username LIKE '%gta%'");
    db.exec("UPDATE tracked_instagram_channels SET is_active = 1 WHERE is_active = 0 OR is_active IS NULL");
  } catch (e) {}
}

function getSetting(key, defaultValue = '') {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  getDb().prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

function seedInitialData(db) {
  // Check if settings are set
  const defaults = {
    mode: 'mock', // 'mock' or 'live'
    instaauto_bridge_url: 'http://localhost:3000/api/agent/bridge',
    nano_banana_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
    elevenlabs_api_key: '',
    meta_page_token: '',
    meta_ig_user_id: '17841400000000000',
    public_base_url: 'http://localhost:4000',
    // v2.0 & v4.0 — Multi-LLM Providers & Niche Intelligence
    claude_api_key: '',
    groq_api_key: '',
    ollama_endpoint: 'http://localhost:11434',
    default_provider: 'gemini',
    default_model: 'gemini-2.5-flash',
    niche_domain: 'AI Engineering & Hackathons',
    min_score_threshold: '70',
    failover_chain: 'gemini,claude,openai,groq,ollama',
    // v2.0 — Google Docs Integration
    google_client_id: '',
    google_client_secret: '',
    google_refresh_token: '',
    google_docs_enabled: 'false',
    google_docs_folder_id: '',
    // v2.0 — Image Generation
    imagen_api_key: '',
    image_engine: 'canvas',
    instagram_handle: '@harshparmar007__',
    // v2.0 — Content Types
    default_content_type: 'reel',
    public_media_url: 'http://localhost:4000',
    ngrok_url: '',
    // v3.5 — Brand & Creative Asset Studio
    brand_name: 'Omni Engineering & AI',
    brand_handle: '@harshparmar007__',
    brand_tagline: 'Handwritten Engineering Guides & Autonomous Notes',
    brand_logo_url: '/generated/assets/brand_logo.svg',
    brand_watermark_position: 'top-right',
    brand_watermark_opacity: '0.9',
    brand_primary_color: '#D97757',
    brand_accent_color: '#1A73E8',
    // Secondary Tech News Profile Credentials (Bot v2)
    tech_meta_page_token: '',
    tech_meta_ig_user_id: '',
    tech_instagram_handle: '@technews_daily_ai'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) {
    insertSetting.run(k, v);
  }

  // Seed tracked channels if empty
  const channelCount = db.prepare('SELECT count(*) as count FROM tracked_instagram_channels').get().count;
  if (channelCount === 0) {
    const insertChannel = db.prepare(`
      INSERT OR IGNORE INTO tracked_instagram_channels 
      (username, profile_url, display_name, bio, followers_count, following_count, posts_count, avatar_url, is_active, last_scraped_at, last_post_shortcode, synced_posts_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedTime = new Date().toISOString();
    insertChannel.run(
      'github',
      'https://www.instagram.com/github/',
      'GitHub',
      'The home for all developers. Sharing engineering workflows, open source, and AI coding tools.',
      '902K',
      '13',
      '1,336',
      'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      1,
      seedTime,
      'DdpgyGIgcQC',
      1,
      seedTime
    );
    insertChannel.run(
      'python.learning',
      'https://www.instagram.com/python.learning/',
      'Python Learning',
      'Daily Python tips, algorithms, machine learning cheatsheets, and backend engineering architectures.',
      '1.2M',
      '42',
      '890',
      '/generated/assets/brand_logo.svg',
      1,
      seedTime,
      '',
      0,
      seedTime
    );
  }

  // Seed connected_pages registry (v5.0 Multi-Account Hub)
  seedConnectedPages(db);

  // Check if deliverables_matrix has data
  const count = db.prepare('SELECT count(*) as count FROM deliverables_matrix').get().count;
  if (count > 0) return;

  const now = new Date();
  const formatTimestamp = (d) => {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const seed1Date = new Date(now.getTime() - 24 * 3600 * 1000);
  const seed2Date = new Date(now.getTime() - 12 * 3600 * 1000);
  const seed3Date = new Date(now.getTime() - 2 * 3600 * 1000);

  // Seed 1: Autonomous Multi-Agent Systems
  const camp1 = db.prepare(`
    INSERT INTO research_campaigns (topic, niche, summary, key_insights, code_snippets, mermaid_diagram, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Autonomous Multi-Agent Architecture with LangGraph',
    'AI Engineering',
    'Modern AI engineering is shifting from single-turn zero-shot prompts to autonomous multi-agent state machines. Using LangGraph and hierarchical supervisory loops, teams achieve resilient tool use and error self-correction.',
    JSON.stringify([
      'Decentralized specialized agents out-perform monolithic prompt pipelines by 4x.',
      'State checkpointing with SQLite/Postgres guarantees durable human-in-the-loop approvals.',
      'Dynamic routing allows cost containment: Flash models for triage, Pro models for code synthesis.'
    ]),
    JSON.stringify([
      {
        language: 'python',
        title: 'Supervisory Agent State Graph',
        code: `from langgraph.graph import StateGraph, END\nfrom typing import TypedDict, Annotated\n\nclass AgentState(TypedDict):\n    messages: list\n    next_worker: str\n\nworkflow = StateGraph(AgentState)\nworkflow.add_node("supervisor", supervisor_node)\nworkflow.add_node("researcher", researcher_node)\nworkflow.add_node("coder", coder_node)\nworkflow.add_edge("researcher", "supervisor")\nworkflow.add_edge("coder", "supervisor")\napp = workflow.compile()`
      }
    ]),
    `graph TD
    User([User Goal]) --> Supervisor{Supervisor Agent}
    Supervisor -->|Subtask: Research| Researcher[Web Search Agent]
    Supervisor -->|Subtask: Code| Coder[Code Synthesis Agent]
    Researcher --> Supervisor
    Coder --> Supervisor
    Supervisor -->|Review & Passed| Final[Verified Output]`,
    'completed',
    seed1Date.toISOString()
  );

  const deliv1 = db.prepare(`
    INSERT INTO deliverables (campaign_id, slug, title, markdown_content, public_url, views_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    camp1.lastInsertRowid,
    'autonomous-multi-agent-systems-2026',
    'Autonomous Multi-Agent Systems in 2026: The Production Architecture Guide',
    `# Autonomous Multi-Agent Systems in 2026: The Production Architecture Guide\n\n> Verified Companion Blueprint compiled by OmniResearch AI\n\n## Executive Summary\nBuilding scalable agentic workflows requires moving beyond basic chain-of-thought prompts. This blueprint covers state checkpointing, resilient error boundary handling, and supervisor-worker topologies.\n\n## System Architecture\n\`\`\`mermaid\ngraph TD\n    User([User Goal]) --> Supervisor{Supervisor Agent}\n    Supervisor -->|Subtask: Research| Researcher[Web Search Agent]\n    Supervisor -->|Subtask: Code| Coder[Code Synthesis Agent]\n    Researcher --> Supervisor\n    Coder --> Supervisor\n    Supervisor -->|Review & Passed| Final[Verified Output]\n\`\`\`\n\n## Key Architectural Pillars\n1. **Deterministic State Graphs**: Never rely on free-form LLM loops. Enforce hard schema states.\n2. **Tool Sandboxing**: Run external code execution in gVisor or isolated Docker containers.\n3. **Human-in-the-loop**: Checkpoint states before high-impact API or database writes.\n\n## Production Code Template\n\`\`\`python\nfrom langgraph.graph import StateGraph, END\n\n# Production Supervisor Loop\ndef supervisor_node(state):\n    task = state.get("task")\n    return {"next_worker": "coder" if "code" in task else "researcher"}\n\`\`\``,
    'http://localhost:4000/docs/autonomous-multi-agent-systems-2026',
    142,
    seed1Date.toISOString()
  );

  const media1 = db.prepare(`
    INSERT INTO media_assets (deliverable_id, hook_text, script_text, trigger_keyword, caption, image_url, video_url, thumbnail_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deliv1.lastInsertRowid,
    'Stop building basic chatbots in 2026!',
    'Stop building basic chatbots in 2026! The top AI engineers are now deploying autonomous multi-agent state machines that self-correct and code themselves. Comment AGENT below and I will instantly DM you the full production architecture guide and starter templates!',
    'AGENT',
    'Stop building basic chatbots in 2026! 🤖\n\nHere is the exact architecture behind autonomous multi-agent systems with self-correcting state machines.\n\nComment "AGENT" below and I will DM you the complete companion blueprint + code repo! 🚀\n\n#aiagents #langgraph #python #softwareengineering #genai',
    '/generated/images/multi_agent_cover.png',
    '/generated/reels/multi_agent_reel.mp4',
    '/generated/images/multi_agent_cover.png',
    seed1Date.toISOString()
  );

  db.prepare(`
    INSERT INTO deliverables_matrix (media_asset_id, deliverable_id, topic, lead_magnet_title, trigger_keyword, deliverable_url, ig_media_id, ig_permalink, caption, status, instaauto_rule_id, instaauto_response, created_at, armed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    media1.lastInsertRowid,
    deliv1.lastInsertRowid,
    'Autonomous Multi-Agent Architecture with LangGraph',
    'Autonomous Multi-Agent Systems in 2026: The Production Architecture Guide',
    'AGENT',
    'http://localhost:4000/docs/autonomous-multi-agent-systems-2026',
    '18049102948201941',
    'https://www.instagram.com/reel/C1k8mNxPq1/',
    'Stop building basic chatbots in 2026! 🤖\n\nComment "AGENT" below for the blueprint!',
    'armed',
    1,
    JSON.stringify({ success: true, message: 'Post 18049102948201941 armed with keyword "AGENT"!' }),
    formatTimestamp(seed1Date),
    formatTimestamp(seed1Date)
  );

  // Seed 2: Production Hybrid RAG
  const camp2 = db.prepare(`
    INSERT INTO research_campaigns (topic, niche, summary, key_insights, code_snippets, mermaid_diagram, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Enterprise Hybrid RAG (Dense Embeddings + BM25 + Cohere Rerank)',
    'Information Retrieval',
    'Vector similarity alone fails on product IDs, exact serial numbers, and domain acronyms. Hybrid RAG couples BM25 lexical search with dense embeddings, followed by cross-encoder neural reranking.',
    JSON.stringify([
      'Reciprocal Rank Fusion (RRF) yields 38% better precision over pure cosine search.',
      'Cohere Rerank v3 filters out hallucination vectors before feeding LLM context window.',
      'Chunk size optimization: 512 tokens with 10% overlap is the empirical sweet spot.'
    ]),
    JSON.stringify([
      {
        language: 'python',
        title: 'Reciprocal Rank Fusion Pipeline',
        code: `def rrf(dense_ranks, sparse_ranks, k=60):\n    scores = {}\n    for doc_id, rank in dense_ranks.items():\n        scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank)\n    for doc_id, rank in sparse_ranks.items():\n        scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank)\n    return sorted(scores.items(), key=lambda x: x[1], reverse=True)`
      }
    ]),
    `graph LR
    Query[User Query] --> Dense[Dense Vector Search]
    Query --> Sparse[BM25 Keyword Search]
    Dense --> RRF[Reciprocal Rank Fusion]
    Sparse --> RRF
    RRF --> Rerank[Cross-Encoder Reranker]
    Rerank --> Context[Top 5 Relevant Chunks]`,
    'completed',
    seed2Date.toISOString()
  );

  const deliv2 = db.prepare(`
    INSERT INTO deliverables (campaign_id, slug, title, markdown_content, public_url, views_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    camp2.lastInsertRowid,
    'enterprise-hybrid-rag-blueprint',
    'Enterprise Hybrid RAG Blueprint: BM25, Dense Vectors & Cross-Encoders',
    `# Enterprise Hybrid RAG Blueprint: BM25, Dense Vectors & Cross-Encoders\n\n> Production companion guide for high-accuracy enterprise search.\n\n## Why Pure Vector Search Fails\nCosine similarity struggles with exact codes, domain acronyms, and numeric queries. Hybrid RAG solves this with dual-index retrieval.\n\n## Retrieval Pipeline\n\`\`\`mermaid\ngraph LR\n    Query[User Query] --> Dense[Dense Vector Search]\n    Query --> Sparse[BM25 Keyword Search]\n    Dense --> RRF[Reciprocal Rank Fusion]\n    Sparse --> RRF\n    RRF --> Rerank[Cross-Encoder Reranker]\n    Rerank --> Context[Top 5 Relevant Chunks]\n\`\`\`\n\n## Key Metrics\n- **Precision@5**: Up 38%\n- **Latency**: Under 180ms with pipeline batching\n- **Token Savings**: 65% reduction in irrelevant context tokens`,
    'http://localhost:4000/docs/enterprise-hybrid-rag-blueprint',
    219,
    seed2Date.toISOString()
  );

  const media2 = db.prepare(`
    INSERT INTO media_assets (deliverable_id, hook_text, script_text, trigger_keyword, caption, image_url, video_url, thumbnail_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deliv2.lastInsertRowid,
    'Why 90% of RAG systems hallucinate in production',
    'Why 90% of RAG systems hallucinate in production! If you only use vector embeddings, you are losing exact keyword matches. Here is the hybrid architecture used by Fortune 500 teams. Comment RAG below and I will send you the full engineering paper and code repository!',
    'RAG',
    'Why 90% of RAG systems fail in production! 🚨\n\nStop relying only on vector similarity. Here is how to implement Hybrid Search + Cross-Encoder Reranking.\n\nComment "RAG" below and I will DM you the complete architecture whitepaper! 📄\n\n#rag #llmops #vectorsearch #ai #machinelearning',
    '/generated/images/hybrid_rag_cover.png',
    '/generated/reels/hybrid_rag_reel.mp4',
    '/generated/images/hybrid_rag_cover.png',
    seed2Date.toISOString()
  );

  db.prepare(`
    INSERT INTO deliverables_matrix (media_asset_id, deliverable_id, topic, lead_magnet_title, trigger_keyword, deliverable_url, ig_media_id, ig_permalink, caption, status, instaauto_rule_id, instaauto_response, created_at, armed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    media2.lastInsertRowid,
    deliv2.lastInsertRowid,
    'Enterprise Hybrid RAG (Dense Embeddings + BM25 + Cohere Rerank)',
    'Enterprise Hybrid RAG Blueprint: BM25, Dense Vectors & Cross-Encoders',
    'RAG',
    'http://localhost:4000/docs/enterprise-hybrid-rag-blueprint',
    '18049102948201942',
    'https://www.instagram.com/reel/C1m9pZxPq2/',
    'Why 90% of RAG systems fail in production! Comment "RAG" for the blueprint.',
    'armed',
    2,
    JSON.stringify({ success: true, message: 'Post 18049102948201942 armed with keyword "RAG"!' }),
    formatTimestamp(seed2Date),
    formatTimestamp(seed2Date)
  );

  // Seed 3: DeepSeek Reasoning Models
  const camp3 = db.prepare(`
    INSERT INTO research_campaigns (topic, niche, summary, key_insights, code_snippets, mermaid_diagram, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'DeepSeek-R1 Distillation & Local Reasoning Inference',
    'Model Optimization',
    'DeepSeek-R1 demonstrated that reinforcement learning on reasoning trajectories enables frontier-level problem solving at a fraction of training costs. Distilling R1 into 7B and 14B models allows enterprise local deployment.',
    JSON.stringify([
      'Pure RL discovery of chain-of-thought without supervised fine-tuning.',
      'Quantization with AWQ allows 14B reasoning models to run smoothly on 16GB GPUs.',
      'vLLM integration delivers 45 tokens/second per concurrent streaming user.'
    ]),
    JSON.stringify([
      {
        language: 'bash',
        title: 'vLLM Local Reasoning Server',
        code: `vllm serve deepseek-ai/DeepSeek-R1-Distill-Qwen-14B \\\n  --quantization awq \\\n  --tensor-parallel-size 1 \\\n  --gpu-memory-utilization 0.90 \\\n  --port 8000`
      }
    ]),
    `graph TD
    Prompt[Complex Logic Prompt] --> Model[DeepSeek-R1 Distill 14B]
    Model --> CoT[<think> Dynamic Chain of Thought </think>]
    CoT --> SelfCorrect{Internal Verifier}
    SelfCorrect -->|Verify Logic| CoT
    SelfCorrect -->|Verified| Result[Definitive Answer]`,
    'completed',
    seed3Date.toISOString()
  );

  const deliv3 = db.prepare(`
    INSERT INTO deliverables (campaign_id, slug, title, markdown_content, public_url, views_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    camp3.lastInsertRowid,
    'deepseek-r1-local-reasoning-guide',
    'DeepSeek-R1: Local Reasoning Models & Enterprise Inference Guide',
    `# DeepSeek-R1: Local Reasoning Models & Enterprise Inference Guide\n\n> Comprehensive architectural breakdown of DeepSeek-R1 distillation for local enterprise inference.\n\n## Reasoning Mechanism\n\`\`\`mermaid\ngraph TD\n    Prompt[Complex Logic Prompt] --> Model[DeepSeek-R1 Distill 14B]\n    Model --> CoT[<think> Dynamic Chain of Thought </think>]\n    CoT --> SelfCorrect{Internal Verifier}\n    SelfCorrect -->|Verify Logic| CoT\n    SelfCorrect -->|Verified| Result[Definitive Answer]\n\`\`\`\n\n## Hardware Sizing Guide\n- **1.5B**: Any modern laptop (M1/M2/M3, 8GB RAM)\n- **7B**: Single RTX 3060 (12GB VRAM)\n- **14B**: Single RTX 4080 (16GB VRAM) or Apple Silicon 32GB\n- **32B**: 2x RTX 3090 or RTX 4090`,
    'http://localhost:4000/docs/deepseek-r1-local-reasoning-guide',
    345,
    seed3Date.toISOString()
  );

  const media3 = db.prepare(`
    INSERT INTO media_assets (deliverable_id, hook_text, script_text, trigger_keyword, caption, image_url, video_url, thumbnail_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deliv3.lastInsertRowid,
    'Run frontier reasoning models on your local laptop for free!',
    'Run frontier reasoning models on your local laptop for free! DeepSeek-R1 changed the game forever. Here is the exact setup to run distilled reasoning models on private hardware. Comment DEEP below and I will DM you the setup guide and hardware sizing matrix!',
    'DEEP',
    'Run frontier reasoning models completely locally! 🧠⚡\n\nNo cloud API bills, 100% private data privacy.\n\nComment "DEEP" below and I will send you the hardware sizing matrix and vLLM launch scripts! 🚀\n\n#deepseek #ai #opensource #localllm #deeplearning',
    '/generated/images/deepseek_cover.png',
    '/generated/reels/deepseek_reel.mp4',
    '/generated/images/deepseek_cover.png',
    seed3Date.toISOString()
  );

  db.prepare(`
    INSERT INTO deliverables_matrix (media_asset_id, deliverable_id, topic, lead_magnet_title, trigger_keyword, deliverable_url, ig_media_id, ig_permalink, caption, status, instaauto_rule_id, instaauto_response, created_at, armed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    media3.lastInsertRowid,
    deliv3.lastInsertRowid,
    'DeepSeek-R1 Distillation & Local Reasoning Inference',
    'DeepSeek-R1: Local Reasoning Models & Enterprise Inference Guide',
    'DEEP',
    'http://localhost:4000/docs/deepseek-r1-local-reasoning-guide',
    '18049102948201943',
    'https://www.instagram.com/reel/C1r2wKxPq3/',
    'Run frontier reasoning models completely locally! Comment "DEEP" for the guide.',
    'armed',
    3,
    JSON.stringify({ success: true, message: 'Post 18049102948201943 armed with keyword "DEEP"!' }),
    formatTimestamp(seed3Date),
    formatTimestamp(seed3Date)
  );

  console.log('[OmniResearch Database] Initial schema initialized and pre-seeded with 3 realistic enterprise deliverables.');
}

function seedConnectedPages(db) {
  try {
    const pageCount = db.prepare('SELECT count(*) as count FROM connected_pages').get().count;
    if (pageCount === 0) {
      const now = new Date().toISOString();
      const insertPage = db.prepare(`
        INSERT INTO connected_pages (
          slug, name, handle, meta_page_token, meta_ig_user_id, niche, workflow_type,
          icon, theme_color, has_dm_automation, custom_trigger_keyword, instaauto_enabled,
          attribution_template, autopilot_enabled, daily_quota, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Seed GTA 6 Updates 007
      const gtaToken = getSetting('meta_page_token', '');
      const gtaUserId = getSetting('meta_ig_user_id', '17841428668115319');
      const gtaHandle = getSetting('instagram_handle', '@gta6_updates_007');

      insertPage.run(
        'gta6',
        'GTA 6 Updates 007',
        gtaHandle,
        gtaToken,
        gtaUserId,
        'gaming',
        'direct_repost',
        '🎮',
        '#F59E0B',
        0,
        'GTA6',
        0,
        '🎮 Source: @{author} | Follow @gta6_updates_007 for daily GTA 6 leaks & official news! #gta6 #rockstargames',
        0,
        3,
        1,
        now,
        now
      );

      // Seed Tech News Daily AI
      const techToken = getSetting('tech_meta_page_token', '');
      const techUserId = getSetting('tech_meta_ig_user_id', '');
      const techHandle = getSetting('tech_instagram_handle', '@technews_daily_ai');

      insertPage.run(
        'tech',
        'Tech News Daily AI',
        techHandle,
        techToken,
        techUserId,
        'tech',
        'lead_magnet',
        '💻',
        '#7C3AED',
        1,
        'PROJECT',
        1,
        '💡 Reel Source: @{author} | Follow @technews_daily_ai for high-signal AI breakthroughs! #technews #ai',
        0,
        3,
        1,
        now,
        now
      );
      console.log('[OmniResearch Database] Pre-seeded connected_pages registry with [gta6] and [tech] workspaces.');
    }
  } catch (err) {
    console.warn('[Database Seed Notice]:', err.message);
  }
}

// ─── Tracked Channels Helpers ─────────────────────────────────────
function getTrackedChannels(destination = null) {
  if (destination) {
    return getDb().prepare('SELECT * FROM tracked_instagram_channels WHERE destination_account = ? ORDER BY is_active DESC, id DESC').all(destination);
  }
  return getDb().prepare('SELECT * FROM tracked_instagram_channels ORDER BY is_active DESC, id DESC').all();
}

function getTrackedChannelById(id) {
  return getDb().prepare('SELECT * FROM tracked_instagram_channels WHERE id = ?').get(id);
}

function getTrackedChannelByUsername(username) {
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  return getDb().prepare('SELECT * FROM tracked_instagram_channels WHERE lower(username) = ?').get(clean);
}

function addTrackedChannel(data) {
  const cleanUsername = data.username.replace(/^@/, '').trim();
  const profileUrl = data.profile_url || `https://www.instagram.com/${cleanUsername}/`;
  const destinationAccount = data.destination_account || (data.niche_tag === 'gaming' ? 'gta6' : 'tech');
  const nicheTag = data.niche_tag || (destinationAccount === 'gta6' ? 'gaming' : 'tech');
  const info = getDb().prepare(`
    INSERT INTO tracked_instagram_channels (
      username, profile_url, display_name, bio, followers_count, following_count,
      posts_count, avatar_url, is_active, last_scraped_at, last_post_shortcode, synced_posts_count,
      niche_tag, destination_account, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cleanUsername,
    profileUrl,
    data.display_name || cleanUsername,
    data.bio || '',
    data.followers_count || 'N/A',
    data.following_count || 'N/A',
    data.posts_count || 'N/A',
    data.avatar_url || '',
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    data.last_scraped_at || new Date().toISOString(),
    data.last_post_shortcode || '',
    data.synced_posts_count || 0,
    nicheTag,
    destinationAccount,
    new Date().toISOString()
  );
  return getTrackedChannelById(info.lastInsertRowid);
}

function updateTrackedChannel(id, updates) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.length === 0) return getTrackedChannelById(id);
  values.push(id);
  getDb().prepare(`UPDATE tracked_instagram_channels SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTrackedChannelById(id);
}

function deleteTrackedChannel(id) {
  return getDb().prepare('DELETE FROM tracked_instagram_channels WHERE id = ?').run(id);
}

// ─── Brand Assets Helpers ─────────────────────────────────────────
function getBrandAssets() {
  return {
    brand_name: getSetting('brand_name', 'Omni Engineering & AI'),
    brand_handle: getSetting('brand_handle', '@harshparmar007__'),
    brand_tagline: getSetting('brand_tagline', 'Handwritten Engineering Guides & Autonomous Notes'),
    brand_logo_url: getSetting('brand_logo_url', '/generated/assets/brand_logo.svg'),
    brand_watermark_position: getSetting('brand_watermark_position', 'top-right'),
    brand_watermark_opacity: parseFloat(getSetting('brand_watermark_opacity', '0.9')) || 0.9,
    brand_primary_color: getSetting('brand_primary_color', '#D97757'),
    brand_accent_color: getSetting('brand_accent_color', '#1A73E8')
  };
}

function setBrandAssets(settings) {
  for (const [k, v] of Object.entries(settings)) {
    if (v !== undefined) {
      setSetting(k, v);
    }
  }
  return getBrandAssets();
}

// ─── Autonomous Ingestion Log Helpers (v4.0) ──────────────────────
function addAutonomousLog(data) {
  const info = getDb().prepare(`
    INSERT INTO autonomous_ingestion_log (
      channel_id, channel_username, source_post_url, shortcode, content_type,
      downloaded_media_paths, raw_caption, raw_hook,
      llm_fit_score, llm_decision, llm_reasoning, detected_topic, detected_trigger_keyword,
      discarded_tags, cleaned_media_paths,
      harvested_deliverable_url, harvested_deliverable_type, dm_comment_posted, dm_response_received,
      repurposed_hook, repurposed_caption, selected_song_title, selected_song_artist, selected_song_audio_url,
      status, ig_media_id, ig_permalink, published_at, destination_account, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.channel_id || null,
    data.channel_username || '',
    data.source_post_url || '',
    data.shortcode,
    data.content_type || 'carousel',
    typeof data.downloaded_media_paths === 'string' ? data.downloaded_media_paths : JSON.stringify(data.downloaded_media_paths || []),
    data.raw_caption || '',
    data.raw_hook || '',
    data.llm_fit_score || 0,
    data.llm_decision || 'PENDING',
    data.llm_reasoning || '',
    data.detected_topic || '',
    data.detected_trigger_keyword || '',
    typeof data.discarded_tags === 'string' ? data.discarded_tags : JSON.stringify(data.discarded_tags || []),
    typeof data.cleaned_media_paths === 'string' ? data.cleaned_media_paths : JSON.stringify(data.cleaned_media_paths || []),
    data.harvested_deliverable_url || '',
    data.harvested_deliverable_type || '',
    data.dm_comment_posted ? 1 : 0,
    data.dm_response_received ? 1 : 0,
    data.repurposed_hook || '',
    data.repurposed_caption || '',
    data.selected_song_title || '',
    data.selected_song_artist || '',
    data.selected_song_audio_url || '',
    data.status || 'ingested',
    data.ig_media_id || '',
    data.ig_permalink || '',
    data.published_at || null,
    data.destination_account || 'tech',
    data.created_at || new Date().toISOString()
  );
  return getAutonomousLogById(info.lastInsertRowid);
}

function parseAutonomousRow(row) {
  if (!row) return null;
  let resources = [];
  try {
    if (typeof row.extracted_resources === 'string') {
      resources = JSON.parse(row.extracted_resources || '[]');
    } else if (Array.isArray(row.extracted_resources)) {
      resources = row.extracted_resources;
    }
  } catch (e) {
    resources = [];
  }

  return {
    ...row,
    downloaded_media_paths: JSON.parse(row.downloaded_media_paths || '[]'),
    discarded_tags: JSON.parse(row.discarded_tags || '[]'),
    cleaned_media_paths: JSON.parse(row.cleaned_media_paths || '[]'),
    extracted_resources: resources
  };
}

function getAutonomousLogById(id) {
  const row = getDb().prepare('SELECT * FROM autonomous_ingestion_log WHERE id = ?').get(id);
  return parseAutonomousRow(row);
}

function getAutonomousLogByShortcode(shortcode) {
  const row = getDb().prepare('SELECT * FROM autonomous_ingestion_log WHERE shortcode = ?').get(shortcode);
  return parseAutonomousRow(row);
}

function getAutonomousLogs(limit = 50, status = null, destination = null) {
  let query = 'SELECT * FROM autonomous_ingestion_log';
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (destination) {
    conditions.push('destination_account = ?');
    params.push(destination);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = getDb().prepare(query).all(...params);
  return rows.map(r => parseAutonomousRow(r));
}

function updateAutonomousLog(id, updates) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      values.push(JSON.stringify(v));
    } else {
      values.push(v);
    }
  }
  if (fields.length === 0) return getAutonomousLogById(id);
  values.push(id);
  getDb().prepare(`UPDATE autonomous_ingestion_log SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getAutonomousLogById(id);
}

function deleteAutonomousLog(id) {
  return getDb().prepare('DELETE FROM autonomous_ingestion_log WHERE id = ?').run(id);
}

// ─── Mobile DM Trigger Helpers (v4.0) ──────────────────────────────
function addMobileDmTrigger(data) {
  const info = getDb().prepare(`
    INSERT INTO mobile_dm_triggers (
      sender_handle, source_post_url, shortcode, thread_id, message_id,
      processing_status, live_post_permalink, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.sender_handle || '',
    data.source_post_url || '',
    data.shortcode || '',
    data.thread_id || '',
    data.message_id || '',
    data.processing_status || 'received',
    data.live_post_permalink || '',
    data.error_message || '',
    data.created_at || new Date().toISOString()
  );
  return getMobileDmTriggerById(info.lastInsertRowid);
}

function getMobileDmTriggerById(id) {
  return getDb().prepare('SELECT * FROM mobile_dm_triggers WHERE id = ?').get(id);
}

function getMobileDmTriggerByShortcode(shortcode) {
  return getDb().prepare('SELECT * FROM mobile_dm_triggers WHERE shortcode = ?').get(shortcode);
}

function getMobileDmTriggers(limit = 30) {
  const rows = getDb().prepare('SELECT * FROM mobile_dm_triggers ORDER BY id DESC LIMIT ?').all(limit);
  const logStmt = getDb().prepare('SELECT * FROM autonomous_ingestion_log WHERE shortcode = ?');
  const postStmt = getDb().prepare('SELECT * FROM instagram_posts WHERE hook_text LIKE ? OR caption LIKE ? ORDER BY id DESC LIMIT 1');

  return rows.map(r => {
    let log = logStmt.get(r.shortcode);
    let post = null;
    if (log) {
      log = {
        ...log,
        downloaded_media_paths: JSON.parse(log.downloaded_media_paths || '[]'),
        discarded_tags: JSON.parse(log.discarded_tags || '[]'),
        cleaned_media_paths: JSON.parse(log.cleaned_media_paths || '[]'),
        extracted_resources: JSON.parse(log.extracted_resources || '[]')
      };
      if (log.repurposed_hook) {
        try {
          post = postStmt.get(`%${log.repurposed_hook.slice(0, 30)}%`, `%${log.repurposed_hook.slice(0, 30)}%`);
        } catch (e) {}
      }
    }

    const webhookUrl = log?.harvested_deliverable_url || post?.deliverable_url || 'http://localhost:3000/api/agent/bridge';
    const mediaPaths = log?.cleaned_media_paths?.length ? log.cleaned_media_paths : (log?.downloaded_media_paths || []);
    const extractedResources = log?.extracted_resources || (post?.extracted_resources ? JSON.parse(post.extracted_resources) : []);

    return {
      ...r,
      log,
      post,
      webhook_url: webhookUrl,
      trigger_keyword: log?.detected_trigger_keyword || post?.trigger_keyword || 'PROJECT',
      media_paths: mediaPaths,
      content_type: log?.content_type || 'reel',
      llm_fit_score: log?.llm_fit_score || 0,
      llm_decision: log?.llm_decision || 'PENDING',
      llm_reasoning: log?.llm_reasoning || '',
      repurposed_hook: log?.repurposed_hook || '',
      repurposed_caption: log?.repurposed_caption || '',
      selected_song_title: log?.selected_song_title || '',
      extracted_resources: extractedResources
    };
  });
}

function updateMobileDmTrigger(id, updates) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.length === 0) return getMobileDmTriggerById(id);
  values.push(id);
  getDb().prepare(`UPDATE mobile_dm_triggers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getMobileDmTriggerById(id);
}

// ─── 10. Instagram Proxy / Relay Jobs Helpers (Hypothesis 2) ───────────────────
function parseRelayJob(row) {
  if (!row) return null;
  let links = [];
  try {
    links = typeof row.extracted_links === 'string' ? JSON.parse(row.extracted_links || '[]') : (row.extracted_links || []);
  } catch (e) {
    links = [];
  }
  return {
    ...row,
    extracted_links: links
  };
}

function createRelayJob(job) {
  const relayId = job.relay_id || `relay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const info = getDb().prepare(`
    INSERT INTO instagram_relay_jobs (
      relay_id, requester_ig_id, requester_username, target_shortcode,
      target_media_id, target_creator_id, target_creator_handle,
      detected_keyword, comment_posted_at, dm_received_at, extracted_links,
      status, retry_count, relayed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    relayId,
    job.requester_ig_id || '',
    job.requester_username || '',
    job.target_shortcode || '',
    job.target_media_id || '',
    job.target_creator_id || '',
    job.target_creator_handle || '',
    job.detected_keyword || 'FREE',
    job.comment_posted_at || null,
    job.dm_received_at || null,
    JSON.stringify(job.extracted_links || []),
    job.status || 'pending_comment',
    job.retry_count || 0,
    job.relayed_at || null,
    job.created_at || new Date().toISOString()
  );
  return getRelayJobById(info.lastInsertRowid);
}

function getRelayJobById(id) {
  const row = getDb().prepare('SELECT * FROM instagram_relay_jobs WHERE id = ?').get(id);
  return parseRelayJob(row);
}

function getRelayJobByRelayId(relayId) {
  const row = getDb().prepare('SELECT * FROM instagram_relay_jobs WHERE relay_id = ?').get(relayId);
  return parseRelayJob(row);
}

function getPendingRelayByCreator(creatorId, creatorHandle) {
  let query = 'SELECT * FROM instagram_relay_jobs WHERE status IN (\'commented\', \'pending_comment\')';
  const params = [];
  if (creatorId && creatorHandle) {
    query += ' AND (target_creator_id = ? OR target_creator_handle = ?)';
    params.push(String(creatorId), String(creatorHandle));
  } else if (creatorId) {
    query += ' AND target_creator_id = ?';
    params.push(String(creatorId));
  } else if (creatorHandle) {
    query += ' AND target_creator_handle = ?';
    params.push(String(creatorHandle));
  }
  query += ' ORDER BY id DESC LIMIT 1';
  const row = getDb().prepare(query).get(...params);
  return parseRelayJob(row);
}

function getPendingRelayByShortcode(shortcode) {
  const row = getDb().prepare("SELECT * FROM instagram_relay_jobs WHERE target_shortcode = ? AND status IN ('commented', 'pending_comment') ORDER BY id DESC LIMIT 1").get(shortcode);
  return parseRelayJob(row);
}

function getActiveRelayJobs(limit = 50) {
  const rows = getDb().prepare('SELECT * FROM instagram_relay_jobs ORDER BY id DESC LIMIT ?').all(limit);
  return rows.map(parseRelayJob);
}

function updateRelayJob(id, updates) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      values.push(JSON.stringify(v));
    } else {
      values.push(v);
    }
  }
  if (fields.length === 0) return getRelayJobById(id);
  values.push(id);
  getDb().prepare(`UPDATE instagram_relay_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRelayJobById(id);
}

function addAutomationEvent(event) {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO instagram_automation_events (
      post_id, event_type, ig_media_id, ig_permalink, trigger_keyword,
      resource_url, dm_message, rule_id, status, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.post_id || null,
    event.event_type || 'POST_AND_ARMED',
    event.ig_media_id || '',
    event.ig_permalink || '',
    event.trigger_keyword || '',
    event.resource_url || '',
    event.dm_message || '',
    event.rule_id || null,
    event.status || 'success',
    typeof event.details === 'object' ? JSON.stringify(event.details) : (event.details || '{}'),
    new Date().toISOString()
  );
  return res.lastInsertRowid;
}

function getAutomationEvents(limit = 25) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM instagram_automation_events ORDER BY id DESC LIMIT ?
  `).all(limit);
}

// ─── Connected Instagram Pages Multi-Tenant Registry (v5.0) ─────────
function getConnectedPages(options = {}) {
  const db = getDb();
  if (options.isActiveOnly) {
    return db.prepare('SELECT * FROM connected_pages WHERE is_active = 1 ORDER BY id ASC').all();
  }
  return db.prepare('SELECT * FROM connected_pages ORDER BY id ASC').all();
}

function getConnectedPageBySlug(slug) {
  if (!slug) return null;
  return getDb().prepare('SELECT * FROM connected_pages WHERE lower(slug) = ?').get(String(slug).toLowerCase().trim());
}

function getConnectedPageById(id) {
  return getDb().prepare('SELECT * FROM connected_pages WHERE id = ?').get(id);
}

function createConnectedPage(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const rawSlug = data.slug || data.name || 'page';
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || `page_${Date.now()}`;
  
  const stmt = db.prepare(`
    INSERT INTO connected_pages (
      slug, name, handle, meta_page_token, meta_ig_user_id, niche, workflow_type,
      icon, theme_color, has_dm_automation, custom_trigger_keyword, lead_magnet_instructions,
      instaauto_enabled, instaauto_rule_template, attribution_template, autopilot_enabled,
      daily_quota, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    slug,
    data.name || 'New Instagram Page',
    data.handle || '@new_account',
    data.meta_page_token || '',
    data.meta_ig_user_id || '',
    data.niche || 'tech',
    data.workflow_type || 'lead_magnet',
    data.icon || '📱',
    data.theme_color || '#7C3AED',
    data.has_dm_automation !== undefined ? (data.has_dm_automation ? 1 : 0) : 1,
    data.custom_trigger_keyword || 'PROJECT',
    data.lead_magnet_instructions || '',
    data.instaauto_enabled !== undefined ? (data.instaauto_enabled ? 1 : 0) : 1,
    data.instaauto_rule_template || '{"follow_required": true}',
    data.attribution_template || '💡 Source: @{author} | Follow @{my_handle} for daily updates!',
    data.autopilot_enabled ? 1 : 0,
    parseInt(data.daily_quota || '3', 10),
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    now,
    now
  );

  return getConnectedPageById(info.lastInsertRowid);
}

function updateConnectedPage(id, data) {
  const db = getDb();
  const page = getConnectedPageById(id);
  if (!page) return null;

  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  const allowed = [
    'name', 'handle', 'meta_page_token', 'meta_ig_user_id', 'niche', 'workflow_type',
    'icon', 'theme_color', 'has_dm_automation', 'custom_trigger_keyword', 'lead_magnet_instructions',
    'instaauto_enabled', 'instaauto_rule_template', 'attribution_template', 'autopilot_enabled',
    'daily_quota', 'is_active'
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      let val = data[key];
      if (typeof val === 'boolean') val = val ? 1 : 0;
      values.push(val);
    }
  }

  if (fields.length === 0) return page;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE connected_pages SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getConnectedPageById(id);
}

function deleteConnectedPage(id) {
  const db = getDb();
  return db.prepare('DELETE FROM connected_pages WHERE id = ?').run(id);
}

module.exports = {
  getDb,
  getSetting,
  setSetting,
  getTrackedChannels,
  getTrackedChannelById,
  getTrackedChannelByUsername,
  addTrackedChannel,
  updateTrackedChannel,
  deleteTrackedChannel,
  getBrandAssets,
  setBrandAssets,
  addAutonomousLog,
  getAutonomousLogById,
  getAutonomousLogByShortcode,
  getAutonomousLogs,
  updateAutonomousLog,
  deleteAutonomousLog,
  addMobileDmTrigger,
  getMobileDmTriggerById,
  getMobileDmTriggerByShortcode,
  getMobileDmTriggers,
  updateMobileDmTrigger,
  createRelayJob,
  getRelayJobById,
  getRelayJobByRelayId,
  getPendingRelayByCreator,
  getPendingRelayByShortcode,
  getActiveRelayJobs,
  updateRelayJob,
  addAutomationEvent,
  getAutomationEvents,
  getConnectedPages,
  getConnectedPageBySlug,
  getConnectedPageById,
  createConnectedPage,
  updateConnectedPage,
  deleteConnectedPage
};
