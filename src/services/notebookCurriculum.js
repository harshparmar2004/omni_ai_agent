/**
 * Deep 14-Page Curriculum Engine for Spiral Notebook Notes
 * Powered by Universal Dynamic Curriculum Generator v4.0
 * ZERO hardcoded technology files. Supports ANY topic dynamically.
 */

const {
  generateUniversalCurriculum,
  synthesizeUniversalProceduralCurriculum
} = require('./curriculumGenerator');

/**
 * Synchronous resolver for any topic
 * @param {string} topic - Technology topic
 * @param {Object} [researchContext] - Live research context
 * @returns {Object} 14-page curriculum conforming to notebook schema
 */
function get14PageCurriculum(topic, researchContext = null) {
  return synthesizeUniversalProceduralCurriculum(topic, researchContext);
}

/**
 * Asynchronous resolver using live LLM reasoning with failover
 * @param {string} topic - Technology topic
 * @param {Object} [researchContext] - Live research context
 * @param {string} [provider] - Optional LLM provider
 * @param {string} [model] - Optional model
 * @returns {Promise<Object>} 14-page curriculum
 */
async function get14PageCurriculumAsync(topic, researchContext = null, provider = null, model = null) {
  return generateUniversalCurriculum({ topic, researchContext, provider, model });
}

module.exports = {
  get14PageCurriculum,
  get14PageCurriculumAsync
};
