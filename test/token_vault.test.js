const assert = require('assert');
const {
  exportVaultObject,
  exportVaultBase64,
  importVault
} = require('../src/core/tokenVault');
const { createPage, deletePage, getPageBySlug } = require('../src/database');

console.log('🧪 Testing OmniStudio v8 Token Vault...');

const runId = Date.now();
const testSlug = `vault_test_${runId}`;

// 1. Create a page to test vault export
const p = createPage({
  slug: testSlug,
  name: 'Vault Test Channel',
  handle: `@${testSlug}`,
  ig_user_id: '9988776655',
  access_token: 'VAULT_SECRET_TOKEN_XYZ123',
  niche: 'vault_test'
});

// 2. Export Vault
const vaultObj = exportVaultObject();
assert(vaultObj.pages[testSlug], 'Exported vault must contain test page');
assert.strictEqual(vaultObj.pages[testSlug].access_token, 'VAULT_SECRET_TOKEN_XYZ123');
console.log(`✓ Vault exported ${vaultObj.total_pages} pages successfully`);

const base64Str = exportVaultBase64();
assert(typeof base64Str === 'string' && base64Str.length > 50, 'Base64 export should be non-empty string');
console.log('✓ Vault Base64 serialization verified');

// 3. Import Vault (update existing + create new)
const newSlug = `vault_imported_${runId}`;
const sampleVault = {
  version: '8.0.0',
  pages: {
    [testSlug]: {
      name: 'Updated Vault Channel Name',
      handle: `@${testSlug}`,
      ig_user_id: '9988776655',
      access_token: 'VAULT_SECRET_TOKEN_UPDATED'
    },
    [newSlug]: {
      name: 'Imported Brand Channel',
      handle: `@${newSlug}`,
      ig_user_id: '1122334455',
      access_token: 'IMPORTED_TOKEN_AAA'
    }
  }
};

const importRes = importVault(sampleVault);
assert.strictEqual(importRes.updated, 1, 'Should update 1 existing page');
assert.strictEqual(importRes.created, 1, 'Should create 1 new page');
console.log('✓ Vault import executed (1 created, 1 updated)');

// Verify updated
const updatedPage = getPageBySlug(testSlug);
assert.strictEqual(updatedPage.access_token, 'VAULT_SECRET_TOKEN_UPDATED');

const createdPage = getPageBySlug(newSlug);
assert(createdPage && createdPage.access_token === 'IMPORTED_TOKEN_AAA');

// Cleanup
deletePage(p.id);
deletePage(createdPage.id);

console.log('✅ All Token Vault Tests Passed cleanly!\n');
