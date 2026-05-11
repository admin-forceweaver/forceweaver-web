import { createClient } from '@/lib/supabase/server'
import { FileText, Filter, Download } from 'lucide-react'

export default async function AuditLogPage() {
  const supabase = await createClient()
  
  // Get audit logs
  const { data: auditLogs } = await supabase
    .from('feature_change_audit')
    .select(`
      *,
      changed_by_user:changed_by (
        email
      )
    `)
    .order('changed_at', { ascending: false })
    .limit(100)

  // Get summary stats
  const { data: changeTypeCounts } = await supabase
    .from('feature_change_audit')
    .select('change_type')

  const changeTypeStats = changeTypeCounts?.reduce((acc, item) => {
    acc[item.change_type] = (acc[item.change_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      feature_toggle: 'bg-blue-100 text-blue-800',
      limit_change: 'bg-green-100 text-green-800',
      page_visibility: 'bg-yellow-100 text-yellow-800',
      license_override: 'bg-red-100 text-red-800',
      plan_update: 'bg-purple-100 text-purple-800',
      enterprise_config: 'bg-indigo-100 text-indigo-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete history of all admin changes
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(changeTypeStats || {}).map(([type, count]) => (
          <div key={type} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 truncate capitalize">
                      {type.replace(/_/g, ' ')}
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

      {/* Audit Log Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Changes
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Changed By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.changed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${getChangeTypeColor(log.change_type)}
                        `}>
                          {log.change_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.table_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.changed_by_user?.email || 'System'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.affected_licenses_count > 0 
                          ? `${log.affected_licenses_count} licenses`
                          : '—'
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No audit logs found</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Changes will appear here once admins start making modifications
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {auditLogs && auditLogs.length >= 100 && (
            <div className="mt-6">
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Compliance & Auditability
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Every admin change is logged with timestamp, user, and reason</li>
                <li>Logs are immutable - cannot be edited or deleted</li>
                <li>IP addresses are tracked for security audits</li>
                <li>Customer impact is recorded for every change</li>
                <li>Export to CSV for external compliance reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

