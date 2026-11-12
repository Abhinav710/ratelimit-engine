/**
 * @fileoverview Convenience factory — wraps RateLimiter construction
 * and wires Express/Fastify adapters so consumers get a single entry point.
 */

import { RateLimiter }    from './RateLimiter.js'
import { ExpressAdapter } from '../adapters/ExpressAdapter.js'
import { FastifyAdapter } from '../adapters/FastifyAdapter.js'

/**
 * Creates a configured RateLimiter and returns it with
 * pre-built adapter helpers for Express and Fastify.
 *
 * @param {import('../types/index.js').LimiterConfig} config
 * @returns {{
 *   limiter:  RateLimiter,
 *   express:  () => Function,
 *   fastify:  () => Function,
 *   check:    (context: import('../types/index.js').RequestContext) => Promise<import('../types/index.js').RateLimitResult>,
 *   reset:    (context: import('../types/index.js').RequestContext) => Promise<void>,
 *   destroy:  () => Promise<void>,
 * }}
 */
export function createLimiter(config) {
  const limiter         = new RateLimiter(config)
  const expressAdapter  = new ExpressAdapter(limiter)
  const fastifyAdapter  = new FastifyAdapter(limiter)

  return {
    limiter,
    express: () => expressAdapter.middleware(),
    fastify: () => fastifyAdapter.middleware(),
    check:   (context) => limiter.check(context),
    reset:   (context) => limiter.reset(context),
    destroy: ()        => limiter.destroy(),
  }
}
