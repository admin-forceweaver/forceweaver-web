/**
 * Token Storage Service
 * 
 * Handles secure storage of device tokens with automatic fallback:
 * - Primary: VS Code SecretStorage (most secure, but has persistence issues on some systems)
 * - Fallback: Encrypted globalState storage (when SecretStorage fails to persist)
 * 
 * The service automatically detects SecretStorage failures and falls back to encrypted
 * globalState storage to ensure tokens persist across sessions.
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';

const TOKEN_KEY = 'revCloudBlueprint.deviceToken';
const FALLBACK_TOKEN_KEY = 'revCloudBlueprint.encryptedToken';
const HAS_TOKEN_KEY = 'revCloudBlueprint.hasToken';
const TOKEN_STORED_AT_KEY = 'revCloudBlueprint.tokenStoredAt';
const USE_FALLBACK_KEY = 'revCloudBlueprint.useFallbackStorage';

/**
 * Simple XOR-based obfuscation for token storage
 * Note: This is not military-grade encryption, but provides reasonable
 * protection for tokens stored in globalState (which is less secure than SecretStorage)
 */
function obfuscateToken(token: string, context: vscode.ExtensionContext): string {
    // Use extension ID as part of the key (unique per extension)
    const key = context.extension.id + '-' + context.globalState.get<string>('installId', 'default');
    
    // Simple XOR with repeated key
    let result = '';
    for (let i = 0; i < token.length; i++) {
        const tokenChar = token.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        result += String.fromCharCode(tokenChar ^ keyChar);
    }
    
    // Base64 encode to make it safe for storage
    return Buffer.from(result, 'binary').toString('base64');
}

/**
 * Deobfuscate a token
 */
function deobfuscateToken(obfuscated: string, context: vscode.ExtensionContext): string {
    try {
        // Base64 decode
        const decoded = Buffer.from(obfuscated, 'base64').toString('binary');
        
        // Use extension ID as part of the key
        const key = context.extension.id + '-' + context.globalState.get<string>('installId', 'default');
        
        // Simple XOR with repeated key (XOR is its own inverse)
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const decodedChar = decoded.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            result += String.fromCharCode(decodedChar ^ keyChar);
        }
        
        return result;
    } catch (error) {
        console.error('[TokenStorage] Failed to deobfuscate token:', error);
        return '';
    }
}

/**
 * Store device token with automatic fallback
 */
export async function storeToken(token: string, context: vscode.ExtensionContext): Promise<void> {
    console.log('[TokenStorage] Storing device token...');
    console.log('[TokenStorage] Token length:', token.length);
    
    // Generate or retrieve installation ID for obfuscation
    if (!context.globalState.get('installId')) {
        const installId = crypto.randomBytes(16).toString('hex');
        await context.globalState.update('installId', installId);
        console.log('[TokenStorage] Generated new installation ID');
    }
    
    // Check if we should use fallback storage from the start
    const useFallback = context.globalState.get<boolean>(USE_FALLBACK_KEY, false);
    
    if (useFallback) {
        console.log('[TokenStorage] Using fallback storage (globalState) due to previous SecretStorage failure');
        await storeFallbackToken(token, context);
    } else {
        // Try SecretStorage first
        console.log('[TokenStorage] Attempting to store in SecretStorage...');
        try {
            await context.secrets.store(TOKEN_KEY, token);
            console.log('[TokenStorage] Stored in SecretStorage successfully');
            
            // Store metadata
            await context.globalState.update(HAS_TOKEN_KEY, true);
            await context.globalState.update(TOKEN_STORED_AT_KEY, Date.now());
            
            // Verify immediately
            const retrieved = await context.secrets.get(TOKEN_KEY);
            if (retrieved && retrieved === token) {
                console.log('[TokenStorage] ✅ SecretStorage verification passed');
            } else {
                console.warn('[TokenStorage] ⚠️ SecretStorage verification failed, switching to fallback');
                await context.globalState.update(USE_FALLBACK_KEY, true);
                await storeFallbackToken(token, context);
            }
        } catch (error) {
            console.error('[TokenStorage] SecretStorage failed:', error);
            console.log('[TokenStorage] Switching to fallback storage');
            await context.globalState.update(USE_FALLBACK_KEY, true);
            await storeFallbackToken(token, context);
        }
    }
}

/**
 * Store token in encrypted globalState (fallback)
 */
async function storeFallbackToken(token: string, context: vscode.ExtensionContext): Promise<void> {
    const obfuscated = obfuscateToken(token, context);
    await context.globalState.update(FALLBACK_TOKEN_KEY, obfuscated);
    await context.globalState.update(HAS_TOKEN_KEY, true);
    await context.globalState.update(TOKEN_STORED_AT_KEY, Date.now());
    console.log('[TokenStorage] ✅ Token stored in encrypted globalState');
}

/**
 * Retrieve device token from any available storage
 */
export async function retrieveToken(context: vscode.ExtensionContext): Promise<string | undefined> {
    console.log('[TokenStorage] Retrieving device token...');
    
    // Check if we're using fallback storage
    const useFallback = context.globalState.get<boolean>(USE_FALLBACK_KEY, false);
    
    if (useFallback) {
        console.log('[TokenStorage] Using fallback storage (globalState)');
        const obfuscated = context.globalState.get<string>(FALLBACK_TOKEN_KEY);
        if (obfuscated) {
            const token = deobfuscateToken(obfuscated, context);
            console.log('[TokenStorage] ✅ Token retrieved from encrypted globalState');
            return token;
        } else {
            console.log('[TokenStorage] No token found in fallback storage');
            return undefined;
        }
    }
    
    // Try SecretStorage first
    console.log('[TokenStorage] Checking SecretStorage...');
    const secretToken = await context.secrets.get(TOKEN_KEY);
    
    if (secretToken) {
        console.log('[TokenStorage] ✅ Token retrieved from SecretStorage');
        return secretToken;
    }
    
    // Check if we have metadata indicating a token should exist
    const hasToken = context.globalState.get<boolean>(HAS_TOKEN_KEY);
    const tokenStoredAt = context.globalState.get<number>(TOKEN_STORED_AT_KEY);
    
    if (hasToken) {
        console.warn('[TokenStorage] ⚠️ MISMATCH: globalState says token exists but SecretStorage is empty');
        console.warn('[TokenStorage] Token was stored at:', tokenStoredAt ? new Date(tokenStoredAt).toISOString() : 'Unknown');
        console.warn('[TokenStorage] This indicates SecretStorage persistence failure');
        
        // Check if we have a fallback token
        const obfuscated = context.globalState.get<string>(FALLBACK_TOKEN_KEY);
        if (obfuscated) {
            console.log('[TokenStorage] Found fallback token, attempting to retrieve...');
            const token = deobfuscateToken(obfuscated, context);
            if (token) {
                console.log('[TokenStorage] ✅ Token retrieved from fallback storage');
                // Switch to using fallback permanently for this installation
                await context.globalState.update(USE_FALLBACK_KEY, true);
                return token;
            }
        }
        
        console.error('[TokenStorage] ❌ Token lost! SecretStorage failed and no fallback available');
        // Clear the metadata since we have no token
        await context.globalState.update(HAS_TOKEN_KEY, false);
        await context.globalState.update(TOKEN_STORED_AT_KEY, undefined);
    }
    
    console.log('[TokenStorage] No token found in any storage');
    return undefined;
}

/**
 * Delete device token from all storage locations
 */
export async function deleteToken(context: vscode.ExtensionContext): Promise<void> {
    console.log('[TokenStorage] Deleting device token from all storage locations...');
    
    // Delete from SecretStorage
    await context.secrets.delete(TOKEN_KEY);
    
    // Delete from fallback storage
    await context.globalState.update(FALLBACK_TOKEN_KEY, undefined);
    
    // Clear metadata
    await context.globalState.update(HAS_TOKEN_KEY, false);
    await context.globalState.update(TOKEN_STORED_AT_KEY, undefined);
    // Don't clear USE_FALLBACK_KEY - keep the preference for next login
    
    console.log('[TokenStorage] ✅ Token deleted successfully');
}

/**
 * Check if token exists (without retrieving it)
 */
export async function hasToken(context: vscode.ExtensionContext): Promise<boolean> {
    const token = await retrieveToken(context);
    return token !== undefined && token.length > 0;
}

/**
 * Get storage diagnostics
 */
export async function getStorageDiagnostics(context: vscode.ExtensionContext): Promise<{
    useFallback: boolean;
    hasSecretToken: boolean;
    hasFallbackToken: boolean;
    hasTokenFlag: boolean;
    tokenStoredAt?: string;
}> {
    const useFallback = context.globalState.get<boolean>(USE_FALLBACK_KEY, false);
    const secretToken = await context.secrets.get(TOKEN_KEY);
    const fallbackToken = context.globalState.get<string>(FALLBACK_TOKEN_KEY);
    const hasTokenFlag = context.globalState.get<boolean>(HAS_TOKEN_KEY, false);
    const tokenStoredAt = context.globalState.get<number>(TOKEN_STORED_AT_KEY);
    
    return {
        useFallback,
        hasSecretToken: !!secretToken,
        hasFallbackToken: !!fallbackToken,
        hasTokenFlag,
        tokenStoredAt: tokenStoredAt ? new Date(tokenStoredAt).toISOString() : undefined
    };
}

