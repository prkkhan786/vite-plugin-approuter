#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const name = process.argv[2]
if (!name) {
  console.error('Usage: create-approuter-app <project-name>')
  process.exit(1)
}

if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(name) || name.includes('/') || name.includes('\\') || name.includes('..')) {
  console.error('Invalid project name. Use letters, numbers, "-" or "_", without path separators.')
  process.exit(1)
}

const root = path.resolve(process.cwd(), name)
if (!root.startsWith(process.cwd() + path.sep)) {
  console.error('Project path must stay inside the current working directory.')
  process.exit(1)
}
if (existsSync(root)) {
  console.error(`Directory already exists: ${root}`)
  process.exit(1)
}

mkdirSync(path.join(root, 'src', 'app', 'blog', '[slug]'), { recursive: true })

writeFileSync(path.join(root, 'package.json'), JSON.stringify({
  name,
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build'
  },
  dependencies: {
    react: '^19.2.0',
    'react-dom': '^19.2.0',
    'react-router-dom': '^7.9.6'
  },
  devDependencies: {
    vite: '^7.2.4',
    '@vitejs/plugin-react': '^5.1.0',
    'vite-plugin-approuter': '^0.1.0'
  }
}, null, 2) + '\n')

writeFileSync(path.join(root, 'index.html'), `<!doctype html>\n<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`)

writeFileSync(path.join(root, 'vite.config.ts'), `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport approuter from 'vite-plugin-approuter'\n\nexport default defineConfig({\n  plugins: [react(), approuter()]\n})\n`)

writeFileSync(path.join(root, 'src', 'main.tsx'), `import ReactDOM from 'react-dom/client'\nimport { RouterProvider } from 'react-router-dom'\nimport { router } from './routes.gen'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <RouterProvider router={router} />\n)\n`)

writeFileSync(path.join(root, 'src', 'app', 'layout.tsx'), `import { Outlet } from 'react-router-dom'\n\nexport default function Layout() {\n  return <Outlet />\n}\n`)
writeFileSync(path.join(root, 'src', 'app', 'page.tsx'), `export default function HomePage() {\n  return <h1>Home</h1>\n}\n`)
writeFileSync(path.join(root, 'src', 'app', 'blog', 'page.tsx'), `export default function BlogPage() {\n  return <h1>Blog</h1>\n}\n`)
writeFileSync(path.join(root, 'src', 'app', 'blog', '[slug]', 'page.tsx'), `import { useParams } from 'react-router-dom'\n\nexport default function BlogSlugPage() {\n  const { slug } = useParams()\n  return <h1>{slug}</h1>\n}\n`)

console.log(`Created ${name}`)
console.log('Next steps:')
console.log(`  cd ${name}`)
console.log('  pnpm install')
console.log('  pnpm dev')
