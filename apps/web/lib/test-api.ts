/**
 * Test utilities for the license API endpoints
 * These functions can be used for testing and debugging the API
 */

/**
 * License validation response type
 */
export interface LicenseValidationResponse {
  isValid: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  message?: string;
  expires_at?: string;
  features?: string[];
}

/**
 * Device activation response type
 */
export interface DeviceActivationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Test the device activation endpoint
 */
export async function testDeviceActivation(): Promise<DeviceActivationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/license/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Activation failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Test the license validation endpoint
 */
export async function testLicenseValidation(deviceToken: string): Promise<LicenseValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/license/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device_token: deviceToken
    })
  })

  if (!response.ok && response.status !== 401) {
    throw new Error(`Validation failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Test the device token polling endpoint
 */
export async function testTokenPolling(deviceCode: string) {
  const response = await fetch(`${API_BASE_URL}/api/license/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device_code: deviceCode
    })
  })

  // Don't throw on 400 status as it's expected for pending authorization
  if (!response.ok && response.status !== 400) {
    throw new Error(`Token polling failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Complete test flow simulation
 */
export async function runCompleteTestFlow() {
  console.log('🧪 Starting complete API test flow...')
  
  try {
    // Step 1: Test device activation
    console.log('1️⃣ Testing device activation...')
    const activation = await testDeviceActivation()
    console.log('✅ Device activation successful:', {
      user_code: activation.user_code,
      verification_uri: activation.verification_uri,
      expires_in: activation.expires_in
    })

    // Step 2: Test license validation with invalid token
    console.log('2️⃣ Testing license validation with invalid token...')
    const invalidValidation = await testLicenseValidation('invalid-token-123')
    console.log('✅ Invalid token validation:', invalidValidation)

    // Step 3: Test token polling (should be pending)
    console.log('3️⃣ Testing token polling (should be pending)...')
    const tokenPolling = await testTokenPolling(activation.device_code)
    console.log('✅ Token polling result:', tokenPolling)

    console.log('🎉 All API tests completed successfully!')
    return {
      activation,
      invalidValidation,
      tokenPolling
    }

  } catch (error) {
    console.error('❌ Test flow failed:', error)
    throw error
  }
}
