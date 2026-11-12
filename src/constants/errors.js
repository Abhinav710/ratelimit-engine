/**
 * Error codes used across the engine.
 * Each code maps to a unique, machine-readable string.
 */
export const ERROR_CODES = Object.freeze({
  CONFIGURATION_MISSING_FIELD:   'CONFIGURATION_MISSING_FIELD',
  CONFIGURATION_INVALID_VALUE:   'CONFIGURATION_INVALID_VALUE',
  CONFIGURATION_INVALID_ALGO:    'CONFIGURATION_INVALID_ALGO',
  CONFIGURATION_INVALID_STORE:   'CONFIGURATION_INVALID_STORE',

  STORE_UNAVAILABLE:             'STORE_UNAVAILABLE',
  STORE_READ_FAILED:             'STORE_READ_FAILED',
  STORE_WRITE_FAILED:            'STORE_WRITE_FAILED',

  RATE_LIMIT_EXCEEDED:           'RATE_LIMIT_EXCEEDED',

  ALGORITHM_CHECK_FAILED:        'ALGORITHM_CHECK_FAILED',
  ALGORITHM_RESET_FAILED:        'ALGORITHM_RESET_FAILED',

  ADAPTER_INVALID_REQUEST:       'ADAPTER_INVALID_REQUEST',
})

/**
 * Human-readable error messages keyed by error code.
 */
export const ERROR_MESSAGES = Object.freeze({
  [ERROR_CODES.CONFIGURATION_MISSING_FIELD]: 'Required configuration field is missing',
  [ERROR_CODES.CONFIGURATION_INVALID_VALUE]: 'Configuration field has an invalid value',
  [ERROR_CODES.CONFIGURATION_INVALID_ALGO]:  'Provided algorithm is not a valid BaseAlgorithm instance',
  [ERROR_CODES.CONFIGURATION_INVALID_STORE]: 'Provided store is not a valid BaseStore instance',

  [ERROR_CODES.STORE_UNAVAILABLE]:           'Store is currently unavailable',
  [ERROR_CODES.STORE_READ_FAILED]:           'Store read operation failed',
  [ERROR_CODES.STORE_WRITE_FAILED]:          'Store write operation failed',

  [ERROR_CODES.RATE_LIMIT_EXCEEDED]:         'Rate limit exceeded',

  [ERROR_CODES.ALGORITHM_CHECK_FAILED]:      'Algorithm check operation failed',
  [ERROR_CODES.ALGORITHM_RESET_FAILED]:      'Algorithm reset operation failed',

  [ERROR_CODES.ADAPTER_INVALID_REQUEST]:     'Adapter received an invalid request object',
})
