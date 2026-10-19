/**
 * OmniStudio v7 — Agent 2: Watchtower & Unified Publishing Pipeline
 * Multi-page competitor surveillance, viral discovery, staged review,
 * live in-flight execution, and published feed tracking.
 */
window.watchtowerView = (function() {
  let selectedPageId = null; // null = 'all', or page id integer
  let activeStage = 'review'; // 'sources' | 'discovered' | 'ranked' | 'downloaded' | 'review' | 'active' | 'published' | 'failed'
  let downloadedViewMode = 'table'; // 'table' (default) | 'grid'
  let cachedStatus = null;
  let pipelineSummary = {
    sources: 0,
    discovered: 0,
    ranked: 0,
    downloaded: 0,
    review: 0,
    active: 0,
    published: 0,
    failed: 0
  };

  function getPageIcon(slug) {
    return '';
  }

  async function render() {
    const container = document.getElementById('view-watchtower');
    if (!container) return;

    // Fetch pages if not already in state
    if (!window.app?.pages || window.app.pages.length === 0) {
      try {
        const res = await fetch('/api/pages');
        if (res.ok) window.app.pages = await res.json();
      } catch (e) {}
    }

    // Default to first page if not selected, or keep selection if valid
    const pages = window.app?.pages || [];
    if (selectedPageId === null && pages.length > 0) {
      selectedPageId = pages[0].id;
    }

    container.innerHTML = `
      <!-- 1. Header Bar -->
      <div class="mb-4 flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
        <div class="flex items-center gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Agent 2: Watchtower & Pipeline Engine
              </h2>
              <span id="wt-header-status-badge" class="status-text status-text-info">Active</span>
            </div>
            <p class="text-sm text-muted" style="margin-top: 0.15rem; margin-bottom: 0;">
              Autonomous 24/7 competitor surveillance, AI copywriting, review staging, and Meta live publishing
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="wt-btn-pause-toggle" class="btn btn-secondary btn-sm" onclick="watchtowerView.togglePause()">
            Pause
          </button>
          <button class="btn btn-primary btn-sm" onclick="watchtowerView.runCycle()">
            Run Surveillance Now
          </button>
        </div>
      </div>

      <!-- 2. Multi-Page Selector Bar -->
      <div class="pipeline-page-switcher" id="wt-page-switcher">
        ${renderPageSwitcherPills()}
      </div>

      <!-- 3. Top Interactive Pipeline Stepper -->
      <div class="pipeline-stepper-container" id="wt-stepper-container">
        ${renderStepperHtml()}
      </div>

      <!-- 4. Active Stage Inspection Deck -->
      <div id="wt-stage-deck">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading pipeline data...</div>
      </div>
    `;

    await loadStatus();
    await loadPipelineSummary();
    await renderActiveStage();
  }

  function renderPageSwitcherPills() {
    const pages = window.app?.pages || [];
    const isAll = selectedPageId === null;

    let html = `
      <button class="pipeline-page-pill ${isAll ? 'active' : ''}" onclick="watchtowerView.selectPage(null)">
        <span>All Connected Pages</span>
      </button>
    `;

    pages.forEach(p => {
      const isActive = selectedPageId === p.id;
      html += `
        <button class="pipeline-page-pill ${isActive ? 'active' : ''}" onclick="watchtowerView.selectPage(${p.id})">
          <span>${escapeHtml(p.name)}</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}; margin-left: 4px;">
            ${p.handle || '@' + p.slug}
          </span>
        </button>
      `;
    });

    return html;
  }

  function renderStepperHtml() {
    const s = pipelineSummary;
    const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
    const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

    return `
      <div class="pipeline-stepper-header">
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          <span>Publishing Pipeline Flow for <b>${pageLabel}</b></span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          Cadence: <strong>Every 3 Hours ± Jitter</strong>
        </div>
      </div>

      <div class="pipeline-stepper">
        <!-- Stage 1: Tracking Accounts -->
        <div class="pipeline-step-node ${activeStage === 'sources' ? 'active' : ''}" onclick="watchtowerView.switchStage('sources')" title="Tracked Competitor Accounts">
          <span class="pipeline-step-num">1.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Tracking Accounts</span>
            <span class="pipeline-step-count" id="ps-count-sources">${s.sources} Accounts</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 2: Discovered -->
        <div class="pipeline-step-node ${activeStage === 'discovered' ? 'active' : ''}" onclick="watchtowerView.switchStage('discovered')" title="Raw Discovered Reels">
          <span class="pipeline-step-num">2.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Discovered</span>
            <span class="pipeline-step-count" id="ps-count-discovered">${s.discovered} Ingested</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 3: AI Ranked -->
        <div class="pipeline-step-node ${activeStage === 'ranked' ? 'active' : ''}" onclick="watchtowerView.switchStage('ranked')" title="Viral Scored Reels (≥70)">
          <span class="pipeline-step-num">3.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">AI Ranked</span>
            <span class="pipeline-step-count" id="ps-count-ranked">${s.ranked} Scored</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 4: Downloaded Media -->
        <div class="pipeline-step-node ${activeStage === 'downloaded' ? 'active' : ''}" onclick="watchtowerView.switchStage('downloaded')" title="Downloaded 1080p MP4 media files ready in local storage">
          <span class="pipeline-step-num">4.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Downloaded Media</span>
            <span class="pipeline-step-count" id="ps-count-downloaded" style="font-weight: 600; color: ${s.downloaded > 0 ? 'var(--accent-primary)' : 'inherit'};">${s.downloaded || 0} Ready Files</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 5: Review & Staged -->
        <div class="pipeline-step-node ${activeStage === 'review' ? 'active' : ''} ${s.review > 0 ? 'has-review' : ''}" onclick="watchtowerView.switchStage('review')" title="Staged Reels Awaiting Approval">
          <span class="pipeline-step-num" style="${s.review > 0 && activeStage !== 'review' ? 'color: var(--warning);' : ''}">5.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Review & Staged</span>
            <span class="pipeline-step-count" id="ps-count-review" style="${s.review > 0 ? 'color: var(--warning); font-weight: 700;' : ''}">${s.review} Needs Review</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 6: In-Flight -->
        <div class="pipeline-step-node ${activeStage === 'active' ? 'active' : ''}" onclick="watchtowerView.switchStage('active')" title="Active Downloading & Meta Upload">
          <span class="pipeline-step-num">6.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">In-Flight</span>
            <span class="pipeline-step-count" id="ps-count-active">${s.active} Processing</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 7: Live Published -->
        <div class="pipeline-step-node ${activeStage === 'published' ? 'active' : ''}" onclick="watchtowerView.switchStage('published')" title="Live on Instagram">
          <span class="pipeline-step-num">7.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Live Posts</span>
            <span class="pipeline-step-count" id="ps-count-published" style="color: var(--agent-reposter); font-weight: 600;">${s.published} Live</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 8: Failed / Retries -->
        <div class="pipeline-step-node ${activeStage === 'failed' ? 'active' : ''} ${s.failed > 0 ? 'has-failed' : ''}" onclick="watchtowerView.switchStage('failed')" title="Failed Jobs with 1-Click Retry">
          <span class="pipeline-step-num" style="${s.failed > 0 && activeStage !== 'failed' ? 'color: var(--danger);' : ''}">8.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Retries</span>
            <span class="pipeline-step-count" id="ps-count-failed" style="${s.failed > 0 ? 'color: var(--danger); font-weight: 700;' : ''}">${s.failed} Errors</span>
          </div>
        </div>
      </div>
    `;
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/watchtower/status');
      if (res.ok) {
        cachedStatus = await res.json();
        updateHeaderStatus(cachedStatus);
      }
    } catch (err) {
      console.warn('[Watchtower loadStatus failed]:', err);
    }
  }

  function updateHeaderStatus(status) {
    const badge = document.getElementById('wt-header-status-badge');
    const toggleBtn = document.getElementById('wt-btn-pause-toggle');
    const isPaused = status.paused || status.isPaused;

    if (badge && toggleBtn) {
      if (isPaused) {
        badge.textContent = 'Paused';
        badge.className = 'status-text status-text-danger';
        toggleBtn.textContent = 'Resume';
      } else if (status.isScanning) {
        badge.textContent = 'Scanning';
        badge.className = 'status-text status-text-info';
        toggleBtn.textContent = 'Pause';
      } else {
        badge.textContent = 'Active';
        badge.className = 'status-text status-text-info';
        toggleBtn.textContent = 'Pause';
      }
    }
  }

  async function loadPipelineSummary() {
    try {
      const url = selectedPageId ? `/api/watchtower/pipeline-summary?pageId=${selectedPageId}` : '/api/watchtower/pipeline-summary';
      const res = await fetch(url);
      if (res.ok) {
        pipelineSummary = await res.json();
        updateStepperCounts();
      }
    } catch (err) {
      console.warn('[loadPipelineSummary failed]:', err);
    }
  }

  function updateStepperCounts() {
    const s = pipelineSummary;
    const cSources = document.getElementById('ps-count-sources');
    const cDisc = document.getElementById('ps-count-discovered');
    const cRanked = document.getElementById('ps-count-ranked');
    const cDl = document.getElementById('ps-count-downloaded');
    const cReview = document.getElementById('ps-count-review');
    const cActive = document.getElementById('ps-count-active');
    const cPub = document.getElementById('ps-count-published');
    const cFailed = document.getElementById('ps-count-failed');

    if (cSources) cSources.textContent = `${s.sources} Accounts`;
    if (cDisc) cDisc.textContent = `${s.discovered} Ingested`;
    if (cRanked) cRanked.textContent = `${s.ranked} Scored`;
    if (cDl) cDl.textContent = `${s.downloaded || 0} Ready Files`;
    if (cReview) cReview.textContent = `${s.review} Needs Review`;
    if (cActive) cActive.textContent = `${s.active} Processing`;
    if (cPub) cPub.textContent = `${s.published} Live`;
    if (cFailed) cFailed.textContent = `${s.failed} Errors`;

    // Also update global badge in sidebar
    const qBadge = document.getElementById('nav-queue-badge');
    if (qBadge) qBadge.textContent = s.review || '0';
  }

  async function selectPage(pageId) {
    selectedPageId = pageId;
    const switcher = document.getElementById('wt-page-switcher');
    if (switcher) switcher.innerHTML = renderPageSwitcherPills();

    const stepper = document.getElementById('wt-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    await loadPipelineSummary();
    await renderActiveStage();
  }

  async function switchStage(stageName, pageId) {
    activeStage = stageName;
    if (pageId !== undefined) {
      selectedPageId = pageId;
    }

    const switcher = document.getElementById('wt-page-switcher');
    if (switcher) switcher.innerHTML = renderPageSwitcherPills();

    const stepper = document.getElementById('wt-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    await renderActiveStage();
  }

  async function renderActiveStage() {
    const container = document.getElementById('wt-stage-deck');
    if (!container) return;

    switch (activeStage) {
      case 'sources':
        await renderSourcesStage(container);
        break;
      case 'discovered':
        await renderDiscoveredStage(container);
        break;
      case 'ranked':
        await renderRankedStage(container);
        break;
      case 'downloaded':
        await renderDownloadedStage(container);
        break;
      case 'review':
        await renderReviewStage(container);
        break;
      case 'active':
        await renderActiveStageDeck(container);
        break;
      case 'published':
        await renderPublishedStage(container);
        break;
      case 'failed':
        await renderFailedStage(container);
        break;
      default:
        await renderReviewStage(container);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: Tracking Accounts Deck (Full-Width End-to-End)
  // ─────────────────────────────────────────────────────────────
  async function renderSourcesStage(container) {
    try {
      const url = selectedPageId ? `/api/sources?pageId=${selectedPageId}` : '/api/sources';
      const res = await fetch(url);
      const sources = res.ok ? await res.json() : [];

      const pages = window.app?.pages || [];
      const selectedPage = pages.find(p => p.id === selectedPageId);

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 1: Tracking Accounts</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${sources.length} accounts</span>
            </div>
            <div class="text-sm text-muted">
              Competitor accounts inspected every 3 hours for viral reels targeting <b>${selectedPage ? selectedPage.name : 'all connected pages'}</b>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        <!-- 1. Add Creator to Track Card (Full-Width End-to-End) -->
        <div class="card mb-3" style="padding: 1.25rem 1.5rem; border-radius: 10px; border: 1px solid var(--border-card); box-shadow: none; width: 100%;">
          <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 2px;">+ Add Creator to Track</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Watchtower will scrape, rank, and download high-performing reels from this creator profile.</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="watchtowerView.toggleBulkImport()" style="font-size: 0.76rem;">
              <span id="wt-bulk-toggle-label">Bulk Import Mode</span>
            </button>
          </div>

          <!-- Single Creator Inline Form Row -->
          <div id="wt-single-add-form" style="display: flex; gap: 0.85rem; align-items: flex-end; flex-wrap: wrap; width: 100%;">
            <div style="flex: 2; min-width: 220px;">
              <label class="form-label font-bold" style="font-size: 0.76rem; margin-bottom: 4px; display: block;">Instagram Username (@handle or URL)</label>
              <input type="text" id="wt-add-user" class="form-input" placeholder="e.g. rockstargames or gtanewz" style="height: 38px; font-family: var(--font-mono); font-size: 0.82rem;">
            </div>
            <div style="flex: 1.5; min-width: 200px;">
              <label class="form-label font-bold" style="font-size: 0.76rem; margin-bottom: 4px; display: block;">Target Destination Page</label>
              <select id="wt-add-page" class="form-input" style="height: 38px; font-size: 0.82rem;">
                ${pages.map(p => `<option value="${p.id}" ${selectedPageId === p.id ? 'selected' : ''}>${escapeHtml(p.name)} (@${p.slug})</option>`).join('')}
              </select>
            </div>
            <div style="min-width: 160px;">
              <button class="btn btn-primary" onclick="watchtowerView.addSource()" style="height: 38px; padding: 0 1.25rem; font-size: 0.82rem; white-space: nowrap; width: 100%;">
                Add Single Creator
              </button>
            </div>
          </div>

          <!-- Bulk Import Form Drawer (Collapsible) -->
          <div id="wt-bulk-add-drawer" class="hidden" style="margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <label class="form-label font-bold" style="font-size: 0.76rem; margin-bottom: 4px; display: block;">
              Bulk Import Instagram Usernames (One per line)
            </label>
            <div style="display: flex; gap: 0.85rem; align-items: flex-start; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1; min-width: 280px;">
                <textarea id="wt-bulk-add" class="form-input" rows="3" placeholder="rockstargames&#10;gtanewz&#10;gamingbible" style="font-family: var(--font-mono); font-size: 0.8rem; width: 100%;"></textarea>
              </div>
              <div style="min-width: 180px; display: flex; flex-direction: column; gap: 0.5rem;">
                <button class="btn btn-primary btn-sm" onclick="watchtowerView.bulkAddSources()" style="height: 38px; font-size: 0.82rem; white-space: nowrap;">
                  Bulk Import Creators
                </button>
                <span style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.3;">
                  All imported accounts will be linked to the selected page above.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Tracked Accounts Table Card (Full-Width End-to-End) -->
        <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 10px; border: 1px solid var(--border-card); box-shadow: none; width: 100%;">
          ${sources.length === 0 ? `
            <div style="padding: 3.5rem 1.5rem; text-align: center; color: var(--text-muted);">
              <div style="font-weight: 600; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.25rem;">No Accounts Tracked Yet</div>
              <p style="font-size: 0.82rem; margin: 0 0 1rem 0;">Add creator profiles using the form above to start automated 24/7 discovery.</p>
            </div>
          ` : `
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 24%;">Creator Profile</th>
                  <th style="width: 20%;">Target Destination</th>
                  <th style="width: 15%;">Synced Reels</th>
                  <th style="width: 15%;">Last Checked</th>
                  <th style="width: 14%;">Health</th>
                  <th style="width: 12%; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sources.map(s => {
                  const pageSlug = s.page_slug ? `@${s.page_slug}` : (s.page_id ? `@page#${s.page_id}` : 'General');
                  const lastChecked = s.last_checked_at ? formatTimeAgo(s.last_checked_at) : 'Pending';
                  const isHealthy = s.health === 'ok';

                  return `
                    <tr>
                      <td>
                        <a href="https://instagram.com/${s.username}" target="_blank" class="text-link" style="font-weight: 600; font-family: var(--font-mono); font-size: 0.84rem;">
                          @${s.username} ↗
                        </a>
                      </td>
                      <td>
                        <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary);">${pageSlug}</div>
                      </td>
                      <td style="font-size: 0.82rem; color: var(--text-secondary);">
                        ${s.synced_posts_count || 0} reels
                      </td>
                      <td style="font-size: 0.78rem; color: var(--text-muted);">
                        ${lastChecked}
                      </td>
                      <td>
                        <span class="status-text ${isHealthy ? 'status-text-success' : 'status-text-warning'}">
                          ${isHealthy ? 'Operational' : 'Attention'}
                        </span>
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        <button class="btn btn-secondary btn-sm" onclick="watchtowerView.checkSource(${s.id})" style="font-size: 0.74rem; padding: 2px 8px;">
                          Inspect
                        </button>
                        <button onclick="watchtowerView.deleteSource(${s.id})" style="background: none; border: none; padding: 0; color: var(--danger); font-size: 0.78rem; cursor: pointer; text-decoration: underline; margin-left: 10px;">
                          Remove
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      `;
    } catch (err) {
      console.warn('[renderSourcesStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: Discovered Raw Candidate Reels Deck
  // ─────────────────────────────────────────────────────────────
  async function renderDiscoveredStage(container) {
    try {
      let query = '?limit=40';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/discoveries${query}`);
      const posts = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 2: Raw Discovered Reels</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${posts.length} ingested</span>
            </div>
            <div class="text-sm text-muted">
              Fresh candidate reels harvested across competitor surveillance feeds
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${posts.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Discovered Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">
              Execute a surveillance cycle to discover viral reels across your monitored accounts.
            </p>
            <button class="btn btn-primary btn-sm" onclick="watchtowerView.runCycle()">
              Execute Surveillance Cycle Now
            </button>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem;">
            ${posts.map(p => `
              <div class="card" style="background: var(--bg-card); border-radius: 10px; padding: 1rem; border: 1px solid var(--border-card); display: flex; flex-direction: column; justify-content: space-between; box-shadow: none;">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                      Virality: <b style="color: var(--accent-primary); font-weight: 700;">${Math.round(p.score || 70)}</b>
                    </span>
                    <a href="${p.url}" target="_blank" style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                      #${p.shortcode} ↗
                    </a>
                  </div>

                  <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
                    <a href="https://instagram.com/${p.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                      From @${p.source_username || 'creator'} <span style="color: var(--accent-primary); font-size: 0.72rem;">↗</span>
                    </a>
                  </div>

                  <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; max-height: 48px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.75rem;">
                    ${p.caption ? p.caption.substring(0, 85) + '...' : 'Instagram Reel discovered via Watchtower surveillance'}
                  </div>

                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                    Likes: ${(p.like_count || 0).toLocaleString()} · Comments: ${(p.comment_count || 0).toLocaleString()} · Views: ${(p.view_count || 0).toLocaleString()}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button class="btn btn-primary btn-sm w-full" onclick="watchtowerView.postDiscovery(${p.id})">
                    Dispatch to Pipeline
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="watchtowerView.skipDiscovery(${p.id})" title="Skip this reel">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderDiscoveredStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: AI Ranked & Scored Candidate Reels Deck
  // ─────────────────────────────────────────────────────────────
  async function renderRankedStage(container) {
    try {
      let query = '?limit=40';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/discoveries${query}`);
      const allPosts = res.ok ? await res.json() : [];
      // Filter by score >= 70
      const rankedPosts = allPosts.filter(p => (p.score || 0) >= 70);

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 3: AI Ranked & Scored</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${rankedPosts.length} high virality</span>
            </div>
            <div class="text-sm text-muted">
              Reels meeting the virality engagement threshold (Score ≥ 70) ready for staging
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${rankedPosts.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No High-Virality Reels Ranked Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              Watchtower evaluates reels every 3 hours. Candidate reels scoring 70+ will appear here automatically.
            </p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem;">
            ${rankedPosts.map(p => `
              <div class="reservoir-card">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                      Virality Score: <b style="color: var(--success); font-weight: 700;">${Math.round(p.score)}</b>
                    </span>
                    <a href="${p.url}" target="_blank" style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); text-decoration: none;">
                      #${p.shortcode} ↗
                    </a>
                  </div>

                  <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
                    <a href="https://instagram.com/${p.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                      From @${p.source_username || 'creator'} <span style="color: var(--accent-primary); font-size: 0.72rem;">↗</span>
                    </a>
                  </div>

                  <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; max-height: 48px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.75rem;">
                    ${p.caption ? p.caption.substring(0, 85) + '...' : 'Instagram Reel discovered via Watchtower surveillance'}
                  </div>

                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                    Likes: ${(p.like_count || 0).toLocaleString()} · Comments: ${(p.comment_count || 0).toLocaleString()} · Views: ${(p.view_count || 0).toLocaleString()}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button class="btn btn-primary btn-sm w-full" onclick="watchtowerView.postDiscovery(${p.id})">
                    Dispatch Reel
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="watchtowerView.skipDiscovery(${p.id})" title="Skip">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderRankedStage error]:', err);
    }
  }

  function parseCaptionComponents(caption = '') {
    if (!caption) {
      return {
        hook: 'No caption generated yet',
        credit: 'Pending AI attribution',
        cta: 'Follow for updates',
        hashtags: [],
        raw: ''
      };
    }

    const lines = caption.split('\n').map(l => l.trim()).filter(Boolean);
    const hashtags = caption.match(/#[a-zA-Z0-9_]+/g) || [];
    const creditLine = lines.find(l => /credit|thanks|via|shoutout|original/i.test(l)) || '';
    const ctaLine = lines.find(l => /follow|stay tuned|subscribe|more gta/i.test(l)) || '';
    const hookLine = lines.find(l => !l.startsWith('#') && l !== creditLine && l !== ctaLine) || lines[0] || 'Instagram Reel Clip';

    return {
      hook: hookLine,
      credit: creditLine || 'Creator attribution included',
      cta: ctaLine || 'Page follow CTA included',
      hashtags,
      raw: caption
    };
  }

  function getStatusBadge(status) {
    if (window.app && window.app.renderStatusText) {
      return window.app.renderStatusText(status);
    }
    return `<span class="status-text status-text-muted">${escapeHtml(status)}</span>`;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: Downloaded Media Repository Deck (Table Default + Grid Toggle)
  // ─────────────────────────────────────────────────────────────
  function setDownloadedViewMode(mode) {
    downloadedViewMode = mode;
    const container = document.getElementById('wt-stage-deck');
    if (container && activeStage === 'downloaded') {
      renderDownloadedStage(container);
    }
  }

  async function renderDownloadedStage(container) {
    try {
      let query = '?hasMedia=true&limit=60';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
      const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

      container.innerHTML = `
        <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 4: Downloaded Media Repository</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${jobs.length} reels</span>
            </div>
            <div class="text-sm text-muted">
              Locally downloaded 1080p MP4 clips with verified media paths, AI copy breakdown, and publication tracking for <b>${pageLabel}</b>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- View Mode Switcher: Table View (Default) vs Grid Cards -->
            <div class="view-mode-switcher">
              <button class="view-mode-btn ${downloadedViewMode === 'table' ? 'active' : ''}" onclick="watchtowerView.setDownloadedViewMode('table')" title="Table View (Rows & Columns)">
                <span>Table View</span>
              </button>
              <button class="view-mode-btn ${downloadedViewMode === 'grid' ? 'active' : ''}" onclick="watchtowerView.setDownloadedViewMode('grid')" title="Grid Cards View">
                <span>Grid Cards</span>
              </button>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
              Refresh
            </button>
          </div>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Downloaded Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; max-width: 480px; margin: 0 auto 1.25rem auto;">
              When candidate reels pass AI ranking and enter the download queue, their 1080p MP4 videos are downloaded to local storage and indexed here in organized rows and columns.
            </p>
            <button class="btn btn-primary btn-sm" onclick="watchtowerView.switchStage('ranked')">
              View AI Ranked Reels
            </button>
          </div>
        ` : (downloadedViewMode === 'table' ? `
          <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 12px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 68px; text-align: center;">Preview</th>
                  <th style="width: 14%;">Reel / ID</th>
                  <th style="width: 13%;">Destination</th>
                  <th style="width: 15%;">Format & Storage</th>
                  <th style="width: 26%;">AI Caption & Attribution</th>
                  <th style="width: 14%;">Status & Time</th>
                  <th style="width: 14%; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => renderDownloadedTableRow(j)).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="downloaded-media-grid">
            ${jobs.map(j => renderDownloadedCardHtml(j)).join('')}
          </div>
        `)}
      `;
    } catch (err) {
      console.warn('[renderDownloadedStage error]:', err);
      container.innerHTML = `<div class="card" style="color: var(--danger); padding: 2rem;">Failed to load downloaded media: ${err.message}</div>`;
    }
  }

  function renderDownloadedTableRow(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const agentText = j.agent === 'watchtower' ? 'Watchtower' : 'Reposter';

    const parsed = parseCaptionComponents(j.caption);
    const timeStr = j.published_at ?
      `Published ${formatTimeAgo(j.published_at)}` :
      `Created ${formatTimeAgo(j.created_at)}`;

    // Parse media paths
    let mediaArr = [];
    try {
      mediaArr = typeof j.media_paths === 'string' ? JSON.parse(j.media_paths) : (j.media_paths || []);
    } catch (e) {
      mediaArr = [j.media_paths];
    }
    const mediaCount = Array.isArray(mediaArr) ? mediaArr.length : 1;
    const mediaTypeLabel = (j.media_type || 'reel').toUpperCase();

    // Short path preview
    const firstPath = Array.isArray(mediaArr) && mediaArr[0] ? String(mediaArr[0]) : '';
    const filename = firstPath.split(/[\\/]/).pop() || 'media.mp4';
    const isReel = (j.media_type === 'reel' || !j.media_type);

    return `
      <tr>
        <!-- 1. Glimpse / Photo Snapshot Preview -->
        <td style="text-align: center; vertical-align: middle; padding: 0.55rem 0.5rem;">
          <a href="${j.source_url}" target="_blank" class="reel-table-thumb-container" title="Open ${j.shortcode || 'reel'} on Instagram">
            <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" />
            ${isReel ? '<div class="reel-thumb-play-icon">▶</div>' : ''}
          </a>
        </td>

        <!-- 2. Reel ID & Source Link -->
        <td>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">#${j.id}</span>
            <span style="margin: 0 4px; color: var(--border-subtle);">·</span>
            <span>${agentText}</span>
          </div>
          <a href="${j.source_url}" target="_blank" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; color: var(--accent-primary); text-decoration: none;" title="${j.source_url}">
            ${j.shortcode ? `/reel/${j.shortcode}` : 'Source'} ↗
          </a>
        </td>

        <!-- 3. Target Destination Page -->
        <td>
          <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); margin-bottom: 2px;">${pageSlug}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${j.page_name || 'Instagram Page'}</div>
        </td>

        <!-- 4. Format & Local Storage -->
        <td>
          <div style="font-size: 0.76rem; color: var(--text-primary); font-weight: 600; margin-bottom: 2px;">1080p MP4 Ready</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstPath}">
            ${filename}
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 1px;">${mediaTypeLabel} (${mediaCount} item)</div>
        </td>

        <!-- 5. AI Caption Breakdown -->
        <td style="max-width: 280px;">
          <div style="font-weight: 600; font-size: 0.78rem; color: var(--text-primary); margin-bottom: 2px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(parsed.hook)}">
            ${escapeHtml(parsed.hook)}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            Creator credit included ${parsed.credit ? '· ' + escapeHtml(parsed.credit) : ''}
          </div>
          <div style="font-size: 0.7rem; color: var(--accent-primary); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${parsed.hashtags.length > 0 ? parsed.hashtags.slice(0, 4).join(' ') + (parsed.hashtags.length > 4 ? ` +${parsed.hashtags.length - 4}` : '') : '—'}
          </div>
        </td>

        <!-- 6. Status & Timestamp -->
        <td>
          <div class="mb-1">${app.renderStatusText ? app.renderStatusText(j.status) : getStatusBadge(j.status)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${timeStr}</div>
        </td>

        <!-- 7. Actions -->
        <td style="text-align: right;">
          ${j.permalink ? `
            <a href="${j.permalink}" target="_blank" class="text-link" style="white-space: nowrap;">
              View on Instagram ↗
            </a>
          ` : (j.status === 'pending_review' || j.status === 'ready' ? `
            <button class="btn btn-primary btn-sm" onclick="watchtowerView.approveJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
              Publish Live
            </button>
          ` : (j.status === 'failed' ? `
            <button class="btn btn-secondary btn-sm" onclick="watchtowerView.retryJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
              Retry
            </button>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${j.current_step || 'processing'}</span>
          `))}
        </td>
      </tr>
    `;
  }

  function renderDownloadedCardHtml(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const agentText = j.agent === 'watchtower' ? 'Watchtower' : 'Reposter';

    const parsed = parseCaptionComponents(j.caption);
    const timeStr = j.published_at ?
      `Published ${formatTimeAgo(j.published_at)}` :
      `Created ${formatTimeAgo(j.created_at)}`;

    // Parse media paths
    let mediaArr = [];
    try {
      mediaArr = typeof j.media_paths === 'string' ? JSON.parse(j.media_paths) : (j.media_paths || []);
    } catch (e) {
      mediaArr = [j.media_paths];
    }
    const mediaCount = Array.isArray(mediaArr) ? mediaArr.length : 1;
    const mediaTypeLabel = (j.media_type || 'reel').toUpperCase();

    // Short path preview
    const firstPath = Array.isArray(mediaArr) && mediaArr[0] ? String(mediaArr[0]) : '';
    const filename = firstPath.split(/[\\/]/).pop() || 'media.mp4';
    const isReel = (j.media_type === 'reel' || !j.media_type);

    return `
      <div class="downloaded-media-card">
        <div>
          <!-- Glimpse Photo Snapshot Preview in Grid -->
          <a href="${j.source_url}" target="_blank" class="downloaded-media-thumb-preview" title="Open reel ${j.shortcode}">
            <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" loading="lazy" />
            ${isReel ? '<div class="reel-thumb-play-icon" style="width: 24px; height: 24px; font-size: 11px; bottom: 8px; right: 8px;">▶</div>' : ''}
          </a>

          <!-- Header Bar -->
          <div class="downloaded-media-header">
            <div class="flex items-center gap-2">
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">#${j.id}</span>
              <span style="font-weight: 700; font-size: 0.85rem; font-family: var(--font-mono); color: var(--text-primary);">${pageSlug}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${agentText}</span>
          </div>

          <!-- Reel Link & Source Info -->
          <div style="margin-bottom: 0.65rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.15rem;">Instagram Reel Source:</div>
            <a href="${j.source_url}" target="_blank" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600; color: var(--accent-primary); text-decoration: none; word-break: break-all;">
              ${j.shortcode ? `/reel/${j.shortcode}` : j.source_url.substring(0, 38) + '...'} ↗
            </a>
          </div>

          <!-- Verified Local Media Details -->
          <div class="downloaded-media-fileinfo">
            <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
              <span style="font-weight: 600; color: var(--text-primary); font-size: 0.76rem;">1080p MP4 Ready</span>
              <span style="font-size: 0.68rem; font-family: var(--font-mono); color: var(--text-muted);">${mediaTypeLabel} (${mediaCount} item)</span>
            </div>
            <div style="color: var(--text-muted); font-size: 0.72rem; font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstPath}">
              storage/reels/${filename}
            </div>
          </div>

          <!-- AI Caption Breakdown -->
          <div class="downloaded-caption-box">
            <div style="margin-bottom: 0.45rem;">
              <span style="font-weight: 600; color: var(--text-primary); font-size: 0.78rem;">
                ${escapeHtml(parsed.hook)}
              </span>
            </div>

            <div style="margin-bottom: 0.45rem;">
              <span style="color: var(--text-muted); font-size: 0.74rem;">
                Creator credit included ${parsed.credit ? '· ' + escapeHtml(parsed.credit) : ''}
              </span>
            </div>

            <div style="margin-bottom: 0.45rem;">
              <span style="color: var(--text-secondary); font-size: 0.74rem;">
                ${escapeHtml(parsed.cta)}
              </span>
            </div>

            <div>
              <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-primary);">
                ${parsed.hashtags.length > 0 ? parsed.hashtags.slice(0, 5).join(' ') + (parsed.hashtags.length > 5 ? ` +${parsed.hashtags.length - 5}` : '') : '—'}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer / Action Row -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-top: 0.5rem;">
          <div class="flex items-center justify-between mb-2">
            <div>${getStatusBadge(j.status)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${timeStr}</div>
          </div>

          <div class="flex items-center gap-2">
            ${j.permalink ? `
              <a href="${j.permalink}" target="_blank" class="btn btn-secondary btn-sm w-full" style="text-decoration: none; justify-content: center; font-size: 0.78rem; color: var(--accent-primary); font-weight: 600;">
                View on Instagram ↗
              </a>
            ` : (j.status === 'pending_review' || j.status === 'ready' ? `
              <button class="btn btn-primary btn-sm w-full" onclick="watchtowerView.approveJob(${j.id})">
                Publish Live Now
              </button>
            ` : (j.status === 'failed' ? `
              <button class="btn btn-secondary btn-sm w-full" onclick="watchtowerView.retryJob(${j.id})">
                Retry Job
              </button>
            ` : `
              <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; width: 100%;">
                In Pipeline (${j.current_step || j.status})
              </div>
            `))}
          </div>
        </div>
      </div>
    `;
  }


  // ─────────────────────────────────────────────────────────────
  // STAGE 5: Review & Staged Deck (Replaces Standalone Queue!)
  // ─────────────────────────────────────────────────────────────
  async function renderReviewStage(container) {
    try {
      let query = '?status=pending_review';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 5: Review & Staged Reels</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${jobs.length} staged</span>
            </div>
            <div class="text-sm text-muted">
              Inspect AI copywritten captions, review attribution tags, and approve for live Instagram publishing
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Review Queue Empty</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              No reels currently pending manual operator review. Incoming reels will appear here for 1-click approval.
            </p>
          </div>
        ` : `
          <div>
            ${jobs.map(j => {
              const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
              const initialCaption = j.caption || '';
              const initialLen = initialCaption.length;
              const initialTags = (initialCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;

              return `
                <div class="review-reel-card">
                  <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
                    <div class="flex items-center gap-2">
                      <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">#${j.id}</span>
                      <span style="font-weight: 600; font-size: 0.95rem;">Target: ${pageSlug}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">• ${j.agent === 'watchtower' ? 'Watchtower' : 'Reposter'}</span>
                    </div>
                    <a href="${j.source_url}" target="_blank" style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--accent-primary); text-decoration: none;">
                      ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Link'} ↗
                    </a>
                  </div>

                  <div class="form-group mb-2">
                    <div class="flex items-center justify-between mb-1">
                      <label class="form-label font-bold" style="font-size: 0.78rem; margin: 0;">
                        Review & Edit Caption Before Publishing Live
                      </label>
                      <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                        Hashtags: <span id="q-tags-${j.id}" style="color: var(--accent-primary); font-weight: 600;">${initialTags}</span>/30 • 
                        Chars: <span id="q-len-${j.id}" style="color: var(--accent-primary); font-weight: 600;">${initialLen}</span>/2200
                      </div>
                    </div>
                    <textarea id="q-caption-${j.id}" class="form-input" rows="4" style="font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.45;" oninput="watchtowerView.onCaptionInput(${j.id})">${escapeHtml(initialCaption)}</textarea>
                  </div>

                  <div class="flex items-center justify-between mt-3" style="flex-wrap: wrap; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" onclick="watchtowerView.deleteJob(${j.id})" style="color: var(--danger);">
                      Discard Reel
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="watchtowerView.approveJob(${j.id})">
                      Approve & Publish Live Now
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderReviewStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 6: In-Flight Processing Deck
  // ─────────────────────────────────────────────────────────────
  async function renderActiveStageDeck(container) {
    try {
      let query = '?status=queued,downloading,ready,publishing';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 6: In-Flight Execution</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${jobs.length} active</span>
            </div>
            <div class="text-sm text-muted">
              Live worker pipeline downloading 1080p MP4, crafting AI captions, and publishing Meta containers
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Pipeline Idle</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              No downloading, AI copywriting, or Meta uploading jobs in progress right now.
            </p>
          </div>
        ` : `
          <div class="card table-container" style="padding: 0; overflow: hidden; border-radius: 10px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Destination Page</th>
                  <th>Source Reel</th>
                  <th>Status</th>
                  <th>Current Step</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => {
                  const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
                  const statusHtml = app.renderStatusText ? app.renderStatusText(j.status) : `<span class="status-text status-text-info">${escapeHtml(j.status)}</span>`;
                  return `
                    <tr>
                      <td style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                      <td style="font-weight: 600; font-family: var(--font-mono);">${pageSlug}</td>
                      <td>
                        <a href="${j.source_url}" target="_blank" style="font-family: var(--font-mono); text-decoration: none; color: var(--accent-primary);">
                          ${j.shortcode || 'Link'} ↗
                        </a>
                      </td>
                      <td>
                        ${statusHtml}
                      </td>
                      <td style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-mono);">
                        ${j.current_step || 'in-progress'}
                      </td>
                      <td style="text-align: right;">
                        <button class="btn btn-secondary btn-sm" onclick="watchtowerView.deleteJob(${j.id})" style="font-size: 0.72rem; padding: 2px 7px; color: var(--danger);">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderActiveStageDeck error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 7: Live Published Feed Deck
  // ─────────────────────────────────────────────────────────────
  async function renderPublishedStage(container) {
    try {
      let query = '?status=published&limit=30';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/jobs${query}`);
      const posts = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 7: Live Published Feed</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${posts.length} live reels</span>
            </div>
            <div class="text-sm text-muted">
              Live dispatches confirmed on Instagram feed with direct permalinks
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${posts.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Published Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              Reels published via Watchtower or Telegram Bot will appear here with live Instagram links.
            </p>
          </div>
        ` : `
          <div class="card table-container" style="padding: 0; overflow: hidden; border-radius: 10px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 10%;">Job ID</th>
                  <th style="width: 18%;">Destination</th>
                  <th style="width: 16%;">Reel Shortcode</th>
                  <th style="width: 20%;">Dispatch Time</th>
                  <th style="width: 22%;">Caption Excerpt</th>
                  <th style="text-align: right; width: 14%;">Instagram Feed</th>
                </tr>
              </thead>
              <tbody>
                ${posts.map(j => {
                  const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
                  const time = j.published_at ? new Date(j.published_at).toLocaleString() : 'Recently';
                  return `
                    <tr>
                      <td style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
                      <td style="font-weight: 600; font-family: var(--font-mono);">${pageSlug}</td>
                      <td style="font-family: var(--font-mono);">
                        <a href="${j.source_url || '#'}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                          ${j.shortcode || 'Link'} ↗
                        </a>
                      </td>
                      <td style="color: var(--text-secondary); font-size: 0.8rem;">
                        ${time}
                      </td>
                      <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: var(--text-secondary);">
                        ${j.caption ? j.caption.substring(0, 55) + '...' : '—'}
                      </td>
                      <td style="text-align: right;">
                        ${j.permalink ? `
                          <a href="${j.permalink}" target="_blank" class="text-link" style="font-size: 0.8rem; font-weight: 500;">
                            View Live ↗
                          </a>
                        ` : `
                          <span class="status-text status-text-success" style="font-size: 0.78rem; font-weight: 500;">Live on Feed</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderPublishedStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 8: Failed / Deadletter Deck
  // ─────────────────────────────────────────────────────────────
  async function renderFailedStage(container) {
    try {
      let query = '?status=failed';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 8: Failed & Retries</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">${jobs.length} errors</span>
            </div>
            <div class="text-sm text-muted">
              Diagnose pipeline errors and trigger 1-click retry attempts
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 10px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Zero Failed Jobs</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              The publishing pipeline is operating with 100% health for the selected page.
            </p>
          </div>
        ` : `
          <div>
            ${jobs.map(j => {
              const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
              return `
                <div class="card mb-3" style="border-left: 4px solid var(--danger); background: var(--bg-card); border-radius: 10px; padding: 1.25rem; box-shadow: none;">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="status-text status-text-danger" style="font-weight: 700; font-family: var(--font-mono);">#${j.id} Failed</span>
                      <span style="font-weight: 600;">${pageSlug}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">• Attempts: ${j.attempts || 1}</span>
                    </div>
                    <a href="${j.source_url}" target="_blank" style="font-size: 0.8rem; font-family: var(--font-mono); text-decoration: none; color: var(--accent-primary);">
                      ${j.shortcode || 'Source'} ↗
                    </a>
                  </div>

                  <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); padding: 0.65rem 0.85rem; border-radius: 6px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--danger); margin-bottom: 0.75rem; word-break: break-word;">
                    ${escapeHtml(j.error || 'Unknown pipeline failure occurred during video download or Meta upload')}
                  </div>

                  <div class="flex items-center justify-between">
                    <button class="btn btn-secondary btn-sm" onclick="watchtowerView.deleteJob(${j.id})" style="color: var(--danger);">
                      Discard
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="watchtowerView.retryJob(${j.id})">
                      1-Click Retry
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderFailedStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Actions & Event Handlers
  // ─────────────────────────────────────────────────────────────
  function onCaptionInput(id) {
    const val = document.getElementById(`q-caption-${id}`)?.value || '';
    const lenEl = document.getElementById(`q-len-${id}`);
    const tagEl = document.getElementById(`q-tags-${id}`);
    if (lenEl) lenEl.textContent = val.length;
    if (tagEl) {
      const tags = (val.match(/#[a-zA-Z0-9_]+/g) || []).length;
      tagEl.textContent = tags;
    }
  }

  async function approveJob(id) {
    const captionEl = document.getElementById(`q-caption-${id}`);
    const caption = captionEl ? captionEl.value.trim() : '';

    try {
      const res = await fetch(`/api/jobs/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption })
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Job approved! Moved to active publishing queue.', 'success');
        await loadPipelineSummary();
        await renderActiveStage();
      } else {
        app.toast(data.error || 'Failed to approve', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function deleteJob(id) {
    if (!confirm('Discard and delete this reel from the pipeline?')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Job discarded', 'info');
        await loadPipelineSummary();
        await renderActiveStage();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function retryJob(id) {
    try {
      const res = await fetch(`/api/jobs/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('Job queued for retry!', 'success');
        await loadPipelineSummary();
        await renderActiveStage();
      } else {
        app.toast(data.error || 'Failed to retry', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function runCycle() {
    try {
      const res = await fetch('/api/watchtower/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      app.toast('Surveillance cycle initiated across competitors!', 'success');
      setTimeout(async () => {
        await loadStatus();
        await loadPipelineSummary();
        await renderActiveStage();
      }, 1500);
    } catch (err) {
      app.toast('Failed to trigger surveillance: ' + err.message, 'error');
    }
  }

  async function togglePause() {
    const isPaused = cachedStatus?.paused || cachedStatus?.isPaused;
    const endpoint = isPaused ? '/api/watchtower/resume' : '/api/watchtower/pause';
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      app.toast(data.paused ? 'Watchtower paused' : 'Watchtower resumed!', 'info');
      await loadStatus();
    } catch (err) {
      app.toast('Failed to update status: ' + err.message, 'error');
    }
  }

  async function addSource() {
    const userEl = document.getElementById('wt-add-user');
    const pageEl = document.getElementById('wt-add-page');
    const username = userEl?.value?.trim();
    const page_id = pageEl?.value;

    if (!username) {
      app.toast('Please enter a username', 'error');
      return;
    }

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, page_id })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to add source');

      app.toast(`Added @${data.username} to monitoring!`, 'success');
      userEl.value = '';
      await loadPipelineSummary();
      await renderActiveStage();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function bulkAddSources() {
    const textEl = document.getElementById('wt-bulk-add');
    const pageEl = document.getElementById('wt-add-page');
    const text = textEl?.value?.trim();
    const page_id = pageEl?.value;

    if (!text) {
      app.toast('Please paste at least one username', 'error');
      return;
    }

    try {
      const res = await fetch('/api/sources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, page_id })
      });
      const data = await res.json();
      app.toast(`Imported ${data.addedCount} creator accounts!`, 'success');
      textEl.value = '';
      await loadPipelineSummary();
      await renderActiveStage();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function deleteSource(id) {
    if (!confirm('Stop monitoring this creator account?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Creator source removed', 'info');
        await loadPipelineSummary();
        await renderActiveStage();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function checkSource(id) {
    app.toast('Running test inspection of creator profile...', 'info');
    try {
      const res = await fetch(`/api/sources/${id}/check`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast(`Found ${data.posts?.length || 0} reels!`, 'success');
      } else {
        app.toast(data.error || 'Check completed', 'info');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function postDiscovery(id) {
    try {
      const res = await fetch(`/api/discoveries/${id}/post`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('Reel queued for publishing!', 'success');
        await loadPipelineSummary();
        await renderActiveStage();
      } else {
        app.toast(data.error || 'Failed to dispatch', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function skipDiscovery(id) {
    try {
      const res = await fetch(`/api/discoveries/${id}/skip`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('Discovery marked as skipped', 'info');
        await loadPipelineSummary();
        await renderActiveStage();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '--';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function toggleBulkImport() {
    const drawer = document.getElementById('wt-bulk-add-drawer');
    const label = document.getElementById('wt-bulk-toggle-label');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      if (label) label.textContent = 'Hide Bulk Import';
    } else {
      drawer.classList.add('hidden');
      if (label) label.textContent = 'Bulk Import Mode';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    render,
    selectPage,
    switchStage,
    setDownloadedViewMode,
    runCycle,
    togglePause,
    addSource,
    bulkAddSources,
    deleteSource,
    checkSource,
    postDiscovery,
    skipDiscovery,
    approveJob,
    deleteJob,
    retryJob,
    onCaptionInput,
    toggleBulkImport,
    refresh: async () => {
      await loadStatus();
      await loadPipelineSummary();
      await renderActiveStage();
    }
  };
})();
