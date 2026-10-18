/**
 * OmniStudio v7 — Pages & Niche Workspaces Hub
 * Dedicated competitor surveillance, stock content reservoirs,
 * and 3-hour publishing pipelines isolated per connected Instagram page.
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
            <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.35rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              Pages & Niche Workspaces
            </h2>
            <p class="text-sm text-muted" style="margin: 0;">
              Isolated competitor surveillance feeds, stock content reservoirs, and autonomous 3-hour publishing pipelines per page
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-primary btn-sm" onclick="pagesView.openAddModal()">
              + Connect New Page
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.refresh()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- 1. Top Page Switcher Bar -->
        <div id="workspace-switcher-bar" class="workspace-switcher">
          <div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Loading connected pages...</div>
        </div>

        <!-- 2. Selected Page Active Workspace -->
        <div id="workspace-content-area">
          <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading page workspace...</div>
        </div>

        <!-- Edit / Connect Page Modal -->
        <div id="page-edit-modal" class="modal-overlay hidden">
          <div class="modal-content" style="max-width: 500px;">
            <div class="flex items-center justify-between mb-4">
              <h3 style="margin: 0; font-size: 1.15rem;" id="pem-title">Edit Page Configuration</h3>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Display Name</label>
              <input type="text" id="pem-name" class="form-input" placeholder="e.g. GTA 6 Updates 007">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Page Slug (Short Identifier)</label>
              <input type="text" id="pem-slug" class="form-input" placeholder="e.g. gta6" style="font-family: var(--font-mono);">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Instagram Username (@handle)</label>
              <input type="text" id="pem-username" class="form-input" placeholder="e.g. @gta6_updates_007">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Meta Graph API User Token</label>
              <input type="password" id="pem-token" class="form-input" placeholder="Leave empty to keep existing token">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Requires <code>instagram_content_publish</code> scope from Meta for Developers.</div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Daily Publish Quota (Reels / Day)</label>
              <input type="number" id="pem-quota" class="form-input" min="1" max="50" value="3">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Default Hashtags</label>
              <input type="text" id="pem-hashtags" class="form-input" placeholder="#gta6 #gaming #rockstargames">
            </div>

            <div class="form-group mb-4">
              <label class="form-label font-bold">Publishing Mode</label>
              <select id="pem-post-mode" class="form-input">
                <option value="review">📋 Review First (Save to Queue)</option>
                <option value="auto">🚀 Auto-Publish Directly</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <button class="btn btn-secondary" onclick="pagesView.closeEditModal()">Cancel</button>
              <button class="btn btn-primary" onclick="pagesView.saveEditModal()">Save Changes</button>
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
              <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">📄</div>
              <div style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.35rem;">No Instagram Pages Connected</div>
              <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0 0 1.25rem 0;">Add your target Instagram page and Meta Graph API token to begin niche tracking and publishing.</p>
              <button class="btn btn-primary" onclick="pagesView.openAddModal()">+ Connect Your First Page</button>
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
            <span style="font-size: 1.15rem;">${icon}</span>
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
          <span>Connect Page</span>
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
        contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger);">Failed to load page workspace.</div>`;
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
      <!-- 1. Page Hero Card -->
      <div class="workspace-hero-card">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
          <div class="flex items-center gap-3">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid var(--accent-border); flex-shrink: 0;">
              ${pageIcon}
            </div>
            <div>
              <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.35rem; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-primary);">${page.name}</h3>
                <span class="badge badge-emerald" style="font-family: var(--font-mono); font-size: 0.72rem;">Slug: ${page.slug}</span>
                <span class="badge ${page.post_mode === 'auto' ? 'badge-blue' : 'badge-amber'}" style="font-size: 0.72rem;">
                  ${page.post_mode === 'auto' ? '🚀 Auto-Publish' : '📋 Review First'}
                </span>
                <span class="badge ${page.has_valid_token ? 'badge-emerald' : 'badge-danger'}" style="font-size: 0.72rem;">
                  ${page.has_valid_token ? '● Meta Graph API v21.0 Active' : '● Invalid / Missing Token'}
                </span>
              </div>
              <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 0.35rem; font-family: var(--font-mono);">
                <a href="https://instagram.com/${page.handle ? page.handle.replace('@', '') : ''}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 700;">
                  ${page.handle || '@' + page.slug} ↗
                </a>
                <span style="margin: 0 0.5rem; color: var(--border-subtle);">|</span>
                <span>Token: <b style="color: var(--text-secondary);">${page.access_token_masked || 'None'}</b></span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})" title="Execute 3-hour surveillance cycle now for this page's niche">
              ⚡ Run 3-Hour Surveillance Now
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.testToken(${page.id})">
              ⚡ Test Token
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${page.id})">
              ⚙️ Settings
            </button>
            <button class="btn btn-danger btn-sm" onclick="pagesView.deletePage(${page.id})" title="Delete this page workspace">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- 2. 4 Executive Metric Cards Grid (Full-Width Responsive) -->
      <div class="workspace-metrics-grid">
        
        <!-- Card 1: Today's Publishing Pipeline Quota -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--accent-primary);">
          <div>
            <div class="workspace-metric-label">
              <span>Today's Pipeline Quota</span>
              <span style="color: var(--accent-primary); font-weight: 800;">${stats.quotaPct}%</span>
            </div>
            <div class="workspace-metric-val">
              ${stats.todayCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">/ ${stats.quotaMax} Reels</span>
            </div>
            <div class="workspace-metric-progress-bar">
              <div class="workspace-metric-progress-fill" style="width: ${stats.quotaPct}%;"></div>
            </div>
          </div>
          <div class="workspace-metric-sub" style="margin-top: 0.5rem;">
            <b>${stats.remainingQuota} slots</b> remaining today • Resets at 00:00 UTC
          </div>
        </div>

        <!-- Card 2: Monitored Competitors Tracking -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-reposter);">
          <div>
            <div class="workspace-metric-label">
              <span>Competitor Accounts</span>
              <span class="badge badge-emerald" style="font-size: 0.65rem;">● Active</span>
            </div>
            <div class="workspace-metric-val">
              ${stats.sourcesCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Tracked</span>
            </div>
          </div>
          <div class="workspace-metric-sub" style="margin-top: 0.5rem;">
            ${sources.filter(s => s.health === 'ok').length} healthy creators • <b>${sources.reduce((a, s) => a + (s.synced_posts_count || 0), 0)}</b> reels discovered total
          </div>
        </div>

        <!-- Card 3: Discovered Stock Reservoir -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-watchtower);">
          <div>
            <div class="workspace-metric-label">
              <span>Discovered Stock Reservoir</span>
              <span class="badge badge-amber" style="font-size: 0.65rem;">⭐ ${stats.avgScore} Avg</span>
            </div>
            <div class="workspace-metric-val">
              ${stats.stockCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Waiting</span>
            </div>
          </div>
          <div class="workspace-metric-sub" style="margin-top: 0.5rem;">
            Ready for 1-click dispatch to <b>${page.slug}</b>
          </div>
        </div>

        <!-- Card 4: 3-Hour Surveillance Cadence (Chronos) -->
        <div class="workspace-metric-card" style="border-top: 3px solid #6366F1;">
          <div>
            <div class="workspace-metric-label">
              <span>3-Hour Chronos Cadence</span>
              <span class="badge ${cadence?.isScanning ? 'badge-blue' : 'badge-muted'}" style="font-size: 0.65rem;">
                ${cadence?.isScanning ? 'Active' : 'Automated'}
              </span>
            </div>
            <div class="workspace-metric-val" style="color: #6366F1;">
              ${nextScanText}
            </div>
          </div>
          <div class="workspace-metric-sub" style="margin-top: 0.5rem;">
            Scans every 3h + dynamic human jitter (11-35m)
          </div>
        </div>

      </div>

      <!-- 3. Sub-Tabs Navigation Bar -->
      <div class="workspace-subtabs-nav">
        <div class="workspace-subtab-item ${activeSubtab === 'sources' ? 'active' : ''}" onclick="pagesView.selectSubtab('sources')">
          <span>🎯 Target Monitored Accounts</span>
          <span class="badge badge-muted" style="font-size: 0.68rem;">${stats.sourcesCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'stock' ? 'active' : ''}" onclick="pagesView.selectSubtab('stock')">
          <span>📦 Discovered Stock Reels</span>
          <span class="badge badge-amber" style="font-size: 0.68rem;">${stats.stockCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'published' ? 'active' : ''}" onclick="pagesView.selectSubtab('published')">
          <span>🚀 Triggered / Published Feed</span>
          <span class="badge badge-emerald" style="font-size: 0.68rem;">${stats.publishedCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'audit' ? 'active' : ''}" onclick="pagesView.selectSubtab('audit')">
          <span>⏱️ 3-Hour Surveillance Audit</span>
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
  // Sub-Tab 1: Target Monitored Accounts (Competitors for this Page)
  // ─────────────────────────────────────────────────────────────
  function renderSourcesTab(page, sources) {
    const listHtml = sources.length === 0 ? `
      <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🎯</div>
        <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">No Competitors Monitored for ${page.name}</div>
        <p style="color: var(--text-muted); font-size: 0.84rem; margin: 0 0 1rem 0;">Add 2 to 5 top creator or competitor accounts in this page's niche to begin autonomous 3-hour surveillance.</p>
      </div>
    ` : `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 25%;">Competitor / Creator</th>
              <th style="width: 15%;">Surveillance Health</th>
              <th style="width: 18%;">Latest Posts Count</th>
              <th style="width: 22%;">Last Scanned</th>
              <th style="text-align: right; width: 20%;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(s => {
              const lastCheckedText = s.last_checked_at ? new Date(s.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending first scan';
              const isHealthy = s.health === 'ok';
              return `
                <tr class="competitor-row">
                  <td style="font-weight: 700; font-family: var(--font-mono);">
                    <div class="flex items-center gap-2">
                      <span style="font-size: 1.1rem;">🎯</span>
                      <a href="https://instagram.com/${s.username}" target="_blank" style="text-decoration: none; color: var(--text-primary); font-weight: 700;">
                        @${s.username} <span style="font-size: 0.75rem; color: var(--accent-primary);">↗</span>
                      </a>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${isHealthy ? 'badge-emerald' : 'badge-amber'}" style="font-size: 0.72rem;">
                      ● ${isHealthy ? 'Active & Healthy' : 'Failing (' + (s.consecutive_failures || 1) + ')'}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 700; color: var(--text-primary);">${s.synced_posts_count || 0} reels</span>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">discovered</span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">
                    <div>${lastCheckedText}</div>
                    ${s.last_error ? `<div style="font-size: 0.7rem; color: var(--danger); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.last_error}</div>` : ''}
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="pagesView.removeCompetitor(${page.id}, ${s.id})" style="font-size: 0.74rem; padding: 3px 9px;">
                      🗑️ Stop Tracking
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
        <div class="card mb-3" style="background: var(--bg-card); padding: 1.15rem 1.4rem; width: 100%;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--text-primary);">
            + Track New Competitor for ${page.name}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Watchtower inspects this creator every 3 hours and automatically populates the reservoir for <b>${page.handle || '@' + page.slug}</b>.
          </div>
          <div class="flex gap-2" style="width: 100%;">
            <input type="text" id="pw-new-competitor" class="form-input" placeholder="Enter competitor Instagram handle e.g. @rockstargames" style="font-family: var(--font-mono); font-size: 0.86rem; flex: 1;">
            <button class="btn btn-primary" onclick="pagesView.addCompetitor(${page.id})" style="white-space: nowrap;">
              + Add Competitor Account
            </button>
          </div>
        </div>

        <!-- Competitor List -->
        ${listHtml}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 2: Discovered Stock Reels Reservoir
  // ─────────────────────────────────────────────────────────────
  function renderStockTab(page, stockReels) {
    if (stockReels.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.6rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 0.25rem;">Stock Reservoir Empty for ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.25rem 0;">
            Watchtower discovers high-performing viral reels from your monitored competitor accounts every 3 hours.
          </p>
          <button class="btn btn-primary" onclick="pagesView.triggerPageScan(${page.id})">
            ⚡ Run Surveillance Now
          </button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; width: 100%;">
        ${stockReels.map(r => `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-card); padding: 1.15rem; border-top: 3px solid var(--accent-primary);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="badge badge-amber" style="font-size: 0.72rem; font-weight: 700;">⭐ Score: ${r.score || 75}</span>
                <a href="${r.url}" target="_blank" style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                  #${r.shortcode} ↗
                </a>
              </div>

              <div style="font-size: 0.86rem; font-weight: 700; margin-bottom: 0.45rem;">
                <a href="https://instagram.com/${r.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                  From @${r.source_username || 'competitor'} <span style="color: var(--accent-primary); font-size: 0.75rem;">↗</span>
                </a>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-height: 52px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.85rem;">
                ${r.caption ? r.caption.substring(0, 95) + '...' : 'Instagram Reel discovered via Watchtower surveillance'}
              </div>

              <div class="flex items-center gap-3 text-xs" style="color: var(--text-muted); margin-bottom: 1rem; font-family: var(--font-mono);">
                <span>❤️ ${(r.like_count || 0).toLocaleString()}</span>
                <span>💬 ${(r.comment_count || 0).toLocaleString()}</span>
                <span>👁️ ${(r.view_count || 0).toLocaleString()}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm w-full" onclick="pagesView.postStockReel(${r.id})">
                🚀 Post to ${page.slug} Now
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 3: Triggered / Published Feed
  // ─────────────────────────────────────────────────────────────
  function renderPublishedTab(page, publishedPosts) {
    if (publishedPosts.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.6rem; margin-bottom: 0.5rem;">🚀</div>
          <div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 0.25rem;">No Posts Published Yet to ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
            Reels published through Telegram (Agent 1) or Watchtower (Agent 2) will appear here with live Instagram links.
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
              <th style="width: 22%;">Published Date</th>
              <th style="width: 30%;">Caption Preview</th>
              <th style="text-align: right; width: 20%;">Live Post</th>
            </tr>
          </thead>
          <tbody>
            ${publishedPosts.map(j => `
              <tr>
                <td style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                <td style="font-family: var(--font-mono); font-weight: 600;">
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
                    <span class="badge badge-emerald" style="font-size: 0.72rem;">● Live on Feed</span>
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
  // Sub-Tab 4: 3-Hour Surveillance Audit (Chronos Logs)
  // ─────────────────────────────────────────────────────────────
  function renderAuditTab(page, recentRuns, cadence) {
    if (!recentRuns || recentRuns.length === 0) {
      return `
        <div class="card" style="padding: 3.5rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.6rem; margin-bottom: 0.5rem;">⏱️</div>
          <div style="font-weight: 700; font-size: 1.15rem; margin-bottom: 0.25rem;">No Surveillance Runs Recorded Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.25rem 0;">
            Watchtower runs every 3 hours with human jitter. You can trigger an immediate cycle below.
          </p>
          <button class="btn btn-primary" onclick="pagesView.triggerPageScan(${page.id})">
            ⚡ Run Surveillance Now
          </button>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 12%;">Cycle Run ID</th>
              <th style="width: 25%;">Execution Timestamp</th>
              <th style="width: 20%;">Sources Checked</th>
              <th style="width: 23%;">New Reels Discovered</th>
              <th style="text-align: right; width: 20%;">Surveillance Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentRuns.map(run => `
              <tr>
                <td style="font-weight: 700; font-family: var(--font-mono);">#${run.id}</td>
                <td style="font-size: 0.82rem; color: var(--text-secondary);">
                  ${new Date(run.started_at).toLocaleString()}
                </td>
                <td style="font-weight: 600; color: var(--text-primary);">
                  ${run.sources_checked} accounts
                </td>
                <td style="font-weight: 700; color: var(--agent-watchtower);">
                  +${run.new_posts} new reels
                </td>
                <td style="text-align: right;">
                  <span class="badge ${run.errors && run.errors !== '[]' ? 'badge-amber' : 'badge-emerald'}" style="font-size: 0.72rem;">
                    ${run.errors && run.errors !== '[]' ? 'Completed w/ Warnings' : '● Success'}
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
        app.toast('Surveillance scan started in background!', 'success');
        setTimeout(() => loadPageWorkspace(pageId), 4000);
      } else {
        app.toast(data.error || 'Failed to start scan', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  async function addCompetitor(pageId) {
    const input = document.getElementById('pw-new-competitor');
    const username = input?.value?.trim();
    if (!username) {
      app.toast('Please enter a competitor Instagram username', 'warning');
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
        app.toast(`Added @${data.source.username} to monitored accounts!`, 'success');
        if (input) input.value = '';
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to add competitor', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function removeCompetitor(pageId, sourceId) {
    if (!confirm('Are you sure you want to stop monitoring this competitor?')) return;

    try {
      const res = await fetch(`/api/pages/${pageId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        app.toast('Competitor removed from this page', 'info');
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
      app.toast('Queueing reel for publishing...', 'info');
      const res = await fetch(`/api/discoveries/${discoveryId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selectedPageId })
      });
      const data = await res.json();

      if (data.success) {
        app.toast('🚀 Reel dispatched to publishing pipeline!', 'success');
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
        app.toast(`✅ Meta Token Valid! Connected to @${data.username} (${data.accountType || 'BUSINESS'})`, 'success');
      } else {
        app.toast(`❌ Token Test Failed: ${data.error || 'Invalid token'}`, 'error');
      }
    } catch (err) {
      app.toast('Test error: ' + err.message, 'error');
    }
  }

  async function deletePage(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!confirm(`Are you sure you want to delete ${page ? page.name : 'this page'}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.toast('Page deleted', 'info');
        selectedPageId = null;
        await loadPages();
      } else {
        app.toast(data.error || 'Failed to delete page', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  function openEditModal(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!page) return;

    currentEditingPageId = pageId;
    document.getElementById('pem-title').textContent = `Edit @${page.slug}`;
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
    document.getElementById('pem-title').textContent = 'Connect New Instagram Page';
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
      app.toast('Please fill out Name, Slug, and Instagram Handle', 'warning');
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
        app.toast('Page saved successfully!', 'success');
        closeEditModal();
        await loadPages();
      } else {
        const err = await res.json();
        app.toast(err.error || 'Failed to save page', 'error');
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
