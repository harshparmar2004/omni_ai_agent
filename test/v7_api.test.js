const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('OmniStudio v7 HTTP API Endpoints Test Suite', async (t) => {
  let server;
  let baseUrl;

  await t.test('Setup test server', () => {
    return new Promise((resolve) => {
      // Listen on ephemeral port for tests
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/system/health', async () => {
    const res = await fetch(`${baseUrl}/api/system/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'online');
    assert.equal(data.version, '7.0');
    assert.equal(data.database, 'ok');
  });

  await t.test('GET /api/pages', async () => {
    const res = await fetch(`${baseUrl}/api/pages`);
    assert.equal(res.status, 200);
    const pages = await res.json();
    assert.ok(Array.isArray(pages));
    assert.ok(pages.length > 0);
    const gta6 = pages.find(p => p.slug === 'gta6');
    assert.ok(gta6);
    assert.ok(gta6.access_token_masked);
    assert.ok(!gta6.access_token_masked.includes('OTN2ZAE8'), 'Never expose unmasked token in API');
  });

  await t.test('GET /api/sources', async () => {
    const res = await fetch(`${baseUrl}/api/sources`);
    assert.equal(res.status, 200);
    const sources = await res.json();
    assert.ok(Array.isArray(sources));
  });

  await t.test('GET /api/watchtower/status', async () => {
    const res = await fetch(`${baseUrl}/api/watchtower/status`);
    assert.equal(res.status, 200);
    const status = await res.json();
    assert.equal(typeof status.paused, 'boolean');
    assert.equal(typeof status.isScanning, 'boolean');
  });

  await t.test('GET /api/jobs', async () => {
    const res = await fetch(`${baseUrl}/api/jobs`);
    assert.equal(res.status, 200);
    const jobs = await res.json();
    assert.ok(Array.isArray(jobs));
  });

  await t.test('GET /api/settings', async () => {
    const res = await fetch(`${baseUrl}/api/settings`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.settings);
  });

  await t.test('POST /api/reposter/jobs (Validation error on empty URL)', async () => {
    const res = await fetch(`${baseUrl}/api/reposter/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await t.test('Teardown test server', () => {
    return new Promise((resolve) => {
      const { closeTunnel } = require('../src/core/tunnelService');
      closeTunnel();
      server.close(() => resolve());
    });
  });
});
