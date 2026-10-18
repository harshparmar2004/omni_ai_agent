const { getPages, getPageById } = require('../../database');
const { enqueueJob } = require('../../core/jobQueue');
const { extractShortcodeFromUrl } = require('../../core/downloader');

/**
 * OmniStudio v7 — Agent 1: Reposter
 * Turns on-demand shared Instagram links into live posts on target pages.
 */

async function submitLink({
  url,
  pageId = null,
  origin = 'dashboard',
  chatId = '',
  messageId = '',
  reviewCaption = false
}) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid Instagram URL is required');
  }

  const shortcode = extractShortcodeFromUrl(url);
  if (!shortcode) {
    throw new Error('Could not extract shortcode from Instagram URL');
  }

  // Resolve target page
  let targetPage = null;
  if (pageId) {
    targetPage = getPageById(pageId);
  } else {
    const activePages = getPages({ isActiveOnly: true });
    targetPage = activePages[0];
  }

  if (!targetPage) {
    throw new Error('No active Instagram destination page available');
  }

  const cleanUrl = `https://www.instagram.com/p/${shortcode}/`;

  const result = await enqueueJob({
    agent: 'reposter',
    pageId: targetPage.id,
    shortcode,
    sourceUrl: cleanUrl,
    caption: '',
    status: reviewCaption ? 'pending_review' : 'queued',
    telegramChatId: chatId ? String(chatId) : '',
    telegramMessageId: messageId ? String(messageId) : ''
  });

  return {
    success: true,
    page: targetPage,
    shortcode,
    ...result
  };
}

module.exports = {
  submitLink
};
