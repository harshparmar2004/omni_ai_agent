/**
 * OmniResearch AI — InstaAuto DM Engine (Core USP View)
 * Master Trigger Point & Lifecycle Automation Hub:
 * Connects published and staged reels with InstaAuto on Port 3000.
 *
 * Section 1: Live Posted Reels & DM Automation Sync Matrix
 * - 6 Core Pillars: Posted Reel URL, Authentic Resource Link, Media Count & Sizing,
 *   Trending Soundtrack, Repurposed Caption, Trigger Keyword.
 * - 1-Click Action: "Post Reel & Trigger InstaAuto"
 *
 * Section 2: Master Trigger Point & Bridge Configuration Hub
 * - Interactive Post-to-Automation Trigger Hub with 5-stage live execution tracker
 * - Outbound DM Copy Template & Port 3000 Ping Configuration
 * - Follower Comment-to-DM Handshake Simulator
 *
 * Section 3: Live Automation Lifecycle Events Stream
 * - Real-time audit log of all POST_AND_ARMED, COMMENT_MATCHED, and DM_DELIVERED events.
 */

const escapeHtml = window.escapeHtml || function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
window.escapeHtml = escapeHtml;

const instaAutoView = {
  data: {
    posts: [],
    count: 0,
    published_count: 0,
    armed_count: 0,
    bridge_url: 'http://localhost:3000/api/agent/bridge',
    auto_sync: true,
    dm_template: 'Hey {username}! 👋 Thanks for commenting on our reel. Here is the verified resource you requested: {deliverable_url} 🚀 Save this link and let us know if you need anything!'
  },
  events: [],
  viewMode: 'table', // 'table' or 'cards'
  filter: 'all', // 'all', 'published', 'armed', 'pending'
  searchTerm: '',
  selectedPostForTrigger: null,
  selectedPostForSimulation: null,
  isPinging: false,
  isTriggering: false,
  simLogLines: [],

  async render() {
    const container = document.getElementById('view-instaauto');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 1320px; margin: 0 auto; padding-bottom: 3.5rem;">
        <div id="instaauto-main-loading" style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div class="spinner-sm" style="margin: 0 auto 1rem; width: 28px; height: 28px; border-width: 3px;"></div>
          <div style="font-weight: 600; font-size: 1.05rem; color: var(--text-primary);">Loading InstaAuto DM Automation Engine...</div>
          <div style="font-size: 0.82rem; margin-top: 0.35rem;">Fetching live posted reels, extracted resource links, trigger points & events</div>
        </div>
      </div>
    `;

    await this.loadData();
    this.renderDashboard();
  },

  async loadData() {
    try {
      const [matrixRes, eventsRes] = await Promise.all([
        fetch('/api/instagram/instaauto/sync-matrix'),
        fetch('/api/instagram/instaauto/automation-events?limit=15').catch(() => ({ json: () => ({ events: [] }) }))
      ]);

      const matrixJson = await matrixRes.json();
      let eventsJson = { events: [] };
      try { eventsJson = await eventsRes.json(); } catch (e) {}

      if (matrixJson.success) {
        this.data = {
          posts: matrixJson.posts || [],
          count: matrixJson.count || 0,
          published_count: matrixJson.published_count || 0,
          armed_count: matrixJson.armed_count || 0,
          bridge_url: matrixJson.bridge_url || 'http://localhost:3000/api/agent/bridge',
          auto_sync: matrixJson.auto_sync !== false,
          dm_template: matrixJson.dm_template || this.data.dm_template
        };
      }
      this.events = eventsJson.events || [];
    } catch (e) {
      console.error('[InstaAuto] Failed loading sync matrix data:', e);
    }
  },

  renderDashboard() {
    const container = document.getElementById('view-instaauto');
    if (!container) return;

    // Filter posts
    let filtered = this.data.posts || [];
    if (this.filter === 'published') {
      filtered = filtered.filter(p => p.is_published);
    } else if (this.filter === 'armed') {
      filtered = filtered.filter(p => p.sync_armed);
    } else if (this.filter === 'pending') {
      filtered = filtered.filter(p => !p.sync_armed);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.hook_text && p.hook_text.toLowerCase().includes(q)) ||
        (p.trigger_keyword && p.trigger_keyword.toLowerCase().includes(q)) ||
        (p.caption && p.caption.toLowerCase().includes(q)) ||
        (p.deliverable_url && p.deliverable_url.toLowerCase().includes(q))
      );
    }

    if (!this.selectedPostForTrigger && this.data.posts.length > 0) {
      this.selectedPostForTrigger = this.data.posts[0];
    }
    if (!this.selectedPostForSimulation && this.data.posts.length > 0) {
      this.selectedPostForSimulation = this.data.posts[0];
    }

    container.innerHTML = `
      <div style="max-width: 1320px; margin: 0 auto; padding-bottom: 3.5rem;">
        
        <!-- Header Hero Banner -->
        <div class="card" style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 14px; padding: 1.5rem; margin-bottom: 1.75rem; position: relative; overflow: hidden;">
          <div style="position: absolute; right: -20px; top: -20px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%); pointer-events: none;"></div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.25rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                <span style="font-size: 1.5rem; line-height: 1;">⚡</span>
                <h1 style="font-size: 1.45rem; font-weight: 800; margin: 0; background: linear-gradient(90deg, #60A5FA, #A78BFA); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  InstaAuto DM Automation Engine — Core USP
                </h1>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px;">
                  PORT 3000 SYNCED
                </span>
              </div>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); max-width: 820px; line-height: 1.5;">
                Every Instagram reel and carousel published from OmniStudio automatically fires the <strong>Post-to-Automation Trigger Point</strong>. InstaAuto arms the Comment-to-DM delivery rule on Port 3000 with the exact live Reel URL, trigger keyword, authentic extracted resource link, and customized DM message.
              </p>
            </div>
            
            <div style="display: flex; gap: 0.65rem; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="instaAutoView.pingBridge()" id="btn-ping-bridge" style="display: flex; align-items: center; gap: 0.4rem;">
                <span class="pulse-dot" style="background: #10B981; width: 8px; height: 8px;"></span>
                <span>Ping Bridge</span>
              </button>
              <button class="btn btn-primary btn-sm" onclick="instaAutoView.syncAllPosts()" id="btn-sync-all" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; background: linear-gradient(135deg, #2563EB, #7C3AED);">
                <span>⚡ Sync All Posts to InstaAuto</span>
              </button>
            </div>
          </div>

          <!-- Quick Stats Pills -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.85rem; margin-top: 1.35rem; padding-top: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(59, 130, 246, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #3B82F6;">
                🎬
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Eligible Posts</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${this.data.count}</div>
              </div>
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #10B981;">
                ✅
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Live Published</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #10B981;">${this.data.published_count}</div>
              </div>
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(139, 92, 246, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #8B5CF6;">
                ⚡
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">InstaAuto Armed</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #8B5CF6;">${this.data.armed_count}</div>
              </div>
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #F59E0B;">
                📡
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Trigger Events</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #F59E0B;">${this.events.length} Logged</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 1: LIVE POSTED REELS & DM AUTOMATION SYNC MATRIX -->
        <div style="margin-bottom: 2.5rem;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.25rem;">📊</span>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                  Section 1: Live Posted Reels & DM Automation Sync Matrix
                </h2>
              </div>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: var(--text-muted);">
                Detailed column-based matrix tracking live Post URLs, extracted authentic resources, media sizes, tracked Instagram Media IDs, and trigger keywords.
              </p>
            </div>

            <!-- Filters, Search & View Switcher -->
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem;">
              <div class="search-input-wrapper" style="position: relative; width: 200px;">
                <input 
                  type="text" 
                  class="form-input" 
                  placeholder="Search keyword, url..." 
                  value="${escapeHtml(this.searchTerm)}"
                  oninput="instaAutoView.onSearchInput(this.value)"
                  style="font-size: 0.8rem; padding: 0.45rem 0.75rem 0.45rem 2rem; border-radius: 8px;"
                />
                <span style="position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); font-size: 0.85rem; color: var(--text-muted); pointer-events: none;">🔍</span>
              </div>

              <!-- Filter Pills -->
              <div style="display: flex; background: var(--bg-deep); padding: 2px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button 
                  class="btn btn-sm ${this.filter === 'all' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setFilter('all')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem;"
                >
                  All (${this.data.posts.length})
                </button>
                <button 
                  class="btn btn-sm ${this.filter === 'published' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setFilter('published')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem;"
                >
                  Published (${this.data.published_count})
                </button>
                <button 
                  class="btn btn-sm ${this.filter === 'armed' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setFilter('armed')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem;"
                >
                  Armed (${this.data.armed_count})
                </button>
                <button 
                  class="btn btn-sm ${this.filter === 'pending' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setFilter('pending')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem;"
                >
                  Pending (${this.data.posts.length - this.data.armed_count})
                </button>
              </div>

              <!-- View Mode Toggle -->
              <div style="display: flex; background: var(--bg-deep); padding: 2px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button 
                  class="btn btn-sm ${this.viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setViewMode('table')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem; display: flex; align-items: center; gap: 4px;"
                  title="Switch to Column Matrix Table"
                >
                  <span>📊 Matrix Table</span>
                </button>
                <button 
                  class="btn btn-sm ${this.viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}" 
                  onclick="instaAutoView.setViewMode('cards')"
                  style="padding: 0.35rem 0.65rem; font-size: 0.74rem; display: flex; align-items: center; gap: 4px;"
                  title="Switch to Card View"
                >
                  <span>🗂️ Cards</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Posts Matrix Content (Table default, or Cards) -->
          ${filtered.length === 0 ? `
            <div class="card" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📭</div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 1.05rem;">No Matching Reels Found</div>
              <div style="font-size: 0.85rem; margin-top: 0.25rem;">Stage or publish a reel with trigger keywords to populate the sync matrix.</div>
            </div>
          ` : (this.viewMode === 'cards' ? `
            <div style="display: flex; flex-direction: column; gap: 1.15rem;">
              ${filtered.map(post => this.renderPostMatrixCard(post)).join('')}
            </div>
          ` : this.renderMatrixTable(filtered))}
        </div>

        <!-- SECTION 2: MASTER TRIGGER POINT & LIVE AUTOMATION HUB -->
        <div style="margin-top: 2.5rem; margin-bottom: 2.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.25rem;">⚡</span>
            <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary);">
              Section 2: Master Trigger Point Hub & Comment-to-DM Handshake Simulator
            </h2>
          </div>
          <p style="margin: 0 0 1.25rem 0; font-size: 0.82rem; color: var(--text-muted);">
            Fire live post-to-automation triggers, test comment-to-DM handshakes, and manage your Port 3000 sister agent connection.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.35rem;">
            
            <!-- Box 1: Master Trigger Execution Card -->
            <div class="card" style="border: 1.5px solid rgba(59, 130, 246, 0.35); border-radius: 12px; padding: 1.35rem; background: var(--bg-card); display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.15rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.45rem;">
                  <span>🚀</span> Master Post-to-Automation Trigger Point
                </div>
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-size: 0.7rem; font-weight: 700;">
                  Live Execution Ready
                </span>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label" style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase;">
                  Target Reel to Post & Arm
                </label>
                <select 
                  id="trigger-target-select" 
                  class="form-input" 
                  onchange="instaAutoView.onTriggerSelectPost(this.value)" 
                  style="font-size: 0.84rem;"
                >
                  ${this.data.posts.map(p => `
                    <option value="${p.id}" ${this.selectedPostForTrigger && this.selectedPostForTrigger.id === p.id ? 'selected' : ''}>
                      #${p.id} [${escapeHtml(p.trigger_keyword || 'KEYWORD')}] ${escapeHtml(p.hook_text ? p.hook_text.substring(0, 42) : 'Post')}... (${p.status})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Active Parameters Summary -->
              ${this.selectedPostForTrigger ? `
                <div style="background: var(--bg-deep); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.85rem; font-size: 0.78rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                    <span style="color: var(--text-muted);">Reel Status:</span>
                    <span style="font-weight: 700; color: ${this.selectedPostForTrigger.is_published ? '#10B981' : '#3B82F6'};">${this.selectedPostForTrigger.is_published ? 'LIVE PUBLISHED' : 'READY TO POST (Will Publish)'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                    <span style="color: var(--text-muted);">Trigger Keyword:</span>
                    <span style="font-weight: 800; color: #F59E0B;">[${escapeHtml(this.selectedPostForTrigger.trigger_keyword || 'GUIDE')}]</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                    <span style="color: var(--text-muted);">Authentic Resource Link:</span>
                    <span style="font-weight: 600; color: #10B981; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(this.selectedPostForTrigger.deliverable_url || this.selectedPostForTrigger.pdf_url || 'https://devfolio.co/hackathons')}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">InstaAuto Status:</span>
                    <span style="font-weight: 700; color: ${this.selectedPostForTrigger.sync_armed ? '#A78BFA' : '#F59E0B'};">
                      ${this.selectedPostForTrigger.sync_armed ? `Armed (Rule #${this.selectedPostForTrigger.instaauto_rule_id || 104})` : 'Pending Trigger'}
                    </span>
                  </div>
                </div>
              ` : ''}

              <!-- 5-Stage Step Lights Tracker -->
              <div id="trigger-stepper-box" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.72rem;">
                <div style="font-weight: 700; color: var(--text-muted); margin-bottom: 0.45rem; text-transform: uppercase; letter-spacing: 0.04em;">
                  Trigger Execution Sequence:
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                  <div id="step-light-1" style="display: flex; align-items: center; gap: 0.5rem; color: #64748B;">
                    <span>⚪</span> <span>1. Verify / Publish Reel to Instagram (Obtain Media ID & Permalink)</span>
                  </div>
                  <div id="step-light-2" style="display: flex; align-items: center; gap: 0.5rem; color: #64748B;">
                    <span>⚪</span> <span>2. Attach Authentic Extracted Resource Link & Trigger Keyword</span>
                  </div>
                  <div id="step-light-3" style="display: flex; align-items: center; gap: 0.5rem; color: #64748B;">
                    <span>⚪</span> <span>3. Dispatch Handshake to InstaAuto Bridge (Port 3000)</span>
                  </div>
                  <div id="step-light-4" style="display: flex; align-items: center; gap: 0.5rem; color: #64748B;">
                    <span>⚪</span> <span>4. Arm Inbound Comment-to-DM Webhook Listener (Rule Registered)</span>
                  </div>
                  <div id="step-light-5" style="display: flex; align-items: center; gap: 0.5rem; color: #64748B;">
                    <span>⚪</span> <span>5. Broadcast Confirmation Alert to Telegram Admin</span>
                  </div>
                </div>
              </div>

              <!-- Main Trigger Fire Button -->
              <div style="margin-top: auto;">
                <button 
                  class="btn btn-primary" 
                  id="btn-fire-trigger" 
                  onclick="instaAutoView.executeMasterTrigger()" 
                  style="width: 100%; font-weight: 800; font-size: 0.95rem; padding: 0.75rem; background: linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #10B981 100%); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);"
                >
                  🚀 Fire Post & Auto-Trigger InstaAuto
                </button>
              </div>
            </div>

            <!-- Box 2: Live Comment Handshake Simulator -->
            <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 1.35rem; background: var(--bg-card); display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.15rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.45rem;">
                  <span>🔬</span> Comment-to-DM Handshake Simulator
                </div>
                <div class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818CF8; font-size: 0.72rem;">
                  Live API Simulation
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label" style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase;">
                  Select Target Reel to Simulate
                </label>
                <select 
                  id="sim-post-select" 
                  class="form-input" 
                  onchange="instaAutoView.onSimSelectPost(this.value)" 
                  style="font-size: 0.84rem;"
                >
                  ${this.data.posts.map(p => `
                    <option value="${p.id}" ${this.selectedPostForSimulation && this.selectedPostForSimulation.id === p.id ? 'selected' : ''}>
                      #${p.id} — [${escapeHtml(p.trigger_keyword || 'KEYWORD')}] ${escapeHtml(p.hook_text ? p.hook_text.substring(0, 42) : 'Post')}...
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label" style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase;">
                  Follower Comment Text
                </label>
                <input 
                  type="text" 
                  id="sim-comment-input" 
                  class="form-input" 
                  value="Hey love this! Please send me the ${this.selectedPostForSimulation ? (this.selectedPostForSimulation.trigger_keyword || 'GUIDE') : 'GUIDE'} link 🙏" 
                  style="font-size: 0.84rem;"
                />
              </div>

              <div style="display: flex; gap: 0.65rem; margin-bottom: 0.85rem;">
                <button class="btn btn-primary btn-sm" onclick="instaAutoView.runHandshakeSimulation()" style="flex: 1; font-weight: 700; background: linear-gradient(135deg, #2563EB, #10B981);">
                  🚀 Fire Comment Trigger
                </button>
                <button class="btn btn-secondary btn-sm" onclick="instaAutoView.clearSimLogs()">
                  Clear
                </button>
              </div>

              <!-- Terminal & Webhook Inspector Output -->
              <div style="flex: 1; background: #0B0F19; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 0.75rem; font-family: monospace; font-size: 0.73rem; color: #E2E8F0; overflow-y: auto; max-height: 195px;" id="sim-terminal-output">
                <div style="color: #64748B;">// Handshake Terminal ready. Press "Fire Comment Trigger" to test.</div>
                ${this.simLogLines.map(l => `<div>${l}</div>`).join('')}
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 3: LIVE AUTOMATION LIFECYCLE EVENTS STREAM -->
        <div style="margin-top: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">📜</span>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary);">
                Section 3: Live Automation Lifecycle Events Stream (${this.events.length})
              </h2>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="instaAutoView.refreshEvents()" style="font-size: 0.75rem; font-weight: 700;">
              🔄 Refresh Events
            </button>
          </div>

          <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 1.15rem; background: var(--bg-card);">
            ${this.events.length === 0 ? `
              <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.88rem;">
                No automation events recorded yet. Click <strong>"Fire Post & Auto-Trigger InstaAuto"</strong> above to launch your first automation lifecycle!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${this.events.map(ev => {
                  const isPostArmed = ev.event_type === 'POST_AND_ARMED';
                  const isDm = ev.event_type === 'DM_DISPATCHED';
                  const badgeColor = isPostArmed ? '#10B981' : (isDm ? '#8B5CF6' : '#3B82F6');
                  const badgeBg = isPostArmed ? 'rgba(16, 185, 129, 0.15)' : (isDm ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)');

                  return `
                    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; background: var(--bg-deep); padding: 0.75rem 0.95rem; border-radius: 8px; border: 1px solid var(--border-color);">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 0.68rem; padding: 3px 8px;">
                          ${escapeHtml(ev.event_type)}
                        </span>
                        <div>
                          <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                            <span>Post #${ev.post_id || 'N/A'}</span>
                            <span style="font-weight: 800; color: #F59E0B; background: rgba(245, 158, 11, 0.12); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem;">[${escapeHtml(ev.trigger_keyword || 'KEYWORD')}]</span>
                            <span style="color: var(--text-muted); font-size: 0.75rem;">Rule #${ev.rule_id || 104}</span>
                          </div>
                          <div style="font-size: 0.73rem; color: var(--text-secondary); margin-top: 0.15rem; word-break: break-all;">
                            ${ev.resource_url ? `Link: <a href="${escapeHtml(ev.resource_url)}" target="_blank" style="color: #10B981; font-weight: 600;">${escapeHtml(ev.resource_url)} ↗</a>` : ''}
                            ${ev.dm_message ? `<span style="color: var(--text-muted); margin-left: 0.5rem;">Message: "${escapeHtml(ev.dm_message.substring(0, 60))}..."</span>` : ''}
                          </div>
                        </div>
                      </div>

                      <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">
                        ${new Date(ev.created_at || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    `;
  },

  /**
   * Section 1: High-Density Column-Based Matrix Table System
   */
  renderMatrixTable(posts) {
    return `
      <div class="instaauto-matrix-container">
        <div class="instaauto-matrix-table-wrap">
          <table class="instaauto-matrix-table">
            <thead>
              <tr>
                <th style="width: 24%;">Reel &amp; Content Preview</th>
                <th style="width: 17%;">Tracked IDs &amp; Status</th>
                <th style="width: 14%;">Post URL</th>
                <th style="width: 11%;">Trigger Keyword</th>
                <th style="width: 14%;">Extracted Resource</th>
                <th style="width: 11%;">Media &amp; Audio</th>
                <th style="width: 9%; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${posts.map(post => this.renderMatrixRow(post)).join('')}
            </tbody>
          </table>
        </div>
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--bg-deep); border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-muted);">
          <span>Showing <strong>${posts.length}</strong> tracked posts in matrix</span>
          <span>Automatic Meta Webhook Tracking enabled via Instagram Media ID &bull; Port 3000 Sync</span>
        </div>
      </div>
    `;
  },

  renderMatrixRow(post) {
    const isArmed = post.sync_armed;
    const isPublished = post.is_published;
    const liveUrl = post.live_url || post.ig_permalink || (post.ig_media_id ? `https://www.instagram.com/p/${post.ig_media_id}/` : `https://www.instagram.com/reel/live_${post.id}/`);
    const resUrl = post.deliverable_url || post.pdf_url || '';
    const isPdf = post.is_pdf || (resUrl && (resUrl.endsWith('.pdf') || resUrl.includes('.pdf?')));
    
    // Clean domain extraction
    let domainLabel = 'Source Link';
    try {
      if (resUrl) {
        const u = new URL(resUrl);
        domainLabel = u.hostname.replace(/^www\./, '');
      }
    } catch (e) {
      domainLabel = 'External Link';
    }

    // Media sizing & count
    const mediaCount = post.media_count || (post.media_urls ? post.media_urls.length : 1);
    const isCarousel = post.content_type === 'carousel' || mediaCount > 1;
    const sizeSpec = isCarousel ? `1080x1350 (4:5) • ${mediaCount} slides` : '1080x1920 (9:16)';

    // Audio soundtrack
    const songTitle = post.trending_song_title || 'Viral Audio';

    // Keyword
    const keyword = (post.trigger_keyword || 'PROJECT').toUpperCase();

    // Thumbnail
    let thumb = post.thumbnail_url;
    if (!thumb && post.media_urls && post.media_urls.length > 0) {
      thumb = post.media_urls[0];
    }
    if (!thumb) thumb = '/generated/assets/brand_logo.svg';

    // Clean Post URL display
    let cleanUrlDisplay = 'instagram.com/reel/...';
    try {
      const u = new URL(liveUrl);
      const p = u.pathname.replace(/\/$/, '');
      cleanUrlDisplay = `instagram.com${p}`;
    } catch (e) {}

    const hook = post.hook_text || `Instagram Reel #${post.id}`;
    const mediaId = post.ig_media_id || '';

    return `
      <tr id="matrix-row-${post.id}">
        <!-- Col 1: Reel & Content Preview -->
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: var(--bg-deep); border: 1px solid var(--border-color); flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <img src="${escapeHtml(thumb)}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/generated/assets/brand_logo.svg'" />
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.84rem; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(hook)}">
                ${escapeHtml(hook)}
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem;">
                <span class="badge" style="font-size: 0.65rem; padding: 1px 6px; background: rgba(59, 130, 246, 0.1); color: #2563EB;">
                  ${isCarousel ? '🖼️ Carousel' : '🎬 Reel'}
                </span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">
                  #${post.id}
                </span>
              </div>
            </div>
          </div>
        </td>

        <!-- Col 2: Tracked IDs & Status -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <!-- Instagram Live Media ID Tracker -->
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              ${mediaId ? `
                <span class="tracked-id-chip" title="Instagram Live Media ID (Automatic Webhook Tracker)">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                  <span>${escapeHtml(mediaId)}</span>
                </span>
                <button 
                  class="btn btn-ghost btn-xs" 
                  onclick="instaAutoView.copyText('${escapeHtml(mediaId)}')" 
                  title="Copy Instagram Media ID" 
                  style="padding: 2px 5px; font-size: 0.68rem; color: var(--text-muted);"
                >
                  📋
                </button>
              ` : `
                <span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">
                  Pending Live ID
                </span>
              `}
            </div>

            <!-- Status Badges -->
            <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
              <span class="badge" style="font-size: 0.65rem; font-weight: 800; padding: 1px 6px; background: ${isPublished ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 130, 246, 0.14)'}; color: ${isPublished ? '#10B981' : '#3B82F6'};">
                ${isPublished ? 'LIVE' : 'READY'}
              </span>
              ${isArmed ? `
                <span class="badge" style="font-size: 0.65rem; font-weight: 800; padding: 1px 6px; background: rgba(139, 92, 246, 0.16); color: #8B5CF6; border: 1px solid rgba(139, 92, 246, 0.3);">
                  ⚡ ARMED #${post.instaauto_rule_id || 104}
                </span>
              ` : `
                <span class="badge" style="font-size: 0.65rem; font-weight: 700; padding: 1px 6px; background: rgba(245, 158, 11, 0.12); color: #D97706;">
                  PENDING
                </span>
              `}
            </div>
          </div>
        </td>

        <!-- Col 3: Live Post URL -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <a href="${escapeHtml(liveUrl)}" target="_blank" style="font-size: 0.75rem; font-family: monospace; color: #2563EB; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; max-width: 155px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(liveUrl)}">
              <span>${escapeHtml(cleanUrlDisplay)}</span>
              <span style="font-size: 0.7rem;">↗</span>
            </a>
            <button 
              class="btn btn-ghost btn-xs" 
              onclick="instaAutoView.copyText('${escapeHtml(liveUrl)}')" 
              style="padding: 1px 5px; font-size: 0.68rem; color: var(--text-muted); align-self: flex-start;"
            >
              📋 Copy Link
            </button>
          </div>
        </td>

        <!-- Col 4: Trigger Keyword -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.2rem;">
            <div>
              <span class="keyword-badge">[${escapeHtml(keyword)}]</span>
            </div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">
              Case-Insensitive
            </span>
          </div>
        </td>

        <!-- Col 5: Extracted Resource Link -->
        <td>
          ${resUrl ? `
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <a href="${escapeHtml(resUrl)}" target="_blank" class="resource-link-chip" title="${escapeHtml(resUrl)}">
                <span>🌐</span>
                <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(domainLabel)}</span>
                <span>↗</span>
              </a>
              <span style="font-size: 0.68rem; color: var(--text-muted);">
                ${isPdf ? '📄 Authentic PDF' : '🔗 Original Source'}
              </span>
            </div>
          ` : `
            <span style="color: var(--text-muted); font-size: 0.75rem;">—</span>
          `}
        </td>

        <!-- Col 6: Media Content Size & Audio -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <span class="media-size-pill">
              📐 ${sizeSpec}
            </span>
            <div style="font-size: 0.72rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(songTitle)}">
              <span>🎵</span>
              <span>${escapeHtml(songTitle)}</span>
            </div>
          </div>
        </td>

        <!-- Col 7: Action -->
        <td style="text-align: right;">
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
            <button 
              class="btn ${isArmed ? 'btn-secondary' : 'btn-primary'} btn-xs" 
              onclick="instaAutoView.triggerPostAutomation(${post.id})" 
              id="btn-trigger-${post.id}"
              style="font-size: 0.73rem; font-weight: 700; padding: 0.35rem 0.65rem; border-radius: 6px; white-space: nowrap; ${isArmed ? 'border-color: rgba(16, 185, 129, 0.4); color: #10B981;' : 'background: linear-gradient(135deg, #2563EB, #7C3AED);'}"
            >
              <span>${isArmed ? '⚡ Re-Arm' : '🚀 Post & Arm'}</span>
            </button>
            <button 
              class="btn btn-ghost btn-xs" 
              onclick="instaAutoView.quickSimulate(${post.id})" 
              style="font-size: 0.68rem; color: var(--text-muted); padding: 1px 5px;"
              title="Simulate Comment Handshake in Section 2"
            >
              🧪 Test DM
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderPostMatrixCard(post) {
    const isArmed = post.sync_armed;
    const isPublished = post.is_published;
    const liveUrl = post.live_url || post.ig_permalink || (post.ig_media_id ? `https://www.instagram.com/p/${post.ig_media_id}/` : `https://www.instagram.com/reel/live_${post.id}/`);
    const resUrl = post.deliverable_url || post.pdf_url || '';
    const isPdf = post.is_pdf || (resUrl && (resUrl.endsWith('.pdf') || resUrl.includes('.pdf?')));
    
    // Media sizing & count
    const mediaCount = post.media_count || (post.media_urls ? post.media_urls.length : 1);
    const isCarousel = post.content_type === 'carousel' || mediaCount > 1;
    const mediaBadge = isCarousel 
      ? `🖼️ Carousel (${mediaCount} Slides • 4:5 / 1:1)` 
      : `🎬 Vertical Video Reel (9:16 • 1080x1920)`;

    // Audio soundtrack
    const songTitle = post.trending_song_title || 'Viral Audio Track';
    const songArtist = post.trending_song_artist || 'Trending Creator';
    const audioVibe = post.audio_vibe || 'viral';

    // Keyword
    const keyword = (post.trigger_keyword || 'PLAYBOOK').toUpperCase();

    // Thumbnail
    let thumb = post.thumbnail_url;
    if (!thumb && post.media_urls && post.media_urls.length > 0) {
      thumb = post.media_urls[0];
    }
    if (!thumb) thumb = '/generated/assets/brand_logo.svg';

    return `
      <div class="card" style="border: 1px solid ${isArmed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.25)'}; border-radius: 12px; padding: 1.25rem; background: var(--bg-card); transition: transform 0.15s ease, border-color 0.15s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
        
        <!-- Top Row: Identification, Status Badges & Quick Action -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 42px; height: 42px; border-radius: 8px; overflow: hidden; background: var(--bg-deep); border: 1px solid var(--border-color); flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <img src="${escapeHtml(thumb)}" alt="Thumb" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/generated/assets/brand_logo.svg'" />
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span style="font-weight: 800; font-size: 0.96rem; color: var(--text-primary);">
                  ${escapeHtml(post.hook_text || `Instagram Reel #${post.id}`)}
                </span>
                <span class="badge" style="background: ${isPublished ? 'rgba(16, 185, 129, 0.18)' : 'rgba(59, 130, 246, 0.18)'}; color: ${isPublished ? '#10B981' : '#3B82F6'}; font-size: 0.68rem; font-weight: 800;">
                  ${isPublished ? 'LIVE PUBLISHED' : 'READY TO POST'}
                </span>
                ${isArmed ? `
                  <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.35); font-size: 0.68rem; font-weight: 800;">
                    ⚡ ARMED (Rule #${post.instaauto_rule_id || 104})
                  </span>
                ` : `
                  <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-size: 0.68rem; font-weight: 800;">
                    ⚠️ PENDING TRIGGER
                  </span>
                `}
              </div>
              <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.15rem; display: flex; gap: 0.75rem;">
                <span>ID: #${post.id}</span>
                <span>Type: ${escapeHtml(post.content_type || 'reel')}</span>
                <span>Created: ${new Date(post.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <!-- 1-Click Trigger / Sync Button -->
          <div style="display: flex; gap: 0.5rem;">
            <button 
              class="btn ${isArmed ? 'btn-secondary' : 'btn-primary'} btn-sm" 
              onclick="instaAutoView.triggerPostAutomation(${post.id})" 
              id="btn-trigger-${post.id}"
              style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.8rem; padding: 0.45rem 0.95rem; border-radius: 8px; ${isArmed ? 'border-color: rgba(16, 185, 129, 0.4); color: #10B981;' : 'background: linear-gradient(135deg, #2563EB, #7C3AED);'}"
            >
              <span>${isArmed ? '🔄 Re-Arm Automation' : '🚀 Post & Trigger InstaAuto'}</span>
            </button>
          </div>
        </div>

        <!-- 6 Core Parameter Pillars Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem;">
          
          <!-- Pillar 1: Posted Reel URL -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem;">
                <span>🔗</span> 1. Posted Reel URL
              </span>
              <a href="${escapeHtml(liveUrl)}" target="_blank" style="font-size: 0.7rem; color: #3B82F6; text-decoration: none; font-weight: 700;">
                Open Live ↗
              </a>
            </div>
            <div style="font-size: 0.78rem; font-family: monospace; color: var(--text-primary); word-break: break-all; background: rgba(0,0,0,0.25); padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              ${escapeHtml(liveUrl)}
            </div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.3rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Tracked Media ID: <code>${escapeHtml(post.ig_media_id || `Pending`)}</code></span>
              ${post.ig_media_id ? `<button class="btn btn-ghost btn-xs" onclick="instaAutoView.copyText('${escapeHtml(post.ig_media_id)}')" style="padding: 1px 4px; font-size: 0.65rem;">📋 Copy ID</button>` : ''}
            </div>
          </div>

          <!-- Pillar 2: Authentic Extracted Resource Link -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem;">
                <span>🌐</span> 2. Extracted Resource Link
              </span>
              <span class="badge" style="background: ${isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${isPdf ? '#EF4444' : '#60A5FA'}; font-size: 0.62rem; font-weight: 700;">
                ${isPdf ? 'Authentic PDF' : 'Original External Resource'}
              </span>
            </div>
            <div style="font-size: 0.78rem; font-family: monospace; color: #10B981; word-break: break-all; background: rgba(0,0,0,0.25); padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              ${resUrl ? `<a href="${escapeHtml(resUrl)}" target="_blank" style="color: #10B981; text-decoration: none; font-weight: 600;">${escapeHtml(resUrl)} ↗</a>` : '<span style="color: var(--text-muted);">No external deliverable attached</span>'}
            </div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.3rem;">
              Direct authentic resource delivered to user via DM
            </div>
          </div>

          <!-- Pillar 3: Media Count & Sizing -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
              <span>📐</span> 3. Media Count & Sizing
            </div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
              ${mediaBadge}
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary); font-size: 0.65rem;">
                ${mediaCount} item${mediaCount > 1 ? 's' : ''}
              </span>
              <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary); font-size: 0.65rem;">
                ${isCarousel ? '1080x1350 (4:5)' : '1080x1920 (9:16)'}
              </span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10B981; font-size: 0.65rem;">
                Uncropped 1080p
              </span>
            </div>
          </div>

          <!-- Pillar 4: Trending Soundtrack -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
              <span>🎵</span> 4. Trending Soundtrack
            </div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>${escapeHtml(songTitle)}</span>
              <span style="font-size: 0.72rem; font-weight: 400; color: var(--text-muted);">by ${escapeHtml(songArtist)}</span>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">
                ${escapeHtml(audioVibe)}
              </span>
            </div>
          </div>

          <!-- Pillar 5: Repurposed Caption & CTA -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem;">
                <span>📝</span> 5. Repurposed Caption
              </span>
              <button class="btn btn-ghost btn-xs" onclick="instaAutoView.copyText('${encodeURIComponent(post.caption || '')}')" style="font-size: 0.68rem; padding: 2px 6px;">
                Copy
              </button>
            </div>
            <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; max-height: 48px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${escapeHtml(post.caption || 'No caption available')}
            </div>
            <div style="font-size: 0.68rem; color: #60A5FA; margin-top: 0.3rem; font-weight: 600;">
              CTA: Comment "${escapeHtml(keyword)}" for direct link
            </div>
          </div>

          <!-- Pillar 6: Trigger Keyword Setup -->
          <div style="background: var(--bg-deep); padding: 0.75rem 0.85rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.35);">
            <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #A78BFA; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
              <span>🎯</span> 6. DM Trigger Keyword Setup
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <div style="font-size: 1.15rem; font-weight: 900; color: #F59E0B; background: rgba(245, 158, 11, 0.12); padding: 0.2rem 0.6rem; border-radius: 6px; letter-spacing: 0.06em; border: 1px solid rgba(245, 158, 11, 0.3);">
                ${escapeHtml(keyword)}
              </div>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-size: 0.65rem; font-weight: 700;">
                Case-Insensitive
              </span>
            </div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">
              Comment matcher: Exact + Natural Language ("send ${escapeHtml(keyword)}", "${escapeHtml(keyword)} please")
            </div>
          </div>

        </div>

      </div>
    `;
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.renderDashboard();
  },

  quickSimulate(postId) {
    const post = this.data.posts.find(p => p.id === postId);
    if (!post) return;
    this.selectedPostForSimulation = post;
    
    const select = document.getElementById('sim-target-select');
    if (select) select.value = String(postId);

    const commentInput = document.getElementById('sim-comment-input');
    if (commentInput) {
      commentInput.value = `Hey love this! Please send me the ${post.trigger_keyword || 'GUIDE'} link 🙏`;
    }

    const simSection = document.getElementById('trigger-stepper-box');
    if (simSection) {
      simSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    app.showToast(`Selected #${post.id} for comment handshake test`, 'info');
  },

  setFilter(filterName) {
    this.filter = filterName;
    this.renderDashboard();
  },

  onSearchInput(val) {
    this.searchTerm = val;
    this.renderDashboard();
  },

  onTriggerSelectPost(postId) {
    const post = this.data.posts.find(p => String(p.id) === String(postId));
    if (post) {
      this.selectedPostForTrigger = post;
      this.renderDashboard();
    }
  },

  onSimSelectPost(postId) {
    const post = this.data.posts.find(p => String(p.id) === String(postId));
    if (post) {
      this.selectedPostForSimulation = post;
      const commentInput = document.getElementById('sim-comment-input');
      if (commentInput) {
        commentInput.value = `Hey love this! Please send me the ${post.trigger_keyword || 'GUIDE'} link 🙏`;
      }
    }
  },

  /**
   * Master Trigger Point Execution: Posts reel and triggers InstaAuto comment-to-DM setup
   */
  async executeMasterTrigger() {
    const post = this.selectedPostForTrigger || this.data.posts[0];
    if (!post) {
      app.showToast('No post selected to trigger', 'error');
      return;
    }
    await this.triggerPostAutomation(post.id);
  },

  async triggerPostAutomation(postId) {
    const btn = document.getElementById('btn-fire-trigger');
    const matrixBtn = document.getElementById(`btn-trigger-${postId}`);

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="width: 14px; height: 14px; border-width: 2px;"></span> Executing Trigger Point...`;
    }
    if (matrixBtn) {
      matrixBtn.disabled = true;
      matrixBtn.innerHTML = `<span class="spinner-sm" style="width: 12px; height: 12px; border-width: 2px;"></span> Triggering...`;
    }

    const setStepLight = (stepNum, state) => {
      const el = document.getElementById(`step-light-${stepNum}`);
      if (el) {
        if (state === 'active') {
          el.style.color = '#38BDF8';
          el.firstElementChild.innerText = '🟡';
        } else if (state === 'completed') {
          el.style.color = '#10B981';
          el.firstElementChild.innerText = '✅';
        }
      }
    };

    setStepLight(1, 'active');

    try {
      setTimeout(() => { setStepLight(1, 'completed'); setStepLight(2, 'active'); }, 300);
      setTimeout(() => { setStepLight(2, 'completed'); setStepLight(3, 'active'); }, 600);
      setTimeout(() => { setStepLight(3, 'completed'); setStepLight(4, 'active'); }, 900);
      setTimeout(() => { setStepLight(4, 'completed'); setStepLight(5, 'active'); }, 1200);

      const res = await fetch('/api/instagram/instaauto/trigger-post-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });
      const data = await res.json();

      if (data.success) {
        setStepLight(5, 'completed');
        app.showToast(data.message, 'success');

        // Update local state
        const target = this.data.posts.find(p => p.id === postId);
        if (target) {
          target.sync_armed = true;
          target.is_published = true;
          target.status = 'published';
          target.instaauto_status = 'armed';
          target.instaauto_rule_id = data.rule_id;
          target.live_url = data.ig_permalink;
          target.ig_permalink = data.ig_permalink;
          if (data.ig_media_id) {
            target.ig_media_id = data.ig_media_id;
          }
        }
        this.data.armed_count = this.data.posts.filter(p => p.sync_armed).length;
        this.data.published_count = this.data.posts.filter(p => p.is_published).length;

        // Fetch refreshed events
        await this.refreshEvents();
        setTimeout(() => this.renderDashboard(), 800);
      } else {
        app.showToast(`Trigger failed: ${data.error}`, 'error');
        if (btn) btn.disabled = false;
        if (matrixBtn) matrixBtn.disabled = false;
      }
    } catch (err) {
      app.showToast(`Trigger error: ${err.message}`, 'error');
      if (btn) btn.disabled = false;
      if (matrixBtn) matrixBtn.disabled = false;
    }
  },

  async runHandshakeSimulation() {
    const post = this.selectedPostForSimulation || this.data.posts[0];
    if (!post) {
      app.showToast('No post available to simulate', 'error');
      return;
    }

    const commentInput = document.getElementById('sim-comment-input');
    const commentText = commentInput ? commentInput.value.trim() : `send ${post.trigger_keyword || 'GUIDE'}`;
    const keyword = (post.trigger_keyword || 'GUIDE').toUpperCase();
    const mediaId = post.ig_media_id || `media_${post.id}`;
    const commenter = '@alex_builds';

    this.simLogLines = [];
    const term = document.getElementById('sim-terminal-output');

    const log = (msg, color = '#E2E8F0') => {
      const ts = new Date().toLocaleTimeString();
      const line = `<span style="color: #64748B;">[${ts}]</span> <span style="color: ${color};">${msg}</span>`;
      this.simLogLines.push(line);
      if (term) {
        term.innerHTML = this.simLogLines.join('');
        term.scrollTop = term.scrollHeight;
      }
    };

    log(`[WEBHOOK INBOUND] Comment received on Media ID: ${mediaId}`, '#60A5FA');
    log(`Follower: ${commenter} commented: "${commentText}"`, '#94A3B8');

    try {
      const res = await fetch('/api/instagram/instaauto/simulate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          comment_text: commentText,
          username: commenter
        })
      });
      const data = await res.json();

      if (data.success) {
        setTimeout(() => {
          log(`[PATTERN MATCHER] Keyword "${keyword}" detected (confidence: ${data.match_confidence}, case-insensitive)`, '#F59E0B');
          setTimeout(() => {
            log(`[INSTAAUTO PORT 3000] Rule #${data.rule_id} triggered for Reel #${data.post_id}`, '#818CF8');
            log(`Authentic deliverable mapped: ${data.deliverable_url}`, '#34D399');
            setTimeout(() => {
              log(`[META GRAPH API] DM Dispatched to ${commenter}: "${data.dm_dispatched.substring(0, 65)}..."`, '#10B981');
              log(`[META GRAPH API] Public reply posted: "${data.public_reply}"`, '#38BDF8');
              log(`✅ HANDSHAKE COMPLETE — Automated DM Delivered Successfully!`, '#10B981');
              app.showToast(`⚡ Comment-to-DM Handshake Verified!`, 'success');
              this.refreshEvents();
            }, 300);
          }, 300);
        }, 200);
      } else {
        log(`[SIMULATION ERROR] ${data.error}`, '#EF4444');
      }
    } catch (e) {
      log(`[SIMULATION ERROR] ${e.message}`, '#EF4444');
    }
  },

  async refreshEvents() {
    try {
      const res = await fetch('/api/instagram/instaauto/automation-events?limit=15');
      const json = await res.json();
      if (json.success) {
        this.events = json.events || [];
      }
    } catch (e) {}
  },

  clearSimLogs() {
    this.simLogLines = [];
    const term = document.getElementById('sim-terminal-output');
    if (term) term.innerHTML = '<div style="color: #64748B;">// Handshake Terminal ready. Press "Fire Comment Trigger" to test.</div>';
  },

  async pingBridge() {
    const btn = document.getElementById('btn-ping-bridge');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="width: 12px; height: 12px; border-width: 2px;"></span> Pinging...`;
    }

    try {
      const res = await fetch('/api/instagram/instaauto/ping-bridge');
      const data = await res.json();
      if (data.online) {
        app.showToast(`InstaAuto Bridge is ONLINE (${data.latency_ms}ms latency)`, 'success');
      } else {
        app.showToast(`Bridge ping completed: Port 3000 mock listener ready (${data.latency_ms}ms)`, 'info');
      }
    } catch (e) {
      app.showToast(`Ping failed: ${e.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <span class="pulse-dot" style="background: #10B981; width: 8px; height: 8px;"></span>
          <span>Ping Bridge</span>
        `;
      }
    }
  },

  async syncAllPosts() {
    if (this.isSyncingAll) return;
    this.isSyncingAll = true;
    const btn = document.getElementById('btn-sync-all');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="width: 14px; height: 14px; border-width: 2px;"></span> Triggering all to Port 3000...`;
    }

    let successCount = 0;
    for (const post of this.data.posts) {
      try {
        const res = await fetch('/api/instagram/instaauto/trigger-post-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: post.id })
        });
        const d = await res.json();
        if (d.success) {
          post.sync_armed = true;
          post.is_published = true;
          post.status = 'published';
          post.instaauto_status = 'armed';
          post.instaauto_rule_id = d.rule_id;
          if (d.ig_media_id) post.ig_media_id = d.ig_media_id;
          if (d.ig_permalink) {
            post.live_url = d.ig_permalink;
            post.ig_permalink = d.ig_permalink;
          }
          successCount++;
        }
      } catch (e) {}
    }

    this.isSyncingAll = false;
    this.data.armed_count = this.data.posts.filter(p => p.sync_armed).length;
    this.data.published_count = this.data.posts.filter(p => p.is_published).length;
    app.showToast(`⚡ Successfully armed ${successCount} reels in InstaAuto!`, 'success');
    await this.refreshEvents();
    this.renderDashboard();
  },

  copyText(val) {
    if (!val) {
      app.showToast('Nothing to copy', 'info');
      return;
    }
    try {
      let text = String(val);
      try {
        text = decodeURIComponent(text);
      } catch (e) {
        text = String(val);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      app.showToast('Copied to clipboard!', 'success');
    } catch (e) {
      app.showToast('Failed to copy', 'error');
    }
  }
};

window.instaAutoView = instaAutoView;
