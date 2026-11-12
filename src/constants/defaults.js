/**
 * Default configuration values used across the engine.
 * All time values are in milliseconds unless noted.
 */
export const DEFAULTS = Object.freeze({
  WINDOW_MS:            60_000,
  MAX_REQUESTS:         100,
  FAIL_OPEN:            true,
  TOKEN_BUCKET_CAPACITY:    100,
  TOKEN_BUCKET_REFILL_RATE: 10,
  LEAKY_BUCKET_CAPACITY:    100,
  LEAKY_BUCKET_LEAK_RATE:   10,
  STORE_TTL_BUFFER_MS:  5_000,
  KEY_PREFIX:           'rle:',
})
