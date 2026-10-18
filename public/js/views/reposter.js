/**
 * OmniStudio v7 — Agent 1: Reposter View
 * On-demand reel ingestion via Telegram bot and Dashboard
 */
window.reposterView = (function() {
  let activeTrackingJobId = null;

  async function render() {
    const container = document.getElementById('view-reposter');
    if (!container) return;

    const pageOptions = (window.app?.pages || []).map(p => 
      `<option value="${p.id}">${p.name} (@${p.slug})</option>`
    ).join('');

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span style="font-size: 2rem;">📲</span>
          <div>
            <div class="flex items-center gap-2">
              <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0;">Agent 1: Reposter</h2>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">● READY</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0; font-size: 0.88rem;">
              Direct single-reel ingestion via Telegram Bot (<code style="color: #60a5fa;">@omnistudio_bot</code>) or Web Form
            </p>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="reposterView.refresh()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Refresh
        </button>
      </div>

      <!-- Ingestion Grid -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1.25rem; margin-bottom: 1.5rem;">
        <!-- Ingestion Form -->
        <div class="card">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem 0;">Publish Reel to Instagram</h3>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Instagram Reel or Post URL</label>
            <input type="text" id="rp-url" class="form-input" placeholder="https://www.instagram.com/reel/DE-EXAMPLE/ or /p/..." style="font-family: var(--font-mono); font-size: 0.88rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">
              Supports reels, video posts, and shortcode formats (e.g. <code>/reel/DF...</code>).
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Destination Page</label>
            <select id="rp-page-select" class="form-input">
              ${pageOptions || '<option value="1">Primary Page (@gta6_updates_007)</option>'}
            </select>
          </div>

          <div class="form-group mb-4" style="background: var(--bg-deep); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
              <input type="checkbox" id="rp-review-caption" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
              <span>Queue for Review before live posting</span>
            </label>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem; margin-left: 1.5rem;">
              If checked, job goes to "Review & Queue" to let you inspect and edit the caption first. If unchecked, it publishes automatically.
            </div>
          </div>

          <!-- Progress Tracker Box -->
          <div id="rp-progress-box" class="card hidden" style="background: var(--bg-deep); border-color: var(--border-color); margin-bottom: 1.25rem; padding: 1rem;">
            <div class="font-bold text-sm mb-2" id="rp-progress-title" style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="spinner-sm"></span> Pipeline Executing...
            </div>
            <div class="step-bar mb-3">
              <div id="rp-step-1" class="step-bar-item"></div>
              <div id="rp-step-2" class="step-bar-item"></div>
              <div id="rp-step-3" class="step-bar-item"></div>
            </div>
            <div id="rp-step-status" style="font-size: 0.82rem; color: var(--text-secondary);">Initializing job...</div>
          </div>

          <button id="rp-submit-btn" class="btn btn-primary w-full" onclick="reposterView.submitJob()">
            🚀 Publish Reel Live to Instagram
          </button>
        </div>

        <!-- Instructions & Telegram Link Card -->
        <div class="card" style="background: var(--bg-deep); border: 1px dashed var(--border-color);">
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size: 1.5rem;">✈️</span>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Telegram Integration</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary);">One-click mobile reposting</div>
            </div>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem;">
            You don't need to open this dashboard on mobile! Open Telegram, share any Instagram Reel link directly with your OmniStudio bot, and it automatically triggers Agent 1:
          </p>

          <ol style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 1.2rem; margin-bottom: 1rem; line-height: 1.6;">
            <li>Send Instagram Reel link to bot.</li>
            <li>Bot validates your Whitelisted Chat ID.</li>
            <li>Prompts destination page with inline buttons.</li>
            <li>Downloads 1080p, transcodes to Meta standard.</li>
            <li>Publishes live via Meta Graph API v21.0.</li>
            <li>Sends live Instagram link confirmation.</li>
          </ol>

          <div style="background: var(--bg-base); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.75rem;">
            <div style="color: var(--text-muted); margin-bottom: 0.25rem;">Allowed Telegram Chat IDs:</div>
            <code style="color: #60a5fa; font-weight: 700;" id="rp-telegram-allowed">5443723531</code>
          </div>
        </div>
      </div>

      <!-- Reposter Jobs Table -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">Agent 1 Publishing History</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Filtered to Reposter on-demand jobs</span>
        </div>
        <div id="rp-jobs-table">
          <div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">Loading jobs...</div>
        </div>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    try {
      const res = await fetch('/api/jobs?agent=reposter&limit=25');
      if (res.ok) {
        const jobs = await res.json();
        renderJobs(jobs);
      }
    } catch (err) {
      console.warn('[Reposter loadData failed]:', err);
    }
  }

  function renderJobs(jobs) {
    const container = document.getElementById('rp-jobs-table');
    if (!container) return;

    if (!jobs || jobs.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem; text-align: center;">No reposter jobs yet. Paste an Instagram Reel URL above!</div>`;
      return;
    }

    const rows = jobs.map(j => {
      const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
      const statusBadge = getStatusBadge(j.status);
      const isPublished = j.status === 'published';
      const isFailed = j.status === 'failed';
      const hasMedia = Boolean(j.local_media_path);

      let actionBtns = '';
      if (isPublished && j.published_media_id) {
        const directUrl = j.published_permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
        actionBtns += `<a href="${directUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 7px;">View on IG ↗</a>`;
      }
      if (isFailed) {
        actionBtns += `<button class="btn btn-secondary btn-sm" onclick="reposterView.retryJob(${j.id})" style="font-size: 0.72rem; padding: 2px 7px;">🔄 Retry</button>`;
      }
      if (hasMedia) {
        const mediaWebPath = `/generated/videos/${j.local_media_path.split(/[/\\]/).pop()}`;
        actionBtns += ` <button class="btn btn-secondary btn-sm" onclick="app.openVideoModal('${mediaWebPath}')" style="font-size: 0.72rem; padding: 2px 7px;">▶ Preview</button>`;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
          <td style="padding: 0.65rem 0.5rem; font-weight: 700; color: var(--accent-primary);">#${j.id}</td>
          <td style="padding: 0.65rem 0.5rem; font-weight: 600;">${pageSlug}</td>
          <td style="padding: 0.65rem 0.5rem;">
            <a href="${j.source_url}" target="_blank" style="color: #60a5fa; text-decoration: none;">
              ${j.shortcode || 'Instagram Reel'}
            </a>
          </td>
          <td style="padding: 0.65rem 0.5rem;">${statusBadge}</td>
          <td style="padding: 0.65rem 0.5rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);">
            ${j.caption ? j.caption.substring(0, 45) + '...' : '—'}
          </td>
          <td style="padding: 0.65rem 0.5rem; color: var(--text-muted); font-size: 0.75rem;">
            ${formatTimeAgo(j.created_at)}
          </td>
          <td style="padding: 0.65rem 0.5rem; text-align: right;">
            ${actionBtns || '—'}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">
            <th style="padding: 0.5rem;">ID</th>
            <th style="padding: 0.5rem;">Destination</th>
            <th style="padding: 0.5rem;">Source</th>
            <th style="padding: 0.5rem;">Status</th>
            <th style="padding: 0.5rem;">Caption Preview</th>
            <th style="padding: 0.5rem;">Age</th>
            <th style="padding: 0.5rem; text-align: right;">Actions</th>
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
    if (!url) {
      app.toast('Please enter a valid Instagram Reel URL', 'error');
      return;
    }

    const pageId = pageSelect?.value ? parseInt(pageSelect.value, 10) : 1;
    const reviewCaption = Boolean(reviewCheckbox?.checked);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Submitting to Pipeline...';
    }

    showProgressBox('Submitting job...');

    try {
      const res = await fetch('/api/reposter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pageId, reviewCaption })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit job');
      }

      activeTrackingJobId = data.job?.id || data.id;
      app.toast(data.message || 'Job queued successfully!', 'success');

      updateProgressStep(1, 'active', 'Step 1: Downloading 1080p MP4 & Metadata...');
      urlInput.value = '';

      // Reload table
      loadData();
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
    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`rp-step-${i}`);
      if (step) {
        step.className = 'step-bar-item';
      }
    }
  }

  function updateProgressStep(stepNum, status, statusText) {
    const s1 = document.getElementById('rp-step-1');
    const s2 = document.getElementById('rp-step-2');
    const s3 = document.getElementById('rp-step-3');
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
    }
  }

  function onEvent(event) {
    if (event.jobId && event.jobId === activeTrackingJobId) {
      if (event.status === 'downloading') {
        updateProgressStep(1, 'active', 'Step 1/3: Downloading 1080p MP4 from Instagram...');
      } else if (event.status === 'processing') {
        updateProgressStep(2, 'active', 'Step 2/3: Transcoding video & formatting caption...');
      } else if (event.status === 'uploading' || event.status === 'publishing') {
        updateProgressStep(3, 'active', 'Step 3/3: Publishing live to Meta Graph API v21.0...');
      } else if (event.status === 'published') {
        updateProgressStep(3, 'completed', '✅ Successfully published live to Instagram!');
        app.toast('🎉 Reel published live to Instagram!', 'success');
        setTimeout(() => hideProgressBox(), 5000);
        loadData();
      } else if (event.status === 'failed') {
        const s3 = document.getElementById('rp-step-3');
        if (s3) s3.className = 'step-bar-item failed';
        const statusEl = document.getElementById('rp-step-status');
        if (statusEl) statusEl.textContent = '❌ Failed: ' + (event.error || 'Job failed');
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

  return {
    render,
    refresh: loadData,
    submitJob,
    retryJob,
    onEvent
  };
})();
