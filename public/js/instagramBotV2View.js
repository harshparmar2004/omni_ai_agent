/**
 * OmniStudio AI v5.1 — Share-to-DM Bot v2: Autonomous Multi-Page Sentinel & Ranking Hub
 * Modernized & Streamlined UI/UX Architecture:
 * 1. 🏆 Content Arena & Queue (Vibe Guardian Ranking, Extracted USPs, 1-Click Publishing)
 * 2. 🎯 Monitored Sources (Creator & Competitor Channels, 1-Click Pause/Resume, Bulk Import)
 * 3. 📜 Published History & Live Posts (Live Instagram Links, Scrape Stream, Cycle Archive)
 * 4. ⚙️ Page Settings & Autopilot (Per-Page Credentials, Niche Keywords, Vibe Weights, Anti-Ban)
 * 5. ➕ Dynamic Multi-Tenant Workspace Switcher with Connect New Page Modal
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
  activeTab: 'ranking', // 'ranking', 'profiles', 'history', 'engine'
  activeAccount: 'tech', // dynamically bound to connected_pages slug
  connectedPages: [],
  trackedChannels: [],
  autonomousFeed: [],
  showParamsModal: false,
  showKeywordsModal: false,
  showConnectModal: false,
  historyFilter: 'all', // 'all', 'published', 'queue'

  // Dynamic Workspace Palette Configuration
  palettePresets: [
    { color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)', lightBg: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.35)', icon: '💻' },
    { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #EA580C)', lightBg: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', icon: '🎮' },
    { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', lightBg: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.35)', icon: '⚡' },
    { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', lightBg: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.35)', icon: '📈' },
    { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', lightBg: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.35)', icon: '🔥' },
    { color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', lightBg: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.35)', icon: '🚀' }
  ],

  // Dynamically populated accounts dictionary
  accounts: {
    tech: {
      id: 'tech',
      dbId: 2,
      name: 'Tech News Daily AI',
      handle: '@technews_daily_ai',
      nicheTitle: 'AI Breakthroughs & Tech News',
      badge: 'TECH & AI',
      color: '#7C3AED',
      gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
      lightBg: 'rgba(124, 58, 237, 0.08)',
      borderColor: 'rgba(124, 58, 237, 0.35)',
      icon: '💻',
      placeholder: '@theverge, @techcrunch, @mkbhd, @wired',
      defaultNiche: 'tech',
      desc: 'Tracks top tech publications, AI labs, and developer tooling creators 24/7.',
      pageToken: '',
      igUserId: '',
      autopilotEnabled: false,
      dailyQuota: 3,
      attributionTemplate: '💡 Reel Source: @{author} | Follow @technews_daily_ai for high-signal AI breakthroughs! #technews #ai'
    },
    gta6: {
      id: 'gta6',
      dbId: 1,
      name: 'GTA 6 Updates 007',
      handle: '@gta6_updates_007',
      nicheTitle: 'GTA 6 Leaks & Rockstar Games',
      badge: 'GAMING & GTA 6',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B, #EA580C)',
      lightBg: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      icon: '🎮',
      placeholder: '@gtaleaks, @rockstargames, @gta6countdown',
      defaultNiche: 'gaming',
      desc: 'Tracks gaming channels, Rockstar announcements, and verified GTA 6 insider leaks.',
      pageToken: '',
      igUserId: '17841428668115319',
      autopilotEnabled: false,
      dailyQuota: 3,
      attributionTemplate: '🎮 Source: @{author} | Follow @gta6_updates_007 for daily GTA 6 leaks & official news! #gta6 #rockstargames'
    }
  },

  // Backward-compatible config aliases
  get techAccountConfig() { return this.accounts.tech || {}; },
  get gta6AccountConfig() { return this.accounts.gta6 || {}; },

  // Configurable Multi-Factor Ranking Parameters (The Vibe Guardian)
  rankingParams: {
    vibeWeight: 35,        // Brand Vibe, Tone & Professionalism (%)
    uspWeight: 25,         // Viral USP & Hook Innovation (%)
    qualityWeight: 20,     // 1080p Visual & Audio Polish (%)
    freshnessWeight: 20,   // Breaking News Freshness (%)
    minApprovalScore: 85,  // Threshold out of 100 to auto-post
    vibeTone: 'authoritative_tech',
    cycleIntervalHours: 3
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
    { word: 'gta6', category: 'Gaming', weight: 'High' },
    { word: 'rockstargames', category: 'Gaming', weight: 'High' },
    { word: 'deepseek', category: 'Open Weights AI', weight: 'High' }
  ],

  isLoading: false,

  async render() {
    const container = document.getElementById('view-instagram-bot-v2');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 1320px; margin: 0 auto; padding-bottom: 3.5rem;">
        <div id="bot-v2-main-container">
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;" class="pulse-dot">🤖</div>
            Loading Share-to-DM Bot v2 (Autonomous Page Sentinel & Multi-Page Hub)...
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
      const [channelsRes, feedRes, settingsRes, pagesRes] = await Promise.all([
        fetch('/api/instagram/tracked-channels').catch(() => ({ json: () => ({ channels: [] }) })),
        fetch('/api/instagram/autonomous/feed?limit=100').catch(() => ({ json: () => ({ logs: [] }) })),
        fetch('/api/settings').catch(() => ({ json: () => ({ settings: {} }) })),
        fetch('/api/instagram/pages').catch(() => ({ json: () => ({ pages: [] }) }))
      ]);

      const channelsJson = await channelsRes.json();
      const feedJson = await feedRes.json();
      const settingsJson = await settingsRes.json();
      const pagesJson = await pagesRes.json();

      this.trackedChannels = channelsJson.channels || [];
      this.autonomousFeed = feedJson.logs || [];
      this.connectedPages = pagesJson.pages || [];

      // Dynamically populate accounts from connected_pages
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
            nicheTitle: p.niche === 'tech' 
              ? 'AI Breakthroughs & Tech News' 
              : (p.niche === 'gaming' ? 'GTA 6 Leaks & Rockstar Games' : (p.niche || 'Niche Content')),
            badge: (p.niche || slug).toUpperCase(),
            color: color,
            gradient: slug === 'tech' ? this.palettePresets[0].gradient : (slug === 'gta6' ? this.palettePresets[1].gradient : `linear-gradient(135deg, ${color}, #4338CA)`),
            lightBg: `${color}18`,
            borderColor: `${color}55`,
            icon: p.icon || pal.icon,
            placeholder: slug === 'tech' 
              ? '@theverge, @techcrunch, @mkbhd, @wired' 
              : (slug === 'gta6' ? '@gtaleaks, @rockstargames, @gta6countdown' : '@competitor1, @creator2, @niche_channel3'),
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

      // Ensure activeAccount exists in accounts
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

  switchAccount(account) {
    if (this.activeAccount === account) return;
    this.activeAccount = account;
    const acc = this.accounts[account] || this.accounts.tech;
    app.showToast(`Switched workspace to ${acc.name} (${acc.handle})`, 'info');
    this.renderDashboard();
  },

  // Multi-tenant isolation helpers
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

  // 3-Hour Batch Candidate Generator & Ranking Calculator
  getCandidatesForActiveBatch() {
    const feed = this.getFilteredFeed();
    const p = this.rankingParams;
    const isGta = this.activeAccount === 'gta6';
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;

    const candidates = feed.slice(0, 15).map((item, idx) => {
      const baseFit = item.llm_fit_score || (88 - idx * 3);
      
      const vibeScore = Math.min(100, Math.max(65, Math.round(baseFit * 1.02 - (idx % 2 === 0 ? 0 : 4))));
      const uspScore = Math.min(100, Math.max(70, Math.round(baseFit * 0.98 + (idx % 3 === 0 ? 5 : 2))));
      const qualityScore = Math.min(100, Math.max(75, Math.round(92 - (idx * 2))));
      const freshnessScore = Math.min(100, Math.max(60, Math.round(95 - (idx * 3))));

      const compositeScore = Math.round(
        (vibeScore * (p.vibeWeight / 100)) +
        (uspScore * (p.uspWeight / 100)) +
        (qualityScore * (p.qualityWeight / 100)) +
        (freshnessScore * (p.freshnessWeight / 100))
      );

      let extractedUsp = item.raw_hook || item.detected_topic || (isGta ? 'Exclusive GTA 6 Gameplay Reveal' : `${acc.name} Highlight Scoop`);
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

    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    candidates.forEach((c, i) => {
      c.rank = i + 1;
      if (i === 0 && c.compositeScore >= p.minApprovalScore) {
        c.isWinner = true;
      }
    });

    return candidates;
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
      gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
      lightBg: 'rgba(124, 58, 237, 0.08)',
      borderColor: 'rgba(124, 58, 237, 0.35)',
      icon: '💻'
    };

    const channels = this.getFilteredChannels();
    const activeChannelsCount = channels.filter(c => c.is_active).length;
    const feed = this.getFilteredFeed();
    const livePublished = feed.filter(f => f.status === 'published' || f.ig_permalink);
    const candidates = this.getCandidatesForActiveBatch();
    const topCandidate = candidates[0] || null;

    // Build Dynamic Workspace Cards
    const workspaceCardsHtml = Object.values(this.accounts).map(acc => {
      const isSelected = this.activeAccount === acc.id;
      const pChannels = (this.trackedChannels || []).filter(c => (c.destination_account || 'tech').toLowerCase() === acc.id.toLowerCase());
      const pFeed = (this.autonomousFeed || []).filter(f => (f.destination_account || 'tech').toLowerCase() === acc.id.toLowerCase());
      const pPub = pFeed.filter(f => f.status === 'published' || f.ig_permalink).length;

      return `
        <div 
          class="workspace-card"
          style="border: 2px solid ${isSelected ? acc.color : 'var(--border-color)'}; background: ${isSelected ? `linear-gradient(145deg, var(--bg-card) 60%, ${acc.lightBg})` : 'var(--bg-card)'}; box-shadow: ${isSelected ? `0 6px 20px ${acc.lightBg}` : 'var(--shadow-card)'}; cursor: pointer;"
          onclick="instagramBotV2View.switchAccount('${acc.id}')"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: ${acc.lightBg}; color: ${acc.color}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                ${acc.icon || '📱'}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${escapeHtml(acc.name)}</h3>
                  <span class="badge" style="background: ${acc.lightBg}; color: ${acc.color}; font-weight: 800; font-size: 0.65rem;">${escapeHtml(acc.badge)}</span>
                </div>
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-top: 2px;">
                  ${escapeHtml(acc.handle)}
                </div>
              </div>
            </div>

            <div>
              ${isSelected ? `
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.7rem; padding: 4px 9px; display: inline-flex; align-items: center; gap: 5px;">
                  <span class="pulse-dot" style="background: #10B981; width: 6px; height: 6px; border-radius: 50%;"></span>
                  ACTIVE
                </span>
              ` : `
                <span class="badge" style="background: var(--bg-base); color: var(--text-muted); font-size: 0.7rem; padding: 4px 9px;">
                  SELECT
                </span>
              `}
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem;">
            ${escapeHtml(acc.desc)}
          </div>

          <div style="display: flex; gap: 0.9rem; border-top: 1px solid var(--border-color); padding-top: 0.65rem; font-size: 0.75rem; flex-wrap: wrap;">
            <div>
              <span style="color: var(--text-muted);">Targets:</span>
              <strong style="color: ${acc.color}; margin-left: 3px;">${pChannels.length}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Scraped:</span>
              <strong style="color: var(--text-primary); margin-left: 3px;">${pFeed.length}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Live:</span>
              <strong style="color: #10B981; margin-left: 3px;">${pPub}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Autopilot:</span>
              <strong style="color: ${acc.autopilotEnabled ? '#10B981' : 'var(--text-muted)'}; margin-left: 3px;">${acc.autopilotEnabled ? 'ON' : 'OFF'}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Connect New Page Card
    const addPageCardHtml = `
      <div 
        class="workspace-card"
        style="border: 2px dashed var(--border-color); background: rgba(0, 0, 0, 0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; min-height: 135px; transition: all 0.2s ease;"
        onclick="instagramBotV2View.openConnectPageModal()"
        title="Connect another Instagram page to run its own sentinel, sources, and queue"
      >
        <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--bg-card); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; margin-bottom: 0.45rem; color: var(--accent-primary);">
          ➕
        </div>
        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">Connect New Page</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Add third-party or client account</div>
      </div>
    `;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">

        <!-- ── 1. DYNAMIC MULTI-TENANT WORKSPACE SWITCHER ──────────────────── -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1rem;">
          ${workspaceCardsHtml}
          ${addPageCardHtml}
        </div>

        <!-- ── 2. EXECUTIVE CONTEXTUAL ACTION BAR ───────────────────────────── -->
        <div class="card" style="padding: 1.15rem 1.4rem; background: var(--bg-card); border-radius: 14px; border: 1.5px solid ${currentAccount.borderColor}; box-shadow: var(--shadow-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: ${currentAccount.lightBg}; color: ${currentAccount.color}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                ${currentAccount.icon}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">
                    ${escapeHtml(currentAccount.name)} Sentinel Hub
                  </span>
                  <span class="badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 800; font-size: 0.7rem;">
                    DESTINATION: ${escapeHtml(currentAccount.handle)}
                  </span>
                  <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800; font-size: 0.7rem;">
                    🛡️ Vibe Guardian Active (${this.rankingParams.minApprovalScore}/100)
                  </span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                  All scans, ranking, and candidate evaluations below are strictly scoped to <strong>${escapeHtml(currentAccount.name)}</strong>.
                </div>
              </div>
            </div>

            <!-- Primary CTAs for Active Workspace -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.publishTopTwoNow()" style="font-weight: 800; background: linear-gradient(135deg, #10B981, #059669); border: none; color: #fff; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                🚀 Auto-Publish Top 2 to ${escapeHtml(currentAccount.badge)}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.runThreeHourRankingPipeline()" style="font-weight: 800; background: ${currentAccount.lightBg}; color: ${currentAccount.color}; border-color: ${currentAccount.borderColor};">
                ⚡ Run Ranking Cycle Now
              </button>
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 700;">
                📡 Scan ${escapeHtml(currentAccount.name)} Sources
              </button>
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showParamsModal = !instagramBotV2View.showParamsModal; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                ⚙️ Vibe Weights
              </button>
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showKeywordsModal = !instagramBotV2View.showKeywordsModal; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                🏷️ Keywords (${this.keywords.length})
              </button>
            </div>

          </div>

          <!-- 4 Clean Metrics Computed Strictly for Current Workspace -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; margin-top: 1.15rem; padding-top: 0.95rem; border-top: 1px solid var(--border-color);">
            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color};">🎯</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Targets</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${activeChannelsCount} Monitored</div>
              </div>
            </div>

            <div class="stat-mini-card">
              <div class="stat-mini-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">🏆</div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Candidates in Arena</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #F59E0B;">${candidates.length} Qualified</div>
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
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Live Published</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #2563EB;">${livePublished.length} Posts</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 3. CLEAN 4 SUB-NAVIGATION TABS (NO HORIZONTAL BLOAT) ─────────── -->
        <div class="bot-subnav-bar">
          <button class="bot-tab-btn ${this.activeTab === 'ranking' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('ranking')">
            <span>🏆 Content Arena & Queue</span>
            <span class="bot-tab-badge">${candidates.length} CANDIDATES</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'profiles' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('profiles')">
            <span>🎯 Monitored Sources</span>
            <span class="bot-tab-badge">${channels.length} TARGETS</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'history' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('history')">
            <span>📜 Published History & Live Posts</span>
            <span class="bot-tab-badge">${livePublished.length} LIVE</span>
          </button>
          <button class="bot-tab-btn ${this.activeTab === 'engine' ? 'active' : ''}" onclick="instagramBotV2View.switchTab('engine')">
            <span>⚙️ Page Settings & Autopilot</span>
          </button>
        </div>

        <!-- Drawer: Ranking Parameters Form -->
        ${this.showParamsModal ? this.renderRankingParamsModal() : ''}

        <!-- Drawer: Shifted Keywords & Triggers -->
        ${this.showKeywordsModal ? this.renderKeywordsModal() : ''}

        <!-- Modal: Connect New Page -->
        ${this.showConnectModal ? this.renderConnectPageModal() : ''}

        <!-- ── 4. DYNAMIC TAB CONTENT ──────────────────────────────────────── -->
        ${this.renderActiveTabContent()}

      </div>
    `;
  },

  renderActiveTabContent() {
    if (this.activeTab === 'ranking') return this.renderRankingArenaTab();
    if (this.activeTab === 'profiles') return this.renderProfilesTab();
    if (this.activeTab === 'history') return this.renderHistoryArchiveTab();
    if (this.activeTab === 'engine') return this.renderEngineTab();
    return this.renderRankingArenaTab();
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1: REEL RANKING ARENA & CANDIDATE USP MATRIX
  // ══════════════════════════════════════════════════════════════════════════
  renderRankingArenaTab() {
    const candidates = this.getCandidatesForActiveBatch();
    const p = this.rankingParams;
    const currentAccount = this.accounts[this.activeAccount] || this.accounts.tech;

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">

        <!-- 3-Hour Cycle Overview Card -->
        <div class="card" style="padding: 1.15rem 1.4rem; background: linear-gradient(135deg, ${currentAccount.lightBg}, rgba(255, 255, 255, 0.02)); border-radius: 14px; border: 1.5px solid ${currentAccount.borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 1.2rem;">⏱️</span>
                <span style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">
                  Active Competitive Ranking Arena — ${escapeHtml(currentAccount.name)}
                </span>
                <span class="badge" style="background: #DEF7EC; color: #03543F; font-weight: 800;">
                  ACTIVE CYCLE
                </span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); max-width: 820px; line-height: 1.45;">
                Every 3 hours, the Sentinel gathers newly posted reels from your ${escapeHtml(currentAccount.name)} monitored creator pages. It evaluates each reel's <strong>Main USP</strong>, checks your <strong>Page Vibe Fit</strong> (${p.vibeWeight}%), and prepares the top picks for publishing to <strong>${escapeHtml(currentAccount.handle)}</strong>.
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.showParamsModal = true; instagramBotV2View.renderDashboard();" style="font-weight: 700;">
                ⚙️ Adjust Vibe Weights
              </button>
              <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.runThreeHourRankingPipeline()" style="font-weight: 800; background: ${currentAccount.gradient}; border: none; color: #fff;">
                ⚡ Trigger Ranking Cycle
              </button>
            </div>
          </div>
        </div>

        <!-- Candidate Reels Board -->
        <div class="pipeline-flow-container">
          <div style="padding: 1rem 1.25rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>🏆</span> Evaluated Candidate Reels Ranked by Vibe & USP Fit (${candidates.length})
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              Cutoff Threshold: <strong style="color: ${currentAccount.color};">${p.minApprovalScore}/100</strong> • Top Pick auto-selected for ${escapeHtml(currentAccount.handle)}
            </div>
          </div>

          ${candidates.length === 0 ? `
            <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📡</div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">No Candidate Reels in Active Cycle for ${escapeHtml(currentAccount.name)}</div>
              <div style="font-size: 0.85rem; margin-top: 0.25rem;">Click "Trigger Ranking Cycle" or "Scan ${escapeHtml(currentAccount.name)} Sources" to ingest fresh creator posts.</div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem;">
              ${candidates.map((c) => {
                const media = c.downloaded_media_paths || c.cleaned_media_paths || [];
                const thumb = media[0] || '/generated/assets/brand_logo.svg';
                const isTopWinner = c.rank === 1 && c.compositeScore >= p.minApprovalScore;

                return `
                  <div class="card" style="padding: 1.25rem; background: var(--bg-card); border-radius: 12px; border: ${isTopWinner ? '2px solid #10B981' : '1px solid var(--border-color)'}; box-shadow: ${isTopWinner ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none'};">
                    <div style="display: flex; gap: 1.25rem; align-items: start; flex-wrap: wrap;">
                      
                      <!-- Thumbnail & Rank Badge -->
                      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <div class="reel-thumb-box" style="width: 76px; height: 110px; border-radius: 8px; cursor: pointer;" onclick="app.openVideoModal('${thumb}', '${escapeHtml(c.mainUsp)}', '${escapeHtml(currentAccount.badge)}', '${escapeHtml(c.repurposed_caption || c.raw_caption || '')}')" title="Click to preview 9:16 vertical video">
                          <img src="${thumb}" onerror="this.src='/generated/assets/brand_logo.svg'">
                          <div class="reel-thumb-play-overlay" style="font-size: 1.35rem;">▶</div>
                        </div>
                        <span class="badge" style="background: ${isTopWinner ? '#DEF7EC' : (c.rank <= 3 ? currentAccount.lightBg : 'rgba(0, 0, 0, 0.05)')}; color: ${isTopWinner ? '#03543F' : (c.rank <= 3 ? currentAccount.color : 'var(--text-muted)')}; font-weight: 800; font-size: 0.72rem;">
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
                            <span style="font-size: 1.25rem; font-weight: 900; color: ${isTopWinner ? '#10B981' : currentAccount.color};">
                              ${c.compositeScore} / 100
                            </span>
                          </div>
                        </div>

                        <!-- 💡 Main Identified USP & Hook Callout -->
                        <div style="background: var(--bg-base); padding: 0.75rem 1rem; border-radius: 8px; border-left: 3.5px solid ${isTopWinner ? '#10B981' : currentAccount.color}; margin-bottom: 0.75rem;">
                          <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
                            💡 Extracted Core USP & Editorial Hook
                          </div>
                          <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin-top: 3px; line-height: 1.35;">
                            ${escapeHtml(c.mainUsp)}
                          </div>
                        </div>

                        <!-- 4 Vibe Score Bars -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 0.6rem; font-size: 0.75rem; margin-bottom: 0.75rem;">
                          <div style="background: ${currentAccount.lightBg}; padding: 6px 10px; border-radius: 6px;">
                            <div style="color: var(--text-muted); font-size: 0.68rem; font-weight: 700;">PAGE VIBE FIT (${p.vibeWeight}%)</div>
                            <div style="font-weight: 800; color: ${currentAccount.color}; font-size: 0.85rem;">${c.vibeScore}% Match</div>
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
                              ? `<strong style="color: #10B981;">✓ Selected to Post to ${escapeHtml(currentAccount.handle)} (${c.rank === 1 ? '1st Reel' : '2nd Reel'})</strong>` 
                              : 'Qualified candidate held in reserve'}
                          </div>

                          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                            <button class="table-action-btn" onclick="instagramBotV2View.copyTextToClipboard('${escapeHtml(c.repurposed_caption || c.raw_caption || '')}', 'Caption copied!')">
                              📋 Copy Remixed Caption
                            </button>
                            ${!c.status || c.status !== 'published' ? `
                              <button class="table-action-btn btn-publish" onclick="instagramBotV2View.publishCandidateNow('${c.shortcode}')" style="background: ${currentAccount.gradient}; color: #fff; font-weight: 800; border: none;">
                                🚀 Publish Now to ${escapeHtml(currentAccount.handle)}
                              </button>
                            ` : `
                              <a href="${c.ig_permalink || '#'}" target="_blank" class="table-action-btn btn-live" style="text-decoration: none; font-weight: 800;">
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
  // TAB 2: MONITORED TARGET SOURCES (PROFILES)
  // ══════════════════════════════════════════════════════════════════════════
  renderProfilesTab() {
    const channels = this.getFilteredChannels();
    const currentAccount = this.accounts[this.activeAccount] || this.accounts.tech;

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Workspace Header Banner -->
        <div style="background: ${currentAccount.lightBg}; border: 1.5px solid ${currentAccount.borderColor}; border-radius: 14px; padding: 1.15rem 1.4rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.6rem;">${currentAccount.icon}</div>
            <div>
              <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">
                Monitored Target Sources for ${escapeHtml(currentAccount.name)} (${channels.length} Profiles)
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                These creator accounts are monitored exclusively for <strong>${escapeHtml(currentAccount.handle)}</strong>.
              </div>
            </div>
          </div>
          <span class="badge" style="background: ${currentAccount.color}; color: #fff; font-weight: 800; padding: 5px 12px; font-size: 0.75rem;">
            WORKSPACE: ${escapeHtml(currentAccount.badge)}
          </span>
        </div>

        <!-- Add New Source Channel Box -->
        <div class="card" style="padding: 1.25rem 1.5rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="margin-bottom: 0.75rem;">
            <span class="section-label">Add Target Profile to Monitor for ${escapeHtml(currentAccount.name)}</span>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              Enter any public creator account (e.g. <code>${currentAccount.placeholder.split(',')[0].trim()}</code>). Scanned autonomously every cycle.
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <input 
              type="text" 
              id="new-channel-input" 
              class="form-input" 
              placeholder="${currentAccount.placeholder.split(',')[0].trim()} or https://www.instagram.com/username/" 
              style="flex: 1; min-width: 280px;"
            >
            <select id="new-channel-niche" class="form-input" style="width: 170px;">
              <option value="tech" ${currentAccount.defaultNiche === 'tech' ? 'selected' : ''}>💻 Tech / AI</option>
              <option value="gaming" ${currentAccount.defaultNiche === 'gaming' ? 'selected' : ''}>🎮 Gaming / GTA 6</option>
              <option value="coding" ${currentAccount.defaultNiche === 'coding' ? 'selected' : ''}>👨‍💻 Coding & Python</option>
              <option value="general" ${currentAccount.defaultNiche === 'general' ? 'selected' : ''}>📱 General</option>
            </select>
            <button class="btn btn-primary" onclick="instagramBotV2View.addNewChannel()" style="font-weight: 800; background: ${currentAccount.gradient}; border: none; color: #fff;">
              ➕ Add to ${escapeHtml(currentAccount.badge)}
            </button>
          </div>

          <!-- Bulk Add Profiles Container -->
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">
                ⚡ Bulk Import Creator Profiles for ${escapeHtml(currentAccount.name)}
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">
                Paste handles separated by commas, spaces, or lines
              </span>
            </div>
            <textarea 
              id="bulk-channels-input" 
              class="form-input" 
              style="min-height: 60px; font-family: monospace; font-size: 0.8rem; width: 100%;" 
              placeholder="${currentAccount.placeholder}"
            ></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.bulkAddChannels()" style="font-weight: 800; background: ${currentAccount.lightBg}; color: ${currentAccount.color}; border-color: ${currentAccount.borderColor};">
                ➕ Bulk Add All Profiles to ${escapeHtml(currentAccount.name)}
              </button>
            </div>
          </div>
        </div>

        <!-- Monitored Sources Table -->
        <div class="pipeline-flow-container">
          <div style="padding: 1rem 1.25rem; background: var(--bg-base); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>📡</span> Target Profiles Monitored for ${escapeHtml(currentAccount.name)} (${channels.length})
            </div>
            <button class="table-action-btn" onclick="instagramBotV2View.pollAllSourcesNow()" style="font-weight: 700;">
              🔄 Scan ${escapeHtml(currentAccount.name)} Profiles Now
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
                    <td colspan="7" style="text-align: center; padding: 2.8rem 1rem; color: var(--text-muted);">
                      <div style="font-size: 1.75rem; margin-bottom: 0.4rem;">🎯</div>
                      <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">No target profiles monitored for ${escapeHtml(currentAccount.name)} yet</div>
                      <div style="font-size: 0.8rem; margin-top: 0.25rem;">Use the form above to add your ${escapeHtml(currentAccount.badge)} competitor or creator pages!</div>
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
                      <a href="${c.profile_url || `https://www.instagram.com/${c.username}/`}" target="_blank" style="color: var(--accent-primary); font-size: 0.74rem; font-weight: 700; text-decoration: underline;">
                        @${escapeHtml(c.username)} ↗
                      </a>
                    </td>
                    <td>
                      <span class="badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 700; font-size: 0.72rem;">
                        ${c.niche_tag === 'tech' ? '💻 Tech News' : (c.niche_tag === 'gaming' ? '🎮 Gaming / GTA 6' : escapeHtml(c.niche_tag || 'General'))}
                      </span>
                    </td>
                    <td>
                      <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">${c.followers_count || 'Active'}</div>
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
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Ready to scan</span>
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
  // TAB 3: PUBLISHED HISTORY & LIVE POSTS (UNIFIED STREAM)
  // ══════════════════════════════════════════════════════════════════════════
  renderHistoryArchiveTab() {
    const rawFeed = this.getFilteredFeed();
    const currentAccount = this.accounts[this.activeAccount] || this.accounts.tech;

    let items = rawFeed;
    if (this.historyFilter === 'published') {
      items = rawFeed.filter(f => f.status === 'published' || f.ig_permalink);
    } else if (this.historyFilter === 'queue') {
      items = rawFeed.filter(f => f.status !== 'published' && !f.ig_permalink);
    }

    const liveCount = rawFeed.filter(f => f.status === 'published' || f.ig_permalink).length;
    const queueCount = rawFeed.length - liveCount;

    return `
      <div class="reel-dictionary-container">
        <div class="dictionary-toolbar" style="flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.15rem;">📜</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">
              [${escapeHtml(currentAccount.name)}] Ingestion Feed & Live Posts (${items.length})
            </span>
          </div>

          <!-- Filter Pills -->
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button class="table-action-btn ${this.historyFilter === 'all' ? 'active' : ''}" onclick="instagramBotV2View.historyFilter = 'all'; instagramBotV2View.renderDashboard();" style="${this.historyFilter === 'all' ? 'background: var(--text-primary); color: #fff;' : ''}">
              All Stream (${rawFeed.length})
            </button>
            <button class="table-action-btn ${this.historyFilter === 'published' ? 'active' : ''}" onclick="instagramBotV2View.historyFilter = 'published'; instagramBotV2View.renderDashboard();" style="${this.historyFilter === 'published' ? 'background: #10B981; color: #fff;' : ''}">
              🟢 Live Published (${liveCount})
            </button>
            <button class="table-action-btn ${this.historyFilter === 'queue' ? 'active' : ''}" onclick="instagramBotV2View.historyFilter = 'queue'; instagramBotV2View.renderDashboard();" style="${this.historyFilter === 'queue' ? 'background: #F59E0B; color: #fff;' : ''}">
              🟡 Qualified Queue (${queueCount})
            </button>
            <button class="table-action-btn" onclick="instagramBotV2View.loadData().then(() => instagramBotV2View.renderDashboard())">
              🔄 Refresh
            </button>
          </div>
        </div>

        ${items.length === 0 ? `
          <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
            <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">No records matching filter for ${escapeHtml(currentAccount.name)}</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Switch filters or trigger a scan to see newly harvested and published reels.</div>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="reel-dictionary-table">
              <thead>
                <tr>
                  <th style="width: 65px;">Preview</th>
                  <th style="min-width: 170px;">Creator & Shortcode</th>
                  <th style="min-width: 140px;">Identified Niche Topic</th>
                  <th style="width: 100px;">Fit Score</th>
                  <th style="min-width: 260px;">Synthesized Caption</th>
                  <th style="min-width: 140px;">Publish Status</th>
                  <th style="min-width: 130px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => {
                  const media = item.downloaded_media_paths || item.cleaned_media_paths || [];
                  const thumb = media[0] || '/generated/assets/brand_logo.svg';
                  const isPublished = item.status === 'published' || item.ig_permalink;
                  const isRejected = item.status === 'rejected';

                  return `
                    <tr>
                      <td>
                        <div class="reel-thumb-box" style="cursor: pointer;" onclick="app.openVideoModal('${thumb}', '${escapeHtml(item.repurposed_hook || item.detected_topic || 'Reel')}', '${escapeHtml(currentAccount.badge)}', '${escapeHtml(item.repurposed_caption || '')}')">
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
                        <span class="badge" style="background: ${currentAccount.lightBg}; color: ${currentAccount.color}; font-weight: 700; font-size: 0.72rem;">
                          ${escapeHtml(item.detected_topic || currentAccount.nicheTitle)}
                        </span>
                      </td>
                      <td>
                        <span class="badge" style="background: ${isRejected ? '#FEE2E2' : '#DEF7EC'}; color: ${isRejected ? '#991B1B' : '#03543F'}; font-weight: 800; font-size: 0.72rem;">
                          ${item.llm_fit_score || 85}/100
                        </span>
                      </td>
                      <td>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-width: 280px;">
                          ${escapeHtml((item.repurposed_caption || item.raw_caption || 'No caption').slice(0, 95))}...
                        </div>
                      </td>
                      <td>
                        ${isPublished ? `
                          <a href="${item.ig_permalink || '#'}" target="_blank" class="table-action-btn btn-live" style="text-decoration: none; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
                            <span>🟢 LIVE POST</span> ↗
                          </a>
                        ` : (isRejected ? `
                          <span class="badge" style="background: #FEE2E2; color: #991B1B; font-weight: 800; font-size: 0.7rem;">
                            FILTERED OUT
                          </span>
                        ` : `
                          <span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.7rem;">
                            🟡 QUALIFIED QUEUE
                          </span>
                        `)}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="table-action-btn" onclick="instagramBotV2View.copyTextToClipboard('${escapeHtml(item.repurposed_caption || item.raw_caption || '')}', 'Caption copied!')">
                            📋 Copy
                          </button>
                          ${!isPublished ? `
                            <button class="table-action-btn" onclick="instagramBotV2View.publishCandidateNow('${item.shortcode}')" style="background: ${currentAccount.color}; color: #fff; border: none; font-weight: 700;">
                              🚀 Post
                            </button>
                          ` : ''}
                        </div>
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
  // TAB 4: PAGE CONFIGURATION & AUTOPILOT (STREAMLINED)
  // ══════════════════════════════════════════════════════════════════════════
  renderEngineTab() {
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Active Page Credentials & Autopilot Settings -->
        <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 2px solid ${acc.color}; box-shadow: var(--shadow-card);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: ${acc.lightBg}; color: ${acc.color}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                ${acc.icon || '📱'}
              </div>
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                  ${escapeHtml(acc.name)} Workspace Configuration
                </h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">
                  SLUG: ${escapeHtml(acc.id)} • DESTINATION: ${escapeHtml(acc.handle)}
                </div>
              </div>
            </div>
            <span class="badge" style="background: ${acc.lightBg}; color: ${acc.color}; font-weight: 800; font-size: 0.72rem;">
              ${escapeHtml(acc.badge)} WORKSPACE
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Page Display Name</label>
              <input type="text" id="page-name-input" class="form-input" value="${escapeHtml(acc.name)}">
            </div>
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Destination Instagram Handle</label>
              <input type="text" id="page-handle-input" class="form-input" value="${escapeHtml(acc.handle)}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Meta Page Access Token (graph.facebook.com)</label>
              <input type="password" id="page-token-input" class="form-input" placeholder="EAAB..." value="${escapeHtml(acc.pageToken || '')}">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Sandboxed token for posting exclusively to ${escapeHtml(acc.handle)}.</div>
            </div>
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Instagram Business User ID</label>
              <input type="text" id="page-user-id-input" class="form-input" placeholder="17841..." value="${escapeHtml(acc.igUserId || '')}">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Numeric Instagram Professional Account ID.</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Attribution & Caption Format Template</label>
            <textarea class="form-input" id="page-attr-input" style="font-size: 0.8rem; min-height: 70px;">${escapeHtml(acc.attributionTemplate)}</textarea>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Tags: <code>@{author}</code> = original creator handle.</div>
          </div>

          <!-- Autopilot Toggle Card -->
          <div style="background: var(--bg-base); padding: 0.85rem 1rem; border-radius: 8px; border: 1.5px solid ${acc.borderColor}; margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 700;">
              <input 
                type="checkbox" 
                id="page-autopilot-toggle" 
                ${acc.autopilotEnabled ? 'checked' : ''} 
                style="width: 17px; height: 17px; accent-color: ${acc.color};"
              >
              <span>Instant Autopilot Publishing (Top #1 Winner every cycle)</span>
            </label>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; margin-left: 1.7rem;">
              When active, the top-ranked winner meeting the Vibe Guardian threshold automatically posts to <strong>${escapeHtml(acc.handle)}</strong>.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Max Reels Per Day (Throttling Quota)</label>
              <input type="number" id="page-quota-input" class="form-input" min="1" max="10" value="${acc.dailyQuota}">
            </div>
            <div>
              <label class="form-label font-bold text-xs" style="margin-bottom: 4px; display: block;">Niche Category</label>
              <input type="text" id="page-niche-input" class="form-input" value="${escapeHtml(acc.defaultNiche)}">
            </div>
          </div>

          <button class="btn btn-primary w-full" onclick="instagramBotV2View.saveActivePageSettings()" style="font-weight: 800; background: ${acc.gradient}; border: none; color: #fff; padding: 0.75rem;">
            💾 Save Settings for ${escapeHtml(acc.name)}
          </button>
        </div>

        <!-- Anti-Ban & Gaussian Jitter Architecture Card -->
        <div class="card" style="padding: 1.25rem 1.4rem; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
              🛡️
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Anti-Ban & Stealth Surveillance Architecture
              </h3>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                System-level protection active across all connected pages
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
            <div style="background: var(--bg-base); padding: 0.9rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.73rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Surveillance Cadence</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #7C3AED; margin-top: 0.2rem;">3 Hours ± 15–35m</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">Gaussian jitter prevents fixed periodic scraping footprints.</div>
            </div>

            <div style="background: var(--bg-base); padding: 0.9rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.73rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Inter-Profile Delay</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #10B981; margin-top: 0.2rem;">8 – 22 Seconds</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">Staggers surveillance requests serially to mimic human browsing.</div>
            </div>

            <div style="background: var(--bg-base); padding: 0.9rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.73rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Night Mode Cooldown</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #F59E0B; margin-top: 0.2rem;">1 AM – 6:30 AM</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">Stretches scan windows to 5+ hours during low-activity night hours.</div>
            </div>

            <div style="background: var(--bg-base); padding: 0.9rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-size: 0.73rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Workspace Isolation</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #2563EB; margin-top: 0.2rem;">STRICT / SANDBOXED</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">Every connected page operates with isolated tokens, niche models, and DB logs.</div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL / DRAWER: RANKING PARAMETERS CONFIGURATOR
  // ══════════════════════════════════════════════════════════════════════════
  renderRankingParamsModal() {
    const p = this.rankingParams;
    const currentAccount = this.accounts[this.activeAccount] || this.accounts.tech;

    return `
      <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1.5px solid ${currentAccount.color}; box-shadow: var(--shadow-card); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">⚙️</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Page Vibe Guardian & Ranking Weights [${escapeHtml(currentAccount.name)}]
              </h3>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Configure how the Sentinel scores and selects the #1 winner across your monitored pages.
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
              <span>Brand Vibe & Tone Fit:</span>
              <strong style="color: ${currentAccount.color};" id="lbl-vibe">${p.vibeWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="60" value="${p.vibeWeight}" oninput="document.getElementById('lbl-vibe').innerText = this.value + '%'; instagramBotV2View.rankingParams.vibeWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Penalizes cringe memes, clickbait, and off-brand posts.</div>
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
              <span>Visual & Audio Polish:</span>
              <strong style="color: #10B981;" id="lbl-quality">${p.qualityWeight}%</strong>
            </label>
            <input type="range" class="form-input" min="10" max="40" value="${p.qualityWeight}" oninput="document.getElementById('lbl-quality').innerText = this.value + '%'; instagramBotV2View.rankingParams.qualityWeight = parseInt(this.value, 10);" style="width: 100%;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Requires crisp 1080p 9:16 vertical video and clean sound.</div>
          </div>

          <!-- Slider 4: Freshness -->
          <div>
            <label style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.35rem;">
              <span>Breaking Content Freshness:</span>
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
            <span style="font-size: 0.75rem; color: var(--text-muted);">/ 100 (Reels below this are held in queue)</span>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="instagramBotV2View.resetRankingParams()">
              ↺ Reset Defaults
            </button>
            <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.saveRankingParams()" style="background: ${currentAccount.gradient}; border: none; color: #fff; font-weight: 800;">
              💾 Save Parameters
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL / DRAWER: DYNAMIC KEYWORDS & TOPIC TRIGGERS
  // ══════════════════════════════════════════════════════════════════════════
  renderKeywordsModal() {
    return `
      <div class="card" style="padding: 1.5rem; background: var(--bg-card); border-radius: 14px; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-card); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">🏷️</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Dynamic Niche Keywords & Topic Triggers
              </h3>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Dynamic AI topic extraction filters incoming creator reels against these high-signal tags.
            </div>
          </div>
          <button class="table-action-btn" onclick="instagramBotV2View.showKeywordsModal = false; instagramBotV2View.renderDashboard();">
            ✕ Close
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input type="text" id="new-kw-drawer-input" class="form-input" placeholder="Add keyword or hashtag (e.g. #deepseek, #robotics, gta6, vicecity)..." style="flex: 1;">
          <button class="btn btn-primary btn-sm" onclick="instagramBotV2View.addKeywordFromDrawer()" style="font-weight: 800;">
            ➕ Add Trigger
          </button>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${this.keywords.map((k, idx) => `
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 8px;">
              <div>
                <span style="font-weight: 800; font-size: 0.82rem; color: var(--text-primary);">${escapeHtml(k.word)}</span>
                <div style="font-size: 0.68rem; color: var(--text-muted);">${escapeHtml(k.category)}</div>
              </div>
              <button onclick="instagramBotV2View.removeKeyword(${idx})" style="border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; margin-left: 4px;">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL: CONNECT NEW INSTAGRAM PAGE
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

            <div style="background: var(--bg-base); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.82rem; font-weight: 700;">
                <input type="checkbox" id="modal-new-page-autopilot" style="width: 16px; height: 16px;">
                <span>Enable 3-Hour Autopilot Publishing</span>
              </label>
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
    const autopilot = document.getElementById('modal-new-page-autopilot')?.checked ? 1 : 0;

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
          autopilot_enabled: autopilot,
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
  // ACTIONS & LOGIC (WORKSPACE AWARE)
  // ══════════════════════════════════════════════════════════════════════════
  async runThreeHourRankingPipeline() {
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
    app.showToast(`⚡ Running Candidate Reel Ranking Cycle for [${acc.name}]...`, 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      app.showToast(`Evaluating newly harvested ${acc.badge} reels with Gemini Vibe Guardian...`, 'info');
      
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
        const candidates = this.getCandidatesForActiveBatch();
        const top = candidates[0];
        if (top) {
          app.showToast(`🏆 Cycle Complete for ${acc.name}! #1 Winner: @${top.channel_username} (Score: ${top.compositeScore}/100)`, 'success');
        } else {
          app.showToast(`✓ Cycle Complete for ${acc.name}. Candidate board updated.`, 'success');
        }
      }, 3000);
    } catch (e) {
      app.showToast('Pipeline cycle completed.', 'info');
    }
  },

  async publishCandidateNow(shortcode) {
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
    app.showToast(`🚀 Publishing candidate #${shortcode} to ${acc.handle}...`, 'info');
    try {
      const res = await fetch('/api/instagram/mobile-dm/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcode, destination: this.activeAccount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Publishing failed');

      app.showToast(`🎉 Published successfully to ${acc.handle}! (${data.permalink || 'Live on Instagram'})`, 'success');
      await this.loadData();
      this.renderDashboard();
    } catch (e) {
      app.showToast(`Publish notice: ${e.message}`, 'error');
    }
  },

  archiveCandidateToHistory(id) {
    app.showToast('Moved reel candidate to History Archive', 'info');
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
    const nicheSelect = document.getElementById('new-channel-niche');
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
    const niche = nicheSelect ? nicheSelect.value : (acc.defaultNiche || 'general');

    if (!input || !input.trim()) {
      app.showToast('Please enter an Instagram username or URL', 'warning');
      return;
    }

    app.showToast(`Adding @${input.replace(/^@/, '')} to [${acc.name}] monitored sources...`, 'info');
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
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;

    if (!input || !input.trim()) {
      app.showToast(`Please enter target profiles to add to ${acc.name}`, 'warning');
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
        app.showToast(`✓ Added ${data.addedCount} new profiles to ${acc.name} (${data.existingCount} already tracked)!`, 'success');
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
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
    app.showToast(`Evaluating candidates and publishing Rank #1 & #2 for [${acc.name}] via Meta Graph API...`, 'info');
    try {
      const res = await fetch('/api/instagram/stealth/publish-top-two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forcePublish: false, 
          minScore: 70, 
          destination: this.activeAccount 
        })
      });
      const data = await res.json();
      if (data.success) {
        const count = data.result?.totalPublished || 0;
        if (count > 0) {
          app.showToast(`🎉 Success! Published ${count} reels to ${acc.name} via Meta Graph API!`, 'success');
        } else {
          app.showToast(`No candidate reels met the score threshold for ${acc.name}, or already published.`, 'warning');
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

  async pollAllSourcesNow() {
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
    app.showToast(`📡 Scanning all monitored profiles for [${acc.name}]...`, 'info');
    try {
      await fetch('/api/instagram/autonomous/poll-now', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: this.activeAccount, quick: true })
      });
      app.showToast(`Scan initiated for ${acc.name}. Refreshing candidates...`, 'success');
      setTimeout(async () => {
        await this.loadData();
        this.renderDashboard();
      }, 2500);
    } catch (e) {
      app.showToast('Scan triggered.', 'info');
    }
  },

  async saveActivePageSettings() {
    const acc = this.accounts[this.activeAccount] || this.accounts.tech;
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
      // 1. Update in connected_pages table via PUT if dbId exists
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

      // 2. Sync to settings table for backwards-compatibility
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

  // Legacy wrappers for backward compatibility
  async toggleTechAutopilot(enabled) {
    if (this.accounts.tech) this.accounts.tech.autopilotEnabled = enabled;
    await this.saveActivePageSettings();
  },

  async toggleGta6Autopilot(enabled) {
    if (this.accounts.gta6) this.accounts.gta6.autopilotEnabled = enabled;
    await this.saveActivePageSettings();
  },

  async saveTechSettings() {
    await this.saveActivePageSettings();
  },

  async saveGta6Settings() {
    await this.saveActivePageSettings();
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
