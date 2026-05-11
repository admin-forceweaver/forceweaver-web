import * as vscode from 'vscode';
import axios from 'axios';

// API base URL - will be environment-specific
const API_BASE_URL = 'https://sfapp.forceweaver.com';
const CACHE_KEY = 'revCloudBlueprint.licenseCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Set a future date when the monetization system will be fully implemented
// This defines the end of the free beta period
const MONETIZATION_START_DATE = new Date('2026-01-31T00:00:00Z');

/**
 * Represents the state of the user's license.
 * This interface defines what information the extension needs
 * to determine feature access and user communication.
 */
export interface LicenseState {
    /** Whether the user has access to premium/pro features */
    isPro: boolean;
    /** License tier */
    tier: 'free' | 'pro' | 'enterprise';
    /** Status message to display to the user about their license state */
    statusMessage: string;
    /** Expiration date (if applicable) */
    expiresAt?: string;
    /** Available features */
    features?: string[];
    /** Last validation timestamp */
    lastValidated?: number;
}

/**
 * Cached license state for performance optimization
 */
interface CachedLicenseState {
    licenseState: LicenseState;
    cachedAt: number;
}

/**
 * Response from the license validation API
 */
interface LicenseValidationResponse {
    isValid: boolean;
    tier: 'free' | 'pro' | 'enterprise';
    expires_at?: string;
    features?: string[];
    message?: string;
}

/**
 * Get the current license state with caching.
 * This is the main function that all Pro features should call.
 * 
 * During the Public Beta phase (before MONETIZATION_START_DATE):
 * - All users get full access to Pro features for free
 * - Returns a welcoming beta message
 * 
 * After monetization begins:
 * - Validates device token with backend API
 * - Uses 24-hour cache to minimize API calls
 * - Gracefully degrades if API is unavailable
 * 
 * @param context - Extension context for accessing storage (optional for backward compatibility)
 * @returns LicenseState indicating current feature access and user message
 */
export async function getLicenseState(context?: vscode.ExtensionContext): Promise<LicenseState> {
    const now = new Date();
    
    // Check if we're still in beta period (for backward compatibility)
    if (now < MONETIZATION_START_DATE) {
        return {
            isPro: true,
            tier: 'pro',
            statusMessage: 'Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.',
            lastValidated: Date.now()
        };
    }

    // After beta period, context is required for validation
    if (!context) {
        console.warn('[LicenseService] Extension context is required for license validation after beta period');
        return createFreeTierState('License validation unavailable. Please restart VS Code.');
    }

    // Check cache first
    const cachedState = getCachedLicenseState(context);
    if (cachedState) {
        return cachedState;
    }

    // No valid cache, validate with API
    return await validateLicenseWithAPI(context);
}

/**
 * Validate license with the backend API
 */
async function validateLicenseWithAPI(context: vscode.ExtensionContext): Promise<LicenseState> {
    try {
        // Get device token from secure storage
        const deviceToken = await context.secrets.get('revCloudBlueprint.deviceToken');

        if (!deviceToken) {
            // No token = free tier
            return createFreeTierState('No license activated. Click the user icon to activate.');
        }

        // Call validation API
        const response = await axios.post<LicenseValidationResponse>(
            `${API_BASE_URL}/api/license/validate`,
            { device_token: deviceToken },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );

        const validationData = response.data;

        if (!validationData.isValid) {
            // Invalid token
            const licenseState = createFreeTierState(
                validationData.message || 'License validation failed. Please reactivate your license.'
            );
            cacheLicenseState(context, licenseState);
            return licenseState;
        }

        // Valid license
        const licenseState: LicenseState = {
            isPro: validationData.tier !== 'free',
            tier: validationData.tier,
            statusMessage: `Licensed: ${validationData.tier} tier`,
            expiresAt: validationData.expires_at,
            features: validationData.features,
            lastValidated: Date.now()
        };

        cacheLicenseState(context, licenseState);
        return licenseState;

    } catch (error: any) {
        // Network error or API unavailable
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token is invalid or expired
            await context.secrets.delete('revCloudBlueprint.deviceToken');
            return createFreeTierState('Your license has expired. Please reactivate.');
        }

        // For other errors, try to use stale cache if available
        const staleCache = getStaleCache(context);
        if (staleCache) {
            console.warn('[LicenseService] API unavailable, using stale cache:', error.message);
            return {
                ...staleCache,
                statusMessage: `${staleCache.statusMessage} (offline)`
            };
        }

        // No cache available, assume free tier
        console.error('[LicenseService] Validation failed and no cache available:', error.message);
        return createFreeTierState('Unable to validate license. Using free tier.');
    }
}

/**
 * Get cached license state if valid (less than 24 hours old)
 */
function getCachedLicenseState(context: vscode.ExtensionContext): LicenseState | null {
    const cached = context.workspaceState.get<CachedLicenseState>(CACHE_KEY);
    
    if (!cached) {
        return null;
    }

    const age = Date.now() - cached.cachedAt;
    if (age < CACHE_DURATION) {
        return cached.licenseState;
    }

    return null;
}

/**
 * Get stale cache (expired but available for offline use)
 */
function getStaleCache(context: vscode.ExtensionContext): LicenseState | null {
    const cached = context.workspaceState.get<CachedLicenseState>(CACHE_KEY);
    return cached ? cached.licenseState : null;
}

/**
 * Cache license state for 24 hours
 */
function cacheLicenseState(context: vscode.ExtensionContext, state: LicenseState): void {
    const cached: CachedLicenseState = {
        licenseState: state,
        cachedAt: Date.now()
    };
    context.workspaceState.update(CACHE_KEY, cached);
}

/**
 * Create free tier state with message
 */
function createFreeTierState(message: string): LicenseState {
    return {
        isPro: false,
        tier: 'free',
        statusMessage: message,
        lastValidated: Date.now()
    };
}

/**
 * Legacy synchronous function for backwards compatibility during beta period.
 * @deprecated Use getLicenseState() instead for more detailed license information
 */
export function isProFeatureEnabled(): boolean {
    const now = new Date();
    return now < MONETIZATION_START_DATE; // During beta, everyone is Pro
}

/**
 * Get the monetization start date for reference by other components
 * @returns Date when monetization begins
 */
export function getMonetizationStartDate(): Date {
    return MONETIZATION_START_DATE;
}

/**
 * Check if we're currently in the beta period
 * @returns true if current date is before monetization start date
 */
export function isInBetaPeriod(): boolean {
    return new Date() < MONETIZATION_START_DATE;
}

/**
 * Clear license cache (force revalidation)
 * Note: Currently a no-op during beta period, will be implemented in Feature 4.2
 */
export function clearLicenseCache(context: vscode.ExtensionContext): void {
    // TODO: Implement cache clearing in Feature 4.2
    // For now, this is a no-op since we don't have caching yet
    console.log('[LicenseService] Cache clear requested (no-op during beta)');
}

/**
 * Check if device token exists
 * @param context - Extension context for accessing secrets
 * @returns true if device token exists
 */
export async function hasDeviceToken(context: vscode.ExtensionContext): Promise<boolean> {
    const token = await context.secrets.get('revCloudBlueprint.deviceToken');
    return !!token;
}

/**
 * Deactivate device (remove token and cache)
 * @param context - Extension context for accessing secrets
 */
export async function deactivateDevice(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete('revCloudBlueprint.deviceToken');
    clearLicenseCache(context);
}
