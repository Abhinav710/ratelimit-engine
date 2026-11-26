import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryStore }   from '../../src/stores/MemoryStore.js'
import { FixedWindow }   from '../../src/algorithms/FixedWindow.js'
import { SlidingWindow } from '../../src/algorithms/SlidingWindow.js'
import { TokenBucket }   from '../../src/algorithms/TokenBucket.js'
import { LeakyBucket }   from '../../src/algorithms/LeakyBucket.js'

const singleRequestAlgorithms = [
  ['FixedWindow',   () => new FixedWindow({ limit: 1, windowMs: 60_000 })],
  ['SlidingWindow', () => new SlidingWindow({ limit: 1, windowMs: 60_000 })],
  ['TokenBucket',   () => new TokenBucket({ capacity: 1, refillRate: 0.001 })],
  ['LeakyBucket',   () => new LeakyBucket({ capacity: 1, leakRate: 0.001 })],
]

describe.each(singleRequestAlgorithms)('%s peek', (_name, create) => {
  let store

  beforeEach(() => {
    // Freeze the clock mid-window so no bucket refills and no window rolls over.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'))
    store = new MemoryStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not consume quota', async () => {
    const algo = create()

    expect((await algo.peek('user:1', store)).allowed).toBe(true)
    expect((await algo.peek('user:1', store)).allowed).toBe(true)
    expect((await algo.check('user:1', store)).allowed).toBe(true)
  })

  it('returns what check would return', async () => {
    const algo = create()

    const peekedFirst = await algo.peek('user:2', store)
    expect(await algo.check('user:2', store)).toEqual(peekedFirst)

    const peekedSecond = await algo.peek('user:2', store)
    expect(peekedSecond.allowed).toBe(false)
    expect(await algo.check('user:2', store)).toEqual(peekedSecond)
  })
})
