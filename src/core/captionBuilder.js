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

  // Attribution
  let attribution = '';
  if (page.attribution_enabled && sourceUsername && sourceUsername !== 'instagram') {
    const handle = page.handle || `@${page.slug || 'our_page'}`;
    attribution = `💡 Source: @${sourceUsername} | Follow ${handle} for daily updates!`;
  }

  // Collect and deduplicate hashtags
  const originalTags = extractHashtags(rawCaption);
  const defaultTags = extractHashtags(page.default_hashtags || '');

  const tagSet = new Set();
  const mergedTags = [];

  for (const tag of [...originalTags, ...defaultTags]) {
    const lower = tag.toLowerCase();
    if (!tagSet.has(lower)) {
      tagSet.add(lower);
      mergedTags.push(tag);
    }
  }

  // Meta Instagram limits: Max 30 hashtags
  const finalTags = mergedTags.slice(0, 30);
  const hashtagBlock = finalTags.join(' ');

  // Template interpolation
  let finalCaption = '';
  const template = page.caption_template || '{caption}\n\n{attribution}\n\n{hashtags}';

  finalCaption = template
    .replace('{caption}', bodyWithoutHashtags)
    .replace('{attribution}', attribution)
    .replace('{hashtags}', hashtagBlock);

  // Clean up excessive blank lines from empty placeholders
  finalCaption = finalCaption.replace(/\n{3,}/g, '\n\n').trim();

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

module.exports = {
  cleanRawCaption,
  extractHashtags,
  stripHashtagsFromText,
  buildCaption
};
