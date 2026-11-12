/**
 * @fileoverview Central factory for creating all engine errors.
 * No other file should call `new XyzError(...)` directly —
 * always go through ErrorFactory so error shape stays consistent.
 */

import { ConfigurationError } from './ConfigurationError.js'
import { StoreError }         from './StoreError.js'
import { RateLimitError }     from './RateLimitError.js'
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/errors.js'

/**
 * @param {string} field   - Name of the missing config field.
 * @param {Object} [meta]
 * @returns {ConfigurationError}
 */
function missingField(field, meta = {}) {
  return new ConfigurationError(
    `${ERROR_MESSAGES[ERROR_CODES.CONFIGURATION_MISSING_FIELD]}: '${field}'`,
    ERROR_CODES.CONFIGURATION_MISSING_FIELD,
    { field, ...meta },
  )
}

/**
 * @param {string} field   - Name of the invalid config field.
 * @param {*}      value   - The value that was rejected.
 * @param {string} reason  - Why it is invalid.
 * @param {Object} [meta]
 * @returns {ConfigurationError}
 */
function invalidValue(field, value, reason, meta = {}) {
  return new ConfigurationError(
    `${ERROR_MESSAGES[ERROR_CODES.CONFIGURATION_INVALID_VALUE]}: '${field}' — ${reason}`,
    ERROR_CODES.CONFIGURATION_INVALID_VALUE,
    { field, value, reason, ...meta },
  )
}

/**
 * @param {Object} [meta]
 * @returns {ConfigurationError}
 */
function invalidAlgorithm(meta = {}) {
  return new ConfigurationError(
    ERROR_MESSAGES[ERROR_CODES.CONFIGURATION_INVALID_ALGO],
    ERROR_CODES.CONFIGURATION_INVALID_ALGO,
    meta,
  )
}

/**
 * @param {Object} [meta]
 * @returns {ConfigurationError}
 */
function invalidStore(meta = {}) {
  return new ConfigurationError(
    ERROR_MESSAGES[ERROR_CODES.CONFIGURATION_INVALID_STORE],
    ERROR_CODES.CONFIGURATION_INVALID_STORE,
    meta,
  )
}

/**
 * @param {string} operation  - 'read' | 'write'.
 * @param {Error}  cause      - Underlying error from the store.
 * @param {Object} [meta]
 * @returns {StoreError}
 */
function storeOperationFailed(operation, cause, meta = {}) {
  const code = operation === 'read'
    ? ERROR_CODES.STORE_READ_FAILED
    : ERROR_CODES.STORE_WRITE_FAILED

  return new StoreError(
    `${ERROR_MESSAGES[code]}: ${cause.message}`,
    code,
    { operation, cause: cause.message, ...meta },
  )
}

/**
 * @param {Error}  cause
 * @param {Object} [meta]
 * @returns {StoreError}
 */
function storeUnavailable(cause, meta = {}) {
  return new StoreError(
    `${ERROR_MESSAGES[ERROR_CODES.STORE_UNAVAILABLE]}: ${cause.message}`,
    ERROR_CODES.STORE_UNAVAILABLE,
    { cause: cause.message, ...meta },
  )
}

/**
 * @param {string} key
 * @param {import('../types/index.js').RateLimitResult} result
 * @param {Object} [meta]
 * @returns {RateLimitError}
 */
function rateLimitExceeded(key, result, meta = {}) {
  return new RateLimitError(
    ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    { key, remaining: result.remaining, resetAt: result.resetAt, ...meta },
  )
}

export const ErrorFactory = Object.freeze({
  missingField,
  invalidValue,
  invalidAlgorithm,
  invalidStore,
  storeOperationFailed,
  storeUnavailable,
  rateLimitExceeded,
})
