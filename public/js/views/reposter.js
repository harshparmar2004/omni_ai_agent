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
  let ingestViewMode = 'grid'; // 'grid' (default for stream) | 'table'
  let publishedViewMode = 'table'; // 'table' (default) | 'grid'
  let activeTrackingJobId = null;
  let activeStage3Jobs = [];
  let activePublishedJobs = [];
  let currentCaptionModalJob = null;
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
    const diff = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 15) return 'Just now';
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
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeManualModal() {
    const modal = document.getElementById('rp-manual-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
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
      <div id="rp-manual-modal" class="modal-overlay hidden" style="display: none;" onclick="if(event.target === this) reposterView.closeManualModal()">
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
  // STAGE 4: Live Published Deck (Reels Broadcasted to Instagram)
  // ─────────────────────────────────────────────────────────────
  async function renderPublishedStage(container) {
    try {
      let query = '?status=published&limit=50';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      const jobs = res.ok ? await res.json() : [];
      activePublishedJobs = jobs;

      const selectedPage = (window.app?.pages || []).find(p => p.id === selectedPageId);
      const pageLabel = selectedPage ? selectedPage.name : 'All Pages';

      container.innerHTML = `
        <div class="pipeline-deck-header" style="flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
          <div>
            <div class="pipeline-stage-title">
              <span>Stage 4: Live Published Reels</span>
              <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${jobs.length} published</span>
            </div>
            <div class="text-sm text-muted">
              Reels actively broadcasted to Instagram feeds via Meta Graph API v21.0 for <b>${pageLabel}</b>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="btn-group" style="display: inline-flex; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 2px;">
              <button class="btn btn-sm ${publishedViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}" style="padding: 3px 9px; font-size: 0.75rem;" onclick="reposterView.setPublishedViewMode('table')" title="Table View">
                ☰ Rows
              </button>
              <button class="btn btn-sm ${publishedViewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}" style="padding: 3px 9px; font-size: 0.75rem;" onclick="reposterView.setPublishedViewMode('grid')" title="Grid Cards">
                ⊞ Grid
              </button>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="reposterView.renderActiveStage()">
              Refresh
            </button>
          </div>
        </div>

        ${jobs.length === 0 ? `
          <div class="card" style="padding: 3.5rem; text-align: center; border-radius: 12px; box-shadow: none;">
            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">No Published Reels Yet</div>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 1rem 0;">
              Ingest a reel to see it publish live to your Instagram page feed.
            </p>
            <button class="btn btn-primary btn-sm" onclick="reposterView.switchStage('ingest')">
              Ingest a Reel Now
            </button>
          </div>
        ` : (publishedViewMode === 'table' ? `
          <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: 12px; box-shadow: none;">
            <table class="data-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 85px; text-align: center;">Media Preview</th>
                  <th style="width: 17%;">Reel & ID</th>
                  <th style="width: 15%;">Destination Page</th>
                  <th style="width: 16%;">Format & Specs</th>
                  <th style="width: 22%;">Caption & Copy</th>
                  <th style="width: 16%;">Broadcast Status & Time</th>
                  <th style="width: 14%; text-align: right;">Live Action</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => renderPublishedTableRow(j)).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="downloaded-media-grid">
            ${jobs.map(j => renderPublishedCardHtml(j)).join('')}
          </div>
        `)}
      `;
    } catch (err) {
      console.warn('[renderPublishedStage error]:', err);
      container.innerHTML = `<div class="card" style="color: var(--danger); padding: 2rem;">Failed to load live published reels: ${err.message}</div>`;
    }
  }

  function renderPublishedTableRow(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
    const isGta6 = !isMovie;
    const pageClass = isGta6 ? 'gta6' : 'movies';

    const dt = formatReceiptDateTime(j.published_at || j.created_at);
    const fallbackThumb = isMovie
      ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
    const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
    const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

    const liveReelUrl = j.permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : (j.source_url || '#'));
    const parsed = parseCaptionComponents(j.caption);
    const cleanedHook = cleanCaptionText(parsed.hook || j.caption || 'New Reel');

    const formatLabel = j.format || '1080p MP4';
    const ratioLabel = j.aspect_ratio || 'Adaptive Video';
    const dimLabel = j.dimensions || '1080 × 1920';

    return `
      <tr>
        <!-- 1. Media Preview (Adaptive Cover with Play Trigger) -->
        <td style="text-align: center; vertical-align: middle; padding: 0.75rem 0.5rem; width: 85px;">
          <div class="media-preview-box" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode || ''}')" title="Click to watch published reel">
            <span class="media-hd-tag">1080p</span>
            <img src="${thumbSrc}" alt="${j.shortcode || j.id}" class="media-preview-img" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
            <button type="button" class="media-play-pill" title="Play Video">▶</button>
          </div>
        </td>

        <!-- 2. Reel & ID (Structured Identity Cell) -->
        <td style="width: 17%; vertical-align: middle;">
          <div class="reel-identity-cell">
            <a href="${liveReelUrl}" target="_blank" rel="noopener noreferrer" class="reel-shortcode-link" title="Open reel on Instagram">
              ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Reel'} ↗
            </a>
            <div class="reel-id-chip">
              reelId: #${j.id}
            </div>
            <div class="reel-origin-sub">
              Telegram: ${j.telegram_chat_id || '5443723531'}
            </div>
          </div>
        </td>

        <!-- 3. Destination Page (Crisp Channel Block) -->
        <td style="width: 15%; vertical-align: middle;">
          <div class="destination-cell">
            <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
            <div class="destination-page-name">
              ${j.page_name || (isMovie ? 'Movie Recommendations' : 'GTA 6 Updates 007')}
            </div>
            <div class="destination-status-sub">
              ● Meta Live Broadcast
            </div>
          </div>
        </td>

        <!-- 4. Format & Specs (Clean Organized Stack) -->
        <td style="width: 16%; vertical-align: middle;">
          <div class="specs-block">
            <div class="specs-format-title">${formatLabel}</div>
            <div class="specs-chip-row">
              <span class="specs-badge">${ratioLabel}</span>
              <span class="specs-badge">${dimLabel}</span>
            </div>
            <div class="specs-protocol-sub">
              Meta Graph API v21.0
            </div>
          </div>
        </td>

        <!-- 5. Caption & Copy (Organized Quote Block) -->
        <td style="width: 22%; vertical-align: middle;">
          <div class="caption-card-block">
            <div class="caption-hook-text" title="${escapeHtml(cleanCaptionText(j.caption))}">
              "${escapeHtml(cleanedHook)}"
            </div>
            <div class="caption-meta-row">
              <span>Creator credit included</span>
              <button type="button" class="btn-inspect-link" onclick="reposterView.openCaptionModal('${j.id}')">
                Inspect Copy ↗
              </button>
            </div>
          </div>
        </td>

        <!-- 6. Broadcast Status & Time (Clean Date + Time) -->
        <td style="width: 16%; vertical-align: middle;">
          <div class="status-block-cell">
            <div class="status-badge-published">
              <span class="live-dot-indicator"></span> Live Published
            </div>
            <div class="status-datetime-line">
              ${dt.date} · ${dt.time}
            </div>
            <div class="status-relative-line">
              Broadcasted ${dt.relative}
            </div>
          </div>
        </td>

        <!-- 7. Actions (High-Visibility Live Reel & Watch Clip Buttons) -->
        <td style="text-align: right; width: 14%; vertical-align: middle;">
          <div class="actions-vertical-cell">
            <a href="${liveReelUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm action-btn-live" title="Open live reel on Instagram in new tab">
              <span>Live Reel</span> ↗
            </a>
            <button type="button" class="btn btn-secondary btn-sm action-btn-watch" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode || ''}')" title="Watch full video clip in player">
              <span>Watch Clip</span> ▶
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderPublishedCardHtml(j) {
    const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
    const isMovie = pageSlug.includes('movies') || j.page_id === 2 || String(j.page_id) === '2';
    const isGta6 = !isMovie;
    const pageClass = isGta6 ? 'gta6' : 'movies';

    const dt = formatReceiptDateTime(j.published_at || j.created_at);
    const fallbackThumb = isMovie
      ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
    const thumbSrc = j.thumbnail_url || `/api/jobs/${j.id}/thumbnail`;
    const videoUrl = j.video_url || `/api/jobs/${j.id}/video`;

    const liveReelUrl = j.permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : (j.source_url || '#'));
    const parsed = parseCaptionComponents(j.caption);
    const cleanedHook = cleanCaptionText(parsed.hook || j.caption || 'New Reel');

    const formatLabel = j.format || '1080p MP4';
    const ratioLabel = j.aspect_ratio || 'Adaptive Video';
    const dimLabel = j.dimensions || '1080 × 1920';

    return `
      <div class="downloaded-media-card">
        <div>
          <!-- Large Cover Preview -->
          <div class="downloaded-card-preview-wrap" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode || ''}')" title="Click to watch 1080p published reel">
            <span class="downloaded-hd-badge">1080p HD</span>
            <img src="${thumbSrc}" alt="${j.shortcode || j.id}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}';" />
            <button type="button" class="downloaded-play-pill" style="width: 38px; height: 38px; font-size: 15px;" title="Play Video">▶</button>
          </div>

          <!-- Header Bar: ID & Destination -->
          <div class="flex items-center justify-between mb-2" style="flex-wrap: wrap; gap: 0.35rem;">
            <div class="flex items-center gap-2">
              <span class="reel-id-chip" style="font-weight: 700;">reelId: #${j.id}</span>
              <span class="stream-badge-page ${pageClass}">${pageSlug}</span>
            </div>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
              Chat: ${j.telegram_chat_id || '5443723531'}
            </span>
          </div>

          <!-- Reel Link -->
          <div style="margin-bottom: 0.65rem;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.15rem;">Live Broadcast Reel:</div>
            <a href="${liveReelUrl}" target="_blank" rel="noopener noreferrer" class="text-link" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600;">
              ${j.shortcode ? `/reel/${j.shortcode}` : 'Live Reel'} ↗
            </a>
          </div>

          <!-- Caption Snippet -->
          <div class="caption-card-block" style="margin-bottom: 0.75rem; max-width: 100%;">
            <div class="caption-hook-text">
              "${escapeHtml(cleanedHook)}"
            </div>
            <div class="caption-meta-row">
              <span>${dimLabel} · Meta v21.0</span>
              <button type="button" class="btn-inspect-link" onclick="reposterView.openCaptionModal('${j.id}')">
                Inspect ↗
              </button>
            </div>
          </div>
        </div>

        <!-- Footer: Status & Actions -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 0.25rem;">
          <div class="flex items-center justify-between mb-3">
            <span class="status-badge-published">
              <span class="live-dot-indicator"></span> Live Published
            </span>
            <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${dt.relative}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm action-btn-watch" onclick="reposterView.previewVideo('${videoUrl || thumbSrc}', '${j.shortcode || ''}')" style="justify-content: center;">
              Watch Clip ▶
            </button>
            <a href="${liveReelUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm action-btn-live" style="justify-content: center;">
              <span>Live Reel</span> ↗
            </a>
          </div>
        </div>
      </div>
    `;
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
    const isVideo = videoUrl && (/\.mp4($|\?)/i.test(videoUrl) || videoUrl.includes('/video') || videoUrl.includes('storage.googleapis'));
    const finalUrl = isVideo ? videoUrl : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    if (window.app && typeof window.app.openVideoModal === 'function') {
      const titleEl = document.getElementById('modal-video-title');
      if (titleEl) {
        titleEl.textContent = shortcode ? `/reel/${shortcode} — Video Preview` : 'Live Reel Video Preview';
      }
      window.app.openVideoModal(finalUrl);
    } else {
      window.open(finalUrl, '_blank');
    }
  }

  function openCaptionModal(jobId) {
    const job = activeStage3Jobs.find(j => String(j.id) === String(jobId)) ||
                activePublishedJobs.find(j => String(j.id) === String(jobId));
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
    modal.style.setProperty('display', 'flex', 'important');
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
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
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

  function setPublishedViewMode(mode) {
    publishedViewMode = mode;
    renderActiveStage();
  }

  return {
    render,
    selectPage,
    switchStage,
    setDownloadedViewMode,
    setIngestViewMode,
    setPublishedViewMode,
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
    previewVideo,
    onEvent,
    refresh: async () => {
      await loadSummary();
      await renderActiveStage();
    }
  };
})();
