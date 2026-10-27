// late-graphs — reused workers whose large graphs arrive after their first file.
//
// A non-isolated suite where every worker's first test file is trivial and
// the files after it each import a large graph no other file shares. Whatever
// a worker learns from its first run request (a warm-module snapshot, for
// example) says nothing about the modules its later files need, so anything
// that is fetched or decided once per worker instead of once per file shows
// up here as one round trip per module.
//
//   - trivial: TRIVIAL files that sort first (the config sorts files by
//     name and fixes maxWorkers to TRIVIAL), one per worker
//   - heavy: HEAVY files, each importing its own chain of CHAIN modules;
//     a chain is discovered one import at a time, like a deep dependency
//   - a setup file with no work in it, so touching it reruns every file in
//     watch mode
import { createApp, tsModule } from '../../tools/generator/helpers.mjs'

const TRIVIAL = 4
const HEAVY = 24
const CHAIN = 250

const app = createApp(import.meta.url)

app.write('tests/setup.ts', `export {}
`)

for (let t = 0; t < TRIVIAL; t++) {
  app.write(`tests/a-trivial-${t}.test.ts`, `import { expect, it } from 'vitest'

it('is trivial', () => {
  expect(${t}).toBe(${t})
})
`)
}

for (let h = 0; h < HEAVY; h++) {
  for (let i = 0; i < CHAIN; i++) {
    const next = i + 1 < CHAIN
      ? `import { h${h}m${i + 1}Walk } from './m${i + 1}'\n`
      : ''
    const walk = `
export function h${h}m${i}Walk(): number {
  return 1${i + 1 < CHAIN ? ` + h${h}m${i + 1}Walk()` : ''}
}`
    app.write(`src/h${h}/m${i}.ts`, `${next}${tsModule(`h${h}m${i}`, i, walk)}`)
  }
  app.write(`tests/b-heavy-${String(h).padStart(2, '0')}.test.ts`, `import { expect, it } from 'vitest'
import { h${h}m0Walk } from '../src/h${h}/m0'

it('walks its own chain', () => {
  expect(h${h}m0Walk()).toBe(${CHAIN})
})
`)
}

app.report('late-graphs', `${TRIVIAL} trivial files first, ${HEAVY} heavy files with ${CHAIN}-module chains of their own`)
