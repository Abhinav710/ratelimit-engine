/**
 * @fileoverview Central JSDoc type contracts for ratelimit-engine.
 * All layers depend on these types — never on concrete implementations.
 */

/**
 * Result returned by every algorithm check.
 *
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed      - Whether the request is permitted.
 * @property {number}  limit        - Maximum requests allowed in the window.
 * @property {number}  remaining    - Requests remaining in the current window.
 * @property {Date}    resetAt      - When the current window resets.
 * @property {number}  [retryAfter] - Seconds until the client may retry (only when allowed=false).
 */

/**
 * Raw entry persisted in a store for a given key.
 *
 * @typedef {Object} StoreEntry
 * @property {number} count     - Request count in the current window.
 * @property {number} windowStart - Window start timestamp (ms since epoch).
 * @property {number} expiresAt - Absolute expiry timestamp (ms since epoch).
 * @property {Object} [meta]    - Algorithm-specific extra fields (e.g. tokens, lastLeak).
 */

/**
 * Request context passed through the engine and resolvers.
 *
 * @typedef {Object} RequestContext
 * @property {string}  ip              - Client IP address.
 * @property {string}  [userId]        - Authenticated user ID, if available.
 * @property {string}  [apiKey]        - API key from request headers, if present.
 * @property {string}  method          - HTTP method (GET, POST, …).
 * @property {string}  path            - Request path.
 * @property {Object}  headers         - Raw request headers.
 * @property {Object}  [rawRequest]    - Original framework request object.
 */

/**
 * Core engine configuration passed to createLimiter().
 *
 * @typedef {Object} LimiterConfig
 * @property {import('../algorithms/BaseAlgorithm.js').BaseAlgorithm} algorithm - Algorithm instance.
 * @property {import('../stores/BaseStore.js').BaseStore}             store     - Store instance.
 * @property {KeyResolverFn}   keyBy      - Function that derives the rate limit key from context.
 * @property {boolean}         [failOpen]  - Allow requests when store is unavailable. Default: true.
 * @property {OnBlockedHook}   [onBlocked] - Called when a request is blocked.
 * @property {OnAllowedHook}   [onAllowed] - Called when a request is allowed.
 * @property {import('../logger/Logger.js').Logger} [logger] - Custom logger instance.
 */

/**
 * Function that derives a rate limit key string from a request context.
 *
 * @typedef {function(RequestContext): (string|Promise<string>)} KeyResolverFn
 */

/**
 * Hook called when a request is blocked by the rate limiter.
 *
 * @typedef {function(RequestContext, RateLimitResult): void} OnBlockedHook
 */

/**
 * Hook called when a request is allowed through.
 *
 * @typedef {function(RequestContext, RateLimitResult): void} OnAllowedHook
 */

/**
 * Logger interface — implement this to plug in Winston, Pino, etc.
 *
 * @typedef {Object} LoggerInterface
 * @property {function(string, Object=): void} debug
 * @property {function(string, Object=): void} info
 * @property {function(string, Object=): void} warn
 * @property {function(string, Object=): void} error
 */
