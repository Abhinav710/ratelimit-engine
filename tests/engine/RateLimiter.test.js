import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RateLimiter }  from '../../src/engine/RateLimiter.js'
import { FixedWindow }  from '../../src/algorithms/FixedWindow.js'
import { MemoryStore }  from '../../src/stores/MemoryStore.js'
import { byIP }         from '../../src/resolvers/byIP.js'

const makeContext = (ip = '127.0.0.1') => ({
  ip,
  method:  'GET',
  path:    '/test',
  headers: {},
})

describe('RateLimiter', () => {
  let store
  let limiter

  beforeEach(() => {
    store   = new MemoryStore()
    limiter = new RateLimiter({
      algorithm: new FixedWindow({ limit: 3, windowMs: 60_000 }),
      store,
      keyBy: byIP,
    })
  })

  afterEach(async () => {
    await limiter.destroy()
  })

  it('allows requests within the limit', async () => {
    const r = await limiter.check(makeContext('1.1.1.1'))
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it('blocks after limit is exceeded', async () => {
    await limiter.check(makeContext('2.2.2.2'))
    await limiter.check(makeContext('2.2.2.2'))
    await limiter.check(makeContext('2.2.2.2'))
    const r = await limiter.check(makeContext('2.2.2.2'))
    expect(r.allowed).toBe(false)
  })

  it('fires onBlocked hook', async () => {
    let blocked = false
    const l = new RateLimiter({
      algorithm: new FixedWindow({ limit: 1, windowMs: 60_000 }),
      store:     new MemoryStore(),
      keyBy:     byIP,
      onBlocked: () => { blocked = true },
    })
    await l.check(makeContext('3.3.3.3'))
    await l.check(makeContext('3.3.3.3'))
    expect(blocked).toBe(true)
    await l.destroy()
  })

  it('fires onAllowed hook', async () => {
    let allowed = false
    const l = new RateLimiter({
      algorithm: new FixedWindow({ limit: 5, windowMs: 60_000 }),
      store:     new MemoryStore(),
      keyBy:     byIP,
      onAllowed: () => { allowed = true },
    })
    await l.check(makeContext('4.4.4.4'))
    expect(allowed).toBe(true)
    await l.destroy()
  })

  it('resets state for a context', async () => {
    const ctx = makeContext('5.5.5.5')
    await limiter.check(ctx)
    await limiter.check(ctx)
    await limiter.check(ctx)
    await limiter.reset(ctx)
    const r = await limiter.check(ctx)
    expect(r.allowed).toBe(true)
  })

  it('throws on missing algorithm', () => {
    expect(() => new RateLimiter({ store, keyBy: byIP })).toThrow()
  })

  it('throws on missing store', () => {
    expect(() => new RateLimiter({
      algorithm: new FixedWindow(),
      keyBy:     byIP,
    })).toThrow()
  })

  it('throws on missing keyBy', () => {
    expect(() => new RateLimiter({
      algorithm: new FixedWindow(),
      store,
    })).toThrow()
  })
})
