/**
 * OmniStudio v7 — Pages & Niche Workspaces Hub
 * Dedicated competitor tracking, stock content reservoirs,
 * and publishing pipelines isolated per connected Instagram page.
 */
window.pagesView = (function() {
  let pagesList = [];
  let selectedPageId = null;
  let activeSubtab = 'sources'; // 'sources' | 'stock' | 'published'
  let currentWorkspaceData = null;
  let currentEditingPageId = null;

  async function render() {
    const container = document.getElementById('view-pages');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 980px; margin: 0 auto; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.35rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              My Pages & Niche Workspaces
            </h2>
            <p class="text-sm text-muted" style="margin: 0;">
              Isolated competitor surveillance feeds, stock content reservoirs, and publishing pipelines per page
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
          <div class="modal-content" style="max-width: 480px;">
            <div class="flex items-center justify-between mb-4">
              <h3 style="margin: 0; font-size: 1.15rem;" id="pem-title">Edit Page Configuration</h3>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Display Name</label>
              <input type="text" id="pem-name" class="form-input" placeholder="e.g. GTA 6 Updates">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Page Slug (Short ID)</label>
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
              <input type="number" id="pem-quota" class="form-input" min="1" max="50" value="5">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Default Hashtags</label>
              <input type="text" id="pem-hashtags" class="form-input" placeholder="#gta6 #gaming #rockstargames">
            </div>

            <div class="form-group mb-4">
              <label class="form-label font-bold">Post Mode</label>
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
            <div class="card" style="padding: 3.5rem; text-align: center;">
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
        return `
          <button class="workspace-tab-btn ${isActive ? 'active' : ''}" onclick="pagesView.selectPage(${p.id})">
            <span style="font-size: 1.05rem;">📱</span>
            <div>
              <div style="font-weight: 700; font-size: 0.84rem; line-height: 1.2;">${p.name}</div>
              <div style="font-size: 0.72rem; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}; font-family: var(--font-mono);">${p.handle || '@' + p.slug}</div>
            </div>
          </button>
        `;
      }).join('') + `
        <button class="workspace-tab-btn" style="border-style: dashed; color: var(--accent-primary);" onclick="pagesView.openAddModal()">
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

    const { page, sources, stockReels, publishedPosts, stats } = currentWorkspaceData;
    const quotaPct = Math.min(100, Math.round((stats.todayCount / stats.quotaMax) * 100));

    contentArea.innerHTML = `
      <!-- Page Profile & Quota Strip -->
      <div class="card mb-4" style="border-top: 4px solid var(--accent-primary); background: var(--bg-card); padding: 1.4rem;">
        <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 1rem;">
          <div class="flex items-center gap-3">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 1px solid var(--accent-border);">
              🎮
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif;">${page.name}</h3>
                <span class="badge badge-emerald">Slug: ${page.slug}</span>
                <span class="badge badge-muted">${page.post_mode === 'auto' ? '🚀 Auto-Publish' : '📋 Review First'}</span>
              </div>
              <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 0.2rem; font-family: var(--font-mono);">
                <a href="https://instagram.com/${page.handle ? page.handle.replace('@', '') : ''}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">
                  ${page.handle || '@' + page.slug} ↗
                </a>
                <span style="margin: 0 0.4rem; color: var(--border-subtle);">|</span>
                <span>Meta Token: <b style="color: var(--agent-reposter);">${page.access_token_masked || 'Active'}</b></span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" onclick="pagesView.testToken(${page.id})">
              ⚡ Test Meta Token
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${page.id})">
              ⚙️ Page Settings
            </button>
          </div>
        </div>

        <!-- Quota & Stats Strip -->
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1rem; align-items: center; background: var(--bg-card-hover); padding: 0.85rem 1.15rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div>
            <div class="flex items-center justify-between text-xs mb-1">
              <span style="font-weight: 700; color: var(--text-secondary);">Today's Publishing Quota</span>
              <span style="font-weight: 800; color: var(--accent-primary);">${stats.todayCount} / ${stats.quotaMax} Reels Posted</span>
            </div>
            <div style="background: var(--bg-elevated); height: 8px; border-radius: var(--radius-full); overflow: hidden;">
              <div style="background: linear-gradient(90deg, var(--agent-reposter), var(--accent-primary)); height: 100%; width: ${quotaPct}%;"></div>
            </div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Monitored Accounts</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">${stats.sourcesCount} Competitors</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Stock Discovered</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--agent-watchtower);">${stats.stockCount} In Reservoir</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Published History</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--agent-reposter);">${stats.publishedCount} Live Posts</div>
          </div>
        </div>
      </div>

      <!-- Sub-Tabs Navigation Bar -->
      <div class="workspace-subtabs-nav">
        <div class="workspace-subtab-item ${activeSubtab === 'sources' ? 'active' : ''}" onclick="pagesView.selectSubtab('sources')">
          <span>🎯 Target Monitored Accounts</span>
          <span class="badge badge-muted" style="font-size: 0.68rem;">${stats.sourcesCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'stock' ? 'active' : ''}" onclick="pagesView.selectSubtab('stock')">
          <span>📦 Stock / Discovered Reels</span>
          <span class="badge badge-amber" style="font-size: 0.68rem;">${stats.stockCount}</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'published' ? 'active' : ''}" onclick="pagesView.selectSubtab('published')">
          <span>🚀 Triggered / Published Feed</span>
          <span class="badge badge-emerald" style="font-size: 0.68rem;">${stats.publishedCount}</span>
        </div>
      </div>

      <!-- Active Subtab Content -->
      <div id="workspace-tab-body">
        ${renderSubtabBody(page, sources, stockReels, publishedPosts)}
      </div>
    `;
  }

  function renderSubtabBody(page, sources, stockReels, publishedPosts) {
    if (activeSubtab === 'sources') {
      return renderSourcesTab(page, sources);
    }
    if (activeSubtab === 'stock') {
      return renderStockTab(page, stockReels);
    }
    if (activeSubtab === 'published') {
      return renderPublishedTab(page, publishedPosts);
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 1: Target Monitored Accounts (Sources for this Page)
  // ─────────────────────────────────────────────────────────────
  function renderSourcesTab(page, sources) {
    const listHtml = sources.length === 0 ? `
      <div class="card" style="padding: 2.8rem; text-align: center; background: var(--bg-card);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🎯</div>
        <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem;">No Competitors Tracked for ${page.name}</div>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">Add 2 to 5 top creator or competitor accounts in this page's niche to begin autonomous surveillance.</p>
      </div>
    ` : `
      <div class="card table-container" style="background: var(--bg-card);">
        <table class="data-table">
          <thead>
            <tr>
              <th>Competitor Account</th>
              <th>Status / Health</th>
              <th>Last Checked</th>
              <th>Synced Reels</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(s => `
              <tr>
                <td style="font-weight: 700; font-family: var(--font-mono);">
                  <a href="https://instagram.com/${s.username}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                    @${s.username} ↗
                  </a>
                </td>
                <td>
                  <span class="badge ${s.health === 'ok' ? 'badge-emerald' : 'badge-amber'}">
                    ● ${s.health === 'ok' ? 'Healthy' : 'Failing'}
                  </span>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.78rem;">
                  ${s.last_checked_at ? new Date(s.last_checked_at).toLocaleTimeString() : 'Pending first scan'}
                </td>
                <td style="font-weight: 600; font-size: 0.8rem;">
                  ${s.synced_posts_count || 0} reels
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-danger btn-sm" onclick="pagesView.removeCompetitor(${page.id}, ${s.id})" style="font-size: 0.72rem; padding: 2px 8px;">
                    🗑️ Remove
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    return `
      <div>
        <!-- Quick Add Competitor Form -->
        <div class="card mb-3" style="background: var(--bg-card); padding: 1rem 1.25rem;">
          <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--text-primary);">
            + Track New Competitor for ${page.name}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            Watchtower will inspect this account every 3 hours and automatically discover reels for <b>${page.handle || '@' + page.slug}</b>.
          </div>
          <div class="flex gap-2">
            <input type="text" id="pw-new-competitor" class="form-input" placeholder="Enter competitor username e.g. @rockstargames" style="font-family: var(--font-mono); font-size: 0.84rem;">
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
  // Sub-Tab 2: Stock / Discovered Reels
  // ─────────────────────────────────────────────────────────────
  function renderStockTab(page, stockReels) {
    if (stockReels.length === 0) {
      return `
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">Reservoir Empty for ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
            Watchtower will populate this reservoir on its next scheduled scan cycle, or you can trigger an immediate scan from the Watchtower tab.
          </p>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
        ${stockReels.map(r => `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-card); padding: 1rem; border-top: 3px solid var(--accent-primary);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="badge badge-amber" style="font-size: 0.68rem;">⭐ Score: ${r.score || 75}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">#${r.shortcode}</span>
              </div>

              <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">
                <a href="${r.url}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                  From @${r.source_username || 'competitor'} ↗
                </a>
              </div>

              <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; max-height: 48px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.75rem;">
                ${r.caption ? r.caption.substring(0, 80) + '...' : 'Instagram Reel discovered via Watchtower'}
              </div>

              <div class="flex items-center gap-3 text-xs" style="color: var(--text-muted); margin-bottom: 0.85rem;">
                <span>❤️ ${(r.like_count || 0).toLocaleString()}</span>
                <span>💬 ${(r.comment_count || 0).toLocaleString()}</span>
                <span>👁️ ${(r.view_count || 0).toLocaleString()}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm w-full" onclick="pagesView.postStockReel(${r.id})">
                🚀 Post to ${page.slug}
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
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🚀</div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">No Posts Published Yet to ${page.name}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
            Reels published through Telegram (Agent 1) or Watchtower (Agent 2) will appear here with live Instagram links.
          </p>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card);">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Reel Shortcode</th>
              <th>Published At</th>
              <th>Caption Preview</th>
              <th style="text-align: right;">Live Instagram Reel</th>
            </tr>
          </thead>
          <tbody>
            ${publishedPosts.map(j => `
              <tr>
                <td style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                <td style="font-family: var(--font-mono); font-weight: 600;">${j.shortcode || 'Link'}</td>
                <td style="color: var(--text-secondary); font-size: 0.78rem;">
                  ${j.published_at ? new Date(j.published_at).toLocaleString() : 'Recently'}
                </td>
                <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: var(--text-secondary);">
                  ${j.caption ? j.caption.substring(0, 60) + '...' : '—'}
                </td>
                <td style="text-align: right;">
                  ${j.permalink ? `
                    <a href="${j.permalink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 3px 8px; text-decoration: none;">
                      View on Instagram ↗
                    </a>
                  ` : `
                    <span class="badge badge-emerald">● Live on Feed</span>
                  `}
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
      const res = await fetch(`/api/discoveries/${discoveryId}/post`, { method: 'POST' });
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

  function openEditModal(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!page) return;

    currentEditingPageId = pageId;
    document.getElementById('pem-title').textContent = `Edit @${page.slug}`;
    document.getElementById('pem-name').value = page.name || '';
    document.getElementById('pem-slug').value = page.slug || '';
    document.getElementById('pem-username').value = page.handle || page.username || '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = page.daily_quota || 5;
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
    document.getElementById('pem-quota').value = 5;
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
    const quota = parseInt(document.getElementById('pem-quota')?.value || 5, 10);
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
    openEditModal,
    openAddModal,
    closeEditModal,
    saveEditModal,
    refresh: loadPages
  };
})();
