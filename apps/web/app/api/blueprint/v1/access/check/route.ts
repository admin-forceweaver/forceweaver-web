/**
 * Unified Access Control API
 * 
 * Validates if a user can perform an action based on:
 * 1. Action requirements from feature_actions table
 * 2. User's entitlements (PRIORITY for Pro users)
 * 3. Current usage vs limits
 * 4. Feature availability
 * 
 * This is the single source of truth for all access decisions.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Type definitions for database queries
interface LicenseEntitlements {
    features: string[];
    limits: Record<string, number>;
}

interface EnterpriseConfig {
    features: string[];
    limits: Record<string, number>;
}

interface PlanFeature {
    feature_key: string;
}

interface PlanLimit {
    limit_key: string;
    value: number;
}

interface FeatureAction {
    id: string;
    action_key: string;
    name: string;
    description: string | null;
    required_feature_key: string | null;
    limit_key: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface LicenseUsage {
    license_id?: string;
    snapshot_count?: number;
    group_count?: number;
    test_runs_count?: number;
    test_runs_month?: string;
    last_synced?: string;
}

export async function POST(req: Request) {
    try {
        const { device_token, action } = await req.json();
        
        if (!device_token || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: device_token and action are required' },
                { status: 400 }
            );
        }
        
        // Use admin client to read from feature_actions (bypasses RLS)
        const adminClient = createAdminClient();
        
        // 1. Get action requirements from database
        const { data: actionDef, error: actionError } = await adminClient
            .from('feature_actions')
            .select('*')
            .eq('action_key', action)
            .eq('is_active', true)
            .single() as { data: FeatureAction | null; error: unknown };
        
        if (actionError || !actionDef) {
            console.error('[Access Check] Unknown action:', action, actionError);
            return NextResponse.json(
                { error: `Unknown or inactive action: ${action}` },
                { status: 400 }
            );
        }
        
        // 2. Get device and license using regular server client
        const supabase = await createClient();
        const { data: device, error: deviceError } = await supabase
            .from('devices')
            .select(`
                id,
                license:licenses (
                    id,
                    tier,
                    status,
                    expires_at,
                    created_at,
                    team_id
                )
            `)
            .eq('device_token', device_token)
            .single();
        
        if (deviceError || !device || !device.license) {
            console.error('[Access Check] Invalid device token:', deviceError);
            return NextResponse.json({
                allowed: false,
                reason: 'Invalid device token or license not found',
                actionRequirements: actionDef
            }, { status: 403 });
        }
        
        const license = Array.isArray(device.license) ? device.license[0] : device.license;
        
        // 3. Check license validity
        if (license.status !== 'active') {
            return NextResponse.json({
                allowed: false,
                reason: 'License is not active',
                actionRequirements: actionDef
            }, { status: 403 });
        }
        
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            return NextResponse.json({
                allowed: false,
                reason: 'License has expired',
                actionRequirements: actionDef
            }, { status: 403 });
        }
        
        // 4. Get entitlements (PRIORITY for Pro users)
        let userFeatures: string[] = [];
        let userLimits: Record<string, number> = {};
        
        if (license.tier === 'pro') {
            // Pro tier: Check entitlements FIRST
            const { data: entitlements } = await adminClient
                .from('license_entitlements')
                .select('features, limits')
                .eq('license_id', license.id)
                .single() as { data: LicenseEntitlements | null };
            
            if (entitlements) {
                // Entitlements exist - use them (grandfathered features)
                userFeatures = entitlements.features || [];
                userLimits = entitlements.limits || {};
                console.log('[Access Check] Using entitlements for Pro license:', license.id);
            } else {
                // Fallback: No entitlements found (shouldn't happen with trigger, but handle gracefully)
                console.warn('[Access Check] No entitlements found for Pro license:', license.id, '- using current plan');
                const { data: planFeatures } = await adminClient
                    .from('plan_features')
                    .select('feature_key')
                    .eq('plan_tier', 'pro')
                    .eq('enabled', true)
                    .lte('effective_from', new Date().toISOString()) as { data: PlanFeature[] | null };
                
                userFeatures = planFeatures?.map(f => f.feature_key) || [];
                
                const { data: planLimits } = await adminClient
                    .from('plan_limits')
                    .select('limit_key, value')
                    .eq('plan_tier', 'pro')
                    .lte('effective_from', new Date().toISOString()) as { data: PlanLimit[] | null };
                
                userLimits = planLimits?.reduce((acc, l) => {
                    acc[l.limit_key] = l.value;
                    return acc;
                }, {} as Record<string, number>) || {};
            }
        } else if (license.tier === 'enterprise') {
            // Enterprise tier: Use centralized config
            const { data: enterpriseConfig } = await adminClient
                .from('enterprise_plan_config')
                .select('features, limits')
                .eq('is_active', true)
                .order('version', { ascending: false })
                .limit(1)
                .single() as { data: EnterpriseConfig | null };
            
            if (enterpriseConfig) {
                userFeatures = enterpriseConfig.features || [];
                userLimits = enterpriseConfig.limits || {};
                console.log('[Access Check] Using enterprise config for license:', license.id);
            } else {
                console.warn('[Access Check] No enterprise config found, using unlimited defaults');
                userFeatures = ['*']; // Wildcard for all features
                userLimits = { snapshot_limit: -1, group_limit: -1, test_runs_limit: -1 };
            }
        } else {
            // Free tier: Use current plan configuration
            const { data: planFeatures } = await adminClient
                .from('plan_features')
                .select('feature_key')
                .eq('plan_tier', 'free')
                .eq('enabled', true)
                .lte('effective_from', new Date().toISOString()) as { data: PlanFeature[] | null };
            
            userFeatures = planFeatures?.map(f => f.feature_key) || [];
            
            const { data: planLimits } = await adminClient
                .from('plan_limits')
                .select('limit_key, value')
                .eq('plan_tier', 'free')
                .lte('effective_from', new Date().toISOString()) as { data: PlanLimit[] | null };
            
            userLimits = planLimits?.reduce((acc, l) => {
                acc[l.limit_key] = l.value;
                return acc;
            }, {} as Record<string, number>) || {};
        }
        
        // 5. Check if action requires a specific feature
        if (actionDef.required_feature_key) {
            // Enterprise wildcard check
            const hasWildcard = userFeatures.includes('*');
            const hasFeature = userFeatures.includes(actionDef.required_feature_key);
            
            if (!hasWildcard && !hasFeature) {
                return NextResponse.json({
                    allowed: false,
                    reason: `This action requires the "${actionDef.required_feature_key}" feature which is not available in your plan. Upgrade to access this feature.`,
                    actionRequirements: actionDef,
                    userFeatures,
                    upgradeUrl: 'https://blueprint.forceweaver.com/rcb-pricing'
                }, { status: 403 });
            }
        }
        
        // 6. Check limit if action has one
        if (actionDef.limit_key) {
            const { data: usage } = await adminClient
                .from('license_usage')
                .select('*')
                .eq('license_id', license.id)
                .single() as { data: LicenseUsage | null };
            
            const currentUsage = getCurrentUsageForLimit(actionDef.limit_key, usage);
            const limit = userLimits[actionDef.limit_key];
            
            // If limit is undefined, treat as 0 (most restrictive)
            const effectiveLimit = limit !== undefined ? limit : 0;
            
            // -1 means unlimited
            if (effectiveLimit !== -1 && currentUsage >= effectiveLimit) {
                return NextResponse.json({
                    allowed: false,
                    reason: `You've reached your limit of ${effectiveLimit} for ${actionDef.name}. Current usage: ${currentUsage}/${effectiveLimit}. Upgrade for higher limits.`,
                    actionRequirements: actionDef,
                    currentUsage: {
                        snapshots: usage?.snapshot_count || 0,
                        groups: usage?.group_count || 0,
                        test_runs: usage?.test_runs_count || 0
                    },
                    limits: userLimits,
                    upgradeUrl: 'https://blueprint.forceweaver.com/rcb-pricing'
                }, { status: 403 });
            }
        }
        
        // 7. Access granted - return current usage info
        const { data: usage } = await adminClient
            .from('license_usage')
            .select('*')
            .eq('license_id', license.id)
            .single() as { data: LicenseUsage | null };
        
        return NextResponse.json({
            allowed: true,
            actionRequirements: actionDef,
            currentUsage: {
                snapshots: usage?.snapshot_count || 0,
                groups: usage?.group_count || 0,
                test_runs: usage?.test_runs_count || 0
            },
            limits: userLimits,
            features: userFeatures
        }, { status: 200 });
        
    } catch (error) {
        console.error('[Access Check Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * Helper function to get current usage for a specific limit key
 */
function getCurrentUsageForLimit(
    limitKey: string, 
    usage: { snapshot_count?: number; group_count?: number; test_runs_count?: number; test_runs_month?: string } | null
): number {
    if (!usage) return 0;
    
    switch (limitKey) {
        case 'snapshot_limit':
            return usage.snapshot_count || 0;
        case 'group_limit':
            return usage.group_count || 0;
        case 'test_runs_limit':
            // Monthly limit - reset if month changed
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            if (usage.test_runs_month !== currentMonth) {
                return 0; // Reset for new month
            }
            return usage.test_runs_count || 0;
        default:
            console.warn('[Access Check] Unknown limit key:', limitKey);
            return 0;
    }
}

