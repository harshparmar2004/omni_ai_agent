/**
 * OmniStudio v7 — Agent 1: Reposter & On-Demand Publishing Pipeline
 * Multi-page reel ingestion via Telegram Bot (@omnistudio_bot) and Web Dashboard,
 * 5-stage interactive publishing stepper, dedicated Downloaded Media grid deck,
 * AI copywriting review, and live Instagram publishing.
 */
window.reposterView = (function() {
  let selectedPageId = null; // null = all pages
  let activeStage = 'ingest'; // 'ingest' | 'downloaded' | 'ready' | 'published' | 'failed'
  let downloadedViewMode = 'table'; // 'table' (default) | 'grid'
  let activeTrackingJobId = null;
  let pipelineSummary = {
    ingested: 0,
    downloaded: 0,
    ready: 0,
    published: 0,
    failed: 0
  };

  function getPageIcon(slug) {
    return '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '--';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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
      cta: ctaLine || 'Follow GTA 6 CTA included',
      hashtags,
      raw: caption
    };
  }

  async function render() {
    const container = document.getElementById('view-reposter');
    if (!container) return;

    // Fetch pages if not already loaded
    if (!window.app?.pages || window.app.pages.length === 0) {
      try {
        const res = await fetch('/api/pages');
        if (res.ok) window.app.pages = await res.json();
      } catch (e) {}
    }

    const pages = window.app?.pages || [];
    if (selectedPageId === null && pages.length > 0) {
      selectedPageId = pages[0].id;
    }

    container.innerHTML = `
      <!-- 1. Header Bar -->
      <div class="mb-4 flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
        <div>
          <div class="flex items-center gap-2">
            <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
              Agent 1: Reposter & On-Demand Pipeline
            </h2>
            <span class="status-text-success" style="font-size: 0.75rem; font-weight: 500;">Ready</span>
          </div>
          <p class="text-sm text-muted" style="margin-top: 0.15rem; margin-bottom: 0;">
            Direct single-reel ingestion via Telegram Bot (@omnistudio_bot) and Web Dashboard
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="reposterView.refresh()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- 2. Multi-Page Selector Bar -->
      <div class="pipeline-page-switcher" id="rp-page-switcher">
        ${renderPageSwitcherPills()}
      </div>

      <!-- 3. Top 5-Stage Visual Publishing Stepper -->
      <div class="pipeline-stepper-container" id="rp-stepper-container">
        ${renderStepperHtml()}
      </div>

      <!-- 4. Dynamic Active Stage Inspection Deck -->
      <div id="rp-stage-deck">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading pipeline stage...</div>
      </div>
    `;

    await loadSummary();
    await renderActiveStage();
  }

  function renderPageSwitcherPills() {
    const pages = window.app?.pages || [];
    const isAll = selectedPageId === null;

    let html = `
      <button class="pipeline-page-pill ${isAll ? 'active' : ''}" onclick="reposterView.selectPage(null)">
        <span>All Connected Pages</span>
      </button>
    `;

    pages.forEach(p => {
      const isActive = selectedPageId === p.id;
      html += `
        <button class="pipeline-page-pill ${isActive ? 'active' : ''}" onclick="reposterView.selectPage(${p.id})">
          <span>${p.name}</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}; margin-left: 2px;">
            ${p.handle || '@' + p.slug}
          </span>
        </button>
      `;
    });

    return html;
  }

  function renderPageOptions() {
    const pages = window.app?.pages || [];
    if (pages.length === 0) {
      return `<option value="1">Primary Page (@gta6_updates_007)</option>`;
    }
    return pages.map(p => {
      const isSelected = selectedPageId === p.id;
      const quotaStr = p.today_published_count !== undefined ? ` (Quota: ${p.today_published_count}/${p.daily_quota || 3})` : '';
      return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name} (${p.handle || '@' + p.slug})${quotaStr}</option>`;
    }).join('');
  }

  function renderStepperHtml() {
    const s = pipelineSummary;
    const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
    const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

    return `
      <div class="pipeline-stepper-header">
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
          Publishing Pipeline Flow for <b>${pageLabel}</b>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          Agent 1: <strong>On-Demand Reposter & Downloader</strong>
        </div>
      </div>

      <div class="pipeline-stepper">
        <!-- Stage 1: Ingest & Quick Post -->
        <div class="pipeline-step-node ${activeStage === 'ingest' ? 'active' : ''}" onclick="reposterView.switchStage('ingest')" title="Ingest reels via Web URL or Telegram Bot">
          <span class="pipeline-step-num">1.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Ingest & Quick Post</span>
            <span class="pipeline-step-count" id="rps-count-ingested">${s.ingested} Received</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 2: Downloaded Media -->
        <div class="pipeline-step-node ${activeStage === 'downloaded' ? 'active' : ''}" onclick="reposterView.switchStage('downloaded')" title="Downloaded 1080p MP4 media files ready in local storage">
          <span class="pipeline-step-num">2.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Downloaded Media</span>
            <span class="pipeline-step-count" id="rps-count-downloaded" style="font-weight: 600; color: ${s.downloaded > 0 ? 'var(--accent-primary)' : 'inherit'};">${s.downloaded} Ready Files</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 3: AI Copywriting & Review -->
        <div class="pipeline-step-node ${activeStage === 'ready' ? 'active' : ''}" onclick="reposterView.switchStage('ready')" title="AI Copywritten, Attribution & Review">
          <span class="pipeline-step-num">3.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">AI Copywriting</span>
            <span class="pipeline-step-count" id="rps-count-ready">${s.ready} Staged/Ready</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 4: Live Published -->
        <div class="pipeline-step-node ${activeStage === 'published' ? 'active' : ''}" onclick="reposterView.switchStage('published')" title="Live on Instagram Feed">
          <span class="pipeline-step-num">4.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Live Published</span>
            <span class="pipeline-step-count" id="rps-count-published" style="color: var(--agent-reposter); font-weight: 600;">${s.published} Live</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 5: Retries -->
        <div class="pipeline-step-node ${activeStage === 'failed' ? 'active' : ''} ${s.failed > 0 ? 'has-failed' : ''}" onclick="reposterView.switchStage('failed')" title="Failed Jobs with 1-Click Retry">
          <span class="pipeline-step-num" style="${s.failed > 0 && activeStage !== 'failed' ? 'color: var(--danger);' : ''}">5.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Retries</span>
            <span class="pipeline-step-count" id="rps-count-failed" style="${s.failed > 0 ? 'color: var(--danger); font-weight: 700;' : ''}">${s.failed} Errors</span>
          </div>
        </div>
      </div>
    `;
  }

  async function loadSummary() {
    try {
      const url = selectedPageId ? `/api/reposter/pipeline-summary?pageId=${selectedPageId}` : '/api/reposter/pipeline-summary';
      const res = await fetch(url);
      if (res.ok) {
        pipelineSummary = await res.json();
        updateStepperCounts();
      }
    } catch (err) {
      console.warn('[Reposter loadSummary failed]:', err);
    }
  }

  function updateStepperCounts() {
    const s = pipelineSummary;
    const cIng = document.getElementById('rps-count-ingested');
    const cDl = document.getElementById('rps-count-downloaded');
    const cReady = document.getElementById('rps-count-ready');
    const cPub = document.getElementById('rps-count-published');
    const cFailed = document.getElementById('rps-count-failed');

    if (cIng) cIng.textContent = `${s.ingested} Received`;
    if (cDl) cDl.textContent = `${s.downloaded} Ready Files`;
    if (cReady) cReady.textContent = `${s.ready} Staged/Ready`;
    if (cPub) cPub.textContent = `${s.published} Live`;
    if (cFailed) cFailed.textContent = `${s.failed} Errors`;
  }

  async function selectPage(pageId) {
    selectedPageId = pageId;

    const switcher = document.getElementById('rp-page-switcher');
    if (switcher) switcher.innerHTML = renderPageSwitcherPills();

    const stepper = document.getElementById('rp-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    await loadSummary();
    await renderActiveStage();
  }

  async function switchStage(stageName) {
    activeStage = stageName;

    const stepper = document.getElementById('rp-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    await renderActiveStage();
  }

  async function renderActiveStage() {
    const container = document.getElementById('rp-stage-deck');
    if (!container) return;

    switch (activeStage) {
      case 'ingest':
        await renderIngestStage(container);
        break;
      case 'downloaded':
        await renderDownloadedStage(container);
        break;
      case 'ready':
        await renderReadyStage(container);
        break;
      case 'published':
        await renderPublishedStage(container);
        break;
      case 'failed':
        await renderFailedStage(container);
        break;
      default:
        await renderIngestStage(container);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: Ingest & Quick Post Deck
  // ─────────────────────────────────────────────────────────────
  async function renderIngestStage(container) {
    const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
    const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1.25rem; margin-bottom: 1.5rem; align-items: stretch;">
        
        <!-- Hero: Telegram Mobile Integration Hub Card -->
        <div class="telegram-hero-card flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                  Telegram Mobile Ingestion Hub
                </h3>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  Agent 1 Primary Pipeline · Zero-Click Mobile Reposting
                </div>
              </div>
              <span class="status-text-success" style="font-size: 0.75rem; font-weight: 500;">
                Bot Online & Listening
              </span>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.85rem;">
              Share any Instagram Reel link directly from your Instagram app to your OmniStudio Telegram bot. Agent 1 downloads 1080p MP4, generates AI attribution, and posts live.
            </p>

            <!-- 3-Column Dedicated Credentials Strip -->
            <div class="tg-credentials-strip">
              <div class="tg-credential-item">
                <span class="tg-credential-label">Telegram Bot</span>
                <a href="https://t.me/omnistudio_bot" target="_blank" style="font-weight: 600; font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-primary); text-decoration: none;">
                  @omnistudio_bot ↗
                </a>
              </div>
              <div class="tg-credential-item">
                <span class="tg-credential-label">Authorized Chat ID</span>
                <span style="font-weight: 600; color: var(--text-primary); font-size: 0.82rem; font-family: var(--font-mono);" id="rp-telegram-allowed">5443723531</span>
              </div>
              <div style="text-align: right;">
                <a href="https://t.me/omnistudio_bot" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; white-space: nowrap;">
                  Open Bot ↗
                </a>
              </div>
            </div>

            <!-- Horizontal 4-Step Stepper -->
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.45rem;">
              Instant Mobile Flow:
            </div>
            <div class="tg-steps-row">
              <div class="tg-step-box">
                <div class="tg-step-head">
                  <span class="tg-step-num-pill">1.</span>
                  <span>Share</span>
                </div>
                <span class="tg-step-desc">Forward reel to bot</span>
              </div>
              <div class="tg-step-box">
                <div class="tg-step-head">
                  <span class="tg-step-num-pill">2.</span>
                  <span>Verify</span>
                </div>
                <span class="tg-step-desc">Auto-whitelist check</span>
              </div>
              <div class="tg-step-box">
                <div class="tg-step-head">
                  <span class="tg-step-num-pill">3.</span>
                  <span>Select</span>
                </div>
                <span class="tg-step-desc">Tap target page</span>
              </div>
              <div class="tg-step-box">
                <div class="tg-step-head">
                  <span class="tg-step-num-pill">4.</span>
                  <span>Live</span>
                </div>
                <span class="tg-step-desc">Live Instagram post</span>
              </div>
            </div>
          </div>

          <!-- Animated Live Pipeline Stream Visualizer (Agent 1 Signal Radar) -->
          <div class="tg-live-stream-box">
            <div class="tg-stream-header">
              <span class="tg-stream-tag">
                Live Pipeline Signal Stream
              </span>
              <span class="ui-tag status-success">Active · 0ms</span>
            </div>

            <!-- Connected Stream Flow Track with Traveling Light Photons -->
            <div class="tg-stream-track">
              <div class="tg-stream-node active" title="Share directly from Instagram Mobile App">
                <div class="tg-stream-node-icon" style="font-size: 0.7rem; font-weight: 600;">IN</div>
                <span class="tg-stream-node-label">Share</span>
              </div>
              <div class="tg-stream-wire"></div>
              <div class="tg-stream-node active" title="OmniStudio Telegram Ingestion Gateway">
                <div class="tg-stream-node-icon" style="font-size: 0.7rem; font-weight: 600;">TG</div>
                <span class="tg-stream-node-label">Bot Gate</span>
              </div>
              <div class="tg-stream-wire fast"></div>
              <div class="tg-stream-node active" title="AI Attribution Engine & 1080p MP4 Synthesis">
                <div class="tg-stream-node-icon" style="font-size: 0.7rem; font-weight: 600;">AI</div>
                <span class="tg-stream-node-label">AI Engine</span>
              </div>
              <div class="tg-stream-wire"></div>
              <div class="tg-stream-node online" title="Published live to Instagram feed">
                <div class="tg-stream-node-icon" style="font-size: 0.7rem; font-weight: 600;">OUT</div>
                <span class="tg-stream-node-label">Live Reel</span>
              </div>
            </div>

            <!-- Real-time Telemetry Status Strip -->
            <div class="tg-telemetry-strip">
              <span class="tg-telemetry-chip">1080p MP4 Auto-Sync</span>
              <span class="tg-telemetry-chip">AI Attribution Ready</span>
              <span class="tg-telemetry-chip">Chat 5443723531 Secured</span>
            </div>
          </div>
        </div>

        <!-- Direct Reel Quick-Post (On-Demand Dashboard Fallback) -->
        <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.35rem; box-shadow: none; border: 1px solid var(--border-card); border-top: 3px solid var(--accent-primary); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                  Direct Quick-Post
                </h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                  Manual fallback to paste an Instagram Reel link and trigger Agent 1
                </p>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Instagram Reel URL</label>
              <input type="text" id="rp-url" class="form-input" placeholder="https://www.instagram.com/reel/DF-EXAMPLE/ or /p/..." style="font-family: var(--font-mono); font-size: 0.85rem;">
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Destination Target Page</label>
              <select id="rp-page-select" class="form-input">
                ${renderPageOptions()}
              </select>
            </div>

            <div class="form-group mb-3" style="background: var(--bg-input); padding: 0.75rem 0.95rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.82rem; font-weight: 600;">
                <input type="checkbox" id="rp-review-caption" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                <span>Review & edit AI caption before publishing live</span>
              </label>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; margin-left: 1.6rem; line-height: 1.4;">
                If checked, job pauses in Stage 3 for review. If unchecked, it publishes automatically.
              </div>
            </div>

            <!-- Live Step Progress Box -->
            <div id="rp-progress-box" class="card hidden mb-3" style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem;">
              <div class="font-bold text-sm mb-2" id="rp-progress-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="spinner-sm"></span> Pipeline Executing...
              </div>
              <div class="step-bar mb-2">
                <div id="rp-step-1" class="step-bar-item"></div>
                <div id="rp-step-2" class="step-bar-item"></div>
                <div id="rp-step-3" class="step-bar-item"></div>
                <div id="rp-step-4" class="step-bar-item"></div>
              </div>
              <div id="rp-step-status" style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-mono);">
                Initializing job...
              </div>
            </div>
          </div>

          <button id="rp-submit-btn" class="btn btn-primary w-full" onclick="reposterView.submitJob()" style="padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 600;">
            Ingest & Dispatch Reel Live
          </button>
        </div>

      </div>

      <!-- Telegram Received Dispatches Feed Table -->
      <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card); box-shadow: none;">
        <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
              Telegram Ingested Reels
            </h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.15rem 0 0 0;">
              Original reels received via @omnistudio_bot targeting <b>${pageLabel}</b>
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.refresh()">
            Refresh
          </button>
        </div>
        <div id="rp-jobs-table" class="table-container" style="padding: 0; overflow-x: auto;">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">Loading Telegram dispatches...</div>
        </div>
      </div>
    `;

    await loadIngestedTableData();
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: Downloaded Media Deck (Table Default + Grid Toggle)
  // ─────────────────────────────────────────────────────────────
  function setDownloadedViewMode(mode) {
    downloadedViewMode = mode;
    const container = document.getElementById('rp-stage-deck');
    if (container && activeStage === 'downloaded') {
      renderDownloadedStage(container);
    }
  }

  async function renderDownloadedStage(container) {
    try {
      let query = '?hasMedia=true&limit=60';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
      const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

      container.innerHTML = `
        <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 2: Downloaded Media Library</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${jobs.length} reels</span>
            </div>
            <div class="text-sm text-muted">
              Locally downloaded 1080p MP4 clips with verified media paths, AI copy breakdown, and publication tracking for <b>${pageLabel}</b>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- View Mode Switcher: Table View (Default) vs Grid Cards -->
            <div class="view-mode-switcher">
              <button class="view-mode-btn ${downloadedViewMode === 'table' ? 'active' : ''}" onclick="reposterView.setDownloadedViewMode('table')" title="Table View">
                <span>Table View</span>
              </button>
              <button class="view-mode-btn ${downloadedViewMode === 'grid' ? 'active' : ''}" onclick="reposterView.setDownloadedViewMode('grid')" title="Grid Cards">
                <span>Grid Cards</span>
              </button>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
              Refresh
            </button>
          </div>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Downloaded Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; max-width: 480px; margin: 0 auto 1.25rem auto;">
              When reels are ingested via Telegram or Web, their 1080p MP4 videos are downloaded to local storage and indexed here in organized rows and columns.
            </p>
            <button class="btn btn-primary btn-sm" onclick="reposterView.switchStage('ingest')">
              Ingest a Reel Now
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
                  <th style="width: 26%;">AI Hook & Caption</th>
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
    const isTelegram = Boolean(j.telegram_chat_id);
    const originText = isTelegram ?
      `<span style="color: var(--text-muted); font-size: 0.72rem;">Telegram</span>` :
      `<span style="color: var(--text-muted); font-size: 0.72rem;">Web</span>`;

    const parsed = parseCaptionComponents(j.caption);
    const timeStr = j.published_at ?
      `Published ${formatTimeAgo(j.published_at)}` :
      `Ingested ${formatTimeAgo(j.created_at)}`;

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
          <div class="flex items-center gap-2 mb-1">
            <span style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; color: var(--text-primary);">#${j.id}</span>
            ${originText}
          </div>
          <a href="${j.source_url}" target="_blank" class="text-link" style="font-family: var(--font-mono); font-size: 0.8rem;" title="${j.source_url}">
            ${j.shortcode ? `/reel/${j.shortcode}` : 'Source'} ↗
          </a>
        </td>

        <!-- 3. Target Destination Page -->
        <td>
          <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); margin-bottom: 2px;">${pageSlug}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${j.page_name || 'Instagram Page'}</div>
        </td>

        <!-- 4. Format & Local Storage -->
        <td>
          <div style="font-size: 0.76rem; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">
            1080p MP4
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstPath}">
            ${filename}
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 1px;">${mediaTypeLabel} (${mediaCount} item)</div>
        </td>

        <!-- 5. AI Caption Breakdown -->
        <td style="max-width: 280px;">
          <div style="font-size: 0.78rem; color: var(--text-primary); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(parsed.hook)}">
            ${escapeHtml(parsed.hook)}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
            Creator credit included
          </div>
          <div style="font-size: 0.68rem; color: var(--accent-primary); font-family: var(--font-mono); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${parsed.hashtags.length > 0 ? parsed.hashtags.slice(0, 4).join(' ') + (parsed.hashtags.length > 4 ? ` +${parsed.hashtags.length - 4}` : '') : '—'}
          </div>
        </td>

        <!-- 6. Status & Timestamp -->
        <td>
          ${app.renderStatusText(j.status, timeStr)}
        </td>

        <!-- 7. Actions -->
        <td style="text-align: right;">
          ${j.permalink ? `
            <a href="${j.permalink}" target="_blank" class="text-link">
              View on Instagram ↗
            </a>
          ` : (j.status === 'pending_review' || j.status === 'ready' ? `
            <button class="btn btn-primary btn-sm" onclick="reposterView.approveJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
              Publish Live
            </button>
          ` : (j.status === 'failed' ? `
            <button class="btn btn-secondary btn-sm" onclick="reposterView.retryJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
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
    const isTelegram = Boolean(j.telegram_chat_id);
    const originText = isTelegram ?
      `<span style="color: var(--text-muted); font-size: 0.72rem;">Telegram</span>` :
      `<span style="color: var(--text-muted); font-size: 0.72rem;">Web</span>`;

    const parsed = parseCaptionComponents(j.caption);
    const timeStr = j.published_at ?
      `Published ${formatTimeAgo(j.published_at)}` :
      `Ingested ${formatTimeAgo(j.created_at)}`;

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
              <span style="font-family: var(--font-mono); font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">#${j.id}</span>
              <span style="font-weight: 600; font-size: 0.85rem; font-family: var(--font-mono); color: var(--text-primary);">${pageSlug}</span>
            </div>
            ${originText}
          </div>

          <!-- Reel Link & Source Info -->
          <div style="margin-bottom: 0.65rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.15rem;">Instagram Reel Source:</div>
            <a href="${j.source_url}" target="_blank" class="text-link" style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all;">
              ${j.shortcode ? `/reel/${j.shortcode}` : j.source_url.substring(0, 38) + '...'} ↗
            </a>
          </div>

          <!-- Verified Local Media Details -->
          <div class="downloaded-media-fileinfo">
            <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
              <span style="font-weight: 600; color: var(--text-primary); font-size: 0.78rem;">
                1080p MP4 Ready
              </span>
              <span style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">${mediaTypeLabel} (${mediaCount} item)</span>
            </div>
            <div style="color: var(--text-muted); font-size: 0.72rem; font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstPath}">
              storage/reels/${filename}
            </div>
          </div>

          <!-- AI Caption Breakdown -->
          <div class="downloaded-caption-box">
            <div style="font-size: 0.78rem; color: var(--text-primary); line-height: 1.4; margin-bottom: 4px;">
              ${escapeHtml(parsed.hook)}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">
              Creator credit included
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
            ${app.renderStatusText(j.status, timeStr)}
          </div>

          <div class="flex items-center gap-2">
            ${j.permalink ? `
              <a href="${j.permalink}" target="_blank" class="text-link" style="justify-content: center; width: 100%;">
                View on Instagram ↗
              </a>
            ` : (j.status === 'pending_review' || j.status === 'ready' ? `
              <button class="btn btn-primary btn-sm w-full" onclick="reposterView.approveJob(${j.id})">
                Publish Live Now
              </button>
            ` : (j.status === 'failed' ? `
              <button class="btn btn-secondary btn-sm w-full" onclick="reposterView.retryJob(${j.id})">
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
  // STAGE 3: AI Copywriting & Staged Review Deck
  // ─────────────────────────────────────────────────────────────
  async function renderReadyStage(container) {
    try {
      let query = '?status=pending_review,ready';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 3: AI Copywriting & Staged Reels</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${jobs.length} staged</span>
            </div>
            <div class="text-sm text-muted">
              Review AI crafted hook, creator attribution shoutout, follow CTA, and approve for live publishing
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Reels Staged for Copywriting Review</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              Reels marked with "Review caption before publishing" or waiting for manual confirmation appear here.
            </p>
          </div>
        ` : `
          <div>
            ${jobs.map(j => {
              const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
              const initialCaption = j.caption || '';
              return `
                <div class="card mb-3" style="border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card); border-left: 4px solid var(--warning); box-shadow: none;">
                  <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
                    <div class="flex items-center gap-2">
                      <span style="font-family: var(--font-mono); font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">#${j.id}</span>
                      <span style="font-weight: 600;">Target: ${pageSlug}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">${Boolean(j.telegram_chat_id) ? 'Telegram' : 'Web'}</span>
                    </div>
                    <a href="${j.source_url}" target="_blank" class="text-link" style="font-family: var(--font-mono); font-size: 0.8rem;">
                      ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Link'} ↗
                    </a>
                  </div>

                  <div class="form-group mb-2">
                    <label class="form-label font-bold" style="font-size: 0.78rem;">
                      AI Hook, Attribution & Caption:
                    </label>
                    <textarea id="rp-caption-${j.id}" class="form-input" rows="4" style="font-family: var(--font-mono); font-size: 0.82rem; line-height: 1.45;">${escapeHtml(initialCaption)}</textarea>
                  </div>

                  <div class="flex items-center justify-between mt-3">
                    <button class="btn btn-secondary btn-sm" onclick="reposterView.deleteJob(${j.id})" style="color: var(--danger);">
                      Discard
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="reposterView.approveJob(${j.id})">
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
      console.warn('[renderReadyStage error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: Live Published Deck
  // ─────────────────────────────────────────────────────────────
  async function renderPublishedStage(container) {
    try {
      let query = '?status=published&limit=50';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 4: Live Published Reels</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${jobs.length} published</span>
            </div>
            <div class="text-sm text-muted">
              Reels actively broadcasted to Instagram feeds via Meta Graph API v21.0
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Published Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              Ingest a reel to see it publish live to your Instagram page feed.
            </p>
          </div>
        ` : `
          <div class="table-container card" style="padding: 0; border-radius: 12px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 8%;">ID</th>
                  <th style="width: 18%;">Destination</th>
                  <th style="width: 14%;">Origin</th>
                  <th style="width: 14%;">Shortcode</th>
                  <th style="width: 24%;">Caption Breakdown</th>
                  <th style="width: 10%;">Published</th>
                  <th style="text-align: right; width: 12%;">Instagram Link</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => {
                  const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
                  const isTelegram = Boolean(j.telegram_chat_id);
                  const parsed = parseCaptionComponents(j.caption);
                  return `
                    <tr>
                      <td style="font-weight: 600; font-family: var(--font-mono);">#${j.id}</td>
                      <td style="font-weight: 600; font-family: var(--font-mono);">${pageSlug}</td>
                      <td>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">${isTelegram ? 'Telegram' : 'Web'}</span>
                      </td>
                      <td style="font-family: var(--font-mono);">
                        <a href="${j.source_url}" target="_blank" class="text-link">
                          ${j.shortcode || 'Source'} ↗
                        </a>
                      </td>
                      <td style="font-size: 0.75rem; color: var(--text-secondary);">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${escapeHtml(parsed.hook)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Creator credit included</div>
                      </td>
                      <td style="font-size: 0.75rem; color: var(--text-muted);">
                        ${j.published_at ? formatTimeAgo(j.published_at) : '--'}
                      </td>
                      <td style="text-align: right;">
                        ${j.permalink ? `
                          <a href="${j.permalink}" target="_blank" class="text-link">
                            Live on Feed ↗
                          </a>
                        ` : '<span style="font-size: 0.72rem; color: var(--text-muted);">No permalink</span>'}
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
  // STAGE 5: Failed / Retries Deck
  // ─────────────────────────────────────────────────────────────
  async function renderFailedStage(container) {
    try {
      let query = '?status=failed&limit=50';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];

      container.innerHTML = `
        <div class="pipeline-deck-header">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 5: Retries & Errors</span>
              <span style="font-size: 0.82rem; color: var(--danger); font-weight: 500;">${jobs.length} failed</span>
            </div>
            <div class="text-sm text-muted">
              Inspect failure reasons and trigger 1-click pipeline recovery
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
            Refresh
          </button>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">Zero Failed Jobs</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              All on-demand dispatches completed without pipeline errors.
            </p>
          </div>
        ` : `
          <div>
            ${jobs.map(j => {
              const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
              return `
                <div class="card mb-3" style="border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card); border-left: 4px solid var(--danger); box-shadow: none;">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span style="font-family: var(--font-mono); font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">#${j.id}</span>
                      <span style="font-weight: 600;">Target: ${pageSlug}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">Step: ${j.current_step || 'unknown'}</span>
                    </div>
                    <a href="${j.source_url}" target="_blank" class="text-link">
                      ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Link'} ↗
                    </a>
                  </div>

                  <div style="background: var(--bg-canvas); padding: 0.65rem 0.85rem; border-radius: 8px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--danger); margin-bottom: 0.75rem; word-break: break-all;">
                    ${escapeHtml(j.error || 'Pipeline execution halted')}
                  </div>

                  <div class="flex items-center justify-between">
                    <button class="btn btn-secondary btn-sm" onclick="reposterView.deleteJob(${j.id})" style="color: var(--danger);">
                      Delete Job
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="reposterView.retryJob(${j.id})">
                      Retry Pipeline Now
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

  // Helper for loading Ingest stage table (Strictly Telegram-only)
  async function loadIngestedTableData() {
    const container = document.getElementById('rp-jobs-table');
    if (!container) return;

    try {
      let query = '?telegramOnly=true&limit=30';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      if (!res.ok) return;
      let jobs = await res.json();

      // Strict Telegram filter guarantee
      jobs = (jobs || []).filter(j => Boolean(j.telegram_chat_id));

      if (jobs.length === 0) {
        container.innerHTML = `
          <div style="padding: 3.5rem 1.5rem; text-align: center; color: var(--text-muted);">
            <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.35rem;">
              No Telegram Reels Received Yet
            </div>
            <p style="font-size: 0.82rem; max-width: 480px; margin: 0 auto 1.25rem auto; line-height: 1.5;">
              Share any Instagram Reel link directly to your Telegram bot @omnistudio_bot from your phone. Only Telegram-originated reels are processed and tracked in Agent 1.
            </p>
            <div class="flex items-center justify-center gap-2">
              <a href="https://t.me/omnistudio_bot" target="_blank" class="btn btn-primary btn-sm" style="text-decoration: none;">
                Open @omnistudio_bot in Telegram
              </a>
              <button class="btn btn-secondary btn-sm" onclick="app.navigate('command-center')">
                View All-Source Overview in Command Center ➔
              </button>
            </div>
          </div>
        `;
        return;
      }

      const rows = jobs.map(j => {
        const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
        const parsed = parseCaptionComponents(j.caption);
        const timeStr = j.published_at ?
          `Published ${formatTimeAgo(j.published_at)}` :
          `Received ${formatTimeAgo(j.created_at)}`;
        const isReel = (j.media_type === 'reel' || !j.media_type);

        return `
          <tr>
            <!-- 1. Photo Glimpse Preview -->
            <td style="text-align: center; vertical-align: middle; padding: 0.55rem 0.5rem; width: 68px;">
              <a href="${j.source_url}" target="_blank" class="reel-table-thumb-container" style="width: 50px; height: 68px;" title="Open reel #${j.id} on Instagram">
                <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" />
                ${isReel ? '<div class="reel-thumb-play-icon">▶</div>' : ''}
              </a>
            </td>

            <!-- 2. Reel ID & Telegram Sender -->
            <td style="width: 15%;">
              <div class="flex items-center gap-2 mb-1">
                <span style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; color: var(--text-primary);">#${j.id}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">Telegram</span>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 2px;">
                Chat: ${j.telegram_chat_id || '5443723531'}
              </div>
              <a href="${j.source_url}" target="_blank" class="text-link" style="font-family: var(--font-mono); font-size: 0.78rem;">
                ${j.shortcode ? `/reel/${j.shortcode}` : 'Source'} ↗
              </a>
            </td>

            <!-- 3. Target Destination Page -->
            <td style="width: 14%;">
              <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); margin-bottom: 2px;">${pageSlug}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${j.page_name || 'Instagram Page'}</div>
            </td>

            <!-- 4. Format & Storage -->
            <td style="width: 14%;">
              <div style="font-size: 0.76rem; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">
                1080p MP4
              </div>
              <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">
                Step: ${j.current_step || 'completed'}
              </div>
            </td>

            <!-- 5. AI Caption & Hook Breakdown -->
            <td style="max-width: 280px;">
              <div style="font-size: 0.78rem; color: var(--text-primary); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(parsed.hook)}">
                ${escapeHtml(parsed.hook)}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                Creator credit included
              </div>
              <div style="font-size: 0.68rem; color: var(--accent-primary); font-family: var(--font-mono); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${parsed.hashtags.length > 0 ? parsed.hashtags.slice(0, 4).join(' ') : '—'}
              </div>
            </td>

            <!-- 6. Status & Time -->
            <td style="width: 13%;">
              ${app.renderStatusText(j.status, timeStr)}
            </td>

            <!-- 7. Actions -->
            <td style="text-align: right; width: 14%;">
              ${j.permalink ? `
                <a href="${j.permalink}" target="_blank" class="text-link">
                  Live on Feed ↗
                </a>
              ` : (j.status === 'pending_review' || j.status === 'ready' ? `
                <button class="btn btn-primary btn-sm" onclick="reposterView.approveJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
                  Publish Live
                </button>
              ` : (j.status === 'failed' ? `
                <button class="btn btn-secondary btn-sm" onclick="reposterView.retryJob(${j.id})" style="font-size: 0.76rem; white-space: nowrap;">
                  Retry
                </button>
              ` : `
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${j.current_step || 'processing'}</span>
              `))}
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 68px; text-align: center;">Preview</th>
              <th style="width: 15%;">Reel / Sender</th>
              <th style="width: 14%;">Destination</th>
              <th style="width: 14%;">Format & Step</th>
              <th style="width: 25%;">AI Hook & Copy</th>
              <th style="width: 13%;">Status & Time</th>
              <th style="text-align: right; width: 14%;">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (err) {
      console.warn('[loadIngestedTableData error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────
  async function submitJob() {
    const urlInput = document.getElementById('rp-url');
    const pageSelect = document.getElementById('rp-page-select');
    const reviewCheckbox = document.getElementById('rp-review-caption');
    const submitBtn = document.getElementById('rp-submit-btn');

    const url = urlInput?.value?.trim();
    const pageId = pageSelect?.value;
    const reviewCaption = reviewCheckbox?.checked || false;

    if (!url) {
      app.toast('Please enter a valid Instagram URL', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Initializing Pipeline...';
      }

      showProgressBox('Starting 4-stage publishing pipeline...');

      const res = await fetch('/api/reposter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pageId, reviewCaption })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit reel');
      }

      activeTrackingJobId = data.job?.id || data.id;

      if (data.duplicate) {
        app.toast('Notice: ' + data.message, 'info');
      } else {
        app.toast('Reel dispatched to publishing pipeline!', 'success');
      }

      updateProgressStep(1, 'active', 'Step 1/4: Ingested & Fetching 1080p MP4...');
      urlInput.value = '';

      await loadSummary();
      await renderActiveStage();
    } catch (err) {
      hideProgressBox();
      app.toast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingest & Dispatch Reel Live';
      }
    }
  }

  function showProgressBox(title) {
    const box = document.getElementById('rp-progress-box');
    const titleEl = document.getElementById('rp-progress-title');
    if (box) box.classList.remove('hidden');
    if (titleEl) titleEl.innerHTML = `<span class="spinner-sm"></span> ${title}`;
    resetSteps();
  }

  function hideProgressBox() {
    const box = document.getElementById('rp-progress-box');
    if (box) box.classList.add('hidden');
  }

  function resetSteps() {
    for (let i = 1; i <= 4; i++) {
      const step = document.getElementById(`rp-step-${i}`);
      if (step) step.className = 'step-bar-item';
    }
  }

  function updateProgressStep(stepNum, status, statusText) {
    const s1 = document.getElementById('rp-step-1');
    const s2 = document.getElementById('rp-step-2');
    const s3 = document.getElementById('rp-step-3');
    const s4 = document.getElementById('rp-step-4');
    const statusEl = document.getElementById('rp-step-status');

    if (statusEl && statusText) statusEl.textContent = statusText;

    if (stepNum === 1) {
      if (s1) s1.className = `step-bar-item ${status}`;
    } else if (stepNum === 2) {
      if (s1) s1.className = 'step-bar-item completed';
      if (s2) s2.className = `step-bar-item ${status}`;
    } else if (stepNum === 3) {
      if (s1) s1.className = 'step-bar-item completed';
      if (s2) s2.className = 'step-bar-item completed';
      if (s3) s3.className = `step-bar-item ${status}`;
    } else if (stepNum === 4) {
      if (s1) s1.className = 'step-bar-item completed';
      if (s2) s2.className = 'step-bar-item completed';
      if (s3) s3.className = 'step-bar-item completed';
      if (s4) s4.className = `step-bar-item ${status}`;
    }
  }

  function onEvent(event) {
    if (event.jobId && event.jobId === activeTrackingJobId) {
      if (event.status === 'downloading') {
        updateProgressStep(1, 'active', 'Step 1/4: Ingested & Fetching 1080p MP4 from Instagram...');
      } else if (event.status === 'ready' || event.current_step === 'caption_building') {
        updateProgressStep(2, 'completed', 'Step 2/4: Media ready. Crafting AI hook & attribution caption...');
      } else if (event.status === 'publishing' || event.status === 'uploading') {
        updateProgressStep(3, 'active', 'Step 3/4: Uploading container to Meta Graph API v21.0...');
      } else if (event.status === 'published') {
        updateProgressStep(4, 'completed', 'Step 4/4: Successfully published live to Instagram!');
        app.toast('Reel published live to Instagram!', 'success');
        setTimeout(() => hideProgressBox(), 6000);
        loadSummary();
        renderActiveStage();
      } else if (event.status === 'failed') {
        const s4 = document.getElementById('rp-step-4');
        if (s4) s4.className = 'step-bar-item failed';
        const statusEl = document.getElementById('rp-step-status');
        if (statusEl) statusEl.textContent = 'Failed: ' + (event.error || 'Job failed');
        loadSummary();
        renderActiveStage();
      }
    }
  }

  async function approveJob(id) {
    try {
      const captionInput = document.getElementById(`rp-caption-${id}`);
      const caption = captionInput ? captionInput.value : undefined;

      const res = await fetch(`/api/jobs/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption })
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Reel approved and queued for live publishing!', 'success');
        activeTrackingJobId = id;
        showProgressBox(`Publishing job #${id} live...`);
        await loadSummary();
        await renderActiveStage();
      } else {
        app.toast(data.error || 'Failed to approve job', 'error');
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
        activeTrackingJobId = id;
        showProgressBox(`Retrying job #${id}...`);
        await loadSummary();
        await renderActiveStage();
      } else {
        app.toast(data.error || 'Failed to retry', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function deleteJob(id) {
    if (!confirm(`Are you sure you want to delete job #${id}?`)) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        app.toast('Job deleted', 'info');
        await loadSummary();
        await renderActiveStage();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  function getStatusBadge(status) {
    return app.renderStatusText(status);
  }

  return {
    render,
    selectPage,
    switchStage,
    setDownloadedViewMode,
    submitJob,
    approveJob,
    retryJob,
    deleteJob,
    onEvent,
    refresh: async () => {
      await loadSummary();
      await renderActiveStage();
    }
  };
})();
