/**
 * Intent Classifier for OmniResearch AI
 * Accurately routes queries between:
 * 1. Pipeline A: Technology Notes / Cheat Sheets / Handwritten Notebook PDF & Carousel
 * 2. Pipeline B: Live Trend Intelligence / Hackathons / Directories / Verified Dossier PDF
 */

const TECH_KEYWORDS = [
  'langchain', 'langgraph', 'langsmith', 'lcel', 'rag',
  'python', 'fastapi', 'django', 'flask', 'pandas', 'numpy', 'pydantic',
  'docker', 'container', 'dockerfile', 'compose',
  'kubernetes', 'k8s', 'kubectl', 'helm',
  'react', 'reactjs', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
  'rust', 'cargo', 'rustlang',
  'golang', 'go lang', 'goroutine',
  'pytorch', 'tensorflow', 'deep learning', 'neural net',
  'sql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'redis', 'database',
  'graphql', 'apollo',
  'javascript', 'typescript', 'node', 'nodejs', 'express',
  'git', 'github', 'linux', 'bash', 'shell',
  'dsa', 'algorithm', 'data structure', 'leetcode',
  'system design', 'microservices',
  'n8n', 'workflow automation',
  'chatgpt', 'openai', 'llm prompting', 'prompt engineering'
];

const NEWS_TREND_KEYWORDS = [
  'hackathon', 'hackathons', 'contest', 'competition', 'prize', 'grants',
  'october', 'calendar', 'directory', 'top 10', 'top 5', 'top 20',
  'news', 'breaking', 'leak', 'leaks', 'gta', 'gaming', 'gameplay',
  'market report', 'industry trends', 'funding round', 'vc'
];

/**
 * Checks if a query is intended for Handwritten Notes / Cheat Sheets
 * @param {string} topic
 * @param {string} title
 * @returns {boolean}
 */
function isTechNotesIntent(topic = '', title = '') {
  const combined = `${topic} ${title}`.toLowerCase();

  // Rule 1: Explicit note/cheat-sheet indicator ALWAYS triggers Tech Notes
  const explicitNotesRegex = /notes|cheat\s*sheet|cheatsheet|handwritten|interview\s*questions|syntax|fundamentals|reference\s*sheet|dunder\s*methods|oop|dsa\s*sheet|notebook|handbook|playbook for beginners/i;
  if (explicitNotesRegex.test(combined)) {
    return true;
  }

  // Rule 2: If news, hackathon, trend, or leak is present, it's Pipeline B (Live Trend Dossier)
  const isNewsOrTrend = NEWS_TREND_KEYWORDS.some(kw => combined.includes(kw));
  if (isNewsOrTrend) {
    return false;
  }

  // Rule 3: If it matches any programming language, framework, tool, or library
  const isTechMatch = TECH_KEYWORDS.some(kw => combined.includes(kw));
  if (isTechMatch) {
    return true;
  }

  return false;
}

module.exports = {
  isTechNotesIntent,
  TECH_KEYWORDS,
  NEWS_TREND_KEYWORDS
};
