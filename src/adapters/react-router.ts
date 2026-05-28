import path from 'node:path'
import type { PluginOptions, RouteNode } from '../types'
import { withoutExtension } from '../utils'

interface AdapterContext {
  outFile: string
  boundaries: boolean
  appDir: string
}

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
  const normalized = stem.map((part) => {
    if (/^\(.+\)$/.test(part)) return part.slice(1, -1)
    if (/^\[\.\.\..+\]$/.test(part)) return part.slice(4, -1)
    if (/^\[.+\]$/.test(part)) return part.slice(1, -1)
    return part
  })
  return pascalCase(normalized.join(' ')) || 'Root'
}

export function generateReactRouterConfig(root: RouteNode, options: PluginOptions = {}): string {
  const outFile = options.outFile ?? 'src/routes.gen.ts'
  const appDir = options.appDir ?? path.dirname(outFile)
  const ctx: AdapterContext = { outFile, appDir, boundaries: options.boundaries ?? true }

  const imports = new Map<string, string>()
  const dynamicParamRoutes = new Set<string>()
  const usedNames = new Set<string>()

  function importVar(filePath: string, suffix: string): string {
    const existing = imports.get(filePath)
    if (existing) return existing
    const candidate = `${fileAliasBase(filePath)}${suffix}`
    let name = candidate || `Route${suffix}`
    let counter = 2
    while (usedNames.has(name)) {
      name = `${candidate}${counter}`
      counter += 1
    }
    usedNames.add(name)
    imports.set(filePath, name)
    return name
  }

  function hasDynamicPath(node: RouteNode): boolean {
    return /:\w+|\*/.test(node.path)
  }

  function leafElement(node: RouteNode): string | undefined {
    if (node.page) {
      const pageVar = importVar(node.page, 'Page')
      if (hasDynamicPath(node) && !node.isGroup) dynamicParamRoutes.add(node.path)
      return `React.createElement(${pageVar})`
    }
    if (node.layout) {
      const layoutVar = importVar(node.layout, 'Layout')
      return `React.createElement(${layoutVar}, null, React.createElement(Outlet))`
    }
    return undefined
  }

  function withBoundary(node: RouteNode, element: string | undefined): string | undefined {
    if (!element) return undefined
    if (!ctx.boundaries || !node.loading) return element
    const loadingVar = importVar(node.loading, 'Loading')
    return `React.createElement(Suspense, { fallback: React.createElement(${loadingVar}) }, ${element})`
  }

  function errorElement(node: RouteNode): string | undefined {
    if (!ctx.boundaries || !node.error) return undefined
    const errorVar = importVar(node.error, 'Error')
    return `React.createElement(${errorVar})`
  }

  function loaderField(node: RouteNode): string | undefined {
    if (!node.middleware) return undefined
    const absoluteFile = path.resolve(ctx.appDir, node.middleware)
    const from = './' + withoutExtension(path.relative(path.dirname(ctx.outFile), absoluteFile)).replace(/\\/g, '/')
    return `loader: async ({ request, params }) => { const mod = await import(${JSON.stringify(from)}); if (typeof mod.default === "function") return mod.default({ request, params }) }`
  }

  function routeNode(node: RouteNode): string {
    const fields: string[] = []
    if (!node.isGroup && !node.isParallel) {
      const pathPart = node.isCatchAll ? '*' : node.isDynamic && node.paramName ? `:${node.paramName}` : node.segment
      if (pathPart) fields.push(`path: ${JSON.stringify(pathPart)}`)
    }

    const el = withBoundary(node, leafElement(node))
    if (el) fields.push(`element: ${el}`)

    const err = errorElement(node)
    if (err) fields.push(`errorElement: ${err}`)
    const loader = loaderField(node)
    if (loader) fields.push(loader)

    const kids = node.children.map(routeNode)
    if (node.page && kids.length > 0) {
      const pageVar = importVar(node.page, 'Page')
      kids.unshift(`{ index: true, element: React.createElement(${pageVar}) }`)
      const layoutOnly = node.layout ? `React.createElement(${importVar(node.layout, 'Layout')}, null, React.createElement(Outlet))` : undefined
      if (layoutOnly) {
        fields.splice(fields.findIndex((f) => f.startsWith('element:')), 1, `element: ${withBoundary(node, layoutOnly)}`)
      }
    }
    if (kids.length > 0) fields.push(`children: [${kids.join(', ')}]`)
    if (node.notFound) {
      const notFoundVar = importVar(node.notFound, 'NotFound')
      const catchAllEntry = `{ path: "*", element: React.createElement(${notFoundVar}) }`
      if (kids.length > 0) {
        fields.splice(fields.findIndex((f) => f.startsWith('children: [')), 1, `children: [${kids.join(', ')}, ${catchAllEntry}]`)
      } else {
        fields.push(`children: [${catchAllEntry}]`)
      }
    }

    return `{ ${fields.join(', ')} }`
  }

  const rootFields: string[] = ['path: \"/\"']
  const rootElement = withBoundary(root, root.layout ? `React.createElement(${importVar(root.layout, 'Layout')}, null, React.createElement(Outlet))` : undefined)
  if (rootElement) rootFields.push(`element: ${rootElement}`)
  const rootError = errorElement(root)
  if (rootError) rootFields.push(`errorElement: ${rootError}`)
  const rootChildren = root.children.map(routeNode)
  if (root.page) {
    const rootPage = importVar(root.page, 'Page')
    rootChildren.unshift(`{ index: true, element: React.createElement(${rootPage}) }`)
  }
  if (root.notFound) {
    const rootNotFound = importVar(root.notFound, 'NotFound')
    rootChildren.push(`{ path: "*", element: React.createElement(${rootNotFound}) }`)
  }
  if (rootChildren.length > 0) rootFields.push(`children: [${rootChildren.join(', ')}]`)

  const importLines = [...imports.entries()].map(([file, alias]) => {
    const absoluteFile = path.resolve(appDir, file)
    const from = './' + withoutExtension(path.relative(path.dirname(outFile), absoluteFile)).replace(/\\/g, '/')
    return `const ${alias} = lazy(() => import(${JSON.stringify(from)}))`
  })

  const paramMapLines = [...dynamicParamRoutes].sort().map((routePath) => {
    const keys = [...routePath.matchAll(/:(\w+)/g)].map((m) => m[1])
    if (routePath.includes('*')) keys.push('*')
    const shape = keys.length === 0 ? '{}' : `{ ${keys.map((k) => `${JSON.stringify(k)}: string`).join('; ')} }`
    return `  ${JSON.stringify(routePath)}: ${shape}`
  })

  return `import * as React from 'react'
import { createBrowserRouter, Outlet, useParams } from 'react-router-dom'
import { Suspense, lazy } from 'react'

${importLines.join('\n')}

export const router = createBrowserRouter([
  { ${rootFields.join(', ')} }
])

// middleware.ts runs on the client in route loaders. Do not use it as a security boundary.
// error.tsx components should read errors with useRouteError() from react-router-dom.
export type AppRouteParams = {
${paramMapLines.join('\n')}
}

export type AppRoutePath = keyof AppRouteParams

type AnyParams = Record<string, string | undefined>
type ParamsFor<T extends string> = T extends AppRoutePath ? AppRouteParams[T] : AnyParams

export function useAppParams<T extends string>(
  _route: T
): ParamsFor<T> {
  return useParams() as ParamsFor<T>
}
`
}
