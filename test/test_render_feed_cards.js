const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { prepareVideoForFeedCard } = require('../src/utils/ffmpegHelper');

async function testVideoRenders() {
  const sampleVideo = path.join(__dirname, '..', 'public', 'generated', 'downloads', 'reel_DfZqnfuArzx.mp4');
  if (!fs.existsSync(sampleVideo)) {
    console.error('Sample video not found:', sampleVideo);
    return;
  }

  console.log('Rendering GTA 6 Video...');
  const gtaResult = await prepareVideoForFeedCard(sampleVideo, {
    handle: 'gta6_updates_007',
    theme: 'gta6',
    page: { name: 'GTA 6 Updates 007', handle: '@gta6_updates_007', slug: 'gta6' },
    hookHeadline: 'Rockstar Just Confirmed A **Massive New Feature** For GTA VI'
  });
  console.log('GTA 6 Render Result:', gtaResult);

  const gtaFrame = path.join(__dirname, '..', 'public', 'generated', 'test_gta6_rendered_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${gtaResult}" -vframes 1 "${gtaFrame}"`, { stdio: 'ignore' });
  console.log('GTA 6 Frame extracted:', fs.existsSync(gtaFrame));

  console.log('Rendering Movies Video...');
  const moviesResult = await prepareVideoForFeedCard(sampleVideo, {
    handle: 'movie_series_365',
    theme: 'movies',
    page: { name: 'Movie Recommendations', handle: '@movie_series_365', slug: 'movies' },
    hookHeadline: 'The **Most Mind-Bending** Cinematic Thriller You Cannot Miss'
  });
  console.log('Movies Render Result:', moviesResult);

  const moviesFrame = path.join(__dirname, '..', 'public', 'generated', 'test_movies_rendered_frame.png');
  execSync(`ffmpeg -y -ss 00:00:01 -i "${moviesResult}" -vframes 1 "${moviesFrame}"`, { stdio: 'ignore' });
  console.log('Movies Frame extracted:', fs.existsSync(moviesFrame));
}

testVideoRenders().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
