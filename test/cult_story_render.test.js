const assert = require('assert');
const fs = require('fs');
const { generateStoryOverlay } = require('../src/utils/ffmpegHelper');

console.log('🧪 Testing Cult Information Editorial Story Generation...');

// Generate story overlay for cult_information
const overlayPath = generateStoryOverlay('cult_information', {
  theme: 'video_essay',
  inputWidth: 1080,
  inputHeight: 1920,
  hookHeadline: 'Ancient Secret Discovered In The Antarctic Ice'
});

assert(fs.existsSync(overlayPath), 'Story overlay file must exist');
console.log('Story overlay generated at:', overlayPath);

// Generate story overlay for page id 4
const pageOverlayPath = generateStoryOverlay('@cult_information', {
  page: { id: 4, slug: 'cult_information', name: 'Cult Information' },
  inputWidth: 1080,
  inputHeight: 1350
});

assert(fs.existsSync(pageOverlayPath), 'Page story overlay file must exist');
console.log('Page story overlay generated at:', pageOverlayPath);

console.log('✅ Cult Information Editorial Story Tests Passed cleanly!');
