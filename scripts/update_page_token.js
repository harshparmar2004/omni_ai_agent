#!/usr/bin/env node

/**
 * OmniStudio v7 — Page Meta Graph API Token Utility
 * Usage:
 *   node scripts/update_page_token.js --test
 *   node scripts/update_page_token.js --page=1 --token="YOUR_NEW_META_TOKEN"
 *   node scripts/update_page_token.js --page=2 --token="YOUR_NEW_META_TOKEN"
 */

const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
function getArg(flag, defaultValue = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) return args[i + 1];
    if (args[i].startsWith(`${flag}=`)) return args[i].slice(flag.length + 1);
  }
  return defaultValue;
}

const pageArg = getArg('--page') || '1';
const newToken = getArg('--token') || '';
const isTestOnly = args.includes('--test') || !newToken;

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
const page = db.prepare('SELECT * FROM pages WHERE id = ? OR slug = ?').get(pageArg, pageArg);

if (!page) {
  console.error(`❌ Page "${pageArg}" not found in database.`);
  process.exit(1);
}

console.log('======================================================');
console.log(`📱 OmniStudio Meta Token Diagnostic — Page #${page.id}: ${page.name} (${page.handle})`);
console.log('======================================================');

const tokenToTest = newToken || page.access_token;
if (!tokenToTest) {
  console.error('❌ No access token found to test. Provide --token="YOUR_TOKEN"');
  process.exit(1);
}

async function run() {
  const baseUrl = 'https://graph.instagram.com/v21.0';
  console.log(`\n🔍 Validating token with Meta Graph API (${baseUrl})...`);

  try {
    const meRes = await axios.get(`${baseUrl}/me`, {
      params: {
        fields: 'id,username,account_type',
        access_token: tokenToTest
      },
      timeout: 10000
    });

    console.log('✅ Meta /me Handshake Successful!');
    console.log(`   • Instagram Account ID: ${meRes.data.id}`);
    console.log(`   • Username: @${meRes.data.username}`);
    console.log(`   • Account Type: ${meRes.data.account_type || 'BUSINESS / CREATOR'}`);

    // Check publishing limit
    try {
      const limitRes = await axios.get(`${baseUrl}/${meRes.data.id}/content_publishing_limit`, {
        params: { fields: 'config,quota_usage', access_token: tokenToTest },
        timeout: 8000
      });
      const limitData = limitRes.data?.data?.[0];
      if (limitData) {
        console.log(`   • 24h Quota Limit: ${limitData.config?.quota_total || 25} posts`);
        console.log(`   • 24h Quota Used: ${limitData.quota_usage || 0} posts`);
      }
    } catch (e) {
      console.log('   • Quota Limit Check: Notice (Standard rate limits apply)');
    }

    if (newToken) {
      db.prepare('UPDATE pages SET access_token = ?, ig_user_id = ?, handle = ? WHERE id = ?')
        .run(newToken, meRes.data.id, `@${meRes.data.username}`, page.id);

      if (page.id === 1) {
        try {
          db.prepare("UPDATE settings SET value = ? WHERE key = 'meta_page_token'").run(newToken);
          db.prepare("UPDATE settings SET value = ? WHERE key = 'meta_ig_user_id'").run(meRes.data.id);
        } catch (e) {}
      }

      console.log(`\n💾 Database Updated Successfully for Page #${page.id}!`);
      console.log(`   Token prefix: ${newToken.substring(0, 15)}...${newToken.slice(-6)}`);
      console.log('\n👉 Next Step: Update your GitHub Repository Secret:');
      const secretName = page.id === 2 ? 'MOVIE_META_ACCESS_TOKEN' : (page.id === 3 ? 'CLUBBING_META_ACCESS_TOKEN (or TECH_META_ACCESS_TOKEN)' : 'META_ACCESS_TOKEN');
      console.log(`   Go to GitHub Repository -> Settings -> Secrets and variables -> Actions`);
      console.log(`   Update secret: ${secretName}`);
    } else {
      console.log('\n🎉 Current token is ACTIVE and fully functional!');
    }

  } catch (err) {
    console.error('\n❌ Meta API Rejected Token:');
    if (err.response?.data?.error) {
      const error = err.response.data.error;
      console.error(`   • Message: ${error.message}`);
      console.error(`   • Code: ${error.code} (${error.type})`);
      if (error.error_subcode) console.error(`   • Subcode: ${error.error_subcode}`);
      if (error.code === 190) {
        console.error('\n🔑 REASON: The Instagram access token has been revoked or expired.');
        console.error('   This happens when the account password is changed or the 60-day session expires.');
        console.error('\n👉 TO FIX:');
        console.error('   1. Go to developers.facebook.com -> My Apps -> Your Instagram App');
        console.error('   2. Under Instagram API -> Generate Tokens, generate a fresh token for this account');
        console.error('   3. Run:');
        console.log(`      node scripts/update_page_token.js --page=${page.id} --token="<NEW_TOKEN>"`);
      }
    } else {
      console.error(`   • Error: ${err.message}`);
    }
    process.exit(1);
  }
}

run();
