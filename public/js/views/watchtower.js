/**
 * OmniStudio v7 — Agent 2: Watchtower & Unified Publishing Pipeline
 * Multi-page competitor surveillance, viral discovery, staged review,
 * live in-flight execution, and published feed tracking.
 */
window.watchtowerView = (function() {
  let selectedPageId = null; // null = 'all', or page id integer
  let activeStage = 'review'; // 'sources' | 'discovered' | 'ranked' | 'downloaded' | 'review' | 'active' | 'published' | 'failed'
  let downloadedViewMode = 'table'; // 'table' (default) | 'grid'
  let stage2Page = 0; // 0-indexed page for Stage 2 discovered reels
  const STAGE2_PAGE_SIZE = 50;
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
    const selectedPage = pages.find(p => p.id === selectedPageId);
    const activePageLabel = selectedPage ? escapeHtml(selectedPage.name) : 'All Connected Pages';
    const activePageHandle = selectedPage ? (selectedPage.handle || '@' + selectedPage.slug) : `(${pages.length} pages)`;

    container.innerHTML = `
      <!-- 1. Header Bar with Clean Title & Scalable Multi-Page Selector Sheet -->
      <div class="mb-4 flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
        <div class="flex items-center gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Agent 2: Watchtower & Pipeline Engine
              </h2>
              <span id="wt-header-status-badge" class="status-text status-text-info">Active</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2" style="position: relative;">
          <!-- Scalable Multi-Account Selector Sheet Trigger -->
          <div class="wt-page-selector-wrap rp-page-selector-wrap">
            <button id="wt-page-sheet-btn" class="btn btn-secondary btn-sm" onclick="watchtowerView.togglePageSheet(event)" style="display: inline-flex; align-items: center; gap: 0.55rem; padding: 0.38rem 0.85rem; font-size: 0.82rem; border-radius: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; background: rgba(184, 91, 53, 0.12); color: var(--accent-primary); font-size: 0.72rem; font-weight: 700;">IG</span>
              <span id="wt-page-sheet-label" style="font-weight: 600; color: var(--text-primary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${activePageLabel}
              </span>
              <span id="wt-page-sheet-handle" style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
                ${activePageHandle}
              </span>
              <svg id="wt-page-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6; transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            <!-- Sheet Dropdown (Scalable for 50-60+ accounts with real-time search) -->
            <div id="wt-page-sheet" class="wt-page-sheet rp-page-sheet hidden" onclick="event.stopPropagation()">
              <div class="rp-page-sheet-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.88rem;">Select Target Account</span>
                  <span style="font-size: 0.7rem; font-weight: 600; background: rgba(184, 91, 53, 0.1); color: var(--accent-primary); padding: 1px 7px; border-radius: 10px;">
                    ${pages.length} Pages
                  </span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="watchtowerView.closePageSheet()" style="padding: 1px 6px; font-size: 0.8rem; line-height: 1;">✕</button>
              </div>

              <!-- Real-time Filter Search for 50-60+ accounts -->
              <div class="rp-page-sheet-search">
                <div style="position: relative;">
                  <input type="text" id="wt-page-search-input" placeholder="Search accounts, @handle..." class="form-input" style="font-size: 0.78rem; padding: 0.4rem 0.65rem 0.4rem 1.85rem; border-radius: 6px; width: 100%;" oninput="watchtowerView.filterPages(this.value)" />
                  <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); opacity: 0.45; font-size: 0.8rem;">🔍</span>
                </div>
              </div>

              <!-- Scrollable accounts list -->
              <div class="rp-page-sheet-list" id="wt-page-sheet-items">
                ${renderPageSheetHtml()}
              </div>

              <!-- Sheet Footer -->
              <div class="rp-page-sheet-footer">
                <span>Watchtower surveillance & publishing</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.app?.navigateTo('pages'); watchtowerView.closePageSheet();" style="font-size: 0.72rem; padding: 2px 7px;">
                  + Manage Pages
                </button>
              </div>
            </div>
          </div>

          <button id="wt-btn-pause-toggle" class="btn btn-secondary btn-sm" onclick="watchtowerView.togglePause()">
            Pause
          </button>
          <button class="btn btn-primary btn-sm" onclick="watchtowerView.runCycle()">
            Run Surveillance Now
          </button>
        </div>
      </div>

      <!-- 2. Peak Audience Traffic Windows Widget -->
      <div id="wt-peak-windows-container" style="margin-bottom: 1rem;"></div>

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
    await loadPeakWindows();
    await loadPipelineSummary();
    await renderActiveStage();
    setTimeout(() => triggerPipelineFlowAnimation(), 120);
  }

  function renderPageSheetHtml() {
    const pages = window.app?.pages || [];
    const isAll = selectedPageId === null;

    let itemsHtml = `
      <!-- All Connected Pages Option -->
      <button type="button" class="rp-page-sheet-item ${isAll ? 'active' : ''}" onclick="watchtowerView.selectPage(null)">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(30, 26, 23, 0.06); display: flex; align-items: center; justify-content: center; font-size: 1rem;">
            🌐
          </div>
          <div style="text-align: left;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">All Connected Pages</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Combined surveillance across all ${pages.length} accounts</div>
          </div>
        </div>
        ${isAll ? `<span class="rp-page-selected-check">✓</span>` : ''}
      </button>
      <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.06em; padding: 0.5rem 0.5rem 0.25rem 0.5rem; margin-top: 0.35rem;">
        Instagram Accounts (${pages.length})
      </div>
    `;

    pages.forEach(p => {
      const isActive = selectedPageId === p.id;
      const isMovie = (p.slug || '').includes('movies') || p.id === 2;
      const initial = (p.name || 'IG').charAt(0).toUpperCase();
      const quotaStr = p.today_published_count !== undefined ? `${p.today_published_count}/${p.daily_quota || 3}` : '0/3';

      itemsHtml += `
        <button type="button" class="rp-page-sheet-item ${isActive ? 'active' : ''}" onclick="watchtowerView.selectPage(${p.id})" data-page-name="${escapeHtml(p.name || '').toLowerCase()}" data-page-handle="${escapeHtml(p.handle || p.slug || '').toLowerCase()}">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${isMovie ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : 'linear-gradient(135deg, #B85B35, #E17055)'}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 700; flex-shrink: 0;">
              ${initial}
            </div>
            <div style="min-width: 0; text-align: left;">
              <div style="font-weight: 600; font-size: 0.84rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(p.name)}
              </div>
              <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                <span>${p.handle || '@' + p.slug}</span>
                <span>•</span>
                <span style="color: ${isActive ? 'var(--accent-primary)' : 'inherit'};">Quota: ${quotaStr}</span>
              </div>
            </div>
          </div>
          <div style="margin-left: 0.5rem; flex-shrink: 0;">
            ${isActive ? `<span class="rp-page-selected-check">✓</span>` : ''}
          </div>
        </button>
      `;
    });

    return itemsHtml;
  }

  function togglePageSheet(event) {
    if (event) event.stopPropagation();
    const sheet = document.getElementById('wt-page-sheet');
    const caret = document.getElementById('wt-page-caret');
    if (!sheet) return;

    const isHidden = sheet.classList.contains('hidden');
    if (isHidden) {
      sheet.classList.remove('hidden');
      sheet.style.display = 'flex';
      if (caret) caret.style.transform = 'rotate(180deg)';
      const searchInput = document.getElementById('wt-page-search-input');
      if (searchInput) {
        searchInput.value = '';
        filterPages('');
        setTimeout(() => searchInput.focus(), 60);
      }
    } else {
      closePageSheet();
    }
  }

  function closePageSheet() {
    const sheet = document.getElementById('wt-page-sheet');
    const caret = document.getElementById('wt-page-caret');
    if (sheet) {
      sheet.classList.add('hidden');
      sheet.style.display = 'none';
    }
    if (caret) caret.style.transform = 'rotate(0deg)';
  }

  function filterPages(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('#wt-page-sheet-items .rp-page-sheet-item');
    items.forEach(el => {
      const name = el.getAttribute('data-page-name') || '';
      const handle = el.getAttribute('data-page-handle') || '';
      if (!name && !handle) {
        el.style.display = (!q || 'all connected pages'.includes(q)) ? 'flex' : 'none';
        return;
      }
      if (!q || name.includes(q) || handle.includes(q)) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function triggerPipelineFlowAnimation() {
    const nodes = [
      document.getElementById('wt-step-sources'),
      document.getElementById('wt-step-discovered'),
      document.getElementById('wt-step-ranked'),
      document.getElementById('wt-step-downloaded'),
      document.getElementById('wt-step-review'),
      document.getElementById('wt-step-active'),
      document.getElementById('wt-step-published'),
      document.getElementById('wt-step-failed')
    ];
    const connectors = [
      document.getElementById('wt-flow-arrow-1'),
      document.getElementById('wt-flow-arrow-2'),
      document.getElementById('wt-flow-arrow-3'),
      document.getElementById('wt-flow-arrow-4'),
      document.getElementById('wt-flow-arrow-5'),
      document.getElementById('wt-flow-arrow-6'),
      document.getElementById('wt-flow-arrow-7')
    ];

    nodes.forEach(n => n && n.classList.remove('flow-pulse'));
    connectors.forEach(c => c && c.classList.remove('flow-active'));

    nodes.forEach((node, idx) => {
      setTimeout(() => {
        if (node) {
          node.classList.add('flow-pulse');
          setTimeout(() => node.classList.remove('flow-pulse'), 850);
        }
        if (idx > 0 && connectors[idx - 1]) {
          connectors[idx - 1].classList.add('flow-active');
          setTimeout(() => connectors[idx - 1].classList.remove('flow-active'), 850);
        }
      }, idx * 160);
    });
  }

  function renderStepperHtml() {
    const s = pipelineSummary;
    const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
    const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

    return `
      <div class="pipeline-stepper-header">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span class="pipeline-live-flow-dot"></span>
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-primary); letter-spacing: 0.05em;">
            Publishing Pipeline Flow for <b style="color: var(--accent-primary);">${pageLabel}</b>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="watchtowerView.triggerPipelineFlowAnimation()" style="font-size: 0.72rem; padding: 2px 9px; font-weight: 600; gap: 4px;" title="Replay automated pipeline progression">
            <span>⚡ Replay Flow</span>
          </button>
          <div style="font-size: 0.74rem; color: var(--text-muted);">
            Cadence: <strong>Every 3 Hours ± Jitter</strong>
          </div>
        </div>
      </div>

      <div class="pipeline-stepper">
        <!-- Stage 1: Tracking Accounts -->
        <div id="wt-step-sources" class="pipeline-step-node ${activeStage === 'sources' ? 'active' : ''}" onclick="watchtowerView.switchStage('sources')" title="Tracked Competitor Accounts">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-sources">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 1</div>
              <div class="pipeline-step-title">Tracking</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.sources > 0 ? '#2563EB' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-sources">${s.sources} Accounts</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.sources > 0 ? 'Active' : 'Empty'}
          </div>
        </div>

        <!-- Connector 1 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-1" title="Surveillance scan triggers reel discovery">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 2: Discovered -->
        <div id="wt-step-discovered" class="pipeline-step-node ${activeStage === 'discovered' ? 'active' : ''}" onclick="watchtowerView.switchStage('discovered')" title="Raw Discovered Reels">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-discovered">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 2</div>
              <div class="pipeline-step-title">Discovered</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.discovered > 0 ? '#0284C7' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-discovered">${s.discovered} Ingested</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.discovered > 0 ? 'Scanned' : 'Idle'}
          </div>
        </div>

        <!-- Connector 2 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-2" title="Raw reels fed to AI viral scoring">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 3: AI Ranked -->
        <div id="wt-step-ranked" class="pipeline-step-node ${activeStage === 'ranked' ? 'active' : ''}" onclick="watchtowerView.switchStage('ranked')" title="Viral Scored Reels (≥70)">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-ranked">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 3</div>
              <div class="pipeline-step-title">AI Ranked</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.ranked > 0 ? '#D97706' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-ranked">${s.ranked} Scored</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.ranked > 0 ? '≥70 Viral' : 'Waiting'}
          </div>
        </div>

        <!-- Connector 3 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-3" title="Top-scoring reels fetched by downloader">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 4: Downloaded Media -->
        <div id="wt-step-downloaded" class="pipeline-step-node ${activeStage === 'downloaded' ? 'active' : ''}" onclick="watchtowerView.switchStage('downloaded')" title="Downloaded 1080p MP4 media files ready in local storage">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-downloaded">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 4</div>
              <div class="pipeline-step-title">Downloaded</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${(s.downloaded || 0) > 0 ? 'var(--accent-primary)' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-downloaded" style="font-weight: 600; color: ${(s.downloaded || 0) > 0 ? 'var(--accent-primary)' : 'inherit'};">${s.downloaded || 0} Ready MP4</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${(s.downloaded || 0) > 0 ? 'Ready' : 'Waiting'}
          </div>
        </div>

        <!-- Connector 4 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-4" title="Media passed to review & staging">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 5: Review & Staged -->
        <div id="wt-step-review" class="pipeline-step-node ${activeStage === 'review' ? 'active' : ''} ${s.review > 0 ? 'has-review' : ''}" onclick="watchtowerView.switchStage('review')" title="Staged Reels Awaiting Approval">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-review">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 5</div>
              <div class="pipeline-step-title">Review / Staged</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.review > 0 ? 'var(--warning, #B45309)' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-review" style="${s.review > 0 ? 'color: var(--warning, #B45309); font-weight: 700;' : ''}">${s.review} Needs Review</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.review > 0 ? 'Review' : 'Approved'}
          </div>
        </div>

        <!-- Connector 5 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-5" title="Approved jobs dispatched for upload">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 6: In-Flight -->
        <div id="wt-step-active" class="pipeline-step-node ${activeStage === 'active' ? 'active' : ''}" onclick="watchtowerView.switchStage('active')" title="Active Downloading & Meta Upload">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 6</div>
              <div class="pipeline-step-title">In-Flight</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.active > 0 ? '#4F46E5' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-active">${s.active} Processing</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.active > 0 ? 'In-Flight' : 'Idle'}
          </div>
        </div>

        <!-- Connector 6 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-6" title="Completed uploads confirmed on Meta Feed">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 7: Live Published -->
        <div id="wt-step-published" class="pipeline-step-node ${activeStage === 'published' ? 'active' : ''}" onclick="watchtowerView.switchStage('published')" title="Live on Instagram">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-published">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 7</div>
              <div class="pipeline-step-title">Live Posts</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.published > 0 ? '#059669' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-published" style="color: var(--agent-reposter); font-weight: 600;">${s.published} Live</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.published > 0 ? 'Live IG' : 'Synced'}
          </div>
        </div>

        <!-- Connector 7 -->
        <div class="pipeline-flow-connector" id="wt-flow-arrow-7" title="Error detection and automatic retry loop">
          <div class="connector-track"><div class="connector-pulse"></div></div>
          <svg class="connector-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Stage 8: Retries -->
        <div id="wt-step-failed" class="pipeline-step-node ${activeStage === 'failed' ? 'active' : ''} ${s.failed > 0 ? 'has-failed' : ''}" onclick="watchtowerView.switchStage('failed')" title="Failed Jobs with 1-Click Retry">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div class="pipeline-step-icon-wrap stage-failed">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </div>
            <div class="pipeline-step-info-col">
              <div class="pipeline-step-super">Stage 8</div>
              <div class="pipeline-step-title">Retries</div>
              <div class="pipeline-step-metric-line">
                <span style="color: ${s.failed > 0 ? '#DC2626' : 'var(--text-muted)'}; font-size: 0.75rem;">●</span>
                <span id="ps-count-failed" style="${s.failed > 0 ? 'color: var(--danger); font-weight: 700;' : ''}">${s.failed} Errors</span>
              </div>
            </div>
          </div>
          <div class="pipeline-step-status-pill">
            ${s.failed > 0 ? 'Action Req' : '0 Clean'}
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
    stage2Page = 0;
    closePageSheet();

    const pages = window.app?.pages || [];
    const selectedPage = pages.find(p => p.id === selectedPageId);
    const labelEl = document.getElementById('wt-page-sheet-label');
    const handleEl = document.getElementById('wt-page-sheet-handle');
    if (labelEl) {
      labelEl.textContent = selectedPage ? selectedPage.name : 'All Connected Pages';
    }
    if (handleEl) {
      handleEl.textContent = selectedPage ? (selectedPage.handle || '@' + selectedPage.slug) : `(${pages.length} pages)`;
    }

    const itemsContainer = document.getElementById('wt-page-sheet-items');
    if (itemsContainer) itemsContainer.innerHTML = renderPageSheetHtml();

    const stepper = document.getElementById('wt-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    await loadPeakWindows();
    await loadPipelineSummary();
    await renderActiveStage();
    setTimeout(() => triggerPipelineFlowAnimation(), 120);
  }

  async function switchStage(stageName, pageId) {
    activeStage = stageName;
    if (pageId !== undefined) {
      selectedPageId = pageId;
      const pages = window.app?.pages || [];
      const selectedPage = pages.find(p => p.id === selectedPageId);
      const labelEl = document.getElementById('wt-page-sheet-label');
      const handleEl = document.getElementById('wt-page-sheet-handle');
      if (labelEl) {
        labelEl.textContent = selectedPage ? selectedPage.name : 'All Connected Pages';
      }
      if (handleEl) {
        handleEl.textContent = selectedPage ? (selectedPage.handle || '@' + selectedPage.slug) : `(${pages.length} pages)`;
      }
      const itemsContainer = document.getElementById('wt-page-sheet-items');
      if (itemsContainer) itemsContainer.innerHTML = renderPageSheetHtml();
    }
    if (stageName === 'discovered') {
      stage2Page = 0;
    }

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
  // STAGE 2: Raw Discovered Reels Deck (Table Layout with Pagination)
  // ─────────────────────────────────────────────────────────────
  async function renderDiscoveredStage(container) {
    try {
      const offset = stage2Page * STAGE2_PAGE_SIZE;
      let query = `?limit=${STAGE2_PAGE_SIZE}&offset=${offset}`;
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/discoveries${query}`);
      const posts = res.ok ? await res.json() : [];
      const totalHeader = res.headers.get('x-total-count');
      const totalCount = totalHeader !== null ? parseInt(totalHeader, 10) : posts.length;

      // Handle edge-case: page out of bounds if items were dispatched/skipped
      if (posts.length === 0 && stage2Page > 0 && totalCount > 0) {
        stage2Page = Math.max(0, Math.ceil(totalCount / STAGE2_PAGE_SIZE) - 1);
        return renderDiscoveredStage(container);
      }

      const totalPages = Math.max(1, Math.ceil(totalCount / STAGE2_PAGE_SIZE));
      const startItem = totalCount === 0 ? 0 : offset + 1;
      const endItem = Math.min(offset + posts.length, totalCount);
      const hasPrev = stage2Page > 0;
      const hasNext = offset + posts.length < totalCount;

      container.innerHTML = `
        <div class="pipeline-deck-header" style="margin-bottom: 1.25rem;">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 2: Raw Discovered Reels</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">
                ${totalCount} ingested
              </span>
            </div>
            <div class="text-sm text-muted">
              Fresh candidate reels harvested across competitor surveillance feeds
            </div>
          </div>
          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            ${totalCount > 0 ? `
              <span style="font-size: 0.78rem; color: var(--text-muted); margin-right: 0.25rem;">
                Showing <b>${startItem}–${endItem}</b> of <b>${totalCount}</b>
              </span>
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.prevDiscoveredPage()" ${!hasPrev ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
                ← Previous 50
              </button>
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.nextDiscoveredPage()" ${!hasNext ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
                Next 50 →
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="watchtowerView.renderActiveStage()" title="Refresh Discovered Feed">
              Refresh
            </button>
          </div>
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
          <!-- Full-Width End-to-End Table Card -->
          <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 10px; border: 1px solid var(--border-card); box-shadow: none; width: 100%;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 70px; text-align: center;">Preview</th>
                  <th style="width: 22%;">Reel & Creator</th>
                  <th style="width: 16%;">Shared Target</th>
                  <th style="width: 32%;">Content & Caption</th>
                  <th style="width: 11%;">Virality</th>
                  <th style="width: 19%; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${posts.map(p => {
                  const reelUrl = p.url || `https://www.instagram.com/reel/${p.shortcode}/`;
                  const pageSlug = p.page_slug ? `@${p.page_slug}` : 'Auto / General';
                  const pubDate = formatPublishDate(p.posted_at || p.created_at);
                  const timeAgo = formatTimeAgo(p.posted_at || p.created_at);
                  const viralityScore = Math.round(p.score ? (p.score <= 1.0 ? p.score * 100 : p.score) : 70);

                  return `
                    <tr>
                      <!-- 1. Thumbnail / Reel Preview -->
                      <td style="text-align: center; vertical-align: middle; padding: 0.6rem 0.5rem;">
                        <a href="${reelUrl}" target="_blank" class="reel-table-thumb-container" title="Open reel #${p.shortcode} on Instagram">
                          <img src="/api/discoveries/${p.id}/thumbnail" alt="${p.shortcode}" class="reel-table-thumb-img" loading="lazy" />
                          <div class="reel-thumb-play-icon">▶</div>
                        </a>
                      </td>

                      <!-- 2. Reel ID & Creator -->
                      <td>
                        <div style="margin-bottom: 3px;">
                          <a href="${reelUrl}" target="_blank" class="text-link" style="font-weight: 700; font-family: var(--font-mono); font-size: 0.84rem;" title="${reelUrl}">
                            #${p.shortcode} ↗
                          </a>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 2px;">
                          <a href="https://instagram.com/${p.source_username || ''}" target="_blank" style="text-decoration: none; color: var(--text-primary);">
                            From @${p.source_username || 'creator'} <span style="color: var(--accent-primary); font-size: 0.72rem;">↗</span>
                          </a>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">
                          Published ${pubDate} · ${timeAgo}
                        </div>
                      </td>

                      <!-- 3. Shared Target Destination -->
                      <td>
                        <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); margin-bottom: 2px;">
                          ${pageSlug}
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">
                          ${escapeHtml(p.page_name || 'Instagram Page')}
                        </div>
                      </td>

                      <!-- 4. Content & Caption -->
                      <td>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 5px; max-width: 480px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${escapeHtml(p.caption || '')}">
                          ${escapeHtml(p.caption ? (p.caption.length > 140 ? p.caption.substring(0, 140) + '...' : p.caption) : 'Instagram Reel discovered via Watchtower surveillance')}
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                          ${(p.like_count || 0).toLocaleString()} likes · ${(p.comment_count || 0).toLocaleString()} comments · ${(p.view_count || 0).toLocaleString()} views
                        </div>
                      </td>

                      <!-- 5. Virality Score -->
                      <td>
                        <div style="font-weight: 700; font-size: 0.86rem; color: var(--accent-primary); margin-bottom: 2px;">
                          ${viralityScore}
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">
                          Virality Score
                        </div>
                      </td>

                      <!-- 6. Actions -->
                      <td style="text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; align-items: center; gap: 8px;">
                          <button class="btn btn-primary btn-sm" onclick="watchtowerView.postDiscovery(${p.id})" style="font-size: 0.78rem; padding: 4px 10px;">
                            Dispatch to Pipeline
                          </button>
                          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.skipDiscovery(${p.id})" title="Skip this reel" style="font-size: 0.78rem; padding: 4px 8px; color: var(--text-muted);">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <!-- Bottom Pagination Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); flex-wrap: wrap; gap: 0.75rem;">
              <span style="font-size: 0.78rem; color: var(--text-muted);">
                Showing <b>${startItem}</b> to <b>${endItem}</b> of <b>${totalCount}</b> discovered reels
              </span>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" onclick="watchtowerView.prevDiscoveredPage()" ${!hasPrev ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
                  ← Previous 50
                </button>
                <span style="font-size: 0.78rem; font-weight: 600; padding: 0 0.5rem; color: var(--text-secondary);">
                  Page ${stage2Page + 1} of ${totalPages}
                </span>
                <button class="btn btn-secondary btn-sm" onclick="watchtowerView.nextDiscoveredPage()" ${!hasNext ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
                  Next 50 →
                </button>
              </div>
            </div>
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
      let query = '?agent=watchtower&hasMedia=true&limit=60';
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

  function formatPublishDate(timestamp) {
    if (!timestamp) return 'Recently discovered';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return 'Recently discovered';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recently discovered';
    }
  }

  async function nextDiscoveredPage() {
    stage2Page++;
    await renderActiveStage();
  }

  async function prevDiscoveredPage() {
    if (stage2Page > 0) {
      stage2Page--;
      await renderActiveStage();
    }
  }

  async function loadPeakWindows() {
    const bannerEl = document.getElementById('wt-peak-windows-container');
    if (!bannerEl) return;

    try {
      const url = selectedPageId ? `/api/watchtower/peak-windows?pageId=${selectedPageId}` : '/api/watchtower/peak-windows';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      const isActive = Boolean(data.activeWindow);
      const activeName = data.activeWindow ? data.activeWindow.name : (data.nextWindow?.name || 'Next Peak Window');
      const timeRange = data.activeWindow ? data.activeWindow.rangeStr : (data.nextWindow?.rangeStr || '');
      const countdown = data.activeWindow ? `Window Open (Target: ${data.activeWindow.target} reels)` : (data.nextWindow?.countdown || 'Upcoming window');

      bannerEl.innerHTML = `
        <div class="card" style="padding: 0.9rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-card); background: var(--bg-card); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: none;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(217, 119, 87, 0.08); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: var(--accent-primary); flex-shrink: 0;">
              ${isActive ? '⚡' : '⏱️'}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
                  ${isActive ? 'High-Traffic Window Active:' : 'Next Traffic Surge:'} ${escapeHtml(activeName)} (${escapeHtml(timeRange)})
                </span>
                <span class="status-text ${isActive ? 'status-text-success' : 'status-text-muted'}" style="font-size: 0.72rem;">
                  ${escapeHtml(countdown)}
                </span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
                Morning: 08:00–11:00 (3 Reels) · Evening: 17:00–21:00 (5 Reels) · Midnight: 23:00–01:00 (4 Reels) · Current IST: ${escapeHtml(data.currentTime || 'Active')}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.25rem; font-size: 0.78rem;">
            <div>
              <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Today's Output</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent-primary); font-family: var(--font-mono);">
                ${data.publishedToday || 0} / ${data.dailyTarget || 12} Reels
              </div>
            </div>
            <div style="border-left: 1px solid var(--border-subtle); padding-left: 1.25rem;">
              <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Meta Quota Cap</div>
              <div style="font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono);">
                25 Max API Limit
              </div>
            </div>
            <div style="border-left: 1px solid var(--border-subtle); padding-left: 1.25rem;">
              <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Safe Spacing</div>
              <div style="font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono);">
                25m Safe Delay
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      console.warn('[loadPeakWindows notice]:', e.message);
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

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const sheet = document.getElementById('wt-page-sheet');
      const btn = document.getElementById('wt-page-sheet-btn');
      if (sheet && !sheet.classList.contains('hidden')) {
        if (!sheet.contains(e.target) && !btn?.contains(e.target)) {
          closePageSheet();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePageSheet();
      }
    });
  }

  return {
    render,
    selectPage,
    switchStage,
    togglePageSheet,
    closePageSheet,
    filterPages,
    triggerPipelineFlowAnimation,
    setDownloadedViewMode,
    runCycle,
    togglePause,
    addSource,
    bulkAddSources,
    deleteSource,
    checkSource,
    postDiscovery,
    skipDiscovery,
    nextDiscoveredPage,
    prevDiscoveredPage,
    approveJob,
    deleteJob,
    retryJob,
    onCaptionInput,
    toggleBulkImport,
    refresh: async () => {
      await loadStatus();
      await loadPeakWindows();
      await loadPipelineSummary();
      await renderActiveStage();
    }
  };
})();
