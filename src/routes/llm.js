const express = require('express');
const router = express.Router();
const { getAvailableProviders, routeRequest, PROVIDERS } = require('../services/llmRouter');
const { getSetting } = require('../database');

/**
 * LLM Provider Management Routes
 * List providers, test connections, get models
 */

// GET /api/llm/providers — List all configured providers with availability
router.get('/providers', (req, res) => {
  try {
    const providers = getAvailableProviders();
    const defaultProvider = getSetting('default_provider', 'gemini');
    const failoverChain = getSetting('failover_chain', 'gemini,claude,openai,groq,ollama');

    res.json({
      success: true,
      defaultProvider,
      failoverChain: failoverChain.split(',').map(s => s.trim()),
      providers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/llm/test — Test a specific provider connection
router.post('/test', async (req, res) => {
  try {
    const { provider, model } = req.body || {};
    if (!provider) return res.status(400).json({ error: 'provider is required' });

    const cfg = PROVIDERS[provider];
    if (!cfg) return res.status(404).json({ error: `Unknown provider: ${provider}` });

    const selectedModel = model || cfg.models[0];
    const testMessages = [
      { role: 'user', content: 'Reply with exactly: CONNECTION_OK' }
    ];

    const result = await routeRequest(provider, selectedModel, testMessages, { maxTokens: 50 });

    res.json({
      success: true,
      provider,
      model: selectedModel,
      latency_ms: result.latency_ms,
      response: result.content.substring(0, 200),
      tokens: result.tokens
    });
  } catch (err) {
    res.json({
      success: false,
      provider: req.body?.provider,
      error: err.message
    });
  }
});

// GET /api/llm/models/:provider — Get available models for a provider
router.get('/models/:provider', (req, res) => {
  const provider = PROVIDERS[req.params.provider];
  if (!provider) {
    return res.status(404).json({ error: `Unknown provider: ${req.params.provider}` });
  }
  res.json({
    success: true,
    provider: req.params.provider,
    name: provider.name,
    models: provider.models
  });
});

module.exports = router;
