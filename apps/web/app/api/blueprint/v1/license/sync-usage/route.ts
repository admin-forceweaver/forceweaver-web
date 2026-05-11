/**
 * API Endpoint: Sync Usage
 * 
 * Synchronizes local counts from extension with backend database
 * Used for reconciliation and correction of usage counts
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsage } from '@/lib/license-validation';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { device_token, local_counts } = body;
        
        if (!device_token || !local_counts) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields',
                    success: false
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
                    status
                )
            `)
            .eq('device_token', device_token)
            .single();
        
        if (deviceError || !device || !device.license) {
            return NextResponse.json(
                { 
                    error: 'Invalid device token or license not found',
                    success: false
                },
                { status: 404 }
            );
        }
        
        const license = Array.isArray(device.license) ? device.license[0] : device.license;
        
        // 2. Get current backend usage
        const backendUsage = await getCurrentUsage(license.id);
        
        // 3. Compare and reconcile
        const snapshots = local_counts.snapshots || 0;
        const groups = local_counts.groups || 0;
        
        // Use the higher count (local vs backend) for reconciliation
        // This prevents undercounting if operations were performed offline
        const reconciledSnapshots = Math.max(snapshots, backendUsage.snapshots);
        const reconciledGroups = Math.max(groups, backendUsage.groups);
        
        // 4. Update backend if needed
        if (reconciledSnapshots !== backendUsage.snapshots || reconciledGroups !== backendUsage.groups) {
            const { error: updateError } = await supabase
                .from('license_usage')
                .upsert({
                    license_id: license.id,
                    snapshot_count: reconciledSnapshots,
                    group_count: reconciledGroups,
                    test_runs_count: backendUsage.test_runs, // Keep backend test_runs (more authoritative)
                    test_runs_month: backendUsage.test_runs_month,
                    last_updated_at: new Date().toISOString()
                }, {
                    onConflict: 'license_id'
                });
            
            if (updateError) {
                console.error('[Sync Usage Update Error]', updateError);
            }
        }
        
        // 5. Return reconciled usage
        return NextResponse.json({
            success: true,
            reconciledUsage: {
                snapshots: reconciledSnapshots,
                groups: reconciledGroups,
                test_runs: backendUsage.test_runs
            },
            needsCorrection: reconciledSnapshots !== snapshots || reconciledGroups !== groups,
            message: reconciledSnapshots !== snapshots || reconciledGroups !== groups 
                ? 'Usage counts have been reconciled with backend'
                : 'Usage is in sync'
        });
        
    } catch (error) {
        console.error('[Sync Usage Error]', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                success: false
            },
            { status: 500 }
        );
    }
}

