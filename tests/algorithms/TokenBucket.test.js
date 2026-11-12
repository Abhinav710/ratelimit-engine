import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore }  from '../../src/stores/MemoryStore.js'
import { TokenBucket }  from '../../src/algorithms/TokenBucket.js'

describe('TokenBucket', () => {
  let store

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('allows requests when tokens are available', async () => {
    const algo = new TokenBucket({ capacity: 5, refillRate: 1 })
    const r    = await algo.check('user:1', store)

    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(4)
    expect(r.limit).toBe(5)
  })

  it('blocks when tokens are exhausted', async () => {
    const algo = new TokenBucket({ capacity: 2, refillRate: 1 })
    await algo.check('user:2', store)
    await algo.check('user:2', store)
    const r = await algo.check('user:2', store)

    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it('resets bucket for a key', async () => {
    const algo = new TokenBucket({ capacity: 1, refillRate: 1 })
    await algo.check('user:3', store)
    await algo.reset('user:3', store)
    const r = await algo.check('user:3', store)

    expect(r.allowed).toBe(true)
  })

  it('throws on invalid config', () => {
    expect(() => new TokenBucket({ capacity: 0, refillRate: 1 })).toThrow()
    expect(() => new TokenBucket({ capacity: 10, refillRate: 0 })).toThrow()
  })
})
