import { describe, it, expect } from 'vitest'
import { RedisStore } from '../../src/stores/RedisStore.js'

/** Stand-in for an ioredis client that returns one fixed raw value. */
const clientReturning = (raw) => ({
  defineCommand() {},
  get: async () => raw,
})

describe('RedisStore', () => {
  describe('get', () => {
    it('returns null for a missing key', async () => {
      const store = new RedisStore({ client: clientReturning(null) })
      expect(await store.get('user:1')).toBeNull()
    })

    it('returns the count for a key written by increment()', async () => {
      const store = new RedisStore({ client: clientReturning('7') })
      expect((await store.get('user:1')).count).toBe(7)
    })

    it('returns the entry for a key written by set()', async () => {
      const entry = { count: 2, expiresAt: Date.now() + 60_000, meta: { tokens: 3 } }
      const store = new RedisStore({ client: clientReturning(JSON.stringify(entry)) })
      expect(await store.get('user:1')).toEqual(entry)
    })

    it('returns null for an expired entry', async () => {
      const entry = { count: 2, expiresAt: Date.now() - 1 }
      const store = new RedisStore({ client: clientReturning(JSON.stringify(entry)) })
      expect(await store.get('user:1')).toBeNull()
    })
  })
})
