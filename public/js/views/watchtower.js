/**
 * OmniStudio v7 — Agent 2: Watchtower View
 * 24/7 autonomous source account surveillance and viral discovery
 */
window.watchtowerView = (function() {
  let activeTab = 'sources'; // 'sources' | 'discoveries' | 'runs'
  let cachedStatus = null;

  async function render() {
    const container = document.getElementById('view-watchtower');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span style="font-size: 2rem; line-height: 1;">🛰️</span>
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0;">Agent 2: Watchtower</h2>
              <span id="wt-header-status-badge" class="badge badge-blue">● ACTIVE</span>
            </div>
            <p class="text-sm text-muted" style="margin-top: 0.15rem;">
              Autonomous 24/7 competitor surveillance with human jitter and viral decay ranking
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="wt-btn-pause-toggle" class="btn btn-secondary btn-sm" onclick="watchtowerView.togglePause()">
            ⏸️ Pause
          </button>
          <button class="btn btn-blue btn-sm" onclick="watchtowerView.runCycle()">
            ⚡ Run Surveillance Now
          </button>
        </div>
      </div>

      <!-- Surveillance Stats Summary -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card card-agent-watchtower" style="padding: 1rem;">
          <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Surveillance Cadence</div>
          <div id="wt-stat-cadence" style="font-size: 1.35rem; font-weight: 800; color: var(--agent-watchtower);">Every 3h</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem;">+ 11-35m human jitter</div>
        </div>
        <div class="card" style="padding: 1rem;">
          <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Next Cycle In</div>
          <div id="wt-stat-countdown" style="font-size: 1.35rem; font-weight: 800; color: var(--accent-primary);">--</div>
          <div id="wt-stat-night-cooldown" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Night cooldown: 01:00-06:30</div>
        </div>
        <div class="card" style="padding: 1rem;">
          <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Monitored Accounts</div>
          <div id="wt-stat-sources" style="font-size: 1.35rem; font-weight: 800; color: var(--agent-reposter);">--</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Active target feeds</div>
        </div>
        <div class="card" style="padding: 1rem;">
          <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Discovered Posts</div>
          <div id="wt-stat-discoveries" style="font-size: 1.35rem; font-weight: 800; color: var(--violet);">--</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Scored & evaluated</div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 1.25rem; padding-bottom: 0.4rem;">
        <button id="wt-tab-btn-sources" class="btn btn-sm ${activeTab === 'sources' ? 'btn-blue' : 'btn-secondary'}" onclick="watchtowerView.switchTab('sources')">
          🎯 Monitored Sources (<span id="wt-tab-sources-count">0</span>)
        </button>
        <button id="wt-tab-btn-discoveries" class="btn btn-sm ${activeTab === 'discoveries' ? 'btn-blue' : 'btn-secondary'}" onclick="watchtowerView.switchTab('discoveries')">
          ✨ Discovered Reels (<span id="wt-tab-disc-count">0</span>)
        </button>
        <button id="wt-tab-btn-runs" class="btn btn-sm ${activeTab === 'runs' ? 'btn-blue' : 'btn-secondary'}" onclick="watchtowerView.switchTab('runs')">
          📜 Surveillance Run History
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="wt-tab-content">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading Watchtower data...</div>
      </div>
    `;

    await loadStatus();
    await renderActiveTab();
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
    const countdown = document.getElementById('wt-stat-countdown');
    const sourcesCount = document.getElementById('wt-stat-sources');

    if (sourcesCount) sourcesCount.textContent = status.sourcesCount || '0';

    const isPaused = status.paused || status.isPaused;

    if (badge && toggleBtn) {
      if (isPaused) {
        badge.textContent = '● PAUSED';
        badge.className = 'badge badge-red';
        toggleBtn.innerHTML = '▶️ Resume';
        if (countdown) {
          countdown.textContent = 'Paused';
          countdown.style.color = 'var(--danger)';
        }
      } else if (status.isScanning) {
        badge.textContent = '● SCANNING NOW';
        badge.className = 'badge badge-blue';
        toggleBtn.innerHTML = '⏸️ Pause';
        if (countdown) {
          countdown.textContent = 'In Progress...';
          countdown.style.color = 'var(--agent-watchtower)';
        }
      } else {
        badge.textContent = '● ACTIVE';
        badge.className = 'badge badge-blue';
        toggleBtn.innerHTML = '⏸️ Pause';
        if (countdown) {
          let minutesLeft = 0;
          if (status.nextRunInMs !== undefined && !isNaN(status.nextRunInMs)) {
            minutesLeft = Math.max(0, Math.round(status.nextRunInMs / 60000));
          } else if (status.nextRunAt) {
            const diffMs = Math.max(0, new Date(status.nextRunAt).getTime() - Date.now());
            minutesLeft = Math.round(diffMs / 60000);
          } else {
            minutesLeft = (status.intervalHours || 3) * 60;
          }
          countdown.textContent = minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`;
          countdown.style.color = 'var(--warning)';
        }
      }
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    ['sources', 'discoveries', 'runs'].forEach(t => {
      const btn = document.getElementById(`wt-tab-btn-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'btn btn-sm btn-blue';
        } else {
          btn.className = 'btn btn-sm btn-secondary';
        }
      }
    });
    renderActiveTab();
  }

  async function renderActiveTab() {
    const content = document.getElementById('wt-tab-content');
    if (!content) return;

    if (activeTab === 'sources') {
      await renderSourcesTab(content);
    } else if (activeTab === 'discoveries') {
      await renderDiscoveriesTab(content);
    } else if (activeTab === 'runs') {
      await renderRunsTab(content);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Sources Tab
  // ─────────────────────────────────────────────────────────────
  async function renderSourcesTab(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.25rem; align-items: start;">
        <!-- Sources List -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Monitored Instagram Accounts</h3>
            <div class="flex items-center gap-2">
              <select id="wt-sources-page-filter" class="form-input" style="font-size: 0.76rem; padding: 3px 8px; width: auto;" onchange="watchtowerView.loadSourcesData()">
                <option value="">All Connected Pages</option>
                ${(window.app?.pages || []).map(p => `<option value="${p.id}">${p.name} (@${p.slug})</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="wt-sources-table" class="table-container">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading sources...</div>
          </div>
        </div>

        <!-- Add Source Form -->
        <div class="card" style="background: var(--bg-card);">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem;">+ Add Source Account</h3>

          <div class="form-group mb-3">
            <label class="form-label">Instagram Username</label>
            <input type="text" id="wt-new-source-user" class="form-input" placeholder="e.g. rockstargames or gtanewz">
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Target Repost Page</label>
            <select id="wt-new-source-page" class="form-input">
              ${(window.app?.pages || []).map(p => `<option value="${p.id}">${p.name} (@${p.slug})</option>`).join('')}
            </select>
          </div>

          <button class="btn btn-blue w-full mb-3" onclick="watchtowerView.addSource()">
            Add Single Source
          </button>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 1rem 0;">

          <!-- Bulk Add -->
          <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 0.35rem;">Bulk Add Multiple Sources</div>
          <textarea id="wt-bulk-sources" class="form-input mb-2" rows="3" placeholder="rockstargames&#10;gtanewz&#10;gamingbible" style="font-family: var(--font-mono); font-size: 0.8rem;"></textarea>
          <button class="btn btn-secondary btn-sm w-full" onclick="watchtowerView.bulkAddSources()">
            Bulk Import Accounts
          </button>
        </div>
      </div>
    `;

    loadSourcesData();
  }

  async function loadSourcesData() {
    try {
      const pageFilter = document.getElementById('wt-sources-page-filter')?.value;
      const url = pageFilter ? `/api/sources?pageId=${pageFilter}` : '/api/sources';
      const res = await fetch(url);
      if (!res.ok) return;
      const sources = await res.json();

      const countBadge = document.getElementById('wt-tab-sources-count');
      if (countBadge) countBadge.textContent = sources.length;

      const container = document.getElementById('wt-sources-table');
      if (!container) return;

      if (sources.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">No source accounts configured. Add one using the form on the right!</div>`;
        return;
      }

      const rows = sources.map(s => {
        const lastChecked = s.last_checked_at ? formatTimeAgo(s.last_checked_at) : 'Never';
        const pageSlug = s.page_slug ? `@${s.page_slug}` : `@page#${s.page_id}`;
        const activeBadge = s.is_active ? 
          `<span class="badge badge-emerald">Active</span>` :
          `<span class="badge badge-red">Disabled</span>`;

        return `
          <tr>
            <td>
              <a href="https://instagram.com/${s.username}" target="_blank" style="font-weight: 700; text-decoration: none;">
                @${s.username} ↗
              </a>
            </td>
            <td style="font-weight: 600;">${pageSlug}</td>
            <td style="color: var(--text-muted); font-size: 0.78rem;">${lastChecked}</td>
            <td>${activeBadge}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.checkSource(${s.id})" style="font-size: 0.72rem; padding: 2px 7px;">
                ⚡ Check
              </button>
              <button class="btn btn-danger btn-sm" onclick="watchtowerView.deleteSource(${s.id})" style="font-size: 0.72rem; padding: 2px 7px; margin-left: 4px;">
                ✕
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Source Account</th>
              <th>Target Page</th>
              <th>Last Checked</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (err) {
      console.warn('[loadSourcesData error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Discoveries Tab
  // ─────────────────────────────────────────────────────────────
  async function renderDiscoveriesTab(container) {
    container.innerHTML = `
      <div class="card mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Discovered Reels Feed</h3>
          <div class="flex gap-2">
            <select id="wt-disc-page-filter" class="form-input" style="font-size: 0.78rem; padding: 4px 8px; width: auto;" onchange="watchtowerView.loadDiscoveriesData()">
              <option value="">All Target Pages</option>
              ${(window.app?.pages || []).map(p => `<option value="${p.id}">${p.name} (@${p.slug})</option>`).join('')}
            </select>
            <select id="wt-disc-filter" class="form-input" style="width: 150px; font-size: 0.8rem; padding: 4px 8px;" onchange="watchtowerView.loadDiscoveriesData()">
              <option value="">All Statuses</option>
              <option value="discovered" selected>Discovered (Fresh)</option>
              <option value="selected">Selected / Queued</option>
              <option value="skipped">Skipped</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="watchtowerView.loadDiscoveriesData()">Refresh</button>
          </div>
        </div>
        <div id="wt-discoveries-feed">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">Loading discovered reels...</div>
        </div>
      </div>
    `;

    loadDiscoveriesData();
  }

  async function loadDiscoveriesData() {
    const container = document.getElementById('wt-discoveries-feed');
    if (!container) return;

    const filterVal = document.getElementById('wt-disc-filter')?.value || '';
    const pageFilter = document.getElementById('wt-disc-page-filter')?.value || '';
    let query = '?limit=30';
    if (filterVal) query += `&status=${filterVal}`;
    if (pageFilter) query += `&pageId=${pageFilter}`;

    try {
      const res = await fetch(`/api/discoveries${query}`);
      if (!res.ok) return;
      const discoveries = await res.json();

      const countBadge = document.getElementById('wt-tab-disc-count');
      const statBadge = document.getElementById('wt-stat-discoveries');
      if (countBadge) countBadge.textContent = discoveries.length;
      if (statBadge) statBadge.textContent = discoveries.length;

      if (discoveries.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 3rem; text-align: center;">No discovered reels found for this filter. Run surveillance to discover fresh content!</div>`;
        return;
      }

      const cards = discoveries.map(d => {
        const score = typeof d.score === 'number' ? d.score.toFixed(1) : (d.score || '0');
        const likes = (d.likes || 0).toLocaleString();
        const comments = (d.comments || 0).toLocaleString();
        const timeAgo = formatTimeAgo(d.created_at || d.discovered_at);
        const captionText = d.caption ? d.caption.substring(0, 85) + '...' : 'No caption text';

        let actionBtns = '';
        if (d.status === 'discovered') {
          actionBtns = `
            <div class="flex gap-2 w-full mt-3">
              <button class="btn btn-blue btn-sm w-full" onclick="watchtowerView.postDiscovery(${d.id})" style="font-size: 0.75rem; padding: 4px;">
                🚀 Post Now
              </button>
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.skipDiscovery(${d.id})" style="font-size: 0.75rem; padding: 4px 8px; color: var(--text-muted);">
                Skip
              </button>
            </div>
          `;
        } else if (d.status === 'selected') {
          actionBtns = `<span class="badge badge-emerald w-full justify-center mt-3" style="padding: 4px;">Queued for Publish</span>`;
        } else if (d.status === 'skipped') {
          actionBtns = `<span class="badge badge-muted w-full justify-center mt-3" style="padding: 4px;">Skipped</span>`;
        }

        return `
          <div class="card" style="background: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between; padding: 0.95rem; border: 1px solid var(--border-card);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <a href="${d.url}" target="_blank" style="font-weight: 700; font-size: 0.82rem; text-decoration: none;">
                  @${d.source_username || 'creator'} ↗
                </a>
                <span class="badge badge-blue">
                  ⭐ Score: ${score}
                </span>
              </div>

              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 0.75rem; min-height: 38px;">
                ${captionText}
              </p>

              <div class="flex items-center justify-between" style="font-size: 0.72rem; color: var(--text-muted); background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle);">
                <span>❤️ ${likes}</span>
                <span>💬 ${comments}</span>
                <span>🕒 ${timeAgo}</span>
              </div>
            </div>

            ${actionBtns}
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;">
          ${cards}
        </div>
      `;
    } catch (err) {
      console.warn('[loadDiscoveriesData error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Surveillance Run History Tab
  // ─────────────────────────────────────────────────────────────
  async function renderRunsTab(container) {
    container.innerHTML = `
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Surveillance Cycle History</h3>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.loadRunsData()">Refresh</button>
        </div>
        <div id="wt-runs-table" class="table-container">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">Loading runs history...</div>
        </div>
      </div>
    `;

    loadRunsData();
  }

  async function loadRunsData() {
    const container = document.getElementById('wt-runs-table');
    if (!container) return;

    try {
      const res = await fetch('/api/watchtower/runs?limit=20');
      if (!res.ok) return;
      const runs = await res.json();

      if (runs.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">No surveillance runs recorded yet. Trigger one with "Run Surveillance Now"!</div>`;
        return;
      }

      const rows = runs.map(r => {
        const time = new Date(r.started_at).toLocaleString();
        const duration = r.duration_seconds ? `${r.duration_seconds}s` : '--';
        const statusBadge = r.status === 'completed' ?
          `<span class="badge badge-emerald">Completed</span>` :
          `<span class="badge badge-red">${r.status}</span>`;

        return `
          <tr>
            <td style="font-weight: 700; color: var(--accent-primary); font-family: var(--font-mono);">#${r.id}</td>
            <td style="color: var(--text-secondary); font-size: 0.78rem;">${time}</td>
            <td>
              <span class="badge badge-muted">${r.trigger_type || 'scheduled'}</span>
            </td>
            <td>${r.sources_checked || 0}</td>
            <td style="color: var(--agent-watchtower); font-weight: 600;">${r.posts_discovered || 0}</td>
            <td style="color: var(--agent-reposter); font-weight: 600;">${r.posts_selected || 0}</td>
            <td style="color: var(--text-muted); font-size: 0.75rem;">${duration}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Started At</th>
              <th>Trigger</th>
              <th>Sources</th>
              <th>Discovered</th>
              <th>Selected</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (err) {
      console.warn('[loadRunsData error]:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────
  async function runCycle() {
    try {
      const res = await fetch('/api/watchtower/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      app.toast('🛰️ Surveillance cycle initiated!', 'success');
      setTimeout(() => loadStatus(), 1500);
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
      app.toast(data.paused ? 'Watchtower surveillance paused' : 'Watchtower surveillance resumed!', 'info');
      await loadStatus();
    } catch (err) {
      app.toast('Failed to update status: ' + err.message, 'error');
    }
  }

  async function addSource() {
    const userEl = document.getElementById('wt-new-source-user');
    const pageEl = document.getElementById('wt-new-source-page');
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
      loadSourcesData();
      loadStatus();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function bulkAddSources() {
    const textEl = document.getElementById('wt-bulk-sources');
    const pageEl = document.getElementById('wt-new-source-page');
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
      app.toast(`Imported ${data.addedCount} accounts!`, 'success');
      textEl.value = '';
      loadSourcesData();
      loadStatus();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function deleteSource(id) {
    if (!confirm('Stop monitoring this source account?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Source removed', 'info');
        loadSourcesData();
        loadStatus();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function checkSource(id) {
    app.toast('Running test inspection of profile...', 'info');
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
        loadDiscoveriesData();
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
        loadDiscoveriesData();
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

  return {
    render,
    switchTab,
    runCycle,
    togglePause,
    addSource,
    bulkAddSources,
    deleteSource,
    checkSource,
    postDiscovery,
    skipDiscovery,
    loadSourcesData,
    loadDiscoveriesData,
    loadRunsData,
    refresh: () => {
      loadStatus();
      renderActiveTab();
    }
  };
})();
