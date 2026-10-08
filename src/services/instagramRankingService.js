const { routeRequest, getAvailableProviders } = require('./llmRouter');
const { getSetting, getBrandAssets, getConnectedPageBySlug } = require('../database');
const { detectPostIntent } = require('./instagramDmHarvesterService');

/**
 * OmniResearch v5.0 — Multi-Page Instagram Ranking & Creative Transformation Service
 * Dynamically evaluates candidate posts across ANY niche (gaming, tech, fitness, comedy,
 * business, lifestyle, etc.), extracts authentic topics, generates tailored
 * viral captions, niche hashtags, and tone matched to the target destination page.
 */

async function evaluateAndTransformPost(postData) {
  const {
    caption = '',
    hook = '',
    author = '',
    content_type = 'reel',
    slides_count = 1,
    min_score_threshold = 70,
    destination = 'gta6'
  } = postData;

  const targetPage = getConnectedPageBySlug(destination);
  const brand = getBrandAssets();

  // Dynamically resolve brand identity from connected_pages registry or fallback
  let brandHandle = (targetPage && targetPage.handle) || '';
  if (!brandHandle) {
    brandHandle = destination === 'tech'
      ? getSetting('tech_instagram_handle', '@technews_daily_ai')
      : (brand.brand_handle || getSetting('instagram_handle', '@gta6_updates_007'));
  }

  let brandName = (targetPage && targetPage.name) || '';
  if (!brandName) {
    brandName = destination === 'tech' ? 'Tech News Daily AI' : 'GTA 6 Updates 007';
  }

  // Derive specialized niche domain for the target page
  let targetNiche = targetPage?.niche || '';
  if (!targetNiche) {
    targetNiche = destination === 'tech'
      ? 'Tech News, Artificial Intelligence, Developer Tools & Software Engineering'
      : 'GTA 6 Leaks, Rockstar Games, Vice City Rumors & Gaming Highlights';
  }

  const sampleHashtags = destination === 'tech'
    ? '#TechNews #AI #ArtificialIntelligence #SoftwareEngineering #TechTrends #Coding #MachineLearning #Developer'
    : (destination === 'gta6'
      ? '#GTA6 #RockstarGames #GTA6Leaks #GTAViceCity #GamingCommunity #GamingNews #Gamer #GTA6Trailer'
      : `#${(targetNiche.split(/[\s,]+/)[0] || 'Viral').replace(/[^A-Za-z0-9]/g, '')} #Trending #ExplorePage #InstaDaily`);

  // Detect whether post genuinely has a DM trigger keyword or is a direct repost
  const detectedIntentResult = detectPostIntent(caption, hook);
  const detectedIntent = postData.directPostOnly ? 'direct_repost' : (postData.post_intent || detectedIntentResult.intent);
  const rawKeyword = postData.directPostOnly ? '' : (detectedIntentResult.keyword || '');

  // Discover best available LLM provider
  const providers = getAvailableProviders();
  const activeProvider = providers.find(p => p.available && p.id !== 'ollama') || providers.find(p => p.available) || { id: 'gemini', models: ['gemini-2.5-flash'] };
  const providerId = activeProvider.id;
  const modelName = activeProvider.models[0];

  const systemPrompt = `You are the Lead Content Strategist & Growth Architect for "${brandName}" (${brandHandle}).
Channel Niche: ${targetNiche}.
Our mission: Transform viral reels, carousels, and video clips into high-performing, high-engagement Instagram content tailored specifically for our ${brandName} audience.

Your task is to analyze an incoming Instagram post from creator @${author}, extract its core topic and niche, evaluate its viral potential, and generate an ultra-high-converting repurposed caption.

Determine whether this post is:
1. "lead_magnet": The post has an active comment-to-DM call to action (e.g. "comment PLAYBOOK for the link", "type CODE for the repo").
2. "direct_repost": A pure viral clip, tutorial, workout, gameplay, meme, breakdown, or tip that should be directly reposted without any fake DM triggers or fake deliverables.

Return ONLY a valid JSON object with the following schema:
{
  "fit_score": <number between 0 and 100>,
  "decision": "<APPROVED or REJECTED>",
  "post_intent": "<'lead_magnet' or 'direct_repost'>",
  "reasoning": "<1-2 sentences on viral fit and appeal>",
  "detected_topic": "<2-4 words topic matching the actual content, e.g. Core Workout Routine, Python AI Agent, Gameplay Highlights, Business Strategy>",
  "detected_niche": "<1-2 words niche matching ${targetNiche}>",
  "detected_trigger_keyword": "<1 uppercase keyword IF lead_magnet, or empty string \"\" IF direct_repost>",
  "repurposed_hook": "<compelling, scroll-stopping 1-sentence hook under 85 characters>",
  "repurposed_caption": "<complete ready-to-post Instagram caption formatted with bullet points, high energy, line breaks, and 6-10 targeted niche hashtags matching ${brandName} and ${targetNiche} (e.g.: ${sampleHashtags}). IF lead_magnet: end with 'Comment \"<keyword>\" below to get the resources sent to your DMs!'. IF direct_repost: end with an engaging community discussion question/prompt WITHOUT any DM promise>"
}`;

  const userPrompt = `Analyze this candidate post:
- Creator: @${author}
- Target Account: ${brandName} (${brandHandle})
- Target Niche: ${targetNiche}
- Content Type: ${content_type} (${slides_count} slide(s))
- Original Hook: ${hook}
- Detected Initial Trigger: ${rawKeyword ? `"${rawKeyword}" (Lead Magnet)` : 'None (Direct Viral Repost)'}
- Direct Post Only Mode: ${postData.directPostOnly ? 'YES (No DM automation, No PDF)' : 'NO'}
- Original Caption:
"""
${caption.substring(0, 1500)}
"""

Evaluate viral engagement potential and write a caption customized specifically for ${brandName} (${brandHandle}) in the ${targetNiche} niche.
${(postData.forceApprove || postData.directPostOnly || postData.isDirectSubmission) ? 'NOTE: This was directly shared by the account owner to post. Set decision to "APPROVED" and score >= 95.' : `If score >= ${min_score_threshold}, set decision to "APPROVED", else "REJECTED".`}
CRITICAL: If directPostOnly is YES or no comment-to-DM trigger keyword exists, set post_intent to "direct_repost" and detected_trigger_keyword to "". Do NOT invent a fake DM keyword or PDF promise. Instead, write an engaging discussion/save CTA.`;

  try {
    const res = await routeRequest(
      providerId,
      modelName,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { jsonMode: true, temperature: 0.3, timeout: providerId === 'ollama' ? 3500 : 15000 }
    );

    let parsed;
    try {
      const cleanJson = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      const match = res.content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse LLM JSON response');
    }

    const fitScore = typeof parsed.fit_score === 'number' ? parsed.fit_score : 90;
    const isDirectSubmission = Boolean(postData.forceApprove || postData.directPostOnly || postData.isDirectSubmission);
    const decision = isDirectSubmission ? 'APPROVED' : (parsed.decision || (fitScore >= min_score_threshold ? 'APPROVED' : 'REJECTED'));
    const finalIntent = postData.directPostOnly ? 'direct_repost' : ((parsed.post_intent === 'lead_magnet' || (rawKeyword && parsed.post_intent !== 'direct_repost')) ? 'lead_magnet' : 'direct_repost');
    const finalKeyword = (finalIntent === 'lead_magnet' && !postData.directPostOnly) ? (parsed.detected_trigger_keyword || rawKeyword || 'GUIDE').toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

    const finalFitScore = isDirectSubmission ? Math.max(95, fitScore) : fitScore;
    const scoreBreakdown = {
      vibeScore: Math.min(100, Math.max(65, Math.round(finalFitScore * 1.01))),
      uspScore: Math.min(100, Math.max(70, Math.round(finalFitScore * 0.99))),
      qualityScore: Math.min(100, Math.max(75, Math.round(92 - (hook.length % 5)))),
      freshnessScore: 95
    };

    return {
      success: true,
      provider: `${providerId}/${modelName}`,
      fit_score: finalFitScore,
      decision,
      post_intent: finalIntent,
      reasoning: parsed.reasoning || `Repurposed for viral engagement on ${brandName}.`,
      detected_topic: parsed.detected_topic || 'Viral Content',
      detected_niche: parsed.detected_niche || targetNiche,
      detected_trigger_keyword: finalKeyword,
      repurposed_hook: parsed.repurposed_hook || hook || 'Must Watch Clip',
      repurposed_caption: parsed.repurposed_caption || caption,
      score_breakdown: scoreBreakdown
    };
  } catch (err) {
    console.warn(`[Ranking Service] LLM call failed (${err.message}). Using intelligent universal heuristic fallback.`);
    return fallbackEvaluation(postData, min_score_threshold, brandHandle, detectedIntent, rawKeyword, destination, brandName, targetNiche);
  }
}

/**
 * Robust universal heuristic fallback in case LLM is temporarily unreachable
 */
function fallbackEvaluation(postData, minScoreThreshold, brandHandle, detectedIntent = 'direct_repost', rawKeyword = '', destination = 'gta6', brandName = '', targetNiche = '') {
  const isDirect = Boolean(postData.forceApprove || postData.directPostOnly || postData.isDirectSubmission);
  const score = isDirect ? 95 : 85;
  const isLeadMagnet = !postData.directPostOnly && (detectedIntent === 'lead_magnet' || Boolean(rawKeyword));
  const keyword = isLeadMagnet ? (rawKeyword || 'INFO') : '';

  const originalCleanCaption = (postData.caption || '').replace(/@\w+/g, '').trim();
  const cleanHook = (postData.hook || originalCleanCaption.slice(0, 75) || 'Must See Viral Clip').slice(0, 85);

  let hashtagBlock = '';
  let nicheFollowCta = `Follow ${brandHandle} for daily updates! ✨`;

  if (destination === 'tech') {
    hashtagBlock = '#TechNews #AI #ArtificialIntelligence #SoftwareEngineering #TechTrends #Coding #MachineLearning';
    nicheFollowCta = `Follow ${brandHandle} for daily high-signal tech & AI breakthroughs! 💻`;
  } else if (destination === 'gta6') {
    hashtagBlock = '#GTA6 #RockstarGames #GTA6Leaks #GTAViceCity #GamingCommunity #GamingNews #Gamer';
    nicheFollowCta = `Follow ${brandHandle} for daily verified GTA 6 leaks & official news! 🎮`;
  } else {
    const existingHashtags = (postData.caption || '').match(/#[A-Za-z0-9_]+/g) || [];
    const words = cleanHook.replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const dynamicTags = words.slice(0, 4).map(w => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);
    const defaultTags = ['#Trending', '#ViralReels', '#ExplorePage', '#DailyInspo'];
    hashtagBlock = Array.from(new Set([...existingHashtags, ...dynamicTags, ...defaultTags])).slice(0, 8).join(' ');
    nicheFollowCta = `Follow ${brandHandle} for more daily content! ✨`;
  }

  const captionBody = originalCleanCaption || cleanHook;
  const cta = isLeadMagnet 
    ? `\n\nDrop a comment with "${keyword}" to get the complete resources delivered straight to your DMs! 📩`
    : `\n\nWhat are your thoughts on this? Let us know in the comments below! 👇`;

  return {
    success: true,
    provider: 'heuristic_fallback',
    fit_score: score,
    decision: 'APPROVED',
    post_intent: isLeadMagnet ? 'lead_magnet' : 'direct_repost',
    reasoning: `Submission approved for ${brandName || destination}.`,
    detected_topic: cleanHook.slice(0, 30),
    detected_niche: targetNiche || (destination === 'tech' ? 'AI & Tech' : 'Gaming'),
    detected_trigger_keyword: keyword,
    repurposed_hook: cleanHook,
    repurposed_caption: `${captionBody}${cta}\n\n${hashtagBlock}\n\n${nicheFollowCta}`,
    score_breakdown: {
      vibeScore: Math.min(100, Math.max(70, Math.round(score * 1.01))),
      uspScore: Math.min(100, Math.max(70, Math.round(score * 0.99))),
      qualityScore: 90,
      freshnessScore: 95
    }
  };
}

module.exports = {
  evaluateAndTransformPost
};
