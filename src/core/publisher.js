const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { getPublicUrlForMedia } = require('./mediaHost');
const { getGraphBase } = require('./tokenManager');

/**
 * OmniStudio v7 — Meta Graph API v21.0 Publisher
 * Clean, production publisher for Reels, Carousels, and Photos.
 * Zero mock mode, zero microservice hijacking, 100% official Meta API.
 */

async function pollContainer(containerId, token, baseUrl, onProgress = null) {
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 45;

  while (!isReady && attempts < maxAttempts) {
    const delay = attempts < 3 ? 1000 : 2000;
    await new Promise(r => setTimeout(r, delay));
    attempts++;

    if (onProgress) {
      onProgress('polling', attempts, maxAttempts);
    }

    try {
      const res = await axios.get(`${baseUrl}/${containerId}`, {
        params: { fields: 'status_code,status', access_token: token },
        timeout: 10000
      });

      const statusCode = res.data?.status_code;
      const statusMsg = res.data?.status || '';

      console.log(`[Publisher] Container status (${attempts}/${maxAttempts}): ${statusCode} ${statusMsg ? `(${statusMsg})` : ''}`);

      if (statusCode === 'FINISHED') {
        isReady = true;
      } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        console.error(`[Publisher] Container failure payload:`, JSON.stringify(res.data));
        throw new Error(`Meta container processing failed: ${statusCode} ${statusMsg ? `(${statusMsg})` : ''}`);
      }
    } catch (pollErr) {
      if (pollErr.message && pollErr.message.includes('Meta container processing failed')) {
        throw pollErr;
      }
      console.warn(`[Publisher] Container status polling warning (${attempts}/${maxAttempts}):`, pollErr.response?.data || pollErr.message);
      if (attempts >= maxAttempts) {
        throw pollErr;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!isReady) {
    throw new Error(`Meta container processing timed out after ${maxAttempts} attempts (~${maxAttempts * 2.5}s)`);
  }

  return containerId;
}

async function fetchPermalink(igMediaId, token, baseUrl) {
  try {
    const res = await axios.get(`${baseUrl}/${igMediaId}`, {
      params: { fields: 'permalink', access_token: token },
      timeout: 8000
    });
    if (res.data?.permalink) return res.data.permalink;
  } catch (e) {
    // Fallback if permalink field fails
  }
  return `https://www.instagram.com/reel/${igMediaId}/`;
}

/**
 * Check Meta's content_publishing_limit for the page
 */
async function getPublishingLimit(page) {
  const token = page.access_token;
  const igUserId = page.ig_user_id;
  const baseUrl = getGraphBase(token);

  try {
    const res = await axios.get(`${baseUrl}/${igUserId}/content_publishing_limit`, {
      params: {
        fields: 'config,quota_usage',
        access_token: token
      },
      timeout: 8000
    });
    return res.data?.data?.[0] || null;
  } catch (err) {
    return null;
  }
}

/**
 * Publish a Reel (video)
 */
async function publishReel({ page, videoPath, caption, coverPath = null, onProgress = null }) {
  const token = page.access_token;
  const igUserId = page.ig_user_id;
  const baseUrl = getGraphBase(token);

  if (!token || !igUserId) {
    throw new Error(`Page ${page.slug} is missing Meta credentials`);
  }

  if (onProgress) onProgress('uploading', 0, 1);

  const publicVideoUrl = await getPublicUrlForMedia(videoPath);
  console.log(`[Publisher] 🚀 Publishing Reel for ${page.handle} via ${baseUrl}...`);
  console.log(`[Publisher] 🌐 Public video URL: ${publicVideoUrl}`);

  const initParams = {
    media_type: 'REELS',
    video_url: publicVideoUrl,
    caption: caption,
    thumb_offset: 1500,
    is_ai_generated: false,
    access_token: token
  };

  if (coverPath) {
    initParams.cover_url = await getPublicUrlForMedia(coverPath);
  }

  // 1. Create Media Container
  let initRes;
  try {
    initRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
      params: initParams,
      timeout: 35000
    });
  } catch (err) {
    if (initParams.is_ai_generated !== undefined || initParams.thumb_offset !== undefined) {
      console.warn(`[Publisher] Retrying reel container creation without optional AI/offset tags: ${err.response?.data?.error?.message || err.message}`);
      delete initParams.is_ai_generated;
      delete initParams.thumb_offset;
      initRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
        params: initParams,
        timeout: 35000
      });
    } else {
      throw err;
    }
  }

  const containerId = initRes.data?.id;
  if (!containerId) {
    throw new Error('Meta API did not return container ID for reel');
  }

  // 2. Poll container status until FINISHED
  await pollContainer(containerId, token, baseUrl, onProgress);

  // 3. Publish container live
  if (onProgress) onProgress('publishing', 1, 1);

  const publishRes = await axios.post(`${baseUrl}/${igUserId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
    timeout: 35000
  });

  const igMediaId = publishRes.data?.id;
  if (!igMediaId) {
    throw new Error('Meta API media_publish did not return media ID');
  }

  const permalink = await fetchPermalink(igMediaId, token, baseUrl);
  console.log(`[Publisher] ✅ Reel published live! Media ID: ${igMediaId} | Permalink: ${permalink}`);

  return {
    success: true,
    ig_media_id: igMediaId,
    permalink,
    published_at: new Date().toISOString()
  };
}

/**
 * Publish a Carousel (2-10 items)
 */
async function publishCarousel({ page, imagePaths, caption, onProgress = null }) {
  const token = page.access_token;
  const igUserId = page.ig_user_id;
  const baseUrl = getGraphBase(token);

  if (!Array.isArray(imagePaths) || imagePaths.length < 2) {
    throw new Error(`Carousel requires at least 2 images, got ${imagePaths?.length || 0}`);
  }

  if (onProgress) onProgress('uploading_items', 0, imagePaths.length);

  // 1. Create child items
  const childIds = [];
  for (let i = 0; i < Math.min(10, imagePaths.length); i++) {
    const publicUrl = await getPublicUrlForMedia(imagePaths[i]);
    const childRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
      params: {
        image_url: publicUrl,
        is_carousel_item: true,
        access_token: token
      },
      timeout: 25000
    });

    const childId = childRes.data?.id;
    if (!childId) throw new Error(`Failed to create carousel child item ${i + 1}`);
    childIds.push(childId);
    if (onProgress) onProgress('uploading_items', i + 1, imagePaths.length);
  }

  // 2. Create parent container
  if (onProgress) onProgress('creating_carousel', 0, 1);
  const carouselRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
    params: {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: caption,
      is_ai_generated: false,
      access_token: token
    },
    timeout: 25000
  });

  const containerId = carouselRes.data?.id;
  if (!containerId) throw new Error('Meta API did not return carousel parent container ID');

  // 3. Poll parent container
  await pollContainer(containerId, token, baseUrl, onProgress);

  // 4. Publish live
  if (onProgress) onProgress('publishing', 1, 1);
  const publishRes = await axios.post(`${baseUrl}/${igUserId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
    timeout: 25000
  });

  const igMediaId = publishRes.data?.id;
  if (!igMediaId) throw new Error('Meta API media_publish did not return media ID for carousel');

  const permalink = await fetchPermalink(igMediaId, token, baseUrl);
  console.log(`[Publisher] ✅ Carousel published live! Media ID: ${igMediaId} | Permalink: ${permalink}`);

  return {
    success: true,
    ig_media_id: igMediaId,
    permalink,
    published_at: new Date().toISOString()
  };
}

/**
 * Publish a single Image
 */
async function publishImage({ page, imagePath, caption, onProgress = null }) {
  const token = page.access_token;
  const igUserId = page.ig_user_id;
  const baseUrl = getGraphBase(token);

  if (onProgress) onProgress('uploading', 0, 1);
  const publicUrl = await getPublicUrlForMedia(imagePath);

  const initRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
    params: {
      image_url: publicUrl,
      caption: caption,
      is_ai_generated: false,
      access_token: token
    },
    timeout: 25000
  });

  const containerId = initRes.data?.id;
  if (!containerId) throw new Error('Meta API did not return container ID for image');

  await pollContainer(containerId, token, baseUrl, onProgress);

  if (onProgress) onProgress('publishing', 1, 1);
  const publishRes = await axios.post(`${baseUrl}/${igUserId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
    timeout: 25000
  });

  const igMediaId = publishRes.data?.id;
  if (!igMediaId) throw new Error('Meta API media_publish did not return media ID for image');

  const permalink = await fetchPermalink(igMediaId, token, baseUrl);
  console.log(`[Publisher] ✅ Image published live! Media ID: ${igMediaId} | Permalink: ${permalink}`);

  return {
    success: true,
    ig_media_id: igMediaId,
    permalink,
    published_at: new Date().toISOString()
  };
}

/**
 * Publish an Instagram Story (Video or Image)
 * Meta Graph API v21.0 - media_type: 'STORIES'
 * Note: Stories do NOT accept captions.
 */
async function publishStory({ page, videoPath = null, imagePath = null, onProgress = null }) {
  const token = page.access_token;
  const igUserId = page.ig_user_id;
  const baseUrl = getGraphBase(token);

  if (!token || !igUserId) {
    throw new Error(`Page ${page.slug} is missing Meta credentials`);
  }

  if (!videoPath && !imagePath) {
    throw new Error('Either videoPath or imagePath is required to publish a Story');
  }

  const isVideo = Boolean(videoPath);
  let publicMediaUrl = '';

  const isMoviePage = page.slug === 'movies' || page.id === 2 || (page.handle && page.handle.includes('movie'));
  const pageTheme = isMoviePage ? 'movies' : 'gta6';

  if (isVideo) {
    const { prepareVideoForStory } = require('../utils/ffmpegHelper');
    const safeVideoPath = await prepareVideoForStory(videoPath, { handle: page.handle, page, theme: pageTheme });
    publicMediaUrl = await getPublicUrlForMedia(safeVideoPath);
  } else {
    const { prepareImageForStory } = require('../utils/ffmpegHelper');
    const safeImagePath = await prepareImageForStory(imagePath, { handle: page.handle, page, theme: pageTheme });
    publicMediaUrl = await getPublicUrlForMedia(safeImagePath);
  }

  console.log(`[Publisher] 🌟 Publishing Instagram Story for ${page.handle} via ${baseUrl}...`);
  console.log(`[Publisher] 🌐 Public story media URL: ${publicMediaUrl}`);

  const cleanHandle = page.handle ? page.handle.replace(/^@/, '') : '';

  const initParams = {
    media_type: 'STORIES',
    is_ai_generated: false,
    access_token: token
  };


  if (isVideo) {
    initParams.video_url = publicMediaUrl;
  } else {
    initParams.image_url = publicMediaUrl;
  }

  if (onProgress) onProgress('uploading_story', 0, 1);

  // 1. Create Story Media Container
  let initRes;
  try {
    initRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
      params: initParams,
      timeout: 35000
    });
  } catch (err) {
    if (initParams.is_ai_generated !== undefined) {
      console.warn(`[Publisher] Retrying story container creation without is_ai_generated tag: ${err.response?.data?.error?.message || err.message}`);
      delete initParams.is_ai_generated;
      initRes = await axios.post(`${baseUrl}/${igUserId}/media`, null, {
        params: initParams,
        timeout: 35000
      });
    } else {
      throw err;
    }
  }

  const containerId = initRes.data?.id;
  if (!containerId) {
    throw new Error('Meta API did not return container ID for Story');
  }

  // 2. Poll container status until FINISHED
  await pollContainer(containerId, token, baseUrl, onProgress);

  // 3. Publish Story Container Live
  if (onProgress) onProgress('publishing_story', 1, 1);

  const publishRes = await axios.post(`${baseUrl}/${igUserId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
    timeout: 35000
  });

  const igMediaId = publishRes.data?.id;
  if (!igMediaId) {
    throw new Error('Meta API media_publish did not return media ID for Story');
  }

  const storyUrl = cleanHandle ? `https://www.instagram.com/stories/${cleanHandle}/` : 'https://www.instagram.com/';
  console.log(`[Publisher] ✅ Story published live! Media ID: ${igMediaId} | Story URL: ${storyUrl}`);

  return {
    success: true,
    ig_media_id: igMediaId,
    story_url: storyUrl,
    published_at: new Date().toISOString()
  };
}

module.exports = {
  publishReel,
  publishCarousel,
  publishImage,
  publishStory,
  getPublishingLimit
};
