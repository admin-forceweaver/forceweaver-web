import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/license-validation'

/**
 * GET /api/admin/limits
 * Get all plan limits
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const userRole = user.app_metadata?.role || user.user_metadata?.role
    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: limits, error } = await supabase
      .from('plan_limits')
      .select('*')
      .order('plan_tier', { ascending: true })
      .order('limit_key', { ascending: true })

    if (error) {
      console.error('[Admin API] Error fetching limits:', error)
      return NextResponse.json({ error: 'Failed to fetch limits' }, { status: 500 })
    }

    return NextResponse.json({ limits })
  } catch (error) {
    console.error('[Admin API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/limits
 * Create a new limit
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const userRole = user.app_metadata?.role || user.user_metadata?.role
    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { plan_tier, limit_key, value, display_name, description } = body

    // Validate required fields
    if (!plan_tier || !limit_key || value === undefined || !display_name) {
      return NextResponse.json(
        { error: 'Missing required fields: plan_tier, limit_key, value, display_name' },
        { status: 400 }
      )
    }

    // Validate plan_tier
    if (!['free', 'pro', 'enterprise'].includes(plan_tier)) {
      return NextResponse.json(
        { error: 'Invalid plan_tier. Must be: free, pro, or enterprise' },
        { status: 400 }
      )
    }

    // Validate value
    if (typeof value !== 'number' || (value < -1)) {
      return NextResponse.json(
        { error: 'Invalid value. Must be a number >= -1 (-1 means unlimited)' },
        { status: 400 }
      )
    }

    // Create limit
    const { data: limit, error } = await supabase
      .from('plan_limits')
      .insert({
        plan_tier,
        limit_key,
        value,
        display_name,
        description
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin API] Error creating limit:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create limit' },
        { status: 500 }
      )
    }

    // Log audit event
    await logAuditEvent({
      changeType: 'limit_change',
      tableName: 'plan_limits',
      recordId: limit.id,
      oldValue: null,
      newValue: limit,
      changedBy: user.id,
      reason: 'Limit created via Admin Console'
    })

    return NextResponse.json({ limit }, { status: 201 })
  } catch (error) {
    console.error('[Admin API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

