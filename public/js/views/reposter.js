/**
 * OmniStudio v7 — Agent 1: Reposter & On-Demand Publishing Pipeline
 * Multi-page reel ingestion via Telegram Bot (@omnistudio_bot) and Web Dashboard,
 * real-time 4-stage pipeline stepper, and live Instagram publishing.
 */
window.reposterView = (function() {
  let selectedPageId = null; // null = all pages
  let activeFilter = 'all'; // 'all' | 'ingested' | 'downloading' | 'ready' | 'published' | 'failed'
  let activeTrackingJobId = null;
  let pipelineSummary = {
    ingested: 0,
    downloading: 0,
    ready: 0,
    published: 0,
    failed: 0
  };

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
        <div class="flex items-center gap-3">
          <span style="font-size: 2rem; line-height: 1;">📲</span>
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Agent 1: Reposter & On-Demand Pipeline
              </h2>
              <span class="badge badge-emerald">● READY</span>
            </div>
            <p class="text-sm text-muted" style="margin-top: 0.15rem; margin-bottom: 0;">
              Direct single-reel ingestion via Telegram Bot (<code>@omnistudio_bot</code>) and Web Dashboard
            </p>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="reposterView.refresh()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Refresh
        </button>
      </div>

      <!-- 2. Multi-Page Selector Bar -->
      <div class="pipeline-page-switcher" id="rp-page-switcher">
        ${renderPageSwitcherPills()}
      </div>

      <!-- 3. Top 4-Stage Visual Publishing Stepper -->
      <div class="pipeline-stepper-container" id="rp-stepper-container">
        ${renderStepperHtml()}
      </div>

      <!-- 4. Direct Ingestion & Telegram Hub Grid -->
      <div style="display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 1.25rem; margin-bottom: 1.5rem; align-items: start;">
        
        <!-- Direct Link Ingestion Card -->
        <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.35rem; box-shadow: none; border: 1px solid var(--border-card); border-top: 3px solid var(--accent-primary);">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Direct Reel Ingestion & Quick Post
              </h3>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                Paste any Instagram Reel link here to immediately process and publish to your selected page.
              </p>
            </div>
            <span class="badge badge-blue">Direct Web Ingestion</span>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Instagram Reel or Video Post URL</label>
            <input type="text" id="rp-url" class="form-input" placeholder="https://www.instagram.com/reel/DF-EXAMPLE/ or /p/..." style="font-family: var(--font-mono); font-size: 0.85rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
              Supports Instagram reels, video posts, and shortcode formats.
            </div>
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
              If checked, job pauses in Stage 4 (Review) for your manual approval. If unchecked, it publishes automatically.
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

          <button id="rp-submit-btn" class="btn btn-primary w-full" onclick="reposterView.submitJob()" style="padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 600;">
            🚀 Publish Reel Live to Instagram
          </button>
        </div>

        <!-- Telegram Mobile Integration Hub Card -->
        <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.35rem; box-shadow: none; border: 1px solid var(--border-card); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span style="font-size: 1.5rem; line-height: 1;">✈️</span>
              <div>
                <div style="font-weight: 700; font-size: 0.95rem;">Telegram Integration Hub</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">One-click mobile reposting</div>
              </div>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem;">
              Share any Instagram Reel link directly with your OmniStudio Telegram bot from your phone. Agent 1 executes the 4-stage pipeline:
            </p>

            <ol style="font-size: 0.78rem; color: var(--text-secondary); margin-left: 1.25rem; margin-bottom: 1.15rem; line-height: 1.6;">
              <li>Send Instagram Reel link to <code>@omnistudio_bot</code>.</li>
              <li>Bot verifies your Whitelisted Chat ID.</li>
              <li>Select destination page with inline button.</li>
              <li>Live 1, 2, 3, 4 progress updates in chat.</li>
              <li>Receives live Instagram permalink when live!</li>
            </ol>
          </div>

          <div style="background: var(--bg-input); padding: 0.75rem 0.95rem; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 0.75rem;">
            <div style="color: var(--text-muted); margin-bottom: 0.25rem;">Authorized Telegram Chat ID:</div>
            <code style="font-weight: 700; color: var(--accent-primary);" id="rp-telegram-allowed">5443723531</code>
          </div>
        </div>

      </div>

      <!-- 5. Reposter Publishing History & Live Feed Table -->
      <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card); box-shadow: none;">
        <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
              Agent 1 Publishing History & Live Feed
            </h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.15rem 0 0 0;">
              On-demand reels submitted via Telegram Bot or Web Dashboard
            </p>
          </div>
          <div class="flex items-center gap-2">
            <select id="rp-table-filter" class="form-input" style="font-size: 0.76rem; padding: 3px 8px; width: auto;" onchange="reposterView.filterTable(this.value)">
              <option value="all">All Dispatches</option>
              <option value="published">Live Published</option>
              <option value="pending_review">Staged for Review</option>
              <option value="active">Active In-Flight</option>
              <option value="failed">Failed / Errors</option>
            </select>
          </div>
        </div>
        <div id="rp-jobs-table" class="table-container" style="padding: 0; overflow-x: auto;">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">Loading reposter dispatches...</div>
        </div>
      </div>
    `;

    await loadSummary();
    await loadData();
  }

  function renderPageSwitcherPills() {
    const pages = window.app?.pages || [];
    const isAll = selectedPageId === null;

    let html = `
      <button class="pipeline-page-pill ${isAll ? 'active' : ''}" onclick="reposterView.selectPage(null)">
        <span>🌐</span>
        <span>All Connected Pages</span>
      </button>
    `;

    pages.forEach(p => {
      const isActive = selectedPageId === p.id;
      const icon = getPageIcon(p.slug);
      html += `
        <button class="pipeline-page-pill ${isActive ? 'active' : ''}" onclick="reposterView.selectPage(${p.id})">
          <span>${icon}</span>
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
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          <span>⚡</span>
          <span>Publishing Pipeline Flow for <b>${pageLabel}</b></span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          Agent 1: <strong>On-Demand Reposter</strong>
        </div>
      </div>

      <div class="pipeline-stepper">
        <!-- Stage 1: Ingested -->
        <div class="pipeline-step-node ${activeFilter === 'ingested' ? 'active' : ''}" onclick="reposterView.filterTable('ingested')" title="Reels received via Telegram or Dashboard">
          <div class="pipeline-step-num">1</div>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Ingested</span>
            <span class="pipeline-step-count" id="rps-count-ingested">${s.ingested} Received</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 2: Download & Transcode -->
        <div class="pipeline-step-node ${activeFilter === 'downloading' ? 'active' : ''}" onclick="reposterView.filterTable('downloading')" title="1080p MP4 download & verification">
          <div class="pipeline-step-num">2</div>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Download & Media</span>
            <span class="pipeline-step-count" id="rps-count-downloading">${s.downloading} In Flight</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 3: AI Copywriting & Review -->
        <div class="pipeline-step-node ${activeFilter === 'ready' ? 'active' : ''}" onclick="reposterView.filterTable('ready')" title="AI Copywritten, Attribution & Review">
          <div class="pipeline-step-num">3</div>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">AI Copywriting</span>
            <span class="pipeline-step-count" id="rps-count-ready">${s.ready} Staged/Ready</span>
          </div>
        </div>
        <div class="pipeline-step-arrow">→</div>

        <!-- Stage 4: Live Published -->
        <div class="pipeline-step-node ${activeFilter === 'published' ? 'active' : ''}" onclick="reposterView.filterTable('published')" title="Live on Instagram Feed">
          <div class="pipeline-step-num">4</div>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Live Published</span>
            <span class="pipeline-step-count" id="rps-count-published" style="color: var(--agent-reposter);">${s.published} Live</span>
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
    const cDl = document.getElementById('rps-count-downloading');
    const cReady = document.getElementById('rps-count-ready');
    const cPub = document.getElementById('rps-count-published');

    if (cIng) cIng.textContent = `${s.ingested} Received`;
    if (cDl) cDl.textContent = `${s.downloading} In Flight`;
    if (cReady) cReady.textContent = `${s.ready} Staged/Ready`;
    if (cPub) cPub.textContent = `${s.published} Live`;
  }

  async function selectPage(pageId) {
    selectedPageId = pageId;

    const switcher = document.getElementById('rp-page-switcher');
    if (switcher) switcher.innerHTML = renderPageSwitcherPills();

    const stepper = document.getElementById('rp-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();

    const pageSelect = document.getElementById('rp-page-select');
    if (pageSelect) pageSelect.innerHTML = renderPageOptions();

    await loadSummary();
    await loadData();
  }

  function filterTable(filter) {
    activeFilter = filter;
    const stepper = document.getElementById('rp-stepper-container');
    if (stepper) stepper.innerHTML = renderStepperHtml();
    const select = document.getElementById('rp-table-filter');
    if (select) select.value = filter;
    loadData();
  }

  async function loadData() {
    const container = document.getElementById('rp-jobs-table');
    if (!container) return;

    try {
      let query = '?limit=35';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      if (!res.ok) return;
      let jobs = await res.json();

      // Apply client filter if active
      if (activeFilter === 'published') {
        jobs = jobs.filter(j => j.status === 'published');
      } else if (activeFilter === 'pending_review') {
        jobs = jobs.filter(j => j.status === 'pending_review');
      } else if (activeFilter === 'downloading') {
        jobs = jobs.filter(j => j.status === 'downloading' || j.status === 'queued');
      } else if (activeFilter === 'ready') {
        jobs = jobs.filter(j => j.status === 'ready' || j.status === 'publishing' || j.status === 'pending_review');
      } else if (activeFilter === 'failed') {
        jobs = jobs.filter(j => j.status === 'failed');
      }

      renderJobs(jobs);
    } catch (err) {
      console.warn('[Reposter loadData failed]:', err);
    }
  }

  function renderJobs(jobs) {
    const container = document.getElementById('rp-jobs-table');
    if (!container) return;

    if (!jobs || jobs.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">
          No dispatches found for this filter. Paste an Instagram link above or share to Telegram!
        </div>
      `;
      return;
    }

    const rows = jobs.map(j => {
      const pageSlug = j.page_slug ? `@${j.page_slug}` : (j.page_handle || `@page#${j.page_id}`);
      const isTelegram = Boolean(j.telegram_chat_id);
      const originBadge = isTelegram ?
        `<span style="font-size: 0.75rem; color: var(--info); font-weight: 500;">📱 Telegram Bot</span>` :
        `<span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">💻 Web Ingestion</span>`;

      const statusBadge = getStatusBadge(j.status);
      const timeStr = j.published_at ? new Date(j.published_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : formatTimeAgo(j.created_at);

      return `
        <tr>
          <td style="font-weight: 600; font-family: var(--font-mono); color: var(--text-primary);">#${j.id}</td>
          <td style="font-weight: 600; font-family: var(--font-mono);">${pageSlug}</td>
          <td>${originBadge}</td>
          <td style="font-family: var(--font-mono);">
            <a href="${j.source_url}" target="_blank" style="text-decoration: none; color: var(--accent-primary);">
              ${j.shortcode || 'Source'} ↗
            </a>
          </td>
          <td style="font-size: 0.78rem; color: var(--text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${j.caption ? j.caption.substring(0, 50) + '...' : '—'}
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            ${j.permalink ? `
              <a href="${j.permalink}" target="_blank" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none; font-weight: 500;">
                Live on Feed ↗
              </a>
            ` : (j.status === 'failed' ? `
              <button class="btn btn-secondary btn-sm" onclick="reposterView.retryJob(${j.id})" style="font-size: 0.72rem; padding: 2px 7px;">
                🔄 Retry
              </button>
            ` : `
              <span style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</span>
            `)}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th style="width: 8%;">ID</th>
            <th style="width: 18%;">Destination</th>
            <th style="width: 16%;">Origin</th>
            <th style="width: 14%;">Reel Shortcode</th>
            <th style="width: 20%;">Caption Excerpt</th>
            <th style="width: 12%;">Status</th>
            <th style="text-align: right; width: 12%;">Instagram Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

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
        submitBtn.textContent = '⏳ Initializing Pipeline...';
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
        app.toast('🚀 Reel dispatched to publishing pipeline!', 'success');
      }

      updateProgressStep(1, 'active', 'Step 1/4: Ingested & Fetching 1080p MP4...');
      urlInput.value = '';

      await loadSummary();
      await loadData();
    } catch (err) {
      hideProgressBox();
      app.toast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Publish Reel Live to Instagram';
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
        updateProgressStep(4, 'completed', '✅ Step 4/4: Successfully published live to Instagram!');
        app.toast('🎉 Reel published live to Instagram!', 'success');
        setTimeout(() => hideProgressBox(), 6000);
        loadSummary();
        loadData();
      } else if (event.status === 'failed') {
        const s4 = document.getElementById('rp-step-4');
        if (s4) s4.className = 'step-bar-item failed';
        const statusEl = document.getElementById('rp-step-status');
        if (statusEl) statusEl.textContent = '❌ Failed: ' + (event.error || 'Job failed');
        loadSummary();
        loadData();
      }
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
        loadSummary();
        loadData();
      } else {
        app.toast(data.error || 'Failed to retry', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'published':
        return `<span class="badge badge-emerald">Live Published</span>`;
      case 'failed':
        return `<span class="badge badge-red">Failed</span>`;
      case 'pending_review':
        return `<span class="badge badge-amber">Staged Review</span>`;
      case 'downloading':
      case 'processing':
      case 'uploading':
      case 'publishing':
        return `<span class="badge badge-blue">⚙️ ${status}</span>`;
      default:
        return `<span class="badge badge-muted">${status}</span>`;
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

  return {
    render,
    selectPage,
    filterTable,
    refresh: async () => {
      await loadSummary();
      await loadData();
    },
    submitJob,
    retryJob,
    onEvent
  };
})();
