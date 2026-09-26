const axios = require('axios');
const { getSetting } = require('../database');

/**
 * OmniResearch REST Bridge
 * Connects to meube/yt-dlp-api and subzeroid/aiograpi-rest compatible microservice.
 * Default endpoint: http://localhost:8001 (or custom remote container).
 */

function getMicroserviceBaseUrl() {
  return getSetting('instagram_microservice_url', 'http://127.0.0.1:8001').replace(/\/+$/, '');
}

/**
 * Health check for the REST Microservice
 */
async function checkMicroserviceHealth() {
  const baseUrl = getMicroserviceBaseUrl();
  try {
    const res = await axios.get(`${baseUrl}/`, { timeout: 4000 });
    return {
      online: true,
      baseUrl,
      service: res.data?.service || 'yt-dlp-api & aiograpi-rest',
      status: res.data?.status || 'online',
      loggedInUser: res.data?.logged_in_user || null
    };
  } catch (err) {
    return {
      online: false,
      baseUrl,
      error: err.message
    };
  }
}

/**
 * meube/yt-dlp-api — Extract info & streams
 */
async function fetchMediaInfo(url) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.get(`${baseUrl}/api/info`, {
    params: { url },
    timeout: 30000
  });
  return res.data;
}

/**
 * meube/yt-dlp-api — Download media via REST API
 */
async function downloadMediaViaApi(url, format = 'mp4') {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.post(`${baseUrl}/api/download`, {
    url,
    format
  }, { timeout: 60000 });
  return res.data;
}

/**
 * subzeroid/aiograpi-rest — Authenticate user
 */
async function loginInstagrapi(username, password, verificationCode = null) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.post(`${baseUrl}/auth/login`, {
    username,
    password,
    verification_code: verificationCode
  }, { timeout: 30000 });
  return res.data;
}

/**
 * subzeroid/aiograpi-rest — Authenticate user via session_id
 */
async function loginBySessionId(sessionId) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.post(`${baseUrl}/auth/login_session`, {
    session_id: sessionId
  }, { timeout: 30000 });
  return res.data;
}

/**
 * subzeroid/aiograpi-rest — Upload Reel
 */
async function uploadReelViaApi(videoPath, caption) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.post(`${baseUrl}/media/clip/upload`, {
    path: videoPath,
    caption
  }, { timeout: 60000 });
  return res.data;
}

/**
 * subzeroid/aiograpi-rest — Upload Carousel Album
 */
async function uploadCarouselViaApi(imagePaths, caption) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.post(`${baseUrl}/media/album/upload`, {
    paths: imagePaths,
    caption
  }, { timeout: 60000 });
  return res.data;
}

/**
 * subzeroid/aiograpi-rest — Get User Info
 */
async function getUserInfoViaApi(username) {
  const baseUrl = getMicroserviceBaseUrl();
  const res = await axios.get(`${baseUrl}/user/info_by_username`, {
    params: { username: username.replace('@', '') },
    timeout: 20000
  });
  return res.data;
}

module.exports = {
  getMicroserviceBaseUrl,
  checkMicroserviceHealth,
  fetchMediaInfo,
  downloadMediaViaApi,
  loginInstagrapi,
  loginBySessionId,
  uploadReelViaApi,
  uploadCarouselViaApi,
  getUserInfoViaApi
};
