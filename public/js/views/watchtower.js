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
          <span style="font-size: 2rem;">🛰️</span>
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0;">Agent 2: Watchtower</h2>
              <span id="wt-header-status-badge" class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">● ACTIVE</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0; font-size: 0.88rem;">
              Autonomous 24/7 feed surveillance with human-jittered delay and viral ranking
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="wt-btn-pause-toggle" class="btn btn-secondary btn-sm" onclick="watchtowerView.togglePause()">
            ⏸️ Pause
          </button>
          <button class="btn btn-primary btn-sm" onclick="watchtowerView.runCycle()">
            ⚡ Run Surveillance Now
          </button>
        </div>
      </div>

      <!-- Surveillance Stats Summary -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="card" style="padding: 0.85rem 1rem;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Surveillance Cadence</div>
          <div id="wt-stat-cadence" style="font-size: 1.25rem; font-weight: 800; color: #60a5fa;">Every 3h</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">+ 5-25m human jitter</div>
        </div>
        <div class="card" style="padding: 0.85rem 1rem;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Next Cycle Countdown</div>
          <div id="wt-stat-countdown" style="font-size: 1.25rem; font-weight: 800; color: #F59E0B;">--</div>
          <div id="wt-stat-night-cooldown" style="font-size: 0.72rem; color: var(--text-secondary);">Night cooldown: 01:00-06:30</div>
        </div>
        <div class="card" style="padding: 0.85rem 1rem;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Monitored Accounts</div>
          <div id="wt-stat-sources" style="font-size: 1.25rem; font-weight: 800; color: #10B981;">--</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">Active target sources</div>
        </div>
        <div class="card" style="padding: 0.85rem 1rem;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Discovered Posts</div>
          <div id="wt-stat-discoveries" style="font-size: 1.25rem; font-weight: 800; color: #A855F7;">--</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">Evaluated & ranked</div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.25rem; padding-bottom: 0.25rem;">
        <button id="wt-tab-btn-sources" class="btn btn-secondary btn-sm ${activeTab === 'sources' ? 'active' : ''}" onclick="watchtowerView.switchTab('sources')" style="${activeTab === 'sources' ? 'background: var(--accent-primary); color: #fff;' : ''}">
          🎯 Monitored Sources (<span id="wt-tab-sources-count">0</span>)
        </button>
        <button id="wt-tab-btn-discoveries" class="btn btn-secondary btn-sm ${activeTab === 'discoveries' ? 'active' : ''}" onclick="watchtowerView.switchTab('discoveries')" style="${activeTab === 'discoveries' ? 'background: var(--accent-primary); color: #fff;' : ''}">
          ✨ Discovered Reels (<span id="wt-tab-disc-count">0</span>)
        </button>
        <button id="wt-tab-btn-runs" class="btn btn-secondary btn-sm ${activeTab === 'runs' ? 'active' : ''}" onclick="watchtowerView.switchTab('runs')" style="${activeTab === 'runs' ? 'background: var(--accent-primary); color: #fff;' : ''}">
          📜 Surveillance Run History
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="wt-tab-content">
        <div style="color: var(--text-muted); padding: 2rem; text-align: center;">Loading Watchtower data...</div>
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

    if (badge && toggleBtn) {
      if (status.paused) {
        badge.textContent = '● PAUSED';
        badge.style.color = '#EF4444';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        toggleBtn.innerHTML = '▶️ Resume';
        if (countdown) {
          countdown.textContent = 'Paused';
          countdown.style.color = '#EF4444';
        }
      } else if (status.isScanning) {
        badge.textContent = '● SCANNING NOW';
        badge.style.color = '#3B82F6';
        badge.style.background = 'rgba(59, 130, 246, 0.15)';
        toggleBtn.innerHTML = '⏸️ Pause';
        if (countdown) {
          countdown.textContent = 'In Progress...';
          countdown.style.color = '#3B82F6';
        }
      } else {
        badge.textContent = '● ACTIVE';
        badge.style.color = '#10B981';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        toggleBtn.innerHTML = '⏸️ Pause';
        if (countdown) {
          const minutesLeft = Math.max(0, Math.round(status.nextRunInMs / 60000));
          countdown.textContent = minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`;
          countdown.style.color = '#F59E0B';
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
          btn.style.background = 'var(--accent-primary)';
          btn.style.color = '#fff';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-secondary)';
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
            <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">Monitored Instagram Accounts</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Scraped in guest mode (no login bot required)</span>
          </div>
          <div id="wt-sources-table">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Loading sources...</div>
          </div>
        </div>

        <!-- Add Source Form -->
        <div class="card" style="background: var(--bg-deep);">
          <h3 style="font-size: 1rem; font-weight: 700; margin: 0 0 1rem 0;">+ Add Source Account</h3>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Instagram Username</label>
            <input type="text" id="wt-new-source-user" class="form-input" placeholder="e.g. rockstargames or gtanewz">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Target Repost Page</label>
            <select id="wt-new-source-page" class="form-input">
              ${(window.app?.pages || []).map(p => `<option value="${p.id}">${p.name} (@${p.slug})</option>`).join('')}
            </select>
          </div>

          <button class="btn btn-primary w-full mb-3" onclick="watchtowerView.addSource()">
            Add Single Source
          </button>

          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1rem 0;">

          <!-- Bulk Add -->
          <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem;">Bulk Add Multiple Sources</div>
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
      const res = await fetch('/api/sources');
      if (!res.ok) return;
      const sources = await res.json();

      const countBadge = document.getElementById('wt-tab-sources-count');
      if (countBadge) countBadge.textContent = sources.length;

      const container = document.getElementById('wt-sources-table');
      if (!container) return;

      if (sources.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">No source accounts configured. Add one using the form on the right!</div>`;
        return;
      }

      const rows = sources.map(s => {
        const lastChecked = s.last_checked_at ? formatTimeAgo(s.last_checked_at) : 'Never';
        const pageSlug = s.page_slug ? `@${s.page_slug}` : `@page#${s.page_id}`;
        const activeBadge = s.is_active ? 
          `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">Active</span>` :
          `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 700;">Disabled</span>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
            <td style="padding: 0.65rem 0.5rem;">
              <a href="https://instagram.com/${s.username}" target="_blank" style="font-weight: 700; color: #60a5fa; text-decoration: none;">
                @${s.username}
              </a>
            </td>
            <td style="padding: 0.65rem 0.5rem; font-weight: 600;">${pageSlug}</td>
            <td style="padding: 0.65rem 0.5rem; color: var(--text-secondary);">${lastChecked}</td>
            <td style="padding: 0.65rem 0.5rem;">${activeBadge}</td>
            <td style="padding: 0.65rem 0.5rem; text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.checkSource(${s.id})" style="font-size: 0.72rem; padding: 2px 7px;">
                ⚡ Check
              </button>
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.deleteSource(${s.id})" style="font-size: 0.72rem; padding: 2px 7px; color: #EF4444;">
                ✕
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">
              <th style="padding: 0.5rem;">Source Username</th>
              <th style="padding: 0.5rem;">Target Page</th>
              <th style="padding: 0.5rem;">Last Checked</th>
              <th style="padding: 0.5rem;">Status</th>
              <th style="padding: 0.5rem; text-align: right;">Actions</th>
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
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">Discovered Reels Feed</h3>
          <div class="flex gap-2">
            <select id="wt-disc-filter" class="form-input" style="width: 160px; font-size: 0.8rem; padding: 4px 8px;" onchange="watchtowerView.loadDiscoveriesData()">
              <option value="">All Statuses</option>
              <option value="discovered" selected>Discovered (Fresh)</option>
              <option value="selected">Selected / Queued</option>
              <option value="skipped">Skipped</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="watchtowerView.loadDiscoveriesData()">Refresh</button>
          </div>
        </div>
        <div id="wt-discoveries-feed">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading discovered reels...</div>
        </div>
      </div>
    `;

    loadDiscoveriesData();
  }

  async function loadDiscoveriesData() {
    const container = document.getElementById('wt-discoveries-feed');
    if (!container) return;

    const filterVal = document.getElementById('wt-disc-filter')?.value || '';
    const query = filterVal ? `?status=${filterVal}&limit=30` : '?limit=30';

    try {
      const res = await fetch(`/api/discoveries${query}`);
      if (!res.ok) return;
      const discoveries = await res.json();

      const countBadge = document.getElementById('wt-tab-disc-count');
      const statBadge = document.getElementById('wt-stat-discoveries');
      if (countBadge) countBadge.textContent = discoveries.length;
      if (statBadge) statBadge.textContent = discoveries.length;

      if (discoveries.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2.5rem; text-align: center;">No discovered reels found for this filter. Run surveillance to discover fresh content!</div>`;
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
            <div class="flex gap-2 w-full mt-2">
              <button class="btn btn-primary btn-sm w-full" onclick="watchtowerView.postDiscovery(${d.id})" style="font-size: 0.75rem; padding: 4px;">
                🚀 Post Now
              </button>
              <button class="btn btn-secondary btn-sm" onclick="watchtowerView.skipDiscovery(${d.id})" style="font-size: 0.75rem; padding: 4px 8px; color: var(--text-muted);">
                Skip
              </button>
            </div>
          `;
        } else if (d.status === 'selected') {
          actionBtns = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700; width: 100%; text-align: center; margin-top: 0.5rem;">Queued for Publish</span>`;
        } else if (d.status === 'skipped') {
          actionBtns = `<span class="badge" style="background: var(--bg-hover); color: var(--text-muted); width: 100%; text-align: center; margin-top: 0.5rem;">Skipped</span>`;
        }

        return `
          <div class="card" style="background: var(--bg-deep); display: flex; flex-direction: column; justify-content: space-between; padding: 0.85rem;">
            <div>
              <div class="flex items-center justify-between mb-2">
                <a href="${d.url}" target="_blank" style="font-weight: 700; color: #60a5fa; text-decoration: none; font-size: 0.82rem;">
                  @${d.source_username || 'creator'} ↗
                </a>
                <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6; font-size: 0.7rem; font-weight: 700;">
                  ⭐ Score: ${score}
                </span>
              </div>

              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem; min-height: 40px;">
                ${captionText}
              </p>

              <div class="flex items-center justify-between" style="font-size: 0.72rem; color: var(--text-muted); background: var(--bg-base); padding: 0.4rem 0.6rem; border-radius: 4px;">
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
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">Surveillance Cycle History</h3>
          <button class="btn btn-secondary btn-sm" onclick="watchtowerView.loadRunsData()">Refresh</button>
        </div>
        <div id="wt-runs-table">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading runs history...</div>
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
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">No surveillance runs recorded yet. Trigger one with "Run Surveillance Now"!</div>`;
        return;
      }

      const rows = runs.map(r => {
        const time = new Date(r.started_at).toLocaleString();
        const duration = r.duration_seconds ? `${r.duration_seconds}s` : '--';
        const statusBadge = r.status === 'completed' ?
          `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">Completed</span>` :
          `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 700;">${r.status}</span>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
            <td style="padding: 0.65rem 0.5rem; font-weight: 700; color: var(--accent-primary);">#${r.id}</td>
            <td style="padding: 0.65rem 0.5rem; color: var(--text-secondary);">${time}</td>
            <td style="padding: 0.65rem 0.5rem;">
              <span class="badge" style="background: var(--bg-hover); color: var(--text-secondary);">${r.trigger_type || 'scheduled'}</span>
            </td>
            <td style="padding: 0.65rem 0.5rem;">${r.sources_checked || 0}</td>
            <td style="padding: 0.65rem 0.5rem; color: #60a5fa; font-weight: 600;">${r.posts_discovered || 0}</td>
            <td style="padding: 0.65rem 0.5rem; color: #10B981; font-weight: 600;">${r.posts_selected || 0}</td>
            <td style="padding: 0.65rem 0.5rem; color: var(--text-muted);">${duration}</td>
            <td style="padding: 0.65rem 0.5rem;">${statusBadge}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">
              <th style="padding: 0.5rem;">Run ID</th>
              <th style="padding: 0.5rem;">Started At</th>
              <th style="padding: 0.5rem;">Trigger</th>
              <th style="padding: 0.5rem;">Sources</th>
              <th style="padding: 0.5rem;">Discovered</th>
              <th style="padding: 0.5rem;">Selected</th>
              <th style="padding: 0.5rem;">Duration</th>
              <th style="padding: 0.5rem;">Status</th>
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
  // Action Handlers
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
    const isPaused = cachedStatus?.paused;
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
