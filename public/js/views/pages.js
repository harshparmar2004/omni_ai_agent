/**
 * OmniStudio v7 — Instagram Channel Operations & Autonomous Pipelines
 * Dedicated competitor intelligence, curated viral content reservoirs,
 * and 3-hour publishing pipelines isolated per connected Instagram channel.
 */
window.pagesView = (function() {
  let pagesList = [];
  let selectedPageId = null;
  let activeSubtab = 'sources'; // 'sources' | 'stock' | 'published' | 'audit'
  let currentWorkspaceData = null;
  let currentEditingPageId = null;

  function getPageIcon(slug) {
    const s = (slug || '').toLowerCase();
    if (s.includes('gta') || s.includes('game')) return '🎮';
    if (s.includes('tech') || s.includes('ai')) return '💡';
    if (s.includes('meme') || s.includes('humor')) return '🎭';
    if (s.includes('fit') || s.includes('gym')) return '💪';
    if (s.includes('food') || s.includes('cook')) return '🍳';
    if (s.includes('news')) return '📰';
    if (s.includes('crypto') || s.includes('finance')) return '📈';
    return '📱';
  }

  async function render() {
    const container = document.getElementById('view-pages');
    if (!container) return;

    container.innerHTML = `
      <div class="pages-hub-container" style="width: 100%; max-width: 100%; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
                Channel Command Centers
              </h2>
              <span class="badge badge-muted" style="font-size: 0.72rem; font-family: var(--font-mono);">Multi-Account Core</span>
            </div>
            <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">
              Autonomous 3-hour competitive surveillance, curated viral content reservoirs, and Instagram Graph API dispatch pipelines per channel
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-primary btn-sm" onclick="pagesView.openAddModal()">
              + Connect New Channel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.refresh()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- 1. Top Channel Switcher Bar -->
        <div id="workspace-switcher-bar" class="workspace-switcher">
          <div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Loading connected channels...</div>
        </div>

        <!-- 2. Selected Channel Active Command Center -->
        <div id="workspace-content-area">
          <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading channel workspace...</div>
        </div>

        <!-- Edit / Connect Channel Modal -->
        <div id="page-edit-modal" class="modal-overlay hidden">
          <div class="modal-content" style="max-width: 520px;">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem;" id="pem-title">Channel Configuration</h3>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">Set up Instagram Graph API credentials and automated pipeline rules</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Channel Display Name</label>
              <input type="text" id="pem-name" class="form-input" placeholder="e.g. GTA 6 Updates 007">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Channel Slug (System Identifier)</label>
              <input type="text" id="pem-slug" class="form-input" placeholder="e.g. gta6" style="font-family: var(--font-mono);">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Instagram Username (@handle)</label>
              <input type="text" id="pem-username" class="form-input" placeholder="e.g. @gta6_updates_007">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Meta Graph API User Token</label>
              <input type="password" id="pem-token" class="form-input" placeholder="Leave empty to preserve existing token">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Requires <code>instagram_content_publish</code> scope from Meta for Developers.</div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Daily Publication Quota (Reels / Day)</label>
              <input type="number" id="pem-quota" class="form-input" min="1" max="50" value="3">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Maximum number of reels this channel will dispatch within a 24-hour cycle.</div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Default Hashtags</label>
              <input type="text" id="pem-hashtags" class="form-input" placeholder="#gta6 #gaming #rockstargames">
            </div>

            <div class="form-group mb-4">
              <label class="form-label font-bold">Publishing Mode</label>
              <select id="pem-post-mode" class="form-input">
                <option value="review">📋 Review & Approval (Queue First for Manual Approval)</option>
                <option value="auto">⚡ Autonomous Publishing (Direct Instagram API Dispatch)</option>
              </select>
            </div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button class="btn btn-secondary" onclick="pagesView.closeEditModal()">Cancel</button>
              <button class="btn btn-primary" onclick="pagesView.saveEditModal()">Save Configuration</button>
            </div>
          </div>
        </div>

      </div>
    `;

    await loadPages();
  }

  async function loadPages() {
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) return;
      pagesList = await res.json();
      window.app.pages = pagesList;

      const switcherBar = document.getElementById('workspace-switcher-bar');
      const contentArea = document.getElementById('workspace-content-area');

      if (pagesList.length === 0) {
        if (switcherBar) switcherBar.innerHTML = '';
        if (contentArea) {
          contentArea.innerHTML = `
            <div class="card" style="padding: 3.5rem; text-align: center; width: 100%;">
              <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">📱</div>
              <div style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.35rem;">No Instagram Channels Connected</div>
              <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0 0 1.25rem 0;">Add your target Instagram page and Meta Graph API token to initialize niche tracking and publishing.</p>
              <button class="btn btn-primary" onclick="pagesView.openAddModal()">+ Connect Your First Channel</button>
            </div>
          `;
        }
        return;
      }

      // Default to first page if current selection is invalid
      if (!selectedPageId || !pagesList.find(p => p.id === selectedPageId)) {
        selectedPageId = pagesList[0].id;
      }

      // Render Switcher Bar
      const buttonsHtml = pagesList.map(p => {
        const isActive = p.id === selectedPageId;
        const icon = getPageIcon(p.slug);
        return `
          <button class="workspace-tab-btn ${isActive ? 'active' : ''}" onclick="pagesView.selectPage(${p.id})">
            <span class="channel-avatar-small">${icon}</span>
            <div style="text-align: left;">
              <div class="flex items-center gap-1">
                <span style="font-weight: 700; font-size: 0.86rem; line-height: 1.2; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-primary)'};">${p.name}</span>
                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${p.has_valid_token ? 'var(--success)' : 'var(--danger)'}; display: inline-block;"></span>
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
                ${p.handle || '@' + p.slug} • Quota: ${p.today_published_count || 0}/${p.daily_quota || 3}
              </div>
            </div>
          </button>
        `;
      }).join('') + `
        <button class="workspace-tab-btn" style="border-style: dashed; color: var(--accent-primary); background: transparent;" onclick="pagesView.openAddModal()">
          <span>➕</span>
          <span>Connect Channel</span>
        </button>
      `;

      if (switcherBar) switcherBar.innerHTML = buttonsHtml;

      // Load active page workspace
      await loadPageWorkspace(selectedPageId);
    } catch (err) {
      console.warn('[Pages loadPages error]:', err);
    }
  }

  async function selectPage(pageId) {
    selectedPageId = pageId;
    await loadPages();
  }

  async function loadPageWorkspace(pageId) {
    const contentArea = document.getElementById('workspace-content-area');
    if (!contentArea) return;

    try {
      const res = await fetch(`/api/pages/${pageId}/workspace`);
      if (!res.ok) {
        contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger);">Failed to load channel workspace.</div>`;
        return;
      }

      currentWorkspaceData = await res.json();
      renderWorkspace();
    } catch (err) {
      console.warn('[loadPageWorkspace error]:', err);
      contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger);">Error: ${err.message}</div>`;
    }
  }

  function renderWorkspace() {
    const contentArea = document.getElementById('workspace-content-area');
    if (!contentArea || !currentWorkspaceData) return;

    const { page, sources, stockReels, publishedPosts, stats, cadence, recentRuns } = currentWorkspaceData;
    const pageIcon = getPageIcon(page.slug);

    // Format next scan display
    let nextScanText = 'Every 3 Hours';
    if (cadence?.isScanning) {
      nextScanText = '⏳ Scanning Now...';
    } else if (cadence?.nextRunAt) {
      try {
        const nextDate = new Date(cadence.nextRunAt);
        const diffMs = nextDate.getTime() - Date.now();
        if (diffMs > 0) {
          const diffMins = Math.round(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          nextScanText = hours > 0 ? `In ${hours}h ${mins}m` : `In ${mins}m`;
        } else {
          nextScanText = 'Due shortly';
        }
      } catch (e) {}
    }

    contentArea.innerHTML = `
      <!-- 1. Channel Executive Profile Banner -->
      <div class="workspace-hero-card">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1.25rem;">
          <div class="flex items-center gap-3.5">
            <div class="channel-avatar-badge">
              ${pageIcon}
            </div>
            <div>
              <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.35rem; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-primary); letter-spacing: -0.01em;">
                  ${page.name}
                </h3>
                <span class="badge badge-muted" style="font-family: var(--font-mono); font-size: 0.72rem;">slug: ${page.slug}</span>
                <span class="badge ${page.post_mode === 'auto' ? 'badge-blue' : 'badge-amber'}" style="font-size: 0.72rem; font-weight: 700;">
                  ${page.post_mode === 'auto' ? '⚡ Autonomous Publishing' : '📋 Review & Approval'}
                </span>
              </div>
              
              <div class="flex items-center gap-2 mt-2" style="flex-wrap: wrap;">
                <a href="https://instagram.com/${page.handle ? page.handle.replace('@', '') : ''}" target="_blank" class="status-pill-subtle" style="text-decoration: none; font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary);">
                  ${page.handle || '@' + page.slug} ↗
                </a>
                
                <span class="meta-token-chip">
                  <span class="${page.has_valid_token ? 'live-pulse-dot' : ''}" style="${!page.has_valid_token ? 'background: var(--danger); width: 7px; height: 7px; border-radius: 50%; display: inline-block;' : ''}"></span>
                  <span>Meta Graph API v21.0: <b>${page.has_valid_token ? 'Operational' : 'Token Required'}</b></span>
                  <span style="color: var(--text-muted); font-size: 0.68rem;">(${page.access_token_masked || 'None'})</span>
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})" title="Initiate 3-hour intelligence cycle now for this channel">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Execute 3h Cycle Now
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.testToken(${page.id})" title="Verify Meta API connection">
              🔌 Test API Handshake
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${page.id})">
              ⚙️ Settings
            </button>
            <button class="btn btn-danger btn-sm" onclick="pagesView.deletePage(${page.id})" title="Delete this channel">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- 2. 4 Executive Metric Cards Grid (Full-Width Responsive) -->
      <div class="workspace-metrics-grid">
        
        <!-- Card 1: Daily Publication Pipeline -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--accent-primary);">
          <div>
            <div class="metric-card-header">
              <span class="metric-label-text">Daily Publication Pipeline</span>
              <span class="badge badge-emerald" style="font-size: 0.65rem; font-weight: 800;">${stats.quotaPct}% Dispatched</span>
            </div>
            <div class="metric-number-display">
              ${stats.todayCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">/ ${stats.quotaMax} Reels Dispatched</span>
            </div>
            <div class="workspace-metric-progress-bar">
              <div class="workspace-metric-progress-fill" style="width: ${stats.quotaPct}%;"></div>
            </div>
          </div>
          <div class="metric-meta-text">
            <b>${stats.remainingQuota} publication slots</b> available today • Auto-resets at 00:00 UTC
          </div>
        </div>

        <!-- Card 2: Monitored Intelligence Sources -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-reposter);">
          <div>
            <div class="metric-card-header">
              <span class="metric-label-text">Competitive Surveillance</span>
              <span class="badge badge-emerald" style="font-size: 0.65rem; font-weight: 800;">● ${sources.filter(s => s.health === 'ok').length} Active Sources</span>
            </div>
            <div class="metric-number-display">
              ${stats.sourcesCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Monitored Creators</span>
            </div>
          </div>
          <div class="metric-meta-text">
            100% Operational Health • <b>${sources.reduce((a, s) => a + (s.synced_posts_count || 0), 0)}</b> candidate reels indexed
          </div>
        </div>

        <!-- Card 3: Curated Content Reservoir -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-watchtower);">
          <div>
            <div class="metric-card-header">
              <span class="metric-label-text">Curated Content Reservoir</span>
              <span class="badge badge-amber" style="font-size: 0.65rem; font-weight: 800;">⭐ ${stats.avgScore} Viral Index</span>
            </div>
            <div class="metric-number-display">
              ${stats.stockCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Candidate Reels</span>
            </div>
          </div>
          <div class="metric-meta-text">
            Harvested from competitor accounts • Ready for 1-click dispatch to <b>${page.slug}</b>
          </div>
        </div>

        <!-- Card 4: Autonomous Surveillance Cadence -->
        <div class="workspace-metric-card" style="border-top: 3px solid #6366F1;">
          <div>
            <div class="metric-card-header">
              <span class="metric-label-text">Surveillance Cadence</span>
              <span class="badge ${cadence?.isScanning ? 'badge-blue' : 'badge-muted'}" style="font-size: 0.65rem; font-weight: 800;">
                ${cadence?.isScanning ? 'Active Cycle' : 'Chronos Active'}
              </span>
            </div>
            <div class="metric-number-display" style="color: #6366F1;">
              ${nextScanText}
            </div>
          </div>
          <div class="metric-meta-text">
            Scans every 3h with dynamic human anti-detection jitter (11-35m)
          </div>
        </div>

      </div>

      <!-- 3. Sub-Tabs Navigation Bar -->
      <div class="workspace-subtabs-nav">
        <div class="workspace-subtab-item ${activeSubtab === 'sources' ? 'active' : ''}" onclick="pagesView.selectSubtab('sources')">
          <span>🎯 Monitored Competitors</span>
          <span class="badge badge-muted" style="font-size: 0.68rem;">${stats.sourcesCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'stock' ? 'active' : ''}" onclick="pagesView.selectSubtab('stock')">
          <span>📦 Curated Content Reservoir</span>
          <span class="badge badge-amber" style="font-size: 0.68rem;">${stats.stockCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'published' ? 'active' : ''}" onclick="pagesView.selectSubtab('published')">
          <span>🚀 Dispatch History & Live Feed</span>
          <span class="badge badge-emerald" style="font-size: 0.68rem;">${stats.publishedCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'audit' ? 'active' : ''}" onclick="pagesView.selectSubtab('audit')">
          <span>⏱️ Chronos Surveillance Audit</span>
          <span class="badge badge-muted" style="font-size: 0.68rem;">${recentRuns?.length || 0}</span>
        </div>
      </div>

      <!-- 4. Active Subtab Content Body -->
      <div id="workspace-tab-body">
        ${renderSubtabBody(page, sources, stockReels, publishedPosts, recentRuns, cadence)}
      </div>
    `;
  }

  function renderSubtabBody(page, sources, stockReels, publishedPosts, recentRuns, cadence) {
    if (activeSubtab === 'sources') {
      return renderSourcesTab(page, sources);
    }
    if (activeSubtab === 'stock') {
      return renderStockTab(page, stockReels);
    }
    if (activeSubtab === 'published') {
      return renderPublishedTab(page, publishedPosts);
    }
    if (activeSubtab === 'audit') {
      return renderAuditTab(page, recentRuns, cadence);
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 1: Monitored Competitors (Competitive Intelligence)
  // ─────────────────────────────────────────────────────────────
  function renderSourcesTab(page, sources) {
    const listHtml = sources.length === 0 ? `
      <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
        <div style="font-size: 2.4rem; margin-bottom: 0.5rem;">🎯</div>
        <div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 0.25rem;">No Competitor Accounts Monitored for ${page.name}</div>
        <p style="color: var(--text-muted); font-size: 0.84rem; margin: 0 0 1rem 0;">Add 2 to 5 high-performing creator accounts in this niche to begin autonomous 3-hour intelligence surveillance.</p>
      </div>
    ` : `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 28%;">Creator Profile</th>
              <th style="width: 16%;">Operational Health</th>
              <th style="width: 18%;">Discovered Content</th>
              <th style="width: 22%;">Last Surveillance Scan</th>
              <th style="text-align: right; width: 16%;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(s => {
              const lastCheckedText = s.last_checked_at ? new Date(s.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending Initial Scan';
              const isHealthy = s.health === 'ok';
              return `
                <tr class="competitor-row">
                  <td style="font-weight: 700; font-family: var(--font-mono);">
                    <div class="flex items-center gap-2">
                      <span class="channel-avatar-small" style="font-size: 0.85rem;">📸</span>
                      <a href="https://instagram.com/${s.username}" target="_blank" style="text-decoration: none; color: var(--text-primary); font-weight: 700;">
                        @${s.username} <span style="font-size: 0.75rem; color: var(--accent-primary);">↗</span>
                      </a>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${isHealthy ? 'badge-emerald' : 'badge-amber'}" style="font-size: 0.72rem; font-weight: 700;">
                      ● ${isHealthy ? 'Operational' : 'Attention (' + (s.consecutive_failures || 1) + ')'}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 800; color: var(--text-primary);">${s.synced_posts_count || 0} reels</span>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">indexed</span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">
                    <div>${lastCheckedText}</div>
                    ${s.last_error ? `<div style="font-size: 0.7rem; color: var(--danger); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.last_error}</div>` : ''}
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="pagesView.removeCompetitor(${page.id}, ${s.id})" style="font-size: 0.74rem; padding: 3px 9px;">
                      Remove Source
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    return `
      <div style="width: 100%;">
        <!-- Quick Add Competitor Form -->
        <div class="quick-add-card">
          <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
            + Track New Competitor Source for ${page.name}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Watchtower inspects this creator every 3 hours with stealth guest emulation to discover viral reels for <b>${page.handle || '@' + page.slug}</b>.
          </div>
          <div class="flex gap-2" style="width: 100%;">
            <input type="text" id="pw-new-competitor" class="form-input" placeholder="Enter competitor Instagram handle or URL e.g. @rockstargames" style="font-family: var(--font-mono); font-size: 0.86rem; flex: 1;">
            <button class="btn btn-primary" onclick="pagesView.addCompetitor(${page.id})" style="white-space: nowrap;">
              + Track Competitor Account
            </button>
          </div>
        </div>

        <!-- Competitor List -->
        ${listHtml}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 2: Curated Content Reservoir (Discovered Reels)
  // ─────────────────────────────────────────────────────────────
  function renderStockTab(page, stockReels) {
    if (stockReels.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">Curated Reservoir Empty for ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.25rem 0;">
            Watchtower automatically discovers viral reels from your monitored competitor accounts every 3 hours.
          </p>
          <button class="btn btn-primary" onclick="pagesView.triggerPageScan(${page.id})">
            ⚡ Execute Surveillance Cycle Now
          </button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; width: 100%;">
        ${stockReels.map(r => `
          <div class="reservoir-card">
            <div>
              <div class="flex items-center justify-between mb-2.5">
                <span class="badge badge-amber" style="font-size: 0.72rem; font-weight: 800;">⭐ Virality: ${r.score || 75}</span>
                <a href="${r.url}" target="_blank" style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                  #${r.shortcode} ↗
                </a>
              </div>

              <div style="font-size: 0.86rem; font-weight: 800; margin-bottom: 0.45rem;">
                <a href="https://instagram.com/${r.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                  Curated from @${r.source_username || 'competitor'} <span style="color: var(--accent-primary); font-size: 0.75rem;">↗</span>
                </a>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; max-height: 54px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.95rem; font-style: italic;">
                "${r.caption ? r.caption.substring(0, 95) + '...' : 'Instagram Reel discovered via Watchtower surveillance'}"
              </div>

              <div class="flex items-center gap-2 mb-3" style="flex-wrap: wrap;">
                <span class="metric-chip">❤️ ${(r.like_count || 0).toLocaleString()}</span>
                <span class="metric-chip">💬 ${(r.comment_count || 0).toLocaleString()}</span>
                <span class="metric-chip">👁️ ${(r.view_count || 0).toLocaleString()}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm w-full" onclick="pagesView.postStockReel(${r.id})">
                🚀 Dispatch to @${page.slug} Now
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 3: Dispatch History & Live Feed
  // ─────────────────────────────────────────────────────────────
  function renderPublishedTab(page, publishedPosts) {
    if (publishedPosts.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🚀</div>
          <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">No Dispatches Published Yet to ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
            Reels dispatched through Telegram Bot (Agent 1) or Watchtower (Agent 2) will appear here with live Instagram permalinks.
          </p>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 10%;">Job ID</th>
              <th style="width: 18%;">Reel Shortcode</th>
              <th style="width: 22%;">Dispatch Timestamp</th>
              <th style="width: 32%;">Caption Excerpt</th>
              <th style="text-align: right; width: 18%;">Live Publication</th>
            </tr>
          </thead>
          <tbody>
            ${publishedPosts.map(j => `
              <tr>
                <td style="font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                <td style="font-family: var(--font-mono); font-weight: 700;">
                  <a href="${j.source_url || '#'}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                    ${j.shortcode || 'Link'} ↗
                  </a>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.8rem;">
                  ${j.published_at ? new Date(j.published_at).toLocaleString() : 'Recently'}
                </td>
                <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: var(--text-secondary);">
                  ${j.caption ? j.caption.substring(0, 65) + '...' : '—'}
                </td>
                <td style="text-align: right;">
                  ${j.permalink ? `
                    <a href="${j.permalink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 3px 9px; text-decoration: none;">
                      View on Instagram ↗
                    </a>
                  ` : `
                    <span class="badge badge-emerald" style="font-size: 0.72rem; font-weight: 700;">● Live on Feed</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 4: Chronos Surveillance Audit
  // ─────────────────────────────────────────────────────────────
  function renderAuditTab(page, recentRuns, cadence) {
    if (!recentRuns || recentRuns.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">⏱️</div>
          <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">No Surveillance Cycles Logged Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.25rem 0;">
            Watchtower runs every 3 hours with human anti-detection jitter. You can trigger an on-demand cycle below.
          </p>
          <button class="btn btn-primary" onclick="pagesView.triggerPageScan(${page.id})">
            ⚡ Execute Surveillance Cycle Now
          </button>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 14%;">Cycle ID</th>
              <th style="width: 24%;">Execution Timestamp</th>
              <th style="width: 22%;">Sources Inspected</th>
              <th style="width: 22%;">New Reels Indexed</th>
              <th style="text-align: right; width: 18%;">Cycle Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentRuns.map(run => `
              <tr>
                <td style="font-weight: 800; font-family: var(--font-mono);">#${run.id}</td>
                <td style="font-size: 0.82rem; color: var(--text-secondary);">
                  ${new Date(run.started_at).toLocaleString()}
                </td>
                <td style="font-weight: 700; color: var(--text-primary);">
                  ${run.sources_checked} accounts
                </td>
                <td style="font-weight: 800; color: var(--agent-watchtower);">
                  +${run.new_posts} new reels
                </td>
                <td style="text-align: right;">
                  <span class="badge ${run.errors && run.errors !== '[]' ? 'badge-amber' : 'badge-emerald'}" style="font-size: 0.72rem; font-weight: 700;">
                    ${run.errors && run.errors !== '[]' ? 'Completed w/ Warnings' : '● Operational'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function selectSubtab(tabName) {
    activeSubtab = tabName;
    renderWorkspace();
  }

  async function triggerPageScan(pageId) {
    app.toast('⚡ Initiating 3-hour surveillance cycle for this niche...', 'info');
    try {
      const res = await fetch(`/api/pages/${pageId}/scan`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('Surveillance cycle started in background!', 'success');
        setTimeout(() => loadPageWorkspace(pageId), 4000);
      } else {
        app.toast(data.error || 'Failed to start cycle', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  async function addCompetitor(pageId) {
    const input = document.getElementById('pw-new-competitor');
    const username = input?.value?.trim();
    if (!username) {
      app.toast('Please enter a competitor Instagram username or URL', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/pages/${pageId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();

      if (data.success) {
        app.toast(`Added @${data.source.username} to monitored intelligence sources!`, 'success');
        if (input) input.value = '';
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to add competitor source', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function removeCompetitor(pageId, sourceId) {
    if (!confirm('Are you sure you want to stop monitoring this competitor source?')) return;

    try {
      const res = await fetch(`/api/pages/${pageId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        app.toast('Competitor source removed from this channel', 'info');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to remove competitor', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function postStockReel(discoveryId) {
    try {
      app.toast('Dispatching reel to publishing pipeline...', 'info');
      const res = await fetch(`/api/discoveries/${discoveryId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selectedPageId })
      });
      const data = await res.json();

      if (data.success) {
        app.toast('🚀 Reel queued and dispatched to publishing pipeline!', 'success');
        await loadPageWorkspace(selectedPageId);
      } else {
        app.toast(data.error || 'Failed to dispatch reel', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function testToken(pageId) {
    app.toast('Testing Meta Graph API handshake...', 'info');
    try {
      const res = await fetch(`/api/pages/${pageId}/test`, { method: 'POST' });
      const data = await res.json();

      if (data.valid) {
        app.toast(`✅ Meta API Valid! Connected to @${data.username} (${data.accountType || 'BUSINESS'})`, 'success');
      } else {
        app.toast(`❌ Connection Test Failed: ${data.error || 'Invalid API Token'}`, 'error');
      }
    } catch (err) {
      app.toast('Test error: ' + err.message, 'error');
    }
  }

  async function deletePage(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!confirm(`Are you sure you want to delete ${page ? page.name : 'this channel'}? This action is irreversible.`)) return;

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.toast('Channel deleted successfully', 'info');
        selectedPageId = null;
        await loadPages();
      } else {
        app.toast(data.error || 'Failed to delete channel', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  function openEditModal(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!page) return;

    currentEditingPageId = pageId;
    document.getElementById('pem-title').textContent = `Configure @${page.slug}`;
    document.getElementById('pem-name').value = page.name || '';
    document.getElementById('pem-slug').value = page.slug || '';
    document.getElementById('pem-username').value = page.handle || page.username || '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = page.daily_quota || 3;
    document.getElementById('pem-hashtags').value = page.default_hashtags || '';
    document.getElementById('pem-post-mode').value = page.post_mode || 'review';

    document.getElementById('page-edit-modal')?.classList.remove('hidden');
  }

  function openAddModal() {
    currentEditingPageId = null;
    document.getElementById('pem-title').textContent = 'Connect New Instagram Channel';
    document.getElementById('pem-name').value = '';
    document.getElementById('pem-slug').value = '';
    document.getElementById('pem-username').value = '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = 3;
    document.getElementById('pem-hashtags').value = '';
    document.getElementById('pem-post-mode').value = 'review';

    document.getElementById('page-edit-modal')?.classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('page-edit-modal')?.classList.add('hidden');
  }

  async function saveEditModal() {
    const name = document.getElementById('pem-name')?.value?.trim();
    const slug = document.getElementById('pem-slug')?.value?.trim();
    const handle = document.getElementById('pem-username')?.value?.trim();
    const token = document.getElementById('pem-token')?.value?.trim();
    const quota = parseInt(document.getElementById('pem-quota')?.value || 3, 10);
    const hashtags = document.getElementById('pem-hashtags')?.value?.trim();
    const postMode = document.getElementById('pem-post-mode')?.value;

    if (!name || !slug || !handle) {
      app.toast('Please provide Name, Slug, and Instagram Handle', 'warning');
      return;
    }

    const payload = {
      name,
      slug,
      handle,
      daily_quota: quota,
      default_hashtags: hashtags,
      post_mode: postMode
    };

    if (token) {
      payload.access_token = token;
    }

    try {
      const url = currentEditingPageId ? `/api/pages/${currentEditingPageId}` : '/api/pages';
      const method = currentEditingPageId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        app.toast('Channel configuration saved successfully!', 'success');
        closeEditModal();
        await loadPages();
      } else {
        const err = await res.json();
        app.toast(err.error || 'Failed to save channel', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  return {
    render,
    selectPage,
    selectSubtab,
    addCompetitor,
    removeCompetitor,
    postStockReel,
    testToken,
    triggerPageScan,
    deletePage,
    openEditModal,
    openAddModal,
    closeEditModal,
    saveEditModal,
    refresh: loadPages
  };
})();
