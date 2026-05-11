/**
 * API Endpoint: Check Operation
 * 
 * Validates if a user can perform an operation based on:
 * - Feature availability in their plan
 * - Current usage vs limits
 * - License validity
 * 
 * Returns decision with context for UI messaging
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canPerformOperation, type OperationCheck } from '@/lib/license-validation';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { device_token, operation } = body;
        
        if (!device_token || !operation) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields',
                    allowed: false,
                    reason: 'Invalid request'
                },
                { status: 400 }
            );
        }
        
        const supabase = await createClient();
        
        // 1. Get device and associated license
        const { data: device, error: deviceError } = await supabase
            .from('devices')
            .select(`
                id,
                license:licenses (
                    id,
                    tier,
                    status,
                    expires_at,
                    created_at
                )
            `)
            .eq('device_token', device_token)
            .single();
        
        if (deviceError || !device || !device.license) {
            return NextResponse.json(
                { 
                    allowed: false,
                    reason: 'Invalid device token or license not found',
                    currentUsage: {
                        snapshots: 0,
                        groups: 0,
                        test_runs: 0,
                        test_runs_month: new Date().toISOString().slice(0, 7),
                        orgs: 0,
                        last_updated: new Date().toISOString()
                    },
                    limits: { snapshot_limit: 2, group_limit: 0, test_runs_limit: 10 }
                },
                { status: 404 }
            );
        }
        
        const license = Array.isArray(device.license) ? device.license[0] : device.license;
        
        // 2. Check license validity
        if (license.status !== 'active') {
            return NextResponse.json({
                allowed: false,
                reason: 'License is not active',
                currentUsage: {
                    snapshots: 0,
                    groups: 0,
                    test_runs: 0,
                    test_runs_month: new Date().toISOString().slice(0, 7),
                    orgs: 0,
                    last_updated: new Date().toISOString()
                },
                limits: { snapshot_limit: 2, group_limit: 0, test_runs_limit: 10 }
            });
        }
        
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            return NextResponse.json({
                allowed: false,
                reason: 'License has expired',
                currentUsage: {
                    snapshots: 0,
                    groups: 0,
                    test_runs: 0,
                    test_runs_month: new Date().toISOString().slice(0, 7),
                    orgs: 0,
                    last_updated: new Date().toISOString()
                },
                limits: { snapshot_limit: 2, group_limit: 0, test_runs_limit: 10 }
            });
        }
        
        // 3. Get features and limits from entitlements/plan
        let features: string[] = [];
        let limits: Record<string, number> = {};
        
        if (license.tier === 'enterprise') {
            const { data: enterpriseConfig } = await supabase
                .from('enterprise_plan_config')
                .select('features, limits')
                .eq('is_active', true)
                .order('version', { ascending: false })
                .limit(1)
                .single();
            
            features = enterpriseConfig?.features || [];
            limits = enterpriseConfig?.limits || {};
        } else if (license.tier === 'pro') {
            const { data: entitlements } = await supabase
                .from('license_entitlements')
                .select('features, limits')
                .eq('license_id', license.id)
                .single();
            
            if (entitlements) {
                features = entitlements.features || [];
                limits = entitlements.limits || {};
            } else {
                // Fallback to current plan features
                const { data: planFeatures } = await supabase
                    .from('plan_features')
                    .select('feature_key')
                    .eq('plan_tier', 'pro')
                    .eq('enabled', true)
                    .lte('effective_from', new Date(license.created_at).toISOString());
                
                features = planFeatures?.map(f => f.feature_key) || [];
                
                const { data: planLimits } = await supabase
                    .from('plan_limits')
                    .select('limit_key, value')
                    .eq('plan_tier', 'pro')
                    .lte('effective_from', new Date(license.created_at).toISOString());
                
                limits = planLimits?.reduce((acc, l) => {
                    acc[l.limit_key] = l.value;
                    return acc;
                }, {} as Record<string, number>) || {};
            }
        } else {
            // Free tier
            const { data: planFeatures } = await supabase
                .from('plan_features')
                .select('feature_key')
                .eq('plan_tier', 'free')
                .eq('enabled', true);
            
            features = planFeatures?.map(f => f.feature_key) || [];
            
            const { data: planLimits } = await supabase
                .from('plan_limits')
                .select('limit_key, value')
                .eq('plan_tier', 'free');
            
            limits = planLimits?.reduce((acc, l) => {
                acc[l.limit_key] = l.value;
                return acc;
            }, {} as Record<string, number>) || { snapshot_limit: 2, group_limit: 0, test_runs_limit: 10 };
        }
        
        // 4. Check if operation can be performed
        const check: OperationCheck = await canPerformOperation(
            license.id,
            operation,
            features,
            limits
        );
        
        return NextResponse.json({
            allowed: check.allowed,
            reason: check.reason,
            currentUsage: check.currentUsage,
            limits: check.limits,
            upgradeUrl: check.upgradeUrl
        });
        
    } catch (error) {
        console.error('[Check Operation Error]', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                allowed: false,
                reason: 'Server error occurred'
            },
            { status: 500 }
        );
    }
}

