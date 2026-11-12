/**
 * @fileoverview Resolves the rate limit key from an authenticated user ID.
 */

/**
 * @param {import('../types/index.js').RequestContext} context
 * @returns {string}
 */
export function byUser(context) {
  return `user:${context.userId ?? context.ip ?? 'unknown'}`
}
