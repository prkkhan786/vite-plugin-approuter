import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRouteTree } from '../src/ir'
import { generateReactRouterConfig } from '../src/adapters/react-router'
import { writeRoutesFile } from '../src/codegen'

describe('codegen', () => {
  it('generates router and typed params', () => {
    const tree = buildRouteTree([
      { absolutePath: '/a/page.tsx', relativePath: 'page.tsx', kind: 'page', segments: [] },
      { absolutePath: '/a/blog/[slug]/page.tsx', relativePath: 'blog/[slug]/page.tsx', kind: 'page', segments: ['blog', '[slug]'] }
    ])
    const out = generateReactRouterConfig(tree, { outFile: '/tmp/routes.gen.ts' })
    expect(out).toContain('createBrowserRouter')
    expect(out).toContain('"/blog/:slug"')
    expect(out).toContain('useAppParams')
  })

  it('skips rewriting unchanged output', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'codegen-'))
    const file = path.join(dir, 'routes.gen.ts')
    await writeRoutesFile('export const x = 1\n', file)
    const first = await readFile(file, 'utf8')
    await writeRoutesFile('export const x = 1\n', file)
    const second = await readFile(file, 'utf8')
    expect(second).toBe(first)
  })
})
