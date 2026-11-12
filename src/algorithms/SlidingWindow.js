/**
 * @fileoverview Sliding Window Log algorithm.
 * Counts requests within a rolling window from "now - windowMs" to "now".
 * Eliminates the boundary spike problem of Fixed Window.
 */

import { BaseAlgorithm } from './BaseAlgorithm.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES } from '../constants/algorithms.js'
import { DEFAULTS }        from '../constants/defaults.js'
import { createLogger }    from '../logger/LoggerFactory.js'

const logger = createLogger('SlidingWindow')

export class SlidingWindow extends BaseAlgorithm {
  /**
   * @param {Object} options
   * @param {number} options.limit     - Max requests per window.
   * @param {number} options.windowMs  - Window duration in milliseconds.
   */
  constructor({ limit = DEFAULTS.MAX_REQUESTS, windowMs = DEFAULTS.WINDOW_MS } = {}) {
    super(ALGORITHM_NAMES.SLIDING_WINDOW)

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
   * Uses a weighted count across the current and previous windows
   * to approximate a true sliding window without storing per-request timestamps.
   *
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    const now          = Date.now()
    const currentSlot  = Math.floor(now / this._windowMs)
    const prevSlot     = currentSlot - 1
    const currentKey   = `${key}:${currentSlot}`
    const prevKey      = `${key}:${prevSlot}`

    const [currentEntry, prevEntry] = await Promise.all([
      store.get(currentKey),
      store.get(prevKey),
    ])

    const currentCount = currentEntry?.count ?? 0
    const prevCount    = prevEntry?.count    ?? 0

    // Weight the previous window count by how far into the current window we are
    const windowProgress = (now % this._windowMs) / this._windowMs
    const weightedCount  = Math.floor(prevCount * (1 - windowProgress)) + currentCount

    const newCount  = await store.increment(currentKey, this._windowMs * 2)
    const totalCount = Math.floor(prevCount * (1 - windowProgress)) + newCount
    const remaining  = Math.max(0, this._limit - totalCount)
    const allowed    = totalCount <= this._limit
    const resetAt    = new Date((currentSlot + 1) * this._windowMs)

    logger.debug('Sliding window check', {
      key,
      weightedCount,
      totalCount,
      limit: this._limit,
      allowed,
    })

    return {
      allowed,
      limit:      this._limit,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    }
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<void>}
   */
  async reset(key, store) {
    const now         = Date.now()
    const currentSlot = Math.floor(now / this._windowMs)
    await Promise.all([
      store.delete(`${key}:${currentSlot}`),
      store.delete(`${key}:${currentSlot - 1}`),
    ])
    logger.debug('Sliding window reset', { key })
  }
}
