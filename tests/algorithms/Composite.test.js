import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryStore } from '../../src/stores/MemoryStore.js'
import { FixedWindow } from '../../src/algorithms/FixedWindow.js'
import { SlidingWindow } from '../../src/algorithms/SlidingWindow.js'
import { TokenBucket } from '../../src/algorithms/TokenBucket.js'
import { LeakyBucket } from '../../src/algorithms/LeakyBucket.js'
import { Composite }   from '../../src/algorithms/Composite.js'
import { COMPOSITE_MODES } from '../../src/constants/algorithms.js'

describe('Composite', () => {
  let store

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('ALL mode — allows when both algorithms allow', async () => {
    const algo = new Composite({
      algorithms: [
        new FixedWindow({ limit: 10, windowMs: 60_000 }),
        new TokenBucket({ capacity: 10, refillRate: 5 }),
      ],
      mode: COMPOSITE_MODES.ALL,
    })
    const r = await algo.check('user:1', store)
    expect(r.allowed).toBe(true)
  })

  it('ALL mode — blocks when one algorithm blocks', async () => {
    const fw = new FixedWindow({ limit: 1, windowMs: 60_000 })
    const tb = new TokenBucket({ capacity: 10, refillRate: 5 })
    const algo = new Composite({ algorithms: [fw, tb], mode: COMPOSITE_MODES.ALL })

    await algo.check('user:2', store)
    const r = await algo.check('user:2', store)
    expect(r.allowed).toBe(false)
  })

  it('ANY mode — allows when at least one algorithm allows', async () => {
    const fw = new FixedWindow({ limit: 1, windowMs: 60_000 })
    const tb = new TokenBucket({ capacity: 10, refillRate: 5 })
    const algo = new Composite({ algorithms: [fw, tb], mode: COMPOSITE_MODES.ANY })

    await algo.check('user:3', store)   // fw exhausted, tb still has tokens
    const r = await algo.check('user:3', store)
    expect(r.allowed).toBe(true)
  })

  it('resets all child algorithms', async () => {
    const algo = new Composite({
      algorithms: [
        new FixedWindow({ limit: 1, windowMs: 60_000 }),
        new TokenBucket({ capacity: 1, refillRate: 1 }),
      ],
      mode: COMPOSITE_MODES.ALL,
    })
    await algo.check('user:4', store)
    await algo.reset('user:4', store)
    const r = await algo.check('user:4', store)
    expect(r.allowed).toBe(true)
  })

  describe('child state isolation', () => {
    const countAllowed = async (algo, key, requests) => {
      let allowed = 0
      for (let i = 0; i < requests; i++) {
        if ((await algo.check(key, store)).allowed) {
          allowed++
        }
      }
      return allowed
    }

    beforeEach(() => {
      // Freeze the clock mid-window so no bucket refills and no window rolls over.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('enforces the smaller of two TokenBuckets', async () => {
      const algo = new Composite({
        algorithms: [
          new TokenBucket({ capacity: 3, refillRate: 0.001 }),
          new TokenBucket({ capacity: 1000, refillRate: 1 }),
        ],
      })
      expect(await countAllowed(algo, 'user:5', 20)).toBe(3)
    })

    it('keeps TokenBucket and LeakyBucket state apart', async () => {
      const algo = new Composite({
        algorithms: [
          new TokenBucket({ capacity: 100, refillRate: 1 }),
          new LeakyBucket({ capacity: 100, leakRate: 1 }),
        ],
      })
      expect(await countAllowed(algo, 'user:6', 20)).toBe(20)
    })

    it('counts a request once for FixedWindow and SlidingWindow with the same windowMs', async () => {
      const algo = new Composite({
        algorithms: [
          new FixedWindow({ limit: 10, windowMs: 60_000 }),
          new SlidingWindow({ limit: 10, windowMs: 60_000 }),
        ],
      })
      expect(await countAllowed(algo, 'user:7', 20)).toBe(10)
    })

    it('resets FixedWindow and SlidingWindow children that share a windowMs', async () => {
      const algo = new Composite({
        algorithms: [
          new FixedWindow({ limit: 1, windowMs: 60_000 }),
          new SlidingWindow({ limit: 1, windowMs: 60_000 }),
        ],
      })
      await algo.check('user:8', store)
      await algo.reset('user:8', store)
      const r = await algo.check('user:8', store)
      expect(r.allowed).toBe(true)
    })
  })

  it('throws on empty algorithms array', () => {
    expect(() => new Composite({ algorithms: [] })).toThrow()
  })

  it('throws on invalid mode', () => {
    expect(() => new Composite({
      algorithms: [new FixedWindow()],
      mode: 'INVALID',
    })).toThrow()
  })
})
