/**
 * @fileoverview Abstract base class for all store implementations.
 * Any custom store must extend this class and implement all methods.
 */

import { ErrorFactory } from '../errors/ErrorFactory.js'

export class BaseStore {
  /**
   * @param {string} type - Store type identifier (from STORE_TYPES).
   */
  constructor(type) {
    if (new.target === BaseStore) {
      throw ErrorFactory.invalidStore({ reason: 'BaseStore cannot be instantiated directly' })
    }
    this.type = type
  }

  /**
   * Retrieves the entry for a key. Returns null if not found or expired.
   *
   * @param {string} key
   * @returns {Promise<import('../types/index.js').StoreEntry|null>}
   */
  async get(_key) {
    throw new Error('get() must be implemented by subclass')
  }

  /**
   * Persists an entry for a key with a TTL.
   *
   * @param {string}                                   key
   * @param {import('../types/index.js').StoreEntry}   entry
   * @param {number}                                   ttlMs
   * @returns {Promise<void>}
   */
  async set(_key, _entry, _ttlMs) {
    throw new Error('set() must be implemented by subclass')
  }

  /**
   * Atomically increments the count for a key.
   * Creates the entry with ttlMs if it does not exist.
   *
   * @param {string} key
   * @param {number} ttlMs
   * @returns {Promise<number>} New count after increment.
   */
  async increment(_key, _ttlMs) {
    throw new Error('increment() must be implemented by subclass')
  }

  /**
   * Deletes the entry for a key.
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(_key) {
    throw new Error('delete() must be implemented by subclass')
  }

  /**
   * Releases resources held by the store (connections, timers).
   *
   * @returns {Promise<void>}
   */
  async destroy() {}
}
