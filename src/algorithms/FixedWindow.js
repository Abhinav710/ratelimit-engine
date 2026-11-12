/**
 * @fileoverview Fixed Window algorithm.
 * Counts requests in a fixed time window that resets at a hard boundary.
 * Simple and cheap. Known issue: bursts are possible at window boundaries.
 */

import { BaseAlgorithm } from './BaseAlgorithm.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES } from '../constants/algorithms.js'
import { DEFAULTS }        from '../constants/defaults.js'
import { createLogger }    from '../logger/LoggerFactory.js'

const logger = createLogger('FixedWindow')

export class FixedWindow extends BaseAlgorithm {
  /**
   * @param {Object} options
   * @param {number} options.limit     - Max requests per window.
   * @param {number} options.windowMs  - Window duration in milliseconds.
   */
  constructor({ limit = DEFAULTS.MAX_REQUESTS, windowMs = DEFAULTS.WINDOW_MS } = {}) {
    super(ALGORITHM_NAMES.FIXED_WINDOW)

    if (limit <= 0) {
      throw ErrorFactory.invalidValue('limit', limit, 'must be a positive integer')
    }
    if (windowMs <= 0) {
      throw ErrorFactory.invalidValue('windowMs', windowMs, 'must be a positive integer')
    }

    this._limit    = limit
    this._windowMs = windowMs
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    const now        = Date.now()
    const windowKey  = `${key}:${Math.floor(now / this._windowMs)}`
    const count      = await store.increment(windowKey, this._windowMs)
    const resetAt    = new Date(Math.ceil(now / this._windowMs) * this._windowMs)
    const remaining  = Math.max(0, this._limit - count)
    const allowed    = count <= this._limit

    logger.debug('Fixed window check', { key, count, limit: this._limit, allowed })

    return {
      allowed,
      limit:       this._limit,
      remaining,
      resetAt,
      retryAfter:  allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    }
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<void>}
   */
  async reset(key, store) {
    const now       = Date.now()
    const windowKey = `${key}:${Math.floor(now / this._windowMs)}`
    await store.delete(windowKey)
    logger.debug('Fixed window reset', { key })
  }
}
