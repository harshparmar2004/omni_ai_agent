/**
 * OmniStudio v7 — Command Center View
 * Real-time overview of Agent 1 (Reposter) and Agent 2 (Watchtower)
 */
window.commandCenterView = (function() {
  let activityLogs = [];

  async function render() {
    const container = document.getElementById('view-command-center');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.2rem;">Command Center</h2>
          <p class="text-sm text-muted">Autonomous multi-agent Instagram publishing and surveillance status</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="commandCenterView.refresh()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Refresh
        </button>
      </div>

      <!-- Agent Status Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
        <!-- Agent 1: Reposter Card -->
        <div class="card card-agent-reposter" style="position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.6rem; line-height: 1;">📲</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem;">Agent 1: Reposter</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Direct Telegram & Dashboard Ingestion</div>
              </div>
            </div>
            <span class="badge badge-emerald">● ONLINE</span>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
            Listens on Telegram bot (<code style="color: #60a5fa;">@omnistudio_bot</code>) and Web Dashboard. Downloads 1080p, generates attribution, publishes live via Meta Graph API v21.0.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-input); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 1.15rem;">
            <div>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Published Today</div>
              <div id="cc-reposter-today" style="font-size: 1.4rem; font-weight: 800; color: var(--agent-reposter);">--</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Active Pipeline</div>
              <div id="cc-reposter-active" style="font-size: 1.4rem; font-weight: 800; color: var(--agent-watchtower);">--</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-emerald btn-sm w-full" onclick="app.openRepostModal()">
              🚀 Repost New Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('reposter')">
              View Agent ➔
            </button>
          </div>
        </div>

        <!-- Agent 2: Watchtower Card -->
        <div class="card card-agent-watchtower" style="position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.6rem; line-height: 1;">🛰️</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem;">Agent 2: Watchtower</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">24/7 Source Surveillance & Discovery</div>
              </div>
            </div>
            <span id="cc-watchtower-badge" class="badge badge-blue">● ACTIVE</span>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
            Monitors competitor feeds every 3 hours with human jitter. Ranks reels by engagement, queues high-performers for auto-publish or review.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-input); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 1.15rem;">
            <div>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Monitored Sources</div>
              <div id="cc-watchtower-sources" style="font-size: 1.4rem; font-weight: 800; color: var(--agent-watchtower);">--</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Next Cycle In</div>
              <div id="cc-watchtower-next" style="font-size: 1.15rem; font-weight: 800; color: #F59E0B; line-height: 1.4;">--</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-blue btn-sm w-full" id="cc-btn-run-watchtower" onclick="commandCenterView.runWatchtower()">
              ⚡ Run Surveillance Now
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('watchtower')">
              Manage Sources ➔
            </button>
          </div>
        </div>
      </div>

      <!-- System Health Diagnostics Bar -->
      <div class="card mb-4" style="padding: 0.95rem 1.25rem;">
        <div class="flex items-center justify-between mb-3">
          <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            System Diagnostics & Integration Health
          </div>
          <span style="font-size: 0.72rem; color: var(--text-muted);" id="cc-health-timestamp">Last checked: Just now</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Database</span>
            <span id="cc-health-db" class="badge badge-emerald">SQLite OK</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Meta Graph API</span>
            <span id="cc-health-meta" class="badge badge-emerald">v21.0 Active</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Cloudflare Tunnel</span>
            <span id="cc-health-tunnel" class="badge badge-emerald">Active</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Telegram Bot</span>
            <span id="cc-health-tg" class="badge badge-emerald">Listening</span>
          </div>
        </div>
      </div>

      <!-- Main Split: Recent Jobs & Live SSE Activity Feed -->
      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1.25rem; align-items: start;">
        <!-- Recent Jobs -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Recent Pipeline Jobs</h3>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('queue')">All Jobs ➔</button>
          </div>
          <div id="cc-recent-jobs" class="table-container">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading jobs...</div>
          </div>
        </div>

        <!-- Live Activity Stream (SSE) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <span class="pulse-dot"></span>
              Live Agent Activity Stream
            </h3>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.clearLogs()">Clear</button>
          </div>
          <div id="cc-activity-stream" style="display: flex; flex-direction: column; gap: 0.45rem; max-height: 420px; overflow-y: auto; padding-right: 2px;">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Listening for real-time agent events...</div>
          </div>
        </div>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    try {
      // 1. Fetch system health
      const healthRes = await fetch('/api/system/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        const tunnelBadge = document.getElementById('cc-health-tunnel');
        if (tunnelBadge) {
          if (health.tunnel?.healthy) {
            tunnelBadge.textContent = 'Active';
            tunnelBadge.className = 'badge badge-emerald';
          } else {
            tunnelBadge.textContent = health.tunnel?.hasPublicUrl ? 'Local/Host' : 'Offline';
            tunnelBadge.className = 'badge badge-amber';
          }
        }
      }

      // 2. Fetch Watchtower status
      const wtRes = await fetch('/api/watchtower/status');
      if (wtRes.ok) {
        const wt = await wtRes.json();
        const wtBadge = document.getElementById('cc-watchtower-badge');
        const wtSources = document.getElementById('cc-watchtower-sources');
        const wtNext = document.getElementById('cc-watchtower-next');

        if (wtSources) wtSources.textContent = wt.sourcesCount || '0';
        if (wtNext) {
          if (wt.paused || wt.isPaused) {
            wtNext.textContent = 'Paused';
            wtNext.style.color = 'var(--danger)';
          } else if (wt.isScanning) {
            wtNext.textContent = 'Scanning Now';
            wtNext.style.color = 'var(--agent-watchtower)';
          } else {
            const minutesLeft = Math.max(0, Math.round(wt.nextRunInMs / 60000));
            wtNext.textContent = minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`;
          }
        }
        if (wtBadge) {
          if (wt.paused || wt.isPaused) {
            wtBadge.textContent = '● PAUSED';
            wtBadge.className = 'badge badge-red';
          } else if (wt.isScanning) {
            wtBadge.textContent = '● SCANNING';
            wtBadge.className = 'badge badge-blue';
          } else {
            wtBadge.textContent = '● ACTIVE';
            wtBadge.className = 'badge badge-blue';
          }
        }
      }

      // 3. Fetch jobs
      const jobsRes = await fetch('/api/jobs?limit=8');
      if (jobsRes.ok) {
        const jobs = await jobsRes.json();
        renderRecentJobs(jobs);

        const publishedCount = jobs.filter(j => j.status === 'published').length;
        const activeCount = jobs.filter(j => ['queued', 'downloading', 'processing', 'uploading', 'publishing'].includes(j.status)).length;
        
        const repToday = document.getElementById('cc-reposter-today');
        const repActive = document.getElementById('cc-reposter-active');
        if (repToday) repToday.textContent = publishedCount;
        if (repActive) repActive.textContent = activeCount;
      }
    } catch (err) {
      console.warn('[CommandCenter loadData failed]:', err);
    }
  }

  function renderRecentJobs(jobs) {
    const container = document.getElementById('cc-recent-jobs');
    if (!container) return;

    if (!jobs || jobs.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">No pipeline jobs yet. Click "Repost New Reel" to start!</div>`;
      return;
    }

    const rows = jobs.map(j => {
      const statusBadge = getStatusBadge(j.status);
      const shortcode = j.shortcode || 'Link';
      const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
      const timeAgo = formatTimeAgo(j.created_at);

      return `
        <tr>
          <td style="font-weight: 700; color: #60A5FA; font-family: var(--font-mono);">#${j.id}</td>
          <td>
            <div style="font-weight: 600;">${pageSlug}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${j.agent === 'watchtower' ? '🛰️ Watchtower' : '📲 Reposter'}</div>
          </td>
          <td>
            <a href="${j.source_url}" target="_blank" style="text-decoration: none;" title="${j.source_url}">
              ${shortcode} ↗
            </a>
          </td>
          <td>${statusBadge}</td>
          <td style="color: var(--text-muted); font-size: 0.75rem;">${timeAgo}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Page</th>
            <th>Content</th>
            <th>Status</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'published':
        return `<span class="badge badge-emerald">Published</span>`;
      case 'failed':
        return `<span class="badge badge-red">Failed</span>`;
      case 'pending_review':
        return `<span class="badge badge-amber">Needs Review</span>`;
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

  function addLog(event) {
    const stream = document.getElementById('cc-activity-stream');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const text = event.message || event.step || JSON.stringify(event.data || {});
    const type = event.type || 'SYSTEM';

    activityLogs.unshift({ time, text, type });
    if (activityLogs.length > 40) activityLogs.pop();

    if (!stream) return;

    const rows = activityLogs.map(item => `
      <div style="background: var(--bg-input); border-left: 3px solid var(--agent-watchtower); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.15rem; border: 1px solid var(--border-subtle); border-left-width: 3px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted);">
          <span style="font-weight: 700; color: #60A5FA;">${item.type}</span>
          <span style="font-family: var(--font-mono);">${item.time}</span>
        </div>
        <div style="color: var(--text-primary); word-break: break-word; font-family: var(--font-mono); font-size: 0.75rem;">${item.text}</div>
      </div>
    `).join('');

    stream.innerHTML = rows;
  }

  async function runWatchtower() {
    const btn = document.getElementById('cc-btn-run-watchtower');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Triggering...';
    }
    try {
      const res = await fetch('/api/watchtower/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      app.toast('🛰️ Watchtower surveillance cycle initiated!', 'success');
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      app.toast('Failed to trigger Watchtower: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Run Surveillance Now';
      }
    }
  }

  return {
    render,
    refresh: loadData,
    onEvent: addLog,
    clearLogs: () => {
      activityLogs = [];
      const stream = document.getElementById('cc-activity-stream');
      if (stream) stream.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Logs cleared. Listening for new events...</div>`;
    },
    runWatchtower
  };
})();
