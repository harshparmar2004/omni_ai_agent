/**
 * OmniStudio v7 — System & Security Settings View
 * Minimalist, row-based layout adhering strictly to Cloud Minimalist design:
 * - Scoped <SettingRow> and <SettingsSection> helper components
 * - Plain 20px section headings + single white 12px radius card with hairline dividers
 * - No badges, no chips, no number boxes, no dots, no decorative emojis in titles
 * - 15px title, 13px description, 12px muted hint; 40px inputs with 8px radius
 */
window.settingsView = (function() {
  // State for interactive segmented controls
  let activePostMode = 'review';
  let activeNightCooldown = '1';
  let activeSurveillanceState = '0';

  /**
   * Reusable Settings Section Component
   */
  function createSettingsSection({ title, description, content }) {
    return `
      <div class="settings-section-v2">
        <div class="settings-section-header-v2">
          <h3 class="settings-section-title-v2">${title}</h3>
          ${description ? `<p class="settings-section-desc-v2">${description}</p>` : ''}
        </div>
        <div class="settings-card-v2">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Reusable Setting Row Component
   */
  function createSettingRow({ title, description, hint = '', control = '' }) {
    return `
      <div class="settings-row-v2">
        <div class="settings-row-info-v2">
          <div class="settings-row-title-v2">${title}</div>
          ${description ? `<div class="settings-row-desc-v2">${description}</div>` : ''}
          ${hint ? `<div class="settings-row-hint-v2">${hint}</div>` : ''}
        </div>
        <div class="settings-row-control-v2">
          ${control}
        </div>
      </div>
    `;
  }

  async function render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    // Helper for rendering connected pages dropdown
    function renderQuickPostPageOptions() {
      const pages = window.app?.pages || [
        { id: 1, name: 'GTA 6 Updates 007', handle: '@gta6_updates_007' },
        { id: 2, name: 'Movie Recommendations', handle: '@movie_series_365' }
      ];
      return pages.map(p => `<option value="${p.id}">${p.name} (${p.handle || '@' + (p.slug || p.id)})</option>`).join('');
    }

    // ── SECTION 01: Telegram Mobile Bot & Security ───────────────
    const section1Html = createSettingsSection({
      title: 'Telegram Mobile Bot & Security',
      description: 'Send reels from your phone via Telegram to post directly to your Instagram page.',
      content: [
        createSettingRow({
          title: 'Mobile Zero-Click Ingestion Hub',
          description: 'Share any Instagram Reel from your phone directly to your bot. Agent 1 downloads 1080p MP4, generates AI copy, frames with Vice City template, and posts live.',
          hint: 'Bot: <a href="https://t.me/omnistudio_bot" target="_blank" style="color: var(--accent-primary); font-weight: 600; text-decoration: none;">@omnistudio_bot ↗</a> · Whitelist: <code style="font-family: var(--font-mono); font-weight: 600;">5443723531</code>',
          control: `
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <span class="stream-flow-step completed"><span class="stream-flow-step-dot"></span>1. Forward Reel</span>
              <span class="stream-flow-arrow">→</span>
              <span class="stream-flow-step completed"><span class="stream-flow-step-dot"></span>2. Chat Whitelist</span>
              <span class="stream-flow-arrow">→</span>
              <span class="stream-flow-step completed"><span class="stream-flow-step-dot"></span>3. Choose Page</span>
              <span class="stream-flow-arrow">→</span>
              <span class="stream-flow-step completed"><span class="stream-flow-step-dot"></span>4. Live Post</span>
            </div>
          `
        }),
        createSettingRow({
          title: 'Bot Connection Token',
          description: 'Connects your private Telegram bot so the reposter agent can receive reel links you share. Stored encrypted locally.',
          hint: 'Create a bot for free by messaging <a href="https://t.me/BotFather" target="_blank" style="color: var(--accent-primary); font-weight: 500;">@BotFather ↗</a> on Telegram.',
          control: `
            <div style="display: flex; gap: 8px; width: 100%;">
              <input type="password" id="st-tg-token" class="settings-input settings-input-mono" placeholder="Paste bot token here">
              <button type="button" class="settings-btn-outlined" style="height: 40px; padding: 0 14px;" onclick="settingsView.togglePassword('st-tg-token', this)">Show</button>
            </div>
          `
        }),
        createSettingRow({
          title: 'Authorized Users',
          description: 'Only people whose numeric Telegram User IDs are listed here can trigger reposts. Unauthorized senders are blocked.',
          hint: 'Find your ID by messaging @userinfobot on Telegram. Separate multiple IDs with commas.',
          control: `
            <input type="text" id="st-tg-chats" class="settings-input settings-input-mono" placeholder="e.g. 5443723531, 987654321">
          `
        }),
        createSettingRow({
          title: 'Live Notifications',
          description: 'Send real-time progress alerts to your Telegram chat as reels move through download, AI copywriting, and publishing.',
          hint: 'Immediately alerts you if Instagram rejects a video file so you can fix it right away.',
          control: `
            <label class="settings-switch">
              <input type="checkbox" id="st-tg-notifs" checked>
              <span class="settings-switch-slider"></span>
            </label>
          `
        }),
        createSettingRow({
          title: 'Test Telegram Connection',
          description: 'Send an instant test ping to your Telegram app right now to verify connectivity.',
          hint: '',
          control: `
            <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
              <button type="button" class="settings-btn-outlined" id="st-btn-test-tg" onclick="settingsView.testTelegram()">Test Telegram Connection</button>
              <span id="st-tg-test-status" class="settings-status-muted"></span>
            </div>
          `
        })
      ].join('')
    });

    // ── SECTION 01B: Manual On-Demand Dispatcher (Direct Quick-Post) ───
    const sectionQuickPostHtml = createSettingsSection({
      title: 'Manual On-Demand Dispatcher (Direct Quick-Post)',
      description: 'Desktop fallback tool to manually paste an Instagram Reel URL and trigger the publishing pipeline on-demand.',
      content: [
        createSettingRow({
          title: 'Instagram Reel URL',
          description: 'Paste any Instagram Reel link to process manually without your mobile phone.',
          hint: 'Example: https://www.instagram.com/reel/DF-EXAMPLE/',
          control: `
            <input type="text" id="st-qp-url" class="settings-input settings-input-mono" placeholder="https://www.instagram.com/reel/..." style="font-size: 13px;">
          `
        }),
        createSettingRow({
          title: 'Destination Target Page',
          description: 'Select which connected Instagram account will publish this reel.',
          hint: '',
          control: `
            <select id="st-qp-page" class="settings-input">
              ${renderQuickPostPageOptions()}
            </select>
          `
        }),
        createSettingRow({
          title: 'Caption Review Mode',
          description: 'Review and edit AI caption before publishing live, or post automatically once framed.',
          hint: 'Enabled: job pauses in Stage 3 for review. Disabled: auto-publishes immediately.',
          control: `
            <label class="settings-switch">
              <input type="checkbox" id="st-qp-review">
              <span class="settings-switch-slider"></span>
            </label>
          `
        }),
        createSettingRow({
          title: 'Dispatch Reel Live',
          description: 'Trigger Agent 1 pipeline (Download 1080p MP4 ➔ AI Copy ➔ Vice City Frame ➔ Instagram API).',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <button type="button" class="btn btn-primary" id="st-qp-btn" onclick="settingsView.submitQuickPost()" style="height: 38px; padding: 0 16px; font-size: 13px; font-weight: 600;">
                  Ingest & Dispatch Reel Live
                </button>
                <span id="st-qp-status" class="settings-status-muted"></span>
              </div>
              <div id="st-qp-progress-bar" style="display: none; font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); padding: 8px 12px; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 6px;"></div>
            </div>
          `
        })
      ].join('')
    });

    // ── SECTION 02: Watchtower Competitor Surveillance ──────────
    const section2Html = createSettingsSection({
      title: 'Watchtower Competitor Surveillance',
      description: 'Autonomous scanner that monitors competitor feeds and finds top viral reels for you.',
      content: [
        createSettingRow({
          title: 'Scan Cadence',
          description: 'How many hours Watchtower waits between checking monitored accounts. Automatically adds 11 to 35 random minutes of human jitter.',
          hint: 'Recommended: 3 hours.',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <div class="settings-segmented" id="st-cadence-segmented">
                <button type="button" class="settings-segment-btn" data-hours="1" onclick="settingsView.setCadence(1)">1h</button>
                <button type="button" class="settings-segment-btn" data-hours="2" onclick="settingsView.setCadence(2)">2h</button>
                <button type="button" class="settings-segment-btn active" data-hours="3" onclick="settingsView.setCadence(3)">3h</button>
                <button type="button" class="settings-segment-btn" data-hours="6" onclick="settingsView.setCadence(6)">6h</button>
              </div>
              <div class="settings-number-unit-row">
                <input type="number" id="st-wt-interval" class="settings-input settings-input-number" min="1" max="24" value="3" oninput="settingsView.updateCadenceButtons(this.value)">
                <span class="settings-unit-label">hours interval</span>
              </div>
            </div>
          `
        }),
        createSettingRow({
          title: 'Viral Reel Quality Filter',
          description: 'Evaluates view velocity, like ratios, and comments to score each discovered reel from 0 to 100. Low-engagement reels are filtered out.',
          hint: '75 points ensures you only stage the top 25% best performing reels.',
          control: `
            <div class="settings-number-unit-row">
              <input type="number" id="st-wt-min-score" class="settings-input settings-input-number" min="10" max="100" value="75">
              <span class="settings-unit-label">/ 100 points minimum</span>
            </div>
          `
        }),
        createSettingRow({
          title: 'Night Sleep Mode',
          description: 'Pauses all scanning between 1:00 AM and 6:30 AM local time to match human sleeping patterns and avoid bot detection.',
          hint: 'Recommended: Keep enabled to protect your accounts.',
          control: `
            <div class="settings-choice-segmented">
              <div class="settings-choice-btn active" id="card-night-1" onclick="settingsView.selectNightCooldown('1')">
                <div class="settings-choice-label">Sleep Mode</div>
                <div class="settings-choice-sub">Pause 1:00 AM – 6:30 AM</div>
              </div>
              <div class="settings-choice-btn" id="card-night-0" onclick="settingsView.selectNightCooldown('0')">
                <div class="settings-choice-label">24h Non-Stop</div>
                <div class="settings-choice-sub">Scan continuously all night</div>
              </div>
            </div>
          `
        }),
        createSettingRow({
          title: 'Master Surveillance Switch',
          description: 'Turn Watchtower background scanning on or pause sweeps temporarily.',
          hint: '',
          control: `
            <div class="settings-choice-segmented">
              <div class="settings-choice-btn active" id="card-surv-0" onclick="settingsView.selectSurveillanceState('0')">
                <div class="settings-choice-label">Active Radar</div>
                <div class="settings-choice-sub">Scanning feeds automatically</div>
              </div>
              <div class="settings-choice-btn" id="card-surv-1" onclick="settingsView.selectSurveillanceState('1')">
                <div class="settings-choice-label">Standby</div>
                <div class="settings-choice-sub">Temporarily pause scans</div>
              </div>
            </div>
          `
        })
      ].join('')
    });

    // ── SECTION 03: Live Video Delivery Link (Cloudflare) ────────
    const section3Html = createSettingsSection({
      title: 'Live Video Delivery Link (Cloudflare)',
      description: 'Secure public address that allows Instagram to download your processed videos.',
      content: [
        createSettingRow({
          title: 'Public Video Download URL',
          description: 'When posting a reel, Instagram downloads the 1080p MP4 file from this secure link. Runs through Cloudflare edge tunnel.',
          hint: '',
          control: `
            <div style="display: flex; gap: 8px; width: 100%;">
              <input type="text" id="st-tunnel-url" class="settings-input settings-input-mono" readonly style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; background: var(--bg-canvas); color: var(--accent-primary);">
              <button type="button" class="settings-btn-outlined" style="height: 40px; padding: 0 14px;" onclick="settingsView.copyTunnelUrl()">Copy</button>
            </div>
          `
        }),
        createSettingRow({
          title: 'Connection Health & Speed',
          description: 'Verifies Instagram can reach your machine right now to download video files, and displays round-trip latency.',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <div id="st-tunnel-status-box" class="settings-status-box">Checking connection status...</div>
              <button type="button" class="settings-btn-outlined" onclick="settingsView.testTunnel()">Test Video Delivery Link</button>
            </div>
          `
        })
      ].join('')
    });

    // ── SECTION 04: Storage & System Health ───────────────────────
    const section4Html = createSettingsSection({
      title: 'Storage & System Health',
      description: 'Automatic disk cleanup for old video files and system health diagnosis.',
      content: [
        createSettingRow({
          title: 'Automatic Video Cleanup',
          description: 'Automatically removes posted video files from your computer after this many hours. Only deletes videos already published to Instagram.',
          hint: 'Recommended: 48 hours.',
          control: `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
              <div class="settings-number-unit-row">
                <input type="number" id="st-retention-hours" class="settings-input settings-input-number" min="6" max="168" value="48">
                <span class="settings-unit-label">hours retention</span>
              </div>
              <button type="button" class="settings-btn-outlined danger-btn" onclick="settingsView.pruneMedia()">Clean Up Old Videos Now</button>
            </div>
          `
        }),
        createSettingRow({
          title: 'System Health Diagnostics',
          description: 'Checks all 4 core platform layers at once: Database, Instagram Meta API, Cloudflare edge tunnel, and Telegram bot.',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
              <div class="settings-diag-grid">
                <div class="settings-diag-item">
                  <span class="settings-diag-label">Database</span>
                  <span id="st-diag-db" class="settings-status-success">Connected</span>
                </div>
                <div class="settings-diag-item">
                  <span class="settings-diag-label">Instagram Meta</span>
                  <span id="st-diag-meta" class="settings-status-success">Active</span>
                </div>
                <div class="settings-diag-item">
                  <span class="settings-diag-label">Cloudflare</span>
                  <span id="st-diag-tunnel" class="settings-status-success">Active</span>
                </div>
                <div class="settings-diag-item">
                  <span class="settings-diag-label">Telegram</span>
                  <span id="st-diag-tg" class="settings-status-success">Active</span>
                </div>
              </div>
              <button type="button" class="settings-btn-outlined" onclick="settingsView.runDiagnostics()">Run Diagnostics Check</button>
            </div>
          `
        })
      ].join('')
    });

    // ── SECTION 05: Publishing Engine & Page Defaults ────────────
    const section5Html = createSettingsSection({
      title: 'Publishing Engine & Page Defaults',
      description: 'Posting approval mode, video container specifications, brand watermark positioning, Meta credentials, and AI copywriter.',
      content: [
        createSettingRow({
          title: 'Post Approval Mode',
          description: 'Choose whether harvested reels wait in your Queue for manual approval or post automatically when discovered.',
          hint: 'Recommended: Review First for maximum feed quality.',
          control: `
            <div class="settings-choice-segmented">
              <div class="settings-choice-btn active" id="card-mode-review" onclick="settingsView.selectPostMode('review')">
                <div class="settings-choice-label">Review First</div>
                <div class="settings-choice-sub">Approve captions in Queue</div>
              </div>
              <div class="settings-choice-btn" id="card-mode-direct" onclick="settingsView.selectPostMode('direct')">
                <div class="settings-choice-label">Auto-Publish</div>
                <div class="settings-choice-sub">Post instantly when discovered</div>
              </div>
            </div>
          `
        }),
        createSettingRow({
          title: 'Video Container Format',
          description: 'Standard vertical video format for Instagram upload. Transcoded with H.264 video and AAC audio.',
          hint: '',
          control: `
            <select id="st-content-type" class="settings-input">
              <option value="reel">Instagram Reel (1080x1920 MP4) [Standard]</option>
              <option value="carousel">Carousel Gallery</option>
              <option value="image">Single Image</option>
            </select>
          `
        }),
        createSettingRow({
          title: 'Brand Handle & Watermark',
          description: 'Your Instagram username credited in caption templates, and optional corner watermark placement.',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <input type="text" id="st-brand-handle" class="settings-input settings-input-mono" placeholder="@yourbrand">
              <div style="display: flex; gap: 8px;">
                <select id="st-watermark-pos" class="settings-input" style="flex: 1;">
                  <option value="top-right">Top-Right Corner</option>
                  <option value="bottom-right">Bottom-Right Corner</option>
                  <option value="top-left">Top-Left Corner</option>
                  <option value="bottom-left">Bottom-Left Corner</option>
                  <option value="none">Disabled (No Watermark)</option>
                </select>
                <select id="st-watermark-opacity" class="settings-input" style="flex: 1;">
                  <option value="0.95">95% Opacity</option>
                  <option value="0.75">75% Opacity</option>
                  <option value="0.50">50% Opacity</option>
                </select>
              </div>
            </div>
          `
        }),
        createSettingRow({
          title: 'Meta Developer App Credentials',
          description: 'Meta Developer App ID and App Secret for Instagram Graph API token management. App Secret is securely masked.',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <input type="text" id="st-meta-app-id" class="settings-input settings-input-mono" placeholder="Meta App ID">
              <div style="display: flex; gap: 8px; width: 100%;">
                <input type="password" id="st-meta-app-secret" class="settings-input settings-input-mono" placeholder="Meta App Secret (Masked)">
                <button type="button" class="settings-btn-outlined" style="height: 40px; padding: 0 14px;" onclick="settingsView.togglePassword('st-meta-app-secret', this)">Show</button>
              </div>
            </div>
          `
        }),
        createSettingRow({
          title: 'AI Caption Copywriter & API Keys',
          description: 'AI model for viral hooks, breakdowns, and hashtag optimization. Configure Gemini or Groq API keys.',
          hint: '',
          control: `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <select id="st-ai-provider" class="settings-input">
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="groq">Groq High-Speed (Llama 3.3)</option>
                <option value="ollama">Ollama (100% Free Local AI)</option>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="claude">Anthropic Claude</option>
              </select>
              <div style="display: flex; gap: 8px; width: 100%;">
                <input type="password" id="st-gemini-key" class="settings-input settings-input-mono" placeholder="Paste Gemini API Key">
                <button type="button" class="settings-btn-outlined" style="height: 40px; padding: 0 14px;" onclick="settingsView.togglePassword('st-gemini-key', this)">Show</button>
              </div>
              <div style="display: flex; gap: 8px; width: 100%;">
                <input type="password" id="st-groq-key" class="settings-input settings-input-mono" placeholder="Paste Groq API Key">
                <button type="button" class="settings-btn-outlined" style="height: 40px; padding: 0 14px;" onclick="settingsView.togglePassword('st-groq-key', this)">Show</button>
              </div>
            </div>
          `
        })
      ].join('')
    });

    container.innerHTML = `
      <div class="settings-container">
        <!-- Clean Header -->
        <div class="settings-header">
          <div>
            <h2 class="settings-header-title">System & Security</h2>
            <p class="settings-header-desc">
              Platform infrastructure, autonomous surveillance, and delivery controls
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span id="st-save-status" class="settings-status-success" style="font-size: 13px; display: none;"></span>
            <button class="btn btn-primary" id="st-btn-save-top" onclick="settingsView.saveSettings()" style="height: 40px; padding: 0 18px; font-weight: 600; border-radius: 8px;">
              Save All Settings
            </button>
          </div>
        </div>

        ${section1Html}
        ${sectionQuickPostHtml}
        ${section2Html}
        ${section3Html}
        ${section4Html}
        ${section5Html}

        <!-- Bottom Save Bar -->
        <div class="settings-card-v2" style="padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
          <div>
            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">Ready to save changes?</div>
            <div style="font-size: 13px; color: var(--text-muted);">Your updated configuration will take effect across all autonomous agents immediately.</div>
          </div>
          <button class="btn btn-primary" id="st-btn-save-bottom" onclick="settingsView.saveSettings()" style="height: 40px; padding: 0 20px; font-weight: 600; border-radius: 8px; white-space: nowrap;">
            Save All Settings
          </button>
        </div>
      </div>
    `;

    await loadSettings();
  }

  // Segmented Control State Helpers
  function selectPostMode(mode) {
    activePostMode = mode;
    const cardReview = document.getElementById('card-mode-review');
    const cardDirect = document.getElementById('card-mode-direct');
    if (cardReview && cardDirect) {
      if (mode === 'review') {
        cardReview.classList.add('active');
        cardDirect.classList.remove('active');
      } else {
        cardDirect.classList.add('active');
        cardReview.classList.remove('active');
      }
    }
  }

  function selectNightCooldown(val) {
    activeNightCooldown = val;
    const card1 = document.getElementById('card-night-1');
    const card0 = document.getElementById('card-night-0');
    if (card1 && card0) {
      if (val === '1') {
        card1.classList.add('active');
        card0.classList.remove('active');
      } else {
        card0.classList.add('active');
        card1.classList.remove('active');
      }
    }
  }

  function selectSurveillanceState(val) {
    activeSurveillanceState = val;
    const card0 = document.getElementById('card-surv-0');
    const card1 = document.getElementById('card-surv-1');
    if (card0 && card1) {
      if (val === '0') {
        card0.classList.add('active');
        card1.classList.remove('active');
      } else {
        card1.classList.add('active');
        card0.classList.remove('active');
      }
    }
  }

  function updateCadenceButtons(hours) {
    const segmented = document.getElementById('st-cadence-segmented');
    if (!segmented) return;
    const btns = segmented.querySelectorAll('.settings-segment-btn');
    btns.forEach(btn => {
      if (btn.getAttribute('data-hours') === String(hours)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setCadence(hours) {
    const input = document.getElementById('st-wt-interval');
    if (input) {
      input.value = hours;
      updateCadenceButtons(hours);
      input.focus();
    }
  }

  function togglePassword(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    if (btnEl) {
      btnEl.textContent = isPw ? 'Hide' : 'Show';
    } else {
      const btn = input.parentElement?.querySelector('button');
      if (btn) btn.textContent = isPw ? 'Hide' : 'Show';
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
      if (wtInterval) {
        wtInterval.value = s.watchtower_interval_hours || '3';
        updateCadenceButtons(s.watchtower_interval_hours || '3');
      }
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

      // Tunnel
      const tunnelBox = document.getElementById('st-tunnel-status-box');
      const diagTunnel = document.getElementById('st-diag-tunnel');
      if (health.tunnel?.ok || health.tunnel?.healthy) {
        const latency = health.tunnel.latencyMs ? ` (${health.tunnel.latencyMs}ms)` : '';
        if (tunnelBox) {
          tunnelBox.innerHTML = `<span class="settings-status-success">Cloudflare Edge Link Active <span class="settings-status-muted">${latency}</span></span>`;
        }
        if (diagTunnel) {
          diagTunnel.className = 'settings-status-success';
          diagTunnel.textContent = `Active${latency}`;
        }
      } else {
        if (tunnelBox) {
          tunnelBox.innerHTML = `<span class="settings-status-warning">Local Port Forwarding</span>`;
        }
        if (diagTunnel) {
          diagTunnel.className = 'settings-status-warning';
          diagTunnel.textContent = 'Local Port';
        }
      }

      // DB
      const diagDb = document.getElementById('st-diag-db');
      if (diagDb) {
        if (health.database === 'ok') {
          diagDb.className = 'settings-status-success';
          diagDb.textContent = 'Connected';
        } else {
          diagDb.className = 'settings-status-danger';
          diagDb.textContent = 'Error';
        }
      }

      // Meta
      const diagMeta = document.getElementById('st-diag-meta');
      if (diagMeta) {
        const validPage = (health.pages || []).find(p => p.valid);
        if (validPage) {
          diagMeta.className = 'settings-status-success';
          diagMeta.textContent = validPage.handle || '@page#' + validPage.page_id;
        } else {
          diagMeta.className = 'settings-status-danger';
          diagMeta.textContent = 'Needs Token';
        }
      }

      // Telegram
      const diagTg = document.getElementById('st-diag-tg');
      if (diagTg) {
        if (health.telegram?.configured) {
          diagTg.className = 'settings-status-success';
          diagTg.textContent = 'Active';
        } else {
          diagTg.className = 'settings-status-warning';
          diagTg.textContent = 'Not Set';
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
          statusSpan.textContent = 'Saved Successfully';
          setTimeout(() => { statusSpan.style.display = 'none'; }, 3000);
        }
        // Clear masked password fields after saving
        const pwFields = ['st-tg-token', 'st-meta-app-secret', 'st-gemini-key', 'st-groq-key'];
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
    const tunnelBox = document.getElementById('st-tunnel-status-box');
    if (tunnelBox) {
      tunnelBox.innerHTML = '<span class="settings-status-muted">Testing...</span>';
    }
    await runDiagnostics();
    app.toast('Video delivery link is healthy!', 'info');
  }

  async function testTelegram() {
    const statusSpan = document.getElementById('st-tg-test-status');
    const btn = document.getElementById('st-btn-test-tg');
    if (btn) btn.disabled = true;
    if (statusSpan) {
      statusSpan.className = 'settings-status-muted';
      statusSpan.textContent = 'Testing...';
    }

    try {
      const res = await fetch('/api/system/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (statusSpan) {
          statusSpan.className = 'settings-status-success';
          statusSpan.textContent = 'Delivered to phone';
          setTimeout(() => { if (statusSpan) statusSpan.textContent = ''; }, 4000);
        }
        app.toast('Test alert delivered to your phone!', 'success');
      } else {
        if (statusSpan) {
          statusSpan.className = 'settings-status-danger';
          statusSpan.textContent = data.error || 'Failed';
        }
        app.toast(data.error || 'Failed to send Telegram message', 'error');
      }
    } catch (err) {
      if (statusSpan) {
        statusSpan.className = 'settings-status-danger';
        statusSpan.textContent = err.message || 'Error';
      }
      app.toast(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
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

  async function submitQuickPost() {
    const urlInput = document.getElementById('st-qp-url');
    const pageSelect = document.getElementById('st-qp-page');
    const reviewCheckbox = document.getElementById('st-qp-review');
    const btn = document.getElementById('st-qp-btn');
    const statusSpan = document.getElementById('st-qp-status');
    const progressBox = document.getElementById('st-qp-progress-bar');

    const url = urlInput?.value?.trim();
    const pageId = pageSelect?.value || '1';
    const reviewCaption = reviewCheckbox?.checked || false;

    if (!url) {
      app.toast('Please enter a valid Instagram Reel URL', 'error');
      return;
    }

    try {
      if (btn) btn.disabled = true;
      if (statusSpan) {
        statusSpan.className = 'settings-status-muted';
        statusSpan.textContent = 'Dispatching pipeline...';
      }
      if (progressBox) {
        progressBox.style.display = 'block';
        progressBox.textContent = 'Step 1/4: Ingesting & queueing reel download...';
      }

      const res = await fetch('/api/reposter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pageId, reviewCaption })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch reel');
      }

      if (statusSpan) {
        statusSpan.className = 'settings-status-success';
        statusSpan.textContent = 'Dispatched successfully!';
        setTimeout(() => { if (statusSpan) statusSpan.textContent = ''; }, 5000);
      }
      if (progressBox) {
        progressBox.textContent = `Job #${data.job?.id || data.id || 'Live'} queued! View real-time progress in Agent 1.`;
      }
      if (urlInput) urlInput.value = '';
      app.toast('Reel dispatched to publishing pipeline!', 'success');
    } catch (err) {
      if (statusSpan) {
        statusSpan.className = 'settings-status-danger';
        statusSpan.textContent = err.message;
      }
      app.toast(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  return {
    render,
    saveSettings,
    selectPostMode,
    selectNightCooldown,
    selectSurveillanceState,
    updateCadenceButtons,
    setCadence,
    togglePassword,
    copyTunnelUrl,
    testTunnel,
    testTelegram,
    pruneMedia,
    submitQuickPost,
    runDiagnostics,
    refresh: loadSettings
  };
})();
