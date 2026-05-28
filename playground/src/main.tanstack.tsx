import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './routes.tanstack.gen'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
