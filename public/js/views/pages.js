/**
 * OmniStudio v7 — Pages View
 * Manage connected Instagram target pages and Meta Graph API v21.0 tokens
 */
window.pagesView = (function() {
  let pagesList = [];
  let currentEditingPageId = null;

  async function render() {
    const container = document.getElementById('view-pages');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.25rem 0;">My Instagram Pages</h2>
          <p style="color: var(--text-secondary); margin: 0; font-size: 0.88rem;">Target Instagram Business/Creator accounts authorized via Meta Graph API v21.0</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" onclick="pagesView.openAddModal()">
            + Connect New Page
          </button>
          <button class="btn btn-secondary btn-sm" onclick="pagesView.refresh()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Page Cards Container -->
      <div id="pages-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading connected pages...</div>
      </div>

      <!-- Edit Page Modal -->
      <div id="page-edit-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width: 500px;">
          <div class="flex items-center justify-between mb-3">
            <h3 style="margin: 0; font-size: 1.15rem;" id="pem-title">Edit Page Configuration</h3>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()">✕</button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Display Name</label>
            <input type="text" id="pem-name" class="form-input">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Instagram Username</label>
            <input type="text" id="pem-username" class="form-input">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Meta Graph User Access Token</label>
            <input type="password" id="pem-token" class="form-input" placeholder="Leave empty to keep existing token">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Meta Graph API User Token with <code>instagram_content_publish</code> scope.</div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Daily Publish Quota</label>
            <input type="number" id="pem-quota" class="form-input" min="1" max="50">
          </div>

          <div class="form-group mb-4">
            <label class="form-label font-bold">Default Hashtags</label>
            <input type="text" id="pem-hashtags" class="form-input" placeholder="#gta6 #rockstargames #gaming">
          </div>

          <div class="flex items-center justify-between">
            <button class="btn btn-secondary" onclick="pagesView.closeEditModal()">Cancel</button>
            <button class="btn btn-primary" onclick="pagesView.saveEditModal()">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    const grid = document.getElementById('pages-cards-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/pages');
      if (!res.ok) return;
      pagesList = await res.json();
      window.app.pages = pagesList;

      if (pagesList.length === 0) {
        grid.innerHTML = `
          <div class="card" style="padding: 3rem; text-align: center; grid-column: 1 / -1;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">No Instagram Pages Connected</div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 1rem 0;">Add your target Instagram page and Meta Graph API token to begin publishing.</p>
            <button class="btn btn-primary btn-sm" onclick="pagesView.openAddModal()">+ Connect Page</button>
          </div>
        `;
        return;
      }

      const cards = pagesList.map(p => {
        const quotaMax = p.daily_post_quota || 5;
        const quotaUsed = p.today_published_count || 0;
        const quotaPct = Math.min(100, Math.round((quotaUsed / quotaMax) * 100));

        return `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem;">
            <div>
              <!-- Header -->
              <div class="flex items-center justify-between mb-3">
                <div>
                  <div style="font-weight: 800; font-size: 1.1rem;">${p.name}</div>
                  <a href="https://instagram.com/${p.username}" target="_blank" style="font-size: 0.82rem; color: #60a5fa; text-decoration: none;">
                    @${p.username} ↗
                  </a>
                </div>
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">
                  Slug: ${p.slug}
                </span>
              </div>

              <!-- Meta Token Status -->
              <div style="background: var(--bg-deep); padding: 0.75rem; border-radius: 6px; font-size: 0.78rem; margin-bottom: 1rem;">
                <div class="flex items-center justify-between mb-1">
                  <span style="color: var(--text-muted);">Meta Token:</span>
                  <span style="color: #10B981; font-weight: 700;">● Active</span>
                </div>
                <div style="font-family: var(--font-mono); color: var(--text-secondary); word-break: break-all;">
                  ${p.access_token_masked || 'IGAAY...'}
                </div>
              </div>

              <!-- Daily Quota -->
              <div class="mb-4">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span style="color: var(--text-secondary);">Today's Quota Usage</span>
                  <span style="font-weight: 700; color: #60a5fa;">${quotaUsed} / ${quotaMax} reels</span>
                </div>
                <div style="background: var(--bg-deep); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #10B981, #3B82F6); height: 100%; width: ${quotaPct}%;"></div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button class="btn btn-secondary btn-sm w-full" onclick="pagesView.testToken(${p.id})">
                ⚡ Test Meta Token
              </button>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${p.id})">
                ⚙️ Edit
              </button>
            </div>
          </div>
        `;
      }).join('');

      grid.innerHTML = cards;
    } catch (err) {
      console.warn('[Pages loadData error]:', err);
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
    document.getElementById('pem-username').value = page.username || '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = page.daily_post_quota || 5;
    document.getElementById('pem-hashtags').value = page.default_hashtags || '';

    document.getElementById('page-edit-modal')?.classList.remove('hidden');
  }

  function openAddModal() {
    currentEditingPageId = null;
    document.getElementById('pem-title').textContent = 'Connect New Instagram Page';
    document.getElementById('pem-name').value = '';
    document.getElementById('pem-username').value = '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = '5';
    document.getElementById('pem-hashtags').value = '';

    document.getElementById('page-edit-modal')?.classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('page-edit-modal')?.classList.add('hidden');
  }

  async function saveEditModal() {
    const name = document.getElementById('pem-name')?.value?.trim();
    const username = document.getElementById('pem-username')?.value?.trim()?.replace(/^@/, '');
    const token = document.getElementById('pem-token')?.value?.trim();
    const quota = parseInt(document.getElementById('pem-quota')?.value || '5', 10);
    const hashtags = document.getElementById('pem-hashtags')?.value?.trim();

    if (!name || !username) {
      app.toast('Name and username are required', 'error');
      return;
    }

    const payload = {
      name,
      username,
      daily_post_quota: quota,
      default_hashtags: hashtags
    };
    if (token) {
      payload.access_token = token;
    }

    try {
      let res;
      if (currentEditingPageId) {
        res = await fetch(`/api/pages/${currentEditingPageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        payload.slug = username.toLowerCase().replace(/[^a-z0-9]/g, '');
        res = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        app.toast('Page configuration saved!', 'success');
        closeEditModal();
        loadData();
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
    testToken,
    openEditModal,
    openAddModal,
    closeEditModal,
    saveEditModal,
    refresh: loadData
  };
})();
