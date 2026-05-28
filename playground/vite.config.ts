import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import approuter from '../src/index'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  plugins: [react(), approuter({ adapter: 'react-router' })]
})
