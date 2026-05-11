import { createClient } from '@/lib/supabase/server'
import { Building2, Plus, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

export default async function EnterpriseConfigPage() {
  const supabase = await createClient()
  
  // Get active enterprise config
  const { data: activeConfig } = await supabase
    .from('enterprise_plan_config')
    .select('*')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  // Get config history
  const { data: configHistory } = await supabase
    .from('enterprise_plan_config')
    .select('*')
    .order('version', { ascending: false })
    .limit(10)

  // Count active enterprise licenses
  const { count: enterpriseLicenseCount } = await supabase
    .from('licenses')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'enterprise')
    .eq('status', 'active')

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLimitValue = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Configuration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage centralized configuration for all enterprise customers
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </button>
        </div>
      </div>

      {/* Impact Warning */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              High Impact Changes
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Changes to enterprise configuration affect{' '}
                <strong>{enterpriseLicenseCount || 0} active enterprise customers</strong>{' '}
                immediately. Always coordinate with account managers before making changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Configuration */}
      {activeConfig ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Active Configuration
                </h2>
                <p className="text-sm text-gray-500">
                  Version {activeConfig.version} • Effective from {formatDate(activeConfig.effective_from)}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Features */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Features ({activeConfig.features.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {activeConfig.features.map((feature: string) => (
                      <li key={feature} className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-gray-700">{feature.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Limits */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Limits
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="space-y-3">
                    {Object.entries(activeConfig.limits as Record<string, number>).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <dt className="text-sm text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className={`
                          text-sm font-semibold
                          ${value === -1 ? 'text-green-600' : 'text-gray-900'}
                        `}>
                          {formatLimitValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            {activeConfig.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-600">{activeConfig.notes}</p>
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Configuration
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View Affected Customers
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              No Active Configuration
            </h3>
            <p className="text-sm text-gray-500">
              Create the first enterprise configuration to get started.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Configuration
            </button>
          </div>
        </div>
      )}

      {/* Configuration History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configuration History
          </h2>
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {configHistory?.map((config, idx) => (
                <li key={config.id}>
                  <div className="relative pb-8">
                    {idx !== configHistory.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`
                          h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                          ${config.is_active ? 'bg-green-500' : 'bg-gray-400'}
                        `}>
                          {config.is_active ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : (
                            <Clock className="h-5 w-5 text-white" />
                          )}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            Version <span className="font-medium text-gray-900">{config.version}</span>
                            {config.is_active && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {config.features.length} features • {Object.keys(config.limits as Record<string, number>).length} limits
                          </p>
                          {config.notes && (
                            <p className="mt-1 text-sm text-gray-600">{config.notes}</p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time dateTime={config.effective_from}>
                            {formatDate(config.effective_from)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Impact Statistics
          </h2>
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Active Enterprise Licenses
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {enterpriseLicenseCount || 0}
              </dd>
            </div>
            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Configuration Versions
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {configHistory?.length || 0}
              </dd>
            </div>
            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Features Enabled
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {activeConfig?.features.length || 0}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              Enterprise Configuration Model
            </h3>
            <div className="mt-2 text-sm text-purple-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Centralized:</strong> One configuration serves ALL enterprise customers</li>
                <li><strong>Immediate Effect:</strong> Changes apply instantly to all enterprise licenses</li>
                <li><strong>Versioned:</strong> Complete history maintained for audit and rollback</li>
                <li><strong>Coordinated:</strong> Always coordinate with account managers before changes</li>
                <li>This is different from Pro tier where each customer has individual entitlements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

