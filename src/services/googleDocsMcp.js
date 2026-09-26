const { google } = require('googleapis');
const { getDb, getSetting, setSetting } = require('../database');

/**
 * Google Docs MCP Integration Service
 * Pushes research documents to Google Docs and maintains public sharing links
 */

/**
 * Get authenticated Google API client
 */
function getGoogleAuth() {
  const clientId = getSetting('google_client_id', '');
  const clientSecret = getSetting('google_client_secret', '');
  const refreshToken = getSetting('google_refresh_token', '');

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4000/api/oauth/google/callback');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Generate OAuth2 authorization URL
 */
function getAuthUrl() {
  const clientId = getSetting('google_client_id', '');
  const clientSecret = getSetting('google_client_secret', '');

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Google Client ID and Secret must be configured in Settings' };
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4000/api/oauth/google/callback');
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });

  return { success: true, url };
}

/**
 * Exchange authorization code for refresh token
 */
async function exchangeCode(code) {
  const clientId = getSetting('google_client_id', '');
  const clientSecret = getSetting('google_client_secret', '');

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4000/api/oauth/google/callback');
  const { tokens } = await oauth2Client.getToken(code);

  if (tokens.refresh_token) {
    setSetting('google_refresh_token', tokens.refresh_token);
    setSetting('google_docs_enabled', 'true');
    console.log('[Google Docs MCP] ✅ OAuth2 tokens saved successfully');
  }

  return { success: true, hasRefreshToken: !!tokens.refresh_token };
}

/**
 * Push a research deliverable to Google Docs
 * @param {number} deliverableId - Deliverable ID from database
 * @returns {{ success, docId, docUrl }}
 */
async function pushToGoogleDocs(deliverableId) {
  const enabled = getSetting('google_docs_enabled', 'false');
  if (enabled !== 'true') {
    return { success: false, error: 'Google Docs integration is not enabled. Connect your Google account in Settings.' };
  }

  const auth = getGoogleAuth();
  if (!auth) {
    return { success: false, error: 'Google OAuth2 not configured. Please connect your Google account.' };
  }

  const db = getDb();
  const deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(deliverableId);
  if (!deliverable) {
    return { success: false, error: 'Deliverable not found' };
  }

  // Also get the campaign for extra metadata
  const campaign = deliverable.campaign_id
    ? db.prepare('SELECT * FROM research_campaigns WHERE id = ?').get(deliverable.campaign_id)
    : null;

  try {
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Check if doc already exists (update instead of create)
    if (deliverable.google_doc_id) {
      console.log(`[Google Docs MCP] 📝 Updating existing doc: ${deliverable.google_doc_id}`);
      await updateExistingDoc(docs, deliverable);
      const docUrl = `https://docs.google.com/document/d/${deliverable.google_doc_id}/edit`;
      return { success: true, docId: deliverable.google_doc_id, docUrl };
    }

    // Create new document
    console.log(`[Google Docs MCP] 📄 Creating new Google Doc: "${deliverable.title}"`);
    const createRes = await docs.documents.create({
      requestBody: {
        title: deliverable.title
      }
    });

    const docId = createRes.data.documentId;

    // Insert content
    const requests = buildDocContent(deliverable, campaign);
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests }
      });
    }

    // Set sharing to "Anyone with the link can view"
    await drive.permissions.create({
      fileId: docId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Move to folder if specified
    const folderId = getSetting('google_docs_folder_id', '');
    if (folderId) {
      try {
        await drive.files.update({
          fileId: docId,
          addParents: folderId,
          fields: 'id, parents'
        });
      } catch (e) {
        console.warn(`[Google Docs MCP] Could not move to folder: ${e.message}`);
      }
    }

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    // Save doc ID and URL to database
    try {
      db.prepare('UPDATE deliverables SET google_doc_id = ?, google_doc_url = ? WHERE id = ?')
        .run(docId, docUrl, deliverableId);
    } catch (e) { /* Column might not exist */ }

    console.log(`[Google Docs MCP] ✅ Doc created and shared: ${docUrl}`);

    return { success: true, docId, docUrl };

  } catch (err) {
    console.error(`[Google Docs MCP] ❌ Failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing Google Doc with new content
 */
async function updateExistingDoc(docs, deliverable) {
  // Get current doc to find end index
  const doc = await docs.documents.get({ documentId: deliverable.google_doc_id });
  const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex || 1;

  // Clear existing content (keep first paragraph)
  if (endIndex > 2) {
    await docs.documents.batchUpdate({
      documentId: deliverable.google_doc_id,
      requestBody: {
        requests: [{
          deleteContentRange: {
            range: { startIndex: 1, endIndex: endIndex - 1 }
          }
        }]
      }
    });
  }

  // Re-insert content
  const requests = buildDocContent(deliverable, null);
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: deliverable.google_doc_id,
      requestBody: { requests }
    });
  }
}

/**
 * Build Google Docs API insert requests from markdown content
 * Note: Simplified markdown-to-docs conversion (headings, paragraphs, code blocks)
 */
function buildDocContent(deliverable, campaign) {
  const requests = [];
  const content = deliverable.markdown_content || deliverable.title;
  const lines = content.split('\n');
  
  let insertIndex = 1;

  for (const line of lines) {
    if (!line.trim()) {
      // Empty line = paragraph break
      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: '\n'
        }
      });
      insertIndex += 1;
      continue;
    }

    // Heading detection
    let text = line;
    let headingLevel = 0;
    if (line.startsWith('### ')) { text = line.substring(4); headingLevel = 3; }
    else if (line.startsWith('## ')) { text = line.substring(3); headingLevel = 2; }
    else if (line.startsWith('# ')) { text = line.substring(2); headingLevel = 1; }

    requests.push({
      insertText: {
        location: { index: insertIndex },
        text: text + '\n'
      }
    });

    if (headingLevel > 0) {
      const namedStyle = headingLevel === 1 ? 'HEADING_1' : headingLevel === 2 ? 'HEADING_2' : 'HEADING_3';
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: insertIndex, endIndex: insertIndex + text.length + 1 },
          paragraphStyle: { namedStyleType: namedStyle },
          fields: 'namedStyleType'
        }
      });
    }

    insertIndex += text.length + 1;
  }

  // Add footer
  const footer = `\n\n---\nGenerated by OmniResearch AI | ${new Date().toLocaleDateString()}\nPublic URL: ${deliverable.public_url || 'N/A'}\n`;
  requests.push({
    insertText: {
      location: { index: insertIndex },
      text: footer
    }
  });

  return requests;
}

/**
 * Check if Google Docs integration is available
 */
function isGoogleDocsEnabled() {
  return getSetting('google_docs_enabled', 'false') === 'true' && !!getGoogleAuth();
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  pushToGoogleDocs,
  isGoogleDocsEnabled
};
