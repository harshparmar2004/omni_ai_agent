/**
 * OmniResearch AI v2.0 — Enhanced Virtual Sheet Matrix View
 * Content type badges (Reel/Image/Carousel), thumbnails, Google Doc links, PDF links
 */

const matrixView = {
  currentStatus: 'all',
  searchQuery: '',

  async render() {
    const container = document.getElementById('view-matrix');
    if (!container) return;

    container.innerHTML = `
      <div class="matrix-container">
        <!-- Matrix Toolbar -->
        <div class="matrix-toolbar">
          <div class="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="matrix-search" class="search-input" placeholder="Search by Keyword, Topic, or Media ID..." value="${this.searchQuery}" oninput="matrixView.handleSearch(this.value)">
          </div>

          <div class="filter-pills">
            <button class="filter-pill ${this.currentStatus === 'all' ? 'active' : ''}" onclick="matrixView.filterStatus('all')">All Rows</button>
            <button class="filter-pill ${this.currentStatus === 'armed' ? 'active' : ''}" onclick="matrixView.filterStatus('armed')">🟢 Armed</button>
            <button class="filter-pill ${this.currentStatus === 'published' ? 'active' : ''}" onclick="matrixView.filterStatus('published')">🚀 Published</button>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="matrixView.exportCsv()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button class="btn btn-primary btn-sm" onclick="matrixView.loadData()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div style="overflow-x: auto;">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Media ID</th>
                <th>Keyword</th>
                <th>Topic & Lead Magnet</th>
                <th>Docs</th>
                <th>Preview</th>
                <th>InstaAuto</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="matrix-tbody">
              <tr><td colspan="10" style="text-align: center; padding: 2rem;">Loading Virtual Sheet...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    try {
      let url = `/api/matrix?status=${this.currentStatus}`;
      if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      const tbody = document.getElementById('matrix-tbody');
      if (!tbody) return;

      if (!data.success || !data.rows || data.rows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No deliverables found matching current filters.
            </td>
          </tr>
        `;
        return;
      }

      if (window.app && app.cacheMedia) {
        app.cacheMedia(data.rows);
      }

      tbody.innerHTML = data.rows.map(row => {
        const isArmed = row.status === 'armed';
        const isPublished = row.status === 'published';

        // Content type badge
        const contentType = row.content_type || 'reel';
        const typeMap = {
          reel: '<span class="type-badge type-reel">🎬 Reel</span>',
          image: '<span class="type-badge type-image">📸 Image</span>',
          carousel: '<span class="type-badge type-carousel">🎠 Carousel</span>'
        };
        const typeBadge = typeMap[contentType] || typeMap.reel;

        // Status badge
        let statusBadge = `<span class="badge badge-draft">Draft</span>`;
        if (isArmed) {
          statusBadge = `<span class="badge badge-armed">🟢 Armed</span>`;
        } else if (isPublished) {
          statusBadge = `<span class="badge badge-published">🚀 Published</span>`;
        }

        const safeTitle = (row.lead_magnet_title || row.topic || 'Deliverable').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cleanDate = row.armed_at || row.created_at || 'Recently';

        // Thumbnail
        const thumbUrl = row.thumbnail_url || row.image_url || '';
        const thumbHtml = thumbUrl
          ? `<img src="${thumbUrl}" alt="thumb" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" onerror="this.style.display='none'">`
          : '<span class="text-muted text-sm">—</span>';

        // Docs column (Guide + PDF + Google Doc)
        let docsHtml = '';
        if (row.deliverable_url) {
          docsHtml += `<a href="${row.deliverable_url}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px;" title="Hosted Reader">📖</a> `;
        }
        if (row.pdf_url) {
          docsHtml += `<a href="${row.pdf_url}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px;" title="Download PDF">📄</a> `;
        }
        if (row.google_doc_url) {
          docsHtml += `<a href="${row.google_doc_url}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 2px 6px;" title="Google Doc">📝</a>`;
        }
        if (!docsHtml) docsHtml = '<span class="text-muted text-sm">—</span>';

        return `
          <tr>
            <td>${typeBadge}</td>
            <td>${statusBadge}</td>
            <td style="white-space: nowrap; font-size: 0.75rem; font-weight: 500;">${cleanDate}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span class="font-mono" style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary);">
                  #${row.ig_media_id ? row.ig_media_id.slice(-8) : 'N/A'}
                </span>
                <button class="btn btn-secondary btn-sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem;" onclick="matrixView.copyMediaId('${row.ig_media_id}')" title="Copy">📋</button>
              </div>
            </td>
            <td>
              <span class="badge-keyword">${row.trigger_keyword || 'DRAG'}</span>
            </td>
            <td style="max-width: 280px;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.82rem; line-height: 1.3;">
                ${safeTitle.length > 60 ? safeTitle.substring(0, 57) + '...' : safeTitle}
              </div>
              ${row.provider ? `<div style="font-size: 0.68rem; color: var(--accent); margin-top: 2px;">${row.provider}</div>` : ''}
            </td>
            <td>${docsHtml}</td>
            <td>${thumbHtml}</td>
            <td>
              ${row.instaauto_rule_id ? `
                <span class="badge badge-armed" style="font-size: 0.7rem;">Rule #${row.instaauto_rule_id}</span>
              ` : `
                <span class="text-muted text-sm">—</span>
              `}
            </td>
            <td>
              <button class="btn btn-secondary btn-sm" style="font-size: 0.7rem;" onclick="matrixView.retryBridge(${row.id})" title="Re-send to InstaAuto">
                🔄
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading matrix data:', err);
    }
  },

  handleSearch(query) {
    this.searchQuery = query;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadData(), 250);
  },

  filterStatus(status) {
    this.currentStatus = status;
    document.querySelectorAll('.filter-pill').forEach(el => {
      el.classList.toggle('active', el.innerText.toLowerCase().includes(status) || (status === 'all' && el.innerText.includes('All')));
    });
    this.loadData();
  },

  copyMediaId(mediaId) {
    if (!mediaId) return;
    navigator.clipboard.writeText(mediaId);
    app.showToast(`Copied Media ID: ${mediaId}`, 'success');
  },

  async retryBridge(rowId) {
    try {
      app.showToast(`Pushing row #${rowId} to InstaAuto bridge...`, 'success');
      const res = await fetch('/api/matrix/retry-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_id: rowId })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`Row #${rowId} armed in InstaAuto!`, 'success');
        this.loadData();
      } else {
        throw new Error(data.error || 'Failed to re-sync');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  exportCsv() {
    window.location.href = '/api/matrix/export.csv';
  }
};

window.matrixView = matrixView;
