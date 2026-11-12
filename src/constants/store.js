/**
 * Store-related constants shared across MemoryStore and RedisStore.
 */
export const STORE_TYPES = Object.freeze({
  MEMORY: 'memory',
  REDIS:  'redis',
})

/**
 * Redis Lua script keys used for atomic operations.
 */
export const REDIS_SCRIPTS = Object.freeze({
  INCREMENT_WITH_TTL: 'increment_with_ttl',
  GET_AND_SET:        'get_and_set',
})

/**
 * Cleanup interval for MemoryStore expired-entry eviction (ms).
 */
export const MEMORY_STORE_CLEANUP_INTERVAL_MS = 30_000
