import { Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div>
      <h1>App Router Playground</h1>
      <Outlet />
    </div>
  )
}
