import { describe, expect, it } from 'vitest'
import { buildRouteTree } from '../src/ir'

const files = [
  { absolutePath: '/app/page.tsx', relativePath: 'page.tsx', kind: 'page', segments: [] },
  { absolutePath: '/app/blog/[slug]/page.tsx', relativePath: 'blog/[slug]/page.tsx', kind: 'page', segments: ['blog', '[slug]'] },
  { absolutePath: '/app/(auth)/login/page.tsx', relativePath: '(auth)/login/page.tsx', kind: 'page', segments: ['(auth)', 'login'] }
] as const

describe('buildRouteTree', () => {
  it('maps dynamic and groups correctly', () => {
    const tree = buildRouteTree([...files])
    const blog = tree.children.find((n) => n.segment === 'blog')
    expect(blog?.path).toBe('/blog')
    const slug = blog?.children[0]
    expect(slug?.path).toBe('/blog/:slug')
    const group = tree.children.find((n) => n.segment === '(auth)')
    expect(group?.isGroup).toBe(true)
    expect(group?.children[0].path).toBe('/login')
  })
})
