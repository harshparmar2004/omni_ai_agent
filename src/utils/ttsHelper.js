const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getSetting } = require('../database');

const { execSync } = require('child_process');

/**
 * Generate audio speech or realistic audio track for Reel synthesis
 * Supports:
 * 1. ElevenLabs API (premium neural voice)
 * 2. Google Translate Neural TTS (100% free, natural speech, zero setup)
 * 3. Windows Native SpeechSynthesizer (offline Windows fallback)
 * 4. Synthetic PCM WAV generator (pure offline fallback)
 */
async function generateSpeechAudio(text, outputPath) {
  if (!text || typeof text !== 'string') return { success: false, reason: 'empty_text' };

  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/["'“”]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanText.length < 3) return { success: false, reason: 'text_too_short' };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const elevenLabsKey = getSetting('elevenlabs_api_key') || process.env.ELEVENLABS_API_KEY;

  // 1. ElevenLabs API (if key is configured)
  if (elevenLabsKey && elevenLabsKey.trim().length > 10) {
    try {
      console.log('[TTS Helper] 🎙️ Calling ElevenLabs API for voiceover...');
      const voiceId = getSetting('elevenlabs_voice_id', '21m00Tcm4TlvDq8ikWAM'); // Rachel / Standard voice
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': elevenLabsKey.trim(),
          'Content-Type': 'application/json'
        },
        data: {
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        responseType: 'arraybuffer',
        timeout: 20000
      });

      fs.writeFileSync(outputPath, Buffer.from(response.data));
      console.log(`[TTS Helper] ✅ ElevenLabs voiceover saved to ${outputPath}`);
      return { success: true, engine: 'elevenlabs', file: outputPath };
    } catch (err) {
      console.warn(`[TTS Helper] ElevenLabs call failed (${err.message}). Trying Google Neural TTS fallback...`);
    }
  }

  // 2. Google Translate Neural TTS (Free, high-quality, works everywhere without API keys)
  try {
    console.log('[TTS Helper] 🎙️ Synthesizing voiceover with Google Neural TTS...');
    const params = new URLSearchParams({
      ie: 'UTF-8',
      client: 'tw-ob',
      tl: 'en',
      q: cleanText.slice(0, 190) // Safe max URL query length
    });
    const url = `https://translate.google.com/translate_tts?${params.toString()}`;
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });

    if (res.data && res.data.length > 500) {
      fs.writeFileSync(outputPath, Buffer.from(res.data));
      console.log(`[TTS Helper] ✅ Google Neural voiceover saved to ${outputPath} (${res.data.length} bytes)`);
      return { success: true, engine: 'google_tts', file: outputPath };
    }
  } catch (gErr) {
    console.warn(`[TTS Helper] Google TTS attempt notice: ${gErr.message}`);
  }

  // 3. Native Windows SpeechSynthesizer (Offline Fallback for Windows)
  if (process.platform === 'win32') {
    try {
      console.log('[TTS Helper] 🎙️ Synthesizing voiceover via Windows SpeechSynthesizer...');
      const escaped = cleanText.replace(/"/g, '`"');
      const tempWav = outputPath.replace(/\.[^.]+$/, '.wav');
      const psScript = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('${tempWav.replace(/\\/g, '/')}'); $s.Speak("${escaped}"); $s.Dispose();`;
      execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript}"`, { timeout: 15000, stdio: 'ignore' });
      if (fs.existsSync(tempWav) && fs.statSync(tempWav).size > 1000) {
        if (outputPath.endsWith('.mp3')) {
          execSync(`ffmpeg -y -i "${tempWav}" -c:a libmp3lame -q:a 2 "${outputPath}"`, { timeout: 10000, stdio: 'ignore' });
          try { fs.unlinkSync(tempWav); } catch (_) {}
        }
        console.log(`[TTS Helper] ✅ Windows Native voiceover saved to ${outputPath}`);
        return { success: true, engine: 'windows_sapi', file: outputPath };
      }
    } catch (winErr) {
      console.warn(`[TTS Helper] Windows SAPI notice: ${winErr.message}`);
    }
  }

  // 4. Built-in synthetic PCM WAV generator (pure offline fallback)
  createSyntheticAudioWav(outputPath, Math.max(4, Math.min(10, Math.ceil(cleanText.split(' ').length * 0.4))));
  return { success: true, engine: 'synthetic_tts', file: outputPath };
}

/**
 * Creates a valid RIFF WAV file with speech cadence tones
 * @param {string} filePath - Absolute path to save WAV
 * @param {number} durationSec - Desired duration in seconds
 */
function createSyntheticAudioWav(filePath, durationSec = 8) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // 'data' subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill data with gentle harmonic speech cadence (modulating frequency 220Hz - 440Hz with pauses)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Cadence modulation
    const rhythm = Math.sin(2 * Math.PI * 3.5 * t);
    const envelope = rhythm > 0 ? rhythm : 0.05;
    const baseFreq = 220 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const sampleVal = Math.sin(2 * Math.PI * baseFreq * t) * envelope * 0.35 +
                      Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * envelope * 0.15;

    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    buffer.writeInt16LE(int16Val, offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

module.exports = {
  generateSpeechAudio,
  createSyntheticAudioWav
};
