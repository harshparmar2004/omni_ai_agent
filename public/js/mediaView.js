/**
 * OmniResearch AI v2.0 — Enhanced Multi-Modal Media Generation Studio View
 * Content type selector (Reel/Image/Carousel), image gallery, Nano Banana Canvas preview
 */

const mediaView = {
  currentMedia: null,

  async render() {
    const container = document.getElementById('view-media');
    if (!container) return;

    const preload = window.mediaViewPreload || {
      deliverableId: null,
      topic: 'Autonomous Multi-Agent Systems in 2026',
      title: 'Autonomous Multi-Agent Systems in 2026: The Production Architecture Guide',
      summary: 'Moving beyond basic chain-of-thought prompts to autonomous multi-agent state machines.',
      insights: []
    };

    container.innerHTML = `
      <div class="grid-2" style="grid-template-columns: 1fr 340px; align-items: start;">
        <!-- Left Column: Script & Generation -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <div class="section-label">Content Creation Studio</div>
                <h3 style="margin-top: 0.2rem;">Multi-Modal Generation Engine</h3>
              </div>
              <div id="media-keyword-badge-wrap">
                <span class="badge-keyword" id="media-trigger-badge">KEYWORD: AGENT</span>
              </div>
            </div>

            <!-- Content Type Selector -->
            <div class="form-group">
              <label class="form-label">Content Type</label>
              <div class="content-type-selector">
                <label class="content-type-option">
                  <input type="radio" name="mv-content-type" value="reel" checked onchange="mediaView.onContentTypeChange()">
                  <div class="content-type-card">
                    <span class="content-type-icon">🎬</span>
                    <span class="content-type-name">Reel</span>
                    <span class="content-type-desc">9:16 Video</span>
                  </div>
                </label>
                <label class="content-type-option">
                  <input type="radio" name="mv-content-type" value="image" onchange="mediaView.onContentTypeChange()">
                  <div class="content-type-card">
                    <span class="content-type-icon">📸</span>
                    <span class="content-type-name">Image</span>
                    <span class="content-type-desc">4:5 Feed Post</span>
                  </div>
                </label>
                <label class="content-type-option">
                  <input type="radio" name="mv-content-type" value="carousel" onchange="mediaView.onContentTypeChange()">
                  <div class="content-type-card">
                    <span class="content-type-icon">🎠</span>
                    <span class="content-type-name">Carousel</span>
                    <span class="content-type-desc">Multi-Image</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Hook -->
            <div class="form-group">
              <label class="form-label">
                <span style="color: var(--accent-primary);">⚡ Curiosity Hook</span> (First 3 seconds)
              </label>
              <input type="text" id="mv-hook" class="form-input" value="Stop building basic chatbots in 2026! Here is the actual architecture.">
            </div>

            <!-- Body -->
            <div class="form-group">
              <label class="form-label">🔥 Value Delivery</label>
              <textarea id="mv-body" class="form-textarea" style="min-height: 70px;">Most developers get stuck with fragile prompts and hallucinations. The top engineering teams use deterministic state graphs with automated checkpointing and hybrid cross-encoder reranking.</textarea>
            </div>

            <!-- CTA & Keyword -->
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">🎯 Trigger Keyword</label>
                <input type="text" id="mv-keyword" class="form-input font-mono" style="font-weight: 700; color: var(--accent-primary);" value="AGENT" oninput="mediaView.syncKeyword(this.value)">
              </div>
              <div class="form-group">
                <label class="form-label">Visual Engine</label>
                <select id="mv-engine" class="form-select">
                  <option value="nano_banana">Nano Banana Canvas v2</option>
                  <option value="gemini_imagen">Gemini Imagen 3</option>
                </select>
              </div>
            </div>

            <!-- Caption -->
            <div class="form-group">
              <label class="form-label">Instagram Caption</label>
              <textarea id="mv-caption" class="form-textarea" style="min-height: 90px;">Stop building basic chatbots in 2026! 🤖

Here is the exact architecture behind autonomous multi-agent systems.

Comment "AGENT" below and I will DM you the complete blueprint + code repo! 🚀

#aiagents #langgraph #python #softwareengineering #genai</textarea>
            </div>

            <div class="flex items-center justify-between mt-4" style="flex-wrap: wrap; gap: 0.5rem;">
              <button id="mv-gen-btn" class="btn btn-secondary" onclick="mediaView.generateMedia()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                Generate Media Assets
              </button>

              <button id="mv-pub-btn" class="btn btn-primary" onclick="mediaView.publishAndBridge()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Publish & Arm InstaAuto
              </button>
            </div>
          </div>

          <!-- Image Gallery (shown after generation) -->
          <div id="mv-image-gallery" class="card hidden">
            <div class="section-label">Generated Infographic Variants</div>
            <h4 style="margin-top: 0.2rem; margin-bottom: 1rem;">Nano Banana Canvas v2 Output</h4>
            <div id="mv-gallery-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;"></div>
          </div>

          <!-- Funnel Simulator -->
          <div class="card" style="background: var(--bg-deep);">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="section-label">Live Integration</div>
                <h4 style="margin-top: 0.1rem;">Comment Simulator</h4>
              </div>
              <span class="badge badge-armed">Port 3000</span>
            </div>
            <div class="flex gap-2">
              <input type="text" id="mv-sim-handle" class="form-input text-sm" value="alex_dev_99" placeholder="Username">
              <button class="btn btn-secondary btn-sm" onclick="mediaView.simulateFollowerComment()">
                Simulate "<span id="sim-btn-keyword">AGENT</span>"
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Preview -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          <div class="section-label" style="align-self: flex-start;" id="mv-preview-label">Vertical 9:16 Preview</div>

          <!-- Video Preview (for Reels) -->
          <div id="mv-video-preview">
            <div class="phone-mockup">
              <div class="phone-notch"></div>
              <video id="mv-phone-video" class="phone-video" src="/generated/reels/test_reel.mp4" controls autoplay loop playsinline muted></video>
              <div class="phone-overlay">
                <div class="phone-overlay-badge" id="mv-phone-badge">AGENT</div>
                <div class="phone-overlay-caption" id="mv-phone-caption">
                  Stop building basic chatbots in 2026! Comment "AGENT" for the architecture guide!
                </div>
              </div>
            </div>
          </div>

          <!-- Image Preview (for Image Posts) -->
          <div id="mv-image-preview" class="hidden" style="width: 100%;">
            <div style="background: #1E1B18; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">
              <img id="mv-preview-img" src="" alt="Preview" style="width: 100%; display: block;" onerror="this.style.display='none'">
            </div>
          </div>

          <div class="text-center text-sm text-muted" id="mv-preview-info">
            1080x1920 MP4 • 9:16 Vertical Ratio
          </div>
        </div>
      </div>
    `;

    if (window.mediaViewPreload) {
      const p = window.mediaViewPreload;
      const cleanWord = p.topic.toUpperCase().includes('RAG') ? 'RAG' : (p.topic.toUpperCase().includes('DEEP') ? 'DEEP' : 'AGENT');
      document.getElementById('mv-keyword').value = cleanWord;
      this.syncKeyword(cleanWord);
      document.getElementById('mv-hook').value = `Why 90% of developers get ${p.topic.slice(0, 30)} wrong in 2026!`;
    }
  },

  onContentTypeChange() {
    const type = document.querySelector('input[name="mv-content-type"]:checked')?.value || 'reel';
    const videoPreview = document.getElementById('mv-video-preview');
    const imagePreview = document.getElementById('mv-image-preview');
    const previewLabel = document.getElementById('mv-preview-label');
    const previewInfo = document.getElementById('mv-preview-info');

    if (type === 'reel') {
      videoPreview.classList.remove('hidden');
      imagePreview.classList.add('hidden');
      previewLabel.innerText = 'Vertical 9:16 Preview';
      previewInfo.innerText = '1080x1920 MP4 • 9:16 Vertical Ratio';
    } else if (type === 'image') {
      videoPreview.classList.add('hidden');
      imagePreview.classList.remove('hidden');
      previewLabel.innerText = '4:5 Feed Post Preview';
      previewInfo.innerText = '1080x1350 PNG • 4:5 Feed Optimized';
    } else {
      videoPreview.classList.add('hidden');
      imagePreview.classList.remove('hidden');
      previewLabel.innerText = 'Carousel Preview';
      previewInfo.innerText = '1080x1080 PNG • 1:1 Square Carousel';
    }
  },

  syncKeyword(kw) {
    const clean = (kw || 'DRAG').toUpperCase().trim();
    const badge = document.getElementById('media-trigger-badge');
    if (badge) badge.innerText = `KEYWORD: ${clean}`;
    const phoneBadge = document.getElementById('mv-phone-badge');
    if (phoneBadge) phoneBadge.innerText = clean;
    const simKeyword = document.getElementById('sim-btn-keyword');
    if (simKeyword) simKeyword.innerText = clean;
  },

  async generateMedia() {
    const contentType = document.querySelector('input[name="mv-content-type"]:checked')?.value || 'reel';
    const btn = document.getElementById('mv-gen-btn');

    btn.disabled = true;
    btn.innerText = `Generating ${contentType} assets...`;

    try {
      const preload = window.mediaViewPreload || {};
      const res = await fetch('/api/media/generate-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverable_id: preload.deliverableId || null,
          topic: preload.topic || 'Autonomous AI Systems in 2026',
          title: preload.title || 'Autonomous AI Systems Blueprint',
          summary: document.getElementById('mv-body').value,
          insights: preload.insights || [],
          content_type: contentType
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      this.currentMedia = data.media;

      // Update previews based on content type
      if (contentType === 'reel' && data.media.video_url) {
        const videoPlayer = document.getElementById('mv-phone-video');
        if (videoPlayer) {
          videoPlayer.src = data.media.video_url;
          videoPlayer.play().catch(() => {});
        }
      } else {
        const previewImg = document.getElementById('mv-preview-img');
        if (previewImg) {
          previewImg.src = data.media.image_feed_url || data.media.image_square_url || data.media.image_url;
          previewImg.style.display = 'block';
        }
      }

      // Show image gallery
      const gallery = document.getElementById('mv-image-gallery');
      const galleryGrid = document.getElementById('mv-gallery-grid');
      if (gallery && galleryGrid) {
        gallery.classList.remove('hidden');
        const images = [
          { label: '9:16 Cover', url: data.media.image_url },
          { label: '1:1 Square', url: data.media.image_square_url },
          { label: '4:5 Feed', url: data.media.image_feed_url }
        ].filter(i => i.url);

        galleryGrid.innerHTML = images.map(img => `
          <div style="text-align: center;">
            <img src="${img.url}" alt="${img.label}" style="width: 100%; border-radius: 8px; border: 1px solid var(--border-color);" onerror="this.style.display='none'">
            <div class="text-sm text-muted" style="margin-top: 0.3rem;">${img.label}</div>
          </div>
        `).join('');
      }

      app.showToast(`${contentType} assets generated! Keyword: ${data.media.trigger_keyword}`, 'success');
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Generate Media Assets';
    }
  },

  async publishAndBridge() {
    const contentType = document.querySelector('input[name="mv-content-type"]:checked')?.value || 'reel';
    const btn = document.getElementById('mv-pub-btn');
    btn.disabled = true;
    btn.innerText = `Publishing ${contentType}...`;

    try {
      const preload = window.mediaViewPreload || {};
      const caption = document.getElementById('mv-caption').value;
      const mediaId = this.currentMedia?.mediaAssetId || null;

      // Choose publish endpoint based on content type
      const endpointMap = {
        reel: '/api/publish/instagram',
        image: '/api/publish/image',
        carousel: '/api/publish/carousel'
      };

      const res = await fetch(endpointMap[contentType] || '/api/publish/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_asset_id: mediaId,
          deliverable_id: preload.deliverableId || null,
          caption,
          topic: preload.topic || 'Autonomous Multi-Agent Systems in 2026',
          lead_magnet_title: preload.title || 'Architecture Guide'
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Publishing failed');

      app.showToast(`Published ${contentType} #${data.publish.ig_media_id} and armed InstaAuto!`, 'success');
      setTimeout(() => app.navigate('matrix'), 1000);
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Publish & Arm InstaAuto';
    }
  },

  async simulateFollowerComment() {
    const handle = document.getElementById('mv-sim-handle').value || 'test_builder';
    const keyword = document.getElementById('mv-keyword').value || 'AGENT';
    const mediaId = this.currentMedia?.ig_media_id || '18049102948201941';

    try {
      app.showToast(`Sending "${keyword}" from @${handle}...`, 'success');
      const res = await fetch('http://localhost:3000/api/agent/simulate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId, keyword, username: handle })
      });
      const data = await res.json();
      if (data.success) {
        app.showToast(`Follow-First DM sent to @${handle}!`, 'success');
      } else {
        app.showToast(data.error || 'Simulation error', 'error');
      }
    } catch (err) {
      app.showToast(`Error: ${err.message}. Ensure InstaAuto on Port 3000.`, 'error');
    }
  }
};

window.mediaView = mediaView;
