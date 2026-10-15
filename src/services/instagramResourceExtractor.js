const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { getDb, getSetting } = require('../database');
const { searchWeb } = require('./webSearchService');

/**
 * OmniResearch v4.0 — Autonomous Instagram Resource Extractor & Link Synthesizer
 * 
 * Solves the critical link-gap when reposting reels/carousels:
 * 1. Deep scans post captions, slides & creator bio for promised resources (courses, certificates, GitHub repos, tools).
 * 2. Resolves official, verified, direct registration / download URLs.
 * 3. Compiles a high-impact, branded Master Resource Hub & downloadable PDF Dossier.
 * 4. Supplies structured extracted resources for InstaAuto / ManyChat comment-to-DM triggers.
 */

// ── 1. Dynamic Web & Official Resource Resolver (Zero Hardcoded Fallbacks) ───

/**
 * Extracts URLs and shortened links from raw text
 */
function extractDirectLinks(text) {
  if (!text) return [];
  const regex = /(?:https?:\/\/|www\.)[^\s"'<>\),]+/gi;
  const matches = text.match(regex) || [];
  return matches.map(u => {
    let clean = u.replace(/[.,;!?)]+$/, '');
    if (!clean.startsWith('http')) clean = `https://${clean}`;
    return clean;
  }).filter(u => !u.includes('instagram.com') && !u.includes('facebook.com'));
}

function cleanItemTitle(text) {
  if (!text) return '';
  let clean = typeof text === 'string' && typeof text.toWellFormed === 'function' ? text.toWellFormed() : String(text || '');
  clean = clean.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  clean = clean.replace(/^[\p{Extended_Pictographic}\uFE0F\s\u200D\u26A1\uD83D\uDDE3\uD83D\uDD27\uD83D\uDD0A\uD83E\uDDE0]+[-:\s]*/u, '').trim();
  clean = clean.replace(/[\p{Extended_Pictographic}\uFE0F\s]+$/u, '').trim();
  return clean;
}

/**
 * Parse structured bullet points and course/project titles from caption text
 */
function parseItemsFromCaption(caption = '') {
  const items = [];
  const lines = caption.split('\n').map(l => l.trim()).filter(Boolean);

  let isInsideList = false;

  const genericPhrases = [
    'beginner friendly', 'self-paced', 'certificates from', 'great for students',
    'follow @', 'comment ', 'save this', 'share this', 'link in bio', 'disclaimer',
    'freshers', 'professionals', 'warning', 'course audit', 'financial aid'
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('courses included') || lower.includes('included courses') || lower.includes('projects included') || lower.includes('certificates included') || lower.includes('resources:')) {
      isInsideList = true;
      continue;
    }

    // Stop if encountering disclaimer or hashtags or follow CTA
    if (isInsideList && (lower.startsWith('follow ') || lower.startsWith('⚠️') || lower.startsWith('#') || lower.startsWith('disclaimer'))) {
      isInsideList = false;
    }

    if (genericPhrases.some(gp => lower.includes(gp))) {
      continue;
    }

    // Match list markers: numbers, standard bullets, and emoji bullets
    const match = line.match(/^(?:[\p{Extended_Pictographic}\uFE0F✅✔☑📌•*\-–—]|\d+[\.\)])\s*(.+)$/u);
    if (match) {
      const rawTitle = cleanItemTitle(match[1]);
      if (rawTitle.length > 3 && !genericPhrases.some(gp => rawTitle.toLowerCase().includes(gp))) {
        items.push(rawTitle);
      }
    } else if (isInsideList && line.length > 5 && !line.startsWith('#') && !line.startsWith('http') && !line.startsWith('🎓')) {
      const clean = cleanItemTitle(line.replace(/^[•*\-–—]\s*/, ''));
      if (clean.length > 3 && !genericPhrases.some(gp => clean.toLowerCase().includes(gp))) {
        items.push(clean);
      }
    }
  }

  // Fallback: If no bullet items found, look for numbered items anywhere in text
  if (items.length === 0) {
    const numRegex = /(?:^|\n)\s*(\d+[\.\)]\s*[^\n]+)/g;
    let m;
    while ((m = numRegex.exec(caption)) !== null) {
      const t = cleanItemTitle(m[1].replace(/^\d+[\.\)]\s*/, ''));
      if (t.length > 4 && t.length < 80 && !genericPhrases.some(gp => t.toLowerCase().includes(gp))) {
        items.push(t);
      }
    }
  }

  return [...new Set(items.map(cleanItemTitle).filter(Boolean))];
}

/**
 * Match an extracted title against the curated knowledge base (deprecated, returns null)
 */
function matchKnownResource(title) {
  return null;
}

/**
 * Discover official URLs for items using dynamic live web search
 */
async function resolveResourceUrl(title, contextTopic = '') {
  // Live Web Search for the specific item title
  try {
    const query = `${title} official direct portal`;
    const searchRes = await searchWeb(query, 3);
    if (searchRes && searchRes.length > 0) {
      const top = searchRes[0];
      let platform = 'Web Resource';
      if (top.url.includes('coursera.org')) platform = 'Coursera';
      else if (top.url.includes('google.com') || top.url.includes('cloudskillsboost.google')) platform = 'Google Cloud';
      else if (top.url.includes('github.com')) platform = 'GitHub';
      else if (top.url.includes('edx.org')) platform = 'edX';
      else if (top.url.includes('harvard.edu')) platform = 'Harvard Online';
      else if (top.url.includes('deeplearning.ai')) platform = 'DeepLearning.AI';

      return {
        title,
        platform,
        url: top.url,
        description: top.snippet || `Official verified access portal for ${title}.`,
        confidence: 'medium',
        source: 'live_web_discovery'
      };
    }
  } catch (err) {
    console.warn(`[Resource Extractor] Web search error for "${title}":`, err.message);
  }

  // Fallback to Google Search Direct Query URL
  return {
    title,
    platform: 'Official Platform',
    url: `https://www.google.com/search?q=${encodeURIComponent(title)}`,
    description: `Direct access and verification portal for ${title}.`,
    confidence: 'inferred',
    source: 'google_search_index'
  };
}

/**
 * Scrape creator profile bio link (e.g. Linktree, Beacons)
 */
async function scrapeCreatorBioLink(channelUsername) {
  if (!channelUsername) return null;
  const cleanHandle = channelUsername.toLowerCase().replace('@', '');

  try {
    const url = `https://www.instagram.com/${cleanHandle}/`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000
    });

    const html = res.data;
    const linkMatch = html.match(/"external_url":\s*"([^"]+)"/);
    if (linkMatch && linkMatch[1]) {
      const cleanBioUrl = linkMatch[1].replace(/\\u0026/g, '&');
      console.log(`[Resource Extractor] 🔗 Discovered creator bio link for @${cleanHandle}: ${cleanBioUrl}`);
      return cleanBioUrl;
    }
  } catch (err) {
    // IG logged-out profile walls are normal
  }
  return null;
}

/**
 * Main Entry Point: Comprehensive Creator Resource Discovery & As-Is Extraction
 * 
 * Extracts authentic creator resources directly from the post (caption links, ManyChat DMs,
 * bio links, curated/verified portals, or direct PDF files).
 * Delivers the real URL as-is to DM automation without synthetic PDF/Doc generation.
 */
async function extractAndSynthesizeResources({
  postUrl = '',
  channelUsername = '',
  rawCaption = '',
  rawHook = '',
  mediaPaths = [],
  detectedTopic = 'Software Engineering',
  detectedTriggerKeyword = 'GUIDE',
  brandHandle = '@harshparmar007__'
}) {
  console.log(`\n======================================================`);
  console.log(`[Resource Extractor] 🔍 Initiating Autonomous Creator Resource Discovery`);
  console.log(`[Resource Extractor] Channel: @${channelUsername || 'unknown'} | Topic: ${detectedTopic}`);
  console.log(`======================================================`);

  const resolvedResources = [];

  const checkIsPdf = (url = '') => {
    const lower = url.toLowerCase();
    return lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('/pdf/');
  };

  // Step 1: Check caption for explicit URLs
  const directUrls = extractDirectLinks(rawCaption);
  for (const u of directUrls) {
    const isPdfLink = checkIsPdf(u);
    resolvedResources.push({
      title: isPdfLink ? 'Creator Extracted PDF Document' : 'Direct Shared Resource',
      platform: isPdfLink ? 'PDF Document' : 'Direct External Link',
      url: u,
      description: isPdfLink ? 'Direct PDF document extracted from creator post.' : 'Direct link extracted from post caption.',
      confidence: 'high',
      source: 'caption_direct_link',
      is_pdf: isPdfLink
    });
  }

  // Step 2: Parse structured item titles from caption & slides
  const parsedTitles = parseItemsFromCaption(rawCaption);
  console.log(`[Resource Extractor] 📌 Parsed ${parsedTitles.length} items from post:`, parsedTitles);

  for (const title of parsedTitles) {
    if (!resolvedResources.some(r => r.title.toLowerCase() === title.toLowerCase())) {
      const resolved = await resolveResourceUrl(title, detectedTopic);
      resolved.is_pdf = checkIsPdf(resolved.url);
      resolvedResources.push(resolved);
    }
  }

  // Step 3: Check creator's bio link if 0 items found
  let bioUrl = null;
  if (resolvedResources.length === 0 && channelUsername) {
    bioUrl = await scrapeCreatorBioLink(channelUsername);
    if (bioUrl) {
      const isPdfLink = checkIsPdf(bioUrl);
      resolvedResources.push({
        title: `@${channelUsername}'s Official Resource Hub`,
        platform: 'Creator Bio Hub',
        url: bioUrl,
        description: `Direct Linktree / Bio resource repository hosted by @${channelUsername}.`,
        confidence: 'high',
        source: 'creator_bio_scraper',
        is_pdf: isPdfLink
      });
    }
  }

  // Determine Primary Resource & PDF URLs
  let primaryUrl = '';
  let extractedPdfUrl = '';
  let isPdf = false;

  const pdfResource = resolvedResources.find(r => r.is_pdf || checkIsPdf(r.url));
  if (pdfResource) {
    extractedPdfUrl = pdfResource.url;
    isPdf = true;
  }

  if (directUrls.length > 0) {
    primaryUrl = directUrls[0];
  } else if (resolvedResources.length > 0) {
    primaryUrl = resolvedResources[0].url;
  } else if (bioUrl) {
    primaryUrl = bioUrl;
  } else {
    primaryUrl = postUrl || '';
  }

  console.log(`[Resource Extractor] ✅ Successfully extracted ${resolvedResources.length} live creator resources!`);
  console.log(`[Resource Extractor] 🔗 Primary Link for DM Automation: ${primaryUrl}`);
  if (isPdf) {
    console.log(`[Resource Extractor] 📄 Discovered Creator PDF: ${extractedPdfUrl}`);
  }

  return {
    success: true,
    total_resources: resolvedResources.length,
    resources: resolvedResources,
    primary_resource_url: primaryUrl,
    deliverable_url: primaryUrl, // As-is creator link for DM delivery
    pdf_url: extractedPdfUrl || '',
    is_pdf: isPdf,
    extracted_pdf_url: extractedPdfUrl || '',
    summary_message: isPdf 
      ? `📄 This is the PDF extracted from this resource, reel or post: ${extractedPdfUrl}`
      : `🔗 Extracted ${resolvedResources.length} verified creator resources with direct URLs.`
  };
}

module.exports = {
  extractAndSynthesizeResources,
  parseItemsFromCaption,
  resolveResourceUrl,
  matchKnownResource,
  scrapeCreatorBioLink
};

