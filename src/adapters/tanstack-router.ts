import path from 'node:path'
import type { PluginOptions, RouteNode } from '../types'
import { withoutExtension } from '../utils'

function pascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function fileAliasBase(filePath: string): string {
  const noExt = filePath.replace(/\.[^.]+$/, '')
  const rawParts = noExt.split('/').filter(Boolean)
  const parts = rawParts.filter((part) => part !== 'app')
  const last = parts[parts.length - 1]
  const isLeafName = last === 'page' || last === 'layout' || last === 'loading' || last === 'error' || last === 'not-found'
  const stem = isLeafName ? parts.slice(0, -1) : parts
  return pascalCase(stem.join(' ')) || 'Root'
}

export function generateTanStackRouterConfig(root: RouteNode, options: PluginOptions = {}): string {
  const outFile = options.outFile ?? 'src/routes.gen.ts'
  const appDir = options.appDir ?? path.dirname(outFile)
  const imports = new Map<string, string>()
  const usedNames = new Set<string>()
  const declarations: string[] = []
  let routeCounter = 0

  function unique(name: string): string {
    let n = name
    let i = 2
    while (usedNames.has(n)) {
      n = `${name}${i}`
      i += 1
    }
    usedNames.add(n)
    return n
  }

  function importVar(filePath: string, suffix: string): string {
    const existing = imports.get(filePath)
    if (existing) return existing
    const alias = unique(`${fileAliasBase(filePath)}${suffix}`)
    imports.set(filePath, alias)
    return alias
  }

  function routePath(node: RouteNode): string {
    if (node.segment === '') return '/'
    if (node.isGroup || node.isParallel) return ''
    if (node.isCatchAll) return '*'
    if (node.isDynamic && node.paramName) return `$${node.paramName}`
    return node.segment
  }

  function middlewareField(node: RouteNode): string {
    if (!node.middleware) return ''
    const absoluteFile = path.resolve(appDir, node.middleware)
    const from = './' + withoutExtension(path.relative(path.dirname(outFile), absoluteFile)).replace(/\\/g, '/')
    return `, beforeLoad: async ({ params, location }) => { const mod = await import(${JSON.stringify(from)}); if (typeof mod.default === 'function') return mod.default({ params, location }) }`
  }

  function buildNode(node: RouteNode, parentVar: string): string {
    routeCounter += 1
    const routeVar = unique(`route${routeCounter}`)
    const pathPart = routePath(node)
    const componentField = node.page ? `, component: ${importVar(node.page, 'Page')}` : ''
    const middleware = middlewareField(node)
    declarations.push(`const ${routeVar} = createRoute({ getParentRoute: () => ${parentVar}, path: ${JSON.stringify(pathPart)}${componentField}${middleware} })`)

    const childVars = node.children.map((child) => buildNode(child, routeVar))
    if (node.notFound) {
      const nf = importVar(node.notFound, 'NotFound')
      routeCounter += 1
      const nfVar = unique(`route${routeCounter}`)
      declarations.push(`const ${nfVar} = createRoute({ getParentRoute: () => ${routeVar}, path: '*', component: ${nf} })`)
      childVars.push(nfVar)
    }

    declarations.push(`const ${routeVar}Tree = ${routeVar}.addChildren([${childVars.join(', ')}])`)
    return `${routeVar}Tree`
  }

  const importLines = () => [...imports.entries()].map(([file, alias]) => {
    const absoluteFile = path.resolve(appDir, file)
    const from = './' + withoutExtension(path.relative(path.dirname(outFile), absoluteFile)).replace(/\\/g, '/')
    return `const ${alias} = lazy(() => import(${JSON.stringify(from)}))`
  })

  const rootChildren: string[] = []
  if (root.page) {
    routeCounter += 1
    const rootIndex = unique(`route${routeCounter}`)
    const rootPage = importVar(root.page, 'Page')
    declarations.push(`const ${rootIndex} = createRoute({ getParentRoute: () => rootRoute, path: '/', component: ${rootPage} })`)
    rootChildren.push(rootIndex)
  }
  for (const child of root.children) rootChildren.push(buildNode(child, 'rootRoute'))
  if (root.notFound) {
    const nf = importVar(root.notFound, 'NotFound')
    routeCounter += 1
    const nfVar = unique(`route${routeCounter}`)
    declarations.push(`const ${nfVar} = createRoute({ getParentRoute: () => rootRoute, path: '*', component: ${nf} })`)
    rootChildren.push(nfVar)
  }

  return `import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { lazy } from 'react'

${importLines().join('\n')}

// middleware.ts runs on the client. Do not use it as a security boundary.
const rootRoute = createRootRoute()
${declarations.join('\n')}
const routeTree = rootRoute.addChildren([${rootChildren.join(', ')}])

export const router = createRouter({ routeTree })
`
}
