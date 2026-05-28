export interface RouteNode {
  segment: string
  path: string
  page?: string
  layout?: string
  loading?: string
  error?: string
  notFound?: string
  middleware?: string
  isDynamic: boolean
  isCatchAll: boolean
  isGroup: boolean
  isParallel: boolean
  slotName?: string
  paramName?: string
  children: RouteNode[]
}

export interface PluginOptions {
  appDir?: string
  outFile?: string
  adapter?: 'react-router' | 'tanstack-router'
  boundaries?: boolean
}
