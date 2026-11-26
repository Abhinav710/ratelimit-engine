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
   * Reports what check() would return for the given key right now, without
   * consuming any quota. Optional: Composite uses it to decide before it
   * charges its children, and falls back to check() when a child has no peek().
   *
   * @param {string}                                       key
   * @param {import('../stores/BaseStore.js').BaseStore}   store
   * @returns {Promise<import('../types/index.js').RateLimitResult>}
   */
  async peek(_key, _store) {
    throw new Error('peek() is not implemented by this algorithm')
  }

  /**
   * Whether this algorithm implements peek().
   *
   * @returns {boolean}
   */
  get canPeek() {
    return this.peek !== BaseAlgorithm.prototype.peek
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
