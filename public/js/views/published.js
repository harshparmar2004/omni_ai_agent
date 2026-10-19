/**
 * OmniStudio v7 — Published Feed View
 * Grid of live Instagram posts published via Meta Graph API v21.0
 */
window.publishedView = (function() {
  let allPublished = [];

  async function render() {
    const container = document.getElementById('view-published');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0 0 0.2rem 0;">Published Feed</h2>
          <p class="text-sm text-muted">Live reels published to connected Instagram pages via Meta Graph API v21.0</p>
        </div>
        <div class="flex items-center gap-2">
          <select id="pub-page-filter" class="form-input" style="width: 190px; font-size: 0.8rem; padding: 5px 9px;" onchange="publishedView.filterByPage()">
            <option value="">All Connected Pages</option>
            ${(window.app?.pages || []).map(p => `<option value="${p.id}">${p.name} (@${p.slug})</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="publishedView.refresh()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div id="pub-cards-container">
        <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading published reels...</div>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    const container = document.getElementById('pub-cards-container');
    if (!container) return;

    try {
      const res = await fetch('/api/jobs?status=published&limit=50');
      if (!res.ok) return;
      allPublished = await res.json();

      const badge = document.getElementById('nav-published-badge');
      if (badge) badge.textContent = allPublished.length;

      renderCards(allPublished);
    } catch (err) {
      console.warn('[Published loadData error]:', err);
    }
  }

  function filterByPage() {
    const pageId = document.getElementById('pub-page-filter')?.value;
    if (!pageId) {
      renderCards(allPublished);
    } else {
      const filtered = allPublished.filter(j => j.page_id === parseInt(pageId, 10));
      renderCards(filtered);
    }
  }

  function renderCards(jobs) {
    const container = document.getElementById('pub-cards-container');
    if (!container) return;

    if (!jobs || jobs.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 3.5rem; text-align: center;">
          <div style="font-weight: 800; font-size: 1.15rem; margin-bottom: 0.25rem;">No Published Reels Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">Submit a reel link via Agent 1 (Reposter) or let Agent 2 (Watchtower) discover and publish content!</p>
        </div>
      `;
      return;
    }

    const cards = jobs.map(j => {
      const pageSlug = j.page_slug ? `@${j.page_slug}` : `@page#${j.page_id}`;
      const directUrl = j.published_permalink || (j.shortcode ? `https://www.instagram.com/reel/${j.shortcode}/` : '#');
      const timeAgo = formatTimeAgo(j.published_at || j.created_at);
      const isWatchtower = j.agent === 'watchtower';
      const hasMedia = Boolean(j.local_media_path);
      const videoWebUrl = hasMedia ? `/generated/videos/${j.local_media_path.split(/[/\\]/).pop()}` : null;

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.15rem; background: var(--bg-card);">
          <div>
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
              <span style="font-weight: 700; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary);">
                ${pageSlug}
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">
                ${isWatchtower ? 'Watchtower' : 'Reposter'}
              </span>
            </div>

            <!-- Published Meta Media ID -->
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.65rem;">
              ID: ${j.published_media_id || 'Meta v21.0'}
            </div>

            <!-- Caption -->
            <div style="background: var(--bg-input); padding: 0.65rem 0.85rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 0.75rem; max-height: 85px; overflow-y: auto;">
              ${j.caption || 'No caption text'}
            </div>

            <div class="flex items-center justify-between" style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.85rem;">
              <span>${timeAgo}</span>
              <a href="${j.source_url}" target="_blank">Original Source ↗</a>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            ${videoWebUrl ? `
              <button class="btn btn-secondary btn-sm w-full" onclick="app.openVideoModal('${videoWebUrl}')" style="font-size: 0.75rem;">
                Preview Reel
              </button>
            ` : ''}
            <a href="${directUrl}" target="_blank" class="btn btn-primary btn-sm w-full" style="text-align: center; font-size: 0.75rem;">
              View on IG ↗
            </a>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.15rem;">
        ${cards}
      </div>
    `;
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
    filterByPage,
    refresh: loadData
  };
})();
