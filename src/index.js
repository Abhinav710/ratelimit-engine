/**
 * @fileoverview Public API surface for ratelimit-engine.
 * Everything a consumer needs is exported from here.
 * Internal implementation details are not re-exported.
 */

// Engine
export { RateLimiter }      from './engine/RateLimiter.js'

// Factory (convenience wrapper)
export { createLimiter }    from './engine/createLimiter.js'

// Algorithms
export { BaseAlgorithm }    from './algorithms/BaseAlgorithm.js'
export { FixedWindow }      from './algorithms/FixedWindow.js'
export { SlidingWindow }    from './algorithms/SlidingWindow.js'
export { TokenBucket }      from './algorithms/TokenBucket.js'
export { LeakyBucket }      from './algorithms/LeakyBucket.js'
export { Composite }        from './algorithms/Composite.js'

// Stores
export { BaseStore }        from './stores/BaseStore.js'
export { MemoryStore }      from './stores/MemoryStore.js'
export { RedisStore }       from './stores/RedisStore.js'

// Adapters
export { ExpressAdapter }   from './adapters/ExpressAdapter.js'
export { FastifyAdapter }   from './adapters/FastifyAdapter.js'

// Resolvers
export { byIP }             from './resolvers/byIP.js'
export { byUser }           from './resolvers/byUser.js'
export { byAPIKey }         from './resolvers/byAPIKey.js'
export { byRoute }          from './resolvers/byRoute.js'
export { compositeResolver } from './resolvers/composite.js'

// Logger
export { Logger }           from './logger/Logger.js'
export { createLogger, wrapExternalLogger } from './logger/LoggerFactory.js'

// Errors
export { RateLimitError }   from './errors/RateLimitError.js'
export { StoreError }       from './errors/StoreError.js'
export { ConfigurationError } from './errors/ConfigurationError.js'
export { ErrorFactory }     from './errors/ErrorFactory.js'

// Constants (consumers may need these for custom implementations)
export { ALGORITHM_NAMES, COMPOSITE_MODES } from './constants/algorithms.js'
export { DEFAULTS }         from './constants/defaults.js'
export { ERROR_CODES, ERROR_MESSAGES }      from './constants/errors.js'
export { HEADERS, HTTP_STATUS }             from './constants/headers.js'
export { STORE_TYPES }      from './constants/store.js'
