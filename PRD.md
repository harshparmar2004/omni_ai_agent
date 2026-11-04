# OmniStudio AI v7 — Product Requirements Document (PRD)
> **Autonomous Multi-Tenant Instagram Automation & Surveillance Platform**  
> *Authoritative System Architecture, Agent Specifications, and Telegram Hub Documentation*  
> *Repository: `C:\Users\harsh parmar\Desktop\omni-research-agent` • Version: 7.0.0*

---

## 1. Executive Summary & System Mission

**OmniStudio AI v7** is an autonomous, multi-tenant Instagram publishing, content curation, and surveillance engine. The system operates as a zero-human-touch growth system capable of running either locally (via Express long-polling) or completely serverless on cloud infrastructure (Vercel API Gateway + GitHub Actions runners / Cloud Run).

### Core Capabilities:
1. **Official Meta Graph API v21.0 Integration**: Publishes 1080x1920 9:16 vertical Reels and companion Instagram Stories directly to Meta without third-party scrapers, unofficial private APIs, or proxy bans.
2. **Dual-Agent Architecture**:
   - **Agent 1: Reposter (On-Demand Cloud Harvester)**: Ingests on-demand Instagram links shared via Telegram or the Web Dashboard, strips competitor credits, applies bespoke branding, writes AI captions, and publishes live to Instagram Feed & Story in <50s.
   - **Agent 2: Watchtower (24/7 Autonomous Surveillance)**: Continuously monitors competitor accounts across 4 separate niches, computes multi-factor virality scores, filters out stale posts (>48h), adheres to audience peak windows and night blackout rules, and auto-posts winning content.
3. **Multi-Tenant Profile Management**: Centrally manages multiple brand accounts from a single dashboard and Telegram bot using a single Meta Business App and permanent System User Access Tokens.
4. **Bespoke Framing & Video-Essay Engine**: Custom FFmpeg canvas pipeline featuring dynamic auto-cropping, OCR hook extraction (Tesseract.js / Gemini Vision), dual-color headline highlight rendering, and competitor header masking.

---

## 2. Multi-Tenant Destination Channels (Connected Pages)

OmniStudio manages 4 distinct media brands:

| Page ID | Slug | Brand Name | Handle | Meta IG User ID | Niche & Aesthetic |
|---|---|---|---|---|---|
| **1** | `gta6` | GTA 6 Updates 007 | `@gta6_updates_007` | `29662149860039587` | GTA VI news, leaks, Vice City map secrets, gameplay edits. Cyber/Vice City framing. |
| **2** | `movies` | Movie Recommendations | `@movie_series_365` | `29048404444808513` | Cinema recommendations, OTT series, thriller breakdowns. Letterbox cinema card styling. |
| **3** | `clubbing` | Clubbing Cult | `@clubbingcult` | `29109331262052643` | EDM, rave, techno sets, festival moments (Tomorrowland, Ultra, EDC, Cercle). Electric Neon Green (`#00FF66`). |
| **4** | `cult_information` | Cult Information | `@cult_information` | `17841462998491309` | AI, deep tech, video-essay breakdowns. Bold white headline + lime green keyword highlights (`#CCFF00`) + 740px competitor blackout mask. |

---

## 3. Detailed Agent Specifications

```
                                  ┌──────────────────────────────────────────────┐
                                  │           INBOUND TRIGGER SOURCES            │
                                  │  • Telegram Bot (Share Reel Link / Commands) │
                                  │  • Web Dashboard (Command Center UI)         │
                                  │  • Vercel Crons & GitHub Actions Scheduler   │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                  ┌──────────────────────▼───────────────────────┐
                                  │        OMNISTUDIO v7 TWO-AGENT CORE          │
                                  └──────────────┬────────────────┬──────────────┘
                                                 │                │
                        ┌────────────────────────▼─┐            ┌─▼────────────────────────┐
                        │    AGENT 1: REPOSTER     │            │   AGENT 2: WATCHTOWER    │
                        │  (On-Demand Repurposing) │            │ (24/7 Monitored Sources) │
                        └────────────┬─────────────┘            └──────────┬───────────────┘
                                     │                                     │
                                     │  1. Parse URL & Shortcode           │  1. Scan Monitored Competitors
                                     │  2. Prompt Page Selection Keyboard  │  2. Extract Recent Candidate Reels
                                     │  3. Interactive Live Stepper        │  3. Calculate Virality Score
                                     │                                     │  4. Pacing & Peak Window Gates
                                     └───────────────────┬─────────────────┘
                                                         │
                                  ┌──────────────────────▼───────────────────────┐
                                  │         SHARED PUBLISHING CORE QUEUE         │
                                  │               (SQLite WAL)                   │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                  ┌──────────────────────▼───────────────────────┐
                                  │            EXECUTION PIPELINE                │
                                  │  1. Media Stream Downloader (yt-dlp/py)      │
                                  │  2. Video Vision & OCR Hook Detection        │
                                  │  3. FFmpeg Auto-Cropping & Brand Framing     │
                                  │  4. AI Caption Generation (Groq/Gemini/Local)│
                                  │  5. Cloudflare Ephemeral Media Tunnel        │
                                  │  6. Meta Graph API v21.0 Container Push      │
                                  │  7. Parallel Companion Story Publish         │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                  ┌──────────────────────▼───────────────────────┐
                                  │          TELEGRAM REPORTING & AUDIT          │
                                  │  • In-Place Stepper Status Update            │
                                  │  • Live Instagram Permalink Delivery         │
                                  │  • Story Confirmation & Caption Preview      │
                                  └──────────────────────────────────────────────┘
```

### 3.1. Agent 1: Reposter (On-Demand Repurposing Engine)
- **Trigger**: User shares any Instagram URL (`/reel/`, `/p/`, `/tv/`) in Telegram or Web Dashboard.
- **Workflow**:
  1. **Link Extraction & Clean**: Extracts canonical 11-character shortcode.
  2. **Page Routing**: Prompts operator with inline keyboard buttons for each active destination page (`@gta6_updates_007`, `@movie_series_365`, `@clubbingcult`, `@cult_information`).
  3. **In-Place Progress Stepper**: Replaces initial message with live 4-stage stepper:
     - `[1. Ingest]` ➔ Ingest complete.
     - `[2. Download]` ➔ 1080p MP4 download & anti-duplicate transcode.
     - `[3. AI Copy]` ➔ Hook headline & viral caption generation.
     - `[4. Publishing]` ➔ Feed container creation, container poll, live publish, and companion Story publish.
  4. **Instant Completion Message**: Displays live Instagram permalink, media ID, companion story link, and rendered caption block with zero competitor attribution.

### 3.2. Agent 2: Watchtower (24/7 Autonomous Surveillance)
- **Trigger**: Runs every 30 minutes via GitHub Actions cron (`*/30 3-15 * * *`) or `/post` command in Telegram.
- **Competitor Surveillance**:
  - Monitors registered competitor handles per niche (defined in `config/competitors.json`).
  - Fetches latest candidate posts via `guestReader.js` without needing login credentials.
- **Virality Scoring Algorithm**:
  $$\text{Composite Score} = (\text{Likes} \times 1.0) + (\text{Comments} \times 3.0) + (\text{Freshness Multiplier})$$
  - Discards posts older than 48 hours to guarantee audience freshness.
  - Skips image posts/carousels to maintain 100% video reel feed quality.
- **Audience Peak Windows & Night Blackout (IST - Asia/Kolkata)**:
  - **Morning Surge**: 08:30 – 11:30 IST (Target: 2 posts)
  - **Lunch Surge**: 12:30 – 16:30 IST (Target: 2 posts)
  - **Evening Prime-Time**: 17:00 – 21:30 IST (Target: 3 posts)
  - **Night Blackout**: 21:30 – 08:30 IST (**STRICT ZERO POSTING** to prevent account bot flags).
- **Two-Message Telegram Reporting**:
  1. *Message 1 (Surveillance Summary)*: Monitored sources checked, new reels ingested, active window, and top winning reel chosen.
  2. *Message 2 (Live Publish Confirmation)*: Published Instagram URL, source link, target account, and caption hook snippet.

---

## 4. Telegram Bot Hub & Integration Architecture

The Telegram Bot serves as the primary mobile command and control center for OmniStudio v7.

### 4.1. Dual Deployment Topology
1. **Local Persistent Mode (`src/agents/reposter/telegramBot.js`)**:
   - Long-polls Telegram API (`getUpdates`).
   - Used when running the full server on desktop or VM (`npm start` on port 4000).
   - Features dynamic token refresh, gateway backoff (502/503/504), and full command set.
2. **Serverless Cloud Mode (`api/telegram-webhook.js`)**:
   - Hosted on Vercel as a webhook endpoint (`/api/telegram-webhook`).
   - Triggered instantly when user interacts with the bot on Telegram.
   - Dispatches jobs directly to Cloud Run worker or triggers GitHub Actions (`repost-job.yml` or `watchtower-cron.yml`).

### 4.2. Supported Bot Commands & Controls
- `/start` or `/help`: Displays welcome greeting, connected pages list, and command manual.
- `/pages`: Lists all connected destination pages, current daily quota usage, and post modes.
- `/status`: Returns live health report, active jobs count, Watchtower status, and upcoming audience window.
- `/queue`: Shows pending review items and failed jobs.
- `/post` or `/post force`: Manually triggers Watchtower scan and publishes the top winning reel immediately (bypassing blackout if forced).
- `/pause watchtower`: Halts automated background scanning.
- `/resume watchtower`: Re-engages 24/7 background scanning.

### 4.3. Telegram Bot Issues & Next Fixes
1. **Command Parity**: The serverless webhook (`api/telegram-webhook.js`) currently lacks implementations for `/pages`, `/queue`, `/pause watchtower`, and `/resume watchtower`.
2. **Page Specificity on `/post`**: The `/post` command currently triggers a generic watchtower cycle with hardcoded text mentioning `@gta6_updates_007`. It needs support for targeting specific pages (e.g., `/post cult`, `/post clubbing`, `/post movies`, `/post gta6`).
3. **Webhook & Token Security**: Consistently use `TELEGRAM_BOT_TOKEN` from database settings and environment variables across both webhook and local worker.
4. **Button Callback Consistency**: Ensure `retry`, `post`, `review`, and `cancel` callbacks are seamlessly supported in both local polling and Vercel webhook handlers.

---

## 5. Media Ingestion, Video Vision & Framing Engine

### 5.1. Media Ingestion (`downloader.js` & `instagram_downloader.py`)
- Leverages Python Playwright with Chromium context and `yt-dlp` fallback in guest mode.
- Extracts highest bitrate video MP4 and raw metadata (caption, uploader handle, like count).
- Fast pre-flight check validates whether the video is already Meta-compliant H.264/AAC to skip redundant transcode passes.

### 5.2. Video Vision & On-Screen Hook Detection (`videoVisionService.js`)
- Captures a snapshot frame at $t = 1.200\text{s}$ (bypassing initial black fade-ins).
- Employs offline local **Tesseract.js OCR** and **Gemini Vision API** to read on-screen text.
- Extracts the exact hook headline and detects whether a competitor title header is burned into the video.
- Identifies 1–3 semantic trigger words and wraps them in `**keyword**` tokens for styling.

### 5.3. FFmpeg Bespoke Framing & Canvas Rendering (`ffmpegHelper.js`)
- **Cult Information Frame (`generateEvolvingAiOverlay`)**:
  - Centers original video in 1080x1920 portrait canvas.
  - Places official "CULT INFORMATION" logo lockup at top ($Y \approx 135\text{px}$).
  - Renders 2-line headline with automatic brand-accent lime green (`#CCFF00`) highlighting on semantic words.
  - Applies a 740px deep black belt mask ($Y \approx 680\text{px}$) to guarantee 100% elimination of competitor headers and logos.
- **Clubbing Cult Cyber Frame (`generateClubbingCyberOverlay`)**:
  - High-voltage neon green aesthetic (`#00FF66`).
  - Ambient video blur background with centered aspect-ratio preserved card.
  - Track rating and festival crew engagement hooks.
- **Reel Reshare Story Card (`prepareVideoForStory`)**:
  - Renders ambient blurred background from source video.
  - Places video inside a centered card with authentic "Watch Full Reel" CTA aligned with Meta user_tags.
  - Clamps duration to $\le 59.5\text{s}$ for Meta Story compliance.

---

## 6. AI Copywriting & Zero Credits Rule

- **Location**: `src/core/captionBuilder.js` & `src/core/llmService.js`
- **Zero Credits Rule**:
  - Meta algorithm actively suppresses reposted reels that mention competitor handles (`@username`) or third-party attribution tags (`via`, `cr:`, `credit:`).
  - All external `@mentions` and competitor CTAs (`link in bio`, `comment LINK below`, `dm me NOW`) are rigorously stripped.
- **Viral Reel Structure**:
  1. *Hook*: High-energy curiosity sentence or extracted on-screen headline.
  2. *Topic Breakdown*: 2-sentence high-impact context summary.
  3. *Engagement Prompt*: Algorithmic catalyst ("Rate this 1-10", "Will this change everything?").
  4. *Save & Share CTA*: "Save this reel so you don't lose it!".
  5. *Follow CTA*: Clean brand follow line ("Follow @cult_information for daily breakdowns").
  6. *Hashtags*: Exactly 4–5 hyper-relevant tags (Meta recommended sweet spot).

---

## 7. Meta Graph API v21.0 Publishing Architecture

- **Publisher Engine**: `src/core/publisher.js`
- **Zero Mock Policy**: 100% official Meta Graph API v21.0 calls.
- **Ephemeral Media Hosting**:
  - Uses `cloudflared` to expose local port 4000 over a public HTTPS tunnel.
  - Provides Meta servers with a temporary, secure URL to download the video container.
  - Once Meta finishes ingestion, the tunnel can be torn down.
- **Container Workflow**:
  1. `POST /{ig-user-id}/media`: Initialises `REELS` container with `video_url`, `caption`, and `thumb_offset`.
  2. Status Polling: Polls `GET /{container-id}?fields=status_code` every 2s until `FINISHED`.
  3. `POST /{ig-user-id}/media_publish`: Finalises and publishes the reel to Instagram.
  4. Permalink Retrieval: Fetches live URL (`instagram.com/reel/{shortcode}`).
  5. Companion Story Publishing: Publishes the reshare card to Instagram Stories.

---

## 8. Database Architecture & Schema

Built with **SQLite** (`data/database.sqlite`) in Write-Ahead Logging (`WAL`) mode via `better-sqlite3`:

```sql
-- 1. Destination Instagram Pages
CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
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

-- 2. Monitored Competitor Accounts (Watchtower)
CREATE TABLE source_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  is_active INTEGER DEFAULT 1,
  health TEXT DEFAULT 'ok',
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT DEFAULT '',
  last_checked_at TEXT,
  last_new_post_at TEXT,
  synced_posts_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 3. Discovered Candidate Posts
CREATE TABLE discovered_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_account_id INTEGER REFERENCES source_accounts(id) ON DELETE CASCADE,
  run_id INTEGER,
  shortcode TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'reel',
  caption TEXT DEFAULT '',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  posted_at TEXT,
  score REAL DEFAULT 0.0,
  status TEXT DEFAULT 'new',
  created_at TEXT NOT NULL
);

-- 4. Shared Publishing Job Queue
CREATE TABLE publish_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL, -- 'reposter' | 'watchtower'
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  discovered_post_id INTEGER REFERENCES discovered_posts(id) ON DELETE SET NULL,
  shortcode TEXT NOT NULL,
  source_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'reel',
  media_paths TEXT DEFAULT '[]',
  caption TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, downloading, ready, publishing, published, failed
  current_step TEXT DEFAULT 'init',
  attempts INTEGER DEFAULT 0,
  error TEXT DEFAULT '',
  ig_media_id TEXT DEFAULT '',
  permalink TEXT DEFAULT '',
  story_ig_media_id TEXT DEFAULT '',
  story_published_at TEXT,
  story_status TEXT DEFAULT 'idle',
  telegram_chat_id TEXT DEFAULT '',
  telegram_message_id TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(page_id, shortcode)
);

-- 5. Key-Value Settings Table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 9. Verification & Quality Gates

The system includes an automated test suite verifying all critical components:
- **Test Command**: `npm test` (`test/v7_subsystems.test.js`)
- **Verified Subsystems**:
  1. Database v7 Schema Integrity.
  2. Caption Builder & Zero Credits sanitization.
  3. Token masking and security.
  4. Watchtower selector and freshness gates.
  5. Job Queue state lifecycle.
  6. Clubbing Cult neon overlay rendering.
  7. Cloud runner initialization optimizations.
  8. Cult Information video-essay template and typography highlighting.
  9. Decimal-safe headline preservation.
  10. Video Vision and OCR subsystem.
  11. Deterministic active video auto-cropper.

---

## 10. Operational Playbook & Telegram Next Actions

When fixing or enhancing Telegram operations:
1. **Webhook vs Long-Polling**: When deploying to Vercel/cloud, use `/api/telegram-webhook` with `/api/set-webhook`. When running locally (`npm start`), disable webhook to allow long polling (`pollUpdatesLoop`).
2. **Channel Selection**: Support explicit page targeting in Telegram commands (e.g. `/post [page]`).
3. **In-Place Stepper**: Maintain live editing of Telegram messages to prevent notification spam.
4. **Token Refresh**: Ensure the active token `8887232624:AAGI8q912YhGLF10wfPc1EtOTR1DFzkVEkI` is correctly bound and auto-refreshed from database settings.
