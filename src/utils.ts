import path from 'node:path'

export function normalizePath(input: string): string {
  return input.replace(/\\/g, '/')
}

export function isGroupSegment(segment: string): boolean {
  return /^\(.+\)$/.test(segment)
}

export function isParallelSegment(segment: string): boolean {
  return /^@.+$/.test(segment)
}

export function isDynamicSegment(segment: string): boolean {
  return /^\[(?!\.\.\.).+\]$/.test(segment)
}

export function isCatchAllSegment(segment: string): boolean {
  return /^\[\.\.\..+\]$/.test(segment)
}

export function toPathPart(segment: string): string {
  if (isGroupSegment(segment) || isParallelSegment(segment)) return ''
  if (isCatchAllSegment(segment)) return '*'
  if (isDynamicSegment(segment)) return `:${segment.slice(1, -1)}`
  return segment
}

export function withoutExtension(filePath: string): string {
  const ext = path.extname(filePath)
  return filePath.slice(0, filePath.length - ext.length)
}
