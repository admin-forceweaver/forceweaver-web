import { supabase } from './supabase'

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
 * Validates a device token and returns the user's license status
 */
export async function validateDeviceToken(deviceToken: string): Promise<LicenseValidationResponse> {
  try {
    // Query to find the device and its associated license
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select(`
        id,
        device_token,
        last_used_at,
        license_id,
        licenses!inner (
          id,
          tier,
          status,
          expires_at,
          team_id,
          teams!inner (
            id,
            name,
            customer_type
          )
        )
      `)
      .eq('device_token', deviceToken)
      .single()

    if (deviceError || !deviceData) {
      // Device token not found or invalid
      return {
        isValid: false,
        tier: 'free',
        message: 'Invalid device token'
      }
    }

    // Type definition for the Supabase response
    type DeviceDataResponse = {
      id: string;
      device_token: string;
      last_used_at: string;
      license_id: string;
      licenses: Array<{
        id: string;
        tier: 'free' | 'pro' | 'enterprise';
        status: string;
        expires_at?: string;
        team_id: string;
        teams: Array<{
          id: string;
          name: string;
          customer_type: string;
        }>;
      }>;
    };

    const typedDeviceData = deviceData as unknown as DeviceDataResponse;
    const license = typedDeviceData.licenses[0]; // Get first license (should only be one)
    const currentTime = new Date()

    if (!license) {
      return {
        isValid: false,
        tier: 'free',
        message: 'No license found for device'
      }
    }

    // Check if license is active
    if (license.status !== 'active') {
      return {
        isValid: false,
        tier: 'free',
        message: `License is ${license.status}`
      }
    }

    // Check if license has expired
    if (license.expires_at && new Date(license.expires_at) <= currentTime) {
      return {
        isValid: false,
        tier: 'free',
        message: 'License has expired',
        expires_at: license.expires_at
      }
    }

    // Update last_used_at timestamp for the device
    const { error: updateError } = await supabase
      .from('devices')
      .update({ last_used_at: currentTime.toISOString() })
      .eq('id', deviceData.id)

    if (updateError) {
      console.error('Failed to update device last_used_at:', updateError)
      // Don't fail the validation for this, just log the error
    }

    // License is valid and active
    return {
      isValid: true,
      tier: license.tier,
      message: 'License is active',
      expires_at: license.expires_at
    }

  } catch (error) {
    console.error('License validation error:', error)
    return {
      isValid: false,
      tier: 'free',
      message: 'Internal server error during validation'
    }
  }
}

/**
 * Gets license information for a specific team
 */
export async function getTeamLicense(teamId: string) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Creates a new device record for a license
 */
export async function createDeviceForLicense(licenseId: string, deviceToken: string, deviceName?: string) {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      license_id: licenseId,
      device_token: deviceToken,
      device_name: deviceName || 'VS Code Extension'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create device: ${error.message}`)
  }

  return data
}

/**
 * Checks if a user has access to a specific team
 */
export async function checkUserTeamAccess(userId: string, teamId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role
}
