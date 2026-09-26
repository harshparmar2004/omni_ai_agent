/**
 * Trending Audio & Song Recommender Service v1.0
 * Matches research topics and content types with high-virality Instagram audio tracks,
 * BPM, genre vibes, and reel/carousel audio cues.
 */

const TRENDING_CATALOG = {
  high_tempo: [
    {
      title: 'Metamorphosis',
      artist: 'INTERWORLD',
      genre: 'Drift Phonk / Cyber',
      tempo_bpm: 140,
      vibe: 'High Adrenaline & Fast Tech News',
      audio_url: 'https://www.instagram.com/reels/audio/1122334455/',
      hook_cue: 'Drop the beat on Slide 2 reveal'
    },
    {
      title: 'Murder In My Mind',
      artist: 'KORDHELL',
      genre: 'Drift Phonk',
      tempo_bpm: 135,
      vibe: 'Bold Disclosures & Leaks',
      audio_url: 'https://www.instagram.com/reels/audio/2233445566/',
      hook_cue: 'Bass swell during major leak point'
    },
    {
      title: 'Rave',
      artist: 'Dxrk ダーク',
      genre: 'Phonk / Bass',
      tempo_bpm: 142,
      vibe: 'Speed Code & System Architecture',
      audio_url: 'https://www.instagram.com/reels/audio/3344556677/',
      hook_cue: 'Sync transitions to drum kicks'
    }
  ],
  cinematic: [
    {
      title: 'Time (Cyberpunk & Trap Remix)',
      artist: 'Hans Zimmer x Trap Nation',
      genre: 'Cinematic Motivation',
      tempo_bpm: 120,
      vibe: 'Flagship Hackathons & High-Stakes Grants',
      audio_url: 'https://www.instagram.com/reels/audio/4455667788/',
      hook_cue: 'Crescendo on prize pool / registration deadline'
    },
    {
      title: 'Close Eyes',
      artist: 'DVRST',
      genre: 'Synth Cinematic',
      tempo_bpm: 125,
      vibe: 'Prestige Competitions & Winning Playbooks',
      audio_url: 'https://www.instagram.com/reels/audio/5566778899/',
      hook_cue: 'Piano drop at Top 3 rankings'
    },
    {
      title: 'Cornfield Chase (Orchestral Synth)',
      artist: 'Dorian Marko',
      genre: 'Cinematic Euphoria',
      tempo_bpm: 118,
      vibe: 'Grand Tech Announcements & Breakthrough Models',
      audio_url: 'https://www.instagram.com/reels/audio/6677889900/',
      hook_cue: 'Emotional lift on conclusion and CTA'
    }
  ],
  lofi_study: [
    {
      title: 'Fluffy Clouds',
      artist: 'Kevatta',
      genre: 'Lofi Chill / Study Beats',
      tempo_bpm: 82,
      vibe: 'Educational Notes & Cheat Sheets',
      audio_url: 'https://www.instagram.com/reels/audio/7788990011/',
      hook_cue: 'Mellow warm vinyl crackle under code syntax'
    },
    {
      title: 'Steven Universe Lofi',
      artist: 'L.Dre',
      genre: 'Nostalgic Lofi',
      tempo_bpm: 85,
      vibe: 'Python OOP & DSA Handwritten Notes',
      audio_url: 'https://www.instagram.com/reels/audio/8899001122/',
      hook_cue: 'Subtle ambient loop that maximizes reading time'
    },
    {
      title: 'Snowman Walk',
      artist: 'Wun Two',
      genre: 'Vintage Boombap Lofi',
      tempo_bpm: 80,
      vibe: 'Interview Questions & Kernel Deep Dives',
      audio_url: 'https://www.instagram.com/reels/audio/9900112233/',
      hook_cue: 'Relaxed groove for technical study'
    }
  ],
  tech_house: [
    {
      title: 'Rumble (Extended Tech Edit)',
      artist: 'Skrillex, Fred again.., Flowdan',
      genre: 'Tech Bass / Future Garage',
      tempo_bpm: 130,
      vibe: 'AI Agents & Multi-LLM Pipelines',
      audio_url: 'https://www.instagram.com/reels/audio/1011121314/',
      hook_cue: 'Vocal drop: "Rumble" on slide transition'
    },
    {
      title: 'So U Kno',
      artist: 'Overmono',
      genre: 'UK Garage / Minimal Tech',
      tempo_bpm: 132,
      vibe: 'Production Deployments & Cloud Systems',
      audio_url: 'https://www.instagram.com/reels/audio/1213141516/',
      hook_cue: 'Hypnotic syncopated beats for technical authority'
    }
  ]
};

/**
 * Recommend a trending song and audio placement based on topic and content type
 * @param {string} topic
 * @param {string} contentType - 'carousel', 'reel', 'image'
 * @returns {{ title: string, artist: string, genre: string, audio_url: string, vibe: string, hook_cue: string, tempo_bpm: number }}
 */
function recommendTrendingAudio(topic = '', contentType = 'carousel') {
  const clean = (topic || '').toLowerCase();

  let category = 'tech_house';

  if (/note|cheat|handwritten|oop|dsa|interview|syntax|dunder|beginner|learn/i.test(clean)) {
    category = 'lofi_study';
  } else if (/hackathon|bounty|grant|prize|win|october|india|global|compete|challenge/i.test(clean)) {
    category = 'cinematic';
  } else if (/gta|game|leak|breaking|speed|latency|crash|news|alert/i.test(clean)) {
    category = 'high_tempo';
  } else {
    category = 'tech_house';
  }

  const tracks = TRENDING_CATALOG[category] || TRENDING_CATALOG.tech_house;
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % tracks.length;
  return tracks[index];
}

function getAllTrendingTracks() {
  return TRENDING_CATALOG;
}

module.exports = {
  recommendTrendingAudio,
  getAllTrendingTracks,
  TRENDING_CATALOG
};
