import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/license-validation'

/**
 * GET /api/admin/features
 * Get all features
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

    const { data: features, error } = await supabase
      .from('features')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[Admin API] Error fetching features:', error)
      return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 })
    }

    return NextResponse.json({ features })
  } catch (error) {
    console.error('[Admin API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/features
 * Create a new feature
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
    const { key, name, description, category, is_active } = body

    // Validate required fields
    if (!key || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: key, name, category' },
        { status: 400 }
      )
    }

    // Validate category
    if (!['core', 'pro', 'enterprise'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be: core, pro, or enterprise' },
        { status: 400 }
      )
    }

    // Create feature
    const { data: feature, error } = await supabase
      .from('features')
      .insert({
        key,
        name,
        description,
        category,
        is_active: is_active ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin API] Error creating feature:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create feature' },
        { status: 500 }
      )
    }

    // Log audit event
    await logAuditEvent({
      changeType: 'feature_toggle',
      tableName: 'features',
      recordId: feature.key,
      oldValue: null,
      newValue: feature,
      changedBy: user.id,
      reason: 'Feature created via Admin Console'
    })

    return NextResponse.json({ feature }, { status: 201 })
  } catch (error) {
    console.error('[Admin API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

