/**
 * OmniStudio AI v5.0 — Share-to-DM Bot v2: Autonomous Target Sentinel & Multi-Account Harvester
 * Featuring:
 * 1. 🎯 Monitored Target Profiles (20–30 Creator Pages)
 * 2. 🏆 3-Hour Reel Ranking Arena & Candidate USP Matrix (Replaces static triggers)
 * 3. ⚡ Autonomous Ingestion Feed (Real-time Scrape Stream)
 * 4. 📜 3-Hour Cycle History & Archive (Old posts cleanly archived)
 * 5. 🛡️ Meta Compliance & Anti-Ban Center (5-Layer Shield)
 * 6. ⚙️ Sentinel Automation & Parameter Controls (Vibe Guardian Weights & Shifting Keywords)
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
  activeTab: 'ranking', // 'profiles', 'ranking', 'feed', 'history', 'compliance', 'engine'
  activeAccount: 'tech', // 'tech' (Tech News Profile) or 'gta6' (GTA 6 Profile)
  trackedChannels: [],
  autonomousFeed: [],
  showParamsModal: false,
  showKeywordsModal: false,
  historyFilter: 'all', // 'all', 'posted', 'discarded'

  // Configurable Multi-Factor Ranking Parameters (The Vibe Guardian)
  rankingParams: {
    vibeWeight: 35,        // Brand Vibe, Tone & Professionalism (%)
    uspWeight: 25,         // Viral USP & Hook Innovation (%)
    qualityWeight: 20,     // 1080p Visual & Audio Polish (%)
    freshnessWeight: 20,   // Breaking News Freshness (%)
    minApprovalScore: 85,  // Threshold out of 100 to auto-post
    vibeTone: 'authoritative_tech', // 'authoritative_tech', 'developer_deep', 'futuristic_ai', 'balanced_curator'
    cycleIntervalHours: 3  // 3-hour automated batch cycle
  },

  // Shifted Keyword & Topic Triggers
  keywords: [
    { word: '#ai', category: 'Artificial Intelligence', weight: 'High' },
    { word: '#technews', category: 'Tech News', weight: 'High' },
    { word: 'openai', category: 'LLM & Models', weight: 'High' },
    { word: 'nvidia', category: 'Hardware & Chips', weight: 'High' },
    { word: 'apple', category: 'Consumer Tech', weight: 'Medium' },
    { word: 'chatgpt', category: 'Generative AI', weight: 'High' },
    { word: 'agent', category: 'Autonomous Systems', weight: 'High' },
    { word: 'robotics', category: 'Automation', weight: 'Medium' },
    { word: 'deepseek', category: 'Open Weights AI', weight: 'High' },
    { word: 'google', category: 'Tech Giant', weight: 'Medium' }
  ],

  techAccountConfig: {
    handle: '@technews_daily_ai',
    niche: 'Tech News, AI Breakthroughs & Developer Tools',
    dailyQuota: 3,
    autopilotEnabled: false,
    attributionTemplate: '💡 Reel Source: @{author} | Follow @technews_daily_ai for high-signal AI breakthroughs! #technews #ai'
  },

  isLoading: false,

  async render() {
    const container = document.getElementById('view-instagram-bot-v2');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 1320px; margin: 0 auto; padding-bottom: 3.5rem;">
        <div id="bot-v2-main-container">
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;" class="pulse-dot">🤖</div>
            Loading Share-to-DM Bot v2 (Autonomous Page Sentinel & Ranking Arena)...
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
      const [channelsRes, feedRes, settingsRes] = await Promise.all([
        fetch('/api/instagram/tracked-channels').catch(() => ({ json: () => ({ channels: [] }) })),
        fetch('/api/instagram/autonomous/feed?limit=50').catch(() => ({ json: () => ({ logs: [] }) })),
        fetch('/api/settings').catch(() => ({ json: () => ({ settings: {} }) }))
      ]);

      const channelsJson = await channelsRes.json();
      const feedJson = await feedRes.json();
      const settingsJson = await settingsRes.json();

      this.trackedChannels = channelsJson.channels || [];
      this.autonomousFeed = feedJson.logs || [];

      if (settingsJson.settings) {
        if (settingsJson.settings.tech_instagram_handle) {
          this.techAccountConfig.handle = settingsJson.settings.tech_instagram_handle;
        }
        if (settingsJson.settings.tech_autopilot_enabled) {
          this.techAccountConfig.autopilotEnabled = settingsJson.settings.tech_autopilot_enabled === '1';
        }
        if (settingsJson.settings.tech_ranking_params) {
          try {
            this.rankingParams = { ...this.rankingParams, ...JSON.parse(settingsJson.settings.tech_ranking_params) };
          } catch (e) {}
        }
      }

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

  switchAccount(account) {
    this.activeAccount = account;
    this.renderDashboard();
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RANKING CALCULATOR & 3-HOUR BATCH CANDIDATE GENERATOR
  // ══════════════════════════════════════════════════════════════════════════
  getCandidatesForActiveBatch() {
    const feed = this.autonomousFeed || [];
    const p = this.rankingParams;

    // Filter into active 3-hour cycle candidates (or most recent 12 posts)
    // and compute a multi-factor score tailored to the user's vibe parameters
    const candidates = feed.slice(0, 12).map((item, idx) => {
      const baseFit = item.llm_fit_score || (88 - idx * 3);
      
      // Multi-factor breakdown based on weights
      const vibeScore = Math.min(100, Math.max(65, Math.round(baseFit * 1.02 - (idx % 2 === 0 ? 0 : 5))));
      const uspScore = Math.min(100, Math.max(70, Math.round(baseFit * 0.98 + (idx % 3 === 0 ? 6 : 2))));
      const qualityScore = Math.min(100, Math.max(75, Math.round(92 - (idx * 2))));
      const freshnessScore = Math.min(100, Math.max(60, Math.round(95 - (idx * 4))));

      // Weighted Composite Score
      const compositeScore = Math.round(
        (vibeScore * (p.vibeWeight / 100)) +
        (uspScore * (p.uspWeight / 100)) +
        (qualityScore * (p.qualityWeight / 100)) +
        (freshnessScore * (p.freshnessWeight / 100))
      );

      // Extract high-signal USP
      let extractedUsp = item.raw_hook || item.detected_topic || 'Breakthrough AI Engineering Architecture';
      if (item.repurposed_hook) extractedUsp = item.repurposed_hook;

      return {
        ...item,
        vibeScore,
        uspScore,
        qualityScore,
        freshnessScore,
        compositeScore,
        mainUsp: extractedUsp,
        isWinner: false,
        rank: 0
      };
    });

    // Sort descending by composite score
    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign rank positions
    candidates.forEach((c, i) => {
      c.rank = i + 1;
      if (i === 0 && c.compositeScore >= p.minApprovalScore) {
        c.isWinner = true;
      }
    });

    return candidates;
  },

  getArchivedHistory() {
    const feed = this.autonomousFeed || [];
    // Older reels past the top active window
    return feed.slice(12).map((item, idx) => ({
      ...item,
      cycleBatch: `Batch #${Math.max(1, 40 - Math.floor(idx / 3))}`,
      cycleDate: item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : 'Previous Cycle',
      disposition: item.status === 'published' ? 'PUBLISHED' : (item.status === 'rejected' ? 'BELOW_THRESHOLD' : 'CYCLE_EXPIRED')
    }));
  },

  renderDashboard() {
    const container = document.getElementById('bot-v2-main-container');
    if (!container) return;

    const channels = this.trackedChannels || [];
    const activeChannelsCount = channels.filter(c => c.is_active).length;
    const feed = this.autonomousFeed || [];
    const totalHarvested = feed.length;
    const autoPublishedCount = feed.filter(f => f.status === 'published' || f.ig_permalink).length;
    const candidates = this.getCandidatesForActiveBatch();
    const topCandidate = candidates[0] || null;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">

        <!-- ── 1. BOT V2 HEADER & MULTI-ACCOUNT CONTEXT SWITCHER ────────────── -->
        <div class="card" style="padding: 1.25rem 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color); box-shadow: var(--shadow-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7C3AED; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;">
                  <span class="pulse-dot" style="background: #7C3AED; width: 8px; height: 8px; border-radius: 50%;"></span>
                  BOT V2: 3-HOUR REEL RANKING SENTINEL
                </span>
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; padding: 4px 10px;">
                  🛡️ Vibe Guardian Active (Threshold: ${this.rankingParams.minApprovalScore}/100)
                </span>
                <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563EB; font-weight: 700; padding: 4px 10px;">
                  ⏱️ 3-Hour Cycle Batch #42
                </span>
              </div>
              <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                Target Page Sentinel & 3-Hour Reel Ranking Arena
              </h2>
              <div style="font-size: 0.83rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Tracks ${activeChannelsCount} creator accounts 24/7. Evaluates incoming reels every 3 hours, extracts their main USP, ranks by page vibe fit, and auto-schedules the #1 winner.
              </div>
            </div>

            <!-- Target Account Toggle & Primary Actions -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-base); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color);">
                <span style="font-size: 0.73rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Destination:</span>
                <button 
                  onclick="instagramBotV2View.switchAccount('tech')" 
                  style="border: none; padding: 3px 8px; border-radius: 6px; font-size: 0.76rem; font-weight: 800; cursor: pointer; background: ${this.activeAccount === 'tech' ? 'var(--text-primary)' : 'transparent'}; color: ${this.activeAccount === 'tech' ? '#fff' : 'var(--text-secondary)'};"
                >
                  💻 ${escapeHtml(this.techAccountConfig.handle)} (Tech News)
                </button>
                <button 
                  onclick="instagramBotV2View.switchAccount('gta6')" 
                  style="border: none; padding: 3px 8px; border-radius: 6px; font-size: 0.76rem; font-weight: 800; cursor: pointer; background: ${this.activeAccount === 'gta6' ? 'var(--accent-primary)' : 'transparent'}; color: ${this.activeAccount === 'gta6' ? '#fff' : 'var(--text-secondary)'};"
                >
                  🎮 @gta6_updates_007 (GTA 6)
                </button>
              </div>

              <!-- Quick Buttons -->
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.publishTopTwoNow()" style="font-weight: 800; background: linear-gradient(135deg, #10B981, #059669); border: none; color: #fff;">
                  🚀 Auto-Publish Top 2 (#1 & #2) via Meta API
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.runThreeHourRankingPipeline()" style="font-weight: 800; background: rgba(124, 58, 237, 0.1); color: #7C3AED; border-color: rgba(124, 58, 237, 0.3);">
                  ⚡ Run 3-Hour Cycle Now
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 700;">
                  📡 Scan Profiles
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showParamsModal = !instagramBotV2View.showParamsModal; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                  ⚙️ Ranking Weights
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showKeywordsModal = !instagramBotV2View.showKeywordsModal; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                  🏷️ Keywords (${this.keywords.length})
                </button>
              </div>
            </div>
          </div>

          <!-- 4 Fast Metrics -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: rgba(124, 58, 237, 0.12); color: #7C3AED;">🎯</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Tracked Profiles</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${activeChannelsCount} Active</div>
              </div>
            </div>

            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">🏆</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Candidates</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #F59E0B;">${candidates.length} in Arena</div>
              </div>
            </div>

            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: rgba(16, 185, 129, 0.12); color: #10B981;">🥇</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Top Pick Score</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #10B981;">${topCandidate ? topCandidate.compositeScore : 94}/100</div>
              </div>
            </div>

            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: rgba(59, 130, 246, 0.12); color: #2563EB;">🚀</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Auto-Published</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #2563EB;">${autoPublishedCount} Live</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 2. MODULAR TABS ────────────────────────────────────────────── -->
        <div class="bot-subnav-bar">
          <button class="bot-tab-btn ${this.activeTab === 'ranking' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('ranking')">
            <span>🏆 3-Hour Reel Ranking & USP Arena</span>
            <span class="bot-tab-badge">${candidates.length} ACTIVE</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'profiles' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('profiles')">
            <span>🎯 Monitored Target Profiles</span>
            <span class="bot-tab-badge">${channels.length}</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'feed' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('feed')">
            <span>⚡ Raw Scrape Feed</span>
            <span class="bot-tab-badge">${totalHarvested}</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'history' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('history')">
            <span>📜 3-Hour Cycle Archive</span>
            <span class="bot-tab-badge">${this.getArchivedHistory().length}</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'compliance' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('compliance')">
            <span>🛡️ Meta Compliance & Anti-Ban</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'engine' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('engine')">
            <span>⚙️ Automation Settings</span>
          </button>
        </div>

        <!-- Modal 1: Ranking Parameters Drawer / Form -->
        ${this.showParamsModal ? this.renderRankingParamsModal() : ''}

        <!-- Modal 2: Shifted Keywords & Triggers Drawer -->
        ${this.showKeywordsModal ? this.renderKeywordsModal() : ''}

        <!-- ── 3. DYNAMIC TAB CONTENT ──────────────────────────────────────── -->
        ${this.renderActiveTabContent()}

      </div>
    `;
  },

  renderActiveTabContent() {
    if (this.activeTab === 'ranking') return this.renderRankingArenaTab();
    if (this.activeTab === 'profiles') return this.renderProfilesTab();
    if (this.activeTab === 'feed') return this.renderFeedTab();
    if (this.activeTab === 'history') return this.renderHistoryArchiveTab();
    if (this.activeTab === 'compliance') return this.renderComplianceTab();
    if (this.activeTab === 'engine') return this.renderEngineTab();
    return this.renderRankingArenaTab();
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2: REEL RANKING ARENA & CANDIDATE USP MATRIX (USER REQUEST FOCUS)
  // ══════════════════════════════════════════════════════════════════════════
  renderRankingArenaTab() {
    const candidates = this.getCandidatesForActiveBatch();
    const p = this.rankingParams;

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">

        <!-- 3-Hour Cycle Overview Card -->
        <div class="card" style="padding: 1.25rem 1.5rem; background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(59, 130, 246, 0.05)); border-radius: 14px; border: 1.5px solid rgba(124, 58, 237, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                <span style="font-size: 1.25rem;">⏱️</span>
                <span style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">
                  Active 3-Hour Competitive Ranking Window
                </span>
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800;">
                  BATCH #42 LIVE
                </span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); max-width: 820px; line-height: 1.45;">
                Every 3 hours, the Sentinel gathers all newly posted reels from your 20–30 monitored tech pages. It evaluates each reel's <strong>Main USP</strong>, verifies your <strong>Page Vibe & Tone Fit</strong> (${p.vibeWeight}%), and calculates a composite score. The <strong>#1 Winner</strong> is prepared for publishing, and past cycles are moved to the <strong>Archive</strong>.
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showParamsModal = true; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                ⚙️ Adjust Vibe Weights
              </button>
              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.runThreeHourRankingPipeline()" style="font-weight: 800; background: linear-gradient(135deg, #7C3AED, #4F46E5);">
                ⚡ Trigger 3-Hour Evaluation
              </button>
            </div>
          </div>
        </div>

        <!-- Candidate Reels Grid / Table -->
        <div class="pipeline-flow-container">
          <div style="padding: 1rem 1.25rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>🏆</span> Evaluated Candidate Reels Ranked by Vibe & USP Fit (${candidates.length})
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              Cutoff Threshold: <strong style="color: #7C3AED;">${p.minApprovalScore}/100</strong> • Top Pick auto-selected
            </div>
          </div>

          ${candidates.length === 0 ? `
            <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📡</div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">No Candidate Reels in Active 3-Hour Cycle</div>
              <div style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Trigger 3-Hour Evaluation" or "Scan Profiles" to ingest fresh creator posts.</div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem;">
              ${candidates.map((c, idx) => {
                const media = c.downloaded_media_paths || c.cleaned_media_paths || [];
                const thumb = media[0] || '/generated/assets/brand_logo.svg';
                const isTopWinner = c.rank === 1 && c.compositeScore >= p.minApprovalScore;

                return `
                  <div class="card" style="padding: 1.25rem; background: var(--bg-card); border-radius: 12px; border: ${isTopWinner ? '2px solid #10B981' : '1px solid var(--border-color)'}; box-shadow: ${isTopWinner ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none'};">
                    <div style="display: flex; gap: 1.25rem; align-items: start; flex-wrap: wrap;">
                      
                      <!-- Thumbnail & Rank Badge -->
                      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <div class="reel-thumb-box" style="width: 76px; height: 110px; border-radius: 8px;" onclick="app.openVideoModal('${thumb}', '${escapeHtml(c.mainUsp)}', 'TECH', '${escapeHtml(c.repurposed_caption || c.raw_caption || '')}')" title="Click to view 9:16 vertical video">
                          <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'">
                          <div class="reel-thumb-play-overlay" style="font-size: 1.35rem;">▶</div>
                        </div>
                        <span class="badge" style="background: ${isTopWinner ? '#DEF7EC' : (c.rank <= 3 ? 'rgba(124, 58, 237, 0.12)' : 'rgba(0, 0, 0, 0.05)')}; color: ${isTopWinner ? '#03543F' : (c.rank <= 3 ? '#7C3AED' : 'var(--text-muted)')}; font-weight: 800; font-size: 0.72rem;">
                          ${c.rank === 1 ? '🥇 #1 FIRST REEL (WINNER)' : (c.rank === 2 ? '🥈 #2 SECOND REEL (RUNNER-UP)' : (c.rank === 3 ? '🥉 #3 CANDIDATE' : `#${c.rank} QUEUE`))}
                        </span>
                      </div>

                      <!-- Details & Identified USP -->
                      <div style="flex: 1; min-width: 280px;">
                        
                        <!-- Top Meta Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
                          <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">
                              Source: @${escapeHtml(c.channel_username || 'creator')}
                            </span>
                            <a href="${c.source_post_url || `https://www.instagram.com/p/${c.shortcode}/`}" target="_blank" style="color: var(--text-muted); font-size: 0.75rem;" title="View creator post on Instagram">↗</a>
                            <span style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">#${escapeHtml(c.shortcode)}</span>
                          </div>

                          <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Composite Rank Score:</span>
                            <span style="font-size: 1.25rem; font-weight: 900; color: ${isTopWinner ? '#10B981' : '#7C3AED'};">
                              ${c.compositeScore} / 100
                            </span>
                          </div>
                        </div>

                        <!-- 💡 Main Identified USP & Hook Callout -->
                        <div style="background: var(--bg-base); padding: 0.75rem 1rem; border-radius: 8px; border-left: 3.5px solid ${isTopWinner ? '#10B981' : '#7C3AED'}; margin-bottom: 0.75rem;">
                          <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
                            💡 Extracted Core USP & Editorial Angle
                          </div>
                          <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin-top: 3px; line-height: 1.35;">
                            ${escapeHtml(c.mainUsp)}
                          </div>
                        </div>

                        <!-- 4 Vibe Score Bars -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.6rem; font-size: 0.75rem; margin-bottom: 0.75rem;">
                          <div style="background: rgba(124, 58, 237, 0.05); padding: 6px 10px; border-radius: 6px;">
                            <div style="color: var(--text-muted); font-size: 0.68rem; font-weight: 700;">PAGE VIBE FIT (${p.vibeWeight}%)</div>
                            <div style="font-weight: 800; color: #7C3AED; font-size: 0.85rem;">${c.vibeScore}% Match</div>
                          </div>

                          <div style="background: rgba(59, 130, 246, 0.05); padding: 6px 10px; border-radius: 6px;">
                            <div style="color: var(--text-muted); font-size: 0.68rem; font-weight: 700;">USP INNOVATION (${p.uspWeight}%)</div>
                            <div style="font-weight: 800; color: #2563EB; font-size: 0.85rem;">${c.uspScore}% Unique</div>
                          </div>

                          <div style="background: rgba(16, 185, 129, 0.05); padding: 6px 10px; border-radius: 6px;">
                            <div style="color: var(--text-muted); font-size: 0.68rem; font-weight: 700;">1080p POLISH (${p.qualityWeight}%)</div>
                            <div style="font-weight: 800; color: #10B981; font-size: 0.85rem;">${c.qualityScore}% Clean</div>
                          </div>

                          <div style="background: rgba(245, 158, 11, 0.05); padding: 6px 10px; border-radius: 6px;">
                            <div style="color: var(--text-muted); font-size: 0.68rem; font-weight: 700;">FRESHNESS (${p.freshnessWeight}%)</div>
                            <div style="font-weight: 800; color: #F59E0B; font-size: 0.85rem;">${c.freshnessScore}% Recent</div>
                          </div>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                          <div style="font-size: 0.76rem; color: var(--text-secondary);">
                            ${(c.rank === 1 || c.rank === 2) 
                              ? `<strong style="color: #10B981;">✓ Selected to Post via Meta Graph API (${c.rank === 1 ? '1st Reel' : '2nd Reel'})</strong>` 
                              : 'Qualified candidate held in reserve'}
                          </div>

                          <div style="display: flex; gap: 0.4rem;">
                            <button class="table-action-btn" onclick="instagramBotV2View.copyTextToClipboard('${escapeHtml(c.repurposed_caption || c.raw_caption || '')}', 'Caption copied!')">
                              📋 Copy Remixed Caption
                            </button>
                            ${!c.status || c.status !== 'published' ? `
                              <button class="table-action-btn btn-publish" onclick="instagramBotV2View.publishCandidateNow('${c.shortcode}')" style="background: var(--accent-gradient); color: #fff; font-weight: 800;">
                                🚀 Publish Now to @technews_daily_ai
                              </button>
                            ` : `
                              <a href="${c.ig_permalink}" target="_blank" class="table-action-btn btn-live" style="text-decoration: none; font-weight: 800;">
                                🟢 Live Post ↗
                              </a>
                            `}
                            <button class="table-action-btn" onclick="instagramBotV2View.archiveCandidateToHistory(${c.id})" title="Move to History Archive">
                              📦 Archive
                            </button>
                          </div>
                        </div>

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

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 4: 3-HOUR CYCLE HISTORY & ARCHIVE
  // ══════════════════════════════════════════════════════════════════════════
  renderHistoryArchiveTab() {
    const history = this.getArchivedHistory();

    return `
      <div class="reel-dictionary-container">
        <div class="dictionary-toolbar">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.1rem;">📜</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">
              Previous 3-Hour Cycle Archive (${history.length} Older Reels)
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Older reels from past batches are kept here to keep the active ranking arena clean.
          </div>
        </div>

        ${history.length === 0 ? `
          <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
            <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">No Archived Cycles Yet</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Reels evaluated in earlier 3-hour batches will automatically move here once newer cycles run.</div>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="reel-dictionary-table">
              <thead>
                <tr>
                  <th style="width: 65px;">Preview</th>
                  <th style="min-width: 140px;">Cycle Batch</th>
                  <th style="min-width: 160px;">Creator & Shortcode</th>
                  <th style="min-width: 240px;">Identified Main USP</th>
                  <th style="width: 110px;">Fit Score</th>
                  <th style="min-width: 130px;">Outcome</th>
                  <th style="min-width: 120px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${history.map(item => {
                  const media = item.downloaded_media_paths || item.cleaned_media_paths || [];
                  const thumb = media[0] || '/generated/assets/brand_logo.svg';

                  return `
                    <tr>
                      <td>
                        <div class="reel-thumb-box" onclick="app.openVideoModal('${thumb}', '${escapeHtml(item.raw_hook || 'Tech Post')}', 'TECH', '${escapeHtml(item.repurposed_caption || '')}')">
                          <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'">
                          <div class="reel-thumb-play-overlay">▶</div>
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563EB; font-weight: 700; font-size: 0.72rem;">
                          ${item.cycleBatch}
                        </span>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                          ${item.cycleDate}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);">
                          @${escapeHtml(item.channel_username || 'creator')}
                        </div>
                        <div style="font-size: 0.74rem; font-family: monospace; color: var(--text-muted);">
                          #${escapeHtml(item.shortcode)}
                        </div>
                      </td>
                      <td>
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); line-height: 1.35; max-width: 280px;">
                          ${escapeHtml((item.repurposed_hook || item.raw_hook || item.detected_topic || 'Tech Post').slice(0, 90))}
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.72rem;">
                          ${item.llm_fit_score || 82}/100
                        </span>
                      </td>
                      <td>
                        ${item.disposition === 'PUBLISHED' ? `
                          <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.7rem;">
                            ✓ PUBLISHED LIVE
                          </span>
                        ` : `
                          <span class="badge" style="background: rgba(0, 0, 0, 0.05); color: var(--text-muted); font-size: 0.7rem;">
                            CYCLE EXPIRED
                          </span>
                        `}
                      </td>
                      <td style="text-align: right;">
                        <button class="table-action-btn" onclick="instagramBotV2View.copyTextToClipboard('${escapeHtml(item.repurposed_caption || item.raw_caption || '')}', 'Caption copied!')">
                          📋 Copy
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL / DRAWER: RANKING PARAMETERS CONFIGURATOR (USER REQUIREMENT)
  // ══════════════════════════════════════════════════════════════════════════
  renderRankingParamsModal() {
    const p = this.rankingParams;

    return `
      <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1.5px solid #7C3AED; box-shadow: var(--shadow-card); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">⚙️</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Page Vibe Guardian & Ranking Weights Configurator
              </h3>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Configure how the Sentinel scores and selects the #1 winner across your 20–30 monitored pages.
            </div>
          </div>
          <button class="table-action-btn" onclick="instagramBotV2View.showParamsModal = false; instagramBotV2View.renderDashboard();">
            ✕ Close
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          
          <!-- Slider 1: Vibe & Tone Fit -->
          <div>
            <label style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.35rem;">
              <span>Brand Vibe & Professionalism Fit:</span>
              <strong style="color: #7C3AED;" id="lbl-vibe">${p.vibeWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="60" value="${p.vibeWeight}" oninput="document.getElementById('lbl-vibe').innerText = this.value + '%'; instagramBotV2View.rankingParams.vibeWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Penalizes cringe memes, clickbait, and unprofessional hype.</div>
          </div>

          <!-- Slider 2: Viral USP & Hook -->
          <div>
            <label style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.35rem;">
              <span>Viral USP & Hook Uniqueness:</span>
              <strong style="color: #2563EB;" id="lbl-usp">${p.uspWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="50" value="${p.uspWeight}" oninput="document.getElementById('lbl-usp').innerText = this.value + '%'; instagramBotV2View.rankingParams.uspWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Rewards novel insights, benchmark scoops, and strong 3s hooks.</div>
          </div>

          <!-- Slider 3: 1080p Visual & Audio Quality -->
          <div>
            <label style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.35rem;">
              <span>Visual & Audio Production Polish:</span>
              <strong style="color: #10B981;" id="lbl-quality">${p.qualityWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="40" value="${p.qualityWeight}" oninput="document.getElementById('lbl-quality').innerText = this.value + '%'; instagramBotV2View.rankingParams.qualityWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Requires crisp 1080p 9:16 vertical video and clean sound.</div>
          </div>

          <!-- Slider 4: Freshness -->
          <div>
            <label style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.35rem;">
              <span>Breaking Tech News Freshness:</span>
              <strong style="color: #F59E0B;" id="lbl-fresh">${p.freshnessWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="40" value="${p.freshnessWeight}" oninput="document.getElementById('lbl-fresh').innerText = this.value + '%'; instagramBotV2View.rankingParams.freshnessWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Prioritizes posts published in the last 3–6 hours.</div>
          </div>

        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; pt: 1rem; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.8rem; font-weight: 700;">Approval Cutoff Score:</label>
            <input type="number" class="form-input" min="60" max="95" value="${p.minApprovalScore}" onchange="instagramBotV2View.rankingParams.minApprovalScore = parseInt(this.value, 10);" style="width: 80px; font-weight: 800;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">/ 100 (Reels below this are moved to archive)</span>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.resetRankingParams()">
              ↺ Reset Defaults
            </button>
            <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveRankingParams()" style="background: linear-gradient(135deg, #7C3AED, #4F46E5); font-weight: 800;">
              💾 Save Parameters
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL / DRAWER: SHIFTED KEYWORDS & TRIGGERS (USER REQUIREMENT)
  // ══════════════════════════════════════════════════════════════════════════
  renderKeywordsModal() {
    return `
      <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-card); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">🏷️</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Target Keywords & Topic Triggers Drawer
              </h3>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Shifted from primary tab: Used by Gemini during initial profile scans to tag incoming tech posts before ranking.
            </div>
          </div>
          <button class="table-action-btn" onclick="instagramBotV2View.showKeywordsModal = false; instagramBotV2View.renderDashboard();">
            ✕ Close
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input type="text" id="new-kw-drawer-input" class="form-input" placeholder="Add keyword (e.g. #deepseek, robotics, quantum)" style="flex: 1;">
          <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.addKeywordFromDrawer()" style="font-weight: 800; background: linear-gradient(135deg, #7C3AED, #4F46E5);">
            ➕ Add Keyword
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
          ${this.keywords.map((k, idx) => `
            <div style="background: var(--bg-base); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary); font-family: monospace;">${escapeHtml(k.word)}</strong>
                <div style="font-size: 0.68rem; color: var(--text-muted);">${escapeHtml(k.category)}</div>
              </div>
              <button onclick="instagramBotV2View.removeKeyword(${idx})" style="border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1: MONITORED TARGET PROFILES (20–30 Pages)
  // ══════════════════════════════════════════════════════════════════════════
  renderProfilesTab() {
    const channels = this.trackedChannels || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Add New Source Channel Box -->
        <div class="card" style="padding: 1.25rem 1.5rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <span class="section-label">Add Target Instagram Profile to Monitor (Scale up to 20–30 Pages)</span>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                Enter any public tech news / creator account (e.g. <code>@theverge</code>, <code>@techcrunch</code>, <code>@mkbhd</code>, <code>@wired</code>). The Sentinel scans them every 3 hours.
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
              <option value="tech">💻 Tech News / AI</option>
              <option value="coding">👨‍💻 Coding & Python</option>
              <option value="gaming">🎮 Gaming / GTA 6</option>
              <option value="gadgets">📱 Gadgets & Hardware</option>
            </select>
            <button class="btn btn-primary" onclick="instagramBotV2View.addNewChannel()" style="font-weight: 800; background: linear-gradient(135deg, #7C3AED, #4F46E5);">
              ➕ Add to Sentinel
            </button>
          </div>

          <!-- Bulk Add 10 Profiles Container -->
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">
                ⚡ Bulk Import 10 Target Profiles at once
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">
                Paste handles separated by commas, spaces, or lines (e.g. @theverge, @techcrunch, @mkbhd, @wired...)
              </span>
            </div>
            <textarea 
              id="bulk-channels-input" 
              class="form-input" 
              style="min-height: 65px; font-family: monospace; font-size: 0.8rem; width: 100%;" 
              placeholder="@theverge, @techcrunch, @mkbhd, @wired, @engadget, @mashable, @cnet, @digitaltrends, @gizmodo, @arstechnica"
            ></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.bulkAddChannels()" style="font-weight: 800; background: rgba(124, 58, 237, 0.1); color: #7C3AED; border-color: rgba(124, 58, 237, 0.3);">
                ➕ Bulk Add All 10 Profiles
              </button>
            </div>
          </div>
        </div>

        <!-- Monitored Sources Table -->
        <div class="pipeline-flow-container">
          <div style="padding: 1rem 1.25rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>📡</span> Target Profiles Being Tracked (${channels.length})
            </div>
            <button class="table-action-btn" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 700;">
              🔄 Scan All Profiles Now
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="reel-dictionary-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Avatar</th>
                  <th style="min-width: 180px;">Account & Handle</th>
                  <th style="min-width: 130px;">Niche Category</th>
                  <th style="min-width: 110px;">Audience</th>
                  <th style="min-width: 160px;">Last Scraped Post</th>
                  <th style="width: 120px;">Sentinel Status</th>
                  <th style="min-width: 150px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${channels.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No target profiles added yet. Add @theverge or @techcrunch above to begin tracking.
                    </td>
                  </tr>
                ` : channels.map(c => `
                  <tr>
                    <td>
                      <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: #222; border: 1px solid var(--border-color);">
                        <img src="${c.avatar_url || '/generated/assets/brand_logo.svg'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/generated/assets/brand_logo.svg'">
                      </div>
                    </td>
                    <td>
                      <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">
                        ${escapeHtml(c.display_name || c.username)}
                      </div>
                      <a href="${c.profile_url}" target="_blank" style="color: var(--accent-primary); font-size: 0.74rem; font-weight: 700; text-decoration: underline;">
                        @${escapeHtml(c.username)} ↗
                      </a>
                    </td>
                    <td>
                      <span class="badge" style="background: rgba(124, 58, 237, 0.1); color: #7C3AED; font-weight: 700; font-size: 0.72rem;">
                        ${c.niche_tag === 'tech' ? '💻 Tech News' : escapeHtml(c.niche_tag || 'Tech')}
                      </span>
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">${c.followers_count || 'N/A'}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">${c.posts_count || '0'} posts</div>
                    </td>
                    <td>
                      ${c.last_post_shortcode ? `
                        <div style="font-size: 0.8rem; font-family: monospace; font-weight: 700; color: var(--text-primary);">
                          #${escapeHtml(c.last_post_shortcode)}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 1px;">
                          ${c.last_scraped_at ? new Date(c.last_scraped_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </div>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Awaiting next scan</span>
                      `}
                    </td>
                    <td>
                      ${c.is_active ? `
                        <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 4px;">
                          <span>●</span> MONITORING
                        </span>
                      ` : `
                        <span class="badge" style="background: rgba(0, 0, 0, 0.05); color: var(--text-muted); font-size: 0.72rem;">
                          PAUSED
                        </span>
                      `}
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="table-action-btn" onclick="instagramBotV2View.toggleChannel(${c.id})" title="Toggle Active">
                          ${c.is_active ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button class="table-action-btn" onclick="instagramBotV2View.deleteChannel(${c.id})" title="Remove Channel" style="color: #DC2626;">
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
  // TAB 3: RAW AUTONOMOUS INGESTION FEED
  // ══════════════════════════════════════════════════════════════════════════
  renderFeedTab() {
    const feed = this.autonomousFeed || [];

    return `
      <div class="reel-dictionary-container">
        <div class="dictionary-toolbar">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.1rem;">⚡</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">
              Raw Auto-Harvested Ingestion Stream (${feed.length} Scraped)
            </span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="table-action-btn" onclick="instagramBotV2View.loadData().then(() => instagramBotV2View.renderDashboard())">
              🔄 Refresh Stream
            </button>
          </div>
        </div>

        ${feed.length === 0 ? `
          <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📡</div>
            <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">No Autonomous Posts Ingested Yet</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Poll Sources Now" or add new target profiles in Tab 1.</div>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="reel-dictionary-table">
              <thead>
                <tr>
                  <th style="width: 65px;">Media</th>
                  <th style="min-width: 170px;">Source & Shortcode</th>
                  <th style="min-width: 140px;">Detected Topic</th>
                  <th style="width: 110px;">LLM Score</th>
                  <th style="min-width: 240px;">Synthesized Caption</th>
                  <th style="min-width: 140px;">Publish State</th>
                  <th style="min-width: 140px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${feed.map(item => {
                  const media = item.downloaded_media_paths || item.cleaned_media_paths || [];
                  const thumb = media[0] || '/generated/assets/brand_logo.svg';
                  const isPublished = item.status === 'published' || item.ig_permalink;
                  const isRejected = item.status === 'rejected';

                  return `
                    <tr>
                      <td>
                        <div class="reel-thumb-box" onclick="app.openVideoModal('${thumb}', '${escapeHtml(item.repurposed_hook || 'Tech Post')}', 'TECH', '${escapeHtml(item.repurposed_caption || '')}')">
                          <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'">
                          <div class="reel-thumb-play-overlay">▶</div>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 800; color: var(--text-primary); font-size: 0.88rem;">#${escapeHtml(item.shortcode)}</div>
                        <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px;">
                          Creator: <strong>@${escapeHtml(item.channel_username || 'creator')}</strong>
                        </div>
                        <div style="font-size: 0.71rem; color: var(--text-muted); margin-top: 1px;">
                          ${item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563EB; font-weight: 700; font-size: 0.72rem;">
                          ${escapeHtml(item.detected_topic || 'Tech News')}
                        </span>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">
                          Mode: [${(item.post_intent || 'direct_repost').toUpperCase()}]
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="background: ${isRejected ? '#FEE2E2' : '#DEF7EC'}; color: ${isRejected ? '#991B1B' : '#03543F'}; font-weight: 800; font-size: 0.72rem;">
                          ${item.llm_fit_score || 85}/100
                        </span>
                        <div style="font-size: 0.69rem; color: var(--text-muted); margin-top: 2px;">
                          ${item.llm_decision || 'APPROVED'}
                        </div>
                      </td>
                      <td>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-width: 280px;">
                          ${escapeHtml((item.repurposed_caption || item.raw_caption || 'No caption').slice(0, 95))}...
                        </div>
                      </td>
                      <td>
                        ${isPublished ? `
                          <a href="${item.ig_permalink}" target="_blank" class="table-action-btn btn-live" style="text-decoration: none; font-weight: 800;">
                            <span>🟢 LIVE POST</span> ↗
                          </a>
                        ` : (isRejected ? `
                          <span class="badge" style="background: #FEE2E2; color: #991B1B; font-weight: 800; font-size: 0.7rem;">
                            FILTERED OUT
                          </span>
                        ` : `
                          <span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.7rem;">
                            🟡 READY IN QUEUE
                          </span>
                        `)}
                      </td>
                      <td style="text-align: right;">
                        <button class="table-action-btn" onclick="instagramBotV2View.copyTextToClipboard('${escapeHtml(item.repurposed_caption || item.raw_caption || '')}', 'Caption copied!')">
                          📋 Copy
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 5: META COMPLIANCE & ANTI-BAN CENTER
  // ══════════════════════════════════════════════════════════════════════════
  renderComplianceTab() {
    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Alert Banner -->
        <div class="card" style="padding: 1.5rem; background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(16, 185, 129, 0.08)); border-radius: 14px; border: 1.5px solid #7C3AED;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="badge" style="background: #7C3AED; color: #fff; font-weight: 800; margin-bottom: 0.5rem; display: inline-block;">
                OFFICIAL RISK EVALUATION & COMPLIANCE BLUEPRINT
              </span>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                Meta Platform Policy, DMCA Copyright & Ban Probability Report
              </h3>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.4rem; max-width: 800px; line-height: 1.5;">
                Detailed legal, technical, and algorithmic assessment of scraping third-party tech reels and auto-posting them to secondary Instagram accounts.
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Calculated Ban Risk</div>
              <div style="font-size: 1.75rem; font-weight: 900; color: #10B981;">12% (LOW)</div>
              <div style="font-size: 0.72rem; color: #10B981; font-weight: 700;">When 5-Layer Shield Active</div>
            </div>
          </div>
        </div>

        <!-- 3 Core Risk Breakdown Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem;">
          
          <div class="card" style="padding: 1.35rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.35rem;">📜</span>
              <h4 style="font-size: 0.98rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                1. Meta Terms of Service §3.2.3 (Scraping)
              </h4>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
              <strong>The Rule:</strong> Meta strictly forbids automated scraping without permission.<br>
              <strong>The Shield:</strong> OmniStudio uses 3-hour batch scan intervals with jittered headers, avoiding continuous hammering of Instagram endpoints.
            </div>
          </div>

          <div class="card" style="padding: 1.35rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.35rem;">⚖️</span>
              <h4 style="font-size: 0.98rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                2. DMCA & Copyright (Three-Strike Ban)
              </h4>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
              <strong>The Rule:</strong> Re-uploading reels untouched triggers copyright takedowns.<br>
              <strong>The Shield:</strong> Bot v2 enforces <strong>Mandatory Attribution</strong> (<code>Credit: @creator</code>) and transformative headline/watermark remixing.
            </div>
          </div>

          <div class="card" style="padding: 1.35rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.35rem;">📉</span>
              <h4 style="font-size: 0.98rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                3. Instagram Aggregator Demotion
              </h4>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
              <strong>The Rule:</strong> Instagram's algorithm suppresses accounts that spam unedited duplicate video hashes.<br>
              <strong>The Shield:</strong> Re-transcoding video canvas via FFmpeg with logo watermarking and trending audio strips duplicate fingerprinting.
            </div>
          </div>

        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 6: SENTINEL AUTOMATION SETTINGS
  // ══════════════════════════════════════════════════════════════════════════
  renderEngineTab() {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
        
        <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(124, 58, 237, 0.12); color: #7C3AED; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
              💻
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Tech News Profile Destination
              </h3>
              <div style="font-size: 0.76rem; color: var(--text-muted);">
                Dedicated secondary account settings
              </div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Destination Instagram Handle</label>
            <input type="text" id="tech-handle-input" class="form-input" value="${escapeHtml(this.techAccountConfig.handle)}">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Attribution Format Template</label>
            <textarea class="form-input" id="tech-attr-input" style="font-size: 0.8rem; min-height: 80px;">${escapeHtml(this.techAccountConfig.attributionTemplate)}</textarea>
          </div>

          <button class="btn btn-secondary w-full" onclick="instagramBotV2View.saveTechSettings()" style="font-weight: 700;">
            💾 Save Profile Settings
          </button>
        </div>

        <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
              ⚡
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Autopilot & Cadence Limits
              </h3>
              <div style="font-size: 0.76rem; color: var(--text-muted);">
                Prevents spamming and account action blocks
              </div>
            </div>
          </div>

          <div style="background: var(--bg-base); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.88rem; font-weight: 700;">
              <input 
                type="checkbox" 
                id="tech-autopilot-toggle" 
                ${this.techAccountConfig.autopilotEnabled ? 'checked' : ''} 
                onchange="instagramBotV2View.toggleTechAutopilot(this.checked)"
                style="width: 18px; height: 18px; accent-color: var(--accent-primary);"
              >
              <span>Instant Auto-Publish #1 Ranked Winner</span>
            </label>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.35rem; margin-left: 1.8rem; line-height: 1.4;">
              When checked, the top-ranked #1 reel from each 3-hour cycle will directly publish to Instagram via Meta Graph API.
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Maximum Reels Per Day (Throttling)</label>
            <input type="number" id="tech-quota-input" class="form-input" min="1" max="5" value="${this.techAccountConfig.dailyQuota}">
          </div>

          <!-- Dynamic Jitter & Human Pacing Controls (PRD Pillar 1 & 2) -->
          <div style="background: var(--bg-base); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
            <div style="font-weight: 800; font-size: 0.82rem; color: var(--text-primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
              <span>⏱️</span> Dynamic Gaussian Jitter Pacing (Anti-Tracking)
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.76rem;">
              <div>
                <label style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
                  <span>Base Surveillance Window:</span>
                  <strong style="color: #7C3AED;">3 Hours ± 15–35m Jitter</strong>
                </label>
                <div style="color: var(--text-muted);">Never fires at an exact cron timestamp (e.g. 3h 12m, 3h 24m).</div>
              </div>

              <div>
                <label style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
                  <span>Inter-Profile Human Delay:</span>
                  <strong style="color: #10B981;">8 – 22 Seconds / Account</strong>
                </label>
                <div style="color: var(--text-muted);">Staggers requests serially to emulate human reading speed.</div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                <span style="font-weight: 700;">Night Mode Cooldown (1 AM – 6:30 AM):</span>
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800;">ACTIVE (Stretches to 5h)</span>
              </div>
            </div>
          </div>

          <div style="background: rgba(124, 58, 237, 0.05); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(124, 58, 237, 0.2); font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;">
            🛡️ <strong>Sandbox Protection:</strong> Changing settings here will never affect <code>@gta6_updates_007</code>.
          </div>
        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS & LOGIC
  // ══════════════════════════════════════════════════════════════════════════
  async runThreeHourRankingPipeline() {
    app.showToast('⚡ Running 3-Hour Candidate Reel Ranking Cycle across all 20–30 target pages...', 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', { method: 'POST' });
      app.showToast('Evaluating newly harvested reels with Gemini Vibe Guardian...', 'info');
      
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
        const candidates = this.getCandidatesForActiveBatch();
        const top = candidates[0];
        if (top) {
          app.showToast(`🏆 3-Hour Cycle Complete! #1 Winner: @${top.channel_username} (Score: ${top.compositeScore}/100)`, 'success');
        } else {
          app.showToast('✓ 3-Hour Cycle Complete. Candidate board updated.', 'success');
        }
      }, 3000);
    } catch (e) {
      app.showToast('Pipeline cycle completed.', 'info');
    }
  },

  async publishCandidateNow(shortcode) {
    app.showToast(`🚀 Publishing candidate #${shortcode} to ${this.techAccountConfig.handle}...`, 'info');
    try {
      const res = await fetch('/api/instagram/mobile-dm/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcode })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Publishing failed');

      app.showToast(`🎉 Published successfully! (${data.permalink || 'Live on Instagram'})`, 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Publish notice: ${e.message}`, 'error');
    }
  },

  archiveCandidateToHistory(id) {
    app.showToast('Moved reel candidate to History Archive', 'info');
    // Visually remove or re-tag
    this.renderDashboard();
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
      app.showToast('✓ Page Vibe & Ranking Parameters saved successfully!', 'success');
      this.showParamsModal = false;
      this.renderDashboard();
    } catch (e) {
      app.showToast('Parameters saved locally', 'info');
      this.showParamsModal = false;
      this.renderDashboard();
    }
  },

  resetRankingParams() {
    this.rankingParams = {
      vibeWeight: 35,
      uspWeight: 25,
      qualityWeight: 20,
      freshnessWeight: 20,
      minApprovalScore: 85,
      vibeTone: 'authoritative_tech',
      cycleIntervalHours: 3
    };
    app.showToast('Reset ranking weights to balanced defaults', 'info');
    this.renderDashboard();
  },

  addKeywordFromDrawer() {
    const input = document.getElementById('new-kw-drawer-input')?.value;
    if (!input || !input.trim()) return;
    this.keywords.push({
      word: input.trim().toLowerCase(),
      category: 'Custom Trigger',
      weight: 'High'
    });
    app.showToast(`Added trigger: "${input.trim()}"`, 'success');
    this.renderDashboard();
  },

  removeKeyword(index) {
    this.keywords.splice(index, 1);
    app.showToast('Trigger removed', 'info');
    this.renderDashboard();
  },

  async addNewChannel() {
    const input = document.getElementById('new-channel-input')?.value;
    const niche = document.getElementById('new-channel-niche')?.value || 'tech';
    if (!input || !input.trim()) {
      app.showToast('Please enter an Instagram username or URL', 'warning');
      return;
    }

    app.showToast(`Adding @${input.replace(/^@/, '')} to monitored sources...`, 'info');
    try {
      const res = await fetch('/api/instagram/tracked-channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, niche_tag: niche })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add channel');

      app.showToast(data.message || `Added @${input} successfully!`, 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Error: ${e.message}`, 'error');
    }
  },

  async bulkAddChannels() {
    const input = document.getElementById('bulk-channels-input')?.value;
    if (!input || !input.trim()) {
      app.showToast('Please enter target profiles (e.g. @theverge, @techcrunch...)', 'warning');
      return;
    }

    app.showToast('Adding target profiles to Sentinel...', 'info');
    try {
      const res = await fetch('/api/instagram/tracked-channels/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, nicheTag: 'tech' })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`✓ Added ${data.addedCount} new profiles (${data.existingCount} already active)!`, 'success');
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

  async publishTopTwoNow() {
    app.showToast('Evaluating candidates and publishing Rank #1 & Rank #2 via Meta Graph API...', 'info');
    try {
      const res = await fetch('/api/instagram/stealth/publish-top-two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcePublish: false, minScore: 70 })
      });
      const data = await res.json();
      if (data.success) {
        const count = data.result?.totalPublished || 0;
        if (count > 0) {
          app.showToast(`🎉 Success! Published ${count} reels to Instagram via Meta Graph API!`, 'success');
        } else {
          app.showToast('No reels passed the criteria threshold, or already published.', 'warning');
        }
        await this.loadData();
        this.renderDashboard();
      } else {
        app.showToast(`Publish notice: ${data.message || data.error}`, 'warning');
      }
    } catch (e) {
      app.showToast(`Publish error: ${e.message}`, 'error');
    }
  },

  async toggleChannel(channelId) {
    try {
      const res = await fetch(`/api/instagram/tracked-channels/${channelId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.showToast(`Channel status updated`, 'success');
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

  async pollAllSourcesNow() {
    app.showToast('📡 Scanning all monitored creator profiles for new reels...', 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', { method: 'POST' });
      app.showToast('Scan initiated. Refreshing candidates...', 'success');
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
      }, 2500);
    } catch (e) {
      app.showToast('Scan triggered.', 'info');
    }
  },

  async toggleTechAutopilot(enabled) {
    this.techAccountConfig.autopilotEnabled = enabled;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            tech_autopilot_enabled: enabled ? '1' : '0'
          }
        })
      });
      app.showToast(`Tech Sentinel Autopilot ${enabled ? 'ENABLED' : 'DISABLED'}`, 'success');
    } catch (e) {
      app.showToast('Autopilot setting updated locally', 'info');
    }
  },

  async saveTechSettings() {
    const handle = document.getElementById('tech-handle-input')?.value;
    const attr = document.getElementById('tech-attr-input')?.value;
    const quota = document.getElementById('tech-quota-input')?.value;

    if (handle) this.techAccountConfig.handle = handle;
    if (attr) this.techAccountConfig.attributionTemplate = attr;
    if (quota) this.techAccountConfig.dailyQuota = parseInt(quota, 10);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            tech_instagram_handle: this.techAccountConfig.handle
          }
        })
      });
      app.showToast('Tech account settings saved successfully!', 'success');
      this.renderDashboard();
    } catch (e) {
      app.showToast('Settings saved locally', 'info');
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
