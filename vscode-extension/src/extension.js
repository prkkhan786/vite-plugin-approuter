const vscode = require('vscode')
const fs = require('node:fs/promises')
const fsSync = require('node:fs')
const path = require('node:path')

class RoutesProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event
    this.cache = []
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(item) {
    return item
  }

  async getChildren() {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!ws) return []
    const appDir = path.join(ws, 'src', 'app')
    if (!fsSync.existsSync(appDir)) return []

    const routes = []
    const walk = async (dir, segs = [], depth = 0) => {
      if (depth > 32) return
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isSymbolicLink()) continue
        if (entry.isDirectory()) {
          await walk(full, [...segs, entry.name], depth + 1)
          continue
        }
        if (entry.isFile() && entry.name === 'page.tsx') {
          const rel = segs
            .filter((s) => !/^\(.+\)$/.test(s) && !/^@.+$/.test(s))
            .map((s) => (/^\[(\.\.\.)?(.+)\]$/.test(s) ? s.replace(/^\[(\.\.\.)?(.+)\]$/, (_m, dots, n) => dots ? '*' : `:${n}`) : s))
          const route = '/' + rel.join('/')
          routes.push(route === '/' ? '/' : route)
        }
      }
    }

    await walk(appDir)
    this.cache = routes.sort()
    return this.cache.map((route) => new vscode.TreeItem(route || '/'))
  }
}

function activate(context) {
  const provider = new RoutesProvider()
  context.subscriptions.push(vscode.window.registerTreeDataProvider('approuter.routes', provider))

  let refreshTimer
  const watcher = vscode.workspace.createFileSystemWatcher('**/src/app/**/{page.tsx,layout.tsx,loading.tsx,error.tsx,not-found.tsx,middleware.ts}')
  const queueRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => provider.refresh(), 100)
  }
  watcher.onDidCreate(queueRefresh)
  watcher.onDidChange(queueRefresh)
  watcher.onDidDelete(queueRefresh)
  context.subscriptions.push(watcher)
}

function deactivate() {}

module.exports = { activate, deactivate }
