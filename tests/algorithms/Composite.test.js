import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryStore } from '../../src/stores/MemoryStore.js'
import { FixedWindow } from '../../src/algorithms/FixedWindow.js'
import { SlidingWindow } from '../../src/algorithms/SlidingWindow.js'
import { TokenBucket } from '../../src/algorithms/TokenBucket.js'
import { BaseAlgorithm } from '../../src/algorithms/BaseAlgorithm.js'
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

  describe('charging children', () => {
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

    it('ALL mode — a request blocked by one child is not counted by the others', async () => {
      const algo = new Composite({
        algorithms: [
          new FixedWindow({ limit: 2, windowMs: 1_000 }),
          new SlidingWindow({ limit: 5, windowMs: 60_000 }),
        ],
        mode: COMPOSITE_MODES.ALL,
      })

      // Burst of 10: the 1s window lets 2 through, so the 60s window must hold 2, not 10.
      expect(await countAllowed(algo, 'user:5', 10)).toBe(2)

      // Next second: the 1s window is fresh and the 60s window still has room for 3.
      vi.setSystemTime(new Date('2026-01-01T00:00:31.000Z'))
      expect(await countAllowed(algo, 'user:5', 10)).toBe(2)
    })

    it('ANY mode — an allowed request is charged to one child only', async () => {
      const algo = new Composite({
        algorithms: [
          new FixedWindow({ limit: 3, windowMs: 60_000 }),
          new TokenBucket({ capacity: 3, refillRate: 0.001 }),
        ],
        mode: COMPOSITE_MODES.ANY,
      })

      // 3 from the window, then 3 from the bucket.
      expect(await countAllowed(algo, 'user:6', 10)).toBe(6)
    })

    it('does not charge a nested composite that the outer composite blocks', async () => {
      const inner = new Composite({
        algorithms: [new SlidingWindow({ limit: 5, windowMs: 60_000 })],
      })
      const algo = new Composite({
        algorithms: [new FixedWindow({ limit: 2, windowMs: 1_000 }), inner],
        mode: COMPOSITE_MODES.ALL,
      })

      expect(await countAllowed(algo, 'user:7', 10)).toBe(2)
      vi.setSystemTime(new Date('2026-01-01T00:00:31.000Z'))
      expect(await countAllowed(algo, 'user:7', 10)).toBe(2)
    })

    it('still checks every child when one of them has no peek()', async () => {
      class CountingAlgorithm extends BaseAlgorithm {
        constructor() {
          super('counting')
          this.checks = 0
        }

        async check() {
          this.checks++
          return { allowed: true, limit: 100, remaining: 100, resetAt: new Date() }
        }

        async reset() {}
      }

      const custom = new CountingAlgorithm()
      const algo = new Composite({
        algorithms: [new FixedWindow({ limit: 2, windowMs: 60_000 }), custom],
        mode: COMPOSITE_MODES.ALL,
      })

      expect(await countAllowed(algo, 'user:8', 5)).toBe(2)
      expect(custom.checks).toBe(5)
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
