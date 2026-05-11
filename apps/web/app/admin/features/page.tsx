import { createAdminClient } from '@/lib/supabase/admin'
import { Package, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import FeaturesPageClient from '@/components/admin/FeaturesPageClient'

export default async function FeaturesPage() {
  // Use admin client that bypasses RLS for admin operations
  const supabase = createAdminClient()
  
  // Define types
  type Feature = {
    key: string
    name: string
    description: string
    category: string
    is_active: boolean
    created_at: string
  }

  type PlanFeature = {
    id: string
    plan_tier: string
    feature_key: string
    enabled: boolean
    effective_from: string
    created_at: string
  }

  // Get all features
  const { data: featuresData, error: featuresError } = await supabase
    .from('features')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const features = (featuresData || []) as Feature[]

  if (featuresError) {
    console.error('[Admin Features] Error fetching features:', featuresError)
  }

  // Get plan features mapping
  const { data: planFeaturesData, error: planFeaturesError } = await supabase
    .from('plan_features')
    .select('*')
    .eq('enabled', true)

  const planFeatures = (planFeaturesData || []) as PlanFeature[]

  if (planFeaturesError) {
    console.error('[Admin Features] Error fetching plan features:', planFeaturesError)
  }

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(feature)
    return acc
  }, {} as Record<string, Feature[]>)

  // Helper to check if feature is in a tier
  const isFeatureInTier = (featureKey: string, tier: string) => {
    return planFeatures.some(
      pf => pf.feature_key === featureKey && pf.plan_tier === tier
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Features Catalog</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all available features across tiers
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <FeaturesPageClient />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Features
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {features?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Features
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {features?.filter(f => f.is_active).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Inactive Features
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {features?.filter(f => !f.is_active).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features by Category */}
      {featuresByCategory && Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
        if (!Array.isArray(categoryFeatures)) return null
        return (
        <div key={category} className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 capitalize">
              {category} Features
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Free
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pro
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enterprise
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryFeatures.map((feature) => (
                    <tr key={feature.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-0">
                            <div className="text-sm font-medium text-gray-900">
                              {feature.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {feature.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-500">
                          {feature.key}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${feature.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                          }
                        `}>
                          {feature.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isFeatureInTier(feature.key, 'free') ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isFeatureInTier(feature.key, 'pro') ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isFeatureInTier(feature.key, 'enterprise') ? (
                          <CheckCircle2 className="h-5 w-5 text-purple-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )})}

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
              About Features Management
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Features are the building blocks of your pricing tiers</li>
                <li>Each feature can be assigned to Free, Pro, or Enterprise tiers</li>
                <li>Pro customers&apos; entitlements are protected when you modify tier features</li>
                <li>Enterprise features are centralized - changes affect all enterprise customers</li>
                <li>Use the feature key in extension code: <code className="bg-blue-100 px-1 rounded">hasFeature(state, &apos;feature_key&apos;)</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

