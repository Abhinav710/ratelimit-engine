import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryStore } from '../../src/stores/MemoryStore.js'

describe('MemoryStore', () => {
  let store

  beforeEach(() => {
    store = new MemoryStore()
  })

  afterEach(async () => {
    await store.destroy()
  })

  it('returns null for a missing key', async () => {
    const result = await store.get('missing')
    expect(result).toBeNull()
  })

  it('sets and gets an entry', async () => {
    const entry = { count: 1, windowStart: Date.now(), expiresAt: Date.now() + 60_000, meta: {} }
    await store.set('key:1', entry, 60_000)
    const result = await store.get('key:1')

    expect(result).not.toBeNull()
    expect(result.count).toBe(1)
  })

  it('returns null for an expired entry', async () => {
    const entry = { count: 1, windowStart: Date.now(), expiresAt: Date.now() - 1, meta: {} }
    await store.set('key:2', entry, 1)
    const result = await store.get('key:2')

    expect(result).toBeNull()
  })

  it('increments from zero', async () => {
    const count = await store.increment('key:3', 60_000)
    expect(count).toBe(1)
  })

  it('increments an existing entry', async () => {
    await store.increment('key:4', 60_000)
    await store.increment('key:4', 60_000)
    const count = await store.increment('key:4', 60_000)
    expect(count).toBe(3)
  })

  it('deletes an entry', async () => {
    await store.increment('key:5', 60_000)
    await store.delete('key:5')
    const result = await store.get('key:5')
    expect(result).toBeNull()
  })

  it('resets expired entry on increment', async () => {
    const entry = { count: 99, windowStart: Date.now(), expiresAt: Date.now() - 1, meta: {} }
    await store.set('key:6', entry, 1)
    const count = await store.increment('key:6', 60_000)
    expect(count).toBe(1)
  })
})
