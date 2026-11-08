const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { prepareVideoForFeedCard } = require('../src/utils/ffmpegHelper');
const { detectOnScreenHeadline } = require('../src/core/videoVisionService');

async function runVerification() {
  console.log('=== Step 1: Testing Movie Template Overlay & Video Framing ===');
  const sampleVideo = path.join(__dirname, '..', 'public', 'generated', 'downloads', 'reel_DfZqnfuArzx.mp4');
  if (!fs.existsSync(sampleVideo)) {
    throw new Error('Sample test video not found: ' + sampleVideo);
  }

  // 1. Render Movie Reel with Cinema Picks floating golden badge
  console.log('Rendering Movie Template video...');
  const movieResult = await prepareVideoForFeedCard(sampleVideo, {
    handle: 'movie_series_365',
    theme: 'movies',
    page: { name: 'Movie Series 365', handle: '@movie_series_365', slug: 'movies' },
    hookHeadline: 'The **Most Mind-Bending** Cinematic Thriller You Cannot Miss'
  });
  console.log('Movie Render Video:', movieResult);

  const movieFramePath = path.join(__dirname, '..', 'public', 'generated', 'test_movies_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${movieResult}" -vframes 1 "${movieFramePath}"`, { stdio: 'ignore' });
  console.log('Extracted Movie Frame:', fs.existsSync(movieFramePath), movieFramePath);

  // 2. Render Clubbing Template with Logo + Page Name + Handle
  console.log('\n=== Step 2: Testing Clubbing Template Overlay & Video Framing ===');
  const clubResult = await prepareVideoForFeedCard(sampleVideo, {
    handle: 'clubbingcult',
    theme: 'clubbing',
    page: { name: 'Clubbing Cult', handle: '@clubbingcult', slug: 'clubbing' }
  });
  console.log('Clubbing Render Video:', clubResult);

  const clubFramePath = path.join(__dirname, '..', 'public', 'generated', 'test_clubbing_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${clubResult}" -vframes 1 "${clubFramePath}"`, { stdio: 'ignore' });
  console.log('Extracted Clubbing Frame:', fs.existsSync(clubFramePath), clubFramePath);

  // 3. Test Video Vision OCR
  console.log('\n=== Step 3: Testing Video Vision OCR ===');
  const visionScan = await detectOnScreenHeadline(sampleVideo);
  console.log('Vision Scan Result on sample video:', visionScan);

  // 4. Render Cult Information Template with OCR detected hook
  console.log('\n=== Step 4: Testing Cult Information Template with OCR Extracted Hook ===');
  const cultResult = await prepareVideoForFeedCard(sampleVideo, {
    handle: 'cult_information',
    theme: 'video_essay',
    page: { name: 'Cult Information', handle: '@cult_information', slug: 'cult_information' },
    hookHeadline: visionScan.headline || 'Breakthrough AI technology is evolving faster than anyone expected'
  });
  console.log('Cult Information Render Video:', cultResult);

  const cultFramePath = path.join(__dirname, '..', 'public', 'generated', 'test_cult_info_verified_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${cultResult}" -vframes 1 "${cultFramePath}"`, { stdio: 'ignore' });
  console.log('Extracted Cult Information Frame:', fs.existsSync(cultFramePath), cultFramePath);

  console.log('\nALL TEMPLATE TESTS COMPLETED SUCCESSFULLY!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
