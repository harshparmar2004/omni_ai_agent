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
            <div>
              <div style="font-weight: 800; font-size: 1.05rem;">Agent 1: Reposter</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Direct Telegram & Dashboard Ingestion</div>
            </div>
            <span class="status-text status-text-success">Online</span>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
            Listens on Telegram bot (<code>@omnistudio_bot</code>) and Web Dashboard. Downloads 1080p, generates attribution, publishes live via Meta Graph API v21.0.
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
              Repost New Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('reposter')">
              View Agent ➔
            </button>
          </div>
        </div>

        <!-- Agent 2: Watchtower Card -->
        <div class="card card-agent-watchtower" style="position: relative;">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div style="font-weight: 800; font-size: 1.05rem;">Agent 2: Watchtower</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">24/7 Source Surveillance & Discovery</div>
            </div>
            <span id="cc-watchtower-badge" class="status-text status-text-info">Active</span>
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
              <div id="cc-watchtower-next" style="font-size: 1.15rem; font-weight: 800; color: var(--accent-primary); line-height: 1.4;">--</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-blue btn-sm w-full" id="cc-btn-run-watchtower" onclick="commandCenterView.runWatchtower()">
              Run Surveillance Now
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
            <span id="cc-health-db" class="status-text status-text-success">SQLite OK</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Meta Graph API</span>
            <span id="cc-health-meta" class="status-text status-text-success">v21.0 Active</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Cloudflare Tunnel</span>
            <span id="cc-health-tunnel" class="status-text status-text-success">Active</span>
          </div>
          <div style="background: var(--bg-input); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Telegram Bot</span>
            <span id="cc-health-tg" class="status-text status-text-success">Listening</span>
          </div>
        </div>
      </div>

      <!-- Multi-Channel Publishing & Quota Overview (Common Center Hub) -->
      <div class="card mb-4" style="background: var(--bg-card); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card);">
        <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div class="flex items-center gap-2">
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                Multi-Channel Publishing Overview & Quota Matrix
              </h3>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.15rem 0 0 0;">
              Centralized performance tracker across all connected Instagram pages and publishing agents
            </p>
          </div>
          <div id="cc-origin-breakdown" class="flex items-center gap-2" style="flex-wrap: wrap;">
            <!-- Origin Pills: Telegram, Watchtower, Web -->
          </div>
        </div>

        <div id="cc-page-quota-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Loading channel quotas...</div>
        </div>
      </div>

      <!-- Main Split: Multi-Source Recent Dispatches & Live SSE Activity Feed -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1.25rem; align-items: start;">
        <!-- Multi-Source Recent Dispatches -->
        <div class="card" style="background: var(--bg-card); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-card);">
          <div class="flex items-center justify-between mb-3" style="flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Multi-Source Recent Dispatches</h3>
              <p style="font-size: 0.72rem; color: var(--text-muted); margin: 2px 0 0 0;">All-channel stream across Telegram, Watchtower & Web</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('queue')">All Jobs ➔</button>
          </div>
          <div id="cc-recent-jobs" class="table-container" style="padding: 0; overflow-x: auto;">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading dispatches...</div>
          </div>
        </div>

        <!-- Live Activity Stream (SSE) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">
              Live Agent Activity Stream
            </h3>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.clearLogs()">Clear</button>
          </div>
          <div id="cc-activity-stream" style="display: flex; flex-direction: column; gap: 0.45rem; max-height: 440px; overflow-y: auto; padding-right: 2px;">
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
            tunnelBadge.className = 'status-text status-text-success';
          } else {
            tunnelBadge.textContent = health.tunnel?.hasPublicUrl ? 'Local/Host' : 'Offline';
            tunnelBadge.className = 'status-text status-text-warning';
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
            let minutesLeft = 0;
            if (wt.nextRunInMs !== undefined && !isNaN(wt.nextRunInMs)) {
              minutesLeft = Math.max(0, Math.round(wt.nextRunInMs / 60000));
            } else if (wt.nextRunAt) {
              const diffMs = Math.max(0, new Date(wt.nextRunAt).getTime() - Date.now());
              minutesLeft = Math.round(diffMs / 60000);
            } else {
              minutesLeft = (wt.intervalHours || 3) * 60;
            }
            wtNext.textContent = minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`;
          }
        }
        if (wtBadge) {
          if (wt.paused || wt.isPaused) {
            wtBadge.textContent = 'Paused';
            wtBadge.className = 'status-text status-text-danger';
          } else if (wt.isScanning) {
            wtBadge.textContent = 'Scanning';
            wtBadge.className = 'status-text status-text-info';
          } else {
            wtBadge.textContent = 'Active';
            wtBadge.className = 'status-text status-text-info';
          }
        }
      }

      // 3. Fetch global publishing overview (Common Center stats)
      try {
        const overviewRes = await fetch('/api/jobs/overview');
        if (overviewRes.ok) {
          const stats = await overviewRes.json();
          renderPublishingOverview(stats);
        }
      } catch (e) {
        console.warn('[Overview fetch warning]:', e);
      }

      // 4. Fetch recent multi-source jobs
      const jobsRes = await fetch('/api/jobs?limit=12');
      if (jobsRes.ok) {
        const jobs = await jobsRes.json();
        renderRecentJobs(jobs);
      }
    } catch (err) {
      console.warn('[CommandCenter loadData failed]:', err);
    }
  }

  function renderPublishingOverview(stats) {
    if (!stats) return;

    // 1. Origin Breakdown
    const originContainer = document.getElementById('cc-origin-breakdown');
    if (originContainer && stats.origins) {
      originContainer.innerHTML = `
        <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          <span>Telegram: <b style="color: var(--text-primary); font-family: var(--font-mono);">${stats.origins.telegram || 0}</b></span>
          <span style="color: var(--border-subtle);">·</span>
          <span>Watchtower: <b style="color: var(--text-primary); font-family: var(--font-mono);">${stats.origins.watchtower || 0}</b></span>
          <span style="color: var(--border-subtle);">·</span>
          <span>Web Direct: <b style="color: var(--text-primary); font-family: var(--font-mono);">${stats.origins.web || 0}</b></span>
        </div>
      `;
    }

    // 2. Channel Quota Grid
    const quotaContainer = document.getElementById('cc-page-quota-grid');
    if (quotaContainer && stats.pages) {
      if (stats.pages.length === 0) {
        quotaContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">No connected channels found.</div>`;
        return;
      }

      quotaContainer.innerHTML = stats.pages.map(p => {
        const isQuotaMet = p.today_published_count >= p.daily_quota;
        const fillClass = isQuotaMet ? 'quota-fill completed' : 'quota-fill';
        const lastStr = p.last_published_at ? formatTimeAgo(p.last_published_at) : 'No posts yet';

        return `
          <div class="page-quota-card">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${escapeHtml(p.name)}</div>
                <div style="font-size: 0.72rem; color: var(--accent-primary); font-family: var(--font-mono);">${p.handle}</div>
              </div>
              <span class="status-text ${isQuotaMet ? 'status-text-success' : 'status-text-muted'}" style="font-size: 0.72rem;">
                ${isQuotaMet ? 'Quota Met' : 'Active Quota'}
              </span>
            </div>

            <!-- Quota Progress Bar -->
            <div class="quota-track">
              <div class="${fillClass}" style="width: ${p.quota_percent}%;"></div>
            </div>

            <div class="flex items-center justify-between text-xs" style="margin-top: 6px; font-size: 0.72rem;">
              <span style="color: var(--text-secondary);">
                <b>${p.today_published_count}</b> of <b>${p.daily_quota}</b> reels today (${p.quota_percent}%)
              </span>
              <span style="color: var(--text-muted); font-family: var(--font-mono);">
                ${p.all_time_published} all-time
              </span>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); margin-top: 0.65rem; padding-top: 0.5rem; font-size: 0.68rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Last Published:</span>
              <span style="font-family: var(--font-mono); color: var(--text-secondary);">${lastStr}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Update top card numbers
    const repToday = document.getElementById('cc-reposter-today');
    const repActive = document.getElementById('cc-reposter-active');
    if (repToday) repToday.textContent = stats.published_today || '0';
    if (repActive) repActive.textContent = stats.active_in_flight || '0';
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
      const timeAgo = formatTimeAgo(j.published_at || j.created_at);
      const isTelegram = Boolean(j.telegram_chat_id);
      const isWatchtower = j.agent === 'watchtower';
      const isReel = (j.media_type === 'reel' || !j.media_type);

      const originText = isTelegram ? 'Telegram' : (isWatchtower ? 'Watchtower' : 'Web Direct');

      return `
        <tr>
          <!-- Preview Thumbnail -->
          <td style="text-align: center; vertical-align: middle; padding: 0.45rem 0.5rem; width: 50px;">
            <a href="${j.source_url}" target="_blank" class="reel-table-thumb-container" style="width: 42px; height: 56px;" title="Open reel #${j.id}">
              <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" />
              ${isReel ? '<div class="reel-thumb-play-icon" style="width: 12px; height: 12px; font-size: 6px;">▶</div>' : ''}
            </a>
          </td>

          <!-- ID & Origin -->
          <td>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">#${j.id}</span>
              <span style="margin: 0 4px; color: var(--border-subtle);">·</span>
              <span>${originText}</span>
            </div>
            <a href="${j.source_url}" target="_blank" style="font-family: var(--font-mono); font-size: 0.78rem; text-decoration: none; color: var(--accent-primary); font-weight: 600;" title="${j.source_url}">
              ${shortcode} ↗
            </a>
          </td>

          <!-- Target Page -->
          <td>
            <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-primary);">${pageSlug}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${j.page_name || 'Instagram Page'}</div>
          </td>

          <!-- Status -->
          <td>${statusBadge}</td>

          <!-- Age -->
          <td style="color: var(--text-muted); font-size: 0.72rem; font-family: var(--font-mono);">${timeAgo}</td>

          <!-- Live Feed Link -->
          <td style="text-align: right;">
            ${j.permalink ? `
              <a href="${j.permalink}" target="_blank" class="text-link" style="white-space: nowrap;">
                Live on Feed ↗
              </a>
            ` : `
              <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${j.current_step || j.status}</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Clip</th>
            <th style="width: 22%;">ID / Origin</th>
            <th style="width: 22%;">Target Channel</th>
            <th style="width: 15%;">Status</th>
            <th style="width: 15%;">Age</th>
            <th style="text-align: right; width: 16%;">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getStatusBadge(status) {
    if (window.app && window.app.renderStatusText) {
      return window.app.renderStatusText(status);
    }
    return `<span class="status-text status-text-muted">${escapeHtml(status)}</span>`;
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
      <div style="background: var(--bg-input); border-left: 3px solid var(--accent-primary); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.15rem; border: 1px solid var(--border-subtle); border-left-width: 3px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted);">
          <span style="font-weight: 700; color: var(--accent-primary);">${item.type}</span>
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
      btn.textContent = 'Triggering...';
    }
    try {
      const res = await fetch('/api/watchtower/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      app.toast('Watchtower surveillance cycle initiated!', 'success');
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      app.toast('Failed to trigger Watchtower: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Run Surveillance Now';
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
