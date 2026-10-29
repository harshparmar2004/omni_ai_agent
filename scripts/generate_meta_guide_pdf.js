const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const targetPdfPath = path.join(__dirname, '../docs/Meta_Graph_API_Multi_Account_Master_Guide.pdf');
const brainPdfPath = 'C:\\Users\\harsh parmar\\.gemini\\antigravity\\brain\\49c908e9-b1f1-4386-9d48-c4083b2e5aaa\\Meta_Graph_API_Multi_Account_Master_Guide.pdf';

// Ensure docs directory exists
if (!fs.existsSync(path.dirname(targetPdfPath))) {
  fs.mkdirSync(path.dirname(targetPdfPath), { recursive: true });
}

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true
});

const writeStream = fs.createWriteStream(targetPdfPath);
doc.pipe(writeStream);

// Color Palette
const COLORS = {
  primary: '#0F172A',       // Slate 900
  accent: '#2563EB',        // Blue 600
  accentDark: '#1D4ED8',    // Blue 700
  teal: '#0D9488',          // Teal 600
  body: '#334155',          // Slate 700
  muted: '#64748B',         // Slate 500
  border: '#E2E8F0',        // Slate 200
  calloutBg: '#F8FAFC',     // Slate 50
  codeBg: '#1E293B',        // Slate 800
  codeText: '#38BDF8',      // Sky 400
  warnBorder: '#F59E0B',    // Amber 500
  warnBg: '#FEF3C7',        // Amber 100
  success: '#16A34A',       // Green 600
};

// Helper: Ensure Space
function ensureSpace(neededHeight = 60) {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

// Helper: Draw Section Header
function drawSectionHeader(numberStr, title) {
  ensureSpace(70);
  doc.moveDown(0.8);
  
  const y = doc.y;
  doc.rect(50, y, 4, 22).fill(COLORS.accent);
  
  doc.fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .fontSize(16)
     .text(`  ${numberStr}  ${title}`, 58, y + 2, { width: 490 });
  
  doc.moveDown(0.4);
  doc.strokeColor(COLORS.border)
     .lineWidth(1)
     .moveTo(50, doc.y)
     .lineTo(545, doc.y)
     .stroke();
  doc.moveDown(0.6);
}

// Helper: Draw Subheading
function drawSubheading(title) {
  ensureSpace(45);
  doc.moveDown(0.5);
  doc.fillColor(COLORS.accentDark)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text(title, { width: 495 });
  doc.moveDown(0.3);
}

// Helper: Paragraph Text
function drawParagraph(text) {
  ensureSpace(30);
  doc.fillColor(COLORS.body)
     .font('Helvetica')
     .fontSize(9.5)
     .lineGap(3)
     .text(text, { width: 495, align: 'justify' });
  doc.moveDown(0.4);
}

// Helper: Bullet Item
function drawBullet(title, desc) {
  ensureSpace(30);
  doc.fillColor(COLORS.accent)
     .font('Helvetica-Bold')
     .fontSize(9.5)
     .text('• ', { continued: true, width: 495 })
     .fillColor(COLORS.primary)
     .text(title + (desc ? ': ' : ''), { continued: !!desc })
     .fillColor(COLORS.body)
     .font('Helvetica')
     .text(desc || '');
  doc.moveDown(0.25);
}

// Helper: Step Item
function drawStep(stepNum, title, details) {
  ensureSpace(40);
  doc.fillColor(COLORS.accent)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(`Step ${stepNum}: `, { continued: true })
     .fillColor(COLORS.primary)
     .text(title);
  
  if (details && details.length > 0) {
    doc.moveDown(0.2);
    details.forEach(item => {
      doc.fillColor(COLORS.muted)
         .font('Helvetica')
         .fontSize(9)
         .text(`   ▸  ${item}`, { width: 480, lineGap: 2 });
    });
  }
  doc.moveDown(0.4);
}

// Helper: Callout Box
function drawCallout(type, title, text) {
  ensureSpace(60);
  doc.moveDown(0.4);
  const startY = doc.y;
  const isWarn = type === 'WARNING' || type === 'IMPORTANT';
  const borderColor = isWarn ? COLORS.warnBorder : COLORS.accent;
  const bgColor = isWarn ? '#FFFBEB' : COLORS.calloutBg;

  // Measure text height
  doc.font('Helvetica').fontSize(9);
  const textHeight = doc.heightOfString(text, { width: 460 });
  const totalBoxHeight = textHeight + 28;

  // Draw background & left bar
  doc.rect(50, startY, 495, totalBoxHeight).fill(bgColor);
  doc.rect(50, startY, 4, totalBoxHeight).fill(borderColor);

  // Draw title & text
  doc.fillColor(borderColor)
     .font('Helvetica-Bold')
     .fontSize(9.5)
     .text(`${isWarn ? '⚠️ ' : 'ℹ️ '}${title}`, 62, startY + 8, { width: 470 });
  
  doc.fillColor(COLORS.body)
     .font('Helvetica')
     .fontSize(8.8)
     .lineGap(2)
     .text(text, 62, startY + 22, { width: 470 });

  doc.y = startY + totalBoxHeight + 8;
}

// Helper: Code Box
function drawCodeBox(codeSnippet) {
  ensureSpace(70);
  doc.moveDown(0.4);
  const startY = doc.y;
  
  doc.font('Courier').fontSize(8);
  const textHeight = doc.heightOfString(codeSnippet, { width: 475 });
  const boxHeight = textHeight + 16;

  doc.rect(50, startY, 495, boxHeight).fill(COLORS.codeBg);
  
  doc.fillColor(COLORS.codeText)
     .font('Courier')
     .fontSize(8)
     .lineGap(2)
     .text(codeSnippet, 60, startY + 8, { width: 475 });

  doc.y = startY + boxHeight + 8;
}

// Helper: Table
function drawTable(headers, rows, colWidths) {
  ensureSpace(rowHeight => (rows.length + 1) * 24);
  doc.moveDown(0.4);
  const startY = doc.y;
  let currentY = startY;

  // Header background
  doc.rect(50, currentY, 495, 20).fill(COLORS.primary);
  
  let currentX = 55;
  headers.forEach((h, i) => {
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(8.5)
       .text(h, currentX, currentY + 5, { width: colWidths[i] - 10, align: 'left' });
    currentX += colWidths[i];
  });
  currentY += 20;

  // Rows
  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    doc.rect(50, currentY, 495, 22).fill(isEven ? '#F8FAFC' : '#FFFFFF');
    doc.strokeColor(COLORS.border).lineWidth(0.5).rect(50, currentY, 495, 22).stroke();

    let cellX = 55;
    row.forEach((cell, cellIndex) => {
      doc.fillColor(cellIndex === 0 ? COLORS.primary : COLORS.body)
         .font(cellIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(8)
         .text(cell, cellX, currentY + 6, { width: colWidths[cellIndex] - 10, align: 'left' });
      cellX += colWidths[cellIndex];
    });
    currentY += 22;
  });

  doc.y = currentY + 10;
}

// ==========================================
// DOCUMENT GENERATION
// ==========================================

// COVER / HEADER BANNER
doc.rect(50, 45, 495, 95).fill(COLORS.primary);
doc.rect(50, 137, 495, 4).fill(COLORS.accent);

doc.fillColor('#FFFFFF')
   .font('Helvetica-Bold')
   .fontSize(20)
   .text('META GRAPH API MASTER GUIDE', 70, 62, { characterSpacing: 1 });

doc.fillColor(COLORS.codeText)
   .font('Helvetica')
   .fontSize(10)
   .text('Centralized Setup, Permanent System Tokens & 50+ Account Architecture', 70, 88);

doc.fillColor('#94A3B8')
   .font('Helvetica')
   .fontSize(8.5)
   .text('OmniStudio AI Engine Documentation • Targeted for Notion & Production Engineering', 70, 108);

doc.y = 160;

// SECTION 1: ARCHITECTURE
drawSectionHeader('01', 'Architecture & Centralized Scaling Model');

drawParagraph(
  'OmniStudio AI publishes automated video reels, AI-branded framing templates, and dynamic Instagram Stories directly through the official Meta Graph API (v21.0). When scaling up to 50+ accounts, creating separate Meta developer apps for each account creates unmanageable overhead. Instead, we implement a Centralized Hub-and-Spoke Architecture.'
);

drawTable(
  ['Component', 'Role in Ecosystem', 'Centralized Scope'],
  [
    ['1 Developer App', 'Registered in Meta Developers; manages Graph API calls', 'Shared across all 50+ accounts'],
    ['1 Business Portfolio', 'Meta Business Manager holding all company brand pages', 'Holds 50 Facebook Pages & 50 IG Accounts'],
    ['1 System User', 'Administrative service user (omni-bot-admin)', 'Granted Full Control on all 50 assets'],
    ['1 Permanent Token', 'Never-expiring access token generated via System User', 'One master credential runs the entire fleet']
  ],
  [120, 225, 150]
);

drawCallout(
  'IMPORTANT',
  'Permanent Token vs Standard User Token',
  'Standard User Tokens generated via Graph API Explorer expire after 60 days. System User Tokens created inside Meta Business Settings have NO expiration date ("Never"). You set it once, and the system runs continuously without manual token renewal.'
);

// SECTION 2: FOUNDATION
drawSectionHeader('02', 'Instagram & Facebook Foundation Setup');

drawParagraph(
  'Meta Graph API strictly requires that every automated Instagram account is converted to a Professional Account and linked to an associated Facebook Page.'
);

drawStep('2.1', 'Convert Instagram to a Professional Account', [
  'Open Instagram app > Profile > Hamburger Menu (≡) > Settings & Privacy.',
  'Scroll to "For professionals" > Tap "Account type and tools" > Switch to Professional Account.',
  'Select category (e.g. Video Creator, Gaming, or Entertainment). Choose Creator or Business.'
]);

drawStep('2.2', 'Create a Dedicated Facebook Page', [
  'Go to https://www.facebook.com/pages/create on desktop.',
  'Set Page Name matching your brand niche (e.g. "GTA 6 Updates 007" or "Movie Recommendations").',
  'Select category (Media/News Company or Video Creator) and click Create Page.'
]);

drawStep('2.3', 'Link Instagram to the Facebook Page', [
  'Switch profile into the newly created Facebook Page.',
  'Go to Settings & Privacy > Settings > Linked Accounts > Select Instagram.',
  'Click Connect Account > Enter Instagram credentials > Confirm.',
  'Toggle ON "Allow access to Instagram messages in Inbox". Status should show Connected.'
]);

// SECTION 3: DEVELOPER ACCOUNT & APP
drawSectionHeader('03', 'Meta for Developers Account & App Creation');

drawStep('3.1', 'Register as a Meta Developer', [
  'Navigate to https://developers.facebook.com/ and log into your primary Facebook account.',
  'Click Get Started > Accept Meta Developer Terms > Complete phone/email verification.'
]);

drawStep('3.2', 'Create the Master Application', [
  'Go to https://developers.facebook.com/apps/ and click Create App.',
  'Step 1 ("What do you want your app to do?"): Select "Other" > Click Next.',
  'Step 2 ("Select an app type"): Select "Business" > Click Next.',
  'App Display Name: Set to "OmniStudio Automation Engine". Add your active Contact Email.',
  'Business Account: Connect to your Meta Business Portfolio > Click Create App.'
]);

drawStep('3.3', 'Configure Products', [
  'In the App Dashboard, scroll to "Instagram Graph API" and click Set Up.',
  'Under App Roles, verify your developer account is listed as Administrator.'
]);

// SECTION 4: SYSTEM USER & PERMANENT TOKEN
drawSectionHeader('04', 'System User Setup & Generating Permanent Token');

drawParagraph(
  'This is the critical step to achieve zero-maintenance automation. We create an Admin System User inside Meta Business Manager and generate an access token with permanent validity.'
);

drawStep('4.1', 'Open Business Settings', [
  'Navigate to Meta Business Settings at https://business.facebook.com/settings/.',
  'Ensure all brand Facebook Pages and Instagram accounts are added under Accounts.'
]);

drawStep('4.2', 'Create the Admin System User', [
  'In the left sidebar, expand "Users" and click "System Users".',
  'Click "Add" > Set System Username: "omni-bot-admin".',
  'Crucial: Set System User Role to "Admin" (Employee role cannot publish content). Click Create.'
]);

drawStep('4.3', 'Assign All Brand Assets to System User', [
  'Select "omni-bot-admin" > Click "Assign Assets".',
  'Under Pages: Select all Facebook Pages > Toggle "Full Control (Manage Page)" to ON.',
  'Under Instagram Accounts: Select all IG Accounts > Toggle "Full Control" to ON.',
  'Under Apps: Select "OmniStudio Automation Engine" > Toggle "Full Control" to ON > Click Save.'
]);

drawStep('4.4', 'Generate Permanent Token with Required Scopes', [
  'Click "Generate New Token" on the omni-bot-admin panel.',
  'Select App: "OmniStudio Automation Engine".',
  'Token Expiration: Select "Never" (Permanent).',
  'Check the following required permissions (Scopes):'
]);

drawBullet('instagram_basic', 'Allows reading basic IG account profile and media IDs');
drawBullet('instagram_content_publish', 'MANDATORY — Allows uploading video reels and publishing stories');
drawBullet('instagram_manage_comments', 'Allows AI comment replying and engagement tracking');
drawBullet('instagram_manage_insights', 'Allows fetching virality metrics, view counts, and retention');
drawBullet('pages_show_list', 'Allows querying the list of managed Facebook Pages');
drawBullet('pages_read_engagement', 'Enables reading interaction data and page associations');
drawBullet('pages_manage_posts', 'Allows feed video container creation and webhook management');
drawBullet('business_management', 'Enables multi-account portfolio governance under one token');

drawCallout(
  'WARNING',
  'Save the Token Immediately',
  'Meta displays this permanent token ONCE upon creation. Copy it and store it in your password manager immediately. It will begin with "EAAG..." and is approximately 180-220 characters long.'
);

// SECTION 5: EXTRACTING IDS & VERIFICATION
drawSectionHeader('05', 'Extracting Account IDs & Token Debugging');

drawParagraph(
  'To target an account during an automated run, the agent requires the 17-digit Instagram Business Account ID (ig_user_id).'
);

drawStep('5.1', 'Extract ig_user_id via Meta Graph API Explorer', [
  'Open https://developers.facebook.com/tools/explorer/.',
  'Paste your Permanent Token into the "Access Token" input field.',
  'Enter the following query in the request bar and click Submit:'
]);

drawCodeBox('GET /me/accounts?fields=id,name,instagram_business_account{id,username}');

drawParagraph('The response will list all managed accounts. Locate the 17-digit ID:');

drawCodeBox(`{
  "data": [
    {
      "id": "104829104810294", // Facebook Page ID
      "name": "GTA 6 Updates 007",
      "instagram_business_account": {
        "id": "17841428668115319", // <--- THIS IS YOUR ig_user_id
        "username": "gta6_updates_007"
      }
    }
  ]
}`);

drawStep('5.2', 'Verify Token Health in Access Token Debugger', [
  'Visit https://developers.facebook.com/tools/debug/accesstoken/.',
  'Paste your token and click Debug. Confirm: Type = SYSTEM_USER, Expires = Never.'
]);

// SECTION 6: CONNECTING TO OMNISTUDIO
drawSectionHeader('06', 'Connecting to OmniStudio AI & GitHub Actions');

drawParagraph('To deploy the agent locally or to 24/7 cloud runners, populate the following credentials:');

drawSubheading('1. Environment Variables (.env)');
drawCodeBox(`# Meta Graph API Master Credentials
INSTAGRAM_ACCESS_TOKEN="EAAG..."
INSTAGRAM_PAGE_ID="17841428668115319"
FB_PAGE_ID="104829104810294"

# Telegram Real-time Publishing Notifications
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuVWxYz"
TELEGRAM_ADMIN_CHAT_ID="5443723531"

# Instagram Scout Burner Cookie (Bypasses Datacenter Login Wall)
INSTAGRAM_SESSION_ID="YOUR_BURNER_SESSION_ID"`);

drawSubheading('2. GitHub Actions Secrets (For 24/7 Cloud Automation)');
drawParagraph(
  'Go to GitHub Repo > Settings > Secrets and variables > Actions > Add Secrets: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_PAGE_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and INSTAGRAM_SESSION_ID.'
);

// SECTION 7: SCALING TO 50+ ACCOUNTS
drawSectionHeader('07', 'Scaling to 50+ Accounts: 3-Minute Onboarding SOP');

drawParagraph(
  'When adding account #3, #10, or #50, NEVER create a new Meta Developer App. Use this 3-minute onboarding procedure:'
);

drawStep('1', 'Create Account & Link', ['Convert new IG to Professional > Create FB Page > Link IG to FB Page.']);
drawStep('2', 'Add to Business Manager', ['Go to business.facebook.com/settings/pages > Add Page.']);
drawStep('3', 'Assign to System User', ['Go to Users > System Users > omni-bot-admin > Assign Assets > Grant Full Control on new Page.']);
drawStep('4', 'Query New ig_user_id', ['Run GET /me/accounts in Graph Explorer to get the 17-digit ID.']);
drawStep('5', 'Register in SQLite Database', [
  'Add a single row to the pages table in database.sqlite (or via the web dashboard):'
]);

drawCodeBox(`INSERT INTO pages (name, handle, ig_user_id, post_mode, is_active, daily_quota, access_token)
VALUES ('Crypto Alpha', '@crypto_alpha_007', '17841499999999999', 'auto', 1, 7, 'EAAG...');`);

drawStep('6', 'Define Competitors', ['Add competitor creator handles into config/competitors.json.']);

// SECTION 8: TROUBLESHOOTING
drawSectionHeader('08', 'Troubleshooting & Error Matrix');

drawTable(
  ['Error Code', 'Root Cause', 'Immediate Solution'],
  [
    ['Error 190', 'Token expired or revoked', 'Check Token Debugger. Generate System User token with "Never" expiry.'],
    ['Error 200 / 10', 'Missing publish permission', 'Assign asset to omni-bot-admin with Full Control; verify scopes.'],
    ['Error 36003', 'Invalid video aspect ratio', 'OmniStudio FFmpeg helper automatically transcodes to 1080x1920.'],
    ['302 Redirect', 'IG Datacenter login wall', 'Update INSTAGRAM_SESSION_ID secret with fresh burner scout cookie.']
  ],
  [85, 170, 240]
);

// FOOTER & PAGE NUMBERING (Applied to all pages)
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  
  // Header line (Skip on page 0)
  if (i > 0) {
    doc.fillColor(COLORS.muted)
       .font('Helvetica')
       .fontSize(7.5)
       .text('OmniStudio AI • Meta Graph API & Multi-Account Architecture Guide', 50, 28, { width: 495 });
    
    doc.strokeColor(COLORS.border)
       .lineWidth(0.5)
       .moveTo(50, 40)
       .lineTo(545, 40)
       .stroke();
  }

  // Footer line
  doc.strokeColor(COLORS.border)
     .lineWidth(0.5)
     .moveTo(50, doc.page.height - 40)
     .lineTo(545, doc.page.height - 40)
     .stroke();

  doc.fillColor(COLORS.muted)
     .font('Helvetica')
     .fontSize(7.5)
     .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 32, { align: 'center', width: 495 });
  
  doc.text('Confidential • Internal Engineering & Notion Documentation', 50, doc.page.height - 32, { align: 'left' });
  doc.text('OmniStudio v7', 545 - 60, doc.page.height - 32, { align: 'right' });
}

doc.end();

writeStream.on('finish', () => {
  console.log('✅ PDF generated successfully at:', targetPdfPath);
  // Also copy to brain artifact directory
  try {
    fs.copyFileSync(targetPdfPath, brainPdfPath);
    console.log('✅ PDF copied to brain artifacts at:', brainPdfPath);
  } catch (err) {
    console.error('Copy to brain error:', err.message);
  }
});
