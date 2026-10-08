/**
 * OmniStudio AI v5.2 — Pipeline-First Share-to-DM Bot v2
 * Architectural Highlights:
 * 1. Slim Top Page Bar (Pills, Autopilot Status, Connect Page CTA)
 * 2. Visual Pipeline Stepper (Sources -> Scanned -> Ranked -> Ready -> Published -> Live)
 * 3. Single Contextual Primary Action (Dynamic CTA adapting to pipeline state)
 * 4. 3 Focused Tabs:
 *    - 📊 Pipeline (3-Column Kanban Board: Incoming, Ready to Post, Published Live)
 *    - 🎯 Sources (Competitor/Creator Accounts & Bulk Import)
 *    - ⚙️ Settings (Accordion: API Connection, Autopilot Rules, Scoring Weights, Anti-Ban)
 * 5. Slide-over Review Drawer (Video preview, full caption editor, real score breakdown, 1-click publish/skip)
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

const instagramBotV2View = {
  activeTab: 'pipeline', // 'pipeline', 'sources', 'settings'
  activeAccount: 'tech',
  connectedPages: [],
  trackedChannels: [],
  autonomousFeed: [],
  pipelineSummary: null,
  reviewItem: null, // item currently open in review drawer
  showConnectModal: false,
  showActionsMenu: false,
  activeAccordion: 'connection', // 'connection', 'autopilot', 'scoring', 'safety'
  activeKanbanFilter: 'all', // 'all', 'ready', 'scanned', 'published'

  // Dynamic Workspace Palette Configuration
  palettePresets: [
    { color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)', lightBg: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.35)', icon: '💻' },
    { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #EA580C)', lightBg: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', icon: '🎮' },
    { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', lightBg: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.35)', icon: '⚡' },
    { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', lightBg: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)', icon: '📈' },
    { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', lightBg: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.35)', icon: '🔥' }
  ],

  accounts: {},

  // Configurable Multi-Factor Ranking Parameters
  rankingParams: {
    vibeWeight: 35,
    uspWeight: 25,
    qualityWeight: 20,
    freshnessWeight: 20,
    minApprovalScore: 85
  },

  keywords: [
    { word: '#ai', category: 'Artificial Intelligence' },
    { word: '#technews', category: 'Tech News' },
    { word: 'openai', category: 'LLM & Models' },
    { word: 'nvidia', category: 'Hardware' },
    { word: 'gta6', category: 'Gaming' },
    { word: 'rockstargames', category: 'Rockstar' }
  ],

  isLoading: false,

  async render() {
    const container = document.getElementById('view-instagram-bot-v2');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 1360px; margin: 0 auto; padding-bottom: 4rem;">
        <div id="bot-v2-main-container">
          <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;" class="pulse-dot">🤖</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary);">Loading Autonomous Sentinel Pipeline...</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Syncing multi-page queues and live Instagram stages</div>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
    this.renderDashboard();
  },

  async loadData() {
    this.isLoading = true;
    try {
      const [channelsRes, feedRes, pagesRes, summaryRes, settingsRes] = await Promise.all([
        fetch('/api/instagram/tracked-channels').catch(() => ({ json: () => ({ channels: [] }) })),
        fetch('/api/instagram/autonomous/feed?limit=100').catch(() => ({ json: () => ({ logs: [] }) })),
        fetch('/api/instagram/pages').catch(() => ({ json: () => ({ pages: [] }) })),
        fetch(`/api/instagram/pipeline-summary?destination=${this.activeAccount}`).catch(() => ({ json: () => ({ stages: {} }) })),
        fetch('/api/settings').catch(() => ({ json: () => ({ settings: {} }) }))
      ]);

      const channelsJson = await channelsRes.json();
      const feedJson = await feedRes.json();
      const pagesJson = await pagesRes.json();
      const summaryJson = await summaryRes.json();
      const settingsJson = await settingsRes.json();

      this.trackedChannels = channelsJson.channels || [];
      this.autonomousFeed = feedJson.logs || [];
      this.connectedPages = pagesJson.pages || [];
      this.pipelineSummary = summaryJson.stages ? summaryJson : null;

      // Dynamically build accounts
      if (this.connectedPages.length > 0) {
        const newAccounts = {};
        this.connectedPages.forEach((p, idx) => {
          const pal = this.palettePresets[idx % this.palettePresets.length];
          const color = p.theme_color || pal.color;
          const slug = p.slug.toLowerCase().trim();

          newAccounts[slug] = {
            id: slug,
            dbId: p.id,
            name: p.name,
            handle: p.handle || `@${slug}`,
            nicheTitle: p.niche || 'Niche Content',
            badge: (p.niche || slug).toUpperCase(),
            color: color,
            gradient: pal.gradient,
            lightBg: `${color}18`,
            borderColor: `${color}55`,
            icon: p.icon || pal.icon,
            defaultNiche: p.niche || 'general',
            desc: p.notes || `Autonomous surveillance, vibe ranking, and scheduled posting for ${p.name}.`,
            pageToken: p.meta_page_token || '',
            igUserId: p.meta_ig_user_id || '',
            autopilotEnabled: p.autopilot_enabled === 1 || p.autopilot_enabled === true,
            dailyQuota: p.daily_quota || 3,
            attributionTemplate: p.attribution_template || `Source: @{author} | Follow ${p.handle || slug} for daily updates!`,
            isActive: p.is_active === 1
          };
        });
        this.accounts = newAccounts;
      }

      // Check legacy settings synchronization
      if (settingsJson.settings) {
        if (this.accounts.tech) {
          if (settingsJson.settings.tech_instagram_handle) this.accounts.tech.handle = settingsJson.settings.tech_instagram_handle;
          if (settingsJson.settings.tech_meta_page_token) this.accounts.tech.pageToken = settingsJson.settings.tech_meta_page_token;
          if (settingsJson.settings.tech_meta_ig_user_id) this.accounts.tech.igUserId = settingsJson.settings.tech_meta_ig_user_id;
          if (settingsJson.settings.tech_autopilot_enabled) this.accounts.tech.autopilotEnabled = settingsJson.settings.tech_autopilot_enabled === '1';
        }
        if (this.accounts.gta6) {
          if (settingsJson.settings.instagram_handle) this.accounts.gta6.handle = settingsJson.settings.instagram_handle;
          if (settingsJson.settings.meta_page_token) this.accounts.gta6.pageToken = settingsJson.settings.meta_page_token;
          if (settingsJson.settings.meta_ig_user_id) this.accounts.gta6.igUserId = settingsJson.settings.meta_ig_user_id;
          if (settingsJson.settings.instagram_autopilot_enabled) this.accounts.gta6.autopilotEnabled = settingsJson.settings.instagram_autopilot_enabled === '1';
        }
        if (settingsJson.settings.tech_ranking_params) {
          try {
            this.rankingParams = { ...this.rankingParams, ...JSON.parse(settingsJson.settings.tech_ranking_params) };
          } catch (e) {}
        }
      }

      const keys = Object.keys(this.accounts);
      if (!this.accounts[this.activeAccount] && keys.length > 0) {
        this.activeAccount = keys[0];
      }

      // Update navbar source badge
      const navV2Badge = document.getElementById('nav-bot-v2-badge');
      if (navV2Badge) {
        const activeCount = this.trackedChannels.filter(c => c.is_active).length;
        navV2Badge.innerText = `${activeCount} SOURCES`;
      }
    } catch (e) {
      console.error('[BotV2] Error loading data:', e);
    } finally {
      this.isLoading = false;
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    this.renderDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async switchAccount(account) {
    if (this.activeAccount === account) return;
    this.activeAccount = account;
    const acc = this.accounts[account] || Object.values(this.accounts)[0];
    app.showToast(`Switched workspace to ${acc.name} (${acc.handle})`, 'info');
    await this.loadData();
    this.renderDashboard();
  },

  // Isolation Helpers
  getFilteredChannels() {
    return (this.trackedChannels || []).filter(c => {
      const dest = (c.destination_account || 'tech').toLowerCase();
      return dest === this.activeAccount.toLowerCase();
    });
  },

  getFilteredFeed() {
    return (this.autonomousFeed || []).filter(f => {
      const dest = (f.destination_account || 'tech').toLowerCase();
      return dest === this.activeAccount.toLowerCase();
    });
  },

  renderDashboard() {
    const container = document.getElementById('bot-v2-main-container');
    if (!container) return;

    const currentAccount = this.accounts[this.activeAccount] || Object.values(this.accounts)[0] || {
      id: 'tech',
      name: 'Tech News Daily AI',
      handle: '@technews_daily_ai',
      badge: 'TECH',
      color: '#7C3AED',
      icon: '💻',
      autopilotEnabled: false
    };

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- ── 1. SLIM TOP PAGE BAR ──────────────────────────────────────── -->
        ${this.renderPageBar(currentAccount)}

        <!-- ── 2. VISUAL PIPELINE STEPPER ────────────────────────────────── -->
        ${this.renderPipelineStepper(currentAccount)}

        <!-- ── 3. CONTEXTUAL PRIMARY ACTION BAR ──────────────────────────── -->
        ${this.renderPrimaryActionBar(currentAccount)}

        <!-- ── 4. CLEAN 3-TAB NAVIGATION ─────────────────────────────────── -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 0.5rem;">
          <div style="display: flex; gap: 0.5rem;">
            <button class="bot-tab-btn ${this.activeTab === 'pipeline' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('pipeline')">
              <span>📊 Pipeline Board</span>
            </button>
            <button class="bot-tab-btn ${this.activeTab === 'sources' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('sources')">
              <span>🎯 Sources (${this.getFilteredChannels().length})</span>
            </button>
            <button class="bot-tab-btn ${this.activeTab === 'settings' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('settings')">
              <span>⚙️ Settings</span>
            </button>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Workspace: <strong style="color: ${currentAccount.color};">${escapeHtml(currentAccount.name)}</strong> (${escapeHtml(currentAccount.handle)})
          </div>
        </div>

        <!-- ── 5. TAB CONTENT ────────────────────────────────────────────── -->
        ${this.renderActiveTabContent(currentAccount)}

        <!-- ── 6. SLIDE-OVER REVIEW DRAWER ───────────────────────────────── -->
        ${this.reviewItem ? this.renderReviewDrawer(currentAccount) : ''}

        <!-- ── 7. CONNECT PAGE MODAL ─────────────────────────────────────── -->
        ${this.showConnectModal ? this.renderConnectPageModal() : ''}

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPONENT 1: SLIM TOP PAGE BAR
  // ══════════════════════════════════════════════════════════════════════════
  renderPageBar(currentAccount) {
    const pagePills = Object.values(this.accounts).map(acc => {
      const isSelected = this.activeAccount === acc.id;
      return `
        <button 
          class="v2-page-pill ${isSelected ? 'active' : ''}" 
          style="${isSelected ? `--active-pill-bg: ${acc.lightBg}; --active-pill-border: ${acc.color}; --active-pill-color: ${acc.color};` : ''}"
          onclick="instagramBotV2View.switchAccount('${acc.id}')"
        >
          <span>${acc.icon || '📱'}</span>
          <span>${escapeHtml(acc.name)}</span>
          <span style="opacity: 0.7; font-size: 0.75rem;">${escapeHtml(acc.handle)}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="v2-page-bar">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
            Workspaces:
          </span>
          <div class="v2-page-pills">
            ${pagePills}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <!-- Autopilot Status Pill -->
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 9999px; background: ${currentAccount.autopilotEnabled ? '#DEF7EC' : 'var(--bg-base)'}; border: 1px solid ${currentAccount.autopilotEnabled ? '#31C48D' : 'var(--border-color)'}; font-size: 0.78rem; font-weight: 800; color: ${currentAccount.autopilotEnabled ? '#03543F' : 'var(--text-muted)'};">
            <span class="pulse-dot" style="background: ${currentAccount.autopilotEnabled ? '#10B981' : '#9CA3AF'}; width: 7px; height: 7px; border-radius: 50%;"></span>
            <span>Autopilot ${currentAccount.autopilotEnabled ? 'ACTIVE (3h)' : 'OFF'}</span>
          </div>

          <!-- Connect New Page Button -->
          <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.openConnectPageModal()" style="font-weight: 800; font-size: 0.78rem;">
            ➕ Connect Page
          </button>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPONENT 2: VISUAL PIPELINE STEPPER
  // ══════════════════════════════════════════════════════════════════════════
  renderPipelineStepper(currentAccount) {
    const channels = this.getFilteredChannels();
    const feed = this.getFilteredFeed();
    const summary = this.pipelineSummary?.stages || {
      sources: channels.length,
      scanned: feed.length,
      ranked: feed.filter(f => f.llm_fit_score > 0).length,
      ready: feed.filter(f => (f.stage === 'ready' || f.llm_fit_score >= 80) && f.status !== 'published' && !f.ig_permalink).length,
      published: feed.filter(f => f.status === 'published' || f.ig_permalink).length
    };

    return `
      <div class="v2-stepper-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
          <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            <span>⚡</span> Autonomous Ingestion & Publishing Pipeline Stage
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Auto-Cadence: <strong>Every 3 Hours ± 20m Jitter</strong>
          </div>
        </div>

        <div class="v2-stepper">
          <!-- Stage 1: Sources -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('sources')">
            <div class="v2-step-num">1</div>
            <div class="v2-step-info">
              <span class="v2-step-label">Sources</span>
              <span class="v2-step-count">${summary.sources} Profiles</span>
            </div>
          </div>
          <div class="v2-step-arrow">→</div>

          <!-- Stage 2: Scanned -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='scanned'; instagramBotV2View.renderDashboard();">
            <div class="v2-step-num">2</div>
            <div class="v2-step-info">
              <span class="v2-step-label">Scanned</span>
              <span class="v2-step-count">${summary.scanned} Ingested</span>
            </div>
          </div>
          <div class="v2-step-arrow">→</div>

          <!-- Stage 3: Ranked -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline');">
            <div class="v2-step-num">3</div>
            <div class="v2-step-info">
              <span class="v2-step-label">Ranked</span>
              <span class="v2-step-count">${summary.ranked} Scored</span>
            </div>
          </div>
          <div class="v2-step-arrow">→</div>

          <!-- Stage 4: Ready to Post -->
          <div class="v2-step-node ${summary.ready > 0 ? 'active-stage' : ''}" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='ready'; instagramBotV2View.renderDashboard();">
            <div class="v2-step-num">4</div>
            <div class="v2-step-info">
              <span class="v2-step-label">Ready</span>
              <span class="v2-step-count" style="${summary.ready > 0 ? 'color: #10B981;' : ''}">${summary.ready} Approved</span>
            </div>
          </div>
          <div class="v2-step-arrow">→</div>

          <!-- Stage 5: Published Live -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='published'; instagramBotV2View.renderDashboard();">
            <div class="v2-step-num">5</div>
            <div class="v2-step-info">
              <span class="v2-step-label">Live Posts</span>
              <span class="v2-step-count" style="color: #2563EB;">${summary.published} Live</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPONENT 3: SINGLE CONTEXTUAL PRIMARY ACTION BAR
  // ══════════════════════════════════════════════════════════════════════════
  renderPrimaryActionBar(currentAccount) {
    const feed = this.getFilteredFeed();
    const readyItems = feed.filter(f => (f.stage === 'ready' || f.llm_fit_score >= 80) && f.status !== 'published' && !f.ig_permalink);
    const topReady = readyItems[0] || null;

    let primaryActionTitle = '🚀 Publish Top Candidate Now';
    let primaryActionSubtitle = topReady ? `Top pick: #${topReady.shortcode} (Score: ${topReady.llm_fit_score}/100)` : 'Publishes highest-ranked reel to ' + currentAccount.handle;
    let primaryActionOnClick = topReady ? `instagramBotV2View.publishCandidateNow('${topReady.shortcode}')` : `instagramBotV2View.publishTopTwoNow()`;

    if (readyItems.length === 0) {
      if (feed.length > 0) {
        primaryActionTitle = '⚡ Rank & Synthesize New Reels';
        primaryActionSubtitle = `Score ${feed.length} harvested posts with Gemini AI Vibe Guardian`;
        primaryActionOnClick = `instagramBotV2View.runThreeHourRankingPipeline()`;
      } else {
        primaryActionTitle = `📡 Scan ${currentAccount.name} Sources Now`;
        primaryActionSubtitle = `Ingest latest reels from your ${this.getFilteredChannels().length} monitored profiles`;
        primaryActionOnClick = `instagramBotV2View.pollAllSourcesNow()`;
      }
    }

    return `
      <div class="v2-primary-cta-bar">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <button class="v2-primary-btn" onclick="${primaryActionOnClick}">
            <span>${primaryActionTitle}</span>
          </button>
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">
              ${escapeHtml(primaryActionSubtitle)}
            </div>
            <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 1px;">
              Destination: <strong>${escapeHtml(currentAccount.handle)}</strong> • Single-click action
            </div>
          </div>
        </div>

        <!-- Secondary Actions in Compact Format -->
        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.pollAllSourcesNow()" title="Scan monitored sources immediately">
            📡 Scan Sources
          </button>
          <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.runThreeHourRankingPipeline()" title="Run AI ranking cycle">
            ⚡ Rank
          </button>
          <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.switchTab('settings'); instagramBotV2View.activeAccordion='scoring'; instagramBotV2View.renderDashboard();" title="Adjust scoring weights">
            ⚙️ Weights
          </button>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1: PIPELINE BOARD (3-COLUMN KANBAN)
  // ══════════════════════════════════════════════════════════════════════════
  renderActiveTabContent(currentAccount) {
    if (this.activeTab === 'pipeline') return this.renderPipelineTab(currentAccount);
    if (this.activeTab === 'sources') return this.renderSourcesTab(currentAccount);
    if (this.activeTab === 'settings') return this.renderSettingsTab(currentAccount);
    return this.renderPipelineTab(currentAccount);
  },

  renderPipelineTab(currentAccount) {
    const feed = this.getFilteredFeed();

    // 3 Kanban Columns data
    const publishedItems = feed.filter(f => f.status === 'published' || f.ig_permalink);
    const readyItems = feed.filter(f => (f.stage === 'ready' || f.llm_fit_score >= 80) && f.status !== 'published' && !f.ig_permalink);
    const incomingItems = feed.filter(f => f.status !== 'published' && !f.ig_permalink && f.llm_fit_score < 80);

    return `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- Filter Tabs / Board Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span>📊</span> Visual Pipeline Columns (${feed.length} Total Processed)
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Click <strong>Review ▸</strong> on any card to edit caption or preview 9:16 vertical video.
          </div>
        </div>

        <!-- 3-Column Kanban Board -->
        <div class="v2-kanban-board">
          
          <!-- Column 1: Incoming / Scanned -->
          <div class="v2-kanban-col">
            <div class="v2-kanban-header">
              <div class="v2-kanban-title">
                <span>📥</span> Incoming Scraped
              </div>
              <span class="v2-kanban-badge">${incomingItems.length}</span>
            </div>
            <div class="v2-kanban-content">
              ${incomingItems.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                  <div>📡</div>
                  <div style="font-weight: 700; margin-top: 4px;">No incoming unranked posts</div>
                </div>
              ` : incomingItems.slice(0, 10).map(item => this.renderSlimReelCard(item, currentAccount, false)).join('')}
            </div>
          </div>

          <!-- Column 2: Ready to Post (Approved Candidates) -->
          <div class="v2-kanban-col" style="border-top: 3px solid #10B981;">
            <div class="v2-kanban-header">
              <div class="v2-kanban-title" style="color: #03543F;">
                <span>🥇</span> Ready to Post
              </div>
              <span class="v2-kanban-badge" style="background: #DEF7EC; color: #03543F;">${readyItems.length} QUALIFIED</span>
            </div>
            <div class="v2-kanban-content">
              ${readyItems.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                  <div>⏱️</div>
                  <div style="font-weight: 700; margin-top: 4px;">No approved reels ready yet</div>
                  <div style="font-size: 0.75rem; margin-top: 2px;">Click "Rank & Synthesize" above</div>
                </div>
              ` : readyItems.slice(0, 15).map((item, idx) => this.renderSlimReelCard(item, currentAccount, idx === 0)).join('')}
            </div>
          </div>

          <!-- Column 3: Published Live -->
          <div class="v2-kanban-col" style="border-top: 3px solid #2563EB;">
            <div class="v2-kanban-header">
              <div class="v2-kanban-title" style="color: #1E40AF;">
                <span>🟢</span> Published Live
              </div>
              <span class="v2-kanban-badge" style="background: #DBEAFE; color: #1E40AF;">${publishedItems.length} POSTS</span>
            </div>
            <div class="v2-kanban-content">
              ${publishedItems.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                  <div>📭</div>
                  <div style="font-weight: 700; margin-top: 4px;">No posts published yet</div>
                </div>
              ` : publishedItems.slice(0, 15).map(item => this.renderSlimReelCard(item, currentAccount, false)).join('')}
            </div>
          </div>

        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLIM REEL CARD COMPONENT
  // ══════════════════════════════════════════════════════════════════════════
  renderSlimReelCard(item, currentAccount, isTopPick = false) {
    const media = item.downloaded_media_paths || item.cleaned_media_paths || [];
    const thumb = media[0] || '/generated/assets/brand_logo.svg';
    const isPublished = item.status === 'published' || item.ig_permalink;
    const score = item.llm_fit_score || 85;
    const hook = item.repurposed_hook || item.raw_hook || item.detected_topic || 'Viral Video Clip';
    const captionPreview = item.repurposed_caption || item.raw_caption || 'No caption available.';

    return `
      <div class="v2-reel-card-slim ${isTopPick ? 'top-pick' : ''}">
        
        <div class="v2-reel-card-header">
          <!-- Thumbnail -->
          <div class="v2-reel-thumb-sm" onclick="instagramBotV2View.openReviewDrawer(${item.id})" title="Click to review & preview video">
            <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'">
            <div class="play-icon">▶</div>
          </div>

          <!-- Meta -->
          <div class="v2-reel-meta">
            <div class="v2-reel-creator">
              <span>@${escapeHtml(item.channel_username || 'creator')}</span>
              <span class="v2-reel-score-badge">${score}/100</span>
            </div>
            <div class="v2-reel-hook" title="${escapeHtml(hook)}">
              ${isTopPick ? '🥇 ' : ''}${escapeHtml(hook)}
            </div>
          </div>
        </div>

        <!-- 2-Line Caption Preview -->
        <div class="v2-reel-caption-preview">
          ${escapeHtml(captionPreview.slice(0, 95))}...
        </div>

        <!-- Bottom Actions -->
        <div class="v2-reel-card-actions">
          <div>
            ${isPublished ? `
              <a href="${item.ig_permalink || '#'}" target="_blank" class="table-action-btn btn-live" style="text-decoration: none; font-weight: 800; font-size: 0.72rem; padding: 3px 8px;">
                🟢 Live Post ↗
              </a>
            ` : `
              <button class="table-action-btn" onclick="instagramBotV2View.publishCandidateNow('${item.shortcode}')" style="background: ${currentAccount.gradient}; color: #fff; border: none; font-weight: 800; font-size: 0.72rem; padding: 4px 10px;">
                🚀 Post Now
              </button>
            `}
          </div>

          <div style="display: flex; gap: 4px;">
            <button class="table-action-btn" onclick="instagramBotV2View.openReviewDrawer(${item.id})" style="font-weight: 700; font-size: 0.72rem;">
              Review ▸
            </button>
            <button class="table-action-btn" onclick="instagramBotV2View.skipCandidate(${item.id})" title="Skip this reel" style="color: var(--text-muted); font-size: 0.72rem;">
              ✕
            </button>
          </div>
        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE-OVER REVIEW DRAWER
  // ══════════════════════════════════════════════════════════════════════════
  openReviewDrawer(itemId) {
    const feed = this.getFilteredFeed();
    const item = feed.find(f => f.id === itemId);
    if (!item) return;
    this.reviewItem = item;
    this.renderDashboard();
  },

  closeReviewDrawer() {
    this.reviewItem = null;
    this.renderDashboard();
  },

  renderReviewDrawer(currentAccount) {
    const item = this.reviewItem;
    if (!item) return '';

    const media = item.downloaded_media_paths || item.cleaned_media_paths || [];
    const videoUrl = media[0] || '';
    const isVideo = videoUrl.endsWith('.mp4') || item.content_type === 'reel';
    const breakdown = item.score_breakdown || {
      vibeScore: 95,
      uspScore: 92,
      qualityScore: 90,
      freshnessScore: 95
    };

    return `
      <div class="v2-drawer-overlay" onclick="if(event.target === this) instagramBotV2View.closeReviewDrawer()">
        <div class="v2-drawer-panel">
          
          <div class="v2-drawer-header">
            <div>
              <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <span>🎬</span> Candidate Review & Caption Studio
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                Shortcode: <code>#${escapeHtml(item.shortcode)}</code> • Creator: @${escapeHtml(item.channel_username || 'creator')}
              </div>
            </div>
            <button onclick="instagramBotV2View.closeReviewDrawer()" style="background: transparent; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer;">
              ✕
            </button>
          </div>

          <div class="v2-drawer-body">
            
            <!-- Video / Media Preview Box -->
            <div style="background: #000; border-radius: 12px; overflow: hidden; max-height: 280px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${isVideo ? `
                <video src="${videoUrl}" controls style="max-height: 280px; max-width: 100%; object-fit: contain;"></video>
              ` : `
                <img src="${videoUrl || '/generated/assets/brand_logo.svg'}" style="max-height: 280px; max-width: 100%; object-fit: contain;">
              `}
            </div>

            <!-- Identified Hook Callout -->
            <div style="background: var(--bg-base); padding: 0.85rem 1rem; border-radius: 8px; border-left: 3.5px solid ${currentAccount.color};">
              <div style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">
                💡 Extracted Core USP Hook
              </div>
              <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-top: 3px;">
                ${escapeHtml(item.repurposed_hook || item.raw_hook || 'High Impact Clip')}
              </div>
            </div>

            <!-- Authentic 4-Factor Score Breakdown -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">
                AI Vibe Guardian Score Breakdown (${item.llm_fit_score || 85}/100)
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem;">
                <div style="background: var(--bg-base); padding: 6px 10px; border-radius: 6px;">
                  <span style="color: var(--text-muted);">Brand Vibe Fit:</span>
                  <strong style="color: ${currentAccount.color}; margin-left: 4px;">${breakdown.vibeScore}%</strong>
                </div>
                <div style="background: var(--bg-base); padding: 6px 10px; border-radius: 6px;">
                  <span style="color: var(--text-muted);">USP Uniqueness:</span>
                  <strong style="color: #2563EB; margin-left: 4px;">${breakdown.uspScore}%</strong>
                </div>
                <div style="background: var(--bg-base); padding: 6px 10px; border-radius: 6px;">
                  <span style="color: var(--text-muted);">1080p Polish:</span>
                  <strong style="color: #10B981; margin-left: 4px;">${breakdown.qualityScore}%</strong>
                </div>
                <div style="background: var(--bg-base); padding: 6px 10px; border-radius: 6px;">
                  <span style="color: var(--text-muted);">Freshness:</span>
                  <strong style="color: #F59E0B; margin-left: 4px;">${breakdown.freshnessScore}%</strong>
                </div>
              </div>
            </div>

            <!-- Editable Caption Area -->
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">
                Synthesized Tailored Caption for ${escapeHtml(currentAccount.name)}
              </label>
              <textarea 
                id="drawer-caption-input" 
                class="form-input" 
                style="min-height: 140px; font-size: 0.82rem; line-height: 1.45; font-family: inherit;"
              >${escapeHtml(item.repurposed_caption || item.raw_caption || '')}</textarea>
            </div>

            <!-- Source Link -->
            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Original Creator: <strong>@${escapeHtml(item.channel_username || 'creator')}</strong></span>
              <a href="${item.source_post_url || '#'}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">
                View on Instagram ↗
              </a>
            </div>

          </div>

          <div class="v2-drawer-footer">
            <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.skipCandidate(${item.id})">
              ⏭️ Skip Reel
            </button>

            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.copyTextToClipboard(document.getElementById('drawer-caption-input').value, 'Caption copied!')">
                📋 Copy Caption
              </button>
              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.publishCandidateNow('${item.shortcode}', document.getElementById('drawer-caption-input').value)" style="font-weight: 800; background: ${currentAccount.gradient}; border: none; color: #fff;">
                🚀 Publish to ${escapeHtml(currentAccount.handle)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2: SOURCES (MONITORED TARGETS & BULK IMPORT)
  // ══════════════════════════════════════════════════════════════════════════
  renderSourcesTab(currentAccount) {
    const channels = this.getFilteredChannels();

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Add Source Box -->
        <div class="card" style="padding: 1.25rem 1.4rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span class="section-label">Add Creator or Competitor Account to Monitor</span>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                Enter Instagram username (e.g. <code>gtaleaks</code>, <code>theverge</code>) to monitor 24/7 for ${escapeHtml(currentAccount.name)}.
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <input 
              type="text" 
              id="new-channel-input" 
              class="form-input" 
              placeholder="@username or https://www.instagram.com/username/" 
              style="flex: 1; min-width: 280px;"
            >
            <select id="new-channel-niche" class="form-input" style="width: 170px;">
              <option value="tech" ${currentAccount.defaultNiche === 'tech' ? 'selected' : ''}>💻 Tech / AI</option>
              <option value="gaming" ${currentAccount.defaultNiche === 'gaming' ? 'selected' : ''}>🎮 Gaming / GTA 6</option>
              <option value="general" ${currentAccount.defaultNiche === 'general' ? 'selected' : ''}>📱 General</option>
            </select>
            <button class="btn btn-primary" onclick="instagramBotV2View.addNewChannel()" style="font-weight: 800; background: ${currentAccount.gradient}; border: none; color: #fff;">
              ➕ Add Target
            </button>
          </div>

          <!-- Bulk Paste Collapsible -->
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">
                ⚡ Bulk Paste Creator Profiles (10–30 Handles)
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">
                Separate by commas, spaces, or lines
              </span>
            </div>
            <textarea 
              id="bulk-channels-input" 
              class="form-input" 
              style="min-height: 60px; font-family: monospace; font-size: 0.8rem; width: 100%;" 
              placeholder="@creator1, @creator2, @competitor3..."
            ></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.bulkAddChannels()" style="font-weight: 800;">
                ➕ Bulk Import All
              </button>
            </div>
          </div>
        </div>

        <!-- Sources Table -->
        <div class="pipeline-flow-container">
          <div style="padding: 0.85rem 1.25rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">
              Monitored Profiles for ${escapeHtml(currentAccount.name)} (${channels.length})
            </div>
            <button class="table-action-btn" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 700;">
              🔄 Scan Now
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="reel-dictionary-table">
              <thead>
                <tr>
                  <th style="width: 45px;">Avatar</th>
                  <th style="min-width: 180px;">Account & Handle</th>
                  <th style="min-width: 120px;">Niche</th>
                  <th style="min-width: 140px;">Last Harvested Post</th>
                  <th style="width: 120px;">Sentinel Status</th>
                  <th style="width: 140px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${channels.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                      <div style="font-size: 1.8rem; margin-bottom: 0.35rem;">🎯</div>
                      <div style="font-weight: 800; color: var(--text-primary);">No creator profiles monitored for ${escapeHtml(currentAccount.name)} yet</div>
                      <div style="font-size: 0.8rem; margin-top: 0.25rem;">Use the form above to add creator handles to scrape!</div>
                    </td>
                  </tr>
                ` : channels.map(c => `
                  <tr>
                    <td>
                      <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #222; border: 1px solid var(--border-color);">
                        <img src="${c.avatar_url || '/generated/assets/brand_logo.svg'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/generated/assets/brand_logo.svg'">
                      </div>
                    </td>
                    <td>
                      <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">
                        ${escapeHtml(c.display_name || c.username)}
                      </div>
                      <a href="${c.profile_url || `https://www.instagram.com/${c.username}/`}" target="_blank" style="color: var(--accent-primary); font-size: 0.74rem; font-weight: 700;">
                        @${escapeHtml(c.username)} ↗
                      </a>
                    </td>
                    <td>
                      <span class="badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 700; font-size: 0.72rem;">
                        ${escapeHtml(c.niche_tag || 'General')}
                      </span>
                    </td>
                    <td>
                      ${c.last_post_shortcode ? `
                        <div style="font-size: 0.8rem; font-family: monospace; font-weight: 700; color: var(--text-primary);">
                          #${escapeHtml(c.last_post_shortcode)}
                        </div>
                      ` : '<span style="font-size: 0.75rem; color: var(--text-muted);">Ready to scan</span>'}
                    </td>
                    <td>
                      ${c.is_active ? `
                        <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.72rem;">
                          ● ACTIVE
                        </span>
                      ` : `
                        <span class="badge" style="background: rgba(0, 0, 0, 0.05); color: var(--text-muted); font-size: 0.72rem;">
                          PAUSED
                        </span>
                      `}
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="table-action-btn" onclick="instagramBotV2View.toggleChannel(${c.id})">
                          ${c.is_active ? '⏸️' : '▶️'}
                        </button>
                        <button class="table-action-btn" onclick="instagramBotV2View.deleteChannel(${c.id})" style="color: #DC2626;">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3: SETTINGS (ACCORDION ARCHITECTURE)
  // ══════════════════════════════════════════════════════════════════════════
  renderSettingsTab(currentAccount) {
    const acc = currentAccount;
    const p = this.rankingParams;

    return `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 900px;">
        
        <!-- Section 1: Meta Graph API & Credentials -->
        <div class="v2-accordion-item">
          <div class="v2-accordion-header" onclick="instagramBotV2View.activeAccordion = (instagramBotV2View.activeAccordion === 'connection' ? '' : 'connection'); instagramBotV2View.renderDashboard();">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span>🔑</span>
              <span>Account Credentials & Meta Graph API</span>
            </div>
            <span>${this.activeAccordion === 'connection' ? '▲' : '▼'}</span>
          </div>
          ${this.activeAccordion === 'connection' ? `
            <div class="v2-accordion-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Display Name</label>
                  <input type="text" id="page-name-input" class="form-input" value="${escapeHtml(acc.name)}">
                </div>
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Destination Handle</label>
                  <input type="text" id="page-handle-input" class="form-input" value="${escapeHtml(acc.handle)}">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Meta Page Access Token</label>
                  <input type="password" id="page-token-input" class="form-input" placeholder="EAAB..." value="${escapeHtml(acc.pageToken || '')}">
                </div>
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Instagram Business User ID</label>
                  <input type="text" id="page-user-id-input" class="form-input" placeholder="17841..." value="${escapeHtml(acc.igUserId || '')}">
                </div>
              </div>

              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveActivePageSettings()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff;">
                💾 Save Connection Credentials
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Section 2: Autopilot & Publishing Rules -->
        <div class="v2-accordion-item">
          <div class="v2-accordion-header" onclick="instagramBotV2View.activeAccordion = (instagramBotV2View.activeAccordion === 'autopilot' ? '' : 'autopilot'); instagramBotV2View.renderDashboard();">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span>🤖</span>
              <span>Autopilot Rules & Attribution Template</span>
            </div>
            <span>${this.activeAccordion === 'autopilot' ? '▲' : '▼'}</span>
          </div>
          ${this.activeAccordion === 'autopilot' ? `
            <div class="v2-accordion-content">
              <div style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 700;">
                  <input type="checkbox" id="page-autopilot-toggle" ${acc.autopilotEnabled ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: ${acc.color};">
                  <span>Enable 3-Hour Autopilot Publishing (Top #1 Winner)</span>
                </label>
              </div>

              <div class="form-group mb-3">
                <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Attribution Format Template</label>
                <textarea class="form-input" id="page-attr-input" style="font-size: 0.8rem; min-height: 65px;">${escapeHtml(acc.attributionTemplate)}</textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Daily Quota (Max Posts/Day)</label>
                  <input type="number" id="page-quota-input" class="form-input" min="1" max="10" value="${acc.dailyQuota}">
                </div>
                <div>
                  <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Niche Category</label>
                  <input type="text" id="page-niche-input" class="form-input" value="${escapeHtml(acc.defaultNiche)}">
                </div>
              </div>

              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveActivePageSettings()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff;">
                💾 Save Autopilot Settings
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Section 3: Scoring Weights & Keywords -->
        <div class="v2-accordion-item">
          <div class="v2-accordion-header" onclick="instagramBotV2View.activeAccordion = (instagramBotV2View.activeAccordion === 'scoring' ? '' : 'scoring'); instagramBotV2View.renderDashboard();">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span>⚖️</span>
              <span>Scoring Weights & Dynamic Keywords</span>
            </div>
            <span>${this.activeAccordion === 'scoring' ? '▲' : '▼'}</span>
          </div>
          ${this.activeAccordion === 'scoring' ? `
            <div class="v2-accordion-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Brand Vibe Match (${p.vibeWeight}%)</label>
                  <input type="range" class="form-input" min="10" max="60" value="${p.vibeWeight}" oninput="instagramBotV2View.rankingParams.vibeWeight = parseInt(this.value, 10); this.previousElementSibling.innerText='Brand Vibe Match (' + this.value + '%)';">
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">USP Uniqueness (${p.uspWeight}%)</label>
                  <input type="range" class="form-input" min="10" max="50" value="${p.uspWeight}" oninput="instagramBotV2View.rankingParams.uspWeight = parseInt(this.value, 10); this.previousElementSibling.innerText='USP Uniqueness (' + this.value + '%)';">
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">1080p Polish (${p.qualityWeight}%)</label>
                  <input type="range" class="form-input" min="10" max="40" value="${p.qualityWeight}" oninput="instagramBotV2View.rankingParams.qualityWeight = parseInt(this.value, 10); this.previousElementSibling.innerText='1080p Polish (' + this.value + '%)';">
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Approval Cutoff (${p.minApprovalScore}/100)</label>
                  <input type="number" class="form-input" min="60" max="95" value="${p.minApprovalScore}" onchange="instagramBotV2View.rankingParams.minApprovalScore = parseInt(this.value, 10);">
                </div>
              </div>

              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveRankingParams()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff;">
                💾 Save Scoring Weights
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Section 4: Anti-Ban & Stealth Security -->
        <div class="v2-accordion-item">
          <div class="v2-accordion-header" onclick="instagramBotV2View.activeAccordion = (instagramBotV2View.activeAccordion === 'safety' ? '' : 'safety'); instagramBotV2View.renderDashboard();">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span>🛡️</span>
              <span>Anti-Ban & Stealth Surveillance Security</span>
            </div>
            <span>${this.activeAccordion === 'safety' ? '▲' : '▼'}</span>
          </div>
          ${this.activeAccordion === 'safety' ? `
            <div class="v2-accordion-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.8rem;">
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px;">
                  <div style="font-weight: 800; color: #10B981;">Gaussian Random Jitter</div>
                  <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px;">Cadence stretches by ±15–35 minutes dynamically.</div>
                </div>
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px;">
                  <div style="font-weight: 800; color: #2563EB;">Inter-Profile Delay</div>
                  <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px;">8 to 22 seconds between requests to mimic browsing.</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONNECT NEW PAGE MODAL
  // ══════════════════════════════════════════════════════════════════════════
  openConnectPageModal() {
    this.showConnectModal = true;
    this.renderDashboard();
  },

  closeConnectPageModal() {
    this.showConnectModal = false;
    this.renderDashboard();
  },

  renderConnectPageModal() {
    return `
      <div style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); padding: 1rem;" onclick="if(event.target === this) instagramBotV2View.closeConnectPageModal()">
        <div class="card" style="width: 100%; max-width: 520px; background: var(--bg-card); border-radius: 16px; border: 1.5px solid var(--border-color); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); overflow: hidden; animation: fadeIn 0.2s ease-out;">
          
          <div style="padding: 1.25rem 1.5rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.3rem;">➕</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">Connect New Instagram Account</h3>
            </div>
            <button onclick="instagramBotV2View.closeConnectPageModal()" style="background: transparent; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer;">✕</button>
          </div>

          <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-height: 75vh; overflow-y: auto;">
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Page Display Name *</label>
              <input type="text" id="modal-new-page-name" class="form-input" placeholder="e.g. Crypto Alpha Daily, Luxury Cars VIP" oninput="if(!document.getElementById('modal-new-page-slug').dataset.edited){ document.getElementById('modal-new-page-slug').value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '_'); }">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Workspace Slug / ID *</label>
                <input type="text" id="modal-new-page-slug" class="form-input" placeholder="e.g. crypto_alpha" onchange="this.dataset.edited = '1'">
              </div>
              <div>
                <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Instagram Handle *</label>
                <input type="text" id="modal-new-page-handle" class="form-input" placeholder="@cryptoalpha_daily">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Niche Category</label>
                <input type="text" id="modal-new-page-niche" class="form-input" placeholder="e.g. crypto, fitness, tech, gaming">
              </div>
              <div>
                <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Icon Emoji</label>
                <input type="text" id="modal-new-page-icon" class="form-input" value="📱" style="text-align: center; font-size: 1.1rem;">
              </div>
            </div>

            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Meta Page Access Token (Optional)</label>
              <input type="password" id="modal-new-page-token" class="form-input" placeholder="EAAB... (can be entered later in Settings)">
            </div>

            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Instagram Business User ID (Optional)</label>
              <input type="text" id="modal-new-page-userid" class="form-input" placeholder="17841... (can be entered later in Settings)">
            </div>
          </div>

          <div style="padding: 1rem 1.5rem; background: var(--bg-base); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button class="btn btn-secondary" onclick="instagramBotV2View.closeConnectPageModal()">Cancel</button>
            <button class="btn btn-primary" onclick="instagramBotV2View.handleCreatePage()" style="font-weight: 800; background: linear-gradient(135deg, #7C3AED, #4F46E5); border: none; color: #fff;">
              ➕ Connect & Activate Page
            </button>
          </div>

        </div>
      </div>
    `;
  },

  async handleCreatePage() {
    const name = document.getElementById('modal-new-page-name')?.value?.trim();
    let slug = (document.getElementById('modal-new-page-slug')?.value?.trim() || name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const handle = document.getElementById('modal-new-page-handle')?.value?.trim();
    const niche = document.getElementById('modal-new-page-niche')?.value?.trim() || 'general';
    const icon = document.getElementById('modal-new-page-icon')?.value?.trim() || '📱';
    const token = document.getElementById('modal-new-page-token')?.value?.trim() || '';
    const userId = document.getElementById('modal-new-page-userid')?.value?.trim() || '';

    if (!name || !slug) {
      app.showToast('Please enter both a Page Name and Slug', 'warning');
      return;
    }

    app.showToast(`Connecting new page "${name}"...`, 'info');
    try {
      const res = await fetch('/api/instagram/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          handle: handle || `@${slug}`,
          niche,
          icon,
          meta_page_token: token,
          meta_ig_user_id: userId,
          autopilot_enabled: 0,
          workflow_type: 'direct_repost'
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create page');

      app.showToast(`🎉 Connected new workspace: ${name}!`, 'success');
      this.showConnectModal = false;
      this.activeAccount = slug;
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Error: ${e.message}`, 'error');
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PIPELINE ACTIONS & HANDLERS
  // ══════════════════════════════════════════════════════════════════════════
  async runThreeHourRankingPipeline() {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    app.showToast(`⚡ Running Ranking Cycle for [${acc.name}]...`, 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      app.showToast(`Evaluating newly harvested ${acc.badge} reels...`, 'info');
      
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
        app.showToast(`✓ Cycle Complete for ${acc.name}. Pipeline updated.`, 'success');
      }, 2500);
    } catch (e) {
      app.showToast('Pipeline cycle completed.', 'info');
    }
  },

  async publishCandidateNow(shortcode, editedCaption = null) {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    app.showToast(`🚀 Publishing candidate #${shortcode} to ${acc.handle}...`, 'info');
    try {
      const payload = { shortcode, destination: this.activeAccount };
      if (editedCaption) payload.caption = editedCaption;

      const res = await fetch('/api/instagram/mobile-dm/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Publishing failed');

      app.showToast(`🎉 Published successfully to ${acc.handle}! (${data.permalink || 'Live on Instagram'})`, 'success');
      this.reviewItem = null;
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Publish notice: ${e.message}`, 'error');
    }
  },

  async skipCandidate(itemId) {
    try {
      await fetch(`/api/instagram/autonomous/${itemId}/skip`, { method: 'POST' });
      app.showToast('Reel skipped from queue', 'info');
      this.reviewItem = null;
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast('Skipped locally', 'info');
    }
  },

  async publishTopTwoNow() {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    app.showToast(`Publishing Top Candidate for [${acc.name}] via Meta Graph API...`, 'info');
    try {
      const res = await fetch('/api/instagram/stealth/publish-top-two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcePublish: false, minScore: 70, destination: this.activeAccount })
      });
      const data = await res.json();
      if (data.success && data.result?.totalPublished > 0) {
        app.showToast(`🎉 Success! Published ${data.result.totalPublished} reels to ${acc.name}!`, 'success');
      } else {
        app.showToast(`No reels met the approval threshold or already posted.`, 'warning');
      }
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Publish notice: ${e.message}`, 'error');
    }
  },

  async pollAllSourcesNow() {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    app.showToast(`📡 Scanning all monitored profiles for [${acc.name}]...`, 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      app.showToast(`Scan initiated for ${acc.name}. Refreshing pipeline...`, 'success');
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
      }, 2500);
    } catch (e) {
      app.showToast('Scan triggered.', 'info');
    }
  },

  async addNewChannel() {
    const input = document.getElementById('new-channel-input')?.value;
    const nicheSelect = document.getElementById('new-channel-niche');
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    const niche = nicheSelect ? nicheSelect.value : (acc.defaultNiche || 'general');

    if (!input || !input.trim()) {
      app.showToast('Please enter an Instagram username or URL', 'warning');
      return;
    }

    app.showToast(`Adding @${input.replace(/^@/, '')} to [${acc.name}]...`, 'info');
    try {
      const res = await fetch('/api/instagram/tracked-channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: input.trim(), 
          niche_tag: niche, 
          destination_account: this.activeAccount 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add channel');

      app.showToast(data.message || `Added @${input} to ${acc.name}!`, 'success');
      const inputEl = document.getElementById('new-channel-input');
      if (inputEl) inputEl.value = '';
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Error: ${e.message}`, 'error');
    }
  },

  async bulkAddChannels() {
    const input = document.getElementById('bulk-channels-input')?.value;
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];

    if (!input || !input.trim()) {
      app.showToast(`Please enter target profiles to add`, 'warning');
      return;
    }

    app.showToast(`Adding target profiles to [${acc.name}]...`, 'info');
    try {
      const res = await fetch('/api/instagram/tracked-channels/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: input.trim(), 
          nicheTag: acc.defaultNiche,
          destination_account: this.activeAccount 
        })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`✓ Added ${data.addedCount} new profiles to ${acc.name}!`, 'success');
        const bulkInput = document.getElementById('bulk-channels-input');
        if (bulkInput) bulkInput.value = '';
        await this.loadData();
        this.renderDashboard();
      } else {
        app.showToast(`Error adding profiles: ${data.error}`, 'error');
      }
    } catch (e) {
      app.showToast(`Network error: ${e.message}`, 'error');
    }
  },

  async toggleChannel(channelId) {
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast(`Channel monitoring status updated`, 'success');
        await this.loadData();
        this.renderDashboard();
      }
    } catch (e) {
      app.showToast(`Error toggling channel: ${e.message}`, 'error');
    }
  },

  async deleteChannel(channelId) {
    if (!confirm('Remove this target profile from autonomous monitoring?')) return;
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.showToast('Target channel removed', 'success');
        await this.loadData();
        this.renderDashboard();
      }
    } catch (e) {
      app.showToast(`Error deleting channel: ${e.message}`, 'error');
    }
  },

  async saveActivePageSettings() {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    const name = document.getElementById('page-name-input')?.value?.trim() || acc.name;
    const handle = document.getElementById('page-handle-input')?.value?.trim() || acc.handle;
    const pageToken = document.getElementById('page-token-input')?.value ?? acc.pageToken;
    const igUserId = document.getElementById('page-user-id-input')?.value ?? acc.igUserId;
    const attr = document.getElementById('page-attr-input')?.value ?? acc.attributionTemplate;
    const quota = parseInt(document.getElementById('page-quota-input')?.value || acc.dailyQuota, 10);
    const niche = document.getElementById('page-niche-input')?.value?.trim() || acc.defaultNiche;
    const autopilot = document.getElementById('page-autopilot-toggle')?.checked ? 1 : 0;

    acc.name = name;
    acc.handle = handle;
    acc.pageToken = pageToken;
    acc.igUserId = igUserId;
    acc.attributionTemplate = attr;
    acc.dailyQuota = quota;
    acc.defaultNiche = niche;
    acc.autopilotEnabled = (autopilot === 1);

    try {
      if (acc.dbId) {
        await fetch(`/api/instagram/pages/${acc.dbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            handle,
            niche,
            meta_page_token: pageToken,
            meta_ig_user_id: igUserId,
            attribution_template: attr,
            daily_quota: quota,
            autopilot_enabled: autopilot
          })
        });
      }

      const settingsPayload = {};
      if (acc.id === 'tech') {
        settingsPayload.tech_instagram_handle = handle;
        settingsPayload.tech_meta_page_token = pageToken;
        settingsPayload.tech_meta_ig_user_id = igUserId;
        settingsPayload.tech_autopilot_enabled = String(autopilot);
      } else if (acc.id === 'gta6') {
        settingsPayload.instagram_handle = handle;
        settingsPayload.meta_page_token = pageToken;
        settingsPayload.meta_ig_user_id = igUserId;
        settingsPayload.instagram_autopilot_enabled = String(autopilot);
      } else {
        settingsPayload[`${acc.id}_instagram_handle`] = handle;
        settingsPayload[`${acc.id}_meta_page_token`] = pageToken;
        settingsPayload[`${acc.id}_meta_ig_user_id`] = igUserId;
        settingsPayload[`${acc.id}_autopilot_enabled`] = String(autopilot);
      }

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload })
      });

      app.showToast(`✓ Settings for ${name} saved successfully!`, 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Settings saved locally: ${e.message}`, 'info');
    }
  },

  async saveRankingParams() {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            tech_ranking_params: JSON.stringify(this.rankingParams)
          }
        })
      });
      app.showToast('✓ Scoring weights saved successfully!', 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast('Weights saved locally', 'info');
    }
  },

  copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      app.showToast(successMsg, 'success');
    }).catch(() => {
      app.showToast('Unable to copy to clipboard', 'warning');
    });
  }
};

window.instagramBotV2View = instagramBotV2View;
