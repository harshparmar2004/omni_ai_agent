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
          <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.25rem 0;">Command Center</h2>
          <p style="color: var(--text-secondary); margin: 0; font-size: 0.88rem;">Autonomous multi-agent Instagram publishing & surveillance status</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="commandCenterView.refresh()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Agent Status Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <!-- Agent 1: Reposter Card -->
        <div class="card" style="border-left: 4px solid #10B981; position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.6rem;">📲</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem;">Agent 1: Reposter</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Direct Telegram & Dashboard Ingestion</div>
              </div>
            </div>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
              ● ONLINE
            </span>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
            Listens on Telegram bot (<code style="color: #60a5fa;">/pages</code>, direct reel links) and Web Dashboard. Downloads 1080p, generates attribution, publishes live via Meta Graph API v21.0.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-deep); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Published Today</div>
              <div id="cc-reposter-today" style="font-size: 1.25rem; font-weight: 800; color: #10B981;">--</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Active Pipeline</div>
              <div id="cc-reposter-active" style="font-size: 1.25rem; font-weight: 800; color: #3B82F6;">--</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm w-full" onclick="app.openRepostModal()">
              🚀 Repost New Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('reposter')">
              View Agent ➔
            </button>
          </div>
        </div>

        <!-- Agent 2: Watchtower Card -->
        <div class="card" style="border-left: 4px solid #3B82F6; position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span style="font-size: 1.6rem;">🛰️</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem;">Agent 2: Watchtower</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">24/7 Source Surveillance & Discovery</div>
              </div>
            </div>
            <span id="cc-watchtower-badge" class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
              ● ACTIVE
            </span>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
            Monitors competitor & viral creator feeds every 3 hours with human jitter. Ranks reels by engagement, queues high-performers for auto-publish or review.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-deep); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Monitored Sources</div>
              <div id="cc-watchtower-sources" style="font-size: 1.25rem; font-weight: 800; color: #3B82F6;">--</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Next Cycle In</div>
              <div id="cc-watchtower-next" style="font-size: 1.1rem; font-weight: 800; color: #F59E0B;">--</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm w-full" id="cc-btn-run-watchtower" onclick="commandCenterView.runWatchtower()">
              ⚡ Run Surveillance Now
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('watchtower')">
              Manage Sources ➔
            </button>
          </div>
        </div>
      </div>

      <!-- System Health Diagnostics Bar -->
      <div class="card mb-4" style="background: var(--bg-card); padding: 1rem 1.25rem;">
        <div class="flex items-center justify-between mb-3">
          <div style="font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            System Diagnostics & Integration Health
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="cc-health-timestamp">Last checked: Just now</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
          <div style="background: var(--bg-deep); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Database</span>
            <span id="cc-health-db" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">OK</span>
          </div>
          <div style="background: var(--bg-deep); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Meta Graph API</span>
            <span id="cc-health-meta" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">v21.0 Active</span>
          </div>
          <div style="background: var(--bg-deep); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Cloudflare Tunnel</span>
            <span id="cc-health-tunnel" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">--</span>
          </div>
          <div style="background: var(--bg-deep); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Telegram Bot</span>
            <span id="cc-health-tg" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">Listening</span>
          </div>
        </div>
      </div>

      <!-- Main Split: Recent Jobs & Live SSE Activity Feed -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1rem; align-items: start;">
        <!-- Recent Jobs -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">Recent Content Pipeline Jobs</h3>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('queue')">All Jobs ➔</button>
          </div>
          <div id="cc-recent-jobs" style="overflow-x: auto;">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Loading jobs...</div>
          </div>
        </div>

        <!-- Live Activity Stream (SSE) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <span class="pulse-dot"></span>
              Live Agent Stream
            </h3>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.clearLogs()">Clear</button>
          </div>
          <div id="cc-activity-stream" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 420px; overflow-y: auto; padding-right: 4px;">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Listening for real-time agent events...</div>
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
            tunnelBadge.style.color = '#10B981';
            tunnelBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          } else {
            tunnelBadge.textContent = health.tunnel?.hasPublicUrl ? 'Local/Host' : 'Offline';
            tunnelBadge.style.color = '#F59E0B';
            tunnelBadge.style.background = 'rgba(245, 158, 11, 0.15)';
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
          if (wt.paused) {
            wtNext.textContent = 'Paused';
            wtNext.style.color = '#EF4444';
          } else if (wt.isScanning) {
            wtNext.textContent = 'Scanning Now';
            wtNext.style.color = '#3B82F6';
          } else {
            const minutesLeft = Math.max(0, Math.round(wt.nextRunInMs / 60000));
            wtNext.textContent = minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`;
          }
        }
        if (wtBadge) {
          if (wt.paused) {
            wtBadge.textContent = '● PAUSED';
            wtBadge.style.color = '#EF4444';
            wtBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          } else if (wt.isScanning) {
            wtBadge.textContent = '● SCANNING';
            wtBadge.style.color = '#3B82F6';
            wtBadge.style.background = 'rgba(59, 130, 246, 0.15)';
          } else {
            wtBadge.textContent = '● ACTIVE';
            wtBadge.style.color = '#10B981';
            wtBadge.style.background = 'rgba(16, 185, 129, 0.15)';
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
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">No pipeline jobs yet. Click "Repost New Reel" to start!</div>`;
      return;
    }

    const rows = jobs.map(j => {
      const statusBadge = getStatusBadge(j.status);
      const shortcode = j.shortcode || 'Link';
      const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
      const timeAgo = formatTimeAgo(j.created_at);

      return `
        <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
          <td style="padding: 0.65rem 0.5rem; font-weight: 700; color: var(--accent-primary);">#${j.id}</td>
          <td style="padding: 0.65rem 0.5rem;">
            <div style="font-weight: 600;">${pageSlug}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${j.agent === 'watchtower' ? '🛰️ Watchtower' : '📲 Reposter'}</div>
          </td>
          <td style="padding: 0.65rem 0.5rem;">
            <a href="${j.source_url}" target="_blank" style="color: #60a5fa; text-decoration: none;" title="${j.source_url}">
              ${shortcode}
            </a>
          </td>
          <td style="padding: 0.65rem 0.5rem;">${statusBadge}</td>
          <td style="padding: 0.65rem 0.5rem; color: var(--text-muted);">${timeAgo}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">
            <th style="padding: 0.5rem;">ID</th>
            <th style="padding: 0.5rem;">Page</th>
            <th style="padding: 0.5rem;">Content</th>
            <th style="padding: 0.5rem;">Status</th>
            <th style="padding: 0.5rem;">Age</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'published':
        return `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700; padding: 2px 7px;">Published</span>`;
      case 'failed':
        return `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 700; padding: 2px 7px;">Failed</span>`;
      case 'pending_review':
        return `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-weight: 700; padding: 2px 7px;">Needs Review</span>`;
      case 'downloading':
      case 'processing':
      case 'uploading':
      case 'publishing':
        return `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6; font-weight: 700; padding: 2px 7px;">⚙️ ${status}</span>`;
      default:
        return `<span class="badge" style="background: var(--bg-hover); color: var(--text-secondary); padding: 2px 7px;">${status}</span>`;
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

    activityLogs.unshift({ time, text, event });
    if (activityLogs.length > 30) activityLogs.pop();

    if (!stream) return;

    const rows = activityLogs.map(item => `
      <div style="background: var(--bg-deep); border-left: 3px solid #3B82F6; padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.2rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
          <span style="font-weight: 700; color: #60a5fa;">${item.event.type || 'SYSTEM'}</span>
          <span>${item.time}</span>
        </div>
        <div style="color: var(--text-primary); word-break: break-word;">${item.text}</div>
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
      if (stream) stream.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Logs cleared. Listening for new events...</div>`;
    },
    runWatchtower
  };
})();
