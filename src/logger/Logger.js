/**
 * @fileoverview Structured logger with pluggable transport.
 * Enterprise teams can inject Winston, Pino, or any compatible logger.
 */

/**
 * Log level hierarchy — higher index = more severe.
 */
const LOG_LEVELS = Object.freeze({
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
})

/**
 * Default console transport — used when no custom logger is injected.
 *
 * @param {string} level
 * @param {string} message
 * @param {Object} context
 */
function defaultTransport(level, message, context) {
  const timestamp = new Date().toISOString()
  const base = { timestamp, level, message, ...context }
  const output = JSON.stringify(base)

  if (level === 'error' || level === 'warn') {
    process.stderr.write(output + '\n')
  } else {
    process.stdout.write(output + '\n')
  }
}

/**
 * Structured logger. Each instance carries a fixed context object
 * that is merged into every log entry it emits.
 */
export class Logger {
  /**
   * @param {Object}   options
   * @param {string}   options.name          - Logger name / component label.
   * @param {string}   [options.level]       - Minimum log level. Default: 'info'.
   * @param {Object}   [options.context]     - Fixed context merged into every entry.
   * @param {Function} [options.transport]   - Custom transport fn(level, message, context).
   */
  constructor({ name, level = 'info', context = {}, transport = defaultTransport }) {
    this._name      = name
    this._minLevel  = LOG_LEVELS[level] ?? LOG_LEVELS.info
    this._context   = context
    this._transport = transport
  }

  /**
   * Creates a child logger that inherits this logger's context
   * and merges additional fixed context fields.
   *
   * @param {Object} additionalContext
   * @returns {Logger}
   */
  child(additionalContext) {
    return new Logger({
      name:      this._name,
      level:     this._levelName(),
      context:   { ...this._context, ...additionalContext },
      transport: this._transport,
    })
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   */
  debug(message, context = {}) {
    this._log('debug', message, context)
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   */
  info(message, context = {}) {
    this._log('info', message, context)
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   */
  warn(message, context = {}) {
    this._log('warn', message, context)
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   */
  error(message, context = {}) {
    this._log('error', message, context)
  }

  /**
   * @param {string} level
   * @param {string} message
   * @param {Object} context
   */
  _log(level, message, context) {
    if (LOG_LEVELS[level] < this._minLevel) {
      return
    }

    this._transport(level, message, {
      logger:  this._name,
      ...this._context,
      ...context,
    })
  }

  /**
   * @returns {string}
   */
  _levelName() {
    return Object.keys(LOG_LEVELS).find(
      (k) => LOG_LEVELS[k] === this._minLevel
    ) ?? 'info'
  }
}
