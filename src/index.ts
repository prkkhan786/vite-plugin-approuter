import path from 'node:path'
import type { Plugin } from 'vite'
import type { PluginOptions } from './types'
import { scanAppDir } from './scanner'
import { buildRouteTree } from './ir'
import { generateReactRouterConfig } from './adapters/react-router'
import { generateTanStackRouterConfig } from './adapters/tanstack-router'
import { writeRoutesFile } from './codegen'

export default function approuter(options: PluginOptions = {}): Plugin {
  const appDir = options.appDir ?? 'src/app'
  const outFile = options.outFile ?? 'src/routes.gen.ts'
  let root = process.cwd()
  let generationInFlight = false
  let generationQueued = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  async function generate(projectRoot: string): Promise<void> {
    if (generationInFlight) {
      generationQueued = true
      return
    }
    generationInFlight = true
    try {
      const absoluteAppDir = path.resolve(projectRoot, appDir)
      const absoluteOutFile = path.resolve(projectRoot, outFile)
      let files: Awaited<ReturnType<typeof scanAppDir>> = []
      try {
        files = await scanAppDir(absoluteAppDir)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        if (!/ENOENT/.test(msg)) throw error
      }
      const tree = buildRouteTree(files)
      const resolvedOptions = {
        ...options,
        appDir: absoluteAppDir,
        outFile: absoluteOutFile
      }
      const content = options.adapter === 'tanstack-router'
        ? generateTanStackRouterConfig(tree, resolvedOptions)
        : generateReactRouterConfig(tree, resolvedOptions)
      await writeRoutesFile(content, absoluteOutFile)
    } finally {
      generationInFlight = false
      if (generationQueued) {
        generationQueued = false
        await generate(projectRoot)
      }
    }
  }

  return {
    name: 'vite-plugin-approuter',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
    },
    async buildStart() {
      await generate(root)
    },
    async handleHotUpdate({ file }) {
      const appRoot = path.resolve(root, appDir)
      const relative = path.relative(appRoot, file)
      const inAppDir = !relative.startsWith('..') && !path.isAbsolute(relative)
      const changedRouteFile = /(?:^|\/)(page|layout|loading|error|not-found)\.tsx$/.test(file) || /(?:^|\/)middleware\.ts$/.test(file)
      if (inAppDir && changedRouteFile) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          void generate(root)
        }, 25)
      }
    }
  }
}

export type { PluginOptions } from './types'
