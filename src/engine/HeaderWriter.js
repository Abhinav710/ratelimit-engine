/**
 * @fileoverview Writes standard rate limit headers onto HTTP responses.
 */

import { HEADERS, HTTP_STATUS } from '../constants/headers.js'
import { createLogger }         from '../logger/LoggerFactory.js'

const logger = createLogger('HeaderWriter')

export class HeaderWriter {
  /**
   * Writes X-RateLimit-* headers and optionally Retry-After onto a response object.
   * Works with any response that exposes a setHeader(name, value) method.
   *
   * @param {Object}                                      res     - Framework response object.
   * @param {import('../types/index.js').RateLimitResult} result
   */
  write(res, result) {
    try {
      res.setHeader(HEADERS.LIMIT,     String(result.limit))
      res.setHeader(HEADERS.REMAINING, String(result.remaining))
      res.setHeader(HEADERS.RESET,     String(Math.floor(result.resetAt.getTime() / 1000)))

      if (!result.allowed && result.retryAfter !== undefined) {
        res.setHeader(HEADERS.RETRY_AFTER, String(result.retryAfter))
      }
    } catch (err) {
      logger.warn('Failed to write rate limit headers', { error: err.message })
    }
  }

  /**
   * Sends a 429 Too Many Requests response with a JSON body.
   * Works with Express and Fastify response objects.
   *
   * @param {Object}                                      res
   * @param {import('../types/index.js').RateLimitResult} result
   */
  sendBlocked(res, result) {
    this.write(res, result)

    const body = JSON.stringify({
      error:      'Too Many Requests',
      retryAfter: result.retryAfter,
      resetAt:    result.resetAt.toISOString(),
    })

    if (typeof res.status === 'function') {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).send(body)
    } else {
      res.statusCode = HTTP_STATUS.TOO_MANY_REQUESTS
      res.setHeader('Content-Type', 'application/json')
      res.end(body)
    }
  }
}
