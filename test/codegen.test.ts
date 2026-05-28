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
    expect(out).toContain('export type AppRoutePath = keyof AppRouteParams')
    expect(out).toContain('type ParamsFor<T extends string>')
    expect(out).toContain('BlogSlugPage')
  })

  it('wires loading and error boundaries when files exist', () => {
    const tree = buildRouteTree([
      { absolutePath: '/a/layout.tsx', relativePath: 'layout.tsx', kind: 'layout', segments: [] },
      { absolutePath: '/a/page.tsx', relativePath: 'page.tsx', kind: 'page', segments: [] },
      { absolutePath: '/a/blog/layout.tsx', relativePath: 'blog/layout.tsx', kind: 'layout', segments: ['blog'] },
      { absolutePath: '/a/blog/loading.tsx', relativePath: 'blog/loading.tsx', kind: 'loading', segments: ['blog'] },
      { absolutePath: '/a/blog/error.tsx', relativePath: 'blog/error.tsx', kind: 'error', segments: ['blog'] },
      { absolutePath: '/a/blog/page.tsx', relativePath: 'blog/page.tsx', kind: 'page', segments: ['blog'] }
    ])
    const out = generateReactRouterConfig(tree, { outFile: '/tmp/routes.gen.ts' })
    expect(out).toContain('React.createElement(Suspense')
    expect(out).toContain('errorElement: React.createElement(BlogError)')
    expect(out).toContain('useRouteError()')
  })

  it('lazy-loads all discovered route modules', () => {
    const tree = buildRouteTree([
      { absolutePath: '/a/layout.tsx', relativePath: 'layout.tsx', kind: 'layout', segments: [] },
      { absolutePath: '/a/page.tsx', relativePath: 'page.tsx', kind: 'page', segments: [] },
      { absolutePath: '/a/about/page.tsx', relativePath: 'about/page.tsx', kind: 'page', segments: ['about'] }
    ])
    const out = generateReactRouterConfig(tree, { outFile: '/tmp/routes.gen.ts' })
    expect(out).toContain('const RootLayout = lazy(() => import(')
    expect(out).toContain('const RootPage = lazy(() => import(')
    expect(out).toContain('const AboutPage = lazy(() => import(')
  })

  it('keeps nested layout routes wrapping Outlet correctly', () => {
    const tree = buildRouteTree([
      { absolutePath: '/a/layout.tsx', relativePath: 'layout.tsx', kind: 'layout', segments: [] },
      { absolutePath: '/a/blog/layout.tsx', relativePath: 'blog/layout.tsx', kind: 'layout', segments: ['blog'] },
      { absolutePath: '/a/blog/page.tsx', relativePath: 'blog/page.tsx', kind: 'page', segments: ['blog'] },
      { absolutePath: '/a/blog/[slug]/page.tsx', relativePath: 'blog/[slug]/page.tsx', kind: 'page', segments: ['blog', '[slug]'] }
    ])
    const out = generateReactRouterConfig(tree, { outFile: '/tmp/routes.gen.ts' })
    expect(out).toContain('path: "blog", element: React.createElement(BlogLayout, null, React.createElement(Outlet))')
    expect(out).toContain('children: [{ index: true, element: React.createElement(BlogPage) }, { path: ":slug", element: React.createElement(BlogSlugPage) }]')
  })

  it('includes params for multi-segment dynamic and catch-all routes', () => {
    const tree = buildRouteTree([
      { absolutePath: '/a/shop/[...path]/page.tsx', relativePath: 'shop/[...path]/page.tsx', kind: 'page', segments: ['shop', '[...path]'] },
      { absolutePath: '/a/users/[id]/posts/[postId]/page.tsx', relativePath: 'users/[id]/posts/[postId]/page.tsx', kind: 'page', segments: ['users', '[id]', 'posts', '[postId]'] }
    ])
    const out = generateReactRouterConfig(tree, { outFile: '/tmp/routes.gen.ts' })
    expect(out).toContain('"/shop/*": { "*": string }')
    expect(out).toContain('"/users/:id/posts/:postId": { "id": string; "postId": string }')
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
