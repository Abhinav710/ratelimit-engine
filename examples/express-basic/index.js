/**
 * Basic Express example — Token Bucket, limit by IP, MemoryStore.
 * Run: node examples/express-basic/index.js
 */

import express from 'express'
import {
  createLimiter,
  TokenBucket,
  MemoryStore,
  byIP,
} from '../../src/index.js'

const app = express()

const limiter = createLimiter({
  algorithm: new TokenBucket({ capacity: 10, refillRate: 2 }),
  store:     new MemoryStore(),
  keyBy:     byIP,
  failOpen:  true,
  onBlocked: (ctx, result) => {
    console.warn(`[rate-limit] Blocked ${ctx.ip} — retry in ${result.retryAfter}s`)
  },
})

app.use(limiter.express())

app.get('/', (_req, res) => {
  res.json({ message: 'Hello! You are within rate limits.' })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
