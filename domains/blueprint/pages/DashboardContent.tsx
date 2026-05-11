'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';
import type { UserLicenseInfo } from '@/lib/user-license';
import { formatTierName, getTierBadgeClasses } from '@/lib/user-license';

interface DashboardContentProps {
  user: User;
  licenseInfo: UserLicenseInfo;
}

export default function DashboardContent({ user, licenseInfo }: DashboardContentProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-indigo-dye">Welcome to your Dashboard</h1>
              <p className="mt-2 text-indigo-dye/70">
                Signed in as: <span className="font-medium">{user.email}</span>
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="bg-gray-100 text-indigo-dye px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Account Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-indigo-dye mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-indigo-dye/70">Plan:</span>
                <span className={`font-medium px-3 py-1 rounded-full text-sm ${getTierBadgeClasses(licenseInfo.tier)}`}>
                  {formatTierName(licenseInfo.tier)} Tier
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-dye/70">Status:</span>
                <span className={`font-medium ${licenseInfo.status === 'active' ? 'text-green-600' : licenseInfo.status === 'expired' ? 'text-red-600' : 'text-gray-600'}`}>
                  {licenseInfo.status.charAt(0).toUpperCase() + licenseInfo.status.slice(1)}
                </span>
              </div>
              {licenseInfo.expires_at && (
                <div className="flex justify-between">
                  <span className="text-indigo-dye/70">Expires:</span>
                  <span className="font-medium text-indigo-dye">
                    {new Date(licenseInfo.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-indigo-dye/70">Member since:</span>
                <span className="font-medium text-indigo-dye">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-indigo-dye mb-4">Rev Cloud Blueprint</h2>
            <p className="text-indigo-dye/70 mb-4">
              Access your VS Code extension and manage your testing workflows.
            </p>
            <a
              href="vscode:extension/forceweaver.revcloud-blueprint"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-celestial-blue text-white px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352z"/>
              </svg>
              Open in VS Code
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-indigo-dye mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/"
              className="p-4 border border-gray-200 rounded-lg hover:border-celestial-blue hover:bg-celestial-blue/5 transition-colors group"
            >
              <div className="w-8 h-8 bg-celestial-blue/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-celestial-blue/20">
                <svg className="w-4 h-4 text-celestial-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="font-medium text-indigo-dye">Learn More</h3>
              <p className="text-sm text-indigo-dye/60 mt-1">Explore features and capabilities</p>
            </Link>

            <Link
              href="/rcb-pricing"
              className="p-4 border border-gray-200 rounded-lg hover:border-celestial-blue hover:bg-celestial-blue/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <svg className="w-4 h-4" style={{ color: '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <h3 className="font-medium text-indigo-dye">View Pricing</h3>
              <p className="text-sm text-indigo-dye/60 mt-1">Explore Pro and Enterprise plans</p>
            </Link>

            <button className="p-4 border border-gray-200 rounded-lg hover:border-celestial-blue hover:bg-celestial-blue/5 transition-colors group text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg className="w-4 h-4" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h3 className="font-medium text-indigo-dye">Account Settings</h3>
              <p className="text-sm text-indigo-dye/60 mt-1">Manage your profile and preferences</p>
            </button>

            <button className="p-4 border border-gray-200 rounded-lg hover:border-celestial-blue hover:bg-celestial-blue/5 transition-colors group text-left">
              <div className="w-8 h-8 bg-celestial-blue/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-celestial-blue/20">
                <svg className="w-4 h-4 text-celestial-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <h3 className="font-medium text-indigo-dye">Get Support</h3>
              <p className="text-sm text-indigo-dye/60 mt-1">Contact our support team</p>
            </button>
          </div>
        </div>

        {/* Plan-specific Notice */}
        {licenseInfo.tier === 'free' ? (
          <div className="mt-8 bg-celestial-blue/10 border border-celestial-blue/20 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-celestial-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-celestial-blue">Free Tier</h3>
                <p className="mt-1 text-celestial-blue/80">
                  You&apos;re currently on the Free tier. Upgrade to Pro for more snapshots and advanced features, or Enterprise for unlimited access.
                </p>
                <Link 
                  href="/rcb-pricing"
                  className="mt-3 inline-flex items-center text-celestial-blue font-medium hover:underline"
                >
                  View pricing plans
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ) : licenseInfo.tier === 'pro' ? (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-900">Pro Tier Active</h3>
                <p className="mt-1 text-blue-800">
                  You have access to all Pro features including 50 snapshots, group management, snapshot export/import, and priority support.
                </p>
                {licenseInfo.expires_at && (
                  <p className="mt-2 text-sm text-blue-700">
                    Your subscription {new Date(licenseInfo.expires_at) > new Date() ? 'renews' : 'expired'} on {new Date(licenseInfo.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-purple-900">Enterprise Tier Active</h3>
                <p className="mt-1 text-purple-800">
                  You have unlimited access to all features including unlimited snapshots, advanced group management, SSO, and dedicated support.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
