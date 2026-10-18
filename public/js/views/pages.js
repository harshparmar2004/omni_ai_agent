/**
 * OmniStudio v7 — Pages & Resources Hub
 * Clean, minimal, reliable command center for connected Instagram pages.
 */
window.pagesView = (function() {
  let pagesList = [];
  let selectedPageId = null;
  let activeTab = 'extracted'; // 'extracted' | 'published'
  const workspaceCache = {};
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
            <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.25rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              Pages & Resources
            </h2>
            <p class="text-sm text-muted" style="margin: 0;">
              Manage your connected Instagram pages, competitor resources, extracted content, and automated publishing.
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
          <div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Loading pages...</div>
        </div>

        <!-- 2. Selected Page Active Workspace -->
        <div id="workspace-content-area">
          <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading page...</div>
        </div>

        <!-- Edit / Connect Page Modal -->
        <div id="page-edit-modal" class="modal-overlay hidden">
          <div class="modal-content" style="max-width: 480px;">
            <div class="flex items-center justify-between mb-4">
              <h3 style="margin: 0; font-size: 1.15rem;" id="pem-title">Edit Page Configuration</h3>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Display Name</label>
              <input type="text" id="pem-name" class="form-input" placeholder="e.g. GTA 6 Updates 007">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Page Identifier (Slug)</label>
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
              <label class="form-label font-bold">Daily Publish Quota</label>
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

  async function loadPages(preserveSelection = true) {
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) return;
      pagesList = await res.json();
      window.app.pages = pagesList;

      const switcherBar = document.getElementById('workspace-switcher-bar');
      const contentArea = document.getElementById('workspace-content-area');

      if (!pagesList || pagesList.length === 0) {
        if (switcherBar) switcherBar.innerHTML = '';
        if (contentArea) {
          contentArea.innerHTML = `
            <div class="card" style="padding: 3.5rem; text-align: center; width: 100%;">
              <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">📱</div>
              <div style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.35rem;">No Instagram Pages Connected</div>
              <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0 0 1.25rem 0;">Add your target Instagram page and Meta Graph API token to begin tracking competitor resources and publishing.</p>
              <button class="btn btn-primary" onclick="pagesView.openAddModal()">+ Connect Your First Page</button>
            </div>
          `;
        }
        return;
      }

      if (!preserveSelection || !selectedPageId || !pagesList.find(p => p.id === selectedPageId)) {
        selectedPageId = pagesList[0].id;
      }

      // Render Switcher Bar buttons
      renderSwitcherBar();

      // Load active page workspace
      await loadPageWorkspace(selectedPageId);
    } catch (err) {
      console.warn('[Pages loadPages error]:', err);
    }
  }

  function renderSwitcherBar() {
    const switcherBar = document.getElementById('workspace-switcher-bar');
    if (!switcherBar || !pagesList) return;

    const buttonsHtml = pagesList.map(p => {
      const isActive = p.id === selectedPageId;
      const icon = getPageIcon(p.slug);
      return `
        <button id="page-tab-btn-${p.id}" class="workspace-tab-btn ${isActive ? 'active' : ''}" onclick="pagesView.selectPage(${p.id})">
          <span style="font-size: 1.15rem;">${icon}</span>
          <div style="text-align: left;">
            <div class="flex items-center gap-1">
              <span style="font-weight: 700; font-size: 0.86rem; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-primary)'};">${p.name}</span>
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${p.has_valid_token ? 'var(--success)' : 'var(--danger)'}; display: inline-block;"></span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
              ${p.handle || '@' + p.slug}
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

    switcherBar.innerHTML = buttonsHtml;
  }

  async function selectPage(pageId) {
    if (selectedPageId === pageId && workspaceCache[pageId]) return;
    selectedPageId = pageId;

    // 1. Immediately update active state on tab buttons (instant visual feedback)
    document.querySelectorAll('.workspace-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`page-tab-btn-${pageId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // 2. If cached, render immediately without jarring reload
    if (workspaceCache[pageId]) {
      renderWorkspace(workspaceCache[pageId]);
    }

    // 3. Load latest data in background
    await loadPageWorkspace(pageId);
  }

  async function loadPageWorkspace(pageId) {
    const contentArea = document.getElementById('workspace-content-area');
    if (!contentArea) return;

    try {
      const res = await fetch(`/api/pages/${pageId}/workspace`);
      if (!res.ok) {
        if (!workspaceCache[pageId]) {
          contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger);">Failed to load page details.</div>`;
        }
        return;
      }

      const data = await res.json();
      workspaceCache[pageId] = data;

      // Only render if still on this page
      if (selectedPageId === pageId) {
        renderWorkspace(data);
      }
    } catch (err) {
      console.warn('[loadPageWorkspace error]:', err);
      if (!workspaceCache[pageId]) {
        contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger);">Error: ${err.message}</div>`;
      }
    }
  }

  function renderWorkspace(data) {
    const contentArea = document.getElementById('workspace-content-area');
    if (!contentArea || !data || !data.page) return;

    const { page, sources = [], stockReels = [], publishedPosts = [], stats = {} } = data;
    const pageIcon = getPageIcon(page.slug);

    const sourcesCount = stats.sourcesCount ?? sources.length;
    const stockCount = stats.stockCount ?? stockReels.length;
    const publishedCount = stats.publishedCount ?? publishedPosts.length;
    const todayCount = stats.todayCount ?? 0;
    const quotaMax = stats.quotaMax ?? (page.daily_quota || 3);

    contentArea.innerHTML = `
      <!-- 1. Page Header Strip -->
      <div class="workspace-hero-card" style="margin-bottom: 1.25rem;">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
          <div class="flex items-center gap-3">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; border: 1px solid var(--accent-border); flex-shrink: 0;">
              ${pageIcon}
            </div>
            <div>
              <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-primary);">${page.name}</h3>
                <span class="badge ${page.has_valid_token ? 'badge-emerald' : 'badge-danger'}" style="font-size: 0.72rem;">
                  ● ${page.has_valid_token ? 'Meta Token Active' : 'Missing Token'}
                </span>
                <span class="badge ${page.post_mode === 'auto' ? 'badge-blue' : 'badge-muted'}" style="font-size: 0.72rem;">
                  ${page.post_mode === 'auto' ? '🚀 Auto-Publish' : '📋 Review First'}
                </span>
              </div>
              <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 0.2rem; font-family: var(--font-mono);">
                <a href="https://instagram.com/${page.handle ? page.handle.replace('@', '') : ''}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 700;">
                  ${page.handle || '@' + page.slug} ↗
                </a>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" onclick="pagesView.testToken(${page.id})">
              ⚡ Test Token
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${page.id})">
              ⚙️ Settings
            </button>
            <button class="btn btn-danger btn-sm" onclick="pagesView.deletePage(${page.id})" title="Delete Page">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- 2. The 3 Core Totals (Clean, Minimal, Focused) -->
      <div class="metrics-3col">
        
        <!-- Total 1: Competitor Resources -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--accent-primary);">
          <div>
            <div class="workspace-metric-label">
              <span>Competitor Resources</span>
              <span class="badge badge-muted" style="font-size: 0.65rem;">Active</span>
            </div>
            <div class="workspace-metric-val">
              ${sourcesCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Accounts</span>
            </div>
          </div>
          <div class="workspace-metric-sub">
            Monitored competitor & creator sources
          </div>
        </div>

        <!-- Total 2: Extracted Reels -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-watchtower);">
          <div>
            <div class="workspace-metric-label">
              <span>Extracted Reels</span>
              <span class="badge badge-amber" style="font-size: 0.65rem;">Reservoir</span>
            </div>
            <div class="workspace-metric-val" style="color: var(--agent-watchtower);">
              ${stockCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Reels</span>
            </div>
          </div>
          <div class="workspace-metric-sub">
            Harvested & ready to publish to <b>${page.slug}</b>
          </div>
        </div>

        <!-- Total 3: Reels Published -->
        <div class="workspace-metric-card" style="border-top: 3px solid var(--agent-reposter);">
          <div>
            <div class="workspace-metric-label">
              <span>Published to Instagram</span>
              <span class="badge badge-emerald" style="font-size: 0.65rem;">Live</span>
            </div>
            <div class="workspace-metric-val" style="color: var(--agent-reposter);">
              ${publishedCount} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">Reels</span>
            </div>
          </div>
          <div class="workspace-metric-sub">
            <b>${todayCount} / ${quotaMax}</b> posted today • Live on feed
          </div>
        </div>

      </div>

      <!-- 3. Monitored Resources Section (With Clear Instructions) -->
      <div class="card mb-4" style="background: var(--bg-card); padding: 1.35rem 1.5rem; width: 100%;">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
              Monitored Competitor Resources
            </h4>
            <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: var(--text-muted);">
              Accounts tracked for ${page.name}
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="pagesView.triggerPageScan(${page.id})" title="Scan all resources right now">
            ⚡ Scan Resources Now
          </button>
        </div>

        <!-- Clear Instruction Box -->
        <div class="instruction-box">
          <b>ℹ️ How this works:</b> Enter any public Instagram creator username or link (e.g. <code>@rockstargames</code> or <code>https://instagram.com/gtaleaks</code>). The automated agent continuously inspects this creator every 3 hours, extracts new viral reels, and saves them into this page's reservoir.
        </div>

        <!-- Quick Add Resource Input -->
        <div class="flex gap-2 mb-3" style="width: 100%;">
          <input type="text" id="pw-new-competitor" class="form-input" placeholder="Enter competitor Instagram handle e.g. @rockstargames" style="font-family: var(--font-mono); font-size: 0.86rem; flex: 1;">
          <button class="btn btn-primary" onclick="pagesView.addCompetitor(${page.id})" style="white-space: nowrap;">
            + Add Resource
          </button>
        </div>

        <!-- Resources Table -->
        ${renderSourcesTable(page, sources)}
      </div>

      <!-- 4. Content Tabs (Extracted Reels vs Published History) -->
      <div class="workspace-subtabs-nav">
        <div class="workspace-subtab-item ${activeTab === 'extracted' ? 'active' : ''}" onclick="pagesView.switchTab('extracted')">
          <span>📦 Extracted Reels</span>
          <span class="badge badge-amber" style="font-size: 0.68rem;">${stockCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeTab === 'published' ? 'active' : ''}" onclick="pagesView.switchTab('published')">
          <span>🚀 Published History</span>
          <span class="badge badge-emerald" style="font-size: 0.68rem;">${publishedCount}</span>
        </div>
      </div>

      <!-- 5. Content Body -->
      <div id="workspace-tab-body">
        ${activeTab === 'extracted' ? renderStockGrid(page, stockReels) : renderPublishedTable(page, publishedPosts)}
      </div>
    `;
  }

  function renderSourcesTable(page, sources) {
    if (!sources || sources.length === 0) {
      return `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border-card); border-radius: var(--radius-sm);">
          No competitor resources added yet for this page. Add an account above to start extracting reels.
        </div>
      `;
    }

    return `
      <div class="table-container" style="border: 1px solid var(--border-card); border-radius: var(--radius-sm);">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 30%;">Resource Account</th>
              <th style="width: 20%;">Status</th>
              <th style="width: 25%;">Extracted Reels</th>
              <th style="width: 15%;">Last Checked</th>
              <th style="text-align: right; width: 10%;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(s => {
              const lastCheckedText = s.last_checked_at ? new Date(s.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending scan';
              const isOk = s.health === 'ok';
              return `
                <tr class="competitor-row">
                  <td style="font-weight: 700; font-family: var(--font-mono);">
                    <a href="https://instagram.com/${s.username}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                      @${s.username} <span style="font-size: 0.75rem; color: var(--accent-primary);">↗</span>
                    </a>
                  </td>
                  <td>
                    <span class="badge ${isOk ? 'badge-emerald' : 'badge-amber'}" style="font-size: 0.72rem;">
                      ● ${isOk ? 'Active' : 'Checking'}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 700; color: var(--text-primary);">${s.synced_posts_count || 0} reels</span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">
                    ${lastCheckedText}
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="pagesView.removeCompetitor(${page.id}, ${s.id})" style="font-size: 0.72rem; padding: 2px 7px; color: var(--danger);" title="Remove resource">
                      ✕
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStockGrid(page, stockReels) {
    if (!stockReels || stockReels.length === 0) {
      return `
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">No Reels Extracted Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1rem 0;">
            Reels extracted from your monitored resources will appear here ready to publish.
          </p>
          <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})">
            ⚡ Run Extraction Scan Now
          </button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; width: 100%;">
        ${stockReels.map(r => `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-card); padding: 1.1rem; border-top: 3px solid var(--accent-primary);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="badge badge-amber" style="font-size: 0.7rem; font-weight: 700;">Score: ${r.score || 80}</span>
                <a href="${r.url}" target="_blank" style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                  #${r.shortcode} ↗
                </a>
              </div>

              <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                <a href="https://instagram.com/${r.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                  From @${r.source_username || 'competitor'} <span style="color: var(--accent-primary); font-size: 0.75rem;">↗</span>
                </a>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-height: 48px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.75rem;">
                ${r.caption ? r.caption.substring(0, 85) + '...' : 'Instagram Reel extracted from resource'}
              </div>

              <div class="flex items-center gap-3 text-xs" style="color: var(--text-muted); margin-bottom: 0.85rem; font-family: var(--font-mono);">
                <span>❤️ ${(r.like_count || 0).toLocaleString()}</span>
                <span>💬 ${(r.comment_count || 0).toLocaleString()}</span>
                <span>👁️ ${(r.view_count || 0).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <button class="btn btn-primary btn-sm w-full" onclick="pagesView.postStockReel(${r.id})">
                🚀 Publish to ${page.slug}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPublishedTable(page, publishedPosts) {
    if (!publishedPosts || publishedPosts.length === 0) {
      return `
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🚀</div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">No Posts Published Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
            Reels published to ${page.name} will appear here with live Instagram links.
          </p>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 12%;">Job ID</th>
              <th style="width: 20%;">Reel Shortcode</th>
              <th style="width: 25%;">Published Date</th>
              <th style="width: 28%;">Caption Preview</th>
              <th style="text-align: right; width: 15%;">Live Post</th>
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
                <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: var(--text-secondary);">
                  ${j.caption ? j.caption.substring(0, 60) + '...' : '—'}
                </td>
                <td style="text-align: right;">
                  ${j.permalink ? `
                    <a href="${j.permalink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 3px 8px; text-decoration: none;">
                      View Post ↗
                    </a>
                  ` : `
                    <span class="badge badge-emerald" style="font-size: 0.72rem;">● Live</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function switchTab(tab) {
    activeTab = tab;
    if (selectedPageId && workspaceCache[selectedPageId]) {
      renderWorkspace(workspaceCache[selectedPageId]);
    }
  }

  async function triggerPageScan(pageId) {
    app.toast('⚡ Extracting reels from monitored resources...', 'info');
    try {
      const res = await fetch(`/api/pages/${pageId}/scan`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('Extraction started in background!', 'success');
        setTimeout(() => loadPageWorkspace(pageId), 4000);
      } else {
        app.toast(data.error || 'Failed to start extraction', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  async function addCompetitor(pageId) {
    const input = document.getElementById('pw-new-competitor');
    const username = input?.value?.trim();
    if (!username) {
      app.toast('Please enter a creator username or Instagram link', 'warning');
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
        app.toast(`Added @${data.source.username} to monitored resources!`, 'success');
        if (input) input.value = '';
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to add resource', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function removeCompetitor(pageId, sourceId) {
    if (!confirm('Stop monitoring this resource account?')) return;

    try {
      const res = await fetch(`/api/pages/${pageId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        app.toast('Resource removed', 'info');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to remove resource', 'error');
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
        app.toast(`✅ Meta Token Valid! Connected to @${data.username}`, 'success');
      } else {
        app.toast(`❌ Token Test Failed: ${data.error || 'Invalid token'}`, 'error');
      }
    } catch (err) {
      app.toast('Test error: ' + err.message, 'error');
    }
  }

  async function deletePage(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!confirm(`Delete ${page ? page.name : 'this page'}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.toast('Page deleted', 'info');
        delete workspaceCache[pageId];
        selectedPageId = null;
        await loadPages(false);
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
    switchTab,
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
    refresh: () => loadPages(true)
  };
})();
