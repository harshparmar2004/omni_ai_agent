# OmniResearch AI — Autonomous Content & Deep Research Platform
*(Interconnected Sister Platform to InstaAuto AI Agent)*

OmniResearch AI is a production-grade upstream AI research, deliverable generation, multi-modal video synthesis, and Instagram publishing engine. It integrates seamlessly with downstream follower automation engine **InstaAuto AI Agent** (`http://localhost:3000`).

---

## 🏗️ Architecture & Ecosystem Workflow

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                OMNIRESEARCH AI (PORT 4000)                                       │
│                                                                                                  │
│  [ STEP 1: Deep Research Engine ]                                                                │
│  • Decomposes query into 3 sub-queries (Architecture, Challenges, Best Practices)                │
│  • Synthesizes Key Takeaways, System Architecture, & Code Templates                              │
│                                      │                                                           │
│                                      ▼                                                           │
│  [ STEP 2: Deliverable Document Generator ]                                                      │
│  • Compiles Full Markdown Guide (Architecture Blueprint, Notion-Style Whitepaper)                │
│  • Hosts Public Clean Web Viewer at: http://localhost:4000/docs/:slug                            │
│                                      │                                                           │
│                                      ▼                                                           │
│  [ STEP 3: Multi-Modal Reel & Visual Generation Studio ]                                         │
│  • Scripts Viral 30-45s Reel with 3-Sec Hook & Call-to-Action                                    │
│  • Auto-Extracts Single-Word Trigger Keyword (e.g. "AGENT", "RAG", "DEEP", "DRAG")               │
│  • Nano Banana / Visual Studio: 1:1 & 9:16 High-Res Infographics                                 │
│  • Video Synthesis: ElevenLabs/TTS Voiceover + FFmpeg 9:16 Vertical MP4 (1080x1920)              │
│                                      │                                                           │
│                                      ▼                                                           │
│  [ STEP 4: Direct Instagram Publisher & Internal Virtual Sheet ]                                 │
│  • Publishes Reel via Meta Graph API v21.0 or High-Fidelity Sandbox Simulator                    │
│  • Records entry into the Internal Virtual Sheet (SQLite Rows & Columns Table)                   │
│                                      │                                                           │
│                                      ▼                                                           │
│  [ STEP 5: Real-Time Inbound Webhook Bridge Push ]                                               │
│  • Dispatches HTTP POST to InstaAuto (http://localhost:3000/api/agent/bridge)                    │
│  • Sends: media_id, caption, deliverable_url, trigger_keyword, lead_magnet_title                 │
└──────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                       │ HTTP POST /api/agent/bridge
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             INSTAAUTO AI AGENT (PORT 3000)                                       │
│                                                                                                  │
│  • Inbound Webhook Bridge receives payload                                                       │
│  • Multi-Reel Sentinel binds Reel ID to Trigger Keyword & Deliverable URL                        │
│  • Follow-First Gate rule armed automatically                                                     │
│  • Follower comments "AGENT" ──► Follower status verified ──► Instant Deliverable Doc Link sent! │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design System & UI Specifications

OmniResearch AI shares the exact design tokens and warm neo-glass aesthetic of InstaAuto:
- **Base Background**: `#FAF8F5`
- **Sidebar & Underlay**: `#F4F0E8`
- **Card Background**: `#FFFFFF`
- **Primary Accent**: `#D97757` (Claude Terracotta Orange)
- **Primary Hover**: `#C66444`
- **Success / Live**: `#2E7D32`
- **Blue / Deliverables**: `#0288D1`
- **Typography**: `Plus Jakarta Sans`, `Inter`, `JetBrains Mono`

---

## 🚀 Quick Start

### 1. Install & Start OmniResearch AI
```bash
cd "c:\Users\harsh parmar\Desktop\omni-research-agent"
npm install
npm start
```
The platform will launch at `http://localhost:4000`.

### 2. Verify InstaAuto Sister Platform
Ensure InstaAuto is active on `http://localhost:3000`. OmniResearch automatically pings `http://localhost:3000/api/agent/status` and displays the live bridge status pill in the top navigation bar.

---

## 📡 API Reference

### 1. Research & Content Pipeline
- `POST /api/research/create`: Decomposes query into 3 sub-queries and returns research brief + hosted deliverable guide.
- `POST /api/media/generate-reel`: Scripts viral reel, extracts single-word keyword, renders Nano Banana visuals, and compiles 9:16 vertical MP4 video via FFmpeg.
- `POST /api/publish/instagram`: Publishes reel to Instagram and automatically calls InstaAuto bridge.
- `POST /api/pipeline/auto-run`: Runs Steps 1 through 5 in a single autonomous one-click flow!

### 2. Internal Deliverables Matrix ("Virtual Sheet")
- `GET /api/matrix`: Returns all spreadsheet rows with search and status filtering (`all`, `armed`, `published`).
- `GET /api/matrix/export.csv`: Downloads current deliverables matrix in CSV format.
- `POST /api/matrix/retry-bridge`: Re-fires webhook payload for a row to InstaAuto on Port 3000.

### 3. Public Deliverables
- `GET /docs/:slug`: Standalone reader view for research guides with interactive Mermaid diagrams, syntax highlighting, and 1-click code copying.

---

## 🗄️ Database Architecture

Built with SQLite via `better-sqlite3` in WAL mode (`data/database.sqlite`):
- `research_campaigns`: Topic, niche, summary, key insights (JSON), code snippets (JSON), mermaid diagram.
- `deliverables`: Clean slug, title, markdown content, public URL, views counter.
- `media_assets`: Hook, script, trigger keyword, caption, image URL, video URL (9:16 MP4).
- `deliverables_matrix`: Virtual sheet audit log, Reel Media ID, trigger keyword, deliverable URL, armed timestamp, InstaAuto rule ID.
- `settings`: API keys, operating mode (`mock`/`live`), and bridge URLs.
