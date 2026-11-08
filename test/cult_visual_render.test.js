const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { generateFeedPostOverlay, prepareVideoForFeedCard } = require('../src/utils/ffmpegHelper');

(async () => {
  console.log('🧪 Testing Visual Reel Framing for Cult Information...');

  const headline = 'Tech Billionaires Unite for an **80**s-style Charity Anthem Called We Were Always Blue';
  const overlayPath = await generateFeedPostOverlay('cult_information', {
    cardX: 0,
    cardY: 640,
    cardW: 1080,
    cardH: 608,
    page: {
      name: 'Cult Information',
      handle: 'cult_information',
      slug: 'cult_information'
    },
    hookHeadline: headline
  });

  assert(fs.existsSync(overlayPath), 'Overlay PNG must exist');
  console.log('✅ Visual Overlay generated at:', overlayPath);

  // Now frame the existing video reel with the updated overlay
  const inputVideo = path.join(__dirname, '..', 'public', 'generated', 'downloads', 'reel_DfZqnfuArzx.mp4');
  if (fs.existsSync(inputVideo)) {
    console.log('🎬 Framing test reel reel_DfZqnfuArzx.mp4 with updated branding...');
    const framedVideo = await prepareVideoForFeedCard(inputVideo, {
      handle: 'cult_information',
      page: {
        name: 'Cult Information',
        handle: 'cult_information',
        slug: 'cult_information'
      },
      theme: 'video_essay',
      hookHeadline: headline
    });
    console.log('✅ Framed video rendered at:', framedVideo);
  }

  console.log('🎉 Visual Framing verification test completed successfully!');
})();
