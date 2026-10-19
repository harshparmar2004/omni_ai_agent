/**
 * OmniStudio v7 — Agent 1: Reposter Page
 * Redesigned clean two-section layout: Telegram Ingestion + Quick Post, and Recent Dispatches.
 * Strictly adheres to Claude Cloud aesthetic, 8px scale, plain colored status text, zero emojis/badges.
 */
window.reposterView = (function() {
  let selectedPageId = null;
  let activeTrackingJobId = null;

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
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function parseCaptionComponents(caption = '') {
    if (!caption) {
      return {
        hook: 'No caption generated yet',
        credit: 'Creator credit included',
        cta: '',
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
      credit: creditLine || 'Creator credit included',
      cta: ctaLine,
      hashtags,
      raw: caption
    };
  }

  function renderPageOptions() {
    const pages = window.app?.pages || [];
    if (pages.length === 0) {
      return '<option value="1">GTA 6 Updates 007 · 0/3 today</option>';
    }
    return pages.map(p => {
      const isSelected = selectedPageId === p.id;
      const count = p.today_published_count !== undefined ? p.today_published_count : 0;
      const quota = p.daily_quota || 3;
      return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(p.name)} · ${count}/${quota} today</option>`;
    }).join('');
  }

  async function render() {
    const container = document.getElementById('view-reposter');
    if (!container) return;

    // Load pages if not ready
    if (!window.app?.pages || window.app.pages.length === 0) {
      try {
        const res = await fetch('/api/pages');
        if (res.ok) window.app.pages = await res.json();
      } catch (e) {
        console.warn('[Reposter render] Failed to fetch pages:', e);
      }
    }

    const pages = window.app?.pages || [];
    if (selectedPageId === null && pages.length > 0) {
      selectedPageId = pages[0].id;
    }

    const targetPage = pages.find(p => p.id === selectedPageId) || pages[0] || { name: 'GTA 6 Updates 007' };

    container.innerHTML = `
      <div class="reposter-page-wrapper">
        <!-- Section 1: Two cards side by side -->
        <section class="reposter-cards-grid">
          <!-- Left Card: Telegram Ingestion -->
          <div class="reposter-card">
            <div>
              <h3 class="reposter-card-title">Telegram Ingestion</h3>
              <p class="reposter-card-sub">Share a Reel link to your Telegram bot and Agent 1 posts it live.</p>
              <div class="reposter-status-ok" style="margin-top: 8px;">Bot online</div>

              <div class="reposter-kv-row">
                <div class="reposter-kv-col">
                  <span class="reposter-kv-label">Telegram bot:</span>
                  <span class="reposter-kv-val">
                    <a href="https://t.me/omnistudio_bot" target="_blank">@omnistudio_bot</a>
                  </span>
                </div>
                <div class="reposter-kv-col">
                  <span class="reposter-kv-label">Authorized chat ID:</span>
                  <span class="reposter-kv-val mono">5443723531</span>
                </div>
                <div>
                  <a href="https://t.me/omnistudio_bot" target="_blank" class="reposter-btn-secondary">Open in Telegram</a>
                </div>
              </div>

              <div class="reposter-how-it-works">
                <div class="reposter-section-label">How it works</div>
                <ol class="reposter-steps-list">
                  <li><span class="reposter-step-num">1.</span><span>Send any Reel link to the bot</span></li>
                  <li><span class="reposter-step-num">2.</span><span>Bot confirms sender</span></li>
                  <li><span class="reposter-step-num">3.</span><span>Select destination page</span></li>
                  <li><span class="reposter-step-num">4.</span><span>Auto-posts to Instagram feed</span></li>
                </ol>
              </div>
            </div>
          </div>

          <!-- Right Card: Quick Post -->
          <div class="reposter-card">
            <div>
              <h3 class="reposter-card-title">Quick Post</h3>
              <p class="reposter-card-sub">Paste a Reel link to post manually.</p>

              <div class="reposter-form">
                <div class="reposter-field">
                  <label class="reposter-label" for="rp-url">Reel URL</label>
                  <input type="text" id="rp-url" class="reposter-input" placeholder="https://www.instagram.com/reel/..." />
                </div>

                <div class="reposter-field">
                  <label class="reposter-label" for="rp-page-select">Destination page</label>
                  <select id="rp-page-select" class="reposter-input" onchange="reposterView.selectPage(Number(this.value))">
                    ${renderPageOptions()}
                  </select>
                </div>

                <div class="reposter-checkbox-group">
                  <label class="reposter-checkbox-label">
                    <input type="checkbox" id="rp-review-caption" />
                    <span>Review caption before publishing</span>
                  </label>
                  <span class="reposter-hint">Pauses for manual review before going live</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 24px;">
              <button id="rp-submit-btn" class="reposter-btn-primary" onclick="reposterView.submitJob()">
                Ingest & Dispatch Reel
              </button>
              <div id="rp-status-message" class="reposter-inline-status" style="display: none;"></div>
            </div>
          </div>
        </section>

        <!-- Section 2: Recent Dispatches -->
        <section class="reposter-dispatches-card">
          <div class="reposter-dispatches-header">
            <div>
              <h3 class="reposter-card-title">Recent Dispatches</h3>
              <p class="reposter-card-sub" id="rp-dispatches-sub">
                Reels received via your Telegram bot, targeting ${escapeHtml(targetPage.name || 'GTA 6 Updates 007')}.
              </p>
            </div>
            <button class="reposter-btn-secondary sm" onclick="reposterView.refresh()">
              Refresh
            </button>
          </div>

          <div id="rp-jobs-table-container">
            <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 32px 0;">
              Loading dispatches...
            </div>
          </div>
        </section>
      </div>
    `;

    await loadIngestedTableData();
  }

  async function loadIngestedTableData() {
    const container = document.getElementById('rp-jobs-table-container');
    if (!container) return;

    try {
      let query = '?telegramOnly=true&limit=30';
      if (selectedPageId) query += `&pageId=${selectedPageId}`;
      const res = await fetch(`/api/reposter/jobs${query}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      let jobs = await res.json();

      // Ensure Telegram-only filter guarantee
      jobs = (jobs || []).filter(j => Boolean(j.telegram_chat_id));

      if (jobs.length === 0) {
        container.innerHTML = `
          <div class="reposter-empty-state">
            <div>No dispatches yet. Send a Reel link to your bot.</div>
            <a href="https://t.me/omnistudio_bot" target="_blank" class="reposter-text-link">Open bot in Telegram &rarr;</a>
          </div>
        `;
        return;
      }

      const rows = jobs.map(j => {
        const pageSlug = j.page_handle || (j.page_slug ? `@${j.page_slug}` : '@gta6');
        const pageName = j.page_name || 'GTA 6 Updates 007';
        const parsed = parseCaptionComponents(j.caption);
        const timeStr = j.published_at ?
          `Published ${formatTimeAgo(j.published_at)}` :
          `Received ${formatTimeAgo(j.created_at)}`;
        const stepStr = `1080p MP4 · Step: ${escapeHtml(j.current_step || j.status || 'live')}`;

        // Status text (Plain colored text, no pill, no badge)
        let statusHtml = '';
        if (j.status === 'published') {
          statusHtml = '<div class="reposter-status-ok">Live</div>';
        } else if (j.status === 'failed') {
          statusHtml = '<div class="reposter-status-err">Failed</div>';
        } else if (j.status === 'pending_review' || j.status === 'ready') {
          statusHtml = '<div class="reposter-status-warn">Pending review</div>';
        } else {
          const capitalized = j.status ? j.status.charAt(0).toUpperCase() + j.status.slice(1) : 'Processing';
          statusHtml = `<div class="reposter-status-warn">${escapeHtml(capitalized)}...</div>`;
        }

        // Action link
        let actionHtml = '';
        if (j.permalink) {
          actionHtml = `<a href="${escapeHtml(j.permalink)}" target="_blank" class="reposter-text-link">View on feed &rarr;</a>`;
        } else if (j.status === 'pending_review' || j.status === 'ready') {
          actionHtml = `<button class="reposter-text-action" onclick="reposterView.approveJob(${j.id})">Publish now &rarr;</button>`;
        } else if (j.status === 'failed') {
          actionHtml = `<button class="reposter-text-action" onclick="reposterView.retryJob(${j.id})">Retry &rarr;</button>`;
        }

        const reelShortcode = j.shortcode ? `reel/${j.shortcode}` : `Reel #${j.id}`;

        return `
          <tr>
            <!-- Column 1: Reel -->
            <td style="width: 32%;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="reposter-thumb-wrap">
                  <img src="/api/jobs/${j.id}/thumbnail" alt="${escapeHtml(j.shortcode || 'reel')}" class="reposter-thumb-img" onerror="this.parentElement.style.display='none'" />
                </div>
                <div>
                  <a href="${escapeHtml(j.source_url)}" target="_blank" class="reposter-reel-link">
                    ${escapeHtml(reelShortcode)}
                  </a>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
                    Sent via Telegram · Chat ${escapeHtml(j.telegram_chat_id || '5443723531')}
                  </div>
                </div>
              </div>
            </td>

            <!-- Column 2: Destination -->
            <td style="width: 18%;">
              <div style="font-size: 14px; font-weight: 500; color: var(--text-primary);">${escapeHtml(pageSlug)}</div>
              <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${escapeHtml(pageName)}</div>
            </td>

            <!-- Column 3: Content -->
            <td style="width: 28%;">
              <div style="font-size: 14px; font-weight: 400; color: var(--text-primary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(parsed.hook)}">
                ${escapeHtml(parsed.hook)}
              </div>
              <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
                Creator credit included${parsed.hashtags.length > 0 ? ' · ' + escapeHtml(parsed.hashtags.slice(0, 3).join(' ')) : ''}
              </div>
            </td>

            <!-- Column 4: Status -->
            <td style="width: 22%;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                  ${statusHtml}
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${escapeHtml(timeStr)}</div>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${stepStr}</div>
                </div>
                ${actionHtml ? `<div style="text-align: right; white-space: nowrap;">${actionHtml}</div>` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div style="overflow-x: auto;">
          <table class="reposter-table">
            <thead>
              <tr>
                <th style="width: 32%;">Reel</th>
                <th style="width: 18%;">Destination</th>
                <th style="width: 28%;">Content</th>
                <th style="width: 22%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      console.warn('[loadIngestedTableData error]:', err);
      container.innerHTML = `<div class="reposter-status-err" style="text-align: center; padding: 24px;">Failed to load dispatches: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function selectPage(pageId) {
    selectedPageId = pageId ? Number(pageId) : null;

    // Update target subtitle dynamically
    const pages = window.app?.pages || [];
    const target = pages.find(p => p.id === selectedPageId) || pages[0] || { name: 'GTA 6 Updates 007' };
    const subEl = document.getElementById('rp-dispatches-sub');
    if (subEl) {
      subEl.textContent = `Reels received via your Telegram bot, targeting ${target.name || 'GTA 6 Updates 007'}.`;
    }

    // Keep dropdown in sync if needed
    const selectEl = document.getElementById('rp-page-select');
    if (selectEl && selectedPageId && selectEl.value !== String(selectedPageId)) {
      selectEl.value = String(selectedPageId);
    }

    await loadIngestedTableData();
  }

  async function submitJob() {
    const urlInput = document.getElementById('rp-url');
    const pageSelect = document.getElementById('rp-page-select');
    const reviewCheckbox = document.getElementById('rp-review-caption');
    const submitBtn = document.getElementById('rp-submit-btn');
    const statusMsg = document.getElementById('rp-status-message');

    const url = urlInput?.value?.trim();
    const pageId = pageSelect?.value;
    const reviewCaption = reviewCheckbox?.checked || false;

    if (!url) {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = '<span class="reposter-status-err">Please enter a valid Instagram URL</span>';
      }
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Ingesting...';
      }
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = '<span class="reposter-status-warn">Downloading reel media...</span>';
      }

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

      if (statusMsg) {
        statusMsg.innerHTML = '<span class="reposter-status-ok">Reel ingested and dispatched live.</span>';
      }
      if (urlInput) urlInput.value = '';

      await loadIngestedTableData();

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingest & Dispatch Reel';
        }
        if (statusMsg) {
          statusMsg.style.display = 'none';
        }
      }, 3500);
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingest & Dispatch Reel';
      }
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = `<span class="reposter-status-err">${escapeHtml(err.message)}</span>`;
      }
    }
  }

  function onEvent(event) {
    if (event.jobId && event.jobId === activeTrackingJobId) {
      const statusMsg = document.getElementById('rp-status-message');
      if (statusMsg && statusMsg.style.display !== 'none') {
        if (event.status === 'downloading') {
          statusMsg.innerHTML = '<span class="reposter-status-warn">Downloading 1080p MP4...</span>';
        } else if (event.status === 'publishing' || event.status === 'uploading') {
          statusMsg.innerHTML = '<span class="reposter-status-warn">Publishing to Instagram feed...</span>';
        } else if (event.status === 'published') {
          statusHtml = '<span class="reposter-status-ok">Live on feed!</span>';
          setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
        } else if (event.status === 'failed') {
          statusMsg.innerHTML = `<span class="reposter-status-err">Failed: ${escapeHtml(event.error || 'Error')}</span>`;
        }
      }
      loadIngestedTableData();
    }
  }

  async function approveJob(id) {
    try {
      const res = await fetch(`/api/jobs/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        activeTrackingJobId = id;
        await loadIngestedTableData();
      } else {
        alert(data.error || 'Failed to approve job');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function retryJob(id) {
    try {
      const res = await fetch(`/api/jobs/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        activeTrackingJobId = id;
        await loadIngestedTableData();
      } else {
        alert(data.error || 'Failed to retry job');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteJob(id) {
    if (!confirm(`Delete dispatch #${id}?`)) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadIngestedTableData();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  return {
    render,
    selectPage,
    submitJob,
    approveJob,
    retryJob,
    deleteJob,
    onEvent,
    refresh: async () => {
      await loadIngestedTableData();
    }
  };
})();
