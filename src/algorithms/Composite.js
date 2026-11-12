/**
 * @fileoverview Composite algorithm.
 * Combines multiple algorithms with ALL (every must pass) or ANY (one must pass) mode.
 * Enables multi-policy enforcement — e.g. burst cap AND daily hard limit.
 */

import { BaseAlgorithm } from './BaseAlgorithm.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES, COMPOSITE_MODES } from '../constants/algorithms.js'
import { createLogger } from '../logger/LoggerFactory.js'

const logger = createLogger('Composite')

export class Composite extends BaseAlgorithm {
  /**
   * @param {Object}   options
   * @param {BaseAlgorithm[]} options.algorithms - Array of algorithm instances to evaluate.
   * @param {string}   [options.mode]            - 'ALL' (default) or 'ANY'.
   */
  constructor({ algorithms, mode = COMPOSITE_MODES.ALL } = {}) {
    super(ALGORITHM_NAMES.COMPOSITE)

    if (!Array.isArray(algorithms) || algorithms.length === 0) {
      throw ErrorFactory.invalidValue('algorithms', algorithms, 'must be a non-empty array of BaseAlgorithm instances')
    }

    const allValid = algorithms.every((a) => a instanceof BaseAlgorithm)
    if (!allValid) {
      throw ErrorFactory.invalidAlgorithm({ reason: 'All composite algorithms must extend BaseAlgorithm' })
    }

    if (mode !== COMPOSITE_MODES.ALL && mode !== COMPOSITE_MODES.ANY) {
      throw ErrorFactory.invalidValue('mode', mode, `must be '${COMPOSITE_MODES.ALL}' or '${COMPOSITE_MODES.ANY}'`)
    }

    this._algorithms = algorithms
    this._mode       = mode
  }

  /**
   * Runs all child algorithms in parallel and combines their results
   * according to the configured mode.
   *
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    const results = await Promise.all(
      this._algorithms.map((algo) => algo.check(key, store)),
    )

    const allowed = this._mode === COMPOSITE_MODES.ALL
      ? results.every((r) => r.allowed)
      : results.some((r) => r.allowed)

    // Use the most restrictive result when blocked
    const blocking   = results.filter((r) => !r.allowed)
    const strictest  = blocking.length > 0
      ? blocking.reduce((a, b) => (a.retryAfter ?? 0) > (b.retryAfter ?? 0) ? a : b)
      : results[0]

    const remaining  = Math.min(...results.map((r) => r.remaining))
    const limit      = Math.min(...results.map((r) => r.limit))
    const resetAt    = blocking.length > 0
      ? new Date(Math.max(...blocking.map((r) => r.resetAt.getTime())))
      : results[0].resetAt

    logger.debug('Composite check', {
      key,
      mode: this._mode,
      allowed,
      algorithms: results.map((r, i) => ({
        name:    this._algorithms[i].name,
        allowed: r.allowed,
      })),
    })

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : strictest.retryAfter,
    }
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<void>}
   */
  async reset(key, store) {
    await Promise.all(this._algorithms.map((algo) => algo.reset(key, store)))
    logger.debug('Composite reset', { key })
  }
}
