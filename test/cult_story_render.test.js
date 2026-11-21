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

// Verify file sizes are healthy
const stat1 = fs.statSync(overlayPath);
const stat2 = fs.statSync(pageOverlayPath);
assert(stat1.size > 10000, `Overlay size should be > 10KB (was ${stat1.size} bytes)`);
assert(stat2.size > 10000, `Page overlay size should be > 10KB (was ${stat2.size} bytes)`);

// Verify code contains the new dedicated editorial badges and dual-tier CTAs
const ffmpegHelperCode = fs.readFileSync(require('path').join(__dirname, '../src/utils/ffmpegHelper.js'), 'utf8');
assert.ok(ffmpegHelperCode.includes("[ NEW POST ]"), 'ffmpegHelper must include [ NEW POST ] top header badge');
assert.ok(ffmpegHelperCode.includes("TAP TO WATCH FULL REEL  ►"), 'ffmpegHelper must include TAP TO WATCH FULL REEL action CTA');
assert.ok(ffmpegHelperCode.includes("FOLLOW @${cleanHandle} FOR MORE DEEP KNOWLEDGE"), 'ffmpegHelper must include follow build-up subtext');
assert.ok(ffmpegHelperCode.includes("CULT INFORMATION • UNTOLD KNOWLEDGE"), 'ffmpegHelper must include bottom archive boundary bar');

console.log('✅ Cult Information Editorial Story Tests Passed cleanly!');
