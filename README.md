# vite-plugin-approuter

Next.js App Router file conventions for React + Vite. No SSR required.

```
src/app/
├── page.tsx          → /
├── layout.tsx        → root layout
├── about/
│   └── page.tsx      → /about
└── blog/
    ├── layout.tsx    → shared layout for /blog/*
    ├── page.tsx      → /blog
    └── [slug]/
        └── page.tsx  → /blog/:slug
```

That's it. No config. Fully typed.

---

## Why

If you love Next.js routing but don't need SSR, your options today are:

- Use Next.js anyway (pays the SSR tax for a SPA)
- Wire up React Router or TanStack manually (goodbye file conventions)
- Use `vite-plugin-pages` (Vue-first, Pages Router style, no App Router support)
- Use `generouted` (unmaintained, Pages Router only)

This plugin fills the gap: **App Router conventions, plain React + Vite, zero framework overhead.**

---

## Install

```bash
pnpm add -D vite-plugin-approuter
# or
npm install -D vite-plugin-approuter
```

Peer dependencies: `vite >= 4`, `react >= 17`, `react-router-dom >= 6`

---

## Setup

**1. Add the plugin to `vite.config.ts`:**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import approuter from 'vite-plugin-approuter'

export default defineConfig({
  plugins: [
    react(),
    approuter()
  ]
})
```

**2. Create your first route:**

```tsx
// src/app/page.tsx
export default function Home() {
  return <h1>Home</h1>
}
```

**3. Use the generated router in `main.tsx`:**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes.gen'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
```

**4. Add `src/routes.gen.ts` to your `.gitignore`** (optional, but recommended):

```
src/routes.gen.ts
```

The file is auto-generated on every `vite dev` and `vite build`. Commit it if you want diffs, ignore it if you don't.

---

## File conventions

| File | What it does |
|---|---|
| `page.tsx` | The component rendered at that URL. A segment only becomes a route if it has a `page.tsx`. |
| `layout.tsx` | Wraps all routes at this segment and below. Must render `<Outlet />` from `react-router-dom`. |
| `loading.tsx` | React Suspense fallback for this segment. Shown while the page chunk is loading. |
| `error.tsx` | Error boundary for this segment. Access the error via `useRouteError()`. |

### Dynamic segments

```
app/blog/[slug]/page.tsx     → /blog/:slug
app/user/[id]/posts/page.tsx → /user/:id/posts
app/files/[...path]/page.tsx → /files/*  (catch-all)
```

### Route groups

Folders wrapped in `(parens)` group routes without affecting the URL:

```
app/
└── (auth)/
    ├── login/
    │   └── page.tsx    → /login   (not /(auth)/login)
    └── signup/
        └── page.tsx    → /signup
```

Useful for applying a shared layout to a subset of routes without nesting them in the URL.

---

## Layouts

A `layout.tsx` wraps every route under its segment. It must render an `<Outlet />` where children appear:

```tsx
// src/app/layout.tsx
import { Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div>
      <nav>...</nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

Layouts nest. A `blog/layout.tsx` renders inside `layout.tsx`, and `blog/[slug]/page.tsx` renders inside `blog/layout.tsx`.

---

## Typed params

The generated `routes.gen.ts` exports:

- `AppRouteParams`: route-to-params map
- `AppRoutePath`: union of all generated route keys
- `useAppParams(route)`: typed params for known routes, safe fallback for custom strings

Example:

```tsx
import { useAppParams } from './routes.gen'

export default function BlogPost() {
  const { slug } = useAppParams('/blog/:slug')
  //      ^ string — fully typed, no casting
  return <h1>{slug}</h1>
}
```

`useAppParams('/some/custom/path')` is also allowed and falls back to `Record<string, string | undefined>`.

---

## Loading states

Add a `loading.tsx` next to any `page.tsx` to show a fallback while the route chunk loads:

```tsx
// src/app/blog/loading.tsx
export default function BlogLoading() {
  return <div>Loading...</div>
}
```

This wraps the route in a `<Suspense>` boundary automatically. All page components are lazy-loaded by default.

---

## Error boundaries

Add an `error.tsx` to catch errors thrown by a route or its children:

```tsx
// src/app/blog/error.tsx
import { useRouteError } from 'react-router-dom'

export default function BlogError() {
  const error = useRouteError()
  return <div>Something went wrong: {String(error)}</div>
}
```

---

## Options

```ts
approuter({
  // Directory to scan for routes. Default: "src/app"
  appDir: 'src/app',

  // Where to write the generated file. Default: "src/routes.gen.ts"
  outFile: 'src/routes.gen.ts',

  // Router adapter. Default: "react-router"
  // Experimental TanStack adapter is available as a spike.
  adapter: 'react-router',
})
```

TanStack spike option:

```ts
approuter({
  adapter: 'tanstack-router'
})
```

This adapter is currently experimental and focused on proving IR portability.

---

## Migrating from Next.js (Pages Router)

| Next.js (`pages/`) | This plugin (`app/`) |
|---|---|
| `pages/index.tsx` | `app/page.tsx` |
| `pages/about.tsx` | `app/about/page.tsx` |
| `pages/blog/[slug].tsx` | `app/blog/[slug]/page.tsx` |
| `pages/_app.tsx` | `app/layout.tsx` |
| `pages/404.tsx` | `app/not-found.tsx` *(v2)* |

---

## Migrating from Next.js (App Router)

If you're already on App Router, the file conventions are intentionally identical. The main differences:

- No `'use client'` / `'use server'` directives needed (everything is client-side)
- No `async` server components — use `useEffect` + fetch or TanStack Query
- `loading.tsx` and `error.tsx` work the same way
- `generateStaticParams` and `generateMetadata` don't apply

---

## Parallel routes (`@slot`)

`@slot` folders are supported as pathless organizational segments.
They do not add URL parts, similar to route groups.

Example:

```
src/app/dashboard/@team/page.tsx  -> /dashboard
```

## Middleware (`middleware.ts`)

Add `middleware.ts` inside a segment to run pre-route checks.
This runs in the browser runtime and is not a server-side security boundary.

- React Router adapter emits a `loader` that dynamically imports and executes the middleware default export.
- TanStack adapter emits `beforeLoad` with the same dynamic import pattern.

Example:

```ts
// src/app/admin/middleware.ts
export default async function middleware({ params, request }: { params: Record<string, string>, request: Request }) {
  if (!request.headers.get('x-auth')) {
    throw new Response('Unauthorized', { status: 401 })
  }
}
```

## create-approuter-app CLI

Scaffold a new Vite + React + AppRouter project:

```bash
npx create-approuter-app my-app
```

## VSCode extension scaffold

A starter extension is included in `vscode-extension/`.
It contributes an Explorer view named `AppRouter Routes` and lists routes discovered from `src/app/**/page.tsx`.

## Roadmap

- [x] `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- [x] Dynamic segments `[param]` and catch-all `[...slug]`
- [x] Route groups `(group)`
- [x] Typed params via `useAppParams`
- [x] React Router v6/v7 adapter
- [x] `not-found.tsx` support
- [x] TanStack Router adapter (experimental)
- [x] Parallel route folders (`@slot`) baseline support
- [x] Route middleware (`middleware.ts`) baseline support
- [x] `create-approuter-app` scaffold CLI
- [x] VSCode extension scaffold

---

## FAQ

### Why not just use Next.js?

Use Next.js when you need SSR/SSG, server components, or its full platform features.  
Use this plugin when you want App Router conventions in a pure client-side React + Vite app.

### Does this support TanStack Router?

There is an experimental TanStack adapter spike (`adapter: 'tanstack-router'`) in Phase 3.  
React Router remains the primary production target in v1; TanStack support is being hardened toward v2.

---

## Contributing

Issues and PRs welcome. If you're adding a new adapter, the IR shape is in `src/types.ts` — adapters only consume `RouteNode`, they don't touch the scanner or IR builder.

---

## License

MIT
