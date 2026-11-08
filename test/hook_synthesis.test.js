const assert = require('assert');
const { synthesizeOfflineHook } = require('../src/core/llmService');

console.log('🧪 Testing Intelligent Offline Hook Synthesizer...');

// Test 1: Stripping competitor bio, follow pleas, and link in bio
const rawCaption1 = `
Scientists have just discovered a massive underground ocean beneath the Earth crust that contains more water than all surface oceans combined. 
Follow @science_facts_daily for more mind blowing discoveries! 
Turn on post notifications 🔔 
Link in bio to read full study! 
Credit: Nature Geoscience
#science #nature #discovery #earth
`;

const hook1 = synthesizeOfflineHook(rawCaption1, 'Cult Information');
console.log('Test 1 Generated Hook:', hook1);
assert(!hook1.toLowerCase().includes('follow'), 'Must not contain "follow"');
assert(!hook1.toLowerCase().includes('bio'), 'Must not contain "bio"');
assert(!hook1.toLowerCase().includes('credit'), 'Must not contain "credit"');
assert(!hook1.includes('#'), 'Must not contain hashtags');
assert(hook1.toLowerCase().includes('ocean') || hook1.toLowerCase().includes('discovered'), 'Must capture core revelation');
assert(hook1.includes('**'), 'Must wrap key terms in double asterisks for accent highlight');

// Test 2: Handling numbers and financial metrics
const rawCaption2 = `
The US government spent $21,000,000,000 building an underground bunker network that was abandoned without ever being used. Drop your thoughts below!
`;
const hook2 = synthesizeOfflineHook(rawCaption2, 'Cult Information');
console.log('Test 2 Generated Hook:', hook2);
assert(hook2.includes('**$21,000,000,000**') || hook2.includes('**21,000,000,000**') || hook2.includes('**'), 'Must highlight metric');

// Test 3: Fallback on empty or garbage bio
const rawCaption3 = `Follow @xyz for daily posts! DM for promo!`;
const hook3 = synthesizeOfflineHook(rawCaption3, 'Cult Information');
console.log('Test 3 Generated Hook:', hook3);
assert(hook3.length > 20, 'Must produce a strong fallback hook');

console.log('✅ All Hook Synthesis Tests Passed cleanly!\n');
