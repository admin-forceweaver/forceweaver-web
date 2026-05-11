import { createAdminClient } from '@/lib/supabase/admin'
import { Edit2 } from 'lucide-react'
import LimitsPageClient from '@/components/admin/LimitsPageClient'

export default async function PlansPage() {
  // Use admin client that bypasses RLS for admin operations
  const supabase = createAdminClient()
  
  // Define types
  type PlanLimit = {
    id: string
    plan_tier: string
    limit_key: string
    value: number
    display_name: string
    description: string
    effective_from: string
    created_at: string
  }

  // Get all limits grouped by tier
  const { data: limitsData } = await supabase
    .from('plan_limits')
    .select('*')
    .order('plan_tier', { ascending: true })
    .order('limit_key', { ascending: true })

  const limits = (limitsData || []) as PlanLimit[]

  // Group by tier
  const limitsByTier = limits.reduce((acc, limit) => {
    if (!acc[limit.plan_tier]) {
      acc[limit.plan_tier] = []
    }
    acc[limit.plan_tier].push(limit)
    return acc
  }, {} as Record<string, PlanLimit[]>)

  const tiers = ['free', 'pro', 'enterprise']
  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    enterprise: 'bg-purple-100 text-purple-800',
  }

  const formatLimitValue = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plans & Limits</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure limits for each pricing tier
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <LimitsPageClient />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Tier Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limit
                  </th>
                  {tiers.map(tier => (
                    <th key={tier} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className={`px-2 py-1 rounded-full ${tierColors[tier]}`}>
                        {tier}
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Get unique limit keys */}
                {Array.from(new Set(limits?.map(l => l.limit_key))).map(limitKey => {
                  const limitName = limits?.find(l => l.limit_key === limitKey)?.display_name || limitKey
                  const limitDesc = limits?.find(l => l.limit_key === limitKey)?.description || ''
                  
                  return (
                    <tr key={limitKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {limitName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {limitDesc}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-1">
                            {limitKey}
                          </div>
                        </div>
                      </td>
                      {tiers.map(tier => {
                        const tierLimit = limits?.find(
                          l => l.limit_key === limitKey && l.plan_tier === tier
                        )
                        return (
                          <td key={tier} className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`
                              text-lg font-semibold
                              ${tierLimit?.value === -1 ? 'text-green-600' : 'text-gray-900'}
                            `}>
                              {tierLimit ? formatLimitValue(tierLimit.value) : '—'}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Tier Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {tiers.map(tier => (
          <div key={tier} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 capitalize mb-4">
                {tier} Tier
              </h3>
              <div className="space-y-3">
                {limitsByTier[tier] && Array.isArray(limitsByTier[tier]) && limitsByTier[tier].map((limit) => (
                  <div key={limit.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {limit.display_name}
                    </span>
                    <span className={`
                      text-sm font-semibold
                      ${limit.value === -1 ? 'text-green-600' : 'text-gray-900'}
                    `}>
                      {formatLimitValue(limit.value)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Limits
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Important: Customer Protection
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Pro Customers:</strong> Have entitlements locked at purchase time. Limit changes only affect NEW customers.</li>
                <li><strong>Enterprise Customers:</strong> Use centralized config. Limit changes affect ALL enterprise customers immediately.</li>
                <li><strong>Free Tier:</strong> Always uses current limits. Changes apply to all free users.</li>
                <li>Use -1 for unlimited values</li>
                <li>All changes are logged in the audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Effective Dating Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Effective Dating System
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Limits use <code className="bg-blue-100 px-1 rounded">effective_from</code> dates for grandfathering.
                When a Pro license is created, it captures limits that were effective at that time.
                This protects customers from retroactive limit reductions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

