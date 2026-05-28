import { useRouteError } from 'react-router-dom'

export default function BlogError() {
  const error = useRouteError()
  return <p>Blog route error: {String(error)}</p>
}
