'use client'

import { useRouter } from 'next/navigation'
import AddFeatureModal from './AddFeatureModal'

export default function FeaturesPageClient() {
  const router = useRouter()

  const handleSuccess = () => {
    // Refresh the page data
    router.refresh()
  }

  return <AddFeatureModal onSuccess={handleSuccess} />
}

