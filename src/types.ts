export interface RouteNode {
  segment: string
  path: string
  page?: string
  layout?: string
  loading?: string
  error?: string
  isDynamic: boolean
  isCatchAll: boolean
  isGroup: boolean
  paramName?: string
  children: RouteNode[]
}

export interface PluginOptions {
  appDir?: string
  outFile?: string
  adapter?: 'react-router'
  boundaries?: boolean
}
