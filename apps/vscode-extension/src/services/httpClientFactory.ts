import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { SalesforceAuth } from '../salesforce/auth';
import { ApiUtilityService } from './apiUtilityService';
import { Logger } from '../utils/logger';

/**
 * Centralized HTTP client factory for Salesforce API calls
 * Eliminates duplicate client creation logic across services
 */
export class HttpClientFactory {
    private static clients: Map<string, AxiosInstance> = new Map();

    /**
     * Get or create HTTP client for a specific org
     */
    static async getClient(orgUsernameOrAlias: string, auth: SalesforceAuth, timeoutMs: number = 30000): Promise<AxiosInstance> {
        const clientKey = `${orgUsernameOrAlias}_${timeoutMs}`;
        
        if (this.clients.has(clientKey)) {
            return this.clients.get(clientKey)!;
        }

        Logger.debug(`Creating HTTP client for org: ${orgUsernameOrAlias}`, undefined, 'HttpClientFactory');
        
        const org = await auth.getOrgInfo(orgUsernameOrAlias);
        const accessToken = await auth.getAccessToken(orgUsernameOrAlias);
        const apiVersion = ApiUtilityService.getApiVersion();

        // Validate required values
        if (!org.instanceUrl) {
            throw new Error(`Instance URL not found for org: ${orgUsernameOrAlias}`);
        }
        
        if (!accessToken) {
            throw new Error(`Access token not found for org: ${orgUsernameOrAlias}. Please re-authenticate.`);
        }

        Logger.debug(`Creating Axios client with:`, {
            instanceUrl: org.instanceUrl,
            apiVersion: apiVersion,
            hasAccessToken: !!accessToken,
            timeout: timeoutMs
        }, 'HttpClientFactory');

        const client = axios.create({
            baseURL: `${org.instanceUrl}/services/data/${apiVersion}`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: timeoutMs
        });

        // Add request/response interceptors for logging if verbose logging is enabled
        if (vscode.workspace.getConfiguration('revCloudBlueprint').get<boolean>('verboseLogging', false)) {
            client.interceptors.request.use((request: any) => {
                Logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.url}`, undefined, 'HttpClientFactory');
                return request;
            });

            client.interceptors.response.use(
                (response: any) => {
                    Logger.debug(`API Response: ${response.status} ${response.config.url}`, undefined, 'HttpClientFactory');
                    return response;
                },
                (error: any) => {
                    // Check if this is an expected/handled error (org feature detection, field checks, etc.)
                    const isExpectedError = HttpClientFactory.isExpectedFeatureDetectionError(error);
                    
                    if (isExpectedError) {
                        // Log minimally for expected errors - these are handled gracefully
                        Logger.debug(`API feature detection: ${error.response?.status} ${error.config?.url} - ${HttpClientFactory.extractErrorMessage(error)}`, undefined, 'HttpClientFactory');
                    } else {
                        // Log full error for unexpected issues
                        Logger.error(`API Error: ${error.response?.status} ${error.config?.url} - ${error.message}`, error, 'HttpClientFactory');
                    }
                    
                    return Promise.reject(error);
                }
            );
        }

        this.clients.set(clientKey, client);
        Logger.debug(`HTTP client created and cached for org: ${orgUsernameOrAlias}`, undefined, 'HttpClientFactory');
        
        return client;
    }

    /**
     * Check if an error is an expected feature detection error (gracefully handled)
     */
    private static isExpectedFeatureDetectionError(error: any): boolean {
        const errorData = error.response?.data;
        
        if (!errorData || !Array.isArray(errorData)) {
            return false;
        }
        
        // Check for common feature detection error patterns
        const errorMessage = errorData[0]?.message || '';
        const errorCode = errorData[0]?.errorCode || '';
        
        // Expected errors during org feature detection:
        // 1. TransactionProcessingType not supported (Advance Configurator check)
        // 2. No such column (field availability checks)
        // 3. Invalid field/object errors during feature probing
        return (
            errorCode === 'INVALID_TYPE' || 
            errorCode === 'INVALID_FIELD' ||
            errorMessage.includes('sObject type') && errorMessage.includes('is not supported') ||
            errorMessage.includes('No such column')
        );
    }

    /**
     * Extract clean error message from Salesforce API response
     */
    private static extractErrorMessage(error: any): string {
        const errorData = error.response?.data;
        
        if (Array.isArray(errorData) && errorData[0]?.message) {
            // Extract just the first line of the error message (before the caret pointer)
            const fullMessage = errorData[0].message;
            const firstLine = fullMessage.split('\n')[0];
            return firstLine || fullMessage;
        }
        
        return error.message || 'Unknown error';
    }

    /**
     * Clear cached HTTP clients for a specific org (useful when authentication fails)
     */
    static clearClientForOrg(orgUsernameOrAlias: string): void {
        const keysToRemove = Array.from(this.clients.keys()).filter(key => key.startsWith(`${orgUsernameOrAlias}_`));
        keysToRemove.forEach(key => {
            this.clients.delete(key);
            Logger.debug(`Cleared cached HTTP client: ${key}`, undefined, 'HttpClientFactory');
        });
    }

    /**
     * Clear all cached HTTP clients
     */
    static clearAllClients(): void {
        const clientCount = this.clients.size;
        this.clients.clear();
        Logger.debug(`Cleared ${clientCount} cached HTTP clients`, undefined, 'HttpClientFactory');
    }

    /**
     * Get cache statistics for debugging
     */
    static getCacheStats(): { totalClients: number; orgCount: number; clients: string[] } {
        const clients = Array.from(this.clients.keys());
        const orgs = new Set(clients.map(key => key.split('_')[0]));
        
        return {
            totalClients: this.clients.size,
            orgCount: orgs.size,
            clients: clients
        };
    }
}
