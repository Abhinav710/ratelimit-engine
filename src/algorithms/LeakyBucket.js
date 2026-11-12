/**
 * @fileoverview Leaky Bucket algorithm.
 * Requests are processed at a fixed leak rate regardless of burst size.
 * Excess requests are dropped. Ideal for strict output rate control.
 */

import { BaseAlgorithm } from './BaseAlgorithm.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES } from '../constants/algorithms.js'
import { DEFAULTS }        from '../constants/defaults.js'
import { createLogger }    from '../logger/LoggerFactory.js'

const logger = createLogger('LeakyBucket')

export class LeakyBucket extends BaseAlgorithm {
  /**
   * @param {Object} options
   * @param {number} options.capacity  - Max bucket size (queue depth).
   * @param {number} options.leakRate  - Requests allowed per second.
   */
  constructor({
    capacity  = DEFAULTS.LEAKY_BUCKET_CAPACITY,
    leakRate  = DEFAULTS.LEAKY_BUCKET_LEAK_RATE,
  } = {}) {
    super(ALGORITHM_NAMES.LEAKY_BUCKET)

    if (capacity <= 0) {
      throw ErrorFactory.invalidValue('capacity', capacity, 'must be a positive integer')
    }
    if (leakRate <= 0) {
      throw ErrorFactory.invalidValue('leakRate', leakRate, 'must be a positive number')
    }

    this._capacity = capacity
    this._leakRate = leakRate
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    const now      = Date.now()
    const ttlMs    = Math.ceil((this._capacity / this._leakRate) * 1000)
    const entry    = await store.get(key)
    const lastMeta = entry?.meta ?? { queue: 0, lastLeak: now }

    const elapsed   = (now - lastMeta.lastLeak) / 1000
    const leaked    = elapsed * this._leakRate
    const queue     = Math.max(0, lastMeta.queue - leaked)
    const allowed   = queue < this._capacity
    const newQueue  = allowed ? queue + 1 : queue
    const remaining = Math.max(0, this._capacity - Math.ceil(newQueue))

    const msUntilSlot = allowed
      ? 0
      : Math.ceil((queue - this._capacity + 1) / this._leakRate * 1000)
    const resetAt = new Date(now + msUntilSlot)

    await store.set(key, {
      count:       Math.ceil(newQueue),
      windowStart: now,
      expiresAt:   now + ttlMs,
      meta:        { queue: newQueue, lastLeak: now },
    }, ttlMs)

    logger.debug('Leaky bucket check', { key, queue, newQueue, allowed })

    return {
      allowed,
      limit:      this._capacity,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(msUntilSlot / 1000),
    }
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<void>}
   */
  async reset(key, store) {
    await store.delete(key)
    logger.debug('Leaky bucket reset', { key })
  }
}
