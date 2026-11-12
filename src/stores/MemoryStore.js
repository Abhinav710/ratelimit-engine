/**
 * @fileoverview In-memory store backed by a Map.
 * Suitable for development, testing, and single-instance deployments.
 * Not suitable for multi-pod / distributed deployments.
 */

import { BaseStore }     from './BaseStore.js'
import { ErrorFactory }  from '../errors/ErrorFactory.js'
import { STORE_TYPES, MEMORY_STORE_CLEANUP_INTERVAL_MS } from '../constants/store.js'
import { createLogger }  from '../logger/LoggerFactory.js'

const logger = createLogger('MemoryStore')

export class MemoryStore extends BaseStore {
  constructor() {
    super(STORE_TYPES.MEMORY)
    /** @type {Map<string, import('../types/index.js').StoreEntry>} */
    this._store = new Map()
    this._cleanupTimer = setInterval(
      () => this._evictExpired(),
      MEMORY_STORE_CLEANUP_INTERVAL_MS,
    )
    // Allow Node.js to exit even if this timer is active
    this._cleanupTimer.unref?.()
  }

  /**
   * @param {string} key
   * @returns {Promise<import('../types/index.js').StoreEntry|null>}
   */
  async get(key) {
    try {
      const entry = this._store.get(key)
      if (!entry) {
        return null
      }
      if (Date.now() > entry.expiresAt) {
        this._store.delete(key)
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
      this._store.set(key, {
        expiresAt: Date.now() + ttlMs,
        ...entry,
      })
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('write', cause, { key })
    }
  }

  /**
   * Atomically increments the count for a key.
   * If no entry exists, initialises count to 1 with the given TTL.
   *
   * @param {string} key
   * @param {number} ttlMs
   * @returns {Promise<number>}
   */
  async increment(key, ttlMs) {
    try {
      const now   = Date.now()
      const entry = this._store.get(key)

      if (!entry || now > entry.expiresAt) {
        const fresh = { count: 1, windowStart: now, expiresAt: now + ttlMs, meta: {} }
        this._store.set(key, fresh)
        return 1
      }

      entry.count += 1
      return entry.count
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
      this._store.delete(key)
    } catch (cause) {
      throw ErrorFactory.storeOperationFailed('write', cause, { key })
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async destroy() {
    clearInterval(this._cleanupTimer)
    this._store.clear()
    logger.info('MemoryStore destroyed')
  }

  /**
   * Removes entries whose TTL has elapsed.
   */
  _evictExpired() {
    const now     = Date.now()
    let   evicted = 0

    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) {
        this._store.delete(key)
        evicted++
      }
    }

    if (evicted > 0) {
      logger.debug('Evicted expired entries', { evicted })
    }
  }
}
