import path from 'node:path'
import type { Plugin } from 'vite'
import type { PluginOptions } from './types'
import { scanAppDir } from './scanner'
import { buildRouteTree } from './ir'
import { generateReactRouterConfig } from './adapters/react-router'
import { writeRoutesFile } from './codegen'

export default function approuter(options: PluginOptions = {}): Plugin {
  const appDir = options.appDir ?? 'src/app'
  const outFile = options.outFile ?? 'src/routes.gen.ts'
  let root = process.cwd()

  async function generate(projectRoot: string): Promise<void> {
    const absoluteAppDir = path.resolve(projectRoot, appDir)
    const absoluteOutFile = path.resolve(projectRoot, outFile)
    const files = await scanAppDir(absoluteAppDir)
    const tree = buildRouteTree(files)
    const content = generateReactRouterConfig(tree, {
      ...options,
      appDir: absoluteAppDir,
      outFile: absoluteOutFile
    })
    await writeRoutesFile(content, absoluteOutFile)
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
      const changedRouteFile = /(?:^|\/)(page|layout|loading|error)\.tsx$/.test(file)
      if (inAppDir && changedRouteFile) {
        await generate(root)
      }
    }
  }
}

export type { PluginOptions } from './types'
