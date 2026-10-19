/**
 * OmniStudio v7 — Main Application Orchestrator
 * Single Page Application Router, Server-Sent Events (SSE) Hub, and Modal Manager
 */
window.app = (function() {
  const state = {
    pages: [],
    currentTab: 'command-center',
    activeModalJobId: null,
    sseSource: null
  };

  const TAB_TITLES = {
    'command-center': 'Command Center',
    'reposter': 'Agent 1: Reposter',
    'watchtower': 'Agent 2: Watchtower & Pipeline Engine',
    'queue': 'Review & Staged Reels',
    'published': 'Published Feed',
    'pages': 'Channel Command Hub',
    'settings': 'System & Security'
  };

  /**
   * Initialize application on DOM ready
   */
  async function init() {
    console.log('[OmniStudio v7] Initializing application...');

    // 1. Fetch connected Instagram pages
    await loadPages();

    // 2. Set up SPA hash router
    window.addEventListener('hashchange', handleHashChange);
    const initialTab = window.location.hash.replace(/^#/, '') || 'command-center';
    navigate(initialTab);

    // 3. Connect real-time Server-Sent Events stream
    connectSse();

    // 4. Update badge counts
    updateBadgeCounts();

    // 5. Setup periodic background badge refreshes
    setInterval(updateBadgeCounts, 20000);
  }

  /**
   * Fetch connected Instagram pages
   */
  async function loadPages() {
    try {
      const res = await fetch('/api/pages');
      if (res.ok) {
        state.pages = await res.json();
      }
    } catch (err) {
      console.warn('[App loadPages error]:', err);
    }
  }

  /**
   * Handle hash changes for SPA routing
   */
  function handleHashChange() {
    const tabId = window.location.hash.replace(/^#/, '') || 'command-center';
    navigate(tabId, false);
  }

  /**
   * Navigate to a tab
   */
  function navigate(tabId, updateHash = true) {
    if (!TAB_TITLES[tabId]) tabId = 'command-center';
    state.currentTab = tabId;
    document.body.setAttribute('data-page', tabId);

    if (updateHash && window.location.hash !== `#${tabId}`) {
      window.location.hash = tabId;
    }

    // 1. Update document and header title
    const title = TAB_TITLES[tabId];
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = title;
    document.title = `${title} — OmniStudio v7`;

    // 2. Update sidebar navigation active classes
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      const itemTab = item.getAttribute('data-tab');
      if (itemTab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 3. Switch visible view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      if (panel.id === `view-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // 4. Trigger view controller render
    switch (tabId) {
      case 'command-center':
        window.commandCenterView?.render();
        break;
      case 'reposter':
        window.reposterView?.render();
        break;
      case 'watchtower':
        window.watchtowerView?.render();
        break;
      case 'queue':
        window.queueView?.render();
        break;
      case 'published':
        window.publishedView?.render();
        break;
      case 'pages':
        window.pagesView?.render();
        break;
      case 'settings':
        window.settingsView?.render();
        break;
    }
  }

  /**
   * Real-time Server-Sent Events (SSE) listener
   */
  function connectSse() {
    try {
      if (state.sseSource) {
        state.sseSource.close();
      }

      state.sseSource = new EventSource('/api/system/events');

      state.sseSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          handleSseEvent(data);
        } catch (e) {
          console.warn('[SSE Parse error]:', e);
        }
      };

      state.sseSource.onerror = function() {
        console.warn('[SSE Connection lost. Reconnecting in 5s...]');
        state.sseSource.close();
        setTimeout(connectSse, 5000);
      };
    } catch (err) {
      console.warn('[SSE Init error]:', err);
    }
  }

  /**
   * Handle incoming real-time SSE event
   */
  function handleSseEvent(event) {
    // 1. Dispatch to Command Center log stream
    window.commandCenterView?.onEvent(event);

    // 2. Dispatch to Reposter tracker
    window.reposterView?.onEvent(event);

    // 3. If matching active Repost Modal job, update modal step progress
    if (state.activeModalJobId && event.jobId === state.activeModalJobId) {
      updateModalStepProgress(event);
    }

    // 4. Update badge counts on significant state changes
    if (['job_status', 'job_progress', 'published'].includes(event.type)) {
      updateBadgeCounts();
    }
  }

  /**
   * Update sidebar badge counters
   */
  async function updateBadgeCounts() {
    try {
      const [queueRes, pubRes] = await Promise.all([
        fetch('/api/jobs?status=pending_review,queued,downloading,processing,uploading,publishing'),
        fetch('/api/jobs?status=published&limit=1')
      ]);

      if (queueRes.ok) {
        const queueJobs = await queueRes.json();
        const badge = document.getElementById('nav-queue-badge');
        if (badge) badge.textContent = queueJobs.length;
      }

      // Read published count
      const allPubRes = await fetch('/api/jobs?status=published');
      if (allPubRes.ok) {
        const pubs = await allPubRes.json();
        const badge = document.getElementById('nav-published-badge');
        if (badge) badge.textContent = pubs.length;
      }
    } catch (err) {
      // Quiet background failure
    }
  }

  /**
   * Toast notification system
   */
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;

    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${message}</span>
      </div>
    `;

    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  /**
   * Repost Modal Controls
   */
  function openRepostModal() {
    const select = document.getElementById('rm-page-select');
    if (select) {
      select.innerHTML = state.pages.map(p => 
        `<option value="${p.id}">${p.name} (@${p.slug})</option>`
      ).join('') || '<option value="1">Primary Page (@gta6_updates_007)</option>';
    }

    const urlInput = document.getElementById('rm-url');
    if (urlInput) urlInput.value = '';

    const progressBox = document.getElementById('rm-progress-box');
    if (progressBox) progressBox.classList.add('hidden');

    state.activeModalJobId = null;
    document.getElementById('repost-modal')?.classList.remove('hidden');
  }

  function closeRepostModal() {
    document.getElementById('repost-modal')?.classList.add('hidden');
    state.activeModalJobId = null;
  }

  async function submitRepostModal() {
    const url = document.getElementById('rm-url')?.value?.trim();
    const pageId = document.getElementById('rm-page-select')?.value;
    const reviewCaption = Boolean(document.getElementById('rm-review-caption')?.checked);
    const submitBtn = document.getElementById('rm-submit-btn');

    if (!url) {
      toast('Please enter a valid Instagram Reel or post URL', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Enqueueing...';
    }

    const progressBox = document.getElementById('rm-progress-box');
    if (progressBox) progressBox.classList.remove('hidden');

    resetModalSteps();
    setModalStep(1, 'active', 'Step 1/3: Downloading 1080p MP4 from Instagram...');

    try {
      const res = await fetch('/api/reposter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pageId, reviewCaption })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit reel');

      state.activeModalJobId = data.job?.id || data.id;
      toast(data.message || 'Job queued for processing!', 'success');

      if (reviewCaption) {
        setModalStep(2, 'completed', 'Job sent to Review & Queue!');
        setTimeout(() => {
          closeRepostModal();
          navigate('queue');
        }, 1200);
      }
    } catch (err) {
      toast(err.message, 'error');
      if (progressBox) progressBox.classList.add('hidden');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Repost Live Now';
      }
    }
  }

  function resetModalSteps() {
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`rm-step-${i}`);
      if (el) el.className = 'step-bar-item';
    }
  }

  function setModalStep(num, status, text) {
    const statusEl = document.getElementById('rm-step-status');
    if (statusEl && text) statusEl.textContent = text;

    for (let i = 1; i < num; i++) {
      const prev = document.getElementById(`rm-step-${i}`);
      if (prev) prev.className = 'step-bar-item completed';
    }
    const current = document.getElementById(`rm-step-${num}`);
    if (current) current.className = `step-bar-item ${status}`;
  }

  function updateModalStepProgress(event) {
    if (event.status === 'downloading') {
      setModalStep(1, 'active', 'Step 1/3: Downloading 1080p MP4...');
    } else if (event.status === 'processing') {
      setModalStep(2, 'active', 'Step 2/3: Transcoding & building attribution caption...');
    } else if (event.status === 'uploading' || event.status === 'publishing') {
      setModalStep(3, 'active', 'Step 3/3: Publishing live to Meta Graph API v21.0...');
    } else if (event.status === 'published') {
      setModalStep(3, 'completed', 'Successfully published live to Instagram!');
      toast('Reel published live to Instagram!', 'success');
      setTimeout(() => {
        closeRepostModal();
        navigate('published');
      }, 2000);
    } else if (event.status === 'failed') {
      const s3 = document.getElementById('rm-step-3');
      if (s3) s3.className = 'step-bar-item failed';
      const statusEl = document.getElementById('rm-step-status');
      if (statusEl) statusEl.textContent = 'Failed: ' + (event.error || 'Pipeline error');
    }
  }

  /**
   * 9:16 Video Preview Modal Controls
   */
  function openVideoModal(videoSrc) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    if (!modal || !player) return;

    player.src = videoSrc;
    modal.classList.remove('hidden');
    player.play().catch(() => {});
  }

  function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    if (player) {
      player.pause();
      player.src = '';
    }
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Global Minimalist Tag & Status Helpers
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTag(text, options = {}) {
    if (!text) return '';
    const statusClass = options.status ? `status-${options.status}` : '';
    const upperClass = options.uppercase ? 'text-uppercase' : '';
    return `<span class="ui-tag ${statusClass} ${upperClass}">${escapeHtml(text)}</span>`;
  }

  function renderStatusText(status, timeStr) {
    const s = String(status || '').toLowerCase();
    let colorClass = 'status-text-muted';
    let label = status || 'Unknown';

    if (s === 'published' || s === 'live') {
      colorClass = 'status-text-success';
      label = 'Live Published';
    } else if (s === 'failed' || s === 'error') {
      colorClass = 'status-text-danger';
      label = 'Failed';
    } else if (s === 'pending_review' || s === 'staged' || s === 'needs_review') {
      colorClass = 'status-text-warning';
      label = 'Staged Review';
    } else if (s === 'downloading' || s === 'processing' || s === 'uploading' || s === 'publishing' || s === 'active') {
      colorClass = 'status-text-info';
      label = s.charAt(0).toUpperCase() + s.slice(1);
    }

    const timeHtml = timeStr ? `<span class="status-time">${escapeHtml(timeStr)}</span>` : '';
    return `<span class="status-text ${colorClass}">${escapeHtml(label)}</span>${timeHtml}`;
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    get pages() { return state.pages; },
    set pages(p) { state.pages = p; },
    navigate,
    toast,
    openRepostModal,
    closeRepostModal,
    submitRepostModal,
    openVideoModal,
    closeVideoModal,
    refreshBadgeCounts: updateBadgeCounts,
    escapeHtml,
    renderTag,
    renderStatusText
  };
})();

// Global helper safeguard
window.escapeHtml = window.app.escapeHtml;
