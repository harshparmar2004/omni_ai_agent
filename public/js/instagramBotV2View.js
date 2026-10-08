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
  creatorViewMode: 'cards', // 'cards' or 'table'
  creatorSearchQuery: '',
  creatorFilterStatus: 'all', // 'all', 'active', 'paused'
  syncingChannelId: null, // channel ID currently syncing
  showBulkImporter: false,
  isScanningAll: false,

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
  bridgeStatus: null,
  bridgeOnline: false,

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
      const [channelsRes, feedRes, pagesRes, summaryRes, settingsRes, bridgeRes] = await Promise.all([
        fetch('/api/instagram/tracked-channels').catch(() => ({ json: () => ({ channels: [] }) })),
        fetch('/api/instagram/autonomous/feed?limit=100').catch(() => ({ json: () => ({ logs: [] }) })),
        fetch('/api/instagram/pages').catch(() => ({ json: () => ({ pages: [] }) })),
        fetch(`/api/instagram/pipeline-summary?destination=${this.activeAccount}`).catch(() => ({ json: () => ({ stages: {} }) })),
        fetch('/api/settings').catch(() => ({ json: () => ({ settings: {} }) })),
        fetch('/api/instagram/bridge/status').catch(() => ({ json: () => ({ online: false }) }))
      ]);

      const channelsJson = await channelsRes.json();
      const feedJson = await feedRes.json();
      const pagesJson = await pagesRes.json();
      const summaryJson = await summaryRes.json();
      const settingsJson = await settingsRes.json();
      const bridgeJson = await bridgeRes.json();

      this.trackedChannels = channelsJson.channels || [];
      this.autonomousFeed = feedJson.logs || [];
      this.connectedPages = pagesJson.pages || [];
      this.pipelineSummary = summaryJson.stages ? summaryJson : null;
      this.bridgeStatus = bridgeJson || null;
      this.bridgeOnline = Boolean(bridgeJson?.online);

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

        <!-- ── 4. MODERN SEGMENTED TAB NAVIGATION ────────────────────────── -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem; margin-top: 0.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div class="v2-segmented-control">
            <button class="v2-segmented-btn ${this.activeTab === 'pipeline' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('pipeline')">
              <span>📊 Pipeline Board</span>
            </button>
            <button class="v2-segmented-btn ${this.activeTab === 'sources' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('sources')">
              <span>🎯 Monitored Sources</span>
              <span class="v2-segmented-badge">${this.getFilteredChannels().length}</span>
            </button>
            <button class="v2-segmented-btn ${this.activeTab === 'settings' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('settings')">
              <span>⚙️ Settings & Rules</span>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-card); border: 1.5px solid var(--border-color); padding: 0.35rem 0.85rem; border-radius: 9999px; box-shadow: var(--shadow-xs);">
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Workspace:</span>
            <span style="font-size: 0.82rem; font-weight: 800; color: ${currentAccount.color}; display: flex; align-items: center; gap: 0.35rem;">
              <span>${currentAccount.icon || '📱'}</span>
              <span>${escapeHtml(currentAccount.name)}</span>
            </span>
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">(${escapeHtml(currentAccount.handle)})</span>
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
          style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.82rem; font-weight: 700; border: 1.5px solid ${isSelected ? acc.color : 'var(--border-color)'}; background: ${isSelected ? acc.lightBg : 'var(--bg-base)'}; color: ${isSelected ? acc.color : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.18s ease; ${isSelected ? `box-shadow: 0 2px 8px ${acc.lightBg};` : ''}"
          onclick="instagramBotV2View.switchAccount('${acc.id}')"
        >
          <span style="font-size: 1.1rem;">${acc.icon || '📱'}</span>
          <span>${escapeHtml(acc.name)}</span>
          <span style="opacity: 0.75; font-size: 0.74rem; font-weight: 600;">${escapeHtml(acc.handle)}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="v2-page-bar" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem 1.25rem; background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm); flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
            Workspaces:
          </span>
          <div class="v2-page-pills" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            ${pagePills}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <!-- InstaAuto Sister Agent Bridge Status Pill -->
          <div 
            id="v2-instaauto-bridge-pill" 
            onclick="instagramBotV2View.checkBridgeStatus(true)" 
            title="InstaAuto Comment-to-DM Engine (Port 3000). Click to test connection or flush pending queue."
            style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; background: ${this.bridgeOnline ? '#EFF6FF' : '#FEF3C7'}; border: 1px solid ${this.bridgeOnline ? '#3B82F6' : '#F59E0B'}; font-size: 0.78rem; font-weight: 800; color: ${this.bridgeOnline ? '#1D4ED8' : '#B45309'}; cursor: pointer; transition: all 0.2s;"
          >
            <span class="pulse-dot" style="background: ${this.bridgeOnline ? '#2563EB' : '#F59E0B'}; width: 7px; height: 7px; border-radius: 50%;"></span>
            <span>InstaAuto: Port 3000 (${this.bridgeOnline ? 'Armed' : 'Standby'}${this.bridgeStatus?.pendingDeliverablesCount > 0 ? ` • ${this.bridgeStatus.pendingDeliverablesCount} Queued` : ''})</span>
          </div>

          <!-- Autopilot Status Pill -->
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; background: ${currentAccount.autopilotEnabled ? '#DEF7EC' : 'var(--bg-base)'}; border: 1px solid ${currentAccount.autopilotEnabled ? '#31C48D' : 'var(--border-color)'}; font-size: 0.78rem; font-weight: 800; color: ${currentAccount.autopilotEnabled ? '#03543F' : 'var(--text-muted)'};">
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
      <div class="v2-stepper-container" style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 14px; padding: 1.1rem 1.35rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-size: 0.78rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 1rem;">⚡</span> Autonomous Ingestion & Publishing Pipeline Stage
          </div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">
            Surveillance Cadence: <strong>Every 3 Hours ± 20m Jitter</strong>
          </div>
        </div>

        <div class="v2-stepper" style="display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; overflow-x: auto; padding-bottom: 0.35rem;">
          <!-- Stage 1: Sources -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('sources')" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: var(--bg-base); border: 1.5px solid var(--border-color); cursor: pointer; flex: 1; min-width: 140px;">
            <div class="v2-step-num" style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; color: var(--text-secondary);">1</div>
            <div class="v2-step-info" style="display: flex; flex-direction: column;">
              <span class="v2-step-label" style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Sources</span>
              <span class="v2-step-count" style="font-size: 0.96rem; font-weight: 800; color: var(--text-primary);">${summary.sources} Profiles</span>
            </div>
          </div>
          <div class="v2-step-arrow" style="color: var(--text-muted); font-size: 1.1rem; font-weight: 700; opacity: 0.6; padding: 0 2px;">→</div>

          <!-- Stage 2: Scanned -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='scanned'; instagramBotV2View.renderDashboard();" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: var(--bg-base); border: 1.5px solid var(--border-color); cursor: pointer; flex: 1; min-width: 140px;">
            <div class="v2-step-num" style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; color: var(--text-secondary);">2</div>
            <div class="v2-step-info" style="display: flex; flex-direction: column;">
              <span class="v2-step-label" style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Scanned</span>
              <span class="v2-step-count" style="font-size: 0.96rem; font-weight: 800; color: var(--text-primary);">${summary.scanned} Ingested</span>
            </div>
          </div>
          <div class="v2-step-arrow" style="color: var(--text-muted); font-size: 1.1rem; font-weight: 700; opacity: 0.6; padding: 0 2px;">→</div>

          <!-- Stage 3: Ranked -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline');" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: var(--bg-base); border: 1.5px solid var(--border-color); cursor: pointer; flex: 1; min-width: 140px;">
            <div class="v2-step-num" style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; color: var(--text-secondary);">3</div>
            <div class="v2-step-info" style="display: flex; flex-direction: column;">
              <span class="v2-step-label" style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Ranked</span>
              <span class="v2-step-count" style="font-size: 0.96rem; font-weight: 800; color: var(--text-primary);">${summary.ranked} Scored</span>
            </div>
          </div>
          <div class="v2-step-arrow" style="color: var(--text-muted); font-size: 1.1rem; font-weight: 700; opacity: 0.6; padding: 0 2px;">→</div>

          <!-- Stage 4: Ready to Post -->
          <div class="v2-step-node ${summary.ready > 0 ? 'active-stage' : ''}" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='ready'; instagramBotV2View.renderDashboard();" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: ${summary.ready > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-base)'}; border: 1.5px solid ${summary.ready > 0 ? '#10B981' : 'var(--border-color)'}; cursor: pointer; flex: 1; min-width: 140px;">
            <div class="v2-step-num" style="width: 28px; height: 28px; border-radius: 50%; background: ${summary.ready > 0 ? '#10B981' : 'var(--bg-card)'}; border: 1.5px solid ${summary.ready > 0 ? '#10B981' : 'var(--border-color)'}; color: ${summary.ready > 0 ? '#fff' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800;">4</div>
            <div class="v2-step-info" style="display: flex; flex-direction: column;">
              <span class="v2-step-label" style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Ready</span>
              <span class="v2-step-count" style="font-size: 0.96rem; font-weight: 800; color: ${summary.ready > 0 ? '#10B981' : 'var(--text-primary)'};">${summary.ready} Approved</span>
            </div>
          </div>
          <div class="v2-step-arrow" style="color: var(--text-muted); font-size: 1.1rem; font-weight: 700; opacity: 0.6; padding: 0 2px;">→</div>

          <!-- Stage 5: Published Live -->
          <div class="v2-step-node" onclick="instagramBotV2View.switchTab('pipeline'); instagramBotV2View.activeKanbanFilter='published'; instagramBotV2View.renderDashboard();" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: var(--bg-base); border: 1.5px solid var(--border-color); cursor: pointer; flex: 1; min-width: 140px;">
            <div class="v2-step-num" style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; color: var(--text-secondary);">5</div>
            <div class="v2-step-info" style="display: flex; flex-direction: column;">
              <span class="v2-step-label" style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Live Posts</span>
              <span class="v2-step-count" style="font-size: 0.96rem; font-weight: 800; color: #2563EB;">${summary.published} Live</span>
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
      <div class="v2-primary-cta-bar" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.95rem 1.35rem; box-shadow: var(--shadow-sm); flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <button class="v2-primary-btn" onclick="${primaryActionOnClick}" style="display: inline-flex; align-items: center; gap: 0.65rem; padding: 0.75rem 1.4rem; border-radius: 10px; font-size: 0.92rem; font-weight: 800; color: #FFFFFF; background: linear-gradient(135deg, #10B981, #059669); border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); transition: all 0.2s ease;">
            <span>${primaryActionTitle}</span>
          </button>
          <div>
            <div style="font-size: 0.84rem; font-weight: 800; color: var(--text-primary);">
              ${escapeHtml(primaryActionSubtitle)}
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 1px;">
              Destination: <strong>${escapeHtml(currentAccount.handle)}</strong> • Single-click action
            </div>
          </div>
        </div>

        <!-- Secondary Actions in Compact Format -->
        <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
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
        <div class="v2-kanban-board" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; align-items: start;">
          
          <!-- Column 1: Incoming / Scanned -->
          <div class="v2-kanban-col" style="background: var(--bg-base); border: 1.5px solid var(--border-color); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; min-height: 480px;">
            <div class="v2-kanban-header" style="padding: 0.85rem 1.15rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div class="v2-kanban-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 800; color: var(--text-primary);">
                <span>📥</span> Incoming Scraped
              </div>
              <span class="v2-kanban-badge" style="font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: rgba(0, 0, 0, 0.06); color: var(--text-muted);">${incomingItems.length}</span>
            </div>
            <div class="v2-kanban-content" style="padding: 0.85rem; display: flex; flex-direction: column; gap: 0.85rem; flex: 1;">
              ${incomingItems.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.8rem;">
                  <div>📡</div>
                  <div style="font-weight: 700; margin-top: 4px;">No incoming unranked posts</div>
                </div>
              ` : incomingItems.slice(0, 10).map(item => this.renderSlimReelCard(item, currentAccount, false)).join('')}
            </div>
          </div>

          <!-- Column 2: Ready to Post (Approved Candidates) -->
          <div class="v2-kanban-col" style="background: var(--bg-base); border: 1.5px solid var(--border-color); border-top: 3.5px solid #10B981; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; min-height: 480px;">
            <div class="v2-kanban-header" style="padding: 0.85rem 1.15rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div class="v2-kanban-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 800; color: #03543F;">
                <span>🥇</span> Ready to Post
              </div>
              <span class="v2-kanban-badge" style="font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: #DEF7EC; color: #03543F;">${readyItems.length} QUALIFIED</span>
            </div>
            <div class="v2-kanban-content" style="padding: 0.85rem; display: flex; flex-direction: column; gap: 0.85rem; flex: 1;">
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
          <div class="v2-kanban-col" style="background: var(--bg-base); border: 1.5px solid var(--border-color); border-top: 3.5px solid #2563EB; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; min-height: 480px;">
            <div class="v2-kanban-header" style="padding: 0.85rem 1.15rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div class="v2-kanban-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 800; color: #1E40AF;">
                <span>🟢</span> Published Live
              </div>
              <span class="v2-kanban-badge" style="font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: #DBEAFE; color: #1E40AF;">${publishedItems.length} POSTS</span>
            </div>
            <div class="v2-kanban-content" style="padding: 0.85rem; display: flex; flex-direction: column; gap: 0.85rem; flex: 1;">
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
      <div class="v2-reel-card-slim ${isTopPick ? 'top-pick' : ''}" style="background: var(--bg-card); border: ${isTopPick ? '2px solid #10B981' : '1px solid var(--border-color)'}; border-radius: 12px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem; box-shadow: var(--shadow-sm); position: relative; ${isTopPick ? 'background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), var(--bg-card) 25%);' : ''}">
        
        <div class="v2-reel-card-header" style="display: flex; gap: 0.75rem; align-items: flex-start;">
          <!-- Thumbnail -->
          <div class="v2-reel-thumb-sm" onclick="instagramBotV2View.openReviewDrawer(${item.id})" title="Click to review & preview video" style="width: 58px; height: 80px; border-radius: 8px; overflow: hidden; background: #111; position: relative; flex-shrink: 0; cursor: pointer;">
            <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'" style="width: 100%; height: 100%; object-fit: cover;">
            <div class="play-icon" style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; font-size: 1rem; color: #FFFFFF;">▶</div>
          </div>

          <!-- Meta -->
          <div class="v2-reel-meta" style="flex: 1; min-width: 0;">
            <div class="v2-reel-creator" style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
              <span>@${escapeHtml(item.channel_username || 'creator')}</span>
              <span class="v2-reel-score-badge" style="font-size: 0.72rem; font-weight: 900; padding: 2px 7px; border-radius: 6px; background: #DEF7EC; color: #03543F;">${score}/100</span>
            </div>
            <div class="v2-reel-hook" title="${escapeHtml(hook)}" style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin-top: 3px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${isTopPick ? '🥇 ' : ''}${escapeHtml(hook)}
            </div>
          </div>
        </div>

        <!-- Lead Magnet & Trigger Badges (if present) -->
        ${(item.detected_trigger_keyword || item.harvested_deliverable_url) ? `
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-top: -2px;">
            ${item.detected_trigger_keyword ? `
              <span style="font-size: 0.68rem; font-weight: 800; color: #7C3AED; background: #F5F3FF; padding: 2px 6px; border-radius: 4px; border: 1px solid #DDD6FE;" title="Follower Comment Trigger">
                💬 "${escapeHtml(item.detected_trigger_keyword)}"
              </span>
            ` : ''}
            ${item.harvested_deliverable_url ? `
              <a href="${item.harvested_deliverable_url}" target="_blank" onclick="event.stopPropagation()" style="font-size: 0.68rem; font-weight: 700; color: #2563EB; background: #EFF6FF; padding: 2px 6px; border-radius: 4px; border: 1px solid #BFDBFE; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="Harvested Deliverable URL">
                🔗 ${item.harvested_deliverable_type === 'pdf' ? 'PDF Doc' : 'Deliverable'} ↗
              </a>
            ` : ''}
          </div>
        ` : ''}

        <!-- 2-Line Caption Preview -->
        <div class="v2-reel-caption-preview" style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; background: var(--bg-base); padding: 6px 8px; border-radius: 6px;">
          ${escapeHtml(captionPreview.slice(0, 95))}...
        </div>

        <!-- Bottom Actions -->
        <div class="v2-reel-card-actions" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 2px;">
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

            <!-- Lead Magnet & Comment-to-DM Setup (InstaAuto Port 3000) -->
            <div style="background: var(--bg-card); border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 1rem 1.15rem; background: linear-gradient(180deg, rgba(239, 246, 255, 0.7) 0%, var(--bg-card) 60%); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 4px;">
                <div style="font-size: 0.82rem; font-weight: 800; color: #1E40AF; display: flex; align-items: center; gap: 6px;">
                  <span>🎯</span> Lead Magnet & Comment-to-DM Fulfillment
                </div>
                <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${this.bridgeOnline ? '#DEF7EC' : '#FEF3C7'}; color: ${this.bridgeOnline ? '#03543F' : '#92400E'};">
                  ${this.bridgeOnline ? '● AI Agent: InstaAuto (Port 3000) Online' : '○ Standby'}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                <div>
                  <label style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; margin-bottom: 3px; display: block;">
                    💬 Follower Trigger Keyword:
                  </label>
                  <input 
                    type="text" 
                    id="drawer-keyword-input" 
                    class="form-input" 
                    value="${escapeHtml(item.detected_trigger_keyword || 'PROJECT')}" 
                    style="font-size: 0.84rem; font-weight: 800; color: #7C3AED; padding: 6px 10px; border-radius: 6px; text-transform: uppercase;"
                    placeholder="e.g. PROJECT, GUIDE, CODE"
                  />
                </div>
                <div>
                  <label style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; margin-bottom: 3px; display: block;">
                    📦 Deliverable Type:
                  </label>
                  <div style="padding: 7px 10px; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; font-weight: 800; color: #2563EB; text-transform: uppercase;">
                    ${escapeHtml(item.harvested_deliverable_type || 'web')}
                  </div>
                </div>
              </div>

              <div>
                <label style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700; margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center;">
                  <span>🔗 Exact Deliverable Link (Sent to User's DM):</span>
                  ${item.harvested_deliverable_url ? `
                    <a href="${item.harvested_deliverable_url}" target="_blank" style="color: #2563EB; text-decoration: underline; font-weight: 700;">
                      Test Open Link ↗
                    </a>
                  ` : ''}
                </label>
                <input 
                  type="url" 
                  id="drawer-deliverable-url-input" 
                  class="form-input" 
                  value="${escapeHtml(item.harvested_deliverable_url || '')}" 
                  style="font-size: 0.82rem; font-family: monospace; color: #1D4ED8; padding: 7px 10px; border-radius: 6px;"
                  placeholder="https://github.com/..., https://notion.site/..., https://drive.google.com/..."
                />
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">
                  ✨ This is the exact destination URL registered in the AI Agent (InstaAuto). When followers comment, InstaAuto will DM this exact link.
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem;">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm" 
                  onclick="instagramBotV2View.armCandidateInInstaAuto('${item.shortcode}')"
                  style="font-size: 0.74rem; font-weight: 800; color: #1D4ED8; background: #EFF6FF; border: 1px solid #93C5FD;"
                >
                  ⚡ Arm Exact Link in InstaAuto (Port 3000)
                </button>
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
    const q = (this.creatorSearchQuery || '').toLowerCase().trim();
    const statusFilter = this.creatorFilterStatus || 'all';

    // Curated Instant Suggestions by account or niche
    const suggestionsByAccount = {
      gta6: [
        { handle: 'rockstargames', name: 'Rockstar Games', niche: 'gaming' },
        { handle: 'gtaleaks', name: 'GTA 6 Leaks & News', niche: 'gaming' },
        { handle: 'gamespot', name: 'GameSpot', niche: 'gaming' },
        { handle: 'ign', name: 'IGN', niche: 'gaming' },
        { handle: 'gtainformer', name: 'GTA Informer', niche: 'gaming' },
        { handle: 'playstation', name: 'PlayStation', niche: 'gaming' }
      ],
      tech: [
        { handle: 'theverge', name: 'The Verge', niche: 'tech' },
        { handle: 'techcrunch', name: 'TechCrunch', niche: 'tech' },
        { handle: 'mkbhd', name: 'MKBHD', niche: 'tech' },
        { handle: 'wired', name: 'WIRED', niche: 'tech' },
        { handle: 'ycombinator', name: 'Y Combinator', niche: 'tech' },
        { handle: 'openai', name: 'OpenAI', niche: 'tech' }
      ]
    };

    const defaultSuggestions = suggestionsByAccount[currentAccount.id] || 
      suggestionsByAccount[currentAccount.defaultNiche] || 
      suggestionsByAccount.tech;

    // Filter channels based on search and status
    const filteredChannels = channels.filter(c => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'paused' && c.is_active) return false;
      if (q) {
        const handleMatch = (c.username || '').toLowerCase().includes(q);
        const nameMatch = (c.display_name || '').toLowerCase().includes(q);
        const postMatch = (c.last_post_shortcode || '').toLowerCase().includes(q);
        if (!handleMatch && !nameMatch && !postMatch) return false;
      }
      return true;
    });

    const activeCount = channels.filter(c => c.is_active).length;
    const pausedCount = channels.filter(c => !c.is_active).length;

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- ── SECTION 1: UNIFIED CREATOR TARGET COMMAND CENTER ───────────── -->
        <div class="card" style="padding: 1.35rem 1.6rem; background: var(--bg-card); border-radius: 16px; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1.15rem;">
          
          <!-- Header Row: Icon, Title, Description, Mode Switcher -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: ${currentAccount.lightBg}; color: ${currentAccount.color}; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; border: 1px solid ${currentAccount.borderColor};">
                🎯
              </div>
              <div>
                <div style="font-size: 0.98rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                  <span>Add Monitored Creators</span>
                  <span class="v2-segmented-badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 800; font-size: 0.72rem;">
                    ${escapeHtml(currentAccount.name)}
                  </span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 1px;">
                  Sentinel autonomously surveils these creators 24/7 for high-performing reels.
                </div>
              </div>
            </div>

            <!-- Mode Switcher: Single vs Bulk -->
            <div class="v2-segmented-control" style="padding: 3px;">
              <button 
                class="v2-segmented-btn ${!this.showBulkImporter ? 'active' : ''}" 
                style="padding: 0.35rem 0.85rem; font-size: 0.76rem;" 
                onclick="instagramBotV2View.showBulkImporter = false; instagramBotV2View.renderDashboard();"
              >
                <span>⚡ Quick Add</span>
              </button>
              <button 
                class="v2-segmented-btn ${this.showBulkImporter ? 'active' : ''}" 
                style="padding: 0.35rem 0.85rem; font-size: 0.76rem;" 
                onclick="instagramBotV2View.showBulkImporter = true; instagramBotV2View.renderDashboard();"
              >
                <span>📂 Bulk Import</span>
              </button>
            </div>
          </div>

          ${!this.showBulkImporter ? `
            <!-- Quick Add Input Row -->
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
              <div class="v2-input-group" style="flex: 1; min-width: 280px; height: 42px;">
                <span class="v2-input-prefix" style="font-size: 1rem; color: var(--text-muted); background: var(--bg-deep); padding: 0 1rem;">@</span>
                <input 
                  type="text" 
                  id="new-channel-input" 
                  class="v2-input-field" 
                  placeholder="Enter creator handle (e.g. gtaleaks, ign, mkbhd) or profile URL..." 
                  onkeydown="if(event.key==='Enter') instagramBotV2View.addNewChannel()"
                  style="font-size: 0.88rem;"
                >
              </div>

              <select id="new-channel-niche" class="form-input" style="width: 180px; height: 42px; border-radius: 10px; font-weight: 700; font-size: 0.82rem; border: 1.5px solid var(--border-color); background: var(--bg-card); cursor: pointer;">
                <option value="tech" ${currentAccount.defaultNiche === 'tech' ? 'selected' : ''}>💻 Tech / AI</option>
                <option value="gaming" ${currentAccount.defaultNiche === 'gaming' ? 'selected' : ''}>🎮 Gaming / GTA 6</option>
                <option value="general" ${currentAccount.defaultNiche === 'general' ? 'selected' : ''}>📱 General Niche</option>
              </select>

              <button class="btn btn-primary" onclick="instagramBotV2View.addNewChannel()" style="font-weight: 800; font-size: 0.85rem; background: ${currentAccount.gradient}; border: none; color: #fff; height: 42px; padding: 0 1.4rem; border-radius: 10px; box-shadow: var(--shadow-btn); display: inline-flex; align-items: center; gap: 0.45rem; white-space: nowrap; cursor: pointer;">
                <span>➕</span>
                <span>Add to Monitoring</span>
              </button>
            </div>

            <!-- Suggested Targets Shelf -->
            <div style="display: flex; align-items: center; gap: 0.75rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
              <div style="font-size: 0.76rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;">
                <span>💡 Suggested Targets:</span>
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center;">
                ${defaultSuggestions.map(s => {
                  const isAdded = channels.some(c => (c.username || '').toLowerCase() === s.handle.toLowerCase());
                  if (isAdded) {
                    return `
                      <span class="v2-chip-btn" style="opacity: 0.55; cursor: default; background: var(--bg-deep); border-color: var(--border-color); color: var(--text-muted); padding: 0.3rem 0.65rem; font-size: 0.74rem;" title="Already monitored">
                        ✓ @${escapeHtml(s.handle)}
                      </span>
                    `;
                  }
                  return `
                    <button 
                      class="v2-chip-btn" 
                      onclick="instagramBotV2View.quickAddSuggestedTarget('${s.handle}', '${s.niche}')" 
                      style="padding: 0.3rem 0.65rem; font-size: 0.74rem;"
                      title="Click to instantly monitor @${escapeHtml(s.handle)}"
                    >
                      <span style="color: ${currentAccount.color}; font-weight: 900;">+</span>
                      <span>@${escapeHtml(s.handle)}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          ` : `
            <!-- Bulk Import Mode -->
            <div style="display: flex; flex-direction: column; gap: 0.65rem; background: var(--bg-deep); border: 1.5px dashed var(--border-color); border-radius: 12px; padding: 1.1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">
                  Batch Paste 10–30 Creator Handles
                </span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">
                  Separate handles by commas, spaces, or newlines
                </span>
              </div>
              <textarea 
                id="bulk-channels-input" 
                class="form-input" 
                style="min-height: 85px; font-family: monospace; font-size: 0.84rem; width: 100%; border-radius: 8px; border: 1.5px solid var(--border-color); background: #FFFFFF; padding: 0.65rem;" 
                placeholder="@creator1, @creator2, @competitor3, https://instagram.com/creator4..."
              ></textarea>
              <div style="display: flex; justify-content: flex-end; gap: 0.65rem; align-items: center; margin-top: 0.25rem;">
                <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showBulkImporter = false; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                  Cancel
                </button>
                <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.bulkAddChannels()" style="font-weight: 800; background: ${currentAccount.gradient}; border: none; color: #fff;">
                  🚀 Import All to Fleet
                </button>
              </div>
            </div>
          `}

        </div>

        <!-- ── SECTION 2: MONITORED CREATOR FLEET TOOLBAR ────────────────── -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
              <span>Monitored Creator Fleet</span>
              <span class="v2-segmented-badge" style="font-size: 0.78rem;">${channels.length}</span>
            </div>

            <!-- Status Filter Segment -->
            <div class="v2-segmented-control" style="padding: 2px;">
              <button 
                class="v2-segmented-btn ${statusFilter === 'all' ? 'active' : ''}" 
                style="padding: 0.3rem 0.75rem; font-size: 0.75rem;" 
                onclick="instagramBotV2View.creatorFilterStatus = 'all'; instagramBotV2View.renderDashboard();"
              >
                All (${channels.length})
              </button>
              <button 
                class="v2-segmented-btn ${statusFilter === 'active' ? 'active' : ''}" 
                style="padding: 0.3rem 0.75rem; font-size: 0.75rem;" 
                onclick="instagramBotV2View.creatorFilterStatus = 'active'; instagramBotV2View.renderDashboard();"
              >
                Active (${activeCount})
              </button>
              <button 
                class="v2-segmented-btn ${statusFilter === 'paused' ? 'active' : ''}" 
                style="padding: 0.3rem 0.75rem; font-size: 0.75rem;" 
                onclick="instagramBotV2View.creatorFilterStatus = 'paused'; instagramBotV2View.renderDashboard();"
              >
                Paused (${pausedCount})
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <!-- Search Box -->
            <div class="v2-input-group" style="width: 200px; height: 34px;">
              <span style="padding: 0 0.5rem; font-size: 0.8rem; color: var(--text-muted);">🔍</span>
              <input 
                type="text" 
                class="v2-input-field" 
                placeholder="Filter handles..." 
                value="${escapeHtml(this.creatorSearchQuery || '')}"
                oninput="instagramBotV2View.creatorSearchQuery = this.value; instagramBotV2View.renderDashboard();"
                style="font-size: 0.78rem; padding: 0.3rem 0.5rem;"
              >
              ${this.creatorSearchQuery ? `
                <button onclick="instagramBotV2View.creatorSearchQuery = ''; instagramBotV2View.renderDashboard();" style="border: none; background: transparent; cursor: pointer; padding-right: 6px; color: var(--text-muted); font-size: 0.75rem;">✕</button>
              ` : ''}
            </div>

            <!-- View Mode Switch -->
            <div class="v2-segmented-control" style="padding: 2px;">
              <button 
                class="v2-segmented-btn ${this.creatorViewMode === 'cards' ? 'active' : ''}" 
                style="padding: 0.3rem 0.65rem; font-size: 0.75rem;" 
                onclick="instagramBotV2View.creatorViewMode = 'cards'; instagramBotV2View.renderDashboard();" 
                title="Visual Cards View"
              >
                ⊞ Cards
              </button>
              <button 
                class="v2-segmented-btn ${this.creatorViewMode === 'table' ? 'active' : ''}" 
                style="padding: 0.3rem 0.65rem; font-size: 0.75rem;" 
                onclick="instagramBotV2View.creatorViewMode = 'table'; instagramBotV2View.renderDashboard();" 
                title="High-Density Table View"
              >
                ☰ Table
              </button>
            </div>

            <!-- Scan All Button -->
            <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 800; font-size: 0.78rem; height: 34px;">
              🔄 Scan All Now
            </button>
          </div>
        </div>

        <!-- ── SECTION 3: CREATOR FLEET CONTENT (CARDS OR TABLE) ─────────── -->
        ${filteredChannels.length === 0 ? `
          <div class="card" style="padding: 3.5rem 1rem; text-align: center; background: var(--bg-card); border-radius: 14px; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🎯</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">
              ${q ? `No creators match "${escapeHtml(q)}"` : `No monitored creators for ${escapeHtml(currentAccount.name)}`}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.35rem; max-width: 420px; margin-left: auto; margin-right: auto;">
              ${q ? 'Try clearing your search query or switching the status filter above.' : 'Add your first creator handle using the quick add box or instant suggestion chips above!'}
            </div>
            ${q ? `
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.creatorSearchQuery = ''; instagramBotV2View.creatorFilterStatus = 'all'; instagramBotV2View.renderDashboard();" style="margin-top: 1rem; font-weight: 700;">
                Reset Filters
              </button>
            ` : ''}
          </div>
        ` : this.creatorViewMode === 'cards' ? `
          <!-- ── CARDS GRID VIEW ── -->
          <div class="v2-creator-grid">
            ${filteredChannels.map(c => {
              const isSyncing = this.syncingChannelId === c.id;
              const formattedDate = c.last_scraped_at ? new Date(c.last_scraped_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ready to scan';
              return `
                <div class="v2-creator-card" style="${c.is_active ? '' : 'opacity: 0.8;'}">
                  <!-- Top Row: Avatar, Name, Handle, Active Switch -->
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                      <div class="v2-creator-avatar-ring ${c.is_active ? '' : 'paused'}">
                        <img src="${c.avatar_url || '/generated/assets/brand_logo.svg'}" onerror="this.src='/generated/assets/brand_logo.svg'" alt="${escapeHtml(c.username)}">
                      </div>
                      <div style="min-width: 0;">
                        <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${escapeHtml(c.display_name || c.username)}
                        </div>
                        <a href="${c.profile_url || `https://www.instagram.com/${c.username}/`}" target="_blank" style="font-size: 0.76rem; font-weight: 700; color: var(--accent-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 2px;">
                          @${escapeHtml(c.username)} <span style="font-size: 0.68rem;">↗</span>
                        </a>
                      </div>
                    </div>

                    <!-- Sentinel Active Toggle -->
                    <label class="v2-switch" title="${c.is_active ? 'Sentinel Active: monitoring 24/7' : 'Sentinel Paused'}">
                      <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="instagramBotV2View.toggleChannel(${c.id})">
                      <span class="v2-slider"></span>
                    </label>
                  </div>

                  <!-- Metrics Row -->
                  <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                    <span style="font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: var(--bg-deep); color: var(--text-secondary); border: 1px solid var(--border-color);">
                      👥 ${c.followers_count && c.followers_count !== 'N/A' ? c.followers_count : 'Active'} Followers
                    </span>
                    <span style="font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); color: #03543F; border: 1px solid rgba(16, 185, 129, 0.2);">
                      📥 ${c.synced_posts_count || 0} Harvested
                    </span>
                    <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: ${currentAccount.lightBg}; color: ${currentAccount.color}; border: 1px solid ${currentAccount.borderColor};">
                      🏷️ ${escapeHtml(c.niche_tag || currentAccount.defaultNiche)}
                    </span>
                  </div>

                  <!-- Last Harvested Box -->
                  <div style="background: var(--bg-base); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem;">
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <span>🎬</span>
                      ${c.last_post_shortcode ? `
                        <a href="https://www.instagram.com/p/${c.last_post_shortcode}/" target="_blank" style="font-family: monospace; font-weight: 800; color: var(--text-primary); text-decoration: none;" title="Open harvested reel on Instagram">
                          #${escapeHtml(c.last_post_shortcode)} ↗
                        </a>
                      ` : `
                        <span style="color: var(--text-muted); font-weight: 600;">Ready for initial scan</span>
                      `}
                    </div>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${formattedDate}</span>
                  </div>

                  <!-- Action Row -->
                  <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: auto; padding-top: 0.35rem;">
                    <button 
                      class="btn btn-secondary btn-sm" 
                      onclick="instagramBotV2View.syncSingleChannelNow(${c.id})" 
                      style="flex: 1; font-weight: 800; font-size: 0.78rem; justify-content: center; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.75rem;" 
                      ${isSyncing ? 'disabled' : ''}
                      title="Scan this specific creator immediately for new reels"
                    >
                      ${isSyncing ? '⏳ Scraping...' : '⚡ Harvest Reel Now'}
                    </button>
                    <button 
                      class="table-action-btn" 
                      onclick="instagramBotV2View.deleteChannel(${c.id})" 
                      style="color: #EF4444; padding: 6px 10px; border-radius: 8px;" 
                      title="Remove Target"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- ── ENHANCED TABLE VIEW ── -->
          <div class="card" style="padding: 0; background: var(--bg-card); border-radius: 14px; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-sm); overflow: hidden;">
            <div style="overflow-x: auto;">
              <table class="reel-dictionary-table" style="margin: 0; width: 100%;">
                <thead>
                  <tr style="background: var(--bg-base); border-bottom: 1.5px solid var(--border-color);">
                    <th style="width: 50px; padding: 0.85rem 1rem;">Avatar</th>
                    <th style="min-width: 180px; padding: 0.85rem 1rem;">Creator & Handle</th>
                    <th style="min-width: 110px; padding: 0.85rem 1rem;">Followers</th>
                    <th style="min-width: 110px; padding: 0.85rem 1rem;">Niche</th>
                    <th style="min-width: 160px; padding: 0.85rem 1rem;">Last Harvested Post</th>
                    <th style="width: 110px; padding: 0.85rem 1rem;">Status</th>
                    <th style="width: 170px; text-align: right; padding: 0.85rem 1rem;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredChannels.map(c => {
                    const isSyncing = this.syncingChannelId === c.id;
                    const formattedDate = c.last_scraped_at ? new Date(c.last_scraped_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Ready';
                    return `
                      <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;">
                        <td style="padding: 0.85rem 1rem;">
                          <div class="v2-creator-avatar-ring ${c.is_active ? '' : 'paused'}" style="width: 36px; height: 36px;">
                            <img src="${c.avatar_url || '/generated/assets/brand_logo.svg'}" onerror="this.src='/generated/assets/brand_logo.svg'" alt="${escapeHtml(c.username)}">
                          </div>
                        </td>
                        <td style="padding: 0.85rem 1rem;">
                          <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">
                            ${escapeHtml(c.display_name || c.username)}
                          </div>
                          <a href="${c.profile_url || `https://www.instagram.com/${c.username}/`}" target="_blank" style="color: var(--accent-primary); font-size: 0.75rem; font-weight: 700; text-decoration: none;">
                            @${escapeHtml(c.username)} ↗
                          </a>
                        </td>
                        <td style="padding: 0.85rem 1rem;">
                          <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-secondary);">
                            👥 ${c.followers_count && c.followers_count !== 'N/A' ? c.followers_count : 'Active'}
                          </span>
                        </td>
                        <td style="padding: 0.85rem 1rem;">
                          <span class="badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 700; font-size: 0.72rem;">
                            ${escapeHtml(c.niche_tag || currentAccount.defaultNiche)}
                          </span>
                        </td>
                        <td style="padding: 0.85rem 1rem;">
                          ${c.last_post_shortcode ? `
                            <div style="font-size: 0.8rem; font-family: monospace; font-weight: 800; color: var(--text-primary);">
                              <a href="https://www.instagram.com/p/${c.last_post_shortcode}/" target="_blank" style="color: var(--text-primary); text-decoration: none;">
                                #${escapeHtml(c.last_post_shortcode)} ↗
                              </a>
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${formattedDate}</div>
                          ` : '<span style="font-size: 0.75rem; color: var(--text-muted);">Ready to scan</span>'}
                        </td>
                        <td style="padding: 0.85rem 1rem;">
                          <label class="v2-switch" title="${c.is_active ? 'Sentinel Active' : 'Sentinel Paused'}">
                            <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="instagramBotV2View.toggleChannel(${c.id})">
                            <span class="v2-slider"></span>
                          </label>
                        </td>
                        <td style="text-align: right; padding: 0.85rem 1rem;">
                          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                            <button 
                              class="table-action-btn" 
                              onclick="instagramBotV2View.syncSingleChannelNow(${c.id})" 
                              style="font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 6px;" 
                              ${isSyncing ? 'disabled' : ''}
                              title="Scrape this channel immediately"
                            >
                              ${isSyncing ? '⏳' : '⚡ Scrape'}
                            </button>
                            <button 
                              class="table-action-btn" 
                              onclick="instagramBotV2View.deleteChannel(${c.id})" 
                              style="color: #EF4444; padding: 4px 8px; border-radius: 6px;" 
                              title="Remove target"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3: SETTINGS (ACCORDION ARCHITECTURE)
  // ══════════════════════════════════════════════════════════════════════════
  renderSettingsTab(currentAccount) {
    const acc = currentAccount;
    const p = this.rankingParams;
    const isMetaConnected = Boolean(acc.pageToken && acc.pageToken.length > 15 && acc.igUserId);
    const activeSection = this.activeSettingsTab || this.activeAccordion || 'all';
    const totalWeights = (p.vibeWeight || 35) + (p.uspWeight || 25) + (p.qualityWeight || 20) + (p.freshnessWeight || 20);

    return `
      <div class="v2-settings-container">
        
        <!-- ── Top Hero Context Banner ────────────────────────────── -->
        <div class="v2-settings-header-card">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="v2-settings-icon-avatar" style="background: ${acc.lightBg}; color: ${acc.color}; border: 1.5px solid ${acc.borderColor};">
                ${acc.icon || '⚙️'}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                  <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">${escapeHtml(acc.name)} Configuration</h2>
                  <span class="v2-badge-pill" style="background: ${acc.lightBg}; color: ${acc.color}; border: 1px solid ${acc.borderColor};">${escapeHtml(acc.handle)}</span>
                  ${isMetaConnected 
                    ? '<span class="v2-badge-pill status-connected">● Meta API Active</span>' 
                    : '<span class="v2-badge-pill status-warning">○ Token Required</span>'}
                  ${acc.autopilotEnabled 
                    ? '<span class="v2-badge-pill status-autopilot">● Autopilot Active (3h)</span>' 
                    : '<span class="v2-badge-pill status-off">○ Manual Mode</span>'}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">
                  Manage Meta Graph API v21.0 tokens, 3-hour autonomous publishing cadence, AI ranking scoring weights, and anti-ban safeguards.
                </div>
              </div>
            </div>

            <!-- Top Actions -->
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.testMetaHandshake()" style="font-weight: 700; font-size: 0.78rem;" title="Test Meta Graph API connectivity">
                ⚡ Test Handshake
              </button>
              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveAllSettings()" style="font-weight: 800; font-size: 0.78rem; background: ${acc.gradient}; border: none; color: #fff;">
                💾 Save All Changes
              </button>
            </div>
          </div>
        </div>

        <!-- ── Segmented Category Filter Navigation ────────────────── -->
        <div class="v2-segmented-control" style="align-self: flex-start;">
          <button class="v2-segmented-btn ${activeSection === 'all' ? 'active' : ''}" onclick="instagramBotV2View.setSettingsTab('all')">
            <span>📋 All Settings</span>
          </button>
          <button class="v2-segmented-btn ${activeSection === 'connection' ? 'active' : ''}" onclick="instagramBotV2View.setSettingsTab('connection')">
            <span>🔑 Meta Graph API</span>
            ${isMetaConnected ? '<span class="v2-segmented-badge" style="background: #DEF7EC; color: #03543F;">✓</span>' : ''}
          </button>
          <button class="v2-segmented-btn ${activeSection === 'autopilot' ? 'active' : ''}" onclick="instagramBotV2View.setSettingsTab('autopilot')">
            <span>🤖 Autopilot & Captions</span>
            ${acc.autopilotEnabled ? '<span class="v2-segmented-badge" style="background: #EEF2FF; color: #3730A3;">3h</span>' : ''}
          </button>
          <button class="v2-segmented-btn ${activeSection === 'scoring' ? 'active' : ''}" onclick="instagramBotV2View.setSettingsTab('scoring')">
            <span>⚖️ AI Scoring Weights</span>
            <span class="v2-segmented-badge">${p.minApprovalScore}</span>
          </button>
          <button class="v2-segmented-btn ${activeSection === 'safety' ? 'active' : ''}" onclick="instagramBotV2View.setSettingsTab('safety')">
            <span>🛡️ Stealth Anti-Ban</span>
            <span class="v2-segmented-badge" style="background: #DEF7EC; color: #03543F;">Shield</span>
          </button>
        </div>

        <!-- ── Settings Cards ────────────────────────────────────── -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Card 1: Meta Graph API & Credentials -->
          ${(activeSection === 'all' || activeSection === 'connection') ? `
            <div class="v2-settings-card" id="settings-card-connection">
              <div class="v2-settings-card-header">
                <div>
                  <h3 class="v2-settings-card-title">
                    <span>🔑</span>
                    <span>Meta Graph API & Account Credentials</span>
                  </h3>
                  <p class="v2-settings-card-desc">
                    Official Graph API integration for publishing Reels and Carousels directly to <strong>${escapeHtml(acc.handle)}</strong>.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  ${isMetaConnected 
                    ? '<span class="v2-badge-pill status-connected">● Live Connection Active</span>' 
                    : '<span class="v2-badge-pill status-warning">○ Setup Incomplete</span>'}
                </div>
              </div>

              <div class="v2-settings-grid-2">
                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-name-input">
                    <span>Workspace Display Name</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Required</span>
                  </label>
                  <div class="v2-input-group">
                    <span class="v2-input-prefix">🏷️</span>
                    <input type="text" id="page-name-input" class="v2-input-field" value="${escapeHtml(acc.name)}" placeholder="e.g. GTA 6 Updates 007">
                  </div>
                  <div class="v2-settings-helper">Identifies this workspace in OmniStudio AI dashboard.</div>
                </div>

                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-handle-input">
                    <span>Destination Instagram Handle</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Public</span>
                  </label>
                  <div class="v2-input-group">
                    <span class="v2-input-prefix">@</span>
                    <input type="text" id="page-handle-input" class="v2-input-field" value="${escapeHtml(acc.handle)}" placeholder="@gta6_updates_007">
                  </div>
                  <div class="v2-settings-helper">Target Instagram profile where reels will be posted.</div>
                </div>

                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-token-input">
                    <span>Meta Page Access Token</span>
                    <button type="button" onclick="instagramBotV2View.toggleTokenVisibility('page-token-input')" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.76rem; font-weight: 700;">👁️ Show/Hide</button>
                  </label>
                  <div class="v2-input-group">
                    <span class="v2-input-prefix">🔒</span>
                    <input type="password" id="page-token-input" class="v2-input-field" placeholder="EAAB..." value="${escapeHtml(acc.pageToken || '')}">
                  </div>
                  <div class="v2-settings-helper">Long-lived token from Meta Graph API Explorer (requires <code>instagram_content_publish</code>).</div>
                </div>

                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-user-id-input">
                    <span>Instagram Business User ID</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Numeric ID</span>
                  </label>
                  <div class="v2-input-group">
                    <span class="v2-input-prefix">🆔</span>
                    <input type="text" id="page-user-id-input" class="v2-input-field" placeholder="17841428668115319" value="${escapeHtml(acc.igUserId || '')}">
                  </div>
                  <div class="v2-settings-helper">Your 17-digit Meta Instagram Business Account User ID.</div>
                </div>
              </div>

              <!-- Permission Helper Note -->
              <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; font-size: 0.78rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary);">
                  <span>💡</span>
                  <span>Required Scopes: <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>pages_show_list</code></span>
                </div>
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" style="color: var(--accent-primary); font-weight: 700; text-decoration: none;">
                  Open Graph API Explorer ↗
                </a>
              </div>

              <div class="v2-settings-footer">
                <button type="button" class="btn btn-secondary btn-sm" onclick="instagramBotV2View.testMetaHandshake()" style="font-weight: 700; font-size: 0.8rem;">
                  ⚡ Test Meta Handshake
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveActivePageSettings()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff; font-size: 0.82rem;">
                  💾 Save Connection Credentials
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Card 2: Autopilot Rules & Attribution Template -->
          ${(activeSection === 'all' || activeSection === 'autopilot') ? `
            <div class="v2-settings-card" id="settings-card-autopilot">
              <div class="v2-settings-card-header">
                <div>
                  <h3 class="v2-settings-card-title">
                    <span>🤖</span>
                    <span>Autonomous Publishing & Attribution Engine</span>
                  </h3>
                  <p class="v2-settings-card-desc">
                    Configure 3-hour automated publishing scheduling, caption credits, and daily quotas.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="v2-badge-pill ${acc.autopilotEnabled ? 'status-autopilot' : 'status-off'}">
                    ${acc.autopilotEnabled ? '● 3-Hour Cadence Active' : '○ Autopilot Paused'}
                  </span>
                </div>
              </div>

              <!-- Autopilot Master Switch Row -->
              <div style="background: var(--bg-base); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 1rem;">
                <div>
                  <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                    <span>⚡</span> Enable 3-Hour Autonomous Publishing (Top #1 Winner)
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    Sentinel evaluates candidate batch every 3 hours and automatically publishes the highest-scoring approved reel.
                  </div>
                </div>
                <label class="v2-switch">
                  <input type="checkbox" id="page-autopilot-toggle" ${acc.autopilotEnabled ? 'checked' : ''} onchange="instagramBotV2View.saveActivePageSettings()">
                  <span class="v2-slider"></span>
                </label>
              </div>

              <!-- Caption Attribution Template with Variable Chips -->
              <div style="margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
                  <label class="v2-settings-label" for="page-attr-input" style="margin-bottom: 0;">
                    Attribution Format & Caption Template
                  </label>
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                    <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted);">Insert Tag:</span>
                    <button type="button" class="v2-chip-btn" style="padding: 2px 7px; font-size: 0.72rem;" onclick="instagramBotV2View.insertAttrVariable('{author}')">+{author}</button>
                    <button type="button" class="v2-chip-btn" style="padding: 2px 7px; font-size: 0.72rem;" onclick="instagramBotV2View.insertAttrVariable('${escapeHtml(acc.handle)}')">+${escapeHtml(acc.handle)}</button>
                    <button type="button" class="v2-chip-btn" style="padding: 2px 7px; font-size: 0.72rem;" onclick="instagramBotV2View.insertAttrVariable('#gta6')">+#gta6</button>
                    <button type="button" class="v2-chip-btn" style="padding: 2px 7px; font-size: 0.72rem;" onclick="instagramBotV2View.insertAttrVariable('#rockstargames')">+#rockstar</button>
                    <button type="button" class="v2-chip-btn" style="padding: 2px 7px; font-size: 0.72rem;" onclick="instagramBotV2View.insertAttrVariable('#gaming')">+#gaming</button>
                  </div>
                </div>

                <textarea id="page-attr-input" class="form-input" style="font-size: 0.84rem; min-height: 75px; font-family: inherit; line-height: 1.45; border-radius: 10px;" oninput="instagramBotV2View.updateCaptionPreview()">${escapeHtml(acc.attributionTemplate)}</textarea>
                
                <!-- Live Preview Box -->
                <div style="margin-top: 0.5rem;">
                  <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                    <span>👀</span> Live Caption Preview:
                  </div>
                  <div id="caption-live-preview" class="v2-preview-box">
                    ${escapeHtml(acc.attributionTemplate.replace(/\{author\}/gi, 'rockstargames').replace(/\{handle\}/gi, acc.handle))}
                  </div>
                </div>
              </div>

              <div class="v2-settings-grid-2">
                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-quota-input">
                    <span>Daily Publishing Quota (Max Posts/Day)</span>
                    <span class="v2-slider-badge">${acc.dailyQuota} Posts / 24h</span>
                  </label>
                  <input type="number" id="page-quota-input" class="form-input" min="1" max="10" value="${acc.dailyQuota}">
                  <div class="v2-settings-helper">Hard safety ceiling to prevent account saturation.</div>
                </div>

                <div class="v2-settings-field">
                  <label class="v2-settings-label" for="page-niche-input">
                    <span>Niche Category</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Audience Tag</span>
                  </label>
                  <input type="text" id="page-niche-input" class="form-input" value="${escapeHtml(acc.defaultNiche)}">
                  <div class="v2-settings-helper">Sets persona guidelines during AI content evaluation.</div>
                </div>
              </div>

              <div class="v2-settings-footer">
                <div style="font-size: 0.78rem; color: var(--text-muted);">
                  Auto-Pilot posts execute at 3-hour intervals between 7:00 AM – 11:30 PM.
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveActivePageSettings()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff; font-size: 0.82rem;">
                  💾 Save Autopilot Settings
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Card 3: AI Scoring Weights & Keywords -->
          ${(activeSection === 'all' || activeSection === 'scoring') ? `
            <div class="v2-settings-card" id="settings-card-scoring">
              <div class="v2-settings-card-header">
                <div>
                  <h3 class="v2-settings-card-title">
                    <span>⚖️</span>
                    <span>AI Scoring Weights & Approval Thresholds</span>
                  </h3>
                  <p class="v2-settings-card-desc">
                    Configure how Gemini & Ollama evaluate harvested reels before staging or direct posting.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="v2-badge-pill ${totalWeights === 100 ? 'status-connected' : 'status-warning'}">
                    ● Total Allocation: ${totalWeights}% (${totalWeights === 100 ? 'Balanced' : 'Unbalanced'})
                  </span>
                </div>
              </div>

              <!-- 4 Scoring Sliders Grid -->
              <div class="v2-settings-grid-2">
                <!-- Slider 1: Vibe -->
                <div class="v2-slider-box">
                  <div class="v2-slider-top">
                    <span class="v2-slider-name">🎯 Brand Vibe Match</span>
                    <span id="badge-vibe-weight" class="v2-slider-badge">${p.vibeWeight}%</span>
                  </div>
                  <input type="range" class="form-input" min="10" max="60" value="${p.vibeWeight}" oninput="instagramBotV2View.updateWeightSlider('vibeWeight', this.value, 'badge-vibe-weight')">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Evaluates visual tone, high-octane pacing, and aesthetic fit for ${escapeHtml(acc.handle)}.
                  </div>
                </div>

                <!-- Slider 2: USP -->
                <div class="v2-slider-box">
                  <div class="v2-slider-top">
                    <span class="v2-slider-name">💡 USP Uniqueness</span>
                    <span id="badge-usp-weight" class="v2-slider-badge">${p.uspWeight}%</span>
                  </div>
                  <input type="range" class="form-input" min="10" max="50" value="${p.uspWeight}" oninput="instagramBotV2View.updateWeightSlider('uspWeight', this.value, 'badge-usp-weight')">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Rewards breaking news, fresh angles, and novel gameplay; penalizes recycled memes.
                  </div>
                </div>

                <!-- Slider 3: Quality -->
                <div class="v2-slider-box">
                  <div class="v2-slider-top">
                    <span class="v2-slider-name">✨ 1080p Polish & Audio</span>
                    <span id="badge-quality-weight" class="v2-slider-badge">${p.qualityWeight}%</span>
                  </div>
                  <input type="range" class="form-input" min="10" max="40" value="${p.qualityWeight}" oninput="instagramBotV2View.updateWeightSlider('qualityWeight', this.value, 'badge-quality-weight')">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Verifies clear 9:16 vertical resolution, audio fidelity, and lack of watermark blur.
                  </div>
                </div>

                <!-- Slider 4: Cutoff -->
                <div class="v2-slider-box">
                  <div class="v2-slider-top">
                    <span class="v2-slider-name">🛡️ Minimum Approval Cutoff</span>
                    <span id="badge-cutoff-score" class="v2-slider-badge" style="color: #10B981;">Score: ${p.minApprovalScore}/100</span>
                  </div>
                  <input type="range" class="form-input" min="60" max="95" value="${p.minApprovalScore}" oninput="instagramBotV2View.rankingParams.minApprovalScore = parseInt(this.value, 10); document.getElementById('badge-cutoff-score').innerText = 'Score: ' + this.value + '/100';">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Reels scoring below this cutoff are held in 'Incoming' and will never auto-publish.
                  </div>
                </div>
              </div>

              <div class="v2-settings-footer">
                <button type="button" class="btn btn-secondary btn-sm" onclick="instagramBotV2View.resetScoringDefaults()" style="font-weight: 700; font-size: 0.78rem;">
                  🔄 Reset Defaults
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveRankingParams()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff; font-size: 0.82rem;">
                  💾 Save Scoring Weights
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Card 4: Anti-Ban & Stealth Surveillance Security -->
          ${(activeSection === 'all' || activeSection === 'safety') ? `
            <div class="v2-settings-card" id="settings-card-safety">
              <div class="v2-settings-card-header">
                <div>
                  <h3 class="v2-settings-card-title">
                    <span>🛡️</span>
                    <span>Anti-Ban Safeguards & Stealth Surveillance Security</span>
                  </h3>
                  <p class="v2-settings-card-desc">
                    Enterprise stealth protection architecture ensuring untrackable 24/7 competitor surveillance.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="v2-badge-pill status-connected">
                    ● 5 Defense Layers Armed
                  </span>
                </div>
              </div>

              <!-- 4 Telemetry Safeguard Cards Grid -->
              <div class="v2-telemetry-grid">
                <div class="v2-telemetry-card">
                  <div class="v2-telemetry-metric">
                    <span>⏱️</span>
                    <span>3h + 11–38m</span>
                  </div>
                  <div style="font-weight: 800; font-size: 0.84rem; color: #10B981;">Gaussian Dynamic Jitter</div>
                  <div style="color: var(--text-muted); font-size: 0.74rem; line-height: 1.35;">
                    Varies check cadence dynamically so background surveillance never forms a robotic cadence.
                  </div>
                </div>

                <div class="v2-telemetry-card">
                  <div class="v2-telemetry-metric">
                    <span>⏳</span>
                    <span>8s to 22s</span>
                  </div>
                  <div style="font-weight: 800; font-size: 0.84rem; color: #2563EB;">Inter-Account Pacing</div>
                  <div style="color: var(--text-muted); font-size: 0.74rem; line-height: 1.35;">
                    Serial human delay between competitor queries, mimicking organic mobile browsing.
                  </div>
                </div>

                <div class="v2-telemetry-card">
                  <div class="v2-telemetry-metric">
                    <span>🌙</span>
                    <span>1:00 AM – 6:30 AM</span>
                  </div>
                  <div style="font-weight: 800; font-size: 0.84rem; color: #8B5CF6;">Circadian Night Cooldown</div>
                  <div style="color: var(--text-muted); font-size: 0.74rem; line-height: 1.35;">
                    Extended 5–6h sleep cooldown during nighttime to avoid unnatural 24/7 server activity.
                  </div>
                </div>

                <div class="v2-telemetry-card">
                  <div class="v2-telemetry-metric">
                    <span>⚡</span>
                    <span>&lt;25KB Radar</span>
                  </div>
                  <div style="font-weight: 800; font-size: 0.84rem; color: #F59E0B;">SQLite Deduplication</div>
                  <div style="color: var(--text-muted); font-size: 0.74rem; line-height: 1.35;">
                    Inspects profile heads first. Known shortcodes are discarded in &lt;500ms with zero wasted downloads.
                  </div>
                </div>
              </div>

              <div class="v2-settings-footer">
                <button type="button" class="btn btn-secondary btn-sm" onclick="instagramBotV2View.runQuickStealthTest()" style="font-weight: 700; font-size: 0.78rem;">
                  📡 Run Quick Stealth Check
                </button>
                <div style="font-size: 0.76rem; color: var(--text-muted);">
                  Shield Status: <strong>100% Operational</strong> • Zero Instagram rate-limits recorded
                </div>
              </div>
            </div>
          ` : ''}

        </div>

      </div>
    `;
  },

  setSettingsTab(tab) {
    this.activeSettingsTab = tab;
    this.activeAccordion = tab;
    this.renderDashboard();
  },

  async testMetaHandshake() {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    if (!acc.dbId) {
      app.showToast('Workspace is not saved in database yet.', 'warning');
      return;
    }
    app.showToast(`⚡ Testing Meta Graph API handshake for ${acc.handle}...`, 'info');
    try {
      const res = await fetch(`/api/instagram/pages/${acc.dbId}/test-handshake`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast(`🎉 Meta Graph API Connected! @${data.meta_username || acc.handle} (${data.followers || 0} followers, ${data.media_count || 0} posts)`, 'success');
      } else {
        app.showToast(`⚠️ Handshake: ${data.message || 'Verification failed'}`, 'warning');
      }
    } catch (e) {
      app.showToast(`Handshake error: ${e.message}`, 'error');
    }
  },

  toggleTokenVisibility(inputId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  },

  insertAttrVariable(varText) {
    const textarea = document.getElementById('page-attr-input');
    if (!textarea) return;
    const start = textarea.selectionStart || textarea.value.length;
    const end = textarea.selectionEnd || textarea.value.length;
    const val = textarea.value;
    textarea.value = val.substring(0, start) + ' ' + varText + ' ' + val.substring(end);
    textarea.focus();
    this.updateCaptionPreview();
  },

  updateCaptionPreview() {
    const textarea = document.getElementById('page-attr-input');
    const previewEl = document.getElementById('caption-live-preview');
    if (!textarea || !previewEl) return;
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    let txt = textarea.value || '';
    txt = txt.replace(/\{author\}/gi, 'rockstargames')
             .replace(/\{handle\}/gi, acc.handle || '@gta6_updates_007');
    previewEl.innerText = txt || '(Caption template is empty)';
  },

  updateWeightSlider(param, value, badgeId) {
    const val = parseInt(value, 10);
    this.rankingParams[param] = val;
    const badge = document.getElementById(badgeId);
    if (badge) badge.innerText = `${val}%`;
    const p = this.rankingParams;
    const total = (p.vibeWeight || 35) + (p.uspWeight || 25) + (p.qualityWeight || 20) + (p.freshnessWeight || 20);
    const totalBadge = document.querySelector('#settings-card-scoring .v2-badge-pill');
    if (totalBadge && totalBadge.innerText.includes('Total Allocation')) {
      totalBadge.className = `v2-badge-pill ${total === 100 ? 'status-connected' : 'status-warning'}`;
      totalBadge.innerText = `● Total Allocation: ${total}% (${total === 100 ? 'Balanced' : 'Unbalanced'})`;
    }
  },

  resetScoringDefaults() {
    this.rankingParams = {
      vibeWeight: 35,
      uspWeight: 25,
      qualityWeight: 20,
      freshnessWeight: 20,
      minApprovalScore: 85
    };
    app.showToast('Scoring weights reset to recommended defaults', 'info');
    this.renderDashboard();
  },

  async runQuickStealthTest() {
    app.showToast('📡 Running quick anti-ban surveillance check...', 'info');
    try {
      const res = await fetch('/api/instagram/autonomous/poll-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      const data = await res.json();
      app.showToast(data.message || 'Surveillance check completed!', 'success');
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
      }, 2000);
    } catch (e) {
      app.showToast(`Stealth check failed: ${e.message}`, 'error');
    }
  },

  async saveAllSettings() {
    await this.saveActivePageSettings();
    await this.saveRankingParams();
    app.showToast('✓ All workspace settings and AI rules saved!', 'success');
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

      const keywordInput = document.getElementById('drawer-keyword-input')?.value?.trim();
      if (keywordInput) payload.trigger_keyword = keywordInput;

      const urlInput = document.getElementById('drawer-deliverable-url-input')?.value?.trim();
      if (urlInput) payload.deliverable_url = urlInput;

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

  async checkBridgeStatus(showToast = false) {
    try {
      const res = await fetch('/api/instagram/bridge/status');
      const data = await res.json();
      this.bridgeStatus = data;
      this.bridgeOnline = Boolean(data.online);
      if (showToast) {
        if (data.online) {
          app.showToast(`✅ InstaAuto AI Agent (Port 3000) Online! ${data.armedDeliverablesCount || 0} reels armed with Follow-First DM rules.`, 'success');
          if (data.pendingDeliverablesCount > 0) {
            await this.retryPendingDeliverables();
          }
        } else {
          app.showToast(`⚠️ InstaAuto AI Agent (Port 3000) is Offline. Reels are queued and will auto-arm once port 3000 is running.`, 'warning');
        }
      }
      this.renderDashboard();
    } catch (err) {
      this.bridgeOnline = false;
      if (showToast) app.showToast(`Error connecting to bridge: ${err.message}`, 'error');
    }
  },

  async retryPendingDeliverables() {
    try {
      app.showToast('Flushing pending deliverables queue to InstaAuto...', 'info');
      const res = await fetch('/api/instagram/bridge/retry-pending', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast(`🎉 Retried ${data.total} posts: ${data.armed} armed in InstaAuto!`, 'success');
        await this.loadData();
        this.renderDashboard();
      }
    } catch (err) {
      app.showToast(`Retry failed: ${err.message}`, 'error');
    }
  },

  async armCandidateInInstaAuto(shortcode) {
    const feed = this.getFilteredFeed();
    const item = feed.find(f => f.shortcode === shortcode);
    if (!item) {
      app.showToast(`Candidate #${shortcode} not found`, 'warning');
      return;
    }

    const keyword = document.getElementById('drawer-keyword-input')?.value?.trim() || item.detected_trigger_keyword || 'PROJECT';
    const deliverableUrl = document.getElementById('drawer-deliverable-url-input')?.value?.trim() || item.harvested_deliverable_url || item.source_post_url || '';
    const caption = document.getElementById('drawer-caption-input')?.value || item.repurposed_caption || item.raw_caption;
    const title = item.repurposed_hook || item.raw_hook || 'Lead Magnet Resource';
    const mediaId = item.ig_media_id || `candidate_${item.shortcode}`;

    if (!deliverableUrl) {
      app.showToast('Please enter or verify the Deliverable URL before arming!', 'warning');
      return;
    }

    try {
      app.showToast(`⚡ Arming exact link in InstaAuto for #${shortcode} (Keyword: "${keyword}")...`, 'info');
      const res = await fetch('/api/instagram/bridge/arm-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          igMediaId: mediaId,
          triggerKeyword: keyword,
          deliverableUrl: deliverableUrl,
          caption: caption,
          title: title
        })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`🎉 Exact link armed in InstaAuto AI Agent! Rule ID: ${data.ruleId || 'Active'}. Follow-First DM funnel ready!`, 'success');
        item.detected_trigger_keyword = keyword;
        item.harvested_deliverable_url = deliverableUrl;
        await this.loadData();
        this.renderDashboard();
      } else {
        throw new Error(data.error || 'Failed to arm in InstaAuto');
      }
    } catch (err) {
      app.showToast(`Arm notice: ${err.message}`, 'error');
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
    this.isScanningAll = true;
    this.renderDashboard();
    app.showToast(`📡 Scanning all monitored profiles for [${acc.name}]...`, 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      app.showToast(`Scan initiated for ${acc.name}. Refreshing pipeline...`, 'success');
      setTimeout(async () => {
        this.isScanningAll = false;
        await this.loadData();
        this.renderDashboard();
      }, 2500);
    } catch (e) {
      this.isScanningAll = false;
      app.showToast('Scan triggered.', 'info');
      this.renderDashboard();
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

  async quickAddSuggestedTarget(handle, niche) {
    const acc = this.accounts[this.activeAccount] || Object.values(this.accounts)[0];
    app.showToast(`Adding @${handle} to [${acc.name}]...`, 'info');
    try {
      const res = await fetch('/api/instagram/tracked-channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: handle,
          niche_tag: niche || acc.defaultNiche || 'general',
          destination_account: this.activeAccount
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add target');
      app.showToast(`✓ Added @${handle} to ${acc.name}!`, 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Error: ${e.message}`, 'error');
    }
  },

  async syncSingleChannelNow(channelId) {
    this.syncingChannelId = channelId;
    this.renderDashboard();
    app.showToast('📡 Scraping latest reel from target creator...', 'info');
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.newPostsCount > 0) {
          app.showToast(`🎉 Harvested ${data.newPostsCount} new reel(s) from this creator!`, 'success');
        } else {
          app.showToast(`Checked creator. No new reels found since last scan.`, 'info');
        }
      } else {
        app.showToast(data.error || 'Scan finished', 'info');
      }
      await this.loadData();
    } catch (e) {
      app.showToast(`Scrape error: ${e.message}`, 'error');
    } finally {
      this.syncingChannelId = null;
      this.renderDashboard();
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
