import { randomBytes } from 'crypto'

/**
 * Generates a cryptographically secure random token
 * @param length Number of bytes (default: 32, results in 64 hex characters)
 * @returns Hex-encoded random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Generates a device token for VS Code extension authentication
 * @returns 64-character hex string (32 bytes)
 */
export function generateDeviceToken(): string {
  return generateSecureToken(32)
}

/**
 * Validates token format
 * @param token Token to validate
 * @returns True if token appears to be valid format
 */
export function isValidTokenFormat(token: string): boolean {
  // Device tokens should be 64 hex characters
  return /^[a-f0-9]{64}$/i.test(token)
}

