import { promises as fs } from 'node:fs'
import path from 'node:path'
import { normalizePath } from './utils'

export interface ScannedFile {
  absolutePath: string
  relativePath: string
  kind: 'page' | 'layout' | 'loading' | 'error' | 'unknown'
  segments: string[]
}

const SPECIAL_FILES = new Set(['page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx'])

function getKind(name: string): ScannedFile['kind'] {
  if (name === 'page.tsx') return 'page'
  if (name === 'layout.tsx') return 'layout'
  if (name === 'loading.tsx') return 'loading'
  if (name === 'error.tsx') return 'error'
  return 'unknown'
}

export async function scanAppDir(appDir: string): Promise<ScannedFile[]> {
  const out: ScannedFile[] = []

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('_')) continue
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }
      if (!entry.isFile() || !SPECIAL_FILES.has(entry.name)) continue

      const relativePath = normalizePath(path.relative(appDir, absolutePath))
      const parts = relativePath.split('/')
      out.push({
        absolutePath: normalizePath(absolutePath),
        relativePath,
        kind: getKind(entry.name),
        segments: parts.slice(0, -1)
      })
    }
  }

  await walk(appDir)
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}
