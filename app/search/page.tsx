import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading search...</div>}>
      <SearchClient />
    </Suspense>
  )
}
