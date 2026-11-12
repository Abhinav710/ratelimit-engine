import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from '../../src/stores/MemoryStore.js'
import { FixedWindow }  from '../../src/algorithms/FixedWindow.js'

describe('FixedWindow', () => {
  let store

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('allows requests within the limit', async () => {
    const algo = new FixedWindow({ limit: 3, windowMs: 60_000 })
    const r1   = await algo.check('user:1', store)
    const r2   = await algo.check('user:1', store)
    const r3   = await algo.check('user:1', store)

    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests that exceed the limit', async () => {
    const algo = new FixedWindow({ limit: 2, windowMs: 60_000 })
    await algo.check('user:2', store)
    await algo.check('user:2', store)
    const r = await algo.check('user:2', store)

    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it('uses independent counters for different keys', async () => {
    const algo = new FixedWindow({ limit: 1, windowMs: 60_000 })
    const rA   = await algo.check('user:A', store)
    const rB   = await algo.check('user:B', store)

    expect(rA.allowed).toBe(true)
    expect(rB.allowed).toBe(true)
  })

  it('resets the counter for a key', async () => {
    const algo = new FixedWindow({ limit: 1, windowMs: 60_000 })
    await algo.check('user:3', store)
    await algo.reset('user:3', store)
    const r = await algo.check('user:3', store)

    expect(r.allowed).toBe(true)
  })

  it('throws on invalid config', () => {
    expect(() => new FixedWindow({ limit: 0, windowMs: 1000 })).toThrow()
    expect(() => new FixedWindow({ limit: 10, windowMs: 0 })).toThrow()
  })
})
