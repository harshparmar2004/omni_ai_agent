const { exec } = require('child_process');
const path = require('path');
const { conductDeepResearch } = require('./researchService');
const { generateDeliverable } = require('./deliverableService');
const { getDb } = require('../database');
const { recommendTrendingAudio } = require('./trendingAudioService');
const { isTechNotesIntent } = require('./intentClassifier');

/**
 * Instagram Web Scraper & Intelligence Ingestion Service v1.0
 * Extracts profiles, posts, reels, carousel captions, hooks, and hashtags
 * from arbitrary Instagram URLs using headless browser automation.
 */

/**
 * Execute Python Instagram Scraper
 * @param {string} url - Instagram Profile or Post URL
 * @returns {Promise<Object>} Scraped structured data
 */
function scrapeInstagramUrl(url) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return reject(new Error('Valid Instagram URL is required'));
    }

    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'instagram_scraper.py');
    const safeUrl = url.trim().replace(/"/g, '\\"');
    const command = `python "${scriptPath}" "${safeUrl}"`;

    console.log(`[Instagram Scraper] 📸 Ingesting Instagram intelligence from: ${safeUrl}`);

    exec(command, { timeout: 35000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[Instagram Scraper Warning]:`, stderr || error.message);
      }

      try {
        const output = stdout.trim();
        const jsonStart = output.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(output.slice(jsonStart));
          return resolve(parsed);
        }
        return resolve({
          success: false,
          error: stderr || output || 'Failed to parse scraper response'
        });
      } catch (parseErr) {
        return resolve({
          success: false,
          error: `JSON parsing error: ${parseErr.message}`
        });
      }
    });
  });
}

/**
 * Scrape Instagram Post and Automatically Trigger Autonomous Deep Research & Content Creation
 * @param {string} instagramUrl - Link to Instagram post or carousel
 * @param {Object} options
 * @returns {Promise<Object>} Research campaign and generated deliverables
 */
async function scrapeAndTriggerResearch(instagramUrl, options = {}) {
  // 1. Scrape Instagram post
  const scrapeResult = await scrapeInstagramUrl(instagramUrl);
  if (!scrapeResult.success) {
    throw new Error(scrapeResult.error || 'Failed to scrape Instagram URL');
  }

  const detectedTopic = scrapeResult.detected_topic || scrapeResult.hook || 'Software Engineering Architecture';
  const hookText = scrapeResult.hook || `Verified Breakdown: ${detectedTopic}`;
  const rawCaption = scrapeResult.caption || '';
  const owner = scrapeResult.owner || 'instagram_creator';

  console.log(`\n======================================================`);
  console.log(`[Instagram ➔ Research Bridge] 🚀 Ingested Post from @${owner}`);
  console.log(`[Instagram ➔ Research Bridge] Topic: "${detectedTopic}"`);
  console.log(`[Instagram ➔ Research Bridge] Viral Hook: "${hookText.slice(0, 60)}..."`);
  console.log(`======================================================\n`);

  // 2. Conduct Deep Research on the extracted topic
  const researchResult = await conductDeepResearch({
    topic: detectedTopic,
    niche: options.niche || 'AI & Software Architecture',
    depth: options.depth || 'deep'
  });

  // 3. Generate companion whitepaper deliverable
  const deliverable = await generateDeliverable({
    campaignId: researchResult.campaignId,
    title: researchResult.title,
    summary: researchResult.summary,
    key_concepts: researchResult.key_concepts,
    code_snippets: researchResult.code_snippets,
    diagram_mermaid: researchResult.diagram_mermaid,
    diagram_url: researchResult.diagram_url,
    cover_url: researchResult.cover_url,
    banner_url: researchResult.banner_url,
    topic: researchResult.topic
  });

  // 4. Stage into Ready-To-Post Instagram Queue with the original viral hook
  const isNotes = isTechNotesIntent(detectedTopic, deliverable.title);
  const triggerKeyword = isNotes ? 'NOTES' : 'VIRAL';
  const audio = recommendTrendingAudio(detectedTopic, 'carousel');
  const slidesList = [1, 2, 3, 4, 5, 6].map(i => `/generated/carousels/${researchResult.campaignId}/slide_${i}.png`);
  const thumbUrl = `/generated/carousels/${researchResult.campaignId}/slide_1.png`;
  const pdfUrl = `/api/docs/${researchResult.campaignId}/pdf`;
  const deliverableUrl = `http://localhost:4000/docs/${deliverable.slug}`;

  const captionText = `${researchResult.title} 🚀\n\nInspired by viral industry discussion: "${hookText.slice(0, 80)}..."\n\nKey Highlights:\n• Verified industry intelligence & empirical benchmarks\n• Production starter code and system topology\n• Real-world implementation guidelines\n\n👉 Comment "${triggerKeyword}" below and my AI agent will instantly DM you the full guide and PDF! 🚀\n\n#tech #engineering #ai #developers #coding`;

  const db = getDb();
  let queuedPost = null;
  try {
    const insertPost = db.prepare(`
      INSERT INTO instagram_posts (
        campaign_id, deliverable_id, content_type, status, hook_text, caption,
        trigger_keyword, trending_song_title, trending_song_artist, trending_song_audio_url, audio_vibe,
        media_urls, thumbnail_url, deliverable_url, pdf_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      researchResult.campaignId,
      deliverable.id,
      'carousel',
      'ready_to_post',
      hookText,
      captionText,
      triggerKeyword,
      audio.title,
      audio.artist,
      audio.audio_url,
      audio.vibe,
      JSON.stringify(slidesList),
      thumbUrl,
      deliverableUrl,
      pdfUrl,
      new Date().toISOString()
    );

    queuedPost = db.prepare('SELECT * FROM instagram_posts WHERE id = ?').get(insertPost.lastInsertRowid);
  } catch (dbErr) {
    console.warn('[Instagram Bridge] Queue save notice:', dbErr.message);
  }

  return {
    success: true,
    source_instagram: scrapeResult,
    campaignId: researchResult.campaignId,
    deliverableId: deliverable.id,
    topic: detectedTopic,
    hook: hookText,
    deliverableUrl,
    pdfUrl,
    queuedPost
  };
}

module.exports = {
  scrapeInstagramUrl,
  scrapeAndTriggerResearch
};
