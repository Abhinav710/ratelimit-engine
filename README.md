# ratelimit-engine

> Enterprise-grade, algorithm-pluggable rate limiting engine for Node.js

[![CI](https://github.com/Abhinav710/ratelimit-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Abhinav710/ratelimit-engine/actions)
[![npm version](https://img.shields.io/npm/v/ratelimit-engine.svg)](https://www.npmjs.com/package/ratelimit-engine)
[![npm downloads](https://img.shields.io/npm/dm/ratelimit-engine.svg)](https://www.npmjs.com/package/ratelimit-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Author](https://img.shields.io/badge/author-Abhinav710-blue)](https://github.com/Abhinav710)

---

## Table of Contents

- [Overview](#overview)
- [Version History](#version-history)
- [Why ratelimit-engine?](#why-ratelimit-engine)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI — Setup Wizard](#cli--setup-wizard)
- [CLI — Live Dashboard](#cli--live-dashboard)
- [Architecture](#architecture)
- [Algorithms](#algorithms)
- [Stores](#stores)
- [Key Resolvers](#key-resolvers)
- [Framework Adapters](#framework-adapters)
- [Logging](#logging)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Most rate limiting libraries give you a fixed algorithm with configurable numbers. `ratelimit-engine` treats the **algorithm as a first-class plugin** — swap it, compose it, or write your own without changing a line of engine code.

It ships with a **setup wizard CLI** that generates a ready-to-use config file for your project, and a **live terminal dashboard** that shows real-time traffic at 10ms resolution — allowed vs blocked, sparkline, top IPs, and a live request feed.

---

## Version History

| Version | Status     | Node.js  | Highlights                                      |
|---------|------------|----------|-------------------------------------------------|
| `1.1.2` | **Latest** | `>= 20.12`  | Fix RedisStore EVALSHA race + NOSCRIPT; drop Node 18 |
| `1.1.0` | Stable     | `>= 18`  | Live 10ms dashboard, setup wizard CLI           |
| `1.0.2` | Stable     | `>= 18`  | Custom overrides step in wizard                 |
| `1.0.1` | Stable     | `>= 18`  | Setup wizard CLI (replaces simulation)          |
| `1.0.0` | Stable     | `>= 18`  | Initial release — 5 algorithms, Redis, adapters |

---

## Why ratelimit-engine?

| Feature                          | express-rate-limit | rate-limiter-flexible | **ratelimit-engine** |
|----------------------------------|--------------------|-----------------------|----------------------|
| Pluggable algorithm              | No                 | No                    | **Yes**              |
| Compose multiple algorithms      | No                 | No                    | **Yes**              |
| Pluggable store                  | Partial            | Yes                   | **Yes**              |
| Setup wizard CLI                 | No                 | No                    | **Yes**              |
| Live terminal dashboard          | No                 | No                    | **Yes**              |
| Structured JSON logging          | No                 | No                    | **Yes**              |
| Custom error factory             | No                 | No                    | **Yes**              |
| Framework-agnostic core          | No                 | Partial               | **Yes**              |
| SOLID architecture               | No                 | No                    | **Yes**              |

---

## Features

- **5 built-in algorithms** — Fixed Window, Sliding Window, Token Bucket, Leaky Bucket, Composite
- **Composite mode** — combine algorithms with `ALL` (every must pass) or `ANY` (one must pass)
- **Pluggable stores** — in-memory (dev/test) and Redis with atomic Lua scripts (production)
- **Pluggable algorithms** — implement `BaseAlgorithm` to ship your own logic
- **Key resolvers** — by IP, user ID, API key, route, or any combination
- **Setup wizard CLI** — `npx ratelimit-engine` generates a `ratelimit.config.js` for your project
- **Live dashboard** — `npx ratelimit-engine dashboard` renders a 10ms real-time terminal UI
- **Structured logging** — JSON logs with pluggable transport (Winston, Pino, or default stdout)
- **Error factory** — every error has a machine-readable code, human message, and context
- **Framework adapters** — Express and Fastify out of the box
- **Standard HTTP headers** — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
- **Fail-open / fail-closed** — configurable behaviour when the store is unavailable
- **Lifecycle hooks** — `onBlocked` and `onAllowed` callbacks for observability
- **Zero magic values** — all constants in dedicated files, JSDoc types on every contract

---

## Installation

```bash
npm install ratelimit-engine

# Redis store requires ioredis (optional peer dependency)
npm install ioredis
```

---

## Quick Start

```js
import { createLimiter, TokenBucket, MemoryStore, byIP } from 'ratelimit-engine'
import express from 'express'

const app = express()

const limiter = createLimiter({
  algorithm: new TokenBucket({ capacity: 100, refillRate: 10 }),
  store:     new MemoryStore(),
  keyBy:     byIP,
})

app.use(limiter.express())

app.get('/', (_req, res) => res.json({ message: 'ok' }))
app.listen(3000)
```

---

## CLI — Setup Wizard

The setup wizard generates a ready-to-use `ratelimit.config.js` for your project — no manual config needed.

```bash
npx ratelimit-engine
```

**Wizard flow:**

```
⚡ ratelimit-engine — Setup Wizard
Generates a ready-to-use ratelimit.config.js for your project.

Step 1 — Choose an algorithm:
  1. Token Bucket      Burst-friendly — refills tokens over time
  2. Fixed Window      Simple counter per time window
  3. Sliding Window    Smooth rolling window, no boundary spikes
  4. Leaky Bucket      Strict output rate, drops excess
  5. Composite         Combine two algorithms (ALL / ANY)

Step 2 — Choose a store:
  1. Memory   In-process store — single instance
  2. Redis    Distributed store — multi-instance / clustered

Step 3 — Choose your framework:
  1. Express
  2. Fastify
  3. Manual (any framework)

Step 4 — How should requests be keyed?
  1. By IP         One counter per client IP
  2. By User       One counter per authenticated user
  3. By Route      One counter per URL path
  4. IP + Route    Separate counter per IP+route combination

Step 5 — Custom options (press Enter to skip each)
  Output filename, failOpen, custom onBlocked message

✅ Done! Generated ratelimit.config.js
```

**Sample output:**

```js
import { createLimiter, TokenBucket, MemoryStore, byIP } from 'ratelimit-engine'

const limiter = createLimiter({
  algorithm: new TokenBucket({ capacity: 100, refillRate: 10 }),
  store:     new MemoryStore(),
  keyBy:     byIP,
  failOpen:  true,
  onBlocked: (ctx, result) => {
    console.warn(`[RATE LIMIT] ${ctx.ip} blocked — retry in ${result.retryAfter}s`)
  },
})

// Express — apply globally
app.use(limiter.express())

// or per-route
app.get('/api/resource', limiter.express(), handler)

export { limiter }
```

Then import it into your app:

```js
import { limiter } from './ratelimit.config.js'
app.use(limiter.express())
```

---

## CLI — Live Dashboard

A real-time terminal dashboard that displays rate limit traffic at **10ms resolution**.

```bash
npx ratelimit-engine dashboard
```

**What it shows:**

```
⚡ ratelimit-engine  Live Dashboard — Real Backend        Refresh: 10ms

  Uptime: 00:02:45    Window: last 2s    Mode: Rate limiting ON    ⚠ HIGH BLOCK RATE

  ┌─ Traffic ──────────────────────────────────────────────────────┐
  │ Total     ████████████████████████████   56     req            │
  │ Allowed   ███████░░░░░░░░░░░░░░░░░░░░░   14     req            │
  │ Blocked   █████████████████████░░░░░░░   42     req   75.0%    │
  └────────────────────────────────────────────────────────────────┘

  ┌─ Sparkline — last 2s (200 × 10ms buckets) ─────────────────────┐
  │  ▁▂▃▅▇█▇▅▃▂▁▂▄▆█▇▄▂▁▃▅▇█▅▃▁▂▄▆█▇▄▂▁▃▅▇█▅▃▁                    │
  └────────────────────────────────────────────────────────────────┘

  ┌─ Top IPs ───────────────────────────────────────────────────────┐
  │ 192.168.1.1    56 req   42 blocked   █████████░░░  🔴 high block │
  │ 10.0.0.5       12 req    0 blocked   ████░░░░░░░░  🟢 normal     │
  └────────────────────────────────────────────────────────────────┘

  ┌─ Live Feed ─────────────────────────────────────────────────────┐
  │ 20:01:35.919  ❌ BLOCKED  192.168.1.1   POST   /api/login        │
  │ 20:01:35.900  ✅ ALLOWED  10.0.0.5      GET    /api/search       │
  │ 20:01:35.882  ❌ BLOCKED  192.168.1.1   POST   /api/login        │
  └────────────────────────────────────────────────────────────────┘

  [q] quit   [r] reset counters   [p] pause/resume
```

**Keyboard controls:**

| Key | Action |
|-----|--------|
| `q` | Quit dashboard |
| `p` | Pause / resume rendering |
| `r` | Reset all counters |

**Integrating the dashboard with your own backend:**

Expose a `/__dashboard` endpoint in your server and wire `onAllowed`/`onBlocked` hooks to record traffic:

```js
// server.js
const stats = { allowed: 0, blocked: 0, feed: [], topIPs: new Map() }

const limiter = createLimiter({
  algorithm: new TokenBucket({ capacity: 10, refillRate: 2 }),
  store:     new MemoryStore(),
  keyBy:     byIP,
  onAllowed: (ctx) => recordEvent(ctx, true),
  onBlocked: (ctx, result) => recordEvent(ctx, false, result),
})

app.get('/__dashboard', (_req, res) => res.json(stats))
```

Then run the dashboard pointing at your server:

```bash
node dashboard.js   # polls /__dashboard every 100ms
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Framework Adapters                         │
│               ExpressAdapter · FastifyAdapter                 │
│          Extracts RequestContext from req object              │
└──────────────────────────┬──────────────────────────────────┘
                           │  RequestContext
┌──────────────────────────▼──────────────────────────────────┐
│                      Engine Core                              │
│                                                               │
│   KeyResolver          RateLimiter          HeaderWriter      │
│   resolves key    ──►  orchestrates   ──►   writes headers    │
│   from context         check/reset          on response       │
└───────────┬────────────────────┬────────────────────────────┘
            │                    │
  ┌─────────▼──────┐   ┌─────────▼──────────────────────────┐
  │ Algorithm Layer│   │           Store Layer                │
  │                │   │                                      │
  │ BaseAlgorithm  │   │  BaseStore                           │
  │  FixedWindow   │   │   MemoryStore  (dev / single node)   │
  │  SlidingWindow │   │   RedisStore   (prod / distributed)  │
  │  TokenBucket   │   │                                      │
  │  LeakyBucket   │   │  Redis uses atomic Lua scripts —     │
  │  Composite     │   │  no race conditions across pods      │
  │  [Your own]    │   │  [Your own store]                    │
  └────────────────┘   └──────────────────────────────────────┘
```

### Request Flow

```
Incoming Request
      │
      ▼
Adapter.extractContext(req)
      │  builds RequestContext { ip, userId, apiKey, method, path, headers }
      ▼
KeyResolver.resolve(context)
      │  applies keyBy fn → prefixed string key  e.g. "rle:ip:1.2.3.4"
      ▼
Algorithm.check(key, store)
      │  reads/writes store, applies algorithm math
      │  returns RateLimitResult { allowed, limit, remaining, resetAt, retryAfter }
      ▼
HeaderWriter.write(res, result)
      │  sets X-RateLimit-* headers
      ▼
  allowed?
   ├── YES → onAllowed hook → next()
   └── NO  → onBlocked hook → 429 + Retry-After
```

### Module Dependency Map

```
index.js
  ├── engine/createLimiter.js         (factory)
  │     └── engine/RateLimiter.js
  │           ├── engine/KeyResolver.js
  │           ├── engine/HeaderWriter.js
  │           ├── algorithms/BaseAlgorithm.js
  │           └── stores/BaseStore.js
  ├── algorithms/
  │     ├── FixedWindow.js
  │     ├── SlidingWindow.js
  │     ├── TokenBucket.js
  │     ├── LeakyBucket.js
  │     └── Composite.js
  ├── stores/
  │     ├── MemoryStore.js
  │     └── RedisStore.js
  ├── adapters/
  │     ├── ExpressAdapter.js
  │     └── FastifyAdapter.js
  ├── resolvers/
  │     ├── byIP.js · byUser.js · byAPIKey.js · byRoute.js · composite.js
  ├── dashboard/
  │     ├── DashboardCollector.js     (event collector — 10ms buckets)
  │     └── DashboardRenderer.js     (ANSI terminal renderer)
  ├── logger/Logger.js + LoggerFactory.js
  ├── errors/ErrorFactory.js         ← single source of all errors
  ├── constants/                     ← single source of all strings/numbers
  └── types/index.js                 ← single source of all JSDoc contracts
```

---

## Algorithms

### Fixed Window

Counts requests in a fixed time slot. Simple and cheap. Boundary bursts are possible.

```js
import { FixedWindow } from 'ratelimit-engine'

new FixedWindow({ limit: 100, windowMs: 60_000 })
// 100 requests per minute
```

### Sliding Window

Weighted approximation of a rolling window. Eliminates the boundary spike problem.

```js
import { SlidingWindow } from 'ratelimit-engine'

new SlidingWindow({ limit: 100, windowMs: 60_000 })
```

### Token Bucket

Tokens refill at a fixed rate. Allows controlled bursting above the average rate.

```js
import { TokenBucket } from 'ratelimit-engine'

new TokenBucket({ capacity: 100, refillRate: 10 })
// bucket holds 100 tokens, refills 10/sec
```

### Leaky Bucket

Requests processed at a fixed rate. Excess is dropped. Strict output rate control.

```js
import { LeakyBucket } from 'ratelimit-engine'

new LeakyBucket({ capacity: 100, leakRate: 10 })
// queue depth 100, drains 10 requests/sec
```

### Composite

Combines multiple algorithms. Use `ALL` (every must pass) or `ANY` (one must pass).

```js
import { Composite, TokenBucket, SlidingWindow, COMPOSITE_MODES } from 'ratelimit-engine'

new Composite({
  algorithms: [
    new TokenBucket({ capacity: 50, refillRate: 10 }),
    new SlidingWindow({ limit: 200, windowMs: 60_000 }),
  ],
  mode: COMPOSITE_MODES.ALL,
})
```

### Custom Algorithm

Extend `BaseAlgorithm` to implement your own logic:

```js
import { BaseAlgorithm } from 'ratelimit-engine'

class MyAlgorithm extends BaseAlgorithm {
  constructor() { super('my-algorithm') }

  async check(key, store) {
    // store.get / store.set / store.increment available
    return { allowed: true, limit: 100, remaining: 99, resetAt: new Date(Date.now() + 60_000) }
  }

  async reset(key, store) {
    await store.delete(key)
  }
}
```

---

## Stores

### MemoryStore

Single-instance, in-process. Best for development and testing.

```js
import { MemoryStore } from 'ratelimit-engine'
new MemoryStore()
```

### RedisStore

Distributed, atomic Lua scripts. Required for multi-pod / Kubernetes deployments.

```js
import { RedisStore } from 'ratelimit-engine'
import Redis from 'ioredis'

const redis = new Redis({ host: 'localhost', port: 6379 })
new RedisStore({ client: redis, prefix: 'myapp:rl:' })
```

### Custom Store

Extend `BaseStore` to use any backend (Postgres, Valkey, DragonflyDB, etc.):

```js
import { BaseStore } from 'ratelimit-engine'

class PostgresStore extends BaseStore {
  constructor(pool) { super('postgres'); this._pool = pool }

  async get(key) { /* ... */ }
  async set(key, entry, ttlMs) { /* ... */ }
  async increment(key, ttlMs) { /* ... */ }
  async delete(key) { /* ... */ }
}
```

---

## Key Resolvers

```js
import { byIP, byUser, byAPIKey, byRoute, compositeResolver } from 'ratelimit-engine'

byIP       // "ip:1.2.3.4"
byUser     // "user:abc123"
byAPIKey   // "apikey:sk-..."
byRoute    // "route:GET:/api/data"

// Separate counter per IP + route combination
compositeResolver([byUser, byRoute])   // "user:abc123|route:GET:/api/data"

// Custom resolver
const byTenant = (ctx) => `tenant:${ctx.rawRequest.headers['x-tenant-id']}`
```

---

## Framework Adapters

### Express

```js
const limiter = createLimiter({ algorithm, store, keyBy })

// Global
app.use(limiter.express())

// Per-route
app.post('/api/login', limiter.express(), handler)
```

### Fastify

```js
fastify.addHook('onRequest', limiter.fastify())
```

### Manual (any framework)

```js
const result = await limiter.check({
  ip:      req.ip,
  userId:  req.user?.id,
  method:  req.method,
  path:    req.path,
  headers: req.headers,
})

if (!result.allowed) {
  return res.status(429).json({
    error:      'Too Many Requests',
    retryAfter: result.retryAfter,
  })
}
```

---

## Logging

Default output is structured JSON to stdout. Plug in Winston or Pino:

```js
import { createLimiter, wrapExternalLogger } from 'ratelimit-engine'
import winston from 'winston'

const logger = winston.createLogger({ /* ... */ })

const limiter = createLimiter({
  algorithm, store, keyBy,
  logger: wrapExternalLogger(logger),
})
```

Sample log output:

```json
{"timestamp":"2026-11-15T19:58:15.287Z","level":"info","message":"Request blocked","logger":"RateLimiter","key":"rle:ip:::1","retryAfter":1,"resetAt":"2026-11-15T19:58:16.000Z"}
```

Log levels: `debug` → `info` → `warn` → `error`

---

## Error Handling

Every error has a machine-readable `code` from `ERROR_CODES`:

```js
import { ERROR_CODES } from 'ratelimit-engine'

try {
  await limiter.check(context)
} catch (err) {
  switch (err.code) {
    case ERROR_CODES.STORE_UNAVAILABLE:
      // handle store outage
      break
    case ERROR_CODES.INVALID_ALGORITHM:
      // misconfiguration
      break
  }
}
```

---

## API Reference

### `createLimiter(config)`

| Field       | Type              | Required | Default | Description                              |
|-------------|-------------------|----------|---------|------------------------------------------|
| `algorithm` | `BaseAlgorithm`   | Yes      | —       | Algorithm instance                       |
| `store`     | `BaseStore`       | Yes      | —       | Store instance                           |
| `keyBy`     | `Function`        | Yes      | —       | Key resolver function                    |
| `failOpen`  | `boolean`         | No       | `true`  | Allow requests when store is unavailable |
| `onBlocked` | `Function`        | No       | —       | `(ctx, result) => void`                  |
| `onAllowed` | `Function`        | No       | —       | `(ctx, result) => void`                  |
| `logger`    | `LoggerInterface` | No       | —       | Custom logger instance                   |

Returns `{ limiter, express(), fastify(), check(), reset(), destroy() }`

### `RateLimitResult`

| Field        | Type      | Description                              |
|--------------|-----------|------------------------------------------|
| `allowed`    | `boolean` | Whether the request is permitted         |
| `limit`      | `number`  | Total limit for the window               |
| `remaining`  | `number`  | Remaining requests in the current window |
| `resetAt`    | `Date`    | When the window resets                   |
| `retryAfter` | `number`  | Seconds until the client can retry       |

---

## Testing

```bash
npm test               # run all tests
npm run test:coverage  # coverage report
npm run lint           # lint src + tests
```

Tests cover all 5 algorithms, both stores, key resolvers, adapters, error factory, and logger. All 37 tests pass across Node 18, 20, and 22.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding conventions, and PR guidelines.

---

## License

[MIT](./LICENSE) — Abhinav Kumar
