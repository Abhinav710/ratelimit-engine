/**
 * @fileoverview Abstract base class for all rate limit algorithms.
 * Every algorithm must extend this and implement check() and reset().
 */

import { ErrorFactory } from '../errors/ErrorFactory.js'

export class BaseAlgorithm {
  /**
   * @param {string} name - Algorithm identifier from ALGORITHM_NAMES.
   */
  constructor(name) {
    if (new.target === BaseAlgorithm) {
      throw ErrorFactory.invalidAlgorithm({ reason: 'BaseAlgorithm cannot be instantiated directly' })
    }
    this.name = name
  }

  /**
   * Checks whether the given key is within its rate limit.
   *
   * @param {string}                                       key
   * @param {import('../stores/BaseStore.js').BaseStore}   store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async check(_key, _store) {
    throw new Error('check() must be implemented by subclass')
  }

  /**
   * Resets the rate limit state for the given key.
   *
   * @param {string}                                       key
   * @param {import('../stores/BaseStore.js').BaseStore}   store
   * @returns {Promise<void>}
   */
  async reset(_key, _store) {
    throw new Error('reset() must be implemented by subclass')
  }
}
