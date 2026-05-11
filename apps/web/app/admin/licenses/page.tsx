import { createClient } from '@/lib/supabase/server'
import { Shield, Search, Edit2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default async function LicensesPage() {
  const supabase = await createClient()
  
  // Get licenses with team info
  const { data: licenses } = await supabase
    .from('licenses')
    .select(`
      *,
      team:teams (
        name,
        customer_type
      ),
      entitlements:license_entitlements (
        features,
        limits,
        is_custom,
        modification_reason
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get counts by tier
  const { data: tierCounts } = await supabase
    .from('licenses')
    .select('tier, status')

  const activeLicensesByTier = tierCounts?.reduce((acc, license) => {
    if (license.status === 'active') {
      acc[license.tier] = (acc[license.tier] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    }
    return colors[tier] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Search and manage customer licenses
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="max-w-xl">
            <label htmlFor="search" className="sr-only">
              Search licenses
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by email, license ID, or team name..."
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Press Enter to search
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {Object.entries(activeLicensesByTier || {}).map(([tier, count]) => (
          <div key={tier} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate capitalize">
                      Active {tier} Licenses
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Licenses Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Licenses
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team / Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entitlements
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses && licenses.length > 0 ? (
                  licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-500">
                          {license.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {license.team?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {license.team?.customer_type || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                          ${getTierColor(license.tier)}
                        `}>
                          {license.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                          ${getStatusColor(license.status)}
                        `}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(license.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(license.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {license.tier === 'pro' ? (
                          license.entitlements?.is_custom ? (
                            <span className="inline-flex items-center text-xs text-orange-600">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Custom
                            </span>
                          ) : license.entitlements ? (
                            <span className="inline-flex items-center text-xs text-green-600">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-gray-400">
                              <XCircle className="h-4 w-4 mr-1" />
                              None
                            </span>
                          )
                        ) : license.tier === 'enterprise' ? (
                          <span className="inline-flex items-center text-xs text-purple-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Centralized
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                      <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No licenses found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {licenses && licenses.length >= 50 && (
            <div className="mt-6">
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Entitlements
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Locked:</strong> Pro license with entitlements snapshot (protected from plan changes)</li>
                <li><strong>Custom:</strong> Manually modified entitlements by admin (special arrangements)</li>
                <li><strong>Centralized:</strong> Enterprise license using shared configuration</li>
                <li><strong>None:</strong> Pro license without entitlements (should be rare - check if trigger is working)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

