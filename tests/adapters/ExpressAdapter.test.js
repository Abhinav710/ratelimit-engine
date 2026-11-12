import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter }    from '../../src/engine/RateLimiter.js'
import { ExpressAdapter } from '../../src/adapters/ExpressAdapter.js'
import { FixedWindow }    from '../../src/algorithms/FixedWindow.js'
import { MemoryStore }    from '../../src/stores/MemoryStore.js'
import { byIP }           from '../../src/resolvers/byIP.js'

const makeMockReq = (ip = '127.0.0.1') => ({
  ip,
  method:  'GET',
  path:    '/test',
  url:     '/test',
  headers: {},
  socket:  { remoteAddress: ip },
})

const makeMockRes = () => {
  const headers = {}
  return {
    headers,
    _status:  200,
    _body:    null,
    setHeader: (k, v) => { headers[k] = v },
    status:    function (code) { this._status = code; return this },
    send:      function (body) { this._body = body; return this },
  }
}

describe('ExpressAdapter', () => {
  let store
  let limiter
  let adapter

  beforeEach(() => {
    store   = new MemoryStore()
    limiter = new RateLimiter({
      algorithm: new FixedWindow({ limit: 2, windowMs: 60_000 }),
      store,
      keyBy: byIP,
    })
    adapter = new ExpressAdapter(limiter)
  })

  afterEach(async () => {
    await limiter.destroy()
  })

  it('calls next() when request is allowed', async () => {
    const req  = makeMockReq()
    const res  = makeMockRes()
    const next = vi.fn()

    await adapter.middleware()(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('sets rate limit headers on allowed request', async () => {
    const req  = makeMockReq('10.0.0.1')
    const res  = makeMockRes()
    const next = vi.fn()

    await adapter.middleware()(req, res, next)
    expect(res.headers['X-RateLimit-Limit']).toBe('2')
    expect(res.headers['X-RateLimit-Remaining']).toBe('1')
  })

  it('sends 429 and does not call next() when blocked', async () => {
    const req  = makeMockReq('10.0.0.2')
    const res  = makeMockRes()
    const next = vi.fn()
    const mw   = adapter.middleware()

    await mw(req, res, next)
    await mw(req, res, next)
    await mw(req, res, next)  // blocked

    expect(next).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(429)
    expect(res.headers['Retry-After']).toBeDefined()
  })
})
