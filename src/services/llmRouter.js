const axios = require('axios');
const { getSetting } = require('../database');

/**
 * Multi-LLM Provider Router
 * Unified gateway for Claude, Gemini, OpenAI, Groq, and Ollama
 * Supports structured routing, automatic failover, and cost estimation
 */

const PROVIDERS = {
  claude: {
    name: 'Anthropic Claude',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    settingKey: 'claude_api_key',
    supportsDeepResearch: true
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    settingKey: 'gemini_api_key',
    supportsJsonMode: true
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    settingKey: 'openai_api_key'
  },
  groq: {
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    settingKey: 'groq_api_key'
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['gemma4:e4b', 'llama3.2', 'deepseek-r1:14b'],
    endpoint: null, // Dynamic from settings
    settingKey: null
  }
};

let cachedOllamaModels = null;

async function syncOllamaModels() {
  if (cachedOllamaModels) return cachedOllamaModels;
  try {
    const endpoint = getSetting('ollama_endpoint', 'http://localhost:11434');
    const res = await axios.get(`${endpoint}/api/tags`, { timeout: 2000 });
    if (res.data && Array.isArray(res.data.models)) {
      const names = res.data.models.map(m => m.name);
      if (names.length > 0) {
        PROVIDERS.ollama.models = names;
        cachedOllamaModels = names;
      }
    }
  } catch (e) {
    // If ollama not responding, keep defaults
  }
  return PROVIDERS.ollama.models;
}

// Cost per 1M tokens (USD) — [input, output]
const COST_TABLE = {
  'claude-sonnet-4-20250514': [3, 15],
  'claude-opus-4-20250514': [15, 75],
  'gemini-2.5-flash': [0.15, 0.60],
  'gemini-2.5-pro': [1.25, 10],
  'gpt-4o': [2.5, 10],
  'gpt-4o-mini': [0.15, 0.60],
  'o1-mini': [3, 12],
  'llama-3.3-70b-versatile': [0.59, 0.79],
  'mixtral-8x7b-32768': [0.24, 0.24],
  'gemma4:e4b': [0, 0]
};

/**
 * Returns all providers with availability status
 */
function getAvailableProviders() {
  // Trigger background sync if not already done
  syncOllamaModels().catch(() => {});

  return Object.entries(PROVIDERS).map(([id, cfg]) => {
    let available = false;
    if (id === 'ollama') {
      available = true; // Ollama is local, always available
    } else {
      const key = getSetting(cfg.settingKey, '');
      available = key && key.trim().length > 10;
    }
    return {
      id,
      name: cfg.name,
      models: cfg.models,
      available,
      supportsDeepResearch: cfg.supportsDeepResearch || false,
      supportsJsonMode: cfg.supportsJsonMode || false
    };
  });
}

/**
 * Route a request to a specific provider
 * @param {string} provider - Provider ID (claude, gemini, openai, groq, ollama)
 * @param {string} model - Model name
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - { maxTokens, jsonMode, temperature }
 * @returns {Promise<{content, model, provider, tokens, latency_ms, cost_usd}>}
 */
async function routeRequest(provider, model, messages, options = {}) {
  const startTime = Date.now();
  console.log(`[LLM Router] 🚀 Routing to ${provider}/${model}...`);

  let result;
  switch (provider) {
    case 'claude': {
      const apiKey = getSetting('claude_api_key', '');
      if (!apiKey || apiKey.trim().length < 10) throw new Error('Claude API key not configured');
      result = await callClaude(model, messages, apiKey, options);
      break;
    }
    case 'gemini': {
      const apiKey = getSetting('gemini_api_key', '') || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim().length < 10) throw new Error('Gemini API key not configured');
      result = await callGemini(model, messages, apiKey, options);
      break;
    }
    case 'openai': {
      const apiKey = getSetting('openai_api_key', '') || process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.trim().length < 10) throw new Error('OpenAI API key not configured');
      result = await callOpenAI(model, messages, apiKey, options);
      break;
    }
    case 'groq': {
      const apiKey = getSetting('groq_api_key', '');
      if (!apiKey || apiKey.trim().length < 10) throw new Error('Groq API key not configured');
      result = await callGroq(model, messages, apiKey, options);
      break;
    }
    case 'ollama': {
      result = await callOllama(model, messages, options);
      break;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  const latency_ms = Date.now() - startTime;
  const cost_usd = estimateCost(provider, model, result.tokens?.input || 0, result.tokens?.output || 0);

  console.log(`[LLM Router] ✅ ${provider}/${model} responded in ${latency_ms}ms (${result.tokens?.total || '?'} tokens, ~$${cost_usd.toFixed(4)})`);

  return {
    content: result.content,
    model: model,
    provider: provider,
    tokens: result.tokens,
    latency_ms,
    cost_usd
  };
}

/**
 * Try providers in failover chain order until one succeeds
 */
async function routeWithFailover(messages, options = {}) {
  const chain = getSetting('failover_chain', 'gemini,claude,openai,groq,ollama').split(',').map(s => s.trim());
  
  for (const providerId of chain) {
    const cfg = PROVIDERS[providerId];
    if (!cfg) continue;

    // Check availability
    if (providerId !== 'ollama') {
      const key = getSetting(cfg.settingKey, '');
      if (!key || key.trim().length < 10) continue;
    }

    const model = options.model || cfg.models[0];
    try {
      return await routeRequest(providerId, model, messages, options);
    } catch (err) {
      console.warn(`[LLM Router] ⚠️ ${providerId} failed: ${err.message}. Trying next...`);
    }
  }

  throw new Error('All LLM providers in failover chain failed. Configure at least one API key in Settings.');
}

// ─── Provider-Specific Callers ───────────────────────────────────────

async function callClaude(model, messages, apiKey, options = {}) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: options.maxTokens || 4096,
      messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content })),
      ...(messages.find(m => m.role === 'system') && {
        system: messages.find(m => m.role === 'system').content
      })
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 60000
    }
  );

  const data = response.data;
  return {
    content: data.content[0].text,
    tokens: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
      total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  };
}

async function callGemini(model, messages, apiKey, options = {}) {
  const userMessages = messages.filter(m => m.role !== 'system');
  const systemMsg = messages.find(m => m.role === 'system');
  
  // Build contents array for multi-turn
  const contents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature || 0.2,
      maxOutputTokens: options.maxTokens || 4096,
      ...(options.jsonMode && { responseMimeType: 'application/json' })
    }
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    body,
    { timeout: 60000 }
  );

  const candidate = response.data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  const usage = response.data?.usageMetadata || {};

  return {
    content: text,
    tokens: {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
      total: usage.totalTokenCount || 0
    }
  };
}

async function callOpenAI(model, messages, apiKey, options = {}) {
  const body = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.2
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    body,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 60000
    }
  );

  const data = response.data;
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

async function callGroq(model, messages, apiKey, options = {}) {
  const body = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.2
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    body,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000
    }
  );

  const data = response.data;
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

async function callOllama(model, messages, options = {}) {
  const endpoint = getSetting('ollama_endpoint', 'http://localhost:11434');
  const targetModel = model || (PROVIDERS.ollama.models && PROVIDERS.ollama.models[0]) || 'gemma4:e4b';

  const response = await axios.post(
    `${endpoint}/api/chat`,
    {
      model: targetModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options.temperature || 0.3,
        num_predict: options.maxTokens || 1024
      }
    },
    { timeout: 12000 }
  );

  const data = response.data;
  return {
    content: data.message?.content || '',
    tokens: {
      input: data.prompt_eval_count || 0,
      output: data.eval_count || 0,
      total: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  };
}

/**
 * Estimate cost in USD for a request
 */
function estimateCost(provider, model, inputTokens, outputTokens) {
  if (provider === 'ollama') return 0;
  const rates = COST_TABLE[model];
  if (!rates) return 0;
  return (inputTokens * rates[0] / 1_000_000) + (outputTokens * rates[1] / 1_000_000);
}

module.exports = {
  PROVIDERS,
  getAvailableProviders,
  routeRequest,
  routeWithFailover,
  estimateCost
};
