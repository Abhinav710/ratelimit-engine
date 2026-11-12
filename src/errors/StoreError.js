/**
 * @fileoverview Error class for store-layer failures.
 */

import { RateLimitError } from './RateLimitError.js'

/**
 * Thrown when a store operation (read, write, connect) fails.
 */
export class StoreError extends RateLimitError {
  /**
   * @param {string} message
   * @param {string} code
   * @param {Object} [meta]
   */
  constructor(message, code, meta = {}) {
    super(message, code, meta)
    this.name = 'StoreError'
  }
}
