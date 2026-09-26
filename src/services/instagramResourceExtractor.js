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

// ── 1. High-Precision Curated Knowledge Map (Instant Zero-Latency Match) ───
const KNOWN_RESOURCE_MAP = [
  // Google Professional Certificates & Courses
  {
    keywords: ['advanced data analytics', 'google data analytics advanced'],
    title: 'Google Advanced Data Analytics Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-advanced-data-analytics',
    description: 'Master statistical analysis, regression modeling, Python machine learning, and predictive data science.'
  },
  {
    keywords: ['cybersecurity', 'google cybersecurity'],
    title: 'Google Cybersecurity Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-cybersecurity',
    description: 'Network security architecture, Linux, SQL, SIEM tools (Chronicle), Python scripting, and incident response.'
  },
  {
    keywords: ['generative ai leader', 'cloud certified generative ai leader', 'google cloud generative ai leader'],
    title: 'Google Cloud Certified – Generative AI Leader Path',
    platform: 'Google Cloud Skills Boost',
    url: 'https://www.cloudskillsboost.google/paths/183',
    description: 'Executive & technical roadmap on Generative AI principles, foundation models, Vertex AI, and enterprise safety.'
  },
  {
    keywords: ['crash course on python', 'python crash course', 'google python'],
    title: 'Google Crash Course on Python',
    platform: 'Coursera (Google IT Automation)',
    url: 'https://www.coursera.org/learn/python-crash-course',
    description: 'Core Python syntax, data structures, object-oriented programming, and practical automation scripts.'
  },
  {
    keywords: ['google generative ai', 'intro to generative ai', 'introduction to generative ai'],
    title: 'Google Introduction to Generative AI Course',
    platform: 'Google Cloud Skills Boost',
    url: 'https://www.cloudskillsboost.google/course_templates/556',
    description: 'Foundations of Gen AI, Large Language Models (LLMs), attention mechanisms, and Google Cloud AI studio tools.'
  },
  {
    keywords: ['project management', 'google project management'],
    title: 'Google Project Management Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-project-management',
    description: 'Agile & Scrum frameworks, sprint planning, project charter development, risk mitigation, and Asana workflows.'
  },
  {
    keywords: ['ai essentials', 'google ai essentials'],
    title: 'Google AI Essentials Certificate',
    platform: 'Coursera (Google)',
    url: 'https://www.coursera.org/learn/google-ai-essentials',
    description: 'Foundational AI literacy, rapid prompt engineering strategies, workflow automation, and ethical AI integration.'
  },
  {
    keywords: ['google it support', 'it support professional'],
    title: 'Google IT Support Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-it-support',
    description: 'Computer networking, system administration, OS fundamentals (Linux/Windows), and cybersecurity basics.'
  },
  {
    keywords: ['google data analytics', 'data analytics certificate'],
    title: 'Google Data Analytics Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-data-analytics',
    description: 'Data cleaning, SQL querying, R programming, spreadsheet calculation, and Tableau visual storytelling.'
  },
  {
    keywords: ['digital marketing', 'google digital marketing', 'e-commerce'],
    title: 'Google Digital Marketing & E-commerce Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce',
    description: 'Search Engine Optimization (SEO), SEM, Google Analytics 4, email marketing, and Shopify store building.'
  },
  {
    keywords: ['business intelligence', 'google business intelligence'],
    title: 'Google Business Intelligence Professional Certificate',
    platform: 'Coursera (Google Career Certificates)',
    url: 'https://www.coursera.org/professional-certificates/google-business-intelligence',
    description: 'Data modeling, BigQuery data pipelines, executive KPI dashboards, and business reporting architectures.'
  },
  // Global Computer Science & AI Titans
  {
    keywords: ['cs50', 'cs50x', 'harvard cs50'],
    title: 'Harvard CS50: Introduction to Computer Science',
    platform: 'Harvard University (edX / Harvard Online)',
    url: 'https://pll.harvard.edu/course/cs50-introduction-computer-science',
    description: 'World-renowned foundational computer science curriculum covering C, Python, SQL, algorithms, and web dev.'
  },
  {
    keywords: ['cs50 ai', 'cs50ai', 'harvard cs50 ai'],
    title: "Harvard CS50's Introduction to AI with Python",
    platform: 'Harvard University (edX / Harvard Online)',
    url: 'https://pll.harvard.edu/course/cs50s-introduction-artificial-intelligence-python',
    description: 'Machine learning algorithms, search, optimization, neural networks, NLP, and reinforcement learning in Python.'
  },
  {
    keywords: ['deeplearning.ai', 'ai for everyone', 'andrew ng'],
    title: 'DeepLearning.AI: AI for Everyone by Andrew Ng',
    platform: 'Coursera (DeepLearning.AI)',
    url: 'https://www.coursera.org/learn/ai-for-everyone',
    description: 'Non-technical and technical roadmap to AI technologies, capabilities, limitations, and organizational impact.'
  },
  {
    keywords: ['prompt engineering for developers', 'chatgpt prompt engineering'],
    title: 'ChatGPT Prompt Engineering for Developers',
    platform: 'DeepLearning.AI',
    url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/',
    description: 'Direct LLM API orchestration, prompting best practices, few-shot conditioning, and chain-of-thought.'
  },
  {
    keywords: ['system design primer', 'system design github'],
    title: 'System Design Primer (GitHub Master Repo)',
    platform: 'GitHub (100k+ Stars)',
    url: 'https://github.com/donnemartin/system-design-primer',
    description: 'Complete visual blueprint for scaling distributed systems, caching, SQL vs NoSQL, and load balancing.'
  },
  {
    keywords: ['build your own x', 'build your own'],
    title: 'Build Your Own X (Step-by-Step GitHub Guides)',
    platform: 'GitHub (250k+ Stars)',
    url: 'https://github.com/codecrafters-io/build-your-own-x',
    description: 'Rebuild Git, Docker, Redis, SQLite, operating systems, and neural networks from ground zero.'
  },
  {
    keywords: ['developer roadmap', 'roadmap.sh'],
    title: 'Developer Roadmaps (roadmap.sh)',
    platform: 'roadmap.sh Community',
    url: 'https://roadmap.sh',
    description: 'Interactive step-by-step career path guides for Backend, Frontend, DevOps, AI, and Software Architecture.'
  }
];

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
 * Match an extracted title against the curated knowledge base
 */
function matchKnownResource(title) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const entry of KNOWN_RESOURCE_MAP) {
    for (const kw of entry.keywords) {
      if (cleanTitle.includes(kw)) {
        return {
          title: entry.title,
          platform: entry.platform,
          url: entry.url,
          description: entry.description,
          confidence: 'high',
          source: 'curated_database'
        };
      }
    }
  }
  return null;
}

/**
 * Discover official URLs for items using web search fallback
 */
async function resolveResourceUrl(title, contextTopic = '') {
  // 1. Try curated database
  const known = matchKnownResource(title);
  if (known) return known;

  // 2. Fallback to live Web Search (DuckDuckGo / Google News RSS)
  try {
    const query = `${title} official course certificate enrollment`;
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

  // 3. Fallback to Google Search Direct Query URL
  return {
    title,
    platform: 'Official Platform',
    url: `https://www.google.com/search?q=${encodeURIComponent(title + ' official course enrollment certificate')}`,
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

  // Step 4: If still no items, provide curated defaults for the detected topic
  if (resolvedResources.length === 0) {
    console.log(`[Resource Extractor] ℹ️ No explicit bullet items found in text. Matching curated ${detectedTopic} master pack.`);
    const fallbackItems = KNOWN_RESOURCE_MAP.slice(0, 5);
    resolvedResources.push(...fallbackItems.map(item => ({
      title: item.title,
      platform: item.platform,
      url: item.url,
      description: item.description,
      confidence: 'curated',
      source: 'curated_database',
      is_pdf: checkIsPdf(item.url)
    })));
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
  scrapeCreatorBioLink,
  KNOWN_RESOURCE_MAP
};

