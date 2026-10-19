/**
 * OmniStudio v7 — Command Center View
 * Unified multi-agent operations cockpit & channel performance intelligence
 */
window.commandCenterView = (function() {
  let activityLogs = [];

  async function render() {
    const container = document.getElementById('view-command-center');
    if (!container) return;

    container.innerHTML = `
      <!-- 1. Header Deck & Live Pulse Strip -->
      <div class="cc-header-deck">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0; letter-spacing: -0.01em;">
              Command Center
            </h2>
            <span class="ui-tag status-success" style="font-size: 0.68rem; padding: 2px 7px;">
              System Live
            </span>
          </div>
          <p class="text-sm text-muted" style="margin: 0;">
            Centralized operations cockpit for Agent 1 (Reposter) & Agent 2 (Watchtower)
          </p>
        </div>

        <div class="flex items-center gap-2" style="flex-wrap: wrap;">
          <!-- Telemetry Pulse Strip -->
          <div class="cc-pulse-strip">
            <span class="cc-pulse-dot"></span>
            <span id="cc-health-meta">Meta v21.0 Active</span>
            <span style="color: var(--border-subtle);">·</span>
            <span id="cc-health-tg">Telegram Bot Listening</span>
            <span style="color: var(--border-subtle);">·</span>
            <span id="cc-health-db">SQLite OK</span>
            <span style="color: var(--border-subtle);">·</span>
            <span id="cc-health-tunnel">Tunnel Active</span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2">
            <button class="btn btn-primary btn-sm" onclick="app.openRepostModal()" style="font-size: 0.78rem;">
              + Repost Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.runWatchtower()" title="Trigger 3h Surveillance Cycle" style="font-size: 0.78rem;">
              ⚡ Run 3h Cycle
            </button>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.refresh()" title="Refresh Dashboard" style="font-size: 0.78rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Top 4 Compact Operational Metric KPI Cards -->
      <div class="cc-kpi-grid">
        <!-- KPI 1: Today's Publishing Velocity -->
        <div class="pub-kpi-card" style="border-top: 2px solid var(--accent-primary);">
          <div>
            <div class="pub-kpi-card-header">
              <span class="pub-kpi-label">Today's Velocity</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="pub-kpi-value" style="color: var(--accent-primary);">
              <span id="cc-kpi-published">0</span> <span style="font-size: 0.82rem; font-weight: 500; color: var(--text-muted);">/ <span id="cc-kpi-quota">12</span> Reels</span>
            </div>
            <div class="workspace-metric-progress-bar" style="margin: 0.35rem 0 0.3rem 0; height: 3.5px;">
              <div id="cc-kpi-fill" class="workspace-metric-progress-fill" style="width: 0%;"></div>
            </div>
          </div>
          <div class="pub-kpi-sub" id="cc-kpi-velocity-sub">
            Calculating quota status...
          </div>
        </div>

        <!-- KPI 2: Autonomous Intelligence & Discoveries -->
        <div class="pub-kpi-card" style="border-top: 2px solid #0284C7;">
          <div>
            <div class="pub-kpi-card-header">
              <span class="pub-kpi-label">Autonomous Discoveries</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>
            </div>
            <div class="pub-kpi-value" style="color: #0284C7;" id="cc-kpi-scraped">
              0
            </div>
          </div>
          <div class="pub-kpi-sub" id="cc-kpi-scraped-sub">
            Competitor surveillance candidate reels
          </div>
        </div>

        <!-- KPI 3: In-Flight Pipeline Jobs -->
        <div class="pub-kpi-card" style="border-top: 2px solid #16A34A;">
          <div>
            <div class="pub-kpi-card-header">
              <span class="pub-kpi-label">Active In-Flight</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="pub-kpi-value" style="color: #16A34A;" id="cc-kpi-active">
              0
            </div>
          </div>
          <div class="pub-kpi-sub">
            Jobs queued, downloading, or publishing
          </div>
        </div>

        <!-- KPI 4: Next Scheduled 3h Cycle -->
        <div class="pub-kpi-card" style="border-top: 2px solid #7C3AED;">
          <div>
            <div class="pub-kpi-card-header">
              <span class="pub-kpi-label">Next 3h Cycle</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="pub-kpi-value" style="color: #7C3AED;" id="cc-watchtower-next">
              --
            </div>
          </div>
          <div class="pub-kpi-sub">
            Surveillance across active competitor channels
          </div>
        </div>
      </div>

      <!-- 3. Agent Operations Cockpit (Balanced 2-Column Grid) -->
      <div class="cc-agent-cockpit-grid">
        <!-- Agent 1 Cockpit Card -->
        <div class="cc-cockpit-card" style="border-top: 2px solid var(--agent-reposter);">
          <div>
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="agent-tag-reposter">Agent 1</span>
                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Reposter Operations</span>
              </div>
              <span class="status-text-success" style="font-size: 0.72rem;">● Listening</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0; line-height: 1.4;">
              Zero-click Telegram mobile bot (<a href="https://t.me/omnistudio_bot" target="_blank" style="color: var(--accent-primary); text-decoration: none;">@omnistudio_bot</a>) & direct manual quick-post gateway.
            </p>

            <!-- Micro-stats Row -->
            <div class="cc-micro-stat-grid">
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Today</span>
                <span class="cc-micro-stat-val" id="cc-reposter-today" style="color: var(--agent-reposter);">0</span>
              </div>
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Telegram</span>
                <span class="cc-micro-stat-val" id="cc-origin-tg">0</span>
              </div>
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Web Direct</span>
                <span class="cc-micro-stat-val" id="cc-origin-web">0</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2" style="margin-top: 0.25rem;">
            <button class="btn btn-primary btn-sm w-full" onclick="app.openRepostModal()" style="font-size: 0.78rem;">
              + Repost Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('reposter')" style="font-size: 0.78rem; white-space: nowrap;">
              Open Reposter ➔
            </button>
          </div>
        </div>

        <!-- Agent 2 Cockpit Card -->
        <div class="cc-cockpit-card" style="border-top: 2px solid var(--agent-watchtower);">
          <div>
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="agent-tag-watchtower">Agent 2</span>
                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Watchtower Surveillance</span>
              </div>
              <span id="cc-watchtower-badge" class="status-text-info" style="font-size: 0.72rem;">● Active</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.5rem 0; line-height: 1.4;">
              Autonomous 24/7 competitor surveillance engine, viral engagement scoring & peak-traffic scheduler.
            </p>

            <!-- Micro-stats Row -->
            <div class="cc-micro-stat-grid">
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Sources</span>
                <span class="cc-micro-stat-val" id="cc-watchtower-sources" style="color: var(--agent-watchtower);">0</span>
              </div>
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Autonomous</span>
                <span class="cc-micro-stat-val" id="cc-origin-wt">0</span>
              </div>
              <div class="cc-micro-stat-item">
                <span class="cc-micro-stat-label">Traffic Mode</span>
                <span class="cc-micro-stat-val" style="font-size: 0.85rem; color: #16A34A; font-weight: 700;">Peak Sync</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2" style="margin-top: 0.25rem;">
            <button id="cc-btn-run-watchtower" class="btn btn-primary btn-sm w-full" onclick="commandCenterView.runWatchtower()" style="font-size: 0.78rem;">
              ⚡ Run Surveillance
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('watchtower')" style="font-size: 0.78rem; white-space: nowrap;">
              Open Watchtower ➔
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Multi-Channel Quota & Performance Ledger (Full-Width End-to-End Table) -->
      <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04); margin-bottom: 1.25rem; background: var(--bg-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.95rem 1.25rem; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">
              Connected Channels & Daily Quota Ledger
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
              Real-time quota velocity and publication audit across connected Instagram pages
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('pages')" style="font-size: 0.75rem;">
            Manage Channels ➔
          </button>
        </div>

        <div id="cc-page-quota-table">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading channel quota ledger...</div>
        </div>
      </div>

      <!-- 5. Main Split: Recent Dispatches & Live Activity Stream -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1.15rem; align-items: start;">
        <!-- Left: Multi-Source Recent Dispatches -->
        <div class="card table-container" style="padding: 0; overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04); background: var(--bg-card);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.15rem; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Recent Pipeline Dispatches</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Live stream across Telegram, Watchtower & Web Direct</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('published')" style="font-size: 0.75rem;">
              Full History ➔
            </button>
          </div>
          <div id="cc-recent-jobs" style="padding: 0;">
            <div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">Loading dispatches...</div>
          </div>
        </div>

        <!-- Right: Real-time Live Agent Activity Stream (SSE) -->
        <div class="card" style="border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04); padding: 1.15rem; background: var(--bg-card);">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">
                Real-Time Agent Telemetry
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">
                Live Server-Sent Events (SSE) stream
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="commandCenterView.clearLogs()" style="font-size: 0.72rem; padding: 2px 8px;">
              Clear
            </button>
          </div>
          <div id="cc-activity-stream" style="display: flex; flex-direction: column; gap: 0.45rem; max-height: 420px; overflow-y: auto; padding-right: 2px;">
            <div style="color: var(--text-muted); font-size: 0.78rem; padding: 2rem; text-align: center;">
              Listening for real-time agent events...
            </div>
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
            tunnelBadge.textContent = 'Tunnel: Active';
            tunnelBadge.style.color = '#16A34A';
          } else {
            tunnelBadge.textContent = health.tunnel?.hasPublicUrl ? 'Tunnel: Local' : 'Tunnel: Offline';
            tunnelBadge.style.color = 'var(--text-muted)';
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
            wtNext.textContent = minutesLeft > 60 ? `In ${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `In ${minutesLeft}m`;
          }
        }
        if (wtBadge) {
          if (wt.paused || wt.isPaused) {
            wtBadge.textContent = '● Paused';
            wtBadge.className = 'status-text-danger';
          } else if (wt.isScanning) {
            wtBadge.textContent = '● Scanning';
            wtBadge.className = 'status-text-info';
          } else {
            wtBadge.textContent = '● Active · 3h Cadence';
            wtBadge.className = 'status-text-info';
          }
        }
      }

      // 3. Fetch global publishing overview
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
      const jobsRes = await fetch('/api/jobs?limit=10');
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

    // Top KPI 1: Velocity
    const pubCount = stats.published_today || 0;
    const totalDailyQuota = (stats.pages || []).reduce((acc, p) => acc + (p.daily_quota || 12), 0) || 12;
    const velocityPct = Math.min(100, Math.round((pubCount / totalDailyQuota) * 100));

    const kpiPub = document.getElementById('cc-kpi-published');
    const kpiQuota = document.getElementById('cc-kpi-quota');
    const kpiFill = document.getElementById('cc-kpi-fill');
    const kpiSub = document.getElementById('cc-kpi-velocity-sub');

    if (kpiPub) kpiPub.textContent = pubCount;
    if (kpiQuota) kpiQuota.textContent = totalDailyQuota;
    if (kpiFill) kpiFill.style.width = `${velocityPct}%`;
    if (kpiSub) kpiSub.textContent = `${stats.published_all_time || 0} live reels all-time (${velocityPct}% daily quota reached)`;

    // Top KPI 2: Scraped / Discoveries
    const kpiScraped = document.getElementById('cc-kpi-scraped');
    if (kpiScraped) kpiScraped.textContent = (stats.total_scraped || 0).toLocaleString();

    // Top KPI 3: Active in-flight
    const kpiActive = document.getElementById('cc-kpi-active');
    if (kpiActive) kpiActive.textContent = stats.active_in_flight || 0;

    // Cockpit micro-stats
    const repToday = document.getElementById('cc-reposter-today');
    const origTg = document.getElementById('cc-origin-tg');
    const origWeb = document.getElementById('cc-origin-web');
    const origWt = document.getElementById('cc-origin-wt');

    if (repToday) repToday.textContent = stats.published_today || '0';
    if (origTg) origTg.textContent = stats.origins?.telegram || '0';
    if (origWeb) origWeb.textContent = stats.origins?.web || '0';
    if (origWt) origWt.textContent = stats.origins?.watchtower || '0';

    // Channel Quota Ledger Table
    const tableContainer = document.getElementById('cc-page-quota-table');
    if (tableContainer && stats.pages) {
      if (stats.pages.length === 0) {
        tableContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 2rem; text-align: center;">No connected channels found.</div>`;
        return;
      }

      const rows = stats.pages.map(p => {
        const isQuotaMet = p.today_published_count >= p.daily_quota;
        const lastStr = p.last_published_at ? formatTimeAgo(p.last_published_at) : 'No posts yet';
        const fillWidth = Math.min(100, p.quota_percent || 0);

        return `
          <tr>
            <!-- 1. Destination Channel -->
            <td style="vertical-align: middle;">
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-primary); margin-bottom: 2px;">
                ${escapeHtml(p.name)}
              </div>
              <div style="font-size: 0.72rem; color: var(--accent-primary); font-family: var(--font-mono);">
                <a href="https://instagram.com/${(p.handle || '').replace('@', '')}" target="_blank" style="color: inherit; text-decoration: none;">
                  ${p.handle || '@' + p.slug} ↗
                </a>
              </div>
            </td>

            <!-- 2. Daily Quota Progress -->
            <td style="vertical-align: middle; width: 30%;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span style="font-weight: 600; color: var(--text-primary);">
                  <b>${p.today_published_count}</b> / <b>${p.daily_quota}</b> Reels
                </span>
                <span style="color: ${isQuotaMet ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">
                  ${fillWidth}%
                </span>
              </div>
              <div class="workspace-metric-progress-bar" style="margin: 0; height: 4px;">
                <div class="workspace-metric-progress-fill" style="width: ${fillWidth}%; ${isQuotaMet ? 'background: #16A34A;' : ''}"></div>
              </div>
            </td>

            <!-- 3. All-Time Published -->
            <td style="vertical-align: middle; font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">
              ${(p.all_time_published || 0).toLocaleString()}
            </td>

            <!-- 4. Last Active Post -->
            <td style="vertical-align: middle; font-size: 0.75rem; color: var(--text-muted);">
              ${lastStr}
            </td>

            <!-- 5. Channel Status -->
            <td style="vertical-align: middle;">
              <span class="status-text ${p.is_active ? 'status-text-success' : 'status-text-muted'}" style="font-size: 0.72rem;">
                ${p.is_active ? 'Active' : 'Paused'}
              </span>
            </td>

            <!-- 6. Action Link -->
            <td style="vertical-align: middle; text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="app.navigate('pages')" style="font-size: 0.72rem; padding: 3px 8px;">
                Channel Hub ➔
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tableContainer.innerHTML = `
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 25%;">Destination Channel</th>
              <th style="width: 30%;">Today's Quota Velocity</th>
              <th style="width: 15%;">All-Time</th>
              <th style="width: 15%;">Last Published</th>
              <th style="width: 10%;">Status</th>
              <th style="width: 15%; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
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
      const timeAgo = formatTimeAgo(j.published_at || j.created_at);
      const isWatchtower = j.agent === 'watchtower';
      const isReel = (j.media_type === 'reel' || !j.media_type);
      const directUrl = j.permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : j.source_url);

      return `
        <tr>
          <!-- Preview Thumbnail -->
          <td style="text-align: center; vertical-align: middle; padding: 0.45rem 0.5rem; width: 50px;">
            <div class="reel-table-thumb-container" style="width: 42px; height: 56px; cursor: pointer;" onclick="window.open('${directUrl}', '_blank')" title="Open reel #${j.id}">
              <img src="/api/jobs/${j.id}/thumbnail" alt="${j.shortcode}" class="reel-table-thumb-img" loading="lazy" />
              ${isReel ? '<div class="reel-thumb-play-icon" style="width: 12px; height: 12px; font-size: 6px;">▶</div>' : ''}
            </div>
          </td>

          <!-- Reel & Origin -->
          <td style="vertical-align: middle;">
            <div style="margin-bottom: 2px;">
              <a href="${directUrl}" target="_blank" class="text-link" style="font-weight: 700; font-family: var(--font-mono); font-size: 0.8rem;">
                #${shortcode} ↗
              </a>
            </div>
            <div>
              ${isWatchtower ? `
                <span class="agent-tag-watchtower" style="font-size: 0.65rem; padding: 1px 5px;">Agent 2</span>
              ` : `
                <span class="agent-tag-reposter" style="font-size: 0.65rem; padding: 1px 5px;">Agent 1</span>
              `}
            </div>
          </td>

          <!-- Target Page -->
          <td style="vertical-align: middle;">
            <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-primary);">${pageSlug}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${j.page_name || 'Instagram Page'}</div>
          </td>

          <!-- Status -->
          <td style="vertical-align: middle;">${statusBadge}</td>

          <!-- Age -->
          <td style="vertical-align: middle; color: var(--text-muted); font-size: 0.72rem; font-family: var(--font-mono);">${timeAgo}</td>

          <!-- Action -->
          <td style="text-align: right; vertical-align: middle;">
            <a href="${directUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 3px 8px; white-space: nowrap;">
              View ↗
            </a>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Clip</th>
            <th style="width: 25%;">Reel / Agent</th>
            <th style="width: 25%;">Destination</th>
            <th style="width: 15%;">Status</th>
            <th style="width: 15%;">Age</th>
            <th style="text-align: right; width: 15%;">Link</th>
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
      <div style="background: var(--bg-input); border-left: 2px solid var(--accent-primary); padding: 0.4rem 0.6rem; border-radius: var(--radius-xs); font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; border: 1px solid var(--border-subtle); border-left-width: 2px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
          <span style="font-weight: 700; color: var(--accent-primary);">${item.type}</span>
          <span style="font-family: var(--font-mono);">${item.time}</span>
        </div>
        <div style="color: var(--text-primary); word-break: break-word; font-family: var(--font-mono); font-size: 0.72rem;">${item.text}</div>
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
        btn.textContent = '⚡ Run 3h Cycle';
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
