/**
 * OmniStudio v7 — Content Pipeline Queue View
 * Review & Queue management for pending, active, and failed jobs
 */
window.queueView = (function() {
  let activeTab = 'review'; // 'review' | 'active' | 'failed'

  async function render() {
    const container = document.getElementById('view-queue');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0 0 0.2rem 0;">Review & Content Pipeline</h2>
          <p class="text-sm text-muted">Manage caption reviews, live worker queues, and failed attempts</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="queueView.refresh()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Refresh
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 1.25rem; padding-bottom: 0.4rem;">
        <button id="q-tab-btn-review" class="btn btn-sm ${activeTab === 'review' ? 'btn-primary' : 'btn-secondary'}" onclick="queueView.switchTab('review')">
          ✍️ Needs Review (<span id="q-badge-review">0</span>)
        </button>
        <button id="q-tab-btn-active" class="btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}" onclick="queueView.switchTab('active')">
          ⚙️ Active Pipeline (<span id="q-badge-active">0</span>)
        </button>
        <button id="q-tab-btn-failed" class="btn btn-sm ${activeTab === 'failed' ? 'btn-primary' : 'btn-secondary'}" onclick="queueView.switchTab('failed')">
          ⚠️ Failed / Deadletter (<span id="q-badge-failed">0</span>)
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="q-tab-content">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading pipeline data...</div>
      </div>
    `;

    await renderActiveTab();
  }

  function switchTab(tab) {
    activeTab = tab;
    ['review', 'active', 'failed'].forEach(t => {
      const btn = document.getElementById(`q-tab-btn-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'btn btn-sm btn-primary';
        } else {
          btn.className = 'btn btn-sm btn-secondary';
        }
      }
    });
    renderActiveTab();
  }

  async function renderActiveTab() {
    const container = document.getElementById('q-tab-content');
    if (!container) return;

    if (activeTab === 'review') {
      await renderReviewTab(container);
    } else if (activeTab === 'active') {
      await renderActiveJobsTab(container);
    } else if (activeTab === 'failed') {
      await renderFailedJobsTab(container);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Needs Review Tab
  // ─────────────────────────────────────────────────────────────
  async function renderReviewTab(container) {
    try {
      const res = await fetch('/api/jobs?status=pending_review');
      const jobs = res.ok ? await res.json() : [];

      const badge = document.getElementById('q-badge-review');
      if (badge) badge.textContent = jobs.length;

      if (jobs.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding: 3.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
            <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">Review Queue Empty</div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">No content pending review. Submissions are automatically processed or published.</p>
          </div>
        `;
        return;
      }

      const cards = jobs.map(j => {
        const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
        const initialCaption = j.caption || '';
        const initialLen = initialCaption.length;
        const initialTags = (initialCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;

        return `
          <div class="card mb-3" style="border-left: 4px solid var(--warning); background: var(--bg-card);">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="badge badge-amber">#${j.id}</span>
                <span style="font-weight: 700; font-size: 0.95rem;">Target: ${pageSlug}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">• ${j.agent === 'watchtower' ? '🛰️ Watchtower' : '📲 Reposter'}</span>
              </div>
              <a href="${j.source_url}" target="_blank" style="font-size: 0.8rem; text-decoration: none;">
                ${j.shortcode ? `/reel/${j.shortcode}` : 'Source Link'} ↗
              </a>
            </div>

            <div class="form-group mb-2">
              <div class="flex items-center justify-between mb-1">
                <label class="form-label font-bold" style="font-size: 0.78rem; margin: 0;">Review & Edit Caption Before Publishing</label>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                  Hashtags: <span id="q-tags-${j.id}" style="color: var(--accent-primary);">${initialTags}</span>/30 • 
                  Chars: <span id="q-len-${j.id}" style="color: var(--accent-primary);">${initialLen}</span>/2200
                </div>
              </div>
              <textarea id="q-caption-${j.id}" class="form-input" rows="4" style="font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.45;" oninput="queueView.onCaptionInput(${j.id})">${initialCaption}</textarea>
            </div>

            <div class="flex items-center justify-between mt-3">
              <button class="btn btn-danger btn-sm" onclick="queueView.deleteJob(${j.id})">
                🗑️ Discard
              </button>
              <button class="btn btn-primary btn-sm" onclick="queueView.approveJob(${j.id})">
                ✅ Approve & Publish Live Now
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cards;
    } catch (err) {
      console.warn('[renderReviewTab error]:', err);
    }
  }

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

  // ─────────────────────────────────────────────────────────────
  // 2. Active Pipeline Tab
  // ─────────────────────────────────────────────────────────────
  async function renderActiveJobsTab(container) {
    try {
      const res = await fetch('/api/jobs?status=queued,downloading,processing,uploading,publishing');
      const jobs = res.ok ? await res.json() : [];

      const badge = document.getElementById('q-badge-active');
      if (badge) badge.textContent = jobs.length;

      if (jobs.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding: 3.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💤</div>
            <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">Pipeline Idle</div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">No downloading or publishing jobs currently in progress.</p>
          </div>
        `;
        return;
      }

      const rows = jobs.map(j => {
        const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
        return `
          <tr>
            <td style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">#${j.id}</td>
            <td style="font-weight: 600;">${pageSlug}</td>
            <td>
              <a href="${j.source_url}" target="_blank">
                ${j.shortcode || 'Link'} ↗
              </a>
            </td>
            <td>
              <span class="badge badge-blue">⚙️ ${j.status}</span>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.75rem;">
              ${j.progress_step || 'In progress'}
            </td>
            <td style="text-align: right;">
              <button class="btn btn-danger btn-sm" onclick="queueView.deleteJob(${j.id})" style="font-size: 0.72rem; padding: 2px 7px;">
                Cancel
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="card table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Destination</th>
                <th>Source</th>
                <th>Status</th>
                <th>Current Step</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      console.warn('[renderActiveJobsTab error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Failed / Deadletter Tab
  // ─────────────────────────────────────────────────────────────
  async function renderFailedJobsTab(container) {
    try {
      const res = await fetch('/api/jobs?status=failed');
      const jobs = res.ok ? await res.json() : [];

      const badge = document.getElementById('q-badge-failed');
      if (badge) badge.textContent = jobs.length;

      if (jobs.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding: 3.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✨</div>
            <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">Zero Failed Jobs</div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">The publishing pipeline is operating with 100% health!</p>
          </div>
        `;
        return;
      }

      const cards = jobs.map(j => {
        const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
        return `
          <div class="card mb-3" style="border-left: 4px solid var(--danger); background: var(--bg-card);">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="badge badge-red">#${j.id} Failed</span>
                <span style="font-weight: 700;">${pageSlug}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">• Attempts: ${j.attempts || 1}</span>
              </div>
              <a href="${j.source_url}" target="_blank" style="font-size: 0.8rem; text-decoration: none;">
                ${j.shortcode || 'Source'} ↗
              </a>
            </div>

            <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); padding: 0.65rem 0.85rem; border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: 0.78rem; color: var(--danger); margin-bottom: 0.75rem; word-break: break-word;">
              ${j.error || 'Unknown pipeline failure occurred'}
            </div>

            <div class="flex items-center justify-between">
              <button class="btn btn-danger btn-sm" onclick="queueView.deleteJob(${j.id})">
                🗑️ Delete Job
              </button>
              <button class="btn btn-primary btn-sm" onclick="queueView.retryJob(${j.id})">
                🔄 Retry Publishing
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cards;
    } catch (err) {
      console.warn('[renderFailedJobsTab error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────
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
        app.toast('Job approved and moved to active publishing queue!', 'success');
        renderActiveTab();
      } else {
        app.toast(data.error || 'Failed to approve', 'error');
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
        renderActiveTab();
      } else {
        app.toast(data.error || 'Failed to retry', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function deleteJob(id) {
    if (!confirm('Discard and delete this pipeline job?')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Job deleted', 'info');
        renderActiveTab();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  return {
    render,
    switchTab,
    approveJob,
    retryJob,
    deleteJob,
    onCaptionInput,
    refresh: renderActiveTab
  };
})();
