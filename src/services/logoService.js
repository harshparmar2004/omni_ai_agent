/**
 * Tech Logo & Vector Badge Service
 * Provides brand colors, SVG/PNG assets, and vector rendering for top technologies
 */

const TECH_BRAND_MAP = {
  python: {
    name: 'Python',
    primaryColor: '#3776AB',
    secondaryColor: '#FFD438',
    icon: '🐍',
    tag: 'Python Notes',
    accentColor: '#306998',
    keywords: ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy']
  },
  docker: {
    name: 'Docker',
    primaryColor: '#0db7ed',
    secondaryColor: '#384d54',
    icon: '🐳',
    tag: 'Docker Notes',
    accentColor: '#0288D1',
    keywords: ['docker', 'container', 'dockerfile', 'compose', 'dockerd']
  },
  kubernetes: {
    name: 'Kubernetes',
    primaryColor: '#326CE5',
    secondaryColor: '#FFFFFF',
    icon: '☸️',
    tag: 'K8s Notes',
    accentColor: '#1A73E8',
    keywords: ['kubernetes', 'k8s', 'kubectl', 'helm', 'pod', 'cluster']
  },
  chatgpt: {
    name: 'ChatGPT / OpenAI',
    primaryColor: '#10A37F',
    secondaryColor: '#FFFFFF',
    icon: '🤖',
    tag: 'AI Prompting',
    accentColor: '#0D8C6D',
    keywords: ['chatgpt', 'openai', 'gpt-4', 'llm', 'prompt', 'prompting', 'claude', 'gemini']
  },
  n8n: {
    name: 'n8n Workflow',
    primaryColor: '#EA4B71',
    secondaryColor: '#FF6D5A',
    icon: '⚡',
    tag: 'n8n Automation',
    accentColor: '#D81B60',
    keywords: ['n8n', 'automation', 'workflow', 'webhook', 'zapier', 'make']
  },
  dsa: {
    name: 'Data Structures & Algorithms',
    primaryColor: '#7B1FA2',
    secondaryColor: '#E1BEE7',
    icon: '🌳',
    tag: 'DSA Sheet',
    accentColor: '#6A1B9A',
    keywords: ['dsa', 'algorithm', 'data structure', 'leetcode', 'tree', 'graph', 'dynamic programming', 'recursion']
  },
  sql: {
    name: 'SQL & Databases',
    primaryColor: '#00758F',
    secondaryColor: '#F29111',
    icon: '🗄️',
    tag: 'SQL Cheat Sheet',
    accentColor: '#006064',
    keywords: ['sql', 'database', 'postgres', 'mysql', 'postgresql', 'queries', 'rdbms', 'sqlite']
  },
  javascript: {
    name: 'JavaScript / TypeScript',
    primaryColor: '#F7DF1E',
    secondaryColor: '#000000',
    icon: '🟨',
    tag: 'JS Notes',
    accentColor: '#C0A000',
    keywords: ['javascript', 'js', 'typescript', 'ts', 'ecmascript', 'node']
  },
  git: {
    name: 'Git & GitHub',
    primaryColor: '#F05032',
    secondaryColor: '#FFFFFF',
    icon: '🌿',
    tag: 'Git Cheat Sheet',
    accentColor: '#D84315',
    keywords: ['git', 'github', 'gitlab', 'version control', 'rebase', 'merge']
  },
  linux: {
    name: 'Linux & Shell',
    primaryColor: '#FCC624',
    secondaryColor: '#000000',
    icon: '🐧',
    tag: 'Linux Notes',
    accentColor: '#2E7D32',
    keywords: ['linux', 'bash', 'shell', 'kernel', 'ubuntu', 'terminal']
  },
  system_design: {
    name: 'System Design',
    primaryColor: '#D97757',
    icon: '📐',
    tag: 'System Design',
    accentColor: '#D97757',
    keywords: ['system design', 'architecture', 'microservices', 'distributed', 'scalability', 'cache']
  },
  langchain: {
    name: 'LangChain',
    primaryColor: '#1C3C3C',
    secondaryColor: '#E6FAF8',
    icon: '🦜🔗',
    tag: 'LangChain Notes',
    accentColor: '#00A88F',
    keywords: ['langchain', 'langgraph', 'langsmith', 'rag', 'chains', 'vectorstore', 'retrieval', 'lcel']
  },
  fastapi: {
    name: 'FastAPI',
    primaryColor: '#059669',
    secondaryColor: '#ECFDF5',
    icon: '⚡',
    tag: 'FastAPI Notes',
    accentColor: '#047857',
    keywords: ['fastapi', 'pydantic', 'uvicorn', 'starlette']
  },
  react: {
    name: 'React 19',
    primaryColor: '#00D8FE',
    secondaryColor: '#20232A',
    icon: '⚛️',
    tag: 'React Notes',
    accentColor: '#0284C7',
    keywords: ['react', 'reactjs', 'nextjs', 'next.js', 'hooks', 'redux']
  },
  rust: {
    name: 'Rust',
    primaryColor: '#DEA584',
    secondaryColor: '#000000',
    icon: '🦀',
    tag: 'Rust Notes',
    accentColor: '#C2410C',
    keywords: ['rust', 'cargo', 'borrow checker', 'rustlang']
  },
  pytorch: {
    name: 'PyTorch',
    primaryColor: '#EE4C2C',
    secondaryColor: '#FFFFFF',
    icon: '🔥',
    tag: 'PyTorch Notes',
    accentColor: '#C2410C',
    keywords: ['pytorch', 'torch', 'tensor', 'deep learning', 'neural net']
  },
  golang: {
    name: 'Go / Golang',
    primaryColor: '#00ADD8',
    secondaryColor: '#FFFFFF',
    icon: '🐹',
    tag: 'Go Notes',
    accentColor: '#0284C7',
    keywords: ['golang', 'go lang', 'goroutine']
  },
  redis: {
    name: 'Redis',
    primaryColor: '#DC2626',
    secondaryColor: '#FFFFFF',
    icon: '🔴',
    tag: 'Redis Notes',
    accentColor: '#B91C1C',
    keywords: ['redis', 'key-value', 'pubsub', 'caching']
  },
  graphql: {
    name: 'GraphQL',
    primaryColor: '#E10098',
    secondaryColor: '#FFFFFF',
    icon: '🕸️',
    tag: 'GraphQL Sheet',
    accentColor: '#BE185D',
    keywords: ['graphql', 'apollo', 'mutation']
  }
};

/**
 * Cleanly extract technology name from any arbitrary query
 */
function extractDynamicTechName(topic) {
  let cleaned = (topic || '')
    .replace(/notes|cheat\s*sheet|cheatsheet|handwritten|complete|guide|masterclass|interview\s*questions|interview|syntax|dunder\s*methods|fundamentals|in\s*python|in\s*rust|in\s*go|high\s*performance|web\s*apis|production|deep\s*dive|master\s*directory|the\s*master/gi, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return 'Engineering';
  }

  const words = cleaned.split(' ').filter(Boolean);
  const techWords = words.length > 2 ? words.slice(0, 2) : words;

  return techWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Detect tech profile by topic text
 * @param {string} topic
 * @returns {Object} Tech profile
 */
function resolveTechProfile(topic) {
  const dynamicName = extractDynamicTechName(topic);
  const t = dynamicName.toLowerCase();
  
  for (const [key, profile] of Object.entries(TECH_BRAND_MAP)) {
    if (key === t || profile.name.toLowerCase() === t) {
      return { id: key, ...profile, name: profile.name };
    }
  }

  // Dynamic extraction for ANY other technology (e.g. FastAPI, Mojo, Bun, Flutter, Angular, Elixir)
  return {
    id: dynamicName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name: dynamicName,
    primaryColor: '#3F51B5',
    secondaryColor: '#E8EAF6',
    icon: '⚡',
    tag: `${dynamicName} Notes`,
    accentColor: '#303F9F',
    keywords: [dynamicName.toLowerCase()]
  };
}

module.exports = {
  TECH_BRAND_MAP,
  resolveTechProfile,
  extractDynamicTechName
};
