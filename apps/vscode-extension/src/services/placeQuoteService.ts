import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { ApiUtilityService } from './apiUtilityService';
import { ValidationService } from './validationService';
import { HttpClientFactory } from './httpClientFactory';

export interface PlaceQuoteRequest {
    records: Array<{
        sobjectType: string;
        referenceId: string;
        [key: string]: any;
    }>;
}

export interface PlaceQuoteResponse {
    success: boolean;
    quoteId: string;
    errors?: string[];
    apiResponse?: any;
}

/**
 * Service for Revenue Cloud Place Sales Transaction API operations
 * Handles quote creation through the Connect API
 */
export class PlaceQuoteService {
    private auth: SalesforceAuth;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Create or get HTTP client for org using centralized factory
     */
    private async getClient(orgAlias: string): Promise<AxiosInstance> {
        return await HttpClientFactory.getClient(orgAlias, this.auth, 60000); // Increased timeout for complex quote operations
    }

    /**
     * Execute Place Sales Transaction API call
     * Accepts both old format (PlaceQuoteRequest) and new format (with graph structure)
     */
    async placeQuote(orgAlias: string, request: PlaceQuoteRequest | any): Promise<PlaceQuoteResponse> {
        try {
            // Support both old format (request.records) and new format (request.graph.records)
            const hasRecords = (request as any).records || (request as any).graph?.records;
            
            if (!hasRecords || (Array.isArray(hasRecords) && hasRecords.length === 0)) {
                throw new Error('Request must contain at least one record');
            }

            const client = await this.getClient(orgAlias);

            const response = await client.post('/connect/rev/sales-transaction/actions/place', request);
            
            
            // Accept both 200 OK and 201 Created as success
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const responseData = response.data;
            
            // DEBUG: Log full response structure
            console.log('[PlaceQuoteService] Full PST API response:', JSON.stringify(responseData, null, 2));
            
            // Extract quote ID from response
            const quoteId = this.extractQuoteIdFromResponse(responseData);
            
            console.log('[PlaceQuoteService] Extracted Quote ID:', quoteId);
            
            return {
                success: true,
                quoteId: quoteId,
                apiResponse: responseData
            };

        } catch (error: any) {
            console.error(`[ERROR] ❌ PLACE QUOTE FAILED:`, error.message);
            
            const errorMessages = this.extractErrorMessages(error);
            
            return {
                success: false,
                quoteId: '',
                errors: errorMessages,
                apiResponse: error.response?.data
            };
        }
    }

    /**
     * Extract Quote ID from Place Sales Transaction API response
     * Handles both old format (results array) and new graph format (graphs array)
     */
    private extractQuoteIdFromResponse(responseData: any): string {
        try {
            console.log('[PlaceQuoteService] Attempting to extract Quote ID from response...');
            
            // Format 1: New graph-based format (v64.0+)
            // Response: { graphs: [ { graphId, records: [ { referenceId, id } ] } ] }
            if (responseData.graphs && Array.isArray(responseData.graphs)) {
                console.log('[PlaceQuoteService] Found graphs array, checking for Quote...');
                for (const graph of responseData.graphs) {
                    if (graph.records && Array.isArray(graph.records)) {
                        for (const record of graph.records) {
                            // Look for the Quote record (referenceId: 'refQuote')
                            if (record.referenceId === 'refQuote' && record.id) {
                                console.log(`[PlaceQuoteService] Found Quote ID in graphs format: ${record.id}`);
                                return record.id;
                            }
                        }
                    }
                }
            }
            
            // Format 2: Old results array format
            // Response: { results: [ { sobjectType, id } ] }
            if (responseData.results && Array.isArray(responseData.results)) {
                console.log('[PlaceQuoteService] Found results array, checking for Quote...');
                for (const result of responseData.results) {
                    if (result.sobjectType === 'Quote' && result.id) {
                        console.log(`[PlaceQuoteService] Found Quote ID in results format: ${result.id}`);
                        return result.id;
                    }
                }
            }
            
            // Format 3: Direct ID at top level
            if (responseData.id) {
                console.log(`[PlaceQuoteService] Found Quote ID at top level: ${responseData.id}`);
                return responseData.id;
            }
            
            // Format 4: salesTransactionId field
            if (responseData.salesTransactionId) {
                console.log(`[PlaceQuoteService] Found salesTransactionId: ${responseData.salesTransactionId}`);
                return responseData.salesTransactionId;
            }
            
            console.error('[PlaceQuoteService] Response structure:', JSON.stringify(responseData, null, 2));
            throw new Error('Quote ID not found in API response structure. Check response format.');
        } catch (error: any) {
            console.error(`[ERROR] Failed to extract Quote ID from response:`, error.message);
            console.error(`[ERROR] Response structure issue - check API response format`);
            throw new Error(`Could not extract Quote ID from API response: ${error.message}`);
        }
    }

    /**
     * Extract meaningful error messages from API errors
     */
    private extractErrorMessages(error: any): string[] {
        const errors: string[] = [];
        
        if (error.response?.data) {
            const data = error.response.data;
            
            // Handle Connect API error format
            if (data.message) {
                errors.push(data.message);
            }
            
            // Handle field-level errors
            if (data.fieldErrors) {
                Object.keys(data.fieldErrors).forEach(field => {
                    const fieldErrors = data.fieldErrors[field];
                    if (Array.isArray(fieldErrors)) {
                        fieldErrors.forEach(fieldError => {
                            errors.push(`${field}: ${fieldError.message || fieldError}`);
                        });
                    }
                });
            }
            
            // Handle general errors array
            if (Array.isArray(data.errors)) {
                data.errors.forEach((err: any) => {
                    if (typeof err === 'string') {
                        errors.push(err);
                    } else if (err.message) {
                        errors.push(err.message);
                    }
                });
            }
        }
        
        // Fallback to basic error message
        if (errors.length === 0) {
            errors.push(error.message || 'Unknown API error');
        }
        
        return errors;
    }

    /**
     * Validate Place Quote request structure
     */
    validatePlaceQuoteRequest(request: PlaceQuoteRequest): string[] {
        const errors: string[] = [];
        
        if (!request.records) {
            errors.push('Missing records array');
            return errors;
        }
        
        if (!Array.isArray(request.records)) {
            errors.push('Records must be an array');
            return errors;
        }
        
        if (request.records.length === 0) {
            errors.push('Records array cannot be empty');
            return errors;
        }
        
        // Validate each record
        request.records.forEach((record, index) => {
            if (!record.sobjectType) {
                errors.push(`Record ${index + 1}: Missing sobjectType`);
            }
            
            if (!record.referenceId) {
                errors.push(`Record ${index + 1}: Missing referenceId`);
            }
        });
        
        return errors;
    }

    /**
     * Build Place Quote request with validation
     */
    buildPlaceQuoteRequest(records: Array<{ sobjectType: string; referenceId: string; [key: string]: any; }>): PlaceQuoteRequest {
        const request: PlaceQuoteRequest = { records };
        
        const validationErrors = this.validatePlaceQuoteRequest(request);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid Place Quote request: ${validationErrors.join(', ')}`);
        }
        
        return request;
    }

    /**
     * Clear cached HTTP clients
     */
    clearClients(): void {
        HttpClientFactory.clearAllClients();
    }
}
