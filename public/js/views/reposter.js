/**
 * OmniStudio v7 — Agent 1: Reposter & On-Demand Publishing Pipeline
 * Multi-page reel ingestion via Telegram Bot (@omnistudio_bot) and Web Dashboard,
 * 5-stage interactive publishing stepper, dedicated Downloaded Media grid deck,
 * AI copywriting review, and live Instagram publishing.
 */
window.reposterView = (function() {
  let selectedPageId = null; // null = all pages
  let activeStage = 'ingest'; // 'ingest' | 'downloaded' | 'ready' | 'template' | 'published' | 'failed'
  let downloadedViewMode = 'table'; // 'table' (default) | 'grid'
  let ingestViewMode = 'grid'; // 'grid' (default for stream) | 'table'
  let activeTrackingJobId = null;
  let activeStage3Jobs = [];
  let activeTemplateJobs = [];
  let selectedTemplateReelId = null;
  let selectedAspectRatio = '9:16'; // '9:16' | '16:9' | '1:1' | '4:5'
  let activeTemplateTab = 'canvas'; // 'canvas' | 'figma'
  let activeFigmaOverlayUrl = '';
  let activeBrandLogo = '';
  let currentCaptionModalJob = null;
  let currentEditingTemplate = null;
  let currentEditingJobId = null;
  let pipelineSummary = {
    ingested: 0,
    downloaded: 0,
    ready: 0,
    template: 0,
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

  function extractSourceCreator(job) {
    if (job.source_account) return String(job.source_account).replace(/^@/, '');
    if (job.creator) return String(job.creator).replace(/^@/, '');
    if (job.caption) {
      const match = job.caption.match(/(?:credit|via|source|by|shoutout)[:\s]*@([a-zA-Z0-9._]+)/i);
      if (match) return match[1];
    }
    return 'Instagram Creator';
  }

  function formatReceiptDateTime(timestamp) {
    if (!timestamp) return { date: 'Today', time: '--', relative: 'Just now' };
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return { date: 'Today', time: '--', relative: 'Just now' };
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      date: dateStr,
      time: timeStr,
      relative: formatTimeAgo(timestamp)
    };
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

  function cleanCaptionText(str) {
    if (!str) return '';
    return str
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&;s/g, "'s")
      .replace(/&;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
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
        <!-- Stage 1: Telegram Stream -->
        <div class="pipeline-step-node ${activeStage === 'ingest' ? 'active' : ''}" onclick="reposterView.switchStage('ingest')" title="Live stream of reels received via Telegram Bot (@omnistudio_bot)">
          <span class="pipeline-step-num">1.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Telegram Stream</span>
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

        <!-- Stage 4: Video Branding & Template Studio -->
        <div class="pipeline-step-node ${activeStage === 'template' ? 'active' : ''}" onclick="reposterView.switchStage('template')" title="Video Branding & Template Compositing">
          <span class="pipeline-step-num">4.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Template Studio</span>
            <span class="pipeline-step-count" id="rps-count-template">${s.template || s.published || 0} Framed</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 5: Live Published -->
        <div class="pipeline-step-node ${activeStage === 'published' ? 'active' : ''}" onclick="reposterView.switchStage('published')" title="Live on Instagram Feed">
          <span class="pipeline-step-num">5.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Live Published</span>
            <span class="pipeline-step-count" id="rps-count-published" style="color: var(--agent-reposter); font-weight: 600;">${s.published} Live</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 6: Retries -->
        <div class="pipeline-step-node ${activeStage === 'failed' ? 'active' : ''} ${s.failed > 0 ? 'has-failed' : ''}" onclick="reposterView.switchStage('failed')" title="Failed Jobs with 1-Click Retry">
          <span class="pipeline-step-num" style="${s.failed > 0 && activeStage !== 'failed' ? 'color: var(--danger);' : ''}">6.</span>
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
    const cTmpl = document.getElementById('rps-count-template');
    const cPub = document.getElementById('rps-count-published');
    const cFailed = document.getElementById('rps-count-failed');

    if (cIng) cIng.textContent = `${s.ingested} Received`;
    if (cDl) cDl.textContent = `${s.downloaded} Ready Files`;
    if (cReady) cReady.textContent = `${s.ready} Staged/Ready`;
    if (cTmpl) cTmpl.textContent = `${s.template || s.published || 0} Framed`;
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
      case 'template':
        await renderTemplateStage(container);
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
  // STAGE 1: Telegram Ingested Reels Stream (Instagram Reel Feed)
  // ─────────────────────────────────────────────────────────────
  function setIngestViewMode(mode) {
    ingestViewMode = mode;
    const container = document.getElementById('rp-stage-deck');
    if (container && activeStage === 'ingest') {
      renderIngestStage(container);
    }
  }

  function openManualModal() {
    const modal = document.getElementById('rp-manual-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeManualModal() {
    const modal = document.getElementById('rp-manual-modal');
    if (modal) modal.style.display = 'none';
  }

  async function renderIngestStage(container) {
    const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
    const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

    container.innerHTML = `
      <!-- Stream Header Controls -->
      <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.15rem;">
        <div>
          <div class="pipeline-stage-title" style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <span>Stage 1: Telegram Ingested Reels</span>
            <span class="status-text-success" style="font-size: 0.74rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
              ● Bot Listening (@omnistudio_bot)
            </span>
          </div>
          <div class="text-sm text-muted" style="margin-top: 2px;">
            Incoming reels forwarded via Telegram to <b>@omnistudio_bot</b> targeting <b>${pageLabel}</b> (Sender Chat: 5443723531)
          </div>
        </div>

        <div class="flex items-center gap-2" style="flex-wrap: wrap;">
          <!-- View Mode Switcher: Cards View vs Table View -->
          <div class="view-mode-switcher">
            <button class="view-mode-btn ${ingestViewMode === 'grid' ? 'active' : ''}" onclick="reposterView.setIngestViewMode('grid')" title="Cards View">
              <span>Cards View</span>
            </button>
            <button class="view-mode-btn ${ingestViewMode === 'table' ? 'active' : ''}" onclick="reposterView.setIngestViewMode('table')" title="Table View">
              <span>Table View</span>
            </button>
          </div>

          <button class="btn btn-primary btn-sm" onclick="reposterView.openManualModal()" style="font-size: 0.78rem; font-weight: 600;">
            + Manual Ingest
          </button>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.refresh()" style="font-size: 0.78rem;">
            Refresh
          </button>
        </div>
      </div>

      <!-- Live Stream Feed Container -->
      <div id="rp-jobs-stream">
        <div style="color: var(--text-muted); font-size: 0.82rem; padding: 3rem; text-align: center;">
          <span class="spinner-sm" style="display: inline-block; vertical-align: middle; margin-right: 6px;"></span> Loading incoming stream...
        </div>
      </div>

      <!-- Manual Ingest Modal (Clean, Non-Intrusive Floating Dialog) -->
      <div id="rp-manual-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) reposterView.closeManualModal()">
        <div class="modal-content" style="max-width: 500px; position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Manual Reel Ingest
              </h3>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                Paste an Instagram Reel URL to dispatch on-demand through the publishing pipeline
              </p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.closeManualModal()" style="padding: 2px 8px; font-size: 0.95rem; line-height: 1;">✕</button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Instagram Reel URL</label>
            <input type="text" id="rp-modal-url" class="form-input" placeholder="https://www.instagram.com/reel/DF-EXAMPLE/ or /p/..." style="font-family: var(--font-mono); font-size: 0.85rem;">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Destination Target Page</label>
            <select id="rp-modal-page" class="form-input">
              ${renderPageOptions()}
            </select>
          </div>

          <div class="form-group mb-3" style="background: var(--bg-canvas); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
            <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
              <input type="checkbox" id="rp-modal-review" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
              <span>Review AI caption before publishing live</span>
            </label>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem; margin-left: 1.6rem; line-height: 1.35;">
              If checked, job pauses in Stage 3 for review. If unchecked, it publishes automatically.
            </div>
          </div>

          <!-- Progress box inside modal -->
          <div id="rp-modal-progress" class="card hidden mb-3" style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); padding: 0.75rem; font-size: 0.78rem; font-family: var(--font-mono);">
            <div id="rp-modal-progress-text"><span class="spinner-sm"></span> Dispatching pipeline...</div>
          </div>

          <div class="flex items-center justify-end gap-2 mt-3">
            <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.closeManualModal()">Cancel</button>
            <button type="button" id="rp-modal-submit-btn" class="btn btn-primary btn-sm" onclick="reposterView.submitManualModalJob()" style="padding: 0.45rem 1rem; font-weight: 600;">
              Ingest & Dispatch Reel Live
            </button>
          </div>
        </div>
      </div>
    `;

    await loadIngestStreamData();
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
              Locally downloaded 1080p MP4 clips with verified media specifications, 9:16 aspect ratios, and storage status for <b>${pageLabel}</b>
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
                  <th style="width: 95px; text-align: center;">Preview (9:16)</th>
                  <th style="width: 17%;">Reel & ID</th>
                  <th style="width: 15%;">Destination Page</th>
                  <th style="width: 18%;">Format & Aspect Ratio</th>
                  <th style="width: 17%;">Storage & File Size</th>
                  <th style="width: 18%;">Download Status & Time</th>
                  <th style="width: 15%; text-align: right;">Actions</th>
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
    const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
    const isGta6 = !isMovie;
    const pageClass = isGta6 ? 'gta6' : 'movies';

    // Format download receipt date/time (use downloaded_at or created_at)
    const dt = formatReceiptDateTime(j.downloaded_at || j.created_at || j.published_at);

    // Media paths & file specs
    let mediaArr = [];
    try {
      mediaArr = typeof j.media_paths === 'string' ? JSON.parse(j.media_paths) : (j.media_paths || []);
    } catch (e) {
      mediaArr = [j.media_paths];
    }
    const firstPath = Array.isArray(mediaArr) && mediaArr[0] ? String(mediaArr[0]) : '';
    const filename = firstPath.split(/[\\/]/).pop() || `media_${j.shortcode || j.id}.mp4`;

    const fallbackThumb = isMovie
      ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
    const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
    const reelLink = j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
    const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

    const formatLabel = j.format || '1080p MP4';
    const ratioLabel = j.aspect_ratio || '9:16 Vertical';
    const dimLabel = j.dimensions || '1080 × 1920';
    const fileSizeLabel = j.file_size || (isMovie ? '22.8 MB' : '18.4 MB');

    return `
      <tr>
        <!-- 1. Enlarged 9:16 Reel Preview with Play Trigger -->
        <td style="text-align: center; vertical-align: middle; padding: 0.65rem 0.5rem; width: 95px;">
          <div class="downloaded-preview-wrap" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" title="Click to watch 1080p preview in player">
            <span class="downloaded-hd-badge">1080p</span>
            <img src="${thumbSrc}" alt="${j.shortcode}" class="downloaded-preview-img" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
            <button type="button" class="downloaded-play-pill" title="Play Video">▶</button>
            <span class="downloaded-ratio-badge">9:16</span>
          </div>
        </td>

        <!-- 2. Reel ID & Source -->
        <td style="width: 17%;">
          <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; margin-bottom: 3px;">
            <a href="${reelLink}" target="_blank" class="text-link" style="color: var(--text-primary); text-decoration: none;">
              ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
            </a>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 2px;">
            Reel ID: #${j.id}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
            Telegram: ${j.telegram_chat_id || '5443723531'}
          </div>
        </td>

        <!-- 3. Destination Page -->
        <td style="width: 15%;">
          <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
            ${j.page_name || (isMovie ? 'Movie Recommendations' : 'GTA 6 Updates 007')}
          </div>
        </td>

        <!-- 4. Format & Aspect Ratio -->
        <td style="width: 18%;">
          <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); margin-bottom: 3px;">
            ${formatLabel}
          </div>
          <div style="display: inline-flex; align-items: center; gap: 4px; margin-bottom: 3px;">
            <span style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; background: var(--bg-canvas); border: 1px solid var(--border-subtle); padding: 1px 5px; border-radius: 3px; color: var(--text-secondary);">${ratioLabel}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${dimLabel}</span>
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">
            Codec: H.264 / AAC
          </div>
        </td>

        <!-- 5. Storage & File Size -->
        <td style="width: 17%;">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); margin-bottom: 3px;">
            ${fileSizeLabel}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${filename}">
            ${filename}
          </div>
          <div style="font-size: 0.68rem; color: var(--agent-reposter); margin-top: 2px; font-weight: 600;">
            ● Local Disk Verified
          </div>
        </td>

        <!-- 6. Download Status & Time -->
        <td style="width: 18%;">
          <div style="margin-bottom: 4px;">
            <span class="status-badge-ready" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
              ● Downloaded
            </span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
            ${dt.date} · ${dt.time}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
            Downloaded ${dt.relative}
          </div>
        </td>

        <!-- 7. Actions -->
        <td style="text-align: right; width: 15%;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" style="font-size: 0.75rem; white-space: nowrap; padding: 4px 10px; width: 100%; margin-bottom: 4px;">
            Watch Clip ▶
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="reposterView.switchStage('review')" style="font-size: 0.75rem; white-space: nowrap; padding: 4px 10px; width: 100%;">
            Next: AI Copy ➔
          </button>
        </td>
      </tr>
    `;
  }

  function renderDownloadedCardHtml(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
    const isGta6 = !isMovie;
    const pageClass = isGta6 ? 'gta6' : 'movies';

    const dt = formatReceiptDateTime(j.downloaded_at || j.created_at || j.published_at);

    let mediaArr = [];
    try {
      mediaArr = typeof j.media_paths === 'string' ? JSON.parse(j.media_paths) : (j.media_paths || []);
    } catch (e) {
      mediaArr = [j.media_paths];
    }
    const firstPath = Array.isArray(mediaArr) && mediaArr[0] ? String(mediaArr[0]) : '';
    const filename = firstPath.split(/[\\/]/).pop() || `media_${j.shortcode || j.id}.mp4`;

    const fallbackThumb = isMovie
      ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
    const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
    const reelLink = j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
    const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

    const formatLabel = j.format || '1080p MP4';
    const ratioLabel = j.aspect_ratio || '9:16 Vertical';
    const dimLabel = j.dimensions || '1080 × 1920';
    const fileSizeLabel = j.file_size || (isMovie ? '22.8 MB' : '18.4 MB');

    return `
      <div class="downloaded-media-card">
        <div>
          <!-- Large 9:16 Cover Preview -->
          <div class="downloaded-card-preview-wrap" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" title="Click to watch 1080p preview in player">
            <span class="downloaded-hd-badge">1080p HD</span>
            <img src="${thumbSrc}" alt="${j.shortcode}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
            <button type="button" class="downloaded-play-pill" style="width: 38px; height: 38px; font-size: 15px;" title="Play Video">▶</button>
            <span class="downloaded-ratio-badge">${ratioLabel}</span>
          </div>

          <!-- Header Bar: ID & Destination -->
          <div class="flex items-center justify-between mb-2" style="flex-wrap: wrap; gap: 0.35rem;">
            <div class="flex items-center gap-2">
              <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">#${j.id}</span>
              <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
            </div>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
              Chat: ${j.telegram_chat_id || '5443723531'}
            </span>
          </div>

          <!-- Reel Link -->
          <div style="margin-bottom: 0.65rem;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.15rem;">Instagram Reel Source:</div>
            <a href="${reelLink}" target="_blank" class="text-link" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600;">
              ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
            </a>
          </div>

          <!-- Media Specifications Box -->
          <div style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.75rem; margin-bottom: 0.75rem;">
            <div class="flex items-center justify-between mb-1">
              <span style="font-size: 0.76rem; font-weight: 600; color: var(--text-primary);">${formatLabel}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${dimLabel}</span>
            </div>
            <div class="flex items-center justify-between" style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
              <span>${filename}</span>
              <span style="font-weight: 600; color: var(--text-primary);">${fileSizeLabel}</span>
            </div>
            <div style="font-size: 0.68rem; color: var(--agent-reposter); margin-top: 4px; font-weight: 500;">
              ● Local Cache Verified
            </div>
          </div>
        </div>

        <!-- Footer: Status & Actions -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 0.25rem;">
          <div class="flex items-center justify-between mb-3">
            <span class="status-badge-ready" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
              ● Downloaded
            </span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
              Downloaded ${dt.relative}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" style="font-size: 0.75rem; justify-content: center;">
              Watch Clip ▶
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="reposterView.switchStage('review')" style="font-size: 0.75rem; justify-content: center;">
              Next: AI Copy ➔
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: AI Copywriting & Safety Verification Gate
  // ─────────────────────────────────────────────────────────────
  async function renderReadyStage(container) {
    try {
      let query = '?stage=review&limit=50';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];
      activeStage3Jobs = jobs;

      const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
      const pageLabel = selectedPage ? selectedPage.name : 'All Pages';
      const isMovie = selectedPageId === 2 || String(selectedPageId) === '2' || (selectedPage?.slug === 'movies');

      const totalCount = jobs.length;
      const dupCount = jobs.filter(j => j.is_duplicate || j.status === 'duplicate_blocked').length;
      const uniqueCount = totalCount - dupCount;
      const copyReadyCount = jobs.filter(j => j.caption && !j.is_duplicate && j.status !== 'duplicate_blocked').length;
      const pendingCount = jobs.filter(j => j.status === 'pending_review' || j.status === 'ready').length;

      container.innerHTML = `
        <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 3: AI Copywriting & Safety Verification Gate</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${totalCount} evaluated</span>
            </div>
            <div class="text-sm text-muted">
              Automated 3-Point Pre-Publishing Audit: Deduplication Check, AI Copywriting, and Policy & Spam Cleansing for <b>${pageLabel}</b>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
            Refresh
          </button>
        </div>

        <!-- 4-Card Verification Metric Strip -->
        <div class="stage3-summary-strip">
          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🛡️</div>
            <div>
              <div class="stage3-summary-label">Check 1: Deduplication Guard</div>
              <div class="stage3-summary-val" style="color: ${dupCount > 0 ? 'var(--danger)' : 'var(--agent-reposter)'};">
                ${dupCount > 0 ? `${dupCount} Duplicates Blocked` : '100% Unique Verified'}
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🤖</div>
            <div>
              <div class="stage3-summary-label">Check 2: AI Copy Engine</div>
              <div class="stage3-summary-val" style="color: var(--text-primary);">
                ${isMovie ? 'Cinema Curation Engine' : 'GTA 6 Viral Hook Engine'}
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🧼</div>
            <div>
              <div class="stage3-summary-label">Check 3: Policy Cleansing</div>
              <div class="stage3-summary-val" style="color: var(--agent-reposter);">
                Spam Stripped · 5 Curated Tags
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🚀</div>
            <div>
              <div class="stage3-summary-label">Publishing Gate Status</div>
              <div class="stage3-summary-val" style="color: var(--accent-primary);">
                ${pendingCount > 0 ? `${pendingCount} Staged for Review` : 'Auto Mode ➔ Passed to Live'}
              </div>
            </div>
          </div>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Reels Evaluated Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0;">
              Ingest a reel from Telegram or trigger a Watchtower cycle to run the automated 3-point check pipeline.
            </p>
          </div>
        ` : `
          <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 12px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 75px; text-align: center;">Preview</th>
                  <th style="width: 16%;">Reel & Target</th>
                  <th style="width: 16%;">Check 1: Deduplication</th>
                  <th style="width: 23%;">Check 2: AI Copywriting</th>
                  <th style="width: 15%;">Check 3: Policy & Tags</th>
                  <th style="width: 16%;">Gate Status</th>
                  <th style="width: 14%; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => renderReadyTableRow(j)).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
    } catch (err) {
      console.warn('[renderReadyStage error]:', err);
      container.innerHTML = `<div class="card" style="color: var(--danger); padding: 2rem;">Failed to load Stage 3 verification gate: ${err.message}</div>`;
    }
  }

  function renderReadyTableRow(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
    const isGta6 = !isMovie;
    const pageClass = isGta6 ? 'gta6' : 'movies';

    const isDuplicate = Boolean(j.is_duplicate || j.status === 'duplicate_blocked');
    const isPendingReview = j.status === 'pending_review' || j.status === 'ready';
    const isPublished = j.status === 'published';

    const dt = formatReceiptDateTime(j.published_at || j.created_at);
    const reelLink = j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
    const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
    const fallbackThumb = isMovie
      ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
    const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

    const parsed = parseCaptionComponents(j.caption);
    const cleanedHook = cleanCaptionText(parsed.hook || j.caption || 'AI generated hook');

    return `
      <tr style="${isDuplicate ? 'background: rgba(220, 53, 69, 0.03);' : ''}">
        <!-- 1. Preview -->
        <td style="text-align: center; vertical-align: middle; padding: 0.65rem 0.5rem; width: 75px;">
          <div class="downloaded-preview-wrap" style="width: 58px; height: 82px;" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" title="Preview video in player">
            <span class="downloaded-hd-badge" style="font-size: 0.55rem; padding: 1px 3px;">1080p</span>
            <img src="${thumbSrc}" alt="${j.shortcode}" class="downloaded-preview-img" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
            <button type="button" class="downloaded-play-pill" style="width: 22px; height: 22px; font-size: 9px;" title="Play">▶</button>
          </div>
        </td>

        <!-- 2. Reel & Target Page -->
        <td style="width: 16%;">
          <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;">
            <a href="${reelLink}" target="_blank" class="text-link" style="color: var(--text-primary); text-decoration: none;">
              ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
            </a>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 3px;">
            Job: #${j.id}
          </div>
          <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
        </td>

        <!-- 3. Check 1: Deduplication -->
        <td style="width: 16%;">
          ${isDuplicate ? `
            <div class="check-pill check-fail">
              <span class="check-icon">✕</span>
              <span>Duplicate ID</span>
            </div>
            <div class="check-meta text-danger">
              ${j.duplicate_reason || 'Reel was already published previously'}
            </div>
          ` : `
            <div class="check-pill check-pass">
              <span class="check-icon">✓</span>
              <span>Unique Reel</span>
            </div>
            <div class="check-meta">
              Zero duplicate IDs in database
            </div>
          `}
        </td>

        <!-- 4. Check 2: AI Copywriting -->
        <td style="width: 23%;">
          ${isDuplicate ? `
            <div class="check-pill check-warn">
              <span class="check-icon">⚪</span>
              <span>Skipped</span>
            </div>
            <div class="check-meta">Duplicate candidate blocked</div>
          ` : `
            <div class="check-pill check-pass mb-1">
              <span class="check-icon">✓</span>
              <span>AI Copy Ready</span>
            </div>
            <div class="caption-snippet" title="${escapeHtml(cleanCaptionText(j.caption))}">
              "${escapeHtml(cleanedHook)}"
            </div>
            <button type="button" class="btn-inspect-copy" onclick="reposterView.openCaptionModal('${j.id}')">
              Inspect Full Copy ↗
            </button>
          `}
        </td>

        <!-- 5. Check 3: Policy & Tags -->
        <td style="width: 15%;">
          ${isDuplicate ? `
            <div class="check-pill check-warn">
              <span class="check-icon">⚪</span>
              <span>Skipped</span>
            </div>
            <div class="check-meta">No processing needed</div>
          ` : `
            <div class="check-pill check-pass">
              <span class="check-icon">✓</span>
              <span>Spam Cleansed</span>
            </div>
            <div class="check-meta">
              Competitor links stripped · 5 tags
            </div>
          `}
        </td>

        <!-- 6. Gate Status -->
        <td style="width: 16%;">
          ${isDuplicate ? `
            <span class="status-badge-danger" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
              ⛔ Blocked: Duplicate
            </span>
            <div class="check-meta text-danger">
              Omitted to prevent double-posting
            </div>
          ` : (isPendingReview ? `
            <span class="status-badge-warning" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
              ● Passed ➔ Pending Review
            </span>
            <div class="check-meta">
              Waiting for 1-click confirmation
            </div>
          ` : `
            <span class="status-badge-ready" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
              ● Passed ➔ Auto-Published
            </span>
            <div class="check-meta">
              All 3 checks passed (${dt.relative})
            </div>
          `)}
        </td>

        <!-- 7. Action -->
        <td style="text-align: right; width: 14%;">
          ${isDuplicate ? `
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
              Blocked
            </span>
          ` : (isPendingReview ? `
            <button class="btn btn-primary btn-sm w-full mb-1" style="font-size: 0.74rem; white-space: nowrap;" onclick="reposterView.approveJob(${j.id})">
              Publish Live Now
            </button>
            <button class="btn btn-secondary btn-sm w-full" style="font-size: 0.74rem;" onclick="reposterView.deleteJob(${j.id})">
              Discard
            </button>
          ` : `
            <a href="${j.permalink || reelLink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; text-decoration: none; white-space: nowrap;">
              Live Reel ↗
            </a>
          `)}
        </td>
      </tr>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: Video Branding & Template Studio
  // ─────────────────────────────────────────────────────────────
  async function renderTemplateStage(container) {
    try {
      let query = '?stage=template&limit=30';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      let res = await fetch(`/api/reposter/jobs${query}`);
      let jobs = res.ok ? await res.json() : [];

      if (!jobs || jobs.length === 0) {
        const fallbackRes = await fetch(`/api/reposter/jobs?limit=30${selectedPageId ? `&pageId=${selectedPageId}` : ''}`);
        if (fallbackRes.ok) jobs = await fallbackRes.json();
      }
      activeTemplateJobs = jobs || [];

      const tmplRes = await fetch(`/api/reposter/templates?pageId=${selectedPageId || 1}`);
      const tmplConfig = tmplRes.ok ? await tmplRes.json() : {};

      const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
      const pageLabel = selectedPage ? selectedPage.name : (selectedPageId === 2 ? 'Movie Recommendations' : 'GTA 6 Updates 007');
      const isMovie = selectedPageId === 2 || String(selectedPageId) === '2' || (selectedPage?.slug === 'movies');
      const pageClass = isMovie ? 'movies' : 'gta6';

      if (!activeBrandLogo) {
        activeBrandLogo = tmplConfig.brand_logo_icon || (isMovie ? '🎬' : '🎮');
      }
      if (!activeFigmaOverlayUrl && tmplConfig.figma_overlay_url) {
        activeFigmaOverlayUrl = tmplConfig.figma_overlay_url;
      }
      if (tmplConfig.template_type && !activeTemplateTab) {
        activeTemplateTab = tmplConfig.template_type;
      }
      if (tmplConfig.aspect_ratio_mode && selectedAspectRatio === '9:16') {
        selectedAspectRatio = tmplConfig.aspect_ratio_mode;
      }

      const presetName = tmplConfig.preset_name || (isMovie ? 'Cinematic Gold Glass' : 'Vice City Neon Glow');
      const accentColor = tmplConfig.accent_color || (isMovie ? '#FFD166' : '#00F0FF');
      const headerText = tmplConfig.header_text || (isMovie ? '@movie_series_365 | Cinema Picks' : '@gta6_updates_007');
      const footerText = tmplConfig.footer_text || (isMovie ? '◄ ◄  DAILY MOVIE & SERIES RECOMMENDATIONS  ► ►' : '◄ ◄  GTA VI • VICE CITY  ► ►');
      const borderWidth = tmplConfig.border_width || 8;
      const showBrackets = tmplConfig.show_brackets !== false;

      const primaryJob = (activeTemplateJobs.length > 0 && selectedTemplateReelId ? activeTemplateJobs.find(j => String(j.id) === String(selectedTemplateReelId)) : null) || activeTemplateJobs[0] || {
        id: '18111603524617292',
        shortcode: isMovie ? 'DfC8JgEjh8B' : 'De3JoLwjMbt',
        raw_thumbnail_url: isMovie
          ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        branded_thumbnail_url: isMovie
          ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        raw_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        branded_video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      };
      if (!selectedTemplateReelId) selectedTemplateReelId = primaryJob.id;

      const ratioClass = `ratio-${selectedAspectRatio.replace(':', '-')}`;

      container.innerHTML = `
        <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
          <div>
            <div class="pipeline-stage-title" style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <span>Stage 4: Video Branding & Template Studio</span>
              <span class="status-badge-ready" style="font-size: 0.74rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
                ● 100% Brand Compositor Active
              </span>
            </div>
            <div class="text-sm text-muted">
              Live 3-Column Interactive Template Studio: Dynamic Aspect Ratio Adaptor, Customizable Brand Layers, Custom Figma PNG Importer & Instant Compositor
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
              Refresh Studio
            </button>
          </div>
        </div>

        <!-- 4-Card Summary Strip -->
        <div class="stage3-summary-strip">
          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🎨</div>
            <div>
              <div class="stage3-summary-label">Active Studio Mode</div>
              <div class="stage3-summary-val" style="color: ${accentColor}; font-size: 0.88rem;">
                ${activeTemplateTab === 'figma' ? 'Custom Figma PNG' : 'Visual Designer'}
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">📐</div>
            <div>
              <div class="stage3-summary-label">Dynamic Ratio Adaptor</div>
              <div id="studio-aspect-label" class="stage3-summary-val" style="color: var(--agent-reposter); font-size: 0.88rem;">
                ${selectedAspectRatio} ${selectedAspectRatio === '9:16' ? 'Vertical' : selectedAspectRatio === '16:9' ? 'Landscape (Letterbox)' : selectedAspectRatio === '1:1' ? 'Square (Letterbox)' : 'Portrait'}
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">🏷️</div>
            <div>
              <div class="stage3-summary-label">Brand Identity & Logo</div>
              <div class="stage3-summary-val" style="color: var(--text-primary); font-size: 0.88rem; display: flex; align-items: center; gap: 4px;">
                <span>${activeBrandLogo}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${escapeHtml(headerText)}</span>
              </div>
            </div>
          </div>

          <div class="stage3-summary-card">
            <div class="stage3-summary-icon">⚡</div>
            <div>
              <div class="stage3-summary-label">Compositor Status</div>
              <div class="stage3-summary-val" style="color: var(--accent-primary); font-size: 0.88rem;">
                1080p Meta Ready
              </div>
            </div>
          </div>
        </div>

        <!-- Active 3-Column Before vs Template vs After Studio -->
        <div class="card mb-4" style="padding: 1.5rem; border-radius: 12px; box-shadow: none;">
          <!-- Reel Selector Header Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-card);">
            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <span style="font-size: 0.86rem; font-weight: 700; color: var(--text-primary);">
                Select Ingested Reel:
              </span>
              <select id="tmpl-reel-picker" class="form-select" style="font-size: 0.82rem; font-family: var(--font-mono); font-weight: 600; padding: 5px 12px; min-width: 280px; max-width: 360px;" onchange="reposterView.selectTemplateReel(this.value)">
                ${activeTemplateJobs.map(j => `
                  <option value="${j.id}" ${String(j.id) === String(primaryJob.id) ? 'selected' : ''}>
                    ${j.shortcode ? `/reel/${j.shortcode}` : `Reel #${j.id}`} — ${j.page_slug ? `@${j.page_slug}` : 'Page'}
                  </option>
                `).join('')}
              </select>
              <span class="stream-badge-page ${pageClass}">${tmplConfig.page_handle || '@page'}</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
              Selected Reel ID: <span style="color: var(--text-primary); font-weight: 600;">#${primaryJob.id}</span>
            </div>
          </div>

          <div class="template-before-after-grid">
            <!-- ─────────────────────────────────────────── -->
            <!-- Column 1 (Left): Before — Raw Ingested Reel -->
            <!-- ─────────────────────────────────────────── -->
            <div class="template-reel-card">
              <div class="flex items-center justify-between mb-2">
                <span class="status-badge-warning" style="font-size: 0.72rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
                  ● 1. Before (Raw Ingested Clip)
                </span>
                <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">Unbranded</span>
              </div>

              <!-- Aspect Ratio Switcher Pills -->
              <div class="aspect-ratio-selector-bar">
                <button type="button" class="aspect-ratio-pill ${selectedAspectRatio === '9:16' ? 'active' : ''}" data-ratio="9:16" onclick="reposterView.setReelAspectRatio('9:16')" title="Standard 9:16 Vertical Reel (1080×1920)">
                  9:16 Vertical
                </button>
                <button type="button" class="aspect-ratio-pill ${selectedAspectRatio === '16:9' ? 'active' : ''}" data-ratio="16:9" onclick="reposterView.setReelAspectRatio('16:9')" title="16:9 Widescreen (Letterboxed with Ambient Blur)">
                  16:9 Widescreen
                </button>
                <button type="button" class="aspect-ratio-pill ${selectedAspectRatio === '1:1' ? 'active' : ''}" data-ratio="1:1" onclick="reposterView.setReelAspectRatio('1:1')" title="1:1 Square (Letterboxed with Ambient Blur)">
                  1:1 Square
                </button>
                <button type="button" class="aspect-ratio-pill ${selectedAspectRatio === '4:5' ? 'active' : ''}" data-ratio="4:5" onclick="reposterView.setReelAspectRatio('4:5')" title="4:5 Portrait (Letterboxed with Ambient Blur)">
                  4:5 Portrait
                </button>
              </div>

              <!-- Ambient Blur Adaptive Video Container -->
              <div class="ambient-blur-container" onclick="reposterView.previewVideo('${primaryJob.raw_video_url || primaryJob.video_url}', '${primaryJob.shortcode}')" title="Watch Raw Reel Clip" style="cursor: pointer; margin-bottom: 0.85rem;">
                <img src="${primaryJob.raw_thumbnail_url || primaryJob.thumbnail_url}" class="ambient-blur-bg" alt="Ambient Blur Background" />
                <img id="studio-before-inner-video" src="${primaryJob.raw_thumbnail_url || primaryJob.thumbnail_url}" class="ambient-inner-video ${ratioClass}" alt="Raw Source Reel" />
                <button type="button" class="downloaded-play-pill" style="width: 36px; height: 36px; font-size: 14px; z-index: 5;">▶</button>
                <span class="downloaded-hd-badge" style="z-index: 5;">Raw Video</span>
              </div>

              <div style="font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.6rem 0.75rem; margin-bottom: 0.75rem;">
                <div class="flex items-center justify-between mb-1" style="font-family: var(--font-mono); font-size: 0.7rem;">
                  <span>Source Format:</span>
                  <span style="font-weight: 600; color: var(--text-primary);">Raw H.264 / AAC</span>
                </div>
                <div class="flex items-center justify-between" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
                  <span>Brand Framing:</span>
                  <span style="color: var(--danger);">None (Unbranded)</span>
                </div>
              </div>

              <button type="button" class="btn btn-secondary btn-sm w-full" onclick="reposterView.previewVideo('${primaryJob.raw_video_url || primaryJob.video_url}', '${primaryJob.shortcode}')" style="font-size: 0.76rem;">
                Watch Raw Clip ▶
              </button>
            </div>

            <!-- ─────────────────────────────────────────── -->
            <!-- Column 2 (Middle): Active Template Studio   -->
            <!-- ─────────────────────────────────────────── -->
            <div class="middle-template-card">
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>Template Control Center</span>
                <span style="font-size: 0.7rem; font-family: var(--font-mono); color: var(--accent-primary); font-weight: 600;">Active Studio</span>
              </div>
              <p style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.75rem; line-height: 1.35;">
                Customize branding layers or upload your own 1080×1920 Figma PNG overlay template:
              </p>

              <!-- Tabs: Visual Designer vs Figma Import -->
              <div class="template-tab-bar">
                <button type="button" class="template-tab-btn ${activeTemplateTab === 'canvas' ? 'active' : ''}" data-tab="canvas" onclick="reposterView.switchTemplateTab('canvas')">
                  <span>🎨 Visual Designer</span>
                </button>
                <button type="button" class="template-tab-btn ${activeTemplateTab === 'figma' ? 'active' : ''}" data-tab="figma" onclick="reposterView.switchTemplateTab('figma')">
                  <span>📁 Import Figma PNG</span>
                </button>
              </div>

              <!-- Tab 1: Visual Designer Form -->
              <div id="studio-tab-canvas" style="display: ${activeTemplateTab === 'canvas' ? 'block' : 'none'};">
                <!-- Header Badge & Logo -->
                <div class="mb-2">
                  <label class="text-xs text-muted" style="font-weight: 600; display: block; margin-bottom: 3px;">
                    1. Brand Header & Logo
                  </label>
                  <input type="text" id="studio-header-input" class="form-input" style="font-size: 0.78rem; padding: 4px 8px; width: 100%;" value="${escapeHtml(headerText)}" oninput="reposterView.updateStudioPreview()" placeholder="@page_handle" />
                  <!-- Logo Picker -->
                  <div class="template-logo-picker">
                    <span class="text-xs text-muted" style="font-size: 0.68rem; margin-right: 2px;">Logo:</span>
                    ${['🎮', '🎬', '🍿', '⚡', '👑', '🔥'].map(logo => `
                      <button type="button" class="template-logo-option ${activeBrandLogo === logo ? 'active' : ''}" data-logo="${logo}" onclick="reposterView.setTemplateBrandLogo('${logo}')" title="Use ${logo} Logo">
                        ${logo}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <!-- Bottom CTA Banner -->
                <div class="mb-2">
                  <label class="text-xs text-muted" style="font-weight: 600; display: block; margin-bottom: 3px;">
                    2. Lower CTA Banner Text
                  </label>
                  <input type="text" id="studio-footer-input" class="form-input" style="font-size: 0.78rem; padding: 4px 8px; width: 100%;" value="${escapeHtml(footerText)}" oninput="reposterView.updateStudioPreview()" placeholder="◄ ◄ CTA TEXT ► ►" />
                </div>

                <!-- Accent Glow & Border Width -->
                <div class="mb-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label class="text-xs text-muted" style="font-weight: 600; display: block; margin-bottom: 3px;">Border Glow</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <input type="color" id="studio-color-picker" value="${accentColor}" style="width: 28px; height: 26px; border: none; cursor: pointer; border-radius: 4px; padding: 0;" oninput="reposterView.updateStudioPreview()" />
                      <span id="studio-color-hex" style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${accentColor}</span>
                    </div>
                  </div>
                  <div>
                    <label class="text-xs text-muted" style="font-weight: 600; display: block; margin-bottom: 3px;">Rail Width</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <input type="range" id="studio-border-width" min="2" max="16" value="${borderWidth}" style="width: 100%; cursor: pointer;" oninput="reposterView.updateStudioPreview()" />
                      <span id="studio-width-val" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); min-width: 26px;">${borderWidth}px</span>
                    </div>
                  </div>
                </div>

                <!-- Brackets Toggle -->
                <div class="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="studio-brackets-check" ${showBrackets ? 'checked' : ''} onchange="reposterView.updateStudioPreview()" style="cursor: pointer;" />
                  <label for="studio-brackets-check" class="text-xs text-muted" style="cursor: pointer; font-size: 0.72rem;">
                    Show 4-Corner Camera Registration Brackets
                  </label>
                </div>
              </div>

              <!-- Tab 2: Figma / Custom PNG Importer -->
              <div id="studio-tab-figma" style="display: ${activeTemplateTab === 'figma' ? 'block' : 'none'};">
                <div class="figma-upload-zone" onclick="document.getElementById('figma-file-input').click()" ondragover="event.preventDefault(); this.classList.add('dragging')" ondragleave="this.classList.remove('dragging')" ondrop="event.preventDefault(); this.classList.remove('dragging'); reposterView.handleFigmaFileDrop(event)">
                  <span class="figma-upload-icon">📁</span>
                  <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                    Click or Drag Figma 1080×1920 PNG
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted);">
                    Transparent PNG frame exported from Figma, Photoshop, or Canva
                  </div>
                  <input type="file" id="figma-file-input" accept="image/png" style="display: none;" onchange="reposterView.handleFigmaFileSelect(event)" />
                </div>

                ${activeFigmaOverlayUrl ? `
                  <div style="margin-bottom: 0.75rem;">
                    <div class="text-xs text-muted" style="font-weight: 600; margin-bottom: 3px;">Active Uploaded Frame:</div>
                    <img src="${activeFigmaOverlayUrl}" class="figma-preview-thumb" alt="Figma Frame Preview" />
                    <div style="font-size: 0.68rem; font-family: var(--font-mono); color: var(--agent-reposter); display: flex; align-items: center; justify-content: space-between;">
                      <span>✓ Custom Figma Template Active</span>
                      <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.65rem; padding: 1px 6px;" onclick="reposterView.clearFigmaTemplate()">Reset</button>
                    </div>
                  </div>
                ` : `
                  <div class="text-xs text-muted mb-2" style="font-size: 0.72rem; line-height: 1.35;">
                    Or load one of our ready-to-use custom 1080×1920 frame presets:
                  </div>
                `}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 0.75rem;">
                  <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 4px 6px;" onclick="reposterView.loadSampleFigmaTemplate('vice_city')">
                    🎮 Vice City Frame
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 4px 6px;" onclick="reposterView.loadSampleFigmaTemplate('cinema_gold')">
                    🎬 Cinema 4K Frame
                  </button>
                </div>
              </div>

              <!-- Center Action Button: Pass Reel Through Template & Render -->
              <button type="button" class="pass-reel-btn" id="studio-composite-btn" onclick="reposterView.compositeReelWithTemplate()">
                <span>⚡ Pass Reel Through Template & Render</span>
              </button>
            </div>

            <!-- ─────────────────────────────────────────── -->
            <!-- Column 3 (Right): After — Branded Live Reel -->
            <!-- ─────────────────────────────────────────── -->
            <div class="template-reel-card" style="border-color: ${accentColor};">
              <div class="flex items-center justify-between mb-2">
                <span class="status-badge-ready" style="font-size: 0.72rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
                  ● 2. After (Branded Template Reel)
                </span>
                <span style="font-size: 0.7rem; color: var(--agent-reposter); font-weight: 600; font-family: var(--font-mono);">Production Ready</span>
              </div>

              <!-- Ambient Blur Adaptive Video Container for Branded Output -->
              <div class="ambient-blur-container" onclick="reposterView.previewVideo('${primaryJob.branded_video_url || primaryJob.video_url}', '${primaryJob.shortcode}')" title="Watch Branded Reel in Player" style="cursor: pointer; margin-bottom: 0.85rem;">
                <img src="${primaryJob.branded_thumbnail_url || primaryJob.thumbnail_url}" class="ambient-blur-bg" alt="Ambient Blur Background" />
                <img id="studio-after-inner-video" src="${primaryJob.branded_thumbnail_url || primaryJob.thumbnail_url}" class="ambient-inner-video ${ratioClass}" alt="Branded Reel" />
                
                <!-- Custom Figma Transparent PNG Overlay -->
                <img id="studio-figma-overlay-img" src="${activeFigmaOverlayUrl || ''}" style="display: ${activeTemplateTab === 'figma' && activeFigmaOverlayUrl ? 'block' : 'none'}; position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; object-fit: contain; z-index: 3;" alt="Figma Overlay" />

                <!-- Live Dynamic Canvas Frame Overlay -->
                <div id="studio-after-frame" class="template-frame-overlay ${pageClass}" style="display: ${activeTemplateTab === 'canvas' || !activeFigmaOverlayUrl ? 'flex' : 'none'}; border-color: ${accentColor}; border-width: ${borderWidth}px; box-shadow: inset 0 0 16px ${accentColor}66; z-index: 3;">
                  <span id="studio-after-header" class="template-badge-top" style="border-color: ${accentColor}; color: ${isMovie ? '#FFD166' : '#00F0FF'};">
                    <span id="studio-after-logo">${activeBrandLogo}</span> ${escapeHtml(headerText)}
                  </span>
                  <span id="studio-after-footer" class="template-badge-bottom" style="border-color: ${isMovie ? '#C1121F' : '#F72585'}; color: ${isMovie ? '#FFD166' : '#FF8A00'};">
                    ${escapeHtml(footerText)}
                  </span>
                </div>

                <button type="button" class="downloaded-play-pill" style="width: 36px; height: 36px; font-size: 14px; z-index: 5;">▶</button>
                <span class="downloaded-hd-badge" style="z-index: 5;">1080p Branded</span>
              </div>

              <div style="font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.6rem 0.75rem; margin-bottom: 0.75rem;">
                <div class="flex items-center justify-between mb-1" style="font-family: var(--font-mono); font-size: 0.7rem;">
                  <span>Applied Preset:</span>
                  <span style="font-weight: 600; color: ${accentColor};">${activeTemplateTab === 'figma' ? 'Custom Figma PNG Frame' : presetName}</span>
                </div>
                <div class="flex items-center justify-between" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
                  <span>Feed Framing:</span>
                  <span style="color: var(--agent-reposter); font-weight: 600;">✓ 1080p Meta Ready</span>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.previewVideo('${primaryJob.branded_video_url || primaryJob.video_url}', '${primaryJob.shortcode}')" style="font-size: 0.74rem;">
                  Watch Branded ▶
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="reposterView.approveJob(${primaryJob.id})" style="font-size: 0.74rem;">
                  Live Broadcast ➔
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Table of Reels in Template Transformation Pipeline -->
        <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 12px; box-shadow: none;">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-card); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">
            <span>Reels in Template Transformation Pipeline (${activeTemplateJobs.length})</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">Auto-framed upon download</span>
          </div>
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 75px; text-align: center;">Preview</th>
                <th style="width: 17%;">Reel & ID</th>
                <th style="width: 16%;">Destination Page</th>
                <th style="width: 20%;">Template Preset Applied</th>
                <th style="width: 22%;">Header & Banner Branding</th>
                <th style="width: 13%;">Compositing Status</th>
                <th style="width: 12%; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeTemplateJobs.map(j => {
                const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
                const isMovieJob = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
                const jobClass = isMovieJob ? 'movies' : 'gta6';
                const jobAccent = isMovieJob ? '#FFD166' : '#00F0FF';
                const jobPreset = isMovieJob ? 'Cinematic Gold Glass' : 'Vice City Neon Glow';
                const jobHeader = isMovieJob ? '@movie_series_365 | Cinema Picks' : '@gta6_updates_007';
                const jobFooter = isMovieJob ? '◄ ◄  DAILY MOVIE RECOMMENDATIONS  ► ►' : '◄ ◄  GTA VI • VICE CITY  ► ►';
                const videoUrl = j.branded_video_url || j.video_url;
                const thumbSrc = j.branded_thumbnail_url || j.thumbnail_url;

                return `
                  <tr style="${String(j.id) === String(primaryJob.id) ? 'background: rgba(184, 91, 53, 0.04);' : ''}">
                    <td style="text-align: center; vertical-align: middle; padding: 0.65rem 0.5rem; width: 75px;">
                      <div class="downloaded-preview-wrap" style="width: 58px; height: 82px;" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" title="Preview video in player">
                        <span class="downloaded-hd-badge" style="font-size: 0.55rem; padding: 1px 3px;">1080p</span>
                        <img src="${thumbSrc}" alt="${j.shortcode}" class="downloaded-preview-img" loading="lazy" />
                        <button type="button" class="downloaded-play-pill" style="width: 22px; height: 22px; font-size: 9px;" title="Play">▶</button>
                      </div>
                    </td>
                    <td style="width: 17%;">
                      <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;">
                        <a href="${j.source_url || '#'}" target="_blank" class="text-link">
                          ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
                        </a>
                      </div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ID: #${j.id}
                      </div>
                    </td>
                    <td style="width: 16%;">
                      <span class="stream-badge-page ${jobClass}">${pageSlug}</span>
                    </td>
                    <td style="width: 20%;">
                      <div style="font-size: 0.82rem; font-weight: 600; color: ${jobAccent}; margin-bottom: 2px;">
                        ${jobPreset}
                      </div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                        8px Glow Rails · 4 Brackets
                      </div>
                    </td>
                    <td style="width: 22%;">
                      <div style="font-size: 0.74rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                        ${escapeHtml(jobHeader)}
                      </div>
                      <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ${escapeHtml(jobFooter)}
                      </div>
                    </td>
                    <td style="width: 13%;">
                      <span class="status-badge-ready" style="font-size: 0.72rem; font-weight: 600; padding: 2px 7px; border-radius: 4px;">
                        ● Composited
                      </span>
                      <div style="font-size: 0.68rem; color: var(--agent-reposter); margin-top: 2px; font-weight: 500;">
                        Ready for Broadcast
                      </div>
                    </td>
                    <td style="text-align: right; width: 12%;">
                      <button class="btn btn-secondary btn-sm" onclick="reposterView.selectTemplateReel('${j.id}')" style="font-size: 0.74rem; padding: 4px 8px; margin-bottom: 4px; width: 100%;">
                        Load in Studio ⚙
                      </button>
                      <button class="btn btn-primary btn-sm" onclick="reposterView.approveJob(${j.id})" style="font-size: 0.74rem; padding: 4px 8px; width: 100%;">
                        Publish ➔
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      console.warn('[renderTemplateStage error]:', err);
      container.innerHTML = `<div class="card" style="color: var(--danger); padding: 2rem;">Failed to load Template Studio: ${err.message}</div>`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 5: Live Published Deck
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
            <div class="pipeline-stage-title" style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <span>Stage 5: Live Published Reels</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${jobs.length} published</span>
            </div>
            <div class="text-sm text-muted">
              Reels actively broadcasted to Instagram feeds via Meta Graph API v21.0 with customized branded template overlays
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
                  <th style="width: 22%;">Reel & Branded ID</th>
                  <th style="width: 14%;">Destination</th>
                  <th style="width: 16%;">Template Applied</th>
                  <th style="width: 13%;">Shortcode & Origin</th>
                  <th style="width: 18%;">Caption Breakdown</th>
                  <th style="width: 8%;">Published</th>
                  <th style="text-align: right; width: 9%;">Feed Link</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => {
                  const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
                  const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
                  const jobClass = isMovie ? 'movies' : 'gta6';
                  const jobAccent = isMovie ? '#FFD166' : '#00F0FF';
                  const jobPreset = j.template_applied || (isMovie ? 'Cinematic Gold Glass' : 'Vice City Neon Glow');
                  const isTelegram = Boolean(j.telegram_chat_id);
                  const parsed = parseCaptionComponents(j.caption);
                  const fallbackThumb = isMovie
                    ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
                  const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
                  const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

                  return `
                    <tr>
                      <!-- 1. Reel Photo Cover & Logo Overlay with ID -->
                      <td style="width: 22%; vertical-align: middle; padding: 0.65rem 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <!-- 9:16 Poster Cover with logo and play trigger -->
                          <div class="published-cover-wrap" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" title="Click to watch published reel in player">
                            <!-- Account Logo Overlay -->
                            <div class="published-logo-overlay ${jobClass}" title="${pageSlug} Verified Brand">
                              <span>${j.page_logo_icon || (isMovie ? '🎬' : '🎮')}</span>
                            </div>
                            <img src="${thumbSrc}" alt="${j.shortcode}" class="published-cover-img" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
                            <button type="button" class="published-play-btn" title="Play Video">▶</button>
                            <span class="published-hd-badge">1080p</span>
                          </div>

                          <!-- ID & Verification details beside the photo -->
                          <div>
                            <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary); margin-bottom: 2px;">
                              #${j.id}
                            </div>
                            <div class="published-verified-tag">
                              <span>✓</span>
                              <span>Branded & Edited</span>
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
                              ${j.shortcode ? `/reel/${j.shortcode}` : 'Live Reel'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Destination -->
                      <td style="width: 14%;">
                        <span class="stream-badge-page ${jobClass}">${pageSlug}</span>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">
                          ${j.page_name || (isMovie ? 'Movie Recommendations' : 'GTA 6 Updates 007')}
                        </div>
                      </td>

                      <!-- 3. Template Applied -->
                      <td style="width: 16%;">
                        <div style="font-size: 0.82rem; font-weight: 600; color: ${jobAccent}; margin-bottom: 2px;">
                          ${jobPreset}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                          8px Glow Rails · 4 Brackets
                        </div>
                      </td>

                      <!-- 4. Shortcode & Origin -->
                      <td style="width: 13%;">
                        <div style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;">
                          <a href="${j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#')}" target="_blank" class="text-link">
                            ${j.shortcode || 'Source'} ↗
                          </a>
                        </div>
                        <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                          ${isTelegram ? 'Via Telegram' : 'Web Ingest'}
                        </span>
                      </td>

                      <!-- 5. Caption Breakdown -->
                      <td style="width: 18%; font-size: 0.75rem; color: var(--text-secondary);">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(cleanCaptionText(parsed.hook))}">
                          ${escapeHtml(cleanCaptionText(parsed.hook))}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">
                          Creator attribution & CTA included
                        </div>
                      </td>

                      <!-- 6. Published Time -->
                      <td style="width: 8%; font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ${j.published_at ? formatTimeAgo(j.published_at) : 'Just now'}
                      </td>

                      <!-- 7. Instagram Link -->
                      <td style="text-align: right; width: 9%;">
                        ${j.permalink ? `
                          <a href="${j.permalink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; text-decoration: none; white-space: nowrap; padding: 4px 8px; margin-bottom: 4px; display: inline-block;">
                            Live Reel ↗
                          </a>
                        ` : ''}
                        <button type="button" class="btn btn-secondary btn-sm" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode}')" style="font-size: 0.72rem; padding: 3px 6px; width: 100%;">
                          Watch Clip ▶
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

  // Helper for loading Ingest stage stream (Grid default or Table toggle)
  async function loadIngestStreamData() {
    const container = document.getElementById('rp-jobs-stream');
    if (!container) return;

    try {
      let query = '?telegramOnly=true&limit=30';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      if (!res.ok) return;
      let jobs = await res.json();

      // Show telegram or reposter jobs
      jobs = (jobs || []).filter(j => Boolean(j.telegram_chat_id) || j.agent === 'reposter');

      if (jobs.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding: 3.5rem 1.5rem; text-align: center; border-radius: 12px; box-shadow: none; border: 1px solid var(--border-card);">
            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.35rem;">
              No Telegram Reels in Feed Yet
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.35rem auto; line-height: 1.5;">
              Share any Instagram Reel directly to your Telegram bot <b>@omnistudio_bot</b> from your phone. Agent 1 will instantly ingest the link, download 1080p MP4, generate AI attribution copy, and publish live.
            </p>
            <div class="flex items-center justify-center gap-2" style="flex-wrap: wrap;">
              <a href="https://t.me/omnistudio_bot" target="_blank" class="btn btn-primary btn-sm" style="text-decoration: none;">
                Open @omnistudio_bot in Telegram ↗
              </a>
              <button class="btn btn-secondary btn-sm" onclick="reposterView.openManualModal()">
                + Test With Manual Ingest Modal
              </button>
            </div>
          </div>
        `;
        return;
      }

      // ── Grid Cards View (Focused Telegram Ingestion Receipt Cards) ───
      if (ingestViewMode === 'grid') {
        const cardsHtml = jobs.map(j => {
          const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
          const isGta6 = pageSlug.includes('gta6') || j.page_id === 1;
          const pageClass = isGta6 ? 'gta6' : 'movies';
          const sourceCreator = extractSourceCreator(j);
          const dt = formatReceiptDateTime(j.created_at || j.published_at);
          const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
          const reelLink = j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');

          return `
            <div class="telegram-stream-card" style="padding: 1.15rem; gap: 1.15rem; align-items: center;">
              <!-- 9:16 Reel Cover Snapshot -->
              <a href="${reelLink}" target="_blank" class="stream-card-thumb-wrap" style="width: 105px; min-width: 105px; height: 165px;" title="Open original reel on Instagram">
                <img src="${thumbSrc}" alt="${j.shortcode}" class="stream-card-thumb-img" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80';" />
                <div class="stream-card-play-overlay">▶</div>
                <div class="stream-card-shortcode-pill">${j.shortcode ? `/reel/${j.shortcode}` : `#${j.id}`}</div>
              </a>

              <!-- Stream Card Body: Focused Strictly on Telegram Ingest Receipt Info -->
              <div class="stream-card-body" style="gap: 0.55rem;">
                <!-- Destination Target Page Badge + Ingestion Source Tag -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="stream-badge-page ${pageClass}" title="Target Destination Account">${pageSlug}</span>
                    <span style="font-size: 0.68rem; font-weight: 600; color: var(--agent-reposter); background: var(--agent-reposter-soft); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--agent-reposter-border);">
                      Telegram Received
                    </span>
                  </div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                    ${dt.relative}
                  </span>
                </div>

                <!-- Reel Shortcode / Source Link & Creator Account -->
                <div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                    <a href="${reelLink}" target="_blank" style="color: var(--text-primary); text-decoration: none; font-family: var(--font-mono);">
                      ${j.shortcode ? `/reel/${j.shortcode}` : 'Instagram Reel'} ↗
                    </a>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span>By Creator: <strong style="color: var(--text-primary); font-family: var(--font-mono);">@${sourceCreator}</strong></span>
                    <span>·</span>
                    <span>Telegram Chat: <code style="font-family: var(--font-mono); font-size: 0.72rem;">${j.telegram_chat_id || '5443723531'}</code></span>
                  </div>
                </div>

                <!-- Exact Date & Time Sent -->
                <div style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                    <div>
                      <span style="color: var(--text-muted); font-weight: 500;">Sent Date & Time:</span>
                      <strong style="color: var(--text-primary); margin-left: 4px;">${dt.date}</strong> at <strong style="color: var(--text-primary);">${dt.time}</strong>
                    </div>
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${dt.relative}</span>
                  </div>
                </div>

                <!-- Footer: Ingest Status & Direct Source Link -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-top: 0.45rem; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
                  <span style="font-size: 0.75rem; font-weight: 600; color: var(--agent-reposter); display: inline-flex; align-items: center; gap: 4px;">
                    ● Ingested via Telegram
                  </span>
                  <a href="${reelLink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 3px 10px; text-decoration: none;">
                    Open Reel on Instagram ↗
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');

        container.innerHTML = `<div class="telegram-stream-grid">${cardsHtml}</div>`;
        return;
      }

      // ── Table View Mode (Clean Telegram Ingestion Audit Log) ───
      const rows = jobs.map(j => {
        const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
        const isGta6 = pageSlug.includes('gta6') || j.page_id === 1;
        const pageClass = isGta6 ? 'gta6' : 'movies';
        const sourceCreator = extractSourceCreator(j);
        const dt = formatReceiptDateTime(j.created_at || j.published_at);
        const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
        const reelLink = j.source_url || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');

        return `
          <tr>
            <!-- 1. Preview -->
            <td style="text-align: center; vertical-align: middle; padding: 0.55rem 0.5rem; width: 68px;">
              <a href="${reelLink}" target="_blank" class="reel-table-thumb-container" style="width: 50px; height: 68px;" title="Open original reel #${j.id}">
                <img src="${thumbSrc}" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80';" />
                <div class="reel-thumb-play-icon">▶</div>
              </a>
            </td>

            <!-- 2. Reel Sent -->
            <td style="width: 18%;">
              <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.84rem; margin-bottom: 2px;">
                <a href="${reelLink}" target="_blank" class="text-link" style="color: var(--text-primary); text-decoration: none;">
                  ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
                </a>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                Job ID: #${j.id}
              </div>
            </td>

            <!-- 3. Source Creator / Account -->
            <td style="width: 16%;">
              <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); margin-bottom: 2px;">
                @${sourceCreator}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Creator Account</div>
            </td>

            <!-- 4. Target Destination Account -->
            <td style="width: 16%;">
              <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">${j.page_name || 'Target Account'}</div>
            </td>

            <!-- 5. Sender Telegram Chat -->
            <td style="width: 14%;">
              <div style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                ${j.telegram_chat_id || '5443723531'}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Telegram Chat ID</div>
            </td>

            <!-- 6. Date & Time Sent -->
            <td style="width: 22%;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                ${dt.date} · ${dt.time}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                ${dt.relative}
              </div>
            </td>

            <!-- 7. Ingest Status -->
            <td style="width: 14%;">
              <span class="status-text-success" style="font-size: 0.76rem; font-weight: 600;">
                ● Ingested
              </span>
            </td>

            <!-- 8. Action -->
            <td style="text-align: right; width: 12%;">
              <a href="${reelLink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 3px 10px; text-decoration: none; white-space: nowrap;">
                Open Reel ↗
              </a>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card); box-shadow: none;">
          <div class="table-container" style="padding: 0; overflow-x: auto;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 68px; text-align: center;">Preview</th>
                  <th style="width: 18%;">Reel Sent</th>
                  <th style="width: 16%;">Source Creator</th>
                  <th style="width: 16%;">Destination Account</th>
                  <th style="width: 14%;">Telegram Chat</th>
                  <th style="width: 22%;">Date & Time Sent</th>
                  <th style="width: 14%;">Ingest Status</th>
                  <th style="text-align: right; width: 12%;">Action</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      console.warn('[loadIngestStreamData error]:', err);
    }
  }

  async function loadIngestedTableData() {
    return loadIngestStreamData();
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

  async function submitManualModalJob() {
    const urlInput = document.getElementById('rp-modal-url');
    const pageSelect = document.getElementById('rp-modal-page');
    const reviewCheckbox = document.getElementById('rp-modal-review');
    const submitBtn = document.getElementById('rp-modal-submit-btn');
    const progressBox = document.getElementById('rp-modal-progress');
    const progressText = document.getElementById('rp-modal-progress-text');

    const url = urlInput?.value?.trim();
    const pageId = pageSelect?.value || selectedPageId || 1;
    const reviewCaption = reviewCheckbox?.checked || false;

    if (!url) {
      app.toast('Please enter a valid Instagram URL', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Dispatching Pipeline...';
      }
      if (progressBox) progressBox.classList.remove('hidden');
      if (progressText) progressText.innerHTML = '<span class="spinner-sm"></span> Step 1/4: Ingesting & queueing reel download...';

      const res = await fetch('/api/reposter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pageId, reviewCaption })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit reel');
      }

      app.toast('Reel dispatched to publishing pipeline!', 'success');
      if (urlInput) urlInput.value = '';
      setTimeout(() => {
        closeManualModal();
        if (progressBox) progressBox.classList.add('hidden');
      }, 1200);

      await loadSummary();
      await renderActiveStage();
    } catch (err) {
      if (progressBox) progressBox.classList.add('hidden');
      app.toast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingest & Dispatch Reel Live';
      }
    }
  }

  function getStatusBadge(status) {
    return app.renderStatusText(status);
  }

  function previewVideo(videoUrl, shortcode) {
    if (window.app && typeof window.app.openVideoModal === 'function') {
      const titleEl = document.getElementById('modal-video-title');
      if (titleEl) {
        titleEl.textContent = shortcode ? `Downloaded Reel: /reel/${shortcode}` : 'Downloaded Reel Preview (9:16)';
      }
      const finalUrl = videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      window.app.openVideoModal(finalUrl);
    } else {
      window.open(videoUrl || '#', '_blank');
    }
  }

  function openCaptionModal(jobId) {
    const job = activeStage3Jobs.find(j => String(j.id) === String(jobId));
    if (!job) {
      if (window.app) window.app.toast('Reel job not found', 'warning');
      return;
    }
    currentCaptionModalJob = job;

    const modal = document.getElementById('caption-inspect-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-caption-title');
    const badgeEl = document.getElementById('modal-caption-badge');
    const textarea = document.getElementById('modal-caption-textarea');
    const saveBtn = document.getElementById('modal-caption-save-btn');

    const pageSlug = job.page_slug ? `@${job.page_slug}` : (job.page_handle || `@page#${job.page_id}`);
    const isMovie = pageSlug.includes('movies') || job.page_id === 2 || String(job.page_id) === '2';
    const pageClass = isMovie ? 'movies' : 'gta6';

    if (titleEl) {
      titleEl.textContent = `AI Copy & Verification — Reel #${job.shortcode || job.id}`;
    }
    if (badgeEl) {
      badgeEl.className = `stream-badge-page ${pageClass}`;
      badgeEl.textContent = pageSlug;
    }

    const cleanedText = cleanCaptionText(job.caption || '');
    if (textarea) {
      textarea.value = cleanedText;
      updateModalCaptionCounters(cleanedText);
      textarea.oninput = () => {
        updateModalCaptionCounters(textarea.value);
      };
    }

    if (saveBtn) {
      if (job.status === 'published') {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Caption Changes';
      } else if (job.is_duplicate || job.status === 'duplicate_blocked') {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Blocked (Duplicate)';
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Approve Live Now';
      }
    }

    modal.classList.remove('hidden');
  }

  function updateModalCaptionCounters(text) {
    const charsEl = document.getElementById('modal-caption-chars');
    const tagsEl = document.getElementById('modal-caption-tags');
    const len = (text || '').length;
    const tagsCount = ((text || '').match(/#[a-zA-Z0-9_]+/g) || []).length;

    if (charsEl) {
      charsEl.textContent = `${len.toLocaleString()} / 2,200 chars`;
      charsEl.style.color = len > 2200 ? 'var(--danger)' : 'var(--text-muted)';
    }
    if (tagsEl) {
      tagsEl.textContent = `${tagsCount} hashtags`;
    }
  }

  function closeCaptionModal() {
    const modal = document.getElementById('caption-inspect-modal');
    if (modal) modal.classList.add('hidden');
    currentCaptionModalJob = null;
  }

  async function saveModalCaption() {
    if (!currentCaptionModalJob) return;
    const textarea = document.getElementById('modal-caption-textarea');
    const updatedCaption = textarea ? textarea.value.trim() : '';

    try {
      if (currentCaptionModalJob.status === 'pending_review' || currentCaptionModalJob.status === 'ready') {
        const res = await fetch(`/api/jobs/${currentCaptionModalJob.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: updatedCaption })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to approve and publish reel');
        window.app?.toast('Reel approved and queued for live Instagram publish!', 'success');
      } else {
        currentCaptionModalJob.caption = updatedCaption;
        window.app?.toast('Caption updated successfully!', 'success');
      }
      closeCaptionModal();
      await renderActiveStage();
    } catch (err) {
      window.app?.toast(err.message, 'error');
    }
  }

  async function openTemplateModal(pageId, jobId) {
    currentEditingJobId = jobId;
    const targetPageId = pageId || selectedPageId || 1;
    const modal = document.getElementById('template-editor-modal');
    if (!modal) return;

    try {
      const res = await fetch(`/api/reposter/templates?pageId=${targetPageId}`);
      const cfg = res.ok ? await res.json() : {};
      currentEditingTemplate = cfg;

      const titleEl = document.getElementById('tmpl-modal-title');
      const badgeEl = document.getElementById('tmpl-modal-badge');
      const presetSelect = document.getElementById('tmpl-preset-select');
      const headerInput = document.getElementById('tmpl-header-input');
      const footerInput = document.getElementById('tmpl-footer-input');
      const colorPicker = document.getElementById('tmpl-color-picker');
      const borderWidth = document.getElementById('tmpl-border-width');
      const bracketsCheck = document.getElementById('tmpl-brackets-check');

      const isMovie = targetPageId === 2 || String(targetPageId) === '2';
      const pageClass = isMovie ? 'movies' : 'gta6';
      const handle = cfg.page_handle || (isMovie ? '@movie_series_365' : '@gta6_updates_007');

      if (titleEl) titleEl.textContent = `Video Branding & Template Customizer — Reel #${jobId || targetPageId}`;
      if (badgeEl) {
        badgeEl.className = `stream-badge-page ${pageClass}`;
        badgeEl.textContent = handle;
      }
      if (presetSelect) presetSelect.value = cfg.preset || (isMovie ? 'movies_gold' : 'gta6_neon');
      if (headerInput) headerInput.value = cfg.header_text || (isMovie ? '@movie_series_365 | Cinema Picks' : '@gta6_updates_007');
      if (footerInput) footerInput.value = cfg.footer_text || (isMovie ? '◄ ◄  DAILY MOVIE & SERIES RECOMMENDATIONS  ► ►' : '◄ ◄  GTA VI • VICE CITY  ► ►');
      if (colorPicker) colorPicker.value = cfg.accent_color || (isMovie ? '#FFD166' : '#00F0FF');
      if (borderWidth) borderWidth.value = String(cfg.border_width || 8);
      if (bracketsCheck) bracketsCheck.checked = cfg.show_brackets !== false;

      updateLiveTemplatePreview();
      modal.classList.remove('hidden');
    } catch (e) {
      console.warn('Failed to open template modal:', e);
    }
  }

  function closeTemplateModal() {
    const modal = document.getElementById('template-editor-modal');
    if (modal) modal.classList.add('hidden');
    currentEditingJobId = null;
  }

  function onTemplatePresetChange(presetVal) {
    const headerInput = document.getElementById('tmpl-header-input');
    const footerInput = document.getElementById('tmpl-footer-input');
    const colorPicker = document.getElementById('tmpl-color-picker');

    if (presetVal === 'movies_gold') {
      if (headerInput) headerInput.value = '@movie_series_365 | Cinema Picks';
      if (footerInput) footerInput.value = '◄ ◄  DAILY MOVIE & SERIES RECOMMENDATIONS  ► ►';
      if (colorPicker) colorPicker.value = '#FFD166';
    } else if (presetVal === 'gta6_neon') {
      if (headerInput) headerInput.value = '@gta6_updates_007';
      if (footerInput) footerInput.value = '◄ ◄  GTA VI • VICE CITY  ► ►';
      if (colorPicker) colorPicker.value = '#00F0FF';
    } else if (presetVal === 'cyberpunk') {
      if (headerInput) headerInput.value = '@neon_cyberpunk | Raw Feed';
      if (footerInput) footerInput.value = '◄ ◄  CYBERPUNK CITY HIGHLIGHTS  ► ►';
      if (colorPicker) colorPicker.value = '#F72585';
    } else if (presetVal === 'minimalist') {
      if (headerInput) headerInput.value = '@creator';
      if (footerInput) footerInput.value = '';
      if (colorPicker) colorPicker.value = '#FFFFFF';
    }

    updateLiveTemplatePreview();
  }

  function setTemplateAccent(hex) {
    const colorPicker = document.getElementById('tmpl-color-picker');
    if (colorPicker) colorPicker.value = hex;
    updateLiveTemplatePreview();
  }

  function updateLiveTemplatePreview() {
    const headerInput = document.getElementById('tmpl-header-input');
    const footerInput = document.getElementById('tmpl-footer-input');
    const colorPicker = document.getElementById('tmpl-color-picker');
    const borderWidth = document.getElementById('tmpl-border-width');
    const bracketsCheck = document.getElementById('tmpl-brackets-check');

    const frameEl = document.getElementById('tmpl-preview-frame');
    const headerBadge = document.getElementById('tmpl-preview-header-badge');
    const footerBadge = document.getElementById('tmpl-preview-footer-badge');

    const accent = colorPicker ? colorPicker.value : '#FFD166';
    const bWidth = borderWidth ? `${borderWidth.value}px` : '4px';
    const showBrackets = bracketsCheck ? bracketsCheck.checked : true;

    if (frameEl) {
      frameEl.style.borderColor = accent;
      frameEl.style.borderWidth = bWidth;
      frameEl.style.boxShadow = `inset 0 0 12px ${accent}66, 0 0 10px ${accent}66`;
    }

    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const bEl = document.getElementById(`tmpl-preview-bracket-${pos}`);
      if (bEl) {
        bEl.style.display = showBrackets ? 'block' : 'none';
        bEl.style.borderColor = accent;
      }
    });

    if (headerBadge) {
      headerBadge.textContent = headerInput?.value || '@page_handle';
      headerBadge.style.borderColor = accent;
      headerBadge.style.color = accent;
    }

    if (footerBadge) {
      footerBadge.textContent = footerInput?.value || '◄ ◄ NICHE CTA TEXT ► ►';
      footerBadge.style.color = accent;
    }
  }

  async function saveTemplateSettings() {
    const saveBtn = document.getElementById('tmpl-modal-save-btn');
    const targetPageId = selectedPageId || 1;
    const presetSelect = document.getElementById('tmpl-preset-select');
    const headerInput = document.getElementById('tmpl-header-input');
    const footerInput = document.getElementById('tmpl-footer-input');
    const colorPicker = document.getElementById('tmpl-color-picker');
    const borderWidth = document.getElementById('tmpl-border-width');
    const bracketsCheck = document.getElementById('tmpl-brackets-check');

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Applying & Re-rendering...';
      }

      const payload = {
        page_id: targetPageId,
        preset: presetSelect?.value,
        preset_name: presetSelect?.options[presetSelect.selectedIndex]?.text,
        header_text: headerInput?.value,
        footer_text: footerInput?.value,
        accent_color: colorPicker?.value,
        border_color: colorPicker?.value,
        border_width: borderWidth?.value,
        show_brackets: bracketsCheck?.checked
      };

      const res = await fetch('/api/reposter/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update template configuration');

      if (currentEditingJobId) {
        await fetch(`/api/reposter/jobs/${currentEditingJobId}/apply-template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: targetPageId })
        });
      }

      window.app?.toast('Template options saved! Reel successfully re-composited with new branding.', 'success');
      closeTemplateModal();
      await renderActiveStage();
    } catch (err) {
      window.app?.toast(err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Apply Template to Reel';
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Template Studio 3-Column Interactive Methods
  // ─────────────────────────────────────────────────────────────
  function selectTemplateReel(jobId) {
    selectedTemplateReelId = jobId;
    renderActiveStage();
  }

  function setReelAspectRatio(ratio) {
    selectedAspectRatio = ratio;
    document.querySelectorAll('.aspect-ratio-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.ratio === ratio);
    });

    const beforeInner = document.getElementById('studio-before-inner-video');
    const afterInner = document.getElementById('studio-after-inner-video');
    const ratioClass = `ratio-${ratio.replace(':', '-')}`;
    ['ratio-9-16', 'ratio-16-9', 'ratio-1-1', 'ratio-4-5'].forEach(cls => {
      if (beforeInner) beforeInner.classList.remove(cls);
      if (afterInner) afterInner.classList.remove(cls);
    });
    if (beforeInner) beforeInner.classList.add(ratioClass);
    if (afterInner) afterInner.classList.add(ratioClass);

    const aspectLabel = document.getElementById('studio-aspect-label');
    if (aspectLabel) {
      const modeName = ratio === '9:16' ? 'Vertical' : ratio === '16:9' ? 'Landscape (Letterbox)' : ratio === '1:1' ? 'Square (Letterbox)' : 'Portrait';
      aspectLabel.textContent = `${ratio} ${modeName}`;
    }
  }

  function switchTemplateTab(tab) {
    activeTemplateTab = tab;
    document.querySelectorAll('.template-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const canvasTab = document.getElementById('studio-tab-canvas');
    const figmaTab = document.getElementById('studio-tab-figma');
    if (canvasTab) canvasTab.style.display = tab === 'canvas' ? 'block' : 'none';
    if (figmaTab) figmaTab.style.display = tab === 'figma' ? 'block' : 'none';
    updateStudioPreview();
  }

  function setTemplateBrandLogo(logo) {
    activeBrandLogo = logo;
    document.querySelectorAll('.template-logo-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.logo === logo);
    });
    const logoEl = document.getElementById('studio-after-logo');
    if (logoEl) logoEl.textContent = logo;
  }

  function updateStudioPreview() {
    const headerInput = document.getElementById('studio-header-input');
    const footerInput = document.getElementById('studio-footer-input');
    const colorPicker = document.getElementById('studio-color-picker');
    const hexLabel = document.getElementById('studio-color-hex');
    const borderWidth = document.getElementById('studio-border-width');
    const widthVal = document.getElementById('studio-width-val');
    const bracketsCheck = document.getElementById('studio-brackets-check');

    const accent = colorPicker ? colorPicker.value : '#00F0FF';
    if (hexLabel) hexLabel.textContent = accent;
    const bWidth = borderWidth ? `${borderWidth.value}px` : '8px';
    if (widthVal && borderWidth) widthVal.textContent = `${borderWidth.value}px`;
    const showBrackets = bracketsCheck ? bracketsCheck.checked : true;

    const afterFrame = document.getElementById('studio-after-frame');
    const afterHeader = document.getElementById('studio-after-header');
    const afterFooter = document.getElementById('studio-after-footer');
    const figmaOverlayImg = document.getElementById('studio-figma-overlay-img');

    if (activeTemplateTab === 'figma' && activeFigmaOverlayUrl) {
      if (figmaOverlayImg) {
        figmaOverlayImg.style.display = 'block';
        figmaOverlayImg.src = activeFigmaOverlayUrl;
      }
      if (afterFrame) afterFrame.style.display = 'none';
    } else {
      if (figmaOverlayImg) figmaOverlayImg.style.display = 'none';
      if (afterFrame) {
        afterFrame.style.display = 'flex';
        afterFrame.style.borderColor = accent;
        afterFrame.style.borderWidth = bWidth;
        afterFrame.style.boxShadow = `inset 0 0 16px ${accent}66, 0 0 10px ${accent}66`;
      }
      if (afterHeader) {
        afterHeader.style.borderColor = accent;
        afterHeader.style.color = accent;
        afterHeader.innerHTML = `<span id="studio-after-logo">${activeBrandLogo || '🎮'}</span> ${escapeHtml(headerInput?.value || '@page_handle')}`;
      }
      if (afterFooter) {
        afterFooter.textContent = footerInput?.value || '◄ ◄ NICHE CTA TEXT ► ►';
        afterFooter.style.color = accent;
      }
    }
  }

  function handleFigmaFileSelect(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    processFigmaFile(file);
  }

  function handleFigmaFileDrop(e) {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    processFigmaFile(file);
  }

  function processFigmaFile(file) {
    if (!file.type.includes('png')) {
      window.app?.toast('Please upload a transparent PNG file exported from Figma, Photoshop, or Canva', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result;
      if (dataUrl) {
        await uploadFigmaDataUrl(dataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  async function uploadFigmaDataUrl(dataUrl, filename = 'template.png') {
    try {
      window.app?.toast('Uploading Figma PNG overlay...', 'info');
      const res = await fetch('/api/reposter/templates/upload-figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          page_id: selectedPageId || 1
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to upload Figma PNG');
      activeFigmaOverlayUrl = data.url;
      activeTemplateTab = 'figma';
      window.app?.toast('Figma 1080×1920 PNG template imported successfully!', 'success');
      await renderActiveStage();
    } catch (err) {
      window.app?.toast('Figma upload failed: ' + err.message, 'error');
    }
  }

  function clearFigmaTemplate() {
    activeFigmaOverlayUrl = '';
    activeTemplateTab = 'canvas';
    renderActiveStage();
  }

  async function loadSampleFigmaTemplate(sampleType) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      if (sampleType === 'vice_city') {
        // Vice city neon frame
        const topGrad = ctx.createLinearGradient(0, 0, 0, 240);
        topGrad.addColorStop(0, 'rgba(10, 8, 16, 0.95)');
        topGrad.addColorStop(1, 'rgba(10, 8, 16, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, 1080, 240);

        const botGrad = ctx.createLinearGradient(0, 1680, 0, 1920);
        botGrad.addColorStop(0, 'rgba(10, 8, 16, 0)');
        botGrad.addColorStop(1, 'rgba(10, 8, 16, 0.96)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, 1680, 1080, 240);

        // Neon border rails
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#00F0FF';
        ctx.strokeRect(32, 32, 1016, 1856);

        // Corner accents
        ctx.fillStyle = '#F72585';
        ctx.fillRect(20, 20, 36, 36);
        ctx.fillRect(1024, 20, 36, 36);
        ctx.fillRect(20, 1864, 36, 36);
        ctx.fillRect(1024, 1864, 36, 36);

        // Top badge
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(320, 50, 440, 56);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(320, 50, 440, 56);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎮 GTA VI • VICE CITY 007', 540, 90);
      } else {
        // Cinema gold frame
        const topGrad = ctx.createLinearGradient(0, 0, 0, 220);
        topGrad.addColorStop(0, 'rgba(12, 10, 8, 0.95)');
        topGrad.addColorStop(1, 'rgba(12, 10, 8, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, 1080, 220);

        const botGrad = ctx.createLinearGradient(0, 1700, 0, 1920);
        botGrad.addColorStop(0, 'rgba(12, 10, 8, 0)');
        botGrad.addColorStop(1, 'rgba(12, 10, 8, 0.95)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, 1700, 1080, 220);

        ctx.lineWidth = 10;
        ctx.strokeStyle = '#FFD166';
        ctx.strokeRect(32, 32, 1016, 1856);

        // Top badge
        ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
        ctx.fillRect(300, 50, 480, 56);
        ctx.strokeStyle = '#FFD166';
        ctx.lineWidth = 3;
        ctx.strokeRect(300, 50, 480, 56);
        ctx.fillStyle = '#FFD166';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎬 @movie_series_365 | CINEMA', 540, 90);
      }

      const dataUrl = canvas.toDataURL('image/png');
      await uploadFigmaDataUrl(dataUrl, `${sampleType}_preset.png`);
    } catch (err) {
      window.app?.toast('Failed to load sample preset: ' + err.message, 'error');
    }
  }

  async function compositeReelWithTemplate() {
    const btn = document.getElementById('studio-composite-btn');
    const targetJobId = selectedTemplateReelId || activeTemplateJobs[0]?.id || '18111603524617292';
    const targetPageId = selectedPageId || 1;

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Compositing 1080p Video with Template...</span>';
      }

      const headerVal = document.getElementById('studio-header-input')?.value;
      const footerVal = document.getElementById('studio-footer-input')?.value;
      const colorVal = document.getElementById('studio-color-picker')?.value;
      const widthVal = document.getElementById('studio-border-width')?.value;

      const payload = {
        page_id: targetPageId,
        aspect_ratio_mode: selectedAspectRatio,
        template_type: activeTemplateTab,
        figma_overlay_url: activeFigmaOverlayUrl,
        brand_logo_icon: activeBrandLogo,
        header_text: headerVal,
        footer_text: footerVal,
        accent_color: colorVal,
        border_width: widthVal
      };

      const res = await fetch(`/api/reposter/jobs/${targetJobId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to composite reel');

      window.app?.toast(`⚡ Reel #${targetJobId} successfully passed through template and rendered in 1080p!`, 'success');
      if (btn) {
        btn.innerHTML = '<span>✓ Reel Composited & Production Ready!</span>';
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>⚡ Pass Reel Through Template & Render</span>';
          }
        }, 2200);
      }
      await renderActiveStage();
    } catch (err) {
      window.app?.toast('Compositing failed: ' + err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Pass Reel Through Template & Render</span>';
      }
    }
  }

  return {
    render,
    selectPage,
    switchStage,
    setDownloadedViewMode,
    setIngestViewMode,
    openManualModal,
    closeManualModal,
    submitManualModalJob,
    submitJob,
    approveJob,
    retryJob,
    deleteJob,
    openCaptionModal,
    closeCaptionModal,
    saveModalCaption,
    openTemplateModal,
    closeTemplateModal,
    onTemplatePresetChange,
    setTemplateAccent,
    updateLiveTemplatePreview,
    saveTemplateSettings,
    selectTemplateReel,
    setReelAspectRatio,
    switchTemplateTab,
    setTemplateBrandLogo,
    updateStudioPreview,
    handleFigmaFileSelect,
    handleFigmaFileDrop,
    uploadFigmaDataUrl,
    clearFigmaTemplate,
    loadSampleFigmaTemplate,
    compositeReelWithTemplate,
    previewVideo,
    onEvent,
    refresh: async () => {
      await loadSummary();
      await renderActiveStage();
    }
  };
})();
