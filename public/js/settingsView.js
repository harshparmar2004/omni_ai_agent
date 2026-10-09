/**
 * OmniStudio AI — Settings & Engine Configuration View
 * Multi-LLM provider selection, active model, content niche domain, API keys, Meta Verified publishing, and Telegram bot settings.
 */

const settingsView = {
  modelsByProvider: {
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    claude: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    ollama: ['gemma4:e4b', 'llama3.2', 'deepseek-r1:14b', 'qwen2.5:7b']
  },

  async render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    let settings = {};
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) settings = data.settings;
    } catch (err) {
      console.error('Failed to load settings:', err);
    }

    const s = (key, def = '') => settings[key] || def;

    container.innerHTML = `
      <div class="grid-2" style="grid-template-columns: 1fr 400px; align-items: start;">
        <!-- Left: Configuration Forms -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- 1. AI Engine & Niche Intelligence -->
          <div class="card" style="border: 1.5px solid rgba(37, 99, 235, 0.35); background: linear-gradient(135deg, rgba(37, 99, 235, 0.03), rgba(147, 51, 234, 0.03));">
            <div class="section-label" style="color: #2563EB;">AI Intelligence & Niche</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 0.4rem;">🤖 AI Engine & Content Niche Configuration</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Configure which LLM provider, target model, and industry domain our autonomous ranking and creative transformation engines use.
            </p>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label font-bold">Default LLM Provider</label>
                <select id="set-default-provider" class="form-select" onchange="settingsView.onProviderChange(this.value)">
                  <option value="gemini" ${s('default_provider') === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                  <option value="claude" ${s('default_provider') === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
                  <option value="openai" ${s('default_provider') === 'openai' ? 'selected' : ''}>OpenAI</option>
                  <option value="groq" ${s('default_provider') === 'groq' ? 'selected' : ''}>Groq (Ultra-Fast)</option>
                  <option value="ollama" ${s('default_provider') === 'ollama' ? 'selected' : ''}>Ollama (Local Private)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label font-bold">Target Model</label>
                <input type="text" id="set-default-model" class="form-input" list="model-preset-list" value="${s('default_model', 'gemini-2.5-flash')}" placeholder="e.g. gemma4:e4b or gemini-2.5-flash">
                <datalist id="model-preset-list"></datalist>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label font-bold">Content Niche Domain</label>
                <select id="set-niche-domain" class="form-select">
                  <option value="AI Engineering & Hackathons" ${s('niche_domain') === 'AI Engineering & Hackathons' ? 'selected' : ''}>AI Engineering & Hackathons</option>
                  <option value="Software Architecture & System Design" ${s('niche_domain') === 'Software Architecture & System Design' ? 'selected' : ''}>Software Architecture & System Design</option>
                  <option value="Full-Stack Web Development & Frameworks" ${s('niche_domain') === 'Full-Stack Web Development & Frameworks' ? 'selected' : ''}>Full-Stack Web Development & Frameworks</option>
                  <option value="Cloud DevOps, Docker & Kubernetes" ${s('niche_domain') === 'Cloud DevOps, Docker & Kubernetes' ? 'selected' : ''}>Cloud DevOps, Docker & Kubernetes</option>
                  <option value="Data Engineering & ML Pipelines" ${s('niche_domain') === 'Data Engineering & ML Pipelines' ? 'selected' : ''}>Data Engineering & ML Pipelines</option>
                  <option value="Developer Productivity & Systems" ${s('niche_domain') === 'Developer Productivity & Systems' ? 'selected' : ''}>Developer Productivity & Systems</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label font-bold">Quality Ranking Threshold (0-100)</label>
                <input type="number" id="set-min-threshold" class="form-input" value="${s('min_score_threshold', '70')}" min="50" max="95">
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Execution Environment</label>
                <select id="set-mode" class="form-select">
                  <option value="mock" ${s('mode') === 'mock' ? 'selected' : ''}>🧪 Mock / Sandbox — Fast simulated testing</option>
                  <option value="live" ${s('mode') === 'live' ? 'selected' : ''}>🚀 Live — Real API calls & Instagram publishing</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Default Content Format</label>
                <select id="set-content-type" class="form-select">
                  <option value="reel" ${s('default_content_type') === 'reel' ? 'selected' : ''}>🎬 Reel (9:16 Video)</option>
                  <option value="carousel" ${s('default_content_type') === 'carousel' ? 'selected' : ''}>🎠 Carousel (Multi-Slide)</option>
                  <option value="image" ${s('default_content_type') === 'image' ? 'selected' : ''}>📸 Image Post (4:5 Feed)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 2. LLM Provider API Keys & Endpoints -->
          <div class="card">
            <div class="section-label">API Keys & Gateways</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 1rem;">Multi-Provider LLM Credentials</h3>

            <div class="form-group">
              <label class="form-label">Gemini API Key</label>
              <input type="password" id="set-gemini-key" class="form-input" value="${s('gemini_api_key')}" placeholder="AIza...">
            </div>

            <div class="form-group">
              <label class="form-label">Claude (Anthropic) API Key</label>
              <input type="password" id="set-claude-key" class="form-input" value="${s('claude_api_key')}" placeholder="sk-ant-...">
            </div>

            <div class="form-group">
              <label class="form-label">OpenAI API Key</label>
              <input type="password" id="set-openai-key" class="form-input" value="${s('openai_api_key')}" placeholder="sk-...">
            </div>

            <div class="form-group">
              <label class="form-label">Groq API Key</label>
              <input type="password" id="set-groq-key" class="form-input" value="${s('groq_api_key')}" placeholder="gsk_...">
            </div>

            <div class="form-group">
              <label class="form-label">Ollama Endpoint (Local)</label>
              <input type="text" id="set-ollama-endpoint" class="form-input" value="${s('ollama_endpoint', 'http://localhost:11434')}" placeholder="http://localhost:11434">
            </div>

            <div class="form-group">
              <label class="form-label">Automatic Failover Chain (comma-separated)</label>
              <input type="text" id="set-failover-chain" class="form-input" value="${s('failover_chain', 'gemini,claude,openai,groq,ollama')}" placeholder="gemini,claude,openai,groq,ollama">
            </div>

            <button class="btn btn-secondary btn-sm" onclick="settingsView.testProvider()">🧪 Test Active LLM Provider</button>
          </div>

          <!-- 3. Instagram Publishing & Meta Verified API -->
          <div class="card">
            <div class="section-label">Meta & Instagram Studio</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 1rem;">Publishing & Brand Credentials</h3>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Instagram App ID</label>
                <input type="text" id="set-meta-app-id" class="form-input" value="${s('meta_app_id', '1699561267808244')}" placeholder="1699561267808244">
              </div>
              <div class="form-group">
                <label class="form-label">Instagram App Secret</label>
                <input type="password" id="set-meta-app-secret" class="form-input" value="${s('meta_app_secret', 'f5328133123b2b43dcc44ae3aab9c57b')}" placeholder="App Secret">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Brand Watermark Handle (Publishing Destination)</label>
              <input type="text" id="set-ig-handle" class="form-input" value="${s('instagram_handle', '@harshparmartech')}" placeholder="@harshparmartech">
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label class="form-label" style="margin-bottom: 0;">Meta Graph API Page Access Token</label>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-exchange-token" onclick="settingsView.exchangeAndConnect()" style="font-weight: 700; color: #10B981; border-color: rgba(16, 185, 129, 0.4);">
                  ⚡ Auto-Connect &amp; Exchange
                </button>
              </div>
              <input type="password" id="set-meta-token" class="form-input" value="${s('meta_page_token')}" placeholder="Paste token from Graph API Explorer (EAABs...)">
              <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.25rem;">
                Paste any token and click "⚡ Auto-Connect" to exchange for a permanent token &amp; auto-fetch your Instagram Account ID.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Instagram Business Account ID</label>
              <input type="text" id="set-meta-ig-id" class="form-input" value="${s('meta_ig_user_id')}" placeholder="17841400000000000">
            </div>

            <div class="form-group">
              <label class="form-label">Public Media URL / Ngrok Tunnel</label>
              <input type="text" id="set-ngrok-url" class="form-input" value="${s('ngrok_url')}" placeholder="https://abc123.ngrok.io (for Meta media containers)">
            </div>

            <div class="form-group">
              <label class="form-label">InstaAuto Sister Bridge URL</label>
              <input type="text" id="set-bridge-url" class="form-input" value="${s('instaauto_bridge_url', 'http://localhost:3000/api/agent/bridge')}" placeholder="http://localhost:3000/api/agent/bridge">
            </div>
          </div>

          <!-- 4. Mobile Inbound Triggers: Telegram Bot -->
          <div class="card" style="border: 1.5px solid rgba(16, 185, 129, 0.35); background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(37, 99, 235, 0.03));">
            <div class="section-label" style="color: #10B981;">Mobile Automation</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 0.4rem;">📱 Mobile Inbound Triggers (Share-to-Publish)</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Send any Reel or Carousel link directly from your mobile phone to Telegram. The bot intercepts, downloads uncropped slides, removes competitor watermarks, stamps your logo, and auto-publishes!
            </p>

            <div class="form-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Telegram Bot Token</span>
                <a href="https://t.me/BotFather" target="_blank" style="color: var(--accent-primary); font-size: 0.78rem; text-decoration: underline;">Get free token from @BotFather ↗</a>
              </label>
              <input type="password" id="set-telegram-bot-token" class="form-input" value="${s('telegram_bot_token')}" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem;">
                Connected to: <strong>@Harsh_insta_omni_ai_agent_bot</strong>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Authorized Instagram Owner Handle</label>
              <input type="text" id="set-owner-handle" class="form-input" value="${s('instagram_handle', '@harshparmar007__')}" placeholder="@harshparmar007__" readonly style="opacity: 0.85;">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem;">
                Only shares from this authorized handle are processed.
              </div>
            </div>
          </div>

          <!-- 5. Dedicated Scout / Hunter Accounts (Zero-Ban Shield) -->
          <div class="card" style="border: 1.5px solid rgba(124, 58, 237, 0.4); background: linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(59, 130, 246, 0.03));">
            <div class="section-label" style="color: #8B5CF6;">Account Safety &amp; Extraction Shield</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 0.4rem;">🛡️ Dedicated Scout Accounts (Competitor DM Harvester)</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
              Scout accounts are secondary personal Instagram accounts used to comment on competitors' reels and intercept their ManyChat DMs. Your primary brand pages (<code>@gta6_updates_007</code> and <code>@technews_daily_ai</code>) are 100% shielded and never penalized!
            </p>

            <div id="scout-accounts-list" style="margin-bottom: 1rem;">
              <div style="font-size: 0.8rem; color: var(--text-muted);">Loading scout accounts...</div>
            </div>

            <!-- Add Scout Form -->
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.6rem; color: var(--text-primary);">➕ Connect New Scout Account</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.6rem;">
                <div>
                  <label class="form-label" style="font-size: 0.76rem;">Scout Username</label>
                  <input type="text" id="new-scout-username" class="form-input" placeholder="@scout_harsh_007" style="font-size: 0.82rem;">
                </div>
                <div>
                  <label class="form-label" style="font-size: 0.76rem;">Assigned Niche / Page</label>
                  <select id="new-scout-niche" class="form-input" style="font-size: 0.82rem;">
                    <option value="all">All Pages (Universal Scout)</option>
                    <option value="gaming">GTA 6 / Gaming Only</option>
                    <option value="tech">Tech News AI Only</option>
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 0.6rem;">
                <label class="form-label" style="display: flex; justify-content: space-between; font-size: 0.76rem;">
                  <span>Instagram Session Cookie (<code>sessionid</code>)</span>
                  <span style="color: var(--text-muted); font-size: 0.72rem;">DevTools ➔ Application ➔ Cookies</span>
                </label>
                <input type="password" id="new-scout-session" class="form-input" placeholder="Paste sessionid cookie from browser" style="font-size: 0.82rem;">
              </div>
              <button type="button" class="btn btn-secondary btn-sm w-full" onclick="settingsView.addScoutAccount()" style="font-weight: 700; color: #8B5CF6; border-color: rgba(124, 58, 237, 0.4);">
                ➕ Save &amp; Connect Scout Account
              </button>
            </div>
          </div>

          <button class="btn btn-primary w-full" style="font-size: 1rem; font-weight: 700; padding: 0.85rem;" onclick="settingsView.saveAll()">
            💾 Save All Engine & Niche Settings
          </button>
        </div>

        <!-- Right: Status & Architecture -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Provider Status -->
          <div class="card">
            <div class="section-label">Provider Status</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 1rem;">API Connectivity</h3>
            <div id="provider-status-list" style="font-size: 0.85rem;">Loading...</div>
          </div>

          <!-- Architecture Reference -->
          <div class="card" style="background: var(--bg-deep);">
            <div class="section-label">System Architecture</div>
            <h3 style="margin-top: 0.2rem; margin-bottom: 0.8rem;">OmniStudio AI Engine</h3>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6;">
              <p><strong>Dual-Mode Pipeline:</strong></p>
              <p>⚡ <strong>Direct Viral Repost</strong>: Bypasses ManyChat/PDFs; crafts discussion-driven captions, brands your account, attaches trending sound, and posts directly.</p>
              <p>🎯 <strong>DM Lead Magnet</strong>: Extracts trigger keywords, harvests creator links via Scout Account, and arms InstaAuto.</p>
              <hr style="border-color: var(--border-color); margin: 0.8rem 0;">
              <p><strong>Supported LLM Providers:</strong></p>
              <p>• Google Gemini (Flash / Pro)</p>
              <p>• Anthropic Claude (Sonnet / Opus)</p>
              <p>• OpenAI (GPT-4o / Mini)</p>
              <p>• Groq (Llama 3.3 70B)</p>
              <p>• Ollama (Local Gemma / Llama / DeepSeek)</p>
              <hr style="border-color: var(--border-color); margin: 0.8rem 0;">
              <p><strong>Publishing Backends:</strong></p>
              <p>• Meta Graph API v21.0</p>
              <p>• Local aiograpi Microservice (Port 8001)</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.onProviderChange(s('default_provider', 'gemini'));
    this.loadProviderStatus();
    this.loadScouts();
  },

  onProviderChange(provider) {
    const datalist = document.getElementById('model-preset-list');
    if (!datalist) return;
    const presets = this.modelsByProvider[provider] || [];
    datalist.innerHTML = presets.map(m => `<option value="${m}">`).join('');
  },

  async loadProviderStatus() {
    const container = document.getElementById('provider-status-list');
    if (!container) return;

    try {
      const res = await fetch('/api/llm/providers');
      const data = await res.json();

      container.innerHTML = (data.providers || []).map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <span style="font-weight: 600;">${p.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.3rem;">${p.models[0]}</span>
          </div>
          <span class="badge ${p.available ? 'badge-armed' : 'badge-draft'}" style="font-size: 0.72rem;">
            ${p.available ? '✅ Ready' : '⚠️ No Key'}
          </span>
        </div>
      `).join('');

      container.innerHTML += `
        <div style="margin-top: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
          Active: <strong>${data.defaultProvider || 'gemini'}</strong> | Failover: ${(data.failoverChain || []).join(' → ')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = '<span class="text-muted">Could not load provider status</span>';
    }
  },

  async testProvider() {
    const provider = document.getElementById('set-default-provider').value;
    app.showToast(`Testing ${provider} connection...`, 'success');
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`✅ ${provider} connected! Latency: ${data.latency_ms}ms`, 'success');
      } else {
        app.showToast(`❌ ${provider}: ${data.error}`, 'error');
      }
    } catch (err) {
      app.showToast(`Test failed: ${err.message}`, 'error');
    }
  },

  async exchangeAndConnect() {
    const tokenInput = document.getElementById('set-meta-token');
    const token = tokenInput ? tokenInput.value.trim() : '';
    if (!token) {
      app.showToast('Please paste a token from Graph API Explorer into the token box first', 'error');
      return;
    }

    const btn = document.getElementById('btn-exchange-token');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="width:12px; height:12px; border-width:2px;"></span> Connecting...`;
    }

    try {
      const res = await fetch('/api/settings/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      if (data.success) {
        app.showToast(data.message, 'success');
        if (data.ig_user_id) {
          const igEl = document.getElementById('set-meta-ig-id');
          if (igEl) igEl.value = data.ig_user_id;
        }
        if (data.handle) {
          const handleEl = document.getElementById('set-ig-handle');
          if (handleEl) handleEl.value = data.handle;
        }
        const modeEl = document.getElementById('set-mode');
        if (modeEl) modeEl.value = 'live';
      } else {
        app.showToast(`Connection failed: ${data.error}`, 'error');
      }
    } catch (e) {
      app.showToast(`Error: ${e.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ Auto-Connect &amp; Exchange`;
      }
    }
  },

  async saveAll() {
    const payload = {
      default_provider: document.getElementById('set-default-provider').value,
      default_model: document.getElementById('set-default-model').value,
      niche_domain: document.getElementById('set-niche-domain').value,
      min_score_threshold: document.getElementById('set-min-threshold').value,
      mode: document.getElementById('set-mode').value,
      default_content_type: document.getElementById('set-content-type').value,
      gemini_api_key: document.getElementById('set-gemini-key').value,
      claude_api_key: document.getElementById('set-claude-key').value,
      openai_api_key: document.getElementById('set-openai-key').value,
      groq_api_key: document.getElementById('set-groq-key').value,
      ollama_endpoint: document.getElementById('set-ollama-endpoint').value,
      failover_chain: document.getElementById('set-failover-chain').value,
      instaauto_bridge_url: document.getElementById('set-bridge-url').value,
      meta_app_id: document.getElementById('set-meta-app-id')?.value || '',
      meta_app_secret: document.getElementById('set-meta-app-secret')?.value || '',
      meta_page_token: document.getElementById('set-meta-token').value,
      meta_ig_user_id: document.getElementById('set-meta-ig-id').value,
      ngrok_url: document.getElementById('set-ngrok-url').value,
      instagram_handle: document.getElementById('set-ig-handle').value,
      telegram_bot_token: document.getElementById('set-telegram-bot-token')?.value || ''
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        app.showToast('All engine & niche settings saved successfully!', 'success');
        this.loadProviderStatus();
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async loadScouts() {
    const listEl = document.getElementById('scout-accounts-list');
    if (!listEl) return;

    try {
      const res = await fetch('/api/instagram/scouts');
      const data = await res.json();
      if (!data.success || !data.scouts || data.scouts.length === 0) {
        listEl.innerHTML = `
          <div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.75rem; background: var(--bg-surface); border-radius: 6px; border: 1px dashed var(--border-color); text-align: center;">
            No scout accounts configured yet. Add a secondary disposable account below to automatically harvest links from creator DMs!
          </div>
        `;
        return;
      }

      listEl.innerHTML = data.scouts.map(s => {
        const isHealthy = s.health_status === 'healthy';
        const badgeColor = isHealthy ? '#10B981' : (s.health_status === 'error' ? '#EF4444' : '#F59E0B');
        const badgeText = s.health_status ? s.health_status.toUpperCase() : 'UNTESTED';
        
        return `
          <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <strong style="color: var(--text-primary); font-size: 0.88rem;">@${s.username.replace('@', '')}</strong>
                <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${badgeColor}22; color: ${badgeColor}; font-weight: 700; border: 1px solid ${badgeColor}55;">
                  ${badgeText}
                </span>
                <span style="font-size: 0.72rem; color: var(--text-muted); background: var(--bg-deep); padding: 2px 6px; border-radius: 4px;">
                  ${s.assigned_niche === 'all' ? '🌐 Universal' : (s.assigned_niche === 'gaming' ? '🎮 GTA6' : '💻 Tech')}
                </span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 1rem;">
                <span>Hourly: <strong>${s.hourly_comments_count || 0}/5</strong></span>
                <span>Daily: <strong>${s.daily_comments_count || 0}/20</strong></span>
                ${s.last_comment_at ? `<span>Last Active: ${new Date(s.last_comment_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
              </div>
              ${s.last_error ? `<div style="font-size: 0.72rem; color: #EF4444; margin-top: 0.2rem;">⚠️ ${s.last_error}</div>` : ''}
            </div>
            <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
              <button class="btn btn-secondary btn-sm" onclick="settingsView.testScout(${s.id})" title="Test Instagram connection" style="padding: 4px 8px; font-size: 0.75rem;">
                🧪 Test
              </button>
              <button class="btn btn-secondary btn-sm" onclick="settingsView.deleteScout(${s.id})" title="Remove scout" style="padding: 4px 8px; font-size: 0.75rem; color: #EF4444; border-color: rgba(239, 68, 68, 0.3);">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div style="color: #EF4444; font-size: 0.8rem;">Failed to load scout accounts: ${err.message}</div>`;
    }
  },

  async addScoutAccount() {
    const usernameEl = document.getElementById('new-scout-username');
    const nicheEl = document.getElementById('new-scout-niche');
    const sessionEl = document.getElementById('new-scout-session');

    const username = usernameEl ? usernameEl.value.trim() : '';
    const assigned_niche = nicheEl ? nicheEl.value : 'all';
    const session_id = sessionEl ? sessionEl.value.trim() : '';

    if (!username) {
      app.showToast('Please enter a scout Instagram username', 'error');
      return;
    }
    if (!session_id) {
      app.showToast('Please paste the scout sessionid cookie', 'error');
      return;
    }

    try {
      const res = await fetch('/api/instagram/scouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, assigned_niche, session_id })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`Scout @${username.replace('@', '')} added successfully!`, 'success');
        if (usernameEl) usernameEl.value = '';
        if (sessionEl) sessionEl.value = '';
        this.loadScouts();
      } else {
        app.showToast(data.error || 'Failed to add scout', 'error');
      }
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
    }
  },

  async testScout(id) {
    app.showToast('Testing scout connection with Instagram...', 'info');
    try {
      const res = await fetch(`/api/instagram/scouts/${id}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.healthy) {
        app.showToast(`✅ Scout verified healthy! Logged in as ${data.user?.username || 'user'}`, 'success');
      } else {
        app.showToast(`❌ Scout check failed: ${data.error || 'Invalid session cookie'}`, 'error');
      }
      this.loadScouts();
    } catch (err) {
      app.showToast(`Test error: ${err.message}`, 'error');
    }
  },

  async deleteScout(id) {
    if (!confirm('Are you sure you want to remove this scout account?')) return;
    try {
      const res = await fetch(`/api/instagram/scouts/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        app.showToast('Scout account removed', 'success');
        this.loadScouts();
      } else {
        app.showToast(data.error || 'Failed to remove scout', 'error');
      }
    } catch (err) {
      app.showToast(`Error: ${err.message}`, 'error');
    }
  }
};

window.settingsView = settingsView;

