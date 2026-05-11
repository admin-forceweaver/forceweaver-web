import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateDeviceToken } from '@/lib/token-generator'

/**
 * Login callback response type
 */
interface LoginCallbackResponse {
  redirect_url: string;
  device_token: string;
  tier: 'free' | 'pro' | 'enterprise';
  expires_at?: string;
}

/**
 * POST /api/auth/login-callback
 * 
 * Generates a device token after successful login and prepares redirect URL
 * for VS Code extension callback flow.
 * 
 * Expected body: { user_id: string, redirect_uri: string }
 * Returns: { redirect_url: string, device_token: string, tier: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { user_id, redirect_uri } = body

    // Validate required parameters
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { error: 'user_id is required and must be a string' },
        { status: 400 }
      )
    }

    if (!redirect_uri || typeof redirect_uri !== 'string') {
      return NextResponse.json(
        { error: 'redirect_uri is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate redirect_uri is localhost (security check)
    try {
      const uri = new URL(redirect_uri)
      if (uri.hostname !== 'localhost' && uri.hostname !== '127.0.0.1') {
        return NextResponse.json(
          { error: 'redirect_uri must be a localhost URL' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'redirect_uri must be a valid URL' },
        { status: 400 }
      )
    }

    // Step 1: Get user's team membership
    const { data: teamMember, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user_id)
      .eq('role', 'owner')
      .single() as { data: { team_id: string; role: string } | null; error: unknown }

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'No team found for user' },
        { status: 404 }
      )
    }

    // Step 2: Get team details
    const { data: team, error: teamDetailsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, customer_type')
      .eq('id', teamMember.team_id)
      .single() as { data: { id: string; name: string; customer_type: string } | null; error: unknown }

    if (teamDetailsError || !team) {
      return NextResponse.json(
        { error: 'Failed to retrieve team details' },
        { status: 500 }
      )
    }

    // Step 3: Get active license for team
    const { data: licenses, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('id, tier, status, expires_at')
      .eq('team_id', team.id)
      .eq('status', 'active') as { data: { id: string; tier: string; status: string; expires_at: string | null }[] | null; error: unknown }

    if (licenseError || !licenses || licenses.length === 0) {
      return NextResponse.json(
        { error: 'No active license found for user' },
        { status: 404 }
      )
    }

    // Find the first non-expired active license
    const activeLicense = licenses.find(
      (license) =>
        !license.expires_at || new Date(license.expires_at) > new Date()
    ) || licenses[0] // Fallback to first license if none meet criteria

    if (!activeLicense) {
      return NextResponse.json(
        { error: 'No active license found for user' },
        { status: 404 }
      )
    }

    // Generate secure device token
    const deviceToken = generateDeviceToken()

    // Create device record in database
    const deviceData = {
      license_id: activeLicense.id,
      device_token: deviceToken,
      device_name: 'VS Code Extension',
    }
    
    const { error: deviceError } = await supabaseAdmin
      .from('devices')
      .insert(deviceData as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (deviceError) {
      console.error('Error creating device record:', deviceError)
      return NextResponse.json(
        { error: 'Failed to register device' },
        { status: 500 }
      )
    }

    // Build redirect URL with token parameters
    const redirectUrl = new URL(redirect_uri)
    redirectUrl.searchParams.set('token', deviceToken)
    redirectUrl.searchParams.set('tier', activeLicense.tier)
    if (activeLicense.expires_at) {
      redirectUrl.searchParams.set('expires_at', activeLicense.expires_at)
    }

    // Return response with redirect URL
    const response: LoginCallbackResponse = {
      redirect_url: redirectUrl.toString(),
      device_token: deviceToken,
      tier: activeLicense.tier as 'free' | 'pro' | 'enterprise',
      expires_at: activeLicense.expires_at || undefined,
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Login callback API error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/login-callback
 * 
 * Returns information about the login callback endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/auth/login-callback',
    method: 'POST',
    description: 'Generates device token and redirect URL for VS Code extension callback',
    parameters: {
      user_id: {
        type: 'string',
        required: true,
        description: 'Authenticated user ID from Supabase'
      },
      redirect_uri: {
        type: 'string',
        required: true,
        description: 'Localhost callback URL (must be localhost or 127.0.0.1)'
      }
    },
    responses: {
      200: {
        description: 'Device token generated successfully',
        example: {
          redirect_url: 'http://localhost:54321/callback?token=abc123&tier=pro',
          device_token: 'abc123...',
          tier: 'pro',
          expires_at: '2024-12-31T23:59:59Z'
        }
      },
      400: {
        description: 'Bad request - missing or invalid parameters',
        example: {
          error: 'user_id is required and must be a string'
        }
      },
      404: {
        description: 'No active license found',
        example: {
          error: 'No active license found for user'
        }
      },
      500: {
        description: 'Internal server error',
        example: {
          error: 'Internal server error'
        }
      }
    }
  })
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for login callback.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for login callback.' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for login callback.' },
    { status: 405 }
  )
}

