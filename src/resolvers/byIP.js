/**
 * @fileoverview Resolves the rate limit key from the client's IP address.
 */

/**
 * @param {import('../types/index.js').RequestContext} context
 * @returns {string}
 */
export function byIP(context) {
  return `ip:${context.ip ?? 'unknown'}`
}
