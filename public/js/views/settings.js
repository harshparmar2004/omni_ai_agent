/**
 * OmniStudio v7 — Settings & Diagnostics View
 * Platform settings for Telegram Bot, Watchtower, Cloudflare Tunnel, and Disk Retention
 */
window.settingsView = (function() {
  async function render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0 0 0.2rem 0;">Settings & System Health</h2>
          <p class="text-sm text-muted">Configure global agent parameters, Telegram credentials, and storage pruning</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="settingsView.saveSettings()">
          💾 Save Settings
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <!-- Telegram Configuration -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size: 1.4rem; line-height: 1;">✈️</span>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Telegram Bot & Security</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Direct mobile reposting gate</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Telegram Bot Token</label>
            <input type="password" id="st-tg-token" class="form-input" placeholder="Leave empty to keep existing">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">From @BotFather. Agent 1 listens on this bot.</div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Allowed Chat IDs (Whitelisted)</label>
            <input type="text" id="st-tg-chats" class="form-input" placeholder="e.g. 5443723531, 987654321" style="font-family: var(--font-mono); font-size: 0.82rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Comma-separated list of numeric IDs. Non-whitelisted users are rejected.</div>
          </div>

          <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.testTelegram()">
            🔔 Send Test Alert to Telegram
          </button>
        </div>

        <!-- Watchtower Configuration -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size: 1.4rem; line-height: 1;">🛰️</span>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Watchtower Surveillance</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Autonomous competitor & source scanner</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Surveillance Cadence (Hours)</label>
            <input type="number" id="st-wt-interval" class="form-input" min="1" max="24" value="3">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Interval between source feed inspection cycles. Default: 3 hours.</div>
          </div>

          <div class="form-group mb-4" style="background: var(--bg-input); padding: 0.75rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; font-size: 0.82rem; margin-bottom: 0.2rem; color: var(--text-primary);">Night Mode Cooldown (Circadian Rhythm)</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4;">Automatically pauses surveillance from 01:00 AM to 06:30 AM local time to emulate natural human sleeping behavior.</div>
          </div>
        </div>

        <!-- Public Media Tunnel -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size: 1.4rem; line-height: 1;">🌐</span>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Cloudflare Media Tunnel</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Meta Graph API video container ingester</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Current Public Media URL</label>
            <input type="text" id="st-tunnel-url" class="form-input" readonly style="font-family: var(--font-mono); font-size: 0.78rem; background: var(--bg-input); color: var(--accent-primary);">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Meta Graph API servers download 1080p MP4 files from this edge address.</div>
          </div>

          <div id="st-tunnel-status-box" style="background: var(--bg-input); padding: 0.65rem 0.85rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); font-size: 0.8rem; margin-bottom: 1rem;">
            Checking tunnel health...
          </div>
        </div>

        <!-- Storage & Retention -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <span style="font-size: 1.4rem; line-height: 1;">🧹</span>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Storage & Cache Pruning</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Automated cleanup of local video files</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Media Retention (Hours)</label>
            <input type="number" id="st-retention-hours" class="form-input" min="6" max="168" value="48">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Local MP4 files older than this will be safely deleted after posting.</div>
          </div>

          <button class="btn btn-secondary btn-sm w-full" onclick="settingsView.pruneMedia()">
            🗑️ Prune Expired Local Media Now
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

      const tgChats = document.getElementById('st-tg-chats');
      const wtInterval = document.getElementById('st-wt-interval');
      const tunnelUrl = document.getElementById('st-tunnel-url');
      const retention = document.getElementById('st-retention-hours');

      if (tgChats) tgChats.value = s.telegram_allowed_chat_ids || '5443723531';
      if (wtInterval) wtInterval.value = s.watchtower_interval_hours || '3';
      if (tunnelUrl) tunnelUrl.value = s.public_media_url || 'Waiting for Cloudflare tunnel...';
      if (retention) retention.value = s.media_retention_hours || '48';

      // Health status check
      const healthRes = await fetch('/api/system/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        const box = document.getElementById('st-tunnel-status-box');
        if (box) {
          if (health.tunnel?.healthy) {
            box.innerHTML = `<span class="badge badge-emerald">● Cloudflare Tunnel Healthy & Reachable</span>`;
          } else {
            box.innerHTML = `<span class="badge badge-amber">● Tunnel: Local / Port Forwarding</span>`;
          }
        }
      }
    } catch (err) {
      console.warn('[loadSettings error]:', err);
    }
  }

  async function saveSettings() {
    const tgToken = document.getElementById('st-tg-token')?.value?.trim();
    const tgChats = document.getElementById('st-tg-chats')?.value?.trim();
    const wtInterval = document.getElementById('st-wt-interval')?.value?.trim();
    const retention = document.getElementById('st-retention-hours')?.value?.trim();

    const payload = {};
    if (tgToken) payload.telegram_bot_token = tgToken;
    if (tgChats) payload.telegram_allowed_chat_ids = tgChats;
    if (wtInterval) payload.watchtower_interval_hours = wtInterval;
    if (retention) payload.media_retention_hours = retention;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        app.toast('Settings saved successfully!', 'success');
        document.getElementById('st-tg-token').value = '';
      } else {
        app.toast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
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
    testTelegram,
    pruneMedia,
    refresh: loadSettings
  };
})();
