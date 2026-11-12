/**
 * @fileoverview Base error class for all ratelimit-engine errors.
 */

/**
 * Base error class. All engine errors extend this.
 * Carries a machine-readable code alongside the human message.
 */
export class RateLimitError extends Error {
  /**
   * @param {string} message  - Human-readable description.
   * @param {string} code     - Machine-readable error code from ERROR_CODES.
   * @param {Object} [meta]   - Optional extra context (key, config field, etc.).
   */
  constructor(message, code, meta = {}) {
    super(message)
    this.name   = 'RateLimitError'
    this.code   = code
    this.meta   = meta

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
