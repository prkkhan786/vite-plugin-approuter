import { useParams } from 'react-router-dom'

export default function BlogSlugPage() {
  const { slug } = useParams()
  if (slug === 'boom') {
    throw new Error('Intentional blog route error')
  }
  return <p>Blog slug page: {slug}</p>
}
