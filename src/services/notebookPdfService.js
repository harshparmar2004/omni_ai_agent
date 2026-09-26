const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { resolveTechProfile } = require('./logoService');
const { get14PageCurriculum } = require('./notebookCurriculum');

const NOTEBOOK_COLORS = {
  paperBg: '#FCFCF9',
  ruledLine: '#D6E4F8',
  marginLine: '#EF5350',
  marginSub: '#FFCDD2',
  spineBlack: '#1C1917',
  coilSilver: '#888888',
  coilHighlight: '#DDDDDD',
  
  // Hand inks
  inkBlack: '#1C1917',
  inkBlue: '#1565C0',
  inkDarkBlue: '#0D47A1',
  inkRed: '#C62828',
  inkGreen: '#2E7D32',
  inkPurple: '#6A1B9A',
  inkGray: '#555555',
  
  // Containers
  boxBorder: '#3F51B5',
  boxBg: '#FFFFFF',
  tagBg: '#F3F6FD',
  tagBorder: '#3F51B5'
};

/**
 * Register authentic handwritten fonts
 */
function registerFonts(doc) {
  try {
    const regularFont = 'C:/Windows/Fonts/segoepr.ttf';
    const boldFont = 'C:/Windows/Fonts/segoeprb.ttf';

    if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
      doc.registerFont('Hand', regularFont);
      doc.registerFont('Hand-Bold', boldFont);
      return { regular: 'Hand', bold: 'Hand-Bold' };
    }
  } catch (e) {
    console.warn('[Font Register Warning]:', e.message);
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

/**
 * Draw ruled paper background with spiral wire coils
 */
function drawNotebookBackground(doc) {
  const width = doc.page.width;
  const height = doc.page.height;

  // Paper background (Warm ivory)
  doc.rect(0, 0, width, height).fillColor(NOTEBOOK_COLORS.paperBg).fill();

  // Horizontal blue ruled lines (Spacious 24pt spacing = 32 lines)
  const lineSpacing = 24;
  doc.strokeColor(NOTEBOOK_COLORS.ruledLine).lineWidth(0.85);
  for (let y = 46; y < height - 20; y += lineSpacing) {
    doc.moveTo(56, y).lineTo(width - 24, y).stroke();
  }

  // Vertical red margin lines (Double red line matching physical notebooks)
  doc.strokeColor(NOTEBOOK_COLORS.marginLine).lineWidth(1.3);
  doc.moveTo(76, 0).lineTo(76, height).stroke();
  doc.strokeColor(NOTEBOOK_COLORS.marginSub).lineWidth(0.7);
  doc.moveTo(79, 0).lineTo(79, height).stroke();

  // Left Spiral Coil Binding (28 metallic wire loops)
  const coilCount = 28;
  const coilSpacing = (height - 40) / coilCount;

  for (let i = 0; i < coilCount; i++) {
    const cy = 25 + i * coilSpacing;

    // Punch hole
    doc.ellipse(24, cy + 6, 7, 5).fillColor('#262626').fill();
    doc.ellipse(24, cy + 6, 5, 3.5).fillColor('#0A0A0A').fill();

    // Wire Ring Loop
    doc.save();
    doc.strokeColor(NOTEBOOK_COLORS.spineBlack).lineWidth(3.6);
    doc.moveTo(10, cy).bezierCurveTo(38, cy - 4, 38, cy + 16, 10, cy + 12).stroke();

    // Metallic highlight on coil
    doc.strokeColor(NOTEBOOK_COLORS.coilHighlight).lineWidth(1.3);
    doc.moveTo(14, cy + 2).bezierCurveTo(34, cy - 1, 34, cy + 13, 14, cy + 10).stroke();
    doc.restore();
  }
}

/**
 * Draw Hand-drawn asterisk (3 crossed lines in blue ink)
 */
function drawHandAsterisk(doc, x, y, size = 6.5) {
  doc.save();
  doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.8);
  // Vertical line
  doc.moveTo(x, y - size).lineTo(x, y + size).stroke();
  // Diagonals
  const cos30 = 0.866;
  const sin30 = 0.5;
  doc.moveTo(x - size * cos30, y - size * sin30).lineTo(x + size * cos30, y + size * sin30).stroke();
  doc.moveTo(x - size * cos30, y + size * sin30).lineTo(x + size * cos30, y - size * sin30).stroke();
  doc.restore();
}

/**
 * Draw hand-drawn arrow
 */
function drawHandArrow(doc, x1, y1, x2, y2, color = NOTEBOOK_COLORS.inkBlue, lineWidth = 1.4, headSize = 5) {
  doc.save();
  doc.strokeColor(color).lineWidth(lineWidth);
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();

  // Angle
  const angle = Math.atan2(y2 - y1, x2 - x1);
  doc.moveTo(x2, y2).lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6)).stroke();
  doc.moveTo(x2, y2).lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6)).stroke();
  doc.restore();
}

/**
 * Draw Top Right Corner Badge (e.g. OOPs Notes, n8n Notes)
 */
function drawCornerTag(doc, text, fonts) {
  const width = doc.page.width;
  const boxW = 88;
  const boxH = 42;
  const x = width - boxW - 26;
  const y = 26;

  doc.roundedRect(x, y, boxW, boxH, 6)
     .fillColor(NOTEBOOK_COLORS.tagBg).fill();
  doc.roundedRect(x, y, boxW, boxH, 6)
     .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();

  const cleanText = (text || 'Tech Notes').replace(/[^\x20-\x7E]/g, '').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const l1 = words[0] || 'Tech';
  const l2 = words.slice(1).join(' ') || 'Notes';

  doc.font(fonts.bold).fontSize(12).fillColor(NOTEBOOK_COLORS.inkBlue)
     .text(l1, x, y + 4, { width: boxW, align: 'center', lineBreak: false });
  doc.font(fonts.regular).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlue)
     .text(l2, x, y + 21, { width: boxW, align: 'center', lineBreak: false });
}

/**
 * Draw 3D Isometric Cube
 */
function draw3DCube(doc, x, y, size = 48, strokeColor = NOTEBOOK_COLORS.inkBlue) {
  doc.save();
  doc.strokeColor(strokeColor).lineWidth(1.6);
  const depth = size * 0.38;

  // Front square
  doc.rect(x, y + depth, size, size).stroke();

  // Top parallelogram
  doc.moveTo(x, y + depth)
     .lineTo(x + depth, y)
     .lineTo(x + size + depth, y)
     .lineTo(x + size, y + depth)
     .closePath().stroke();

  // Right parallelogram
  doc.moveTo(x + size, y + depth)
     .lineTo(x + size + depth, y)
     .lineTo(x + size + depth, y + size)
     .lineTo(x + size, y + size + depth)
     .closePath().stroke();

  doc.restore();
}

/**
 * Draw Illustrated Globe
 */
function drawGlobe(doc, x, y, r = 26) {
  doc.save();
  doc.circle(x, y, r).fillColor('#E1F5FE').fill();
  doc.circle(x, y, r).strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.6).stroke();

  // Continents
  doc.fillColor('#81C784');
  doc.path(`M ${x - 12} ${y - 14} Q ${x - 4} ${y - 18} ${x + 6} ${y - 10} Q ${x + 2} ${y} ${x - 8} ${y + 2} Z`).fill();
  doc.path(`M ${x + 4} ${y - 2} Q ${x + 14} ${y + 4} ${x + 8} ${y + 16} Q ${x - 4} ${y + 14} ${x - 2} ${y + 4} Z`).fill();
  doc.path(`M ${x - 18} ${y} Q ${x - 14} ${y + 10} ${x - 8} ${y + 16} Q ${x - 16} ${y + 18} Z`).fill();

  // Outlines
  doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.0);
  doc.ellipse(x, y, r * 0.45, r).stroke();
  doc.moveTo(x - r, y).lineTo(x + r, y).stroke();
  doc.restore();
}

/**
 * Draw Bumpy Cloud Shape matching reference Page 2 Real World Entity
 */
function drawCloud(doc, x, y, w = 92, h = 56, text = 'Real World\nEntity', fonts) {
  doc.save();
  doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.6);
  doc.fillColor('#F0F7FF');

  doc.roundedRect(x, y, w, h, 14).fillAndStroke();

  doc.font(fonts.bold).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlue);
  doc.text(text, x, y + 14, { width: w, align: 'center', lineGap: 3 });
  doc.restore();
}

/**
 * Draw Curly Brace grouping items
 */
function drawCurlyBrace(doc, x, y1, y2, color = NOTEBOOK_COLORS.inkBlue) {
  doc.save();
  doc.strokeColor(color).lineWidth(1.6);
  const midY = (y1 + y2) / 2;
  const curve = 6;

  doc.moveTo(x, y1).bezierCurveTo(x + curve, y1, x + curve, midY - curve, x + curve * 1.5, midY);
  doc.moveTo(x + curve * 1.5, midY).bezierCurveTo(x + curve, midY + curve, x + curve, y2, x, y2);
  doc.stroke();
  doc.restore();
}

/**
 * Draw Section Header with hand-drawn asterisk and underline with dot
 */
function drawSectionHeader(doc, rawTitle, y, fonts) {
  const x = 96;
  drawHandAsterisk(doc, x - 12, y + 8, 6.5);

  const cleanTitle = rawTitle.trim();
  doc.font(fonts.bold).fontSize(15.5).fillColor(NOTEBOOK_COLORS.inkBlue)
     .text(cleanTitle, x, y, { lineBreak: false });

  const textW = doc.widthOfString(cleanTitle);
  const lineY = y + 24;
  doc.save();
  doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.6);
  doc.moveTo(x, lineY).lineTo(x + textW + 8, lineY).stroke();
  doc.circle(x + textW + 8, lineY, 2).fillColor(NOTEBOOK_COLORS.inkBlue).fill();
  doc.restore();

  return y + 36;
}

/**
 * Render Bullet with mixed colored text segments AND automatic multiline wrapping
 */
function renderBulletLine(doc, segments, y, indent = 115, fonts, maxW = 440) {
  doc.circle(indent - 10, y + 7, 2.2).fillColor(NOTEBOOK_COLORS.inkBlack).fill();

  doc.y = y;
  doc.x = indent;

  segments.forEach((seg, sIdx) => {
    const isLast = sIdx === segments.length - 1;
    let text = typeof seg === 'string' ? seg : seg.text;
    let color = NOTEBOOK_COLORS.inkBlack;
    let font = fonts.regular;

    if (typeof seg === 'object' && seg.color === 'red') {
      color = NOTEBOOK_COLORS.inkRed;
      font = fonts.bold;
    } else if (typeof seg === 'object' && seg.color === 'blue') {
      color = NOTEBOOK_COLORS.inkBlue;
      font = fonts.bold;
    }

    const startY = (sIdx === 0) ? y : undefined;
    doc.font(font).fontSize(11).fillColor(color);
    doc.text(text, indent, startY, {
      width: maxW,
      lineGap: 3,
      continued: !isLast
    });
  });

  return Math.max(doc.y + 8, y + 24);
}

/**
 * Draw Rounded Code Box with optional Side Box alongside (matching Page 4 & Page 5)
 */
function renderCodeBox(doc, lines, startY, fonts, options = {}) {
  const x = options.x || 115;
  const lineH = options.lineH || 22;
  const sideBox = options.sideBox;

  doc.font(fonts.regular).fontSize(11);
  const maxLineW = Math.max(...lines.map(l => doc.widthOfString(l)));
  const boxW = options.boxW || (sideBox ? 255 : Math.min(Math.max(maxLineW + 28, 250), 380));
  const boxH = Math.max(lines.length * lineH + 18, 62);

  // Rounded Box
  doc.save();
  doc.roundedRect(x, startY, boxW, boxH, 8)
     .fillColor('#FFFFFF').fill();
  doc.roundedRect(x, startY, boxW, boxH, 8)
     .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
  doc.restore();

  // Lines of Code
  let cy = startY + 10;
  lines.forEach((l) => {
    let color = NOTEBOOK_COLORS.inkDarkBlue;
    let font = fonts.regular;

    if (l.trim().startsWith('#') || l.trim().startsWith('//')) {
      color = NOTEBOOK_COLORS.inkGray;
    } else if (l.includes('def ') || l.includes('class ') || l.includes('import ') || l.includes('@') || l.includes('return ') || l.includes('from ')) {
      color = NOTEBOOK_COLORS.inkPurple;
      font = fonts.bold;
    } else if (l.includes('"') || l.includes("'")) {
      color = NOTEBOOK_COLORS.inkRed;
    }

    doc.font(font).fontSize(11).fillColor(color)
       .text(l, x + 12, cy, { lineBreak: false });
    cy += lineH;
  });

  // Render sideBox alongside codeBox if present (e.g. Page 4 "This class has:")
  if (sideBox) {
    const sbX = x + boxW + 20;
    const sbW = doc.page.width - sbX - 35;
    const sbH = boxH;

    doc.save();
    doc.roundedRect(sbX, startY + 10, sbW, sbH - 20, 8)
       .fillColor('#F8FAFC').fill();
    doc.roundedRect(sbX, startY + 10, sbW, sbH - 20, 8)
       .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.5).stroke();
    doc.restore();

    let sbY = startY + 20;
    if (sideBox.title) {
      doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlue)
         .text(sideBox.title, sbX + 10, sbY);
      sbY += 18;
    }

    if (Array.isArray(sideBox.items)) {
      sideBox.items.forEach(it => {
        doc.font(fonts.regular).fontSize(9.5).fillColor(NOTEBOOK_COLORS.inkRed)
           .text(`•  ${it}`, sbX + 10, sbY, { width: sbW - 16 });
        sbY += 16;
      });
    }
  }

  return startY + boxH + 18;
}

/**
 * Draw Rounded Code Box with Arrow Callouts on Right
 */
function renderCodeBoxWithArrows(doc, lines, arrows, startY, fonts, defaultBoxW = null) {
  const x = 115;
  const isDense = lines.length > 7;
  const lineH = isDense ? 18 : 22;
  const fontSize = isDense ? 10 : 11;

  doc.font(fonts.regular).fontSize(fontSize);
  const maxLineW = Math.max(...lines.map(l => doc.widthOfString(l)));
  const boxW = defaultBoxW || Math.min(Math.max(maxLineW + 28, 250), 320);
  const boxH = Math.max(lines.length * lineH + 16, 60);

  // Rounded Box
  doc.save();
  doc.roundedRect(x, startY, boxW, boxH, 8)
     .fillColor('#FFFFFF').fill();
  doc.roundedRect(x, startY, boxW, boxH, 8)
     .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
  doc.restore();

  // Lines of Code
  let cy = startY + 8;
  lines.forEach((l) => {
    let color = NOTEBOOK_COLORS.inkDarkBlue;
    let font = fonts.regular;

    if (l.trim().startsWith('#') || l.trim().startsWith('//')) {
      color = NOTEBOOK_COLORS.inkGray;
    } else if (l.includes('def ') || l.includes('class ') || l.includes('import ') || l.includes('@') || l.includes('return ') || l.includes('from ')) {
      color = NOTEBOOK_COLORS.inkPurple;
      font = fonts.bold;
    } else if (l.includes('"') || l.includes("'")) {
      color = NOTEBOOK_COLORS.inkRed;
    }

    doc.font(font).fontSize(fontSize).fillColor(color)
       .text(l, x + 12, cy, { lineBreak: false });
    cy += lineH;
  });

  // Right-hand callout arrows with collision guard
  if (Array.isArray(arrows)) {
    let lastArrowBottom = 0;

    arrows.forEach(a => {
      let arrowY = startY + (a.lineIndex * lineH) + 14;
      if (arrowY < lastArrowBottom + 6) {
        arrowY = lastArrowBottom + 6;
      }

      const arrowStartX = x + boxW + 4;
      const arrowEndX = arrowStartX + 24;

      drawHandArrow(doc, arrowStartX, arrowY, arrowEndX, arrowY, NOTEBOOK_COLORS.inkBlue, 1.4, 5);

      doc.font(fonts.bold).fontSize(isDense ? 9 : 9.5).fillColor(NOTEBOOK_COLORS.inkRed);
      const rawText = a.text || a.label || '';
      const textLines = rawText.split('\n');
      textLines.forEach((tl, tIdx) => {
        doc.text(tl, arrowEndX + 8, arrowY - 6 + (tIdx * 11), { lineBreak: false });
      });

      lastArrowBottom = arrowY - 6 + (textLines.length * 11);
    });
  }

  return startY + boxH + 16;
}

/**
 * Render 5 Pillars / Key Items List (Colons aligned vertically, zero collisions)
 */
function renderPillarsList(doc, items, startY, fonts) {
  let curY = startY;
  const labelX = 115;
  const colonX = 265;
  const descX = 278;
  const descW = doc.page.width - descX - 35;

  items.forEach(it => {
    // Number and Title (Bold Blue)
    doc.font(fonts.bold).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlue)
       .text(it.num, labelX, curY, { lineBreak: false });

    // Colon
    doc.font(fonts.regular).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlack)
       .text(' : ', colonX, curY, { lineBreak: false });

    // Description (Regular Black, wrapping)
    doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack);
    const descH = doc.heightOfString(it.desc, { width: descW, lineGap: 3 });
    doc.text(it.desc, descX, curY, { width: descW, lineGap: 3 });

    curY += Math.max(descH, 18) + 12;
  });

  return curY + 6;
}

/**
 * Render Access Modifiers / Symbol Rows (Colons and arrows aligned, zero collisions)
 */
function renderAccessModifierRows(doc, rows, startY, fonts) {
  let curY = startY;
  const typeX = 115;
  const symX = 195;
  const arrowStartX = 338;
  const arrowEndX = 360;
  const descX = 368;
  const descW = doc.page.width - descX - 35;

  rows.forEach(r => {
    // Bullet + Type (e.g. • Public)
    doc.font(fonts.bold).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlue)
       .text(`•  ${r.type}`, typeX, curY, { lineBreak: false });

    // Symbol (e.g. : No underscore)
    doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkPurple)
       .text(`: ${r.symbol}`, symX, curY, { lineBreak: false });

    // Arrow
    drawHandArrow(doc, arrowStartX, curY + 7, arrowEndX, curY + 7, NOTEBOOK_COLORS.inkBlue, 1.4, 5);

    // Description (wrapping)
    doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack);
    const descH = doc.heightOfString(r.desc, { width: descW, lineGap: 3 });
    doc.text(r.desc, descX, curY, { width: descW, lineGap: 3 });

    curY += Math.max(descH, 18) + 14;
  });

  return curY + 6;
}

/**
 * Draw 3-Column Structured Table
 */
function renderTable(doc, headers, rows, startY, fonts, colWidths = [115, 215, 130]) {
  const x = 95;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const isDense = rows.length > 5;
  const rowH = isDense ? 17.5 : 22;
  const fontSize = isDense ? 9.2 : 10;
  const padY = isDense ? 3 : 5;
  const totalH = (rows.length + 1) * rowH;

  // Box
  doc.roundedRect(x, startY, totalW, totalH, 6)
     .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();

  // Header fill
  doc.rect(x, startY, totalW, rowH).fillColor('#E8EAF6').fill();

  // Headers
  let curColX = x;
  headers.forEach((h, i) => {
    const w = colWidths[i];
    doc.font(fonts.bold).fontSize(isDense ? 10 : 11).fillColor(NOTEBOOK_COLORS.inkBlue)
       .text(h, curColX, startY + padY, { width: w, align: 'center', lineBreak: false });
    if (i > 0) {
      doc.strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1)
         .moveTo(curColX, startY).lineTo(curColX, startY + totalH).stroke();
    }
    curColX += w;
  });

  // Rows
  let curY = startY + rowH;
  rows.forEach((r, rIdx) => {
    doc.strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(0.8)
       .moveTo(x, curY).lineTo(x + totalW, curY).stroke();

    let cellX = x;
    r.forEach((cell, cIdx) => {
      const w = colWidths[cIdx];
      const color = cIdx === 0 ? NOTEBOOK_COLORS.inkRed : NOTEBOOK_COLORS.inkBlack;
      const font = cIdx === 0 ? fonts.bold : fonts.regular;

      doc.font(font).fontSize(fontSize).fillColor(color)
         .text(cell, cellX + 6, curY + padY, { width: w - 12, lineBreak: false });
      cellX += w;
    });
    curY += rowH;
  });

  return startY + totalH + 16;
}

/**
 * Draw Pro-Tip / Key Takeaway Sticky Note Box at page bottom
 */
function renderKeyTakeawayBox(doc, text, y, fonts) {
  const x = 115;
  const w = doc.page.width - x - 35;
  const h = 42;

  doc.save();
  doc.roundedRect(x, y, w, h, 6).fillColor('#FFFDE7').fill();
  doc.roundedRect(x, y, w, h, 6).strokeColor('#FBC02D').lineWidth(1.4).stroke();

  doc.font(fonts.bold).fontSize(10.5).fillColor('#F57F17').text('💡 KEY TAKEAWAY:', x + 10, y + 7, { lineBreak: false });
  doc.font(fonts.regular).fontSize(9.5).fillColor(NOTEBOOK_COLORS.inkBlack).text(text, x + 120, y + 8, { width: w - 130, lineGap: 2 });
  doc.restore();

  return y + h + 10;
}

/**
 * Draw Master 14-Page Spiral Notebook PDF
 */
async function generateSpiralNotebookPDF(arg1, arg2) {
  let campaign, deliverable, absolutePath, relativePath, fileName;

  if (arg1 && arg1.campaign) {
    ({ campaign, deliverable, absolutePath, relativePath, fileName } = arg1);
  } else {
    campaign = arg1 || {};
    deliverable = arg2 || {};
  }

  const topic = campaign.topic || (deliverable && deliverable.title) || 'Python OOPs Notes';
  let researchContext = null;
  try {
    researchContext = {
      summary: (deliverable && deliverable.summary) || campaign.summary || '',
      key_concepts: (deliverable && deliverable.key_concepts) || (campaign.key_concepts ? JSON.parse(campaign.key_concepts) : []),
      code_snippets: (deliverable && deliverable.code_snippets) || (campaign.code_snippets ? JSON.parse(campaign.code_snippets) : []),
      sources: campaign.sources ? (typeof campaign.sources === 'string' ? JSON.parse(campaign.sources) : campaign.sources) : []
    };
  } catch (e) {}

  const curriculum = get14PageCurriculum(topic, researchContext);

  const pdfDir = path.join(__dirname, '../../public/generated/pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  if (!fileName) {
    fileName = `spiral_notebook_${campaign.id || Date.now()}_${Date.now()}.pdf`;
  }
  if (!absolutePath) {
    absolutePath = path.join(pdfDir, fileName);
  }
  if (!relativePath) {
    relativePath = `/generated/pdfs/${fileName}`;
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        autoPageBreak: false,
        bufferPages: true,
        info: {
          Title: topic,
          Author: 'OmniResearch AI — Handwritten Notes Engine',
          Subject: `${curriculum.tech} Complete 14-Page Masterclass Handwritten Notes`,
          Creator: 'OmniResearch AI Spiral Notebook Studio'
        }
      });

      const stream = fs.createWriteStream(absolutePath);
      doc.pipe(stream);

      const fonts = registerFonts(doc);

      // Loop through all 14 pages
      curriculum.pages.forEach((page, pIdx) => {
        if (pIdx > 0) doc.addPage();
        drawNotebookBackground(doc);

        if (page.pageType === 'cover') {
          // ════════════════════════════════════════════════════════════════
          // PAGE 1: COVER SHEET (Matching PyCode.Hubb Reference)
          // ════════════════════════════════════════════════════════════════
          let curY = 90;
          const midX = doc.page.width / 2 + 25;

          // Radial accent lines around Title 1
          doc.font(fonts.bold).fontSize(36).fillColor(NOTEBOOK_COLORS.inkBlue);
          const t1 = page.titlePart1 || 'OBJECT-';
          const t1W = doc.widthOfString(t1);
          const t1X = midX - t1W / 2;

          // Radial accents
          doc.strokeColor(NOTEBOOK_COLORS.inkRed).lineWidth(2);
          doc.moveTo(t1X - 25, curY + 14).lineTo(t1X - 8, curY + 14).stroke();
          doc.moveTo(t1X - 22, curY + 6).lineTo(t1X - 10, curY + 9).stroke();
          doc.moveTo(t1X - 22, curY + 22).lineTo(t1X - 10, curY + 19).stroke();

          doc.moveTo(t1X + t1W + 8, curY + 14).lineTo(t1X + t1W + 25, curY + 14).stroke();
          doc.moveTo(t1X + t1W + 10, curY + 9).lineTo(t1X + t1W + 22, curY + 6).stroke();
          doc.moveTo(t1X + t1W + 10, curY + 19).lineTo(t1X + t1W + 22, curY + 22).stroke();

          doc.text(t1, t1X, curY, { lineBreak: false });

          curY += 56;
          let t2Font = 40;
          doc.font(fonts.bold).fontSize(t2Font);
          while (doc.widthOfString(page.titlePart2 || 'ARCHITECTURE') > doc.page.width - 140 && t2Font > 22) {
            t2Font -= 2;
            doc.fontSize(t2Font);
          }
          doc.fillColor(NOTEBOOK_COLORS.inkRed)
             .text(page.titlePart2 || 'ARCHITECTURE', 90, curY, { align: 'center', width: doc.page.width - 120, lineBreak: false });

          curY += t2Font + 18;
          let t3Font = 36;
          doc.font(fonts.bold).fontSize(t3Font);
          while (doc.widthOfString(page.titlePart3 || 'ENGINEERING') > doc.page.width - 140 && t3Font > 20) {
            t3Font -= 2;
            doc.fontSize(t3Font);
          }
          doc.fillColor(NOTEBOOK_COLORS.inkBlack)
             .text(page.titlePart3 || 'ENGINEERING', 90, curY, { align: 'center', width: doc.page.width - 120, lineBreak: false });

          curY += t3Font + 16;
          doc.font(fonts.bold).fontSize(26).fillColor(NOTEBOOK_COLORS.inkBlue);
          const inText = `—  ${page.titlePart4 || 'IN'}  —`;
          doc.text(inText, 90, curY, { align: 'center', width: doc.page.width - 120, lineBreak: false });

          curY += 52;
          let t5Font = 48;
          doc.font(fonts.bold).fontSize(t5Font);
          while (doc.widthOfString(page.titlePart5 || 'PRODUCTION') > doc.page.width - 140 && t5Font > 26) {
            t5Font -= 2;
            doc.fontSize(t5Font);
          }
          doc.fillColor(NOTEBOOK_COLORS.inkBlue)
             .text(page.titlePart5 || 'PRODUCTION', 90, curY, { align: 'center', width: doc.page.width - 120, lineBreak: false });

          // 3-Stage Diagram: [Blueprint / Class] ➔ [Object 3D Cube] ➔ [Real World Globe]
          curY += 95;
          const bW = 100;
          const bH = 72;
          const b1X = midX - 170;
          const b2X = midX - 50;
          const b3X = midX + 70;

          // Box 1: Blueprint
          doc.font(fonts.bold).fontSize(12).fillColor(NOTEBOOK_COLORS.inkBlue)
             .text(page.diagram.b1Title, b1X, curY - 20, { width: bW, align: 'center' });
          doc.roundedRect(b1X, curY, bW, bH, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
          doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack)
             .text(`${page.diagram.b1Top}\n────────\n${page.diagram.b1Bot}`, b1X, curY + 16, { width: bW, align: 'center', lineGap: 3 });

          // Arrow 1
          drawHandArrow(doc, b1X + bW + 8, curY + bH / 2, b2X - 8, curY + bH / 2, NOTEBOOK_COLORS.inkRed, 2, 6);

          // Box 2: 3D Cube Object
          doc.font(fonts.bold).fontSize(12).fillColor(NOTEBOOK_COLORS.inkRed)
             .text(page.diagram.b2Title, b2X, curY - 20, { width: bW, align: 'center' });
          draw3DCube(doc, b2X + 26, curY + 10, 48, NOTEBOOK_COLORS.inkBlue);

          // Arrow 2
          drawHandArrow(doc, b2X + bW + 8, curY + bH / 2, b3X - 8, curY + bH / 2, NOTEBOOK_COLORS.inkRed, 2, 6);

          // Box 3: Real World Globe
          doc.font(fonts.bold).fontSize(12).fillColor(NOTEBOOK_COLORS.inkBlue)
             .text(page.diagram.b3Title, b3X, curY - 20, { width: bW, align: 'center' });
          drawGlobe(doc, b3X + 50, curY + 36, 28);

          // Author Attribution
          curY += 150;
          const authorText = page.author || 'PyCode.Hubb';
          const authorFull = `by  ${authorText}`;
          let authorFontSize = 22;
          doc.font(fonts.bold).fontSize(authorFontSize);
          while (doc.widthOfString(authorFull) > doc.page.width - 160 && authorFontSize > 12) {
            authorFontSize -= 1;
            doc.fontSize(authorFontSize);
          }
          const fullW = doc.widthOfString(authorFull);
          const startAX = Math.max(96, midX - fullW / 2);

          // Ivory backing so ruled lines do not intersect the letters
          doc.roundedRect(startAX - 10, curY - 4, fullW + 20, authorFontSize + 16, 6)
             .fillColor(NOTEBOOK_COLORS.paperBg).fill();

          doc.fillColor(NOTEBOOK_COLORS.inkBlack).text('by  ', startAX, curY, { lineBreak: false });
          const byW = doc.widthOfString('by  ');
          doc.fillColor(NOTEBOOK_COLORS.inkRed).text(authorText, startAX + byW, curY, { lineBreak: false });

          // Blue underline with end dots
          const aW = doc.widthOfString(authorText);
          const lineY = curY + authorFontSize + 6;
          doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(2.2);
          doc.moveTo(startAX + byW - 2, lineY).lineTo(startAX + byW + aW + 2, lineY).stroke();
          doc.circle(startAX + byW - 2, lineY, 2.5).fillColor(NOTEBOOK_COLORS.inkBlue).fill();
          doc.circle(startAX + byW + aW + 2, lineY, 2.5).fillColor(NOTEBOOK_COLORS.inkBlue).fill();

        } else {
          // ════════════════════════════════════════════════════════════════
          // PAGES 2 - 14: RICH TOPIC STUDY NOTES
          // ════════════════════════════════════════════════════════════════
          drawCornerTag(doc, curriculum.tag, fonts);

          // Main Header in Red
          let curY = 32;
          doc.font(fonts.bold).fontSize(17.5).fillColor(NOTEBOOK_COLORS.inkRed)
             .text(page.header, 96, curY, { lineBreak: false });

          const headW = doc.widthOfString(page.header);
          const lineY = curY + 28;
          doc.strokeColor(NOTEBOOK_COLORS.inkBlue).lineWidth(1.8);
          doc.moveTo(96, lineY).lineTo(96 + headW, lineY).stroke();
          doc.circle(96 + headW / 2, lineY, 2).fillColor(NOTEBOOK_COLORS.inkBlue).fill();

          if (page.headerSub) {
            curY += 34;
            doc.font(fonts.bold).fontSize(14).fillColor(NOTEBOOK_COLORS.inkBlue)
               .text(page.headerSub, 96, curY, { lineBreak: false });
            const subW = doc.widthOfString(page.headerSub);
            const subLineY = curY + 20;
            doc.strokeColor(NOTEBOOK_COLORS.inkRed).lineWidth(1.5);
            doc.moveTo(96, subLineY).lineTo(96 + subW, subLineY).stroke();
            doc.circle(96 + subW / 2, subLineY, 2).fillColor(NOTEBOOK_COLORS.inkRed).fill();
            curY += 30;
          } else {
            curY += 36;
          }

          // Modular Section Renderer for sec1, sec2, sec3, sec4
          const renderSection = (sec) => {
            if (!sec) return;

            // Section Title
            if (sec.title) {
              curY = drawSectionHeader(doc, sec.title, curY, fonts);
            }

            // Bullets with multiline text wrapping
            if (sec.bullets) {
              sec.bullets.forEach(b => {
                curY = renderBulletLine(doc, b, curY, 115, fonts);
              });
              curY += 8;
            }

            // Standard CodeBox with optional sideBox (e.g. Page 4)
            if (sec.codeBox && !sec.codeBoxWithArrows) {
              curY = renderCodeBox(doc, sec.codeBox, curY, fonts, { sideBox: sec.sideBox });
            }

            // CodeBox with Arrows Callouts (e.g. Page 6, 7, 9)
            if (sec.codeBoxWithArrows) {
              curY = renderCodeBoxWithArrows(doc, sec.codeBoxWithArrows.lines, sec.codeBoxWithArrows.arrows, curY, fonts);
            }

            // Usage text below code box (e.g. Page 5)
            if (sec.usageText) {
              const uLines = sec.usageText.split('\n');
              let uY = curY;
              uLines.forEach(ul => {
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed)
                   .text(ul, 115, uY);
                uY += 18;
              });

              if (sec.sideBox && Array.isArray(sec.sideBox.items)) {
                // Arrow pointing to sideBox
                drawHandArrow(doc, 290, curY + 16, 335, curY + 16, NOTEBOOK_COLORS.inkBlue, 1.4, 5);
                const sbX = 345;
                const sbW = doc.page.width - sbX - 35;
                const sbH = sec.sideBox.items.length * 16 + 14;

                doc.roundedRect(sbX, curY, sbW, sbH, 6)
                   .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.4).stroke();

                let sY = curY + 7;
                sec.sideBox.items.forEach(it => {
                  doc.font(fonts.regular).fontSize(9.5).fillColor(NOTEBOOK_COLORS.inkRed)
                     .text(it, sbX + 8, sY);
                  sY += 16;
                });
                curY = Math.max(uY, curY + sbH) + 14;
              } else {
                curY = uY + 10;
              }
            }

            // Example Intro text before diagram/code (e.g. Page 4)
            if (sec.exampleIntro) {
              doc.font(fonts.bold).fontSize(11.5).fillColor(NOTEBOOK_COLORS.inkBlue).text('Example:', 115, curY);
              curY += 18;
              const introLines = sec.exampleIntro.split('\n');
              introLines.forEach(il => {
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed).text(il, 115, curY);
                curY += 18;
              });
              curY += 6;
            }

            // Output Block (e.g. Page 5)
            if (sec.outputBlock) {
              const obLines = sec.outputBlock.code.split('\n');
              obLines.forEach(obl => {
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack).text(obl, 115, curY);
                curY += 18;
              });
              if (sec.outputBlock.out) {
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlue)
                   .text(sec.outputBlock.out, 240, curY - 18);
              }
              curY += 12;
            }

            // Output Box (e.g. Page 8, Page 10, Page 14)
            if (sec.outputBox) {
              const obW = 320;
              const obH = sec.outputBox.length * 20 + 14;
              doc.roundedRect(115, curY, obW, obH, 6)
                 .strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.4).stroke();
              let oY = curY + 8;
              sec.outputBox.forEach(ob => {
                const isComment = ob.includes('#');
                const parts = ob.split('#');
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack)
                   .text(parts[0], 126, oY, { lineBreak: false });
                if (parts[1]) {
                  doc.font(fonts.regular).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlue)
                     .text('#' + parts[1], 126 + doc.widthOfString(parts[0]), oY, { lineBreak: false });
                }
                oY += 20;
              });
              curY = oY + 14;
            }

            // Usage Block with Code & Commented Outputs (e.g. Page 7)
            if (sec.usageBlock) {
              doc.font(fonts.bold).fontSize(11.5).fillColor(NOTEBOOK_COLORS.inkBlue).text('# Usage', 115, curY, { lineBreak: false });
              curY += 18;
              sec.usageBlock.slice(1).forEach(ub => {
                const parts = ub.split('#');
                doc.font(fonts.regular).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlack)
                   .text(parts[0], 115, curY, { lineBreak: false });
                if (parts[1]) {
                  doc.font(fonts.regular).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlue)
                     .text('#' + parts[1], 115 + doc.widthOfString(parts[0]), curY, { lineBreak: false });
                }
                curY += 18;
              });
              curY += 12;
            }

            // 5 Pillars / Items with Aligned Colons (e.g. Page 2)
            if (sec.items) {
              curY = renderPillarsList(doc, sec.items, curY, fonts);
            }

            // Access Modifiers / Symbol Rows (e.g. Page 7)
            if (sec.rows) {
              curY = renderAccessModifierRows(doc, sec.rows, curY, fonts);
            }

            // Structured Table (e.g. Page 13)
            if (sec.table) {
              curY = renderTable(doc, sec.table.headers, sec.table.rows, curY, fonts);
            }

            // Specialized Diagrams
            if (sec.diagram) {
              const d = sec.diagram;
              if (d.type === 'entity_object') {
                drawCloud(doc, 115, curY, 90, 56, d.cloudText, fonts);
                drawHandArrow(doc, 212, curY + 28, 246, curY + 28, NOTEBOOK_COLORS.inkBlue, 1.6, 5);

                // Divided box
                doc.roundedRect(252, curY, 126, 68, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
                doc.moveTo(252, curY + 34).lineTo(378, curY + 34).stroke();
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed)
                   .text(d.boxTop, 252, curY + 10, { width: 126, align: 'center' });
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed)
                   .text(d.boxBot, 252, curY + 44, { width: 126, align: 'center' });

                // Example list with curly braces
                doc.font(fonts.bold).fontSize(12).fillColor(NOTEBOOK_COLORS.inkBlue)
                   .text('Example:', 396, curY - 2, { lineBreak: false });
                doc.font(fonts.regular).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlack)
                   .text(d.exampleTitle, 396, curY + 16, { lineBreak: false });

                let attrY = curY + 32;
                d.attrGroup.forEach(a => {
                  doc.font(fonts.regular).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlack).text(`•  ${a}`, 400, attrY);
                  attrY += 15;
                });
                drawCurlyBrace(doc, 458, curY + 32, attrY - 4, NOTEBOOK_COLORS.inkBlue);
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlue)
                   .text('Attributes', 472, curY + 40);

                let methY = attrY + 6;
                d.methodGroup.forEach(m => {
                  doc.font(fonts.regular).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlack).text(`•  ${m}`, 400, methY);
                  methY += 15;
                });
                drawCurlyBrace(doc, 460, attrY + 6, methY - 4, NOTEBOOK_COLORS.inkBlue);
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkBlue)
                   .text('Methods', 474, attrY + 14);

                curY = Math.max(curY + 76, methY + 14) + 14;
              } else if (d.type === 'class_to_instances') {
                // Class Box
                doc.roundedRect(115, curY, 130, 80, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
                doc.font(fonts.bold).fontSize(11).fillColor(NOTEBOOK_COLORS.inkBlue).text(d.className, 115, curY + 6, { width: 130, align: 'center' });
                doc.font(fonts.bold).fontSize(10).fillColor(NOTEBOOK_COLORS.inkRed).text('Attributes:', 124, curY + 24);
                d.classAttrs.forEach((ca, caI) => {
                  doc.font(fonts.regular).fontSize(9.5).fillColor(NOTEBOOK_COLORS.inkBlack).text(`• ${ca}`, 126, curY + 36 + caI * 12);
                });
                if (d.classMethods) {
                  doc.font(fonts.bold).fontSize(10).fillColor(NOTEBOOK_COLORS.inkRed).text('Method:', 124, curY + 54);
                  doc.font(fonts.regular).fontSize(9.5).fillColor(NOTEBOOK_COLORS.inkBlack).text(`• ${d.classMethods[0]}`, 126, curY + 66);
                }

                // Arrows to instances
                drawHandArrow(doc, 252, curY + 32, 308, curY + 18, NOTEBOOK_COLORS.inkBlue, 1.6, 5);
                drawHandArrow(doc, 252, curY + 54, 308, curY + 68, NOTEBOOK_COLORS.inkBlue, 1.6, 5);

                // Inst 1
                doc.roundedRect(314, curY - 4, 136, 42, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.4).stroke();
                doc.font(fonts.bold).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlue).text(d.inst1.name, 320, curY);
                doc.font(fonts.regular).fontSize(9).fillColor(NOTEBOOK_COLORS.inkRed).text(`color = ${d.inst1.color}, brand = ${d.inst1.brand}`, 320, curY + 18);

                // Inst 2
                doc.roundedRect(314, curY + 50, 136, 42, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.4).stroke();
                doc.font(fonts.bold).fontSize(10).fillColor(NOTEBOOK_COLORS.inkBlue).text(d.inst2.name, 320, curY + 54);
                doc.font(fonts.regular).fontSize(9).fillColor(NOTEBOOK_COLORS.inkRed).text(`color = ${d.inst2.color}, brand = ${d.inst2.brand}`, 320, curY + 72);

                curY += 105;
              } else if (d.type === 'parent_child') {
                doc.roundedRect(260, curY, 110, 32, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed).text(d.parent, 260, curY + 8, { width: 110, align: 'center' });
                drawHandArrow(doc, 315, curY + 36, 315, curY + 60, NOTEBOOK_COLORS.inkBlue, 1.6, 5);
                doc.roundedRect(260, curY + 64, 110, 32, 6).strokeColor(NOTEBOOK_COLORS.boxBorder).lineWidth(1.6).stroke();
                doc.font(fonts.bold).fontSize(10.5).fillColor(NOTEBOOK_COLORS.inkRed).text(d.child, 260, curY + 72, { width: 110, align: 'center' });
                curY += 112;
              }
            }
          };

          // Render all sections on the page
          renderSection(page.sec1);
          renderSection(page.sec2);
          renderSection(page.sec3);
          renderSection(page.sec4);

          // Space Optimizer: If page has significant empty space at the bottom, fill it with an insightful Key Takeaway note
          if (curY < 680 && page.takeaway) {
            renderKeyTakeawayBox(doc, page.takeaway, Math.max(curY + 15, 690), fonts);
          }
        }
      });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log(`[PDF Service] 📄 Verified 14-Page Masterclass PDF created: ${relativePath}`);
        resolve({
          success: true,
          pdfPath: relativePath,
          absolutePath: absolutePath,
          fileName: fileName,
          pageCount: 14
        });
      });

      stream.on('error', (err) => {
        console.error('[PDF Service Error]:', err);
        reject(err);
      });
    } catch (e) {
      console.error('[PDF Service Crash]:', e);
      reject(e);
    }
  });
}

module.exports = {
  generateSpiralNotebookPDF
};
