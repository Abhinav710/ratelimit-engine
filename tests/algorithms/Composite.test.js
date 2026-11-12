import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from '../../src/stores/MemoryStore.js'
import { FixedWindow } from '../../src/algorithms/FixedWindow.js'
import { TokenBucket } from '../../src/algorithms/TokenBucket.js'
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
