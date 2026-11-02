const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const { getSetting } = require('../database');

/**
 * Extracts a high-quality snapshot frame from a video file using FFmpeg
 * @param {string} videoPath - Absolute path to the video file
 * @param {Object} options
 * @param {string} [options.timestamp='00:00:01.200'] - Timestamp to extract (1.2s avoids black fade-in)
 * @returns {Promise<string>} Path to the extracted frame JPEG
 */
function extractSnapshotFrame(videoPath, options = {}) {
  return new Promise((resolve, reject) => {
    if (!videoPath || !fs.existsSync(videoPath)) {
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
      '-i', videoPath,
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
        '-i', videoPath,
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
2. Identify 1 to 3 of the most impactful keywords, numbers, or terms in the headline. Wrap those impactful words in double asterisks **like this** for brand color highlighting (e.g. "Scientists Made The First **Living Thing** Built For **Mars**").
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
 * Detects and extracts on-screen title text from a video or image file
 * @param {string} videoOrImagePath - Path to the video or image
 * @param {Object} options
 * @returns {Promise<{ found: boolean, headline?: string, rawTitle?: string, provider?: string }>}
 */
async function detectOnScreenHeadline(videoOrImagePath, options = {}) {
  if (!videoOrImagePath || !fs.existsSync(videoOrImagePath)) {
    return { found: false, reason: 'file_not_found' };
  }

  let framePath = videoOrImagePath;
  let isTempFrame = false;

  const ext = path.extname(videoOrImagePath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);

  try {
    if (isVideo) {
      console.log(`[Video Vision] 📹 Extracting snapshot frame from video: ${path.basename(videoOrImagePath)}...`);
      framePath = await extractSnapshotFrame(videoOrImagePath);
      isTempFrame = true;
    }

    const geminiKey = getSetting('gemini_api_key', '') || process.env.GEMINI_API_KEY || '';
    const openAiKey = getSetting('openai_api_key', '') || process.env.OPENAI_API_KEY || '';

    // 1. Try Gemini Vision (Free Tier / Ultra Fast)
    if (geminiKey) {
      try {
        console.log('[Video Vision] 👁️ Scanning video frame with Gemini Vision OCR...');
        const result = await callGeminiVision(framePath, geminiKey);
        if (result && result.hasTitle && result.headline && result.headline.trim().length >= 8) {
          let cleanHeadline = result.headline.trim().replace(/^["'“”]/, '').replace(/["'“”]$/, '');
          if (!cleanHeadline.includes('**')) {
            cleanHeadline = cleanHeadline.replace(/(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)/gi, '**$1**');
          }
          console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
          return {
            found: true,
            headline: cleanHeadline,
            rawTitle: result.rawTitle || cleanHeadline.replace(/\*\*/g, ''),
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
        console.log('[Video Vision] 👁️ Scanning video frame with OpenAI Vision...');
        const result = await callOpenAiVision(framePath, openAiKey);
        if (result && result.hasTitle && result.headline && result.headline.trim().length >= 8) {
          let cleanHeadline = result.headline.trim().replace(/^["'“”]/, '').replace(/["'“”]$/, '');
          if (!cleanHeadline.includes('**')) {
            cleanHeadline = cleanHeadline.replace(/(\$?\d[\d,\.]*[%xXkKmMbBtT]?|\b(?:billion|million|trillion)\b)/gi, '**$1**');
          }
          console.log(`[Video Vision] ✅ Found On-Screen Hook: "${cleanHeadline}"`);
          return {
            found: true,
            headline: cleanHeadline,
            rawTitle: result.rawTitle || cleanHeadline.replace(/\*\*/g, ''),
            provider: 'openai_vision'
          };
        }
      } catch (openAiErr) {
        console.warn(`[Video Vision] OpenAI Vision attempt failed: ${openAiErr.message}`);
      }
    }

    return { found: false, reason: 'no_title_detected_or_no_vision_key' };
  } catch (err) {
    console.warn(`[Video Vision] Headline detection error: ${err.message}`);
    return { found: false, error: err.message };
  } finally {
    if (isTempFrame && fs.existsSync(framePath)) {
      try { fs.unlinkSync(framePath); } catch (_) {}
    }
  }
}

module.exports = {
  extractSnapshotFrame,
  detectOnScreenHeadline
};
