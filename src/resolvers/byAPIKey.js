/**
 * @fileoverview Resolves the rate limit key from an API key header.
 */

/**
 * @param {import('../types/index.js').RequestContext} context
 * @returns {string}
 */
export function byAPIKey(context) {
  return `apikey:${context.apiKey ?? context.ip ?? 'unknown'}`
}
