# Contributing to ratelimit-engine

Thank you for considering a contribution. This document explains how to get set up, what we expect from contributions, and how the review process works.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Adding a New Algorithm](#adding-a-new-algorithm)
- [Adding a New Store](#adding-a-new-store)
- [Adding a New Framework Adapter](#adding-a-new-framework-adapter)
- [Coding Standards](#coding-standards)
- [Tests](#tests)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Contributors](#contributors)

---

## Code of Conduct

Be respectful. Constructive disagreement is welcome — personal attacks are not. Contributions of all sizes and experience levels are valued.

---

## Project Structure

```
src/
├── constants/       All strings and numbers — no magic values in logic files
├── types/           JSDoc @typedef contracts — shapes for every object
├── logger/          Structured logger + factory
├── errors/          Error classes + ErrorFactory — only place errors are created
├── engine/          RateLimiter, KeyResolver, HeaderWriter — core orchestration
├── algorithms/      BaseAlgorithm + built-in implementations
├── stores/          BaseStore + built-in implementations
├── resolvers/       Key resolver functions
└── adapters/        Framework middleware adapters
```

The design follows SOLID principles:
- **S** — each file has one responsibility
- **O** — extend `BaseAlgorithm` / `BaseStore` to add new behaviour; do not modify the engine
- **L** — any subclass of `BaseAlgorithm` or `BaseStore` must be substitutable
- **I** — algorithm and store interfaces are separate; adapters depend only on `RateLimiter`
- **D** — the engine depends on abstractions, never on concrete implementations

---

## Getting Started

```bash
# 1. Fork the repository and clone your fork
git clone https://github.com/<your-username>/ratelimit-engine.git
cd ratelimit-engine

# 2. Install dependencies
npm install

# 3. Run tests to confirm everything passes
npm test

# 4. Create a feature branch
git checkout -b feat/your-feature-name
```

---

## How to Contribute

| Type                    | What to do                                                |
|-------------------------|-----------------------------------------------------------|
| Bug report              | Open a GitHub Issue with steps to reproduce               |
| Feature request         | Open a GitHub Issue to discuss before building            |
| New algorithm           | Follow the [Adding a New Algorithm](#adding-a-new-algorithm) guide |
| New store               | Follow the [Adding a New Store](#adding-a-new-store) guide |
| New framework adapter   | Follow the [Adding a New Framework Adapter](#adding-a-new-framework-adapter) guide |
| Documentation fix       | Open a PR directly — no issue needed for small fixes      |
| Performance improvement | Open an issue first with benchmark data                   |

---

## Adding a New Algorithm

This is the most common contribution. The engine is designed so that adding an algorithm requires **zero changes** to existing files.

### Steps

**1. Create the file**

```
src/algorithms/YourAlgorithm.js
```

**2. Extend `BaseAlgorithm`**

```js
import { BaseAlgorithm }   from './BaseAlgorithm.js'
import { ErrorFactory }    from '../errors/ErrorFactory.js'
import { ALGORITHM_NAMES } from '../constants/algorithms.js'
import { createLogger }    from '../logger/LoggerFactory.js'

const logger = createLogger('YourAlgorithm')

export class YourAlgorithm extends BaseAlgorithm {
  constructor({ /* your config */ } = {}) {
    super(ALGORITHM_NAMES.YOUR_ALGORITHM)  // add your name to constants/algorithms.js

    // validate config — always use ErrorFactory, never throw raw Error
    if (someField <= 0) {
      throw ErrorFactory.invalidValue('someField', someField, 'must be a positive integer')
    }

    this._someField = someField
  }

  async check(key, store) {
    // implement your logic
    // use store.get / store.set / store.increment / store.delete
    // always return a complete RateLimitResult

    logger.debug('YourAlgorithm check', { key })

    return {
      allowed:    true,
      limit:      this._someField,
      remaining:  0,
      resetAt:    new Date(),
      retryAfter: undefined,
    }
  }

  async reset(key, store) {
    await store.delete(key)
    logger.debug('YourAlgorithm reset', { key })
  }
}
```

**3. Add the name constant**

In `src/constants/algorithms.js`, add to `ALGORITHM_NAMES`:

```js
YOUR_ALGORITHM: 'your-algorithm',
```

**4. Export from public API**

In `src/index.js`:

```js
export { YourAlgorithm } from './algorithms/YourAlgorithm.js'
```

**5. Write tests**

Create `tests/algorithms/YourAlgorithm.test.js`. Required test cases:
- Allows requests within limit
- Blocks requests that exceed limit
- Independent counters for different keys
- Reset clears state
- Constructor throws on invalid config

---

## Adding a New Store

**1. Create `src/stores/YourStore.js`** — extend `BaseStore` and implement all 5 methods:
- `get(key)` → `StoreEntry | null`
- `set(key, entry, ttlMs)` → `void`
- `increment(key, ttlMs)` → `number`
- `delete(key)` → `void`
- `destroy()` → `void`

**2. Use `ErrorFactory`** for all thrown errors — never `new Error(string)`.

**3. Add to `STORE_TYPES`** constant in `src/constants/store.js`.

**4. Export from `src/index.js`**.

**5. Write tests** in `tests/stores/YourStore.test.js` covering the same cases as `MemoryStore.test.js`.

---

## Adding a New Framework Adapter

**1. Create `src/adapters/YourAdapter.js`** — extend `BaseAdapter` and implement:
- `extractContext(req)` → `RequestContext`
- `middleware()` → framework-specific function

**2. Export from `src/index.js`**.

**3. Write tests** in `tests/adapters/YourAdapter.test.js` — mock the request/response objects.

---

## Coding Standards

- `.js` files only — no TypeScript
- ES modules (`import`/`export`) — no CommonJS `require`
- `const` and `let` only — never `var`
- Classes for stateful components, plain functions for stateless logic
- No magic strings or numbers — define in `src/constants/`
- No raw `new Error()` — always use `ErrorFactory`
- No `console.log` — always use `createLogger()`
- JSDoc `@param` and `@returns` on every public method
- All new types as `@typedef` in `src/types/index.js`
- `Object.freeze()` on every exported constants object

Run the linter before opening a PR:

```bash
npm run lint
npm run lint:fix   # auto-fix where possible
```

---

## Tests

```bash
npm test               # run all tests once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

Requirements for every PR:
- All existing tests must pass
- New behaviour must have tests
- Tests must use real objects — no mocking of `BaseAlgorithm` or `BaseStore`
- Each test file should cover: happy path, blocked path, reset, invalid config

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add PostgresStore implementation
fix: correct MemoryStore expiry check on set()
docs: update algorithm comparison table in README
test: add edge cases for Composite ANY mode
refactor: extract TTL calculation into shared utility
chore: upgrade vitest to v2
```

---

## Pull Request Process

1. Branch from `main` — name it `feat/`, `fix/`, `docs/`, or `chore/` as appropriate
2. Keep PRs focused — one concern per PR
3. Ensure `npm test` and `npm run lint` both pass locally
4. Fill in the PR description: what problem, what changed, how to test
5. For new algorithms or stores, include a short usage example in the PR description
6. A maintainer will review within a reasonable time — address feedback and push to the same branch
7. PRs are squash-merged into `main`

---

## Contributors

| Name | GitHub | Role |
|------|--------|------|
| Abhinav710 | [Abhinav710](https://github.com/Abhinav710) | Maintainer |

To add yourself, open a PR that adds a row to this table alongside your contribution.

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/ratelimit-engine/discussions) or file an issue with the `question` label.
