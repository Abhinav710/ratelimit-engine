/**
 * @fileoverview Express middleware adapter.
 */

import { BaseAdapter } from './BaseAdapter.js'
import { createLogger } from '../logger/LoggerFactory.js'

const logger = createLogger('ExpressAdapter')

export class ExpressAdapter extends BaseAdapter {
  /**
   * @param {import('../engine/RateLimiter.js').RateLimiter} limiter
   */
  constructor(limiter) {
    super(limiter)
  }

  /**
   * @param {Object} req - Express request.
   * @returns {import('../types/index.js').RequestContext}
   */
  extractContext(req) {
    return {
      ip:         req.ip ?? req.socket?.remoteAddress ?? 'unknown',
      userId:     req.user?.id ?? req.user?.sub ?? undefined,
      apiKey:     req.headers?.['x-api-key'] ?? undefined,
      method:     req.method,
      path:       req.path ?? req.url,
      headers:    req.headers ?? {},
      rawRequest: req,
    }
  }

  /**
   * Returns an Express-compatible middleware function.
   * Writes rate limit headers and sends 429 when blocked.
   *
   * @returns {Function} (req, res, next) => void
   */
  middleware() {
    const limiter      = this._limiter
    const headerWriter = this._limiter.getHeaderWriter()

    return async (req, res, next) => {
      try {
        const context = this.extractContext(req)
        const result  = await limiter.check(context)

        headerWriter.write(res, result)

        if (!result.allowed) {
          logger.info('Blocking request', { ip: context.ip, path: context.path })
          headerWriter.sendBlocked(res, result)
          return
        }

        next()
      } catch (err) {
        logger.error('Unexpected error in Express middleware', { error: err.message })
        next(err)
      }
    }
  }
}
