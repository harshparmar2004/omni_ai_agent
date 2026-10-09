const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { extractAndSynthesizeResources, scrapeCreatorBioLink } = require('./instagramResourceExtractor');

/**
 * OmniResearch v4.5 — Autonomous Inbound ManyChat Link Hunter Engine
 * 
 * 1. Extracts Call-To-Action trigger keyword from caption (e.g. "FREE", "GOOGLE", "PROJECT").
 * 2. Leaves a comment on the target creator's post via Instagram worker.
 * 3. Actively polls DM inbox (heartbeat every 3s, timeout 35s) for the creator's ManyChat bot auto-reply.
 * 4. Intercepts incoming DM, extracts Notion/Drive/Bitly links, and unshortens to canonical destination.
 * 5. Injects the harvested asset link into our staged post and InstaAuto comment-to-DM bridge.
 * 6. Multi-tier self-healing fallback ensures the pipeline never fails even if creator bot is down.
 */

const MICROSERVICE_URL = 'http://localhost:8001';

/**
 * High-precision regex to extract whatever keyword the creator told users to comment
 * (e.g. Comment "FREE", Comment “PROJECT”, Drop "LINK", Reply with "AI")
 */
function extractTriggerKeywordFromCaption(caption = '', hook = '') {
  const text = `${hook || ''} ${caption || ''}`;

  // 1. Quoted / Bracketed keyword after Comment / Drop / Reply / Type / Send / DM / Message
  // Matches: Comment "FREE", Comment ‘PROJECT’, Drop “LINK”, Type [CODE], DM (GUIDE), Comment the word "AGENT"
  const quotedRegex = /(?:comment|drop|reply|type|send|dm|message)\s+(?:me\s+)?(?:below\s+with\s+|with\s+|the\s+word\s+)?["“'«\[\(]([A-Za-z0-9_-]{2,20})["”'»\]\)]/i;
  const matchQuoted = text.match(quotedRegex);
  if (matchQuoted) return matchQuoted[1].toUpperCase().trim();

  // 2. Colon / dash syntax: Comment: "PROJECT", Drop - CODE, Comment below: LINK
  const colonRegex = /(?:comment|drop|reply|type|send|dm|message)\s*(?:below|down)?\s*[:\-]\s*["“'«]?([A-Za-z0-9_-]{2,20})["”'»]?/i;
  const matchColon = text.match(colonRegex);
  if (matchColon && !/^(the|a|an|here|link|this|below|down)$/i.test(matchColon[1])) {
    return matchColon[1].toUpperCase().trim();
  }

  // 3. "the word [KEYWORD]" without quotes: Comment the word PROJECT, Type the word CODE
  const theWordRegex = /(?:comment|drop|reply|type|send|dm)\s+(?:me\s+)?(?:the\s+word\s+)([A-Za-z0-9_-]{2,20})/i;
  const matchTheWord = text.match(theWordRegex);
  if (matchTheWord && !/^(the|a|an|below|down)$/i.test(matchTheWord[1])) {
    return matchTheWord[1].toUpperCase().trim();
  }

  // 4. Unquoted uppercase keyword after Comment / Drop / Reply / Type / Send / DM
  // e.g. Comment PROJECT below, Drop CODE to get, Type AGENT for link
  const unquotedRegex = /(?:comment|drop|reply|type|send|dm)\s+([A-Z0-9_-]{3,15})\s+(?:below|down|to|and|for|in|on|here)/i;
  const matchUnquoted = text.match(unquotedRegex);
  if (matchUnquoted && !/^(BELOW|DOWN|AND|FOR|HERE|LINK|THIS|YOUR|SOME|MORE)$/i.test(matchUnquoted[1])) {
    return matchUnquoted[1].toUpperCase().trim();
  }

  // 5. Fallback explicit common trigger patterns
  const common = [
    'FREE', 'LINK', 'GUIDE', 'PROJECT', 'ROADMAP', 'CODE', 'PROMPT', 'AI', 'PYTHON',
    'GOOGLE', 'PLAYBOOK', 'NOTES', 'CHEATSHEET', 'RESOURCES', 'CERTIFICATE', 'BOT',
    'AGENT', 'TOOL', 'TEMPLATE', 'DATA', 'REPO', 'API', 'SYSTEM', 'BOOK'
  ];
  for (const kw of common) {
    const r = new RegExp(`\\b(?:comment|drop|reply|type|send|dm)\\s+(?:the\\s+word\\s+)?["“'«]?${kw}["”'»]?\\b`, 'i');
    if (r.test(text)) return kw;
  }

  // No DM automation trigger found
  return null;
}

/**
 * Detects whether post requires DM automation or is a direct viral repost
 */
function detectPostIntent(caption = '', hook = '') {
  const keyword = extractTriggerKeywordFromCaption(caption, hook);
  if (keyword) {
    return {
      intent: 'lead_magnet',
      keyword
    };
  }
  return {
    intent: 'direct_repost',
    keyword: ''
  };
}

/**
 * Extracts links and URLs from text
 */
function extractLinksFromText(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(u => u.replace(/[.,;!?)]+$/, ''));
}

/**
 * Unshorten URLs (follows HTTP 301/302 redirects to find true Notion/Drive/GitHub destination)
 */
async function unshortenUrl(shortUrl, maxRedirects = 5) {
  if (!shortUrl) return shortUrl;
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects,
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: status => status >= 200 && status < 400
    });
    const finalUrl = res.request?.res?.responseUrl || res.config?.url || shortUrl;
    return finalUrl;
  } catch (err) {
    try {
      let currentUrl = shortUrl;
      for (let i = 0; i < maxRedirects; i++) {
        const headRes = await axios.head(currentUrl, {
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400,
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (headRes.headers && headRes.headers.location) {
          currentUrl = new URL(headRes.headers.location, currentUrl).href;
        } else {
          break;
        }
      }
      return currentUrl;
    } catch (headErr) {
      return shortUrl;
    }
  }
}

/**
 * Categorize lead magnet type based on URL
 */
function detectDeliverableType(url) {
  if (!url) return 'web';
  const low = url.toLowerCase();
  if (low.includes('.pdf') || low.includes('/pdf')) return 'pdf';
  if (low.includes('notion.site') || low.includes('notion.so')) return 'notion';
  if (low.includes('github.com')) return 'github';
  if (low.includes('drive.google.com') || low.includes('docs.google.com')) return 'drive';
  if (low.includes('dropbox.com')) return 'dropbox';
  if (low.includes('bit.ly') || low.includes('tinyurl')) return 'shortlink';
  return 'guide';
}

/**
 * Attempt to trigger competitor DM automation by commenting the trigger keyword
 */
async function postCommentTrigger(postUrl, triggerKeyword) {
  if (!postUrl || !triggerKeyword) return { success: false, reason: 'Missing URL or keyword' };

  try {
    console.log(`[ManyChat Hunter] 💬 Posting comment "${triggerKeyword}" on ${postUrl}...`);
    const res = await axios.post(`${MICROSERVICE_URL}/media/comment`, {
      media_url: postUrl,
      text: triggerKeyword.trim()
    }, { timeout: 20000 });

    return {
      success: true,
      commentPk: res.data.comment_pk,
      message: res.data.message
    };
  } catch (err) {
    const errMsg = err.response?.data?.detail || err.message;
    console.warn(`[ManyChat Hunter] Comment trigger notice: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

/**
 * Actively polls DM threads for incoming automated ManyChat message from the creator
 * Heartbeat every 3 seconds for up to timeoutMs (default: 35s)
 */
async function pollCreatorDmResponse(creatorUsername, triggerKeyword, timeoutMs = 35000) {
  if (!creatorUsername) return null;
  const cleanUsername = creatorUsername.toLowerCase().replace('@', '');
  const startTime = Date.now();

  console.log(`[ManyChat Hunter] 👂 Listening for inbound DM from @${cleanUsername} (timeout: ${timeoutMs / 1000}s)...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await axios.get(`${MICROSERVICE_URL}/direct/threads?amount=10`, { timeout: 8000 });
      const threads = res.data?.threads || [];

      for (const thread of threads) {
        const matchUser = (thread.users || []).some(u => u.toLowerCase() === cleanUsername);
        const matchTitle = thread.thread_title?.toLowerCase().includes(cleanUsername);

        if (matchUser || matchTitle) {
          // Inspect recent messages from this creator
          for (const msg of (thread.messages || [])) {
            // Check plain text
            const links = extractLinksFromText(msg.text);
            if (links.length > 0) {
              const rawUrl = links[0];
              const canonical = await unshortenUrl(rawUrl);
              console.log(`[ManyChat Hunter] 🎯 Captured inbound asset link from @${cleanUsername}: ${canonical}`);
              return {
                url: canonical,
                rawUrl,
                rawMessage: msg.text,
                type: detectDeliverableType(canonical),
                harvestMethod: 'manychat_dm'
              };
            }
          }
        }
      }
    } catch (err) {
      // Continue polling until timeout
    }

    // Wait 3.0 seconds before next poll
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[ManyChat Hunter] ⌛ Polling window ended. No automated DM received within ${timeoutMs / 1000}s.`);
  return null;
}

/**
 * Main execution flow: analyzes post, triggers DM automation, captures asset link,
 * and falls back to bio scraping & AI synthesis
 */
async function harvestLeadMagnet(postData) {
  const {
    source_post_url = '',
    channel_username = '',
    raw_caption = '',
    raw_hook = '',
    repurposed_hook = '',
    detected_topic = 'Software Engineering',
    shortcode = 'lead_magnet',
    brand_handle = '@harshparmar007__'
  } = postData;

  let deliverableUrl = '';
  let deliverableType = 'guide';
  let commentPosted = false;
  let dmReceived = false;
  let harvestMethod = 'ai_synthesis';
  let rawDmText = '';
  let extractedResources = [];
  let pdfUrl = '';

  // 1. Detect the exact CTA trigger keyword (e.g. "FREE", "GOOGLE", "PROJECT")
  const triggerKeyword = extractTriggerKeywordFromCaption(raw_caption, raw_hook || postData.detected_trigger_keyword);

  // 2. Check if link is already explicitly in caption
  const captionLinks = extractLinksFromText(raw_caption).filter(l => !l.includes('instagram.com') && !l.includes('facebook.com'));
  if (captionLinks.length > 0) {
    deliverableUrl = await unshortenUrl(captionLinks[0]);
    deliverableType = detectDeliverableType(deliverableUrl);
    harvestMethod = 'caption_direct';
  }

  // 3. TIER 1: Dedicated Scout Account Comment & Inbound DM Intercept
  if (!deliverableUrl && source_post_url && triggerKeyword) {
    try {
      const { executeScoutHarvestCycle } = require('./instagramScoutWorker');
      const scoutHarvest = await executeScoutHarvestCycle({
        postUrl: source_post_url,
        triggerKeyword,
        creatorUsername: channel_username,
        niche: postData.niche || 'all'
      });

      if (scoutHarvest && scoutHarvest.success && scoutHarvest.url) {
        deliverableUrl = scoutHarvest.url;
        deliverableType = scoutHarvest.deliverableType || detectDeliverableType(scoutHarvest.url);
        commentPosted = true;
        dmReceived = true;
        harvestMethod = 'scout_dm';
        rawDmText = scoutHarvest.rawMessage || '';
      }
    } catch (scoutErr) {
      console.warn(`[DM Harvester] Scout cycle notice: ${scoutErr.message}`);
    }

    // Secondary Tier 1 Fallback: Local microservice (:8001) if scout didn't capture
    if (!deliverableUrl) {
      const commentRes = await postCommentTrigger(source_post_url, triggerKeyword);
      commentPosted = commentRes.success;

      if (commentPosted) {
        const dmRes = await pollCreatorDmResponse(channel_username, triggerKeyword, 35000);
        if (dmRes && dmRes.url) {
          deliverableUrl = dmRes.url;
          deliverableType = dmRes.type;
          dmReceived = true;
          harvestMethod = 'creator_dm';
          rawDmText = dmRes.rawMessage;
        }
      }
    }
  }

  // 4. TIER 2: Creator Bio & Linktree Deep Scraper Fallback
  if (!deliverableUrl && channel_username) {
    try {
      const bioUrl = await scrapeCreatorBioLink(channel_username);
      if (bioUrl) {
        deliverableUrl = await unshortenUrl(bioUrl);
        deliverableType = detectDeliverableType(deliverableUrl);
        harvestMethod = 'creator_bio';
      }
    } catch (bioErr) {
      console.warn(`[DM Harvester] Bio scrape notice: ${bioErr.message}`);
    }
  }

  // 5. TIER 3: Autonomous AI Resource Extractor & Link Synthesizer
  // Ensures all individual course/project links are verified and master guide is ready
  try {
    const synRes = await extractAndSynthesizeResources({
      postUrl: source_post_url,
      channelUsername: channel_username,
      rawCaption: raw_caption,
      rawHook: raw_hook || repurposed_hook || '',
      detectedTopic: detected_topic,
      detectedTriggerKeyword: triggerKeyword,
      brandHandle: brand_handle
    });

    if (synRes && synRes.success) {
      extractedResources = synRes.resources || [];
      pdfUrl = synRes.pdf_url;

      // If ManyChat DM was not captured, use the authentic extracted creator resource link
      if (!deliverableUrl) {
        deliverableUrl = synRes.primary_resource_url || synRes.deliverable_url;
        deliverableType = synRes.is_pdf ? 'pdf' : 'resource_link';
        harvestMethod = 'creator_resource_extraction';
      }
      if (!pdfUrl && synRes.pdf_url) {
        pdfUrl = synRes.pdf_url;
      }
    }
  } catch (synErr) {
    console.warn(`[DM Harvester] Link extraction notice: ${synErr.message}`);
  }

  // 6. Ultimate Safety Net: fallback to authentic creator source post URL (never a synthetic PDF)
  if (!deliverableUrl) {
    deliverableUrl = source_post_url || '';
    deliverableType = 'source_post';
  }

  const isPdfDeliverable = Boolean(pdfUrl || deliverableUrl.toLowerCase().endsWith('.pdf') || deliverableUrl.toLowerCase().includes('.pdf?'));

  return {
    success: true,
    harvested_deliverable_url: deliverableUrl,
    harvested_deliverable_type: isPdfDeliverable ? 'pdf' : deliverableType,
    pdf_url: pdfUrl || (isPdfDeliverable ? deliverableUrl : ''),
    extracted_resources: extractedResources,
    detected_trigger_keyword: triggerKeyword,
    dm_comment_posted: commentPosted,
    dm_response_received: dmReceived,
    dm_harvest_method: harvestMethod,
    raw_dm_text: rawDmText,
    message: dmReceived 
      ? `🎯 Successfully intercepted ManyChat DM link: ${deliverableUrl}`
      : (isPdfDeliverable 
          ? `📄 Armed with extracted creator PDF: ${deliverableUrl}`
          : `🔗 Armed with authentic creator resource: ${deliverableUrl} (${extractedResources.length} resources)`)
  };
}

module.exports = {
  harvestLeadMagnet,
  extractLinksFromText,
  extractTriggerKeywordFromCaption,
  detectPostIntent,
  unshortenUrl,
  detectDeliverableType,
  postCommentTrigger,
  pollCreatorDmResponse
};
