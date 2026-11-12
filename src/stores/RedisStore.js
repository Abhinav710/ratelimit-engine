/**
 * @fileoverview Redis-backed store using atomic Lua scripts.
 * Requires ioredis (peer dependency).
 * Safe for distributed / multi-pod deployments.
 */

import { BaseStore }    from './BaseStore.js'
import { ErrorFactory } from '../errors/ErrorFactory.js'
import { STORE_TYPES }  from '../constants/store.js'
import { createLogger } from '../logger/LoggerFactory.js'

const logger = createLogger('RedisStore')

/**
 * Atomically increments a counter key, setting TTL on first write.
 * Returns: [newCount, ttlMs]
 */
const LUA_INCREMENT_WITH_TTL = `
local current = redis.call('GET', KEYS[1])
if current == false then
  redis.call('SET', KEYS[1], 1, 'PX', ARGV[1])
  return {1, tonumber(ARGV[1])}
end
local newVal = redis.call('INCR', KEYS[1])
local pttl   = redis.call('PTTL', KEYS[1])
return {newVal, pttl}
`

/**
 * Atomically gets a JSON-encoded entry. Returns nil if absent/expired.
 */
const LUA_GET_ENTRY = `
local val = redis.call('GET', KEYS[1])
if val == false then return nil end
return val
`

/**
 * Atomically sets a JSON-encoded entry with a TTL in milliseconds.
 */
const LUA_SET_ENTRY = `
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
return 1
`

export class RedisStore extends BaseStore {
  /**
   * @param {Object} options
   * @param {Object} options.client   - ioredis client instance.
   * @param {string} [options.prefix] - Key prefix. Default: 'rle:'.
   */
  constructor({ client, prefix = 'rle:' }) {
    super(STORE_TYPES.REDIS)

    if (!client) {
      throw ErrorFactory.missingField('client', { store: 'RedisStore' })
    }

    this._client = client
    this._prefix = prefix
    this._defineScripts()
    logger.info('RedisStore initialised', { prefix })
  }

  /**
   * @param {string} key
   * @returns {Promise<import('../types/index.js').StoreEntry|null>}
   */
  async get(key) {
    try {
      const raw = await this._client.get(this._prefixed(key))
      if (!raw) {
        return null
      }
      const entry = JSON.parse(raw)
      if (Date.now() > entry.expiresAt) {
        return null
      }
      return entry
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('read', cause, { key })
    }
  }

  /**
   * @param {string}                                  key
   * @param {import('../types/index.js').StoreEntry}  entry
   * @param {number}                                  ttlMs
   * @returns {Promise<void>}
   */
  async set(key, entry, ttlMs) {
    try {
      await this._client.call(
        'EVALSHA', this._scripts.setEntry,
        1,
        this._prefixed(key),
        JSON.stringify({ ...entry, expiresAt: Date.now() + ttlMs }),
        String(ttlMs),
      )
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('write', cause, { key })
    }
  }

  /**
   * @param {string} key
   * @param {number} ttlMs
   * @returns {Promise<number>}
   */
  async increment(key, ttlMs) {
    try {
      const result = await this._client.call(
        'EVALSHA', this._scripts.incrementWithTtl,
        1,
        this._prefixed(key),
        String(ttlMs),
      )
      return result[0]
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('write', cause, { key })
    }
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      await this._client.del(this._prefixed(key))
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('write', cause, { key })
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async destroy() {
    await this._client.quit()
    logger.info('RedisStore connection closed')
  }

  /**
   * Loads Lua scripts into Redis and caches their SHAs.
   */
  _defineScripts() {
    const load = (script) => this._client.script('LOAD', script)

    this._scripts = {}

    Promise.all([
      load(LUA_INCREMENT_WITH_TTL).then((sha) => { this._scripts.incrementWithTtl = sha }),
      load(LUA_GET_ENTRY).then((sha)          => { this._scripts.getEntry         = sha }),
      load(LUA_SET_ENTRY).then((sha)          => { this._scripts.setEntry         = sha }),
    ]).catch((cause) => {
      logger.error('Failed to load Lua scripts', { error: cause.message })
    })
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  _prefixed(key) {
    return `${this._prefix}${key}`
  }
}
