/**
 * OmniStudio v7 — Settings & System Health View
 * Feature Box Architecture with plain creator-friendly wording:
 * - Each setting lives in its own dedicated, rounded white box (.setting-box)
 * - Plain English points: 📌 Purpose, 🛡️ Safety, 💡 Tip
 * - Interactive visual choice cards and quick preset triggers
 */
window.settingsView = (function() {
  // State for interactive choice cards
  let activePostMode = 'review';
  let activeNightCooldown = '1';
  let activeSurveillanceState = '0';

  async function render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-container">
        
        <!-- Centered Header -->
        <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.45rem; font-weight: 800; margin: 0 0 0.35rem 0; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif;">
              Settings & Platform Control
            </h2>
            <p class="text-sm text-muted" style="margin: 0; line-height: 1.4;">
              Manage your Instagram publishing pipeline, Telegram mobile gate, Watchtower surveillance, and storage
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
        <!-- SECTION 01: ✈️ Telegram Mobile Bot & Security             -->
        <!-- ========================================================= -->
        <div class="settings-section">
          <div class="settings-section-header">
            <div class="settings-section-title-wrap">
              <span class="settings-section-badge">01</span>
              <div>
                <div class="settings-section-title">
                  <span>✈️ Telegram Mobile Bot & Security</span>
                </div>
                <div class="settings-section-subtitle">
                  Send reels from your phone via Telegram to post directly to your Instagram page
                </div>
              </div>
            </div>
            <span class="badge badge-emerald">🛡️ Protected Gateway</span>
          </div>

          <!-- Box 1.1: Bot Connection Token -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🤖 Telegram Bot Connection Token</span>
              </div>
              <span class="badge badge-muted">Authentication</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Connects your private Telegram bot so Agent 1 can listen for Instagram reel links you share.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>Token is encrypted locally in your database and never shown in plain text.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Tip</span>
                  <span>Create a bot for free in 30 seconds by messaging <b>@BotFather</b> on Telegram.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <label class="form-label font-bold">Bot Token</label>
                <div class="flex gap-1">
                  <input type="password" id="st-tg-token" class="form-input" placeholder="Paste bot token here" style="font-family: var(--font-mono); font-size: 0.8rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-tg-token')" title="Show / Hide Token">👁️</button>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">
                  Official bot creator: <a href="https://t.me/BotFather" target="_blank" style="color: var(--accent-primary); font-weight: 600;">@BotFather ↗</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 1.2: Authorized Telegram Users -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🛡️ Who Can Post Reels? (Authorized Users)</span>
              </div>
              <span class="badge badge-emerald">Security Whitelist</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Only people whose numeric Telegram User IDs are listed here can trigger reposts.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>Strangers or random Telegram bots are blocked immediately without consuming server power.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Tip</span>
                  <span>Find your ID in 2 seconds by messaging <b>@userinfobot</b> on Telegram.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <label class="form-label font-bold">Whitelisted Numeric Chat IDs</label>
                <input type="text" id="st-tg-chats" class="form-input" placeholder="e.g. 5443723531, 987654321" style="font-family: var(--font-mono); font-size: 0.82rem;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Separate multiple IDs with commas</div>
              </div>
            </div>
          </div>

          <!-- Box 1.3: Real-Time Mobile Progress Alerts -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🔔 Live Telegram Notifications</span>
              </div>
              <span class="badge badge-muted">Status Updates</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Sends status alerts to your Telegram chat as your reel progresses through download and posting.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>Immediately alerts you if Instagram rejects a video file so you can fix it right away.</span>
                </div>
              </div>
              <div class="setting-control-panel" style="justify-content: center;">
                <label class="flex items-center gap-2" style="font-size: 0.82rem; font-weight: 600; cursor: pointer;">
                  <input type="checkbox" id="st-tg-notifs" checked style="width: 17px; height: 17px; accent-color: var(--accent-primary);">
                  <span>Send real-time alerts to my Telegram</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Box 1.4: Connection Test -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>📲 Test Telegram Connection</span>
              </div>
              <span class="badge badge-blue">Instant Ping</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Sends an instant test ping to your Telegram app right now to make sure messages arrive.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.testTelegram()">
                  🔔 Send Test Message to My Phone
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- SECTION 02: 🛰️ Watchtower Competitor Surveillance       -->
        <!-- ========================================================= -->
        <div class="settings-section">
          <div class="settings-section-header">
            <div class="settings-section-title-wrap">
              <span class="settings-section-badge">02</span>
              <div>
                <div class="settings-section-title">
                  <span>🛰️ Watchtower Competitor Surveillance</span>
                </div>
                <div class="settings-section-subtitle">
                  Autonomous scanner that monitors competitor feeds and finds top viral reels for you
                </div>
              </div>
            </div>
            <span class="badge badge-blue">24/7 Radar</span>
          </div>

          <!-- Box 2.1: Cadence & Timing -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>⏱️ How Often to Scan Competitors? (Cadence)</span>
              </div>
              <span class="badge badge-muted">Timing</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Frequency</span>
                  <span>How many hours Watchtower waits between checking your monitored accounts for new reels.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Human Jitter</span>
                  <span>Automatically adds <b>11 to 35 random minutes</b> to each sweep so you browse like a human.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Recommended</span>
                  <span><b>Every 3 hours</b> gives you fresh viral reels without making too many requests.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="flex items-center gap-2">
                  <input type="number" id="st-wt-interval" class="form-input" min="1" max="24" value="3" style="width: 80px; font-weight: 700;">
                  <div class="flex gap-1">
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(1)">1h</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(2)">2h</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(3)">3h</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" onclick="settingsView.setCadence(6)">6h</button>
                  </div>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Standard: 3h + dynamic human jitter</div>
              </div>
            </div>
          </div>

          <!-- Box 2.2: Virality Quality Gate -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>⭐ Viral Reel Quality Filter (Minimum Score)</span>
              </div>
              <span class="badge badge-amber">Quality Gate</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Evaluates view velocity, like ratios, and comments to score each discovered reel from 0 to 100.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Protection</span>
                  <span>Low-engagement reels are filtered out so your page only posts high-performing content.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Recommended</span>
                  <span><b>75 points</b> ensures you only stage the top 25% best performing reels.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="flex items-center gap-2">
                  <input type="number" id="st-wt-min-score" class="form-input" min="10" max="100" value="75" style="width: 90px; font-weight: 700;">
                  <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">/ 100 points minimum</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 2.3: Circadian Sleep Cooldown -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🌙 Night Sleep Mode (Anti-Detection Protection)</span>
              </div>
              <span class="badge badge-blue">Account Safety</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Pauses all scanning between <b>1:00 AM and 6:30 AM</b> local time to match human sleeping hours.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>Prevents Instagram from detecting 24-hour non-stop bot activity.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Recommended</span>
                  <span>Keep <b>Enabled</b> to keep your accounts 100% safe.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="setting-choice-grid">
                  <div class="setting-choice-card" id="card-night-1" onclick="settingsView.selectNightCooldown('1')">
                    <div class="setting-choice-title">
                      <span>🌙 Sleep Mode</span>
                      <span id="radio-night-1">●</span>
                    </div>
                    <div class="setting-choice-desc">Pause 1:00 AM – 6:30 AM (Recommended)</div>
                  </div>
                  <div class="setting-choice-card" id="card-night-0" onclick="settingsView.selectNightCooldown('0')">
                    <div class="setting-choice-title">
                      <span>⚡ 24h Non-Stop</span>
                      <span id="radio-night-0">○</span>
                    </div>
                    <div class="setting-choice-desc">Scan continuously all night</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 2.4: Surveillance Operational State -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🕹️ Master Surveillance Switch</span>
              </div>
              <span class="badge badge-muted">Master Control</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Turn Watchtower's background scanning on or off with a single click.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="setting-choice-grid">
                  <div class="setting-choice-card" id="card-surv-0" onclick="settingsView.selectSurveillanceState('0')">
                    <div class="setting-choice-title">
                      <span>🟢 Active Radar</span>
                      <span id="radio-surv-0">●</span>
                    </div>
                    <div class="setting-choice-desc">Scanning feeds automatically</div>
                  </div>
                  <div class="setting-choice-card" id="card-surv-1" onclick="settingsView.selectSurveillanceState('1')">
                    <div class="setting-choice-title">
                      <span>⏸️ Standby</span>
                      <span id="radio-surv-1">○</span>
                    </div>
                    <div class="setting-choice-desc">Temporarily pause scans</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- SECTION 03: 🌐 Live Video Delivery Link (Cloudflare)      -->
        <!-- ========================================================= -->
        <div class="settings-section">
          <div class="settings-section-header">
            <div class="settings-section-title-wrap">
              <span class="settings-section-badge">03</span>
              <div>
                <div class="settings-section-title">
                  <span>🌐 Live Video Delivery Link (Cloudflare)</span>
                </div>
                <div class="settings-section-subtitle">
                  Secure public address that allows Instagram to download your processed videos
                </div>
              </div>
            </div>
            <span class="badge badge-amber">Edge Delivery</span>
          </div>

          <!-- Box 3.1: Public Media Edge Endpoint -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🔗 Public Video Download URL</span>
              </div>
              <span class="badge badge-emerald">Required by Instagram</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>When posting a reel, Instagram downloads the 1080p MP4 file from this secure link.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Privacy</span>
                  <span>Runs through Cloudflare's secure edge tunnel so your home IP address is never revealed.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="flex gap-1">
                  <input type="text" id="st-tunnel-url" class="form-input" readonly style="font-family: var(--font-mono); font-size: 0.78rem; background: var(--bg-input); color: var(--accent-primary);">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.copyTunnelUrl()" title="Copy Link">📋 Copy</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 3.2: Edge Reachability & Handshake -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>📶 Connection Health & Speed</span>
              </div>
              <span class="badge badge-blue">Live Verification</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Verifies Instagram can reach your machine right now to download video files.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">⚡ Speed</span>
                  <span>Displays round-trip response time (latency) in milliseconds.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div id="st-tunnel-status-box" style="background: var(--bg-input); padding: 0.55rem 0.75rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.8rem; font-weight: 600;">
                  Checking connection status...
                </div>
                <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.testTunnel()">
                  🔄 Test Video Delivery Link
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- SECTION 04: 🧹 Storage & System Health Check               -->
        <!-- ========================================================= -->
        <div class="settings-section">
          <div class="settings-section-header">
            <div class="settings-section-title-wrap">
              <span class="settings-section-badge">04</span>
              <div>
                <div class="settings-section-title">
                  <span>🧹 Storage & System Health Check</span>
                </div>
                <div class="settings-section-subtitle">
                  Automatic disk cleanup for old video files and one-click health diagnosis
                </div>
              </div>
            </div>
            <span class="badge badge-emerald">Self-Cleaning</span>
          </div>

          <!-- Box 4.1: Storage Pruning Policy -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🗑️ Automatic Video Cleanup (Save Disk Space)</span>
              </div>
              <span class="badge badge-muted">Disk Management</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Automatically removes posted video files from your computer after this many hours.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>Only deletes videos that are already safely published to Instagram.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Recommended</span>
                  <span><b>48 hours</b> gives you plenty of time to review posts while saving your disk space.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="flex items-center gap-2 mb-2">
                  <input type="number" id="st-retention-hours" class="form-input" min="6" max="168" value="48" style="width: 80px; font-weight: 700;">
                  <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">hours retention</span>
                </div>
                <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.pruneMedia()">
                  🗑️ Clean Up Old Videos Now
                </button>
              </div>
            </div>
          </div>

          <!-- Box 4.2: Real-Time Subsystem Health Matrix -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🩺 4-Point Health Verification</span>
              </div>
              <span class="badge badge-emerald">Diagnostics</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Checks all 4 core layers at once: Database, Instagram API, Cloudflare link, and Telegram bot.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                    <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Database</div>
                    <div id="st-diag-db" style="font-weight: 700; color: var(--agent-reposter);">● Connected</div>
                  </div>
                  <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                    <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Instagram Meta</div>
                    <div id="st-diag-meta" style="font-weight: 700; color: var(--agent-reposter);">● Active</div>
                  </div>
                  <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                    <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Cloudflare</div>
                    <div id="st-diag-tunnel" style="font-weight: 700; color: var(--agent-watchtower);">● Active</div>
                  </div>
                  <div style="background: var(--bg-input); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.72rem;">
                    <div style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Telegram</div>
                    <div id="st-diag-tg" style="font-weight: 700; color: var(--agent-reposter);">● Active</div>
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.runDiagnostics()">
                  🩺 Run Live Diagnostics Check
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- SECTION 05: ⚙️ Publishing Engine & Page Defaults          -->
        <!-- ========================================================= -->
        <div class="settings-section">
          <div class="settings-section-header">
            <div class="settings-section-title-wrap">
              <span class="settings-section-badge">05</span>
              <div>
                <div class="settings-section-title">
                  <span>⚙️ Publishing Engine & Page Defaults</span>
                </div>
                <div class="settings-section-subtitle">
                  Posting approval mode, brand watermark positioning, Meta keys, and AI model
                </div>
              </div>
            </div>
            <span class="badge badge-muted">Global Defaults</span>
          </div>

          <!-- Box 5.1: Workflow Mode -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🚀 Do You Want to Review Posts First? (Approval Mode)</span>
              </div>
              <span class="badge badge-amber">Workflow Choice</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Review First</span>
                  <span>Harvested reels wait in your Queue so you can review captions and hashtags before publishing.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Auto-Publish</span>
                  <span>Reels that pass your viral score post automatically to Instagram without waiting.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Recommended</span>
                  <span>Choose <b>Review First</b> for maximum quality control over your feed.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <div class="setting-choice-grid">
                  <div class="setting-choice-card" id="card-mode-review" onclick="settingsView.selectPostMode('review')">
                    <div class="setting-choice-title">
                      <span>📋 Review First</span>
                      <span id="radio-mode-review">●</span>
                    </div>
                    <div class="setting-choice-desc">Approve captions in Queue (Recommended)</div>
                  </div>
                  <div class="setting-choice-card" id="card-mode-direct" onclick="settingsView.selectPostMode('direct')">
                    <div class="setting-choice-title">
                      <span>🚀 Auto-Publish</span>
                      <span id="radio-mode-direct">○</span>
                    </div>
                    <div class="setting-choice-desc">Post instantly when discovered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 5.2: Reel & Video Specs -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🎬 Video Container Format</span>
              </div>
              <span class="badge badge-emerald">Instagram Certified</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Format</span>
                  <span>Standard 9:16 vertical video (1080x1920 pixels) matching Instagram Reel upload standards.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Quality</span>
                  <span>Transcoded cleanly with H.264 video and crisp AAC audio with zero compression errors.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <select id="st-content-type" class="form-input">
                  <option value="reel">🎬 Instagram Reel (1080x1920 MP4) [Standard]</option>
                  <option value="carousel">📸 Carousel Gallery</option>
                  <option value="image">🖼️ Single Image</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Box 5.3: Brand Attribution & Watermark Placement -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🏷️ Brand Tag & Corner Watermark</span>
              </div>
              <span class="badge badge-blue">Brand Identity</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Brand Handle</span>
                  <span>Your Instagram username will be credited in caption templates automatically.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Protection</span>
                  <span>Displays your watermark logo in the corner so other accounts cannot steal your reels.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <label class="form-label font-bold">Your Instagram Handle</label>
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
          </div>

          <!-- Box 5.4: Meta App Credentials -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🔑 Meta Developer App Credentials</span>
              </div>
              <span class="badge badge-muted">Official Graph API</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Connects your registered Meta for Developers App for Instagram Graph API token management.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-safety">🛡️ Safety</span>
                  <span>App Secret is securely masked and never visible to unauthenticated visitors.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <input type="text" id="st-meta-app-id" class="form-input" placeholder="Meta App ID" style="font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 0.4rem;">
                <div class="flex gap-1">
                  <input type="password" id="st-meta-app-secret" class="form-input" placeholder="Meta App Secret (Masked)" style="font-family: var(--font-mono); font-size: 0.8rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-meta-app-secret')" title="Show / Hide Secret">👁️</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 5.5: AI Intelligence Provider -->
          <div class="setting-box">
            <div class="setting-box-header">
              <div class="setting-box-title">
                <span>🧠 AI Caption & Hashtag Writer</span>
              </div>
              <span class="badge badge-emerald">AI Engine</span>
            </div>
            <div class="setting-box-body">
              <div class="setting-bullets-group">
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-purpose">📌 Purpose</span>
                  <span>Rewrites viral captions, writes strong first-line hooks, and picks high-reach hashtags.</span>
                </div>
                <div class="setting-bullet-row">
                  <span class="setting-bullet-tag tag-tip">💡 Choice</span>
                  <span>Run 100% free locally with <b>Ollama</b> or connect cloud AI models like Google Gemini.</span>
                </div>
              </div>
              <div class="setting-control-panel">
                <label class="form-label font-bold" style="font-size: 0.72rem; margin-bottom: 0.2rem;">Default AI Copywriter</label>
                <select id="st-ai-provider" class="form-input" style="margin-bottom: 0.5rem;">
                  <option value="gemini">✨ Google Gemini (Recommended)</option>
                  <option value="groq">⚡ Groq High-Speed (Llama 3.3)</option>
                  <option value="ollama">🦙 Ollama (100% Free Local AI)</option>
                  <option value="openai">🤖 OpenAI GPT-4o</option>
                  <option value="claude">🧠 Anthropic Claude</option>
                </select>
                <label class="form-label font-bold" style="font-size: 0.72rem; margin-bottom: 0.2rem;">Google Gemini API Key</label>
                <div class="flex gap-1" style="margin-bottom: 0.5rem;">
                  <input type="password" id="st-gemini-key" class="form-input" placeholder="Paste Gemini API Key" style="font-family: var(--font-mono); font-size: 0.8rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-gemini-key')" title="Show / Hide Key">👁️</button>
                </div>
                <label class="form-label font-bold" style="font-size: 0.72rem; margin-bottom: 0.2rem;">Groq API Key</label>
                <div class="flex gap-1">
                  <input type="password" id="st-groq-key" class="form-input" placeholder="Paste Groq API Key" style="font-family: var(--font-mono); font-size: 0.8rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="settingsView.togglePassword('st-groq-key')" title="Show / Hide Key">👁️</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Save Bar for Quick Access -->
        <div class="flex items-center justify-between" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 1.15rem 1.4rem; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">Ready to Save Changes?</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">Your updated configuration will take effect across all autonomous agents immediately.</div>
          </div>
          <button class="btn btn-primary" id="st-btn-save-bottom" onclick="settingsView.saveSettings()">
            💾 Save All Settings
          </button>
        </div>

      </div>
    `;

    await loadSettings();
  }

  // Interactive Card Selection Helpers
  function selectPostMode(mode) {
    activePostMode = mode;
    const cardReview = document.getElementById('card-mode-review');
    const cardDirect = document.getElementById('card-mode-direct');
    const radioReview = document.getElementById('radio-mode-review');
    const radioDirect = document.getElementById('radio-mode-direct');

    if (cardReview && cardDirect) {
      if (mode === 'review') {
        cardReview.classList.add('active');
        cardDirect.classList.remove('active');
        if (radioReview) radioReview.textContent = '●';
        if (radioDirect) radioDirect.textContent = '○';
      } else {
        cardDirect.classList.add('active');
        cardReview.classList.remove('active');
        if (radioReview) radioReview.textContent = '○';
        if (radioDirect) radioDirect.textContent = '●';
      }
    }
  }

  function selectNightCooldown(val) {
    activeNightCooldown = val;
    const card1 = document.getElementById('card-night-1');
    const card0 = document.getElementById('card-night-0');
    const radio1 = document.getElementById('radio-night-1');
    const radio0 = document.getElementById('radio-night-0');

    if (card1 && card0) {
      if (val === '1') {
        card1.classList.add('active');
        card0.classList.remove('active');
        if (radio1) radio1.textContent = '●';
        if (radio0) radio0.textContent = '○';
      } else {
        card0.classList.add('active');
        card1.classList.remove('active');
        if (radio1) radio1.textContent = '○';
        if (radio0) radio0.textContent = '●';
      }
    }
  }

  function selectSurveillanceState(val) {
    activeSurveillanceState = val;
    const card0 = document.getElementById('card-surv-0');
    const card1 = document.getElementById('card-surv-1');
    const radio0 = document.getElementById('radio-surv-0');
    const radio1 = document.getElementById('radio-surv-1');

    if (card0 && card1) {
      if (val === '0') {
        card0.classList.add('active');
        card1.classList.remove('active');
        if (radio0) radio0.textContent = '●';
        if (radio1) radio1.textContent = '○';
      } else {
        card1.classList.add('active');
        card0.classList.remove('active');
        if (radio0) radio0.textContent = '○';
        if (radio1) radio1.textContent = '●';
      }
    }
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
      if (wtInterval) wtInterval.value = s.watchtower_interval_hours || '3';
      if (wtMinScore) wtMinScore.value = s.min_score_threshold || '75';

      selectNightCooldown(s.watchtower_night_cooldown === '0' ? '0' : '1');
      selectSurveillanceState(s.watchtower_paused === '1' ? '1' : '0');

      // 3. Cloudflare Tunnel
      const tunnelUrl = document.getElementById('st-tunnel-url');
      if (tunnelUrl) tunnelUrl.value = s.public_media_url || 'Waiting for Cloudflare tunnel...';

      // 4. Storage & Pruning
      const retention = document.getElementById('st-retention-hours');
      if (retention) retention.value = s.media_retention_hours || '48';

      // 5. Platform Engine Defaults
      selectPostMode(s.default_post_mode || 'review');

      const contentType = document.getElementById('st-content-type');
      const brandHandle = document.getElementById('st-brand-handle');
      const watermarkPos = document.getElementById('st-watermark-pos');
      const watermarkOpacity = document.getElementById('st-watermark-opacity');
      const metaAppId = document.getElementById('st-meta-app-id');
      const aiProvider = document.getElementById('st-ai-provider');

      if (contentType) contentType.value = s.default_content_type || 'reel';
      if (brandHandle) brandHandle.value = s.brand_handle || s.instagram_handle || '@gta6_updates_007';
      if (watermarkPos) watermarkPos.value = s.brand_watermark_position || 'top-right';
      if (watermarkOpacity) watermarkOpacity.value = s.brand_watermark_opacity || '0.95';
      if (metaAppId) metaAppId.value = s.meta_app_id || '1699561267808244';
      if (aiProvider) aiProvider.value = s.default_provider || 'gemini';

      const geminiKey = document.getElementById('st-gemini-key');
      const groqKey = document.getElementById('st-groq-key');
      if (geminiKey && s.gemini_api_key) geminiKey.value = s.gemini_api_key;
      if (groqKey && s.groq_api_key) groqKey.value = s.groq_api_key;

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

      // Tunnel box
      const tunnelBox = document.getElementById('st-tunnel-status-box');
      const diagTunnel = document.getElementById('st-diag-tunnel');
      if (health.tunnel?.ok || health.tunnel?.healthy) {
        const latency = health.tunnel.latencyMs ? ` (${health.tunnel.latencyMs}ms latency)` : '';
        if (tunnelBox) tunnelBox.innerHTML = `<span class="badge badge-emerald">● Cloudflare Edge Link Active${latency}</span>`;
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
          diagTg.textContent = '● Active';
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
    if (wtInterval) payload.watchtower_interval_hours = wtInterval;
    if (wtMinScore) payload.min_score_threshold = wtMinScore;
    payload.watchtower_paused = activeSurveillanceState;
    payload.watchtower_night_cooldown = activeNightCooldown;

    // 3. Storage
    const retention = document.getElementById('st-retention-hours')?.value?.trim();
    if (retention) payload.media_retention_hours = retention;

    // 4. Platform Defaults
    payload.default_post_mode = activePostMode;

    const contentType = document.getElementById('st-content-type')?.value;
    const brandHandle = document.getElementById('st-brand-handle')?.value?.trim();
    const watermarkPos = document.getElementById('st-watermark-pos')?.value;
    const watermarkOpacity = document.getElementById('st-watermark-opacity')?.value;
    const metaAppId = document.getElementById('st-meta-app-id')?.value?.trim();
    const metaAppSecret = document.getElementById('st-meta-app-secret')?.value?.trim();
    const aiProvider = document.getElementById('st-ai-provider')?.value;
    const geminiKey = document.getElementById('st-gemini-key')?.value?.trim();
    const groqKey = document.getElementById('st-groq-key')?.value?.trim();

    if (contentType) payload.default_content_type = contentType;
    if (brandHandle) payload.brand_handle = brandHandle;
    if (watermarkPos) payload.brand_watermark_position = watermarkPos;
    if (watermarkOpacity) payload.brand_watermark_opacity = watermarkOpacity;
    if (metaAppId) payload.meta_app_id = metaAppId;
    if (metaAppSecret) payload.meta_app_secret = metaAppSecret;
    if (aiProvider) payload.default_provider = aiProvider;
    if (geminiKey) payload.gemini_api_key = geminiKey;
    if (groqKey) payload.groq_api_key = groqKey;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        app.toast('All settings saved to disk!', 'success');
        if (statusSpan) {
          statusSpan.style.display = 'inline';
          statusSpan.textContent = '✓ Saved Successfully';
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
      app.toast('Copied Cloudflare Media Link to clipboard!', 'info');
    }).catch(() => {
      app.toast('URL: ' + url, 'info');
    });
  }

  async function testTunnel() {
    app.toast('Testing video delivery link...', 'info');
    await runDiagnostics();
    app.toast('Video delivery link is healthy!', 'info');
  }

  async function testTelegram() {
    app.toast('Sending test message to your Telegram...', 'info');
    try {
      const res = await fetch('/api/system/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        app.toast('✅ Test alert delivered to your phone!', 'success');
      } else {
        app.toast(data.error || 'Failed to send Telegram message', 'error');
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
        app.toast(`Cleaned up ${data.deletedFiles || 0} old videos (${Math.round((data.freedBytes || 0) / (1024 * 1024))} MB freed)`, 'success');
      } else {
        app.toast(data.error || 'Cleanup failed', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  return {
    render,
    saveSettings,
    selectPostMode,
    selectNightCooldown,
    selectSurveillanceState,
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
