import type { RouteNode } from './types'
import type { ScannedFile } from './scanner'
import { isCatchAllSegment, isDynamicSegment, isGroupSegment, isParallelSegment, toPathPart } from './utils'

function segmentMeta(segment: string) {
  const isGroup = isGroupSegment(segment)
  const isParallel = isParallelSegment(segment)
  const isCatchAll = isCatchAllSegment(segment)
  const isDynamic = isDynamicSegment(segment)
  const paramName = isCatchAll || isDynamic ? segment.slice(isCatchAll ? 4 : 1, -1) : undefined
  return { isGroup, isParallel, isCatchAll, isDynamic, paramName }
}

function absolutePathForSegments(segments: string[]): string {
  const pathParts = segments.map(toPathPart).filter(Boolean)
  if (pathParts.length === 0) return '/'
  return `/${pathParts.join('/')}`
}

export function buildRouteTree(files: ScannedFile[]): RouteNode {
  const dirMap = new Map<string, ScannedFile[]>()
  for (const file of files) {
    for (let i = 0; i <= file.segments.length; i += 1) {
      const key = file.segments.slice(0, i).join('/')
      if (!dirMap.has(key)) dirMap.set(key, [])
    }
    const key = file.segments.join('/')
    dirMap.get(key)?.push(file)
  }

  const root: RouteNode = {
    segment: '',
    path: '/',
    isDynamic: false,
    isCatchAll: false,
    isGroup: false,
    isParallel: false,
    children: []
  }

  const nodeMap = new Map<string, RouteNode>()
  nodeMap.set('', root)

  const sortedKeys = [...dirMap.keys()].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))

  for (const key of sortedKeys) {
    if (key === '') continue
    const segments = key.split('/')
    const parentKey = segments.slice(0, -1).join('/')
    const segment = segments[segments.length - 1]
    const meta = segmentMeta(segment)
    const node: RouteNode = {
      segment,
      path: absolutePathForSegments(segments),
      isDynamic: meta.isDynamic,
      isCatchAll: meta.isCatchAll,
      isGroup: meta.isGroup,
      isParallel: meta.isParallel,
      slotName: meta.isParallel ? segment.slice(1) : undefined,
      paramName: meta.paramName,
      children: []
    }
    nodeMap.set(key, node)
    const parent = nodeMap.get(parentKey) ?? root
    parent.children.push(node)
  }

  for (const [key, groupedFiles] of dirMap.entries()) {
    const node = nodeMap.get(key) ?? root
    for (const file of groupedFiles) {
      if (file.kind === 'page') node.page = file.relativePath
      if (file.kind === 'layout') node.layout = file.relativePath
      if (file.kind === 'loading') node.loading = file.relativePath
      if (file.kind === 'error') node.error = file.relativePath
      if (file.kind === 'not-found') node.notFound = file.relativePath
      if (file.kind === 'middleware') node.middleware = file.relativePath
    }
  }

  return root
}
