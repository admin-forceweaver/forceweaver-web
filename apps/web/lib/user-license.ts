/**
 * User License Helper Functions
 * Fetch user's license information for dashboard display
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface UserLicenseInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'expired';
  expires_at?: string;
  team_name?: string;
  features?: string[];
  limits?: Record<string, number>;
}

/**
 * Get user's license information by user ID
 * Used for dashboard display
 */
export async function getUserLicenseInfo(userId: string): Promise<UserLicenseInfo> {
  try {
    // Step 1: Get user's team membership
    const { data: teamMember, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single() as { data: { team_id: string, role: string } | null, error: Error | null };

    if (teamError || !teamMember) {
      // No team found - return free tier
      return {
        tier: 'free',
        status: 'active',
      };
    }

    // Step 2: Get team details
    const { data: team, error: teamDetailsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, customer_type')
      .eq('id', teamMember.team_id)
      .single() as { data: { id: string, name: string, customer_type: string } | null, error: Error | null };

    if (teamDetailsError || !team) {
      return {
        tier: 'free',
        status: 'active',
      };
    }

    // Step 3: Get active licenses for team
    const { data: licenses, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('id, tier, status, expires_at, created_at')
      .eq('team_id', team.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }) as { data: { id: string, tier: 'free' | 'pro' | 'enterprise', status: string, expires_at: string | null, created_at: string }[] | null, error: Error | null };

    if (licenseError || !licenses || licenses.length === 0) {
      return {
        tier: 'free',
        status: 'active',
        team_name: team.name,
      };
    }

    // Find the first non-expired active license
    const activeLicense = licenses.find(
      (license) =>
        !license.expires_at || new Date(license.expires_at) > new Date()
    ) || licenses[0];

    // Check if license is expired
    const isExpired = activeLicense.expires_at && new Date(activeLicense.expires_at) < new Date();

    return {
      tier: activeLicense.tier,
      status: isExpired ? 'expired' : 'active',
      expires_at: activeLicense.expires_at || undefined,
      team_name: team.name,
    };

  } catch (error) {
    console.error('[getUserLicenseInfo] Error:', error);
    // Fallback to free tier on error
    return {
      tier: 'free',
      status: 'active',
    };
  }
}

/**
 * Format tier display name
 */
export function formatTierName(tier: 'free' | 'pro' | 'enterprise'): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'enterprise':
      return 'Enterprise';
    default:
      return 'Free';
  }
}

/**
 * Get tier badge color classes
 */
export function getTierBadgeClasses(tier: 'free' | 'pro' | 'enterprise'): string {
  switch (tier) {
    case 'free':
      return 'bg-gray-100 text-gray-800';
    case 'pro':
      return 'bg-blue-100 text-blue-800';
    case 'enterprise':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

