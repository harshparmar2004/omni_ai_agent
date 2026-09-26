/**
 * OmniResearch AI v4.0 — Nano Banana Creative Studio View
 * Ingests research context, custom system prompt, 5-slide 4:5 Carousel Deck generator,
 * Trigger Keyword extractor, High-converting Caption, and 1-Click Staging & InstaAuto Bridge.
 */

const nanoBananaView = {
  campaigns: [],
  activeCampaignId: null,
  activeCampaign: null,
  activeDeliverable: null,
  generatedPost: null,
  currentSlideIndex: 1,

  systemPresets: {
    technical: `You are an elite Instagram growth strategist and technical content architect. Ingest the research context and produce:
1. A punchy trigger keyword (e.g. NOTES, HACK, AGENTS, DOCKER).
2. A high-converting Instagram caption with a strong hook, 3 value takeaways, and a clear CTA asking viewers to comment the trigger keyword to receive the complete 12-page research whitepaper & PDF.
3. 5 structured slides for a 4:5 Instagram carousel:
   - Slide 1: Hook title, subtitle, topic badge, swipe cue.
   - Slide 2: Deep Takeaway 1 (System Architecture & Primitives).
   - Slide 3: Deep Takeaway 2 (Implementation Blueprint & Starter Stack).
   - Slide 4: Deep Takeaway 3 (Empirical Benchmarks & Trade-Offs).
   - Slide 5: High-converting CTA slide.
Output strictly JSON.`,

    viral: `You are a viral social media engineer specializing in high-retention technical carousel decks. Ingest the research and synthesize:
1. A short, memorable, 1-word trigger keyword (e.g. NOTES, HACK, AGENTS).
2. An irresistible, curiosity-driven caption revealing an untold engineering secret, ending with: "Comment [KEYWORD] below and my AI agent will DM you the complete 12-page Research Doc & PDF!"
3. 5 visual slides formatted for maximum swipe completion and retention.
Output strictly JSON.`,

    executive: `You are an enterprise research analyst creating executive briefing slides. Ingest the research and produce:
1. An authoritative trigger keyword (e.g. GUIDE, REPORT, STACK).
2. An analytical caption focused on ROI, latency reduction, and production risk mitigation.
3. 5 professional 4:5 slides highlighting key industry metrics, comparative benchmarks, and failure diagnostics.
Output strictly JSON.`
  },

  async render() {
    const container = document.getElementById('view-nanobanana');
    if (!container) return;

    // Fetch campaigns
    await this.fetchCampaigns();

    container.innerHTML = `
      <div class="studio-container">
        
        <!-- HEADER -->
        <div class="master-cockpit-card mb-4" style="background: linear-gradient(135deg, rgba(26,20,18,0.95), rgba(15,23,42,0.95)); border: 1px solid rgba(217,119,87,0.3);">
          <div class="cockpit-header" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                <span class="badge" style="background: rgba(255,215,0,0.2); color: #F59E0B; font-weight: 800; font-size: 0.72rem; padding: 2px 8px;">
                  🍌 CREATIVE & LEAD FUNNEL ENGINE
                </span>
                <span class="badge badge-armed" style="font-size: 0.72rem; padding: 2px 7px;">Flow 1 Bridge</span>
              </div>
              <h2 style="font-size: 1.55rem; font-weight: 800; color: #FFFFFF; margin-top: 0.2rem; letter-spacing: -0.01em;">
                Nano Banana Studio
              </h2>
              <p style="font-size: 0.85rem; color: #94A3B8; margin-top: 0.2rem;">
                Transform your 12-page research documents into high-converting 4:5 Instagram carousels, trigger keywords, and automated DM lead funnels.
              </p>
            </div>

            <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="app.navigate('research')">
                ← Research Studio
              </button>
              <button class="btn btn-secondary btn-sm" onclick="app.navigate('instagram')">
                Instagram Manager →
              </button>
            </div>
          </div>
        </div>

        <!-- 1. RESEARCH CONTEXT INGESTION BOX -->
        <div class="card mb-4" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.1rem;">📥</span>
              <span style="font-weight: 800; font-size: 0.88rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-primary);">
                Ingested Research Context
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Active Campaign:</label>
              <select id="nb-campaign-select" class="form-select form-select-sm" style="min-width: 260px; font-weight: 600;" onchange="nanoBananaView.onSelectCampaign(this.value)">
                ${this.campaigns.map(c => `<option value="${c.id}" ${c.id === this.activeCampaignId ? 'selected' : ''}>#${c.id} - ${escapeHtml(c.topic.slice(0, 45))}...</option>`).join('')}
              </select>
            </div>
          </div>

          <div id="nb-context-details" style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.25rem;">
            <div id="nb-context-loading" class="text-sm text-muted">Loading research campaign details...</div>
          </div>
        </div>

        <!-- 2-COLUMN CREATIVE WORKSPACE -->
        <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1.5rem; align-items: start;">
          
          <!-- LEFT COLUMN: SYSTEM PROMPT & SETTINGS -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                <span>⚙️</span>
                <span>Editable System Prompt</span>
              </div>
              
              <!-- Presets -->
              <div style="display: flex; gap: 0.35rem;">
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;" onclick="nanoBananaView.applyPreset('technical')">🎓 Tech Masterclass</button>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;" onclick="nanoBananaView.applyPreset('viral')">🚀 Viral Magnet</button>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;" onclick="nanoBananaView.applyPreset('executive')">💼 Executive</button>
              </div>
            </div>

            <textarea id="nb-system-prompt" class="form-textarea" style="min-height: 140px; font-size: 0.84rem; font-family: 'JetBrains Mono', monospace; line-height: 1.5; padding: 0.85rem; border-radius: 8px; resize: vertical; margin-bottom: 1.25rem;">${this.systemPresets.technical}</textarea>

            <!-- Custom Keyword -->
            <div class="form-group">
              <label class="form-label" style="font-size: 0.82rem; font-weight: 700;">
                AI Trigger Keyword (What viewers comment in Instagram post)
              </label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="nb-keyword-input" class="form-input" style="font-weight: 800; font-family: monospace; letter-spacing: 0.08em; text-transform: uppercase;" value="NOTES" placeholder="e.g. NOTES, HACK, AGENTS, DOCKER">
                <button type="button" class="btn btn-secondary" onclick="nanoBananaView.suggestKeyword()" title="Auto-suggest from topic">
                  🎲 Suggest
                </button>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">
                When a user comments this keyword, the InstaAuto Sister Agent will automatically DM them the 12-page Doc & PDF!
              </span>
            </div>

            <!-- Generate Button -->
            <button id="nb-generate-btn" class="btn btn-primary w-full" onclick="nanoBananaView.generateCarouselDeck()" style="padding: 0.8rem; font-weight: 800; font-size: 0.95rem; border-radius: 9px; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(217,119,87,0.3);">
              ✨ Generate 5-Slide Nano Banana Deck & Caption
            </button>

            <!-- Generated Caption Box -->
            <div id="nb-caption-container" style="display: none; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label class="form-label" style="margin-bottom: 0; font-weight: 700; font-size: 0.82rem;">Generated High-Converting Caption</label>
                <button class="btn btn-secondary btn-sm" onclick="nanoBananaView.copyCaption()">📋 Copy Caption</button>
              </div>
              <textarea id="nb-caption-text" class="form-textarea" style="min-height: 150px; font-size: 0.84rem; line-height: 1.5; padding: 0.75rem; border-radius: 8px; resize: vertical; margin-bottom: 1.25rem;"></textarea>

              <!-- Action Buttons: Stage & Publish -->
              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="nb-stage-btn" class="btn btn-secondary" onclick="nanoBananaView.stageToQueue()" style="flex: 1; font-weight: 700; border-radius: 8px;">
                  ⚡ Stage to Ready to Post Queue
                </button>
                <button id="nb-publish-btn" class="btn btn-primary" onclick="nanoBananaView.publishAndArmBridge()" style="flex: 1; font-weight: 800; border-radius: 8px; background: #10B981; border-color: #10B981;">
                  🚀 Publish & Arm InstaAuto DM Bridge
                </button>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: INTERACTIVE 4:5 CAROUSEL VIEWER -->
          <div class="card" style="background: #0A0C14; border: 1px solid rgba(0, 210, 255, 0.3); border-radius: 14px; padding: 1.5rem; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span class="badge" style="background: rgba(0,210,255,0.15); color: #00D2FF; font-weight: 800; font-size: 0.72rem; padding: 2px 7px;">
                  INSTAGRAM 4:5 CAROUSEL
                </span>
                <div style="font-weight: 800; font-size: 1.05rem; color: #FFFFFF; margin-top: 0.25rem;">
                  Interactive Slide Deck Preview
                </div>
              </div>

              <!-- Slide Controls -->
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <button class="btn btn-secondary btn-sm" onclick="nanoBananaView.prevSlide()" style="background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2);">◀ Prev</button>
                <span id="nb-slide-indicator" style="font-size: 0.82rem; font-weight: 800; color: #00D2FF; min-width: 80px; text-align: center;">Slide 1 / 5</span>
                <button class="btn btn-secondary btn-sm" onclick="nanoBananaView.nextSlide()" style="background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2);">Next ▶</button>
              </div>
            </div>

            <!-- Slide Display Canvas/Image -->
            <div style="background: #000; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); min-height: 520px; display: flex; align-items: center; justify-content: center; padding: 1rem; position: relative;">
              <img id="nb-slide-img" src="" alt="Slide Preview" style="max-height: 500px; max-width: 100%; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: none;">
              
              <div id="nb-slide-empty" style="text-align: center; padding: 2rem; color: #94A3B8;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🍌</div>
                <div style="font-weight: 700; color: #FFFFFF; font-size: 1rem; margin-bottom: 0.35rem;">No Carousel Deck Generated Yet</div>
                <div style="font-size: 0.82rem; max-width: 320px; margin: 0 auto;">
                  Configure the system prompt on the left and click "Generate 5-Slide Nano Banana Deck".
                </div>
              </div>
            </div>

            <!-- Thumbnail Strip -->
            <div id="nb-thumbs-strip" style="display: flex; gap: 0.6rem; justify-content: center; margin-top: 1.25rem; overflow-x: auto; padding: 0.4rem 0;">
              ${[1, 2, 3, 4, 5].map(n => `
                <div onclick="nanoBananaView.goToSlide(${n})" style="cursor: pointer; text-align: center;">
                  <div id="nb-thumb-${n}" style="width: 58px; height: 72px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: #94A3B8; transition: all 0.15s;">
                    0${n}
                  </div>
                  <div style="font-size: 0.68rem; color: #64748B; font-weight: 700; margin-top: 0.2rem;">Slide ${n}</div>
                </div>
              `).join('')}
            </div>

            <!-- Download Slide Button -->
            <div style="text-align: center; margin-top: 1rem;">
              <a id="nb-download-slide-btn" href="#" download="slide.png" class="btn btn-secondary btn-sm" style="display: none; background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2);">
                📥 Download Current Slide (1080x1350)
              </a>
            </div>
          </div>

        </div>

      </div>
    `;

    if (this.activeCampaignId) {
      this.loadCampaign(this.activeCampaignId);
    } else if (this.campaigns.length > 0) {
      this.loadCampaign(this.campaigns[0].id);
    }
  },

  async fetchCampaigns() {
    try {
      const res = await fetch('/api/research/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        this.campaigns = data.campaigns;
      }
    } catch (e) {
      this.campaigns = [];
    }
  },

  async onSelectCampaign(campaignId) {
    await this.loadCampaign(parseInt(campaignId));
  },

  async loadCampaign(campaignId) {
    this.activeCampaignId = campaignId;
    const select = document.getElementById('nb-campaign-select');
    if (select) select.value = campaignId;

    const detailsBox = document.getElementById('nb-context-details');
    if (detailsBox) detailsBox.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;"></span> Ingesting campaign data...';

    try {
      const res = await fetch(`/api/research/${campaignId}`);
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load campaign');

      this.activeCampaign = data.campaign;
      this.activeDeliverable = data.deliverable;

      const conf = Math.round((data.campaign.confidence_score || 0.98) * 100);
      const docUrl = data.deliverable ? data.deliverable.public_url : `/docs/${campaignId}`;
      const pdfUrl = `/api/docs/${campaignId}/pdf`;

      if (detailsBox) {
        detailsBox.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${escapeHtml(data.campaign.topic)}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; max-width: 650px;">
                ${escapeHtml((data.campaign.summary || '').slice(0, 180))}...
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <span class="badge" style="background: rgba(16,185,129,0.12); color: #10B981; font-weight: 700; font-size: 0.75rem;">
                ✓ ${conf}% Verified
              </span>
              <a href="${docUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;">
                📄 12-Page Doc ↗
              </a>
              <a href="${pdfUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;">
                📥 PDF ↗
              </a>
            </div>
          </div>
        `;
      }

      this.suggestKeyword();

      // Check if carousel slides already exist
      const existingCarouselRes = await fetch(`/api/docs/${campaignId}/carousel`);
      const existingData = await existingCarouselRes.json();
      if (existingData.success && existingData.slides && existingData.slides.length > 0) {
        this.generatedPost = {
          campaignId,
          slides: existingData.slides.map(s => s.url || s),
          keyword: document.getElementById('nb-keyword-input')?.value || 'NOTES',
          caption: `🚀 Comprehensive research breakdown on ${data.campaign.topic}!\n\nComment "${document.getElementById('nb-keyword-input')?.value || 'NOTES'}" below to receive the complete 12-page Whitepaper & PDF directly in your DMs! 📄✨`
        };
        this.displayGeneratedPost();
      }

    } catch (err) {
      if (detailsBox) detailsBox.innerHTML = `<span style="color: var(--error);">Error loading campaign: ${err.message}</span>`;
    }
  },

  suggestKeyword() {
    if (!this.activeCampaign) return;
    const topic = (this.activeCampaign.topic || '').toLowerCase();
    let kw = 'NOTES';
    if (topic.includes('docker') || topic.includes('container')) kw = 'DOCKER';
    else if (topic.includes('hackathon') || topic.includes('competition')) kw = 'HACK';
    else if (topic.includes('python') || topic.includes('oops')) kw = 'PYTHON';
    else if (topic.includes('agent') || topic.includes('llm') || topic.includes('ai')) kw = 'AGENTS';
    else if (topic.includes('kubernetes') || topic.includes('k8s')) kw = 'K8S';
    else if (topic.includes('gta') || topic.includes('game')) kw = 'GTA';
    else {
      const w = topic.replace(/[^a-z0-9 ]/g, '').split(' ').filter(x => x.length > 3);
      kw = (w[0] || 'GUIDE').toUpperCase();
    }

    const input = document.getElementById('nb-keyword-input');
    if (input) input.value = kw;
  },

  applyPreset(presetName) {
    const text = this.systemPresets[presetName];
    if (!text) return;
    const el = document.getElementById('nb-system-prompt');
    if (el) el.value = text;
    app.showToast(`Applied ${presetName.toUpperCase()} Preset`, 'info');
  },

  async generateCarouselDeck() {
    if (!this.activeCampaignId) {
      app.showToast('Please select a research campaign first', 'error');
      return;
    }

    const systemPrompt = document.getElementById('nb-system-prompt')?.value || '';
    const customKeyword = document.getElementById('nb-keyword-input')?.value || '';

    const btn = document.getElementById('nb-generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;"></span> Synthesizing 5-Slide Carousel & Caption...';

    try {
      const res = await fetch('/api/nanobanana/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: this.activeCampaignId,
          systemPrompt,
          customKeyword
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      this.generatedPost = data;
      this.displayGeneratedPost();
      app.showToast(`Generated 5-Slide Deck with trigger keyword: "${data.keyword}"! 🍌`, 'success');
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '✨ Generate 5-Slide Nano Banana Deck & Caption';
    }
  },

  displayGeneratedPost() {
    if (!this.generatedPost) return;

    // Caption container
    const captionContainer = document.getElementById('nb-caption-container');
    const captionText = document.getElementById('nb-caption-text');
    if (captionContainer && captionText) {
      captionText.value = this.generatedPost.caption || '';
      captionContainer.style.display = 'block';
    }

    // Keyword input sync
    const kwInput = document.getElementById('nb-keyword-input');
    if (kwInput && this.generatedPost.keyword) {
      kwInput.value = this.generatedPost.keyword;
    }

    // Carousel display
    this.goToSlide(1);
  },

  goToSlide(num) {
    if (!this.generatedPost || !this.generatedPost.slides || this.generatedPost.slides.length === 0) return;
    this.currentSlideIndex = num;

    const img = document.getElementById('nb-slide-img');
    const emptyState = document.getElementById('nb-slide-empty');
    const ind = document.getElementById('nb-slide-indicator');
    const dlBtn = document.getElementById('nb-download-slide-btn');

    const slideSrc = this.generatedPost.slides[num - 1];
    if (img && slideSrc) {
      img.src = slideSrc;
      img.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';
    }

    if (ind) ind.innerText = `Slide ${num} / 5`;

    if (dlBtn && slideSrc) {
      dlBtn.href = slideSrc;
      dlBtn.download = `slide_${num}.png`;
      dlBtn.style.display = 'inline-flex';
    }

    // Highlight thumb
    for (let i = 1; i <= 5; i++) {
      const thumb = document.getElementById(`nb-thumb-${i}`);
      if (thumb) {
        thumb.style.borderColor = i === num ? '#00D2FF' : 'rgba(255,255,255,0.15)';
        thumb.style.background = i === num ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.06)';
        thumb.style.color = i === num ? '#00D2FF' : '#94A3B8';
      }
    }
  },

  prevSlide() {
    if (this.currentSlideIndex > 1) this.goToSlide(this.currentSlideIndex - 1);
    else this.goToSlide(5);
  },

  nextSlide() {
    if (this.currentSlideIndex < 5) this.goToSlide(this.currentSlideIndex + 1);
    else this.goToSlide(1);
  },

  copyCaption() {
    const el = document.getElementById('nb-caption-text');
    if (el) {
      navigator.clipboard.writeText(el.value);
      app.showToast('Caption copied to clipboard! 📋', 'success');
    }
  },

  async stageToQueue() {
    if (!this.generatedPost) {
      app.showToast('Please generate a carousel deck first', 'error');
      return;
    }

    const caption = document.getElementById('nb-caption-text')?.value || this.generatedPost.caption;
    const keyword = document.getElementById('nb-keyword-input')?.value || this.generatedPost.keyword;

    const btn = document.getElementById('nb-stage-btn');
    btn.disabled = true;
    btn.innerText = 'Staging...';

    try {
      const res = await fetch('/api/nanobanana/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: this.activeCampaignId,
          keyword,
          caption,
          slides: this.generatedPost.slides,
          deliverableUrl: this.activeDeliverable?.public_url,
          pdfUrl: `/api/docs/${this.activeCampaignId}/pdf`
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Staging failed');

      app.showToast(`⚡ Post #${data.postId} staged to Instagram Queue!`, 'success');
      btn.innerText = '✓ Staged to Queue';
    } catch (err) {
      app.showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = '⚡ Stage to Ready to Post Queue';
    }
  },

  async publishAndArmBridge() {
    if (!this.generatedPost) {
      app.showToast('Please generate a carousel deck first', 'error');
      return;
    }

    const caption = document.getElementById('nb-caption-text')?.value || this.generatedPost.caption;
    const keyword = document.getElementById('nb-keyword-input')?.value || this.generatedPost.keyword;

    const btn = document.getElementById('nb-publish-btn');
    btn.disabled = true;
    btn.innerText = 'Publishing & Arming...';

    try {
      const res = await fetch('/api/nanobanana/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: this.activeCampaignId,
          keyword,
          caption,
          slides: this.generatedPost.slides,
          deliverableUrl: this.activeDeliverable?.public_url,
          pdfUrl: `/api/docs/${this.activeCampaignId}/pdf`
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Publish failed');

      app.showToast(data.message, 'success');
      btn.innerText = '✓ Published & Armed';
    } catch (err) {
      app.showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerText = '🚀 Publish & Arm InstaAuto DM Bridge';
    }
  }
};

window.nanoBananaView = nanoBananaView;
