const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const { getSetting } = require('../database');

/**
 * Resolves relative, absolute, or public-relative media paths safely across platforms
 */
function resolveLocalMediaPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return '';
  if (fs.existsSync(inputPath)) return inputPath;
  const cleanRel = inputPath.replace(/^[/\\]+/, '');
  const candidate1 = path.join(__dirname, '..', '..', 'public', cleanRel);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.join(process.cwd(), 'public', cleanRel);
  if (fs.existsSync(candidate2)) return candidate2;
  const candidate3 = path.join(process.cwd(), cleanRel);
  if (fs.existsSync(candidate3)) return candidate3;
  return inputPath;
}

/**
 * Extracts a high-quality snapshot frame from a video file using FFmpeg
 * @param {string} videoPath - Absolute or relative path to the video file
 * @param {Object} options
 * @param {string} [options.timestamp='00:00:01.200'] - Timestamp to extract (1.2s avoids black fade-in)
 * @returns {Promise<string>} Path to the extracted frame JPEG
 */
function extractSnapshotFrame(videoPath, options = {}) {
  const resolvedPath = resolveLocalMediaPath(videoPath);
  return new Promise((resolve, reject) => {
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return reject(new Error(`Video file does not exist: ${videoPath}`));
    }

    const timestamp = options.timestamp || '00:00:01.200';
    const tmpDir = path.join(os.tmpdir(), 'omnistudio_frames');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const outPath = path.join(tmpDir, `frame_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);

    const args = [
      '-ss', timestamp,
      '-i', resolvedPath,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outPath
    ];

    const proc = spawn('ffmpeg', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        return resolve(outPath);
      }
      // Fallback: try frame 0 if timestamp seek failed
      const fallbackArgs = [
        '-i', resolvedPath,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outPath
      ];
      const fallbackProc = spawn('ffmpeg', fallbackArgs);
      fallbackProc.on('close', (fbCode) => {
        if (fbCode === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
          return resolve(outPath);
        }
        reject(new Error(`Failed to extract video frame with FFmpeg: ${stderr.slice(-300)}`));
      });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Calls Gemini Vision API with an image frame to detect and extract on-screen headlines
 */
async function callGeminiVision(imagePath, apiKey) {
  const model = getSetting('gemini_vision_model', 'gemini-1.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');

  const prompt = `Analyze this video frame from a social media reel (1080x1920 layout).
1. "headline": Check if there is an on-screen title, headline, or hook text displayed on the screen (such as at the top, center, or above the video content).
CRITICAL RULES FOR HEADLINE:
- Transcribe 100% of that EXACT editorial title or hook text VERBATIM (e.g. "AI Just Designed A Real Rocket Engine From Scratch With Zero Human Engineers").
- Do NOT omit any starting words (e.g. "Why", "How", "The", "Inside", "AI"), do NOT shorten, and do NOT truncate.
- STRICTLY EXCLUDE social media account names, profile handles (e.g. "@theaifocus", "@evolving.ai"), creator usernames, verification badges, or channel logos.
- If you see a channel name/logo at the top (such as "Theaifocus" or "@theaifocus") and an editorial headline below it, COMPLETELY IGNORE the channel name/logo, and transcribe ONLY the editorial headline below it!
- If there is NO on-screen text, write an ultra-catchy 8-16 word viral hook based on what is happening in the video.
2. "rawTitle": The complete unformatted verbatim headline with zero asterisks.
3. Identify 2 to 6 of the most impactful keywords, numbers, or amounts in the headline (~35-40% of words). Wrap those impactful words in double asterisks **like this** for brand color highlighting (e.g. "These **Robotic Arms** Are Powered By **Algae**. Watch How They **Move**").
4. "topicBreakdown": Write a concise, 2-sentence high-energy explanation of this topic for an Instagram caption post body.
5. "hasCompetitorHeader": Is there existing text, title, or account branding in the top area (above the video)? (true/false)

Respond ONLY with valid JSON in this exact structure:
{"hasTitle": true, "headline": "...", "rawTitle": "...", "topicBreakdown": "...", "hasCompetitorHeader": true}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      maxOutputTokens: 400
    }
  };

  const res = await axios.post(url, requestBody, { timeout: 20000 });
  const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini Vision');

  const parsed = JSON.parse(rawText.match(/\{[\s\S]*\}/)?.[0] || '{}');
  return parsed;
}

/**
 * Calls OpenAI Vision API with an image frame as fallback
 */
async function callOpenAiVision(imagePath, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');

  const prompt = `Analyze this video frame from a social media reel.
1. Check if there is an on-screen hook title or headline text displayed on the screen.
CRITICAL RULES FOR HEADLINE:
- Transcribe 100% of the COMPLETE on-screen headline VERBATIM (e.g. "AI Just Designed A Real Rocket Engine From Scratch With Zero Human Engineers").
- Do NOT omit any starting words (e.g. "Why", "How", "The", "AI"), do NOT shorten, and do NOT truncate.
- STRICTLY EXCLUDE social media account names, profile handles (e.g. "@theaifocus", "@evolving.ai"), creator usernames, verification badges, or channel logos.
- If you see a channel name/logo at the top and an editorial headline below it, COMPLETELY IGNORE the channel name/logo, and transcribe ONLY the editorial headline below it!
2. Identify 2 to 5 impactful keywords, numbers, or amounts in the headline and wrap them in double asterisks **like this** for brand color highlighting.
3. "rawTitle": The complete unformatted verbatim headline without asterisks.
4. If no title is visible, set hasTitle to false.

Respond ONLY with valid JSON:
{"hasTitle": true, "headline": "...", "rawTitle": "..."}`;

  const res = await axios.post(
    url,
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Data}` }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 20000
    }
  );

  const rawText = res.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenAI Vision');
  return JSON.parse(rawText);
}

/**
 * Detects whether an extracted OCR string is a tabular spec sheet, pricing matrix,
 * or benchmark runtime log rather than an editorial headline hook.
 */
function isTabularOrSpecDebris(text) {
  if (!text) return true;
  const clean = text.replace(/[\*<>]+/g, '').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return true;

  // 1. Multiple currency markers (e.g. $81.10 ... $45.97)
  const currencyMatches = clean.match(/[\$€£¥]\s*\d/g) || [];
  if (currencyMatches.length >= 2) return true;

  // 2. Multiple duration/timestamp units (e.g. 1 hs 56m 52s ... 3 h 11m 26s)
  const durationMatches = clean.match(/\b(?:\d+\s*(?:hs?|hrs?|mins?|secs?|[hms])(?:\b|\d))\b/gi) || [];
  if (durationMatches.length >= 2) return true;

  // 3. High numeric/unit density: if > 35% of tokens are numbers, decimals, or units
  const numericTokens = tokens.filter(t => /^[\$€£¥]?\d+(?:[\.,]\d+)*(?:[%xXkKmMbBtT]|th|rd|st|nd|[hms])?$/i.test(t));
  if (numericTokens.length / tokens.length > 0.35) return true;

  // 4. Multiple version numbers (e.g. 5.2 ... 5.5) combined with model names
  const versionMatches = clean.match(/\b\d+\.\d+\b/g) || [];
  if (versionMatches.length >= 2 && numericTokens.length >= 3) return true;

  // 5. Benchmark or cost keywords combined with numbers
  if (/\b(?:benchmark|latency|throughput|pricing|runtime|cost per|tokens\/s)\b/i.test(clean) && numericTokens.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Checks whether an extracted token or line matches a known competitor account,
 * social media handle, channel username, or profile header branding.
 */
function isCompetitorAccountName(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/[@#]/g, '').trim().toLowerCase();
  const noSpaces = clean.replace(/[\s_.-]+/g, '');
  if (/^(theaifocus|aifocus|evolvingai|evolving|cultinformation|gta6updates|movieseries365|clubbingcult|nvidianewsroom)$/i.test(noSpaces)) return true;
  if (/^[a-z0-9_.-]{3,24}$/i.test(clean) && !/\s/.test(clean)) {
    // Single-word handle-like tokens (e.g. "theaifocus", "newsroom")
    if (/\b(focus|news|media|daily|updates?|tech|ai|studios?|hub|insider|channel|tv|official|tube|page|pulse|feed|bytes|wire)\b/i.test(clean)) return true;
  }
  if (/\b(the\s*ai\s*focus|theaifocus|evolving\s*ai|evolving\s+evolving|nvidianewsroom)\b/i.test(clean)) return true;
  if (clean.split(/\s+/).length <= 3 && /\b(newsroom|official\s+page|media\s+house|daily\s+updates?)\b/i.test(clean)) return true;
  return false;
}

/**
 * Intelligent social media card / reel headline parser.
 * Discards avatar logos, competitor display names, handle lines (@...),
 * verification badges, engagement counts, and random visual debris.
 * Isolates and returns genuine editorial headline hooks.
 */
function extractHeadlineBlocksFromOcr(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const rawLines = rawText.split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // 1. Identify handle lines (e.g. @evolving.ai, @theaifocus, @nvidianewsroom, (@ e ilale Nel)
  const isHandle = (l) => {
    return /^[@#][a-zA-Z0-9_.-]{2,}/i.test(l) ||
           /\b@[a-zA-Z0-9_.-]{2,}/i.test(l) ||
           /@\s*[a-zA-Z0-9_.-]{2,}/i.test(l) ||
           /^[({\[]?\s*@/i.test(l) ||
           /@$/.test(l) ||
           /\b@\b/.test(l);
  };

  // 2. Identify account display names or channel branding
  const isAccountDisplayName = (l) => {
    const cleanL = l.replace(/[©®™§|°~_—\-+=:;`^•*\\\/<{}>[\]‘«»()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (isCompetitorAccountName(cleanL)) return true;
    if (/\b(newsroom|official|media|daily|updates?|technologies|studios?|insider|channel|focus|digest|hub|tv|network|press)\b/i.test(cleanL) && cleanL.split(/\s+/).length <= 3) return true;
    if (/\b(theaifocus|aifocus|evolving\s+ai|evolving\s+evolving|evolution)\b/i.test(cleanL)) return true;
    if (/@\s*$/.test(l)) return true;
    return false;
  };

  // 3. Identify noise, symbols, timestamps, engagement counters, and audio markers
  const isJunkOrDivider = (l) => {
    if (l.length <= 2 && !/^(ai|to|in|on|at|by|no)$/i.test(l)) return true;
    if (/^[0-9:\s=D+&©@#_.\-—¢|¥«»§\\\/‘'"`^~*()]+$/.test(l)) return true;
    if (/^(am|pm|\d{1,2}:\d{2})$/i.test(l)) return true;
    if (/^(credit|source|via|edit|by)[\s:]/i.test(l)) return true;
    if (/^(follow|following|subscribe|repost|retweet|share|comment|save)$/i.test(l)) return true;
    if (/^\.[\s\-_—]+$/.test(l)) return true;
    if (/^[a-z]\.\s+[a-z]+$/i.test(l)) return true; // e.g. "k. Red"
    if (/^(audio|original sound|song|track)\b/i.test(l)) return true;
    if (/^(all\s+)?\d+\s+comments?$/i.test(l)) return true;
    return false;
  };

  // 4. Drop account header blocks and avatar debris
  const dropIndices = new Set();
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (isHandle(line) || isCompetitorAccountName(line)) {
      dropIndices.add(i);
      if (i > 0) {
        const prev = rawLines[i - 1];
        if (prev.split(/\s+/).length <= 4 || isAccountDisplayName(prev)) {
          dropIndices.add(i - 1);
        }
      }
      if (i > 1 && rawLines[i - 2].length <= 8) {
        dropIndices.add(i - 2); // avatar icon debris like '(CO) rain' or 'nen)'
      }
    } else if (isAccountDisplayName(line) && (i < 3 || isHandle(rawLines[i + 1] || ''))) {
      dropIndices.add(i);
    }
  }

  // 5. Clean remaining lines and remove border debris
  const cleanCandidates = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (dropIndices.has(i)) continue;
    if (isJunkOrDivider(rawLines[i])) continue;

    let text = rawLines[i]
      .replace(/[©®™§|°~_—\-+=:;`^•*\\\/<{}>[\]‘«»()]/g, ' ')
      .replace(/^.*?@\w+[\s:]*/i, '')
      .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Fix common OCR errors
    text = text
      .replace(/\bAl\b/g, 'AI')
      .replace(/\bAl's\b/g, "AI's")
      .replace(/\bRohotic\b/gi, 'Robotic')
      .replace(/\bpowered\s+hy\b/gi, 'powered by')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    if (text.length >= 4 && !isJunkOrDivider(text)) {
      cleanCandidates.push({ lineIndex: i, text });
    }
  }

  // 6. Group contiguous candidate lines into headline blocks
  const blocks = [];
  let currBlock = [];
  for (let i = 0; i < cleanCandidates.length; i++) {
    if (currBlock.length === 0) {
      currBlock.push(cleanCandidates[i]);
    } else {
      const prev = currBlock[currBlock.length - 1];
      if (cleanCandidates[i].lineIndex === prev.lineIndex + 1) {
        currBlock.push(cleanCandidates[i]);
      } else {
        blocks.push(currBlock.map(c => c.text).join(' '));
        currBlock = [cleanCandidates[i]];
      }
    }
  }
  if (currBlock.length > 0) {
    blocks.push(currBlock.map(c => c.text).join(' '));
  }

  return blocks;
}

/**
 * Local offline OCR fallback using Tesseract.js & canvas cropping
 * Requires zero API keys and runs 100% locally.
 */
async function localOcrHeadlineDetection(framePath, options = {}) {
  try {
    const Tesseract = require('tesseract.js');
    const { createCanvas, loadImage } = require('@napi-rs/canvas');

    const resolved = resolveLocalMediaPath(framePath);
    const img = await loadImage(resolved);
    // If the input is already an isolated headline ROI (from OpenCV or options), do not crop
    const isAlreadyRoi = Boolean(options.isRoi) || (img.height <= 800 && img.width >= img.height);
    const cropH = isAlreadyRoi ? img.height : Math.floor(img.height * 0.85);
    const canvas = createCanvas(img.width, cropH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, cropH, 0, 0, img.width, cropH);

    const res = await Tesseract.recognize(canvas.toBuffer('image/png'), 'eng');
    const rawOcrText = res.data?.text || '';

    // Extract genuine editorial headline blocks while stripping logos, competitor handles, and account headers
    const blocks = extractHeadlineBlocksFromOcr(rawOcrText);
    if (!blocks || blocks.length === 0) return null;

    // Score all candidate blocks to prioritize genuine editorial headlines over short brand names
    const scoredBlocks = blocks.map(b => {
      const cleanB = b.replace(/[\*<>]+/g, '').trim();
      const wc = cleanB.split(/\s+/).length;
      if (isTabularOrSpecDebris(cleanB)) return { text: cleanB, score: -100 };
      if (/^[\d\s.,\-+]+$/.test(cleanB) || /^(?:all\s+)?\d+\s+comments?$/i.test(cleanB)) return { text: cleanB, score: -100 };
      if (isCompetitorAccountName(cleanB)) return { text: cleanB, score: -100 };
      if (wc < 3 && cleanB.length < 15) return { text: cleanB, score: -50 };

      let score = 0;
      // Substantial headline length sweet-spot: 6 to 24 words
      if (wc >= 6 && wc <= 24) score += 50;
      else if (wc >= 4 && wc <= 30) score += 25;

      // Verb presence strongly indicates an informative headline sentence
      if (/\b(designed|built|created|returns|returned|discovered|unveils|unveiled|reveals|revealed|exposed|shows|warning|is|are|was|were|has|have|can|could|will|would|breaks|leaves|fired|tested|powered|explains|facing|secret|classified|truth|anomaly|engineered)\b/i.test(cleanB)) {
        score += 35;
      }

      // Numbers or metrics (common in viral hooks)
      if (/\b(?:\$?\d[\d,\.]*|zero|first|billion|million|hundred)\b/i.test(cleanB)) {
        score += 15;
      }

      // Penalize isolated single words or words looking like channel names
      if (/^[a-zA-Z0-9]+$/i.test(cleanB) || /\b(focus|newsroom|media|daily|updates|studios|channel|hub|insider|tv)\b/i.test(cleanB)) {
        score -= 40;
      }

      return { text: cleanB, score };
    });

    scoredBlocks.sort((a, b) => b.score - a.score);
    const bestCandidate = scoredBlocks.find(s => s.score > 0);
    if (!bestCandidate) return null;
    let title = bestCandidate.text;
    const wordCount = title.split(/\s+/).length;

    // Dynamic brand highlighting: proportion ~35-40% of words in Cult Electric Lime (#CCFF00)
    const targetHighlights = Math.max(2, Math.min(6, Math.round(wordCount * 0.38)));
    let highlightedTitle = title;
    // Word-boundary safe number/unit highlighting: prevents matching inside glued alphanumeric tokens
    highlightedTitle = highlightedTitle.replace(/(?<=\s|^)(\$?\d[\d,\.]*(?:[%xXkKmMbBtT]|th|rd|st|nd)?|\b(?:billion|million|trillion|hundred)\b)(?=\s|[.,;:!?]|$)/gi, '**$1**');

    const viralPattern = /\b(Robotic Arms|Table Tennis|Human Pro|World's First|Living Thing|Deep Knowledge|Robotic|Robot|Robots|Algae|Neural|AI|Beat|Players|Human|Secret|Secrets|Exposed|Revealed|Shocking|Truth|Mystery|Impossible|Breakthrough|Classified|Banned|Billionaires|Overnight|Warning|Overheating|Supercluster|Underground|Ocean|Antarctic|Discovery|Discovered|Intelligence)\b/gi;

    const hlMatches = [...title.matchAll(viralPattern)];
    let appliedCount = (highlightedTitle.match(/\*\*[^*]+\*\*/g) || []).length;
    for (const m of hlMatches) {
      if (appliedCount >= targetHighlights) break;
      const term = m[0];
      if (!highlightedTitle.includes(`**${term}**`)) {
        highlightedTitle = highlightedTitle.replace(new RegExp(`\\b${term}\\b`, 'g'), `**${term}**`);
        appliedCount++;
      }
    }

    // If still fewer than targetHighlights, highlight top content words (>= 4 chars, non-stopwords)
    if (appliedCount < targetHighlights) {
      const words = title.split(/\s+/);
      const candidates = words.filter(w => {
        const cleanW = w.replace(/[^a-zA-Z0-9]/g, '');
        return cleanW.length >= 4 && !/^(about|after|again|before|during|through|under|where|which|while|could|should|would|these|those|there|their|watch|with|from|have|been|that|this)$/i.test(cleanW);
      });
      candidates.sort((a, b) => b.length - a.length);
      for (const cand of candidates) {
        if (appliedCount >= targetHighlights) break;
        const cleanCand = cand.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanCand && !highlightedTitle.includes(`**${cleanCand}**`)) {
          highlightedTitle = highlightedTitle.replace(new RegExp(`\\b${cleanCand}\\b`, 'g'), `**${cleanCand}**`);
          appliedCount++;
        }
      }
    }

    // Clean touching markdown boundaries
    highlightedTitle = highlightedTitle
      .replace(/\*{4,}/g, '** **')
      .replace(/\*{3}/g, '**')
      .replace(/([a-zA-Z0-9$%])\*\*([^\s*]+)/g, '$1 **$2')
      .replace(/([^\s*]+)\*\*([a-zA-Z0-9$%])/g, '$1** $2')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      hasTitle: true,
      headline: highlightedTitle,
      rawTitle: title.replace(/[\*<>]+/g, '').trim()
    };
  } catch (err) {
    console.warn(`[Video Vision] Local OCR notice: ${err.message}`);
    return null;
  }
}

/**
 * Runs Python OpenCV to isolate and enhance the headline text ROI from video frames
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string|null>} Path to the high-contrast extracted ROI image, or null
 */
function extractOpenCvHeadlineRoi(videoPath) {
  return new Promise((resolve) => {
    try {
      const { execFile } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'utils', 'opencvTextDetector.py');
      const resolved = resolveLocalMediaPath(videoPath);
      if (!fs.existsSync(scriptPath) || !fs.existsSync(resolved)) {
        return resolve(null);
      }

      const tmpDir = path.join(os.tmpdir(), 'omnistudio_opencv');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const outRoi = path.join(tmpDir, `roi_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);

      execFile('python', [scriptPath, resolved, outRoi], { timeout: 8000 }, (err, stdout) => {
        if (!err && fs.existsSync(outRoi) && fs.statSync(outRoi).size > 500) {
          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed && parsed.success) {
              console.log(`[Video Vision] 🎯 OpenCV localized headline ROI: ${parsed.boxes_detected} text boxes detected`);
              return resolve(outRoi);
            }
          } catch (_) {}
          return resolve(outRoi);
        }
        resolve(null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

const _visionCache = new Map();

/**
 * Detects and extracts on-screen title text from a video or image file
 * Supports OpenCV contour bounding box isolation, Gemini/OpenAI Vision, and high-precision OCR.
 * @param {string} videoOrImagePath - Path to the video or image
 * @param {Object} options
 * @returns {Promise<{ found: boolean, headline?: string, rawTitle?: string, provider?: string }>}
 */
async function detectOnScreenHeadline(videoOrImagePath, options = {}) {
  const resolvedPath = resolveLocalMediaPath(videoOrImagePath);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return { found: false, reason: 'file_not_found' };
  }

  // Fast In-Memory Memoization Cache: bypass repeat OCR scans on same media
  const cacheKey = resolvedPath;
  if (!options.forceFresh && _visionCache.has(cacheKey)) {
    const cached = _visionCache.get(cacheKey);
    console.log(`[Video Vision] ⚡ Instant OCR cache hit for: ${path.basename(resolvedPath)} -> "${cached.headline || ''}"`);
    return cached;
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);

  // 0. Primary High-Precision Engine: OpenCV Contour Bounding Box Localization & ROI Isolation
  if (isVideo) {
    try {
      console.log(`[Video Vision] 📹 Inspecting video frames with OpenCV Computer Vision: ${path.basename(resolvedPath)}...`);
      const opencvRoi = await extractOpenCvHeadlineRoi(resolvedPath);
      if (opencvRoi && fs.existsSync(opencvRoi)) {
        console.log(`[Video Vision] 👁️ Scanning OpenCV-isolated headline ROI with high-precision OCR...`);
        const localResult = await localOcrHeadlineDetection(opencvRoi, { isRoi: true });
        try { fs.unlinkSync(opencvRoi); } catch (_) {}
        if (localResult && localResult.hasTitle && localResult.headline) {
          console.log(`[Video Vision] ✅ Found On-Screen Hook via OpenCV Text Detection: "${localResult.headline}"`);
          const res = {
            found: true,
            headline: localResult.headline,
            rawTitle: localResult.rawTitle || localResult.headline.replace(/\*\*/g, ''),
            hasCompetitorHeader: true,
            provider: 'opencv_ocr'
          };
          _visionCache.set(cacheKey, res);
          return res;
        }
      }
    } catch (opencvErr) {
      console.warn(`[Video Vision] OpenCV detection notice: ${opencvErr.message}`);
    }
  }

  const sampleTimestamps = isVideo ? ['00:00:00.800', '00:00:01.200', '00:00:01.800', '00:00:00.500'] : [null];
  const geminiKey = getSetting('gemini_api_key', '') || process.env.GEMINI_API_KEY || '';
  const openAiKey = getSetting('openai_api_key', '') || process.env.OPENAI_API_KEY || '';

  for (const ts of sampleTimestamps) {
    let framePath = resolvedPath;
    let isTempFrame = false;

    try {
      if (isVideo) {
        console.log(`[Video Vision] 📹 Extracting snapshot frame at ${ts} from video: ${path.basename(resolvedPath)}...`);
        framePath = await extractSnapshotFrame(resolvedPath, { timestamp: ts });
        isTempFrame = true;
      }

      // 1. Try Gemini Vision (Free Tier / Multimodal OCR)
      if (geminiKey) {
        try {
          console.log(`[Video Vision] 👁️ Scanning video frame (${ts || 'img'}) with Gemini Vision OCR...`);
          const result = await callGeminiVision(framePath, geminiKey);
          const hCandidate = result?.headline?.trim() || '';
          const isHValid = hCandidate.length >= 10 && hCandidate.split(/\s+/).length >= 2 && !/^[\d\s.,\-+]+$/.test(hCandidate) && !/^(?:all\s+)?\d+\s+comments?$/i.test(hCandidate) && !isTabularOrSpecDebris(hCandidate);
          if (result && result.hasTitle && isHValid) {
            let cleanHeadline = hCandidate.replace(/^["'“”]/, '').replace(/["'“”]$/, '');
            if (!cleanHeadline.includes('**')) {
              cleanHeadline = cleanHeadline.replace(/(?<=\s|^)(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)(?=\s|[.,;:!?]|$)/gi, '**$1**');
            }
            console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
            const res = {
              found: true,
              headline: cleanHeadline,
              rawTitle: (result.rawTitle || cleanHeadline).replace(/[\*<>]+/g, '').trim(),
              breakdown: result.topicBreakdown || '',
              hasCompetitorHeader: Boolean(result.hasCompetitorHeader),
              provider: 'gemini_vision'
            };
            _visionCache.set(cacheKey, res);
            return res;
          }
        } catch (geminiErr) {
          console.warn(`[Video Vision] Gemini Vision attempt failed: ${geminiErr.message}`);
        }
      }

      // 2. Try OpenAI Vision
      if (openAiKey) {
        try {
          console.log(`[Video Vision] 👁️ Scanning video frame (${ts || 'img'}) with OpenAI Vision...`);
          const result = await callOpenAiVision(framePath, openAiKey);
          const hCandidate = result?.headline?.trim() || '';
          const isHValid = hCandidate.length >= 10 && hCandidate.split(/\s+/).length >= 2 && !/^[\d\s.,\-+]+$/.test(hCandidate) && !/^(?:all\s+)?\d+\s+comments?$/i.test(hCandidate) && !isTabularOrSpecDebris(hCandidate);
          if (result && result.hasTitle && isHValid) {
            let cleanHeadline = hCandidate.replace(/^["'“”]/, '').replace(/["'“”]$/, '');
            if (!cleanHeadline.includes('**')) {
              cleanHeadline = cleanHeadline.replace(/(?<=\s|^)(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)(?=\s|[.,;:!?]|$)/gi, '**$1**');
            }
            console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
            const res = {
              found: true,
              headline: cleanHeadline,
              rawTitle: (result.rawTitle || cleanHeadline).replace(/[\*<>]+/g, '').trim(),
              provider: 'openai_vision'
            };
            _visionCache.set(cacheKey, res);
            return res;
          }
        } catch (openAiErr) {
          console.warn(`[Video Vision] OpenAI Vision attempt failed: ${openAiErr.message}`);
        }
      }

      // 3. Try Local Offline OCR (Zero API Key Required)
      try {
        console.log(`[Video Vision] 👁️ Scanning video frame (${ts || 'img'}) with high-precision Local OCR...`);
        const localResult = await localOcrHeadlineDetection(framePath);
        if (localResult && localResult.hasTitle && localResult.headline) {
          console.log(`[Video Vision] ✅ Found On-Screen Hook via Local OCR: "${localResult.headline}"`);
          const res = {
            found: true,
            headline: localResult.headline,
            rawTitle: (localResult.rawTitle || localResult.headline).replace(/[\*<>]+/g, '').trim(),
            hasCompetitorHeader: true,
            provider: 'local_ocr'
          };
          _visionCache.set(cacheKey, res);
          return res;
        }
      } catch (localErr) {
        console.warn(`[Video Vision] Local OCR attempt notice: ${localErr.message}`);
      }
    } catch (err) {
      console.warn(`[Video Vision] Headline detection notice at ${ts}: ${err.message}`);
    } finally {
      if (isTempFrame && fs.existsSync(framePath)) {
        try { fs.unlinkSync(framePath); } catch (_) {}
      }
    }
  }

  return { found: false, reason: 'no_title_detected_or_no_vision_key' };
}

module.exports = {
  extractSnapshotFrame,
  detectOnScreenHeadline,
  extractHeadlineBlocksFromOcr,
  localOcrHeadlineDetection,
  isCompetitorAccountName
};
