# ratelimit-engine

> Enterprise-grade, algorithm-pluggable rate limiting engine for Node.js

[![CI](https://github.com/your-org/ratelimit-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/ratelimit-engine/actions)
[![npm version](https://img.shields.io/npm/v/ratelimit-engine.svg)](https://www.npmjs.com/package/ratelimit-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Author](https://img.shields.io/badge/author-Abhinav710-blue)](https://github.com/Abhinav710)

---

## Version

| Version | Status     | Node.js  | Release Date |
|---------|------------|----------|--------------|
| `1.0.0` | **Stable** | `>= 18`  | 2024-11-12   |

---

## Why ratelimit-engine?

Most rate limiting libraries give you a fixed algorithm with configurable numbers.
`ratelimit-engine` treats the **algorithm as a first-class plugin** — swap it, compose it, or write your own without changing a line of engine code.

| Feature                        | express-rate-limit | rate-limiter-flexible | **ratelimit-engine** |
|-------------------------------|--------------------|-----------------------|----------------------|
| Pluggable algorithm            | No                 | No                    | **Yes**              |
| Compose multiple algorithms    | No                 | No                    | **Yes**              |
| Pluggable store                | Partial            | Yes                   | **Yes**              |
| Structured JSON logging        | No                 | No                    | **Yes**              |
| Custom error factory           | No                 | No                    | **Yes**              |
| Framework-agnostic core        | No                 | Partial               | **Yes**              |
| SOLID architecture             | No                 | No                    | **Yes**              |

---

## Features

- **5 built-in algorithms** — Fixed Window, Sliding Window, Token Bucket, Leaky Bucket, Composite
- **Composite mode** — combine algorithms with `ALL` (every must pass) or `ANY` (one must pass)
- **Pluggable stores** — in-memory (dev/test) and Redis with atomic Lua scripts (production)
- **Pluggable algorithms** — implement `BaseAlgorithm` to ship your own logic
- **Key resolvers** — by IP, user ID, API key, route, or any combination
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

# Redis store requires ioredis (peer dependency)
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

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Framework Adapters                         │
│              ExpressAdapter · FastifyAdapter                 │
│         Extracts RequestContext from req object              │
└──────────────────────────┬──────────────────────────────────┘
                           │  RequestContext
┌──────────────────────────▼──────────────────────────────────┐
│                     Engine Core                              │
│                                                              │
│   KeyResolver          RateLimiter          HeaderWriter     │
│   resolves key    ──►  orchestrates   ──►   writes headers   │
│   from context         check/reset          on response      │
└───────────┬────────────────────┬────────────────────────────┘
            │                    │
  ┌─────────▼──────┐   ┌─────────▼──────────────────────────┐
  │ Algorithm Layer│   │           Store Layer               │
  │                │   │                                     │
  │ BaseAlgorithm  │   │  BaseStore                          │
  │  FixedWindow   │   │   MemoryStore  (dev / single node)  │
  │  SlidingWindow │   │   RedisStore   (prod / distributed) │
  │  TokenBucket   │   │                                     │
  │  LeakyBucket   │   │  Redis uses atomic Lua scripts —    │
  │  Composite     │   │  no race conditions across pods     │
  │  [Your own]    │   │  [Your own store]                   │
  └────────────────┘   └─────────────────────────────────────┘
```

### Request Flow

```
Incoming Request
      │
      ▼
Adapter.extractContext(req)
      │  builds RequestContext {ip, userId, apiKey, method, path, headers}
      ▼
KeyResolver.resolve(context)
      │  applies keyBy fn → prefixed string key  e.g. "rle:ip:1.2.3.4"
      ▼
Algorithm.check(key, store)
      │  reads/writes store, applies algorithm math
      │  returns RateLimitResult {allowed, limit, remaining, resetAt, retryAfter}
      ▼
HeaderWriter.write(res, result)
      │  sets X-RateLimit-* headers
      ▼
  allowed?
   ├── YES → next() / continue
   └── NO  → HeaderWriter.sendBlocked() → 429 + Retry-After
                  │
                  ▼
            onBlocked hook (optional)
```

### Module Dependency Map

```
index.js
  ├── engine/createLimiter.js   (factory)
  │     └── engine/RateLimiter.js
  │           ├── engine/KeyResolver.js
  │           ├── engine/HeaderWriter.js
  │           ├── algorithms/BaseAlgorithm.js
  │           └── stores/BaseStore.js
  ├── algorithms/*
  ├── stores/*
  ├── adapters/*
  ├── resolvers/*
  ├── logger/Logger.js + LoggerFactory.js
  ├── errors/ErrorFactory.js  ← single source of all errors
  ├── constants/*             ← single source of all strings/numbers
  └── types/index.js          ← single source of all JSDoc contracts
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

Weighted approximation of a rolling window. No boundary spike problem.

```js
import { SlidingWindow } from 'ratelimit-engine'

new SlidingWindow({ limit: 100, windowMs: 60_000 })
```

### Token Bucket

Tokens refill at a fixed rate. Allows controlled bursting.

```js
import { TokenBucket } from 'ratelimit-engine'

new TokenBucket({ capacity: 100, refillRate: 10 })
// bucket holds 100 tokens, refills 10/sec
```

### Leaky Bucket

Requests processed at a fixed rate. Excess dropped. Strict output rate control.

```js
import { LeakyBucket } from 'ratelimit-engine'

new LeakyBucket({ capacity: 100, leakRate: 10 })
// queue depth 100, drains 10 requests/sec
```

### Composite

Combines multiple algorithms. Use `ALL` (every must pass) or `ANY` (one must pass).

```js
import { Composite, TokenBucket, SlidingWindow, COMPOSITE_MODES } from 'ratelimit-engine'

// Allow burst but enforce a per-minute hard cap
new Composite({
  algorithms: [
    new TokenBucket({ capacity: 50, refillRate: 10 }),
    new SlidingWindow({ limit: 200, windowMs: 60_000 }),
  ],
  mode: COMPOSITE_MODES.ALL,
})
```

### Custom Algorithm

Implement `BaseAlgorithm` to plug in your own logic:

```js
import { BaseAlgorithm } from 'ratelimit-engine'

class MyAlgorithm extends BaseAlgorithm {
  constructor() {
    super('my-algorithm')
  }

  async check(key, store) {
    // your logic here
    // store.get / store.set / store.increment available
    return {
      allowed:   true,
      limit:     100,
      remaining: 99,
      resetAt:   new Date(Date.now() + 60_000),
    }
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

Implement `BaseStore` to use any backend (Postgres, Valkey, DragonflyDB, etc.):

```js
import { BaseStore } from 'ratelimit-engine'

class PostgresStore extends BaseStore {
  constructor(pool) {
    super('postgres')
    this._pool = pool
  }

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

// Combine resolvers — scopes limit to user + route together
compositeResolver([byUser, byRoute])   // "user:abc123|route:GET:/api/data"

// Custom resolver
const byTenant = (ctx) => `tenant:${ctx.rawRequest.headers['x-tenant-id']}`
```

---

## Framework Adapters

### Express

```js
const limiter = createLimiter({ algorithm, store, keyBy })

app.use(limiter.express())                  // global
app.use('/api', limiter.express())          // route-scoped
```

### Fastify

```js
fastify.addHook('onRequest', limiter.fastify())
```

### Framework-agnostic

```js
const result = await limiter.check({
  ip:      '1.2.3.4',
  userId:  'user:99',
  method:  'GET',
  path:    '/api/data',
  headers: {},
})

if (!result.allowed) {
  // handle 429 yourself
}
```

---

## Logging

Default output is structured JSON to stdout/stderr. Plug in Winston or Pino:

```js
import { createLimiter, wrapExternalLogger } from 'ratelimit-engine'
import winston from 'winston'

const logger = winston.createLogger({ /* ... */ })

const limiter = createLimiter({
  algorithm, store, keyBy,
  logger: wrapExternalLogger(logger),
})
```

Log levels: `debug` → `info` → `warn` → `error`

---

## Error Handling

Every error has a machine-readable `code` from `ERROR_CODES`:

```js
import { ErrorFactory, ERROR_CODES } from 'ratelimit-engine'

try {
  await limiter.check(context)
} catch (err) {
  if (err.code === ERROR_CODES.STORE_UNAVAILABLE) {
    // handle store outage
  }
}
```

---

## API Reference

### `createLimiter(config)`

| Field        | Type              | Required | Default | Description                              |
|--------------|-------------------|----------|---------|------------------------------------------|
| `algorithm`  | `BaseAlgorithm`   | Yes      | —       | Algorithm instance                       |
| `store`      | `BaseStore`       | Yes      | —       | Store instance                           |
| `keyBy`      | `Function`        | Yes      | —       | Key resolver function                    |
| `failOpen`   | `boolean`         | No       | `true`  | Allow requests when store is unavailable |
| `onBlocked`  | `Function`        | No       | —       | Hook called when request is blocked      |
| `onAllowed`  | `Function`        | No       | —       | Hook called when request is allowed      |
| `logger`     | `LoggerInterface` | No       | —       | Custom logger instance                   |

Returns `{ limiter, express(), fastify(), check(), reset(), destroy() }`

---

## Examples

```bash
node examples/express-basic/index.js       # Token Bucket + MemoryStore + byIP
node examples/express-composite/index.js   # Composite + MemoryStore + byUser
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)
