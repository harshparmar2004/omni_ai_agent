/**
 * OmniStudio v7 — Master Published Feed & History View
 * Permanent archival audit trail of all reels published across Agent 1 (Reposter)
 * and Agent 2 (Watchtower) via Meta Graph API v21.0.
 */
window.publishedView = (function() {
  const PAGE_SIZE = 50;
  let currentPage = 0;
  let totalCount = 0;
  let currentJobs = [];
  let selectedPageId = '';
  let selectedAgent = '';
  let searchQuery = '';
  let searchTimeout = null;
  let stats = {
    published_combined: 0,
    total_scraped: 0,
    live_on_instagram: 0,
    total_reels: 0,
    published_reposter: 0,
    published_watchtower: 0
  };

  /**
   * Main render lifecycle hook
   */
  async function render() {
    const container = document.getElementById('view-published');
    if (!container) return;

    // Base scaffold structure
    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between" style="flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0 0 0.2rem 0; letter-spacing: -0.01em;">
            Published Feed & History
          </h2>
          <p class="text-sm text-muted" style="margin: 0;">
            Permanent historical ledger of reels published live to Instagram via Meta Graph API v21.0 across Agent 1 & Agent 2
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" onclick="app.openRepostModal()" style="font-size: 0.78rem;">
            + Repost Reel
          </button>
          <button class="btn btn-secondary btn-sm" onclick="publishedView.refresh()" title="Refresh Published Feed" style="font-size: 0.78rem;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- 1. Top 4 KPI Metric Summary Boxes -->
      <div id="pub-kpi-container" class="pub-kpi-grid">
        ${renderKpiSkeletons()}
      </div>

      <!-- 2. Multi-Filter & Live Search Toolbar -->
      <div class="pub-filter-bar">
        <div class="flex items-center gap-2" style="flex-wrap: wrap; flex: 1;">
          <!-- Target Page Filter -->
          <div style="min-width: 190px;">
            <select id="pub-page-filter" class="form-input" style="font-size: 0.8rem; padding: 6px 10px; width: 100%;" onchange="publishedView.onPageFilterChange(this.value)">
              <option value="">All Connected Pages</option>
              ${(window.app?.pages || []).map(p => `
                <option value="${p.id}" ${String(selectedPageId) === String(p.id) ? 'selected' : ''}>
                  ${escapeHtml(p.name)} (${p.handle || '@' + p.slug})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Agent Origin Filter -->
          <div style="min-width: 175px;">
            <select id="pub-agent-filter" class="form-input" style="font-size: 0.8rem; padding: 6px 10px; width: 100%;" onchange="publishedView.onAgentFilterChange(this.value)">
              <option value="" ${!selectedAgent ? 'selected' : ''}>All Agents (Combined)</option>
              <option value="reposter" ${selectedAgent === 'reposter' ? 'selected' : ''}>Agent 1: Reposter (Telegram)</option>
              <option value="watchtower" ${selectedAgent === 'watchtower' ? 'selected' : ''}>Agent 2: Watchtower (Autonomous)</option>
            </select>
          </div>

          <!-- Live Search Input -->
          <div style="flex: 1; min-width: 220px;">
            <div style="position: relative; display: flex; align-items: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; color: var(--text-muted); pointer-events: none;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                id="pub-search-input"
                class="form-input"
                placeholder="Search caption, creator, shortcode..."
                style="padding-left: 32px; font-size: 0.8rem; width: 100%;"
                value="${escapeHtml(searchQuery)}"
                oninput="publishedView.onSearchInput(this.value)"
              />
              ${searchQuery ? `
                <button onclick="publishedView.clearSearch()" style="position: absolute; right: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;">✕</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Master History Table Container -->
      <div id="pub-table-container">
        <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted);">
          <div class="spinner-sm" style="display: inline-block; margin-bottom: 0.5rem;"></div>
          <div>Loading published reels history...</div>
        </div>
      </div>
    `;

    // Load metrics and table data concurrently
    await Promise.all([loadStats(), loadTableData()]);
  }

  /**
   * Skeletons while stats load
   */
  function renderKpiSkeletons() {
    return [1, 2, 3, 4].map(() => `
      <div class="pub-kpi-card">
        <div class="pub-kpi-label">Loading...</div>
        <div class="pub-kpi-value">--</div>
        <div class="pub-kpi-sub">Updating metric...</div>
      </div>
    `).join('');
  }

  /**
   * Load top 4 operational KPI metrics
   */
  async function loadStats() {
    try {
      let url = '/api/jobs/overview';
      if (selectedPageId) url += `?pageId=${selectedPageId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      stats = await res.json();
      renderKpiBoxes();
    } catch (err) {
      console.warn('[Published loadStats error]:', err);
    }
  }

  /**
   * Render top 4 metric boxes
   */
  function renderKpiBoxes() {
    const container = document.getElementById('pub-kpi-container');
    if (!container) return;

    const combinedPub = stats.published_combined || stats.published_all_time || 0;
    const reposterPub = stats.published_reposter || 0;
    const watchtowerPub = stats.published_watchtower || 0;
    const scrapedTotal = stats.total_scraped || 0;
    const liveIg = stats.live_on_instagram || combinedPub;
    const totalPipeline = stats.total_reels || 0;

    container.innerHTML = `
      <!-- Box 1: Combined Published -->
      <div class="pub-kpi-card" style="border-top: 2px solid var(--accent-primary);">
        <div>
          <div class="pub-kpi-card-header">
            <span class="pub-kpi-label">Combined Published</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="pub-kpi-value" style="color: var(--accent-primary);">
            ${combinedPub.toLocaleString()}
          </div>
        </div>
        <div class="pub-kpi-sub">
          <b>${reposterPub}</b> Reposter · <b>${watchtowerPub}</b> Watchtower
        </div>
      </div>

      <!-- Box 2: Total Scraped -->
      <div class="pub-kpi-card" style="border-top: 2px solid #0284C7;">
        <div>
          <div class="pub-kpi-card-header">
            <span class="pub-kpi-label">Total Scraped</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
          <div class="pub-kpi-value" style="color: #0284C7;">
            ${scrapedTotal.toLocaleString()}
          </div>
        </div>
        <div class="pub-kpi-sub">
          Harvested from surveillance feeds
        </div>
      </div>

      <!-- Box 3: Live on Instagram -->
      <div class="pub-kpi-card" style="border-top: 2px solid #16A34A;">
        <div>
          <div class="pub-kpi-card-header">
            <span class="pub-kpi-label">Live on Instagram</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </div>
          <div class="pub-kpi-value" style="color: #16A34A;">
            ${liveIg.toLocaleString()}
          </div>
        </div>
        <div class="pub-kpi-sub">
          Active reels on connected pages
        </div>
      </div>

      <!-- Box 4: Total Reels in System -->
      <div class="pub-kpi-card" style="border-top: 2px solid #7C3AED;">
        <div>
          <div class="pub-kpi-card-header">
            <span class="pub-kpi-label">Total Pipeline Reels</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.4"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div class="pub-kpi-value" style="color: #7C3AED;">
            ${totalPipeline.toLocaleString()}
          </div>
        </div>
        <div class="pub-kpi-sub">
          Permanent history across all jobs
        </div>
      </div>
    `;
  }

  /**
   * Fetch paginated list of published jobs
   */
  async function loadTableData() {
    const container = document.getElementById('pub-table-container');
    if (!container) return;

    try {
      const offset = currentPage * PAGE_SIZE;
      let url = `/api/jobs?status=published&limit=${PAGE_SIZE}&offset=${offset}`;
      if (selectedPageId) url += `&pageId=${selectedPageId}`;
      if (selectedAgent) url += `&agent=${selectedAgent}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (!res.ok) {
        container.innerHTML = `
          <div class="card" style="padding: 2.5rem; text-align: center; color: var(--accent-danger);">
            Failed to load published history.
          </div>
        `;
        return;
      }

      currentJobs = await res.json();
      const totalHeader = res.headers.get('x-total-count');
      totalCount = totalHeader !== null ? parseInt(totalHeader, 10) : currentJobs.length;

      // Handle edge-case: out of bounds
      if (currentJobs.length === 0 && currentPage > 0 && totalCount > 0) {
        currentPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
        return loadTableData();
      }

      // Update badge in sidebar if present
      const navBadge = document.getElementById('nav-published-badge');
      if (navBadge) navBadge.textContent = totalCount;

      renderTable();
    } catch (err) {
      console.warn('[Published loadTableData error]:', err);
      container.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; color: var(--accent-danger);">
          Error connecting to server.
        </div>
      `;
    }
  }

  /**
   * Render Master History Table
   */
  function renderTable() {
    const container = document.getElementById('pub-table-container');
    if (!container) return;

    const offset = currentPage * PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const startItem = totalCount === 0 ? 0 : offset + 1;
    const endItem = Math.min(offset + currentJobs.length, totalCount);
    const hasPrev = currentPage > 0;
    const hasNext = offset + currentJobs.length < totalCount;

    if (!currentJobs || currentJobs.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 3.5rem; text-align: center; border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: none;">
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.35rem; color: var(--text-primary);">
            No Published Reels Found
          </div>
          <p style="color: var(--text-muted); font-size: 0.84rem; margin: 0 0 1.25rem 0; max-width: 480px; margin-left: auto; margin-right: auto;">
            ${searchQuery || selectedPageId || selectedAgent
              ? 'No records match your active search or filters. Try adjusting your filter parameters.'
              : 'Reels published via Agent 1 (Reposter) or Agent 2 (Watchtower) will appear in this permanent history log.'}
          </p>
          ${searchQuery || selectedPageId || selectedAgent ? `
            <button class="btn btn-secondary btn-sm" onclick="publishedView.resetFilters()">
              Clear Filters
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="app.openRepostModal()">
              + Repost Reel to Instagram
            </button>
          `}
        </div>
      `;
      return;
    }

    const rows = currentJobs.map(j => {
      const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
      const pageHandle = j.page_handle || pageSlug;
      const directUrl = j.permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
      const timeAgo = formatTimeAgo(j.published_at || j.created_at);
      const isWatchtower = j.agent === 'watchtower';

      // Parse media paths
      let mediaArr = [];
      try {
        mediaArr = typeof j.media_paths === 'string' ? JSON.parse(j.media_paths) : (j.media_paths || []);
      } catch (e) {
        mediaArr = [j.media_paths];
      }
      const firstMedia = mediaArr && mediaArr[0] ? String(mediaArr[0]) : '';
      let videoWebUrl = null;
      if (firstMedia && /\.mp4$/i.test(firstMedia)) {
        videoWebUrl = firstMedia.startsWith('/') ? firstMedia : `/${firstMedia}`;
      }

      // Published timestamp formatting
      let pubDateStr = '--';
      if (j.published_at) {
        try {
          const d = new Date(j.published_at);
          pubDateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
                       d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
      }

      const captionClean = j.caption ? j.caption.trim() : 'No caption provided';

      return `
        <tr>
          <!-- 1. Thumbnail Preview -->
          <td style="text-align: center; vertical-align: middle; padding: 0.65rem 0.5rem; width: 70px;">
            <div class="reel-table-thumb-container" onclick="${videoWebUrl ? `app.openVideoModal('${videoWebUrl}')` : `window.open('${directUrl}', '_blank')`}" style="cursor: pointer;" title="Preview Reel #${j.shortcode}">
              <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" />
              <div class="reel-thumb-play-icon">▶</div>
            </div>
          </td>

          <!-- 2. Reel & Target Destination Page -->
          <td style="vertical-align: middle; width: 20%;">
            <div style="margin-bottom: 3px;">
              <a href="${directUrl}" target="_blank" class="text-link" style="font-weight: 700; font-family: var(--font-mono); font-size: 0.84rem;" title="View reel #${j.shortcode}">
                #${j.shortcode} ↗
              </a>
            </div>
            <div style="font-size: 0.8rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); margin-bottom: 2px;">
              ${escapeHtml(pageHandle)}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              ${escapeHtml(j.page_name || 'Instagram Page')}
            </div>
          </td>

          <!-- 3. Origin Agent -->
          <td style="vertical-align: middle; width: 15%;">
            ${isWatchtower ? `
              <span class="agent-tag-watchtower" title="Discovered & posted autonomously via Watchtower">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                Agent 2: Watchtower
              </span>
            ` : `
              <span class="agent-tag-reposter" title="Submitted & queued via Telegram Bot or Repost modal">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                Agent 1: Reposter
              </span>
            `}
          </td>

          <!-- 4. Content & Caption -->
          <td style="vertical-align: middle; width: 33%;">
            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45; max-width: 440px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;" title="${escapeHtml(captionClean)}">
              ${escapeHtml(captionClean)}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              <a href="${j.source_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                Original Source ↗
              </a>
            </div>
          </td>

          <!-- 5. Meta Media ID & Date -->
          <td style="vertical-align: middle; width: 18%;">
            <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">
              ID: ${escapeHtml(j.ig_media_id || 'Meta v21.0')}
            </div>
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
              ${pubDateStr}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              ${timeAgo}
            </div>
          </td>

          <!-- 6. Actions -->
          <td style="vertical-align: middle; text-align: right; width: 14%; white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              ${videoWebUrl ? `
                <button class="btn btn-secondary btn-sm" onclick="app.openVideoModal('${videoWebUrl}')" style="font-size: 0.75rem; padding: 4px 8px;">
                  Preview
                </button>
              ` : ''}
              <a href="${directUrl}" target="_blank" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 4px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                View on IG ↗
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Table Header & Counter Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Showing <b>${startItem}</b> to <b>${endItem}</b> of <b>${totalCount}</b> published reels
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="publishedView.prevPage()" ${!hasPrev ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''} style="font-size: 0.75rem; padding: 4px 10px;">
            ← Previous 50
          </button>
          <span style="font-size: 0.78rem; font-weight: 600; padding: 0 0.35rem; color: var(--text-secondary);">
            Page ${currentPage + 1} of ${totalPages}
          </span>
          <button class="btn btn-secondary btn-sm" onclick="publishedView.nextPage()" ${!hasNext ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''} style="font-size: 0.75rem; padding: 4px 10px;">
            Next 50 →
          </button>
        </div>
      </div>

      <!-- Full-Width End-to-End Table Card -->
      <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: none; width: 100%; margin-bottom: 1.25rem;">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 70px; text-align: center;">Preview</th>
              <th style="width: 20%;">Reel & Target Page</th>
              <th style="width: 15%;">Origin Agent</th>
              <th style="width: 33%;">Caption & Content</th>
              <th style="width: 18%;">Meta ID & Published Date</th>
              <th style="width: 14%; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Bottom Pagination Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); flex-wrap: wrap; gap: 0.75rem;">
          <span style="font-size: 0.78rem; color: var(--text-muted);">
            Showing <b>${startItem}</b> to <b>${endItem}</b> of <b>${totalCount}</b> published reels
          </span>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" onclick="publishedView.prevPage()" ${!hasPrev ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''} style="font-size: 0.78rem;">
              ← Previous 50
            </button>
            <span style="font-size: 0.78rem; font-weight: 600; padding: 0 0.5rem; color: var(--text-secondary);">
              Page ${currentPage + 1} of ${totalPages}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="publishedView.nextPage()" ${!hasNext ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''} style="font-size: 0.78rem;">
              Next 50 →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Filter handlers
   */
  function onPageFilterChange(pageId) {
    selectedPageId = pageId;
    currentPage = 0;
    loadStats();
    loadTableData();
  }

  function onAgentFilterChange(agent) {
    selectedAgent = agent;
    currentPage = 0;
    loadTableData();
  }

  function onSearchInput(val) {
    searchQuery = val || '';
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 0;
      loadTableData();
    }, 280);
  }

  function clearSearch() {
    searchQuery = '';
    const input = document.getElementById('pub-search-input');
    if (input) input.value = '';
    currentPage = 0;
    loadTableData();
  }

  function resetFilters() {
    selectedPageId = '';
    selectedAgent = '';
    searchQuery = '';
    currentPage = 0;
    const pageSelect = document.getElementById('pub-page-filter');
    if (pageSelect) pageSelect.value = '';
    const agentSelect = document.getElementById('pub-agent-filter');
    if (agentSelect) agentSelect.value = '';
    const input = document.getElementById('pub-search-input');
    if (input) input.value = '';
    loadStats();
    loadTableData();
  }

  /**
   * Pagination navigation
   */
  function prevPage() {
    if (currentPage > 0) {
      currentPage--;
      loadTableData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function nextPage() {
    const offset = currentPage * PAGE_SIZE;
    if (offset + currentJobs.length < totalCount) {
      currentPage++;
      loadTableData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Time formatting helper
   */
  function formatTimeAgo(timestamp) {
    if (!timestamp) return '--';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  /**
   * Safe HTML escape
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    render,
    refresh: () => {
      loadStats();
      loadTableData();
    },
    onPageFilterChange,
    onAgentFilterChange,
    onSearchInput,
    clearSearch,
    resetFilters,
    prevPage,
    nextPage
  };
})();

