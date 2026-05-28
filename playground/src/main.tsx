import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes.gen'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
