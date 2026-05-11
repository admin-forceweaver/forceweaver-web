/**
 * API Endpoint: Record Usage
 * 
 * Records a completed operation and updates usage counters
 * Called after successful operation completion
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordOperation } from '@/lib/license-validation';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { device_token, operation } = body;
        
        if (!device_token || !operation) {
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
        
        // 2. Record the operation
        await recordOperation(license.id, operation);
        
        // 3. Get updated usage
        const { data: usage } = await supabase
            .from('license_usage')
            .select('*')
            .eq('license_id', license.id)
            .single() as { data: { snapshot_count?: number; group_count?: number; test_runs_count?: number } | null };
        
        return NextResponse.json({
            success: true,
            newUsage: {
                snapshots: usage?.snapshot_count || 0,
                groups: usage?.group_count || 0,
                test_runs: usage?.test_runs_count || 0
            }
        });
        
    } catch (error) {
        console.error('[Record Usage Error]', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                success: false
            },
            { status: 500 }
        );
    }
}

