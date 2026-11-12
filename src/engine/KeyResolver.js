/**
 * @fileoverview Resolves a rate limit key from a request context.
 * Validates the resolved key before returning it.
 */

import { ErrorFactory } from '../errors/ErrorFactory.js'
import { DEFAULTS }     from '../constants/defaults.js'
import { createLogger } from '../logger/LoggerFactory.js'

const logger = createLogger('KeyResolver')

export class KeyResolver {
  /**
   * @param {import('../types/index.js').KeyResolverFn} resolverFn
   * @param {string} [prefix]
   */
  constructor(resolverFn, prefix = DEFAULTS.KEY_PREFIX) {
    if (typeof resolverFn !== 'function') {
      throw ErrorFactory.missingField('keyBy', { reason: 'keyBy must be a function' })
    }
    this._resolverFn = resolverFn
    this._prefix     = prefix
  }

  /**
   * Resolves and prefixes the key for a given request context.
   *
   * @param {import('../types/index.js').RequestContext} context
   * @returns {Promise<string>}
   */
  async resolve(context) {
    const raw = await this._resolverFn(context)

    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
      logger.warn('Key resolver returned empty key, falling back to IP', { context })
      return `${this._prefix}${context.ip ?? 'unknown'}`
    }

    return `${this._prefix}${raw}`
  }
}
