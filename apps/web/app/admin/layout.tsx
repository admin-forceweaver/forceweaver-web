import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

export const metadata = {
  title: 'Admin Console - RevCloud Blueprint',
  description: 'Manage features, plans, and licenses',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login?redirectTo=/admin')
  }
  
  // Verify admin access from app_metadata
  const userRole = user.app_metadata?.role || user.user_metadata?.role
  
  if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
    redirect('/dashboard')
  }
  
  const role = userRole as 'admin' | 'super_admin'
  const userEmail = user.email || 'Unknown'
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav 
        userRole={role} 
        userEmail={userEmail}
      />
      
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            RevCloud Blueprint Admin Console - All changes are logged and audited
          </p>
        </div>
      </footer>
    </div>
  )
}

