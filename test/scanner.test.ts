import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanAppDir } from '../src/scanner'
import { normalizePath } from '../src/utils'

describe('scanAppDir', () => {
  it('discovers route special files recursively', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'scan-'))
    await mkdir(path.join(dir, 'blog', '[slug]'), { recursive: true })
    await writeFile(path.join(dir, 'blog', '[slug]', 'page.tsx'), 'export default null')

    const files = await scanAppDir(dir)
    expect(files.some((f) => f.relativePath === 'blog/[slug]/page.tsx')).toBe(true)
  })

  it('ignores unknown filenames', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'scan-'))
    await mkdir(path.join(dir, 'about'), { recursive: true })
    await writeFile(path.join(dir, 'about', 'route.tsx'), 'export default null')
    await writeFile(path.join(dir, 'about', 'component.tsx'), 'export default null')
    await writeFile(path.join(dir, 'about', 'page.tsx'), 'export default null')

    const files = await scanAppDir(dir)
    expect(files).toHaveLength(1)
    expect(files[0]?.relativePath).toBe('about/page.tsx')
  })

  it('handles nested dynamic segments', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'scan-'))
    await mkdir(path.join(dir, 'users', '[id]', 'posts', '[postId]'), { recursive: true })
    await writeFile(path.join(dir, 'users', '[id]', 'posts', '[postId]', 'page.tsx'), 'export default null')

    const files = await scanAppDir(dir)
    const target = files.find((f) => f.relativePath === 'users/[id]/posts/[postId]/page.tsx')
    expect(target?.segments).toEqual(['users', '[id]', 'posts', '[postId]'])
  })

  it('normalizes Windows-style slashes', () => {
    expect(normalizePath('blog\\[slug]\\page.tsx')).toBe('blog/[slug]/page.tsx')
  })
})
