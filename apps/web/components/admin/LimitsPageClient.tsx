'use client'

import { useRouter } from 'next/navigation'
import AddLimitModal from './AddLimitModal'

export default function LimitsPageClient() {
  const router = useRouter()

  const handleSuccess = () => {
    // Refresh the page data
    router.refresh()
  }

  return <AddLimitModal onSuccess={handleSuccess} />
}

