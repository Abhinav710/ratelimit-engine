/**
 * @fileoverview Core rate limiter engine.
 * Orchestrates algorithm, store, key resolution, header writing, and hooks.
 * This class has no knowledge of HTTP frameworks — adapters handle that.
 */

import { BaseAlgorithm } from '../algorithms/BaseAlgorithm.js'
import { BaseStore }     from '../stores/BaseStore.js'
import { KeyResolver }   from './KeyResolver.js'
import { HeaderWriter }  from './HeaderWriter.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { DEFAULTS }      from '../constants/defaults.js'
import { createLogger, wrapExternalLogger } from '../logger/LoggerFactory.js'

export class RateLimiter {
  /**
   * @param {import('../types/index.js').LimiterConfig} config
   */
  constructor(config) {
    this._validateConfig(config)

    this._algorithm   = config.algorithm
    this._store       = config.store
    this._keyResolver = new KeyResolver(config.keyBy)
    this._headerWriter = new HeaderWriter()
    this._failOpen    = config.failOpen ?? DEFAULTS.FAIL_OPEN
    this._onBlocked   = config.onBlocked ?? null
    this._onAllowed   = config.onAllowed ?? null
    this._logger      = config.logger
      ? wrapExternalLogger(config.logger)
      : createLogger('RateLimiter')
  }

  /**
   * Core check — resolves key, runs algorithm, fires hooks.
   * Call this directly for framework-agnostic usage.
   *
   * @param {import('../types/index.js').RequestContext} context
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(context) {
    let key

    try {
      key = await this._keyResolver.resolve(context)
    } catch (err) {
      this._logger.error('Key resolution failed', { error: err.message })
      return this._failOpenResult()
    }

    let result

    try {
      result = await this._algorithm.check(key, this._store)
    } catch (err) {
      this._logger.error('Algorithm check failed', { key, error: err.message })

      if (this._failOpen) {
        return this._failOpenResult()
      }

      throw ErrorFactory.storeUnavailable(err, { key })
    }

    if (result.allowed) {
      this._onAllowed?.(context, result)
      this._logger.debug('Request allowed', { key, remaining: result.remaining })
    } else {
      this._onBlocked?.(context, result)
      this._logger.info('Request blocked', {
        key,
        retryAfter: result.retryAfter,
        resetAt:    result.resetAt.toISOString(),
      })
    }

    return result
  }

  /**
   * Resets the rate limit state for the given context.
   *
   * @param {import('../types/index.js').RequestContext} context
   * @returns {Promise<void>}
   */
  async reset(context) {
    const key = await this._keyResolver.resolve(context)
    await this._algorithm.reset(key, this._store)
    this._logger.info('Rate limit reset', { key })
  }

  /**
   * Returns the HeaderWriter so adapters can write headers.
   *
   * @returns {HeaderWriter}
   */
  getHeaderWriter() {
    return this._headerWriter
  }

  /**
   * Releases store resources.
   *
   * @returns {Promise<void>}
   */
  async destroy() {
    await this._store.destroy()
    this._logger.info('RateLimiter destroyed')
  }

  /**
   * Validates required config fields and their types.
   *
   * @param {import('../types/index.js').LimiterConfig} config
   */
  _validateConfig(config) {
    if (!config) {
      throw ErrorFactory.missingField('config')
    }
    if (!(config.algorithm instanceof BaseAlgorithm)) {
      throw ErrorFactory.invalidAlgorithm()
    }
    if (!(config.store instanceof BaseStore)) {
      throw ErrorFactory.invalidStore()
    }
    if (typeof config.keyBy !== 'function') {
      throw ErrorFactory.missingField('keyBy')
    }
  }

  /**
   * Fail-open result — allows the request when the store/algorithm is unavailable.
   *
   * @returns {import('../types/index.js').RateLimitResult}
   */
  _failOpenResult() {
    this._logger.warn('Fail-open: allowing request due to internal error')
    return {
      allowed:   true,
      limit:     0,
      remaining: 0,
      resetAt:   new Date(),
    }
  }
}
