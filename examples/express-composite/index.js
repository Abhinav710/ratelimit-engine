/**
 * Composite example — Token Bucket AND Sliding Window, limit by user, MemoryStore.
 * Allows bursting but enforces a per-minute hard cap.
 * Run: node examples/express-composite/index.js
 */

import express from 'express'
import {
  createLimiter,
  TokenBucket,
  SlidingWindow,
  Composite,
  MemoryStore,
  byUser,
} from '../../src/index.js'

const app = express()
app.use(express.json())

// Simulate auth middleware — sets req.user
app.use((req, _res, next) => {
  req.user = { id: req.headers['x-user-id'] ?? 'anonymous' }
  next()
})

const limiter = createLimiter({
  algorithm: new Composite({
    algorithms: [
      new TokenBucket({ capacity: 20, refillRate: 5 }),        // burst: up to 20 at once
      new SlidingWindow({ limit: 60, windowMs: 60_000 }),       // hard cap: 60 per minute
    ],
    mode: 'ALL',
  }),
  store:    new MemoryStore(),
  keyBy:    byUser,
  failOpen: true,
  onBlocked: (ctx, result) => {
    console.warn(`[rate-limit] User ${ctx.userId} blocked — retry in ${result.retryAfter}s`)
  },
})

app.use('/api', limiter.express())

app.get('/api/data', (_req, res) => {
  res.json({ data: 'Here is your data.', timestamp: new Date().toISOString() })
})

app.listen(3001, () => {
  console.log('Composite limiter server running on http://localhost:3001')
})
