import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanAppDir } from '../src/scanner'

describe('scanAppDir', () => {
  it('discovers route special files recursively', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'scan-'))
    await mkdir(path.join(dir, 'blog', '[slug]'), { recursive: true })
    await writeFile(path.join(dir, 'blog', '[slug]', 'page.tsx'), 'export default null')

    const files = await scanAppDir(dir)
    expect(files.some((f) => f.relativePath === 'blog/[slug]/page.tsx')).toBe(true)
  })
})
