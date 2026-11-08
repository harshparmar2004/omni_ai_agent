const assert = require('assert');
const { synthesizeOfflineHook } = require('../src/core/llmService');

console.log('🧪 Testing Enhanced Hook Synthesis Engine...');

const caption1 = `Sam Altman, Elon Musk, Mark Zuckerberg, Jensen Huang, Jeff Bezos, and the rest of the tech elite come together for an 80s-style charity anthem called "We Were Always Blue." The lyrics are the best part. Zuckerberg admits his values updated overnight, Bezos sings hold my hand, hold my shares, and the group desperately tries to convince everyone they have always cared. It is a brilliant piece of political satire by arikuschnir, poking fun at how quickly Silicon Valley principles might change when the political winds shift. And Zuckerberg rap at the end deserves its own post.`;

let text = caption1.replace(/["'“”]/g, '').trim();
const rawSentences = text.split(/(?<=[.!?\n])\s+/).map(s => s.trim());
console.log('rawSentences length:', rawSentences.length);
rawSentences.forEach((s, idx) => console.log(`  [${idx}]`, s));

const hook1 = synthesizeOfflineHook(caption1, 'Cult Information');
console.log('Hook 1 generated:', hook1);

// Assert hook1 does NOT start with raw list of names
assert(!hook1.startsWith('Sam Altman'), 'Hook must not be a raw list of creator/subject names');
assert(hook1.includes('**'), 'Hook must include highlighted keyword wrapped in **');

const caption2 = `Researchers discovered an ancient classified library buried 2 miles beneath the Antarctic ice sheet with technology that predates human civilization.`;
const hook2 = synthesizeOfflineHook(caption2, 'Cult Information');
console.log('Hook 2 generated:', hook2);

assert(hook2.includes('**'), 'Hook 2 must contain highlighted words');

console.log('✅ All Hook Synthesis tests passed successfully!');
