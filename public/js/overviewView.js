/**
 * OmniStudio AI — Instagram Dashboard Overview View
 * Real-time Instagram Ingestion, Intent Split, Publishing Metrics & Pipeline Activity
 */

const overviewView = {
  async render() {
    const container = document.getElementById('view-overview');
    if (!container) return;

    // Fetch live metrics and recent items
    let stats = {
      total_ingested: 0,
      direct_reposts: 0,
      lead_magnets: 0,
      published_posts: 0,
      staged_queue: 0,
      active_channels: 0
    };
    let bridgeInfo = { is_online: false, target_url: 'http://localhost:3000/api/agent/bridge' };
    let recentPosts = [];
    let llmInfo = {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      niche: 'AI Engineering & Hackathons'
    };

    try {
      const statsRes = await fetch('/api/overview/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        stats = { ...stats, ...statsData.stats };
        bridgeInfo = statsData.bridge_connection || bridgeInfo;
        recentPosts = statsData.recent_posts || [];
        llmInfo = {
          provider: statsData.default_provider || 'gemini',
          model: statsData.default_model || 'gemini-2.5-flash',
          niche: statsData.niche_domain || 'AI Engineering & Hackathons'
        };
      }
    } catch (err) {
      console.error('Error fetching overview data:', err);
    }

    container.innerHTML = `
      <!-- Top Stat Grid -->
      <div class="stat-grid">
        <div class="stat-card" style="cursor: pointer;" onclick="app.navigate('instagram-bot')" title="Click to view inbound ingestion diagnostics">
          <div class="stat-info">
            <div class="stat-label">Total Ingested Media</div>
            <div class="stat-val">${stats.total_ingested}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Reels & Carousels Ingested</div>
          </div>
          <div class="stat-icon" style="background: rgba(37, 99, 235, 0.1); color: #2563EB;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
        </div>

        <div class="stat-card" style="cursor: pointer;" onclick="app.navigate('instagram')" title="Click to view Direct Viral Reposts">
          <div class="stat-info">
            <div class="stat-label">⚡ Direct Viral Reposts</div>
            <div class="stat-val" style="color: #0288D1;">${stats.direct_reposts}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">No-DM Community Reposts</div>
          </div>
          <div class="stat-icon" style="background: rgba(2, 136, 209, 0.12); color: #0288D1;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
        </div>

        <div class="stat-card" style="cursor: pointer;" onclick="app.navigate('instagram')" title="Click to view DM Lead Magnets">
          <div class="stat-info">
            <div class="stat-label">🎯 DM Lead Magnets</div>
            <div class="stat-val" style="color: var(--accent-primary);">${stats.lead_magnets}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Armed with Keyword CTAs</div>
          </div>
          <div class="stat-icon" style="background: rgba(217, 119, 87, 0.12); color: var(--accent-primary);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
        </div>

        <div class="stat-card" style="cursor: pointer;" onclick="app.navigate('instagram')" title="Click to view published posts">
          <div class="stat-info">
            <div class="stat-label">🚀 Published to Instagram</div>
            <div class="stat-val" style="color: var(--success);">${stats.published_posts}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Meta Verified API & Microservice</div>
          </div>
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--success);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
        </div>
      </div>

      <!-- 5-Stage Interactive Autonomous Pipeline Map -->
      <div class="pipeline-card">
        <div class="pipeline-header">
          <div>
            <div class="section-label" style="color: #E1306C;">Autonomous Instagram Engine</div>
            <h3 style="margin-top: 0.2rem;">Inbound Share ➔ AI Intent Split ➔ Brand Stamping ➔ Meta Publish</h3>
          </div>
          <div class="badge ${bridgeInfo.is_online ? 'badge-armed' : 'badge-draft'}">
            ${bridgeInfo.is_online ? '🟢 InstaAuto Bridge Online (Port 3000)' : '🟡 InstaAuto Standalone'}
          </div>
        </div>

        <div class="pipeline-map">
          <!-- Step 1 -->
          <div class="pipeline-node completed" style="cursor: pointer;" onclick="app.navigate('instagram-bot')">
            <div class="node-circle" style="background: rgba(37, 99, 235, 0.15); border-color: #2563EB; color: #2563EB;">01</div>
            <div class="node-title">Inbound Share</div>
            <div class="node-desc">Telegram & Web URL</div>
          </div>

          <div class="pipeline-connector"></div>

          <!-- Step 2 -->
          <div class="pipeline-node completed" style="cursor: pointer;" onclick="app.navigate('settings')">
            <div class="node-circle" style="background: rgba(147, 51, 234, 0.15); border-color: #9333EA; color: #9333EA;">02</div>
            <div class="node-title">AI Intent Split</div>
            <div class="node-desc">Direct vs DM Magnet</div>
          </div>

          <div class="pipeline-connector"></div>

          <!-- Step 3 -->
          <div class="pipeline-node completed">
            <div class="node-circle" style="background: rgba(2, 136, 209, 0.15); border-color: #0288D1; color: #0288D1;">03</div>
            <div class="node-title">Brand & Audio</div>
            <div class="node-desc">@harshparmar007__ + Sound</div>
          </div>

          <div class="pipeline-connector"></div>

          <!-- Step 4 -->
          <div class="pipeline-node completed" style="cursor: pointer;" onclick="app.navigate('instagram')">
            <div class="node-circle" style="background: rgba(217, 119, 87, 0.15); border-color: var(--accent-primary); color: var(--accent-primary);">04</div>
            <div class="node-title">Staging Queue</div>
            <div class="node-desc">Ready to Post with Extraction (${stats.staged_queue})</div>
          </div>

          <div class="pipeline-connector"></div>

          <!-- Step 5 -->
          <div class="pipeline-node active" style="cursor: pointer;" onclick="app.navigate('instagram')">
            <div class="node-circle" style="background: var(--success-soft); border-color: var(--success); color: var(--success);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="node-title">Meta Verified</div>
            <div class="node-desc">Direct API Post</div>
          </div>
        </div>
      </div>

      <!-- Quick Launch & Recent Stream Grid -->
      <div class="grid-2">
        <!-- Quick Ingestion & AI Status Card -->
        <div class="card">
          <div class="section-label">Engine Controls</div>
          <h3 style="margin-top: 0.2rem; margin-bottom: 0.8rem;">Autonomous Studio Hub</h3>
          <p style="font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
            Ingest reels directly, inspect inbound triggers, review the queue, or tune the AI model and content niche.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
            <button class="btn btn-primary" style="justify-content: center; font-weight: 700;" onclick="app.openQuickShareModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              📥 Ingest Any Instagram Reel / Post
            </button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <button class="btn btn-secondary text-sm" onclick="app.navigate('instagram-bot')">
                <span>📱 Share-to-DM Bot</span>
              </button>
              <button class="btn btn-secondary text-sm" onclick="app.navigate('instagram')">
                <span>🎬 Studio Queue (${stats.staged_queue})</span>
              </button>
            </div>
          </div>

          <!-- Active AI Configuration Banner -->
          <div style="background: var(--bg-deep); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
              <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Active AI Intelligence</span>
              <a href="#settings" onclick="app.navigate('settings')" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: underline; font-weight: 600;">Edit Settings ⚙️</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.82rem;">
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">LLM Provider:</span>
                <span style="font-weight: 600; text-transform: capitalize;">${llmInfo.provider}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Model:</span>
                <span style="font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600; color: #2563EB;">${llmInfo.model}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Content Niche:</span>
                <span style="font-weight: 600; color: var(--accent-primary);">${llmInfo.niche}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Ingested & Published Instagram Posts Activity -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="section-label">Live Ingestion Feed</div>
              <h3 style="margin-top: 0.2rem;">Recent Instagram Activity</h3>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('instagram')">Open Full Queue →</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${recentPosts.length === 0 ? '<p class="text-muted text-sm" style="text-align: center; padding: 2rem;">No posts ingested yet. Click "Ingest Any Instagram Reel" or share a link in Telegram!</p>' : ''}
            ${recentPosts.map(post => {
              const hook = (post.hook_text || post.caption || 'Autonomous Ingested Reel').slice(0, 75).replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const isDirect = post.post_intent === 'direct_repost';
              const isPublished = post.status === 'published';
              return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-base); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="flex: 1; min-width: 0; margin-right: 0.75rem;">
                  <div style="font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">
                    ${hook}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.3rem; flex-wrap: wrap;">
                    <span class="type-badge type-${post.content_type || 'reel'}" style="font-size: 0.68rem; padding: 1px 6px;">
                      ${post.content_type === 'carousel' ? '🎠 Carousel' : '🎬 Reel'}
                    </span>
                    ${isDirect 
                      ? `<span class="badge" style="font-size: 0.65rem; font-weight: 800; background: rgba(2, 136, 209, 0.15); color: #0288D1; padding: 1px 6px; border-radius: 9999px;">⚡ Direct Repost</span>`
                      : `<span class="badge" style="font-size: 0.65rem; font-weight: 800; background: rgba(217, 119, 87, 0.15); color: var(--accent-primary); padding: 1px 6px; border-radius: 9999px;">🎯 DM: "${post.trigger_keyword || 'GUIDE'}"</span>`
                    }
                    <span class="badge" style="font-size: 0.65rem; font-weight: 700; background: ${isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${isPublished ? '#10B981' : '#F59E0B'}; padding: 1px 6px; border-radius: 9999px;">
                      ${isPublished ? '🟢 Published' : '🟡 Staged'}
                    </span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  ${post.ig_permalink ? `
                    <a href="${post.ig_permalink}" target="_blank" class="btn btn-secondary btn-sm" title="View live on Instagram" style="padding: 3px 8px; font-size: 0.75rem;">
                      🔗 View Post
                    </a>
                  ` : `
                    <button class="btn btn-secondary btn-sm" onclick="app.navigate('instagram')" title="View in Queue" style="padding: 3px 8px; font-size: 0.75rem;">
                      Queue
                    </button>
                  `}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
};

window.overviewView = overviewView;
