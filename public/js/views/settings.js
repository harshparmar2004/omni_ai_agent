/**
 * OmniStudio v7 — Settings & System Health View
 * Artisan configuration experience with numbered section tags (01-05),
 * subheadings, and clear bullet points explaining every setting and why it matters.
 */
window.settingsView = (function() {
  async function render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-container">
        
        <!-- Centered Header -->
        <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.35rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              Settings & System Engine
            </h2>
            <p class="text-sm text-muted" style="margin: 0; line-height: 1.4;">
              Manage autonomous agents, mobile Telegram gate, edge media proxy, and global publishing parameters
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span id="st-save-status" style="font-size: 0.8rem; font-weight: 600; color: var(--agent-reposter); display: none;"></span>
            <button class="btn btn-primary btn-sm" id="st-btn-save-top" onclick="settingsView.saveSettings()">
              💾 Save All Settings
            </button>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- 01. Telegram Bot & Security Gate                          -->
        <!-- ========================================================= -->
        <div class="setting-card" style="border-top: 3px solid var(--agent-reposter);">
          <div class="setting-card-header">
            <div class="flex items-center gap-2">
              <span class="setting-step-badge">01</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>✈️ Telegram Bot & Security Gate</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                  Direct mobile link ingestion and real-time status alerts (Agent 1: Reposter)
                </div>
              </div>
            </div>
            <span class="badge badge-emerald">🛡️ Whitelist Protected</span>
          </div>

          <!-- Point 1.1: Bot Token -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>1. Telegram Bot Token</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">Authentication</span>
              </div>
              <ul class="setting-points-list">
                <li>Bot created via <b>@BotFather</b> on Telegram to receive Instagram reel links.</li>
                <li>Agent 1 continuously polls this bot to download, process, and publish reels.</li>
                <li>Securely stored in SQLite and masked to prevent token leakage.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div class="flex gap-1">
                <input type="password" id="st-tg-token" class="form-input" placeholder="Leave empty to keep existing token" style="font-family: var(--font-mono); font-size: 0.8rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-tg-token')" title="Reveal/Hide Token">👁️</button>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                Get your bot token from <a href="https://t.me/BotFather" target="_blank" style="color: var(--accent-primary); font-weight: 600;">@BotFather ↗</a>
              </div>
            </div>
          </div>

          <!-- Point 1.2: Allowed Chat IDs -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>2. Whitelisted Chat IDs</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">Access Gate</span>
              </div>
              <ul class="setting-points-list">
                <li>Strictly restricts reposting commands to authorized Telegram numeric user IDs.</li>
                <li>Incoming links from strangers or unapproved accounts are dropped immediately.</li>
                <li>Supports multiple admin users separated by commas.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <input type="text" id="st-tg-chats" class="form-input" placeholder="e.g. 5443723531, 987654321" style="font-family: var(--font-mono); font-size: 0.82rem;">
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                Find your numeric ID via <a href="https://t.me/userinfobot" target="_blank" style="color: var(--accent-primary); font-weight: 600;">@userinfobot ↗</a>
              </div>
            </div>
          </div>

          <!-- Point 1.3: Real-Time Mobile Progress Alerts -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>3. Publishing Status Notifications</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">Mobile Alerts</span>
              </div>
              <ul class="setting-points-list">
                <li>Sends real-time updates when reels start downloading, transcoding, and publish.</li>
                <li>Sends an instant warning message if Meta Graph API rejects a video container.</li>
              </ul>
            </div>
            <div class="setting-control-box" style="justify-content: center;">
              <label class="flex items-center gap-2" style="font-size: 0.82rem; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="st-tg-notifs" checked style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                <span>Enable instant Telegram alerts</span>
              </label>
            </div>
          </div>

          <!-- Point 1.4: Connection Handshake Verification -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>4. Gateway Handshake Test</span>
                <span class="badge badge-blue" style="font-size: 0.65rem;">Live Test</span>
              </div>
              <ul class="setting-points-list">
                <li>Dispatches an immediate diagnostic test message to your Telegram app.</li>
                <li>Verifies bot token validity and Telegram message delivery in &lt;1 second.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.testTelegram()">
                🔔 Send Test Alert to Telegram
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- 02. Watchtower Surveillance Engine                         -->
        <!-- ========================================================= -->
        <div class="setting-card" style="border-top: 3px solid var(--agent-watchtower);">
          <div class="setting-card-header">
            <div class="flex items-center gap-2">
              <span class="setting-step-badge">02</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🛰️ Watchtower Surveillance Engine</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                  Autonomous source feed scanner & viral reel discovery (Agent 2: Watchtower)
                </div>
              </div>
            </div>
            <span class="badge badge-blue">24/7 Radar</span>
          </div>

          <!-- Point 2.1: Cadence & Timing -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>1. Inspection Frequency (Cadence)</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">Timing</span>
              </div>
              <ul class="setting-points-list">
                <li>Interval between scheduled inspections across all monitored competitor accounts.</li>
                <li>Automatically appends <b>11 to 35 minutes of dynamic human jitter</b> to each run.</li>
                <li>Prevents repetitive robotic request intervals that could trigger rate limits.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div class="flex items-center gap-2">
                <input type="number" id="st-wt-interval" class="form-input" min="1" max="24" value="3" style="width: 80px; font-weight: 700;">
                <div class="flex gap-1">
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(1)">1h</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(2)">2h</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(3)">3h</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(6)">6h</button>
                </div>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Standard: Every 3 hours + human jitter</div>
            </div>
          </div>

          <!-- Point 2.2: Virality Quality Gate -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>2. Virality Quality Threshold</span>
                <span class="badge badge-amber" style="font-size: 0.65rem;">Content Filter</span>
              </div>
              <ul class="setting-points-list">
                <li>Calculates a viral score based on view velocity, like ratios, and comment volume.</li>
                <li>Reels scoring below this threshold are rejected to keep content quality high.</li>
                <li>Recommended setting: <b>75</b> (targets top quartile performing reels).</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div class="flex items-center gap-2">
                <input type="number" id="st-wt-min-score" class="form-input" min="10" max="100" value="75" style="width: 100px; font-weight: 700;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">/ 100 points</span>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Minimum score to stage reels in queue</div>
            </div>
          </div>

          <!-- Point 2.3: Circadian Sleep Cooldown -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>3. Circadian Night Mode Cooldown</span>
                <span class="badge badge-blue" style="font-size: 0.65rem;">Anti-Ban</span>
              </div>
              <ul class="setting-points-list">
                <li>Automatically pauses surveillance scans between <b>01:00 AM and 06:30 AM</b>.</li>
                <li>Emulates natural human creator sleeping behavior to avoid suspicious patterns.</li>
                <li>Automatically wakes up and resumes inspection cycles at sunrise.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <select id="st-wt-night-cooldown" class="form-input">
                <option value="1">🌙 Enabled (Pause 01:00 AM - 06:30 AM)</option>
                <option value="0">⚡ Disabled (Continuous 24h Scan)</option>
              </select>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Recommended: Enabled for account safety</div>
            </div>
          </div>

          <!-- Point 2.4: Surveillance Master State -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>4. Operational Master State</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">Master Control</span>
              </div>
              <ul class="setting-points-list">
                <li>Controls whether Watchtower's autonomous background scheduler is active.</li>
                <li>In Standby mode, scheduled sweeps pause while manual harvests remain available.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <select id="st-wt-paused" class="form-input">
                <option value="0">🟢 Active (Running Scheduled Sweeps)</option>
                <option value="1">⏸️ Standby (Surveillance Paused)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- 03. Cloudflare Media Tunnel & Edge Ingest                 -->
        <!-- ========================================================= -->
        <div class="setting-card" style="border-top: 3px solid var(--accent-primary);">
          <div class="setting-card-header">
            <div class="flex items-center gap-2">
              <span class="setting-step-badge">03</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🌐 Cloudflare Media Tunnel & Edge Ingest</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                  Secure public media proxy for Meta Graph API v21.0 video container creation
                </div>
              </div>
            </div>
            <span class="badge badge-amber">Edge Proxy</span>
          </div>

          <!-- Point 3.1: Public Media Edge Endpoint -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>1. Public Media Ingestion URL</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">Required by Meta</span>
              </div>
              <ul class="setting-points-list">
                <li>Meta's Graph API servers require a public HTTPS address to download video files.</li>
                <li>Cloudflare tunnel exposes your local processed MP4s securely without port forwarding.</li>
                <li>Automatically updated when your cloudflare daemon initializes.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div class="flex gap-1">
                <input type="text" id="st-tunnel-url" class="form-input" readonly style="font-family: var(--font-mono); font-size: 0.78rem; background: var(--bg-input); color: var(--accent-primary);">
                <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.copyTunnelUrl()" title="Copy URL">📋 Copy</button>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Meta downloads 1080p MP4 reels from this edge endpoint</div>
            </div>
          </div>

          <!-- Point 3.2: Edge Reachability & Handshake -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>2. Edge Proxy Health & Latency</span>
                <span class="badge badge-blue" style="font-size: 0.65rem;">Connectivity</span>
              </div>
              <ul class="setting-points-list">
                <li>Performs an end-to-end handshake check from the public internet back to localhost.</li>
                <li>Measures edge latency to verify fast reel transfer speeds to Instagram's CDN.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div id="st-tunnel-status-box" style="background: var(--bg-input); padding: 0.55rem 0.75rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.8rem; font-weight: 600;">
                Checking tunnel status...
              </div>
              <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.testTunnel()">
                🔄 Test Edge Tunnel Handshake
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- 04. Storage Lifecycle & System Health Diagnostics         -->
        <!-- ========================================================= -->
        <div class="setting-card" style="border-top: 3px solid var(--warning);">
          <div class="setting-card-header">
            <div class="flex items-center gap-2">
              <span class="setting-step-badge">04</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🧹 Storage Lifecycle & System Health Diagnostics</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                  Local disk retention pruning & real-time subsystem diagnostic monitoring
                </div>
              </div>
            </div>
            <span class="badge badge-emerald">Self-Healing</span>
          </div>

          <!-- Point 4.1: Storage Pruning Policy -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>1. Local Video Cache Retention</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">Disk Space</span>
              </div>
              <ul class="setting-points-list">
                <li>Sets how long downloaded and transcoded 1080p MP4 files remain on your disk.</li>
                <li>Only successfully published media is pruned; pending queue jobs are preserved.</li>
                <li>Default setting is <b>48 hours</b> to prevent hard drive bloat.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div class="flex items-center gap-2">
                <input type="number" id="st-retention-hours" class="form-input" min="6" max="168" value="48" style="width: 80px; font-weight: 700;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">hours retention</span>
              </div>
              <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.pruneMedia()">
                🗑️ Prune Expired Local Media Now
              </button>
            </div>
          </div>

          <!-- Point 4.2: Real-Time Subsystem Health Matrix -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>2. Subsystem Health Matrix</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">Diagnostics</span>
              </div>
              <ul class="setting-points-list">
                <li>Performs live health checks across all four platform layers simultaneously.</li>
                <li>Validates SQLite database write integrity, Meta API handshake, tunnel, and bot.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                  <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Database</div>
                  <div id="st-diag-db" style="font-weight: 700; color: var(--agent-reposter);">● Connected</div>
                </div>
                <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                  <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Meta API</div>
                  <div id="st-diag-meta" style="font-weight: 700; color: var(--agent-reposter);">● Active</div>
                </div>
                <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                  <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Edge Proxy</div>
                  <div id="st-diag-tunnel" style="font-weight: 700; color: var(--agent-watchtower);">● Active</div>
                </div>
                <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                  <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Telegram</div>
                  <div id="st-diag-tg" style="font-weight: 700; color: var(--agent-reposter);">● Configured</div>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.runDiagnostics()">
                🩺 Run Live Diagnostics
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- 05. Publishing Engine & Global Defaults                   -->
        <!-- ========================================================= -->
        <div class="setting-card" style="border-top: 3px solid var(--text-secondary);">
          <div class="setting-card-header">
            <div class="flex items-center gap-2">
              <span class="setting-step-badge">05</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>⚙️ Publishing Engine & Global Defaults</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">
                  Global publishing workflows, branding, watermark styling, and Meta app credentials
                </div>
              </div>
            </div>
            <span class="badge badge-muted">Global Engine</span>
          </div>

          <!-- Point 5.1: Workflow Mode -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>1. Publishing Approval Workflow</span>
                <span class="badge badge-amber" style="font-size: 0.65rem;">Workflow</span>
              </div>
              <ul class="setting-points-list">
                <li><b>Review First (Queue)</b>: Staged reels wait for your manual approval and caption edit.</li>
                <li><b>Direct Auto-Publish</b>: Reels passing the virality gate are published immediately to Instagram.</li>
                <li>Recommended: <b>Review First</b> for maximum quality assurance.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <select id="st-post-mode" class="form-input">
                <option value="review">📋 Review First (Save to Queue)</option>
                <option value="direct">🚀 Direct Auto-Publish (Immediate)</option>
              </select>
            </div>
          </div>

          <!-- Point 5.2: Reel & Video Specs -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>2. Reel Container Standard</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">Meta v21.0 Compliant</span>
              </div>
              <ul class="setting-points-list">
                <li>Standard <b>9:16 portrait aspect ratio (1080x1920 pixels)</b>.</li>
                <li>Transcoded using FFmpeg with H.264 video codec, AAC audio at 44.1kHz, and 30fps.</li>
                <li>Ensures zero compression artifacts or upload errors on Instagram's ingest pipeline.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <select id="st-content-type" class="form-input">
                <option value="reel">🎬 Instagram Reel (1080x1920 MP4)</option>
                <option value="carousel">📸 Carousel Gallery</option>
                <option value="image">🖼️ Single Image</option>
              </select>
            </div>
          </div>

          <!-- Point 5.3: Brand Attribution & Watermark Placement -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>3. Branding & Watermark Protection</span>
                <span class="badge badge-blue" style="font-size: 0.65rem;">Attribution</span>
              </div>
              <ul class="setting-points-list">
                <li>Appends your brand handle and original creator attribution to caption templates.</li>
                <li>Renders your watermark logo overlay onto video corners to safeguard content.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <input type="text" id="st-brand-handle" class="form-input" placeholder="@yourbrand" style="font-family: var(--font-mono); font-size: 0.82rem; margin-bottom: 0.4rem;">
              <div class="flex gap-2">
                <select id="st-watermark-pos" class="form-input" style="font-size: 0.78rem;">
                  <option value="top-right">Top-Right Corner</option>
                  <option value="bottom-right">Bottom-Right Corner</option>
                  <option value="top-left">Top-Left Corner</option>
                  <option value="bottom-left">Bottom-Left Corner</option>
                  <option value="none">Disabled (No Watermark)</option>
                </select>
                <select id="st-watermark-opacity" class="form-input" style="font-size: 0.78rem;">
                  <option value="0.95">95% Opacity</option>
                  <option value="0.75">75% Opacity</option>
                  <option value="0.50">50% Opacity</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Point 5.4: Meta App Credentials -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>4. Meta Developer App Credentials</span>
                <span class="badge badge-muted" style="font-size: 0.65rem;">OAuth & Graph</span>
              </div>
              <ul class="setting-points-list">
                <li>Associated with your Meta for Developers App ID for Instagram Graph API.</li>
                <li>App Secret is utilized for server-side token exchange and webhook verification.</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <input type="text" id="st-meta-app-id" class="form-input" placeholder="Meta App ID" style="font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 0.4rem;">
              <div class="flex gap-1">
                <input type="password" id="st-meta-app-secret" class="form-input" placeholder="Meta App Secret (Masked)" style="font-family: var(--font-mono); font-size: 0.8rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-meta-app-secret')" title="Reveal/Hide Secret">👁️</button>
              </div>
            </div>
          </div>

          <!-- Point 5.5: AI Intelligence Provider -->
          <div class="setting-item-row">
            <div>
              <div class="setting-item-title">
                <span>5. AI Caption & Intelligence Engine</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">AI Generation</span>
              </div>
              <ul class="setting-points-list">
                <li>Rewrites viral captions, crafts engaging first-line hooks, and selects trending hashtags.</li>
                <li>Can run 100% locally with <b>Ollama</b> or use cloud LLMs (Gemini, Claude, OpenAI, Groq).</li>
              </ul>
            </div>
            <div class="setting-control-box">
              <select id="st-ai-provider" class="form-input" style="margin-bottom: 0.4rem;">
                <option value="ollama">🦙 Ollama (Local AI)</option>
                <option value="gemini">✨ Google Gemini</option>
                <option value="claude">🧠 Anthropic Claude</option>
                <option value="openai">🤖 OpenAI GPT-4o</option>
                <option value="groq">⚡ Groq High-Speed</option>
              </select>
              <div class="flex gap-1">
                <input type="password" id="st-gemini-key" class="form-input" placeholder="Gemini API Key (Optional)" style="font-family: var(--font-mono); font-size: 0.8rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-gemini-key')" title="Reveal/Hide Key">👁️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Save Bar for Quick Access -->
        <div class="flex items-center justify-between" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 1rem 1.4rem; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Apply Configuration Changes</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">Updates are immediately synchronized to your local SQLite database and active daemons.</div>
          </div>
          <button class="btn btn-primary" id="st-btn-save-bottom" onclick="settingsView.saveSettings()">
            💾 Save All Settings
          </button>
        </div>

      </div>
    `;

    await loadSettings();
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      const s = data.settings || {};

      // 1. Telegram
      const tgChats = document.getElementById('st-tg-chats');
      const tgNotifs = document.getElementById('st-tg-notifs');
      if (tgChats) tgChats.value = s.telegram_allowed_chat_ids || '5443723531';
      if (tgNotifs) tgNotifs.checked = s.telegram_notifications_enabled !== '0';

      // 2. Watchtower
      const wtInterval = document.getElementById('st-wt-interval');
      const wtMinScore = document.getElementById('st-wt-min-score');
      const wtPaused = document.getElementById('st-wt-paused');
      const wtNightCooldown = document.getElementById('st-wt-night-cooldown');
      if (wtInterval) wtInterval.value = s.watchtower_interval_hours || '3';
      if (wtMinScore) wtMinScore.value = s.min_score_threshold || '75';
      if (wtPaused) wtPaused.value = s.watchtower_paused === '1' ? '1' : '0';
      if (wtNightCooldown) wtNightCooldown.value = s.watchtower_night_cooldown === '0' ? '0' : '1';

      // 3. Cloudflare Tunnel
      const tunnelUrl = document.getElementById('st-tunnel-url');
      if (tunnelUrl) tunnelUrl.value = s.public_media_url || 'Waiting for Cloudflare tunnel...';

      // 4. Storage & Pruning
      const retention = document.getElementById('st-retention-hours');
      if (retention) retention.value = s.media_retention_hours || '48';

      // 5. Platform Engine Defaults
      const postMode = document.getElementById('st-post-mode');
      const contentType = document.getElementById('st-content-type');
      const brandHandle = document.getElementById('st-brand-handle');
      const watermarkPos = document.getElementById('st-watermark-pos');
      const watermarkOpacity = document.getElementById('st-watermark-opacity');
      const metaAppId = document.getElementById('st-meta-app-id');
      const aiProvider = document.getElementById('st-ai-provider');

      if (postMode) postMode.value = s.default_post_mode || 'review';
      if (contentType) contentType.value = s.default_content_type || 'reel';
      if (brandHandle) brandHandle.value = s.brand_handle || s.instagram_handle || '@gta6_updates_007';
      if (watermarkPos) watermarkPos.value = s.brand_watermark_position || 'top-right';
      if (watermarkOpacity) watermarkOpacity.value = s.brand_watermark_opacity || '0.95';
      if (metaAppId) metaAppId.value = s.meta_app_id || '1699561267808244';
      if (aiProvider) aiProvider.value = s.default_provider || 'ollama';

      // Run health check
      await runDiagnostics();
    } catch (err) {
      console.warn('[loadSettings error]:', err);
    }
  }

  async function runDiagnostics() {
    try {
      const healthRes = await fetch('/api/system/health');
      if (!healthRes.ok) return;
      const health = await healthRes.json();

      // Tunnel box & pill
      const tunnelBox = document.getElementById('st-tunnel-status-box');
      const diagTunnel = document.getElementById('st-diag-tunnel');
      if (health.tunnel?.ok || health.tunnel?.healthy) {
        const latency = health.tunnel.latencyMs ? ` (${health.tunnel.latencyMs}ms)` : '';
        if (tunnelBox) tunnelBox.innerHTML = `<span class="badge badge-emerald">● Cloudflare Edge Healthy${latency}</span>`;
        if (diagTunnel) {
          diagTunnel.style.color = 'var(--agent-reposter)';
          diagTunnel.textContent = `● Active${latency}`;
        }
      } else {
        if (tunnelBox) tunnelBox.innerHTML = `<span class="badge badge-amber">● Local Port Forwarding</span>`;
        if (diagTunnel) {
          diagTunnel.style.color = 'var(--warning)';
          diagTunnel.textContent = '● Local Port';
        }
      }

      // DB
      const diagDb = document.getElementById('st-diag-db');
      if (diagDb) {
        if (health.database === 'ok') {
          diagDb.style.color = 'var(--agent-reposter)';
          diagDb.textContent = '● Connected';
        } else {
          diagDb.style.color = 'var(--danger)';
          diagDb.textContent = '● Error';
        }
      }

      // Meta
      const diagMeta = document.getElementById('st-diag-meta');
      if (diagMeta) {
        const validPage = (health.pages || []).find(p => p.valid);
        if (validPage) {
          diagMeta.style.color = 'var(--agent-reposter)';
          diagMeta.textContent = `● ${validPage.handle || '@page#' + validPage.page_id}`;
        } else {
          diagMeta.style.color = 'var(--danger)';
          diagMeta.textContent = '● Needs Token';
        }
      }

      // Telegram
      const diagTg = document.getElementById('st-diag-tg');
      if (diagTg) {
        if (health.telegram?.configured) {
          diagTg.style.color = 'var(--agent-reposter)';
          diagTg.textContent = '● Configured';
        } else {
          diagTg.style.color = 'var(--warning)';
          diagTg.textContent = '● Not Set';
        }
      }
    } catch (err) {
      console.warn('[runDiagnostics error]:', err);
    }
  }

  async function saveSettings() {
    const btnTop = document.getElementById('st-btn-save-top');
    const btnBottom = document.getElementById('st-btn-save-bottom');
    const statusSpan = document.getElementById('st-save-status');
    if (btnTop) btnTop.disabled = true;
    if (btnBottom) btnBottom.disabled = true;

    const payload = {};

    // 1. Telegram
    const tgToken = document.getElementById('st-tg-token')?.value?.trim();
    const tgChats = document.getElementById('st-tg-chats')?.value?.trim();
    const tgNotifs = document.getElementById('st-tg-notifs')?.checked ? '1' : '0';
    if (tgToken) payload.telegram_bot_token = tgToken;
    if (tgChats) payload.telegram_allowed_chat_ids = tgChats;
    payload.telegram_notifications_enabled = tgNotifs;

    // 2. Watchtower
    const wtInterval = document.getElementById('st-wt-interval')?.value?.trim();
    const wtMinScore = document.getElementById('st-wt-min-score')?.value?.trim();
    const wtPaused = document.getElementById('st-wt-paused')?.value;
    const wtNightCooldown = document.getElementById('st-wt-night-cooldown')?.value;
    if (wtInterval) payload.watchtower_interval_hours = wtInterval;
    if (wtMinScore) payload.min_score_threshold = wtMinScore;
    if (wtPaused !== undefined) payload.watchtower_paused = wtPaused;
    if (wtNightCooldown !== undefined) payload.watchtower_night_cooldown = wtNightCooldown;

    // 3. Storage
    const retention = document.getElementById('st-retention-hours')?.value?.trim();
    if (retention) payload.media_retention_hours = retention;

    // 4. Platform Defaults
    const postMode = document.getElementById('st-post-mode')?.value;
    const contentType = document.getElementById('st-content-type')?.value;
    const brandHandle = document.getElementById('st-brand-handle')?.value?.trim();
    const watermarkPos = document.getElementById('st-watermark-pos')?.value;
    const watermarkOpacity = document.getElementById('st-watermark-opacity')?.value;
    const metaAppId = document.getElementById('st-meta-app-id')?.value?.trim();
    const metaAppSecret = document.getElementById('st-meta-app-secret')?.value?.trim();
    const aiProvider = document.getElementById('st-ai-provider')?.value;
    const geminiKey = document.getElementById('st-gemini-key')?.value?.trim();

    if (postMode) payload.default_post_mode = postMode;
    if (contentType) payload.default_content_type = contentType;
    if (brandHandle) payload.brand_handle = brandHandle;
    if (watermarkPos) payload.brand_watermark_position = watermarkPos;
    if (watermarkOpacity) payload.brand_watermark_opacity = watermarkOpacity;
    if (metaAppId) payload.meta_app_id = metaAppId;
    if (metaAppSecret) payload.meta_app_secret = metaAppSecret;
    if (aiProvider) payload.default_provider = aiProvider;
    if (geminiKey) payload.gemini_api_key = geminiKey;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Settings saved successfully!', 'success');
        if (statusSpan) {
          statusSpan.style.display = 'inline';
          statusSpan.textContent = '✓ Settings Saved';
          setTimeout(() => { statusSpan.style.display = 'none'; }, 3000);
        }
        // Clear masked inputs
        const pwFields = ['st-tg-token', 'st-meta-app-secret', 'st-gemini-key'];
        pwFields.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
      } else {
        app.toast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    } finally {
      if (btnTop) btnTop.disabled = false;
      if (btnBottom) btnBottom.disabled = false;
    }
  }

  function setCadence(hours) {
    const input = document.getElementById('st-wt-interval');
    if (input) {
      input.value = hours;
      input.focus();
    }
  }

  function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  function copyTunnelUrl() {
    const url = document.getElementById('st-tunnel-url')?.value;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      app.toast('Copied Cloudflare Media URL to clipboard!', 'info');
    }).catch(() => {
      app.toast('URL: ' + url, 'info');
    });
  }

  async function testTunnel() {
    app.toast('Testing Cloudflare edge handshake...', 'info');
    await runDiagnostics();
    app.toast('Edge handshake test complete', 'info');
  }

  async function testTelegram() {
    app.toast('Sending test ping to Telegram...', 'info');
    try {
      const res = await fetch('/api/system/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('✅ Test alert delivered to your Telegram app!', 'success');
      } else {
        app.toast(data.error || 'Failed to send Telegram alert', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async function pruneMedia() {
    try {
      const res = await fetch('/api/system/media/prune', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast(`Pruned ${data.deletedFiles || 0} expired files (${Math.round((data.freedBytes || 0) / (1024 * 1024))} MB freed)`, 'success');
      } else {
        app.toast(data.error || 'Prune failed', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  return {
    render,
    saveSettings,
    setCadence,
    togglePassword,
    copyTunnelUrl,
    testTunnel,
    testTelegram,
    pruneMedia,
    runDiagnostics,
    refresh: loadSettings
  };
})();
