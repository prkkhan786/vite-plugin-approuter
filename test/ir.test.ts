import { describe, expect, it } from 'vitest'
import { buildRouteTree } from '../src/ir'

function sampleFiles() {
  return [
    { absolutePath: '/app/layout.tsx', relativePath: 'layout.tsx', kind: 'layout', segments: [] as string[] },
    { absolutePath: '/app/page.tsx', relativePath: 'page.tsx', kind: 'page', segments: [] as string[] },
    { absolutePath: '/app/blog/layout.tsx', relativePath: 'blog/layout.tsx', kind: 'layout', segments: ['blog'] },
    { absolutePath: '/app/blog/page.tsx', relativePath: 'blog/page.tsx', kind: 'page', segments: ['blog'] },
    { absolutePath: '/app/blog/[slug]/page.tsx', relativePath: 'blog/[slug]/page.tsx', kind: 'page', segments: ['blog', '[slug]'] },
    { absolutePath: '/app/shop/[...path]/page.tsx', relativePath: 'shop/[...path]/page.tsx', kind: 'page', segments: ['shop', '[...path]'] },
    { absolutePath: '/app/(auth)/layout.tsx', relativePath: '(auth)/layout.tsx', kind: 'layout', segments: ['(auth)'] },
    { absolutePath: '/app/(auth)/login/page.tsx', relativePath: '(auth)/login/page.tsx', kind: 'page', segments: ['(auth)', 'login'] }
  ] as const
}

describe('buildRouteTree', () => {
  it('builds correct path for nested route', () => {
    const tree = buildRouteTree([...sampleFiles()])
    const blog = tree.children.find((n) => n.segment === 'blog')
    const slug = blog?.children.find((n) => n.segment === '[slug]')
    expect(slug?.path).toBe('/blog/:slug')
  })

  it('[param] maps to :param in URL path', () => {
    const tree = buildRouteTree([...sampleFiles()])
    const blog = tree.children.find((n) => n.segment === 'blog')
    const slug = blog?.children.find((n) => n.segment === '[slug]')
    expect(slug?.isDynamic).toBe(true)
    expect(slug?.paramName).toBe('slug')
    expect(slug?.path).toContain(':slug')
  })

  it('[...slug] maps to * in URL path', () => {
    const tree = buildRouteTree([...sampleFiles()])
    const shop = tree.children.find((n) => n.segment === 'shop')
    const catchAll = shop?.children.find((n) => n.segment === '[...path]')
    expect(catchAll?.isCatchAll).toBe(true)
    expect(catchAll?.path).toBe('/shop/*')
  })

  it('(group) does not appear in URL path', () => {
    const tree = buildRouteTree([...sampleFiles()])
    const authGroup = tree.children.find((n) => n.segment === '(auth)')
    const login = authGroup?.children.find((n) => n.segment === 'login')
    expect(authGroup?.isGroup).toBe(true)
    expect(login?.path).toBe('/login')
  })

  it('layout in group is attached to group node for child inheritance', () => {
    const tree = buildRouteTree([...sampleFiles()])
    const authGroup = tree.children.find((n) => n.segment === '(auth)')
    expect(authGroup?.layout).toBe('(auth)/layout.tsx')
    expect(authGroup?.children.some((n) => n.segment === 'login')).toBe(true)
  })

  it('root layout wraps all routes via root node metadata', () => {
    const tree = buildRouteTree([...sampleFiles()])
    expect(tree.layout).toBe('layout.tsx')
    expect(tree.children.some((n) => n.segment === 'blog')).toBe(true)
    expect(tree.children.some((n) => n.segment === '(auth)')).toBe(true)
  })
})
