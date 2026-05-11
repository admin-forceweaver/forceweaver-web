import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceToken } from '@/lib/license-validation'

/**
 * License validation response type
 */
interface LicenseValidationResponse {
  isValid: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  message?: string;
  expires_at?: string;
  features?: string[];
}

/**
 * POST /api/license/validate
 * 
 * Validates a device token and returns the user's license status.
 * This is the core API that the VS Code extension calls to check license validity.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { device_token } = body

    // Validate required parameters
    if (!device_token || typeof device_token !== 'string') {
      const response: LicenseValidationResponse = {
        isValid: false,
        tier: 'free',
        message: 'device_token is required and must be a string'
      }
      
      return NextResponse.json(response, { status: 400 })
    }

    // Validate the device token
    const validationResult = await validateDeviceToken(device_token)

    // Return appropriate HTTP status based on validation result
    const statusCode = validationResult.isValid ? 200 : 401

    return NextResponse.json(validationResult, { status: statusCode })

  } catch (error) {
    console.error('License validation API error:', error)
    
    const response: LicenseValidationResponse = {
      isValid: false,
      tier: 'free',
      message: 'Internal server error'
    }
    
    return NextResponse.json(response, { status: 500 })
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
    description: 'Validates a device token and returns license status',
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
          message: 'License is active',
          expiresAt: '2024-12-31T23:59:59Z'
        }
      },
      401: {
        description: 'Invalid or expired license',
        example: {
          isValid: false,
          tier: 'free',
          message: 'Invalid device token'
        }
      },
      400: {
        description: 'Bad request - missing or invalid parameters',
        example: {
          isValid: false,
          tier: 'free',
          message: 'device_token is required and must be a string'
        }
      },
      500: {
        description: 'Internal server error',
        example: {
          isValid: false,
          tier: 'free',
          message: 'Internal server error'
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
