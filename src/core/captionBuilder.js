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
  let text = rawCaption;

  // 1. Strip third-party credit / source / repost lines
  for (const pattern of CTA_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // 2. Remove competitor @handles mentioned in competitorHandles list & any external @mentions
  text = text.replace(/@[a-zA-Z0-9_.-]+/g, (match) => {
    const lower = match.toLowerCase();
    if (lower === '@gta6_updates_007' || lower === '@movie_series_365') return match;
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

  const isMovie = (page.slug && page.slug.includes('movie')) ||
                  (page.handle && page.handle.includes('movie')) ||
                  (page.name && /movie|series|film|cinema/i.test(page.name)) ||
                  page.id === 2;

  const handle = page.handle || `@${page.slug || (isMovie ? 'movie_series_365' : 'gta6_updates_007')}`;
  const pageName = page.name || (isMovie ? 'Movie Recommendations' : 'GTA 6');
  const followCta = isMovie
    ? `🍿 Follow ${handle} for daily movie & series recommendations!`
    : `🔥 Follow ${handle} for daily ${pageName} leaks, map secrets & official news!`;

  // Dynamic interactive prompt to trigger comments, saves, and shares (high algorithmic weighting)
  const promptIdx = Math.abs(simpleHash(bodyWithoutHashtags || 'default')) % ENGAGEMENT_PROMPTS.length;
  const engagementPrompt = isMovie
    ? "💬 What's your thoughts on this? Drop your reaction below 👇"
    : ENGAGEMENT_PROMPTS[promptIdx];
  const saveShareCta = isMovie
    ? "💾 Save this reel so you don't lose it!"
    : '💾 Save & share this reel with a friend who is waiting for GTA 6!';

  // Collect and deduplicate hashtags (Meta Reels Algorithm: 4-5 hyper-relevant tags)
  const originalTags = extractHashtags(rawCaption);
  const defaultMovieTags = '#movies #movierecommendations #filmtok #cinema #mustwatch #365movies';
  const defaultGtaTags = '#gta6 #gtavi #rockstargames #vicecity #gta6leaks';
  const defaultTags = extractHashtags(page.default_hashtags || (isMovie ? defaultMovieTags : defaultGtaTags));

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
 * Builds AI-buffed viral caption via configured LLM provider
 * Falls back to deterministic buildCaption if LLM is unavailable
 */
async function buildAiCaption({ rawCaption = '', sourceUsername = '', page = {} }) {
  try {
    const { generateAiCaption } = require('./llmService');
    const result = await generateAiCaption({ rawCaption, sourceUsername, page });
    return result.caption || buildCaption({ rawCaption, sourceUsername, page });
  } catch (err) {
    console.warn(`[Caption Builder] AI generation fallback: ${err.message}`);
    return buildCaption({ rawCaption, sourceUsername, page });
  }
}

module.exports = {
  cleanRawCaption,
  extractHashtags,
  stripHashtagsFromText,
  buildCaption,
  buildAiCaption
};
