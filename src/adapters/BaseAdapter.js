/**
 * @fileoverview Abstract base class for framework adapters.
 * Adapters extract a RequestContext from the framework's request object
 * and delegate to the RateLimiter engine.
 */

import { ErrorFactory } from '../errors/ErrorFactory.js'

export class BaseAdapter {
  /**
   * @param {import('../engine/RateLimiter.js').RateLimiter} limiter
   */
  constructor(limiter) {
    if (new.target === BaseAdapter) {
      throw ErrorFactory.invalidAlgorithm({ reason: 'BaseAdapter cannot be instantiated directly' })
    }
    this._limiter = limiter
  }

  /**
   * Extracts a RequestContext from the framework's native request object.
   *
   * @param {Object} req  - Framework request object.
   * @returns {import('../types/index.js').RequestContext}
   */
  extractContext(_req) {
    throw new Error('extractContext() must be implemented by subclass')
  }

  /**
   * Returns the framework-specific middleware function.
   *
   * @returns {Function}
   */
  middleware() {
    throw new Error('middleware() must be implemented by subclass')
  }
}
