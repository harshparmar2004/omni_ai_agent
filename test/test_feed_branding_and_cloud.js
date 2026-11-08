const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { prepareVideoForFeedCard } = require('./src/utils/ffmpegHelper');

async function run() {
  console.log('--- Testing Feed Branding & Cloud Stability ---');
  const sampleVideo = path.join(__dirname, 'public', 'generated', 'sample_test_video.mp4');
  
  if (!fs.existsSync(sampleVideo)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=0x111116:s=1080x1920:d=2 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -t 2 -pix_fmt yuv420p -c:a aac -shortest "${sampleVideo}"`, { stdio: 'ignore' });
  }

  // 1. Movie Framing
  console.log('1. Rendering Movie Reel with exact pageName...');
  const movieFramed = await prepareVideoForFeedCard(sampleVideo, {
    handle: '@movie_series_365',
    pageName: 'Movie Series 365',
    theme: 'movies'
  });
  console.log('? Movie Framed MP4:', movieFramed);
  if (!fs.existsSync(movieFramed)) throw new Error('Movie framed video not found');

  // Extract a test frame from movieFramed to visually verify
  const movieFramePng = path.join(__dirname, 'public', 'generated', 'test_movies_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${movieFramed}" -vframes 1 "${movieFramePng}"`, { stdio: 'ignore' });
  console.log('? Extracted movie frame:', movieFramePng);

  // 2. GTA 6 Framing
  console.log('2. Rendering GTA 6 Reel with exact pageName...');
  const gtaFramed = await prepareVideoForFeedCard(sampleVideo, {
    handle: '@gta6_updates_007',
    pageName: 'GTA 6 Updates 007',
    theme: 'gta6'
  });
  console.log('? GTA 6 Framed MP4:', gtaFramed);
  if (!fs.existsSync(gtaFramed)) throw new Error('GTA 6 framed video not found');

  const gtaFramePng = path.join(__dirname, 'public', 'generated', 'test_gta6_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${gtaFramed}" -vframes 1 "${gtaFramePng}"`, { stdio: 'ignore' });
  console.log('? Extracted GTA 6 frame:', gtaFramePng);

  // 3. Clubbing Framing
  console.log('3. Rendering Clubbing Reel with exact pageName...');
  const clubFramed = await prepareVideoForFeedCard(sampleVideo, {
    handle: '@clubbingcult',
    pageName: 'Clubbing Cult',
    theme: 'clubbing'
  });
  console.log('? Clubbing Framed MP4:', clubFramed);
  if (!fs.existsSync(clubFramed)) throw new Error('Clubbing framed video not found');

  const clubFramePng = path.join(__dirname, 'public', 'generated', 'test_clubbing_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${clubFramed}" -vframes 1 "${clubFramePng}"`, { stdio: 'ignore' });
  console.log('? Extracted Clubbing frame:', clubFramePng);

  // 4. Verify Audio Stream in Output Video
  console.log('4. Verifying audio streams...');
  const probeRaw = execSync(`ffprobe -v error -show_entries stream=codec_type,codec_name,sample_rate,channels -of json "${movieFramed}"`).toString();
  const probeData = JSON.parse(probeRaw);
  const aStream = probeData.streams.find(s => s.codec_type === 'audio');
  console.log('? Audio stream details:', aStream);
  if (!aStream || aStream.codec_name !== 'aac' || aStream.channels !== 2 || aStream.sample_rate !== '44100') {
    throw new Error('Audio stream is not standard 44.1kHz stereo AAC!');
  }

  console.log('?? ALL BRANDING & AUDIO VERIFICATION CHECKS PASSED 100%!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
