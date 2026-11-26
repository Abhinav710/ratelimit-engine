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
   * Asks every child whether it would allow the request, then charges only
   * the children the combined result calls for:
   *   - blocked: no child is charged
   *   - ALL, allowed: every child is charged
   *   - ANY, allowed: only the first child that allows is charged
   *
   * The ask and the charge are separate store calls, so two concurrent
   * requests can both pass the ask. Each child still enforces its own limit
   * when charged, which keeps the overshoot to the requests in flight.
   *
   * A child without peek() cannot be asked first. In that case every child
   * is charged on every request, as before.
   *
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(key, store) {
    if (!this.canPeek) {
      const results = await Promise.all(
        this._algorithms.map((algo) => algo.check(key, store)),
      )
      return this._combine(key, results)
    }

    const peeks = await Promise.all(
      this._algorithms.map((algo) => algo.peek(key, store)),
    )

    if (!this._isAllowed(peeks)) {
      return this._combine(key, peeks)
    }

    if (this._mode === COMPOSITE_MODES.ALL) {
      const results = await Promise.all(
        this._algorithms.map((algo) => algo.check(key, store)),
      )
      return this._combine(key, results)
    }

    const payer   = peeks.findIndex((r) => r.allowed)
    const results = [...peeks]
    results[payer] = await this._algorithms[payer].check(key, store)
    return this._combine(key, results)
  }

  /**
   * @param {string} key
   * @param {import('../stores/BaseStore.js').BaseStore} store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async peek(key, store) {
    const peeks = await Promise.all(
      this._algorithms.map((algo) => algo.peek(key, store)),
    )
    return this._combine(key, peeks)
  }

  /**
   * True when every child implements peek(), nested composites included.
   *
   * @returns {boolean}
   */
  get canPeek() {
    return this._algorithms.every((algo) => algo.canPeek)
  }

  /**
   * @param {import('../types/index.js').RateLimitResult[]} results
   * @returns {boolean}
   */
  _isAllowed(results) {
    return this._mode === COMPOSITE_MODES.ALL
      ? results.every((r) => r.allowed)
      : results.some((r) => r.allowed)
  }

  /**
   * Combines child results according to the configured mode.
   *
   * @param {string} key
   * @param {import('../types/index.js').RateLimitResult[]} results
   * @returns {import('../types/index.js').RateLimitResult}
   */
  _combine(key, results) {
    const allowed = this._isAllowed(results)

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
