/**
 * OmniStudio v7 — Caption Builder
 * Deterministic caption transformer that cleanses spam CTAs,
 * adds clean creator attribution, applies page hashtags,
 * and strictly enforces Meta Instagram character & hashtag limits.
 */

const CTA_PATTERNS = [
  /(?:credit|credits|cr|via|source|repost|original|video\s+by|clip\s+by)\s*:?\s*@?[a-zA-Z0-9_.-]+/gi,
  /comment\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?\s+(?:below|to\s+get|for\s+the\s+link|and\s+I['’]?ll\s+dm|to\s+receive)[^\n.]*/gi,
  /(?:drop\s+a\s+comment|type)\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?[^\n.]*/gi,
  /link\s+in\s+bio[^\n.]*/gi,
  /check\s+(?:the\s+)?link\s+in\s+(?:my\s+)?bio[^\n.]*/gi,
  /(?:dm|message)\s+(?:me|us)\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?[^\n.]*/gi,
  /(?:check\s+out|follow)\s+(?:our\s+page\s+)?@?[\w._-]*\s*(?:for\s+more[^\n.]*)?/gi,
  /save\s+this\s+reel\s+(?:for\s+later|and\s+share)[^\n.]*/gi,
  /follow\s+@[\w._-]+\s+for\s+more[^\n.]*/gi,
  /follow\s+us\s+for\s+more[^\n.]*/gi,
  /check\s+out\s+for\s+more[^\n.]*/gi
];

function cleanRawCaption(rawCaption, competitorHandles = []) {
  if (!rawCaption) return '';
  let text = rawCaption
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&;s/g, "'s")
    .replace(/&;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 1. Strip third-party credit / source / repost lines
  for (const pattern of CTA_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // 2. Remove competitor @handles mentioned in competitorHandles list & any external @mentions
  text = text.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const lower = match.toLowerCase();
    if (lower === '@gta6_updates_007' || lower === '@movie_series_365' || lower === '@clubbingcult' || lower === '@cult_information' || lower === '@evolving.ai') return match;
    return '';
  });

  // 3. Normalise multiple empty newlines & clean dangling punctuation
  text = text.replace(/([!?:;])\s*\./g, '$1');
  text = text.replace(/\s+([.,;:])/g, '$1');
  text = text.replace(/^\s*[.,;:–-]+\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map(t => t.trim()) : [];
}

function stripHashtagsFromText(text) {
  if (!text) return '';
  return text.replace(/#[a-zA-Z0-9_]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

const ENGAGEMENT_PROMPTS = [
  '💬 What are your thoughts on this? Drop your reaction below 👇',
  '💾 Save this reel so you have it ready when the game drops!',
  '🚀 Send this to your crew who needs to see this!',
  '👀 Real or overhyped? Let us know in the comments 👇',
  '🔥 Double tap if you are hyped for this!'
];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Builds the final ready-to-post Instagram caption
 *
 * @param {Object} options
 * @param {string} options.rawCaption
 * @param {string} options.sourceUsername
 * @param {Object} options.page
 * @returns {string} Final compliant caption
 */
function buildCaption({ rawCaption = '', sourceUsername = '', page = {} }) {
  const competitorHandles = sourceUsername ? [sourceUsername] : [];
  const bodyWithoutHashtags = stripHashtagsFromText(cleanRawCaption(rawCaption, competitorHandles));

  const isClubbing = (page.slug && page.slug.includes('club')) ||
                     (page.handle && page.handle.includes('club')) ||
                     (page.name && /club|rave|party|dance|edm|techno|concert/i.test(page.name)) ||
                     page.id === 3 || String(page.id) === '3';

  const isMovie = (page.slug && page.slug.includes('movie')) ||
                  (page.handle && page.handle.includes('movie')) ||
                  (page.name && /movie|series|film|cinema/i.test(page.name)) ||
                  page.id === 2 || String(page.id) === '2';

  const isVideoEssay = (page.slug && (page.slug === 'cult_information' || page.slug === 'ai_curation' || page.slug.includes('cult_info') || page.slug.includes('evolving') || page.slug.includes('ai'))) ||
                       (page.handle && (page.handle.includes('cult_info') || page.handle.includes('cultinformation') || page.handle.includes('evolving') || page.handle.includes('ai'))) ||
                       (page.name && /cult.*info|evolving|ai|tech/i.test(page.name)) ||
                       page.id === 4 || String(page.id) === '4';

  const defaultHandle = isClubbing ? 'clubbingcult' : (isMovie ? 'movie_series_365' : (isVideoEssay ? 'cult_information' : 'gta6_updates_007'));
  const handle = page.handle || `@${page.slug || defaultHandle}`;
  const pageName = page.name || (isClubbing ? 'Clubbing Cult' : (isMovie ? 'Movie Recommendations' : (isVideoEssay ? 'Cult Information' : 'GTA 6')));
  const followCta = isClubbing
    ? `🪩 Follow ${handle} for the wildest club sets, concert moments & festival drops!`
    : (isMovie
      ? `🍿 Follow ${handle} for daily movie & series recommendations!`
      : (isVideoEssay
        ? `🔔 Follow ${handle} for daily high-impact breakdowns & updates!`
        : `🔥 Follow ${handle} for daily ${pageName} leaks, map secrets & official news!`));

  // Dynamic interactive prompt to trigger comments, saves, and shares (high algorithmic weighting)
  const promptIdx = Math.abs(simpleHash(bodyWithoutHashtags || 'default')) % ENGAGEMENT_PROMPTS.length;
  const engagementPrompt = isClubbing
    ? "🔥 Rate this track/set 1-10 in the comments below! 👇"
    : (isMovie
      ? "💬 What's your thoughts on this? Drop your reaction below 👇"
      : (isVideoEssay
        ? "💬 Will this change everything, or is it overhyped? Drop your thoughts below 👇"
        : ENGAGEMENT_PROMPTS[promptIdx]));
  const saveShareCta = isClubbing
    ? "💾 Save this reel & send to your party crew! 🔊"
    : (isMovie
      ? "💾 Save this reel so you don't lose it!"
      : (isVideoEssay
        ? "💾 Save this reel & share with someone who needs to see this! 🚀"
        : '💾 Save & share this reel with a friend who is waiting for GTA 6!'));

  // Collect and deduplicate hashtags (Meta Reels Algorithm: 4-5 hyper-relevant tags)
  const originalTags = extractHashtags(rawCaption);
  const defaultClubbingTags = '#clubbing #party #houseparty #concert #rave #techno #edm #nightlife #festivals #clubbingcult';
  const defaultMovieTags = '#movies #movierecommendations #filmtok #cinema #mustwatch #365movies';
  const defaultCultTags = '#cultinformation #information #culture #knowledge #curation #mustknow #explore';
  const defaultGtaTags = '#gta6 #gtavi #rockstargames #vicecity #gta6leaks';
  const fallbackTags = isClubbing ? defaultClubbingTags : (isMovie ? defaultMovieTags : (isVideoEssay ? defaultCultTags : defaultGtaTags));
  const defaultTags = extractHashtags(page.default_hashtags || fallbackTags);

  const tagSet = new Set();
  const mergedTags = [];

  for (const tag of [...defaultTags, ...originalTags]) {
    const lower = tag.toLowerCase();
    if (!tagSet.has(lower) && tagSet.size < 5) {
      tagSet.add(lower);
      mergedTags.push(tag);
    }
  }

  const hashtagBlock = mergedTags.join(' ');

  // Assemble caption parts cleanly (STRICTLY ZERO CREDITS OR ATTRIBUTION)
  const sections = [];
  if (bodyWithoutHashtags) sections.push(bodyWithoutHashtags);
  if (engagementPrompt) sections.push(engagementPrompt);
  sections.push(saveShareCta);
  sections.push(followCta);
  if (hashtagBlock) sections.push(hashtagBlock);

  let finalCaption = sections.join('\n\n').trim();

  // Meta Instagram limits: Max 2,200 characters
  if (finalCaption.length > 2200) {
    const overage = finalCaption.length - 2150;
    const truncatedBody = bodyWithoutHashtags.substring(0, Math.max(100, bodyWithoutHashtags.length - overage - 10)) + '...';
    finalCaption = `${truncatedBody}\n\n${engagementPrompt}\n\n${saveShareCta}\n\n${followCta}\n\n${hashtagBlock}`.trim();

    if (finalCaption.length > 2200) {
      finalCaption = finalCaption.substring(0, 2197) + '...';
    }
  }

  return finalCaption;
}

/**
 * Builds AI-buffed viral caption and metadata (including hook headline)
 */
async function buildAiCaptionDetails({ rawCaption = '', sourceUsername = '', page = {} }) {
  try {
    const { generateAiCaption } = require('./llmService');
    const result = await generateAiCaption({ rawCaption, sourceUsername, page });
    return {
      caption: result.caption || buildCaption({ rawCaption, sourceUsername, page }),
      hookHeadline: result.hookHeadline || '',
      provider: result.provider || 'fallback',
      model: result.model || 'none'
    };
  } catch (err) {
    console.warn(`[Caption Builder] AI generation fallback: ${err.message}`);
    let fallbackHook = '';
    const isVideoEssay = page && (page.content_type === 'feed_card' || page.content_type === 'video-essay' || page.theme === 'evolving_ai' || (page.name && page.name.toLowerCase().includes('cult')));
    if (isVideoEssay && rawCaption) {
      const clean = rawCaption.replace(/#[\w_]+/g, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      const sentenceMatch = clean.match(/^([^.!?\n]+(?:\.\d+[^.!?\n]*)*)(?:[.!?\n]|$)/);
      let candidate = sentenceMatch ? sentenceMatch[1].trim() : clean;
      if (candidate.length > 105) candidate = candidate.slice(0, 100).replace(/\s+\S*$/, '');
      if (candidate && candidate.length >= 15) {
        fallbackHook = candidate.replace(/(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)/gi, '**$1**');
      }
    }
    return {
      caption: buildCaption({ rawCaption, sourceUsername, page }),
      hookHeadline: fallbackHook,
      provider: 'fallback',
      model: 'none'
    };
  }
}

/**
 * Builds AI-buffed viral caption via configured LLM provider
 * Falls back to deterministic buildCaption if LLM is unavailable
 */
async function buildAiCaption(options) {
  const details = await buildAiCaptionDetails(options);
  return details.caption;
}

module.exports = {
  cleanRawCaption,
  extractHashtags,
  stripHashtagsFromText,
  buildCaption,
  buildAiCaption,
  buildAiCaptionDetails
};
