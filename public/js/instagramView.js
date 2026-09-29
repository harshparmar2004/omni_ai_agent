/**
 * OmniResearch AI v3.5 — Instagram Posting Agent & Creative Studio Hub
 * Features:
 * 1. "Ready to Post Queue": Staged posts with 4:5 carousel preview, trending audio, and 1-click publish
 * 2. "Posting History Archive": Published posts with Post ID, hook, AI trigger keyword, companion PDF & doc links, and InstaAuto bridge status
 * 3. "Monitored Channels": Automated channel tracker that checks target accounts (@python.learning, @github, etc.) and auto-stages viral posts
 * 4. "Brand & Creative Studio": Logo asset manager, handle, watermark placement controls, and live 4:5 carousel preview
 * 5. "1-Click Link Importer & Scraper": 1-click download media, extract captions, and stage posts directly to the queue
 */

window.escapeHtml = window.escapeHtml || function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const instagramView = {
  currentSubTab: 'overview', // 'overview', 'channels', 'ranking', 'downloads', 'resources', 'microservice', 'settings'
  overviewSection: 'queue', // 'queue' or 'history'
  queueData: [],
  historyData: [],
  trackedChannels: [],
  autonomousLogs: [],
  autonomousConfig: {
    autopilot_enabled: false,
    min_score_threshold: 70,
    daily_post_cap: 3,
    brand: {}
  },
  microserviceStatus: null,
  brandAssets: {
    brand_name: 'Omni Engineering & AI',
    brand_handle: '@harshparmar007__',
    brand_tagline: 'Handwritten Engineering Guides & Autonomous Notes',
    brand_logo_url: '/generated/assets/brand_logo.svg',
    brand_watermark_position: 'top-right',
    brand_watermark_opacity: 0.9,
    brand_primary_color: '#D97757',
    brand_accent_color: '#1A73E8'
  },
  lastScrapedItem: null,

  async render() {
    const container = document.getElementById('view-instagram');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 1240px; margin: 0 auto; padding-bottom: 3rem;">
        <!-- Top Banner & Sub-Tabs -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 1.2px;">
              Social Publishing & 24/7 Watchdog Engine v3.5
            </div>
            <h2 style="font-size: 1.65rem; font-weight: 800; margin-top: 0.2rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
              <span>Instagram Studio & Pipeline Hub</span>
            </h2>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Sequenced end-to-end pipeline: Track channels ➔ Rank quality with LLM ➔ Download media ➔ Extract resources ➔ Publish via REST Microservice.
            </p>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.5rem; font-size: 0.8rem; flex-wrap: wrap;">
              <span id="microservice-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 9px; border-radius: 20px; font-weight: 700;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                FastAPI REST Microservice Online (:8001)
              </span>
              <span style="color: var(--text-muted);">•</span>
              <span style="color: var(--text-secondary); font-size: 0.78rem;">yt-dlp-api & aiograpi-rest</span>
              <span style="color: var(--text-muted);">•</span>
              <a href="http://127.0.0.1:8001/docs" target="_blank" style="color: var(--accent); font-weight: 700; text-decoration: underline; font-size: 0.78rem;">
                📖 Interactive Swagger Docs ↗
              </a>
            </div>
          </div>

          <!-- Sub-Tab Switcher (Sequenced Pipeline from Left to Right) -->
          <div style="display: flex; background: var(--bg-card); padding: 4px; border-radius: 12px; border: 1px solid var(--border-color); gap: 4px; flex-wrap: wrap;">
            <button id="ig-subtab-overview" class="btn btn-sm ${this.currentSubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('overview')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              📊 Overview & Queue <span id="ig-queue-count" style="margin-left: 4px; background: rgba(255,255,255,0.25); padding: 1px 6px; border-radius: 10px; font-size: 0.75rem;">0</span>
            </button>
            <button id="ig-subtab-history" class="btn btn-sm ${this.currentSubTab === 'history' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('history')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              📜 Published History <span style="margin-left: 4px; background: rgba(255,255,255,0.25); padding: 1px 6px; border-radius: 10px; font-size: 0.75rem;">${this.historyData.length}</span>
            </button>
            <button id="ig-subtab-channels" class="btn btn-sm ${this.currentSubTab === 'channels' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('channels')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              📡 Monitored Channels <span id="ig-channels-count" style="margin-left: 4px; background: rgba(255,255,255,0.25); padding: 1px 6px; border-radius: 10px; font-size: 0.75rem;">0</span>
            </button>
            <button id="ig-subtab-ranking" class="btn btn-sm ${this.currentSubTab === 'ranking' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('ranking')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              🧠 Ranking System
            </button>
            <button id="ig-subtab-downloads" class="btn btn-sm ${this.currentSubTab === 'downloads' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('downloads')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              📥 Download System
            </button>
            <button id="ig-subtab-resources" class="btn btn-sm ${this.currentSubTab === 'resources' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('resources')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              🔗 Extracted Resources
            </button>
            <button id="ig-subtab-microservice" class="btn btn-sm ${this.currentSubTab === 'microservice' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('microservice')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              🔌 REST API & Engine
            </button>
            <button id="ig-subtab-settings" class="btn btn-sm ${this.currentSubTab === 'settings' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.switchSubTab('settings')" style="padding: 0.45rem 0.85rem; font-weight: 700; white-space: nowrap;">
              ⚙️ Settings
            </button>
          </div>
        </div>

        <!-- Main Content Area -->
        <div id="ig-content-area">
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading Instagram Agent Hub...</div>
        </div>
      </div>
    `;

    await this.loadAll();
  },

  switchSubTab(tab) {
    this.currentSubTab = tab;
    const tabs = ['overview', 'history', 'channels', 'ranking', 'downloads', 'resources', 'microservice', 'settings'];
    tabs.forEach(t => {
      const el = document.getElementById(`ig-subtab-${t}`);
      if (el) {
        el.classList.toggle('btn-primary', t === tab);
        el.classList.toggle('btn-secondary', t !== tab);
      }
    });
    this.renderCurrentView();
  },

  async loadAll() {
    const safeFetchJson = async (url, fallback) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        return await res.json();
      } catch (e) {
        console.warn(`[InstagramView] Failed fetching ${url}:`, e.message);
        return fallback;
      }
    };

    try {
      const [queueJson, histJson, channelsJson, brandJson, microJson, autoJson, autoCfgJson, mobileDmJson] = await Promise.all([
        safeFetchJson('/api/instagram/queue', { posts: [] }),
        safeFetchJson('/api/instagram/history', { posts: [] }),
        safeFetchJson('/api/instagram/tracked-channels', { channels: [] }),
        safeFetchJson('/api/instagram/brand-assets', { assets: {} }),
        safeFetchJson('/api/instagram/microservice/health', { online: false }),
        safeFetchJson('/api/instagram/autonomous/feed', { logs: [] }),
        safeFetchJson('/api/instagram/autonomous/config', { config: null }),
        safeFetchJson('/api/instagram/mobile-dm/triggers', { triggers: [] })
      ]);

      this.queueData = queueJson.posts || [];
      this.historyData = histJson.posts || [];
      this._historyStats = histJson.stats || null;
      this.trackedChannels = channelsJson.channels || [];
      this.autonomousLogs = autoJson.logs || [];
      if (autoCfgJson.config) this.autonomousConfig = autoCfgJson.config;
      this.microserviceStatus = microJson;
      if (brandJson.assets) this.brandAssets = { ...this.brandAssets, ...brandJson.assets };
      this.mobileDmTriggers = mobileDmJson.triggers || [];

      // Update counters
      const autoCountEl = document.getElementById('ig-autonomous-count');
      const qCountEl = document.getElementById('ig-queue-count');
      const hCountEl = document.getElementById('ig-history-count');
      const cCountEl = document.getElementById('ig-channels-count');
      const navBadge = document.getElementById('nav-queue-badge');
      const navBotBadge = document.getElementById('nav-bot-badge');

      if (autoCountEl) autoCountEl.innerText = this.autonomousLogs.length;
      if (qCountEl) qCountEl.innerText = this.queueData.length;
      if (hCountEl) hCountEl.innerText = this.historyData.length;
      if (cCountEl) cCountEl.innerText = this.trackedChannels.length;
      if (navBadge) navBadge.innerText = this.queueData.length;
      if (navBotBadge) navBotBadge.innerText = this.mobileDmTriggers.length || 'ACTIVE';

      // Update top microservice pill
      const pill = document.getElementById('microservice-status-pill');
      if (pill && this.microserviceStatus) {
        if (this.microserviceStatus.online) {
          const userSuffix = this.microserviceStatus.loggedInUser ? ` (@${this.microserviceStatus.loggedInUser})` : '';
          pill.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
            FastAPI REST Microservice Online (:8001)${userSuffix}
          `;
          pill.style.background = 'rgba(16, 185, 129, 0.12)';
          pill.style.color = '#059669';
          pill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else {
          pill.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444; display: inline-block;"></span>
            FastAPI Microservice Offline
          `;
          pill.style.background = 'rgba(239, 68, 68, 0.12)';
          pill.style.color = '#DC2626';
          pill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }
      }
    } catch (err) {
      console.error('Error loading Instagram agent data:', err);
    } finally {
      this.renderCurrentView();
    }
  },

  renderCurrentView() {
    const area = document.getElementById('ig-content-area');
    if (!area) return;

    if (this.currentSubTab === 'history') {
      this.renderHistoryView(area);
    } else if (this.currentSubTab === 'channels') {
      this.renderChannelsView(area);
    } else if (this.currentSubTab === 'ranking') {
      this.renderRankingView(area);
    } else if (this.currentSubTab === 'downloads') {
      this.renderDownloadsView(area);
    } else if (this.currentSubTab === 'resources') {
      this.renderResourcesView(area);
    } else if (this.currentSubTab === 'microservice') {
      this.renderMicroserviceView(area);
    } else if (this.currentSubTab === 'settings') {
      this.renderSettingsView(area);
    } else {
      this.renderOverviewView(area);
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 1. OVERVIEW & QUEUE VIEW (Step 1 in Sequence)
  // ═════════════════════════════════════════════════════════════════════
  renderOverviewView(container) {
    const qCount = this.queueData.length;
    const hCount = this.historyData.length;
    const cCount = this.trackedChannels.length;
    const isAutoPilot = Boolean(this.autonomousConfig?.autopilot_enabled);
    const avgScore = this.autonomousLogs.length > 0 
      ? Math.round(this.autonomousLogs.reduce((acc, l) => acc + (l.llm_fit_score || 0), 0) / this.autonomousLogs.length) 
      : 92;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Top Pipeline Overview KPI Ribbon -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem;">
          <div class="card" style="padding: 1.1rem; border-left: 4px solid var(--accent); background: var(--bg-card); cursor: pointer;" onclick="instagramView.overviewSection = 'queue'; instagramView.renderOverviewView(document.getElementById('ig-content-area'));">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">⏳ Ready to Post with Extraction</div>
            <div style="font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${qCount} Staged</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">Verified for 1-click publishing</div>
          </div>
          <div class="card" style="padding: 1.1rem; border-left: 4px solid #10B981; background: var(--bg-card); cursor: pointer;" onclick="instagramView.overviewSection = 'history'; instagramView.renderOverviewView(document.getElementById('ig-content-area'));">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">📜 Published Live</div>
            <div style="font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${hCount} Live Posts</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">Archived with active InstaAuto DMs</div>
          </div>
          <div class="card" style="padding: 1.1rem; border-left: 4px solid #3B82F6; background: var(--bg-card); cursor: pointer;" onclick="instagramView.switchSubTab('channels');">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">📡 Monitored Accounts</div>
            <div style="font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${cCount} Channels</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">24/7 background watchdog active</div>
          </div>
          <div class="card" style="padding: 1.1rem; border-left: 4px solid #7C3AED; background: var(--bg-card); cursor: pointer;" onclick="instagramView.switchSubTab('ranking');">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">⭐ Average Quality Fit</div>
            <div style="font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${avgScore}/100</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">LLM viral & tech relevance filter</div>
          </div>
        </div>


        <!-- Action Controls -->
        <div style="display: flex; justify-content: flex-end; align-items: center; background: rgba(217, 119, 87, 0.08); padding: 0.85rem 1.25rem; border-radius: 10px; border: 1px solid rgba(217, 119, 87, 0.2); flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <button class="btn btn-sm ${isAutoPilot ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.toggleAutopilotMode(${!isAutoPilot})" style="font-weight: 700; ${isAutoPilot ? 'background: #10B981; border-color: #10B981;' : ''}">
              ${isAutoPilot ? '⚡ Auto-Pilot: ACTIVE' : '⏸️ Auto-Pilot: PAUSED'}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="instagramView.syncAllChannels()" style="font-weight: 700;">
              📡 Scan 15-20 Channels Now
            </button>
            <button class="btn btn-sm btn-primary" onclick="instagramView.loadAll()" style="font-weight: 700;">
              🔄 Refresh
            </button>
          </div>
        </div>

        <!-- Queue Content -->
        <div id="overview-subcontent"></div>
      </div>
    `;

    const sub = document.getElementById('overview-subcontent');
    if (sub) {
      this.renderQueueView(sub);
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 3. RANKING SYSTEM VIEW (Step 3 in Sequence)
  // ═════════════════════════════════════════════════════════════════════
  renderRankingView(container) {
    const logs = this.autonomousLogs || [];
    const minThreshold = this.autonomousConfig?.min_score_threshold || 70;
    const approvedLogs = logs.filter(l => (l.llm_fit_score || 0) >= minThreshold || l.llm_decision === 'APPROVED');
    const rejectedLogs = logs.filter(l => (l.llm_fit_score || 0) < minThreshold && l.llm_decision !== 'APPROVED');

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Top LLM Engine & Ranking Criteria Banner -->
        <div class="card" style="border: 1.5px solid rgba(124, 58, 237, 0.3); background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(59, 130, 246, 0.04)); padding: 1.75rem; border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <span class="badge" style="background: rgba(124, 58, 237, 0.15); color: #7C3AED; font-weight: 800; padding: 4px 10px;">
                  🧠 STEP 3: LLM RANKING & QUALITY GATE
                </span>
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 700; padding: 4px 10px;">
                  Active Model: Gemini 2.5 Flash / Claude
                </span>
                <span class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563EB; font-weight: 700; padding: 4px 10px;">
                  Approval Gate: Score ≥ ${minThreshold}/100
                </span>
              </div>
              <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.4rem; color: var(--text-primary);">
                Autonomous Content Ranking & Viral Virality Scoring
              </h3>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem; max-width: 760px;">
                Before any post or reel reaches your queue, our LLM evaluator analyzes the caption, slide curriculum, and technical depth. Only posts meeting your strict software engineering criteria are approved and repurposed.
              </p>
            </div>

            <!-- Quick Stats -->
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <div style="text-align: right; background: var(--bg-card); padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Approved Posts</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #10B981;">${approvedLogs.length} Passed</div>
              </div>
              <div style="text-align: right; background: var(--bg-card); padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Filtered Out</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #DC2626;">${rejectedLogs.length} Rejected</div>
              </div>
            </div>
          </div>

          <!-- Niche Criteria & Prompt Directive -->
          <div style="margin-top: 1.2rem; padding: 1rem; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-color); font-size: 0.82rem; line-height: 1.5;">
            <div style="font-weight: 800; color: var(--text-primary); margin-bottom: 0.3rem;">
              🎯 Active Scoring Guardrails for @${escapeHtml(this.brandAssets.brand_handle || 'harshparmar007__')}:
            </div>
            <div style="color: var(--text-secondary);">
              • <strong>High-Priority Topics:</strong> AI Coding Agents, Python Automation, System Design Architecture, Cloud DevOps, Full-Stack Roadmaps.<br/>
              • <strong>Instant Disqualification:</strong> Non-technical memes, personal vlogs, crypto token promotions, broken slides, non-actionable soundbites.<br/>
              • <strong>Automated Generation:</strong> Evaluator generates a high-converting hook, bullets, trigger keyword, and Instagram-optimized caption.
            </div>
          </div>
        </div>

        <!-- Evaluated Posts Feed -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              Evaluated Candidate Feed (${logs.length} Posts Scored)
            </h4>
            <button class="btn btn-secondary btn-sm" onclick="instagramView.loadAll()" style="font-weight: 700;">
              🔄 Refresh Feed
            </button>
          </div>

          ${logs.length === 0 ? `
            <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧠</div>
              <h4 style="font-size: 1.05rem; font-weight: 700;">No Candidate Posts Scored Yet</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary); max-width: 440px; margin: 0.3rem auto 1rem auto;">
                Click "Scan Monitored Channels" or import any Instagram post to see the LLM evaluation and scoring breakdown!
              </p>
              <button class="btn btn-primary btn-sm" onclick="instagramView.syncAllChannels()">
                📡 Scan Channels Now
              </button>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${logs.map(l => {
                const score = l.llm_fit_score || 0;
                const isApproved = score >= minThreshold || l.llm_decision === 'APPROVED';
                const mediaPaths = JSON.parse(l.downloaded_media_paths || '[]');
                const thumb = mediaPaths[0] || '/generated/assets/brand_logo.svg';

                return `
                  <div class="card" style="padding: 1.25rem; border-left: 4px solid ${isApproved ? '#10B981' : '#EF4444'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                      <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <div style="width: 70px; height: 90px; border-radius: 8px; overflow: hidden; background: #000; border: 1px solid var(--border-color); flex-shrink: 0; cursor: pointer;" onclick="window.open('${thumb}', '_blank')">
                          <img src="${thumb}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/generated/assets/brand_logo.svg';" />
                        </div>

                        <div>
                          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge" style="background: ${isApproved ? '#DEF7EC' : '#FEE2E2'}; color: ${isApproved ? '#03543F' : '#991B1B'}; font-weight: 800; font-size: 0.75rem;">
                              ${isApproved ? `⭐ ${score}/100 — APPROVED` : `🛑 ${score}/100 — REJECTED`}
                            </span>
                            <span class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563EB; font-weight: 700; font-size: 0.75rem;">
                              @${escapeHtml(l.channel_username || 'creator')}
                            </span>
                            <span class="badge" style="background: #EDE9FE; color: #5B21B6; font-weight: 700; font-size: 0.75rem;">
                              🏷️ ${escapeHtml(l.detected_topic || 'Tech Breakdown')}
                            </span>
                            <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); font-size: 0.72rem;">
                              DM: "${escapeHtml(l.detected_trigger_keyword || 'NOTES')}"
                            </span>
                          </div>

                          <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0.4rem 0 0.2rem 0; color: var(--text-primary);">
                            ${escapeHtml(l.repurposed_hook || l.raw_hook || 'Evaluated Post')}
                          </h4>

                          <div style="background: var(--bg-main); padding: 0.5rem 0.8rem; border-radius: 6px; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.4rem; border: 1px solid var(--border-color);">
                            <strong>LLM Reasoning:</strong> ${escapeHtml(l.llm_reasoning || 'Evaluated for software engineering rigor, visual quality, and topic alignment.')}
                          </div>
                        </div>
                      </div>

                      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                        ${isApproved ? `
                          <button class="btn btn-primary btn-sm" onclick="instagramView.switchSubTab('overview')" style="font-weight: 700; font-size: 0.75rem; background: var(--accent); border-color: var(--accent);">
                            🚀 View in Queue ➔
                          </button>
                        ` : `
                          <span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Discarded from Queue</span>
                        `}
                        <a href="${escapeHtml(l.source_post_url)}" target="_blank" class="btn btn-secondary btn-xs" style="font-size: 0.72rem; text-decoration: none;">
                          Original IG Post ↗
                        </a>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 4. DOWNLOAD SYSTEM VIEW (Step 4 in Sequence)
  // ═════════════════════════════════════════════════════════════════════
  renderDownloadsView(container) {
    this.renderScrapeView(container);
  },

  // ═════════════════════════════════════════════════════════════════════
  // 5. EXTRACTED RESOURCES / LEAD MAGNETS VIEW (Step 5 in Sequence)
  // ═════════════════════════════════════════════════════════════════════
  renderResourcesView(container) {
    const logs = this.autonomousLogs || [];
    const posts = this.queueData || [];

    // Combine all resources with deliverable URLs
    const resources = [];
    logs.forEach(l => {
      if (l.harvested_deliverable_url) {
        resources.push({
          source: l.channel_username ? `@${l.channel_username}` : 'Instagram Post',
          hook: l.repurposed_hook || l.raw_hook || 'Technical Breakdown',
          keyword: l.detected_trigger_keyword || 'GUIDE',
          url: l.harvested_deliverable_url,
          type: l.harvested_deliverable_type || 'guide',
          commentPosted: Boolean(l.dm_comment_posted),
          dmReceived: Boolean(l.dm_response_received),
          postUrl: l.source_post_url
        });
      }
    });

    posts.forEach(p => {
      if (p.deliverable_url && !resources.some(r => r.url === p.deliverable_url)) {
        resources.push({
          source: p.origin_source || 'Ready to Post Queue',
          hook: p.hook_text || 'Staged Post Guide',
          keyword: p.trigger_keyword || 'NOTES',
          url: p.deliverable_url,
          type: p.deliverable_url.includes('.pdf') ? 'pdf' : 'guide',
          commentPosted: true,
          dmReceived: true,
          postUrl: p.deliverable_url
        });
      }
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Top Lead Magnet Pipeline Banner -->
        <div class="card" style="border: 1.5px solid rgba(16, 185, 129, 0.35); background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(59, 130, 246, 0.04)); padding: 1.75rem; border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; padding: 4px 10px;">
                  🔗 STEP 5: EXTRACTED RESOURCES & LEAD MAGNETS
                </span>
                <span class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563EB; font-weight: 700; padding: 4px 10px;">
                  InstaAuto DM Bridge Connected
                </span>
              </div>
              <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.4rem; color: var(--text-primary);">
                Harvested Resources, PDFs & Automated Deliverables
              </h3>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem; max-width: 760px;">
                When creators post "Comment AGENT to get the link", our bot executes the automated comment-to-DM handshake, captures the Notion roadmap, Google Drive PDF, or GitHub repo, and links it directly to your own trigger keyword!
              </p>
            </div>

            <div style="background: var(--bg-card); padding: 0.75rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color); text-align: right;">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Resources</div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #10B981;">${resources.length} Captured</div>
            </div>
          </div>

          <!-- 4-Layer Extraction Logic Summary -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-top: 1.25rem;">
            <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.82rem; color: #10B981;">1. Keyword Intercept</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">Detects "Comment AGENTS" via LLM & OCR</div>
            </div>
            <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.82rem; color: #3B82F6;">2. Comment Handshake</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">Bot comments keyword on creator's Reel</div>
            </div>
            <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.82rem; color: #7C3AED;">3. ManyChat DM Listener</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">Intercepts automated DM & unwraps URL</div>
            </div>
            <div style="background: var(--bg-card); padding: 0.75rem 0.9rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.82rem; color: #D97757;">4. AI Companion Fallback</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">Generates 5-page PDF if creator link is dead</div>
            </div>
          </div>
        </div>

        <!-- Resources Directory Table / Cards -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              Captured Deliverable Links Directory (${resources.length})
            </h4>
            <button class="btn btn-secondary btn-sm" onclick="instagramView.loadAll()" style="font-weight: 700;">
              🔄 Refresh Resources
            </button>
          </div>

          ${resources.length === 0 ? `
            <div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔗</div>
              <h4 style="font-size: 1.05rem; font-weight: 700;">No Harvested Deliverables Yet</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary); max-width: 440px; margin: 0.3rem auto 1rem auto;">
                When monitored channels post lead magnet reels or you simulate a post, extracted resource links will be listed here.
              </p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${resources.map((r, idx) => {
                const fullUrl = r.url.startsWith('http') ? r.url : `http://localhost:4000${r.url}`;
                return `
                  <div class="card" style="padding: 1.25rem; border-left: 4px solid #10B981;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                      <div style="flex: 1; min-width: 280px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.72rem;">
                            🟢 ${escapeHtml(r.type.toUpperCase())}
                          </span>
                          <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7C3AED; font-weight: 700; font-size: 0.72rem;">
                            Trigger: "${escapeHtml(r.keyword)}"
                          </span>
                          <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); font-size: 0.72rem;">
                            Source: ${escapeHtml(r.source)}
                          </span>
                        </div>

                        <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0.4rem 0 0.3rem 0; color: var(--text-primary);">
                          ${escapeHtml(r.hook)}
                        </h4>

                        <!-- Extracted Link Box with Copy Button -->
                        <div style="background: var(--bg-main); padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap;">
                          <span style="font-size: 0.72rem; font-weight: 700; color: #10B981; text-transform: uppercase;">🔗 Resource Link:</span>
                          <a href="${escapeHtml(fullUrl)}" target="_blank" style="color: var(--accent); font-weight: 700; font-size: 0.82rem; text-decoration: underline; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml(fullUrl)} ↗
                          </a>
                          <button class="btn btn-xs btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(fullUrl)}'); app.showToast('Resource link copied to clipboard!', 'success');" style="margin-left: auto; padding: 3px 8px; font-size: 0.72rem; font-weight: 700;">
                            📋 Copy Link
                          </button>
                        </div>
                      </div>

                      <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                        <a href="${escapeHtml(fullUrl)}" target="_blank" class="btn btn-primary btn-sm" style="font-weight: 700; font-size: 0.75rem; background: #10B981; border-color: #10B981; text-decoration: none;">
                          🌐 Open Resource ↗
                        </a>
                        <button class="btn btn-secondary btn-sm" onclick="instagramView.switchSubTab('overview')" style="font-size: 0.75rem; font-weight: 700;">
                          📸 View in Queue ➔
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 7. SETTINGS & BRAND VIEW (Step 7 in Sequence)
  // ═════════════════════════════════════════════════════════════════════
  renderSettingsView(container) {
    this.renderBrandView(container);
  },

  async triggerAutonomousPoll() {
    const btn = document.getElementById('btn-autonomous-poll');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Polling 15-20 Channels...';
    }
    app.showToast('📡 24/7 Background poll triggered across all monitored channels!', 'info');

    try {
      const res = await fetch('/api/instagram/autonomous/poll-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast('✅ Polling cycle running in background! Feed will refresh automatically.', 'success');
        setTimeout(() => this.loadAll(), 4000);
      }
    } catch (err) {
      app.showToast(`Error triggering poll: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔄 Poll All Channels Now';
      }
    }
  },

  async processUrlWithAutonomousAgent() {
    const input = document.getElementById('autonomous-url-input');
    const url = input ? input.value.trim() : '';
    if (!url) {
      app.showToast('Please enter an Instagram post or reel URL', 'warning');
      return;
    }

    app.showToast('🚀 Running full Agentic Pipeline (Download ➔ LLM Rank ➔ Brand Cleanse ➔ DM Harvest ➔ Stage)...', 'info');
    if (input) input.disabled = true;

    try {
      const res = await fetch('/api/instagram/autonomous/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Agentic processing failed');

      app.showToast(`🎉 Success: Fit Score ${data.log?.llm_fit_score}/100, branded, and staged!`, 'success');
      if (input) {
        input.value = '';
        input.disabled = false;
      }
      await this.loadAll();
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
      if (input) input.disabled = false;
    }
  },

  async toggleAutopilotMode(enable) {
    try {
      const res = await fetch('/api/instagram/autonomous/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopilot_enabled: enable })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`⚡ Auto-Pilot mode is now ${enable ? 'ACTIVE' : 'PAUSED'}!`, 'success');
        await this.loadAll();
      }
    } catch (err) {
      app.showToast(`Error updating autopilot: ${err.message}`, 'error');
    }
  },

  async deleteAutonomousLog(id) {
    if (!confirm('Remove this autonomous activity log?')) return;
    try {
      const res = await fetch(`/api/instagram/autonomous/log/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.showToast('Log entry removed', 'info');
        await this.loadAll();
      }
    } catch (err) {
      app.showToast(`Error deleting log: ${err.message}`, 'error');
    }
  },

  async simulateMobileDmShare() {
    const urlInput = document.getElementById('mobile-dm-simulate-url');
    const senderInput = document.getElementById('mobile-dm-sender-input');
    const url = urlInput ? urlInput.value.trim() : '';
    const sender = senderInput ? senderInput.value.trim() : '@harshparmar007__';

    if (!url) {
      app.showToast('Please enter an Instagram post or reel URL to simulate', 'warning');
      return;
    }

    app.showToast(`📱 Simulating mobile share from ${sender}...`, 'info');

    try {
      const res = await fetch('/api/instagram/mobile-dm/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, sender_handle: sender })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to simulate mobile share');

      app.showToast(data.message, 'success');
      setTimeout(() => this.loadAll(), 3000);
      setTimeout(() => this.loadAll(), 8000);
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
    }
  },

  async pollMobileDmInboxNow() {
    app.showToast('📥 Polling Instagram Direct inbox for shared media...', 'info');
    try {
      const res = await fetch('/api/instagram/mobile-dm/poll-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast('✅ Mobile DM inbox check initiated!', 'success');
        setTimeout(() => this.loadAll(), 2500);
      }
    } catch (err) {
      app.showToast(`Error polling inbox: ${err.message}`, 'error');
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 1. READY TO POST QUEUE VIEW
  // ═════════════════════════════════════════════════════════════════════
  renderQueueView(container) {
    const isAutoPilot = Boolean(this.autonomousConfig?.autopilot_enabled);

    if (this.queueData.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 4rem 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">✨</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">No Posts Staged in Queue</h3>
          <p style="color: var(--text-secondary); max-width: 520px; margin: 0 auto 1.5rem auto; font-size: 0.9rem;">
            Run research in the <strong>Autonomous Research Studio</strong>, let Agent 2 monitor target channels, or share any Instagram post link via mobile to automatically extract content and stage posts here!
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="instagramView.syncAllChannels()" style="font-weight: 700;">
              📡 Scan 15-20 Channels Now ➔
            </button>
            <button class="btn btn-secondary" onclick="instagramView.switchSubTab('channels')">
              ⚙️ Manage Monitored Channels
            </button>
            <button class="btn btn-secondary" onclick="app.navigate('instagram-bot')">
              📱 Open Mobile Share-to-DM Bot
            </button>
          </div>
        </div>
      `;
      return;
    }

    const currentFilter = this.currentQueueFilter || 'all';

    const leadMagnetCount = this.queueData.filter(p => p.post_intent === 'lead_magnet' || Boolean(p.trigger_keyword)).length;
    const directRepostCount = this.queueData.filter(p => p.post_intent === 'direct_repost' || !p.trigger_keyword).length;

    const visiblePosts = this.queueData.filter(p => {
      if (currentFilter === 'lead_magnet') return p.post_intent === 'lead_magnet' || Boolean(p.trigger_keyword);
      if (currentFilter === 'direct_repost') return p.post_intent === 'direct_repost' || !p.trigger_keyword;
      return true;
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Top Operational Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(217, 119, 87, 0.08); padding: 0.9rem 1.25rem; border-radius: 10px; border: 1px solid rgba(217, 119, 87, 0.2); flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.88rem; color: var(--text-primary); font-weight: 700;">
              🚀 <strong>${this.queueData.length} Staged Post(s)</strong> verified and ready for 1-click publishing.
            </div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
              Posts sourced from <strong>24/7 Channel Watchdog (Agent 2)</strong> and <strong>Mobile Share-to-DM Bot (Agent 1)</strong>.
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <!-- Auto-Pilot Toggle -->
            <button class="btn btn-sm ${isAutoPilot ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.toggleAutopilotMode(${!isAutoPilot})" style="font-weight: 700; ${isAutoPilot ? 'background: #10B981; border-color: #10B981;' : ''}">
              ${isAutoPilot ? '⚡ Auto-Pilot: ACTIVE' : '⏸️ Auto-Pilot: PAUSED'}
            </button>
            <!-- Scan All Channels -->
            <button class="btn btn-sm btn-secondary" onclick="instagramView.syncAllChannels()" style="font-weight: 700;">
              📡 Scan Monitored Channels
            </button>
            <!-- Refresh -->
            <button class="btn btn-sm btn-primary" onclick="instagramView.loadAll()" style="font-weight: 700;">
              🔄 Refresh
            </button>
          </div>
        </div>

        <!-- Filter Sub-Bar: All / DM Magnets / Direct Reposts -->
        <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; padding: 0.25rem 0;">
          <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.setQueueFilter('all')" style="font-weight: 700;">
            📁 All Staged (${this.queueData.length})
          </button>
          <button class="btn btn-sm ${currentFilter === 'lead_magnet' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.setQueueFilter('lead_magnet')" style="font-weight: 700; ${currentFilter === 'lead_magnet' ? 'background: var(--accent); border-color: var(--accent);' : ''}">
            🎯 DM Magnets (${leadMagnetCount})
          </button>
          <button class="btn btn-sm ${currentFilter === 'direct_repost' ? 'btn-primary' : 'btn-secondary'}" onclick="instagramView.setQueueFilter('direct_repost')" style="font-weight: 700; ${currentFilter === 'direct_repost' ? 'background: #0284C7; border-color: #0284C7;' : ''}">
            ⚡ Direct Viral Reposts (${directRepostCount})
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem;">
          ${visiblePosts.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 10px; border: 1px dashed var(--border-color);">
              <p style="color: var(--text-secondary); margin: 0;">No posts match the current filter.</p>
            </div>
          ` : visiblePosts.map(post => this.renderQueueCard(post)).join('')}
        </div>
      </div>
    `;
  },

  setQueueFilter(filter) {
    this.currentQueueFilter = filter;
    const container = document.getElementById('instagram-subtab-container');
    if (container) this.renderQueueView(container);
  },

  renderQueueCard(post) {
    const isCarousel = post.content_type === 'carousel';
    const isDirectRepost = post.post_intent === 'direct_repost' || !post.trigger_keyword;
    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    const mainMedia = post.thumbnail_url || mediaUrls[0] || '/generated/assets/brand_logo.svg';

    let originBadge = '';
    if (post.origin_source && post.origin_source.startsWith('channel:')) {
      const channel = post.origin_source.replace('channel:', '');
      originBadge = `<span class="badge" style="background: rgba(37, 99, 235, 0.88); color: #fff; font-weight: 800; backdrop-filter: blur(4px);">🤖 24/7 Watchdog: ${escapeHtml(channel)}</span>`;
    } else if (post.origin_source === 'mobile_bot') {
      originBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.88); color: #fff; font-weight: 800; backdrop-filter: blur(4px);">📱 Mobile Share Bot</span>`;
    } else {
      originBadge = `<span class="badge" style="background: rgba(124, 58, 237, 0.88); color: #fff; font-weight: 800; backdrop-filter: blur(4px);">🔬 Studio Research</span>`;
    }

    const intentBadge = isDirectRepost
      ? `<span class="badge" style="background: linear-gradient(135deg, #0284C7, #2563EB); color: #fff; font-weight: 800; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);">⚡ Direct Repost</span>`
      : `<span class="badge" style="background: var(--accent); color: #fff; font-weight: 800;">DM: "${post.trigger_keyword}"</span>`;

    let extractedResources = [];
    try {
      extractedResources = typeof post.extracted_resources === 'string' ? JSON.parse(post.extracted_resources || '[]') : (post.extracted_resources || []);
    } catch (e) {
      extractedResources = [];
    }

    const primaryLink = post.deliverable_url || (extractedResources[0]?.url) || '';
    const hasExtractedResource = !isDirectRepost && Boolean(primaryLink);
    const isPdfResource = Boolean(post.pdf_url || (primaryLink && (primaryLink.toLowerCase().endsWith('.pdf') || primaryLink.toLowerCase().includes('.pdf?'))));

    return `
      <div class="card" style="display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <!-- Post Media Preview (4:5 Ratio) -->
        <div style="position: relative; width: 100%; aspect-ratio: 4/5; background: #18181B; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <img src="${mainMedia}" alt="Media Preview" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/generated/assets/brand_logo.svg';" />

          <div style="position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
            <div style="display: flex; gap: 6px;">
              <span class="badge" style="background: rgba(0,0,0,0.75); color: #fff; font-weight: 700; backdrop-filter: blur(4px);">
                ${isCarousel ? '📸 6-Slide Carousel' : '🎥 Video Reel'}
              </span>
              ${intentBadge}
            </div>
            ${originBadge}
          </div>

          <div style="position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.75); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px);">
            <span>🎵 ${post.trending_song_title || 'Trending Audio'}</span>
          </div>
        </div>

        <!-- Post Content Details -->
        <div style="padding: 1.25rem; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: ${isDirectRepost ? '#0284C7' : 'var(--accent)'}; text-transform: uppercase;">
              ${isDirectRepost ? '🎬 Viral Repost Hook' : '🎯 Lead Magnet Hook'}
            </div>
            <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0.2rem 0 0.6rem 0; line-height: 1.35; color: var(--text-primary);">
              ${escapeHtml(post.hook_text)}
            </h4>

            <div style="background: var(--bg-hover, #F8FAFC); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; font-size: 0.82rem; line-height: 1.45; color: var(--text-secondary); max-height: 110px; overflow-y: auto; margin-bottom: 0.75rem; white-space: pre-wrap;">
              ${escapeHtml(post.caption)}
            </div>

            <!-- Extracted Creator Resource Container -->
            ${hasExtractedResource ? `
              <div style="background: rgba(16, 185, 129, 0.05); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 0.85rem; margin-bottom: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <div style="font-size: 0.82rem; font-weight: 800; color: #047857; display: flex; align-items: center; gap: 5px;">
                    ${isPdfResource ? '📄 This is the PDF extracted from this resource, reel or post' : '🔗 Extracted Resource from Post / Reel'}
                  </div>
                  <span class="badge" style="font-size: 0.65rem; background: #DEF7EC; color: #03543F; font-weight: 800; padding: 2px 7px;">
                    ${isPdfResource ? 'AUTHENTIC PDF' : 'DIRECT LINK'}
                  </span>
                </div>

                <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.35;">
                  ${isPdfResource 
                    ? 'Direct PDF extracted from creator content. Sent as-is to followers requesting the link via DM.' 
                    : 'This is the verified link extracted from the creator post containing all resources. Sent as-is via DM.'}
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 5px 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 0.45rem;">
                  <a href="${escapeHtml(primaryLink)}" target="_blank" style="font-family: monospace; font-size: 0.74rem; color: var(--accent); font-weight: 700; text-decoration: underline; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(primaryLink)}
                  </a>
                  <a href="${escapeHtml(primaryLink)}" target="_blank" class="btn btn-xs btn-primary" style="background: #10B981; border-color: #10B981; font-weight: 700; text-decoration: none; padding: 2px 8px; font-size: 0.7rem; white-space: nowrap;">
                    Visit ↗
                  </a>
                </div>

                ${extractedResources.length > 1 ? `
                  <details style="font-size: 0.73rem; margin-top: 0.3rem;">
                    <summary style="cursor: pointer; color: var(--text-muted); font-weight: 700;">
                      View all ${extractedResources.length} extracted resources & links ▾
                    </summary>
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 5px;">
                      ${extractedResources.map((res, rIdx) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; background: var(--bg-card); padding: 3px 6px; border-radius: 4px; border: 1px solid var(--border-color);">
                          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                            <span style="font-weight: 700; color: var(--text-primary);">${rIdx + 1}. ${escapeHtml(res.title)}</span>
                            <span style="color: var(--text-muted); font-size: 0.68rem;">(${escapeHtml(res.platform || 'Link')})</span>
                          </div>
                          <a href="${escapeHtml(res.url)}" target="_blank" style="color: var(--accent); font-weight: 700; text-decoration: none; font-size: 0.7rem; white-space: nowrap;">
                            Open ↗
                          </a>
                        </div>
                      `).join('')}
                    </div>
                  </details>
                ` : ''}

                <div style="font-size: 0.7rem; color: #047857; font-weight: 600; margin-top: 0.35rem;">
                  🤖 DM Automation: Sends this link when followers comment <strong>"${escapeHtml(post.trigger_keyword || '')}"</strong>
                </div>
              </div>
            ` : ''}

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.85rem;">
              <span class="badge" style="background: #E8F5E9; color: #2E7D32; font-weight: 700;">
                Audience: @${this.brandAssets.brand_handle}
              </span>
              <span class="badge" style="background: #EDE7F6; color: #512DA8; font-weight: 700;">
                Vibe: ${post.audio_vibe || 'viral'}
              </span>
              <span class="badge" style="background: ${isDirectRepost ? '#E0F2FE; color: #0369A1;' : '#FEF3C7; color: #92400E;'} font-weight: 700;">
                ${isDirectRepost ? '⚡ Direct Repost' : '🎯 DM Automation Active'}
              </span>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-primary" onclick="${isDirectRepost ? `instagramView.publishPost(${post.id})` : `instagramView.postAndTriggerAutomation(${post.id})`}" style="flex: 1; font-weight: 800; padding: 0.65rem 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; background: ${isDirectRepost ? '#0284C7; border-color: #0284C7;' : 'linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%); border: none; box-shadow: 0 2px 8px rgba(217, 119, 87, 0.35);'}">
                <span>${isDirectRepost ? '🚀 1-Click Repost' : '⚡ Post & Trigger InstaAuto'}</span>
              </button>
              <button class="btn btn-secondary" onclick="instagramView.publishPostViaMicroservice(${post.id})" title="Publish directly using FastAPI REST Microservice (instagrapi)" style="font-weight: 700; padding: 0.65rem 0.75rem; white-space: nowrap; font-size: 0.82rem;">
                🔌 REST Post
              </button>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              ${isDirectRepost ? `
                <a href="${mainMedia}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; font-weight: 700; text-decoration: none;">
                  🎬 Preview Media
                </a>
                <span class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; font-weight: 600; opacity: 0.85; pointer-events: none; border-style: dashed; font-size: 0.78rem;">
                  ⚡ Pure Repost (No DM)
                </span>
              ` : `
                <a href="${escapeHtml(primaryLink || '#')}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span>${isPdfResource ? '📄 Open Extracted PDF' : '🔗 Open Extracted Resource'}</span>
                  <span>↗</span>
                </a>
                <a href="${mainMedia}" target="_blank" class="btn btn-secondary btn-sm" style="text-align: center; font-weight: 700; text-decoration: none; padding: 0 14px;" title="View Cleaned Media">
                  🎬 Media
                </a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 2. PUBLISHING HISTORY ARCHIVE (Standalone dedicated tab)
  // ═════════════════════════════════════════════════════════════════════
  renderHistoryView(container) {
    const data = this.historyData;
    const stats = this._historyStats || {};

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:4rem 2rem;">
          <div style="font-size:3rem;margin-bottom:1rem;">📡</div>
          <h3 style="font-size:1.25rem;font-weight:800;margin-bottom:0.5rem;">No Live Posts Yet</h3>
          <p style="color:var(--text-secondary);max-width:480px;margin:0 auto 1.5rem auto;font-size:0.9rem;">
            Every post published via Telegram bot, 24/7 autopilot, or dashboard will appear here with the full audit trail — origin, page, content type, and live Instagram link.
          </p>
          <button class="btn btn-primary" onclick="instagramView.switchSubTab('overview')">
            Go to Ready to Post Queue ➔
          </button>
        </div>`;
      return;
    }

    // ── KPI Strip ──────────────────────────────────────────────────────────
    const kpiHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;">
        <div class="card" style="padding:1rem;border-left:4px solid #10B981;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">📡 Total Live Posts</div>
          <div style="font-size:2rem;font-weight:800;color:var(--text-primary);">${stats.total || data.length}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid #7C3AED;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">🎬 Reels</div>
          <div style="font-size:2rem;font-weight:800;color:#7C3AED;">${stats.reels ?? data.filter(p=>p.content_type==='reel').length}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid #0284C7;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">🖼️ Carousels</div>
          <div style="font-size:2rem;font-weight:800;color:#0284C7;">${stats.carousels ?? data.filter(p=>p.content_type==='carousel').length}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid var(--accent);">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">📲 Via Telegram</div>
          <div style="font-size:2rem;font-weight:800;color:var(--accent);">${stats.via_telegram ?? data.filter(p=>p.origin_source==='mobile_bot').length}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid #059669;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">🤖 Via Autopilot</div>
          <div style="font-size:2rem;font-weight:800;color:#059669;">${stats.via_autopilot ?? 0}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid #9CA3AF;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">🖥️ Via Studio</div>
          <div style="font-size:2rem;font-weight:800;color:var(--text-primary);">${stats.via_studio ?? data.filter(p=>p.origin_source==='studio').length}</div>
        </div>
        <div class="card" style="padding:1rem;border-left:4px solid #EF4444;">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:var(--text-muted);">💌 DMs Delivered</div>
          <div style="font-size:2rem;font-weight:800;color:#EF4444;">${stats.total_dms ?? data.reduce((a,p)=>a+(p.dms_delivered_count||0),0)}</div>
        </div>
      </div>`;

    // ── Cards Grid ─────────────────────────────────────────────────────────
    const cardsHtml = data.map(post => {
      const permalink = post.ig_permalink || post.live_post_permalink || '#';
      const mediaId = post.ig_media_id ? `#${String(post.ig_media_id).slice(-10)}` : `#${post.id}`;
      const publishedAt = post.published_at
        ? new Date(post.published_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
      const isReel = post.content_type === 'reel' || post.has_video;
      const isCarousel = post.content_type === 'carousel';
      const slideCount = post.slide_count || (post.media_urls?.length) || 1;
      const thumb = post.thumbnail_url || (post.media_urls?.[0]) || '';
      const pageColor = post.page_color || '#D97757';

      // Origin badge color
      const originBg = post.origin_source === 'mobile_bot' ? '#E0F2FE' : post.origin_source === 'autonomous' ? '#F0FDF4' : '#F3F4F6';
      const originColor = post.origin_source === 'mobile_bot' ? '#0369A1' : post.origin_source === 'autonomous' ? '#15803D' : '#374151';

      return `
        <div class="card" style="padding:0;overflow:hidden;border:1px solid var(--border-color);border-radius:12px;display:flex;flex-direction:column;">
          
          <!-- Top: Thumbnail strip + type badge -->
          <div style="position:relative;height:80px;background:linear-gradient(135deg,${pageColor}22,${pageColor}44);overflow:hidden;flex-shrink:0;">
            ${thumb ? `<img src="${escapeHtml(thumb)}" style="width:100%;height:100%;object-fit:cover;opacity:0.5;" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0.75rem;gap:0.5rem;justify-content:space-between;">
              <span style="background:rgba(0,0,0,0.6);color:#fff;font-weight:800;font-size:0.72rem;padding:3px 9px;border-radius:20px;backdrop-filter:blur(4px);">
                ${isReel ? '🎬 Reel' : isCarousel ? `🖼️ Carousel · ${slideCount} Slides` : '📷 Image'}
              </span>
              <span style="background:rgba(0,0,0,0.55);color:#fff;font-family:monospace;font-size:0.7rem;padding:2px 7px;border-radius:10px;">
                ${mediaId}
              </span>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.6rem;">

            <!-- Hook / Title -->
            <div style="font-weight:800;font-size:0.9rem;color:var(--text-primary);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${escapeHtml(post.hook_text||'')}">
              ${escapeHtml(post.hook_text || '—')}
            </div>

            <!-- Published origin row -->
            <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
              <span style="background:${originBg};color:${originColor};font-weight:700;font-size:0.72rem;padding:2px 8px;border-radius:10px;">
                ${post.publish_origin_icon || '📲'} ${post.publish_origin || post.origin_source}
              </span>
              ${post.trigger_sender ? `<span style="font-size:0.72rem;color:var(--text-muted);">from ${escapeHtml(post.trigger_sender)}</span>` : ''}
            </div>

            <!-- Page destination -->
            <div style="display:flex;align-items:center;gap:0.4rem;">
              <span style="font-size:1rem;">${post.page_icon || '📱'}</span>
              <span style="font-weight:700;font-size:0.82rem;">${escapeHtml(post.page_name || post.destination_account || '—')}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(post.page_handle || '')}</span>
            </div>

            <!-- Divider -->
            <div style="border-top:1px solid var(--border-color);"></div>

            <!-- DM trigger row -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
              <div>
                ${post.trigger_keyword ? `
                  <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">DM Trigger</div>
                  <span style="background:var(--accent);color:#fff;font-weight:800;font-size:0.75rem;padding:2px 9px;border-radius:12px;">"${escapeHtml(post.trigger_keyword)}"</span>
                ` : `<span style="font-size:0.75rem;color:var(--text-muted);font-style:italic;">No DM Automation</span>`}
              </div>
              <div style="text-align:right;">
                ${post.dms_delivered_count > 0 ? `
                  <div style="font-size:0.7rem;color:var(--text-muted);">💌 DMs Sent</div>
                  <div style="font-size:1.1rem;font-weight:800;color:#7C3AED;">${post.dms_delivered_count}</div>
                ` : ''}
              </div>
            </div>

            <!-- Audio if reel -->
            ${post.trending_song_title ? `
              <div style="font-size:0.75rem;color:var(--text-muted);">🎵 ${escapeHtml(post.trending_song_title)}</div>
            ` : ''}

            <!-- Deliverable link -->
            ${post.deliverable_url || post.ig_permalink ? `
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:auto;">
                ${post.deliverable_url ? `
                  <a href="${escapeHtml(post.deliverable_url)}" target="_blank" style="font-size:0.75rem;color:var(--accent);text-decoration:none;font-weight:700;display:flex;align-items:center;gap:3px;">
                    ${post.deliverable_url.toLowerCase().includes('.pdf') ? '📄 PDF Resource' : '🔗 Resource Link'} ↗
                  </a>
                ` : ''}
              </div>
            ` : ''}

          </div>

          <!-- Footer: Published At + IG link -->
          <div style="padding:0.75rem 1rem;background:var(--bg-hover,#F8FAFC);border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <div style="font-size:0.72rem;color:var(--text-muted);">🕐 ${publishedAt}</div>
            ${permalink !== '#' ? `
              <a href="${escapeHtml(permalink)}" target="_blank" class="btn btn-secondary btn-xs" style="font-weight:700;text-decoration:none;font-size:0.75rem;padding:4px 10px;white-space:nowrap;">
                View Live on IG ↗
              </a>
            ` : `<span style="font-size:0.75rem;color:var(--text-muted);">Link pending</span>`}
          </div>

        </div>`;
    }).join('');

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.5rem;">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.2rem;font-weight:800;margin:0;">📡 Live Published Posts — Audit Log</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin:0.2rem 0 0 0;">
              Every post live on Instagram — showing publish origin, destination page, content type, DMs delivered, and live link.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="instagramView.loadAll()" style="font-weight:700;">🔄 Refresh</button>
        </div>

        <!-- KPI Strip -->
        ${kpiHtml}

        <!-- Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem;">
          ${cardsHtml}
        </div>

      </div>`;
  },


  // ═════════════════════════════════════════════════════════════════════
  // 3. MONITORED CHANNELS VIEW (Channel Tracker & Auto-Ingest)
  // ═════════════════════════════════════════════════════════════════════

  // ═════════════════════════════════════════════════════════════════════
  // 3. MONITORED CHANNELS VIEW (Channel Tracker & Auto-Ingest)
  // ═════════════════════════════════════════════════════════════════════
  renderChannelsView(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Banner Card -->
        <div class="card" style="border: 2px solid rgba(217, 119, 87, 0.3); background: #FFFFFF; padding: 1.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; gap: 1rem; align-items: center;">
              <div style="font-size: 2.2rem;">📡</div>
              <div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                  Automated Instagram Channel Tracker & Ingestion Engine
                </h3>
                <p style="font-size: 0.86rem; color: var(--text-secondary); margin: 0.25rem 0 0 0; max-width: 650px;">
                  Add target Instagram accounts (e.g. <code>@python.learning</code>, <code>@github</code>). Our autonomous agent tracks their latest posts, extracts viral hooks & topics, recommends trending songs, and auto-stages brand-customized posts ready for 1-click publishing.
                </p>
              </div>
            </div>

            <button id="btn-sync-all-channels" class="btn btn-primary" onclick="instagramView.syncAllChannels()" style="font-weight: 700; padding: 0.7rem 1.25rem; white-space: nowrap; background: var(--accent); border-color: var(--accent);">
              🔄 Check All Channels for New Posts
            </button>
          </div>

          <!-- Add Channel Input Form -->
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);">
            <input type="text" id="ig-add-channel-input" class="form-input" style="flex: 1; min-width: 320px; font-size: 0.95rem; padding: 0.75rem 1rem;" placeholder="Enter Instagram username (e.g. @python.learning) or profile URL" />
            <button id="ig-add-channel-btn" class="btn btn-secondary" onclick="instagramView.addChannel()" style="font-weight: 700; white-space: nowrap; padding: 0.75rem 1.4rem;">
              ➕ Add Monitored Channel
            </button>
          </div>

          <!-- Quick Presets -->
          <div style="display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap;">
            <span>💡 <strong>Suggested Tech Channels to Track:</strong></span>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-add-channel-input').value = '@github';" style="color: var(--accent); text-decoration: underline;">@github</a>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-add-channel-input').value = '@python.learning';" style="color: var(--accent); text-decoration: underline;">@python.learning</a>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-add-channel-input').value = '@coding.engineer';" style="color: var(--accent); text-decoration: underline;">@coding.engineer</a>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-add-channel-input').value = '@docker';" style="color: var(--accent); text-decoration: underline;">@docker</a>
          </div>
        </div>

        <!-- Tracked Channels Grid -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
            Monitored Accounts (${this.trackedChannels.length})
          </h3>
          <span style="font-size: 0.82rem; color: var(--text-muted);">
            Auto-checking every 30 mins or whenever you click "Check New Posts"
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem;">
          ${this.trackedChannels.map(ch => this.renderChannelCard(ch)).join('')}
        </div>
      </div>
    `;
  },

  renderChannelCard(ch) {
    const avatar = ch.avatar_url || '/generated/assets/brand_logo.svg';
    const isActive = Boolean(ch.is_active);

    return `
      <div class="card" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'};">
        <div>
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <img src="${avatar}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color); background: #eee;" onerror="this.onerror=null; this.src='/generated/assets/brand_logo.svg';" />
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  @${escapeHtml(ch.username)}
                </h4>
                <span class="badge" style="background: ${isActive ? '#E8F5E9' : '#ECEFF1'}; color: ${isActive ? '#2E7D32' : '#607D8B'}; font-weight: 700; font-size: 0.72rem;">
                  ${isActive ? '🟢 Active Tracking' : '⏸️ Paused'}
                </span>
              </div>
              <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-top: 2px;">
                ${escapeHtml(ch.display_name || ch.username)}
              </div>
            </div>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(ch.bio || 'Public tech channel monitored for engineering breakthroughs and viral carousels.')}
          </p>

          <div style="display: flex; gap: 0.75rem; background: var(--bg-hover, #F8FAFC); padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.78rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; justify-content: space-between;">
            <span>👥 ${ch.followers_count || 'N/A'} Followers</span>
            <span>📸 ${ch.posts_count || 'N/A'} Posts</span>
            <span>⚡ ${ch.synced_posts_count || 0} Ingested</span>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            Last checked: ${ch.last_scraped_at ? new Date(ch.last_scraped_at).toLocaleTimeString() : 'Pending first sync'}
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-xs" onclick="instagramView.syncChannel(${ch.id})" style="font-weight: 700; flex: 1; padding: 0.4rem 0.6rem;">
            🔄 Check New Posts
          </button>
          <button class="btn btn-secondary btn-xs" onclick="instagramView.toggleChannel(${ch.id})" style="font-weight: 600; padding: 0.4rem 0.6rem;">
            ${isActive ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <a href="${ch.profile_url || '#'}" target="_blank" class="btn btn-secondary btn-xs" style="font-weight: 600; text-decoration: none; padding: 0.4rem 0.6rem;">
            🌐 Profile
          </a>
          <button class="btn btn-secondary btn-xs" onclick="instagramView.deleteChannel(${ch.id}, '@${ch.username}')" style="color: #D32F2F; font-weight: 700; padding: 0.4rem 0.6rem;">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  async addChannel() {
    const inputEl = document.getElementById('ig-add-channel-input');
    const btn = document.getElementById('ig-add-channel-btn');
    if (!inputEl) return;
    const input = inputEl.value.trim();
    if (!input) {
      app.showToast('Please enter an Instagram username or URL', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerText = '⏳ Verifying & Adding...';
      const res = await fetch('/api/instagram/tracked-channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add channel');

      app.showToast(data.message || 'Channel added to tracker!', 'success');
      inputEl.value = '';
      await this.loadAll();
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '➕ Add Monitored Channel';
    }
  },

  async syncChannel(channelId) {
    try {
      app.showToast('📡 Checking channel for new posts...', 'info');
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sync failed');

      if (data.synced) {
        app.showToast(data.message || '🎉 New post staged to queue!', 'success');
        await this.loadAll();
        this.switchSubTab('queue');
      } else {
        app.showToast(data.message || 'Account is up to date.', 'info');
        await this.loadAll();
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async syncAllChannels() {
    const btn = document.getElementById('btn-sync-all-channels');
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Checking All Accounts...';
      }
      app.showToast('📡 Checking all monitored accounts for new posts...', 'info');
      const res = await fetch('/api/instagram/tracked-channels/sync-all', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sync all failed');

      if (data.newPostsAdded > 0) {
        app.showToast(`🎉 Found and staged ${data.newPostsAdded} new post(s) into your Queue!`, 'success');
        await this.loadAll();
        this.switchSubTab('queue');
      } else {
        app.showToast(`Checked ${data.totalChannels} channels. All up to date!`, 'info');
        await this.loadAll();
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '🔄 Check All Channels for New Posts';
      }
    }
  },

  async toggleChannel(channelId) {
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Toggle failed');
      await this.loadAll();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async deleteChannel(channelId, username) {
    if (!confirm(`Are you sure you want to stop tracking ${username}?`)) return;
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      app.showToast(`Removed ${username} from monitored channels`, 'info');
      await this.loadAll();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 4. BRAND & CREATIVE ASSET STUDIO VIEW ("Imaginary Section with Logos")
  // ═════════════════════════════════════════════════════════════════════
  renderBrandView(container) {
    const assets = this.brandAssets;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Header Banner -->
        <div class="card" style="border: 2px solid rgba(217, 119, 87, 0.3); background: #FFFFFF; padding: 1.75rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="font-size: 2.2rem;">🎨</div>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                Brand Identity & Creative Asset Studio
              </h3>
              <p style="font-size: 0.86rem; color: var(--text-secondary); margin: 0.25rem 0 0 0; max-width: 720px;">
                Configure your official brand logos, watermark placement rules, creator handle, and visual styling. Every generated 6-slide carousel, video reel, and companion notes document will dynamically inherit these creative assets.
              </p>
            </div>
          </div>
        </div>

        <!-- Two Column Studio: Controls on Left, Live Carousel Simulator on Right -->
        <div style="display: grid; grid-template-columns: minmax(360px, 1.2fr) minmax(320px, 1fr); gap: 1.5rem; align-items: start;">
          <!-- Left Column: Form Controls -->
          <div class="card" style="padding: 1.75rem;">
            <h4 style="font-size: 1.1rem; font-weight: 800; margin-top: 0; color: var(--text-primary); margin-bottom: 1.25rem;">
              ⚙️ Brand Profile & Watermark Settings
            </h4>

            <div style="display: flex; flex-direction: column; gap: 1.2rem;">
              <!-- Brand Name -->
              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                  Brand / Channel Name
                </label>
                <input type="text" id="brand-name-input" class="form-input" value="${escapeHtml(assets.brand_name || 'Omni Engineering & AI')}" oninput="instagramView.updateLivePreview()" style="width: 100%; font-size: 0.92rem; padding: 0.65rem 0.85rem;" />
              </div>

              <!-- Instagram Handle -->
              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                  Official Instagram Handle
                </label>
                <input type="text" id="brand-handle-input" class="form-input" value="${escapeHtml(assets.brand_handle || '@harshparmar007__')}" oninput="instagramView.updateLivePreview()" style="width: 100%; font-size: 0.92rem; padding: 0.65rem 0.85rem;" />
                <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; display: block;">This handle is printed on carousel covers, footer watermarks, and CTA slides.</span>
              </div>

              <!-- Brand Tagline -->
              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                  Brand Tagline
                </label>
                <input type="text" id="brand-tagline-input" class="form-input" value="${escapeHtml(assets.brand_tagline || 'Handwritten Engineering Guides & Autonomous Notes')}" oninput="instagramView.updateLivePreview()" style="width: 100%; font-size: 0.92rem; padding: 0.65rem 0.85rem;" />
              </div>

              <!-- Logo Manager & Presets -->
              <div style="background: var(--bg-hover, #F8FAFC); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.5rem;">
                  Official Brand Logo
                </label>
                <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.85rem;">
                  <img id="brand-logo-preview" src="${assets.brand_logo_url || '/generated/assets/brand_logo.svg'}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: contain; background: #18181B; padding: 4px; border: 2px solid var(--border-color);" />
                  <div style="flex: 1;">
                    <input type="text" id="brand-logo-url-input" class="form-input" value="${escapeHtml(assets.brand_logo_url || '/generated/assets/brand_logo.svg')}" oninput="instagramView.updateLogoFromInput()" style="width: 100%; font-size: 0.85rem; padding: 0.5rem 0.75rem;" placeholder="Image URL or /generated/assets/logo.svg" />
                  </div>
                </div>

                <!-- Logo Presets -->
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem;">
                  Preset Tech Logos:
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button type="button" class="btn btn-xs btn-secondary" onclick="instagramView.selectPresetLogo('/generated/assets/brand_logo.svg')">
                    💫 Omni Core
                  </button>
                  <button type="button" class="btn btn-xs btn-secondary" onclick="instagramView.selectPresetLogo('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')">
                    🐙 GitHub Mark
                  </button>
                  <button type="button" class="btn btn-xs btn-secondary" onclick="instagramView.selectPresetLogo('https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg')">
                    🐍 Python Emblem
                  </button>
                  <button type="button" class="btn btn-xs btn-secondary" onclick="instagramView.selectPresetLogo('https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg')">
                    🐳 Docker Whale
                  </button>
                </div>
              </div>

              <!-- Watermark Placement Dropdown -->
              <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                  Watermark Placement on Carousel Slides
                </label>
                <select id="brand-watermark-pos-select" class="form-input" onchange="instagramView.updateLivePreview()" style="width: 100%; font-size: 0.92rem; padding: 0.65rem 0.85rem;">
                  <option value="top-right" ${assets.brand_watermark_position === 'top-right' ? 'selected' : ''}>Top-Right Corner Pill (Recommended)</option>
                  <option value="bottom-right" ${assets.brand_watermark_position === 'bottom-right' ? 'selected' : ''}>Bottom-Right Corner Pill</option>
                  <option value="slide-footer" ${assets.brand_watermark_position === 'slide-footer' ? 'selected' : ''}>Slide Footer Bar</option>
                  <option value="none" ${assets.brand_watermark_position === 'none' ? 'selected' : ''}>No Watermark</option>
                </select>
              </div>

              <!-- Watermark Opacity Slider -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                  <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                    Watermark Opacity
                  </label>
                  <span id="brand-opacity-label" style="font-size: 0.85rem; font-weight: 800; color: var(--accent);">
                    ${Math.round((assets.brand_watermark_opacity || 0.9) * 100)}%
                  </span>
                </div>
                <input type="range" id="brand-opacity-slider" min="0.2" max="1.0" step="0.05" value="${assets.brand_watermark_opacity || 0.9}" oninput="instagramView.updateOpacityLabel(this.value)" style="width: 100%;" />
              </div>

              <!-- Brand Colors -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                    Primary Brand Color
                  </label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="color" id="brand-primary-color" value="${assets.brand_primary_color || '#D97757'}" onchange="instagramView.updateLivePreview()" style="width: 44px; height: 38px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color);" />
                    <input type="text" id="brand-primary-hex" value="${assets.brand_primary_color || '#D97757'}" class="form-input" style="flex: 1; font-size: 0.85rem; padding: 0.5rem;" oninput="document.getElementById('brand-primary-color').value = this.value; instagramView.updateLivePreview();" />
                  </div>
                </div>

                <div>
                  <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.3rem;">
                    Accent Color
                  </label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="color" id="brand-accent-color" value="${assets.brand_accent_color || '#1A73E8'}" onchange="instagramView.updateLivePreview()" style="width: 44px; height: 38px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color);" />
                    <input type="text" id="brand-accent-hex" value="${assets.brand_accent_color || '#1A73E8'}" class="form-input" style="flex: 1; font-size: 0.85rem; padding: 0.5rem;" oninput="document.getElementById('brand-accent-color').value = this.value; instagramView.updateLivePreview();" />
                  </div>
                </div>
              </div>

              <!-- 24/7 Autonomous Auto-Pilot Controls -->
              <div style="background: var(--bg-hover, #F8FAFC); padding: 1.1rem; border-radius: 10px; border: 1.5px solid rgba(124, 58, 237, 0.25); margin-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary);">
                      ⚡ 24/7 Autonomous Watchdog & Auto-Pilot
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px;">
                      Automatically post approved content without requiring manual review.
                    </div>
                  </div>
                  <button type="button" class="btn btn-sm ${this.autonomousConfig?.autopilot_enabled ? 'btn-danger' : 'btn-primary'}" onclick="instagramView.toggleAutopilotMode(${!this.autonomousConfig?.autopilot_enabled})" style="font-weight: 800; padding: 0.4rem 0.85rem;">
                    ${this.autonomousConfig?.autopilot_enabled ? '⏸️ Pause Auto-Pilot' : '⚡ Enable Auto-Pilot'}
                  </button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-top: 0.75rem;">
                  <div>
                    <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.2rem;">
                      Daily Post Cap
                    </label>
                    <input type="number" id="settings-daily-cap" min="1" max="10" value="${this.autonomousConfig?.daily_post_cap || 3}" class="form-input" style="width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem;" />
                  </div>
                  <div>
                    <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.2rem;">
                      Min Score Threshold (0-100)
                    </label>
                    <input type="number" id="settings-min-score" min="50" max="100" value="${this.autonomousConfig?.min_score_threshold || 70}" class="form-input" style="width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem;" />
                  </div>
                </div>
              </div>

              <!-- Save Button -->
              <div style="margin-top: 1rem;">
                <button id="btn-save-brand" class="btn btn-primary" onclick="instagramView.saveBrandAssets()" style="width: 100%; font-weight: 800; padding: 0.8rem; background: var(--accent); border-color: var(--accent); font-size: 1rem;">
                  💾 Save All Studio & Brand Settings
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Simulated Instagram 4:5 Carousel Preview -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;">
                ✨ Live 4:5 Instagram Simulator
              </span>
              <span class="badge" style="background: #E1F5FE; color: #0288D1; font-weight: 700; font-size: 0.75rem;">
                Real-Time Preview
              </span>
            </div>

            <!-- Simulated 4:5 Instagram Carousel Canvas -->
            <div id="carousel-sim-box" style="position: relative; width: 100%; aspect-ratio: 4/5; max-width: 440px; margin: 0 auto; background: #FCFCF9; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.12); border: 2px solid #E5E7EB; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem 1.5rem 1.25rem 2.8rem;">
              
              <!-- Ruled lines background simulator -->
              <div style="position: absolute; inset: 0; background: repeating-linear-gradient(#FCFCF9, #FCFCF9 26px, #E5EDFA 26px, #E5EDFA 28px); pointer-events: none; opacity: 0.8;"></div>

              <!-- Vertical Margin Line -->
              <div style="position: absolute; top: 0; bottom: 0; left: 2.2rem; width: 2px; background: #FFA8A8; pointer-events: none;"></div>

              <!-- Left Wire Spirals -->
              <div style="position: absolute; top: 0; bottom: 0; left: 0.4rem; display: flex; flex-direction: column; justify-content: space-around; pointer-events: none;">
                ${Array(12).fill(0).map(() => `
                  <div style="width: 14px; height: 18px; border-radius: 6px; border: 2.5px solid #888; background: #e0e0e0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);"></div>
                `).join('')}
              </div>

              <!-- Top Bar / Dynamic Watermark -->
              <div style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start;">
                <!-- Tag Badge -->
                <div style="background: #FFF9C4; border: 1.5px dashed #F57F17; color: #E65100; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-family: 'Segoe Print', cursive, sans-serif;">
                  ⚡ HANDWRITTEN DOSSIER
                </div>

                <!-- Dynamic Watermark Pill (Top-Right) -->
                <div id="sim-watermark-top" style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.92); border: 1.5px solid #1A73E8; padding: 3px 10px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                  <img id="sim-logo-img" src="${assets.brand_logo_url || '/generated/assets/brand_logo.svg'}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: contain;" />
                  <span id="sim-handle-text" style="font-size: 0.75rem; font-weight: 800; color: #1A73E8; font-family: 'Segoe Print', cursive, sans-serif;">
                    ${assets.brand_handle || '@harshparmar007__'}
                  </span>
                </div>
              </div>

              <!-- Center Cover Content Simulator -->
              <div style="position: relative; z-index: 2; text-align: center; margin-top: 1rem;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #D97757; font-family: 'Segoe Print', cursive, sans-serif; letter-spacing: 1px;">
                  AUTONOMOUS ENGINEERING NOTES
                </div>
                <div id="sim-title" style="font-size: 1.5rem; font-weight: 900; color: #1A73E8; font-family: 'Segoe Print', cursive, sans-serif; line-height: 1.25; margin: 0.4rem 0;">
                  SYSTEM DESIGN & ARCHITECTURE
                </div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #2E7D32; font-family: 'Segoe Print', cursive, sans-serif;">
                  ★ 14-PAGE DEEP DIVE ★
                </div>

                <!-- 3 Mock Blueprint Boxes -->
                <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.2rem;">
                  <div style="background: #EEF4FF; border: 1.5px solid #1A73E8; border-radius: 6px; padding: 6px 10px; font-size: 0.65rem; font-weight: 700; color: #1A73E8;">
                    Blueprint ➔
                  </div>
                  <div style="background: #FBE9E7; border: 1.5px solid #D84315; border-radius: 6px; padding: 6px 10px; font-size: 0.65rem; font-weight: 700; color: #D84315;">
                    Engine ⚙️
                  </div>
                  <div style="background: #E8F5E9; border: 1.5px solid #2E7D32; border-radius: 6px; padding: 6px 10px; font-size: 0.65rem; font-weight: 700; color: #2E7D32;">
                    Production 🌐
                  </div>
                </div>

                <!-- Author signature -->
                <div style="margin-top: 1.25rem; font-size: 0.85rem; font-weight: 800; font-family: 'Segoe Print', cursive, sans-serif;">
                  <span style="color: #444;">by </span>
                  <span id="sim-author-name" style="color: #D32F2F;">${assets.brand_name || 'Omni Engineering & AI'}</span>
                </div>
              </div>

              <!-- Bottom Bar & CTA Simulator -->
              <div style="position: relative; z-index: 2;">
                <!-- Dynamic Footer Bar (If selected) -->
                <div id="sim-watermark-footer" style="display: none; text-align: center; font-size: 0.72rem; color: #666; font-family: 'Segoe Print', cursive, sans-serif; margin-bottom: 6px;">
                  <span id="sim-footer-text">${assets.brand_name} • ${assets.brand_handle} • DM for Notes</span>
                </div>

                <!-- Swipe CTA Pill -->
                <div style="background: #1A73E8; color: #FFFFFF; border-radius: 10px; padding: 8px 12px; text-align: center; font-size: 0.78rem; font-weight: 800; font-family: 'Segoe Print', cursive, sans-serif; box-shadow: 0 4px 10px rgba(26,115,232,0.3);">
                  SWIPE TO OPEN HANDWRITTEN NOTES &gt;&gt;
                </div>
              </div>
            </div>

            <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
              Preview reflects how your logo, watermark position, and colors render on Slide 1.
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateLivePreview();
  },

  selectPresetLogo(url) {
    const input = document.getElementById('brand-logo-url-input');
    if (input) {
      input.value = url;
      this.updateLogoFromInput();
    }
  },

  updateLogoFromInput() {
    const url = document.getElementById('brand-logo-url-input')?.value || '/generated/assets/brand_logo.svg';
    const preview = document.getElementById('brand-logo-preview');
    const simLogo = document.getElementById('sim-logo-img');
    if (preview) preview.src = url;
    if (simLogo) simLogo.src = url;
  },

  updateOpacityLabel(val) {
    const label = document.getElementById('brand-opacity-label');
    if (label) label.innerText = `${Math.round(val * 100)}%`;
    this.updateLivePreview();
  },

  updateLivePreview() {
    const name = document.getElementById('brand-name-input')?.value || 'Omni Engineering & AI';
    const handle = document.getElementById('brand-handle-input')?.value || '@harshparmar007__';
    const pos = document.getElementById('brand-watermark-pos-select')?.value || 'top-right';
    const opacity = document.getElementById('brand-opacity-slider')?.value || 0.9;
    const primaryColor = document.getElementById('brand-primary-color')?.value || '#D97757';

    // Update text elements
    const handleEl = document.getElementById('sim-handle-text');
    const authorEl = document.getElementById('sim-author-name');
    const footerEl = document.getElementById('sim-footer-text');
    if (handleEl) handleEl.innerText = handle;
    if (authorEl) authorEl.innerText = name;
    if (footerEl) footerEl.innerText = `${name} • ${handle} • DM for Notes`;

    // Position watermark
    const topW = document.getElementById('sim-watermark-top');
    const footerW = document.getElementById('sim-watermark-footer');

    if (topW) {
      topW.style.opacity = opacity;
      if (pos === 'top-right') {
        topW.style.display = 'flex';
        topW.style.marginLeft = 'auto';
      } else if (pos === 'top-left') {
        topW.style.display = 'flex';
        topW.style.order = '-1';
      } else if (pos === 'bottom-right') {
        topW.style.display = 'none';
      } else if (pos === 'slide-footer' || pos === 'none') {
        topW.style.display = 'none';
      }
    }

    if (footerW) {
      footerW.style.display = (pos === 'slide-footer') ? 'block' : 'none';
      footerW.style.opacity = opacity;
    }
  },

  async saveBrandAssets() {
    const btn = document.getElementById('btn-save-brand');
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Saving All Settings...';
      }

      const payload = {
        brand_name: document.getElementById('brand-name-input')?.value.trim() || 'Omni Engineering & AI',
        brand_handle: document.getElementById('brand-handle-input')?.value.trim() || '@harshparmar007__',
        brand_tagline: document.getElementById('brand-tagline-input')?.value.trim() || '',
        brand_logo_url: document.getElementById('brand-logo-url-input')?.value.trim() || '/generated/assets/brand_logo.svg',
        brand_watermark_position: document.getElementById('brand-watermark-pos-select')?.value || 'top-right',
        brand_watermark_opacity: parseFloat(document.getElementById('brand-opacity-slider')?.value || 0.9),
        brand_primary_color: document.getElementById('brand-primary-color')?.value || '#D97757',
        brand_accent_color: document.getElementById('brand-accent-color')?.value || '#1A73E8',
        instagram_handle: document.getElementById('brand-handle-input')?.value.trim() || '@harshparmar007__'
      };

      const dailyCapEl = document.getElementById('settings-daily-cap');
      const minScoreEl = document.getElementById('settings-min-score');
      const autoPayload = {};
      if (dailyCapEl) autoPayload.daily_post_cap = parseInt(dailyCapEl.value, 10) || 3;
      if (minScoreEl) autoPayload.min_score_threshold = parseInt(minScoreEl.value, 10) || 70;

      const [resBrand, resAuto] = await Promise.all([
        fetch('/api/instagram/brand-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }),
        Object.keys(autoPayload).length > 0 ? fetch('/api/instagram/autonomous/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(autoPayload)
        }) : Promise.resolve({ ok: true, json: () => ({ success: true }) })
      ]);

      const data = await resBrand.json();
      if (!data.success) throw new Error(data.error || 'Failed to save brand settings');

      this.brandAssets = { ...this.brandAssets, ...data.assets };
      if (autoPayload.daily_post_cap) this.autonomousConfig.daily_post_cap = autoPayload.daily_post_cap;
      if (autoPayload.min_score_threshold) this.autonomousConfig.min_score_threshold = autoPayload.min_score_threshold;

      app.showToast('✅ All Studio & Brand Settings saved successfully!', 'success');
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '💾 Save All Studio & Brand Settings';
      }
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 5. 1-CLICK LINK IMPORTER & SCRAPER VIEW (Fixed responsive buttons)
  // ═════════════════════════════════════════════════════════════════════
  renderScrapeView(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Input Card -->
        <div class="card" style="border: 2px solid rgba(217, 119, 87, 0.3); background: #FFFFFF; padding: 2rem;">
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
            <div style="font-size: 2.2rem;">📥</div>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                1-Click Instagram Post Importer & Intelligence Scraper
              </h3>
              <p style="font-size: 0.86rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">
                Paste ANY Instagram Reel, Carousel, or Post link. Extract high-performing hooks & captions, download media/videos locally, or immediately stage the post into your Ready to Post Queue!
              </p>
            </div>
          </div>

          <!-- URL Input Bar -->
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.25rem;">
            <input type="text" id="ig-scrape-url" class="form-input" style="flex: 1; min-width: 340px; font-size: 0.95rem; padding: 0.75rem 1rem;" placeholder="https://www.instagram.com/p/SHORTCODE/ or https://www.instagram.com/reel/SHORTCODE/" />
            
            <button id="ig-scrape-btn" class="btn btn-secondary" onclick="instagramView.executeScrape()" style="font-weight: 700; white-space: nowrap; min-width: max-content; padding: 0.75rem 1.2rem;">
              🔍 Inspect & Extract
            </button>
            
            <button id="ig-download-btn" class="btn btn-secondary" onclick="instagramView.executeDownloadMedia()" style="font-weight: 700; white-space: nowrap; min-width: max-content; padding: 0.75rem 1.2rem;">
              📥 Download Media & Caption
            </button>

            <button id="ig-scrape-research-btn" class="btn btn-primary" onclick="instagramView.executeScrapeAndResearch()" style="font-weight: 700; white-space: nowrap; min-width: max-content; padding: 0.75rem 1.25rem; background: var(--accent); border-color: var(--accent);">
              🚀 Scrape & Auto-Launch Research
            </button>
          </div>

          <!-- Quick Test Links -->
          <div style="display: flex; gap: 1rem; margin-top: 1rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap;">
            <span>💡 <strong>Quick Test Links:</strong></span>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-scrape-url').value = 'https://www.instagram.com/github/p/DdpgyGIgcQC/';" style="color: var(--accent); text-decoration: underline;">GitHub Post (AI Engineering)</a>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-scrape-url').value = 'https://www.instagram.com/github/';" style="color: var(--accent); text-decoration: underline;">GitHub Profile</a>
            <a href="javascript:void(0)" onclick="document.getElementById('ig-scrape-url').value = 'https://www.instagram.com/python.learning/';" style="color: var(--accent); text-decoration: underline;">Python.Learning Profile</a>
          </div>
        </div>

        <!-- Scraper Results Container -->
        <div id="ig-scrape-results"></div>
      </div>
    `;
  },

  async executeScrape() {
    const urlInput = document.getElementById('ig-scrape-url');
    const resultsContainer = document.getElementById('ig-scrape-results');
    const btn = document.getElementById('ig-scrape-btn');
    if (!urlInput || !resultsContainer) return;

    const url = urlInput.value.trim();
    if (!url) {
      app.showToast('Please enter a valid Instagram URL', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerText = '⏳ Extracting...';
      resultsContainer.innerHTML = `
        <div class="card" style="text-align: center; padding: 2.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🕷️</div>
          <div style="font-weight: 700; color: var(--text-primary);">Extracting metadata via Playwright & Instagram Bridge...</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.3rem;">Bypassing login walls and extracting hooks, likes, and comments...</div>
        </div>
      `;

      const res = await fetch('/api/instagram/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (!data.success || !data.data || !data.data.success) {
        throw new Error(data.error || (data.data && data.data.error) || 'Failed to extract data');
      }

      this.lastScrapedItem = data.data;
      const item = data.data;

      if (item.type === 'profile') {
        resultsContainer.innerHTML = `
          <div class="card" style="padding: 1.5rem; border-left: 4px solid var(--accent);">
            <div style="display: flex; gap: 1.25rem; align-items: flex-start; flex-wrap: wrap;">
              ${item.profile_pic ? `<img src="${item.profile_pic}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);" />` : '<div style="width: 72px; height: 72px; border-radius: 50%; background: #E8EAF6; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">👤</div>'}
              <div style="flex: 1;">
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0;">@${item.username}</h3>
                  <span class="badge" style="background: #E8F5E9; color: #2E7D32; font-weight: 700;">Public Profile</span>
                </div>
                <div style="display: flex; gap: 1.5rem; margin: 0.6rem 0; font-size: 0.88rem; font-weight: 600;">
                  <span>👥 <strong>${item.followers}</strong> Followers</span>
                  <span>🔄 <strong>${item.following}</strong> Following</span>
                  <span>📸 <strong>${item.posts_count}</strong> Posts</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.4rem 0;">${item.bio}</p>
                
                <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  <button class="btn btn-sm btn-primary" onclick="instagramView.addChannelDirect('@${item.username}')">
                    ➕ Add @${item.username} to Monitored Channels
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="app.navigate('research'); document.getElementById('research-topic').value = '${item.username} engineering updates';">
                    Conduct Deep Research ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Post extraction
        resultsContainer.innerHTML = `
          <div class="card" style="padding: 1.75rem; border-left: 4px solid #10B981;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
              <div>
                <span class="badge" style="background: #E1F5FE; color: #0288D1; font-weight: 700; text-transform: uppercase;">Extracted Post</span>
                <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.4rem 0 0 0; color: var(--text-primary);">${item.hook}</h3>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">By <strong>@${item.owner}</strong> • ${item.likes} Likes • ${item.comments} Comments</div>
              </div>

              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="instagramView.stageLastScrapedPost()" style="font-weight: 800; background: #10B981; border-color: #10B981;">
                  ⚡ 1-Click Stage to Post Queue
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramView.executeScrapeAndResearch('${item.url}')" style="font-weight: 700;">
                  🚀 Generate 14-Page Notes PDF
                </button>
              </div>
            </div>

            <div style="margin: 1.2rem 0; padding: 1rem; background: var(--bg-hover, #F8FAFC); border-radius: 8px; font-size: 0.86rem; line-height: 1.5; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Full Caption:</strong>
                <button class="btn btn-xs btn-secondary" onclick="navigator.clipboard.writeText('${escapeHtml(item.caption).replace(/'/g, "\\'")}'); app.showToast('Caption copied to clipboard!', 'success');">
                  📋 Copy Caption
                </button>
              </div>
              <div style="white-space: pre-wrap;">${escapeHtml(item.caption)}</div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">Detected Topic:</span>
              <span class="badge" style="background: var(--accent); color: #fff; font-weight: 800;">${item.detected_topic}</span>
              ${item.thumbnail_url ? `<a href="${item.thumbnail_url}" target="_blank" class="badge" style="background: #E8EAF6; color: #3F51B5; text-decoration: none;">🖼️ View Full Image</a>` : ''}
            </div>
          </div>
        `;
      }
      app.showToast('✅ Instagram intelligence extracted successfully!', 'success');
    } catch (err) {
      resultsContainer.innerHTML = `<div class="card" style="padding: 1.5rem; color: #C62828;">❌ Scraping Error: ${err.message}</div>`;
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🔍 Inspect & Extract';
    }
  },

  async executeDownloadMedia() {
    const urlInput = document.getElementById('ig-scrape-url');
    const resultsContainer = document.getElementById('ig-scrape-results');
    const btn = document.getElementById('ig-download-btn');
    if (!urlInput || !resultsContainer) return;

    const url = urlInput.value.trim();
    if (!url) {
      app.showToast('Please enter an Instagram URL to download', 'error');
      return;
    }

    // Detect type from URL for better UX messaging
    const isReel = /\/reel\//i.test(url);
    const isCarousel = /\/p\//i.test(url);

    try {
      btn.disabled = true;
      btn.innerText = isReel ? '⏳ Downloading Reel...' : isCarousel ? '⏳ Extracting Carousel Slides...' : '⏳ Extracting Media...';

      resultsContainer.innerHTML = `
        <div class="card" style="text-align: center; padding: 2.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">${isReel ? '🎬' : isCarousel ? '🖼️' : '📥'}</div>
          <div style="font-weight: 700; color: var(--text-primary);">
            ${isReel ? 'Downloading reel via yt-dlp...' : isCarousel ? 'Extracting all carousel slides via Playwright...' : 'Detecting media type and extracting...'}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.3rem;">
            ${isCarousel ? 'This may take 30–90 seconds for large carousels (15+ slides).' : 'Saving to /public/generated/downloads/...'}
          </div>
        </div>
      `;

      const res = await fetch('/api/instagram/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to download media');

      // ── CAROUSEL OR SINGLE IMAGE POST ─────────────────────────────────────
      if (data.is_carousel || data.type === 'carousel' || data.type === 'image' || (data.slides && data.slides.length > 0)) {
        const slides = data.slides || [];
        const isMulti = slides.length > 1;
        const slideGridHTML = slides.map(s => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
            <div style="position: relative; width: 160px; background: #000; border-radius: 8px; overflow: hidden; border: 2px solid var(--border-color); cursor: pointer;"
              onclick="window.open('${s.relative_url}', '_blank')" title="Click to open full size">
              <img src="${s.relative_url}" alt="Slide ${s.slide_number}"
                style="width: 160px; height: auto; display: block; object-fit: contain;"
                loading="lazy"
              />
              <div style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${s.slide_number} / ${slides.length}</div>
            </div>
            <a href="${s.relative_url}" download="${s.filename || 'slide_' + s.slide_number + '.jpg'}"
              style="font-size: 0.72rem; color: var(--accent); text-decoration: none; font-weight: 600;">
              ⬇️ Slide ${s.slide_number}
            </a>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${s.size_kb ? s.size_kb + ' KB' : ''}</div>
          </div>
        `).join('');

        resultsContainer.innerHTML = `
          <div class="card" style="padding: 1.75rem; border-left: 4px solid #7C3AED;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.2rem;">
              <div>
                <span class="badge" style="background: #EDE9FE; color: #5B21B6; font-weight: 700;">🖼️ ${isMulti ? 'Carousel' : 'Photo'} Downloaded — ${slides.length} Slide${isMulti ? 's' : ''}</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0.5rem 0 0.2rem 0; color: var(--text-primary);">
                  ${escapeHtml(data.title || 'Instagram Post')}
                </h3>
                ${data.owner ? `<div style="font-size: 0.82rem; color: var(--text-muted);">By <strong>@${escapeHtml(data.owner)}</strong>${data.likes ? ` • ❤️ ${data.likes}` : ''}${data.comments ? ` • 💬 ${data.comments}` : ''}</div>` : ''}
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${data.zip_relative_url ? `
                <a href="${data.zip_relative_url}" download class="btn btn-primary btn-sm" style="font-weight: 700; text-decoration: none; background: #7C3AED; border-color: #7C3AED;">
                  ⬇️ Download All ${slides.length} Slides (ZIP)
                </a>` : (slides.length === 1 ? `
                <a href="${slides[0].relative_url}" download class="btn btn-primary btn-sm" style="font-weight: 700; text-decoration: none; background: #7C3AED; border-color: #7C3AED;">
                  ⬇️ Download Full-Res Photo
                </a>` : '')}
                <button class="btn btn-secondary btn-sm" onclick="instagramView.stageCarouselSlides(${JSON.stringify(slides).replace(/"/g, '&quot;')}, '${escapeHtml(data.caption || '').replace(/'/g, "\\'")}')" style="font-weight: 700;">
                  ⚡ Stage ${isMulti ? 'All to Queue' : 'to Queue'}
                </button>
              </div>
            </div>

            <!-- Slide Grid — natural aspect ratio, 4 columns on desktop -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; padding: 1rem; background: var(--bg-hover, #F8FAFC); border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 1.2rem;">
              ${slideGridHTML || '<div style="color: var(--text-muted); font-size: 0.85rem;">No slides found.</div>'}
            </div>

            <!-- Caption -->
            ${data.caption ? `
            <div style="background: var(--bg-hover, #F8FAFC); padding: 1rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.6; border: 1px solid var(--border-color); max-height: 200px; overflow-y: auto;">
              <strong>📝 Extracted Caption:</strong>
              <div style="margin-top: 0.5rem; white-space: pre-wrap;">${escapeHtml(data.caption)}</div>
            </div>` : ''}
          </div>
        `;
        app.showToast(`✅ ${slides.length} slide${isMulti ? 's' : ''} downloaded successfully!`, 'success');

      // ── VIDEO / REEL ───────────────────────────────────────────────────────
      } else {
        resultsContainer.innerHTML = `
          <div class="card" style="padding: 1.75rem; border-left: 4px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
              <div>
                <span class="badge" style="background: #E8F5E9; color: #2E7D32; font-weight: 700;">✅ Video Downloaded</span>
                <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0.4rem 0 0 0; color: var(--text-primary);">${escapeHtml(data.title || 'Instagram Reel/Video')}</h3>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">By <strong>@${escapeHtml(data.uploader || '')}</strong>${data.duration ? ` • Duration: ${data.duration}s` : ''}</div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <a href="${data.relative_url}" download class="btn btn-primary btn-sm" style="font-weight: 700; text-decoration: none;">
                  ⬇️ Download MP4 File
                </a>
                <button class="btn btn-secondary btn-sm" onclick="instagramView.stageDownloadedVideo('${data.relative_url}', '${escapeHtml(data.title || '').replace(/'/g, "\\'")}', '${escapeHtml(data.caption || '').replace(/'/g, "\\'")}')" style="font-weight: 700;">
                  ⚡ Stage Video to Queue
                </button>
              </div>
            </div>
            <div style="margin: 1.2rem 0; display: flex; gap: 1.5rem; flex-wrap: wrap;">
              <video controls src="${data.relative_url}" style="max-width: 320px; max-height: 400px; border-radius: 8px; background: #000;"></video>
              ${data.caption ? `
              <div style="flex: 1; min-width: 280px; background: var(--bg-hover, #F8FAFC); padding: 1rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.5; border: 1px solid var(--border-color); max-height: 400px; overflow-y: auto;">
                <strong>📝 Extracted Caption:</strong>
                <div style="margin-top: 0.5rem; white-space: pre-wrap;">${escapeHtml(data.caption)}</div>
              </div>` : ''}
            </div>
          </div>
        `;
        app.showToast('✅ Video downloaded successfully!', 'success');
      }

    } catch (err) {
      resultsContainer.innerHTML = `<div class="card" style="padding: 1.5rem; color: #C62828;">❌ Download Error: ${err.message}</div>`;
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '📥 Download Media & Caption';
    }
  },

  async stageDownloadedVideo(relativeUrl, title, caption) {
    try {
      const res = await fetch('/api/instagram/stage-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook_text: title || 'Instagram Video',
          caption: caption || '',
          trigger_keyword: 'VIDEO',
          content_type: 'video',
          thumbnail_url: relativeUrl,
          media_urls: [relativeUrl],
          deliverable_url: relativeUrl
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to stage video');
      app.showToast('🎉 Video staged to Ready to Post Queue!', 'success');
      await this.loadAll();
      this.switchSubTab('queue');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async stageCarouselSlides(slides, caption) {
    try {
      const mediaUrls = slides.map(s => s.relative_url);
      const res = await fetch('/api/instagram/stage-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook_text: 'Instagram Carousel Post',
          caption: caption || '',
          trigger_keyword: 'CAROUSEL',
          content_type: 'carousel',
          thumbnail_url: mediaUrls[0] || '',
          media_urls: mediaUrls,
          deliverable_url: mediaUrls[0] || ''
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to stage carousel');
      app.showToast(`🎉 ${slides.length} carousel slides staged to Queue!`, 'success');
      await this.loadAll();
      this.switchSubTab('queue');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async stageLastScrapedPost() {
    if (!this.lastScrapedItem) {
      app.showToast('No scraped post available to stage', 'error');
      return;
    }
    const item = this.lastScrapedItem;
    const isPython = /python/i.test(item.caption + ' ' + item.hook);
    const isHack = /hackathon|challenge/i.test(item.caption + ' ' + item.hook);
    const keyword = isPython ? 'PYTHON' : (isHack ? 'HACK' : 'NOTES');

    const formattedCaption = `${item.hook} 🚀\n\nCurated by ${this.brandAssets.brand_handle}.\n\n👉 Comment "${keyword}" below and our AI agent will DM you the handwritten notes & full playbook!\n\n#softwareengineering #coding #learninpublic`;

    try {
      const res = await fetch('/api/instagram/stage-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook_text: item.hook,
          caption: formattedCaption,
          trigger_keyword: keyword,
          content_type: 'carousel',
          thumbnail_url: item.thumbnail_url || '/generated/assets/brand_logo.svg',
          media_urls: [item.thumbnail_url || '/generated/assets/brand_logo.svg'],
          deliverable_url: item.url
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to stage post');

      app.showToast('🎉 Post staged into Ready to Post Queue successfully!', 'success');
      await this.loadAll();
      this.switchSubTab('queue');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async stageDownloadedVideo(videoUrl, title, caption) {
    const keyword = 'CODE';
    const formattedCaption = `${title || 'Engineering Breakdown'} 🚀\n\nCurated by ${this.brandAssets.brand_handle}.\n\n👉 Comment "${keyword}" below for the complete resources!\n\n#tech #coding`;

    try {
      const res = await fetch('/api/instagram/stage-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook_text: title || 'Engineering Reel Breakdown',
          caption: formattedCaption,
          trigger_keyword: keyword,
          content_type: 'reel',
          thumbnail_url: '/generated/assets/brand_logo.svg',
          media_urls: [videoUrl],
          deliverable_url: 'http://localhost:4000'
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to stage video');

      app.showToast('🎉 Video staged into Ready to Post Queue!', 'success');
      await this.loadAll();
      this.switchSubTab('queue');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async addChannelDirect(username) {
    try {
      const res = await fetch('/api/instagram/tracked-channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: username })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add channel');

      app.showToast(data.message || `Added ${username} to monitored channels!`, 'success');
      await this.loadAll();
      this.switchSubTab('channels');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async executeScrapeAndResearch(optionalUrl) {
    const url = optionalUrl || document.getElementById('ig-scrape-url')?.value.trim();
    if (!url) {
      app.showToast('Please enter a valid Instagram URL', 'error');
      return;
    }

    const resultsContainer = document.getElementById('ig-scrape-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🤖</div>
          <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">Scraping Instagram & Synthesizing Deep Research...</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.4rem; line-height: 1.6;">
            1. Extracting viral hook from Instagram post<br />
            2. Multi-vector web discovery & live synthesis<br />
            3. Generating companion whitepaper & 14-page handwritten spiral notes PDF<br />
            4. Preparing 4:5 Instagram carousel with brand watermark and staging in queue...
          </div>
        </div>
      `;
    }

    try {
      app.showToast('🚀 Commencing autonomous Instagram ingestion pipeline...', 'success');
      const res = await fetch('/api/instagram/scrape-and-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to complete research');
      }

      app.showToast(`✅ Finished! Created campaign #${data.campaignId} for "${data.topic}"`, 'success');
      await this.loadAll();
      this.switchSubTab('queue');
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="card" style="padding: 1.5rem; color: #C62828;">❌ Ingestion Pipeline Error: ${err.message}</div>`;
      }
      app.showToast(err.message, 'error');
    }
  },

  async publishPost(postId) {
    try {
      app.showToast('🚀 Publishing to Instagram & arming InstaAuto bridge...', 'success');
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(data.message, 'success');
        await this.loadAll();
        this.switchSubTab('history');
      } else {
        throw new Error(data.error || 'Failed to publish post');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async postAndTriggerAutomation(postId) {
    try {
      app.showToast('🚀 Publishing reel & arming InstaAuto automation...', 'info');
      const res = await fetch('/api/instagram/instaauto/trigger-post-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`⚡ ${data.message || 'Published live and armed in InstaAuto!'}`, 'success');
        await this.loadAll();
        this.switchSubTab('history');
      } else {
        throw new Error(data.error || 'Failed to trigger post automation');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // 6. REST API & MICROSERVICE ENGINE VIEW (yt-dlp-api & aiograpi-rest)
  // ═════════════════════════════════════════════════════════════════════
  renderMicroserviceView(container) {
    const isOnline = this.microserviceStatus?.online;
    const baseUrl = this.microserviceStatus?.baseUrl || 'http://127.0.0.1:8001';
    const loggedInUser = this.microserviceStatus?.loggedInUser;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Service Hero Banner -->
        <div class="card" style="padding: 1.75rem; border: 2px solid rgba(26, 115, 232, 0.25); background: linear-gradient(135deg, rgba(26, 115, 232, 0.04) 0%, rgba(217, 119, 87, 0.04) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span class="badge" style="background: ${isOnline ? '#E8F5E9' : '#FFEBEE'}; color: ${isOnline ? '#2E7D32' : '#C62828'}; font-weight: 800; font-size: 0.8rem; padding: 4px 10px;">
                  ${isOnline ? '🟢 MICROSERVICE ACTIVE & ONLINE' : '🔴 SERVICE OFFLINE'}
                </span>
                <span style="font-size: 0.82rem; color: var(--text-muted);">Port: 8001 (FastAPI / Uvicorn)</span>
              </div>
              <h3 style="font-size: 1.35rem; font-weight: 800; margin: 0.4rem 0 0.2rem 0; color: var(--text-primary);">
                Unified Media Downloader & Instagram REST Engine
              </h3>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0; max-width: 650px;">
                Direct implementation of <strong>meube/yt-dlp-api</strong> (media & video extractor) and <strong>subzeroid/aiograpi-rest</strong> (Instagram authentication, Reel uploads, and Carousel albums).
              </p>
            </div>

            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
              <a href="http://127.0.0.1:8001/docs" target="_blank" class="btn btn-primary" style="font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.4rem;">
                <span>📖 Open Swagger UI Docs</span> ↗
              </a>
              <button class="btn btn-secondary" onclick="instagramView.pingMicroservice()" style="font-weight: 700;">
                ⚡ Ping Health
              </button>
            </div>
          </div>
        </div>

        <!-- 2-Column Dashboard Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
          
          <!-- Column 1: Settings & Authentication -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Connection URL Card -->
            <div class="card" style="padding: 1.5rem;">
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent); text-transform: uppercase;">Configuration</div>
              <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0.2rem 0 0.8rem 0;">Microservice Endpoint</h4>
              <p style="font-size: 0.83rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Default is local FastAPI service on <code>http://127.0.0.1:8001</code>. If using Docker container (e.g. <code>subzeroid/aiograpi-rest</code> or <code>meube/yt-dlp-api</code>), specify your container IP and port below.
              </p>

              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" id="microservice-url-input" class="form-input" style="flex: 1;" value="${baseUrl}" placeholder="http://127.0.0.1:8001" />
                <button class="btn btn-primary btn-sm" onclick="instagramView.saveMicroserviceConfig()" style="font-weight: 700; white-space: nowrap;">
                  💾 Save URL
                </button>
              </div>
            </div>

            <!-- Instagram Direct Session Authentication Card -->
            <div class="card" style="padding: 1.5rem; border-left: 4px solid #1A73E8;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-size: 0.75rem; font-weight: 800; color: #1A73E8; text-transform: uppercase;">subzeroid/aiograpi-rest</div>
                <span class="badge" style="background: ${loggedInUser ? '#E8F5E9' : '#FFF3E0'}; color: ${loggedInUser ? '#2E7D32' : '#E65100'}; font-weight: 700;">
                  ${loggedInUser ? `Logged in: @${loggedInUser}` : 'Session Inactive (Guest Mode)'}
                </span>
              </div>
              <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 0.4rem 0;">Direct Instagram Login</h4>
              <p style="font-size: 0.83rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Authenticate instagrapi session to upload Reels and multi-slide Carousels directly to Instagram without Meta Developer App setup.
              </p>

              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Instagram Username</label>
                  <input type="text" id="micro-ig-username" class="form-input" style="width: 100%;" placeholder="e.g. harshparmar007__" value="${loggedInUser || ''}" />
                </div>

                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Instagram Password</label>
                  <input type="password" id="micro-ig-password" class="form-input" style="width: 100%;" placeholder="Enter password (session kept in memory)" />
                </div>

                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">2FA Verification Code (Optional)</label>
                  <input type="text" id="micro-ig-2fa" class="form-input" style="width: 100%;" placeholder="SMS or Authenticator Code if 2FA enabled" />
                </div>

                <button id="btn-micro-login" class="btn btn-primary" onclick="instagramView.loginMicroservice()" style="font-weight: 800; padding: 0.7rem; margin-top: 0.5rem; background: #1A73E8; border-color: #1A73E8;">
                  🔐 Authenticate via /auth/login
                </button>

                <div style="position: relative; text-align: center; margin: 0.6rem 0;">
                  <span style="background: var(--bg-card); padding: 0 8px; font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">OR VIA BROWSER COOKIE</span>
                </div>

                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Instagram Session ID (Cookie)</label>
                  <input type="text" id="micro-ig-sessionid" class="form-input" style="width: 100%; font-size: 0.82rem;" placeholder="Paste sessionid cookie from browser devtools" />
                  <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 3px;">Bypasses 2FA challenges and password blocks instantly.</span>
                </div>

                <button id="btn-micro-session-login" class="btn btn-secondary" onclick="instagramView.loginMicroserviceSession()" style="font-weight: 800; padding: 0.6rem; margin-top: 0.2rem;">
                  🍪 Authenticate via sessionid Cookie
                </button>
              </div>
            </div>

            <!-- Repository Cards -->
            <div class="card" style="padding: 1.25rem;">
              <h5 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.75rem 0;">Integrated Open Source Engines</h5>
              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.83rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-hover, #F8FAFC); border-radius: 6px;">
                  <span><strong>yt-dlp/yt-dlp</strong> (Video Extractor)</span>
                  <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" style="color: var(--accent); font-weight: 700;">GitHub ↗</a>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-hover, #F8FAFC); border-radius: 6px;">
                  <span><strong>meube/yt-dlp-api</strong> (REST Wrapper)</span>
                  <a href="https://github.com/meube/yt-dlp-api" target="_blank" style="color: var(--accent); font-weight: 700;">GitHub ↗</a>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-hover, #F8FAFC); border-radius: 6px;">
                  <span><strong>subzeroid/instagrapi</strong> (Core Automation)</span>
                  <a href="https://github.com/subzeroid/instagrapi" target="_blank" style="color: var(--accent); font-weight: 700;">GitHub ↗</a>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-hover, #F8FAFC); border-radius: 6px;">
                  <span><strong>subzeroid/aiograpi-rest</strong> (FastAPI Service)</span>
                  <a href="https://github.com/subzeroid/aiograpi-rest" target="_blank" style="color: var(--accent); font-weight: 700;">GitHub ↗</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Interactive REST API Test Bench -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #10B981; text-transform: uppercase;">Live Test Bench</div>
              <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0.2rem 0 0.6rem 0;">Test Microservice Endpoints</h4>
              <p style="font-size: 0.83rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Execute live REST queries directly against the local FastAPI microservice and inspect JSON outputs.
              </p>

              <div style="margin-bottom: 1rem;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Target URL / Identifier</label>
                <input type="text" id="micro-test-url" class="form-input" style="width: 100%; font-size: 0.9rem;" value="https://www.instagram.com/github/p/DdpgyGIgcQC/" placeholder="https://www.instagram.com/p/... or username" />
              </div>

              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <button class="btn btn-secondary btn-sm" onclick="instagramView.testMicroserviceEndpoint('info')" style="font-weight: 700;">
                  🔍 GET /api/info
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramView.testMicroserviceEndpoint('download')" style="font-weight: 700;">
                  📥 POST /api/download
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramView.testMicroserviceEndpoint('user_info')" style="font-weight: 700;">
                  👤 User Profile
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramView.testMicroserviceEndpoint('health')" style="font-weight: 700;">
                  ⚡ Status
                </button>
              </div>

              <!-- Output JSON Box -->
              <div style="flex: 1; display: flex; flex-direction: column; background: #0F172A; border-radius: 8px; border: 1px solid #334155; overflow: hidden; min-height: 280px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #1E293B; border-bottom: 1px solid #334155; color: #94A3B8; font-size: 0.75rem; font-weight: 700;">
                  <span id="micro-response-title">⚡ Response Output</span>
                  <button class="btn btn-xs btn-secondary" onclick="instagramView.copyResponseJson()" style="padding: 2px 6px; font-size: 0.72rem;">
                    📋 Copy JSON
                  </button>
                </div>
                <pre id="micro-test-output" style="flex: 1; margin: 0; padding: 1rem; color: #38BDF8; font-family: monospace; font-size: 0.8rem; overflow: auto; line-height: 1.45; max-height: 400px;">Click any button above to test the FastAPI Microservice.</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async pingMicroservice() {
    try {
      app.showToast('Checking microservice health...', 'info');
      const res = await fetch('/api/instagram/microservice/status');
      const data = await res.json();
      if (data.online) {
        app.showToast('🟢 Microservice online and healthy!', 'success');
      } else {
        app.showToast(`🔴 Microservice offline: ${data.error || 'Connection refused'}`, 'error');
      }
      await this.loadAll();
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
    }
  },

  async saveMicroserviceConfig() {
    const url = document.getElementById('microservice-url-input')?.value.trim();
    if (!url) return;
    try {
      const res = await fetch('/api/instagram/microservice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ microservice_url: url })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`✅ Microservice URL saved: ${data.url}`, 'success');
        await this.loadAll();
      }
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
    }
  },

  async loginMicroservice() {
    const btn = document.getElementById('btn-micro-login');
    const username = document.getElementById('micro-ig-username')?.value.trim();
    const password = document.getElementById('micro-ig-password')?.value;
    const verification_code = document.getElementById('micro-ig-2fa')?.value.trim() || null;

    if (!username || !password) {
      app.showToast('Please enter both Instagram username and password', 'error');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Authenticating via instagrapi...';
      }
      const res = await fetch('/api/instagram/microservice/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, verification_code })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Authentication failed');

      app.showToast(data.message || `Successfully logged in as @${username}!`, 'success');
      await this.loadAll();
    } catch (err) {
      app.showToast(`Login failed: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '🔐 Authenticate via /auth/login';
      }
    }
  },

  async loginMicroserviceSession() {
    const btn = document.getElementById('btn-micro-session-login');
    const sessionId = document.getElementById('micro-ig-sessionid')?.value.trim();

    if (!sessionId) {
      app.showToast('Please enter your Instagram sessionid cookie string', 'error');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Authenticating via session ID...';
      }
      const res = await fetch('/api/instagram/microservice/login-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Session authentication failed');

      app.showToast(data.message || `Successfully logged in via session ID!`, 'success');
      await this.loadAll();
    } catch (err) {
      app.showToast(`Session auth failed: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '🍪 Authenticate via sessionid Cookie';
      }
    }
  },

  async testMicroserviceEndpoint(action) {
    const outputEl = document.getElementById('micro-test-output');
    const titleEl = document.getElementById('micro-response-title');
    const inputVal = document.getElementById('micro-test-url')?.value.trim();

    if (!outputEl) return;
    outputEl.innerText = 'Executing query against FastAPI microservice...';
    if (titleEl) titleEl.innerText = `Executing: ${action.toUpperCase()}...`;

    try {
      let res, data;
      if (action === 'info') {
        res = await fetch('/api/instagram/microservice/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputVal })
        });
        data = await res.json();
      } else if (action === 'download') {
        res = await fetch('/api/instagram/microservice/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputVal })
        });
        data = await res.json();
      } else if (action === 'user_info') {
        const username = inputVal.replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
        res = await fetch(`/api/instagram/tracked-channels/scrape-profile?username=${encodeURIComponent(username)}`);
        data = await res.json();
      } else {
        res = await fetch('/api/instagram/microservice/status');
        data = await res.json();
      }

      outputEl.innerText = JSON.stringify(data, null, 2);
      if (titleEl) titleEl.innerText = `Status: ${res.status} OK`;
      app.showToast('✅ Endpoint executed successfully!', 'success');
    } catch (err) {
      outputEl.innerText = `Error: ${err.message}`;
      if (titleEl) titleEl.innerText = 'Status: ERROR';
      app.showToast(`Execution error: ${err.message}`, 'error');
    }
  },

  copyResponseJson() {
    const outputEl = document.getElementById('micro-test-output');
    if (outputEl) {
      navigator.clipboard.writeText(outputEl.innerText);
      app.showToast('JSON copied to clipboard!', 'success');
    }
  },

  async publishPostViaMicroservice(postId) {
    try {
      app.showToast('🚀 Publishing via FastAPI REST Microservice (instagrapi)...', 'info');
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, publish_via: 'rest_microservice' })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(data.message, 'success');
        await this.loadAll();
        this.switchSubTab('history');
      } else {
        throw new Error(data.error || 'Failed to publish post via microservice');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  }
};

window.instagramView = instagramView;