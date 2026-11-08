const assert = require('assert');
const axios = require('axios');
const { getSetting, setSetting, getPageBySlug, deletePage } = require('../src/database');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';

async function runVaultTests() {
  console.log('🧪 Starting Zero-Env Vault Sync & Multi-Tenant Tests...\n');

  const masterKey = 'test_master_secret_12345';
  setSetting('omni_master_key', masterKey);

  // Test 1: GET /api/system/vault/sync without master key should return 401
  console.log('Test 1: Unauthorized access to /api/system/vault/sync');
  try {
    await axios.get(`${BASE_URL}/api/system/vault/sync`, {
      headers: { 'x-master-key': 'wrong_key' }
    });
    assert.fail('Should have failed with 401');
  } catch (err) {
    assert.strictEqual(err.response?.status, 401, 'Expected 401 Unauthorized');
    console.log('  ✓ Correctly rejected unauthorized vault sync attempt');
  }

  // Test 2: GET /api/system/vault/sync with valid master key
  console.log('Test 2: Authorized access to /api/system/vault/sync');
  const res = await axios.get(`${BASE_URL}/api/system/vault/sync`, {
    headers: { 'x-master-key': masterKey }
  });
  assert.strictEqual(res.status, 200, 'Expected 200 OK');
  assert(res.data && res.data.pages, 'Vault should contain pages mapping');
  assert(res.data.total_pages >= 1, 'Vault should list existing pages');
  console.log(`  ✓ Authorized vault sync returned ${res.data.total_pages} pages`);

  // Test 3: POST /api/system/vault/sync import
  console.log('Test 3: Remote Vault Push via POST /api/system/vault/sync');
  const testSlug = 'temp_test_page_vault';
  const importPayload = {
    pages: {
      [testSlug]: {
        name: 'Temporary Test Destination',
        handle: '@temp_test_vault',
        access_token: 'EAATestToken1234567890abcdef',
        ig_user_id: '17841400099999999',
        template_slug: 'default',
        is_active: 1
      }
    }
  };

  const importRes = await axios.post(`${BASE_URL}/api/system/vault/sync`, {
    vault: importPayload
  }, {
    headers: { 'x-master-key': masterKey }
  });

  assert.strictEqual(importRes.status, 200, 'Import should succeed');
  assert(importRes.data.created >= 1 || importRes.data.updated >= 1, 'Should create or update page');

  const createdPage = getPageBySlug(testSlug);
  assert(createdPage, 'Page should now exist in database');
  assert.strictEqual(createdPage.handle, '@temp_test_vault');
  console.log(`  ✓ Imported page ${createdPage.handle} directly through remote vault sync`);

  // Clean up
  deletePage(createdPage.id);
  console.log('  ✓ Cleaned up test page from vault');

  // Test 4: Reset master key to default
  setSetting('omni_master_key', 'omni_vault_master_secret');

  console.log('\n🎉 All Vault Sync Tests Passed Successfully!');
}

runVaultTests().catch(err => {
  console.error('❌ Vault Test Failed:', err.message, err.response?.data || '');
  process.exit(1);
});
