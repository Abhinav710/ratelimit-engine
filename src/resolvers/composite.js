/**
 * @fileoverview Composite resolver — combines multiple resolvers into one key.
 * Useful for scoping limits by both user and route simultaneously.
 */

/**
 * Creates a resolver that joins the output of multiple resolvers with a separator.
 *
 * @param {import('../types/index.js').KeyResolverFn[]} resolvers
 * @param {string} [separator]
 * @returns {import('../types/index.js').KeyResolverFn}
 */
export function compositeResolver(resolvers, separator = '|') {
  return async (context) => {
    const parts = await Promise.all(resolvers.map((fn) => fn(context)))
    return parts.join(separator)
  }
}
