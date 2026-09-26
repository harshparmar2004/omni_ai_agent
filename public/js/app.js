/**
 * OmniResearch AI — Main Application Router & State Manager
 */

window.escapeHtml = window.escapeHtml || function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const app = {
  currentTab: 'overview',
  stats: null,
  bridgeOnline: false,
  mediaCache: {},

  init() {
    console.log('[OmniResearch App] Initializing SPA router...');
    this.setupRouting();
    this.checkBridgeStatus();
    setInterval(() => this.checkBridgeStatus(), 15000);
  },

  setupRouting() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());

    // Extract current hash or default to 'overview'
    const rawHash = window.location.hash.replace('#', '').trim();
    const hash = rawHash || 'overview';
    if (!window.location.hash) {
      history.replaceState(null, '', '#overview');
    }

    // Force initial render immediately!
    this.handleRoute();
  },

  navigate(tabName) {
    if (window.location.hash !== `#${tabName}`) {
      window.location.hash = tabName;
    } else {
      this.handleRoute();
    }
  },

  handleRoute() {
    let rawHash = window.location.hash.replace('#', '').trim();
    if (rawHash === 'instagram_bot') rawHash = 'instagram-bot';
    if (rawHash === 'instagram_bot_v2' || rawHash === 'instagram-bot-v2') rawHash = 'instagram-bot-v2';
    const baseTab = rawHash.split('?')[0].split('&')[0];
    const validTabs = ['overview', 'instagram-bot', 'instagram-bot-v2', 'instagram', 'published', 'instaauto', 'settings'];
    
    // Redirect legacy routes to overview
    if (['research', 'nanobanana', 'history', 'media', 'matrix'].includes(baseTab)) {
      window.location.hash = 'overview';
      return;
    }

    const activeTab = validTabs.includes(baseTab) ? baseTab : 'overview';
    this.currentTab = activeTab;

    console.log(`[OmniStudio App] Switching to tab: #${activeTab}`);

    // Update active class on nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === activeTab);
    });

    // Update page title
    const titles = {
      overview: 'Dashboard Overview',
      'instagram-bot': '📱 Inbound Share-to-DM Bot',
      'instagram-bot-v2': '🤖 Share-to-DM Bot v2 (Autonomous Page Sentinel)',
      instagram: '🎬 Ready to Post with Extraction',
      published: '📜 Published Post History',
      instaauto: '⚡ InstaAuto DM Automation Engine — Core USP',
      settings: 'AI Engine, Niche & Integration Settings'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = titles[activeTab] || 'Dashboard Overview';

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

    // Determine target panel
    const panelId = activeTab === 'published' ? 'view-instagram' : `view-${activeTab}`;
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.remove('hidden');
      try {
        if (activeTab === 'overview' && window.overviewView) {
          window.overviewView.render();
        } else if (activeTab === 'instagram-bot' && window.instagramBotView) {
          window.instagramBotView.render();
        } else if (activeTab === 'instagram-bot-v2' && window.instagramBotV2View) {
          window.instagramBotV2View.render();
        } else if (activeTab === 'instagram' && window.instagramView) {
          window.instagramView.overviewSection = 'queue';
          window.instagramView.render();
        } else if (activeTab === 'published' && window.instagramView) {
          window.instagramView.overviewSection = 'history';
          window.instagramView.render();
        } else if (activeTab === 'instaauto' && window.instaAutoView) {
          window.instaAutoView.render();
        } else if (activeTab === 'settings' && window.settingsView) {
          window.settingsView.render();
        }
      } catch (err) {
        console.error(`[OmniStudio View Error] Failed rendering view ${activeTab}:`, err);
      }
    }

    this.updateBadges();
  },

  async updateBadges() {
    try {
      const qRes = await fetch('/api/instagram/queue');
      const qData = await qRes.json();
      const qBadge = document.getElementById('nav-queue-badge');
      if (qBadge && qData.success) {
        qBadge.innerText = qData.count || (qData.posts ? qData.posts.length : 0);
      }
    } catch (e) {}

    try {
      const hRes = await fetch('/api/instagram/history');
      const hData = await hRes.json();
      const hBadge = document.getElementById('nav-history-badge');
      if (hBadge && hData.success) {
        hBadge.innerText = hData.count || (hData.posts ? hData.posts.length : 0);
      }
    } catch (e) {}

    try {
      const bRes = await fetch('/api/instagram/mobile-dm/triggers');
      const bData = await bRes.json();
      const botBadge = document.getElementById('nav-bot-badge');
      if (botBadge && bData.success) {
        botBadge.innerText = bData.triggers?.length ? `${bData.triggers.length} SHARE` : 'ACTIVE';
      }
    } catch (e) {}

    try {
      const aRes = await fetch('/api/instagram/instaauto/sync-matrix');
      const aData = await aRes.json();
      const aBadge = document.getElementById('nav-instaauto-badge');
      if (aBadge && aData.success) {
        aBadge.innerText = `${aData.armed_count}/${aData.count} SYNC`;
      }
    } catch (e) {}
  },

  async checkBridgeStatus() {
    try {
      const res = await fetch('/api/overview/stats');
      const data = await res.json();
      if (data.success) {
        this.stats = data.stats;
        this.bridgeOnline = data.bridge_connection?.is_online;
        const ind = document.getElementById('bridge-indicator');
        const txt = document.getElementById('bridge-text');
        if (ind && txt) {
          if (this.bridgeOnline) {
            ind.style.borderColor = 'rgba(46, 125, 50, 0.3)';
            ind.style.background = '#E8F5E9';
            txt.innerText = 'InstaAuto Bridge Online (Port 3000)';
            txt.style.color = 'var(--success)';
          } else {
            ind.style.borderColor = 'rgba(217, 119, 87, 0.3)';
            ind.style.background = '#FAF0EC';
            txt.innerText = 'InstaAuto Bridge Offline';
            txt.style.color = 'var(--accent-primary)';
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch stats:', e);
    }
  },

  cacheMedia(rows) {
    if (!Array.isArray(rows)) return;
    for (const r of rows) {
      if (r && r.id) {
        this.mediaCache[r.id] = r;
      }
    }
  },

  openVideoModalById(rowId) {
    const row = this.mediaCache[rowId];
    if (row && row.video_url) {
      this.openVideoModal(row.video_url, row.lead_magnet_title || row.topic, row.trigger_keyword, row.caption);
    } else {
      console.warn('Video not found for row ID:', rowId);
    }
  },

  openVideoModal(videoUrl, title, keyword, caption) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    const titleEl = document.getElementById('modal-reel-title');
    const keywordEl = document.getElementById('modal-reel-keyword');
    const captionEl = document.getElementById('modal-reel-caption');

    if (modal && player) {
      player.src = videoUrl;
      if (titleEl) titleEl.innerText = title || 'Reel Preview';
      if (keywordEl) keywordEl.innerText = keyword || 'DRAG';
      if (captionEl) captionEl.innerText = caption ? caption.slice(0, 110) + '...' : 'Comment to get the companion doc!';
      modal.classList.remove('hidden');
      player.play().catch(() => {});
    }
  },

  closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    if (player) player.pause();
    if (modal) modal.classList.add('hidden');
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  openQuickShareModal() {
    const modal = document.getElementById('quick-share-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const input = document.getElementById('qs-url');
      if (input) {
        input.value = '';
        input.focus();
      }
      const pBox = document.getElementById('qs-progress-box');
      if (pBox) pBox.classList.add('hidden');
      const runBtn = document.getElementById('qs-run-btn');
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = 'Ingest & Process Now';
      }
    }
  },

  closeQuickShareModal() {
    const modal = document.getElementById('quick-share-modal');
    if (modal) modal.classList.add('hidden');
  },

  async runQuickIngest() {
    const urlInput = document.getElementById('qs-url');
    const autoPublishInput = document.getElementById('qs-auto-publish');
    const progressBox = document.getElementById('qs-progress-box');
    const runBtn = document.getElementById('qs-run-btn');

    const url = (urlInput?.value || '').trim();
    const autoPublish = autoPublishInput ? autoPublishInput.checked : true;

    if (!url) {
      this.showToast('Please enter an Instagram post or reel URL', 'error');
      return;
    }

    if (!url.includes('instagram.com')) {
      this.showToast('Please enter a valid Instagram URL (reel, p, or tv)', 'error');
      return;
    }

    runBtn.disabled = true;
    runBtn.innerText = 'Processing Inbound Post...';
    progressBox.classList.remove('hidden');

    const updateStep = (id, text, done = false) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `${done ? '✅' : '⏳'} ${text}`;
        el.style.color = done ? 'var(--success)' : 'var(--accent-primary)';
        el.style.fontWeight = 'bold';
      }
    };

    updateStep('qs-step-1', '1. Downloading 1080p uncropped media & extracting caption...');

    try {
      setTimeout(() => updateStep('qs-step-1', '1. Media downloaded & caption extracted!', true), 800);
      setTimeout(() => updateStep('qs-step-2', '2. Evaluating post with LLM ranker & detecting intent...'), 900);
      setTimeout(() => updateStep('qs-step-2', '2. AI intent detected & fit score evaluated!', true), 1600);
      setTimeout(() => updateStep('qs-step-3', '3. Cleansing competitor watermarks & stamping @harshparmar007__...'), 1700);

      const res = await fetch('/api/instagram/autonomous/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, autoPublish })
      });

      const data = await res.json();

      if (data.success) {
        updateStep('qs-step-3', '3. Brand logo & watermarks applied!', true);
        updateStep('qs-step-4', `4. Paired with trending soundtrack: "${data.post?.trending_song_title || 'Tech Trend'}"!`, true);
        updateStep('qs-step-5', autoPublish ? '5. 🚀 Direct published to Instagram & sent to Telegram!' : '5. Staged into Instagram Studio Queue!', true);

        this.showToast(`Post processed successfully! Mode: [${data.post?.post_intent?.toUpperCase() || 'DIRECT_REPOST'}]`, 'success');
        
        setTimeout(() => {
          this.closeQuickShareModal();
          this.navigate('instagram');
          runBtn.disabled = false;
          runBtn.innerText = 'Ingest & Process Now';
        }, 1500);
      } else {
        throw new Error(data.message || data.error || 'Failed to process post');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
      runBtn.disabled = false;
      runBtn.innerText = 'Ingest & Process Now';
    }
  }
};

// Auto-run when DOM is ready or already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
