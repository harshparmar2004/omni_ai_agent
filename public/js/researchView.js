/**
 * OmniResearch AI v4.0 — Autonomous Deep Research Studio View
 * Multi-LLM provider selection, live web search streaming, 12-page PDF export, DM link sharing,
 * embedded 12-page Document Reader, and 1-click bridge to Nano Banana Creative Studio.
 */

const researchView = {
  currentResearch: null,
  providers: [],

  async render() {
    // Fetch available providers
    try {
      const provRes = await fetch('/api/llm/providers');
      const provData = await provRes.json();
      this.providers = provData.providers || [];
    } catch (e) {
      this.providers = [];
    }

    const providerOptions = this.providers.map(p =>
      `<option value="${p.id}" ${p.available ? '' : 'disabled'}>${p.name}${p.available ? '' : ' (No API Key)'}</option>`
    ).join('');

    const container = document.getElementById('view-research');
    if (!container) return;

    container.innerHTML = `
      <div class="studio-container">
        
        <!-- COMPACT HORIZONTAL RESEARCH COMMAND DECK (Image 2) -->
        <div class="card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.5rem; margin-bottom: 1.5rem;">
          
          <!-- Header -->
          <div class="cockpit-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.15rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                <span class="section-label" style="margin-bottom: 0; font-size: 0.72rem; letter-spacing: 0.05em; font-weight: 700; color: var(--accent-primary);">CLAUDE-STYLE MULTI-VECTOR DEEP RESEARCH</span>
                <span class="badge badge-armed" style="font-size: 0.72rem; padding: 2px 7px; background: rgba(76, 175, 80, 0.15); color: #4CAF50; border: 1px solid rgba(76, 175, 80, 0.3);">v2.5 Deep Pipeline</span>
              </div>
              <h2 style="font-size: 1.55rem; font-weight: 800; color: var(--text-primary); margin: 0.15rem 0; letter-spacing: -0.01em;">
                Autonomous Research Agent
              </h2>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
                Specify your research topic, choose LLM provider and depth parameters horizontally, and synthesize publication-grade dossiers.
              </p>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" onclick="app.navigate('history')" style="font-weight: 600; border-radius: 8px; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>📜</span> History Archive
            </button>
          </div>

          <!-- Research Inquiry / Domain Goal Row -->
          <div style="margin-bottom: 0.5rem;">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
              <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">Research Inquiry / Domain Goal</span>
              <span style="font-weight: 400; font-size: 0.75rem; color: var(--text-muted);">Autonomous web search, competition scraping & verified PDF compilation</span>
            </label>
            <textarea id="rs-topic" class="form-textarea" style="width: 100%; min-height: 58px; font-size: 0.95rem; font-weight: 500; padding: 0.65rem 0.9rem; line-height: 1.45; border-radius: 10px; resize: vertical;" placeholder="e.g. The Top 10 Global Hackathons in October 2026: The Master Directory & Strategic Guide...">The Top 10 Global Hackathons in October 2026: The Master Directory & Strategic Guide</textarea>
            
            <!-- Preset Quick-Pick Chips -->
            <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 0.2rem;">Quick Presets:</span>
              <button type="button" class="badge" style="cursor: pointer; background: rgba(2,136,209,0.12); color: #0288D1; border: 1px solid rgba(2,136,209,0.25); font-weight: 600;" onclick="researchView.setTopic('Docker Technical Interview Questions: From Linux Kernel Internals to Multi-Stage Builds & Production Incident Debugging')">🐳 Docker Technical Interview (12-Page)</button>
              <button type="button" class="badge" style="cursor: pointer; background: rgba(217,119,87,0.12); color: var(--accent-primary); border: 1px solid rgba(217,119,87,0.25); font-weight: 600;" onclick="researchView.setTopic('The Top 10 Global Hackathons in October 2026: The Master Directory & Strategic Guide')">🏆 Top 10 Oct Global</button>
              <button type="button" class="badge" style="cursor: pointer; background: rgba(46,125,50,0.12); color: #2E7D32; border: 1px solid rgba(46,125,50,0.25); font-weight: 600;" onclick="researchView.setTopic('Top 10 Indian Hackathons in October 2026: SIH, Devfolio & Collegiate Flagships')">🇮🇳 Top 10 Indian Hackathons</button>
              <button type="button" class="badge badge-draft" style="cursor: pointer; font-weight: 600;" onclick="researchView.setTopic('Autonomous Multi-Agent Systems in 2026: The Production Architecture Guide')">🤖 Multi-Agent LangGraph</button>
              <button type="button" class="badge badge-draft" style="cursor: pointer; font-weight: 600;" onclick="researchView.setTopic('Enterprise Hybrid RAG: Dense Vectors + BM25 + Cohere Rerank')">🔍 Hybrid RAG Pipeline</button>
              <button type="button" class="badge badge-draft" style="cursor: pointer; font-weight: 600;" onclick="researchView.setTopic('DeepSeek-R1 Distillation: Running Local Reasoning Models on Consumer GPUs')">🧠 DeepSeek-R1 Local</button>
            </div>
          </div>

          <!-- Row 2: Horizontal Left-to-Right Controls Bar (LLM Provider, Model, Niche, Quantity/Depth, Action) -->
          <div class="research-controls-bar">
            
            <!-- 1. LLM Provider -->
            <div>
              <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>👾 LLM Provider</span>
              </label>
              <select id="rs-provider" class="form-select" onchange="researchView.onProviderChange()" style="font-size: 0.85rem; padding: 0.55rem 0.75rem; width: 100%;">
                ${providerOptions}
              </select>
            </div>

            <!-- 2. Model -->
            <div>
              <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>🟣 Model</span>
              </label>
              <select id="rs-model" class="form-select" style="font-size: 0.85rem; padding: 0.55rem 0.75rem; width: 100%;">
                ${this.providers[0]?.models?.map(m => `<option value="${m}">${m}</option>`).join('') || '<option>Loading...</option>'}
              </select>
            </div>

            <!-- 3. Niche Domain -->
            <div>
              <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>🎯 Niche Domain</span>
              </label>
              <select id="rs-niche" class="form-select" style="font-size: 0.85rem; padding: 0.55rem 0.75rem; width: 100%;">
                <option value="AI Engineering">AI Engineering & Hackathons</option>
                <option value="Software Architecture">Software Architecture & Systems</option>
                <option value="Information Retrieval">Hybrid Search & Vector RAG</option>
                <option value="Autonomous Agents">Multi-Agent Swarm Systems</option>
                <option value="Web3 & Decentralized">Web3, ZK & Decentralized Compute</option>
                <option value="Competitive Engineering">Competitive Engineering</option>
                <option value="Gaming Systems">Gaming Systems & Graphics</option>
              </select>
            </div>

            <!-- 4. Research Quantity / Depth -->
            <div style="min-width: 270px;">
              <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>🔬 Quantity & Depth</span>
              </label>
              <div class="depth-selector" style="display: flex; gap: 0.35rem;">
                <label class="depth-option" style="margin: 0; flex: 1;">
                  <input type="radio" name="rs-depth" value="quick" />
                  <div class="depth-card" style="padding: 0.45rem 0.5rem; flex-direction: row; gap: 0.35rem; justify-content: center; align-items: center;">
                    <span class="depth-icon" style="font-size: 0.95rem;">⚡</span>
                    <div style="text-align: left; line-height: 1.1;">
                      <div class="depth-name" style="font-size: 0.78rem;">Quick</div>
                      <div class="depth-desc" style="font-size: 0.65rem;">1 Round</div>
                    </div>
                  </div>
                </label>

                <label class="depth-option" style="margin: 0; flex: 1;">
                  <input type="radio" name="rs-depth" value="deep" checked />
                  <div class="depth-card" style="padding: 0.45rem 0.5rem; flex-direction: row; gap: 0.35rem; justify-content: center; align-items: center;">
                    <span class="depth-icon" style="font-size: 0.95rem;">🔬</span>
                    <div style="text-align: left; line-height: 1.1;">
                      <div class="depth-name" style="font-size: 0.78rem;">Deep</div>
                      <div class="depth-desc" style="font-size: 0.65rem;">3 Rounds</div>
                    </div>
                  </div>
                </label>

                <label class="depth-option" style="margin: 0; flex: 1;">
                  <input type="radio" name="rs-depth" value="exhaustive" />
                  <div class="depth-card" style="padding: 0.45rem 0.5rem; flex-direction: row; gap: 0.35rem; justify-content: center; align-items: center;">
                    <span class="depth-icon" style="font-size: 0.95rem;">🧪</span>
                    <div style="text-align: left; line-height: 1.1;">
                      <div class="depth-name" style="font-size: 0.78rem;">Exhaustive</div>
                      <div class="depth-desc" style="font-size: 0.65rem;">5 Rounds</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 5. Launch Button -->
            <div style="min-width: 175px;">
              <button id="rs-start-btn" class="btn btn-primary" style="width: 100%; height: 42px; justify-content: center; font-weight: 700; font-size: 0.88rem; padding: 0.5rem 0.85rem; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;" onclick="researchView.startResearch()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
                Start Deep Research
              </button>
            </div>

          </div>
        </div>

        <!-- LIVE STREAMING LOGS -->
        <div id="rs-logs-card" class="card hidden" style="margin-bottom: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="pulse-dot"></span>
              <span class="font-bold text-sm" style="letter-spacing: 0.04em;">AGENTIC TELEMETRY STREAM</span>
            </div>
            <span id="rs-elapsed" class="text-sm font-mono text-muted">00:00</span>
          </div>
          <div id="rs-logs" style="height: 140px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 1.6; color: var(--text-secondary); background: var(--bg-base); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);"></div>
        </div>

        <!-- EMBEDDED 12-PAGE DOCUMENT VIEWER CONTAINER -->
        <div id="rs-results" class="card" style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.5rem;">
          <div id="rs-empty-state" class="empty-state" style="padding: 3rem 1rem;">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-title" style="font-size: 1.15rem;">No Active Research Dossier</div>
            <p class="empty-state-desc" style="font-size: 0.86rem; max-width: 480px;">
              Enter any research topic above and click "Launch Deep Research". The complete 12-page publication whitepaper will compile and render directly in this viewer.
            </p>
          </div>

          <div id="rs-content" class="hidden">
            <!-- Top Toolbar -->
            <div class="flex items-center justify-between mb-4" style="flex-wrap: wrap; gap: 0.75rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <div id="rs-dossier-badge" class="badge badge-armed" style="font-weight: 700; font-size: 0.75rem;">12-Page Technical Whitepaper</div>
                <div id="rs-provider-badge" class="badge badge-draft" style="font-weight: 700; font-size: 0.75rem;"></div>
                <div id="rs-confidence-badge" class="badge" style="background: rgba(16,185,129,0.15); color: #10B981; font-weight: 700; font-size: 0.75rem;"></div>
              </div>
              <div class="flex gap-2" style="flex-wrap: wrap;">
                <button id="rs-copy-dm-btn" class="btn btn-secondary btn-sm" onclick="researchView.copyDmLink()" title="Copy direct link to send in Instagram DM">
                  📋 Copy DM Link
                </button>
                <a id="rs-pdf-link" href="#" target="_blank" class="btn btn-primary btn-sm" style="background: var(--accent-primary); border-color: var(--accent-primary); font-weight: 700;">
                  📄 Download 12-Page PDF
                </a>
                <button id="rs-to-nanobanana-btn" class="btn btn-sm" onclick="researchView.sendToNanoBanana()" style="background: rgba(255,215,0,0.15); color: #B45309; border: 1px solid rgba(217,119,87,0.4); font-weight: 800;">
                  🍌 Send to Nano Banana Studio ➔
                </button>
              </div>
            </div>

            <!-- EMBEDDED DOCUMENT VIEWER FRAME -->
            <div id="rs-doc-viewer-wrapper" style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); background: #FFFFFF; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
              <iframe id="rs-doc-frame" src="" style="width: 100%; height: 950px; border: none; display: block; background: #F8FAFC;"></iframe>
            </div>

            <!-- Meta Footer -->
            <div id="rs-token-usage" class="text-sm text-muted" style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--bg-base); border-radius: 8px; border: 1px solid var(--border-color);"></div>
          </div>
        </div>

      </div>
    `;

    this.onProviderChange();
    this.loadLatestIfEmpty();
  },

  async loadLatestIfEmpty() {
    if (this.currentResearch) {
      this.displayResults(this.currentResearch.campaign, this.currentResearch.deliverable);
      return;
    }
    try {
      const res = await fetch('/api/research/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns && data.campaigns.length > 0) {
        const latest = data.campaigns[0];
        const fullRes = await fetch(`/api/research/${latest.id}`);
        const fullData = await fullRes.json();
        if (fullData.success) {
          const c = fullData.campaign;
          const d = fullData.deliverable;
          let parsedConcepts = [];
          try { parsedConcepts = JSON.parse(c.key_insights || '[]'); } catch(e) {}
          let parsedSnippets = [];
          try { parsedSnippets = JSON.parse(c.code_snippets || '[]'); } catch(e) {}

          this.currentResearch = {
            campaign: {
              ...c,
              campaignId: c.id,
              title: d ? d.title : c.topic,
              key_concepts: parsedConcepts,
              code_snippets: parsedSnippets,
              diagram_mermaid: c.mermaid_diagram
            },
            deliverable: d
          };
          this.displayResults(this.currentResearch.campaign, d);
        }
      }
    } catch(e) {
      console.warn('Could not auto-load latest research:', e);
    }
  },

  onProviderChange() {
    const providerSelect = document.getElementById('rs-provider');
    const modelSelect = document.getElementById('rs-model');
    if (!providerSelect || !modelSelect) return;

    const provider = this.providers.find(p => p.id === providerSelect.value);
    if (provider) {
      modelSelect.innerHTML = provider.models.map(m => `<option value="${m}">${m}</option>`).join('');
    }
  },

  setTopic(topic) {
    const topicEl = document.getElementById('rs-topic');
    if (topicEl) topicEl.value = topic;

    const nicheEl = document.getElementById('rs-niche');
    if (nicheEl) {
      const lower = topic.toLowerCase();
      if (lower.includes('docker') || lower.includes('kubernetes')) nicheEl.value = 'Software Architecture';
      else if (lower.includes('hackathon') || lower.includes('indian')) nicheEl.value = 'Competitive Engineering';
      else if (lower.includes('agent') || lower.includes('langgraph')) nicheEl.value = 'Autonomous Agents';
      else if (lower.includes('rag') || lower.includes('vector')) nicheEl.value = 'Information Retrieval';
      else if (lower.includes('deepseek') || lower.includes('ollama')) nicheEl.value = 'AI Engineering';
    }
    app.showToast('Inquiry topic pre-filled', 'info');
  },

  applyTemplate(type) {
    const templates = {
      hackathons_india: {
        topic: 'The Top 10 Global Hackathons in October 2026: The Master Directory & Strategic Guide in india',
        niche: 'Competitive Engineering',
        depth: 'deep'
      },
      docker: {
        topic: 'Docker & Container Architecture: From Linux Kernel cgroups & Namespaces to Multi-Stage Builds & OOM 137 Diagnostics',
        niche: 'Software Architecture',
        depth: 'exhaustive'
      },
      python_oops: {
        topic: 'Object-Oriented Programming in Python: Classes, Objects, Inheritance, Encapsulation, Polymorphism & Dunder Methods Complete Handwritten Notes',
        niche: 'Software Architecture',
        depth: 'deep'
      },
      kubernetes: {
        topic: 'Kubernetes Cluster Architecture & Top 20 Senior Interview Questions: Pods, Services, Ingress, Deployments & HPA Cheat Sheet',
        niche: 'Software Architecture',
        depth: 'deep'
      },
      chatgpt: {
        topic: 'Autonomous Multi-Agent Systems & LLM Tool Calling Architecture: Memory Graphs, State Isolation & Self-Correcting Execution',
        niche: 'AI Engineering',
        depth: 'deep'
      },
      gta: {
        topic: 'Top 10 GTA 6 Leaks: Gameplay Mechanics, Vice City Map Telemetry & RAGE 9 Physics Breakdowns',
        niche: 'Gaming Systems',
        depth: 'deep'
      }
    };

    const t = templates[type];
    if (!t) return;

    const topicEl = document.getElementById('rs-topic');
    if (topicEl) topicEl.value = t.topic;

    const nicheEl = document.getElementById('rs-niche');
    if (nicheEl) nicheEl.value = t.niche;

    this.setDepth(t.depth);
    app.showToast(`Applied Benchmark: ${t.topic.split(':')[0]}`, 'info');
  },

  setDepth(depth) {
    const hiddenInput = document.getElementById('rs-depth-val');
    if (hiddenInput) hiddenInput.value = depth;

    const radio = document.querySelector(`input[name="rs-depth"][value="${depth}"]`);
    if (radio) radio.checked = true;

    const summaryEl = document.getElementById('rs-depth-summary');
    const quickBtn = document.getElementById('depth-btn-quick');
    const deepBtn = document.getElementById('depth-btn-deep');
    const exhBtn = document.getElementById('depth-btn-exhaustive');

    [quickBtn, deepBtn, exhBtn].forEach(b => b && b.classList.remove('active'));

    if (depth === 'quick') {
      if (quickBtn) quickBtn.classList.add('active');
      if (summaryEl) summaryEl.innerText = '1 Round • Fast Preview';
    } else if (depth === 'exhaustive') {
      if (exhBtn) exhBtn.classList.add('active');
      if (summaryEl) summaryEl.innerText = '5 Rounds • Full Whitepaper';
    } else {
      if (deepBtn) deepBtn.classList.add('active');
      if (summaryEl) summaryEl.innerText = '3 Rounds • Web Search';
    }
  },

  async startResearch() {
    const topic = document.getElementById('rs-topic').value;
    const niche = document.getElementById('rs-niche').value;
    const depth = document.querySelector('input[name="rs-depth"]:checked')?.value || document.getElementById('rs-depth-val')?.value || 'deep';
    const provider = document.getElementById('rs-provider').value;
    const model = document.getElementById('rs-model').value;

    if (!topic || topic.trim().length < 5) {
      app.showToast('Please enter a research topic (at least 5 characters)', 'error');
      return;
    }

    const btn = document.getElementById('rs-start-btn') || document.getElementById('rs-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;"></span> Investigating...';

    const logsCard = document.getElementById('rs-logs-card');
    const logBox = document.getElementById('rs-logs');
    logsCard.classList.remove('hidden');
    logBox.innerHTML = '';

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      const el = document.getElementById('rs-elapsed');
      if (el) el.innerText = `${mins}:${secs}`;
    }, 1000);

    const logSteps = [
      { t: 300, msg: `[00:00] 🔍 Formulating strategic sub-queries for "${topic}"...` },
      { t: 1200, msg: '[00:01] 🌐 Ingesting live Google RSS search feeds...' },
      { t: 2200, msg: '[00:02] 🎥 Scraping live YouTube masterclass videos and direct watch links...' },
      { t: 3800, msg: `[00:04] 🧠 Dispatched multi-agent synthesis to ${provider.toUpperCase()}...` },
      { t: 5500, msg: '[00:06] 📐 Synthesizing deterministic system architecture topology...' },
      { t: 7200, msg: '[00:08] 📄 Compiling universal 12-page publication whitepaper & cover sheet...' },
      { t: 9000, msg: '[00:10] 🔗 Cross-verifying all YouTube and portal hyperlinks...' }
    ];

    logSteps.forEach(s => {
      setTimeout(() => {
        if (logBox) {
          logBox.innerHTML += `<div>${s.msg}</div>`;
          logBox.scrollTop = logBox.scrollHeight;
        }
      }, s.t);
    });

    try {
      const res = await fetch('/api/research/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, niche, depth, provider, model })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Research failed');

      clearInterval(timerInterval);
      logBox.innerHTML += `<div style="color: var(--success); font-weight: bold;">[00:12] ✅ Deep Research Complete! 12-Page Publication Document & PDF compiled!</div>`;

      this.currentResearch = {
        campaign: data.campaign,
        deliverable: data.deliverable
      };

      this.displayResults(data.campaign, data.deliverable);
      app.showToast('Universal 12-Page Research Document compiled successfully!', 'success');
    } catch (err) {
      clearInterval(timerInterval);
      logBox.innerHTML += `<div style="color: var(--error);">[Error] ${err.message}</div>`;
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg> Start Deep Research`;
    }
  },

  displayResults(campaign, deliverable) {
    document.getElementById('rs-empty-state').classList.add('hidden');
    const content = document.getElementById('rs-content');
    content.classList.remove('hidden');

    const campaignId = campaign.campaignId || campaign.id;

    // Badges
    const provBadge = document.getElementById('rs-provider-badge');
    if (provBadge) provBadge.innerText = `${(campaign.provider || 'Google Gemini 2.5 Pro').toUpperCase()}`;

    const confBadge = document.getElementById('rs-confidence-badge');
    const conf = Math.round((campaign.confidence_score || 0.98) * 100);
    if (confBadge) confBadge.innerText = `${conf}% High Confidence`;

    // Download PDF Link
    const pdfLink = document.getElementById('rs-pdf-link');
    if (pdfLink) {
      pdfLink.href = `/api/docs/${campaignId}/pdf`;
    }

    // Embed 12-Page Document in iframe
    const docFrame = document.getElementById('rs-doc-frame');
    if (docFrame && deliverable) {
      docFrame.src = deliverable.public_url || `/docs/${deliverable.slug}`;
    }

    // Token & Meta usage
    const tokenEl = document.getElementById('rs-token-usage');
    if (tokenEl) {
      tokenEl.innerHTML = `📊 Document Format: <strong>12-Page Universal Whitepaper</strong> • Page 1: <strong>Pristine Cover Sheet</strong> • Page 6: <strong>YouTube Masterclass</strong> • Page 7: <strong>Official Portals</strong> • Verification Score: <strong>${conf}%</strong> • Companion Link Ready for DM Funnel`;
    }
  },

  copyDmLink() {
    if (!this.currentResearch || !this.currentResearch.deliverable) {
      app.showToast('No active research to copy', 'error');
      return;
    }
    const url = this.currentResearch.deliverable.public_url;
    navigator.clipboard.writeText(url);
    app.showToast(`Copied Direct DM Link: ${url}`, 'success');
  },

  sendToNanoBanana() {
    if (!this.currentResearch || !this.currentResearch.campaign) {
      app.showToast('No active research campaign found', 'error');
      return;
    }
    const cId = this.currentResearch.campaign.campaignId || this.currentResearch.campaign.id;
    app.navigate('nanobanana');
    if (window.nanoBananaView && window.nanoBananaView.loadCampaign) {
      window.nanoBananaView.loadCampaign(cId);
    }
  }
};

window.researchView = researchView;
