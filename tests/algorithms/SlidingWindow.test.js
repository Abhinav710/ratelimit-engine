import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore }   from '../../src/stores/MemoryStore.js'
import { SlidingWindow } from '../../src/algorithms/SlidingWindow.js'

describe('SlidingWindow', () => {
  let store

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('allows requests within the limit', async () => {
    const algo = new SlidingWindow({ limit: 5, windowMs: 60_000 })
    const r    = await algo.check('user:1', store)

    expect(r.allowed).toBe(true)
    expect(r.limit).toBe(5)
  })

  it('blocks requests that exceed the limit', async () => {
    const algo = new SlidingWindow({ limit: 2, windowMs: 60_000 })
    await algo.check('user:2', store)
    await algo.check('user:2', store)
    await algo.check('user:2', store)
    const r = await algo.check('user:2', store)

    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('resets both window slots', async () => {
    const algo = new SlidingWindow({ limit: 1, windowMs: 60_000 })
    await algo.check('user:3', store)
    await algo.reset('user:3', store)
    const r = await algo.check('user:3', store)

    expect(r.allowed).toBe(true)
  })

  it('throws on invalid config', () => {
    expect(() => new SlidingWindow({ limit: -1, windowMs: 1000 })).toThrow()
  })
})
