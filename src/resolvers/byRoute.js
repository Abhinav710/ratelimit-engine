/**
 * @fileoverview Resolves the rate limit key from the HTTP method and path.
 */

/**
 * @param {import('../types/index.js').RequestContext} context
 * @returns {string}
 */
export function byRoute(context) {
  const method = context.method ?? 'UNKNOWN'
  const path   = context.path   ?? '/'
  return `route:${method}:${path}`
}
