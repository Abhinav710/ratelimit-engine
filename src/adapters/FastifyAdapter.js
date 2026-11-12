/**
 * @fileoverview Fastify hook adapter.
 */

import { BaseAdapter } from './BaseAdapter.js'
import { createLogger } from '../logger/LoggerFactory.js'
import { HTTP_STATUS }  from '../constants/headers.js'

const logger = createLogger('FastifyAdapter')

export class FastifyAdapter extends BaseAdapter {
  /**
   * @param {import('../engine/RateLimiter.js').RateLimiter} limiter
   */
  constructor(limiter) {
    super(limiter)
  }

  /**
   * @param {Object} req - Fastify request.
   * @returns {import('../types/index.js').RequestContext}
   */
  extractContext(req) {
    return {
      ip:         req.ip ?? 'unknown',
      userId:     req.user?.id ?? req.user?.sub ?? undefined,
      apiKey:     req.headers?.['x-api-key'] ?? undefined,
      method:     req.method,
      path:       req.url,
      headers:    req.headers ?? {},
      rawRequest: req,
    }
  }

  /**
   * Returns a Fastify onRequest hook function.
   *
   * @returns {Function} async (request, reply) => void
   */
  middleware() {
    const limiter      = this._limiter
    const headerWriter = this._limiter.getHeaderWriter()

    return async (request, reply) => {
      try {
        const context = this.extractContext(request)
        const result  = await limiter.check(context)

        headerWriter.write(reply.raw, result)

        if (!result.allowed) {
          logger.info('Blocking request', { ip: context.ip, path: context.path })
          reply
            .code(HTTP_STATUS.TOO_MANY_REQUESTS)
            .send({
              error:      'Too Many Requests',
              retryAfter: result.retryAfter,
              resetAt:    result.resetAt.toISOString(),
            })
        }
      } catch (err) {
        logger.error('Unexpected error in Fastify hook', { error: err.message })
        throw err
      }
    }
  }
}
