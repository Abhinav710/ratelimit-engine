/**
 * Standard HTTP response header names used by the engine.
 */
export const HEADERS = Object.freeze({
  LIMIT:       'X-RateLimit-Limit',
  REMAINING:   'X-RateLimit-Remaining',
  RESET:       'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  POLICY:      'X-RateLimit-Policy',
})

/**
 * HTTP status codes used by rate limit responses.
 */
export const HTTP_STATUS = Object.freeze({
  TOO_MANY_REQUESTS: 429,
  OK:                200,
})
