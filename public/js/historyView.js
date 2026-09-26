/**
 * OmniResearch AI — Research History View
 * Full management of past research campaigns, visual dossiers, and PDFs
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function formatHistoryDate(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Recently';
  }
}

function isNotebookCampaign(c) {
  const t = (c.topic || '') + ' ' + (c.deliverable_title || '') + ' ' + (c.niche || '');
  return /notes|cheat sheet|oops|handwritten|interview questions|dsa|syntax|python oop/i.test(t);
}

function is12PageCampaign(c) {
  if (isNotebookCampaign(c)) return false;
  const t = (c.topic || '') + ' ' + (c.deliverable_title || '');
  return /docker|kubernetes|k8s|interview|12-page|masterclass/i.test(t);
}

function hasVideoEvidence(c) {
  const sources = typeof c.sources === 'string' ? c.sources : JSON.stringify(c.sources || '');
  const topic = (c.topic || '') + ' ' + (c.deliverable_title || '');
  return /youtube|video|gta|watch\?v=/i.test(sources) || /youtube|video|leak|trailer/i.test(topic);
}

const historyView = {
  campaigns: [],
  activeTab: 'all',          // 'all' | 'notes' | '7p' | '12p' | 'video' | 'high_conf'
  filterQuery: '',
  filterProvider: 'all',
  sortBy: 'newest',          // 'newest' | 'confidence' | 'views' | 'oldest'
  viewMode: 'grid',          // 'grid' | 'table'

  async render() {
    const container = document.getElementById('view-history');
    if (!container) return;

    container.innerHTML = `
      <!-- Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div class="section-label">Archive & Evidence Repository</div>
          <h2 style="margin-top: 0.2rem; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Research Dossier & Notes History</h2>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Inspect all handwritten spiral notes, companion web guides, video citations, and compiled publication PDFs.
          </p>
        </div>
        <div style="display: flex; gap: 0.6rem; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="historyView.fetchAndRender()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh History
          </button>
          <button class="btn btn-primary btn-sm" onclick="app.navigate('research')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
            + New Deep Research
          </button>
        </div>
      </div>

      <!-- KPI Metrics Cockpit -->
      <div id="history-kpi-container" class="history-kpi-grid">
        <div class="history-kpi-card">
          <div class="history-kpi-icon" style="background: rgba(217,119,87,0.12); color: var(--accent-primary);">📁</div>
          <div class="history-kpi-info">
            <span class="history-kpi-value" id="kpi-total-count">-</span>
            <span class="history-kpi-label">Total Dossiers</span>
          </div>
        </div>
        <div class="history-kpi-card">
          <div class="history-kpi-icon" style="background: rgba(55,118,171,0.12); color: #3776AB;">📓</div>
          <div class="history-kpi-info">
            <span class="history-kpi-value" id="kpi-total-notes">-</span>
            <span class="history-kpi-label">Spiral Notes & Cheats</span>
          </div>
        </div>
        <div class="history-kpi-card">
          <div class="history-kpi-icon" style="background: rgba(2,136,209,0.12); color: #0288D1;">📑</div>
          <div class="history-kpi-info">
            <span class="history-kpi-value" id="kpi-total-pdfs">-</span>
            <span class="history-kpi-label">PDF Dossiers Ready</span>
          </div>
        </div>
        <div class="history-kpi-card">
          <div class="history-kpi-icon" style="background: rgba(46,125,50,0.12); color: #2E7D32;">🎯</div>
          <div class="history-kpi-info">
            <span class="history-kpi-value" id="kpi-avg-confidence">-</span>
            <span class="history-kpi-label">Avg Verification Score</span>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Panel -->
      <div class="history-controls-panel">
        <!-- Section Filter Tabs -->
        <div class="history-section-tabs" id="history-tabs-container">
          <!-- Dynamically populated -->
        </div>

        <!-- Sub Bar: Search + Provider + Sort + View Mode -->
        <div class="history-sub-bar">
          <div class="history-search-wrap">
            <input 
              type="text" 
              id="history-search-input" 
              class="history-search-input" 
              placeholder="Search dossiers or notes by topic, keywords, niche, or title..."
              value="${escapeHtml(this.filterQuery)}"
              oninput="historyView.onSearch(this.value)"
            />
            <svg style="position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>

          <div class="history-filter-group">
            <select class="form-select" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; width: auto;" onchange="historyView.onProviderFilter(this.value)">
              <option value="all" ${this.filterProvider === 'all' ? 'selected' : ''}>All LLM Providers</option>
              <option value="gemini" ${this.filterProvider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
              <option value="claude" ${this.filterProvider === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
              <option value="openai" ${this.filterProvider === 'openai' ? 'selected' : ''}>OpenAI GPT-4o</option>
              <option value="groq" ${this.filterProvider === 'groq' ? 'selected' : ''}>Groq Llama-3.3</option>
              <option value="ollama" ${this.filterProvider === 'ollama' ? 'selected' : ''}>Ollama (Local)</option>
            </select>

            <select class="form-select" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; width: auto;" onchange="historyView.onSortChange(this.value)">
              <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>⏳ Newest First</option>
              <option value="confidence" ${this.sortBy === 'confidence' ? 'selected' : ''}>⭐ Highest Confidence</option>
              <option value="views" ${this.sortBy === 'views' ? 'selected' : ''}>👁️ Most Views</option>
              <option value="oldest" ${this.sortBy === 'oldest' ? 'selected' : ''}>📅 Oldest First</option>
            </select>

            <!-- Grid vs Table View Switcher -->
            <div class="view-mode-toggle">
              <button 
                class="view-mode-btn ${this.viewMode === 'grid' ? 'active' : ''}" 
                onclick="historyView.setViewMode('grid')" 
                title="Bento Grid View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Grid
              </button>
              <button 
                class="view-mode-btn ${this.viewMode === 'table' ? 'active' : ''}" 
                onclick="historyView.setViewMode('table')" 
                title="Dense Data Table"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Display Area (Bento Grid or Table) -->
      <div id="history-content-container">
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          Loading research campaigns...
        </div>
      </div>
    `;

    await this.fetchAndRender();
  },

  async fetchAndRender() {
    try {
      const res = await fetch('/api/research/campaigns');
      const data = await res.json();
      if (data.success && Array.isArray(data.campaigns)) {
        this.campaigns = data.campaigns;
        this.updateKpis();
        this.renderTabs();
        this.renderDossiers();
      }
    } catch (e) {
      console.error('Error fetching campaign history:', e);
      const container = document.getElementById('history-content-container');
      if (container) {
        container.innerHTML = `<div class="card" style="text-align: center; color: var(--error); padding: 2rem;">Failed to load history: ${e.message}</div>`;
      }
    }
  },

  updateKpis() {
    const totalCountEl = document.getElementById('kpi-total-count');
    const totalNotesEl = document.getElementById('kpi-total-notes');
    const totalPdfsEl = document.getElementById('kpi-total-pdfs');
    const avgConfidenceEl = document.getElementById('kpi-avg-confidence');

    if (!totalCountEl) return;

    const total = this.campaigns.length;
    const notesCount = this.campaigns.filter(isNotebookCampaign).length;
    const totalConf = this.campaigns.reduce((acc, c) => acc + (c.confidence_score || 0.94), 0);
    const avgConf = total > 0 ? Math.round((totalConf / total) * 100) : 95;

    totalCountEl.textContent = total;
    if (totalNotesEl) totalNotesEl.textContent = `${notesCount} Notes`;
    totalPdfsEl.textContent = total;
    avgConfidenceEl.textContent = `${avgConf}%`;
  },

  renderTabs() {
    const container = document.getElementById('history-tabs-container');
    if (!container) return;

    const allCount = this.campaigns.length;
    const notesCount = this.campaigns.filter(isNotebookCampaign).length;
    const p12Count = this.campaigns.filter(is12PageCampaign).length;
    const p7Count = allCount - p12Count - notesCount;
    const videoCount = this.campaigns.filter(hasVideoEvidence).length;
    const highConfCount = this.campaigns.filter(c => (c.confidence_score || 0.94) >= 0.95).length;

    const tabs = [
      { id: 'all', label: 'All Dossiers', count: allCount },
      { id: 'notes', label: '📓 Handwritten Spiral Notes', count: notesCount },
      { id: '7p', label: '📄 7-Page Publication Reports', count: Math.max(p7Count, 0) },
      { id: '12p', label: '📘 12-Page Masterclasses', count: p12Count },
      { id: 'video', label: '▶️ Video Citations', count: videoCount },
      { id: 'high_conf', label: '⭐ Top Confidence (≥95%)', count: highConfCount }
    ];

    container.innerHTML = tabs.map(t => `
      <button 
        class="history-tab-btn ${this.activeTab === t.id ? 'active' : ''}" 
        onclick="historyView.setSectionTab('${t.id}')"
      >
        <span>${t.label}</span>
        <span class="history-tab-counter">${t.count}</span>
      </button>
    `).join('');
  },

  setSectionTab(tabId) {
    this.activeTab = tabId;
    this.renderTabs();
    this.renderDossiers();
  },

  onSearch(val) {
    this.filterQuery = (val || '').toLowerCase().trim();
    this.renderDossiers();
  },

  onProviderFilter(val) {
    this.filterProvider = val || 'all';
    this.renderDossiers();
  },

  onSortChange(val) {
    this.sortBy = val || 'newest';
    this.renderDossiers();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const btns = document.querySelectorAll('.view-mode-btn');
    btns.forEach(btn => {
      if (btn.title && btn.title.toLowerCase().includes(mode)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.renderDossiers();
  },

  resetFilters() {
    this.activeTab = 'all';
    this.filterQuery = '';
    this.filterProvider = 'all';
    this.sortBy = 'newest';

    const searchInput = document.getElementById('history-search-input');
    if (searchInput) searchInput.value = '';

    this.renderTabs();
    this.renderDossiers();
  },

  getFilteredCampaigns() {
    let list = this.campaigns.filter(c => {
      // 1. Tab filtering
      if (this.activeTab === 'notes' && !isNotebookCampaign(c)) return false;
      if (this.activeTab === '7p' && (is12PageCampaign(c) || isNotebookCampaign(c))) return false;
      if (this.activeTab === '12p' && !is12PageCampaign(c)) return false;
      if (this.activeTab === 'video' && !hasVideoEvidence(c)) return false;
      if (this.activeTab === 'high_conf' && (c.confidence_score || 0.94) < 0.95) return false;

      // 2. Query search
      if (this.filterQuery) {
        const text = `${c.topic || ''} ${c.deliverable_title || ''} ${c.niche || ''} ${c.trigger_keyword || ''} ${c.summary || ''}`.toLowerCase();
        if (!text.includes(this.filterQuery)) return false;
      }

      // 3. Provider filter
      if (this.filterProvider !== 'all') {
        const p = (c.provider || '').toLowerCase();
        if (!p.includes(this.filterProvider.toLowerCase())) return false;
      }

      return true;
    });

    // 4. Sorting
    list.sort((a, b) => {
      if (this.sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (this.sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (this.sortBy === 'confidence') {
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      }
      if (this.sortBy === 'views') {
        return (b.views_count || 0) - (a.views_count || 0);
      }
      return 0;
    });

    return list;
  },

  renderDossiers() {
    const container = document.getElementById('history-content-container');
    if (!container) return;

    const filtered = this.getFilteredCampaigns();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 2.8rem; margin-bottom: 0.8rem;">📜</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-primary);">No Dossiers Match Filters</h3>
          <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.25rem; line-height: 1.5;">
            ${this.filterQuery || this.activeTab !== 'all' || this.filterProvider !== 'all'
              ? 'No research campaigns matched your active filters or search terms. Try selecting "All Dossiers" or resetting the search input.'
              : 'You have not conducted any research campaigns yet.'}
          </p>
          <div style="display: flex; gap: 0.6rem; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="historyView.resetFilters()">Reset All Filters</button>
            <button class="btn btn-primary btn-sm" onclick="app.navigate('research')">Start Deep Research</button>
          </div>
        </div>
      `;
      return;
    }

    if (this.viewMode === 'table') {
      this.renderTableView(container, filtered);
    } else {
      this.renderGridView(container, filtered);
    }
  },

  renderGridView(container, list) {
    container.innerHTML = `
      <div class="history-bento-grid">
        ${list.map(c => {
          const isNote = isNotebookCampaign(c);
          const is12 = is12PageCampaign(c);
          const hasVideo = hasVideoEvidence(c);
          const conf = Math.round((c.confidence_score || 0.94) * 100);
          const dateStr = formatHistoryDate(c.created_at);
          const title = c.deliverable_title || c.topic || 'Deep Technical Research Dossier';
          const publicUrl = c.public_url || (c.slug ? `/docs/${c.slug}` : '#');
          const pdfUrl = `/api/docs/${c.id}/pdf`;
          const depth = c.iterations || 3;
          const views = c.views_count || 0;
          const provider = (c.provider || 'gemini').toUpperCase();

          const badgeLabel = isNote ? '📓 Spiral Notes' : (is12 ? '📘 12-Page Masterclass' : '📄 7-Page Dossier');
          const badgeClass = isNote ? 'p7' : (is12 ? 'p12' : 'p7');
          const pdfButtonColor = isNote ? '#3776AB' : (is12 ? '#0288D1' : 'var(--accent-primary)');

          return `
            <div class="history-bento-card ${is12 ? 'format-12p' : 'format-7p'}" style="${isNote ? 'border-left: 4px solid #3776AB;' : ''}">
              <!-- Top Quadrant: ID, Badges, Date -->
              <div>
                <div class="bento-card-header">
                  <div class="bento-header-badges">
                    <span class="bento-id-badge">#${c.id}</span>
                    <span class="bento-format-badge ${badgeClass}" style="${isNote ? 'background: rgba(55,118,171,0.12); color: #3776AB; border-color: rgba(55,118,171,0.25);' : ''}">
                      ${badgeLabel}
                    </span>
                    <span class="bento-provider-badge">
                      ${escapeHtml(provider)}
                    </span>
                    ${hasVideo ? `<span class="badge" style="background: rgba(220,38,38,0.1); color: #DC2626; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem;">▶️ VIDEO</span>` : ''}
                  </div>
                  <div class="bento-date-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${dateStr}</span>
                  </div>
                </div>

                <!-- Title & Excerpt -->
                <h3 class="bento-card-title" title="${escapeHtml(title)}">
                  ${escapeHtml(title)}
                </h3>
                <p class="bento-card-excerpt">
                  ${escapeHtml(c.summary || c.topic || 'Autonomous deep-synthesized dossier across multi-angle live web queries and authoritative technical publications.')}
                </p>

                <!-- Metrics Strip: 3 Structured Columns -->
                <div class="bento-card-metrics">
                  <div class="bento-metric-item">
                    <span class="bento-metric-val" style="color: #2E7D32;">✓ ${conf}%</span>
                    <span class="bento-metric-lbl">Confidence</span>
                  </div>
                  <div class="bento-metric-item">
                    <span class="bento-metric-val">${depth} Rounds</span>
                    <span class="bento-metric-lbl">Depth</span>
                  </div>
                  <div class="bento-metric-item">
                    <span class="bento-metric-val">${views} Reads</span>
                    <span class="bento-metric-lbl">Engagement</span>
                  </div>
                </div>
              </div>

              <!-- Bottom Quadrant: Tactile Actions -->
              <div class="bento-card-actions">
                <div class="bento-primary-actions">
                  <a href="${pdfUrl}" target="_blank" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center; background: ${pdfButtonColor}; border-color: ${pdfButtonColor};">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg>
                    Download PDF
                  </a>
                  <a href="${publicUrl}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; justify-content: center; font-weight: 600;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    View Guide
                  </a>
                </div>

                <div class="bento-secondary-actions">
                  <button class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.55rem; font-size: 0.78rem;" onclick="historyView.openCarouselModal(${c.id}, '${escapeHtml(title)}')" title="Preview 6 Instagram 4:5 Carousel Slides">
                    🎠 Slides
                  </button>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.55rem; font-size: 0.78rem;" onclick="historyView.copyLink('${publicUrl}')" title="Copy public companion link for Instagram DM">
                    📋
                  </button>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.55rem; font-size: 0.78rem;" onclick="historyView.rerunCampaign(${c.id})" title="Load into Research Studio">
                    🔄
                  </button>
                  <button class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.55rem; color: var(--error);" onclick="historyView.deleteCampaign(${c.id})" title="Delete dossier">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderTableView(container, list) {
    container.innerHTML = `
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th style="width: 60px;">ID</th>
              <th>Topic & Deliverable Title</th>
              <th>Format</th>
              <th>Engine</th>
              <th>Confidence</th>
              <th>Date</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => {
              const isNote = isNotebookCampaign(c);
              const is12 = is12PageCampaign(c);
              const conf = Math.round((c.confidence_score || 0.94) * 100);
              const dateStr = formatHistoryDate(c.created_at);
              const title = c.deliverable_title || c.topic || 'Deep Technical Research Dossier';
              const publicUrl = c.public_url || (c.slug ? `/docs/${c.slug}` : '#');
              const pdfUrl = `/api/docs/${c.id}/pdf`;
              const provider = (c.provider || 'gemini').toUpperCase();
              const badgeLabel = isNote ? '📓 Notes' : (is12 ? '📘 12-Page' : '📄 7-Page');
              const badgeClass = isNote ? 'p7' : (is12 ? 'p12' : 'p7');

              return `
                <tr>
                  <td>
                    <span class="bento-id-badge">#${c.id}</span>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--text-primary); line-height: 1.35; max-width: 380px;">
                      ${escapeHtml(title)}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                      Niche: ${escapeHtml(c.niche || 'General')} • ${c.iterations || 3} Iterations
                    </div>
                  </td>
                  <td>
                    <span class="bento-format-badge ${badgeClass}" style="${isNote ? 'background: rgba(55,118,171,0.12); color: #3776AB;' : ''}">
                      ${badgeLabel}
                    </span>
                  </td>
                  <td>
                    <span class="bento-provider-badge">${escapeHtml(provider)}</span>
                  </td>
                  <td>
                    <span style="font-weight: 700; color: #2E7D32; font-size: 0.82rem;">✓ ${conf}%</span>
                  </td>
                  <td style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap;">
                    ${dateStr}
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                      <a href="${pdfUrl}" target="_blank" class="btn btn-primary btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.76rem; background: ${isNote ? '#3776AB' : (is12 ? '#0288D1' : 'var(--accent-primary)')}; border-color: ${isNote ? '#3776AB' : (is12 ? '#0288D1' : 'var(--accent-primary)')};">
                        PDF
                      </a>
                      <a href="${publicUrl}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.76rem;">
                        Guide
                      </a>
                      <button class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.5rem;" onclick="historyView.copyLink('${publicUrl}')" title="Copy Link">
                        📋
                      </button>
                      <button class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.5rem; color: var(--error);" onclick="historyView.deleteCampaign(${c.id})" title="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  copyLink(url) {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    if (window.app && app.showToast) {
      app.showToast(`Copied Guide Link: ${fullUrl}`, 'success');
    } else {
      alert(`Copied: ${fullUrl}`);
    }
  },

  rerunCampaign(id) {
    const c = this.campaigns.find(item => item.id === id);
    if (!c) return;

    if (window.app && app.navigate) {
      app.navigate('research');
      setTimeout(() => {
        const topicEl = document.getElementById('rs-topic');
        const nicheEl = document.getElementById('rs-niche');
        if (topicEl) topicEl.value = c.topic;
        if (nicheEl && c.niche) nicheEl.value = c.niche;
        if (window.app.showToast) {
          app.showToast(`Loaded Research #${c.id} into Studio`, 'info');
        }
      }, 100);
    }
  },

  async openCarouselModal(id, title) {
    try {
      if (window.app && app.showToast) app.showToast('Fetching Instagram 4:5 Carousel Slides...', 'info');
      const res = await fetch(`/api/docs/${id}/carousel`);
      const data = await res.json();
      if (!data.success || !data.slides || data.slides.length === 0) {
        if (window.app && app.showToast) app.showToast('No carousel slides available for this dossier yet.', 'warning');
        return;
      }

      let modal = document.getElementById('history-carousel-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'history-carousel-modal';
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(10,14,23,0.85); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div style="background: #111827; border: 1px solid #374151; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #1F2937; background: #0B0F19;">
            <div>
              <span class="badge" style="background: rgba(236,72,153,0.15); color: #EC4899; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border: 1px solid rgba(236,72,153,0.3);">INSTAGRAM 4:5 CAROUSEL ENGINE</span>
              <h3 style="color: #FFFFFF; font-size: 1.15rem; font-weight: 800; margin-top: 0.3rem;">${escapeHtml(title)}</h3>
            </div>
            <button onclick="document.getElementById('history-carousel-modal').style.display='none'" style="background: #1F2937; border: 1px solid #374151; color: #9CA3AF; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>
          </div>

          <div style="padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; align-items: center; gap: 1.25rem;">
            <div style="display: flex; justify-content: center; width: 100%;">
              <img id="hist-modal-active-slide" src="${data.slides[0].url}" alt="Carousel Slide" style="max-height: 520px; aspect-ratio: 4/5; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #374151; object-fit: contain;">
            </div>

            <div style="display: flex; gap: 0.75rem; overflow-x: auto; max-width: 100%; padding: 0.5rem 0;">
              ${data.slides.map((s, idx) => `
                <div onclick="document.getElementById('hist-modal-active-slide').src='${s.url}'; document.getElementById('hist-modal-slide-num').innerText='Slide ${idx + 1} of ${data.slides.length}'; document.getElementById('hist-modal-dl-btn').href='${s.url}';" style="cursor: pointer; flex-shrink: 0; text-align: center;">
                  <img src="${s.url}" style="width: 60px; height: 75px; border-radius: 6px; object-fit: cover; border: 2px solid #4B5563;">
                  <div style="font-size: 0.68rem; color: #9CA3AF; margin-top: 2px;">Slide ${idx + 1}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-top: 1px solid #1F2937; background: #0B0F19;">
            <span id="hist-modal-slide-num" style="color: #9CA3AF; font-size: 0.84rem; font-weight: 600;">Slide 1 of ${data.slides.length}</span>
            <div style="display: flex; gap: 0.75rem;">
              <a id="hist-modal-dl-btn" href="${data.slides[0].url}" download="instagram_slide.png" class="btn btn-primary btn-sm" style="background: #D97757; border-color: #D97757; font-weight: 700;">
                ⬇️ Download Current Slide
              </a>
              <button onclick="document.getElementById('history-carousel-modal').style.display='none'" class="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    } catch (e) {
      if (window.app && app.showToast) app.showToast(`Error loading carousel: ${e.message}`, 'error');
    }
  },

  deleteCampaign(id) {
    if (!confirm(`Are you sure you want to delete research campaign #${id}? This will remove its companion guide and compiled records.`)) {
      return;
    }

    try {
      fetch(`/api/research/${id}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
        if (data.success) {
          if (window.app && app.showToast) app.showToast(`Deleted campaign #${id}`, 'success');
          this.campaigns = this.campaigns.filter(c => c.id !== id);
          this.updateKpis();
          this.renderTabs();
          this.renderDossiers();
          if (window.app && app.updateHistoryCount) app.updateHistoryCount();
        } else {
          if (window.app && app.showToast) app.showToast(data.error || 'Failed to delete campaign', 'error');
        }
      });
    } catch (e) {
      if (window.app && app.showToast) app.showToast(`Delete failed: ${e.message}`, 'error');
    }
  }
};

window.historyView = historyView;
