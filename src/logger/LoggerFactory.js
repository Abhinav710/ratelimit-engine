/**
 * @fileoverview Factory that creates named Logger instances.
 * Supports injecting an enterprise logger (Winston, Pino) as the transport.
 */

import { Logger } from './Logger.js'

/**
 * Creates a Logger bound to a component name and optional shared context.
 *
 * @param {string}   name               - Component name (e.g. 'MemoryStore', 'TokenBucket').
 * @param {Object}   [options]
 * @param {string}   [options.level]    - Minimum log level. Default: 'info'.
 * @param {Object}   [options.context]  - Fixed context fields merged into every entry.
 * @param {Function} [options.transport]- Custom transport fn(level, message, context).
 * @returns {Logger}
 */
export function createLogger(name, options = {}) {
  return new Logger({ name, ...options })
}

/**
 * Wraps an external logger (Winston, Pino, etc.) so it satisfies
 * the Logger interface expected by the engine.
 * The external logger must expose debug/info/warn/error methods.
 *
 * @param {Object} externalLogger
 * @returns {Logger}
 */
export function wrapExternalLogger(externalLogger) {
  const transport = (level, message, context) => {
    externalLogger[level]?.(message, context)
  }

  return new Logger({ name: 'external', transport })
}
