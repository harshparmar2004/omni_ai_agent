/**
 * OmniStudio v7 — Pages & Channel Workspaces Hub (Minimalist Refactor)
 * Clean, low visual clutter interface for competitor intelligence,
 * curated reel reservoirs, and publishing pipelines.
 */
window.pagesView = (function() {
  let pagesList = [];
  let selectedPageId = null;
  let activeSubtab = 'sources'; // 'sources' | 'stock' | 'published' | 'audit'
  let currentWorkspaceData = null;
  let currentEditingPageId = null;
  let pageSearchQuery = '';
  let selectedNicheFilter = 'all';
  let directorySearchQuery = '';
  let directoryNicheFilter = 'all';
  let directoryStatusFilter = 'all';
  let directoryViewMode = 'grid'; // 'grid' | 'table'

  function getPageLogoUrl(p) {
    if (!p) return '';
    if (p.brand_logo_path && p.brand_logo_path.trim()) {
      return p.brand_logo_path.trim();
    }
    const handle = (p.handle || '').replace('@', '').toLowerCase();
    const slug = (p.slug || '').toLowerCase();
    if (handle === 'gta6_updates_007' || slug.includes('gta6')) {
      return '/branding/gta6_updates_007_avatar.png';
    }
    if (handle === 'movie_series_365' || slug.includes('movie')) {
      return '/branding/movie_series_365_avatar.png';
    }
    if (handle === 'clubbingcult' || slug.includes('clubbing')) {
      return '/branding/clubbingcult_avatar.png';
    }
    if (handle === 'cult_information' || slug.includes('cult_information') || slug === 'cult') {
      return '/branding/cult_information_avatar.png';
    }
    return '';
  }

  function renderPageAvatar(p, size = 36) {
    if (!p) return '';
    const logoUrl = getPageLogoUrl(p);
    const hasValid = p.has_valid_token !== false;
    const dotSize = Math.max(8, Math.round(size / 4));
    const statusDot = `<span class="channel-status-dot ${hasValid ? 'online' : 'warning'}" style="width: ${dotSize}px; height: ${dotSize}px;" title="${hasValid ? 'Operational' : 'Token Required'}"></span>`;

    const initials = (p.name || p.slug || 'CH')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const colors = [
      'linear-gradient(135deg, #10B981, #047857)',
      'linear-gradient(135deg, #F59E0B, #B45309)',
      'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      'linear-gradient(135deg, #EC4899, #BE185D)',
      'linear-gradient(135deg, #06B6D4, #0E7490)',
      'linear-gradient(135deg, #6366F1, #4338CA)'
    ];
    const colorIndex = (p.id || 1) % colors.length;

    if (logoUrl) {
      return `
        <div class="channel-avatar-wrapper" style="width: ${size}px; height: ${size}px;">
          <img src="${logoUrl}" alt="${escapeHtml(p.name)}" class="channel-avatar-img"
               style="width: ${size}px; height: ${size}px;"
               onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
          <div style="display: none; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${colors[colorIndex]}; color: white; font-weight: 700; font-size: ${Math.round(size * 0.38)}px; align-items: center; justify-content: center; border: 1.5px solid var(--border-subtle);">
            ${initials}
          </div>
          ${statusDot}
        </div>
      `;
    }

    return `
      <div class="channel-avatar-wrapper" style="width: ${size}px; height: ${size}px;">
        <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${colors[colorIndex]}; color: #FFFFFF; font-weight: 700; font-size: ${Math.round(size * 0.38)}px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--border-subtle); letter-spacing: -0.5px;">
          ${initials}
        </div>
        ${statusDot}
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function render() {
    const container = document.getElementById('view-pages');
    if (!container) return;

    container.innerHTML = `
      <div class="pages-hub-container" style="width: 100%; max-width: 100%; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              My Pages
            </h2>
            <p class="text-sm text-muted" style="margin: 0;">
              Isolated competitor surveillance feeds, stock content reservoirs, and publishing pipelines per page
            </p>
          </div>
          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openDirectoryModal()" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; border-color: var(--accent-border); background: var(--accent-soft); color: var(--accent-primary);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>🗂️ All Channels Directory</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="pagesView.openWizardModal()">
              ✨ Page Builder Wizard
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openAddModal()">
              + Connect Single Page
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openBulkModal()">
              ⚡ Bulk Operations
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('distribution')">
              🌐 Distribution Rings
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.refresh()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Channel Filter & Search Bar for 50-100 accounts -->
        <div class="card mb-2" style="padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-card); background: var(--bg-card); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
          <div class="flex items-center gap-2" style="flex: 1;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="pages-search-input" class="form-input" placeholder="Search 50-100+ channels by name, @handle, or slug..." oninput="pagesView.filterPages(this.value)" style="border: none; background: transparent; padding: 2px 4px; font-size: 0.82rem; width: 100%;">
          </div>
          <div class="flex items-center gap-2">
            <span id="pages-count-badge" class="badge" style="font-size: 0.72rem; color: var(--text-muted);">
              0 Channels Connected
            </span>
          </div>
        </div>

        <!-- Niche Quick Filter Pills -->
        <div id="pages-niche-filters" class="flex items-center gap-1.5 mb-3" style="flex-wrap: wrap; overflow-x: auto; padding-bottom: 2px;">
          <!-- Dynamically populated -->
        </div>

        <!-- 1. Top Page Switcher Bar -->
        <div id="workspace-switcher-bar" class="workspace-switcher" style="margin-bottom: 1.5rem;">
          <div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Loading connected pages...</div>
        </div>

        <!-- 2. Selected Page Active Workspace -->
        <div id="workspace-content-area">
          <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading page workspace...</div>
        </div>

        <!-- All Channels Network Directory Modal -->
        <div id="page-directory-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeDirectoryModal()">
          <div class="channel-directory-modal-content" onclick="event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-3" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.85rem;">
              <div class="flex items-center gap-2.5">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--accent-soft); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
                    Channel Network Directory
                  </h3>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    Visual control center for 100+ connected channels — instant search, original logo previews, and health status
                  </div>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeDirectoryModal()" style="padding: 4px 10px; font-size: 0.9rem;">✕</button>
            </div>

            <!-- Directory Fleet Stats -->
            <div id="directory-stats-row" class="flex items-center gap-2 mb-3" style="flex-wrap: wrap;"></div>

            <!-- Search, Filters, and View Switcher -->
            <div class="flex items-center justify-between gap-3 mb-3" style="flex-wrap: wrap; background: var(--bg-canvas); padding: 0.6rem 0.8rem; border-radius: 10px; border: 1px solid var(--border-subtle);">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 240px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="dir-search-input" class="form-input" placeholder="Search by channel name, @handle, or niche..." oninput="pagesView.filterDirectory(this.value)" style="border: none; background: transparent; padding: 2px 6px; font-size: 0.84rem; width: 100%;">
              </div>
              <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                <select id="dir-niche-select" class="form-input form-input-sm" onchange="pagesView.setDirectoryNicheFilter(this.value)" style="font-size: 0.78rem; padding: 4px 8px;">
                  <option value="all">All Niches</option>
                  <option value="movies">🎬 Movies & TV</option>
                  <option value="gaming">🎮 Gaming & GTA 6</option>
                  <option value="concert">🎵 Nightlife & EDM</option>
                  <option value="tech">📰 Video Essays & Tech</option>
                </select>
                <select id="dir-status-select" class="form-input form-input-sm" onchange="pagesView.setDirectoryStatusFilter(this.value)" style="font-size: 0.78rem; padding: 4px 8px;">
                  <option value="all">All Status</option>
                  <option value="active">Operational Only</option>
                  <option value="warning">⚠️ Token Required</option>
                </select>
                <div class="flex items-center" style="border: 1px solid var(--border-card); border-radius: 6px; overflow: hidden;">
                  <button id="dir-btn-grid" class="btn btn-sm" onclick="pagesView.setDirectoryViewMode('grid')" style="border: none; border-radius: 0; padding: 4px 8px; background: var(--accent-primary); color: white;" title="Grid View">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  </button>
                  <button id="dir-btn-table" class="btn btn-sm" onclick="pagesView.setDirectoryViewMode('table')" style="border: none; border-radius: 0; padding: 4px 8px; background: var(--bg-card); color: var(--text-muted);" title="Dense Table View">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Directory Content (Scrollable Grid or Table) -->
            <div id="directory-content-scroll" style="flex: 1; overflow-y: auto; max-height: calc(90vh - 220px); padding-right: 4px;">
              <div id="directory-pages-container"></div>
            </div>
          </div>
        </div>

        <!-- Edit / Connect Page Modal -->
        <div id="page-edit-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeEditModal()">
          <div class="modal-content" style="max-width: 500px; border-radius: 12px; border: 1px solid var(--border-card); box-shadow: none;">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;" id="pem-title">Edit Page Configuration</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">Set up Instagram Graph API credentials and automated pipeline rules</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeEditModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Display Name</label>
              <input type="text" id="pem-name" class="form-input" placeholder="e.g. GTA 6 Updates 007" style="border-radius: 8px;">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Channel Logo / Avatar URL</label>
              <div class="flex items-center gap-2">
                <input type="text" id="pem-logo" class="form-input" placeholder="e.g. /branding/gta6_updates_007_avatar.png" oninput="pagesView.previewEditLogo(this.value)" style="border-radius: 8px; flex: 1;">
                <div id="pem-logo-preview" style="width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--bg-canvas); flex-shrink: 0;"></div>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Page Slug (Short ID)</label>
              <input type="text" id="pem-slug" class="form-input" placeholder="e.g. gta6" style="font-family: var(--font-mono); border-radius: 8px;">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Instagram Username (@handle)</label>
              <input type="text" id="pem-username" class="form-input" placeholder="e.g. @gta6_updates_007" style="border-radius: 8px;">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Instagram Account ID (User ID)</label>
              <input type="text" id="pem-ig-user-id" class="form-input" placeholder="e.g. 17841434441251009" style="font-family: var(--font-mono); border-radius: 8px;">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Found in Meta for Developers under <i>2. Generate access tokens</i> (e.g. <code>17841434441251009</code>).</div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Meta Graph API User Token</label>
              <input type="password" id="pem-token" class="form-input" placeholder="Leave empty to keep existing token" style="border-radius: 8px;">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Requires <code>instagram_content_publish</code> scope from Meta for Developers.</div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Daily Publish Quota</label>
              <input type="number" id="pem-quota" class="form-input" min="1" max="50" value="3" style="border-radius: 8px;">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Default Hashtags</label>
              <input type="text" id="pem-hashtags" class="form-input" placeholder="#gta6 #gaming #rockstargames" style="border-radius: 8px;">
            </div>

            <div class="form-group mb-4">
              <label class="form-label font-bold" style="font-size: 0.8rem; font-weight: 600;">Publishing Mode</label>
              <select id="pem-post-mode" class="form-input" style="border-radius: 8px;">
                <option value="review">Review First (Save to Queue)</option>
                <option value="auto">Auto-Publish Directly</option>
              </select>
            </div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button class="btn btn-secondary" onclick="pagesView.closeEditModal()">Cancel</button>
              <button class="btn btn-primary" onclick="pagesView.saveEditModal()">Save Changes</button>
            </div>
          </div>
        </div>

        <!-- Page Builder 5-Step Wizard Modal -->
        <div id="page-wizard-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeWizardModal()">
          <div class="modal-content" style="max-width: 620px; width: 95%; border-radius: 14px;">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700;">✨ Page Builder & Onboarding Wizard</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Deploy a new automated channel into your distribution network</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeWizardModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <!-- Wizard Stepper Indicator -->
            <div class="wizard-stepper" id="wz-stepper">
              <div class="wizard-step-item active" id="wz-step-pill-1"><span class="wizard-step-num">1</span> Profile</div>
              <div class="wizard-step-item" id="wz-step-pill-2"><span class="wizard-step-num">2</span> Meta API</div>
              <div class="wizard-step-item" id="wz-step-pill-3"><span class="wizard-step-num">3</span> Template</div>
              <div class="wizard-step-item" id="wz-step-pill-4"><span class="wizard-step-num">4</span> Rules</div>
              <div class="wizard-step-item" id="wz-step-pill-5"><span class="wizard-step-num">5</span> Network Ring</div>
            </div>

            <!-- Wizard Step 1: Profile -->
            <div id="wz-step-1" class="wz-step-panel">
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Channel Name</label>
                <input type="text" id="wz-name" class="form-input" placeholder="e.g. Ultra Festival Highlights" oninput="pagesView.autoFillWizardSlug(this.value)">
              </div>
              <div class="flex gap-3 mb-3">
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Instagram Handle (@username)</label>
                  <input type="text" id="wz-handle" class="form-input" placeholder="@ultrafestival.daily">
                </div>
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Internal Slug</label>
                  <input type="text" id="wz-slug" class="form-input" placeholder="ultra_festival" style="font-family: var(--font-mono);">
                </div>
              </div>
              <div class="flex gap-3 mb-3">
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Niche Category</label>
                  <select id="wz-niche" class="form-input">
                    <option value="concert">🎵 Concert & EDM Festivals</option>
                    <option value="dance">💃 Girls Dance & Choreography</option>
                    <option value="movies">🎬 Movies & TV Series</option>
                    <option value="tech">⚡ AI, Tech & Video Essays</option>
                    <option value="gaming">🎮 Gaming & GTA 6</option>
                    <option value="general">🌐 General / Multi-Niche</option>
                  </select>
                </div>
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Target Region</label>
                  <select id="wz-region" class="form-input">
                    <option value="GLOBAL">🌍 Global / International</option>
                    <option value="IN">🇮🇳 India</option>
                    <option value="US">🇺🇸 United States</option>
                    <option value="EU">🇪🇺 Europe</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Wizard Step 2: Meta Credentials -->
            <div id="wz-step-2" class="wz-step-panel" style="display: none;">
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Meta Instagram User ID</label>
                <input type="text" id="wz-ig-user-id" class="form-input" placeholder="e.g. 17841462998491309" style="font-family: var(--font-mono);">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">Found in Meta Graph API Explorer or your Business Portfolio.</div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Permanent Meta Access Token</label>
                <input type="password" id="wz-token" class="form-input" placeholder="IGAAYJv..." style="font-family: var(--font-mono);">
              </div>
              <div class="mb-3">
                <button class="btn btn-secondary btn-sm" onclick="pagesView.testWizardToken()">
                  🔗 Test Connection Now
                </button>
                <span id="wz-test-result" style="font-size: 0.8rem; margin-left: 8px;"></span>
              </div>
            </div>

            <!-- Wizard Step 3: Template & Branding -->
            <div id="wz-step-3" class="wz-step-panel" style="display: none;">
              <label class="form-label font-bold mb-2" style="font-size: 0.8rem; display: block;">Select Visual Preset:</label>
              <div class="template-card-grid">
                <div class="template-card selected" id="wz-preset-neon" onclick="pagesView.selectWizardPreset('neon')">
                  <div class="template-card-preview" style="background: #000; color: #00FF66; border: 1px solid #00FF66;">⚡ NEON PULSE</div>
                  <div style="font-weight: 600; font-size: 0.85rem;">Electric Neon</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">EDM, Raves, Concerts</div>
                </div>
                <div class="template-card" id="wz-preset-video_essay" onclick="pagesView.selectWizardPreset('video_essay')">
                  <div class="template-card-preview" style="background: #0D0D12; color: #FFF; border: 1px solid #CCFF00;">📰 EDITORIAL</div>
                  <div style="font-weight: 600; font-size: 0.85rem;">Video Essay</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Cult Information, Tech</div>
                </div>
                <div class="template-card" id="wz-preset-cinema" onclick="pagesView.selectWizardPreset('cinema')">
                  <div class="template-card-preview" style="background: #111; color: #E5E5E5; border: 1px solid #777;">🎬 CINEMA</div>
                  <div style="font-weight: 600; font-size: 0.85rem;">Cinema Letterbox</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Movies, Series, TV</div>
                </div>
                <div class="template-card" id="wz-preset-minimal" onclick="pagesView.selectWizardPreset('minimal')">
                  <div class="template-card-preview" style="background: #18181B; color: #FAFAFA; border: 1px solid #3F3F46;">💎 MINIMAL</div>
                  <div style="font-weight: 600; font-size: 0.85rem;">Minimalist Modern</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Dance, Trends</div>
                </div>
              </div>
              <div class="flex gap-3 mb-3">
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Highlight Color</label>
                  <input type="color" id="wz-accent-color" class="form-input" value="#00FF66" style="height: 38px; padding: 2px 4px;">
                </div>
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Watermark Text</label>
                  <input type="text" id="wz-watermark" class="form-input" placeholder="@handle">
                </div>
              </div>
            </div>

            <!-- Wizard Step 4: Rules -->
            <div id="wz-step-4" class="wz-step-panel" style="display: none;">
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Publishing Mode</label>
                <select id="wz-post-mode" class="form-input">
                  <option value="auto">Autonomous Publishing (Agent 2 Watchtower Auto-Posts)</option>
                  <option value="review">Review & Approve in Telegram First</option>
                </select>
              </div>
              <div class="flex gap-3 mb-3">
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Daily Quota (Reels)</label>
                  <input type="number" id="wz-quota" class="form-input" value="5" min="1" max="25">
                </div>
                <div style="flex: 1;">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Pacing Spacing (min)</label>
                  <input type="number" id="wz-spacing" class="form-input" value="120" min="30" max="360">
                </div>
              </div>
              <div class="form-group mb-3" style="background: var(--bg-canvas); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                  <input type="checkbox" id="wz-auto-story" checked style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                  <span>Auto-publish companion 9:16 Instagram Story</span>
                </label>
              </div>
              <div class="form-group mb-3" style="background: var(--bg-canvas); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                  <input type="checkbox" id="wz-auto-cross-post" checked style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                  <span>Auto cross-post to interconnected Network Ring</span>
                </label>
              </div>
            </div>

            <!-- Wizard Step 5: Network Ring & Competitor Sources -->
            <div id="wz-step-5" class="wz-step-panel" style="display: none;">
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Connect to Distribution Ring</label>
                <select id="wz-group-select" class="form-input">
                  <option value="">-- No Network Ring (Standalone Page) --</option>
                </select>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">
                  Pages in the same ring share competitor discoveries and automatically cross-post to each other.
                </div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Ring Role</label>
                <select id="wz-group-role" class="form-input">
                  <option value="member">Secondary Member (Receives cross-posts)</option>
                  <option value="primary">Primary Seed (Scraped competitor reels publish here first)</option>
                </select>
              </div>
              <div class="form-group mb-4">
                <label class="form-label font-bold" style="font-size: 0.8rem;">Initial Competitor Accounts to Track (Optional):</label>
                <textarea id="wz-initial-sources" class="form-input" rows="4" placeholder="@cercaboreal&#10;@tomorrowland&#10;@boilerroom" style="font-family: var(--font-mono); font-size: 0.8rem;"></textarea>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">Paste competitor handles to immediately begin 24/7 surveillance for this channel.</div>
              </div>
            </div>

            <!-- Wizard Navigation Buttons -->
            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 1rem;">
              <button class="btn btn-secondary" id="wz-prev-btn" onclick="pagesView.prevWizardStep()" style="display: none;">← Back</button>
              <div style="margin-left: auto; display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="pagesView.closeWizardModal()">Cancel</button>
                <button class="btn btn-primary" id="wz-next-btn" onclick="pagesView.nextWizardStep()">Next Step →</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Inline Token Update Modal -->
        <div id="page-token-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeTokenModal()">
          <div class="modal-content" style="max-width: 500px; border-radius: 12px;">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">🔑 Update Meta Graph Access Token</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;" id="ptm-channel-name">Channel: --</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeTokenModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <input type="hidden" id="ptm-page-id">

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">New Meta Graph API User Token</label>
              <input type="password" id="ptm-token" class="form-input" placeholder="Paste EA... token here" style="border-radius: 8px;">
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                Requires <code>instagram_content_publish</code> and <code>pages_show_list</code> permissions.
              </div>
            </div>

            <div id="ptm-feedback" style="display: none; padding: 0.6rem; border-radius: 6px; font-size: 0.78rem; margin-bottom: 0.75rem;"></div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button class="btn btn-secondary" onclick="pagesView.closeTokenModal()">Cancel</button>
              <button class="btn btn-primary" id="ptm-save-btn" onclick="pagesView.submitTokenUpdate()">
                ⚡ Validate Handshake & Save
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Channel Operations Modal -->
        <div id="page-bulk-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeBulkModal()">
          <div class="modal-content" style="max-width: 580px; border-radius: 12px;">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">⚡ Bulk Channel Operations</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Manage 50-100+ channels simultaneously in seconds</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeBulkModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Select Target Channels</label>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label style="font-size: 0.78rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <input type="checkbox" id="bulk-select-all" onchange="pagesView.toggleSelectAllPages(this.checked)">
                  Select All Channels
                </label>
                <span id="bulk-selected-count" style="font-size: 0.72rem; color: var(--text-muted);">0 selected</span>
              </div>
              <div id="bulk-pages-list" style="max-height: 180px; overflow-y: auto; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.5rem; display: flex; flex-direction: column; gap: 4px;">
                <!-- Populated dynamically -->
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Bulk Action to Apply</label>
              <select id="bulk-action-select" class="form-input" onchange="pagesView.onBulkActionChange(this.value)">
                <option value="resume">▶ Resume Autonomous Publishing (All Active)</option>
                <option value="pause">⏸ Pause Autonomous Publishing</option>
                <option value="set_quota">🎯 Update Daily Publishing Quota</option>
                <option value="set_template">🎨 Assign Brand Template Preset</option>
              </select>
            </div>

            <div id="bulk-quota-field" class="form-group mb-3" style="display: none;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">New Daily Quota (Reels / Day)</label>
              <input type="number" id="bulk-quota-val" class="form-input" min="1" max="50" value="5">
            </div>

            <div id="bulk-template-field" class="form-group mb-4" style="display: none;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Select Design Preset</label>
              <select id="bulk-template-val" class="form-input">
                <option value="neon">Clubbing Cult Neon Green</option>
                <option value="video_essay">Editorial Video Essay (Cult Information)</option>
                <option value="cinema">Cinematic Movie Series</option>
                <option value="gta6">GTA 6 Vice City Neon</option>
                <option value="minimal">Minimalist Clean Brand</option>
              </select>
            </div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button class="btn btn-secondary" onclick="pagesView.closeBulkModal()">Cancel</button>
              <button class="btn btn-primary" onclick="pagesView.submitBulkAction()">
                Apply Bulk Changes
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Add Club & Competitor Sources Modal -->
        <div id="page-bulk-sources-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pagesView.closeBulkSourcesModal()">
          <div class="modal-content" style="max-width: 560px; border-radius: 12px;">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">⚡ Bulk Add Club & Intelligence Sources</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Track 15–16 city clubs (Delhi, Indore, etc.) in a single paste</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="pagesView.closeBulkSourcesModal()" style="padding: 2px 8px;">✕</button>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Instagram Handles or URLs (One per line or comma-separated)</label>
              <textarea id="pbsm-handles" class="form-input" rows="6" placeholder="@kitty_su_delhi&#10;@sohodelhi&#10;@toyroomdelhi&#10;@diablocitydelhi&#10;@privee_delhi" style="font-family: var(--font-mono); font-size: 0.82rem; line-height: 1.45;"></textarea>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Paste 15–16 club accounts. Both vertical Reels and feed photo flyers/lineup carousels will be ingested automatically.</div>
            </div>

            <div class="form-group mb-4">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Target Network & Ring Scope</label>
              <select id="pbsm-target-scope" class="form-input" style="font-size: 0.82rem;">
                <!-- Populated dynamically with current page and distribution rings -->
              </select>
            </div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button class="btn btn-secondary" onclick="pagesView.closeBulkSourcesModal()">Cancel</button>
              <button class="btn btn-primary" id="pbsm-submit-btn" onclick="pagesView.submitBulkSources()">
                ⚡ Start Surveillance on All Clubs
              </button>
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
            <div class="card" style="padding: 3.5rem; text-align: center; width: 100%; border-radius: 12px; box-shadow: none;">
              <div style="font-weight: 600; font-size: 1.15rem; margin-bottom: 0.25rem;">No Instagram Pages Connected</div>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.25rem 0;">Add your target Instagram page and Meta Graph API token to begin niche tracking and publishing.</p>
              <button class="btn btn-primary" onclick="pagesView.openAddModal()">+ Connect Your First Page</button>
            </div>
          `;
        }
        return;
      }

      const countBadge = document.getElementById('pages-count-badge');
      if (countBadge) countBadge.textContent = `${pagesList.length} Channels Connected`;
      const headerCount = document.getElementById('header-channels-count');
      if (headerCount) headerCount.textContent = `${pagesList.length}`;

      // Populate niche filter pills
      const nicheContainer = document.getElementById('pages-niche-filters');
      if (nicheContainer) {
        const counts = {
          all: pagesList.length,
          movies: pagesList.filter(p => (p.niche === 'movies' || (p.slug && p.slug.includes('movie')) || (p.name && p.name.toLowerCase().includes('movie')))).length,
          gaming: pagesList.filter(p => (p.niche === 'gaming' || (p.slug && p.slug.includes('gta')) || (p.name && p.name.toLowerCase().includes('gta')))).length,
          concert: pagesList.filter(p => (p.niche === 'concert' || (p.slug && (p.slug.includes('club') || p.slug.includes('concert'))) || (p.name && p.name.toLowerCase().includes('cult')))).length,
          tech: pagesList.filter(p => (p.niche === 'tech' || (p.slug && p.slug.includes('info')) || (p.name && p.name.toLowerCase().includes('info')))).length,
          warning: pagesList.filter(p => p.has_valid_token === false).length
        };

        nicheContainer.innerHTML = `
          <button class="niche-filter-chip ${selectedNicheFilter === 'all' ? 'active' : ''}" onclick="pagesView.setNicheFilter('all')">
            All Channels (${counts.all})
          </button>
          ${counts.movies > 0 ? `
            <button class="niche-filter-chip ${selectedNicheFilter === 'movies' ? 'active' : ''}" onclick="pagesView.setNicheFilter('movies')">
              🎬 Movies & TV (${counts.movies})
            </button>
          ` : ''}
          ${counts.gaming > 0 ? `
            <button class="niche-filter-chip ${selectedNicheFilter === 'gaming' ? 'active' : ''}" onclick="pagesView.setNicheFilter('gaming')">
              🎮 Gaming & GTA (${counts.gaming})
            </button>
          ` : ''}
          ${counts.concert > 0 ? `
            <button class="niche-filter-chip ${selectedNicheFilter === 'concert' ? 'active' : ''}" onclick="pagesView.setNicheFilter('concert')">
              🎵 Nightlife & EDM (${counts.concert})
            </button>
          ` : ''}
          ${counts.tech > 0 ? `
            <button class="niche-filter-chip ${selectedNicheFilter === 'tech' ? 'active' : ''}" onclick="pagesView.setNicheFilter('tech')">
              📰 Video Essays & Tech (${counts.tech})
            </button>
          ` : ''}
          ${counts.warning > 0 ? `
            <button class="niche-filter-chip ${selectedNicheFilter === 'warning' ? 'active' : ''}" onclick="pagesView.setNicheFilter('warning')" style="color: ${selectedNicheFilter === 'warning' ? '#FFF' : '#EF4444'}; border-color: #EF4444;">
              ⚠️ Needs Token (${counts.warning})
            </button>
          ` : ''}
        `;
      }

      // Filter pages based on search query and niche filter
      let displayList = pagesList;
      if (pageSearchQuery) {
        const q = pageSearchQuery.toLowerCase();
        displayList = displayList.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.handle && p.handle.toLowerCase().includes(q)) ||
          (p.slug && p.slug.toLowerCase().includes(q))
        );
      }
      if (selectedNicheFilter !== 'all') {
        displayList = displayList.filter(p => {
          if (selectedNicheFilter === 'movies') return p.niche === 'movies' || (p.slug && p.slug.includes('movie')) || (p.name && p.name.toLowerCase().includes('movie'));
          if (selectedNicheFilter === 'gaming') return p.niche === 'gaming' || (p.slug && p.slug.includes('gta')) || (p.name && p.name.toLowerCase().includes('gta'));
          if (selectedNicheFilter === 'concert') return p.niche === 'concert' || (p.slug && (p.slug.includes('club') || p.slug.includes('concert'))) || (p.name && p.name.toLowerCase().includes('cult'));
          if (selectedNicheFilter === 'tech') return p.niche === 'tech' || (p.slug && p.slug.includes('info')) || (p.name && p.name.toLowerCase().includes('info'));
          if (selectedNicheFilter === 'warning') return p.has_valid_token === false;
          return true;
        });
      }

      // Default to first page if current selection is invalid
      if (!selectedPageId || !pagesList.find(p => p.id === selectedPageId)) {
        selectedPageId = pagesList[0].id;
      }

      // Render Switcher Bar (with Original Logos & Quotas)
      const buttonsHtml = displayList.map(p => {
        const isActive = p.id === selectedPageId;
        return `
          <button class="workspace-tab-btn ${isActive ? 'active' : ''}" onclick="pagesView.selectPage(${p.id})" style="border-radius: 10px; box-shadow: none; padding: 0.55rem 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
            ${renderPageAvatar(p, 36)}
            <div style="text-align: left; min-width: 0;">
              <div style="font-weight: ${isActive ? '700' : '600'}; font-size: 0.85rem; line-height: 1.25; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-primary)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">
                ${escapeHtml(p.name)}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 3px; display: flex; align-items: center; gap: 6px;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">${p.handle || '@' + p.slug}</span>
                <span style="display: inline-block; padding: 1px 5px; border-radius: 4px; background: var(--bg-canvas); font-size: 0.68rem; font-weight: 600; color: ${p.today_published_count >= p.daily_quota ? '#10B981' : 'var(--text-secondary)'};">
                  ${p.today_published_count || 0}/${p.daily_quota || 3}
                </span>
              </div>
            </div>
          </button>
        `;
      }).join('') + `
        <button class="workspace-tab-btn" style="border-style: dashed; color: var(--accent-primary); background: transparent; border-radius: 10px; box-shadow: none; padding: 0.55rem 0.85rem;" onclick="pagesView.openAddModal()">
          <span>+ Connect Page</span>
        </button>
        ${pagesList.length > 4 ? `
          <button class="workspace-tab-btn" style="border: 1px solid var(--border-card); background: var(--bg-canvas); border-radius: 10px; box-shadow: none; padding: 0.55rem 0.85rem; font-weight: 600;" onclick="pagesView.openDirectoryModal()">
            <span>📚 Browse All (${pagesList.length}) →</span>
          </button>
        ` : ''}
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
        contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger); border-radius: 12px; box-shadow: none;">Failed to load page workspace.</div>`;
        return;
      }

      currentWorkspaceData = await res.json();
      renderWorkspace();
    } catch (err) {
      console.warn('[loadPageWorkspace error]:', err);
      contentArea.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger); border-radius: 12px; box-shadow: none;">Error: ${err.message}</div>`;
    }
  }

  function renderWorkspace() {
    const contentArea = document.getElementById('workspace-content-area');
    if (!contentArea || !currentWorkspaceData) return;

    const { page, sources, stockReels, publishedPosts, stats, cadence, recentRuns } = currentWorkspaceData;

    // Format next scan display
    let nextScanText = 'Every 3 Hours';
    if (cadence?.isScanning) {
      nextScanText = 'Scanning Now...';
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
      <!-- 1. Header Card (Minimalist: Page Name, @handle link, and one muted meta line) -->
      <div class="workspace-hero-card">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1.25rem;">
          <div class="flex items-center gap-3.5">
            ${renderPageAvatar(page, 52)}
            <div>
              <div class="flex items-center gap-2.5" style="flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.35rem; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-primary);">
                  ${escapeHtml(page.name)}
                </h3>
                <a href="https://instagram.com/${page.handle ? page.handle.replace('@', '') : ''}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-size: 0.85rem; font-weight: 600; font-family: var(--font-mono); display: inline-flex; align-items: center; gap: 3px;">
                  ${page.handle || '@' + page.slug} ↗
                </a>
                <span class="badge" style="background: var(--bg-card); border: 1px solid var(--border-card); font-size: 0.72rem; text-transform: uppercase; font-weight: 600;">
                  ${page.niche || 'GENERAL'}
                </span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.4;">
                slug: <code>${page.slug}</code> · ${page.post_mode === 'auto' ? '⚡ Autonomous Publishing' : '👁️ Review & Approval'} · Meta Graph API: <span class="status-text ${page.has_valid_token ? 'status-text-success' : 'status-text-danger'}">${page.has_valid_token ? 'Operational' : 'Token Required'}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('watchtower'); watchtowerView.selectPage(${page.id});" title="Open full visual pipeline stepper for this page">
              View Pipeline
            </button>
            <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})" title="Initiate 3-hour intelligence cycle now for this page">
              Execute 3h Cycle Now
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openTokenModal(${page.id})" title="Update Meta Graph API token without touching .env">
              🔑 Update Token
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.testToken(${page.id})" title="Verify Meta API connection">
              Test API Handshake
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${page.id})">
              Settings
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pagesView.deletePage(${page.id})" title="Delete this page" style="color: var(--danger); border-color: var(--border-card);">
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- 2. 4 Stat Cards Grid (Compact, soft elevated shadow, sleek 2px border) -->
      <div class="workspace-metrics-grid">
        
        <!-- Card 1: Daily Publication Pipeline (Orange top border) -->
        <div class="workspace-metric-card" style="border-top: 2px solid var(--accent-primary);">
          <div>
            <div class="workspace-metric-label">Daily Publication Pipeline</div>
            <div class="workspace-metric-val">
              ${stats.todayCount} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">/ ${stats.quotaMax} Reels</span>
            </div>
            <div class="workspace-metric-progress-bar">
              <div class="workspace-metric-progress-fill" style="width: ${stats.quotaPct}%;"></div>
            </div>
          </div>
          <div class="workspace-metric-sub">
            ${stats.remainingQuota} slots remaining today
          </div>
        </div>

        <!-- Card 2: Competitive Surveillance (Green top border) -->
        <div class="workspace-metric-card" style="border-top: 2px solid var(--agent-reposter);">
          <div>
            <div class="workspace-metric-label">Competitive Surveillance</div>
            <div class="workspace-metric-val">
              ${stats.sourcesCount} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">Creators</span>
            </div>
          </div>
          <div class="workspace-metric-sub">
            ${sources.reduce((a, s) => a + (s.synced_posts_count || 0), 0)} reels indexed
          </div>
        </div>

        <!-- Card 3: Curated Content Reservoir (Blue top border) -->
        <div class="workspace-metric-card" style="border-top: 2px solid var(--agent-watchtower);">
          <div>
            <div class="workspace-metric-label">Curated Content Reservoir</div>
            <div class="workspace-metric-val">
              ${stats.stockCount} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">Reels</span>
            </div>
          </div>
          <div class="workspace-metric-sub">
            Ready for dispatch
          </div>
        </div>

        <!-- Card 4: Surveillance Cadence (Indigo top border) -->
        <div class="workspace-metric-card" style="border-top: 2px solid #6366F1;">
          <div>
            <div class="workspace-metric-label">Surveillance Cadence</div>
            <div class="workspace-metric-val" style="color: #6366F1;">
              ${nextScanText}
            </div>
          </div>
          <div class="workspace-metric-sub">
            Every 3h with jitter
          </div>
        </div>

      </div>

      <!-- 3. Sub-Tabs Navigation Bar (Clean: counts as plain muted text, orange underline on active tab) -->
      <div class="workspace-subtabs-nav">
        <div class="workspace-subtab-item ${activeSubtab === 'sources' ? 'active' : ''}" onclick="pagesView.selectSubtab('sources')">
          <span>Monitored Competitors</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${stats.sourcesCount})</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'stock' ? 'active' : ''}" onclick="pagesView.selectSubtab('stock')">
          <span>Curated Content Reservoir</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${stats.stockCount})</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'published' ? 'active' : ''}" onclick="pagesView.selectSubtab('published')">
          <span>Dispatch History & Live Feed</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${stats.publishedCount})</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'branding' ? 'active' : ''}" onclick="pagesView.selectSubtab('branding')">
          <span>Visual Branding & Template</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'rings' ? 'active' : ''}" onclick="pagesView.selectSubtab('rings')">
          <span>Connected Network Rings</span>
        </div>
        <div class="workspace-subtab-item ${activeSubtab === 'audit' ? 'active' : ''}" onclick="pagesView.selectSubtab('audit')">
          <span>Chronos Surveillance Audit</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${recentRuns?.length || 0})</span>
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
    if (activeSubtab === 'branding') {
      return renderBrandingTab(page, currentWorkspaceData.template);
    }
    if (activeSubtab === 'rings') {
      return renderRingsTab(page, currentWorkspaceData.groups);
    }
    if (activeSubtab === 'audit') {
      return renderAuditTab(page, recentRuns, cadence);
    }
    return '';
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 1: Monitored Competitors
  // ─────────────────────────────────────────────────────────────
  function renderSourcesTab(page, sources) {
    const listHtml = sources.length === 0 ? `
      <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none;">
        <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Competitor Accounts Monitored for ${escapeHtml(page.name)}</div>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">Add 2 to 5 high-performing creator accounts in this niche to begin autonomous 3-hour intelligence surveillance.</p>
      </div>
    ` : `
      <div class="card table-container" style="background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none; overflow-x: auto;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 28%;">Creator Profile</th>
              <th style="width: 16%;">Status</th>
              <th style="width: 18%;">Discovered Content</th>
              <th style="width: 24%;">Last Scan</th>
              <th style="text-align: right; width: 14%;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sources.map(s => {
              const lastCheckedText = s.last_checked_at ? new Date(s.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Initial Scan';
              const isHealthy = s.health === 'ok';
              return `
                <tr class="competitor-row">
                  <td style="font-weight: 500; font-family: var(--font-mono);">
                    <div class="flex items-center gap-2">
                      <a href="https://instagram.com/${s.username}" target="_blank" style="text-decoration: none; color: var(--text-primary); font-weight: 500;">
                        @${s.username} <span style="font-size: 0.72rem; color: var(--accent-primary);">↗</span>
                      </a>
                    </div>
                  </td>
                  <td>
                    <span class="status-text ${isHealthy ? 'status-text-success' : 'status-text-warning'}">
                      ${isHealthy ? 'Operational' : 'Attention (' + (s.consecutive_failures || 1) + ')'}
                    </span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.82rem;">
                    ${s.synced_posts_count || 0} reels
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">
                    <div>${lastCheckedText}</div>
                    ${s.last_error ? `<div style="font-size: 0.72rem; color: var(--danger); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">${s.last_error}</div>` : ''}
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                      <button type="button" class="btn btn-sm btn-outline" onclick="pagesView.scanSourceNow(${page.id}, ${s.id}, this)" style="padding: 2px 8px; font-size: 0.75rem; border-radius: 6px; font-weight: 500;">
                        ⚡ Scan Now
                      </button>
                      <button onclick="pagesView.removeCompetitor(${page.id}, ${s.id})" style="background: none; border: none; padding: 0; color: var(--danger); font-size: 0.82rem; cursor: pointer; text-decoration: underline;">
                        Remove Source
                      </button>
                    </div>
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
        <!-- Track New Competitor Source Card -->
        <div class="quick-add-card">
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
            Track New Competitor Source
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Watchtower inspects this creator every 3 hours to discover viral reels for <b>${page.handle || '@' + page.slug}</b>.
          </div>
          <div class="flex gap-2" style="width: 100%; flex-wrap: wrap;">
            <input type="text" id="pw-new-competitor" class="form-input" placeholder="Enter competitor Instagram handle or URL e.g. @rockstargames" style="font-family: var(--font-mono); font-size: 0.85rem; flex: 1; min-width: 260px; border-radius: 8px;">
            <button class="btn btn-primary" onclick="pagesView.addCompetitor(${page.id})" style="white-space: nowrap;">
              Track Competitor Account
            </button>
            <button class="btn btn-secondary" onclick="pagesView.openBulkSourcesModal(${page.id})" style="white-space: nowrap;">
              ⚡ Bulk Add Sources (15-16 Clubs)
            </button>
          </div>
        </div>

        <!-- Creator Table -->
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
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none;">
          <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Curated Reservoir Empty for ${escapeHtml(page.name)}</div>
          <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">
            Watchtower automatically discovers viral reels from your monitored competitor accounts every 3 hours.
          </p>
          <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})">
            Execute Surveillance Cycle Now
          </button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; width: 100%;">
        ${stockReels.map(r => `
          <div class="reservoir-card">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                  Virality: <b style="color: var(--accent-primary); font-weight: 600;">${r.score || 75}</b>
                </span>
                <a href="${r.url}" target="_blank" style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                  #${r.shortcode} ↗
                </a>
              </div>

              <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
                <a href="https://instagram.com/${r.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                  From @${r.source_username || 'competitor'} <span style="color: var(--accent-primary); font-size: 0.72rem;">↗</span>
                </a>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-height: 48px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.65rem;">
                ${r.caption ? r.caption.substring(0, 90) + '...' : 'Instagram Reel discovered via Watchtower surveillance'}
              </div>

              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                Likes: ${(r.like_count || 0).toLocaleString()} · Comments: ${(r.comment_count || 0).toLocaleString()} · Views: ${(r.view_count || 0).toLocaleString()}
              </div>
            </div>

            <div>
              <button class="btn btn-primary btn-sm w-full" onclick="pagesView.postStockReel(${r.id})">
                Post to ${page.slug}
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
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none;">
          <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Dispatches Published Yet to ${escapeHtml(page.name)}</div>
          <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
            Reels dispatched through Telegram Bot (Agent 1) or Watchtower (Agent 2) will appear here with live Instagram permalinks.
          </p>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none; overflow-x: auto;">
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
                <td style="font-weight: 500; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                <td style="font-family: var(--font-mono); font-weight: 500;">
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
                    <a href="${j.permalink}" target="_blank" class="text-link" style="font-size: 0.8rem;">
                      View on Instagram ↗
                    </a>
                  ` : `
                    <span class="status-text status-text-success" style="font-size: 0.8rem;">Live on Feed</span>
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
        <div class="card" style="padding: 3rem; text-align: center; background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none;">
          <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Surveillance Cycles Logged Yet</div>
          <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">
            Watchtower runs every 3 hours with human anti-detection jitter. You can trigger an on-demand cycle below.
          </p>
          <button class="btn btn-primary btn-sm" onclick="pagesView.triggerPageScan(${page.id})">
            Execute Surveillance Cycle Now
          </button>
        </div>
      `;
    }

    return `
      <div class="card table-container" style="background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none; overflow-x: auto;">
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
                <td style="font-weight: 500; font-family: var(--font-mono);">#${run.id}</td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">
                  ${new Date(run.started_at).toLocaleString()}
                </td>
                <td style="color: var(--text-primary); font-size: 0.82rem;">
                  ${run.sources_checked} accounts
                </td>
                <td style="color: var(--agent-watchtower); font-weight: 500; font-size: 0.82rem;">
                  +${run.new_posts} new reels
                </td>
                <td style="text-align: right;">
                  <span class="status-text ${run.errors && run.errors !== '[]' ? 'status-text-warning' : 'status-text-success'}" style="font-size: 0.8rem;">
                    ${run.errors && run.errors !== '[]' ? 'Completed w/ Warnings' : 'Operational'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 5: Visual Branding & Template
  // ─────────────────────────────────────────────────────────────
  function renderBrandingTab(page, template) {
    const tmpl = template || {};
    const preset = tmpl.template_type || page.template_slug || 'neon';
    const accent = tmpl.accent_color || '#00FF66';
    const primary = tmpl.primary_color || '#FFFFFF';
    const bg = tmpl.background_color || '#0D0D12';
    const font = tmpl.font_family || 'Inter';
    const frame = tmpl.frame_style || 'card';
    const watermark = tmpl.watermark_text || page.handle || '@' + page.slug;
    const autoStory = page.auto_story !== 0;
    const autoCross = page.auto_cross_post !== 0;
    const postMode = page.post_mode || 'auto';

    return `
      <div style="width: 100%;">
        <div class="card" style="padding: 1.75rem; background: var(--bg-card); border-radius: 12px; margin-bottom: 1.5rem;">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;">Visual Branding & Video Template Configuration</h3>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
                Agent 3 applies these styles, logos, and companion story layouts uniquely for this channel
              </p>
            </div>
            <span class="status-text status-text-success" style="font-size: 0.78rem;">Active Preset: ${preset.toUpperCase()}</span>
          </div>

          <!-- Preset Selection Grid -->
          <div class="mb-4">
            <label class="form-label font-bold mb-2" style="font-size: 0.82rem; display: block;">Visual Preset Template:</label>
            <div class="template-card-grid">
              <div class="template-card ${preset === 'neon' ? 'selected' : ''}" onclick="pagesView.setBrandingPreset('neon')">
                <div class="template-card-preview" style="background: #000; color: #00FF66; border: 1px solid #00FF66;">⚡ NEON</div>
                <div style="font-weight: 600; font-size: 0.85rem;">Electric Neon</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">EDM, Raves, Concerts</div>
              </div>
              <div class="template-card ${preset === 'video_essay' ? 'selected' : ''}" onclick="pagesView.setBrandingPreset('video_essay')">
                <div class="template-card-preview" style="background: #0D0D12; color: #FFF; border: 1px solid #CCFF00;">📰 EDITORIAL</div>
                <div style="font-weight: 600; font-size: 0.85rem;">Video Essay</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Cult Information, Tech</div>
              </div>
              <div class="template-card ${preset === 'cinema' ? 'selected' : ''}" onclick="pagesView.setBrandingPreset('cinema')">
                <div class="template-card-preview" style="background: #111; color: #E5E5E5; border: 1px solid #777;">🎬 CINEMA</div>
                <div style="font-weight: 600; font-size: 0.85rem;">Cinema Letterbox</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Movies, Series, TV</div>
              </div>
              <div class="template-card ${preset === 'minimal' ? 'selected' : ''}" onclick="pagesView.setBrandingPreset('minimal')">
                <div class="template-card-preview" style="background: #18181B; color: #FAFAFA; border: 1px solid #3F3F46;">💎 MINIMAL</div>
                <div style="font-weight: 600; font-size: 0.85rem;">Minimalist Modern</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Dance, Trends, General</div>
              </div>
            </div>
            <input type="hidden" id="bt-preset-type" value="${preset}">
          </div>

          <!-- Color & Typography Controls -->
          <div class="flex gap-3 mb-3" style="flex-wrap: wrap;">
            <div style="flex: 1; min-width: 140px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Highlight Accent Color</label>
              <input type="color" id="bt-accent-color" class="form-input" value="${accent}" style="height: 38px; padding: 2px 4px;">
            </div>
            <div style="flex: 1; min-width: 140px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Headline Text Color</label>
              <input type="color" id="bt-primary-color" class="form-input" value="${primary}" style="height: 38px; padding: 2px 4px;">
            </div>
            <div style="flex: 1; min-width: 140px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Card / Letterbox Bg</label>
              <input type="color" id="bt-background-color" class="form-input" value="${bg}" style="height: 38px; padding: 2px 4px;">
            </div>
          </div>

          <div class="flex gap-3 mb-4" style="flex-wrap: wrap;">
            <div style="flex: 1; min-width: 180px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Typography Font</label>
              <select id="bt-font-family" class="form-input">
                <option value="Inter" ${font === 'Inter' ? 'selected' : ''}>Inter (Modern Sans)</option>
                <option value="Plus Jakarta Sans" ${font === 'Plus Jakarta Sans' ? 'selected' : ''}>Plus Jakarta Sans (Geometric)</option>
                <option value="Montserrat" ${font === 'Montserrat' ? 'selected' : ''}>Montserrat (Bold Poster)</option>
                <option value="Cinzel" ${font === 'Cinzel' ? 'selected' : ''}>Cinzel (Editorial Serif / Cinematic)</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 180px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Video Framing Style</label>
              <select id="bt-frame-style" class="form-input">
                <option value="card" ${frame === 'card' ? 'selected' : ''}>Card Overlay (Curved Corners)</option>
                <option value="cinema_letterbox" ${frame === 'cinema_letterbox' ? 'selected' : ''}>Cinema Letterbox (2.35:1)</option>
                <option value="fullscreen" ${frame === 'fullscreen' ? 'selected' : ''}>Fullscreen Immersive (9:16)</option>
                <option value="split" ${frame === 'split' ? 'selected' : ''}>Split Screen Layout</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 180px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Watermark / Attribution</label>
              <input type="text" id="bt-watermark" class="form-input" value="${escapeHtml(watermark)}" placeholder="@channel">
            </div>
          </div>

          <!-- Automation Toggles -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1.25rem; margin-top: 1rem;">
            <h4 style="font-size: 0.95rem; font-weight: 600; margin: 0 0 0.75rem 0;">Automation & Story Companion Preferences</h4>
            <div class="flex gap-4 mb-3" style="flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
                <input type="checkbox" id="bt-auto-story" ${autoStory ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                <span>Auto-generate and post companion 9:16 Instagram Story</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
                <input type="checkbox" id="bt-auto-cross-post" ${autoCross ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                <span>Auto-distribute to interconnected Network Ring</span>
              </label>
            </div>
            <div class="form-group mb-4" style="max-width: 320px;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Publishing Mode</label>
              <select id="bt-post-mode" class="form-input">
                <option value="auto" ${postMode === 'auto' ? 'selected' : ''}>Autonomous Publishing (Instant Auto-Post)</option>
                <option value="review" ${postMode === 'review' ? 'selected' : ''}>Review in Telegram Queue First</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <button class="btn btn-primary" onclick="pagesView.saveBrandingSettings(${page.id})">
              💾 Save Branding & Distribution Settings
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function setBrandingPreset(preset) {
    const input = document.getElementById('bt-preset-type');
    if (input) input.value = preset;
    const cards = document.querySelectorAll('#workspace-tab-body .template-card');
    cards.forEach(c => c.classList.remove('selected'));
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('selected');
    }

    const colorMap = {
      neon: { accent: '#00FF66', primary: '#FFFFFF', bg: '#000000', frame: 'card' },
      video_essay: { accent: '#CCFF00', primary: '#FFFFFF', bg: '#0D0D12', frame: 'split' },
      cinema: { accent: '#E5E5E5', primary: '#FFFFFF', bg: '#050505', frame: 'cinema_letterbox' },
      minimal: { accent: '#FAFAFA', primary: '#FFFFFF', bg: '#18181B', frame: 'card' }
    };
    if (colorMap[preset]) {
      const cfg = colorMap[preset];
      const acc = document.getElementById('bt-accent-color');
      const pri = document.getElementById('bt-primary-color');
      const bg = document.getElementById('bt-background-color');
      const frm = document.getElementById('bt-frame-style');
      if (acc) acc.value = cfg.accent;
      if (pri) pri.value = cfg.primary;
      if (bg) bg.value = cfg.bg;
      if (frm) frm.value = cfg.frame;
    }
  }

  async function saveBrandingSettings(pageId) {
    try {
      const templateType = document.getElementById('bt-preset-type')?.value || 'neon';
      const accentColor = document.getElementById('bt-accent-color')?.value || '#00FF66';
      const primaryColor = document.getElementById('bt-primary-color')?.value || '#FFFFFF';
      const backgroundColor = document.getElementById('bt-background-color')?.value || '#0D0D12';
      const fontFamily = document.getElementById('bt-font-family')?.value || 'Inter';
      const frameStyle = document.getElementById('bt-frame-style')?.value || 'card';
      const watermarkText = document.getElementById('bt-watermark')?.value?.trim() || '';

      const autoStory = document.getElementById('bt-auto-story')?.checked ? 1 : 0;
      const autoCrossPost = document.getElementById('bt-auto-cross-post')?.checked ? 1 : 0;
      const postMode = document.getElementById('bt-post-mode')?.value || 'auto';

      // 1. Save template
      const resTmpl = await fetch(`/api/pages/${pageId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: templateType,
          accent_color: accentColor,
          primary_color: primaryColor,
          background_color: backgroundColor,
          font_family: fontFamily,
          frame_style: frameStyle,
          watermark_text: watermarkText
        })
      });
      if (!resTmpl.ok) {
        const err = await resTmpl.json();
        throw new Error(err.error || 'Failed to save template');
      }

      // 2. Update page settings
      const resPage = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: templateType,
          auto_story: autoStory,
          auto_cross_post: autoCrossPost,
          post_mode: postMode
        })
      });
      if (!resPage.ok) {
        const err = await resPage.json();
        throw new Error(err.error || 'Failed to update page toggles');
      }

      app.toast('Visual branding and automation settings saved!', 'success');
      await loadPageWorkspace(pageId);
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Sub-Tab 6: Connected Network Rings
  // ─────────────────────────────────────────────────────────────
  function renderRingsTab(page, groups) {
    const connectedGroups = groups || [];

    const ringsListHtml = connectedGroups.length === 0 ? `
      <div class="card" style="padding: 2.5rem; text-align: center; background: var(--bg-card); width: 100%; border-radius: 10px; box-shadow: none; margin-bottom: 1.5rem;">
        <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Standalone Channel (No Active Network Ring)</div>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">
          Connect this channel to a Network Ring to automatically cross-post published reels across sibling accounts with unique branding, and share competitor surveillance feeds.
        </p>
      </div>
    ` : `
      <div class="card table-container" style="background: var(--bg-card); width: 100%; border-radius: 10px; margin-bottom: 1.5rem; overflow-x: auto;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 28%;">Network Ring</th>
              <th style="width: 18%;">Niche</th>
              <th style="width: 16%;">Ring Role</th>
              <th style="width: 18%;">Member Accounts</th>
              <th style="text-align: right; width: 20%;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${connectedGroups.map(g => {
              const isPrimary = g.role === 'primary';
              return `
                <tr>
                  <td style="font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;">
                    <div style="font-size: 0.9rem; color: var(--text-primary);">${escapeHtml(g.name)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${g.slug}</div>
                  </td>
                  <td>
                    <span class="status-text status-text-info">${escapeHtml(g.niche || 'general')}</span>
                  </td>
                  <td>
                    <span class="status-text ${isPrimary ? 'status-text-success' : 'status-text-info'}">
                      ${isPrimary ? '🌟 Primary Seed' : '🔄 Secondary Member'}
                    </span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.82rem;">
                    ${g.member_count || 1} connected channels
                  </td>
                  <td style="text-align: right;">
                    <button onclick="pagesView.leaveRing(${g.id}, ${page.id})" style="background: none; border: none; padding: 0; color: var(--danger); font-size: 0.82rem; cursor: pointer; text-decoration: underline;">
                      Disconnect from Ring
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    setTimeout(async () => {
      const sel = document.getElementById('ring-join-select');
      if (!sel) return;
      try {
        const res = await fetch('/api/groups');
        if (!res.ok) return;
        const allG = await res.json();
        sel.innerHTML = `
          <option value="">-- Choose a Distribution Ring --</option>
          ${allG.map(g => `<option value="${g.id}">${escapeHtml(g.name)} (${g.niche})</option>`).join('')}
        `;
      } catch (e) {}
    }, 50);

    return `
      <div style="width: 100%;">
        ${ringsListHtml}

        <!-- Connect to Another Ring Card -->
        <div class="quick-add-card" style="margin-bottom: 1.5rem;">
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
            🔗 Connect Channel to a Distribution Ring
          </div>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0;">
            Select a distribution ring to enable automatic cross-pollination and shared competitor scanning.
          </p>

          <div class="flex gap-3 items-center" style="flex-wrap: wrap;">
            <div style="flex: 2; min-width: 200px;">
              <select id="ring-join-select" class="form-input">
                <option value="">Loading available rings...</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 150px;">
              <select id="ring-join-role" class="form-input">
                <option value="member">Secondary Member</option>
                <option value="primary">Primary Seed</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="pagesView.joinRing(${page.id})">
              Join Ring
            </button>
            <button class="btn btn-secondary" onclick="app.navigate('distribution')">
              Manage All Rings ↗
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function joinRing(pageId) {
    const groupSelect = document.getElementById('ring-join-select');
    const roleSelect = document.getElementById('ring-join-role');
    const groupId = groupSelect?.value;
    const role = roleSelect?.value || 'member';

    if (!groupId) {
      app.toast('Please select a Distribution Ring to join', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, role })
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Successfully joined Distribution Ring!', 'success');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to join ring', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  async function leaveRing(groupId, pageId) {
    if (!confirm('Are you sure you want to disconnect this page from this Network Ring?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${pageId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Disconnected from Distribution Ring', 'info');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to leave ring', 'error');
      }
    } catch (err) {
      app.toast('Error: ' + err.message, 'error');
    }
  }

  function selectSubtab(tabName) {
    activeSubtab = tabName;
    renderWorkspace();
  }

  async function triggerPageScan(pageId) {
    app.toast('Initiating 3-hour surveillance cycle for this page...', 'info');
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
        app.toast('Competitor source removed from this page', 'info');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Failed to remove competitor', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function scanSourceNow(pageId, sourceId, btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Scanning...';
    }
    try {
      const res = await fetch(`/api/sources/${sourceId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluate: true })
      });
      const data = await res.json();
      if (data.success) {
        app.toast(`Scan complete: ${data.newPostsCount || 0} new reels added!`, 'success');
        await loadPageWorkspace(pageId);
      } else {
        app.toast(data.error || 'Scan failed', 'warning');
      }
    } catch (err) {
      app.toast('Scan failed: ' + err.message, 'error');
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '⚡ Scan Now';
      }
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
        app.toast('Reel queued and dispatched to publishing pipeline!', 'success');
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
        app.toast(`Meta API Valid! Connected to @${data.username} (${data.accountType || 'BUSINESS'})`, 'success');
      } else {
        app.toast(`Connection Test Failed: ${data.error || 'Invalid API Token'}`, 'error');
      }
    } catch (err) {
      app.toast('Test error: ' + err.message, 'error');
    }
  }

  async function deletePage(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!confirm(`Are you sure you want to delete ${page ? page.name : 'this page'}? This action is irreversible.`)) return;

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.toast('Page deleted successfully', 'info');
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
    document.getElementById('pem-title').textContent = `Configure @${page.slug}`;
    document.getElementById('pem-name').value = page.name || '';
    const logoInput = document.getElementById('pem-logo');
    if (logoInput) {
      logoInput.value = page.brand_logo_path || '';
      previewEditLogo(page.brand_logo_path || getPageLogoUrl(page));
    }
    document.getElementById('pem-slug').value = page.slug || '';
    document.getElementById('pem-username').value = page.handle || page.username || '';
    document.getElementById('pem-ig-user-id').value = page.ig_user_id || '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = page.daily_quota || 3;
    document.getElementById('pem-hashtags').value = page.default_hashtags || '';
    document.getElementById('pem-post-mode').value = page.post_mode || 'review';

    const modal = document.getElementById('page-edit-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function openAddModal() {
    currentEditingPageId = null;
    document.getElementById('pem-title').textContent = 'Connect New Instagram Page';
    document.getElementById('pem-name').value = '';
    const logoInput = document.getElementById('pem-logo');
    if (logoInput) {
      logoInput.value = '';
      previewEditLogo('');
    }
    document.getElementById('pem-slug').value = '';
    document.getElementById('pem-username').value = '';
    document.getElementById('pem-ig-user-id').value = '';
    document.getElementById('pem-token').value = '';
    document.getElementById('pem-quota').value = 3;
    document.getElementById('pem-hashtags').value = '';
    document.getElementById('pem-post-mode').value = 'review';

    const modal = document.getElementById('page-edit-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('page-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  async function saveEditModal() {
    const name = document.getElementById('pem-name')?.value?.trim();
    const logo = document.getElementById('pem-logo')?.value?.trim();
    const slug = document.getElementById('pem-slug')?.value?.trim();
    const handle = document.getElementById('pem-username')?.value?.trim();
    const igUserId = document.getElementById('pem-ig-user-id')?.value?.trim();
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

    if (logo !== undefined) {
      payload.brand_logo_path = logo;
    }

    if (igUserId) {
      payload.ig_user_id = igUserId;
    }

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
        app.toast('Page configuration saved successfully!', 'success');
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

  // ─────────────────────────────────────────────────────────────
  // 5-Step Page Builder Wizard Controller
  // ─────────────────────────────────────────────────────────────
  let wizardCurrentStep = 1;
  let wizardSelectedPreset = 'neon';

  async function openWizardModal() {
    wizardCurrentStep = 1;
    wizardSelectedPreset = 'neon';

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('wz-name', '');
    setVal('wz-handle', '');
    setVal('wz-slug', '');
    setVal('wz-niche', 'concert');
    setVal('wz-region', 'GLOBAL');
    setVal('wz-ig-user-id', '');
    setVal('wz-token', '');
    setVal('wz-watermark', '');
    setVal('wz-quota', '5');
    setVal('wz-spacing', '120');
    setVal('wz-post-mode', 'auto');
    setVal('wz-initial-sources', '');

    const autoStory = document.getElementById('wz-auto-story');
    if (autoStory) autoStory.checked = true;
    const autoCross = document.getElementById('wz-auto-cross-post');
    if (autoCross) autoCross.checked = true;

    const testRes = document.getElementById('wz-test-result');
    if (testRes) testRes.innerHTML = '';

    selectWizardPreset('neon');
    updateWizardUI();
    await populateWizardGroups();

    const modal = document.getElementById('page-wizard-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeWizardModal() {
    const modal = document.getElementById('page-wizard-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  function updateWizardUI() {
    for (let i = 1; i <= 5; i++) {
      const panel = document.getElementById(`wz-step-${i}`);
      const pill = document.getElementById(`wz-step-pill-${i}`);
      if (panel) {
        panel.style.display = (i === wizardCurrentStep) ? 'block' : 'none';
      }
      if (pill) {
        if (i === wizardCurrentStep) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      }
    }

    const prevBtn = document.getElementById('wz-prev-btn');
    if (prevBtn) {
      prevBtn.style.display = wizardCurrentStep > 1 ? 'block' : 'none';
    }

    const nextBtn = document.getElementById('wz-next-btn');
    if (nextBtn) {
      nextBtn.textContent = wizardCurrentStep === 5 ? 'Deploy Channel Network 🚀' : 'Next Step →';
    }
  }

  function nextWizardStep() {
    if (wizardCurrentStep === 1) {
      const name = document.getElementById('wz-name')?.value?.trim();
      const handle = document.getElementById('wz-handle')?.value?.trim();
      if (!name || !handle) {
        app.toast('Please provide both Channel Name and Instagram Handle', 'warning');
        return;
      }
      let slug = document.getElementById('wz-slug')?.value?.trim();
      if (!slug) {
        autoFillWizardSlug(name);
      }
    } else if (wizardCurrentStep === 2) {
      const igUserId = document.getElementById('wz-ig-user-id')?.value?.trim();
      const token = document.getElementById('wz-token')?.value?.trim();
      if (!igUserId || !token) {
        app.toast('Meta Instagram Account ID and Access Token are required', 'warning');
        return;
      }
    }

    if (wizardCurrentStep < 5) {
      wizardCurrentStep++;
      updateWizardUI();
    } else {
      submitWizard();
    }
  }

  function prevWizardStep() {
    if (wizardCurrentStep > 1) {
      wizardCurrentStep--;
      updateWizardUI();
    }
  }

  function autoFillWizardSlug(name) {
    const slugInput = document.getElementById('wz-slug');
    if (slugInput) {
      slugInput.value = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
  }

  function selectWizardPreset(preset) {
    wizardSelectedPreset = preset;
    ['neon', 'video_essay', 'cinema', 'minimal'].forEach(p => {
      const el = document.getElementById(`wz-preset-${p}`);
      if (el) {
        if (p === preset) el.classList.add('selected');
        else el.classList.remove('selected');
      }
    });

    const colorMap = {
      neon: '#00FF66',
      video_essay: '#CCFF00',
      cinema: '#E5E5E5',
      minimal: '#FAFAFA'
    };
    const colorInput = document.getElementById('wz-accent-color');
    if (colorInput && colorMap[preset]) {
      colorInput.value = colorMap[preset];
    }
  }

  async function populateWizardGroups() {
    const groupSelect = document.getElementById('wz-group-select');
    if (!groupSelect) return;

    try {
      const res = await fetch('/api/groups');
      if (!res.ok) return;
      const groups = await res.json();
      groupSelect.innerHTML = `
        <option value="">-- No Network Ring (Standalone Page) --</option>
        ${groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)} (${g.member_count || 0} pages · ${g.niche})</option>`).join('')}
      `;
    } catch (e) {
      console.warn('Failed to load groups for wizard select:', e);
    }
  }

  async function testWizardToken() {
    const token = document.getElementById('wz-token')?.value?.trim();
    const igUserId = document.getElementById('wz-ig-user-id')?.value?.trim();
    const handle = document.getElementById('wz-handle')?.value?.trim();
    const testRes = document.getElementById('wz-test-result');

    if (!token || !igUserId) {
      app.toast('Enter both Account ID and Token to test', 'warning');
      return;
    }

    if (testRes) testRes.innerHTML = '<span style="color: var(--accent-primary);">⏳ Testing Meta handshake...</span>';

    try {
      const res = await fetch('/api/system/validate-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: [{ id: 0, handle: handle || 'test', access_token: token, ig_user_id: igUserId }]
        })
      });
      const data = await res.json();
      const result = data.results && data.results[0];
      if (result && result.valid) {
        if (testRes) testRes.innerHTML = `<span style="color: #10B981; font-weight: 600;">✓ Connected to @${result.username || handle}</span>`;
      } else {
        if (testRes) testRes.innerHTML = `<span style="color: var(--danger); font-weight: 500;">✕ ${result?.error || 'Validation failed'}</span>`;
      }
    } catch (err) {
      if (testRes) testRes.innerHTML = `<span style="color: var(--danger);">✕ ${err.message}</span>`;
    }
  }

  async function submitWizard() {
    const name = document.getElementById('wz-name')?.value?.trim();
    const handle = document.getElementById('wz-handle')?.value?.trim();
    const slug = document.getElementById('wz-slug')?.value?.trim() || handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const niche = document.getElementById('wz-niche')?.value || 'general';
    const region = document.getElementById('wz-region')?.value || 'GLOBAL';
    const igUserId = document.getElementById('wz-ig-user-id')?.value?.trim();
    const token = document.getElementById('wz-token')?.value?.trim();
    const accentColor = document.getElementById('wz-accent-color')?.value || '#00FF66';
    const watermark = document.getElementById('wz-watermark')?.value?.trim() || handle;
    const postMode = document.getElementById('wz-post-mode')?.value || 'auto';
    const quota = parseInt(document.getElementById('wz-quota')?.value || 5, 10);
    const autoStory = document.getElementById('wz-auto-story')?.checked ? 1 : 0;
    const autoCrossPost = document.getElementById('wz-auto-cross-post')?.checked ? 1 : 0;
    const groupId = document.getElementById('wz-group-select')?.value || null;
    const groupRole = document.getElementById('wz-group-role')?.value || 'member';
    const initialSourcesText = document.getElementById('wz-initial-sources')?.value?.trim() || '';

    if (!name || !handle || !token || !igUserId) {
      app.toast('Please fill out all required profile and Meta API fields', 'warning');
      return;
    }

    try {
      app.toast('Deploying channel and configuring distribution network...', 'info');

      const payload = {
        pageData: {
          name,
          handle,
          slug,
          niche,
          region,
          ig_user_id: igUserId,
          access_token: token,
          post_mode: postMode,
          daily_quota: quota,
          auto_story: autoStory,
          auto_cross_post: autoCrossPost,
          template_slug: wizardSelectedPreset
        },
        templateData: {
          template_type: wizardSelectedPreset,
          accent_color: accentColor,
          watermark_text: watermark
        },
        groupId: groupId ? parseInt(groupId, 10) : null,
        groupRole,
        testConnection: false
      };

      const res = await fetch('/api/pages/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to onboard page');
      }

      const createdPage = data.page;

      // Add initial competitor accounts if provided
      if (initialSourcesText && createdPage?.id) {
        const sources = initialSourcesText
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(Boolean);

        for (const s of sources) {
          try {
            await fetch(`/api/pages/${createdPage.id}/sources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: s })
            });
          } catch (e) {
            console.warn('Failed to add initial source:', s, e);
          }
        }
      }

      app.toast(`🎉 Channel @${createdPage.handle} successfully deployed!`, 'success');
      closeWizardModal();
      await loadPages();
      if (createdPage?.id) {
        await selectPage(createdPage.id);
      }
    } catch (err) {
      app.toast('Onboarding error: ' + err.message, 'error');
    }
  }

  function filterPages(query) {
    pageSearchQuery = query ? query.trim() : '';
    loadPages();
  }

  function setNicheFilter(niche) {
    selectedNicheFilter = niche || 'all';
    loadPages();
  }

  function previewEditLogo(url) {
    const preview = document.getElementById('pem-logo-preview');
    if (!preview) return;
    if (url && url.trim()) {
      preview.innerHTML = `<img src="${url.trim()}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='🖼️'" />`;
    } else {
      preview.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">📷</span>';
    }
  }

  function openDirectoryModal() {
    const modal = document.getElementById('page-directory-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
      renderDirectoryGrid();
    }
  }

  function closeDirectoryModal() {
    const modal = document.getElementById('page-directory-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  function filterDirectory(query) {
    directorySearchQuery = query ? query.trim() : '';
    renderDirectoryGrid();
  }

  function setDirectoryNicheFilter(niche) {
    directoryNicheFilter = niche || 'all';
    renderDirectoryGrid();
  }

  function setDirectoryStatusFilter(status) {
    directoryStatusFilter = status || 'all';
    renderDirectoryGrid();
  }

  function setDirectoryViewMode(mode) {
    directoryViewMode = mode;
    const btnGrid = document.getElementById('dir-btn-grid');
    const btnTable = document.getElementById('dir-btn-table');
    if (btnGrid && btnTable) {
      if (mode === 'grid') {
        btnGrid.style.background = 'var(--accent-primary)';
        btnGrid.style.color = 'white';
        btnTable.style.background = 'var(--bg-card)';
        btnTable.style.color = 'var(--text-muted)';
      } else {
        btnTable.style.background = 'var(--accent-primary)';
        btnTable.style.color = 'white';
        btnGrid.style.background = 'var(--bg-card)';
        btnGrid.style.color = 'var(--text-muted)';
      }
    }
    renderDirectoryGrid();
  }

  function renderDirectoryGrid() {
    const container = document.getElementById('directory-pages-container');
    const statsRow = document.getElementById('directory-stats-row');
    if (!container) return;

    // Filter pages
    let list = pagesList.slice();
    if (directorySearchQuery) {
      const q = directorySearchQuery.toLowerCase();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.handle && p.handle.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q)) ||
        (p.niche && p.niche.toLowerCase().includes(q))
      );
    }
    if (directoryNicheFilter !== 'all') {
      list = list.filter(p => {
        if (directoryNicheFilter === 'movies') return p.niche === 'movies' || (p.slug && p.slug.includes('movie')) || (p.name && p.name.toLowerCase().includes('movie'));
        if (directoryNicheFilter === 'gaming') return p.niche === 'gaming' || (p.slug && p.slug.includes('gta')) || (p.name && p.name.toLowerCase().includes('gta'));
        if (directoryNicheFilter === 'concert') return p.niche === 'concert' || (p.slug && (p.slug.includes('club') || p.slug.includes('concert'))) || (p.name && p.name.toLowerCase().includes('cult'));
        if (directoryNicheFilter === 'tech') return p.niche === 'tech' || (p.slug && p.slug.includes('info')) || (p.name && p.name.toLowerCase().includes('info'));
        return true;
      });
    }
    if (directoryStatusFilter !== 'all') {
      if (directoryStatusFilter === 'active') list = list.filter(p => p.has_valid_token !== false);
      if (directoryStatusFilter === 'warning') list = list.filter(p => p.has_valid_token === false);
    }

    // Render Stats
    if (statsRow) {
      const activeCount = pagesList.filter(p => p.has_valid_token !== false).length;
      const warningCount = pagesList.filter(p => p.has_valid_token === false).length;
      const autoCount = pagesList.filter(p => p.post_mode === 'auto').length;
      const todayTotal = pagesList.reduce((acc, p) => acc + (p.today_published_count || 0), 0);

      statsRow.innerHTML = `
        <span class="badge" style="background: var(--bg-canvas); border: 1px solid var(--border-card); font-size: 0.78rem; padding: 4px 10px;">
          📊 <b>${pagesList.length}</b> Connected Channels
        </span>
        <span class="badge" style="background: rgba(16,185,129,0.1); color: #10B981; border: 1px solid rgba(16,185,129,0.25); font-size: 0.78rem; padding: 4px 10px;">
          🟢 <b>${activeCount}</b> Operational
        </span>
        ${warningCount > 0 ? `
          <span class="badge" style="background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); font-size: 0.78rem; padding: 4px 10px;">
            ⚠️ <b>${warningCount}</b> Token Needs Attention
          </span>
        ` : ''}
        <span class="badge" style="background: var(--bg-canvas); border: 1px solid var(--border-card); font-size: 0.78rem; padding: 4px 10px;">
          ⚡ <b>${autoCount}</b> Autonomous
        </span>
        <span class="badge" style="background: var(--bg-canvas); border: 1px solid var(--border-card); font-size: 0.78rem; padding: 4px 10px;">
          🎯 <b>${todayTotal}</b> Reels Published Today
        </span>
      `;
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 600; font-size: 0.95rem;">No channels matched your filters</div>
          <div style="font-size: 0.8rem; margin-top: 4px;">Try clearing your search query or switching niche filters</div>
        </div>
      `;
      return;
    }

    if (directoryViewMode === 'table') {
      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); text-align: left;">
              <th style="padding: 8px 10px;">Channel</th>
              <th style="padding: 8px 10px;">Handle</th>
              <th style="padding: 8px 10px;">Niche</th>
              <th style="padding: 8px 10px;">Status</th>
              <th style="padding: 8px 10px;">Today's Quota</th>
              <th style="padding: 8px 10px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => {
              const isSelected = p.id === selectedPageId;
              const hasToken = p.has_valid_token !== false;
              const quotaMax = p.daily_quota || 3;
              const quotaUsed = p.today_published_count || 0;
              return `
                <tr style="border-bottom: 1px solid var(--border-subtle); ${isSelected ? 'background: var(--accent-soft);' : ''}">
                  <td style="padding: 8px 10px; display: flex; align-items: center; gap: 8px;">
                    ${renderPageAvatar(p, 30)}
                    <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(p.name)}</span>
                  </td>
                  <td style="padding: 8px 10px; font-family: var(--font-mono); color: var(--text-secondary);">
                    ${p.handle || '@' + p.slug}
                  </td>
                  <td style="padding: 8px 10px; text-transform: uppercase; font-size: 0.72rem; color: var(--text-muted);">
                    ${p.niche || 'GENERAL'}
                  </td>
                  <td style="padding: 8px 10px;">
                    <span class="badge" style="font-size: 0.7rem; background: ${hasToken ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${hasToken ? '#10B981' : '#EF4444'};">
                      ${hasToken ? 'Operational' : 'Token Required'}
                    </span>
                  </td>
                  <td style="padding: 8px 10px;">
                    <span style="font-weight: 600;">${quotaUsed}/${quotaMax}</span>
                  </td>
                  <td style="padding: 8px 10px; text-align: right;">
                    <button class="btn btn-primary btn-sm" onclick="pagesView.closeDirectoryModal(); pagesView.selectPage(${p.id});" style="padding: 3px 8px; font-size: 0.75rem;">
                      ${isSelected ? 'Active' : 'Open'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      // Grid Cards
      container.innerHTML = `
        <div class="channel-directory-grid">
          ${list.map(p => {
            const isSelected = p.id === selectedPageId;
            const hasToken = p.has_valid_token !== false;
            const quotaMax = p.daily_quota || 3;
            const quotaUsed = p.today_published_count || 0;
            const quotaPct = Math.min(100, Math.round((quotaUsed / quotaMax) * 100));

            return `
              <div class="channel-directory-card ${isSelected ? 'active-workspace' : ''}">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2.5">
                      ${renderPageAvatar(p, 44)}
                      <div style="min-width: 0;">
                        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">
                          ${escapeHtml(p.name)}
                        </div>
                        <a href="https://instagram.com/${p.handle ? p.handle.replace('@', '') : ''}" target="_blank" onclick="event.stopPropagation()" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: none; font-family: var(--font-mono); display: inline-flex; align-items: center; gap: 2px;">
                          ${p.handle || '@' + p.slug} ↗
                        </a>
                      </div>
                    </div>
                    <span class="badge" style="font-size: 0.68rem; text-transform: uppercase; background: var(--bg-card); border: 1px solid var(--border-card);">
                      ${p.niche || 'GENERAL'}
                    </span>
                  </div>

                  <!-- Quota & Health Row -->
                  <div style="margin: 0.75rem 0 0.5rem 0;">
                    <div class="flex items-center justify-between" style="font-size: 0.72rem; margin-bottom: 3px;">
                      <span style="color: var(--text-muted);">Daily Pipeline Quota</span>
                      <span style="font-weight: 600; color: ${quotaUsed >= quotaMax ? '#10B981' : 'var(--text-primary)'};">${quotaUsed}/${quotaMax} Reels</span>
                    </div>
                    <div style="height: 5px; width: 100%; background: var(--border-subtle); border-radius: 3px; overflow: hidden;">
                      <div style="height: 100%; width: ${quotaPct}%; background: var(--accent-primary); border-radius: 3px;"></div>
                    </div>
                  </div>

                  <!-- Status Line -->
                  <div class="flex items-center justify-between" style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.4rem;">
                    <span>Mode: <b>${p.post_mode === 'auto' ? 'Autonomous' : 'Review'}</b></span>
                    <span style="font-weight: 600; color: ${hasToken ? '#10B981' : '#EF4444'};">
                      ${hasToken ? '● Operational' : '⚠️ Token Required'}
                    </span>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-1.5" style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 0.25rem;">
                  <button class="btn btn-primary btn-sm" onclick="pagesView.closeDirectoryModal(); pagesView.selectPage(${p.id});" style="flex: 1; padding: 4px 8px; font-size: 0.78rem; font-weight: 600;">
                    ${isSelected ? '✓ In Workspace' : '⚡ Open Workspace'}
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="pagesView.openTokenModal(${p.id})" style="padding: 4px 8px; font-size: 0.78rem;" title="Update Meta Token">
                    🔑
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="pagesView.openEditModal(${p.id})" style="padding: 4px 8px; font-size: 0.78rem;" title="Channel Settings">
                    ⚙️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  function openTokenModal(pageId) {
    const page = pagesList.find(p => p.id === pageId);
    if (!page) return;
    const modal = document.getElementById('page-token-modal');
    const channelName = document.getElementById('ptm-channel-name');
    const pageIdInput = document.getElementById('ptm-page-id');
    const tokenInput = document.getElementById('ptm-token');
    const feedback = document.getElementById('ptm-feedback');

    if (channelName) channelName.textContent = `Channel: ${page.name} (${page.handle || '@' + page.slug})`;
    if (pageIdInput) pageIdInput.value = page.id;
    if (tokenInput) tokenInput.value = '';
    if (feedback) {
      feedback.style.display = 'none';
      feedback.textContent = '';
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeTokenModal() {
    const modal = document.getElementById('page-token-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async function submitTokenUpdate() {
    const pageId = document.getElementById('ptm-page-id')?.value;
    const token = document.getElementById('ptm-token')?.value?.trim();
    const feedback = document.getElementById('ptm-feedback');
    const saveBtn = document.getElementById('ptm-save-btn');

    if (!pageId || !token) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = '#FEF2F2';
        feedback.style.color = '#DC2626';
        feedback.textContent = 'Please enter a valid Meta Graph API user token.';
      }
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Validating Meta Graph Handshake...';
    }

    try {
      const res = await fetch(`/api/pages/${pageId}/token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Token validation failed');

      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = '#F0FDF4';
        feedback.style.color = '#16A34A';
        feedback.textContent = `✓ Handshake verified with Meta Graph API! Token stored securely in SQLite database.`;
      }

      window.app?.toast(`Token for page updated and verified successfully!`, 'success');
      setTimeout(() => {
        closeTokenModal();
        loadPages();
      }, 1200);
    } catch (err) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = '#FEF2F2';
        feedback.style.color = '#DC2626';
        feedback.textContent = `Handshake Error: ${err.message}`;
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '⚡ Validate Handshake & Save';
      }
    }
  }

  function openBulkModal() {
    const modal = document.getElementById('page-bulk-modal');
    const list = document.getElementById('bulk-pages-list');
    const count = document.getElementById('bulk-selected-count');
    const selectAll = document.getElementById('bulk-select-all');

    if (selectAll) selectAll.checked = false;
    if (count) count.textContent = '0 selected';

    if (list) {
      list.innerHTML = pagesList.map(p => `
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-radius: 4px; background: var(--bg-card); font-size: 0.78rem; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" class="bulk-page-checkbox" value="${p.id}" onchange="pagesView.updateBulkSelectedCount()">
            <span style="font-weight: 600;">${escapeHtml(p.name)}</span>
            <span style="color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(p.handle || '@' + p.slug)}</span>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Quota: ${p.daily_quota || 3}/day</span>
        </label>
      `).join('');
    }

    onBulkActionChange('resume');

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeBulkModal() {
    const modal = document.getElementById('page-bulk-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  function toggleSelectAllPages(checked) {
    document.querySelectorAll('.bulk-page-checkbox').forEach(cb => {
      cb.checked = checked;
    });
    updateBulkSelectedCount();
  }

  function updateBulkSelectedCount() {
    const checked = document.querySelectorAll('.bulk-page-checkbox:checked');
    const count = document.getElementById('bulk-selected-count');
    if (count) count.textContent = `${checked.length} of ${pagesList.length} selected`;
  }

  function onBulkActionChange(action) {
    const quotaField = document.getElementById('bulk-quota-field');
    const templateField = document.getElementById('bulk-template-field');

    if (quotaField) quotaField.style.display = action === 'set_quota' ? 'block' : 'none';
    if (templateField) templateField.style.display = action === 'set_template' ? 'block' : 'none';
  }

  async function submitBulkAction() {
    const checked = Array.from(document.querySelectorAll('.bulk-page-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    if (checked.length === 0) {
      window.app?.toast('Please select at least one channel', 'warning');
      return;
    }

    const action = document.getElementById('bulk-action-select')?.value || 'resume';
    let value = null;
    if (action === 'set_quota') {
      value = parseInt(document.getElementById('bulk-quota-val')?.value || 5, 10);
    } else if (action === 'set_template') {
      value = document.getElementById('bulk-template-val')?.value || 'neon';
    }

    try {
      const res = await fetch('/api/pages/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: checked, action, value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk operation failed');

      window.app?.toast(data.message || `Bulk update applied to ${checked.length} channels!`, 'success');
      closeBulkModal();
      loadPages();
    } catch (err) {
      window.app?.toast(err.message, 'danger');
    }
  }

  let currentBulkSourcesPageId = null;

  async function openBulkSourcesModal(pageId) {
    currentBulkSourcesPageId = pageId;
    const modal = document.getElementById('page-bulk-sources-modal');
    const scopeSelect = document.getElementById('pbsm-target-scope');
    const textarea = document.getElementById('pbsm-handles');
    if (textarea) textarea.value = '';

    const page = pagesList.find(p => p.id === pageId);
    if (scopeSelect) {
      let optionsHtml = `<option value="page:${pageId}">This Page Only (${escapeHtml(page ? page.handle || '@' + page.slug : 'Active Page')})</option>`;
      try {
        const ringsRes = await fetch('/api/groups');
        if (ringsRes.ok) {
          const rings = await ringsRes.json();
          if (Array.isArray(rings) && rings.length > 0) {
            optionsHtml += '<optgroup label="City Distribution Rings (All Connected Sibling Pages)">';
            for (const r of rings) {
              optionsHtml += `<option value="group:${r.id}">🌐 Ring: ${escapeHtml(r.name)} (${r.member_count || 0} pages)</option>`;
            }
            optionsHtml += '</optgroup>';
          }
        }
      } catch (e) {}
      scopeSelect.innerHTML = optionsHtml;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeBulkSourcesModal() {
    const modal = document.getElementById('page-bulk-sources-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async function submitBulkSources() {
    const textarea = document.getElementById('pbsm-handles');
    const scopeSelect = document.getElementById('pbsm-target-scope');
    const btn = document.getElementById('pbsm-submit-btn');
    const text = textarea ? textarea.value.trim() : '';

    if (!text) {
      window.app?.toast('Please enter at least one Instagram account handle or URL', 'warning');
      return;
    }

    const scopeVal = scopeSelect ? scopeSelect.value : `page:${currentBulkSourcesPageId}`;
    const [targetType, targetId] = scopeVal.split(':');

    const payload = {
      text,
      page_id: targetType === 'page' ? parseInt(targetId, 10) : currentBulkSourcesPageId,
      group_id: targetType === 'group' ? parseInt(targetId, 10) : null,
      scope: targetType === 'group' ? 'group' : 'page'
    };

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Enqueuing Surveillance...';
    }

    try {
      const res = await fetch('/api/sources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add sources');

      window.app?.toast(`Successfully added club sources! Automated surveillance initiated.`, 'success');
      closeBulkSourcesModal();
      if (currentBulkSourcesPageId) {
        await loadPageWorkspace(currentBulkSourcesPageId);
      }
    } catch (err) {
      window.app?.toast(err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Start Surveillance on All Clubs';
      }
    }
  }

  return {
    render,
    selectPage,
    selectSubtab,
    addCompetitor,
    removeCompetitor,
    scanSourceNow,
    postStockReel,
    testToken,
    triggerPageScan,
    deletePage,
    openEditModal,
    openAddModal,
    closeEditModal,
    saveEditModal,
    // Wizard
    openWizardModal,
    closeWizardModal,
    nextWizardStep,
    prevWizardStep,
    autoFillWizardSlug,
    selectWizardPreset,
    testWizardToken,
    submitWizard,
    // Branding & Rings
    setBrandingPreset,
    saveBrandingSettings,
    joinRing,
    leaveRing,
    // Token & Bulk & Search
    filterPages,
    setNicheFilter,
    openDirectoryModal,
    closeDirectoryModal,
    filterDirectory,
    setDirectoryNicheFilter,
    setDirectoryStatusFilter,
    setDirectoryViewMode,
    previewEditLogo,
    openTokenModal,
    closeTokenModal,
    submitTokenUpdate,
    openBulkModal,
    closeBulkModal,
    toggleSelectAllPages,
    updateBulkSelectedCount,
    onBulkActionChange,
    submitBulkAction,
    openBulkSourcesModal,
    closeBulkSourcesModal,
    submitBulkSources,
    refresh: loadPages
  };
})();
