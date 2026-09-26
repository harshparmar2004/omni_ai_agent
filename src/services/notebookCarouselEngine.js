const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { getSetting, getBrandAssets } = require('../database');
const { resolveTechProfile } = require('./logoService');
const { get14PageCurriculum } = require('./notebookCurriculum');

// Register authentic handwritten fonts
try {
  const regFont = 'C:/Windows/Fonts/segoepr.ttf';
  const boldFont = 'C:/Windows/Fonts/segoeprb.ttf';
  if (fs.existsSync(regFont)) {
    GlobalFonts.registerFromPath(regFont, 'Segoe Print');
  }
  if (fs.existsSync(boldFont)) {
    GlobalFonts.registerFromPath(boldFont, 'Segoe Print Bold');
  }
} catch (e) {
  console.warn('[Notebook Carousel] Font register warning:', e.message);
}

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5 Instagram Standard

const FONT_HAND = '"Segoe Print", sans-serif';
const FONT_HAND_BOLD = '"Segoe Print Bold", "Segoe Print", sans-serif';
const FONT_CODE = '"Consolas", monospace';

const COLORS = {
  paperBg: '#FCFCF9',
  ruledLine: '#D4E4FA',
  marginLine: '#EF5350',
  marginSub: '#FFCDD2',
  coilBlack: '#212121',
  coilHighlight: '#A0A0A0',
  inkBlack: '#1C1917',
  inkBlue: '#1565C0',
  inkDarkBlue: '#0D47A1',
  inkRed: '#C62828',
  inkGreen: '#2E7D32',
  inkPurple: '#6A1B9A',
  inkGray: '#555555',
  boxBorder: '#5C6BC0',
  boxBg: '#F8FAFF',
  tagBg: '#EEF4FF'
};

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draw authentic ruled lined paper background with left wire spirals
 */
function drawNotebookBackground(ctx) {
  // 1. Warm ivory paper
  ctx.fillStyle = COLORS.paperBg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Ruled horizontal blue lines (42px spacing)
  ctx.strokeStyle = COLORS.ruledLine;
  ctx.lineWidth = 1.6;
  for (let y = 70; y < HEIGHT - 60; y += 42) {
    ctx.beginPath();
    ctx.moveTo(110, y);
    ctx.lineTo(WIDTH - 50, y);
    ctx.stroke();
  }

  // 3. Double Vertical Red Margin Lines (matching physical notebooks)
  ctx.strokeStyle = COLORS.marginLine;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(140, HEIGHT);
  ctx.stroke();

  ctx.strokeStyle = COLORS.marginSub;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(145, 0);
  ctx.lineTo(145, HEIGHT);
  ctx.stroke();

  // 4. Wire Spiral Binding Coils (Left Margin)
  const coilCount = 22;
  const coilSpacing = (HEIGHT - 70) / coilCount;

  for (let i = 0; i < coilCount; i++) {
    const cy = 45 + i * coilSpacing;

    // Punch hole
    ctx.fillStyle = COLORS.coilBlack;
    ctx.beginPath();
    ctx.ellipse(50, cy + 10, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wire Ring Loop
    ctx.strokeStyle = '#2B2B2B';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(18, cy - 2);
    ctx.bezierCurveTo(74, cy - 8, 74, cy + 28, 18, cy + 22);
    ctx.stroke();

    // Metallic highlight
    ctx.strokeStyle = COLORS.coilHighlight;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(25, cy + 2);
    ctx.bezierCurveTo(66, cy - 3, 66, cy + 23, 25, cy + 18);
    ctx.stroke();
  }
}

/**
 * Draw Top-Right Corner Tag Badge (e.g. "Docker Notes", "OOPs Notes")
 */
function drawCornerBadge(ctx, tagText) {
  const cleanTag = String(tagText || 'Tech Notes').replace(/[^\x20-\x7E]/g, '').trim() || 'Tech Notes';
  let fontSize = 18;
  ctx.font = `bold ${fontSize}px ${FONT_HAND}`;
  let textW = ctx.measureText(cleanTag).width;
  while (textW > 240 && fontSize > 13) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px ${FONT_HAND}`;
    textW = ctx.measureText(cleanTag).width;
  }
  const boxW = Math.max(160, Math.min(270, textW + 28));
  const boxH = 40;
  const x = 165;
  const y = 25;

  ctx.fillStyle = COLORS.tagBg;
  roundRect(ctx, x, y, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = COLORS.inkBlue;
  ctx.font = `bold ${fontSize}px ${FONT_HAND}`;
  ctx.textAlign = 'center';
  ctx.fillText(cleanTag, x + boxW / 2, y + 26);
  ctx.textAlign = 'left';
}

/**
 * Draw Hand-drawn asterisk (3 crossed lines in blue ink)
 */
function drawHandAsterisk(ctx, x, y, size = 10, color = COLORS.inkBlue) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  const d1 = size * 0.86;
  const d2 = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - d1, y - d2);
  ctx.lineTo(x + d1, y + d2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - d1, y + d2);
  ctx.lineTo(x + d1, y - d2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw Hand-drawn vector arrow with solid arrow head
 */
function drawHandArrow(ctx, x1, y1, x2, y2, color = COLORS.inkRed, lineWidth = 3.5, headSize = 12) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw 3D Isometric Wireframe Cube
 */
function draw3DCube(ctx, x, y, size = 52, color = COLORS.inkBlue) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  const depth = size * 0.38;

  // Front square
  ctx.strokeRect(x, y + depth, size, size);

  // Top parallelogram
  ctx.beginPath();
  ctx.moveTo(x, y + depth);
  ctx.lineTo(x + depth, y);
  ctx.lineTo(x + size + depth, y);
  ctx.lineTo(x + size, y + depth);
  ctx.closePath();
  ctx.stroke();

  // Right side
  ctx.beginPath();
  ctx.moveTo(x + size, y + depth);
  ctx.lineTo(x + size + depth, y);
  ctx.lineTo(x + size + depth, y + size);
  ctx.lineTo(x + size, y + size + depth);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw Globe Wireframe matching reference
 */
function drawGlobe(ctx, x, y, r = 32, color = COLORS.inkGreen) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.45, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.45, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render Header with underline and center dot
 */
function drawSlideHeader(ctx, text, y, color = COLORS.inkRed) {
  let fontSize = 38;
  ctx.font = `800 ${fontSize}px ${FONT_HAND}`;
  while (ctx.measureText(text).width > 560 && fontSize > 26) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px ${FONT_HAND}`;
  }

  ctx.fillStyle = color;
  ctx.fillText(text, 175, y);

  const headW = ctx.measureText(text).width;
  const lineY = y + 22;
  ctx.strokeStyle = COLORS.inkBlue;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(175, lineY);
  ctx.lineTo(175 + headW, lineY);
  ctx.stroke();

  ctx.fillStyle = COLORS.inkBlue;
  ctx.beginPath();
  ctx.arc(175 + headW / 2, lineY, 4, 0, Math.PI * 2);
  ctx.fill();

  return y + 60;
}

/**
 * Draw Bottom Swipe CTA Pill
 */
function drawSwipeCta(ctx, text) {
  const curY = HEIGHT - 130;
  ctx.fillStyle = COLORS.inkBlue;
  roundRect(ctx, 175, curY, WIDTH - 250, 68, 14);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 23px ${FONT_HAND}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, 175 + (WIDTH - 250) / 2, curY + 44);
  ctx.textAlign = 'left';
}

/**
 * Draw Brand Watermark / Handle based on user's Creative Studio settings
 */
function drawBrandWatermark(ctx, brandAssets) {
  if (!brandAssets || brandAssets.brand_watermark_position === 'none') return;

  const handle = brandAssets.brand_handle || '@harshparmar007__';
  const pos = brandAssets.brand_watermark_position || 'top-right';
  const opacity = brandAssets.brand_watermark_opacity !== undefined ? brandAssets.brand_watermark_opacity : 0.9;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `bold 21px ${FONT_HAND}`;

  const textW = ctx.measureText(handle).width;
  const pillW = textW + 36;
  const pillH = 38;

  if (pos === 'top-right') {
    const px = WIDTH - 55 - pillW;
    const py = 25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    roundRect(ctx, px, py, pillW, pillH, 19);
    ctx.fill();
    ctx.strokeStyle = COLORS.inkBlue;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = COLORS.inkBlue;
    ctx.textAlign = 'center';
    ctx.fillText(handle, px + pillW / 2, py + 26);
  } else if (pos === 'bottom-right') {
    const px = WIDTH - 55 - pillW;
    const py = HEIGHT - 55;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    roundRect(ctx, px, py, pillW, pillH, 19);
    ctx.fill();
    ctx.strokeStyle = COLORS.inkBlue;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = COLORS.inkBlue;
    ctx.textAlign = 'center';
    ctx.fillText(handle, px + pillW / 2, py + 26);
  } else if (pos === 'slide-footer') {
    ctx.fillStyle = COLORS.inkGray;
    ctx.textAlign = 'center';
    ctx.font = `18px ${FONT_HAND}`;
    ctx.fillText(`${brandAssets.brand_name || 'Omni Research'} • ${handle} • DM for Notes`, WIDTH / 2 + 35, HEIGHT - 25);
  }

  ctx.restore();
}

/**
 * Render bullet lines with mixed segments, colors, and word wrapping
 */
function renderBulletList(ctx, bullets, startY, maxW = 760) {
  let y = startY;
  const indent = 195;

  bullets.forEach(b => {
    // Draw bullet dot
    ctx.fillStyle = COLORS.inkBlack;
    ctx.beginPath();
    ctx.arc(indent - 14, y - 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Flatten bullet text and color mapping
    let fullText = '';
    let segments = [];
    if (Array.isArray(b)) {
      b.forEach(seg => {
        if (typeof seg === 'string') {
          fullText += seg;
          segments.push({ text: seg, color: COLORS.inkBlack });
        } else if (typeof seg === 'object') {
          fullText += seg.text;
          const col = seg.color === 'red' ? COLORS.inkRed : (seg.color === 'blue' ? COLORS.inkBlue : COLORS.inkBlack);
          segments.push({ text: seg.text, color: col, bold: true });
        }
      });
    } else {
      fullText = String(b);
      segments = [{ text: fullText, color: COLORS.inkBlack }];
    }

    // Wrap full text into lines
    ctx.font = `23px ${FONT_HAND}`;
    const wrappedLines = wrapText(ctx, fullText, maxW);

    wrappedLines.forEach(line => {
      ctx.fillStyle = COLORS.inkBlack;
      ctx.font = `23px ${FONT_HAND}`;

      let hasMatch = false;
      for (const seg of segments) {
        if (seg.color !== COLORS.inkBlack && line.includes(seg.text)) {
          hasMatch = true;
          const parts = line.split(seg.text);
          ctx.fillText(parts[0], indent, y);
          const p1W = ctx.measureText(parts[0]).width;

          ctx.fillStyle = seg.color;
          ctx.font = `bold 23px ${FONT_HAND}`;
          ctx.fillText(seg.text, indent + p1W, y);
          const segW = ctx.measureText(seg.text).width;

          ctx.fillStyle = COLORS.inkBlack;
          ctx.font = `23px ${FONT_HAND}`;
          ctx.fillText(parts.slice(1).join(seg.text), indent + p1W + segW, y);
          break;
        }
      }

      if (!hasMatch) {
        ctx.fillText(line, indent, y);
      }

      y += 36;
    });

    y += 10;
  });

  return y;
}

/**
 * Generate 6-Slide Spiral Notebook Instagram Carousel (4:5 Ratio)
 * Dynamically generated from the verified 14-page curriculum for any topic!
 */
async function generateNotebookCarouselSlides(arg1, arg2) {
  let campaignId, topic, title, summary, keyword;
  if (arg1 && (arg1.topic || arg1.id)) {
    campaignId = arg1.campaignId || arg1.id || (arg2 && arg2.id);
    topic = arg1.topic || (arg2 && arg2.title) || '';
    title = arg1.title || (arg2 && arg2.title) || topic;
    summary = arg1.summary || '';
    keyword = arg1.keyword || 'NOTES';
  } else {
    ({ campaignId, topic = '', title = '', summary = '', keyword = 'NOTES' } = arg1 || {});
  }

  const timestamp = Date.now();
  const carouselDir = path.join(__dirname, '..', '..', 'public', 'generated', 'carousels', String(campaignId || timestamp));
  if (!fs.existsSync(carouselDir)) {
    fs.mkdirSync(carouselDir, { recursive: true });
  }

  const profile = resolveTechProfile(topic || title);
  const brandAssets = getBrandAssets ? getBrandAssets() : {
    brand_name: getSetting('brand_name', 'Omni Engineering & AI'),
    brand_handle: getSetting('instagram_handle', '@harshparmar007__'),
    brand_watermark_position: getSetting('brand_watermark_position', 'top-right'),
    brand_watermark_opacity: 0.9
  };
  const handle = brandAssets.brand_handle || getSetting('instagram_handle', '@harshparmar007__');
  const safeKeyword = (keyword || profile.name || 'NOTES').toUpperCase();

  // Load deep 14-page curriculum for the topic
  const curriculum = get14PageCurriculum(topic || title);
  const slidePaths = [];

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 1: AUTHENTIC SPIRAL NOTEBOOK COVER
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    const cov = curriculum.pages[0];
    let curY = 175;
    const midX = WIDTH / 2 + 35;

    // Title Part 1 with Radiant Burst Rays
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `800 46px ${FONT_HAND}`;
    const t1 = cov.titlePart1 || profile.name.toUpperCase();
    const t1W = ctx.measureText(t1).width;
    const t1X = midX - t1W / 2;

    // Radiant red burst rays flaring away from title
    ctx.strokeStyle = COLORS.inkRed;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Left rays
    ctx.moveTo(t1X - 16, curY - 26); ctx.lineTo(t1X - 38, curY - 38);
    ctx.moveTo(t1X - 18, curY - 14); ctx.lineTo(t1X - 44, curY - 14);
    ctx.moveTo(t1X - 16, curY - 2);  ctx.lineTo(t1X - 38, curY + 10);
    // Right rays
    ctx.moveTo(t1X + t1W + 16, curY - 26); ctx.lineTo(t1X + t1W + 38, curY - 38);
    ctx.moveTo(t1X + t1W + 18, curY - 14); ctx.lineTo(t1X + t1W + 44, curY - 14);
    ctx.moveTo(t1X + t1W + 16, curY - 2);  ctx.lineTo(t1X + t1W + 38, curY + 10);
    ctx.stroke();

    ctx.fillText(t1, t1X, curY);

    // Title Part 2
    curY += 75;
    ctx.fillStyle = COLORS.inkRed;
    ctx.font = `800 62px ${FONT_HAND}`;
    ctx.textAlign = 'center';
    ctx.fillText(cov.titlePart2 || 'COMPLETE NOTES &', midX, curY);

    // Title Part 3
    curY += 75;
    ctx.fillStyle = COLORS.inkBlack;
    ctx.font = `800 58px ${FONT_HAND}`;
    ctx.fillText(cov.titlePart3 || 'CHEAT SHEET', midX, curY);

    // Title Part 4 ("— IN —")
    curY += 65;
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `bold 32px ${FONT_HAND}`;
    ctx.fillText(`—  ${cov.titlePart4 || 'IN'}  —`, midX, curY);

    // Title Part 5 (Tech Name)
    curY += 75;
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `800 64px ${FONT_HAND}`;
    ctx.fillText(cov.titlePart5 || profile.name.toUpperCase(), midX, curY);
    ctx.textAlign = 'left';

    // 3-Stage Pipeline Diagram
    curY += 70;
    const diag = cov.diagram || {
      b1Title: 'BLUEPRINT', b1Top: 'Directives', b1Bot: 'Syntax',
      b2Title: 'ENGINE', b2Type: 'cube',
      b3Title: 'PRODUCTION', b3Type: 'globe'
    };

    const bW = 210;
    const bH = 135;
    const b1X = 180;
    const b2X = 460;
    const b3X = 740;

    // Box 1: Blueprint
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `bold 22px ${FONT_HAND}`;
    ctx.textAlign = 'center';
    ctx.fillText(diag.b1Title, b1X + bW / 2, curY);

    ctx.fillStyle = COLORS.boxBg;
    roundRect(ctx, b1X, curY + 14, bW, bH, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    ctx.fillStyle = COLORS.inkBlack;
    ctx.font = `20px ${FONT_HAND}`;
    ctx.fillText(diag.b1Top || 'Recipe', b1X + bW / 2, curY + 60);
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(b1X + 25, curY + 75); ctx.lineTo(b1X + bW - 25, curY + 75); ctx.stroke();
    ctx.fillText(diag.b1Bot || 'Layers', b1X + bW / 2, curY + 110);

    // Arrow 1
    drawHandArrow(ctx, b1X + bW + 12, curY + 14 + bH / 2, b2X - 12, curY + 14 + bH / 2, COLORS.inkRed, 3.5, 12);

    // Box 2: 3D Cube / Engine
    ctx.fillStyle = COLORS.inkRed;
    ctx.font = `bold 22px ${FONT_HAND}`;
    ctx.fillText(diag.b2Title, b2X + bW / 2, curY);

    ctx.fillStyle = COLORS.boxBg;
    roundRect(ctx, b2X, curY + 14, bW, bH, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.inkRed;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    draw3DCube(ctx, b2X + bW / 2 - 30, curY + 36, 52, COLORS.inkBlue);

    // Arrow 2
    drawHandArrow(ctx, b2X + bW + 12, curY + 14 + bH / 2, b3X - 12, curY + 14 + bH / 2, COLORS.inkRed, 3.5, 12);

    // Box 3: Real World Globe / Entity
    ctx.fillStyle = COLORS.inkGreen;
    ctx.font = `bold 22px ${FONT_HAND}`;
    ctx.fillText(diag.b3Title, b3X + bW / 2, curY);

    ctx.fillStyle = COLORS.boxBg;
    roundRect(ctx, b3X, curY + 14, bW, bH, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.inkGreen;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    drawGlobe(ctx, b3X + bW / 2, curY + 14 + bH / 2, 36, COLORS.inkGreen);
    ctx.textAlign = 'left';

    // Author Watermark
    curY += bH + 90;
    const authorText = cov.author || 'OmniResearch • Notes Engine';
    ctx.textAlign = 'center';
    ctx.font = `bold 28px ${FONT_HAND}`;
    const authorFull = `by  ${authorText}`;
    const fullW = ctx.measureText(authorFull).width;
    const authorX = midX;

    ctx.fillStyle = COLORS.paperBg;
    roundRect(ctx, authorX - fullW / 2 - 14, curY - 30, fullW + 28, 48, 8);
    ctx.fill();

    ctx.fillStyle = COLORS.inkBlack;
    ctx.fillText('by  ', authorX - ctx.measureText(authorText).width / 2 - 10, curY);
    ctx.fillStyle = COLORS.inkRed;
    ctx.fillText(authorText, authorX + 15, curY);

    // Underline with terminal dots
    const lineY = curY + 14;
    ctx.strokeStyle = COLORS.inkBlue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(authorX - fullW / 2, lineY);
    ctx.lineTo(authorX + fullW / 2, lineY);
    ctx.stroke();
    ctx.fillStyle = COLORS.inkBlue;
    ctx.beginPath();
    ctx.arc(authorX - fullW / 2, lineY, 4, 0, Math.PI * 2);
    ctx.arc(authorX + fullW / 2, lineY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';

    // Swipe CTA
    drawSwipeCta(ctx, 'SWIPE TO OPEN HANDWRITTEN NOTES >>');
    drawBrandWatermark(ctx, brandAssets);

    const p1 = path.join(carouselDir, 'slide_1.png');
    fs.writeFileSync(p1, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_1.png`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 2: WHAT IS IT & 5 GOLDEN PILLARS
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    const p2 = curriculum.pages[1];
    let curY = 120;
    curY = drawSlideHeader(ctx, p2.header || 'CORE FUNDAMENTALS & PILLARS', curY, COLORS.inkRed);

    // Section 1: What is {Tech}?
    if (p2.sec1 && p2.sec1.title) {
      drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
      ctx.fillStyle = COLORS.inkBlue;
      ctx.font = `800 30px ${FONT_HAND}`;
      ctx.fillText(p2.sec1.title, 180, curY);

      const tW = ctx.measureText(p2.sec1.title).width;
      ctx.strokeStyle = COLORS.inkBlue;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(180, curY + 18);
      ctx.lineTo(180 + tW + 10, curY + 18);
      ctx.stroke();

      curY += 55;
      if (p2.sec1.bullets) {
        curY = renderBulletList(ctx, p2.sec1.bullets, curY, 760);
      }
    }

    // Section 2: 5 Pillars / Core Benefits
    if (p2.sec2 && p2.sec2.title) {
      curY += 25;
      drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
      ctx.fillStyle = COLORS.inkBlue;
      ctx.font = `800 30px ${FONT_HAND}`;
      ctx.fillText(p2.sec2.title, 180, curY);

      const tW = ctx.measureText(p2.sec2.title).width;
      ctx.strokeStyle = COLORS.inkBlue;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(180, curY + 18);
      ctx.lineTo(180 + tW + 10, curY + 18);
      ctx.stroke();

      curY += 55;
      if (p2.sec2.items) {
        p2.sec2.items.forEach(item => {
          const numText = item.num || item.name || '';
          ctx.fillStyle = COLORS.inkRed;
          ctx.font = `bold 24px ${FONT_HAND}`;
          const nW = ctx.measureText(numText).width;

          if (nW > 200) {
            // Stack layout
            ctx.fillText(numText, 185, curY);
            curY += 34;
            ctx.fillStyle = COLORS.inkBlack;
            ctx.font = `22px ${FONT_HAND}`;
            const descLines = wrapText(ctx, item.desc, 700);
            descLines.forEach((dl, dlI) => {
              ctx.fillText(`• ${dl}`, 215, curY + dlI * 30);
            });
            curY += descLines.length * 30 + 12;
          } else {
            // Side-by-side layout
            ctx.fillText(numText, 185, curY);
            const colX = Math.max(380, 185 + nW + 15);
            ctx.fillStyle = COLORS.inkBlack;
            ctx.fillText(':', colX, curY);

            ctx.font = `22px ${FONT_HAND}`;
            const descLines = wrapText(ctx, item.desc, WIDTH - colX - 70);
            descLines.forEach((dl, dlI) => {
              ctx.fillText(dl, colX + 18, curY + dlI * 30);
            });
            curY += Math.max(descLines.length * 30, 44) + 8;
          }
        });
      }
    }

    drawSwipeCta(ctx, 'NEXT: ARCHITECTURE & SYNTAX >>');
    drawBrandWatermark(ctx, brandAssets);

    const p2Path = path.join(carouselDir, 'slide_2.png');
    fs.writeFileSync(p2Path, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_2.png`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 3: SYNTAX, BLUEPRINT & PRODUCTION CODE
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    const p3 = curriculum.pages[2] || curriculum.pages[1];
    let curY = 120;
    curY = drawSlideHeader(ctx, p3.header || 'SYNTAX & ARCHITECTURE', curY, COLORS.inkRed);

    // Section 1: Title & Bullets
    if (p3.sec1 && p3.sec1.title) {
      drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
      ctx.fillStyle = COLORS.inkBlue;
      ctx.font = `800 28px ${FONT_HAND}`;
      ctx.fillText(p3.sec1.title, 180, curY);
      curY += 45;

      if (p3.sec1.bullets) {
        curY = renderBulletList(ctx, p3.sec1.bullets.slice(0, 2), curY, 760);
      }
    }

    // Code Box / Blueprint Box
    curY += 15;
    drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `800 28px ${FONT_HAND}`;
    const codeTitle = (p3.sec3 && p3.sec3.title) || (p3.sec2 && p3.sec2.title) || 'Production Blueprint:';
    ctx.fillText(codeTitle, 180, curY);
    curY += 45;

    // Pick code lines from sec3 or sec2 or fallback
    let codeLines = [];
    let arrows = [];
    if (p3.sec3 && p3.sec3.codeBoxWithArrows) {
      codeLines = p3.sec3.codeBoxWithArrows.lines;
      arrows = p3.sec3.codeBoxWithArrows.arrows || [];
    } else if (p3.sec2 && p3.sec2.codeBoxWithArrows) {
      codeLines = p3.sec2.codeBoxWithArrows.lines;
      arrows = p3.sec2.codeBoxWithArrows.arrows || [];
    } else if (p3.sec1 && p3.sec1.codeBoxWithArrows) {
      codeLines = p3.sec1.codeBoxWithArrows.lines;
      arrows = p3.sec1.codeBoxWithArrows.arrows || [];
    } else if (curriculum.pages[3] && curriculum.pages[3].sec2 && curriculum.pages[3].sec2.codeBox) {
      codeLines = curriculum.pages[3].sec2.codeBox.lines || [];
    }

    if (!codeLines || codeLines.length === 0) {
      codeLines = [
        `# Production Configuration for ${profile.name}`,
        `spec_version: 2.5`,
        `service: ${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_core`,
        `environment: production`,
        `status: verified_healthy`
      ];
    }

    // Measure max line width
    ctx.font = `bold 20px ${FONT_CODE}`;
    const maxLineW = Math.max(...codeLines.map(l => ctx.measureText(l).width));
    const hasArrows = arrows.length > 0;
    const boxW = hasArrows ? Math.min(Math.max(maxLineW + 40, 480), 550) : Math.min(maxLineW + 50, WIDTH - 260);
    const lineH = 34;
    const boxH = codeLines.length * lineH + 36;

    ctx.fillStyle = COLORS.boxBg;
    roundRect(ctx, 180, curY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    codeLines.forEach((line, lIdx) => {
      const lineY = curY + 36 + lIdx * lineH;
      if (line.startsWith('#') || line.startsWith('//')) {
        ctx.fillStyle = COLORS.inkGray;
      } else if (line.includes('class') || line.includes('def') || line.includes('FROM') || line.includes('SELECT')) {
        ctx.fillStyle = COLORS.inkPurple;
      } else if (line.includes('run') || line.includes('print') || line.includes('WHERE') || line.includes('CMD')) {
        ctx.fillStyle = COLORS.inkRed;
      } else {
        ctx.fillStyle = COLORS.inkBlue;
      }
      ctx.font = `bold 19px ${FONT_CODE}`;
      ctx.fillText(line, 202, lineY);

      // Render Callout Arrow if present
      const arr = arrows.find(a => a.lineIndex === lIdx);
      if (arr) {
        drawHandArrow(ctx, 180 + boxW + 8, lineY - 6, 180 + boxW + 50, lineY - 6, COLORS.inkBlue, 2.4, 9);
        ctx.fillStyle = COLORS.inkBlue;
        ctx.font = `bold 19px ${FONT_HAND}`;
        ctx.fillText(arr.text, 180 + boxW + 58, lineY);
      }
    });

    curY += boxH + 30;

    // Takeaway note
    if (curY < 1120) {
      ctx.fillStyle = '#E8F5E9';
      roundRect(ctx, 180, curY, WIDTH - 260, 95, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.inkGreen;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.inkGreen;
      ctx.font = `bold 22px ${FONT_HAND}`;
      ctx.fillText('ARCHITECTURE PRO-TIP:', 200, curY + 35);
      ctx.fillStyle = COLORS.inkBlack;
      ctx.font = `21px ${FONT_HAND}`;
      ctx.fillText(`Always isolate state and leverage modular abstractions for maximum scalability.`, 200, curY + 68);
    }

    drawSwipeCta(ctx, 'NEXT: PRODUCTION DEEP DIVE >>');
    drawBrandWatermark(ctx, brandAssets);

    const p3Path = path.join(carouselDir, 'slide_3.png');
    fs.writeFileSync(p3Path, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_3.png`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 4: DEEP DIVE CONCEPT & CODE PATTERNS
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    const p4 = curriculum.pages[3] || curriculum.pages[4] || curriculum.pages[2];
    let curY = 120;
    curY = drawSlideHeader(ctx, p4.header || 'PRODUCTION DEEP DIVE', curY, COLORS.inkRed);

    // Section 1
    if (p4.sec1 && p4.sec1.title) {
      drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
      ctx.fillStyle = COLORS.inkBlue;
      ctx.font = `800 28px ${FONT_HAND}`;
      ctx.fillText(p4.sec1.title, 180, curY);
      curY += 45;

      if (p4.sec1.bullets) {
        curY = renderBulletList(ctx, p4.sec1.bullets.slice(0, 3), curY, 760);
      }
    }

    // Section 2 / Modifiers / Code Box
    if (p4.sec2 && p4.sec2.title) {
      curY += 15;
      drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
      ctx.fillStyle = COLORS.inkBlue;
      ctx.font = `800 28px ${FONT_HAND}`;
      ctx.fillText(p4.sec2.title, 180, curY);
      curY += 45;

      if (p4.sec2.rows) {
        // Access modifiers rows (e.g. Python Page 4)
        p4.sec2.rows.forEach(r => {
          ctx.fillStyle = COLORS.inkBlue;
          ctx.font = `bold 24px ${FONT_HAND}`;
          ctx.fillText(`• ${r.type}`, 185, curY);

          ctx.fillStyle = COLORS.inkPurple;
          ctx.font = `bold 22px ${FONT_CODE}`;
          ctx.fillText(r.sym, 340, curY);

          drawHandArrow(ctx, 470, curY - 8, 520, curY - 8, COLORS.inkRed, 2.8, 10);

          ctx.fillStyle = COLORS.inkBlack;
          ctx.font = `22px ${FONT_HAND}`;
          ctx.fillText(r.desc, 535, curY);

          curY += 44;
        });
      } else if (p4.sec2.codeBoxWithArrows || p4.sec2.codeBox) {
        const cBox = p4.sec2.codeBoxWithArrows || p4.sec2.codeBox;
        const lines = (cBox.lines || []).slice(0, 8);
        const arrows = cBox.arrows || [];
        const hasArrows = arrows.length > 0;

        ctx.font = `bold 19px ${FONT_CODE}`;
        const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxW = hasArrows ? Math.min(Math.max(maxLineW + 40, 480), 540) : Math.min(maxLineW + 50, WIDTH - 260);
        const lineH = 33;
        const boxH = lines.length * lineH + 34;

        ctx.fillStyle = COLORS.boxBg;
        roundRect(ctx, 180, curY, boxW, boxH, 12);
        ctx.fill();
        ctx.strokeStyle = COLORS.boxBorder;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        lines.forEach((l, lIdx) => {
          const lineY = curY + 32 + lIdx * lineH;
          ctx.fillStyle = l.includes('#') ? COLORS.inkGray : (l.includes('def') || l.includes('FROM') ? COLORS.inkPurple : COLORS.inkBlack);
          ctx.font = `bold 19px ${FONT_CODE}`;
          ctx.fillText(l, 202, lineY);

          const arr = arrows.find(a => a.lineIndex === lIdx);
          if (arr) {
            drawHandArrow(ctx, 180 + boxW + 8, lineY - 6, 180 + boxW + 48, lineY - 6, COLORS.inkRed, 2.4, 9);
            ctx.fillStyle = COLORS.inkBlue;
            ctx.font = `bold 18px ${FONT_HAND}`;
            ctx.fillText(arr.text, 180 + boxW + 56, lineY);
          }
        });

        curY += boxH + 20;
      } else if (p4.sec2.bullets) {
        curY = renderBulletList(ctx, p4.sec2.bullets, curY, 760);
      }
    }

    // Pro-Tip Box with dynamic text wrapping
    if (curY < 1120) {
      curY = Math.max(curY + 20, 1020);
      const tipBoxW = WIDTH - 260;
      ctx.font = `21px ${FONT_HAND}`;
      const tipText = 'Interviewers frequently probe edge cases and concurrency safety in production systems.';
      const tipLines = wrapText(ctx, tipText, tipBoxW - 40);
      const tipBoxH = 45 + tipLines.length * 28;

      ctx.fillStyle = '#FFF8E1';
      roundRect(ctx, 180, curY, tipBoxW, tipBoxH, 10);
      ctx.fill();
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#E65100';
      ctx.font = `bold 22px ${FONT_HAND}`;
      ctx.fillText('FAANG INTERVIEW TIP:', 200, curY + 32);

      ctx.fillStyle = COLORS.inkBlack;
      ctx.font = `21px ${FONT_HAND}`;
      tipLines.forEach((tl, tlI) => {
        ctx.fillText(tl, 200, curY + 62 + tlI * 28);
      });
    }

    drawSwipeCta(ctx, 'NEXT: MASTER CHEAT SHEET TABLE >>');
    drawBrandWatermark(ctx, brandAssets);

    const p4Path = path.join(carouselDir, 'slide_4.png');
    fs.writeFileSync(p4Path, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_4.png`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 5: MASTER CHEAT SHEET TABLE (Page 13 of notes)
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    // Page 13 has the master table across all curricula!
    const p13 = curriculum.pages[12] || curriculum.pages[11];
    let curY = 120;
    curY = drawSlideHeader(ctx, p13.header || 'MASTER CHEAT SHEET', curY, COLORS.inkRed);

    // Table search
    let tableObj = null;
    let tableTitle = 'Essential Syntax & Commands Reference:';
    if (p13.sec1 && p13.sec1.table) {
      tableObj = p13.sec1.table;
      tableTitle = p13.sec1.title || tableTitle;
    } else if (p13.sec2 && p13.sec2.table) {
      tableObj = p13.sec2.table;
      tableTitle = p13.sec2.title || tableTitle;
    } else {
      for (const p of curriculum.pages) {
        if (p.sec1 && p.sec1.table) { tableObj = p.sec1.table; break; }
        if (p.sec2 && p.sec2.table) { tableObj = p.sec2.table; break; }
        if (p.sec3 && p.sec3.table) { tableObj = p.sec3.table; break; }
      }
    }

    drawHandAsterisk(ctx, 160, curY - 8, 10, COLORS.inkBlue);
    ctx.fillStyle = COLORS.inkBlue;
    ctx.font = `800 28px ${FONT_HAND}`;
    ctx.fillText(tableTitle, 180, curY);
    curY += 45;

    if (tableObj && tableObj.headers && tableObj.rows) {
      const tX = 175;
      const tW = WIDTH - 245; // ~835px
      const headers = tableObj.headers;
      const rows = tableObj.rows.slice(0, 8);

      let colWidths = [];
      if (headers.length === 3) {
        colWidths = [240, 310, 285];
      } else if (headers.length === 4) {
        colWidths = [190, 180, 240, 225];
      } else {
        const w = Math.floor(tW / headers.length);
        colWidths = headers.map(() => w);
      }

      const rowH = 50;

      // Table Header Row
      ctx.fillStyle = '#E8EAF6';
      roundRect(ctx, tX, curY, tW, rowH, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.boxBorder;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      let headerX = tX;
      headers.forEach((h, hIdx) => {
        ctx.fillStyle = COLORS.inkBlue;
        ctx.font = `bold 22px ${FONT_HAND}`;
        ctx.fillText(h, headerX + 16, curY + 34);
        headerX += colWidths[hIdx] || 200;
      });

      curY += rowH;

      // Data Rows
      rows.forEach((row, rIdx) => {
        ctx.fillStyle = rIdx % 2 === 0 ? '#F8FAFF' : '#FFFFFF';
        ctx.fillRect(tX, curY, tW, rowH);
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.strokeRect(tX, curY, tW, rowH);

        let cellX = tX;
        row.forEach((cell, cIdx) => {
          const cellStr = String(cell || '');
          if (cIdx === 0) {
            ctx.fillStyle = COLORS.inkPurple;
            ctx.font = `bold 20px ${FONT_CODE}`;
          } else if (cIdx === 1) {
            ctx.fillStyle = COLORS.inkBlack;
            ctx.font = `20px ${FONT_HAND}`;
          } else {
            ctx.fillStyle = COLORS.inkRed;
            ctx.font = `bold 19px ${FONT_CODE}`;
          }

          const maxCellW = (colWidths[cIdx] || 200) - 24;
          let printCell = cellStr;
          if (ctx.measureText(printCell).width > maxCellW) {
            while (printCell.length > 3 && ctx.measureText(printCell + '…').width > maxCellW) {
              printCell = printCell.slice(0, -1);
            }
            printCell += '…';
          }

          ctx.fillText(printCell, cellX + 16, curY + 32);
          cellX += colWidths[cIdx] || 200;
        });

        curY += rowH;
      });
    }

    drawSwipeCta(ctx, 'LAST SLIDE: DOWNLOAD FULL 14-PAGE PDF >>');
    drawBrandWatermark(ctx, brandAssets);

    const p5Path = path.join(carouselDir, 'slide_5.png');
    fs.writeFileSync(p5Path, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_5.png`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLIDE 6: LEAD MAGNET CTA (INSTAGRAM DM AUTOMATION)
  // ══════════════════════════════════════════════════════════════════
  {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawNotebookBackground(ctx);
    drawCornerBadge(ctx, curriculum.tag || profile.tag);

    let curY = 155;
    const ctaHeader = `COMPLETE 14-PAGE HANDWRITTEN ${curriculum.tech.toUpperCase()} DOSSIER`;
    let hSize = 26;
    ctx.font = `bold ${hSize}px ${FONT_HAND}`;
    while (ctx.measureText(ctaHeader).width > WIDTH - 260 && hSize > 17) {
      hSize -= 1.5;
      ctx.font = `bold ${hSize}px ${FONT_HAND}`;
    }
    ctx.fillStyle = COLORS.inkBlue;
    ctx.textAlign = 'center';
    ctx.fillText(ctaHeader, WIDTH / 2 + 35, curY);

    curY += 60;
    ctx.fillStyle = COLORS.inkBlack;
    ctx.font = `800 52px ${FONT_HAND}`;
    ctx.fillText(`Want the Full Spiral PDF?`, WIDTH / 2 + 35, curY);

    curY += 65;
    // Glowing Rounded Box
    const boxW = WIDTH - 270;
    const boxH = 360;
    const boxX = 175;
    const boxY = curY;

    ctx.fillStyle = '#EEF4FF';
    roundRect(ctx, boxX, boxY, boxW, boxH, 20);
    ctx.fill();
    ctx.strokeStyle = COLORS.inkBlue;
    ctx.lineWidth = 3.6;
    ctx.stroke();

    ctx.fillStyle = COLORS.inkRed;
    ctx.font = `800 40px ${FONT_HAND}`;
    ctx.fillText(`COMMENT "${safeKeyword}" BELOW`, WIDTH / 2 + 35, boxY + 75);

    ctx.fillStyle = COLORS.inkBlack;
    ctx.font = `24px ${FONT_HAND}`;
    const ctaLines = [
      `Our autonomous AI agent will instantly DM you`,
      `the high-resolution 14-Page Spiral Notebook PDF`,
      `with all diagrams, syntax boxes, and code cheats!`
    ];
    let cy = boxY + 145;
    ctaLines.forEach(l => {
      ctx.fillText(l, WIDTH / 2 + 35, cy);
      cy += 40;
    });

    // Badge inside card
    ctx.fillStyle = COLORS.inkBlue;
    roundRect(ctx, WIDTH / 2 + 35 - 200, boxY + 275, 400, 54, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 21px ${FONT_HAND}`;
    ctx.fillText('Instant DM Delivery via AI Bridge', WIDTH / 2 + 35, boxY + 310);

    // 3 Steps Checklist below card
    curY += boxH + 65;
    ctx.fillStyle = COLORS.inkGray;
    ctx.font = `22px ${FONT_HAND}`;
    ctx.fillText(`1. Follow ${handle}`, WIDTH / 2 + 35, curY);
    curY += 38;
    ctx.fillText(`2. Comment "${safeKeyword}" on this post`, WIDTH / 2 + 35, curY);
    curY += 38;
    ctx.fillText('3. Check your Instagram DMs for direct link!', WIDTH / 2 + 35, curY);

    ctx.textAlign = 'left';
    drawBrandWatermark(ctx, brandAssets);

    const p6 = path.join(carouselDir, 'slide_6.png');
    fs.writeFileSync(p6, canvas.toBuffer('image/png'));
    slidePaths.push(`/generated/carousels/${campaignId || timestamp}/slide_6.png`);
  }

  console.log(`[Notebook Carousel] 📓 Generated 6-Slide Spiral Notebook Carousel for "${curriculum.tech}" in ${carouselDir}`);

  return {
    success: true,
    campaignId,
    slideCount: slidePaths.length,
    slides: slidePaths,
    directory: carouselDir
  };
}

module.exports = {
  generateNotebookCarouselSlides
};
