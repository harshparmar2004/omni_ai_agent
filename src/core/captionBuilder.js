/**
 * OmniStudio v7 — Caption Builder
 * Deterministic caption transformer that cleanses spam CTAs,
 * adds clean creator attribution, applies page hashtags,
 * and strictly enforces Meta Instagram character & hashtag limits.
 */

const CTA_PATTERNS = [
  /comment\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?\s+(?:below|to\s+get|for\s+the\s+link|and\s+I['’]?ll\s+dm|to\s+receive)[^\n.]*/gi,
  /(?:drop\s+a\s+comment|type)\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?[^\n.]*/gi,
  /link\s+in\s+bio[^\n.]*/gi,
  /check\s+(?:the\s+)?link\s+in\s+(?:my\s+)?bio[^\n.]*/gi,
  /(?:dm|message)\s+(?:me|us)\s+["'“‘]?[a-zA-Z0-9_-]+["'”’]?[^\n.]*/gi,
  /save\s+this\s+reel\s+(?:for\s+later|and\s+share)[^\n.]*/gi,
  /follow\s+@[\w._-]+\s+for\s+more[^\n.]*/gi
];

function cleanRawCaption(rawCaption, competitorHandles = []) {
  if (!rawCaption) return '';
  let text = rawCaption;

  // 1. Remove competitor @handles mentioned in competitorHandles list
  for (const h of competitorHandles) {
    if (!h) continue;
    const cleanH = h.replace(/^@/, '');
    const reg = new RegExp(`@${cleanH}\\b`, 'gi');
    text = text.replace(reg, '');
  }

  // 2. Strip spam CTA lines
  for (const pattern of CTA_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // 3. Normalise multiple empty newlines
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

  // Attribution & Viral Follow CTA
  let attribution = '';
  if (page.attribution_enabled && sourceUsername && sourceUsername !== 'instagram') {
    attribution = `🎥 Credit: @${sourceUsername}`;
  }

  const handle = page.handle || `@${page.slug || 'our_page'}`;
  const pageName = page.name || 'GTA 6';
  const followCta = `👉 Follow ${handle} for daily ${pageName} leaks & updates!`;

  // Dynamic interactive prompt to trigger comments, saves, and shares
  const promptIdx = Math.abs(simpleHash(bodyWithoutHashtags || 'default')) % ENGAGEMENT_PROMPTS.length;
  const engagementPrompt = ENGAGEMENT_PROMPTS[promptIdx];

  // Collect and deduplicate hashtags (Meta Reels Algorithm 2025/2026: 3-5 hyper-relevant tags)
  const originalTags = extractHashtags(rawCaption);
  const defaultTags = extractHashtags(page.default_hashtags || '');

  const tagSet = new Set();
  const mergedTags = [];

  for (const tag of [...defaultTags, ...originalTags]) {
    const lower = tag.toLowerCase();
    if (!tagSet.has(lower)) {
      tagSet.add(lower);
      mergedTags.push(tag);
    }
  }

  // Hard cap at 5 hashtags max to avoid spam dampening
  const finalTags = mergedTags.slice(0, 5);
  const hashtagBlock = finalTags.join(' ');

  // Assemble caption parts cleanly
  const sections = [];
  if (bodyWithoutHashtags) sections.push(bodyWithoutHashtags);
  if (engagementPrompt) sections.push(engagementPrompt);
  if (attribution) sections.push(attribution);
  if (followCta) sections.push(followCta);
  if (hashtagBlock) sections.push(hashtagBlock);

  let finalCaption = sections.join('\n\n').trim();

  // Meta Instagram limits: Max 2,200 characters
  if (finalCaption.length > 2200) {
    const overage = finalCaption.length - 2190;
    // Truncate the body portion safely
    const truncatedBody = bodyWithoutHashtags.substring(0, Math.max(100, bodyWithoutHashtags.length - overage - 10)) + '...';
    finalCaption = template
      .replace('{caption}', truncatedBody)
      .replace('{attribution}', attribution)
      .replace('{hashtags}', hashtagBlock)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

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
