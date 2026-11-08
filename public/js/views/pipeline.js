/**
 * OmniStudio v8 — Pipeline Tracker View
 * End-to-end visualization of the multi-agent Instagram publishing pipeline:
 * Ingestion ➔ Download ➔ Agent 3 OCR/Render ➔ Meta Live Publish ➔ Story ➔ Ring Fan-out
 */
window.pipelineView = (function() {
  let jobs = [];
  let stats = null;
  let pages = [];
  let viewMode = 'kanban'; // 'kanban' | 'table'
  let filterStage = 'all';
  let filterPageId = 'all';
  let searchQuery = '';
  let activeDetailJobId = null;
  let autoRefreshTimer = null;

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

  function formatDuration(ms) {
    if (!ms || ms < 0) return '--';
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${min}m ${remSec}s`;
  }

  async function render() {
    const container = document.getElementById('view-pipeline');
    if (!container) return;

    container.innerHTML = `
      <div class="pipeline-view-container" style="width: 100%; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; items-center; gap: 8px;">
              <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
                End-to-End Pipeline Tracker
              </h2>
              <span class="badge" style="background: rgba(37, 99, 235, 0.1); color: #2563EB; font-weight: 600; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem;">
                7-Stage Telemetry
              </span>
            </div>
            <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">
              Live stage progression from reel ingestion, Agent 3 video styling, Meta live publishing, companion story, to ring fan-out
            </p>
          </div>

          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <div class="btn-group" style="display: flex; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 2px;">
              <button class="btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}" onclick="pipelineView.setViewMode('kanban')" style="padding: 4px 10px; font-size: 0.78rem;">
                Columns
              </button>
              <button class="btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" onclick="pipelineView.setViewMode('table')" style="padding: 4px 10px; font-size: 0.78rem;">
                Table
              </button>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="pipelineView.refresh()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- 1. Top KPI Summary Metrics -->
        <div id="pipeline-kpis-container" class="grid-cards mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
          <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">In-Flight Active</div>
            <div id="kpi-in-flight" style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">--</div>
            <div style="font-size: 0.72rem; color: #2563EB; margin-top: 2px;">Processing across stages</div>
          </div>
          <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Agent 3 Rendering</div>
            <div id="kpi-rendering" style="font-size: 1.6rem; font-weight: 700; color: #7C3AED; margin-top: 4px;">--</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Video frame & typography</div>
          </div>
          <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Live Meta Upload</div>
            <div id="kpi-publishing" style="font-size: 1.6rem; font-weight: 700; color: #D97757; margin-top: 4px;">--</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Graph API handshake</div>
          </div>
          <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Published Today</div>
            <div id="kpi-published" style="font-size: 1.6rem; font-weight: 700; color: #16A34A; margin-top: 4px;">--</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Successfully on Instagram</div>
          </div>
          <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Blocked / Failed</div>
            <div id="kpi-failed" style="font-size: 1.6rem; font-weight: 700; color: #DC2626; margin-top: 4px;">--</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Requires token/retry</div>
          </div>
        </div>

        <!-- 2. Filter & Search Controls Bar -->
        <div class="card mb-4" style="padding: 0.85rem 1.15rem; border-radius: 10px; border: 1px solid var(--border-card); background: var(--bg-card); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.85rem;">
          <div class="flex items-center gap-2" style="flex: 1; min-width: 260px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="pl-search-input" class="form-input" placeholder="Search by shortcode, caption keyword, or creator..." oninput="pipelineView.onSearch(this.value)" style="border: none; background: transparent; padding: 4px 6px; font-size: 0.85rem; width: 100%;">
          </div>

          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <select id="pl-page-filter" class="form-input" onchange="pipelineView.onPageFilterChange(this.value)" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px;">
              <option value="all">All Channels</option>
            </select>

            <select id="pl-stage-filter" class="form-input" onchange="pipelineView.onStageFilterChange(this.value)" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px;">
              <option value="all">All Stages</option>
              <option value="in_flight">Active In-Flight</option>
              <option value="rendering">Agent 3 Rendering</option>
              <option value="live">Live Published</option>
              <option value="failed">Errors / Failed</option>
            </select>
          </div>
        </div>

        <!-- 3. Pipeline Content Area (Kanban or Table) -->
        <div id="pipeline-content-view">
          <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading pipeline telemetries...</div>
        </div>

      </div>

      <!-- Job Timeline & Inspector Modal Drawer -->
      <div id="job-detail-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) pipelineView.closeJobDetail()">
        <div class="modal-content" style="max-width: 780px; width: 95%; max-height: 90vh; overflow-y: auto; border-radius: 14px;">
          <div class="flex items-center justify-between mb-3" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.85rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700;" id="jdm-title">Job Audit Trail</h3>
                <span id="jdm-status-badge" class="badge">--</span>
              </div>
              <div id="jdm-subtitle" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Pipeline job execution history
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="pipelineView.closeJobDetail()" style="padding: 2px 8px;">✕</button>
          </div>

          <div id="jdm-content-body">
            <div style="color: var(--text-muted); padding: 2rem; text-align: center;">Loading timeline events...</div>
          </div>
        </div>
      </div>
    `;

    await loadData();
    startAutoRefresh();
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
      // Background poll only if pipeline tab is active
      if (document.body.getAttribute('data-page') === 'pipeline') {
        loadData(true);
      }
    }, 15000);
  }

  async function loadData(silent = false) {
    try {
      const [statsRes, jobsRes, pagesRes] = await Promise.all([
        fetch('/api/pipeline/stats'),
        fetch(`/api/pipeline/jobs?limit=50&search=${encodeURIComponent(searchQuery)}`),
        fetch('/api/pages')
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        stats = sData.stats || sData;
        renderKPIs(stats);
      }

      if (pagesRes.ok) {
        pages = await pagesRes.json();
        populatePageFilter(pages);
      }

      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        jobs = jData.jobs || [];
        renderJobs();
      }
    } catch (err) {
      if (!silent) console.error('[Pipeline loadData error]:', err);
    }
  }

  function renderKPIs(s) {
    if (!s) return;
    const inFlight = (s.queued || 0) + (s.downloading || 0) + (s.ready || 0) + (s.publishing || 0);
    const kInFlight = document.getElementById('kpi-in-flight');
    const kRendering = document.getElementById('kpi-rendering');
    const kPublishing = document.getElementById('kpi-publishing');
    const kPublished = document.getElementById('kpi-published');
    const kFailed = document.getElementById('kpi-failed');

    if (kInFlight) kInFlight.textContent = inFlight;
    if (kRendering) kRendering.textContent = s.ready || 0;
    if (kPublishing) kPublishing.textContent = s.publishing || 0;
    if (kPublished) kPublished.textContent = s.published24h !== undefined ? s.published24h : (s.published || 0);
    if (kFailed) kFailed.textContent = s.failed || 0;
  }

  function populatePageFilter(pList) {
    const sel = document.getElementById('pl-page-filter');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="all">All Channels</option>' +
      pList.map(p => `<option value="${p.id}" ${p.id == currentVal ? 'selected' : ''}>${escapeHtml(p.name)} (${p.handle || '@' + p.slug})</option>`).join('');
  }

  function renderJobs() {
    const content = document.getElementById('pipeline-content-view');
    if (!content) return;

    let filtered = jobs.slice();

    // Filter by page
    if (filterPageId !== 'all') {
      filtered = filtered.filter(j => String(j.page_id) === String(filterPageId));
    }

    // Filter by stage
    if (filterStage === 'in_flight') {
      filtered = filtered.filter(j => ['queued', 'downloading', 'ready', 'publishing', 'processing'].includes(j.status));
    } else if (filterStage === 'rendering') {
      filtered = filtered.filter(j => j.status === 'ready' || (j.current_step && j.current_step.includes('render')));
    } else if (filterStage === 'live') {
      filtered = filtered.filter(j => j.status === 'published');
    } else if (filterStage === 'failed') {
      filtered = filtered.filter(j => j.status === 'failed');
    }

    if (viewMode === 'kanban') {
      renderKanban(content, filtered);
    } else {
      renderTable(content, filtered);
    }
  }

  function renderKanban(container, jobList) {
    const columns = [
      { id: 'col-queued', title: '1. Ingested & Queued', match: j => j.status === 'queued' },
      { id: 'col-downloading', title: '2. Downloading / OCR', match: j => j.status === 'downloading' || j.status === 'processing' },
      { id: 'col-rendering', title: '3. Agent 3 Styling', match: j => j.status === 'ready' },
      { id: 'col-publishing', title: '4. Meta Live Upload', match: j => j.status === 'publishing' || j.status === 'uploading' },
      { id: 'col-published', title: '5. Live on Instagram', match: j => j.status === 'published' },
      { id: 'col-failed', title: '6. Failed / Blocked', match: j => j.status === 'failed' }
    ];

    let html = `
      <div class="kanban-board-container" style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1.5rem; min-height: 480px;">
    `;

    for (const col of columns) {
      const colJobs = jobList.filter(col.match);
      const isFailedCol = col.id === 'col-failed';
      const isLiveCol = col.id === 'col-published';

      html += `
        <div class="kanban-column" style="flex: 0 0 280px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 12px; display: flex; flex-direction: column; max-height: 75vh;">
          <div class="kanban-column-header" style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              ${col.title}
            </div>
            <span class="badge" style="font-size: 0.72rem; padding: 2px 7px; border-radius: 999px; background: var(--bg-canvas); color: var(--text-muted); font-weight: 600;">
              ${colJobs.length}
            </span>
          </div>

          <div class="kanban-column-body" style="padding: 0.75rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.65rem;">
            ${colJobs.length === 0 ? `
              <div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 2rem 0.5rem; font-style: italic;">
                No jobs in this stage
              </div>
            ` : colJobs.map(j => renderKanbanCard(j)).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function renderKanbanCard(j) {
    const page = pages.find(p => p.id === j.page_id);
    const pageName = page ? page.name : `Page #${j.page_id}`;
    const shortcode = j.shortcode || (j.instagram_url ? j.instagram_url.split('/p/')[1] || j.instagram_url.split('/reel/')[1] : null) || 'Manual Reel';
    const hook = j.hook_headline || (j.caption ? j.caption.split('\n')[0] : 'Processing content...');
    const theme = j.edit_theme || 'neon';

    return `
      <div class="card kanban-card" style="padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-canvas); box-shadow: none; cursor: pointer; transition: transform 0.15s, border-color 0.15s;" onclick="pipelineView.openJobDetail(${j.id})">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--accent-primary); font-family: var(--font-mono);">
            #${j.id} · ${escapeHtml(shortcode.slice(0, 11))}
          </span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">
            ${formatTimeAgo(j.created_at)}
          </span>
        </div>

        <div style="font-size: 0.82rem; font-weight: 600; line-height: 1.3; color: var(--text-primary); margin-bottom: 0.45rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${escapeHtml(hook)}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed var(--border-subtle);">
          <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.04); color: var(--text-secondary);">
            ${escapeHtml(pageName.slice(0, 16))}
          </span>
          <span style="font-size: 0.7rem; font-weight: 500; color: ${j.status === 'published' ? '#16A34A' : j.status === 'failed' ? '#DC2626' : '#2563EB'};">
            ${escapeHtml(j.current_step || j.status)}
          </span>
        </div>
      </div>
    `;
  }

  function renderTable(container, jobList) {
    if (jobList.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 3rem; text-align: center; border-radius: 12px;">
          <div style="font-weight: 600; font-size: 1.1rem;">No pipeline jobs found</div>
          <p class="text-sm text-muted" style="margin-top: 0.25rem;">Adjust your stage or search filter</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="card table-container" style="background: var(--bg-card); border-radius: 12px; overflow-x: auto; border: 1px solid var(--border-card);">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.83rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">
              <th style="padding: 10px 14px;">ID</th>
              <th style="padding: 10px 14px;">Target Channel</th>
              <th style="padding: 10px 14px;">Source Shortcode</th>
              <th style="padding: 10px 14px;">Hook Headline / Caption</th>
              <th style="padding: 10px 14px;">Theme</th>
              <th style="padding: 10px 14px;">Current Stage</th>
              <th style="padding: 10px 14px;">Created</th>
              <th style="padding: 10px 14px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const j of jobList) {
      const page = pages.find(p => p.id === j.page_id);
      const pageName = page ? page.name : `Page #${j.page_id}`;
      const shortcode = j.shortcode || '--';
      const hook = j.hook_headline || (j.caption ? j.caption.slice(0, 50) + '...' : '--');
      const theme = j.edit_theme || 'neon';
      const statusColor = j.status === 'published' ? '#16A34A' : j.status === 'failed' ? '#DC2626' : '#2563EB';

      html += `
        <tr style="border-bottom: 1px solid var(--border-subtle);">
          <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 600;">#${j.id}</td>
          <td style="padding: 10px 14px; font-weight: 500;">${escapeHtml(pageName)}</td>
          <td style="padding: 10px 14px; font-family: var(--font-mono);">
            ${j.instagram_url ? `<a href="${j.instagram_url}" target="_blank" style="color: var(--accent-primary);">${escapeHtml(shortcode)}</a>` : escapeHtml(shortcode)}
          </td>
          <td style="padding: 10px 14px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(hook)}
          </td>
          <td style="padding: 10px 14px;">
            <span class="badge" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(139, 92, 246, 0.1); color: #7C3AED;">
              ${escapeHtml(theme)}
            </span>
          </td>
          <td style="padding: 10px 14px;">
            <span style="font-weight: 600; color: ${statusColor};">
              ● ${escapeHtml(j.current_step || j.status)}
            </span>
          </td>
          <td style="padding: 10px 14px; color: var(--text-muted); font-size: 0.78rem;">
            ${formatTimeAgo(j.created_at)}
          </td>
          <td style="padding: 10px 14px; text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="pipelineView.openJobDetail(${j.id})" style="padding: 3px 8px; font-size: 0.75rem;">
              Inspect
            </button>
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  }

  /**
   * Open Job Detail & Stage Timeline Audit Modal
   */
  async function openJobDetail(jobId) {
    activeDetailJobId = jobId;
    const modal = document.getElementById('job-detail-modal');
    const content = document.getElementById('jdm-content-body');
    const title = document.getElementById('jdm-title');
    const statusBadge = document.getElementById('jdm-status-badge');
    const subtitle = document.getElementById('jdm-subtitle');

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }

    try {
      const res = await fetch(`/api/pipeline/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to load job details');
      const data = await res.json();
      const job = data.job;
      const events = data.events || [];
      const distributionTargets = data.distributionTargets || [];

      if (title) title.textContent = `Job #${job.id} — ${job.shortcode || 'Instagram Reel'}`;
      if (subtitle) subtitle.textContent = `Target: ${job.page_name || 'Page #' + job.page_id} (${job.page_handle || ''}) · Created: ${new Date(job.created_at).toLocaleString()}`;
      if (statusBadge) {
        statusBadge.textContent = job.status.toUpperCase();
        statusBadge.className = `badge ${job.status === 'published' ? 'badge-success' : job.status === 'failed' ? 'badge-danger' : 'badge-primary'}`;
      }

      // Render Modal Body
      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Media & Headline Preview Card -->
          <div class="card" style="padding: 1rem; border-radius: 10px; background: var(--bg-canvas); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Extracted AI Hook Headline</div>
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                  "${escapeHtml(job.hook_headline || 'Pending AI Hook Generation')}"
                </div>
              </div>
              <div>
                <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(139, 92, 246, 0.12); color: #7C3AED; font-weight: 600;">
                  Theme: ${escapeHtml(job.edit_theme || 'neon')}
                </span>
              </div>
            </div>

            <!-- Video paths or download sources -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.78rem;">
              <div style="background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle);">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Original Ingested Media</div>
                <div style="font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(job.media_path || 'Pending download')}
                </div>
              </div>
              <div style="background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle);">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Agent 3 Stylized Reel</div>
                <div style="font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #7C3AED;">
                  ${escapeHtml(job.edited_media_path || 'Not yet rendered')}
                </div>
              </div>
            </div>

            ${job.caption ? `
              <div style="margin-top: 0.75rem; background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle); font-size: 0.78rem;">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Instagram Caption</div>
                <div style="white-space: pre-wrap; max-height: 100px; overflow-y: auto; color: var(--text-secondary);">
                  ${escapeHtml(job.caption)}
                </div>
              </div>
            ` : ''}

            ${job.error_message ? `
              <div style="margin-top: 0.75rem; background: #FEF2F2; border: 1px solid #FECACA; padding: 0.65rem; border-radius: 6px; color: #DC2626; font-size: 0.78rem;">
                <strong>Failure Reason:</strong> ${escapeHtml(job.error_message)}
              </div>
            ` : ''}
          </div>

          <!-- Chronological Stage Timeline -->
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem; font-family: 'Plus Jakarta Sans', sans-serif;">
              Stage-by-Stage Progression Audit (${events.length} Events)
            </h4>

            <div class="timeline-stepper" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${events.length === 0 ? `
                <div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem; text-align: center;">
                  No historical telemetry events logged for this job yet.
                </div>
              ` : events.map((ev, idx) => {
                const isErr = ev.status === 'failed' || ev.status === 'error';
                const isSuccess = ev.status === 'completed' || ev.status === 'success';
                const iconBg = isErr ? '#DC2626' : isSuccess ? '#16A34A' : '#2563EB';

                return `
                  <div style="display: flex; gap: 10px; align-items: flex-start; padding: 0.5rem 0.75rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-subtle);">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${iconBg}; margin-top: 5px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 0.82rem; text-transform: uppercase; color: var(--text-primary);">
                          ${escapeHtml(ev.stage)}
                        </span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                          ${new Date(ev.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                        ${escapeHtml(ev.message || ev.status)}
                      </div>
                      ${ev.meta && Object.keys(ev.meta).length > 0 ? `
                        <div style="margin-top: 4px; font-size: 0.7rem; font-family: var(--font-mono); color: var(--text-muted); background: var(--bg-canvas); padding: 4px 6px; border-radius: 4px; overflow-x: auto;">
                          ${escapeHtml(JSON.stringify(ev.meta))}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Distribution Targets / Fan-Out -->
          ${distributionTargets.length > 0 ? `
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; font-family: 'Plus Jakarta Sans', sans-serif;">
                Distribution Ring Fan-Out (${distributionTargets.length} Channels)
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${distributionTargets.map(t => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid var(--border-subtle); font-size: 0.8rem;">
                    <div>
                      <span style="font-weight: 600;">${escapeHtml(t.target_page_name || 'Channel #' + t.target_page_id)}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 6px;">Delay: ${t.delay_minutes || 0}m</span>
                    </div>
                    <span class="badge" style="font-size: 0.7rem; padding: 2px 6px;">
                      ${t.status.toUpperCase()}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Bottom Action Buttons -->
          <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 0.5rem;">
            ${job.status === 'failed' ? `
              <button class="btn btn-primary btn-sm" onclick="pipelineView.retryJob(${job.id})">
                🔄 Retry Failed Stage
              </button>
            ` : ''}
            
            <button class="btn btn-secondary btn-sm" onclick="pipelineView.triggerReRender(${job.id})">
              🎨 Re-Render in Agent 3 Studio
            </button>

            ${job.ig_media_id ? `
              <a href="https://www.instagram.com/reel/${job.shortcode || ''}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">
                View on Instagram ↗
              </a>
            ` : ''}

            <button class="btn btn-secondary btn-sm" onclick="pipelineView.closeJobDetail()">
              Close
            </button>
          </div>

        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: #DC2626; padding: 2rem; text-align: center;">Failed to load job telemetry: ${escapeHtml(err.message)}</div>`;
    }
  }

  function closeJobDetail() {
    activeDetailJobId = null;
    const modal = document.getElementById('job-detail-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async function retryJob(jobId) {
    try {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      window.app?.toast(`Job #${jobId} queued for retry!`, 'success');
      closeJobDetail();
      loadData();
    } catch (err) {
      window.app?.toast(err.message, 'danger');
    }
  }

  function triggerReRender(jobId) {
    closeJobDetail();
    window.location.hash = '#studio';
    window.app?.navigate('studio');
    // Call studio view's quick re-render modal
    setTimeout(() => {
      window.studioView?.openReRenderModal(jobId);
    }, 200);
  }

  function setViewMode(mode) {
    viewMode = mode;
    renderJobs();
  }

  function onStageFilterChange(val) {
    filterStage = val;
    renderJobs();
  }

  function onPageFilterChange(val) {
    filterPageId = val;
    renderJobs();
  }

  function onSearch(query) {
    searchQuery = query;
    loadData(true);
  }

  function onEvent(event) {
    // If incoming event matches our active detail modal, refresh it
    if (activeDetailJobId && String(event.jobId) === String(activeDetailJobId)) {
      openJobDetail(activeDetailJobId);
    }
    // Refresh list on status or progress updates
    if (['job_status', 'job_progress', 'published'].includes(event.type)) {
      loadData(true);
    }
  }

  return {
    render,
    refresh: () => loadData(false),
    setViewMode,
    onStageFilterChange,
    onPageFilterChange,
    onSearch,
    openJobDetail,
    closeJobDetail,
    retryJob,
    triggerReRender,
    onEvent
  };
})();
