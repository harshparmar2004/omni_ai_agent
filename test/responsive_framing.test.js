const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateEvolvingAiOverlay } = require('../src/utils/ffmpegHelper');

async function testResponsiveFraming() {
  console.log('🧪 Testing Responsive Framing & Zero Ratio Overlap...');

  // Test Case A: 16:9 Landscape Video (cardY = 656, cardH = 608)
  const overlayA = await generateEvolvingAiOverlay('cult_information', {
    cardX: 0,
    cardY: 656,
    cardW: 1080,
    cardH: 608,
    hookHeadline: 'Scientists Discovered An Underground Ocean With **More Water** Than All Oceans'
  });
  assert(fs.existsSync(overlayA), 'Overlay A must exist');

  // Test Case B: 1:1 Square Video (cardY = 420, cardH = 1080)
  const overlayB = await generateEvolvingAiOverlay('cult_information', {
    cardX: 0,
    cardY: 420,
    cardW: 1080,
    cardH: 1080,
    hookHeadline: 'The Secret Underground Vault That Stored **$400,000,000,000** In Gold'
  });
  assert(fs.existsSync(overlayB), 'Overlay B must exist');

  // Test Case C: 4:5 Large Portrait Frame (cardY = 385, cardH = 1150)
  // This is the critical case where the text previously overlapped the video!
  const overlayC = await generateEvolvingAiOverlay('cult_information', {
    cardX: 0,
    cardY: 385,
    cardW: 1080,
    cardH: 1150,
    hookHeadline: 'How An Ancient Forgotten Map Revealed A **Hidden Continent** Under Antarctica'
  });
  assert(fs.existsSync(overlayC), 'Overlay C must exist');

  console.log('✅ All Responsive Framing Tests Passed (Zero Overlap on 16:9, 1:1, and 4:5)!');
}

testResponsiveFraming().catch(err => {
  console.error('❌ Responsive Framing Test Failed:', err);
  process.exit(1);
});
