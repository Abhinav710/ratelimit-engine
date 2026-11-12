/**
 * @fileoverview Token Bucket algorithm.
 * Tokens refill at a fixed rate up to a maximum capacity.
 * Allows controlled bursting — ideal for API gateways.
 */

import { BaseAlgorithm } from './BaseAlgorithm.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES } from '../constants/algorithms.js'
import { DEFAULTS }        from '../constants/defaults.js'
import { createLogger }    from '../logger/LoggerFactory.js'

const logger = createLogger('TokenBucket')

export class TokenBucket extends BaseAlgorithm {
  /**
   * @param {Object} options
   * @param {number} options.capacity    - Maximum tokens the bucket can hold.
   * @param {number} options.refillRate  - Tokens added per second.
   */
  constructor({
    capacity   = DEFAULTS.TOKEN_BUCKET_CAPACITY,
    refillRate = DEFAULTS.TOKEN_BUCKET_REFILL_RATE,
  } = {}) {
    super(ALGORITHM_NAMES.TOKEN_BUCKET)

    if (capacity <= 0) {
      throw ErrorFactory.invalidValue('capacity', capacity, 'must be a positive integer')
    }
    if (refillRate <= 0) {
      throw ErrorFactory.invalidValue('refillRate', refillRate, 'must be a positive number')
    }

    this._capacity   = capacity
    this._refillRate = refillRate
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    const now       = Date.now()
    const ttlMs     = Math.ceil((this._capacity / this._refillRate) * 1000)
    const entry     = await store.get(key)
    const lastEntry = entry?.meta ?? { tokens: this._capacity, lastRefill: now }

    const elapsed       = (now - lastEntry.lastRefill) / 1000
    const refilled      = elapsed * this._refillRate
    const tokensNow     = Math.min(this._capacity, lastEntry.tokens + refilled)
    const allowed       = tokensNow >= 1
    const tokensAfter   = allowed ? tokensNow - 1 : tokensNow
    const remaining     = Math.floor(tokensAfter)
    const msUntilToken  = allowed ? 0 : Math.ceil((1 - tokensNow) / this._refillRate * 1000)
    const resetAt       = new Date(now + msUntilToken)

    await store.set(key, {
      count:       this._capacity - remaining,
      windowStart: now,
      expiresAt:   now + ttlMs,
      meta:        { tokens: tokensAfter, lastRefill: now },
    }, ttlMs)

    logger.debug('Token bucket check', { key, tokensNow, tokensAfter, allowed })

    return {
      allowed,
      limit:      this._capacity,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(msUntilToken / 1000),
    }
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<void>}
   */
  async reset(key, store) {
    await store.delete(key)
    logger.debug('Token bucket reset', { key })
  }
}
