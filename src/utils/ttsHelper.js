const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getSetting } = require('../database');

/**
 * Generate audio speech or realistic audio track for Reel synthesis
 * Supports ElevenLabs API or synthetic PCM WAV generation
 */
async function generateSpeechAudio(text, outputPath) {
  const elevenLabsKey = getSetting('elevenlabs_api_key') || process.env.ELEVENLABS_API_KEY;
  const mode = getSetting('mode', 'mock');

  // Ensure target directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // If live mode and ElevenLabs key provided, call ElevenLabs API
  if (mode === 'live' && elevenLabsKey && elevenLabsKey.trim().length > 10) {
    try {
      console.log('[TTS Helper] 🎙️ Calling ElevenLabs API for voiceover...');
      const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel / Standard voice
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json'
        },
        data: {
          text: text,
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
      console.log(`[TTS Helper] ElevenLabs voiceover saved to ${outputPath}`);
      return { success: true, engine: 'elevenlabs', file: outputPath };
    } catch (err) {
      console.warn(`[TTS Helper] ElevenLabs call failed (${err.message}). Falling back to synthetic audio generator.`);
    }
  }

  // Built-in synthetic PCM WAV generator (generates 6 to 10 seconds of speech-like cadence audio)
  createSyntheticAudioWav(outputPath, Math.max(6, Math.min(15, Math.ceil(text.split(' ').length * 0.4))));
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
