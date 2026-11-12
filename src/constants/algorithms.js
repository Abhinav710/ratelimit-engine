/**
 * Supported built-in algorithm identifiers.
 */
export const ALGORITHM_NAMES = Object.freeze({
  FIXED_WINDOW:   'fixed-window',
  SLIDING_WINDOW: 'sliding-window',
  TOKEN_BUCKET:   'token-bucket',
  LEAKY_BUCKET:   'leaky-bucket',
  COMPOSITE:      'composite',
})

/**
 * Composite algorithm evaluation modes.
 */
export const COMPOSITE_MODES = Object.freeze({
  ALL: 'ALL',
  ANY: 'ANY',
})
