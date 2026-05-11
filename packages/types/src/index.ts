/**
 * Shared TypeScript types for Rev Cloud Blueprint
 */

/**
 * Response from the license validation API endpoint
 */
export interface LicenseValidationResponse {
  isValid: boolean
  tier: 'free' | 'pro' | 'enterprise'
  message?: string
  expiresAt?: string
}

/**
 * Device activation flow types
 */
export interface DeviceActivationResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export interface DeviceTokenRequest {
  device_code: string
}

export interface DeviceTokenResponse {
  access_token: string
  token_type: 'Bearer'
  scope: string
}

/**
 * License tiers available in the system
 */
export type LicenseTier = 'free' | 'pro' | 'enterprise'

/**
 * License status values
 */
export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'cancelled'

/**
 * Team customer types
 */
export type CustomerType = 'individual' | 'corporate'

/**
 * Team member roles
 */
export type TeamRole = 'owner' | 'admin' | 'member'