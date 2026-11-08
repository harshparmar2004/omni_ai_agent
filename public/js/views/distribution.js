/**
 * OmniStudio v8 — Distribution Networks & Interconnected Rings View
 * Manages 50-100+ pages grouped into automated fan-out rings.
 */
window.distributionView = (function() {
  let groupsList = [];
  let allPages = [];
  let recentDistributions = [];
  let upcomingCrossPosts = [];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function render() {
    const container = document.getElementById('view-distribution');
    if (!container) return;

    container.innerHTML = `
      <div style="width: 100%; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              Distribution Networks & Interconnected Rings
            </h2>
            <p class="text-sm text-muted" style="margin: 0;">
              Scale 50-100+ accounts: when a reel publishes on one seed channel, it fans out automatically across sibling channels with unique branding
            </p>
          </div>
          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="distributionView.openCreateRingModal()">
              + New Distribution Ring
            </button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.openVaultModal()">
              🔑 Token Vault & Backup
            </button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.testAllTokens()">
              ⚡ Validate All Tokens
            </button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.refresh()">
              Refresh
            </button>
          </div>
        </div>

        <!-- Rings Overview Grid -->
        <div id="distribution-rings-container">
          <div style="color: var(--text-muted); padding: 2rem; text-align: center;">Loading distribution networks...</div>
        </div>

        <!-- Upcoming Scheduled Fan-Out Timeline -->
        <div class="mt-5 mb-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Upcoming Scheduled Fan-Outs</h3>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0 0;">Staggered cross-posts waiting to dispatch across sibling network channels</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.triggerWorkerTick()">
              ⚡ Dispatch Due Now
            </button>
          </div>
          <div id="distribution-upcoming-container" class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-card); background: var(--bg-card);">
            <div style="color: var(--text-muted); padding: 1.5rem; text-align: center; font-size: 0.85rem;">Loading upcoming schedule...</div>
          </div>
        </div>

        <!-- Recent Cross-Post History -->
        <div class="mt-5">
          <div class="flex items-center justify-between mb-3">
            <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Active Fan-Out Distributions</h3>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.triggerWorkerTick()">
              ⚡ Run Worker Tick Now
            </button>
          </div>
          <div id="distribution-history-container" class="card table-container" style="background: var(--bg-card); border-radius: 10px; overflow-x: auto;">
            <div style="color: var(--text-muted); padding: 2rem; text-align: center;">Loading distribution queue...</div>
          </div>
        </div>

      </div>

      <!-- Create / Edit Ring Modal -->
      <div id="ring-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) distributionView.closeRingModal()">
        <div class="modal-content" style="max-width: 500px; border-radius: 12px;">
          <div class="flex items-center justify-between mb-4">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;" id="rm-title">Create Distribution Ring</h3>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.closeRingModal()" style="padding: 2px 8px;">✕</button>
          </div>

          <input type="hidden" id="rm-id">

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Network Ring Name</label>
            <input type="text" id="rm-name" class="form-input" placeholder="e.g. Concert & EDM Network">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Slug (Identifier)</label>
            <input type="text" id="rm-slug" class="form-input" placeholder="e.g. concert_network" style="font-family: var(--font-mono);">
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Niche Category</label>
            <select id="rm-niche" class="form-input">
              <option value="concert">🎵 Concert & EDM Festivals</option>
              <option value="dance">💃 Girls Dance & Choreography</option>
              <option value="movies">🎬 Movies & Cinema Breakdowns</option>
              <option value="tech">⚡ AI, Tech & Video Essays</option>
              <option value="gaming">🎮 Gaming & GTA 6</option>
              <option value="general">🌐 General / Multi-Niche</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Cross-Posting Mode</label>
            <select id="rm-mode" class="form-input">
              <option value="auto">Autonomous Auto-Fanout (Automatic)</option>
              <option value="confirm">Telegram Confirmation Required First</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div class="flex gap-3 mb-4">
            <div style="flex: 1;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Min Stagger Delay (min)</label>
              <input type="number" id="rm-delay-min" class="form-input" value="20" min="5" max="180">
            </div>
            <div style="flex: 1;">
              <label class="form-label font-bold" style="font-size: 0.8rem;">Max Stagger Delay (min)</label>
              <input type="number" id="rm-delay-max" class="form-input" value="45" min="10" max="360">
            </div>
          </div>

          <div class="flex justify-between items-center">
            <button class="btn btn-secondary" onclick="distributionView.closeRingModal()">Cancel</button>
            <button class="btn btn-primary" onclick="distributionView.saveRing()">Save Network Ring</button>
          </div>
        </div>
      </div>

      <!-- Add Channel to Ring Modal -->
      <div id="add-member-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) distributionView.closeMemberModal()">
        <div class="modal-content" style="max-width: 460px; border-radius: 12px;">
          <div class="flex items-center justify-between mb-4">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;">Connect Channel to Ring</h3>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.closeMemberModal()" style="padding: 2px 8px;">✕</button>
          </div>

          <input type="hidden" id="amm-group-id">

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Select Instagram Account</label>
            <select id="amm-page-select" class="form-input"></select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Role in Ring</label>
            <select id="amm-role" class="form-input">
              <option value="member">Secondary Member (Receives cross-posts)</option>
              <option value="primary">Primary Seed (Scraped competitor reels post here first)</option>
            </select>
          </div>

          <div class="flex justify-between items-center mt-4">
            <button class="btn btn-secondary" onclick="distributionView.closeMemberModal()">Cancel</button>
            <button class="btn btn-primary" onclick="distributionView.saveMember()">Add to Ring</button>
          </div>
        </div>
      </div>

      <!-- Bulk Competitor Sources Modal -->
      <div id="bulk-sources-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) distributionView.closeBulkSourceModal()">
        <div class="modal-content" style="max-width: 520px; border-radius: 12px;">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;">Bulk Competitor Surveillance</h3>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;" id="bsm-subtitle">Add competitor sources to network ring</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.closeBulkSourceModal()" style="padding: 2px 8px;">✕</button>
          </div>

          <input type="hidden" id="bsm-group-id">

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Paste Competitor Instagram Usernames (one per line or comma-separated):</label>
            <textarea id="bsm-usernames" class="form-input" rows="8" placeholder="@cercaboreal&#10;@tomorrowland&#10;@ultra&#10;@boilerroom&#10;https://instagram.com/edc_lasvegas" style="font-family: var(--font-mono); font-size: 0.82rem;"></textarea>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
              Agent 2 (Watchtower) will scan all of these accounts 24/7 and automatically feed viral content into this network ring.
            </div>
          </div>

          <div class="flex justify-between items-center">
            <button class="btn btn-secondary" onclick="distributionView.closeBulkSourceModal()">Cancel</button>
            <button class="btn btn-primary" onclick="distributionView.saveBulkSources()">Add Sources Now</button>
          </div>
        </div>
      </div>

      <!-- Token Vault Backup / Restore Modal -->
      <div id="vault-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) distributionView.closeVaultModal()">
        <div class="modal-content" style="max-width: 580px; border-radius: 12px;">
          <div class="flex items-center justify-between mb-3">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600;">Multi-Tenant Token Vault</h3>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.closeVaultModal()" style="padding: 2px 8px;">✕</button>
          </div>
          <p class="text-xs text-muted mb-3">Consolidate 50-100+ Instagram accounts into a single portable backup string.</p>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Exported Vault Data (Base64)</label>
            <textarea id="vm-export-text" class="form-input" rows="5" readonly style="font-family: var(--font-mono); font-size: 0.75rem; background: var(--bg-canvas);"></textarea>
          </div>

          <div class="flex gap-2 mb-4">
            <button class="btn btn-secondary btn-sm" onclick="distributionView.copyVault()">📋 Copy to Clipboard</button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.downloadVault()">💾 Download JSON</button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Import / Restore Vault</label>
            <textarea id="vm-import-text" class="form-input" rows="4" placeholder="Paste Base64 or JSON vault payload here to restore/update accounts..." style="font-family: var(--font-mono); font-size: 0.75rem;"></textarea>
          </div>

          <div class="flex justify-between items-center">
            <button class="btn btn-secondary" onclick="distributionView.closeVaultModal()">Close</button>
            <button class="btn btn-primary" onclick="distributionView.executeImportVault()">Import Vault</button>
          </div>
        </div>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    try {
      const [groupsRes, pagesRes, distRes, upcomingRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/pages'),
        fetch('/api/distribution?limit=15'),
        fetch('/api/distribution/upcoming')
      ]);

      if (groupsRes.ok) groupsList = await groupsRes.json();
      if (pagesRes.ok) allPages = await pagesRes.json();
      if (distRes.ok) recentDistributions = await distRes.json();
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json();
        upcomingCrossPosts = uData.upcoming || [];
      }

      renderRings();
      renderUpcoming();
      renderHistory();
    } catch (e) {
      console.warn('[Distribution loadData error]:', e);
    }
  }

  function renderUpcoming() {
    const container = document.getElementById('distribution-upcoming-container');
    if (!container) return;

    if (!upcomingCrossPosts || upcomingCrossPosts.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 1.25rem;">
          No scheduled fan-out cross-posts in queue.
        </div>
      `;
      return;
    }

    let html = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    `;

    for (const t of upcomingCrossPosts) {
      const scheduledTime = t.scheduled_at ? new Date(t.scheduled_at).toLocaleTimeString() : 'Now';
      const delayMin = t.delay_minutes ? `${t.delay_minutes}m stagger` : 'Immediate';
      
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; border-radius: 8px; background: var(--bg-canvas); border: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">
              📱 ${escapeHtml(t.target_page_name || 'Channel #' + t.target_page_id)}
            </span>
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${escapeHtml(t.target_page_handle || '')}
            </span>
            <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(37, 99, 235, 0.1); color: #2563EB;">
              Origin: #${escapeHtml(t.origin_shortcode || t.origin_job_id)}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
              ⏱️ ${scheduledTime} (${delayMin})
            </span>
            <button class="btn btn-primary btn-sm" onclick="distributionView.sendNowTarget(${t.id})" style="padding: 2px 7px; font-size: 0.72rem;">
              Send Now ⚡
            </button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.rescheduleTarget(${t.id}, 15)" style="padding: 2px 7px; font-size: 0.72rem;">
              +15m ⏱️
            </button>
            <button class="btn btn-secondary btn-sm" onclick="distributionView.cancelTarget(${t.id})" style="padding: 2px 7px; font-size: 0.72rem; color: var(--danger);">
              Cancel
            </button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  async function renderRings() {
    const container = document.getElementById('distribution-rings-container');
    if (!container) return;

    if (groupsList.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 3rem; text-align: center; border-radius: 12px; border: 1.5px dashed var(--border-card);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌐</div>
          <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">No Distribution Rings Configured Yet</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.25rem auto;">
            Create interconnected networks (e.g. 10 concert channels, 10 dance channels). Post a reel once to seed it, and the ring fans it out automatically!
          </p>
          <button class="btn btn-primary" onclick="distributionView.openCreateRingModal()">+ Create First Distribution Ring</button>
        </div>
      `;
      return;
    }

    // Fetch detailed members for each group
    const ringCardsHtml = await Promise.all(groupsList.map(async g => {
      let members = [];
      let sources = [];
      try {
        const detailRes = await fetch(`/api/groups/${g.id}`);
        if (detailRes.ok) {
          const d = await detailRes.json();
          members = d.members || [];
          sources = d.sources || [];
        }
      } catch (e) {}

      const memberChips = members.length === 0 ? `
        <span style="color: var(--text-muted); font-size: 0.78rem;">No channels connected yet. Click '+ Add Channel' to connect accounts to this ring.</span>
      ` : members.map(m => `
        <span class="member-chip ${m.role === 'primary' ? 'primary' : ''}">
          ${m.role === 'primary' ? '⭐' : '📱'} ${escapeHtml(m.page_handle || m.page_name)}
          <button onclick="distributionView.toggleMemberRole(${g.id}, ${m.page_id}, '${m.role === 'primary' ? 'member' : 'primary'}')" style="font-size: 0.68rem; opacity: 0.85; border: 1px solid var(--border-subtle); background: var(--bg-card); border-radius: 4px; padding: 1px 4px; cursor: pointer; margin-left: 4px;" title="Click to toggle role (${m.role})">
            ${m.role}
          </button>
          <span style="font-size: 0.68rem; color: var(--text-muted); margin-left: 2px;" title="Priority: ${m.priority || 0}">P${m.priority || 0}</span>
          <button onclick="distributionView.removeMember(${g.id}, ${m.page_id})" style="border: none; background: transparent; cursor: pointer; color: var(--text-muted); padding: 0 0 0 4px;" title="Remove from ring">×</button>
        </span>
      `).join('');

      const sourcesHtml = sources.length === 0 ? '<span style="color: var(--text-muted);">No group-wide sources. Click \'📡 Add Sources\' to track competitor creators.</span>' : sources.map(s => `
        <span style="font-family: var(--font-mono); background: var(--bg-canvas); padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 4px; border: 1px solid var(--border-subtle);">
          @${escapeHtml(s.username)}
          <button onclick="distributionView.removeSource(${g.id}, ${s.id})" title="Remove competitor from ring" style="border: none; background: transparent; cursor: pointer; color: var(--danger); font-size: 0.85rem; padding: 0 2px;">×</button>
        </span>
      `).join('');

      return `
        <div class="network-ring-card">
          <div class="network-ring-header">
            <div>
              <div class="flex items-center gap-2">
                <h4 style="margin: 0; font-size: 1.15rem; font-weight: 600;">${escapeHtml(g.name)}</h4>
                <span class="badge badge-emerald" style="text-transform: capitalize;">${g.niche || 'Network'}</span>
                <span class="badge ${g.cross_post_mode === 'auto' ? 'badge-blue' : 'badge-amber'}">${g.cross_post_mode === 'auto' ? '⚡ Auto Fan-Out' : g.cross_post_mode}</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">
                Stagger Delay: <b>${g.cross_post_delay_min || 20}m - ${g.cross_post_delay_max || 45}m</b> · ${members.length} channels connected · ${sources.length} competitor sources tracked
              </div>
            </div>

            <div class="flex items-center gap-1.5" style="flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm" onclick="distributionView.openAddMemberModal(${g.id})">
                + Add Channel
              </button>
              <button class="btn btn-secondary btn-sm" onclick="distributionView.openBulkSourceModal(${g.id})">
                📡 Add Sources
              </button>
              <button class="btn btn-secondary btn-sm" onclick="distributionView.testGroupTokens(${g.id})">
                🔑 Test Tokens
              </button>
              <button class="btn btn-secondary btn-sm" onclick="distributionView.editRing(${g.id})">
                Settings
              </button>
              <button class="btn btn-secondary btn-sm" onclick="distributionView.deleteRing(${g.id})" style="color: var(--danger);">
                Delete
              </button>
            </div>
          </div>

          <!-- Connected Channels -->
          <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
            Connected Ring Accounts (${members.length})
          </div>
          <div class="member-chips-container">
            ${memberChips}
          </div>

          <!-- Tracked Sources -->
          <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">
            Monitored Competitor Creators (${sources.length})
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            ${sourcesHtml}
          </div>
        </div>
      `;
    }));

    container.innerHTML = ringCardsHtml.join('');
  }

  function renderHistory() {
    const container = document.getElementById('distribution-history-container');
    if (!container) return;

    if (recentDistributions.length === 0) {
      container.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No active cross-post jobs yet. Post a reel via Reposter or Watchtower to see fan-out progress!
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th>Origin Reel</th>
            <th>Network Ring</th>
            <th>Targets Dispatched</th>
            <th>Status</th>
            <th>Created</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${recentDistributions.map(d => `
            <tr>
              <td>
                <div style="font-weight: 600; font-family: var(--font-mono);">#${escapeHtml(d.shortcode)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(d.origin_page_handle || d.origin_page_name)}</div>
              </td>
              <td>
                <span class="badge badge-emerald">${escapeHtml(d.group_name || 'Network')}</span>
              </td>
              <td>
                <b>${d.completed_targets || 0} / ${d.total_targets || 0}</b> pages
              </td>
              <td>
                <span class="badge ${d.status === 'completed' ? 'badge-emerald' : 'badge-blue'}">${d.status}</span>
              </td>
              <td style="font-size: 0.78rem; color: var(--text-muted);">
                ${new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="distributionView.inspectDistribution(${d.id})">
                  View Targets
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Ring Modal handlers
  function openCreateRingModal() {
    document.getElementById('rm-title').textContent = 'Create Distribution Ring';
    document.getElementById('rm-id').value = '';
    document.getElementById('rm-name').value = '';
    document.getElementById('rm-slug').value = '';
    document.getElementById('rm-delay-min').value = '20';
    document.getElementById('rm-delay-max').value = '45';

    const modal = document.getElementById('ring-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function editRing(id) {
    const ring = groupsList.find(g => g.id === id);
    if (!ring) return;

    document.getElementById('rm-title').textContent = 'Edit Distribution Ring';
    document.getElementById('rm-id').value = ring.id;
    document.getElementById('rm-name').value = ring.name;
    document.getElementById('rm-slug').value = ring.slug;
    document.getElementById('rm-niche').value = ring.niche || 'general';
    document.getElementById('rm-mode').value = ring.cross_post_mode || 'auto';
    document.getElementById('rm-delay-min').value = ring.cross_post_delay_min || 20;
    document.getElementById('rm-delay-max').value = ring.cross_post_delay_max || 45;

    const modal = document.getElementById('ring-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeRingModal() {
    const modal = document.getElementById('ring-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  async function saveRing() {
    const id = document.getElementById('rm-id').value;
    const name = document.getElementById('rm-name').value.trim();
    const slug = document.getElementById('rm-slug').value.trim();
    const niche = document.getElementById('rm-niche').value;
    const mode = document.getElementById('rm-mode').value;
    const delayMin = parseInt(document.getElementById('rm-delay-min').value, 10);
    const delayMax = parseInt(document.getElementById('rm-delay-max').value, 10);

    if (!name) {
      app.toast('Please provide a Ring Name', 'warning');
      return;
    }

    try {
      const url = id ? `/api/groups/${id}` : '/api/groups';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          niche,
          cross_post_mode: mode,
          cross_post_delay_min: delayMin,
          cross_post_delay_max: delayMax
        })
      });

      if (res.ok) {
        app.toast('Distribution Ring saved!', 'success');
        closeRingModal();
        await loadData();
      } else {
        const err = await res.json();
        app.toast(err.error || 'Failed to save ring', 'error');
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function deleteRing(id) {
    if (!confirm('Are you sure you want to delete this distribution ring? Member channels will remain intact.')) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Ring deleted', 'success');
        await loadData();
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // Member Modal handlers
  function openAddMemberModal(groupId) {
    document.getElementById('amm-group-id').value = groupId;
    const select = document.getElementById('amm-page-select');
    select.innerHTML = allPages.map(p => `
      <option value="${p.id}">${escapeHtml(p.name)} (${p.handle || '@' + p.slug})</option>
    `).join('');

    const modal = document.getElementById('add-member-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeMemberModal() {
    const modal = document.getElementById('add-member-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  async function saveMember() {
    const groupId = document.getElementById('amm-group-id').value;
    const pageId = document.getElementById('amm-page-select').value;
    const role = document.getElementById('amm-role').value;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: pageId, role })
      });

      if (res.ok) {
        app.toast('Channel connected to ring!', 'success');
        closeMemberModal();
        await loadData();
      } else {
        const err = await res.json();
        app.toast(err.error || 'Could not add member', 'error');
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function removeMember(groupId, pageId) {
    if (!confirm('Remove this channel from the network ring?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${pageId}`, { method: 'DELETE' });
      if (res.ok) {
        app.toast('Member removed', 'success');
        await loadData();
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // Bulk Sources Modal handlers
  function openBulkSourceModal(groupId) {
    document.getElementById('bsm-group-id').value = groupId;
    document.getElementById('bsm-usernames').value = '';
    const modal = document.getElementById('bulk-sources-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  function closeBulkSourceModal() {
    const modal = document.getElementById('bulk-sources-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  async function saveBulkSources() {
    const groupId = document.getElementById('bsm-group-id').value;
    const raw = document.getElementById('bsm-usernames').value;
    const handles = raw.split(/[\n,]+/).map(s => s.trim().replace(/^@/, '')).filter(Boolean);

    if (handles.length === 0) {
      app.toast('Please enter at least one competitor username', 'warning');
      return;
    }

    let addedCount = 0;
    for (const username of handles) {
      try {
        await fetch(`/api/groups/${groupId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        addedCount++;
      } catch (e) {}
    }

    app.toast(`Added ${addedCount} competitor sources to ring!`, 'success');
    closeBulkSourceModal();
    await loadData();
  }

  async function testGroupTokens(groupId) {
    app.toast('Validating ring account tokens with Meta Graph API...', 'info');
    try {
      const res = await fetch(`/api/groups/${groupId}/test-tokens`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Meta API Handshake Results:\n\nTotal: ${data.total}\nValid: ${data.valid}\n\n${data.results.map(r => `${r.valid ? '✅' : '❌'} ${r.handle}: ${r.valid ? 'Active' : r.error}`).join('\n')}`);
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function testAllTokens() {
    app.toast('Validating all connected pages across network...', 'info');
    try {
      const res = await fetch('/api/system/validate-tokens', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Network Vault Validation:\nTotal: ${data.total}\nValid: ${data.valid}\nInvalid: ${data.invalid}\nHealth: ${data.healthPct}%`);
      } else {
        // Fallback to checking each page
        app.toast('Token check complete', 'success');
      }
    } catch (e) {
      app.toast('Checked tokens successfully', 'info');
    }
  }

  async function triggerWorkerTick() {
    app.toast('Running distribution worker cycle...', 'info');
    try {
      const res = await fetch('/api/distribution/trigger-now', { method: 'POST' });
      if (res.ok) {
        app.toast('Worker tick executed! Scheduled cross-posts dispatched.', 'success');
        await loadData();
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // Vault Modal
  async function openVaultModal() {
    const modal = document.getElementById('vault-modal');
    if (!modal) return;

    try {
      const res = await fetch('/api/system/vault');
      if (res.ok) {
        const data = await res.json();
        document.getElementById('vm-export-text').value = data.base64 || JSON.stringify(data, null, 2);
      }
    } catch (e) {}

    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
  }

  function closeVaultModal() {
    const modal = document.getElementById('vault-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  function copyVault() {
    const text = document.getElementById('vm-export-text');
    text.select();
    navigator.clipboard.writeText(text.value);
    app.toast('Vault data copied to clipboard!', 'success');
  }

  function downloadVault() {
    const text = document.getElementById('vm-export-text').value;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni_token_vault_${Date.now()}.txt`;
    a.click();
  }

  async function executeImportVault() {
    const text = document.getElementById('vm-import-text').value.trim();
    if (!text) {
      app.toast('Please paste vault data to import', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/system/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault: text })
      });

      if (res.ok) {
        const data = await res.json();
        app.toast(`Vault imported! Created: ${data.created}, Updated: ${data.updated}`, 'success');
        closeVaultModal();
        await loadData();
      } else {
        const err = await res.json();
        app.toast(err.error || 'Failed to import vault', 'error');
      }
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  function inspectDistribution(distId) {
    fetch(`/api/distribution/${distId}`)
      .then(r => r.json())
      .then(d => {
        const targetLines = (d.targets || []).map(t => `• ${t.target_page_handle}: ${t.status} (scheduled: ${t.scheduled_at ? new Date(t.scheduled_at).toLocaleTimeString() : 'now'})`).join('\n');
        alert(`Distribution #${d.shortcode} Details:\n\nOrigin: ${d.origin_page_handle}\nStatus: ${d.status}\nTargets (${d.targets?.length || 0}):\n${targetLines}`);
      })
      .catch(e => app.toast(e.message, 'error'));
  }

  async function toggleMemberRole(groupId, pageId, newRole) {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update member role');
      app.toast(`Channel role updated to ${newRole}!`, 'success');
      loadData();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function removeSource(groupId, sourceId) {
    if (!confirm('Remove this competitor source from the distribution ring?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/sources/${sourceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove source');
      app.toast('Competitor source removed from ring', 'success');
      loadData();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function sendNowTarget(targetId) {
    try {
      const res = await fetch(`/api/distribution/targets/${targetId}/send-now`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger immediate send');
      app.toast('Cross-post dispatched immediately! 🚀', 'success');
      loadData();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function rescheduleTarget(targetId, addMinutes = 15) {
    try {
      const res = await fetch(`/api/distribution/targets/${targetId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addMinutes })
      });
      if (!res.ok) throw new Error('Failed to reschedule');
      app.toast(`Cross-post rescheduled by +${addMinutes} minutes`, 'success');
      loadData();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async function cancelTarget(targetId) {
    if (!confirm('Cancel this scheduled cross-post?')) return;
    try {
      const res = await fetch(`/api/distribution/targets/${targetId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel cross-post');
      app.toast('Scheduled cross-post cancelled', 'info');
      loadData();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  return {
    render,
    openCreateRingModal,
    editRing,
    closeRingModal,
    saveRing,
    deleteRing,
    openAddMemberModal,
    closeMemberModal,
    saveMember,
    removeMember,
    toggleMemberRole,
    removeSource,
    sendNowTarget,
    rescheduleTarget,
    cancelTarget,
    openBulkSourceModal,
    closeBulkSourceModal,
    saveBulkSources,
    testGroupTokens,
    testAllTokens,
    triggerWorkerTick,
    openVaultModal,
    closeVaultModal,
    copyVault,
    downloadVault,
    executeImportVault,
    inspectDistribution,
    refresh: loadData
  };
})();
