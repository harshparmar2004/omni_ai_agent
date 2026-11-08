/**
 * OmniStudio v8 — Agent 3: Video Studio & Pipeline Tracker
 * Unified hub for autonomous video styling, aspect ratio safe-zone guards,
 * OCR competitor stripping, contextual AI hook synthesis, realistic Instagram Reels preview,
 * and end-to-end stage telemetry.
 */
window.studioView = (function() {
  const DEFAULT_PRESETS = [
    {
      id: 'cinema',
      slug: 'movies',
      name: 'Movie Series 365',
      handle: '@movie_series_365',
      niche: 'Cinema & TV Series',
      primaryColor: '#F59E0B',
      badgeText: 'CINEMA PIC',
      logo: '/branding/movie_series_365_avatar.png',
      font: 'Cinzel / Inter',
      frameStyle: 'Golden Cinema Frame',
      hookSample: 'DUNE PART TWO: HOW DENIS VILLENEUVE DIRECTED THIS SCENE',
      description: 'Warm golden amber glow, compact cinema badge, and bold high-contrast headline for movie scenes & breakdowns.',
      features: ['Golden Glow Border', 'Compact Cinema Badge', 'Safe-Zone Padding', 'Competitor Watermark Stripping']
    },
    {
      id: 'neon',
      slug: 'clubbing',
      name: 'Clubbing Cult',
      handle: '@clubbingcult',
      niche: 'Nightlife & EDM / Rave',
      primaryColor: '#00FF66',
      badgeText: 'NIGHTLIFE',
      logo: '/branding/clubbingcult_avatar.png',
      font: 'Outfit / Sans',
      frameStyle: 'Cyberpunk Neon',
      hookSample: 'THE MOMENT CHARLOTTE DE WITTE DROPPED THIS UNRELEASED ID',
      description: 'Electric neon green glow, punchy rave typography, and high-energy festival atmosphere styling.',
      features: ['Electric Neon Green Glow', 'Rave Nightlife Badge', 'Safe-Zone Padding', 'Competitor Watermark Stripping']
    },
    {
      id: 'video_essay',
      slug: 'cult_information',
      name: 'Cult Information',
      handle: '@cult_information',
      niche: 'Deep Knowledge & Essays',
      primaryColor: '#E2E8F0',
      badgeText: 'DEEP LORE',
      logo: '/branding/cult_information_avatar.png',
      font: 'Plus Jakarta Sans',
      frameStyle: 'Editorial Minimalist',
      hookSample: 'WHY THE WEALTHIEST FAMILIES SECRETLY BOUGHT THIS LAND',
      description: 'Clean minimalist white editorial card with intellectual hook headline phrasing.',
      features: ['Editorial Clean Card', 'Intellectual Hook Phrasing', 'Safe-Zone Padding', 'Clean Neutral Glow']
    },
    {
      id: 'gta6',
      slug: 'gta6',
      name: 'GTA 6 Updates 007',
      handle: '@gta6_updates_007',
      niche: 'Gaming & GTA Leaks',
      primaryColor: '#FF007F',
      badgeText: 'LEAKS & INTEL',
      logo: '/branding/gta6_updates_007_avatar.png',
      font: 'Pricedown / Montserrat',
      frameStyle: 'Vice City Synthwave',
      hookSample: 'NEW GTA 6 MAP DETAIL LEAKED FROM ROCKSTAR SERVERS',
      description: 'Vice City neon pink glow, gaming title badge, and dynamic crest styling.',
      features: ['Vice City Magenta Neon', 'Gaming Title Badge', 'Safe-Zone Padding', 'Competitor Watermark Stripping']
    }
  ];

  let activeSubtab = 'studio'; // 'studio' | 'pipeline' | 'calibration'
  let presets = [...DEFAULT_PRESETS];
  let recentEdits = [];
  let activePresetId = 'cinema';
  let activePhoneMode = 'letterbox'; // 'letterbox' | 'full' | 'story'
  let activeReRenderJobId = null;
  let showSafeZoneGuides = false;
  let isLiked = false;
  let isPlaying = true;
  let customHookText = '';

  function renderPresetsHtml(presetList) {
    return (presetList || []).map(p => {
      const isSelected = p.id === activePresetId;
      return `
        <div class="card preset-card ${isSelected ? 'active' : ''}" onclick="studioView.selectPreset('${p.id}')" style="padding: 0.85rem; border-radius: 10px; border: ${isSelected ? `2px solid ${p.primaryColor}` : '1px solid var(--border-subtle)'}; background: var(--bg-canvas); cursor: pointer; transition: all 0.15s; ${isSelected ? `box-shadow: 0 0 12px ${p.primaryColor}33;` : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${p.logo || '/logos/default.png'}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);" onerror="this.src='/logos/default.png'; this.onerror=null;">
              <div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
                  ${escapeHtml(p.name)}
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">
                  ${escapeHtml(p.handle || '')}
                </div>
              </div>
            </div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${p.primaryColor}; border: 1px solid rgba(0,0,0,0.2); box-shadow: 0 0 6px ${p.primaryColor};"></div>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.35; margin-top: 4px;">
            ${escapeHtml(p.description)}
          </div>
          ${isSelected ? `
            <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; color: ${p.primaryColor};">
              ✓ Active Channel Preview
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Pipeline Tracker State (Stepper & Stage Deck matching Agent 1 & 2)
  let pipelineJobs = [];
  let pipelineStats = null;
  let pages = [];
  let pipelineViewMode = 'grid'; // 'grid' | 'table' | 'kanban'
  let activePipelineStage = 'styling'; // 'ingested' | 'download' | 'styling' | 'uploading' | 'published' | 'failed' | 'all'
  let pipelineFilterPageId = 'all';
  let pipelineSearchQuery = '';
  let activeDetailJobId = null;
  let autoRefreshTimer = null;

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
    const diff = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 15) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async function render(requestedSubtab = null) {
    if (requestedSubtab) {
      activeSubtab = requestedSubtab;
    }
    const container = document.getElementById('view-studio');
    if (!container) return;

    container.innerHTML = `
      <div class="studio-view-container" style="width: 100%; padding-bottom: 4rem;">
        
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
                Agent 3: Automated Video Editor & Styler
              </h2>
              <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10B981; font-weight: 700; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem;">
                Video Engine
              </span>
            </div>
            <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">
              Automatically cleans raw video, generates viral hook titles, and stamps your channel's branding before posting.
            </p>
          </div>

          <!-- Top Navigation Controls -->
          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <div class="btn-group" style="display: flex; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 2px;">
              <button class="btn btn-sm ${activeSubtab === 'studio' ? 'btn-primary' : 'btn-ghost'}" onclick="studioView.setSubtab('studio')" style="padding: 5px 12px; font-size: 0.8rem; font-weight: 600;">
                📱 Live Video Preview
              </button>
              <button class="btn btn-sm ${activeSubtab === 'pipeline' ? 'btn-primary' : 'btn-ghost'}" onclick="studioView.setSubtab('pipeline')" style="padding: 5px 12px; font-size: 0.8rem; font-weight: 600;">
                📊 Live Queue & Progress
              </button>
            </div>

            <button class="btn btn-primary btn-sm" onclick="studioView.openReRenderModal()">
              🎨 Re-Render a Reel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="studioView.refresh()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- SUBTAB 1: Studio & High-Fidelity Mobile Reel Player -->
        <div id="studio-subtab-studio" class="${activeSubtab === 'studio' ? '' : 'hidden'}">
          
          <!-- Beginner-Friendly Explainer Banner: How Agent 3 Works -->
          <div class="card mb-4" style="padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                  🎬 How Agent 3 Automatically Edits Your Reels
                </h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0 0;">
                  When a reel comes in from Telegram or competitor monitoring, Agent 3 transforms it in 3 automated steps:
                </p>
              </div>
              <span class="badge" style="font-size: 0.72rem; background: rgba(16, 185, 129, 0.12); color: #10B981; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
                ⚡ 100% Automated 3-Step Process
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
              
              <!-- Step 1 -->
              <div style="background: var(--bg-canvas); padding: 0.95rem; border-radius: 10px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 1.15rem;">✂️</span>
                  <div>
                    <div style="font-size: 0.68rem; font-weight: 800; color: #2563EB; text-transform: uppercase;">Step 1 · Clean Video</div>
                    <div style="font-weight: 700; font-size: 0.85rem;">Safe-Zone Framing & Watermark Masking</div>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                  Removes competitor tags and fits the video into Instagram's 9:16 safe area so captions, likes, and music tags never block the visuals.
                </div>
              </div>

              <!-- Step 2 -->
              <div style="background: var(--bg-canvas); padding: 0.95rem; border-radius: 10px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 1.15rem;">✨</span>
                  <div>
                    <div style="font-size: 0.68rem; font-weight: 800; color: #F59E0B; text-transform: uppercase;">Step 2 · Brand Identity</div>
                    <div style="font-weight: 700; font-size: 0.85rem;">AI Hook Headline & Page Logo</div>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                  AI generates a punchy, curiosity-driven headline on top and stamps your channel's original logo and glowing color theme.
                </div>
              </div>

              <!-- Step 3 -->
              <div style="background: var(--bg-canvas); padding: 0.95rem; border-radius: 10px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 1.15rem;">🚀</span>
                  <div>
                    <div style="font-size: 0.68rem; font-weight: 800; color: #10B981; text-transform: uppercase;">Step 3 · Render & Publish</div>
                    <div style="font-weight: 700; font-size: 0.85rem;">Fast 1080p MP4 & Auto-Post</div>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                  High-speed FFmpeg encodes the finished 1080p Reel in ~12 seconds, then publishes it directly to Instagram with tailored captions.
                </div>
              </div>

            </div>

            <!-- Helpful Interactive Callout -->
            <div style="margin-top: 0.85rem; padding: 0.6rem 0.85rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">💡</span>
              <span style="font-size: 0.78rem; color: var(--text-primary);">
                <strong>Interactive Simulator:</strong> Click any channel below to immediately preview how Agent 3 styles reels with that channel's real logo, colors, and title on the mobile phone!
              </span>
            </div>
          </div>

          <!-- Studio Main Deck: Live Configurator + Realistic Mobile Phone Preview -->
          <div style="display: grid; grid-template-columns: 1fr 380px; gap: 1.5rem; align-items: flex-start; margin-bottom: 2rem;">
            
            <!-- Left: Channel Selector & Customizer Controls -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              
              <!-- 1. Channel Selector -->
              <div class="card" style="padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                      Select Channel to Preview
                    </h3>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                      Click a channel to see its authentic logo, color theme, and template on the phone
                    </p>
                  </div>
                  <span class="badge" style="font-size: 0.7rem; background: var(--bg-canvas); color: var(--text-secondary); padding: 2px 8px; border-radius: 999px;">
                    ${presets.length} Channels
                  </span>
                </div>

                <div id="studio-presets-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem;">
                  ${renderPresetsHtml(presets)}
                </div>

                <div id="studio-preset-detail" style="margin-top: 1rem; padding: 0.85rem; background: var(--bg-canvas); border-radius: 8px; border: 1px solid var(--border-subtle);">
                  <!-- Preset details populated dynamically -->
                </div>
              </div>

              <!-- 2. Live Interactive Hook & Framing Playground -->
              <div class="card" style="padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                      Live Hook Title Sandbox
                    </h3>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                      Type any headline below to preview it live inside the mobile phone on the right
                    </p>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="studioView.synthesizeSampleHook()" style="font-size: 0.75rem; padding: 4px 10px; font-weight: 600;">
                    ✨ AI Hook Idea
                  </button>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label font-bold" style="font-size: 0.8rem;">Custom Reel Headline</label>
                  <input type="text" id="live-hook-input" class="form-input" placeholder="Type a headline or click 'AI Hook Idea'..." oninput="studioView.onLiveHookChange(this.value)" style="border-radius: 8px; font-size: 0.85rem; font-weight: 600;">
                </div>

                <!-- Display Mode Toggle -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem;">
                  <button class="btn btn-sm ${activePhoneMode === 'letterbox' ? 'btn-primary' : 'btn-secondary'}" onclick="studioView.setPhoneMode('letterbox')" style="padding: 5px 10px; font-size: 0.78rem;">
                    📱 Safe-Zone Letterbox (Top Hook)
                  </button>
                  <button class="btn btn-sm ${activePhoneMode === 'full' ? 'btn-primary' : 'btn-secondary'}" onclick="studioView.setPhoneMode('full')" style="padding: 5px 10px; font-size: 0.78rem;">
                    📱 Full 9:16 Vertical
                  </button>
                  <button class="btn btn-sm ${activePhoneMode === 'story' ? 'btn-primary' : 'btn-secondary'}" onclick="studioView.setPhoneMode('story')" style="padding: 5px 10px; font-size: 0.78rem;">
                    📸 Companion 9:16 Story
                  </button>
                </div>

                <!-- Safe Zone Toggle & Info -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-canvas); border-radius: 8px; border: 1px solid var(--border-subtle);">
                  <div style="font-size: 0.78rem; color: var(--text-secondary);">
                    <strong>Instagram Safe-Zone Guides:</strong> Highlights top 120px and bottom 240px to ensure zero collision with Reels buttons.
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600;">
                    <input type="checkbox" id="safe-zone-toggle" onchange="studioView.toggleSafeZones(this.checked)" style="accent-color: var(--accent-primary);">
                    Show Guides
                  </label>
                </div>

              </div>

            </div>

            <!-- Right: Realistic Instagram Reels Mobile Phone Player -->
            <div style="display: flex; flex-direction: column; align-items: center;">
              
              <!-- Smartphone Hardware Chassis -->
              <div class="smartphone-chassis" style="width: 330px; height: 680px; background: #0B0B0E; border-radius: 46px; border: 10px solid #28282E; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1); position: relative; overflow: hidden; display: flex; flex-direction: column; user-select: none;">
                
                <!-- Dynamic Island / Top Camera Punch Hole -->
                <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 90px; height: 22px; background: #000000; border-radius: 20px; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 8px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #111;"></div>
                  <div style="width: 7px; height: 7px; border-radius: 50%; background: #0a0a20; border: 1px solid #1a1a3a;"></div>
                </div>

                <!-- iOS Status Bar -->
                <div style="height: 40px; padding: 10px 22px 0 22px; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; font-weight: 600; color: #FFFFFF; z-index: 40;">
                  <span>9:41</span>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.55 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg>
                    <span style="font-size: 0.65rem;">5G</span>
                    <div style="width: 18px; height: 9px; border: 1px solid #FFF; border-radius: 3px; padding: 1px; display: flex; align-items: center;">
                      <div style="width: 100%; height: 100%; background: #FFF; border-radius: 1px;"></div>
                    </div>
                  </div>
                </div>

                <!-- Instagram Reels App Screen Container -->
                <div id="phone-screen-content" style="flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column;">
                  
                  <!-- Safe Zone Top Guide Overlay (Conditional) -->
                  <div id="guide-top" style="display: none; position: absolute; top: 0; left: 0; right: 0; height: 90px; background: rgba(220, 38, 38, 0.18); border-bottom: 1px dashed #DC2626; z-index: 35; pointer-events: none; padding: 4px; font-size: 0.6rem; color: #DC2626; font-weight: 700;">
                    Instagram Top UI Safe Zone (90px)
                  </div>

                  <!-- Safe Zone Bottom Guide Overlay (Conditional) -->
                  <div id="guide-bottom" style="display: none; position: absolute; bottom: 0; left: 0; right: 0; height: 160px; background: rgba(220, 38, 38, 0.18); border-top: 1px dashed #DC2626; z-index: 35; pointer-events: none; padding: 4px; font-size: 0.6rem; color: #DC2626; font-weight: 700;">
                    Instagram Bottom UI & Caption Zone (160px)
                  </div>

                  <!-- App Top Bar (Reels header) -->
                  <div id="ig-top-bar" style="padding: 6px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 30; color: #FFF;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 1.05rem; font-weight: 700; letter-spacing: -0.02em;">Reels</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <button onclick="studioView.toggleMute()" style="background: transparent; border: none; color: #FFF; cursor: pointer; padding: 0;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      </button>
                    </div>
                  </div>

                  <!-- MAIN VIDEO / CONTENT STAGE -->
                  <div id="ig-stage" style="flex: 1; position: relative; display: flex; flex-direction: column; overflow: hidden; background: #000;" onclick="studioView.togglePlay()">
                    
                    <!-- Mode A: Safe-Zone Letterbox (Top Hook Headline + Center Video) -->
                    <div id="stage-letterbox" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; position: relative; background: #08080C;">
                      
                      <!-- TOP SAFE ZONE: Hook Headline Card with Channel Branding -->
                      <div id="phone-hook-header" style="padding: 10px 14px 6px 14px; text-align: center; z-index: 10;">
                        <!-- Channel Logo & Name Badge -->
                        <div id="phone-brand-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.7); border: 1px solid #F59E0B; padding: 3px 10px 3px 6px; border-radius: 999px; margin-bottom: 6px; box-shadow: 0 0 12px rgba(245,158,11,0.35);">
                          <img id="phone-brand-logo-img" src="/logos/movie_series_365.jpg" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; border: 1px solid #FFF;" onerror="this.src='/logos/default.png'; this.onerror=null;">
                          <span id="phone-brand-tag" style="font-size: 0.62rem; font-weight: 800; color: #F59E0B; letter-spacing: 0.06em; text-transform: uppercase;">
                            MOVIE SERIES 365
                          </span>
                          <span id="phone-brand-pill" style="font-size: 0.52rem; font-weight: 700; background: #F59E0B; color: #000; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">
                            CINEMA PIC
                          </span>
                        </div>

                        <!-- Hook Headline -->
                        <div id="phone-hook-text" style="font-size: 0.88rem; font-weight: 800; color: #FFFFFF; line-height: 1.25; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.85); letter-spacing: -0.01em;">
                          DUNE PART TWO: HOW DENIS VILLENEUVE DIRECTED THIS SCENE
                        </div>
                      </div>

                      <!-- CENTER VIDEO BOX -->
                      <div id="phone-video-box" style="margin: 0 8px; flex: 1; max-height: 280px; background: #161622; border-radius: 8px; border: 1.5px solid #F59E0B; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
                        <div style="text-align: center; color: #888;">
                          <div id="play-ripple" style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 6px auto;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                          <div style="font-size: 0.72rem; color: #EEE; font-weight: 600;">Original Video Frame</div>
                          <div style="font-size: 0.62rem; color: #888;">1080x1350 Safe Ratio</div>
                        </div>
                        <!-- Video Progress Scrubber Bar -->
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.2);">
                          <div id="phone-progress-bar" style="width: 45%; height: 100%; background: #F59E0B;"></div>
                        </div>
                      </div>

                      <!-- BOTTOM WATERMARK STRIP (Masks competitor watermark) -->
                      <div id="phone-bottom-watermark" style="padding: 6px 14px 10px 14px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                        <span id="phone-watermark-text" style="font-size: 0.65rem; font-weight: 700; color: #888; font-family: var(--font-mono);">
                          @movie_series_365
                        </span>
                        <span id="phone-watermark-badge" class="badge" style="font-size: 0.58rem; background: rgba(245,158,11,0.15); color: #F59E0B; padding: 1px 6px; border-radius: 4px; font-weight: 700;">
                          ORIGINAL CURATION
                        </span>
                      </div>
                    </div>

                    <!-- Mode B: Full 9:16 Vertical Reel (Hidden by default) -->
                    <div id="stage-full" style="display: none; flex: 1; position: relative; background: #12131A; align-items: center; justify-content: center;">
                      <div style="text-align: center; color: #FFF;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                        <div style="font-weight: 700; font-size: 0.85rem;">Edge-to-Edge 9:16 Video</div>
                        <div style="font-size: 0.65rem; color: #AAA; margin-top: 2px;">Subtle brand watermark active</div>
                      </div>
                    </div>

                    <!-- Mode C: 9:16 Companion Story (Hidden by default) -->
                    <div id="stage-story" style="display: none; flex: 1; position: relative; background: linear-gradient(180deg, #1A1A24 0%, #0D0D12 100%); padding: 8px 12px; flex-direction: column;">
                      <!-- Segmented Story Bars -->
                      <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                        <div style="flex: 1; height: 2px; background: #FFF; border-radius: 2px;"></div>
                        <div style="flex: 1; height: 2px; background: rgba(255,255,255,0.3); border-radius: 2px;"></div>
                        <div style="flex: 1; height: 2px; background: rgba(255,255,255,0.3); border-radius: 2px;"></div>
                      </div>
                      <!-- Story Author Header -->
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <div style="width: 26px; height: 26px; border-radius: 50%; background: #00FF66; border: 1px solid #FFF;"></div>
                          <span style="font-size: 0.72rem; font-weight: 700; color: #FFF;" id="story-handle">clubbingcult</span>
                          <span style="font-size: 0.65rem; color: #AAA;">3h</span>
                        </div>
                        <span style="color: #FFF; font-size: 0.8rem; cursor: pointer;">✕</span>
                      </div>
                      <!-- Centered Story Card -->
                      <div style="flex: 1; margin: 0 auto; width: 90%; background: #000; border-radius: 12px; border: 1.5px solid #00FF66; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <div id="story-hook-text" style="font-size: 0.78rem; font-weight: 800; color: #FFF; margin-bottom: 12px; text-transform: uppercase;">
                          THE MOMENT CHARLOTTE DE WITTE DROPPED THIS UNRELEASED ID
                        </div>
                        <div style="width: 100%; height: 160px; background: #161622; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#00FF66"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                        <!-- Animated Tap Sticker -->
                        <div style="margin-top: 14px; background: #FFFFFF; color: #000; font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                          👆 TAP TO WATCH REEL
                        </div>
                      </div>
                      <!-- Story Footer Reply Pill -->
                      <div style="margin-top: 1rem; display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 32px; border: 1px solid rgba(255,255,255,0.4); border-radius: 999px; padding: 0 12px; display: flex; align-items: center; font-size: 0.68rem; color: #AAA;">
                          Send message...
                        </div>
                        <span style="font-size: 1rem; color: #FFF;">🤍</span>
                        <span style="font-size: 1rem; color: #FFF;">✈️</span>
                      </div>
                    </div>

                    <!-- INSTAGRAM REELS RIGHT ACTION RAIL (Authentic Icons) -->
                    <div id="ig-right-rail" style="position: absolute; right: 10px; bottom: 85px; display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 25;">
                      
                      <!-- Like Button -->
                      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="event.stopPropagation(); studioView.toggleLike();">
                        <svg id="reel-like-icon" width="24" height="24" viewBox="0 0 24 24" fill="${isLiked ? '#FF2D55' : 'none'}" stroke="${isLiked ? '#FF2D55' : '#FFFFFF'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        <span id="reel-like-count" style="font-size: 0.62rem; font-weight: 700; color: #FFF; margin-top: 2px;">184.2K</span>
                      </div>

                      <!-- Comments Button -->
                      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span style="font-size: 0.62rem; font-weight: 700; color: #FFF; margin-top: 2px;">1,429</span>
                      </div>

                      <!-- Share Paper Airplane -->
                      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        <span style="font-size: 0.62rem; font-weight: 700; color: #FFF; margin-top: 2px;">38.5K</span>
                      </div>

                      <!-- Bookmark / Save -->
                      <div style="cursor: pointer;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      </div>

                      <!-- More Menu -->
                      <div style="cursor: pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </div>

                      <!-- Rotating Vinyl Audio Disc -->
                      <div style="width: 26px; height: 26px; border-radius: 50%; background: #111; border: 2px solid #FFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(0,0,0,0.8); animation: spin 4s linear infinite;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #00FF66;" id="audio-disc-center"></div>
                      </div>

                    </div>

                    <!-- INSTAGRAM BOTTOM CREATOR RAIL -->
                    <div id="ig-bottom-rail" style="position: absolute; left: 12px; right: 65px; bottom: 12px; z-index: 25; color: #FFF; text-shadow: 0 1px 4px rgba(0,0,0,0.8);">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <div id="phone-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: #00FF66; border: 1.5px solid #FFF; flex-shrink: 0;"></div>
                        <span id="phone-author-handle" style="font-weight: 700; font-size: 0.82rem; letter-spacing: -0.01em;">
                          clubbingcult
                        </span>
                        <span style="font-size: 0.65rem; border: 1px solid rgba(255,255,255,0.7); padding: 1px 7px; border-radius: 6px; font-weight: 600;">Follow</span>
                      </div>

                      <div id="phone-caption-snippet" style="font-size: 0.72rem; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;">
                        The full crowd reaction when Charlotte dropped this ID. Comment if you were at the stage... <span style="color: #AAA;">more</span>
                      </div>

                      <!-- Audio Track Ticker -->
                      <div style="display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: #EEE;">
                        <span>♫</span>
                        <span id="phone-audio-ticker" style="font-family: var(--font-mono); font-size: 0.65rem;">Original Audio · clubbingcult</span>
                      </div>
                    </div>

                  </div>

                </div>

                <!-- Phone Bottom Home Indicator Bar -->
                <div style="height: 16px; background: #000; display: flex; align-items: center; justify-content: center;">
                  <div style="width: 110px; height: 4px; background: #FFFFFF; border-radius: 4px; opacity: 0.8;"></div>
                </div>

              </div>

              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.75rem; text-align: center;">
                Click anywhere on the reel to toggle play/pause simulation.
              </div>
            </div>

          </div>

          <!-- Recent Agent 3 Edited Reels Gallery -->
          <div class="card mb-4" style="padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
                  Recent Agent 3 Reel Renders
                </h3>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                  Audited reels with generated hook headlines, applied branding themes, and crop statuses
                </p>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="studioView.refresh()">
                Refresh Edits
              </button>
            </div>

            <div id="studio-recent-edits-container">
              <div style="color: var(--text-muted); font-size: 0.85rem; padding: 2rem; text-align: center;">Loading recent edits...</div>
            </div>
          </div>

        </div>

        <!-- SUBTAB 2: Merged Pipeline Tracker (Tappable Stepper & Dedicated Stage Deck matching Agent 1 & 2) -->
        <div id="studio-subtab-pipeline" class="${activeSubtab === 'pipeline' ? '' : 'hidden'}">
          
          <!-- 1. Top 6-Stage Visual Stepper Container -->
          <div class="pipeline-stepper-container" id="studio-stepper-container">
            ${renderStudioStepperHtml()}
          </div>

          <!-- 2. Dynamic Active Stage Inspection Deck -->
          <div id="studio-stage-deck">
            <div style="color: var(--text-muted); padding: 3rem; text-align: center;">Loading pipeline stage telemetries...</div>
          </div>

        </div>

      </div>

      <!-- Quick Re-Render Modal -->
      <div id="studio-rerender-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) studioView.closeReRenderModal()">
        <div class="modal-content" style="max-width: 540px; border-radius: 14px;">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Re-Render Reel with Agent 3</h3>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Restyle video frame, rewrite hook headline, or change branding theme</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="studioView.closeReRenderModal()" style="padding: 2px 8px;">✕</button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Select Target Job to Re-Render</label>
            <select id="srm-job-select" class="form-input" onchange="studioView.onReRenderJobSelect(this.value)">
              <option value="">-- Choose processed reel --</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Custom Eye-Catching Hook Headline</label>
            <textarea id="srm-hook-input" class="form-input" rows="2" placeholder="e.g. THE SECRET TECHNIQUE TOP PRODUCERS NEVER SHARE" style="font-size: 0.85rem;"></textarea>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Leave empty to let Agent 3 automatically synthesize a punchy hook from the reel context.</div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label font-bold" style="font-size: 0.8rem;">Branding Theme Preset</label>
            <select id="srm-theme-select" class="form-input">
              <option value="neon">Clubbing Cult Neon Green</option>
              <option value="video_essay">Editorial Video Essay (Cult Information)</option>
              <option value="cinema">Cinematic Movie Series</option>
              <option value="gta6">GTA 6 Vice City Neon</option>
              <option value="minimal">Minimalist Clean Brand</option>
            </select>
          </div>

          <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <button class="btn btn-secondary" onclick="studioView.closeReRenderModal()">Cancel</button>
            <button class="btn btn-primary" onclick="studioView.submitReRender()">
              🚀 Start Re-Render
            </button>
          </div>
        </div>
      </div>

      <!-- Job Timeline & Inspector Modal Drawer -->
      <div id="job-detail-modal" class="modal-overlay hidden" style="display: none;" onclick="if (event.target === this) studioView.closeJobDetail()">
        <div class="modal-content" style="max-width: 780px; width: 95%; max-height: 90vh; overflow-y: auto; border-radius: 14px;">
          <div class="flex items-center justify-between mb-3" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.85rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700;" id="jdm-title">Job Audit Trail</h3>
                <span id="jdm-status-badge" class="badge">--</span>
              </div>
              <div id="jdm-subtitle" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Pipeline job execution history
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="studioView.closeJobDetail()" style="padding: 2px 8px;">✕</button>
          </div>

          <div id="jdm-content-body">
            <div style="color: var(--text-muted); padding: 2rem; text-align: center;">Loading timeline events...</div>
          </div>
        </div>
      </div>
    `;

    await loadStudioData();
    await loadPipelineData();
    if (activeSubtab === 'pipeline') {
      const stepper = document.getElementById('studio-stepper-container');
      if (stepper) stepper.innerHTML = renderStudioStepperHtml();
      renderActiveStageDeck();
      setTimeout(() => triggerStudioFlowAnimation(), 120);
    }
    startAutoRefresh();
  }

  function setSubtab(subtab) {
    activeSubtab = subtab;
    const tabStudio = document.getElementById('studio-subtab-studio');
    const tabPipeline = document.getElementById('studio-subtab-pipeline');

    if (tabStudio) {
      if (subtab === 'studio') tabStudio.classList.remove('hidden');
      else tabStudio.classList.add('hidden');
    }
    if (tabPipeline) {
      if (subtab === 'pipeline') tabPipeline.classList.remove('hidden');
      else tabPipeline.classList.add('hidden');
    }

    // Update button states
    document.querySelectorAll('.studio-view-container .btn-group button').forEach(btn => {
      if ((subtab === 'studio' && btn.textContent.includes('Studio')) ||
          (subtab === 'pipeline' && btn.textContent.includes('Pipeline'))) {
        btn.className = 'btn btn-sm btn-primary';
      } else {
        btn.className = 'btn btn-sm btn-ghost';
      }
    });

    if (subtab === 'pipeline') {
      const stepper = document.getElementById('studio-stepper-container');
      if (stepper) stepper.innerHTML = renderStudioStepperHtml();
      renderActiveStageDeck();
      setTimeout(() => triggerStudioFlowAnimation(), 120);
    }
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
      if (document.body.getAttribute('data-page') === 'studio') {
        loadStudioData(true);
        loadPipelineData(true);
      }
    }, 15000);
  }

  async function loadStudioData(silent = false) {
    // 1. Immediately render fallback channel presets into DOM
    renderPresets(presets);
    selectPreset(activePresetId);

    // 2. Fetch API asynchronously without blocking UI
    try {
      const presetsRes = await fetch('/api/studio/presets');
      if (presetsRes.ok) {
        const pData = await presetsRes.json();
        if (pData.presets && pData.presets.length > 0) {
          presets = DEFAULT_PRESETS.map(dp => {
            const match = pData.presets.find(bp => bp.id === dp.id || bp.slug === dp.slug);
            return match ? { ...dp, ...match, logo: dp.logo, badgeText: dp.badgeText } : dp;
          });
          renderPresets(presets);
          selectPreset(activePresetId);
        }
      }
    } catch (e) {
      if (!silent) console.warn('[Studio Presets Fetch]', e.message);
    }

    try {
      const recentRes = await fetch('/api/studio/recent');
      if (recentRes.ok) {
        const rData = await recentRes.json();
        recentEdits = rData.recent || rData.jobs || [];
        renderRecentEdits(recentEdits);
      }
    } catch (e) {
      if (!silent) console.warn('[Studio Recent Fetch]', e.message);
    }

    try {
      const jobsRes = await fetch('/api/jobs?limit=30');
      if (jobsRes.ok) {
        const jobsList = await jobsRes.json();
        if (typeof populateJobSelect === 'function') {
          populateJobSelect(jobsList);
        }
      }
    } catch (e) {
      if (!silent) console.warn('[Studio Jobs Fetch]', e.message);
    }
  }

  async function loadPipelineData(silent = false) {
    try {
      const [statsRes, jobsRes, pagesRes] = await Promise.all([
        fetch('/api/pipeline/stats'),
        fetch(`/api/pipeline/jobs?limit=50&search=${encodeURIComponent(pipelineSearchQuery)}`),
        fetch('/api/pages')
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        pipelineStats = sData.stats || sData;
      }

      if (pagesRes.ok) {
        pages = await pagesRes.json();
      }

      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        pipelineJobs = jData.jobs || [];
        if (activeSubtab === 'pipeline') {
          const stepper = document.getElementById('studio-stepper-container');
          if (stepper) stepper.innerHTML = renderStudioStepperHtml();
          renderActiveStageDeck();
        }
      }
    } catch (err) {
      if (!silent) console.error('[Studio loadPipelineData error]:', err);
    }
  }

  function renderPresets(presetList) {
    const grid = document.getElementById('studio-presets-grid');
    if (!grid) return;
    grid.innerHTML = renderPresetsHtml(presetList);
  }

  function selectPreset(presetId) {
    activePresetId = presetId;
    const p = presets.find(item => item.id === presetId) || presets[0];
    if (!p) return;

    // Highlight card
    renderPresets(presets);

    // Update preset detail box
    const detail = document.getElementById('studio-preset-detail');
    if (detail) {
      detail.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>${escapeHtml(p.name)} Branding Setup</span>
              <span class="badge" style="font-size: 0.65rem; background: ${p.primaryColor}22; color: ${p.primaryColor}; font-weight: 700; border-radius: 4px;">${escapeHtml(p.badgeText || 'ACTIVE')}</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(p.description)}</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <span class="badge" style="font-size: 0.68rem; background: rgba(255,255,255,0.06); color: var(--text-secondary); padding: 2px 6px;">
              ${escapeHtml(p.font || 'Default Sans')}
            </span>
            <span class="badge" style="font-size: 0.68rem; background: rgba(255,255,255,0.06); color: var(--text-secondary); padding: 2px 6px;">
              ${escapeHtml(p.frameStyle || 'Branded Border')}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 0.5rem;">
          ${(p.features || []).map(f => `
            <span style="font-size: 0.68rem; font-weight: 500; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 2px 6px; border-radius: 999px; color: var(--text-secondary);">
              ✓ ${escapeHtml(f)}
            </span>
          `).join('')}
        </div>
      `;
    }

    // Update realistic phone preview
    updatePhoneMockup(p);
  }

  function updatePhoneMockup(p) {
    if (!p) return;
    const brandBadge = document.getElementById('phone-brand-badge');
    const brandLogoImg = document.getElementById('phone-brand-logo-img');
    const brandTag = document.getElementById('phone-brand-tag');
    const brandPill = document.getElementById('phone-brand-pill');
    const hookText = document.getElementById('phone-hook-text');
    const videoBox = document.getElementById('phone-video-box');
    const progressBar = document.getElementById('phone-progress-bar');
    const watermarkText = document.getElementById('phone-watermark-text');
    const watermarkBadge = document.getElementById('phone-watermark-badge');
    const authorHandle = document.getElementById('phone-author-handle');
    const audioTicker = document.getElementById('phone-audio-ticker');
    const audioDiscCenter = document.getElementById('audio-disc-center');
    const avatar = document.getElementById('phone-avatar');
    const avatarImg = document.getElementById('phone-avatar-img');
    const storyHandle = document.getElementById('story-handle');
    const storyHook = document.getElementById('story-hook-text');
    const liveHookInput = document.getElementById('live-hook-input');

    const handle = p.handle ? p.handle.replace(/^@/, '') : 'movie_series_365';
    const brandName = p.name ? p.name.toUpperCase() : 'MOVIE SERIES 365';
    const hook = customHookText || p.hookSample || 'DUNE PART TWO: HOW DENIS VILLENEUVE DIRECTED THIS SCENE';
    const color = p.primaryColor || '#F59E0B';

    if (liveHookInput && !customHookText) {
      liveHookInput.placeholder = p.hookSample || 'Type a reel headline...';
    }

    if (brandBadge) {
      brandBadge.style.borderColor = color;
      brandBadge.style.boxShadow = `0 0 12px ${color}55`;
    }
    if (brandLogoImg) {
      brandLogoImg.src = p.logo || '/logos/default.png';
      brandLogoImg.style.display = 'block';
    }
    if (brandTag) {
      brandTag.style.color = color;
      brandTag.textContent = brandName;
    }
    if (brandPill) {
      brandPill.textContent = p.badgeText || 'OFFICIAL';
      brandPill.style.background = color;
      brandPill.style.color = (color === '#E2E8F0' || color === '#00FF66' || color === '#F59E0B') ? '#000000' : '#FFFFFF';
    }
    if (hookText) {
      hookText.textContent = hook.toUpperCase();
    }
    if (videoBox) {
      videoBox.style.borderColor = color;
      videoBox.style.boxShadow = `0 4px 20px rgba(0,0,0,0.6), 0 0 10px ${color}33`;
    }
    if (progressBar) {
      progressBar.style.background = color;
    }
    if (watermarkText) {
      watermarkText.textContent = `@${handle}`;
    }
    if (watermarkBadge) {
      watermarkBadge.style.color = color;
      watermarkBadge.style.background = `${color}22`;
    }
    if (authorHandle) {
      authorHandle.textContent = handle;
    }
    if (avatar) {
      avatar.style.background = color;
    }
    if (avatarImg) {
      avatarImg.src = p.logo || '/logos/default.png';
      avatarImg.style.display = 'block';
    }
    if (storyHandle) {
      storyHandle.textContent = handle;
    }
    if (storyHook) {
      storyHook.textContent = hook.toUpperCase();
    }
    if (audioTicker) {
      audioTicker.textContent = `Original Audio · ${handle}`;
    }
    if (audioDiscCenter) {
      audioDiscCenter.style.background = color;
    }
  }

  function setPhoneMode(mode) {
    activePhoneMode = mode;
    const stageLetterbox = document.getElementById('stage-letterbox');
    const stageFull = document.getElementById('stage-full');
    const stageStory = document.getElementById('stage-story');
    const igTopBar = document.getElementById('ig-top-bar');
    const igRightRail = document.getElementById('ig-right-rail');
    const igBottomRail = document.getElementById('ig-bottom-rail');

    if (stageLetterbox) stageLetterbox.style.display = mode === 'letterbox' ? 'flex' : 'none';
    if (stageFull) stageFull.style.display = mode === 'full' ? 'flex' : 'none';
    if (stageStory) stageStory.style.display = mode === 'story' ? 'flex' : 'none';

    // Show/hide Reels UI rails depending on story vs reel mode
    const isStory = mode === 'story';
    if (igTopBar) igTopBar.style.display = isStory ? 'none' : 'flex';
    if (igRightRail) igRightRail.style.display = isStory ? 'none' : 'flex';
    if (igBottomRail) igBottomRail.style.display = isStory ? 'none' : 'flex';
  }

  function toggleSafeZones(checked) {
    showSafeZoneGuides = checked;
    const gTop = document.getElementById('guide-top');
    const gBottom = document.getElementById('guide-bottom');
    if (gTop) gTop.style.display = checked ? 'block' : 'none';
    if (gBottom) gBottom.style.display = checked ? 'block' : 'none';
  }

  function toggleLike() {
    isLiked = !isLiked;
    const icon = document.getElementById('reel-like-icon');
    const count = document.getElementById('reel-like-count');
    if (icon) {
      icon.setAttribute('fill', isLiked ? '#FF2D55' : 'none');
      icon.setAttribute('stroke', isLiked ? '#FF2D55' : '#FFFFFF');
    }
    if (count) {
      count.textContent = isLiked ? '184.3K' : '184.2K';
    }
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    const ripple = document.getElementById('play-ripple');
    if (ripple) {
      ripple.style.transform = 'scale(1.25)';
      ripple.style.opacity = '1';
      setTimeout(() => {
        ripple.style.transform = 'scale(1)';
        ripple.style.opacity = isPlaying ? '0.2' : '0.8';
      }, 200);
    }
  }

  function toggleMute() {
    window.app?.toast('Audio simulation toggled', 'info');
  }

  function onLiveHookChange(val) {
    customHookText = val.trim();
    const p = presets.find(item => item.id === activePresetId) || presets[0] || {};
    updatePhoneMockup(p);
  }

  function synthesizeSampleHook() {
    const p = presets.find(item => item.id === activePresetId) || presets[0] || {};
    let samples = [];

    if (p.id === 'cinema') {
      samples = [
        'DUNE PART TWO: HOW DENIS VILLENEUVE DIRECTED THIS SCENE',
        'THE IMPROVISED LINE THAT MADE THIS THE BEST TAKE IN FILM HISTORY',
        'THE CHILLING DETAIL EVERYONE MISSED IN THIS SCENE',
        'WHY THIS 4-MINUTE SCENE TOOK 6 MONTHS TO REHEARSE',
        'THE PSYCHOLOGICAL SECRET BEHIND THIS VILLAIN\'S PERFORMANCE'
      ];
    } else if (p.id === 'neon') {
      samples = [
        'THE MOMENT CHARLOTTE DE WITTE DROPPED THIS UNRELEASED ID',
        'THE 3-SECOND TRANSITION THAT SHOCKED THE WHOLE FESTIVAL',
        'WHY EVERYONE IN THE CROWD FROZE AT THIS EXACT DROP',
        'THE SECRET SYNTH PLUCK TOP PRODUCERS WON\'T REVEAL',
        'HOW THIS DJ SAVED THE ENTIRE NIGHT WITH ONE RECORD'
      ];
    } else if (p.id === 'video_essay') {
      samples = [
        'WHY THE WEALTHIEST FAMILIES SECRETLY BOUGHT THIS LAND',
        'THE UNTOLD HISTORICAL DISCOVERY THAT BAFFLED ARCHAEOLOGISTS',
        'THE FORGOTTEN EXPERIMENT THAT SCIENTISTS STILL CAN\'T EXPLAIN',
        'WHAT REALLY HAPPENED INSIDE THIS CLASSIFIED VAULT',
        'THE MATHEMATICAL PARADOX THAT BROKE PHILOSOPHERS'
      ];
    } else if (p.id === 'gta6') {
      samples = [
        'NEW GTA 6 MAP DETAIL LEAKED FROM ROCKSTAR SERVERS',
        'THE DETAIL ROCKSTAR HID IN PLAIN SIGHT IN THE TRAILER',
        'WHY LEONIDA\'S MAP IS 3X BIGGER THAN ANYONE EXPECTED',
        'THE SECRET SUB-PLOT CONNECTING TO VICE CITY CLASSIC',
        'CONFIRMED: THIS REAL PHYSICS ENGINE IS COMING TO GTA 6'
      ];
    } else {
      samples = [
        'THE UNEXPECTED MOMENT THAT CHANGED EVERYTHING',
        'WHY NOBODY TALKS ABOUT WHAT HAPPENED NEXT',
        'THE UNSEEN DETAIL THAT WENT COMPLETELY VIRAL'
      ];
    }

    const pick = samples[Math.floor(Math.random() * samples.length)];
    const input = document.getElementById('live-hook-input');
    if (input) input.value = pick;
    onLiveHookChange(pick);
    window.app?.toast?.(`Generated hook for ${p.name}!`, 'success');
  }

  function renderRecentEdits(edits) {
    const container = document.getElementById('studio-recent-edits-container');
    if (!container) return;

    if (edits.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; padding: 2.5rem; text-align: center;">
          No reels edited by Agent 3 yet. As incoming reels process, their before/after edits will display here.
        </div>
      `;
      return;
    }

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
    `;

    for (const edit of edits) {
      const hook = edit.hookHeadline || edit.hook_headline || 'Contextual hook headline generated by Agent 3';
      const theme = edit.theme || edit.edit_theme || 'neon';
      const shortcode = edit.shortcode || '--';
      const createdAt = edit.createdAt || edit.created_at;

      html += `
        <div class="card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-canvas);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-weight: 600; font-size: 0.78rem; font-family: var(--font-mono); color: var(--accent-primary);">
              #${edit.id} · ${escapeHtml(shortcode)}
            </span>
            <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(139, 92, 246, 0.12); color: #7C3AED;">
              ${escapeHtml(theme)}
            </span>
          </div>

          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; margin-bottom: 0.5rem; min-height: 38px;">
            "${escapeHtml(hook)}"
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); font-size: 0.72rem; color: var(--text-muted);">
            <span>${formatTimeAgo(createdAt)}</span>
            <button class="btn btn-secondary btn-sm" onclick="studioView.openReRenderModal(${edit.id})" style="padding: 2px 7px; font-size: 0.72rem;">
              Re-Render 🎨
            </button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function populateJobSelect(jobsList) {
    const sel = document.getElementById('srm-job-select');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Choose processed reel --</option>' +
      jobsList.map(j => {
        const hook = j.hook_headline || (j.caption ? j.caption.slice(0, 35) + '...' : 'Reel #' + j.id);
        return `<option value="${j.id}">#${j.id} · ${escapeHtml(hook)}</option>`;
      }).join('');
  }

  function openReRenderModal(jobId = null) {
    activeReRenderJobId = jobId;
    const modal = document.getElementById('studio-rerender-modal');
    const jobSel = document.getElementById('srm-job-select');

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }

    if (jobId && jobSel) {
      jobSel.value = jobId;
      onReRenderJobSelect(jobId);
    }
  }

  function closeReRenderModal() {
    activeReRenderJobId = null;
    const modal = document.getElementById('studio-rerender-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  function onReRenderJobSelect(jobId) {
    if (!jobId) return;
    const found = recentEdits.find(e => String(e.id) === String(jobId));
    const hookInput = document.getElementById('srm-hook-input');
    const themeSel = document.getElementById('srm-theme-select');

    if (found) {
      if (hookInput) hookInput.value = found.hookHeadline || found.hook_headline || '';
      if (themeSel) themeSel.value = found.theme || found.edit_theme || 'neon';
    }
  }

  async function submitReRender() {
    const jobSel = document.getElementById('srm-job-select');
    const hookInput = document.getElementById('srm-hook-input');
    const themeSel = document.getElementById('srm-theme-select');

    const jobId = jobSel ? jobSel.value : activeReRenderJobId;
    if (!jobId) {
      window.app?.toast('Please select a reel to re-render', 'warning');
      return;
    }

    const payload = {
      theme: themeSel ? themeSel.value : 'neon',
      customHook: hookInput ? hookInput.value.trim() : ''
    };

    try {
      const res = await fetch(`/api/studio/jobs/${jobId}/re-render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-render failed');

      window.app?.toast(`Re-render triggered for Job #${jobId}!`, 'success');
      closeReRenderModal();
      loadStudioData();
      loadPipelineData();
    } catch (err) {
      window.app?.toast(err.message, 'danger');
    }
  }

  // ==========================================
  // Integrated Pipeline Tracker Subsystem (Matching Agent 1 & 2 Stepper + Stage Deck)
  // ==========================================

  function calculateStageCounts() {
    let list = pipelineJobs;
    if (pipelineFilterPageId !== 'all') {
      list = list.filter(j => String(j.page_id) === String(pipelineFilterPageId));
    }
    return {
      ingested: list.filter(j => j.status === 'queued').length,
      download: list.filter(j => j.status === 'downloading' || j.status === 'processing').length,
      styling: list.filter(j => j.status === 'ready' || (j.current_step && j.current_step.includes('render'))).length,
      uploading: list.filter(j => j.status === 'publishing' || j.status === 'uploading').length,
      published: list.filter(j => j.status === 'published').length,
      failed: list.filter(j => j.status === 'failed').length,
      total: list.length
    };
  }

  function renderStudioStepperHtml() {
    const counts = calculateStageCounts();
    const selectedPage = pages.find(p => String(p.id) === String(pipelineFilterPageId));
    const pageLabel = selectedPage ? selectedPage.name : 'All Channels';

    return `
      <div class="pipeline-stepper-header">
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          <span class="pipeline-live-flow-dot"></span>
          <span>Agent 3 Processing Pipeline Flow for <b>${escapeHtml(pageLabel)}</b></span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          Agent 3: <strong>Autonomous Video Framing, Hook Synthesis & Meta Publishing</strong>
        </div>
      </div>

      <div class="pipeline-stepper">
        <!-- Stage 1: Ingested -->
        <div id="studio-step-ingested" class="pipeline-step-node ${activePipelineStage === 'ingested' ? 'active' : ''}" onclick="studioView.switchPipelineStage('ingested')" title="Incoming reels queued for video transformation">
          <span class="pipeline-step-num">1.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Ingested</span>
            <span class="pipeline-step-count" id="studio-cnt-ingested">${counts.ingested} Queued</span>
          </div>
        </div>
        <div class="pipeline-step-arrow" id="studio-flow-1">→</div>

        <!-- Stage 2: Download & OCR -->
        <div id="studio-step-download" class="pipeline-step-node ${activePipelineStage === 'download' ? 'active' : ''}" onclick="studioView.switchPipelineStage('download')" title="Source 1080p video download & competitor OCR watermark detection">
          <span class="pipeline-step-num">2.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Download & OCR</span>
            <span class="pipeline-step-count" id="studio-cnt-download">${counts.download} Ready</span>
          </div>
        </div>
        <div class="pipeline-step-arrow" id="studio-flow-2">→</div>

        <!-- Stage 3: Agent 3 Styling -->
        <div id="studio-step-styling" class="pipeline-step-node ${activePipelineStage === 'styling' ? 'active' : ''}" onclick="studioView.switchPipelineStage('styling')" title="Safe-zone letterboxing, AI hook synthesis, and brand theme styling">
          <span class="pipeline-step-num">3.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Agent 3 Styling</span>
            <span class="pipeline-step-count" id="studio-cnt-styling" style="color: #7C3AED; font-weight: 600;">${counts.styling} Styled</span>
          </div>
        </div>
        <div class="pipeline-step-arrow" id="studio-flow-3">→</div>

        <!-- Stage 4: Meta Upload -->
        <div id="studio-step-uploading" class="pipeline-step-node ${activePipelineStage === 'uploading' ? 'active' : ''}" onclick="studioView.switchPipelineStage('uploading')" title="Meta Graph API container creation and companion 9:16 story publishing">
          <span class="pipeline-step-num">4.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Meta Upload</span>
            <span class="pipeline-step-count" id="studio-cnt-uploading" style="color: #D97757; font-weight: 600;">${counts.uploading} In-Flight</span>
          </div>
        </div>
        <div class="pipeline-step-arrow" id="studio-flow-4">→</div>

        <!-- Stage 5: Live Published -->
        <div id="studio-step-published" class="pipeline-step-node ${activePipelineStage === 'published' ? 'active' : ''}" onclick="studioView.switchPipelineStage('published')" title="Live on Instagram feed with verified shortcode">
          <span class="pipeline-step-num">5.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Live Published</span>
            <span class="pipeline-step-count" id="studio-cnt-published" style="color: #16A34A; font-weight: 600;">${counts.published} Live</span>
          </div>
        </div>
        <div class="pipeline-step-arrow" id="studio-flow-5">→</div>

        <!-- Stage 6: Errors & Retries -->
        <div id="studio-step-failed" class="pipeline-step-node ${activePipelineStage === 'failed' ? 'active' : ''} ${counts.failed > 0 ? 'has-failed' : ''}" onclick="studioView.switchPipelineStage('failed')" title="Failed stage jobs with 1-click retry and re-render">
          <span class="pipeline-step-num" style="${counts.failed > 0 && activePipelineStage !== 'failed' ? 'color: var(--danger);' : ''}">6.</span>
          <div class="pipeline-step-info">
            <span class="pipeline-step-label">Retries</span>
            <span class="pipeline-step-count" id="studio-cnt-failed" style="${counts.failed > 0 ? 'color: var(--danger); font-weight: 700;' : ''}">${counts.failed} Errors</span>
          </div>
        </div>
      </div>
    `;
  }

  function triggerStudioFlowAnimation() {
    const nodes = [
      document.getElementById('studio-step-ingested'),
      document.getElementById('studio-step-download'),
      document.getElementById('studio-step-styling'),
      document.getElementById('studio-step-uploading'),
      document.getElementById('studio-step-published'),
      document.getElementById('studio-step-failed')
    ];
    const connectors = [
      document.getElementById('studio-flow-1'),
      document.getElementById('studio-flow-2'),
      document.getElementById('studio-flow-3'),
      document.getElementById('studio-flow-4'),
      document.getElementById('studio-flow-5')
    ];

    nodes.forEach(n => n && n.classList.remove('flow-pulse'));
    connectors.forEach(c => c && c.classList.remove('flow-active'));

    nodes.forEach((node, idx) => {
      setTimeout(() => {
        if (node) {
          node.classList.add('flow-pulse');
          setTimeout(() => node.classList.remove('flow-pulse'), 850);
        }
        if (idx > 0 && connectors[idx - 1]) {
          connectors[idx - 1].classList.add('flow-active');
          setTimeout(() => connectors[idx - 1].classList.remove('flow-active'), 850);
        }
      }, idx * 160);
    });
  }

  function switchPipelineStage(stageName) {
    activePipelineStage = stageName;
    const stepperContainer = document.getElementById('studio-stepper-container');
    if (stepperContainer) {
      stepperContainer.innerHTML = renderStudioStepperHtml();
    }
    renderActiveStageDeck();
    triggerStudioFlowAnimation();
  }

  function renderActiveStageDeck() {
    const container = document.getElementById('studio-stage-deck');
    if (!container) return;

    let filtered = pipelineJobs.slice();
    if (pipelineFilterPageId !== 'all') {
      filtered = filtered.filter(j => String(j.page_id) === String(pipelineFilterPageId));
    }
    if (pipelineSearchQuery) {
      const q = pipelineSearchQuery.toLowerCase();
      filtered = filtered.filter(j =>
        (j.shortcode && j.shortcode.toLowerCase().includes(q)) ||
        (j.caption && j.caption.toLowerCase().includes(q)) ||
        (j.hook_headline && j.hook_headline.toLowerCase().includes(q))
      );
    }

    // Determine Stage Metadata & Filter
    let stageJobs = filtered;
    let stageMeta = {
      title: 'Agent 3 Styling & Safe-Zone Framing',
      stageNum: '3',
      color: '#7C3AED',
      bgLight: 'rgba(124, 58, 237, 0.08)',
      desc: 'Reels letterboxed inside safe zone (never overlapping video content), stripped of competitor watermarks, styled with page theme, and given an AI hook headline.'
    };

    if (activePipelineStage === 'ingested') {
      stageJobs = filtered.filter(j => j.status === 'queued');
      stageMeta = {
        title: 'Ingested & Queued Inbound',
        stageNum: '1',
        color: '#2563EB',
        bgLight: 'rgba(37, 99, 235, 0.08)',
        desc: 'Reels received from Agent 1 (Telegram) or Agent 2 (Watchtower 24/7 Monitored Sources) queued for video transformation.'
      };
    } else if (activePipelineStage === 'download') {
      stageJobs = filtered.filter(j => j.status === 'downloading' || j.status === 'processing');
      stageMeta = {
        title: 'Download & OCR Watermark Analysis',
        stageNum: '2',
        color: '#D97706',
        bgLight: 'rgba(217, 119, 6, 0.08)',
        desc: 'Downloading 1080p MP4 media to local drive (public/generated/downloads), probing video aspect ratio, and performing OCR competitor text detection.'
      };
    } else if (activePipelineStage === 'styling') {
      stageJobs = filtered.filter(j => j.status === 'ready' || (j.current_step && j.current_step.includes('render')));
      stageMeta = {
        title: 'Agent 3 Video Styling & Safe-Zone Letterbox',
        stageNum: '3',
        color: '#7C3AED',
        bgLight: 'rgba(124, 58, 237, 0.08)',
        desc: 'Letterboxes 16:9/4:5 frames to safe 9:16 layout, strips competitor headers, synthesizes punchy AI hook headline, and renders brand typography.'
      };
    } else if (activePipelineStage === 'uploading') {
      stageJobs = filtered.filter(j => j.status === 'publishing' || j.status === 'uploading');
      stageMeta = {
        title: 'Meta Live Upload & Story Generation',
        stageNum: '4',
        color: '#B85B35',
        bgLight: 'rgba(184, 91, 53, 0.08)',
        desc: 'Creates Meta Graph API video container, exposes local MP4 via Cloudflare edge tunnel, uploads reel, and generates companion 9:16 story.'
      };
    } else if (activePipelineStage === 'published') {
      stageJobs = filtered.filter(j => j.status === 'published');
      stageMeta = {
        title: 'Live Published on Instagram',
        stageNum: '5',
        color: '#16A34A',
        bgLight: 'rgba(22, 163, 74, 0.08)',
        desc: 'Active live posts on your Instagram profile. Verified with live Graph API ID, shortcode link, and engagement metrics.'
      };
    } else if (activePipelineStage === 'failed') {
      stageJobs = filtered.filter(j => j.status === 'failed');
      stageMeta = {
        title: 'Errors & One-Click Retries',
        stageNum: '6',
        color: '#DC2626',
        bgLight: 'rgba(220, 38, 38, 0.08)',
        desc: 'Jobs encountering session token issues, format rejections, or rate limits. Equipped with 1-click stage retries and re-rendering.'
      };
    } else if (activePipelineStage === 'all') {
      stageJobs = filtered;
      stageMeta = {
        title: 'All Publishing Pipeline Jobs',
        stageNum: '★',
        color: '#4B5563',
        bgLight: 'rgba(75, 85, 99, 0.08)',
        desc: 'Full unified overview of all reels across every ingestion, styling, and publishing phase.'
      };
    }

    container.innerHTML = `
      <!-- Stage Banner Header -->
      <div class="card mb-4" style="padding: 1.15rem 1.35rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: ${stageMeta.bgLight}; color: ${stageMeta.color}; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; font-weight: 800;">
              ${stageMeta.stageNum}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif;">
                  ${stageMeta.title}
                </h3>
                <span class="badge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: ${stageMeta.bgLight}; color: ${stageMeta.color}; font-weight: 700;">
                  ${stageJobs.length} ${stageJobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              </div>
              <p style="font-size: 0.76rem; color: var(--text-muted); margin: 3px 0 0 0;">
                ${stageMeta.desc}
              </p>
            </div>
          </div>

          <!-- Controls: Search, Channel filter, View toggle -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <div style="position: relative; min-width: 190px;">
              <input type="text" class="form-input" placeholder="Search this stage..." value="${escapeHtml(pipelineSearchQuery)}" oninput="studioView.onPipelineSearch(this.value)" style="font-size: 0.8rem; padding: 4px 8px 4px 24px; border-radius: 6px; width: 100%;">
              <span style="position: absolute; left: 7px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--text-muted);">🔍</span>
            </div>

            <select class="form-input" onchange="studioView.onPipelinePageFilterChange(this.value)" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px;">
              <option value="all" ${pipelineFilterPageId === 'all' ? 'selected' : ''}>All Channels</option>
              ${pages.map(p => `<option value="${p.id}" ${String(p.id) === String(pipelineFilterPageId) ? 'selected' : ''}>${escapeHtml(p.name)} (${p.handle || '@' + p.slug})</option>`).join('')}
            </select>

            <div class="btn-group" style="display: flex; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 2px;">
              <button class="btn btn-sm ${pipelineViewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}" onclick="studioView.setPipelineViewMode('grid')" style="padding: 3px 8px; font-size: 0.75rem;" title="Cards Deck View">
                Cards
              </button>
              <button class="btn btn-sm ${pipelineViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" onclick="studioView.setPipelineViewMode('table')" style="padding: 3px 8px; font-size: 0.75rem;" title="Data Table View">
                Table
              </button>
              <button class="btn btn-sm ${pipelineViewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}" onclick="studioView.setPipelineViewMode('kanban')" style="padding: 3px 8px; font-size: 0.75rem;" title="All Stages Multi-Column Board">
                Columns
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stage Items Body -->
      <div id="studio-stage-body">
        ${renderStageBody(stageJobs, filtered)}
      </div>
    `;
  }

  function renderStageBody(stageJobs, allFiltered) {
    if (pipelineViewMode === 'kanban') {
      return renderPipelineKanban(allFiltered || pipelineJobs);
    } else if (pipelineViewMode === 'table') {
      return renderPipelineTable(stageJobs);
    } else {
      return renderPipelineGrid(stageJobs);
    }
  }

  function renderPipelineGrid(stageJobs) {
    if (stageJobs.length === 0) {
      return renderEmptyStageState();
    }

    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">`;

    for (const j of stageJobs) {
      const page = pages.find(p => p.id === j.page_id);
      const pageName = page ? page.name : `Page #${j.page_id}`;
      const shortcode = j.shortcode || '--';
      const hook = j.hook_headline || (j.caption ? j.caption.split('\n')[0] : 'Processing content...');
      const theme = j.edit_theme || 'neon';
      const statusColor = j.status === 'published' ? '#16A34A' : j.status === 'failed' ? '#DC2626' : '#7C3AED';

      html += `
        <div class="card" style="padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-card); background: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.15s; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          
          <div>
            <!-- Card Header: ID, Source, Time, Channel -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.8rem; color: var(--accent-primary);">
                  #${j.id}
                </span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">·</span>
                <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 4px; background: rgba(0,0,0,0.05); color: var(--text-secondary); font-weight: 600;">
                  ${escapeHtml(pageName)}
                </span>
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                ${formatTimeAgo(j.created_at)}
              </span>
            </div>

            <!-- Shortcode link -->
            <div style="margin-bottom: 0.5rem; font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono); display: flex; align-items: center; gap: 6px;">
              <span>Source:</span>
              ${j.instagram_url ? `<a href="${j.instagram_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">instagram.com/reel/${escapeHtml(shortcode)} ↗</a>` : `<span style="font-weight: 600;">${escapeHtml(shortcode)}</span>`}
            </div>

            <!-- AI Hook Headline -->
            <div style="background: var(--bg-canvas); border-left: 3px solid ${statusColor}; padding: 0.65rem 0.8rem; border-radius: 0 8px 8px 0; margin-bottom: 0.75rem;">
              <div style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">
                AI Hook Headline
              </div>
              <div style="font-size: 0.86rem; font-weight: 700; color: var(--text-primary); line-height: 1.35;">
                "${escapeHtml(hook)}"
              </div>
            </div>

            <!-- Theme & Status tags -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 4px;">
              <span class="badge" style="font-size: 0.7rem; padding: 2px 7px; border-radius: 4px; background: rgba(139, 92, 246, 0.12); color: #7C3AED; font-weight: 600;">
                🎨 ${escapeHtml(theme)}
              </span>
              <span style="font-size: 0.72rem; font-weight: 600; color: ${statusColor}; display: flex; align-items: center; gap: 4px;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${statusColor}; display: inline-block;"></span>
                ${escapeHtml(j.current_step || j.status)}
              </span>
            </div>

            <!-- Error message banner if failed -->
            ${j.status === 'failed' && (j.error_message || j.error) ? `
              <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 0.5rem 0.65rem; border-radius: 6px; color: #DC2626; font-size: 0.74rem; margin-bottom: 0.75rem; line-height: 1.3;">
                <strong>Error:</strong> ${escapeHtml((j.error_message || j.error).slice(0, 110))}...
              </div>
            ` : ''}
          </div>

          <!-- Card Actions Footer -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; gap: 5px;">
              <button class="btn btn-secondary btn-sm" onclick="studioView.previewJobInMockup(${j.id})" title="Preview in Phone Reel Mockup" style="padding: 3px 8px; font-size: 0.74rem;">
                📱 Reel
              </button>
              <button class="btn btn-secondary btn-sm" onclick="studioView.openReRenderModal(${j.id})" title="Re-Render with Agent 3" style="padding: 3px 8px; font-size: 0.74rem;">
                🎨 Restyle
              </button>
              <button class="btn btn-secondary btn-sm" onclick="studioView.distributeJobToPages(${j.id})" title="Fan-out to Connected Pages with Custom Branding" style="padding: 3px 8px; font-size: 0.74rem; border-color: rgba(124, 58, 237, 0.4); color: #7C3AED;">
                🚀 Fan-Out
              </button>
            </div>

            <div style="display: flex; gap: 5px;">
              <button class="btn btn-ghost btn-sm" onclick="studioView.openJobDetail(${j.id})" title="View Telemetry Audit Trail" style="padding: 3px 8px; font-size: 0.74rem;">
                🔍 Audit
              </button>
              ${j.status === 'published' ? `
                <a href="https://www.instagram.com/reel/${escapeHtml(shortcode)}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none; padding: 3px 8px; font-size: 0.74rem;">
                  IG ↗
                </a>
              ` : ''}
              ${j.status === 'failed' ? `
                <button class="btn btn-primary btn-sm" onclick="studioView.retryJob(${j.id})" title="Retry Failed Stage" style="padding: 3px 9px; font-size: 0.74rem;">
                  🔄 Retry
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function renderEmptyStageState() {
    let icon = '✨';
    let title = 'No reels in this stage';
    let msg = 'As incoming reels from Agent 1 and Agent 2 process through the system, they will appear here in real-time.';

    if (activePipelineStage === 'failed') {
      icon = '🎉';
      title = 'Zero Pipeline Failures!';
      msg = 'All Agent 3 rendering, token handshakes, and Meta Graph API uploads have succeeded without errors.';
    } else if (activePipelineStage === 'ingested') {
      title = 'Ingestion Queue Clear';
      msg = 'All received reels from Telegram and monitored sources have been downloaded and passed to Agent 3.';
    } else if (activePipelineStage === 'styling') {
      title = 'No Reels Awaiting Styling';
      msg = 'All downloaded media has completed safe-zone aspect-ratio framing and AI hook synthesis.';
    } else if (activePipelineStage === 'uploading') {
      title = 'No Live In-Flight Uploads';
      msg = 'Meta Graph API video upload queue is currently idle. Next upload will initiate automatically.';
    }

    return `
      <div class="card" style="padding: 3.5rem 1.5rem; text-align: center; border-radius: 12px; background: var(--bg-card); border: 1px dashed var(--border-card);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${icon}</div>
        <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
          ${title}
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 460px; margin: 0.4rem auto 1.25rem auto; line-height: 1.45;">
          ${msg}
        </p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="btn btn-secondary btn-sm" onclick="studioView.switchPipelineStage('all')">
            View All Pipeline Jobs
          </button>
          <button class="btn btn-secondary btn-sm" onclick="studioView.refresh()">
            Refresh Telemetry
          </button>
        </div>
      </div>
    `;
  }

  function renderPipelineTable(stageJobs) {
    if (stageJobs.length === 0) {
      return renderEmptyStageState();
    }

    let html = `
      <div class="card table-container" style="background: var(--bg-card); border-radius: 12px; overflow-x: auto; border: 1px solid var(--border-card);">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.83rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.74rem; text-transform: uppercase;">
              <th style="padding: 10px 14px;">ID</th>
              <th style="padding: 10px 14px;">Target Channel</th>
              <th style="padding: 10px 14px;">Source Shortcode</th>
              <th style="padding: 10px 14px;">AI Hook Headline</th>
              <th style="padding: 10px 14px;">Theme</th>
              <th style="padding: 10px 14px;">Stage Status</th>
              <th style="padding: 10px 14px;">Created</th>
              <th style="padding: 10px 14px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const j of stageJobs) {
      const page = pages.find(p => p.id === j.page_id);
      const pageName = page ? page.name : `Page #${j.page_id}`;
      const shortcode = j.shortcode || '--';
      const hook = j.hook_headline || (j.caption ? j.caption.slice(0, 45) + '...' : '--');
      const theme = j.edit_theme || 'neon';
      const statusColor = j.status === 'published' ? '#16A34A' : j.status === 'failed' ? '#DC2626' : '#7C3AED';

      html += `
        <tr style="border-bottom: 1px solid var(--border-subtle);">
          <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary);">#${j.id}</td>
          <td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(pageName)}</td>
          <td style="padding: 10px 14px; font-family: var(--font-mono);">
            ${j.instagram_url ? `<a href="${j.instagram_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">${escapeHtml(shortcode)} ↗</a>` : escapeHtml(shortcode)}
          </td>
          <td style="padding: 10px 14px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
            "${escapeHtml(hook)}"
          </td>
          <td style="padding: 10px 14px;">
            <span class="badge" style="font-size: 0.7rem; padding: 2px 7px; border-radius: 4px; background: rgba(139, 92, 246, 0.1); color: #7C3AED; font-weight: 600;">
              ${escapeHtml(theme)}
            </span>
          </td>
          <td style="padding: 10px 14px;">
            <span style="font-weight: 600; color: ${statusColor}; font-size: 0.78rem;">
              ● ${escapeHtml(j.current_step || j.status)}
            </span>
          </td>
          <td style="padding: 10px 14px; color: var(--text-muted); font-size: 0.76rem; font-family: var(--font-mono);">
            ${formatTimeAgo(j.created_at)}
          </td>
          <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
            <div style="display: flex; gap: 4px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="studioView.previewJobInMockup(${j.id})" title="Preview on Phone Reel" style="padding: 2px 7px; font-size: 0.72rem;">
                📱 Reel
              </button>
              <button class="btn btn-secondary btn-sm" onclick="studioView.distributeJobToPages(${j.id})" title="Fan-out to Connected Pages" style="padding: 2px 7px; font-size: 0.72rem; border-color: rgba(124, 58, 237, 0.4); color: #7C3AED;">
                🚀 Fan-Out
              </button>
              <button class="btn btn-secondary btn-sm" onclick="studioView.openJobDetail(${j.id})" title="Audit Telemetry" style="padding: 2px 7px; font-size: 0.72rem;">
                🔍 Audit
              </button>
              ${j.status === 'failed' ? `
                <button class="btn btn-primary btn-sm" onclick="studioView.retryJob(${j.id})" title="Retry Failed Stage" style="padding: 2px 7px; font-size: 0.72rem;">
                  🔄 Retry
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
    return html;
  }

  function renderPipelineKanban(jobList) {
    const columns = [
      { id: 'col-queued', title: '1. Ingested & Queued', match: j => j.status === 'queued' },
      { id: 'col-downloading', title: '2. Downloading / OCR', match: j => j.status === 'downloading' || j.status === 'processing' },
      { id: 'col-rendering', title: '3. Agent 3 Styling', match: j => j.status === 'ready' || (j.current_step && j.current_step.includes('render')) },
      { id: 'col-publishing', title: '4. Meta Live Upload', match: j => j.status === 'publishing' || j.status === 'uploading' },
      { id: 'col-published', title: '5. Live on Instagram', match: j => j.status === 'published' },
      { id: 'col-failed', title: '6. Failed / Blocked', match: j => j.status === 'failed' }
    ];

    let html = `
      <div class="kanban-board-container" style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1.5rem; min-height: 480px;">
    `;

    for (const col of columns) {
      const colJobs = jobList.filter(col.match);
      html += `
        <div class="kanban-column" style="flex: 0 0 280px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 12px; display: flex; flex-direction: column; max-height: 75vh;">
          <div class="kanban-column-header" style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              ${col.title}
            </div>
            <span class="badge" style="font-size: 0.72rem; padding: 2px 7px; border-radius: 999px; background: var(--bg-canvas); color: var(--text-muted); font-weight: 600;">
              ${colJobs.length}
            </span>
          </div>

          <div class="kanban-column-body" style="padding: 0.75rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.65rem;">
            ${colJobs.length === 0 ? `
              <div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 2rem 0.5rem; font-style: italic;">
                No jobs in this stage
              </div>
            ` : colJobs.map(j => renderPipelineKanbanCard(j)).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function renderPipelineKanbanCard(j) {
    const page = pages.find(p => p.id === j.page_id);
    const pageName = page ? page.name : `Page #${j.page_id}`;
    const shortcode = j.shortcode || (j.instagram_url ? j.instagram_url.split('/p/')[1] || j.instagram_url.split('/reel/')[1] : null) || 'Manual Reel';
    const hook = j.hook_headline || (j.caption ? j.caption.split('\n')[0] : 'Processing content...');

    return `
      <div class="card kanban-card" style="padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-canvas); box-shadow: none; cursor: pointer; transition: transform 0.15s, border-color 0.15s;" onclick="studioView.openJobDetail(${j.id})">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--accent-primary); font-family: var(--font-mono);">
            #${j.id} · ${escapeHtml(shortcode.slice(0, 11))}
          </span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">
            ${formatTimeAgo(j.created_at)}
          </span>
        </div>

        <div style="font-size: 0.82rem; font-weight: 600; line-height: 1.3; color: var(--text-primary); margin-bottom: 0.45rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          "${escapeHtml(hook)}"
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed var(--border-subtle);">
          <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.04); color: var(--text-secondary);">
            ${escapeHtml(pageName.slice(0, 16))}
          </span>
          <span style="font-size: 0.7rem; font-weight: 500; color: ${j.status === 'published' ? '#16A34A' : j.status === 'failed' ? '#DC2626' : '#2563EB'};">
            ${escapeHtml(j.current_step || j.status)}
          </span>
        </div>
      </div>
    `;
  }

  function previewJobInMockup(jobId) {
    const job = pipelineJobs.find(j => String(j.id) === String(jobId));
    if (!job) return;

    customHookText = job.hook_headline || (job.caption ? job.caption.split('\n')[0] : 'THE SECRET TECHNIQUE TOP PRODUCERS NEVER SHARE');
    const hookInput = document.getElementById('live-hook-input');
    if (hookInput) hookInput.value = customHookText;

    const theme = job.edit_theme || 'neon';
    selectPreset(theme);
    setSubtab('studio');

    const phone = document.getElementById('studio-mobile-device');
    if (phone) phone.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.app?.toast(`Previewing Job #${job.id} in Instagram Reel simulator!`, 'success');
  }

  async function openJobDetail(jobId) {
    activeDetailJobId = jobId;
    const modal = document.getElementById('job-detail-modal');
    const content = document.getElementById('jdm-content-body');
    const title = document.getElementById('jdm-title');
    const statusBadge = document.getElementById('jdm-status-badge');
    const subtitle = document.getElementById('jdm-subtitle');

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }

    try {
      const res = await fetch(`/api/pipeline/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to load job details');
      const data = await res.json();
      const job = data.job;
      const events = data.events || [];
      const distributionTargets = data.distributionTargets || [];

      if (title) title.textContent = `Job #${job.id} — ${job.shortcode || 'Instagram Reel'}`;
      if (subtitle) subtitle.textContent = `Target: ${job.page_name || 'Page #' + job.page_id} (${job.page_handle || ''}) · Created: ${new Date(job.created_at).toLocaleString()}`;
      if (statusBadge) {
        statusBadge.textContent = job.status.toUpperCase();
        statusBadge.className = `badge ${job.status === 'published' ? 'badge-success' : job.status === 'failed' ? 'badge-danger' : 'badge-primary'}`;
      }

      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div class="card" style="padding: 1rem; border-radius: 10px; background: var(--bg-canvas); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Extracted AI Hook Headline</div>
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                  "${escapeHtml(job.hook_headline || 'Pending AI Hook Generation')}"
                </div>
              </div>
              <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(139, 92, 246, 0.12); color: #7C3AED; font-weight: 600;">
                Theme: ${escapeHtml(job.edit_theme || 'neon')}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.78rem;">
              <div style="background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle);">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Original Ingested Media</div>
                <div style="font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(job.media_path || 'Pending download')}
                </div>
              </div>
              <div style="background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle);">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Agent 3 Stylized Reel</div>
                <div style="font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #7C3AED;">
                  ${escapeHtml(job.edited_media_path || 'Not yet rendered')}
                </div>
              </div>
            </div>

            ${job.caption ? `
              <div style="margin-top: 0.75rem; background: var(--bg-card); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-subtle); font-size: 0.78rem;">
                <div style="color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Instagram Caption</div>
                <div style="white-space: pre-wrap; max-height: 100px; overflow-y: auto; color: var(--text-secondary);">
                  ${escapeHtml(job.caption)}
                </div>
              </div>
            ` : ''}

            ${job.error_message ? `
              <div style="margin-top: 0.75rem; background: #FEF2F2; border: 1px solid #FECACA; padding: 0.65rem; border-radius: 6px; color: #DC2626; font-size: 0.78rem;">
                <strong>Failure Reason:</strong> ${escapeHtml(job.error_message)}
              </div>
            ` : ''}
          </div>

          <div>
            <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem; font-family: 'Plus Jakarta Sans', sans-serif;">
              Stage-by-Stage Progression Audit (${events.length} Events)
            </h4>

            <div class="timeline-stepper" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${events.length === 0 ? `
                <div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem; text-align: center;">
                  No historical telemetry events logged for this job yet.
                </div>
              ` : events.map(ev => {
                const isErr = ev.status === 'failed' || ev.status === 'error';
                const isSuccess = ev.status === 'completed' || ev.status === 'success';
                const iconBg = isErr ? '#DC2626' : isSuccess ? '#16A34A' : '#2563EB';

                return `
                  <div style="display: flex; gap: 10px; align-items: flex-start; padding: 0.5rem 0.75rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-subtle);">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${iconBg}; margin-top: 5px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 0.82rem; text-transform: uppercase; color: var(--text-primary);">
                          ${escapeHtml(ev.stage)}
                        </span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                          ${new Date(ev.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                        ${escapeHtml(ev.message || ev.status)}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 0.5rem;">
            ${job.status === 'failed' ? `
              <button class="btn btn-primary btn-sm" onclick="studioView.retryJob(${job.id})">
                🔄 Retry Failed Stage
              </button>
            ` : ''}
            
            <button class="btn btn-secondary btn-sm" onclick="studioView.openReRenderModal(${job.id})">
              🎨 Re-Render in Agent 3
            </button>

            ${job.ig_media_id ? `
              <a href="https://www.instagram.com/reel/${job.shortcode || ''}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">
                View on Instagram ↗
              </a>
            ` : ''}

            <button class="btn btn-secondary btn-sm" onclick="studioView.closeJobDetail()">
              Close
            </button>
          </div>

        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: #DC2626; padding: 2rem; text-align: center;">Failed to load job telemetry: ${escapeHtml(err.message)}</div>`;
    }
  }

  function closeJobDetail() {
    activeDetailJobId = null;
    const modal = document.getElementById('job-detail-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async function retryJob(jobId) {
    try {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      window.app?.toast(`Job #${jobId} queued for retry!`, 'success');
      closeJobDetail();
      loadPipelineData();
    } catch (err) {
      window.app?.toast(err.message, 'danger');
    }
  }

  function setPipelineViewMode(mode) {
    pipelineViewMode = mode;
    renderActiveStageDeck();
  }

  function onPipelinePageFilterChange(val) {
    pipelineFilterPageId = val;
    const stepper = document.getElementById('studio-stepper-container');
    if (stepper) stepper.innerHTML = renderStudioStepperHtml();
    renderActiveStageDeck();
  }

  function onPipelineSearch(query) {
    pipelineSearchQuery = query;
    renderActiveStageDeck();
  }

  async function distributeJobToPages(jobId) {
    try {
      const confirmed = confirm(`🚀 Fan-out this reel to all connected pages in its distribution network?\n\nThis will keep the video editing & viral hook identical while automatically customizing each page's branding (logo, page name, handle, and hashtags)!`);
      if (!confirmed) return;

      const res = await fetch('/api/distribution/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, immediate: true, ignoreQuota: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to plan distribution');

      alert(`✅ Successfully planned and dispatched distribution across connected pages! Target pages are now queued.`);
      loadPipelineData(true);
    } catch (err) {
      alert(`⚠️ Distribution notice: ${err.message}`);
    }
  }

  function onEvent(event) {
    if (activeDetailJobId && String(event.jobId) === String(activeDetailJobId)) {
      openJobDetail(activeDetailJobId);
    }
    if (['job_status', 'job_progress', 'published'].includes(event.type)) {
      loadStudioData(true);
      loadPipelineData(true);
    }
  }

  return {
    render,
    setSubtab,
    refresh: () => {
      loadStudioData();
      loadPipelineData();
    },
    selectPreset,
    setPhoneMode,
    toggleSafeZones,
    toggleLike,
    togglePlay,
    toggleMute,
    onLiveHookChange,
    synthesizeSampleHook,
    openReRenderModal,
    closeReRenderModal,
    onReRenderJobSelect,
    submitReRender,
    // Pipeline (Matching Agent 1 & 2)
    switchPipelineStage,
    previewJobInMockup,
    openJobDetail,
    closeJobDetail,
    retryJob,
    distributeJobToPages,
    setPipelineViewMode,
    onPipelinePageFilterChange,
    onPipelineSearch,
    onEvent
  };
})();
