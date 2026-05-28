import { Outlet } from 'react-router-dom'

export default function BlogLayout() {
  return (
    <section>
      <h2>Blog</h2>
      <Outlet />
    </section>
  )
}
