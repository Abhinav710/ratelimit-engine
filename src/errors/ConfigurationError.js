/**
 * @fileoverview Error class for configuration validation failures.
 */

import { RateLimitError } from './RateLimitError.js'

/**
 * Thrown when createLimiter() or an algorithm/store receives invalid config.
 */
export class ConfigurationError extends RateLimitError {
  /**
   * @param {string} message
   * @param {string} code
   * @param {Object} [meta]
   */
  constructor(message, code, meta = {}) {
    super(message, code, meta)
    this.name = 'ConfigurationError'
  }
}
