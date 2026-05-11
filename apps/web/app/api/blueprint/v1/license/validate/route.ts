import { NextRequest, NextResponse } from 'next/server'
import { validateLicense } from '@/lib/license-validation'

/**
 * POST /api/license/validate
 * 
 * Validates a device token and returns the user's license status.
 * This is the core API that the VS Code extension calls to check license validity.
 * 
 * Implements entitlements system:
 * - Pro licenses: Returns locked-in entitlements from purchase time
 * - Enterprise licenses: Returns current centralized configuration
 * - Free tier: Returns current plan features
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { device_token } = body

    // Validate required parameters
    if (!device_token || typeof device_token !== 'string') {
      return NextResponse.json({
        isValid: false,
        tier: 'free',
        features: [],
        limits: { snapshot_limit: 2, group_limit: 1 },
        message: 'device_token is required and must be a string'
      }, { status: 400 })
    }

    // Validate the device token using entitlements system
    const validationResult = await validateLicense(device_token)

    // Return appropriate HTTP status based on validation result
    const statusCode = validationResult.isValid ? 200 : 401

    return NextResponse.json(validationResult, { status: statusCode })

  } catch (error) {
    console.error('[License Validation Error]', error)
    
    return NextResponse.json({
      isValid: false,
      tier: 'free',
      features: [],
      limits: { snapshot_limit: 2, group_limit: 1 },
      message: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * GET /api/license/validate
 * 
 * Returns information about the validation endpoint for debugging/testing
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/license/validate',
    method: 'POST',
    description: 'Validates a device token and returns license status with features and limits',
    parameters: {
      device_token: {
        type: 'string',
        required: true,
        description: 'The device token to validate'
      }
    },
    responses: {
      200: {
        description: 'Valid license found',
        example: {
          isValid: true,
          tier: 'pro',
          features: ['batch_testing', 'group_management', 'pdf_export', 'priority_support'],
          limits: { snapshot_limit: 50, group_limit: 20 },
          expires_at: '2024-12-31T23:59:59Z'
        }
      },
      401: {
        description: 'Invalid or expired license',
        example: {
          isValid: false,
          tier: 'free',
          features: [],
          limits: { snapshot_limit: 2, group_limit: 1 },
          message: 'Invalid device token'
        }
      },
      400: {
        description: 'Bad request - missing or invalid parameters',
        example: {
          isValid: false,
          tier: 'free',
          features: [],
          limits: { snapshot_limit: 2, group_limit: 1 },
          message: 'device_token is required and must be a string'
        }
      },
      500: {
        description: 'Internal server error',
        example: {
          isValid: false,
          tier: 'free',
          features: [],
          limits: { snapshot_limit: 2, group_limit: 1 },
          message: 'Internal server error'
        }
      }
    },
    entitlements_info: {
      description: 'This API implements an entitlements system to protect existing customers',
      pro_tier: 'Returns locked-in entitlements from purchase time',
      enterprise_tier: 'Returns current centralized configuration (shared by all enterprise customers)',
      free_tier: 'Returns current plan features'
    }
  })
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate a license.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate a license.' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate a license.' },
    { status: 405 }
  )
}
