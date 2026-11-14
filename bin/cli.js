#!/usr/bin/env node
/**
 * ratelimit-engine CLI
 * Interactive wizard to simulate any built-in algorithm.
 * Usage: npx ratelimit-engine simulate
 */

import * as readline from 'readline'
import { FixedWindow }   from '../src/algorithms/FixedWindow.js'
import { SlidingWindow } from '../src/algorithms/SlidingWindow.js'
import { TokenBucket }   from '../src/algorithms/TokenBucket.js'
import { LeakyBucket }   from '../src/algorithms/LeakyBucket.js'
import { Composite }     from '../src/algorithms/Composite.js'
import { MemoryStore }   from '../src/stores/MemoryStore.js'
import { COMPOSITE_MODES } from '../src/constants/algorithms.js'

// ── ANSI colours ─────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgDark:  '\x1b[48;5;235m',
}

const bold    = (s) => `${C.bold}${s}${C.reset}`
const dim     = (s) => `${C.dim}${s}${C.reset}`
const green   = (s) => `${C.green}${s}${C.reset}`
const red     = (s) => `${C.red}${s}${C.reset}`
const cyan    = (s) => `${C.cyan}${s}${C.reset}`
const yellow  = (s) => `${C.yellow}${s}${C.reset}`
const magenta = (s) => `${C.magenta}${s}${C.reset}`

// ── Readline helper ───────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

function askNumber(question, defaultVal) {
  return new Promise(async (resolve) => {
    const raw = await ask(`${question} ${dim(`[${defaultVal}]`)}: `)
    const num = parseInt(raw, 10)
    resolve(isNaN(num) || num <= 0 ? defaultVal : num)
  })
}

// ── Algorithm menu ────────────────────────────────────────────────
const ALGORITHMS = [
  {
    key:   'token-bucket',
    label: 'Token Bucket',
    desc:  'Burst-friendly — refills tokens over time',
    color: cyan,
  },
  {
    key:   'fixed-window',
    label: 'Fixed Window',
    desc:  'Simple counter per time window',
    color: green,
  },
  {
    key:   'sliding-window',
    label: 'Sliding Window',
    desc:  'Smooth rolling window, no boundary spikes',
    color: yellow,
  },
  {
    key:   'leaky-bucket',
    label: 'Leaky Bucket',
    desc:  'Strict output rate, drops excess',
    color: magenta,
  },
  {
    key:   'composite',
    label: 'Composite',
    desc:  'Combine two algorithms (ALL / ANY)',
    color: (s) => `\x1b[35m${s}${C.reset}`,
  },
]

// ── Build algorithm from user input ──────────────────────────────
async function buildAlgorithm(key) {
  switch (key) {
    case 'token-bucket': {
      const capacity   = await askNumber('  Bucket capacity (max tokens)', 10)
      const refillRate = await askNumber('  Refill rate (tokens/sec)', 2)
      return new TokenBucket({ capacity, refillRate })
    }
    case 'fixed-window': {
      const limit    = await askNumber('  Max requests', 10)
      const windowMs = (await askNumber('  Window (seconds)', 60)) * 1000
      return new FixedWindow({ limit, windowMs })
    }
    case 'sliding-window': {
      const limit    = await askNumber('  Max requests', 10)
      const windowMs = (await askNumber('  Window (seconds)', 60)) * 1000
      return new SlidingWindow({ limit, windowMs })
    }
    case 'leaky-bucket': {
      const capacity = await askNumber('  Bucket capacity (queue depth)', 10)
      const leakRate = await askNumber('  Leak rate (requests/sec)', 2)
      return new LeakyBucket({ capacity, leakRate })
    }
    case 'composite': {
      console.log(`\n  ${bold('Primary algorithm:')}`)
      const primaryKey  = await pickAlgorithm(ALGORITHMS.filter((a) => a.key !== 'composite'))
      const primary     = await buildAlgorithm(primaryKey)

      console.log(`\n  ${bold('Secondary algorithm:')}`)
      const secondaryKey = await pickAlgorithm(ALGORITHMS.filter((a) => a.key !== 'composite'))
      const secondary    = await buildAlgorithm(secondaryKey)

      const modeRaw = await ask(`\n  Mode — ${cyan('1')} ALL (both must pass) / ${yellow('2')} ANY (one must pass) [1]: `)
      const mode    = modeRaw === '2' ? COMPOSITE_MODES.ANY : COMPOSITE_MODES.ALL

      return new Composite({ algorithms: [primary, secondary], mode })
    }
    default:
      return new FixedWindow()
  }
}

async function pickAlgorithm(list = ALGORITHMS) {
  list.forEach((a, i) => {
    console.log(`  ${bold(cyan(String(i + 1)))}. ${bold(a.label.padEnd(18))} ${dim(a.desc)}`)
  })

  const raw = await ask(`\n  Pick [1-${list.length}]: `)
  const idx = parseInt(raw, 10) - 1

  if (isNaN(idx) || idx < 0 || idx >= list.length) {
    console.log(dim('  Invalid choice — defaulting to Token Bucket'))
    return 'token-bucket'
  }

  return list[idx].key
}

// ── Table renderer ────────────────────────────────────────────────
function renderTable(rows) {
  const cols = [
    { key: 'req',        label: 'Req',        width: 5  },
    { key: 'time',       label: 'Time (ms)',  width: 10 },
    { key: 'allowed',    label: 'Allowed',    width: 10 },
    { key: 'remaining',  label: 'Remaining',  width: 11 },
    { key: 'retryAfter', label: 'Retry (s)',  width: 10 },
    { key: 'resetAt',    label: 'Resets At',  width: 12 },
  ]

  const divider = '+' + cols.map((c) => '-'.repeat(c.width + 2)).join('+') + '+'
  const header  = '|' + cols.map((c) => ` ${bold(c.label.padEnd(c.width))} `).join('|') + '|'

  console.log('\n' + divider)
  console.log(header)
  console.log(divider)

  for (const row of rows) {
    const allowed = row.allowed
      ? green('✅ yes'.padEnd(10))
      : red('❌ no'.padEnd(10))

    const line = '|' + [
      ` ${String(row.req).padEnd(cols[0].width)} `,
      ` ${String(row.time).padEnd(cols[1].width)} `,
      ` ${allowed} `,
      ` ${String(row.remaining).padEnd(cols[3].width)} `,
      ` ${String(row.retryAfter ?? '—').padEnd(cols[4].width)} `,
      ` ${String(row.resetAt).padEnd(cols[5].width)} `,
    ].join('|') + '|'

    console.log(line)
  }

  console.log(divider)
}

// ── Summary ───────────────────────────────────────────────────────
function renderSummary(rows) {
  const allowed   = rows.filter((r) => r.allowed).length
  const blocked   = rows.filter((r) => !r.allowed).length
  const avgRemain = (rows.reduce((s, r) => s + r.remaining, 0) / rows.length).toFixed(1)

  console.log(`
  ${bold('Summary')}
  ───────────────────────────────
  Total requests : ${bold(String(rows.length))}
  Allowed        : ${green(bold(String(allowed)))}
  Blocked        : ${red(bold(String(blocked)))}
  Avg remaining  : ${cyan(avgRemain)}
  `)
}

// ── Sleep helper ──────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.clear()
  console.log(`
  ${bold(cyan('⚡ ratelimit-engine'))} ${dim('— Algorithm Simulator')}
  ${dim('─────────────────────────────────────────')}
  `)

  console.log(`  ${bold('Select algorithm:')}\n`)
  const algoKey  = await pickAlgorithm()
  const algo     = await buildAlgorithm(algoKey)
  const requests = await askNumber('\nSimulate how many requests?', 15)
  const delayMs  = await askNumber('Delay between requests (ms)?', 100)

  console.log(`\n  ${dim('Running simulation...')}\n`)

  const store = new MemoryStore()
  const rows  = []
  const key   = 'cli:simulate'
  const start = Date.now()

  for (let i = 1; i <= requests; i++) {
    const result = await algo.check(key, store)
    const elapsed = Date.now() - start

    rows.push({
      req:        i,
      time:       elapsed,
      allowed:    result.allowed,
      remaining:  result.remaining,
      retryAfter: result.retryAfter !== undefined ? result.retryAfter : '—',
      resetAt:    result.resetAt.toTimeString().slice(0, 8),
    })

    if (i < requests) {
      await sleep(delayMs)
    }
  }

  await store.destroy()
  renderTable(rows)
  renderSummary(rows)

  const again = await ask('  Run another simulation? (y/n) [n]: ')
  if (again.toLowerCase() === 'y') {
    await main()
  } else {
    console.log(`\n  ${dim('Goodbye.')}\n`)
    rl.close()
  }
}

main().catch((err) => {
  console.error(red(`\nError: ${err.message}`))
  rl.close()
  process.exit(1)
})
