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
1. "headline": Check if there is an on-screen title, hook, or headline text displayed on the screen (such as at the top or above the video content). If yes, extract that EXACT title or hook text. If not, write an ultra-catchy 8-12 word hook based on what is happening in the video.
2. Identify 2 to 5 of the most impactful keywords, numbers, or terms in the headline (~35-40% of words). Wrap those impactful words in double asterisks **like this** for brand color highlighting (e.g. "These **Robotic Arms** Are Powered By **Algae**. Watch How They **Move**").
3. "topicBreakdown": Write a concise, 2-sentence high-energy explanation of this topic for an Instagram caption post body.
4. "hasCompetitorHeader": Is there existing text, title, or account branding in the top area (above the video)? (true/false)

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
2. If yes, extract that EXACT title or hook text.
3. Wrap 1 to 3 impactful keywords in double asterisks **like this** for highlighting.
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
 * Local offline OCR fallback using Tesseract.js & canvas cropping
 * Requires zero API keys and runs 100% locally.
 */
async function localOcrHeadlineDetection(framePath) {
  try {
    const Tesseract = require('tesseract.js');
    const { createCanvas, loadImage } = require('@napi-rs/canvas');

    const resolved = resolveLocalMediaPath(framePath);
    const img = await loadImage(resolved);
    // Crop the upper reel region where titles and headlines are located (Y=0% to Y=70%)
    // Covers top hooks, mid-screen text boxes, and center-aligned reel title cards
    const cropH = Math.floor(img.height * 0.70);
    const canvas = createCanvas(img.width, cropH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, cropH, 0, 0, img.width, cropH);

    // Preprocessing: High-contrast binarization to make text pop against video background
    try {
      const imgData = ctx.getImageData(0, 0, img.width, cropH);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        const v = lum > 135 ? 255 : (lum < 75 ? 0 : lum);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (_) {}

    const res = await Tesseract.recognize(canvas.toBuffer('image/png'), 'eng');
    const rawLines = (res.data?.text || '').split('\n')
      .map(l => l.trim())
      .filter(l => l.length >= 2)
      .filter(l => !/cult|information|reels|share|comment|nobody can fly|every great thing|instagram|audio/i.test(l))
      .filter(l => !/^[0-9:\s=D+&©@#_.\-]+$/.test(l))
      .filter(l => !/^(am|pm|\d{1,2}:\d{2})$/i.test(l));

    if (rawLines.length === 0) return null;

    const validLines = [];
    for (const raw of rawLines) {
      // If credit, source, or edit attribution line reached, stop extraction immediately
      if (/^(credit|source|via|edit|by)[\s:]/i.test(raw) || /credit:\s*/i.test(raw) || /studio/i.test(raw)) break;
      // Skip creator handles
      if (/@\w+/.test(raw)) continue;

      // Check alphanumeric character ratio to drop pure video background noise
      const alphaChars = (raw.match(/[a-zA-Z0-9]/g) || []).length;
      if (raw.length === 0 || (alphaChars / raw.length) < 0.50) {
        if (validLines.length >= 1) break;
        continue;
      }

      let l = raw
        .replace(/[©®™§|°~_—\-+=:;`^•*\\\/<{}>[\]]/g, ' ')
        .replace(/^.*?@\w+[\s:]*/i, '')
        .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Strip trailing single noise characters or short artifacts (e.g. " Hs", " |", " .", " 8")
      l = l.replace(/\s+[^a-zA-Z0-9\s]\s*$/g, '').replace(/\s+[a-zA-Z0-9]{1,2}\s*$/g, '').trim();

      // Do not start the headline with a 1-word or short artifact (e.g. "Rio", "FRE.", "RPE")
      const words = l.split(/\s+/).filter(Boolean);
      if (validLines.length === 0 && (words.length < 2 || l.length < 8)) {
        continue;
      }

      if (l.length >= 3) {
        validLines.push(l);
      }

      // If we have collected 10-18 words, we have a complete viral heading
      const currentWordCount = validLines.join(' ').split(/\s+/).length;
      if (currentWordCount >= 11) break;
    }

    let title = validLines.join(' ');
    // Fix OCR misreads of common vocabulary
    title = title
      .replace(/\bAl\b/g, 'AI')
      .replace(/\bAl's\b/g, "AI's")
      .replace(/\bRohotic\b/gi, 'Robotic')
      .replace(/\bpowered\s+hy\b/gi, 'powered by')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/^[a-zA-Z0-9]{1,3}\s+(?=[A-Z])/g, '')
      .trim();

    // Strip trailing single noise tokens and punctuation artifacts
    title = title.replace(/\s+[^a-zA-Z0-9\s]\s*$/g, '').replace(/\s+[a-z0-9]\s*$/i, '').trim();
    title = title.replace(/[\s.,;:!\-—|§°_~>#+=&\\\/]+$/, '').trim();

    // Reject tabular data, benchmark spec sheets, and price lists
    if (isTabularOrSpecDebris(title)) {
      console.log(`[Video Vision] ⚠️ Discarded OCR title as tabular/benchmark spec data ("${title}"). Falling back to editorial hook synthesis.`);
      return null;
    }

    const wordCount = title.split(/\s+/).length;
    const isPureDigitsOrJunk = /^[\d\s.,\-+]+$/.test(title) || /^(?:all\s+)?\d+\s+comments?$/i.test(title);
    if (wordCount >= 4 && wordCount <= 22 && !isPureDigitsOrJunk && title.length >= 18) {
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
    }
    return null;
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

  const ext = path.extname(resolvedPath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);

  // 0. Primary High-Precision Engine: OpenCV Contour Bounding Box Localization & ROI Isolation
  if (isVideo) {
    try {
      console.log(`[Video Vision] 📹 Inspecting video frames with OpenCV Computer Vision: ${path.basename(resolvedPath)}...`);
      const opencvRoi = await extractOpenCvHeadlineRoi(resolvedPath);
      if (opencvRoi && fs.existsSync(opencvRoi)) {
        console.log(`[Video Vision] 👁️ Scanning OpenCV-isolated headline ROI with high-precision OCR...`);
        const localResult = await localOcrHeadlineDetection(opencvRoi);
        try { fs.unlinkSync(opencvRoi); } catch (_) {}
        if (localResult && localResult.hasTitle && localResult.headline) {
          console.log(`[Video Vision] ✅ Found On-Screen Hook via OpenCV Text Detection: "${localResult.headline}"`);
          return {
            found: true,
            headline: localResult.headline,
            rawTitle: localResult.rawTitle || localResult.headline.replace(/\*\*/g, ''),
            hasCompetitorHeader: true,
            provider: 'opencv_ocr'
          };
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
          const isHValid = hCandidate.length >= 18 && hCandidate.split(/\s+/).length >= 4 && !/^[\d\s.,\-+]+$/.test(hCandidate) && !/^(?:all\s+)?\d+\s+comments?$/i.test(hCandidate) && !isTabularOrSpecDebris(hCandidate);
          if (result && result.hasTitle && isHValid) {
            let cleanHeadline = hCandidate.replace(/^["'“”]/, '').replace(/["'“”]$/, '');
            if (!cleanHeadline.includes('**')) {
              cleanHeadline = cleanHeadline.replace(/(?<=\s|^)(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)(?=\s|[.,;:!?]|$)/gi, '**$1**');
            }
            console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
            return {
              found: true,
              headline: cleanHeadline,
              rawTitle: (result.rawTitle || cleanHeadline).replace(/[\*<>]+/g, '').trim(),
              breakdown: result.topicBreakdown || '',
              hasCompetitorHeader: Boolean(result.hasCompetitorHeader),
              provider: 'gemini_vision'
            };
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
          const isHValid = hCandidate.length >= 18 && hCandidate.split(/\s+/).length >= 4 && !/^[\d\s.,\-+]+$/.test(hCandidate) && !/^(?:all\s+)?\d+\s+comments?$/i.test(hCandidate) && !isTabularOrSpecDebris(hCandidate);
          if (result && result.hasTitle && isHValid) {
            let cleanHeadline = hCandidate.replace(/^["'“”]/, '').replace(/["'“”]$/, '');
            if (!cleanHeadline.includes('**')) {
              cleanHeadline = cleanHeadline.replace(/(?<=\s|^)(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)(?=\s|[.,;:!?]|$)/gi, '**$1**');
            }
            console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
            return {
              found: true,
              headline: cleanHeadline,
              rawTitle: (result.rawTitle || cleanHeadline).replace(/[\*<>]+/g, '').trim(),
              provider: 'openai_vision'
            };
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
          return {
            found: true,
            headline: localResult.headline,
            rawTitle: (localResult.rawTitle || localResult.headline).replace(/[\*<>]+/g, '').trim(),
            hasCompetitorHeader: true,
            provider: 'local_ocr'
          };
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
  detectOnScreenHeadline
};
