import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from './auth';
import { ConfigReader } from '../config/configReader';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { ApiUtilityService } from '../services/apiUtilityService';
import { ConfigurationService } from '../services/configurationService';
import { Logger } from '../utils/logger';
import { OrgFeatureService, OrgFeatures } from '../services/orgFeatureService';
import { HttpClientFactory } from '../services/httpClientFactory';
import { ValidationService } from '../services/validationService';

export interface SoqlResult {
    totalSize: number;
    done: boolean;
    records: any[];
}

export interface QuoteData {
    Id: string;
    Name: string;
    Account: {
        Id: string;
        Name: string;
    };
    OpportunityId?: string; // Opportunity ID reference
    Pricebook2Id?: string; // Pricebook2 ID for cross-org resolution
    CurrencyIsoCode?: string; // Currency code for PricebookEntry matching
    StartDate?: string; // Quote start date
    GrandTotal: number;
    Discount?: number;
    // Allow any additional fields for configured snap and report fields
    [key: string]: any;
    QuoteLines: QuoteLineData[];
}

export interface OpportunityData {
    Id: string;
    Name: string;
    AccountId: string;
    Account: {
        Id: string;
        Name: string;
    };
    StageName?: string;
    Amount?: number;
    CloseDate?: string;
    [key: string]: any; // For additional opportunity fields
}

export interface QuoteLineData {
    Id: string;
    Product2: {
        Id: string;
        Name: string;
        ProductCode?: string;
        [key: string]: any; // For external ID field
    };
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    Discount: number;
    ListPrice: number;
    ParentQuoteLineItemId?: string; // For product bundle hierarchy
    ConstraintEngineNodeStatus__c?: string; // JSON string containing constraint engine attribute status
    [key: string]: any; // For additional fields
}

// Place Sales Transaction API Request Structure (Revenue Cloud Connect API)
// Based on: https://developer.salesforce.com/docs/atlas.en-us.256.0.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/connect_resources_place_sales_transaction.htm
export interface PlaceSalesTransactionRequest {
    pricingPref?: 'system' | 'skip' | 'force';  // Default: system (lowercase per product team sample)
    catalogRatesPref?: 'fetch' | 'skip';  // Default: skip (lowercase per product team sample)
    configurationPref?: PlaceConfigurationPref;  // Updated structure per product team sample
    graph: PlaceSalesTransactionGraph;
}

export interface PlaceConfigurationPref {
    configurationMethod?: 'Skip' | 'RunAndAllowErrors' | 'RunAndBlockErrors';  // Default: Skip
    configurationOptions?: {
        validateProductCatalog?: boolean;
        validateAmendRenewCancel?: boolean;
        executeConfigurationRules?: boolean;
        addDefaultConfiguration?: boolean;
    };
}

export interface PlaceSalesTransactionGraph {
    graphId: string;
    records: PlaceSalesTransactionRecord[];
}

export interface PlaceSalesTransactionRecord {
    referenceId: string;
    record: {
        attributes: {
            type: 'Quote' | 'QuoteLineItem' | 'QuoteLineItemAttribute' | 'QuoteLineRelationship';
            method: 'POST' | 'PATCH' | 'DELETE';
            id?: string | null;  // Required for PATCH/DELETE, can be null for POST
        };
        // Quote fields for type: 'Quote'
        Name?: string;
        QuoteAccountId?: string;  // Updated field name per product team sample
        Pricebook2Id?: string | null;
        OpportunityId?: string;  // Added per product team sample
        Status?: string;
        Tax?: number;
        ShippingHandling?: number;
        // QuoteLineItem fields for type: 'QuoteLineItem'  
        Product2Id?: string;
        PricebookEntryId?: string;  // Added per product team sample
        Quantity?: number;
        QuoteId?: string;
        UnitPrice?: number;
        Discount?: number;
        ServiceDate?: string;
        Description?: string;
        SortOrder?: number;
        // QuoteLineItemAttribute fields for type: 'QuoteLineItemAttribute'
        AttributeDefinitionId?: string;
        AttributePicklistValueId?: string;  // For picklist attributes
        AttributeValue?: string;           // For text/number/date/currency/percent/checkbox attributes  
        QuoteLineItemId?: string;
        // QuoteLineRelationship fields for type: 'QuoteLineRelationship'
        ProductRelationshipTypeId?: string;
        ProductRelatedComponentId?: string;
        MainQuoteLineId?: string;
        AssociatedQuoteLineId?: string;
        AssociatedQuoteLinePricing?: string;
        // Reference to other records in graph
        [key: string]: any;
    };
}

// QuoteLineItemAttribute interface for snapshot and API
export interface QuoteLineItemAttribute {
    attributeDefinition: {
        type: 'externalId' | 'id';
        externalIdField?: string;  // Default: 'Code'
        value: string;  // Code or ID of AttributeDefinition
    };
    // For picklist attributes
    attributePicklistValue?: {
        type: 'externalId' | 'id';
        externalIdField?: string;  // Default: 'Code'
        value: string | null;  // Code or ID of AttributePicklistValue
    };
    // For text/number/date/currency/percent/checkbox attributes
    attributeTextValue?: string;
    // Original field values for reference/debugging
    attributeDefinitionName?: string;
    attributePicklistValueName?: string;
    // DataType for processing logic
    dataType?: string;
}

// Legacy interface maintained for backward compatibility
export interface PlaceQuoteLineItem {
    productIdentifier: {
        type: 'externalId' | 'productId';
        externalIdField?: string;
        value: string;
    };
    quantity: number;
    adjustments?: PlaceQuoteAdjustment[];
    attributes?: QuoteLineItemAttribute[];  // Added support for line item attributes
}

export interface PlaceQuoteAdjustment {
    type: 'Amount' | 'Percentage';
    value: number;
}

export interface PlaceSalesTransactionResponse {
    quoteId: string;
    success: boolean;
    errors?: string[];
    detailedErrors?: SalesforceAPIError[];
}

export interface SalesforceAPIError {
    errorCode: string;
    message: string;
    referenceId?: string;
    category?: 'authentication' | 'permissions' | 'validation' | 'configuration' | 'data' | 'system';
    userFriendlyMessage?: string;
    troubleshootingSteps?: string[];
}

// Keep legacy interface names for backward compatibility
export type PlaceQuoteRequest = PlaceSalesTransactionRequest;
export type PlaceQuoteGraph = PlaceSalesTransactionGraph;
export type PlaceQuoteRecord = PlaceSalesTransactionRecord;
export type PlaceQuoteResponse = PlaceSalesTransactionResponse;

export class SalesforceAPI {
    private auth: SalesforceAuth;
    private clients: Map<string, AxiosInstance> = new Map();

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Execute a function with retry logic and exponential backoff
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelayMs: number = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                this.debugLog(`[Retry] ${operationName} - Attempt ${attempt}${attempt > 1 ? ` of ${maxRetries + 1}` : ''}`);
                
                const result = await operation();
                
                if (attempt > 1) {
                    this.debugLog(`[Retry] ${operationName} - SUCCESS on attempt ${attempt}`);
                }
                
                return result;
                
            } catch (error: any) {
                lastError = error;
                
                this.debugLog(`[Retry] ${operationName} - FAILED on attempt ${attempt}: ${error.message}`);
                
                // Check if this is a retryable error
                if (!this.isRetryableError(error)) {
                    this.debugLog(`[Retry] ${operationName} - Non-retryable error, stopping retries`);
                    throw error;
                }
                
                // If this was the last attempt, throw the error
                if (attempt === maxRetries + 1) {
                    this.debugLog(`[Retry] ${operationName} - All ${maxRetries + 1} attempts failed`);
                    throw lastError;
                }
                
                // Calculate delay with exponential backoff + jitter
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
                this.debugLog(`[Retry] ${operationName} - Waiting ${Math.round(delayMs)}ms before retry...`);
                
                await this.sleep(delayMs);
            }
        }
        
        throw lastError;
    }

    /**
     * Check if an error is retryable
     */
    private isRetryableError(error: any): boolean {
        // Network/connection errors - retryable
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return true;
        }
        
        // HTTP status codes that are retryable
        if (error.response?.status) {
            const status = error.response.status;
            
            // 401 Unauthorized - Authentication issues are NOT retryable
            // This needs immediate user attention (re-authentication)
            if (status === 401) {
                this.debugLog(`❌ 401 Unauthorized - Authentication failed. Not retryable.`);
                return false;
            }
            
            // Retryable HTTP status codes
            if (status === 429 || // Too Many Requests
                status === 502 || // Bad Gateway
                status === 503 || // Service Unavailable
                status === 504 || // Gateway Timeout
                status >= 500) {  // Other 5xx server errors
                return true;
            }
            
            // 4xx client errors are generally not retryable (bad requests, auth issues, etc.)
            if (status >= 400 && status < 500) {
                return false;
            }
        }
        
        // Timeout errors - retryable
        if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
            return true;
        }
        
        // SOQL errors with specific patterns are not retryable
        if (error.message?.includes('Invalid SOQL') || 
            error.message?.includes('MALFORMED_QUERY') ||
            error.message?.includes('INVALID_FIELD') ||
            error.response?.data?.[0]?.errorCode) {
            return false;
        }
        
        // For unknown errors, be more conservative - don't retry by default
        // This prevents infinite retries on genuine code bugs
        return false;
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Enhanced debug logging - writes to both console and VS Code output channel
     */
    private debugLog(message: string, data?: any): void {
        // Only log critical information (payloads and responses)
        const isCritical = message.includes('Full Request Payload') || 
                          message.includes('Place Sales Transaction API Response') ||
                          message.includes('Response Data:') ||
                          message.includes('Status:');
        
        if (!isCritical) {
            return; // Skip non-critical debug logs
        }
        
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Log critical information to output channel
        const outputChannel = (global as any).revCloudBlueprintLogger;
        if (outputChannel) {
            outputChannel.appendLine(logMessage);
            if (data) {
                outputChannel.appendLine(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));
            }
        }
    }

    /**
     * Enhanced error logging - writes to both console and VS Code output channel
     */
    private errorLog(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [ERROR] ${message}`;
        
        // Always log to console
        console.error(logMessage);
        if (data) {
            console.error(data);
        }
        
        // Also log to VS Code Output channel if available
        const outputChannel = (global as any).revCloudBlueprintLogger;
        if (outputChannel) {
            outputChannel.appendLine(logMessage);
            if (data) {
                outputChannel.appendLine(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));
            }
        }
    }

    /**
     * Get configured API version or default
     */
    private getApiVersion(): string {
        return ApiUtilityService.getApiVersion();
    }

    /**
     * Get or create HTTP client for org using centralized factory
     */
    private async getClient(orgUsernameOrAlias: string): Promise<AxiosInstance> {
        return await HttpClientFactory.getClient(orgUsernameOrAlias, this.auth, 30000);
    }

    /**
     * Execute SOQL query
     */
    async query(orgUsernameOrAlias: string, soql: string): Promise<SoqlResult> {
        try {
            Logger.debug(`Executing SOQL query in org: ${orgUsernameOrAlias}`, undefined, 'SalesforceAPI');
            Logger.debug(`Query: ${soql}`, undefined, 'SalesforceAPI');
            
            const client = await this.getClient(orgUsernameOrAlias);
            const response: AxiosResponse<SoqlResult> = await this.executeWithRetry(
                () => client.get('/query', { params: { q: soql } }),
                'SOQL Query',
                2 // max retries for queries
            );
            
            Logger.debug(`Query successful. Records returned: ${response.data.records?.length || 0}`, undefined, 'SalesforceAPI');
            
            // Debug: Log the actual response for Quote queries to diagnose missing fields
            if (soql.includes('FROM Quote') && response.data.records?.length > 0) {
                Logger.debug(`🔍 QUOTE QUERY DEBUG - Full API Response:`, response.data, 'SalesforceAPI');
                Logger.debug(`🔍 QUOTE QUERY DEBUG - First Record Fields:`, Object.keys(response.data.records[0]), 'SalesforceAPI');
            }
            return response.data;
        } catch (error: any) {
            // Handle 401 authentication errors specifically
            if (error.response?.status === 401) {
                this.debugLog(`🔑 Authentication failed for org: ${orgUsernameOrAlias}. Clearing cached client.`);
                // Clear the cached client so it will be recreated with fresh token on next request
                HttpClientFactory.clearClientForOrg(orgUsernameOrAlias);
                // Also clear auth cache
                this.auth.clearCache();
            }
            
            console.error('[ERROR] SOQL Query failed:', {
                org: orgUsernameOrAlias,
                query: soql,
                status: error.response?.status,
                statusText: error.response?.statusText,
                errorData: error.response?.data,
                errorMessage: error.message
            });
            
            // Check for specific ConstraintEngineNodeStatus__c field error and retry without it
            const errorText = this.extractErrorMessage(error);
            if (errorText.includes("No such column 'ConstraintEngineNodeStatus__c'") && 
                soql.includes('ConstraintEngineNodeStatus__c')) {
                
                Logger.warn(`⚠️ ConstraintEngineNodeStatus__c field not available in org ${orgUsernameOrAlias} (Advance Configurator not enabled). Retrying query without this field.`, undefined, 'SalesforceAPI');
                
                // Remove ConstraintEngineNodeStatus__c from the query and retry
                const modifiedSoql = this.removeConstraintEngineNodeStatusFromQuery(soql);
                Logger.debug(`🔄 Retrying query without ConstraintEngineNodeStatus__c: ${modifiedSoql}`, undefined, 'SalesforceAPI');
                
                try {
                    const retryClient = await this.getClient(orgUsernameOrAlias);
                    const retryResponse: AxiosResponse<SoqlResult> = await this.executeWithRetry(
                        () => retryClient.get('/query', { params: { q: modifiedSoql } }),
                        'SOQL Query (retry without ConstraintEngineNodeStatus__c)',
                        2
                    );
                    
                    Logger.info(`✅ Query successful after removing ConstraintEngineNodeStatus__c. Records returned: ${retryResponse.data.records?.length || 0}`, undefined, 'SalesforceAPI');
                    return retryResponse.data;
                } catch (retryError: any) {
                    Logger.error(`❌ Retry query also failed: ${retryError.message}`, retryError, 'SalesforceAPI');
                    throw new Error(`SOQL Query failed even after removing ConstraintEngineNodeStatus__c: ${this.extractErrorMessage(retryError)}`);
                }
            }
            
            // For other errors, throw the original error
            const errorMessage = `SOQL Query failed: ${errorText}`;
            throw new Error(errorMessage);
        }
    }

    /**
     * Extract error message from API error response
     */
    private extractErrorMessage(error: any): string {
        if (error.response?.data) {
            if (Array.isArray(error.response.data)) {
                return error.response.data.map((e: any) => e.message).join(', ');
            } else if (error.response.data.message) {
                return error.response.data.message;
            } else {
                return 'API error response';
            }
        }
        return error.message || 'Unknown error';
    }

    /**
     * Remove ConstraintEngineNodeStatus__c field from SOQL query
     */
    private removeConstraintEngineNodeStatusFromQuery(soql: string): string {
        // Handle different formatting scenarios for the field in SELECT clause
        return soql
            // Remove field with comma after it: "ConstraintEngineNodeStatus__c, "
            .replace(/ConstraintEngineNodeStatus__c\s*,\s*/g, '')
            // Remove field with comma before it: ", ConstraintEngineNodeStatus__c"
            .replace(/,\s*ConstraintEngineNodeStatus__c\s*/g, '')
            // Remove field if it's the only field (edge case): "ConstraintEngineNodeStatus__c"
            .replace(/^\s*ConstraintEngineNodeStatus__c\s*$/g, 'Id')
            // Clean up any double commas that might result
            .replace(/,\s*,/g, ',')
            // Clean up any trailing commas before FROM
            .replace(/,\s*FROM/g, ' FROM')
            // Clean up any leading commas after SELECT
            .replace(/SELECT\s*,/g, 'SELECT ');
    }

    /**
     * Create a record using REST API
     */
    async createRecord(orgUsernameOrAlias: string, sobjectType: string, recordData: any): Promise<{ success: boolean; id?: string; errors?: string[] }> {
        try {
            Logger.debug(`Creating ${sobjectType} record in org: ${orgUsernameOrAlias}`, undefined, 'SalesforceAPI');
            
            const client = await this.getClient(orgUsernameOrAlias);
            const response = await client.post(`/sobjects/${sobjectType}`, recordData);
            
            if (response.status === 201 && response.data.success) {
                Logger.debug(`${sobjectType} record created successfully: ${response.data.id}`, undefined, 'SalesforceAPI');
                return {
                    success: true,
                    id: response.data.id
                };
            } else {
                Logger.error(`Failed to create ${sobjectType} record`, response.data, 'SalesforceAPI');
                return {
                    success: false,
                    errors: response.data.errors || ['Unknown error']
                };
            }
        } catch (error: any) {
            Logger.error(`Error creating ${sobjectType} record`, error, 'SalesforceAPI');
            
            const errorMessages: string[] = [];
            if (error.response?.data) {
                const data = error.response.data;
                if (Array.isArray(data)) {
                    data.forEach((err: any) => {
                        if (err.message) {
                            errorMessages.push(err.message);
                        }
                    });
                } else if (data.message) {
                    errorMessages.push(data.message);
                }
            }
            
            return {
                success: false,
                errors: errorMessages.length > 0 ? errorMessages : [error.message || 'Unknown error']
            };
        }
    }

    /**
     * Validate that specific fields can be queried on an object
     */
    private async validateFields(orgUsernameOrAlias: string, objectName: string, fields: string[]): Promise<string[]> {
        Logger.debug(`Validating ${fields.length} fields on ${objectName}...`, undefined, 'SalesforceAPI');
        
        
        const validFields: string[] = [];
        
        // Test fields in batches to avoid query limits
        const batchSize = 10;
        for (let i = 0; i < fields.length; i += batchSize) {
            const batch = fields.slice(i, i + batchSize);
            try {
                const testQuery = `SELECT ${batch.join(', ')} FROM ${objectName} LIMIT 1`;
                await this.query(orgUsernameOrAlias, testQuery);
                
                // If batch succeeds, all fields in batch are valid
                validFields.push(...batch);
            } catch (error: any) {
                // If batch fails, test individual fields
                for (const field of batch) {
                    try {
                        const singleQuery = `SELECT ${field} FROM ${objectName} LIMIT 1`;
                        await this.query(orgUsernameOrAlias, singleQuery);
                        validFields.push(field);
                    } catch (singleError: any) {
                        // Field is invalid, skip it
                    }
                }
            }
        }
        
        return validFields;
    }

    /**
     * Discover all currency and quantity fields for Quote and QuoteLine objects
     */
    private async discoverCurrencyAndQuantityFields(orgUsernameOrAlias: string, quoteLineObjectName: string): Promise<{
        quoteFields: string[],
        quoteLineFields: string[]
    }> {
        
        try {
            // Import utilities for async exec
            const { promisify } = require('util');
            const { exec } = require('child_process');
            const execAsync = promisify(exec);

            // Describe Quote object
            const quoteDescribeCmd = `sfdx force:schema:sobject:describe -s Quote --json -u ${orgUsernameOrAlias}`;
            const { stdout: quoteStdout } = await execAsync(quoteDescribeCmd);
            const quoteDescribe = JSON.parse(quoteStdout);
            
            // Describe QuoteLine object
            const quoteLineDescribeCmd = `sfdx force:schema:sobject:describe -s ${quoteLineObjectName} --json -u ${orgUsernameOrAlias}`;
            const { stdout: quoteLineStdout } = await execAsync(quoteLineDescribeCmd);
            const quoteLineDescribe = JSON.parse(quoteLineStdout);

            // Build Quote field list using FieldDiscoveryService (configuration-driven)
            const quoteFields: string[] = FieldDiscoveryService.getAllRequiredFields('quote');
            
            // Add Revenue Cloud compatibility fields
            const revCloudQuoteFields = this.getRevCloudRequiredFields(quoteDescribe.result.fields);
            quoteFields.push(...revCloudQuoteFields);

            // Deduplicate the fields array to avoid query errors
            const uniqueQuoteFields = [...new Set(quoteFields)];

            // Build QuoteLineItem field list using FieldDiscoveryService (configuration-driven)
            const quoteLineFields: string[] = FieldDiscoveryService.getAllRequiredFields('quoteLineItem');
                
            // Add Revenue Cloud compatibility fields
            const revCloudFields = this.getRevCloudRequiredFields(quoteLineDescribe.result.fields);
            quoteLineFields.push(...revCloudFields);

            // Validate discovered fields to ensure they can be queried
            const [validQuoteFields, validQuoteLineFields] = await Promise.all([
                this.validateFields(orgUsernameOrAlias, 'Quote', uniqueQuoteFields),
                this.validateFields(orgUsernameOrAlias, quoteLineObjectName, [...new Set(quoteLineFields)])
            ]);
            
            
            return { 
                quoteFields: validQuoteFields, 
                quoteLineFields: validQuoteLineFields 
            };

        } catch (error: any) {
            try {
                // Progressive fallback: Start with safe fields, then validate additional ones
                
                const safeQuoteFields = ['Id', 'Name', 'Account.Id', 'Account.Name', 'GrandTotal', 'Discount', 'Subtotal', 'TotalPrice', 'Tax', 'ShippingHandling'];
                const additionalQuoteFields = ['Status', 'CreatedDate', 'LastModifiedDate', 'StartDate', 'Pricebook2Id', 'OpportunityId', 'ContactId', 'LastPricedDate'];
                
                const safeQuoteLineFields = ['Id', 'Product2.Id', 'Product2.Name', 'Product2.ProductCode', 'Quantity', 'UnitPrice', 'TotalPrice', 'Discount', 'ListPrice', 'Subtotal'];
                const additionalQuoteLineFields = ['QuoteId', 'LineNumber', 'SortOrder', 'Description', 'CreatedDate', 'LastModifiedDate', 'ServiceDate', 'PricebookEntryId', 'NetUnitPrice', 'NetTotalPrice'];
                
                // Validate additional fields
                const [validAdditionalQuoteFields, validAdditionalQuoteLineFields] = await Promise.all([
                    this.validateFields(orgUsernameOrAlias, 'Quote', additionalQuoteFields),
                    this.validateFields(orgUsernameOrAlias, quoteLineObjectName, additionalQuoteLineFields)
                ]);
                
                const progressiveResult = {
                    quoteFields: [...safeQuoteFields, ...validAdditionalQuoteFields],
                    quoteLineFields: [...safeQuoteLineFields, ...validAdditionalQuoteLineFields]
                };
                
                return progressiveResult;
                
            } catch (progressiveError: any) {
                // Final fallback: Minimal guaranteed fields
                const minimalResult = {
                    quoteFields: ['Id', 'Name', 'Account.Id', 'Account.Name', 'GrandTotal', 'Discount', 'Subtotal', 'TotalPrice'],
                    quoteLineFields: ['Id', 'Product2.Id', 'Product2.Name', 'Product2.ProductCode', 'Quantity', 'UnitPrice', 'TotalPrice', 'ListPrice']
                };
                
                
                return minimalResult;
            }
        }
    }

    /**
     * Get Revenue Cloud specific fields that actually exist in the org using dynamic discovery
     */
    private getRevCloudRequiredFields(availableFields: any[]): string[] {
        const revCloudFields: string[] = []; // Simplified: no pattern matching, fields come from configuration
        
        // Also look for common date/subscription fields that might not match patterns
        const fieldNames = availableFields.map((field: any) => field.name);
        const commonFields = [
            'EndDate', 'StartDate', 'ServiceDate', 
            'SubscriptionTerm', 'SubscriptionType', 
            'BillingFrequency', 'ChargeType',
            'PeriodBoundary', 'PeriodBoundaryDay', 'PeriodBoundaryStartMonth' // Critical for Revenue Cloud billing
        ];
        
        commonFields.forEach(commonField => {
            if (fieldNames.includes(commonField) && !revCloudFields.includes(commonField)) {
                revCloudFields.push(commonField);
            }
        });
        
        
        return revCloudFields;
    }

    /**
     * Detect the correct quote line object name (QuoteLine vs QuoteLineItem)
     */
    private async detectQuoteLineObjectName(orgUsernameOrAlias: string): Promise<string> {
        const possibleNames = ['QuoteLineItem', 'QuoteLine'];
        
        for (const objectName of possibleNames) {
            try {
                // Try a simple SOQL query to see if the object exists
                const testQuery = `SELECT Id FROM ${objectName} LIMIT 1`;
                await this.query(orgUsernameOrAlias, testQuery);

                return objectName;
            } catch (error: any) {
                continue;
            }
        }
        
        // If none found, default to QuoteLineItem (most common)
        console.warn('[WARN] Could not detect quote line object, defaulting to QuoteLineItem');
        return 'QuoteLineItem';
    }

    /**
     * Get opportunity data by ID
     */
    async getOpportunityData(orgUsernameOrAlias: string, opportunityId: string): Promise<OpportunityData> {
        // Validate and sanitize Salesforce ID to prevent SOQL injection
        const validatedOpportunityId = ValidationService.validateSalesforceId(opportunityId, 'Opportunity ID');

        const opportunityQuery = `
            SELECT Id, Name, AccountId, Account.Id, Account.Name, StageName, Amount, CloseDate
            FROM Opportunity
            WHERE Id = '${validatedOpportunityId}'
        `;

        try {
            const result = await this.query(orgUsernameOrAlias, opportunityQuery);

            if (result.records.length === 0) {
                throw new Error(`Opportunity not found with ID: ${opportunityId}. Please verify the Opportunity ID exists and you have access to it.`);
            }

            const opportunity = result.records[0];
            return opportunity as OpportunityData;
        } catch (error: any) {
            console.error('[ERROR] Failed to fetch opportunity data:', error);
            throw new Error(`Failed to fetch opportunity data: ${error.message}`);
        }
    }

    /**
     * Get quote data with quote lines
     */
    async getQuoteData(orgUsernameOrAlias: string, quoteId: string): Promise<QuoteData> {
        // Validate and sanitize Salesforce ID to prevent SOQL injection
        const validatedQuoteId = ValidationService.validateSalesforceId(quoteId, 'Quote ID');

        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const externalIdField = config.get<string>('pricing.productExternalIdField', 'ProductCode');

        // Step 1: Detect the correct quote line object name
        const quoteLineObjectName = await this.detectQuoteLineObjectName(orgUsernameOrAlias);
        // Step 2: Detect org features for field availability
        let orgFeatures: OrgFeatures | undefined;
        try {
            orgFeatures = await OrgFeatureService.getOrgFeatures(this, orgUsernameOrAlias);
        } catch (error: any) {
            orgFeatures = undefined;
        }

        // Step 3: Build field lists using configuration-driven approach with feature detection
        let quoteFields: string[] = [];
        let quoteLineFields: string[] = [];
        
        try {
            quoteFields = FieldDiscoveryService.getAllRequiredFields('quote', orgFeatures);
        } catch (error: any) {
            // Fallback to minimal essential fields only
            quoteFields = FieldDiscoveryService.getEssentialQuoteFields();
        }
        
        try {
            quoteLineFields = FieldDiscoveryService.getAllRequiredFields('quoteLineItem', orgFeatures);
        } catch (error: any) {
            // This is less critical since QuoteLineItem fields already work
            quoteLineFields = FieldDiscoveryService.getEssentialQuoteLineItemFields();
        }
        
        // Build SOQL queries (using validated quote ID)
        const quoteQuery = `
            SELECT ${quoteFields.join(', ')}
            FROM Quote
            WHERE Id = '${validatedQuoteId}'
        `;

        const quoteLineQuery = `
            SELECT ${quoteLineFields.join(', ')}
            FROM ${quoteLineObjectName}
            WHERE QuoteId = '${validatedQuoteId}'
            ORDER BY SortOrder, CreatedDate
        `;
        
        try {
            const [quoteResult, quoteLinesResult] = await Promise.all([
                this.query(orgUsernameOrAlias, quoteQuery),
                this.query(orgUsernameOrAlias, quoteLineQuery)
            ]);

            if (quoteResult.records.length === 0) {
                throw new Error(`Quote not found with ID: ${quoteId}. Please verify the Quote ID exists and you have access to it.`);
            }

            const quote = quoteResult.records[0];
            const quoteLines = quoteLinesResult.records as QuoteLineData[];
            

            // Now try to get the external ID field separately to avoid query failures
            let enrichedQuoteLines = quoteLines;
            try {
                const externalIdQuery = `
                    SELECT Id, Product2.${externalIdField}
                    FROM ${quoteLineObjectName}
                    WHERE QuoteId = '${quoteId}'
                `;
                const externalIdResult = await this.query(orgUsernameOrAlias, externalIdQuery);

                // Merge external ID data with quote line data
                enrichedQuoteLines = quoteLines.map((line: any) => {
                    const externalIdRecord = externalIdResult.records.find((ext: any) => ext.Id === line.Id);
                    return {
                        ...line,
                        Product2: {
                            ...line.Product2,
                            [externalIdField]: externalIdRecord?.Product2?.[externalIdField] || line.Product2?.ProductCode || null
                        }
                    };
                });
            } catch (externalIdError: any) {
                console.warn(`[WARN] Could not fetch external ID field '${externalIdField}':`, externalIdError.message);
                
                // Use ProductCode as fallback for external ID
                enrichedQuoteLines = quoteLines.map((line: any) => ({
                    ...line,
                    Product2: {
                        ...line.Product2,
                        [externalIdField]: line.Product2?.ProductCode || null
                    }
                }));
            }

            // Step 3: Fetch QuoteLineItemAttribute data if available
            let finalQuoteLines = enrichedQuoteLines;
            try {
                // First, let's verify we can find the quote line IDs
                const lineIdQuery = `SELECT Id FROM ${quoteLineObjectName} WHERE QuoteId = '${quoteId}'`;
                const lineIdResult = await this.query(orgUsernameOrAlias, lineIdQuery);

                if (lineIdResult.records.length > 0) {
                    const lineIds = lineIdResult.records.map((r: any) => r.Id);
                    
                    // Now test the attribute query - include DataType and AttributeValue for text attributes
                    // Note: AttributePicklistValue.DeveloperName removed as it doesn't exist in most orgs
                    const attributeQuery = `
                        SELECT QuoteLineItemId, AttributeDefinitionId, AttributeDefinition.Code, AttributeDefinition.Name, AttributeDefinition.DeveloperName, AttributeDefinition.DataType,
                               AttributePicklistValueId, AttributePicklistValue.Code, AttributePicklistValue.Name,
                               AttributeValue
                        FROM QuoteLineItemAttribute 
                        WHERE QuoteLineItemId IN (SELECT Id FROM ${quoteLineObjectName} WHERE QuoteId = '${quoteId}')
                        ORDER BY QuoteLineItemId
                    `;

                    let attributeResult: any = await this.query(orgUsernameOrAlias, attributeQuery);
                    
                    // If the subquery doesn't work, try with explicit line IDs
                    if (attributeResult.records.length === 0 && lineIds.length > 0) {
                        const directAttributeQuery = `
                            SELECT QuoteLineItemId, AttributeDefinitionId, AttributeDefinition.Code, AttributeDefinition.Name, AttributeDefinition.DeveloperName, AttributeDefinition.DataType,
                                   AttributePicklistValueId, AttributePicklistValue.Code, AttributePicklistValue.Name,
                                   AttributeValue
                            FROM QuoteLineItemAttribute
                            WHERE QuoteLineItemId IN ('${lineIds.join("', '")}')
                            ORDER BY QuoteLineItemId
                        `;

                        const directResult: any = await this.query(orgUsernameOrAlias, directAttributeQuery);

                        if (directResult.records.length > 0) {
                            // Use the direct result
                            attributeResult.records = directResult.records;
                        }
                    }

                    if (attributeResult.records.length > 0) {
                    
                    // Group attributes by QuoteLineItemId
                    const attributeMap = new Map<string, any[]>();
                    attributeResult.records.forEach((attr: any) => {
                        const lineItemId = attr.QuoteLineItemId;
                        if (!attributeMap.has(lineItemId)) {
                            attributeMap.set(lineItemId, []);
                        }
                        attributeMap.get(lineItemId)!.push(attr);
                    });

                    // Enrich quote lines with attribute data
                    finalQuoteLines = enrichedQuoteLines.map((line: any) => {
                        const lineAttributes = attributeMap.get(line.Id) || [];
                        const enrichedLine = {
                            ...line,
                            QuoteLineItemAttributes: lineAttributes
                        };
                        return enrichedLine;
                    });
                    }
                }
            } catch (attributeError: any) {
                console.error(`[ERROR] 💥 QuoteLineItemAttribute query failed: ${attributeError.message}`);
                console.error(`[ERROR] Stack trace:`, attributeError.stack);
                // finalQuoteLines remains as enrichedQuoteLines
            }
            
            return {
                Id: quote.Id,
                Name: quote.Name,
                Account: quote.Account,
                Pricebook2Id: quote.Pricebook2Id,
                OpportunityId: quote.OpportunityId, // CRITICAL: Include OpportunityId for snapshot metadata
                CurrencyIsoCode: quote.CurrencyIsoCode, // CRITICAL: Include currency for PricebookEntry matching
                StartDate: quote.StartDate, // Include start date for quote creation
                GrandTotal: quote.GrandTotal || 0,
                // Include any additional configured fields dynamically
                ...this.getConfiguredQuoteFields(quote),
                Discount: quote.Discount || 0,
                QuoteLines: finalQuoteLines
            };
        } catch (error: any) {
            console.error('[ERROR] Failed to fetch quote data:', error);
            throw new Error(`Failed to fetch quote data: ${error.message}`);
        }
    }

    /**
     * Validate products exist in target org using snapshot line items
     */
    async validateProducts(orgUsernameOrAlias: string, lineItems: any[], externalIdField: string): Promise<string[]> {
        // Separate by identifier type
        const externalIdItems = lineItems.filter(item => item.productIdentifier.type === 'externalId');
        const productIdItems = lineItems.filter(item => item.productIdentifier.type === 'productId');
        
        let foundIdentifiers: string[] = [];
        
        // Validate external ID items using the configured field
        if (externalIdItems.length > 0) {
            const externalIdValues = externalIdItems.map(item => item.productIdentifier.value);

            try {
                const externalIdList = externalIdValues.map(id => `'${id}'`).join(',');
                const externalQuery = `
                    SELECT ${externalIdField}, Id, Name
                    FROM Product2
                    WHERE ${externalIdField} IN (${externalIdList}) AND IsActive = true
                `;

                const externalResult = await this.query(orgUsernameOrAlias, externalQuery);
                const foundExternals = externalResult.records.map(record => record[externalIdField]);
                foundIdentifiers = foundIdentifiers.concat(foundExternals);
                
            } catch (error: any) {
                console.error(`[ERROR] Failed to query products by external ID field '${externalIdField}': ${error.message}`);
                // Don't throw here, continue to check Product IDs
            }
        }
        
        // Validate Product ID items using Id field
        if (productIdItems.length > 0) {
            const productIdValues = productIdItems.map(item => item.productIdentifier.value);

            try {
                const productIdList = productIdValues.map(id => `'${id}'`).join(',');
                const idQuery = `
                    SELECT Id, Name, ProductCode, ${externalIdField}
                    FROM Product2
                    WHERE Id IN (${productIdList}) AND IsActive = true
                `;

                const idResult = await this.query(orgUsernameOrAlias, idQuery);
                const foundIds = idResult.records.map(record => record.Id);
                foundIdentifiers = foundIdentifiers.concat(foundIds);
                
            } catch (error: any) {
                console.error(`[ERROR] Failed to query products by Product ID: ${error.message}`);
                // Don't throw here, we'll report missing products below
            }
        }
        
        // Check which identifiers are missing
        const allIdentifiers = lineItems.map(item => item.productIdentifier.value);
        const missingIds = allIdentifiers.filter(id => !foundIdentifiers.includes(id));

        return missingIds;
    }

    /**
     * Resolve AttributeDefinition external IDs to actual IDs in target org
     */
    async resolveAttributeDefinitionIds(orgUsernameOrAlias: string, externalIds: string[], externalIdField: string = 'Code'): Promise<Map<string, string>> {
        this.debugLog(`Resolving ${externalIds.length} AttributeDefinition external IDs using field: ${externalIdField}`);
        
        if (externalIds.length === 0) {
            return new Map();
        }

        const quotedIds = externalIds.map(id => `'${(id || '').replace(/'/g, "\\'")}'`).join(',');
        const soql = `SELECT Id, ${externalIdField} FROM AttributeDefinition WHERE ${externalIdField} IN (${quotedIds})`;
        
        try {
            const result = await this.query(orgUsernameOrAlias, soql);
            const idMap = new Map<string, string>();
            
            result.records.forEach((record: any) => {
                const externalId = record[externalIdField];
                const salesforceId = record.Id;
                if (externalId && salesforceId) {
                    idMap.set(externalId, salesforceId);
                }
            });
            
            this.debugLog(`Resolved ${idMap.size} AttributeDefinition IDs out of ${externalIds.length} requested`);
            return idMap;
        } catch (error: any) {
            this.errorLog(`Failed to resolve AttributeDefinition external IDs: ${error.message}`);
            throw new Error(`Failed to resolve AttributeDefinition external IDs using field '${externalIdField}': ${error.message}`);
        }
    }

    /**
     * Resolve AttributePicklistValue external IDs to actual IDs in target org
     */
    async resolveAttributePicklistValueIds(orgUsernameOrAlias: string, externalIds: string[], externalIdField: string = 'Code'): Promise<Map<string, string>> {
        this.debugLog(`Resolving ${externalIds.length} AttributePicklistValue external IDs using field: ${externalIdField}`);
        
        if (externalIds.length === 0) {
            return new Map();
        }

        const quotedIds = externalIds.map(id => `'${(id || '').replace(/'/g, "\\'")}'`).join(',');
        const soql = `SELECT Id, ${externalIdField} FROM AttributePicklistValue WHERE ${externalIdField} IN (${quotedIds})`;
        
        try {
            const result = await this.query(orgUsernameOrAlias, soql);
            const idMap = new Map<string, string>();
            
            result.records.forEach((record: any) => {
                const externalId = record[externalIdField];
                const salesforceId = record.Id;
                if (externalId && salesforceId) {
                    idMap.set(externalId, salesforceId);
                }
            });
            
            this.debugLog(`Resolved ${idMap.size} AttributePicklistValue IDs out of ${externalIds.length} requested`);
            return idMap;
        } catch (error: any) {
            this.errorLog(`Failed to resolve AttributePicklistValue external IDs: ${error.message}`);
            throw new Error(`Failed to resolve AttributePicklistValue external IDs using field '${externalIdField}': ${error.message}`);
        }
    }

    /**
     * Place quote using Revenue Cloud Place Sales Transaction API
     * Based on: https://developer.salesforce.com/docs/atlas.en-us.256.0.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/connect_resources_place_sales_transaction.htm
     */
    async placeQuote(orgUsernameOrAlias: string, request: PlaceQuoteRequest): Promise<PlaceQuoteResponse> {
        try {
            this.debugLog(`============ PLACE SALES TRANSACTION API DEBUG ============`);
            this.debugLog(`Target Org: ${orgUsernameOrAlias}`);
            this.debugLog(`Creating HTTP client for org...`);
            
            const client = await this.getClient(orgUsernameOrAlias);
            const apiVersion = this.getApiVersion();
            
            // Log the full endpoint details
            const baseURL = client.defaults.baseURL;
            const endpoint = '/connect/rev/sales-transaction/actions/place';
            const fullURL = `${baseURL}${endpoint}`;
            
            this.debugLog(`Revenue Cloud Place Sales Transaction API Details:`);
            this.debugLog(`  API Version: ${apiVersion}`);
            this.debugLog(`  Base URL: ${baseURL}`);
            this.debugLog(`  Endpoint: ${endpoint}`);
            this.debugLog(`  Full URL: ${fullURL}`);
            this.debugLog(`  Request Method: POST`);
            this.debugLog(`  Documentation: https://developer.salesforce.com/docs/atlas.en-us.256.0.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/connect_resources_place_sales_transaction.htm`);
            this.debugLog(`  Updated Endpoint: Confirmed by product team - using actions/place path`);
            
            // Log the request payload  
            this.debugLog(`Place Sales Transaction API Request Structure:`);
            this.debugLog(`  Pricing Preference: ${request.pricingPref || 'system (default)'}`);
            this.debugLog(`  Catalog Rates Preference: ${request.catalogRatesPref || 'skip (default)'}`);
            this.debugLog(`  Configuration Method: ${request.configurationPref?.configurationMethod || 'Skip (default)'}`);
            if (request.configurationPref?.configurationOptions) {
                this.debugLog(`  Configuration Options: ${JSON.stringify(request.configurationPref.configurationOptions)}`);
            }
            this.debugLog(`  Graph ID: ${request.graph.graphId}`);
            this.debugLog(`  Records Count: ${request.graph.records.length}`);
            
            // Log each record in the graph
            request.graph.records.forEach((record, index) => {
                this.debugLog(`  Record ${index + 1}:`);
                this.debugLog(`    Reference ID: ${record.referenceId}`);
                this.debugLog(`    Type: ${record.record.attributes.type}`);
                this.debugLog(`    Method: ${record.record.attributes.method}`);
                if (record.record.attributes.id) {
                    this.debugLog(`    ID: ${record.record.attributes.id}`);
                }
                if (record.record.Name) {
                    this.debugLog(`    Name: ${record.record.Name}`);
                }
                if (record.record.Product2Id) {
                    this.debugLog(`    Product2Id: ${record.record.Product2Id}`);
                    this.debugLog(`    Quantity: ${record.record.Quantity}`);
                }
            });
            
            this.debugLog(`Full Request Payload:`, request);
            this.debugLog(`Sending POST request to Revenue Cloud Place Sales Transaction API...`);
            
            // Send request to Revenue Cloud Place Sales Transaction API with retry logic
            const response = await this.executeWithRetry(
                () => client.post(endpoint, request),
                'Place Sales Transaction API',
                3 // max retries
            );
            
            this.debugLog(`Place Sales Transaction API Response:`);
            this.debugLog(`  Status: ${response.status} ${response.statusText}`);
            this.debugLog(`  Response Data:`, response.data);

            // ENHANCED DEBUG: Detailed response analysis to understand structure
            this.debugLog(`🔍 DETAILED RESPONSE ANALYSIS:`);
            this.debugLog(`  Response structure keys: ${Object.keys(response.data)}`);
            this.debugLog(`  hasErrors: ${response.data.hasErrors}`);
            this.debugLog(`  isSuccess: ${response.data.isSuccess}`);
            this.debugLog(`  salesTransactionId: ${response.data.salesTransactionId}`);
            this.debugLog(`  errorResponse: ${JSON.stringify(response.data.errorResponse)}`);
            this.debugLog(`  errorResponse.length: ${response.data.errorResponse?.length || 'undefined'}`);
            
            if (response.data.compositeResponse) {
                this.debugLog(`  compositeResponse exists with ${response.data.compositeResponse.length} items`);
                response.data.compositeResponse.forEach((item: any, index: number) => {
                    this.debugLog(`    [${index}] referenceId: ${item.referenceId}, httpStatusCode: ${item.httpStatusCode}`);
                    if (item.body?.errors) {
                        this.debugLog(`    [${index}] errors: ${JSON.stringify(item.body.errors)}`);
                    }
                    if (item.body?.id) {
                        this.debugLog(`    [${index}] created record ID: ${item.body.id}`);
                    }
                });
            }

            // Parse the response - Handle both response formats
            const isSuccessful = (response.data.hasErrors === false) || (response.data.isSuccess === true);
            
            if (response.data && isSuccessful) {
                // Success - extract quote ID from the response
                let quoteId = '';
                
                // First, check for salesTransactionId (new format)
                if (response.data.salesTransactionId) {
                    quoteId = response.data.salesTransactionId;
                    this.debugLog(`📋 Found quote ID in salesTransactionId: ${quoteId}`);
                }
                
                // Look for quote ID in compositeResponse or results
                if (!quoteId && response.data.compositeResponse) {
                    const quoteRecord = response.data.compositeResponse.find((item: any) => 
                        item.body && item.body.id && item.body.id.startsWith('0Q0')
                    );
                    quoteId = quoteRecord?.body?.id || '';
                    if (quoteId) this.debugLog(`📋 Found quote ID in compositeResponse: ${quoteId}`);
                }
                
                // Alternative: Look in results array
                if (!quoteId && response.data.results) {
                    const quoteResult = response.data.results.find((item: any) =>
                        item.id && item.id.startsWith('0Q0')
                    );
                    quoteId = quoteResult?.id || '';
                    if (quoteId) this.debugLog(`📋 Found quote ID in results: ${quoteId}`);
                }
                
                // Fallback: Look for any 18-character ID starting with 0Q0
                if (!quoteId) {
                    const responseString = JSON.stringify(response.data);
                    const quoteIdMatch = responseString.match(/0Q0[a-zA-Z0-9]{15}/);
                    quoteId = quoteIdMatch ? quoteIdMatch[0] : '';
                    if (quoteId) this.debugLog(`📋 Found quote ID via pattern match`);
                }
                
                // Final check for errors even when isSuccess is true
                if (response.data.errorResponse && response.data.errorResponse.length > 0) {
                    this.debugLog(`⚠️  WARNING: API shows success but errorResponse contains items:`);
                    response.data.errorResponse.forEach((err: any, index: number) => {
                        this.debugLog(`    Error ${index + 1}: ${err.errorCode} - ${err.message} (referenceId: ${err.referenceId})`);
                    });
                    const errorMessages = response.data.errorResponse.map((err: any) => {
                        // Enhanced messaging for common permission issues
                        if (err.errorCode === 'REQUIRED_FEATURE_MISSING' && err.message.includes('usage-based products')) {
                            return [
                                `${err.errorCode}: ${err.message}`,
                                '',
                                '💡 This error indicates the org lacks Revenue Cloud licensing/features.',
                                '🔧 Resolution options:',
                                '   1. Contact your Salesforce admin to enable Revenue Cloud',
                                '   2. Ensure the org has "Revenue Lifecycle Management" license',
                                '   3. Verify "Usage-Based Products" feature is enabled',
                                '   4. Try testing with a different org that has Revenue Cloud enabled',
                                '',
                                '📋 For basic testing, consider using standard Quote REST API instead'
                            ].join('\n');
                        }
                        return `${err.errorCode}: ${err.message} (${err.referenceId})`;
                    });
                    
                    // Parse detailed errors for user-friendly display
                    const detailedErrors = this.parseAPIErrors(response.data.errorResponse);
                    
                    return {
                        quoteId: quoteId,
                        success: false,  // Mark as failure since there are errors
                        errors: errorMessages,
                        detailedErrors: detailedErrors
                    };
                }
                
                this.debugLog(`✅ Place Sales Transaction API succeeded! Quote ID: ${quoteId}`);
                return {
                    quoteId: quoteId,
                    success: true
                };
            } else {
                // Handle errors
                const errors = response.data.compositeResponse?.map((item: any) => 
                    item.body?.message || JSON.stringify(item.body)
                ).filter(Boolean) || ['Unknown error occurred'];
                
                // Parse detailed errors if available
                let detailedErrors: SalesforceAPIError[] = [];
                if (response.data.errorResponse) {
                    detailedErrors = this.parseAPIErrors(response.data.errorResponse);
                }
                
                this.debugLog(`❌ Place Sales Transaction API returned errors`);
                this.debugLog(`Errors:`, errors);
                return {
                    quoteId: '',
                    success: false,
                    errors: errors,
                    detailedErrors: detailedErrors
                };
            }
        } catch (error: any) {
            this.errorLog('============ PLACE SALES TRANSACTION API ERROR ============');
            this.errorLog(`Target Org: ${orgUsernameOrAlias}`);
            this.errorLog(`API Version: ${this.getApiVersion()}`);
            
            if (error.response) {
                // Server responded with error status
                this.errorLog(`HTTP Status: ${error.response.status} ${error.response.statusText}`);
                this.errorLog(`Response Headers:`, error.response.headers);
                this.errorLog(`Response Data:`, error.response.data);
                this.errorLog(`Response URL: ${error.response.config?.url}`);
                this.errorLog(`Response Base URL: ${error.response.config?.baseURL}`);
                
                // Debug: Check if this response contains detailed error information
                if (error.response.data?.errorResponse) {
                    this.debugLog(`🔍 Found errorResponse in HTTP ${error.response.status} response`);
                    this.debugLog(`📋 errorResponse content:`, JSON.stringify(error.response.data.errorResponse, null, 2));
                } else {
                    this.debugLog(`⚠️  No errorResponse found in HTTP ${error.response.status} response`);
                    this.debugLog(`📋 Available response data keys:`, Object.keys(error.response.data || {}));
                }
            } else if (error.request) {
                // Request was made but no response received
                this.errorLog(`No response received from server`);
                this.errorLog(`Request config:`, error.config);
            } else {
                // Something else happened
                this.errorLog(`Request setup error: ${error.message}`);
            }
            
            this.errorLog(`Full error object:`, error);
            this.errorLog('================================================');
            
            // Handle specific API errors with detailed messaging
            if (error.response?.status === 404) {
                const detailedError = [
                    'Revenue Cloud Place Sales Transaction API not available (404 Not Found).',
                    '',
                    `🔍 Attempted URL: ${error.response.config?.baseURL}${error.response.config?.url || '/connect/rev/sales-transaction/actions/place'}`,
                    `📖 API Documentation: https://developer.salesforce.com/docs/atlas.en-us.256.0.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/connect_resources_place_sales_transaction.htm`,
                    '',
                    '💡 Possible causes:',
                    '   1. Revenue Cloud is not enabled/licensed in this org',
                    '   2. API version not supported for this endpoint',
                    '   3. User lacks permissions for Revenue Cloud Connect APIs', 
                    '   4. This org type doesn\'t support Revenue Cloud Place Sales Transaction API',
                    '',
                    '🔧 Troubleshooting:',
                    `   1. Try different API version in settings: Revcloud Blueprint → Salesforce → Api Version`,
                    '   2. Verify Revenue Cloud licenses: DynamicRevenueOrchestratorUserPsl, RevenueLifecycleManagementUserPsl',
                    '   3. Check user permissions for Revenue Cloud Connect APIs',
                    '   4. Test with: sf org display --target-org ' + orgUsernameOrAlias,
                    `   5. Try different API versions: v60.0, v62.0, ${this.getApiVersion()}`,
                    '   6. Verify endpoint exists: curl -H "Authorization: Bearer TOKEN" "INSTANCE/services/data/VERSION/connect/rev/"',
                    '   7. Product team confirmed endpoint: /connect/rev/sales-transaction/actions/place'
                ].join('\n');
                
                throw new Error(detailedError);
            }
            
            if (error.response?.status === 401) {
                throw new Error(`Authentication failed (401). Please re-authenticate org: sf auth web login --alias ${orgUsernameOrAlias}`);
            }
            
            if (error.response?.status === 403) {
                throw new Error(`Access forbidden (403). User may lack Revenue Cloud API permissions in org: ${orgUsernameOrAlias}`);
            }
            
            // Check if this is a Salesforce API error response with detailed error information
            let detailedErrors: SalesforceAPIError[] = [];
            let errorMessages: string[] = [];
            
            if (error.response?.data?.errorResponse) {
                // This is a Salesforce API error with detailed error information
                detailedErrors = this.parseAPIErrors(error.response.data.errorResponse);
                errorMessages = error.response.data.errorResponse.map((err: any) => 
                    `${err.errorCode}: ${err.message}`
                );
                this.debugLog(`🔍 Parsed ${detailedErrors.length} detailed errors from API response`);
            } else {
                // Fallback to generic error message
                const errorMessage = error.response?.data?.message || 
                                   error.response?.data?.error || 
                                   error.message || 
                                   'Unknown error';
                
                const statusInfo = error.response?.status ? `HTTP ${error.response.status}` : 'Network';
                errorMessages = [`${statusInfo} Error: ${errorMessage}`];
            }
            
            return {
                quoteId: '',
                success: false,
                errors: errorMessages,
                detailedErrors: detailedErrors
            };
        }
    }

    /**
     * Parse and categorize Salesforce API errors for user-friendly display
     */
    private parseAPIErrors(errorResponse: any): SalesforceAPIError[] {
        const detailedErrors: SalesforceAPIError[] = [];
        
        if (errorResponse && Array.isArray(errorResponse)) {
            errorResponse.forEach((error: any) => {
                const parsedError = this.categorizeError(error);
                detailedErrors.push(parsedError);
            });
        }
        
        return detailedErrors;
    }
    
    /**
     * Categorize a single API error and provide user-friendly messaging
     */
    private categorizeError(error: any): SalesforceAPIError {
        const errorCode = error.errorCode || 'UNKNOWN_ERROR';
        const message = error.message || 'Unknown error occurred';
        const referenceId = error.referenceId;
        
        let category: SalesforceAPIError['category'] = 'system';
        let userFriendlyMessage = '';
        let troubleshootingSteps: string[] = [];
        
        // Categorize based on error code
        switch (errorCode) {
            case 'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY':
                category = 'permissions';
                userFriendlyMessage = 'You don\'t have permission to access a related record (likely the Opportunity).';
                troubleshootingSteps = [
                    'Verify you have read access to the Opportunity record',
                    'Check if the Opportunity exists in the target org',
                    'Ensure your user profile has appropriate Revenue Cloud permissions',
                    'Contact your Salesforce administrator if permissions are missing'
                ];
                break;
                
            case 'REQUIRED_FIELD_MISSING':
                category = 'validation';
                userFriendlyMessage = 'A required field is missing from the request.';
                troubleshootingSteps = [
                    'Review the snapshot configuration for missing required fields',
                    'Check if all products exist in the target org with proper configuration',
                    'Verify pricebook entries exist for all products'
                ];
                break;
                
            case 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST':
                category = 'data';
                userFriendlyMessage = 'An invalid value was provided for a restricted picklist field.';
                troubleshootingSteps = [
                    'Check picklist values in the target org match the snapshot data',
                    'Verify custom field configurations match between source and target orgs'
                ];
                break;
                
            case 'DUPLICATE_VALUE':
                category = 'data';
                userFriendlyMessage = 'A duplicate value was detected for a field that requires unique values.';
                troubleshootingSteps = [
                    'Check if a quote with the same name already exists',
                    'Verify unique field constraints in the target org'
                ];
                break;
                
            case 'FIELD_CUSTOM_VALIDATION_EXCEPTION':
                category = 'validation';
                userFriendlyMessage = 'A custom validation rule prevented the operation.';
                troubleshootingSteps = [
                    'Review validation rules in the target org',
                    'Check if the snapshot data violates any custom business rules',
                    'Temporarily disable non-critical validation rules for testing'
                ];
                break;
                
            case 'INVALID_FIELD_FOR_INSERT_UPDATE':
                category = 'configuration';
                userFriendlyMessage = 'An invalid field was included in the request.';
                troubleshootingSteps = [
                    'Check if all fields from the snapshot exist in the target org',
                    'Verify field permissions and editability',
                    'Review custom field configurations between orgs'
                ];
                break;
                
            default:
                if (errorCode.includes('AUTH') || errorCode.includes('LOGIN')) {
                    category = 'authentication';
                    userFriendlyMessage = 'Authentication failed. Please re-authenticate with the target org.';
                    troubleshootingSteps = [
                        'Run: sf auth web login --alias your-org-alias',
                        'Verify the org is still accessible',
                        'Check if your session has expired'
                    ];
                } else if (errorCode.includes('PERMISSION') || errorCode.includes('ACCESS')) {
                    category = 'permissions';
                    userFriendlyMessage = 'Insufficient permissions to perform this operation.';
                    troubleshootingSteps = [
                        'Contact your Salesforce administrator',
                        'Verify Revenue Cloud permissions are assigned to your user',
                        'Check object and field-level security settings'
                    ];
                } else {
                    userFriendlyMessage = `System error occurred: ${message}`;
                    troubleshootingSteps = [
                        'Check the Salesforce system status',
                        'Retry the operation in a few minutes',
                        'Contact Salesforce support if the issue persists'
                    ];
                }
                break;
        }
        
        return {
            errorCode,
            message,
            referenceId,
            category,
            userFriendlyMessage,
            troubleshootingSteps
        };
    }

    /**
     * Get account by name or create a test account
     */
    async getOrCreateTestAccount(orgUsernameOrAlias: string, accountName: string): Promise<string> {
        // First, try to find existing account (using escaped SOQL to prevent injection)
        const escapedAccountName = ValidationService.escapeSoql(accountName);
        const searchQuery = `SELECT Id FROM Account WHERE Name = '${escapedAccountName}' LIMIT 1`;
        
        try {
            const result = await this.query(orgUsernameOrAlias, searchQuery);
            
            if (result.records.length > 0) {
                return result.records[0].Id;
            }

            // If account doesn't exist, create it
            const client = await this.getClient(orgUsernameOrAlias);
            const createResponse = await this.executeWithRetry(
                () => client.post('/sobjects/Account', {
                    Name: accountName,
                    Type: 'Customer'
                }),
                'Create Account',
                2 // max retries for account creation
            );

            if (createResponse.data.success) {
                return createResponse.data.id;
            } else {
                throw new Error(`Failed to create account: ${createResponse.data.errors?.[0]?.message}`);
            }
        } catch (error: any) {
            console.error('Error getting/creating test account:', error);
            throw new Error(`Failed to get or create test account: ${error.message}`);
        }
    }

    /**
     * Resolve Pricebook2 Name to actual ID in target org
     */
    async resolvePricebook2IdByName(orgUsernameOrAlias: string, pricebook2Name: string): Promise<string | null> {
        if (!pricebook2Name) {
            return null;
        }

        this.debugLog(`Resolving Pricebook2 name '${pricebook2Name}' to ID in target org`);

        try {
            // Use ValidationService to escape SOQL instead of manual escaping
            const escapedPricebook2Name = ValidationService.escapeSoql(pricebook2Name || '');
            const soql = `SELECT Id, Name FROM Pricebook2 WHERE Name = '${escapedPricebook2Name}' AND IsActive = true LIMIT 1`;
            const result = await this.query(orgUsernameOrAlias, soql);
            
            if (result.records.length > 0) {
                const pricebook2Id = result.records[0].Id;
                this.debugLog(`✅ Resolved Pricebook2 '${pricebook2Name}' -> ${pricebook2Id}`);
                return pricebook2Id;
            } else {
                this.debugLog(`❌ No Pricebook2 found with name '${pricebook2Name}' in target org`);
                console.warn(`[WARN] Pricebook2 '${pricebook2Name}' not found in target org. Tests may fail due to currency or product availability issues.`);
                return null;
            }
        } catch (error: any) {
            this.errorLog(`Failed to resolve Pricebook2 name '${pricebook2Name}': ${error.message}`);
            throw new Error(`Failed to resolve Pricebook2 name '${pricebook2Name}': ${error.message}`);
        }
    }

    /**
     * Enhanced PricebookEntry resolution with snapshot PricebookEntryId preference and intelligent fallback
     */
    async getPricebookEntriesWithSnapshotPreference(orgUsernameOrAlias: string, lineItems: any[], pricebook2Name: string | null, quoteCurrencyIsoCode?: string): Promise<Map<string, string>> {
        const pricebookEntryMap = new Map<string, string>();
        const fallbackProducts: string[] = [];

        // Step 1: Try to use captured PricebookEntryIds from snapshot
        
        for (const item of lineItems) {
            const product2Id = item.product2Id;
            const capturedPricebookEntryId = item.sourceData?.PricebookEntryId;

            if (capturedPricebookEntryId) {
                try {
                    // Validate Salesforce IDs to prevent SOQL injection
                    const validatedPricebookEntryId = ValidationService.validateSalesforceId(capturedPricebookEntryId, 'PricebookEntry ID');
                    const validatedProduct2Id = ValidationService.validateSalesforceId(product2Id, 'Product2 ID');
                    const escapedCurrency = quoteCurrencyIsoCode ? ValidationService.escapeSoql(quoteCurrencyIsoCode) : '';

                    // Validate that the captured PricebookEntryId exists and matches requirements
                    const validationQuery = `
                        SELECT Id, Product2Id, Pricebook2Id, Pricebook2.Name, IsActive, UnitPrice
                        ${quoteCurrencyIsoCode ? ', CurrencyIsoCode' : ''}
                        FROM PricebookEntry
                        WHERE Id = '${validatedPricebookEntryId}' AND Product2Id = '${validatedProduct2Id}' AND IsActive = true
                        ${quoteCurrencyIsoCode ? `AND CurrencyIsoCode = '${escapedCurrency}'` : ''}
                    `;

                    const validationResult = await this.query(orgUsernameOrAlias, validationQuery);

                    if (validationResult.records.length > 0) {
                        pricebookEntryMap.set(product2Id, capturedPricebookEntryId);
                    } else {
                        fallbackProducts.push(product2Id);
                    }
                } catch (error: any) {
                    fallbackProducts.push(product2Id);
                }
            } else {
                fallbackProducts.push(product2Id);
            }
        }

        // Step 2: Fallback resolution for products without valid captured PricebookEntryIds
        if (fallbackProducts.length > 0) {
            const fallbackMap = await this.getPricebookEntriesForProducts(orgUsernameOrAlias, fallbackProducts, null, quoteCurrencyIsoCode, pricebook2Name);

            // Merge fallback results
            fallbackMap.forEach((pricebookEntryId, product2Id) => {
                pricebookEntryMap.set(product2Id, pricebookEntryId);
            });
        }
        return pricebookEntryMap;
    }

    /**
     * Get PricebookEntries for products in a specific Pricebook2 with currency matching
     */
    async getPricebookEntriesForProducts(orgUsernameOrAlias: string, productIds: string[], pricebook2Id: string | null, quoteCurrencyIsoCode?: string, pricebook2Name?: string | null): Promise<Map<string, string>> {
        this.debugLog(`Getting PricebookEntries for ${productIds.length} products in pricebook: ${pricebook2Id || 'Standard'}`);
        
        if (productIds.length === 0) {
            return new Map();
        }

        // Enhanced Pricebook resolution: Support ID, Name, or Standard
        let pricebook2Condition = '';
        let resolvedPricebook2Id: string | null = pricebook2Id;
        
        if (pricebook2Id) {
            // Use provided Pricebook2Id directly
            pricebook2Condition = `AND Pricebook2Id = '${pricebook2Id}'`;
            this.debugLog(`Using provided Pricebook2Id: ${pricebook2Id}`);
        } else if (pricebook2Name) {
            // Resolve Pricebook2Id by name
            try {
                resolvedPricebook2Id = await this.resolvePricebook2IdByName(orgUsernameOrAlias, pricebook2Name);
                pricebook2Condition = `AND Pricebook2Id = '${resolvedPricebook2Id}'`;
            } catch (error: any) {
                throw new Error(`Failed to resolve Pricebook2 by name '${pricebook2Name}': ${error.message}`);
            }
        } else {
            // Query for Standard Price Book
            try {
                const standardPbQuery = `SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1`;
                const standardPbResult = await this.query(orgUsernameOrAlias, standardPbQuery);
                if (standardPbResult.records.length > 0) {
                    resolvedPricebook2Id = standardPbResult.records[0].Id;
                    pricebook2Condition = `AND Pricebook2Id = '${resolvedPricebook2Id}'`;
                    this.debugLog(`Using Standard Price Book: ${resolvedPricebook2Id}`);
                } else {
                    throw new Error('No Standard Price Book found in target org');
                }
            } catch (error: any) {
                this.errorLog(`Failed to find Standard Price Book: ${error.message}`);
                throw new Error(`Failed to find Standard Price Book: ${error.message}`);
            }
        }

        const productIdList = productIds.map(id => `'${id}'`).join(',');
        
        // Build field list and currency condition
        // Strategy: Always TRY to query CurrencyIsoCode if currency is provided, fallback if fails
        // This is more robust than relying on org feature detection
        let selectFields = 'Id, Product2Id, UnitPrice, IsActive, Pricebook2Id';
        let currencyCondition = '';
        let attemptMultiCurrency = false;
        
        if (quoteCurrencyIsoCode) {
            // If currency is provided, attempt multi-currency query first
            selectFields += ', CurrencyIsoCode';
            currencyCondition = `AND CurrencyIsoCode = '${ValidationService.escapeSoql(quoteCurrencyIsoCode)}'`;
            attemptMultiCurrency = true;
            this.debugLog(`🎯 CRITICAL: Attempting to filter PricebookEntries by Quote currency: ${quoteCurrencyIsoCode}`);
        } else {
            this.debugLog(`💰 No currency provided - assuming single-currency org`);
        }
        
        const soql = `
            SELECT ${selectFields}
            FROM PricebookEntry 
            WHERE Product2Id IN (${productIdList}) ${pricebook2Condition} AND IsActive = true ${currencyCondition}
        `;
        
        this.debugLog(`🔍 SOQL Query for PricebookEntries: ${soql.trim()}`);
        if (quoteCurrencyIsoCode) {
            this.debugLog(`✅ Currency filter applied: Only ${quoteCurrencyIsoCode} PricebookEntries will be returned`);
        } else {
            this.debugLog(`⚠️ WARNING: No currency filter - PricebookEntries with ANY currency may be returned`);
        }
        
        let result: any;
        let isMultiCurrencyOrg = false;
        
        try {
            result = await this.query(orgUsernameOrAlias, soql);
            isMultiCurrencyOrg = attemptMultiCurrency;  // If query succeeded with CurrencyIsoCode, org is multi-currency
            
        } catch (error: any) {
            // If query failed due to CurrencyIsoCode field not existing, retry without it
            if (attemptMultiCurrency && (error.message?.includes('CurrencyIsoCode') || error.message?.includes('No such column'))) {
                this.debugLog(`⚠️ CurrencyIsoCode field not available - retrying without currency filter (single-currency org)`);
                
                // Retry without CurrencyIsoCode field and currency filter
                const fallbackSelectFields = 'Id, Product2Id, UnitPrice, IsActive, Pricebook2Id';
                const fallbackSoql = `
                    SELECT ${fallbackSelectFields}
                    FROM PricebookEntry 
                    WHERE Product2Id IN (${productIdList}) ${pricebook2Condition} AND IsActive = true
                `;
                
                this.debugLog(`🔄 Fallback SOQL Query: ${fallbackSoql.trim()}`);
                result = await this.query(orgUsernameOrAlias, fallbackSoql);
                isMultiCurrencyOrg = false;
            } else {
                // Re-throw if it's a different error
                throw error;
            }
        }
        
        // Process results
        const pricebookEntryMap = new Map<string, string>();
        
        result.records.forEach((entry: any) => {
            pricebookEntryMap.set(entry.Product2Id, entry.Id);
            const currency = isMultiCurrencyOrg && entry.CurrencyIsoCode ? entry.CurrencyIsoCode : 'N/A (single-currency)';
            this.debugLog(`✅ Found PricebookEntry: Product2Id=${entry.Product2Id}, Currency=${currency}, PricebookEntryId=${entry.Id}, UnitPrice=${entry.UnitPrice}`);
        });
        
        // CRITICAL DEBUG: Show summary of results
        if (isMultiCurrencyOrg) {
            const foundCurrencies = [...new Set(result.records.map((entry: any) => entry.CurrencyIsoCode))];
            this.debugLog(`🎯 PRICEBOOKENTRY SUMMARY (Multi-Currency Org):`);
            this.debugLog(`   Products requested: ${productIds.length}`);
            this.debugLog(`   PricebookEntries found: ${result.records.length}`);
            this.debugLog(`   Currencies found: ${foundCurrencies.join(', ')}`);
            this.debugLog(`   Expected currency: ${quoteCurrencyIsoCode || 'ANY (no filter)'}`);
            this.debugLog(`   Pricebook2Id filter: ${pricebook2Id || 'Standard Price Book'}`);
            
            if (quoteCurrencyIsoCode && foundCurrencies.length > 0 && !foundCurrencies.includes(quoteCurrencyIsoCode)) {
                this.debugLog(`❌ CURRENCY MISMATCH: Expected ${quoteCurrencyIsoCode} but found: ${foundCurrencies.join(', ')}`);
            }
        } else {
            this.debugLog(`🎯 PRICEBOOKENTRY SUMMARY (Single-Currency Org):`);
            this.debugLog(`   Products requested: ${productIds.length}`);
            this.debugLog(`   PricebookEntries found: ${result.records.length}`);
            this.debugLog(`   Currency: Single-currency org (no CurrencyIsoCode field)`);
            this.debugLog(`   Pricebook2Id filter: ${pricebook2Id || 'Standard Price Book'}`);
        }
        
        this.debugLog(`Found ${pricebookEntryMap.size} PricebookEntries out of ${productIds.length} requested products`);
        
        // Log missing entries
        const missingProducts = productIds.filter(pid => !pricebookEntryMap.has(pid));
        if (missingProducts.length > 0) {
            this.debugLog(`Missing PricebookEntries for products: ${missingProducts.join(', ')}`);
        }
        
        return pricebookEntryMap;
    }

    /**
     * Execute anonymous Apex code
     */
    async executeApex(orgUsernameOrAlias: string, apexCode: string): Promise<any> {
        try {
            Logger.debug(`Executing Apex code in org: ${orgUsernameOrAlias}`, undefined, 'SalesforceAPI');
            Logger.debug(`Apex code: ${apexCode}`, undefined, 'SalesforceAPI');

            const client = await this.getClient(orgUsernameOrAlias);
            const response = await this.executeWithRetry(
                () => client.get('/tooling/executeAnonymous/', {
                    params: { anonymousBody: apexCode }
                }),
                'Execute Apex',
                2
            );
            
            Logger.debug(`Apex execution successful`, response.data, 'SalesforceAPI');
            
            // Check if execution was successful
            if (response.data && response.data.success) {
                // Return the full response data including debugLog
                // This allows callers to parse System.debug() output
                return response.data;
            } else {
                throw new Error(`Apex execution failed: ${response.data?.compileProblem || response.data?.exceptionMessage || 'Unknown error'}`);
            }
            
        } catch (error: any) {
            Logger.error(`Apex execution failed: ${error.message}`, error, 'SalesforceAPI');
            throw new Error(`Apex execution failed: ${error.message}`);
        }
    }

    /**
     * Clear cached HTTP clients
     */
    clearClients(): void {
        HttpClientFactory.clearAllClients();
    }

    /**
     * Get configured quote fields dynamically from the quote object
     * Extracts BOTH snapFields AND reportFields for complete field coverage
     */
    private getConfiguredQuoteFields(quote: any): { [key: string]: any } {
        const configuredFields: { [key: string]: any } = {};
        
        try {
            const config = ConfigurationService.getModuleConfig('pricing');
            
            // Extract snap fields (input fields for pricing)
            const snapFields = config.snapFields?.quote?.fields || [];
            Logger.debug(`Extracting ${snapFields.length} Quote snap fields: [${snapFields.join(', ')}]`, undefined, 'SalesforceAPI');
            
            snapFields.forEach((fieldName: string) => {
                if (quote[fieldName] !== undefined) {
                    configuredFields[fieldName] = quote[fieldName];
                    Logger.debug(`✅ Extracted snap field ${fieldName}: ${quote[fieldName]}`, undefined, 'SalesforceAPI');
                }
            });
            
            // Extract report fields (output fields for comparison)
            const reportFields = config.reportFields?.quote?.fields || [];
            Logger.debug(`Extracting ${reportFields.length} Quote report fields: [${reportFields.join(', ')}]`, undefined, 'SalesforceAPI');
            
            reportFields.forEach((fieldName: string) => {
                if (quote[fieldName] !== undefined) {
                    configuredFields[fieldName] = quote[fieldName];
                    Logger.debug(`✅ Extracted report field ${fieldName}: ${quote[fieldName]}`, undefined, 'SalesforceAPI');
                } else {
                    Logger.debug(`❌ Report field ${fieldName} not found in quote object`, undefined, 'SalesforceAPI');
                }
            });
            
            Logger.debug(`Final configured fields extracted: ${Object.keys(configuredFields).length} fields`, configuredFields, 'SalesforceAPI');
            
        } catch (error: any) {
            Logger.warn(`Could not extract configured quote fields: ${error.message}`, error, 'SalesforceAPI');
        }
        
        return configuredFields;
    }
}
